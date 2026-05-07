# VOYA — Project Architecture

> Quick reference for understanding the full system structure.
> For agent instructions, read `CLAUDE.md` first.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                                                             │
│  login.html ──────► index.html                              │
│  (Firebase Auth)     (Travel Form + Results)                │
│       │                     │                               │
│  auth-handler.js      api-handler.js                        │
│  (ES Module)          form-handler-optimized.js             │
│       │                     │                               │
│       └─── Firebase Auth ───┘                               │
│            (CDN, gstatic)                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS POST /api/generate-plan
                       │ Authorization: Bearer <firebase_id_token>
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    FLASK BACKEND (app.py)                   │
│                    localhost:5000                            │
│                                                             │
│  @requires_auth ──► auth_middleware.py                      │
│                         │                                   │
│                   Firebase Admin SDK                        │
│                   (verifies ID token)                       │
│                         │                                   │
│                   generate_plan()                           │
│                         │                                   │
│               Google Gemini 1.5 Flash API                   │
│               (generates itinerary text)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## File Dependency Graph

```
index.html
├── styles.css                    ← All visual styles
├── js/auth-handler.js [module]   ← Must load first
│   └── Firebase CDN (gstatic)   ← initializeApp, getAuth, etc.
├── js/api-handler.js             ← Needs window.authHandler
│   └── calls: authHandler.getToken()
│   └── calls: fetch('/api/generate-plan')
└── js/form-handler-optimized.js ← Needs APIHandler class
    ├── new APIHandler()
    ├── reads: #source, #destination, #start-date, #end-date
    │         #budget, #travelers, #interests, #include-flights
    └── writes: #results, #loading, #plan-result

login.html
├── <style> (inline)              ← Self-contained, no external CSS
├── js/auth-handler.js [module]   ← Same file, sets window.authHandler
└── <script> (inline bridge)     ← Wires DOM events to window.authHandler
    ├── #login-form onsubmit     → authHandler.loginWithEmail()
    ├── #google-login onclick    → authHandler.login()
    ├── #phone-login onclick     → authHandler.phoneLogin()
    ├── #debug-skip onclick      → authHandler.skipLogin()
    └── #auth-toggle-link        → toggles sign-in/sign-up mode

app.py
├── backend/auth_middleware.py   ← @requires_auth decorator
│   └── firebase_admin.auth.verify_id_token()
│   └── firebase-service-account.json (credentials file)
└── google.generativeai          ← Gemini API
    └── GEMINI_API_KEY from .env
```

---

## Auth Flow (Step by Step)

```
User visits index.html
        │
        ▼
auth-handler.js: onAuthStateChanged fires
        │
   authenticated?
   ┌────┴────┐
  YES        NO
   │          │
   ▼          ▼
Show page  Redirect to login.html
   │
   │  (OR localStorage.debugSkipAuth === 'true')
   ▼
User fills form → submits
        │
        ▼
api-handler.js: authHandler.getToken()
        │
   debugSkipAuth?
   ┌────┴────┐
  YES        NO
   │          │
"debug-token"  Firebase ID Token
        │
        ▼
POST /api/generate-plan
Authorization: Bearer <token>
        │
        ▼
auth_middleware.py: verify token
        │
   token === "debug-token"?
   ┌────┴────┐
  YES        NO
   │          │
bypass    Firebase Admin verifies
   │          │
   └────┬─────┘
        ▼
   generate_plan() runs Gemini
        │
        ▼
   Returns { success, text, flights: null, hotels: null }
        │
        ▼
form-handler-optimized.js renders result in #plan-result
```

---

## Data Flow for Plan Generation

```
HTML Form Fields
┌──────────────────────────────────────────────────┐
│  #source        → formData.source                │
│  #destination   → formData.destination           │
│  #start-date    → formData.startDate             │
│  #end-date      → formData.endDate               │
│  #budget        → formData.budget                │
│  #travelers     → formData.travelers             │
│  #interests     → formData.interests             │
│  #include-flights → formData.includeFlights      │
└──────────────────────────────────────────────────┘
        │
        ▼  (api-handler.js: generateTravelPlan)
POST /api/generate-plan  { ...formData }
        │
        ▼  (app.py: generate_plan)
Gemini Prompt → markdown text response
        │
        ▼  (form-handler-optimized.js: displayResults)
Rendered HTML in #plan-result
```

---

## Backend API Reference

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/` | GET | None | Serves `index.html` |
| `/api/status` | GET | None | Health check |
| `/api/generate-plan` | POST | Required | Generate AI travel plan |
| `/api/user/profile` | GET | Required | Get current user info |

---

## Environment Variables (`.env`)

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google AI API key for Gemini 1.5 Flash |
| `ALWAYS_FALLBACK` | No | Set `1` to skip Gemini, use template plans |

---

## Design Tokens

### index.html (styles.css)
```
Font:        Inter (Google Fonts)
BG:          #000000
Primary:     #DEDBC8 (warm cream) → var not defined, used as literals
Borders:     rgba(255,255,255,0.1)
Blur:        backdrop-filter: blur(4px)
Border-r:    16px–24px (cards), 10px–12px (inputs), 14px (buttons)
```

### login.html (inline styles)
```
Font:        Almarai + Instrument Serif
--primary:   #DEDBC8
--black:     #000000
--border:    rgba(255,255,255,0.1)
Blur:        backdrop-filter: blur(12px)
Layout:      CSS Grid 1fr 1fr (50/50 split)
```

---

## Dependencies

### Frontend (CDN — no npm)
- Firebase JS SDK `10.8.0` (gstatic CDN)
- Font Awesome `6.4.0` (cdnjs)
- Google Fonts: Inter / Almarai / Instrument Serif

### Backend (requirements.txt)
```
flask
flask-cors
google-generativeai
python-dotenv
firebase-admin
```

---

## Known Gaps (Phase 1 TODO)

| Gap | Impact | Fix |
|---|---|---|
| No database | Plans lost on refresh | Add Firestore `users/{uid}/trips/{id}` |
| Gemini returns raw text | Can't render structured cards | Switch to JSON mode response |
| `firebase-service-account.json` in repo | Security risk | Add to `.gitignore`, use env var |
| No rate limiting | API abuse possible | Add `flask-limiter` |
| `flights: null, hotels: null` | No real travel data | Integrate Amadeus or SerpApi |
| Phone login not implemented | Dead button | Configure RecaptchaVerifier |
