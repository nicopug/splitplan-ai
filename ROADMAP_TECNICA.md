# SplitPlan AI — Roadmap Tecnica Completa

> Generata il 2026-04-05 — Basata su: report tecnico, pricing PDF, codebase corrente, conversazioni strategiche

---

## Come leggere questa roadmap

Ogni task ha un **tag di priorità**:

| Tag | Significato | Deadline |
|-----|-------------|----------|
| 🔴 BLOCCANTE | Senza questo non si può andare live / vendere | Prima del pilot |
| 🟠 CRITICO | Senza questo il B2B non funziona realmente | Prima di Talentis (5 giugno) |
| 🟡 IMPORTANTE | Migliora significativamente prodotto/vendibilità | Entro estate 2026 |
| 🟢 NICE-TO-HAVE | Valore aggiunto, non urgente | Q3-Q4 2026 |

Ogni task ha anche un **tag di area**: `[BE]` Backend, `[FE]` Frontend, `[DB]` Database, `[INFRA]` Infrastruttura, `[LEGAL]` Legale, `[OPS]` Operations, `[MKT]` Marketing, `[SALES]` Sales, `[DESIGN]` Design.

---

## SEZIONE 1 — INFRASTRUTTURA & DEPLOY

### 1.1 Dominio e DNS
- [ ] 🔴 `[INFRA]` Acquistare dominio custom (splitplan.ai o splitplan.it) — ~€12-30/anno
- [ ] 🔴 `[INFRA]` Configurare DNS per puntare a Vercel
- [ ] 🔴 `[INFRA]` Aggiornare `FRONTEND_URL` in tutte le env variables Vercel
- [ ] 🔴 `[INFRA]` Aggiornare CORS whitelist in `main.py` — aggiungere il nuovo dominio alle `origins`
- [ ] 🔴 `[INFRA]` Aggiornare `success_url` e `cancel_url` in `payments.py` per usare il nuovo dominio
- [ ] 🟡 `[INFRA]` Configurare redirect 301 da `splitplan-ai.vercel.app` al dominio custom
- [ ] 🟡 `[INFRA]` Verificare che HSTS preload funzioni sul nuovo dominio

### 1.2 Vercel — Limiti Serverless
- [ ] 🟠 `[INFRA]` Upgrade a Vercel Pro ($20/mese) — timeout da 10s a 60s, necessario per pipeline AI+CP-SAT+OSRM
- [ ] 🟠 `[INFRA]` Testare i tempi reali della pipeline completa (generate-proposals → confirm-hotel → itinerary) e verificare che stia sotto i 60s
- [ ] 🟡 `[BE]` Se la pipeline supera i 60s, implementare pattern asincrono: endpoint che avvia il task + polling dal frontend per lo stato (`/trips/{id}/generation-status`)
- [ ] 🟢 `[INFRA]` Valutare migrazione backend a servizio long-running (Railway, Render, Fly.io) se i timeout rimangono un problema cronico

### 1.3 Supabase — Limiti Free Tier
- [ ] 🟠 `[INFRA]` Monitorare utilizzo storage attuale (limite free: 1GB database + 1GB storage)
- [ ] 🟠 `[INFRA]` Upgrade a Supabase Pro ($25/mese) prima del pilot aziendale — 8GB DB, 100GB storage
- [ ] 🟠 `[DB]` Verificare connessioni dirette: free tier ha 2 connessioni dirette — con più utenti concorrenti serve connection pooling (Supavisor, incluso nel Pro)
- [ ] 🟡 `[BE]` Aggiungere `pool_size` e `max_overflow` alla configurazione `create_engine()` in `database.py`
- [ ] 🟡 `[INFRA]` Abilitare Point-in-Time Recovery su Supabase Pro (incluso nel piano) — ripristino DB fino a 7 giorni indietro in caso di errori critici

### 1.6 Ambiente di Staging
- [ ] 🟡 `[INFRA]` Creare progetto Vercel separato per staging (`staging.splitplan.ai` o `splitplan-staging.vercel.app`)
- [ ] 🟡 `[INFRA]` Creare branch `staging` su GitHub con deploy automatico su push
- [ ] 🟡 `[DB]` Creare database Supabase separato per staging (free tier) — mai testare su dati di produzione
- [ ] 🟡 `[INFRA]` Configurare env vars separate per staging (Stripe test mode, Gemini key dedicata)

### 1.4 Email Professionale
- [ ] 🔴 `[INFRA]` Setup email professionale sul dominio custom (es. `info@splitplan.ai`, `support@splitplan.ai`)
- [ ] 🔴 `[INFRA]` Configurare SMTP sender con la nuova email (aggiornare env vars `SMTP_USER`, `SMTP_FROM`)
- [ ] 🟠 `[INFRA]` Setup SPF + DKIM + DMARC sul dominio per evitare che le email finiscano in spam
- [ ] 🟡 `[INFRA]` Valutare migrazione da SMTP generico a Resend (nel vostro tool stack, free tier 3k email/mese)

### 1.5 Monitoring & Error Tracking
- [ ] 🟠 `[INFRA]` Configurare alerting su errori backend (PostHog error tracking oppure Sentry free tier)
- [ ] 🟡 `[INFRA]` Aggiungere health check endpoint (`GET /api/health`) che verifica DB + servizi esterni
- [ ] 🟡 `[INFRA]` Dashboard costi: tracciare mensilmente spese Gemini API, Supabase, Vercel, Duffel

