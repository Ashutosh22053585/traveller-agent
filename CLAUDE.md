# CLAUDE.md — VOYA Travel Planner AI

> Read this file first. It tells you everything about the project so you don't waste tokens re-reading files you don't need.

---

## What This Project Is

A **full-stack AI travel planner** called **VOYA** (formerly TerraAgent).
- Users log in → fill a travel form → AI generates a full itinerary with hotels/flights
- Frontend: Pure HTML/CSS/Vanilla JS (no build step)
- Backend: Flask (Python) serving both the API and static frontend
- AI: Google Gemini 1.5 Flash
- Auth: Firebase Auth (frontend) + Firebase Admin SDK (backend token verification)

---

## CRITICAL RULES — Read Before Touching Anything

### 1. Never touch `app.py` unless asked
Backend-only changes. The user's constraint is: **frontend redesigns must not touch app.py**.

### 2. These HTML IDs are sacred — never rename them
The JS depends on exact IDs. Renaming any of these breaks the app silently:

| ID | File | Used By |
|---|---|---|
| `travel-form` | index.html | form-handler-optimized.js (form submit) |
| `source`, `destination` | index.html | api-handler.js (reads values) |
| `start-date`, `end-date` | index.html | api-handler.js |
| `budget`, `travelers`, `interests` | index.html | api-handler.js |
| `include-flights` | index.html | api-handler.js |
| `results` | index.html | form-handler-optimized.js (shows/hides) |
| `loading` | index.html | form-handler-optimized.js |
| `plan-result` | index.html | form-handler-optimized.js (injects HTML) |
| `login-form` | login.html | inline bridge script |
| `email`, `password` | login.html | inline bridge script |
| `auth-title`, `auth-subtitle` | login.html | sign-up/sign-in toggle |
| `auth-submit` | login.html | sign-up/sign-in toggle |
| `auth-toggle-text`, `auth-toggle-link` | login.html | sign-up/sign-in toggle |
| `google-login` | login.html | `window.authHandler.login()` |
| `phone-login` | login.html | `window.authHandler.phoneLogin()` |
| `debug-skip` | login.html | `window.authHandler.skipLogin()` |
| `success-toast` | login.html + index.html | `window.authHandler.showSuccess()` |
| `btn-logout` | index.html | `window.authHandler.logout()` |

### 3. Script load order in index.html — do not reorder
```html
<script type="module" src="js/auth-handler.js"></script>  <!-- Must be first, sets window.authHandler -->
<script src="js/api-handler.js?v=8"></script>             <!-- Requires window.authHandler -->
<script src="js/form-handler-optimized.js?v=8"></script>  <!-- Requires APIHandler class -->
```
`auth-handler.js` uses ES module syntax. The other two are classic scripts. Do not convert them.

### 4. Auth flow — how it works
1. `auth-handler.js` loads and calls `onAuthStateChanged`
2. If not authenticated → redirects to `login.html`
3. If authenticated → stays on `index.html`, sets `window.authHandler`
4. Debug bypass: `localStorage.setItem('debugSkipAuth', 'true')` skips auth
5. Backend verifies the Firebase ID token on every API call via `@requires_auth` decorator
6. Debug token string `"debug-token"` bypasses backend verification too

### 5. The CSS is in `styles.css` — `css/modern.css` is OLD
The new design uses `styles.css` in the project root. `login.html` uses inline `<style>`. Don't link `css/modern.css` for new pages.

---

## Running the Project

```bash
# Terminal 1 — Backend (Flask)
python app.py
# Runs on http://localhost:5000
# Serves index.html at /

# Terminal 2 — Optional static frontend
python -m http.server 8080
# Useful for testing frontend without Flask
```

**Environment variables** (in `.env`):
```
GEMINI_API_KEY=your_key_here
ALWAYS_FALLBACK=0   # Set to 1 to skip Gemini and use placeholder plans
```

---

## File Map — What Each File Does

