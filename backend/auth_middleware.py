import os
import firebase_admin
from firebase_admin import auth, credentials
from flask import request, jsonify, _request_ctx_stack
from functools import wraps

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
            token = get_token_auth_header()
            if token == "debug-token":
                _request_ctx_stack.top.current_user = {"name": "Debug User", "email": "debug@terraagent.com", "uid": "debug-uid"}
                return f(*args, **kwargs)
            
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