---

## SEZIONE 2 — DATABASE & MODELLI

### 2.1 Estensione Modello Company (B2B Core)
- [x] 🟠 `[DB]` Aggiungere campi al modello `Company`:
  - ✅ vat_number, billing_email, billing_address, stripe_customer_id, onboarded_at (migrazione `d2e3f4a5b6c7`)
  - ✅ plan, plan_expires_at, max_active_users, max_trips_per_month, max_ai_calls_per_day (migrazione `c1d2e3f4a5b6`)
- [x] 🟠 `[DB]` Creare migrazione Alembic per i nuovi campi Company (plan/limiti — `c1d2e3f4a5b6`; billing — `d2e3f4a5b6c7`)
- [ ] 🟡 `[DB]` Aggiungere tabella `CompanyInvoice` per storico fatture (o usare Stripe Billing direttamente)

### 2.2 Estensione Modello Trip (Workflow Approvazione)
- [x] 🟠 `[DB]` Aggiungere campo `approved_by: Optional[int]` (FK → Account) al modello Trip
- [x] 🟠 `[DB]` Aggiungere campo `approval_requested_at: Optional[datetime]`
- [x] 🟠 `[DB]` Aggiungere campo `rejection_reason: Optional[str]`
- [x] 🟠 `[DB]` Creare migrazione Alembic (`c1d2e3f4a5b6`)

### 2.3 Modello Notifiche
- [x] 🟠 `[DB]` Creare modello `Notification`:
  ```python
  class Notification(SQLModel, table=True):
      id: Optional[int] = Field(default=None, primary_key=True)
      account_id: int = Field(foreign_key="account.id")
      type: str          # "trip_created" | "approval_requested" | "trip_approved" | "trip_rejected" | "budget_exceeded"
      title: str
      message: str
      trip_id: Optional[int] = Field(default=None, foreign_key="trip.id")
      is_read: bool = False
      created_at: datetime = Field(default_factory=datetime.utcnow)
  ```
- [x] 🟠 `[DB]` Creare migrazione Alembic (`c1d2e3f4a5b6`)
- [x] 🟡 `[DB]` Aggiungere indice su `(account_id, is_read)` per query performanti

### 2.4 Pulizia Modelli Esistenti
- [x] 🟡 `[DB]` `datetime.utcnow` è deprecato in Python 3.12+ — unica occorrenza in `test_demo_emails.py`, sostituita con `datetime.now(timezone.utc)`
- [ ] 🟡 `[DB]` Il campo `Expense.involved_ids` è un JSON string (`"[1, 2, 3]"`) — valutare migrazione a campo JSON nativo PostgreSQL per query più pulite
- [ ] 🟢 `[DB]` Aggiungere soft delete (`deleted_at: Optional[datetime]`) su Trip e Account per compliance GDPR (attualmente hard delete)

---

## SEZIONE 3 — BACKEND — AUTENTICAZIONE & SICUREZZA

### 3.1 Auth Hardening
- [ ] 🟠 `[BE]` JWT in localStorage è vulnerabile a XSS — valutare migrazione a httpOnly cookie per token di sessione (non bloccante per MVP, ma critico per enterprise)
- [ ] 🟡 `[BE]` Aggiungere JWT refresh token mechanism — attualmente se il token scade l'utente deve ri-loggarsi
- [x] 🟡 `[BE]` Aggiungere rate limiting su endpoint di login (`/users/login`) per prevenire brute force (in-memory rolling window, 10 tentativi/15min per IP)
- [x] 🟡 `[BE]` Aggiungere rate limiting su `/users/register` (5/ora) e `/users/forgot-password` (3/ora)
- [x] 🟡 `[BE]` Aggiungere policy password minima: lunghezza ≥ 8 caratteri, almeno 1 numero — validazione sia FE (`Auth.jsx`) sia BE (`/users/register`)
- [ ] 🟡 `[BE]` Endpoint `POST /users/logout-all` che invalida tutti i token attivi dell'utente (aggiungere `token_version` o blacklist) — enterprise requirement
- [ ] 🟢 `[BE]` Implementare 2FA via TOTP (Google Authenticator) — richiesto da aziende enterprise per accessi sensibili
- [ ] 🟢 `[BE]` Implementare Microsoft SSO (Azure AD) — quasi tutte le aziende B2B target lo usano oltre a Google

### 3.2 Autorizzazione B2B
- [x] 🔴 `[BE]` Fixare endpoint `approve_trip` — verifica `current_user.is_manager == True` AND stessa company; 403 immediato se organizer_account è None
- [x] 🟠 `[BE]` `reject_trip` ora setta `status = "REJECTED"` (non più `BOOKED`) con `rejection_reason` nel body
- [x] 🟠 `[BE]` Il trip creato da un dipendente aziendale eredita `company_id` — aggiunto campo `Trip.company_id` (migrazione `e3f4a5b6c7d8`), auto-popolato in `create_trip` per trip BUSINESS
- [x] 🟠 `[BE]` Creare middleware/dependency `require_manager()` riutilizzabile per tutti gli endpoint manager-only
- [x] 🟡 `[BE]` Creare middleware `require_same_company(trip_id)` che verifica che l'utente appartenga alla stessa company del trip