```
ASHU/
├── index.html              ← Main app page (hero + form + results)
├── login.html              ← Auth page (email/password + Google)
├── styles.css              ← All styles for index.html (liquid glass system)
│
├── app.py                  ← Flask backend — DO NOT MODIFY unless asked
├── backend/
│   └── auth_middleware.py  ← @requires_auth decorator for Flask routes
│
├── js/
│   ├── auth-handler.js     ← Firebase Auth (ES module). Sets window.authHandler
│   ├── api-handler.js      ← APIHandler class. Calls /api/generate-plan
│   ├── form-handler-optimized.js ← UI logic: form submit, loading, results render
│   └── background-waves.js ← Canvas animation for login page background (legacy)
│
├── assets/
│   ├── slide-jet.png       ← Login page slideshow image 1 (private jet)
│   ├── slide-hotel.png     ← Login page slideshow image 2 (penthouse)
│   └── slide-island.png    ← Login page slideshow image 3 (tropical island)
│
├── .env                    ← API keys (git-ignored)
├── firebase-service-account.json  ← ⚠️ Backend Firebase credentials
├── requirements.txt        ← Python deps: flask, google-generativeai, firebase-admin
└── css/
    └── modern.css          ← OLD CSS — only used by login.html legacy version
```

---

## API Contract

### POST `/api/generate-plan`
**Headers:** `Authorization: Bearer <firebase_id_token>`
**Request body:**
```json
{
  "source": "New York",
  "destination": "Tokyo",
  "startDate": "2024-03-01",
  "endDate": "2024-03-07",
  "budget": "3000",
  "interests": "food, culture, history",
  "travelers": "2",
  "includeFlights": true
}
```
**Success response:**
```json
{
  "success": true,
  "text": "...gemini markdown response...",
  "flights": null,
  "hotels": null
}
```
**Fallback response** (when Gemini unavailable):
```json
{
  "success": true,
  "plan": "...template text...",
  "note": "fallback_offline_mode"
}
```

---

## Known Issues & Gotchas

| Issue | Details |
|---|---|
| `setupPerformanceOptimizations` was missing | **Fixed** — method now added to `form-handler-optimized.js` line ~536 |
| Video background is UHD (laggy on slow connections) | `1409899-uhd_2560_1440_25fps.mp4` — user prefers quality over performance |
| `firebase-service-account.json` is in repo root | ⚠️ Should be in `.gitignore` and not committed to GitHub |
| Firebase config is hardcoded in `auth-handler.js` | Known. Fine for now — it's a public web config (not a secret) |
| `flights: null, hotels: null` in API response | Placeholders — SerpApi not integrated yet |
| `background-waves.js` | Only used by old `login.html` layout — not needed in new design |
| `results` section uses `display:none` inline | `form-handler-optimized.js` toggles it via `style.display`. Don't remove inline style |

---

## Design System (index.html + styles.css)

**Color palette:**
- Background: `#000000`
- Primary text: `#DEDBC8` (warm cream)
- Borders: `rgba(255,255,255,0.1)`
- Muted text: `#6b7280`, `#9ca3af`

**Core CSS class:**
```css
.liquid-glass {
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);   /* index.html uses blur(4px) */
  /* login.html uses blur(12px) */
}
```

**Fonts:**
- `index.html`: `Inter` (Google Fonts)
- `login.html`: `Almarai` + `Instrument Serif` (Google Fonts)

**Animation pattern:**
- Hero chars: `.hero-char` keyframe `charIn` (translateX -18px → 0)
- Fade elements: `.fade-element` → `.visible` via JS classList + `data-delay`
- Scroll reveal: `.scroll-reveal` → `.revealed` via IntersectionObserver
- Login form: `.anim-item` → `body.loaded` CSS stagger via `nth-child` delays

---

## What's Next (Product Roadmap)

See `VOYA_Product_Roadmap.md` for the full plan. Current Phase:

**Phase 1 (in progress):**
- [ ] Add Firestore database for saving trips
- [ ] Switch Gemini to structured JSON output
- [ ] Security: move `firebase-service-account.json` out of repo
- [ ] Deploy to Firebase Hosting + Cloud Run
