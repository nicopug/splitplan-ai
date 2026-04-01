# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend
```bash
npm install          # Install dependencies
npm run dev          # Dev server at http://localhost:5173
npm run build        # Production build to dist/
npm run preview      # Preview production build
npm run lint         # ESLint
```

### Backend
```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000  # Dev server
```

### Database
```bash
alembic upgrade head  # Apply migrations (from project root)
```

Vite dev server proxies `/api/*` to `http://localhost:8000`.

## Architecture

**SplitPlan AI** is a full-stack AI-powered group trip planner. Monorepo deployed on Vercel.

### Frontend (`/src`)
- **React 19 + Vite 7**, Tailwind CSS 4, React Router 7, Radix UI
- All API calls go through `src/api.js` — handles JWT tokens, error handling, and dev/prod URL resolution
- Global state via React Context: `ThemeContext`, `ToastContext`, `ModalContext`
- Maps: Leaflet + React-Leaflet + OpenStreetMap/Nominatim
- PWA: `vite-plugin-pwa` with service workers for offline caching

Key pages: landing, auth (login/register/reset), dashboard (trip detail), my-trips, market (credits), share (collaboration).

Key feature components: `Survey.jsx` (trip creation wizard), `Voting.jsx` (proposal voting), `Budget.jsx` (expense tracking), `Timeline.jsx` (itinerary), `Chatbot.jsx` (AI chat), `Map.jsx`.

### Backend (`/backend`)
- **FastAPI** + **SQLModel** (SQLAlchemy + Pydantic combined) + PostgreSQL (Supabase)
- JWT auth with `python-jose` and `bcrypt`
- Database models in `backend/models.py` — models double as Pydantic validators
- Migrations managed by Alembic (`/backend/alembic`)

API routers:
| File | Responsibility |
|------|---------------|
| `trips.py` | Core logic: proposals, voting, itinerary, AI chat |
| `users.py` | Auth, profile |
| `expenses.py` | Expense tracking, balance calculation |
| `photos.py` | Photo upload/gallery |
| `itinerary.py` | Itinerary CRUD |
| `calendar.py` | Google Calendar OAuth2 |
| `payments.py` | Stripe credits/subscriptions |
| `flights.py` | Flight booking links |

### AI Integration
- **Google Gemini 2.5 Flash** for: trip proposals (3 options), itinerary generation, budget estimation, AI chat assistant
- Itinerary uses Nearest Neighbor algorithm for optimization

### Mobile (`/splitplan-mobile`)
- Expo 54 + React Native 0.81.5 + NativeWind — early stage, not production-ready

## Key Patterns

- **`src/api.js`** is the single entry point for all frontend API calls — always add new API calls here
- **SQLModel** models in `backend/models.py` serve as both DB schema and request/response validation — don't create separate Pydantic schemas unless needed
- Backend deployed as Vercel serverless functions; `vercel.json` handles rewrites and security headers
- Credits/subscription gating in backend via `check_user_credits()` before AI calls

## Environment Variables

Frontend (`.env`): `VITE_API_URL`

Backend: `DATABASE_URL`, `SECRET_KEY`, `GOOGLE_API_KEY`, `STRIPE_SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SMTP_*`, `SUPABASE_URL`, `SUPABASE_KEY`, `FRONTEND_URL`