---

## SEZIONE 4 — BACKEND — BUSINESS LOGIC B2B

### 4.1 Enforcement Limiti Piano
- [x] 🟠 `[BE]` Creare funzione `check_company_limits(company, action_type)` in `utils/access.py` — verifica trip mensili e chiamate AI giornaliere per company
- [x] 🟠 `[BE]` Integrare `check_company_limits` negli endpoint: `create_trip`, `generate_proposals`, `estimate_budget`, `chat_with_ai`
- [x] 🟠 `[BE]` Utenti aziendali bypassano `check_rate_limit()` individuale in `confirm_hotel` e altri endpoint AI

### 4.2 Workflow Approvazione (Completare)
- [x] 🟠 `[BE]` Ristrutturare `request_approval` — verifica BUSINESS + partecipante, setta PENDING_APPROVAL + approval_requested_at, notifica manager via Notification + email
- [x] 🟠 `[BE]` Ristrutturare `approve_trip` — verifica is_manager + stessa company, setta APPROVED + approved_by, crea Notification + invia email organizzatore
- [x] 🟠 `[BE]` Ristrutturare `reject_trip` — verifica is_manager + stessa company, accetta rejection_reason nel body, setta REJECTED, crea Notification + invia email con motivo

### 4.3 Notifiche
- [x] 🟠 `[BE]` Creare router `notifications.py`:
  - `GET /notifications` — lista notifiche dell'utente corrente (paginate)
  - `POST /notifications/{id}/read` — segna come letta
  - `POST /notifications/read-all` — segna tutte come lette
  - `GET /notifications/unread-count` — conteggio non lette (per badge UI)
- [x] 🟠 `[BE]` Creare service `notification_service.py` con funzioni helper:
  - `create_notification(account_id, type, title, message, trip_id)`
  - `notify_managers(company_id, type, title, message, trip_id)`
  - `send_notification_email(account, notification)`
- [x] 🟡 `[BE]` Integrare notifiche negli eventi chiave: trip creato (BUSINESS), budget superato, nota spese generata, nuovo membro company
  - ✅ `trips.py` `create_trip`: `notify_managers()` quando trip_intent=BUSINESS
  - ✅ `expenses.py` `create_expense`: `create_notification()` + `notify_managers()` al primo superamento di budget_max
  - ✅ `companies.py` `join_company`: `notify_managers()` quando un nuovo membro si unisce

### 4.4 Export & Reportistica (Mancante — Critico per B2B)
- [x] 🟠 `[BE]` Endpoint `GET /companies/{id}/expenses/export?format=csv&month=YYYY-MM` — export CSV spese trip aziendali con filtro mese opzionale
- [x] 🟠 `[BE]` Endpoint `GET /trips/{id}/expense-report/pdf` — genera PDF nota spese via `pdf_service.generate_nota_spese`
- [x] 🟠 `[FE]` Pulsante "Esporta Spese CSV" in CompanyDashboard con selettore mese
- [x] 🟠 `[FE]` Pulsante "Nota Spese PDF" in Dashboard visibile per trip BUSINESS APPROVED
- [ ] 🟡 `[BE]` Aggiungere filtri all'export: per dipendente, per range date, per stato trip (APPROVED/COMPLETED)

### 4.4b Onboarding Company Admin
- [x] 🟠 `[FE]` Checklist onboarding dinamica in CompanyDashboard: sparisce quando trips.length > 0, spunta "Invita team" quando totalMembers > 1
- [x] 🟡 `[BE]` Endpoint `POST /companies/{id}/invite-bulk` — accetta lista email, invia inviti massivi
- [ ] 🟡 `[FE]` UI per upload CSV di dipendenti (colonne: email, nome, cognome) — alternativa più veloce all'invito manuale uno per uno

### 4.5 Dashboard Manager Arricchita
- [x] 🟠 `[BE]` Estendere `GET /business-overview` con analytics (monthly_spend, top_destinations, trips_by_status — implementati); manca ancora `employees_traveled_per_month`
  - ✅ Spesa totale per mese (somma Expense dei trip BUSINESS della company)
  - ✅ Top 5 destinazioni per frequenza
  - ✅ Breakdown per stato (pending/approved/completed)
  - [x] Numero dipendenti che hanno viaggiato nel mese (`employees_traveled` per mese in monthly_spend)
- [ ] 🟡 `[BE]` Creare `GET /companies/{id}/analytics` con dati aggregati:
  - Spesa per dipartimento (richiede campo `department` su Account — futuro)
  - Costo medio per viaggio
  - Trend mensile spese (ultimi 6 mesi)

### 4.6 Stripe B2B
- [ ] 🟠 `[BE]` Creare prodotti Stripe per piani B2B:
  - Corporate Starter: €349/mese, €2.990/anno
  - Business Growth: €890/mese, €7.990/anno
  - Enterprise: custom (gestito manualmente)
- [ ] 🟠 `[BE]` Creare endpoint `POST /companies/{id}/subscribe` che crea Stripe Checkout Session per piano B2B
- [ ] 🟠 `[BE]` Aggiornare webhook Stripe per gestire eventi di subscription B2B (aggiornare Company.plan, Company.plan_expires_at)
- [ ] 🟡 `[BE]` Implementare Stripe Customer Portal per B2B (cambio piano, cancellazione, update carta)
- [ ] 🟡 `[BE]` Implementare fatturazione automatica con Stripe Invoicing (necessario per B2B Italia)

