import os
import firebase_admin
from firebase_admin import auth, credentials
from flask import request, jsonify, _request_ctx_stack
from functools import wraps
from datetime import datetime, timedelta
from collections import defaultdict

# Initialize Firebase Admin SDK
# Expects firebase-service-account.json in the project root
try:
    if not firebase_admin._apps:
        cred_path = os.path.join(os.getcwd(), 'firebase-service-account.json')
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            print("WARNING: firebase-service-account.json not found. Backend auth will fail.")
except Exception as e:
    print(f"Error initializing Firebase Admin: {e}")

class AuthError(Exception):
    def __init__(self, error, status_code):
        self.error = error
        self.status_code = status_code

# ─── Rate Limiting ───────────────────────────────────────
# Simple in-memory rate limiter. Use Redis in production!
_rate_limit_store = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 30  # requests per window

def _is_rate_limited(client_id):
    """Check if client has exceeded rate limit"""
    now = datetime.now()
    cutoff = now - timedelta(seconds=RATE_LIMIT_WINDOW)
    
    # Clean old timestamps
    _rate_limit_store[client_id] = [
        ts for ts in _rate_limit_store[client_id] if ts > cutoff
    ]
    
    if len(_rate_limit_store[client_id]) >= RATE_LIMIT_MAX_REQUESTS:
        return True
    
    _rate_limit_store[client_id].append(now)
    return False

def get_token_auth_header():
    """Obtains the Access Token from the Authorization Header"""
    auth_header = request.headers.get("Authorization", None)
    if not auth_header:
        raise AuthError({"code": "authorization_header_missing",
                        "description": "Authorization header is expected"}, 401)

    parts = auth_header.split()

    if parts[0].lower() != "bearer":
        raise AuthError({"code": "invalid_header",
                        "description": "Authorization header must start with Bearer"}, 401)
    elif len(parts) == 1:
        raise AuthError({"code": "invalid_header",
                        "description": "Token not found"}, 401)
    elif len(parts) > 2:
        raise AuthError({"code": "invalid_header",
                        "description": "Authorization header must be Bearer token"}, 401)

    token = parts[1]
    return token

def requires_auth(f):
    """Determines if the Access Token is valid"""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            # Rate limiting by client IP
            client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
            if _is_rate_limited(client_ip):
                raise AuthError({"code": "rate_limited",
                               "description": "Too many requests. Please try again later."}, 429)
            
            token = get_token_auth_header()
            
            # ⚠️ DEBUG TOKEN REMOVED - NO HARDCODED BYPASSES IN PRODUCTION
            # if token == "debug-token":
            #     _request_ctx_stack.top.current_user = {"name": "Debug User", ...}
            #     return f(*args, **kwargs)
            
            try:
                # Verify the ID token sent by the client
                decoded_token = auth.verify_id_token(token)
                _request_ctx_stack.top.current_user = decoded_token
            except Exception as e:
                raise AuthError({"code": "invalid_token",
                                "description": str(e)}, 401)
            
            return f(*args, **kwargs)
        except AuthError as e:
            return jsonify(e.error), e.status_code
        except Exception as e:
            return jsonify({"code": "internal_error", "description": str(e)}), 500

    return decorated
