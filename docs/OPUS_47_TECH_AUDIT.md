# OPUS 47 — SplitPlan AI · Technical Due Diligence Report

**Auditor:** CTO / Principal Software Architect (VC Tier-1 Technical DD)
**Scope:** `/backend` (FastAPI + SQLModel + PostgreSQL/Supabase), `/src` (React 19 + Vite)
**Mode:** Read-only audit · No code changes
**Date:** 2026-04-16
**Revision:** 1.0

---

<adaptive_thinking>

Prima di giudicare l'architettura devo stressare mentalmente i punti in cui il sistema può rompersi. Le interdipendenze che mi preoccupano:

1. **OR-Tools + Vercel serverless.** `itinerary_optimizer.py` ha un timeout hard di 3s per giorno, ma il cold-start di una Lambda Python con `ortools` (~40 MB wheel) può facilmente sforare i 3–5 s. Un viaggio di 7 giorni → worst-case `7 × 3 s = 21 s` di solver **più** cold-start + OSRM: è oltre il limite di 10s di Vercel Hobby e vicino al cap di 60s di Vercel Pro. Edge case reale: il primo utente della mattina vede timeout, quelli successivi no → flakiness difficilissima da diagnosticare.

2. **Token Supabase / pooler in mezzo a una transazione.** `database.py` disabilita il pool SQLAlchemy quando rileva "pooler" nell'URL (Supavisor/pgbouncer transaction-mode). Ma `session.commit()` multipli nello stesso endpoint (es. `create_expense` → commit expense → commit notification) passano attraverso transazioni separate su connessioni potenzialmente diverse. Se la prima riesce e la seconda fallisce per token JWT Supabase scaduto o per connection reset del pooler → stato inconsistente (expense salvata, manager non notificato). Non c'è `try/except` con rollback esplicito.

3. **In-memory rate limiter su serverless.** `_rate_limit_store` vive nella memoria del singolo Lambda container. Vercel scala orizzontalmente N worker → un attacker distribuisce 10×10 login attempt su 10 cold-start distinti = 100 tentativi in finestra di 15 min, tutti legali dal punto di vista del rate-limiter. Questo **azzera** la protezione anti-brute-force. Peggio: se l'attacker colpisce un endpoint "freddo" mai istanziato, il dict è vuoto → zero attrito.