### 4.7 Voli & Hotel — Deep Link Improvement (No intermediazione)
- [x] 🟡 `[BE]` Il `booking_url` nei risultati Duffel è hardcoded `"#"` — sostituire con deep link a Skyscanner/Kiwi con parametri pre-compilati (origin, destination, dates, passengers) come fallback
  - ✅ `flights.py`: `_skyscanner_url()` helper + booking_url parametrico nei risultati Duffel
  - ✅ `trips.py` `search-options`: post-processing URL AI → Booking.com per hotel, Skyscanner/Kiwi per voli
- [ ] 🟡 `[BE]` Valutare Skyscanner Affiliate API per link con tracking commissione
- [ ] 🟢 `[BE]` Ricerca hotel: attualmente solo deep link Booking.com. Valutare Booking.com Affiliate API o Amadeus Hotel Search per risultati in-app

---

## SEZIONE 5 — BACKEND — QUALITÀ & ROBUSTEZZA

### 5.1 Error Handling
- [x] 🟡 `[BE]` Il global exception handler in `main.py` cattura tutto con 500 generico — aggiungere logging strutturato con traceback completo
  - ✅ `global_exception_handler`: log tipo eccezione + traceback completo via `traceback.format_exc()`; `basicConfig` ora fa stream su stdout
- [ ] 🟡 `[BE]` Aggiungere validation esplicita su tutti gli endpoint che accettano input utente (Pydantic models per request body dove mancano)
- [ ] 🟡 `[BE]` Endpoint `search_flights`: gestire il caso in cui Duffel API key non è valida con messaggio user-friendly

### 5.2 Testing
- [ ] 🟠 `[BE]` I test esistenti (`test_auth.py`, `test_expenses.py`, `test_trips.py`) — verificare che passino con la codebase corrente
- [ ] 🟡 `[BE]` Aggiungere test per il workflow di approvazione B2B
- [ ] 🟡 `[BE]` Aggiungere test per i limiti di piano Company
- [ ] 🟡 `[BE]` Aggiungere test per il webhook Stripe B2B
- [ ] 🟡 `[BE]` Aggiungere `pip-audit` e `npm audit` al CI per rilevare dipendenze con vulnerabilità note — enterprise security requirement
- [ ] 🟢 `[BE]` Setup CI con GitHub Actions: lint + test su ogni push

### 5.3 Performance
- [x] 🟡 `[BE]` `get_business_overview` fa N+1 query — ottimizzato con fetch bulk organizzatori e proposte (2 query invece di 2N)
- [x] 🟡 `[BE]` `get_my_trips` potenzialmente lenta con molti trip — aggiungere paginazione
  - ✅ `trips.py`: `skip`/`limit` query params, risposta `{trips, total, skip, limit}`, ordinamento `Trip.id.desc()`
  - ✅ `api.js`: `getUserTrips(skip, limit)` con defaults `(0, 20)`
  - ✅ `MyTrips.jsx`: stato `totalTrips`/`skip`, bottone "Carica altri" con contatore rimanenti
- [ ] 🟢 `[BE]` Aggiungere caching (in-memory o Redis) per risposte Nominatim/Overpass frequenti

### 5.3b Email Templates
- [x] 🟡 `[BE]` Creare template HTML per le email transazionali principali in `email_templates.py`:
  - ✅ Benvenuto nuovo utente (`welcome_email`)
  - ✅ Reset password (`reset_password_email`)
  - ✅ Invito a company aziendale (`company_invite_email`) — usato in `invite-bulk`
  - ✅ Richiesta approvazione trip (`email_approval_requested`) — migrato da notification_service
  - ✅ Trip approvato / rifiutato (`email_trip_approved`, `email_trip_rejected`) — migrati e migliorati
