# SplitPlan AI — Current Architecture

> Generated: 2026-04-03 | Audit by Claude Code (Sonnet 4.6)

---

## 1. System Overview

SplitPlan AI is a full-stack monorepo deployed on Vercel:

```
User Browser
    │
    ├─ React 19 SPA (Vite 7 / Tailwind 4) ──► Vercel CDN (static)
    │           │
    │     src/api.js (JWT + error routing)
    │           │
    └───────────▼
        FastAPI (Python 3.x) ──► Vercel Serverless (Python runtime)
              │
    ┌─────────┼──────────────────────────────────────────┐
    │         │                                          │
    ▼         ▼                                          ▼
PostgreSQL  Google Gemini 2.5 Flash           External Services
(Supabase)  (AI proposals, itinerary,          ├─ Stripe (payments)
            chatbot, receipt extraction)        ├─ Duffel (flights)
                                                ├─ Google Calendar
                                                ├─ Supabase Storage
                                                └─ SMTP (email)
```

---

## 2. Data Flow: Frontend → Gemini → Database

### Trip Proposal Generation (main AI flow)

```
1. USER ACTION
   Survey.jsx → collects: destination, dates, budget, vibe, party_size
       │
       ▼
2. API CALL
   src/api.js → POST /api/trips/{id}/generate-proposals
   Headers: Authorization: Bearer <JWT>
       │
       ▼
3. BACKEND AUTH
   FastAPI Dependency → get_current_user(token)
   Decodes JWT → fetches Account from PostgreSQL
       │
       ▼
4. RATE LIMIT CHECK
   check_rate_limit(account, session)
   FREE:  20 AI calls/day (atomic UPDATE on account.daily_ai_usage)
   PRO:   unlimited (account.is_subscribed == True)
       │
       ▼
5. PROMPT CONSTRUCTION (trips.py)
   Language: account.language (it/en)
   Prompt includes: destination, budget, transport_mode, trip_type,
                    departure_airport, work constraints (B2B)
   JSON output schema: [{title, destination, description, price_estimate,
                         image_search_query, highlights[]}]
       │
       ▼
6. GEMINI CALL
   ai_client.aio.models.generate_content(
       model="gemini-2.5-flash",
       contents=prompt,
       config=GenerateContentConfig(response_mime_type="application/json")
   )
       │
       ▼
7. RESPONSE PARSING
   Parse JSON → validate 3 proposals exist
   Fallback: HTTPException 500 if Gemini unavailable
       │
       ▼
8. DATABASE WRITE
   SQLModel session → INSERT Proposal records
   Each: trip_id, destination, price_estimate, image_url, ...
       │
       ▼
9. FRONTEND UPDATE
   JSON response → Voting.jsx renders 3 proposal cards
   User votes → POST /api/trips/{id}/vote (stores Vote records)
```

### Secondary AI Flows

| Flow | Trigger | Input | Output |
|------|---------|-------|--------|
| Itinerary Gen | POST /generate-itinerary | Trip + proposals + dates | ItineraryItem[] |
| Itinerary Refine | POST /refine-itinerary | Current itinerary + feedback | Updated ItineraryItem[] |
| Receipt Extract | POST /extract-receipt | Base64 image | {hotel, cost, times} |
| IATA Inference | Flight search (fallback) | Airport name text | 3-letter IATA code |
| AI Chat | POST /chat | Message history + trip context | Streaming response |

---

## 3. Authentication Flow

```
Register/Login
    │
    ▼
users.py → hash password (bcrypt) → store Account
    │
    ▼
Return JWT (python-jose, 30d expiry)
    │
    ▼
Client stores in localStorage["token"]
    │
    ▼
Every request: Authorization: Bearer <token>
    │
    ▼
get_current_user() dependency → validates token → fetches Account
```

**Special tokens (different `type` field):**
- `verification` — email confirmation (24h)
- `reset` — password reset (1h)
- Neither is accepted by `get_current_user()`

---

## 4. Database Schema (SQLModel)

```
Account ──────────────── Participant ──────────────── Trip
   │                         │                          │
   │                         └──────────────────────────┘
   │                                                     │
   └─── DemoLead                          ┌──────────────┤
                                          │              │
                                       Proposal      Expense
                                          │
                                        Vote
                                          │
                                    ItineraryItem
                                          │
                                        Photo
```

**B2B Fields:**
- `Account.is_manager` — company manager flag
- `Account.company_id` — links to company group
- `Trip.trip_type` = BUSINESS — enables work schedule constraints

---

## 5. Deployment Architecture (Vercel)

```
vercel.json
├── @vercel/static-build (package.json) → /dist → CDN
└── @vercel/python (backend/main.py)   → Serverless Function

Routes:
/api/*    → Serverless Python (FastAPI)
/*        → Static SPA (index.html fallback)

Security Headers (all routes):
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- HSTS: 1 year
- Referrer-Policy: strict-origin-when-cross-origin
```

---

## 6. Frontend Architecture

```
src/
├── main.jsx          Entry: React root + providers
├── App.jsx           Router + ErrorBoundary wrapper
│
├── pages/            Lazy-loaded route components
│   ├── Dashboard.jsx         (main trip editor, 36KB)
│   ├── CompanyDashboard.jsx  (B2B admin)
│   └── ...
│
├── components/       Shared UI
│   ├── ErrorBoundary.jsx     (catches render errors)
│   ├── Survey.jsx            (trip creation wizard)
│   ├── Voting.jsx            (AI proposal voting)
│   ├── Timeline.jsx          (itinerary display)
│   └── Chatbot.jsx           (AI chat)
│
├── context/          Global state
│   ├── ToastContext
│   ├── ModalContext
│   └── ThemeContext
│
└── api.js            Single API client (ALL calls here)
```

**Code Splitting:**
- `vendor` chunk: React, React-DOM, React-Router
- `utils` chunk: Framer Motion, i18next
- Dynamic imports: all page components

---

## 7. Key Technical Decisions

| Decision | Current Choice | Notes |
|----------|---------------|-------|
| AI Model | Gemini 2.5 Flash | Fast + cost-effective |
| ORM | SQLModel | Dual Pydantic/SQLAlchemy |
| Auth | JWT (localStorage) | No HttpOnly cookies |
| Rate Limit | DB-backed (atomic) | No Redis/distributed |
| Migrations | Alembic | Versioned, managed |
| Payments | Stripe | Idempotency via DB table |
| Maps | Leaflet + OSM | Free, no API key needed |
| i18n | i18next | IT/EN supported |
| PWA | vite-plugin-pwa | Service worker, offline cache |

---

## 8. Open Questions / Gaps for FASE 2

1. Does the B2B `CompanyDashboard` have full CRUD for managing employees/trips?
2. Is the PDF export functional and enterprise-quality?
3. Are all Gemini prompts consistent between IT/EN language modes?
4. Is there a multi-company isolation at the DB level (row-level security)?
5. Is the SSO router (`sso.py`) production-ready or scaffolding only?
6. Are `backend/tests/` covering AI endpoints or only auth/expenses?