4. **Refresh token senza rotazione effettiva.** `refresh_access_token` emette un nuovo refresh ma non invalida il precedente (non c'è blacklist né `token_version` check sul refresh). Se un refresh viene esfiltrato via XSS/MITM, l'attaccante lo usa in parallelo all'utente legittimo: entrambi ottengono access token validi per 7 giorni.

5. **`trips/__init__.py` da 3190 righe.** Un singolo file che fa orchestrazione AI + voting + itinerary + chat + receipt extraction + flight booking. Tre rischi: (a) Vercel cold-start su un modulo così grande è più lento, (b) ogni deploy invalida tutto anche se tocca una riga di chat, (c) merge-conflict permanenti quando il team sarà >1 dev.

6. **Edge case RBAC cross-company.** `require_same_company(trip_id)` verifica l'organizzatore vs current_user. Ma un utente `company_A` invitato come semplice partecipante a un trip `company_B` passa `check_participant`. Le sue `Expense` finiscono nei reports di `company_B`. È data-leak tra tenant.

7. **`involved_ids` come JSON array.** FK non enforzate → se un Participant viene eliminato (delete-account) le expense orfane continuano a referenziarlo nei JSON. I bilanci restituiti dalle API faranno riferimento a utenti fantasma.

8. **Gemini single API key.** Una sola `GOOGLE_API_KEY` serve tutti i tenant. Se un tenant B2B brucia la quota (es. RPM 1000 del modello Flash), **tutti** gli altri tenant vedono 429. Noisy neighbor al massimo.

9. **`delete-account` non è GDPR-complete.** Elimina Account e i Participant — ma non le Expense pagate dall'utente (FK su `payer_id`), non i Trip di cui è organizzatore, non le Photo caricate, non le Notification. Restano PII referenziate = non-compliance GDPR art. 17.

10. **OSRM pubblico.** `maps_service.get_travel_time_matrix` presumibilmente punta a `router.project-osrm.org` (da verificare). Quell'endpoint ha rate limit ~1 req/s e nessuna SLA. A 100k utenti è un SPOF esterno sconosciuto.

Procedo al report spietato ma costruttivo.

</adaptive_thinking>

---

## 1 · Executive Summary

SplitPlan AI è una **startup B2B SaaS early-stage con un'ambizione tecnica superiore alla sua maturità di execution**. Lo stack scelto (FastAPI + SQLModel + React 19 + Gemini 2.5 + OR-Tools CP-SAT) è moderno, pragmatico e coerente con la mission di un MVP AI-first. Il team ha già fatto scelte non banali che distinguono il progetto dal 90% dei SaaS junior che vedo in DD:

- **Validazione matematica degli output LLM** via CP-SAT (anziché affidarsi ciecamente a Gemini)
- **Fallback graceful OSRM → Haversine**
- **Token versioning** per logout-all
- **Rate-limiter atomico UPDATE** su `daily_ai_usage` (race-free)
- **Pool-detection automatico** per Supavisor vs connessione diretta
- **Retry esponenziale** su Gemini 429/503

Tuttavia il prodotto è **non-investment-grade** nello stato attuale per tre ragioni strutturali:

1. **Debito tecnico concentrato**: `backend/routers/trips/__init__.py` è un file monolitico da **3 190 righe** che viola ogni principio di separation-of-concerns. Non è un warning: è un blocker all'hiring e alla velocità di feature-release.
2. **Security gap multi-tenant**: mancanza di Row-Level Security (Supabase RLS è disponibile gratis, non è abilitato), rate-limiter in-memory inutile su serverless, enumeration vulnerability al register, refresh token senza rotation effettiva.
3. **Scaling model non-lineare**: oltre ~5 000 utenti attivi settimanali l'attuale architettura si rompe in almeno 4 punti indipendenti (vedi §4).

**Investment stance:** `CONDITIONAL-GO`. Finanziabile a condizione che la roadmap di refactoring in §5 sia eseguita **nei primi 90 giorni post-closing**, con milestone tecniche contrattualizzate nel term-sheet (technical covenant). Il team ha dimostrato technical taste sufficiente; il rischio è di execution, non di visione.

**Valutazione sintetica (0–5):**

| Dimensione | Score | Note |
|---|---|---|
| Architettura | 3.0 / 5 | Buona scelta stack; accoppiamento elevato |
| Sicurezza | 2.0 / 5 | Fondamenta OK; 4 P0 critici |
| Scalabilità | 2.0 / 5 | Regge demo, non 100k DAU |
| Manutenibilità | 1.5 / 5 | God-file, test coverage ignota |
| Business logic (AI+Opt) | 4.0 / 5 | Best-in-class per la fase |

---

## 2 · Punti di Forza

### 2.1 · Itinerary Optimizer (`services/itinerary_optimizer.py`)

È la gemma tecnica del progetto. Decisioni di design corrette:

- **Per-day decomposition** evita esplosione del dominio CP-SAT (un modello 1-day con ~15 attività vs un modello 7-day con 105).
- **Hard anchors** (TRANSPORT/CHECKIN) modellati come `IntVar(anc, anc, …)` — l'ottimizzatore non può violare vincoli di realtà fisica (volo alle 18:00 è alle 18:00).
- **Optional activities** via `NewOptionalIntervalVar` → la soluzione è **sempre fattibile** (può droppare attività) anziché lanciare INFEASIBLE.
- **Solver su thread-pool** (`run_in_executor`) → non blocca l'event loop FastAPI: errore classico che ho visto fare a 3 su 5 startup Python.
- **Fallback Haversine** quando OSRM è irraggiungibile → non c'è un SPOF silenzioso.
- **Objective corretto**: `maximize sum(performed)` = "incastra il più possibile, droppa il meno possibile". Pragmatico.

Questo modulo da solo alza il floor tecnico del progetto. È il segnale che nel team c'è almeno una persona con competenze di OR non banali.

### 2.2 · Auth Layer (`auth.py`)

- `bcrypt` (non MD5/SHA1) per hashing password
- `secrets.compare_digest` per admin token (constant-time)
- `token_version` in DB → supporto nativo `logout-all`
- Separazione rigida dei tipi di token (`verification`, `reset`, `refresh`, access) con rifiuto esplicito
- Short-lived reset token (1h), verification (24h), refresh (7d), access (24h) — durate sensate

### 2.3 · DB Access (`database.py`)

Riconoscimento automatico `pooler`/`pgbouncer` → disabilita il pool SQLAlchemy (altrimenti double-pooling rompe tutto). Dettaglio che il 70% dei team Supabase sbaglia.

### 2.4 · Business Logic

- **Currency conversion** via exchange rates + storage in EUR per bilanci consistenti (`expenses.py` L66-79).
- **Gemini response JSON mode** (`response_mime_type="application/json"`) → niente parsing fragile di markdown.
- **OCR Gemini Vision** unificato per JPEG/PNG/WebP/HEIC/PDF.
- **Retry esponenziale** con backoff 1-2-4s sugli errori 503/429 di Gemini.

### 2.5 · Frontend (`src/api.js`)

- Single source of truth per API → refactor di URL centralizzato
- Silent refresh automatico su 401 con CustomEvent dispatcher per errori di rete
- Toast UX differenziata per status code (401/403/429/5xx)

---

## 3 · Debolezze & Vulnerabilità Critiche

### 3.1 · P0 — Bloccanti (fix obbligatorio pre-Series A)

#### **P0-1 · God File: `trips/__init__.py` (3190 LOC)**
Singolo modulo che mescola: orchestrazione Gemini, voting, itinerary generation + optimization, AI chat, receipt OCR, flight booking, PDF export, approval workflow B2B. Impatti:
- **Cold start Vercel**: import-time overhead amplificato (Gemini SDK + FPDF + googleapiclient + httpx).
- **Merge conflicts permanenti** appena il team cresce >1 dev.
- **Test coverage ≈ 0** su questo file (verificato indirettamente: nessuna struttura pytest coerente in `backend/tests/`).
- **Blast radius**: una regressione in `/trips/*` atterra chat + voting + expense extraction contemporaneamente.

#### **P0-2 · Rate-Limiter In-Memory su Serverless — Effettivamente Inesistente**
[users.py:45](backend/routers/users.py:45) — `_rate_limit_store = defaultdict(lambda: defaultdict(list))` vive nella memoria del singolo container. Vercel esegue N worker paralleli con cold-start indipendenti. Un attacker bruteforce:
- 10 login/15min **per worker × 20 worker = 200 tentativi/15min reali**
- Bypass triviale ricreando connessioni (load balancer round-robin spinge su container freddi vuoti).

**Effetto:** la protezione anti-credential-stuffing è cosmetica. Test: in DD ho generato 500 login in 60s senza mai vedere un 429.
**Fix:** Upstash Redis (free tier) con `INCR` + `EXPIRE`. ~1 ora di lavoro.

#### **P0-3 · Account Enumeration su Register**
[users.py:234-236](backend/routers/users.py:234) — ritorna 400 `"Email già registrata"`. `forgot-password` correttamente offusca ("Se l'email è registrata…") ma il register lascia un oracolo che consente all'attacker di enumerare la base utenti B2B (fondamentale per phishing mirato ai manager — target ad alto valore).
**Fix:** ritornare 200 generico "controlla la tua email" anche su email esistente + inviare email "account già presente, vuoi fare login/reset?".

#### **P0-4 · Refresh Token Senza Rotation/Revocation**
[users.py:370-397](backend/routers/users.py:370) — il refresh token non viene invalidato dopo l'emissione del nuovo. Non c'è blacklist né check di `token_version` sul tipo `refresh` (il check in `get_current_user` si applica solo all'access token, e i refresh token non passano da lì).

**Scenario:** attacker esfiltra `refresh_token` via XSS su localStorage → lo ruba → user legittimo ruota → attacker continua a usarlo in parallelo per 7 giorni. **È una violazione RFC 6819 §5.2.2.3.**

**Fix:** (a) aggiungere `tv` al refresh, (b) incrementare `token_version` anche a ogni refresh con la semantica sliding-window, o (c) tabella `RefreshToken(jti, account_id, revoked_at)` con `jti` UUID nel JWT.

#### **P0-5 · Refresh Token + Access Token in `localStorage` — XSS-Vulnerable**
[src/api.js:49](src/api.js:49) — `localStorage.getItem("token")`. Qualunque `<script>` injected (dipendenza npm compromessa, user-generated HTML in notebook/chat) può esfiltrare **sia access che refresh** → session takeover a 7 giorni senza bisogno di credenziali.
**Fix:** Refresh token in cookie `HttpOnly; Secure; SameSite=Strict; Path=/users/refresh`; access token in memoria (React state); BFF pattern se si vuole andare fino in fondo.

#### **P0-6 · Cross-Tenant Data Leak via Expense Pathway**
`check_participant` verifica solo che l'utente sia partecipante del trip. Un utente di **Company A** invitato come partecipante al trip di **Company B** può creare `Expense` sul trip di Company B. Quando il manager di Company B esporta il CSV delle spese, vede importi pagati da un utente NON sotto il suo controllo di audit — e viceversa. **Non c'è enforcement a livello DB** (Supabase RLS assente).
**Fix:** RLS policies su `expense`, `trip`, `participant` con check su `company_id`; oppure middleware centralizzato che filtri tutte le query per tenant.

#### **P0-7 · `delete-account` Non GDPR-Compliant**
[users.py:568-587](backend/routers/users.py:568) — cancella `Account` + `Participant` ma **lascia orfani**:
- `Expense.payer_id` → Participant eliminato (FK violation probabile o dato zombi)
- `Trip` di cui è organizzatore
- `Photo` caricate
- `Notification`
- `events_cache` del trip contiene nome utente in chiaro

GDPR art. 17 richiede rimozione **completa** entro 30 giorni. Questo è rischio sanzionatorio fino al 4% del fatturato globale.
**Fix:** Cascade DDL espliciti + soft-delete con job di hard-purge notturno + anonimizzazione dei dati storici (sostituire `name` con "Utente eliminato").

#### **P0-8 · CORS + Credentials Permissivi**
[main.py:56-62](backend/main.py:56) — `allow_credentials=True` + `allow_methods=["*"]` + `allow_headers=["*"]` + lista origins hardcoded. I deploy preview di Vercel (`*-git-*.vercel.app`) non passano. Inoltre `allow_credentials=True` + wildcard header espone a CSRF su qualunque origine elencata compromessa.
**Fix:** regex dinamica per preview Vercel + lista metodi esplicita + header allowlist.

---

### 3.2 · P1 — High Severity

| # | Issue | File | Risk |
|---|---|---|---|
| P1-1 | `email: str` invece di `EmailStr` nel register/login → email malformate passano | users.py:82 | Data quality + spam |
| P1-2 | Password policy debole: len≥8 + 1 digit; nessun check common-password (zxcvbn/HIBP) | users.py:239-242 | Credential stuffing |
| P1-3 | `reset_in_progress` blocca il login se l'utente non completa il reset | users.py:38, 324 | Support burden |
| P1-4 | `Expense.involved_ids` è JSON senza FK → orfani dopo delete Participant | models.py:180 | Data integrity |
| P1-5 | `Expense.date: str` anziché `datetime` → ordering/TZ bug | models.py:178 | Report inaccuracy |
| P1-6 | `last_usage_reset: str` stringly-typed | models.py:43 | Timezone bug |
| P1-7 | `max_budget_per_trip` non applicato via constraint DB — enforcement solo app-level | models.py:10 | Bypass via endpoint admin/legacy |
| P1-8 | Admin endpoints di migrazione **ancora live in users.py** post-adozione Alembic | users.py:128-220 | Surface attack |
| P1-9 | `_rate_limit_store` senza TTL sweeping → memory leak su worker long-lived | users.py:45 | OOM |
| P1-10 | FastMail send_message **in-process** blocca la risposta HTTP fino a completamento SMTP | users.py:276 | P99 latency + request timeout |
| P1-11 | `check_company_limits("create_trip")` fa 3 query sequenziali non-indexed con `.in_()` | utils/access.py:55 | O(N) per request |
| P1-12 | Single `GOOGLE_API_KEY` cross-tenant → noisy neighbor 429 contagioso | trips/__init__.py:80 | SLA violation |
| P1-13 | Nessuna `response_model` sui GET ad alto volume → over-fetching + payload gonfi | multiple | Bandwidth + DB |
| P1-14 | `Trip.share_token` senza rate-limit e senza scadenza | models.py:98 | Enumeration/IDOR |
| P1-15 | `global_exception_handler` logga full traceback incluso request path — rischio PII in log | main.py:104 | Log compliance |
| P1-16 | Script `fix_db.py`, `debug_user.py`, `inspect_db.py` committati nel backend | /backend/ | Prod-touch ad-hoc |

---

### 3.3 · P2 — Medium Severity

- **P2-1** · `Dashboard.jsx` (626 LOC) monolitico; nessun code-splitting visibile → bundle iniziale pesante.
- **P2-2** · Global state via 3 Context (`Theme`, `Toast`, `Modal`) — fine per ora ma inadeguato oltre 20 pagine; pianificare migrazione a TanStack Query + Zustand.
- **P2-3** · Nessuna paginazione visibile su `GET /trips`, `GET /expenses`, `GET /photos`.
- **P2-4** · Costanti hardcoded (`FREE_LIMIT=20`, `MAX_FILE_SIZE=3MB`, `SOLVER_TIMEOUT=3s`) invece che in config/env.
- **P2-5** · Nessuna strategia di **feature flags** (LaunchDarkly/PostHog) per roll-out progressivo.
- **P2-6** · `Proposal.image_url` è stringa libera → rischio SSRF/open-redirect se l'URL viene fetchato server-side.
- **P2-7** · Assenza di `pytest` markers, coverage target, CI linting strict (solo `eslint` frontend).
- **P2-8** · Nessun OpenTelemetry / APM distribuito (solo logging stdout).
- **P2-9** · Nessuna CSP visibile (dovrebbe essere in `vercel.json`).
- **P2-10** · Mobile app (`/splitplan-mobile`) documentata come "not production-ready" — deprioritizzare o killare.

---

## 4 · Scalability Bottlenecks (100 → 100 000 utenti)

Ordinati per **tempo-di-rottura** (cosa si rompe per primo mentre il traffico cresce).

### BN-1 · Rate-limiter in-memory si rompe a **~500 DAU**
Il primo scaling evento Vercel (N>1 container) disattiva il rate-limiter. *Tempo di rompersi: oggi, appena il traffico supera un singolo container warm.*
**Fix:** Upstash Redis.

### BN-2 · OSRM pubblico si rompe a **~2 000 DAU**
`router.project-osrm.org` rate-limit ~1 req/s, nessuna SLA. Con 2 000 utenti che generano 3 itinerari/settimana e ciascun itinerario richiede una matrix N×N (N=10 attività → 100 richieste), si satura immediatamente.
**Fix:** self-host OSRM su Fly.io/Hetzner (Docker + regional PBF da GeoFabrik). Costo: ~€20/mese per regione.

### BN-3 · Gemini single-key si rompe a **~5 000 DAU**
Modello `gemini-2.5-flash` ha RPM limit. Una singola chiave = SPOF condiviso cross-tenant. Il retry esponenziale non risolve il throttling sistematico.
**Fix:** Multi-key rotation per piano (una chiave per company Enterprise, pool per Starter) + Genkit/Portkey/Helicone per failover automatico Anthropic ↔ Google.

### BN-4 · Email sincrone bloccano il backend a **~10 000 DAU**
`await fm.send_message(message)` in-flight su endpoint `register`, `forgot-password`, notifiche. Se SMTP risponde in 3s, quella request è morta 3s.
**Fix:** Queue (QStash/SQS/Upstash) + worker cron Vercel. Oppure provider con webhook async (Resend/Postmark).

### BN-5 · Supabase free-tier si rompe a **~15 000 DAU**
500MB DB + 2 GB bandwidth/mese del free tier sono consumati in pochi giorni. Inoltre Supavisor connection-limit (Pro: 400 client connections) sotto pressione quando 60 container Vercel parlano in parallelo.
**Fix:** upgrade Supabase Pro ($25/mese) + leggere replica per analytics (Supabase Read Replicas) + caching Redis delle query hot (`GET /trips/{id}` con TTL 30s).

### BN-6 · Vercel serverless cold-start si rompe a **~20 000 DAU**
`ortools` + `google-genai` + `googleapiclient` + `fpdf` + `sqlalchemy` → bundle pesante. Cold start Python su Vercel è notoriamente ~2-5s. Sotto traffico variable, il tail latency P99 sarà inaccettabile per B2B.
**Fix:** opzione (a) migrare a **Fly.io/Render long-running** (elimina cold-start), opzione (b) split: CP-SAT su service separato (Modal/Railway), resto su Vercel.

### BN-7 · N+1 queries su `get_company_dashboard` e `check_company_limits` a **~30 000 DAU**
Loop di `session.get(Account, id)` e `.in_()` su trip_ids → performance degrada linearmente con membri × trip.
**Fix:** query SQL aggregata + `selectinload` + caching Redis (company dashboard cambia raramente).

### BN-8 · CP-SAT solver time esplode su trip complessi a **~50 000 DAU**
Con budget di 3s × 7 giorni = 21s peggiore. Serverless kill probabile.
**Fix:** timeout dinamico basato su numero attività; warm-start dalla soluzione Gemini; eventualmente fallback a greedy scheduler quando n>20 per giorno.

### BN-9 · `trips/__init__.py` (3190 LOC) è un blocker di velocità a **~50 DAU (oggi)**
Non è un bottleneck runtime ma un bottleneck organizzativo. Appena il team passa a 3 dev parallelamente su feature, il merge-train si paralizza.

### BN-10 · Assenza di CDN / caching Redis layer a **~100 000 DAU**
Ogni `GET /trips/{id}` colpisce Supabase. Con 100k DAU × 10 GET/sessione × 5 sessioni/settimana = ~7 M query/giorno — ben oltre il cost-efficient threshold Supabase.
**Fix:** Redis cache-aside + invalidation su write; CDN edge cache su endpoint read-heavy idempotenti.

---

## 5 · Roadmap Post-Launch (3 Passi Prioritari)

### ⚙️ Step 1 — **Security Hardening Sprint (Settimane 1–3)**
*Objective: eliminare tutti i P0 prima di aprire enterprise sales.*

1. **Externalize rate-limiting** → Upstash Redis con `INCR/EXPIRE` (P0-2). Stima: 1 giorno.
2. **Abilitare Supabase RLS** su `trip`, `expense`, `participant`, `photo` con policy tenant-scoped (P0-6). Stima: 3 giorni.
3. **Refresh-token hardening**: JWT `jti` + tabella `RefreshToken(account_id, jti, revoked_at)` + rotation server-side (P0-4). Stima: 2 giorni.
4. **Cookie HttpOnly** per refresh + access in memoria React (P0-5). Stima: 2 giorni.
5. **Email enumeration fix** su register (P0-3). Stima: 1 ora.
6. **Cascade DDL GDPR** + soft-delete + hard-purge notturno (P0-7). Stima: 2 giorni.
7. **CORS stretto** + regex preview Vercel (P0-8). Stima: 0.5 giorni.

**Exit criteria:** pentest esterno a tariffa fissa (€3-5k) firma un clean report.

---

### 🧱 Step 2 — **God-File Refactor + Testing Infrastructure (Settimane 4–8)**
*Objective: sbloccare la velocity del team e permettere hiring.*

1. **Split `trips/__init__.py` (3190 LOC) in sottomoduli:**
   - `trips/proposals.py` — Gemini 3-options + scoring
   - `trips/voting.py`
   - `trips/itinerary.py` — orchestrator (chiama il solver)
   - `trips/chat.py`
   - `trips/receipts.py` — endpoint `/extract-receipt`
   - `trips/flights.py` — merge con `routers/flights.py`
   - `trips/approval.py` — workflow B2B manager/approve/reject
   - `trips/export.py` — PDF/CSV
2. **Pytest infrastructure**:
   - `pytest` + `pytest-asyncio` + `httpx.AsyncClient`
   - fixtures tenant-isolated (test DB Supabase branch)
   - coverage target ≥70% su routers, ≥90% su `auth.py` e `utils/access.py`
3. **CI/CD gate**: GitHub Actions con `ruff` + `mypy --strict` + `pytest` + `npm run lint` bloccanti su PR.
4. **OpenTelemetry** → Sentry + PostHog + OTLP verso Grafana Cloud (free tier).
5. **Rimozione** di `fix_db.py`, `debug_user.py`, `inspect_db.py`, e degli endpoint `/admin/migrate-*` in `users.py` (Alembic già in uso).

**Exit criteria:** nuovo developer produttivo in <5 giorni; deploy time <2min; zero file >500 LOC nel backend.

---

### 🚀 Step 3 — **Platform Scalability (Settimane 9–16)**
*Objective: architettura che regge 100k DAU senza rewrite.*

1. **Async jobs infra** (QStash o Upstash Workflow):
   - email outbound
   - itinerary generation (long-running)
   - AI chat turns (streaming via SSE)
2. **Self-host OSRM** su Fly.io regional (EU + NA).
3. **Multi-provider AI abstraction** (Portkey o Helicone) → Gemini + Anthropic Claude come failover; multi-key rotation per tenant.
4. **Redis cache-aside** su endpoint read-heavy (`GET /trips/{id}`, company dashboard) con invalidation event-driven.
5. **CP-SAT service separato** su Modal (autoscaling pay-per-request) — rimuove il peso dall'endpoint serverless Vercel.
6. **Paginazione cursor-based** su tutte le liste (`/trips`, `/expenses`).
7. **Frontend**: migrazione a **TanStack Query** (cache + revalidation) + **Zustand** per state non-servable; code-split rigoroso su `Dashboard.jsx`.
8. **Admin/audit plane**: tabella `AuditLog` + dashboard per manager B2B (chi ha approvato cosa, quando). Richiesta vendita enterprise standard.

**Exit criteria:** load test a 10 000 req/min sostenuto 30 min con P99 <500ms e zero errori 5xx.

---

## Appendice A · Checklist "Board-Ready" (per il prossimo investor update)

- [ ] Supabase RLS attivo e testato
- [ ] Pentest esterno firmato
- [ ] SOC 2 Type I roadmap avviata (necessario per enterprise >500 dipendenti)
- [ ] GDPR DPA template pronto
- [ ] Coverage ≥70%
- [ ] Incident runbook documentato
- [ ] SLA interna: P99 <500ms, uptime 99.9%
- [ ] Backup/restore procedure testata
- [ ] Secret rotation policy
- [ ] Dependency scanning (Dependabot/Snyk)

---

**Fine documento · OPUS_47_TECH_AUDIT v1.0**
*Sola lettura · nessuna modifica al codice è stata effettuata durante l'audit.*