- [x] 🟡 `[BE]` Template parametrizzati con f-string (Jinja2 non necessario per questo caso d'uso)

### 5.4 Pulizia Codice
- [x] 🟡 `[BE]` Rimuovere tutti gli endpoint `migrate-*` deprecati in `trips.py` — già rimossi, le righe 329-480 contengono utility functions valide
- [ ] 🟡 `[BE]` `trips.py` è un file da 2995 righe — splittare in moduli più piccoli (trip CRUD, proposals, itinerary, budget, business)
- [ ] 🟢 `[BE]` Standardizzare i response model: alcuni endpoint ritornano dict arbitrari, altri usano Pydantic models

---

## SEZIONE 6 — FRONTEND

### 6.1 Cookie Banner GDPR
- [x] 🔴 `[FE]` Implementare cookie banner (`CookieBanner.jsx`) con localStorage — "Accetta" / "Solo necessari"
- [x] 🔴 `[FE]` GA4 condizionata al consenso in `App.jsx`; PostHog condizionata in `PostHogProvider.jsx` (fix 2026-04-11)
- [ ] 🔴 `[FE]` Testare che il banner funzioni su mobile e desktop

### 6.2 Notifiche UI
- [x] 🟠 `[FE]` Icona campanella in Navbar con badge rosso conteggio non-lette
- [x] 🟠 `[FE]` Dropdown scrollabile con lista notifiche, click → mark as read + naviga al trip
- [x] 🟠 `[FE]` Polling ogni 30s per `unread-count`
- [ ] 🟡 `[FE]` Aggiungere suono/vibrazione su notifica critica (approvazione richiesta, budget superato)

### 6.3 CompanyDashboard Enhancement
- [x] 🟠 `[FE]` Aggiungere sezione analytics: grafici spesa mensile, breakdown per stato trip
- [x] 🟠 `[FE]` Mostrare il motivo del rifiuto quando un trip è REJECTED (banner rosso in Dashboard)
- [x] 🟠 `[FE]` Tab "Membri" con lista dipendenti + bulk invite via textarea email
  - ✅ Sezione "Trasferte / Membri" switcher in CompanyDashboard
  - ✅ Lista membri con avatar, nome, email, badge Manager/Dipendente
  - ✅ Search bar real-time filtro su nome + email
- [ ] 🟡 `[FE]` Aggiungere tab "Impostazioni" con configurazione policy (max budget per trip, ecc.)
- [ ] 🟡 `[FE]` Aggiungere tab "Fatturazione" con link a Stripe Customer Portal

### 6.4 Workflow Approvazione UI
- [x] 🟠 `[FE]` Bottone "Richiedi Approvazione" in Dashboard trip BUSINESS quando status è BOOKED
- [x] 🟠 `[FE]` Banner colorato per stato: PENDING_APPROVAL (giallo), APPROVED (verde), REJECTED (rosso con motivo)
- [x] 🟠 `[FE]` CompanyDashboard: quick-action approve/reject con campo motivazione per il reject (modal inline)

### 6.5 Pricing Page B2B
- [x] 🟠 `[FE]` Creare pagina `/pricing-business` o sezione dedicata che mostra i 3 piani B2B (Starter, Growth, Enterprise)
- [x] 🟠 `[FE]` Aggiornare `App.jsx` per includere route `/pricing-business` (CTA → /demo finché Stripe non è live)
- [ ] 🟡 `[FE]` Sincronizzare prezzi in `llms.txt` con i prezzi reali (attualmente mostra €7.99 B2C)

### 6.6 UX Polish
- [ ] 🟡 `[FE]` Loading states: alcuni componenti non mostrano skeleton/spinner durante caricamento (CompanyDashboard lo fa, verificare Dashboard, MyTrips)
- [ ] 🟡 `[FE]` Empty states: cosa vede un utente quando non ha trip? Quando la company non ha trasferte? Aggiungere illustrazioni/CTA
- [ ] 🟡 `[FE]` Error states: il global error handler mostra toast, ma alcuni errori critici (DB down, API unreachable) meritano una pagina dedicata
- [ ] 🟡 `[FE]` `ErrorBoundary.jsx` — verificare che il fallback UI sia informativo e non un div vuoto
- [ ] 🟢 `[FE]` Accessibilità: verificare contrast ratio, keyboard navigation, screen reader labels sui componenti principali

### 6.7 Ricerca & Filtri
- [x] 🟡 `[FE]` Barra di ricerca testo in `MyTrips.jsx` — filtra per nome viaggio e destinazione (client-side)
- [x] 🟡 `[FE]` Dropdown filtro stato (Tutti / In corso / Approvati / Completati) combinato con ricerca testo; empty state con CTA reset
- [ ] 🟡 `[FE]` Ricerca membri in CompanyDashboard tab "Membri" — per company con molti dipendenti

### 6.8 Mobile Responsiveness
- [ ] 🟡 `[FE]` Testare tutti i flussi critici su mobile (survey wizard, voting, budget, timeline)
- [ ] 🟡 `[FE]` CompanyDashboard: verificare che la tabella trasferte sia scrollabile su mobile
- [ ] 🟡 `[FE]` PWA: verificare che il manifest sia corretto e che l'app sia installabile da mobile

---

## SEZIONE 7 — LEGALE & COMPLIANCE

### 7.1 Forma Giuridica
- [ ] 🔴 `[LEGAL]` Decisione: SRLS (più economica, ~€400-600) vs SRL Innovativa (benefici fiscali ma requisiti più stringenti)
- [ ] 🔴 `[LEGAL]` Identificare il parente adulto che farà da amministratore unico
- [ ] 🔴 `[LEGAL]` Consulenza con commercialista: struttura societaria, ruolo dei founder minorenni, work-for-equity D.L. 179/2012
- [ ] 🔴 `[LEGAL]` Costituzione della società dal notaio (necessaria prima del primo euro incassato)
- [ ] 🔴 `[LEGAL]` Apertura conto corrente aziendale
- [ ] 🔴 `[LEGAL]` Registrazione account Stripe Business a nome della società

### 7.2 Compliance GDPR
- [ ] 🔴 `[LEGAL]` Cookie banner (vedi 6.1) — obbligatorio per legge, non opzionale
- [ ] 🟠 `[LEGAL]` Preparare DPA (Data Processing Agreement) template per clienti B2B — te lo chiederanno
- [ ] 🟠 `[LEGAL]` Verificare DPA con sub-processori: Supabase, Google (Gemini API), Stripe, PostHog
- [ ] 🟡 `[LEGAL]` Registro dei trattamenti (Art. 30 GDPR) — documento interno che elenca tutti i trattamenti dati
- [ ] 🟡 `[LEGAL]` DPIA (Data Protection Impact Assessment) per il processing AI — il GDPR lo richiede quando si usa profilazione automatizzata

### 7.3 Contrattualistica B2B
- [ ] 🟠 `[LEGAL]` Preparare template contratto B2B (Termini di Servizio B2B + SLA + pricing + clausola recesso)
- [ ] 🟠 `[LEGAL]` Disclaimer esplicito: "SplitPlan è un software di pianificazione, non un'agenzia di viaggio. Non intermediamo la vendita di servizi turistici."
- [ ] 🟡 `[LEGAL]` Aggiornare Terms of Service con sezione specifica per piani Starter/Growth/Enterprise e relativi limiti
- [ ] 🟡 `[LEGAL]` Preparare NDA template per pilot aziendali (l'azienda potrebbe richiederlo)

### 7.4 Fatturazione
- [ ] 🔴 `[LEGAL]` Setup fatturazione elettronica (SDI) — obbligatorio per vendita B2B in Italia. Fatture in Cloud è nel vostro stack a €0
- [ ] 🟠 `[LEGAL]` Configurare Stripe Tax o integrazione con Fatture in Cloud per emissione automatica fatture
- [ ] 🟡 `[LEGAL]` Definire regime IVA: se SRLS con regime forfettario (possibile se fatturato < €85k), niente IVA in fattura

---

## SEZIONE 8 — STRIPE & PAGAMENTI

### 8.1 Stripe Setup Produzione
- [ ] 🔴 `[BE]` Passare Stripe da modalità test a modalità live
- [ ] 🔴 `[BE]` Creare account Stripe verificato (richiede società costituita, vedi 7.1)
- [ ] 🔴 `[BE]` Configurare webhook endpoint live in Stripe Dashboard (URL: `https://DOMINIO/api/payments/webhook`)
- [ ] 🔴 `[BE]` Aggiornare `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` nelle env vars di produzione

### 8.2 Prodotti B2C (Esistenti — Verificare)
- [ ] 🟠 `[BE]` Verificare che i 4 prodotti B2C (credit_1, credit_3, sub_monthly, sub_annual) siano creati in modalità live
- [ ] 🟠 `[BE]` I prezzi B2C nel codice (€3.99, €8.99, €7.99/mese, €76.99/anno) non matchano quelli nella landing page (€7.99/mese, €76.99/anno) — ALLINEARE
- [ ] 🟠 `[BE]` Aggiornare `PRODUCTS` dict in `payments.py` con i prezzi corretti

### 8.3 Prodotti B2B (Nuovi)
- [ ] 🟠 `[BE]` Creare in Stripe (live) i prodotti B2B:
  - Corporate Starter Monthly: €349/mese
  - Corporate Starter Annual: €2.990/anno
  - Business Growth Monthly: €890/mese
  - Business Growth Annual: €7.990/anno
- [ ] 🟠 `[BE]` Creare endpoint `POST /companies/create-checkout` separato dal B2C
- [ ] 🟠 `[BE]` Gestire nel webhook la logica: checkout B2B → aggiornare Company.plan e limiti
- [ ] 🟡 `[BE]` Enterprise: nessun self-service checkout — contratto firmato + fattura manuale

### 8.4 Fatturazione B2B
- [ ] 🟠 `[BE]` Abilitare Stripe Invoicing per clienti B2B (fattura con P.IVA obbligatoria in Italia)
- [ ] 🟡 `[BE]` Configurare Stripe Tax per calcolo IVA automatico (o gestire manualmente con Fatture in Cloud)

---

## SEZIONE 9 — SALES & CRM

### 9.1 HubSpot Setup
- [ ] 🟠 `[SALES]` Creare account HubSpot free
- [ ] 🟠 `[SALES]` Configurare pipeline sales: Lead → Discovery Call → Demo → Proposta → Pilot → Chiusura
- [ ] 🟠 `[SALES]` Integrare form `/demo` con HubSpot (webhook o API) per creare automaticamente un deal alla compilazione
- [ ] 🟡 `[SALES]` Configurare email sequences per lead nurturing (email 1: grazie per il contatto, email 2: caso d'uso, email 3: proposta call)

### 9.2 Processo Sales
- [ ] 🟠 `[SALES]` Definire chi risponde ai lead demo (Gialone CEO?)
- [ ] 🟠 `[SALES]` Definire SLA: lead contattato entro 24h lavorative dalla compilazione del form
- [ ] 🟠 `[SALES]` Preparare script per Discovery Call (30 min):
  - Quanti viaggi aziendali/anno?
  - Chi organizza? (HR, team lead, admin?)
  - Cosa usate oggi? (Excel, WhatsApp, Concur, niente?)
  - Qual è il pain point principale?
  - Budget per tool di travel management?
- [ ] 🟠 `[SALES]` Preparare demo personalizzabile (45 min): flusso end-to-end con dati finti dell'azienda del prospect
- [ ] 🟡 `[SALES]` Preparare PDF proposta commerciale con i 3 piani (già nel pricing document — formattare come documento professionale)
- [ ] 🟡 `[SALES]` Preparare obiezioni comuni e risposte (vs Concur, vs "facciamo già con email", vs "è troppo caro")

### 9.3 Pilot Framework
- [ ] 🟠 `[SALES]` Definire offerta pilot standard: 60 giorni gratuiti, feedback bisettimanale, case study se soddisfatti
- [ ] 🟠 `[SALES]` Preparare "Pilot Agreement" (1 pagina): cosa offrite, cosa chiedete, timeline, metriche di successo
- [ ] 🟠 `[SALES]` Definire metriche da tracciare durante il pilot:
  - Task completion rate (% trip completati end-to-end)
  - Tempo medio per organizzare un viaggio (prima vs dopo)
  - NPS dei partecipanti
  - Feature adoption (quali tab usano, quali ignorano)
  - Bug e friction points segnalati

---

## SEZIONE 10 — MARKETING

### 10.1 Social Proof
- [ ] 🟠 `[MKT]` Ottenere almeno 1 testimonial/quote dall'azienda pilot per la landing page
- [ ] 🟠 `[MKT]` Creare sezione "Trusted by" sulla landing page (anche con 1 solo logo + quote)
- [ ] 🟡 `[MKT]` Preparare 1 case study scritto: problema → soluzione → risultati (per Talentis e per la pagina B2B)
- [ ] 🟡 `[MKT]` Video testimonial (anche 30 secondi) dal manager dell'azienda pilot

### 10.2 Content & SEO
- [ ] 🟡 `[MKT]` Creare blog minimo (anche solo 3-5 articoli) su: "come organizzare trasferte aziendali", "costi nascosti della gestione viaggi manuali", "alternativa a Concur per PMI"
- [ ] 🟡 `[MKT]` Aggiornare `llms.txt` con pricing B2B corretto e feature list aggiornata
- [ ] 🟡 `[MKT]` Aggiornare `sitemap.xml` con tutte le pagine pubbliche
- [ ] 🟡 `[MKT]` Verificare meta tags (title, description, og:image) su tutte le pagine pubbliche
- [ ] 🟢 `[MKT]` Landing page verticale SEO: `/per-aziende` o `/business` con contenuto dedicato al B2B

### 10.3 Social Media
- [ ] 🟡 `[MKT]` Creare pagina LinkedIn aziendale SplitPlan
- [ ] 🟡 `[MKT]` Paternò (Marketing) pubblica 2-3 post/settimana su LinkedIn: behind the scenes startup, problem-solution, dati travel management
- [ ] 🟢 `[MKT]` Instagram per brand awareness B2C (secondario)

### 10.4 Video & Demo
- [ ] 🟠 `[MKT]` Video demo di 2 minuti del flusso B2B end-to-end (per Talentis e per la pagina demo)
- [ ] 🟡 `[MKT]` Screen recording del flusso completo: survey → AI proposals → voting → itinerary → expenses → report

---

## SEZIONE 11 — TALENTIS PREPARATION (Deadline: 5 giugno 2026)

### 11.1 Pilot Execution
- [ ] 🔴 `[OPS]` Ottenere via libera dal padre di Gialone per test informale su un team (settimana 7-13 aprile)
- [ ] 🔴 `[OPS]` Identificare il dipartimento/team specifico (idealmente 10-20 persone con un off-site/trasferta nei prossimi 2 mesi)
- [ ] 🟠 `[OPS]` Creare Company nel sistema + invite link per il team
- [ ] 🟠 `[OPS]` Fare onboarding guidato (voi presenti, in-person o video)
- [ ] 🟠 `[OPS]` Documentare TUTTO: screenshot, tempi, feedback verbali, problemi tecnici

### 11.2 Metriche per Pitch
- [ ] 🟠 `[OPS]` Tracciare e documentare:
  - Numero utenti attivi nel pilot
  - Numero trip completati end-to-end
  - Ore risparmiate (stima basata su confronto con processo precedente)
  - Bug critici trovati e risolti
  - NPS score (survey a fine pilot)
  - Feature più usate / meno usate

### 11.3 Deliverables Talentis
- [ ] 🟠 `[MKT]` Aggiornare pitch deck con dati reali dal pilot (non proiezioni)
- [ ] 🟠 `[MKT]` Preparare demo live impeccabile (non video registrato — demo dal vivo con dati reali)
- [ ] 🟠 `[MKT]` Preparare risposte a domande prevedibili della giuria:
  - "Perché un'azienda dovrebbe usarvi invece di Concur?"
  - "Come monetizzate?"
  - "Qual è il vostro vantaggio competitivo?"
  - "Come scalate?"
  - "Siete minorenni — come gestite la parte legale?"
- [ ] 🟡 `[MKT]` Business plan aggiornato con unit economics reali (costo per cliente, margine, CAC, LTV)
- [ ] 🟡 `[MKT]` One-pager riassuntivo (1 pagina PDF: problema, soluzione, traction, team, ask)

---

## SEZIONE 12 — NICE-TO-HAVE (Post-Lancio)

### 12.1 Feature B2B Avanzate (Roadmap Enterprise)
- [ ] 🟢 `[BE]` SSO SAML 2.0 (Okta, Azure AD) — necessario per Enterprise
- [ ] 🟢 `[BE]` SCIM provisioning — sync utenti da Active Directory
- [ ] 🟢 `[BE]` White-label parziale — logo aziendale, colori brand
- [ ] 🟢 `[BE]` URL custom (es. travel.azienda.com) — richiede wildcard SSL e DNS config
- [ ] 🟢 `[BE]` API pubblica con rate limiting (50k call/mese per Enterprise)
- [ ] 🟢 `[BE]` Multi-workspace per dipartimenti con admin separato
- [ ] 🟢 `[BE]` Audit log completo (export CSV, GDPR-ready)
- [ ] 🟢 `[BE]` Report automatici mensili via email al CFO/HR Director

### 12.2 Pagamenti Passanti (Duffel Access)
- [ ] 🟢 `[BE]` Contattare Duffel Sales per accesso a Duffel Access API
- [ ] 🟢 `[BE]` Implementare salvataggio payment method aziendale (carta Amex/Visa corporate)
- [ ] 🟢 `[BE]` Implementare flusso: approvazione → prenotazione automatica via Duffel → addebito diretto
- [ ] 🟢 `[BE]` Integrare provider hotel con pagamento passante (Amadeus/Hotelbeds)

### 12.3 App Mobile
- [ ] 🟢 `[FE]` Portare l'app Expo a production-ready
- [ ] 🟢 `[FE]` Publicare su TestFlight (iOS) e Play Store Internal Testing (Android)
- [ ] 🟢 `[FE]` Push notifications native per approvazioni e alert budget

### 12.4 AI Avanzata
- [ ] 🟢 `[BE]` AI personalizzata per policy aziendale — l'AI suggerisce solo opzioni compatibili con travel policy (budget max, compagnie preferite, hotel convenzionati)
- [ ] 🟢 `[BE]` AI che apprende dalle preferenze passate dell'azienda (destinazioni ricorrenti, budget tipici)
- [ ] 🟢 `[BE]` Mappe offline scaricabili (richiede tile server o integrazione MapTiler)

---

## RIEPILOGO CONTEGGIO

| Priorità | Conteggio |
|----------|-----------|
| 🔴 BLOCCANTE | 22 task |
| 🟠 CRITICO | 73 task |
| 🟡 IMPORTANTE | 78 task |
| 🟢 NICE-TO-HAVE | 25 task |
| **TOTALE** | **198 task** |

**Revisione 2026-04-07 (+21 task):** staging environment (§1.6), export PDF/CSV spese (§4.4), onboarding admin aziendale (§4.4b), bulk invite CSV, password policy, logout-all sessioni, 2FA TOTP, email templates HTML (§5.3b), ricerca/filtri MyTrips (§6.7), PITR Supabase, dependency audit CI.

**Revisione 2026-04-11 — Task completati in sessione di sviluppo:**
- §2.2 Trip: campi `approved_by`, `approval_requested_at`, `rejection_reason` + migrazione Alembic ✅
- §2.3 Modello `Notification` + migrazione + indice ✅
- §2.1 Company: campi piano/limiti + migrazione Alembic ✅
- §3.1 Rate limiting auth (login/register/forgot-password) + password policy BE+FE ✅
- §3.2 `require_manager()` dependency, `approve_trip` security fix, `reject_trip` → status REJECTED ✅
- §4.1 `check_company_limits()` in `access.py` + integrazione negli endpoint AI ✅
- §4.2 Workflow approvazione completo (request/approve/reject con notifiche + email) ✅
- §4.3 `notifications.py` router + `notification_service.py` ✅
- §4.4 Export CSV spese aziendali + PDF nota spese (BE + FE) ✅
- §4.4b Checklist onboarding CompanyDashboard + bulk invite endpoint ✅
- §6.1 Cookie banner GDPR + gate PostHog/GA4 al consenso ✅
- §6.2 Notification bell Navbar con polling 30s + click → naviga al trip ✅
- §6.4 Approval workflow UI completo (banner stato, bottoni approva/rifiuta manager, motivo rifiuto) ✅
- §6.3 Tab "Membri" + rejection reason visibile ✅
- §6.7 Search + filtri stato in MyTrips ✅
- Bug fix critici: `confirm_option` AttributeError, `generate_proposals` swallow HTTPException, `update_trip` privilege escalation, cross-company bypass in approve/reject, Gemini 503 retry esponenziale ✅

---

## TIMELINE SUGGERITA

| Periodo | Focus | Task Target |
|---------|-------|-------------|
| **Settimana 1-2** (7-20 aprile) | 🔴 Bloccanti + Pilot setup | Dominio, cookie banner, approval workflow BE, pilot kickoff |
| **Settimana 3-4** (21 apr - 4 maggio) | 🟠 Critici B2B core | Company model, limiti piano, notifiche, CompanyDashboard FE |
| **Settimana 5-6** (5-18 maggio) | 🟠 Stripe B2B + Sales | Prodotti Stripe B2B, HubSpot, contratto template, pilot data |
| **Settimana 7-8** (19 maggio - 1 giugno) | Talentis prep | Pitch deck con dati reali, demo live polish, metriche pilot |
| **Settimana 9** (2-5 giugno) | Final polish | Dress rehearsal pitch, fix last bugs, Talentis finale |
| **Post-Talentis** (giugno+) | 🟡 + 🟢 | Testing, SEO, feature enterprise, app mobile |

---

*Roadmap generata per SplitPlan AI — Revisione suggerita: ogni 2 settimane*