# PRD — SplitPlan AI

**Versione:** 1.0
**Data:** 2 Aprile 2026
**Autore:** Generato dall'analisi completa del codebase
**Stato progetto:** MVP funzionante in produzione
**URL Produzione:** https://splitplan-ai.vercel.app

---

## 1. Overview del Progetto

SplitPlan AI è un'applicazione web full-stack che utilizza l'intelligenza artificiale per semplificare la pianificazione di viaggi di gruppo. Il progetto nasce da un'iniziativa scolastica presso un liceo scientifico scienze applicate in Emilia-Romagna: quattro capi di aziende della regione hanno assegnato agli studenti il compito di ideare una startup. Nicolò (CTO & Co-Founder, 16 anni) e suo fratello (CPO & Founder) hanno concepito l'idea e, insieme ad altri tre compagni di classe, hanno costruito un prodotto funzionante in circa 6 mesi di lavoro (circa 3 ore al giorno).

Il team ha realizzato un sito web funzionante, un business plan di 34 pagine, un video di presentazione, un video demo e canali social (Instagram, TikTok, LinkedIn). Il prodotto è stato presentato a un imprenditore della zona che ne è rimasto molto colpito, in particolare per il fatto che il sito fosse già operativo. Il progetto parteciperà a una competizione tra scuole organizzata da Confindustria a inizio giugno 2026.

Il team è composto da: Nicolò (CTO & Co-Founder), suo fratello (CPO & Founder), Piretti (Vice-CPO), Paternò (Marketing), Gialone (CEO).

---

## 2. Problema che Risolve

Organizzare un viaggio di gruppo è un processo frammentato e frustrante. Tipicamente un gruppo di amici o colleghi deve:

- Decidere la destinazione (lunghe discussioni su WhatsApp senza mai arrivare a una scelta)
- Coordinare date e preferenze tra più persone con gusti diversi
- Costruire un itinerario manualmente cercando su Google, TripAdvisor, blog di viaggio
- Gestire prenotazioni di voli e hotel su piattaforme separate
- Tenere traccia delle spese condivise con fogli Excel o app dedicate come Splitwise
- Condividere foto e documenti su canali diversi

SplitPlan centralizza tutto questo in un'unica piattaforma intelligente: l'AI genera proposte personalizzate, il gruppo vota democraticamente, l'itinerario viene costruito automaticamente, e la dashboard tiene traccia di spese, mappa, foto e logistica.

---

## 3. Utenti Target

**Target Primario — Team aziendali** che organizzano trasferte o team retreat. L'app supporta una modalità Business con orari di lavoro configurabili (inizio/fine giornata lavorativa, giorni lavorativi). Include anche una pagina demo request per lead B2B e un calcolatore ROI per convincere i decision maker aziendali.

**Target Secondario — Giovani adulti (18-35 anni)** che viaggiano in gruppo con amici o colleghi. Profilo tipico: organizzano 2-5 viaggi all'anno, trovano frustrante coordinare decisioni tra più persone, usano già strumenti come WhatsApp/Google Sheets/Notion in modo frammentato, sono tech-savvy e aperti a soluzioni AI.

**Settore:** Travel Tech / AI-powered productivity tools / Group collaboration software.

---

## 4. Funzionalità Principali (Features)

### 4.1 Generazione AI delle Proposte di Viaggio
L'AI (Google Gemini 2.5 Flash) genera 3 proposte di viaggio personalizzate basandosi su: budget, numero di persone, date, preferenze di "vibe", must-have e must-avoid. Ogni proposta include destinazione, descrizione, stima del costo, immagine e codice IATA dell'aeroporto. Supporto sia per viaggi leisure che business.

### 4.2 Sistema di Votazione con Consenso
Ogni partecipante vota le proposte con un punteggio. Quando tutti hanno votato, il sistema determina automaticamente la proposta vincente e cambia lo stato del viaggio in "BOOKED". È presente anche una funzione di simulazione voti per testing e demo.

### 4.3 Itinerario Interattivo con Mappa
Una volta confermata la destinazione, l'AI genera un itinerario giornaliero ottimizzato con attività, orari e coordinate geografiche. Le attività vengono ordinate tramite algoritmo Nearest Neighbor per minimizzare gli spostamenti. La visualizzazione avviene su mappa interattiva (Leaflet + OpenStreetMap) con marker per ogni attività e per l'hotel.

### 4.4 Chat AI Integrata (SplitPlan Assistant)
Un chatbot AI integrato nella dashboard permette di modificare l'itinerario in linguaggio naturale: aggiungere, rimuovere o spostare attività con comandi conversazionali.

### 4.5 Gestione Hotel
Conferma manuale dell'hotel con nome, indirizzo e costo. Geocodifica automatica tramite Nominatim (OpenStreetMap) per posizionare l'hotel sulla mappa. Estrazione automatica dei dati da ricevute/screenshot tramite AI (OCR intelligente).

### 4.6 Logistica e Link di Prenotazione
Link diretti a Skyscanner per i voli (con aeroporto di partenza, IATA destinazione, date e numero persone). Link diretti a Booking.com per gli hotel. Supporto per diversi mezzi di trasporto (volo, treno, auto). Timeline visuale del viaggio con orari di arrivo/partenza.

### 4.7 Gestione Spese e Bilancio
Aggiunta spese con supporto multi-valuta (conversione automatica in EUR). Calcolo automatico dei bilanci tra partecipanti ("chi deve quanto a chi"). Categorizzazione spese (cibo, trasporti, alloggio, ecc.). Stima AI del budget totale del viaggio.

### 4.8 Galleria Foto del Viaggio
Upload e visualizzazione foto per ogni viaggio con caption personalizzabili.

### 4.9 Integrazione Google Calendar
Sincronizzazione dell'itinerario con Google Calendar tramite OAuth2. Aggiunta automatica degli eventi del viaggio al calendario personale.

### 4.10 Collaborazione Multi-Utente
Invito partecipanti tramite link condivisibile (token univoco). Ogni partecipante può unirsi al viaggio e votare le proposte. Visualizzazione pubblica del viaggio tramite link di sola lettura.

### 4.11 Autenticazione e Account
Registrazione con verifica email (SMTP via Brevo). Login JWT con token persistente. Reset password via email. SSO (Single Sign-On). Profilo utente con crediti e stato abbonamento.

### 4.12 PWA e Offline Mode
Installabile come Progressive Web App su mobile e desktop. Modalità offline con caching locale dei dati del viaggio (service worker via Workbox). Banner di notifica quando si è offline.

### 4.13 Internazionalizzazione (i18n)
Supporto multi-lingua tramite i18next con detection automatica della lingua del browser. File di traduzione per italiano e inglese.

### 4.14 Export PDF
Funzionalità per scaricare l'itinerario e le spese in formato PDF (generato lato backend con FPDF).

### 4.15 Pagina Demo Request (B2B)
Form dedicato per la raccolta lead aziendali con campi: nome, azienda, email, telefono, dimensione team, frequenza viaggi, messaggio.

### 4.16 Calcolatore ROI
Componente interattivo che permette ai potenziali clienti B2B di calcolare il risparmio stimato usando SplitPlan rispetto ai metodi tradizionali.

### 4.17 Dark Mode
Supporto completo per tema scuro tramite ThemeContext con CSS variables.

---

## 5. Architettura Tecnica e Stack

### 5.1 Stack Tecnologico

| Layer | Tecnologia |
|---|---|
| **Frontend** | React 19.2, Vite 7, Tailwind CSS 4, React Router 7, Radix UI, Framer Motion |
| **Mappe** | Leaflet 1.9, React-Leaflet 5, OpenStreetMap, Nominatim |
| **Backend** | FastAPI (Python), Uvicorn |
| **ORM** | SQLModel (SQLAlchemy + Pydantic combinati) |
| **Database** | PostgreSQL (Supabase, host AWS eu-west-1) |
| **Migrazioni** | Alembic |
| **AI** | Google Gemini 2.5 Flash (Google GenAI SDK) |
| **Autenticazione** | JWT (python-jose, bcrypt/passlib) |
| **Email** | SMTP via Brevo (ex Sendinblue), fastapi-mail |
| **Pagamenti** | Stripe (integrato con webhooks) |
| **Geodata** | Nominatim OSM, Overpass API |
| **Deployment** | Vercel (frontend static build + backend serverless Python) |
| **PWA** | vite-plugin-pwa + Workbox |
| **i18n** | i18next, react-i18next, i18next-browser-languagedetector |
| **PDF** | FPDF (backend) |
| **Mobile** | Expo 54 + React Native 0.81 + NativeWind (early stage) |

### 5.2 Architettura Generale

Il progetto è un **monorepo** deployato su Vercel con due componenti principali:

- **Frontend:** SPA React servita come static build. Vite gestisce il bundling con code splitting (vendor: react/react-dom/react-router-dom; utils: framer-motion/lucide-react/react-i18next). Pre-rendering statico delle pagine pubbliche tramite react-snap (/, /demo, /privacy, /terms, /roi).

- **Backend:** API FastAPI deployata come funzione serverless Python su Vercel. Tutte le richieste `/api/*` vengono instradate al backend. In sviluppo locale, il proxy Vite redirige `/api` a `localhost:8000`.

- **Database:** PostgreSQL gestito su Supabase con connection pooling (pool_pre_ping=True, pool_recycle=300). Fallback SQLite in-memory per sviluppo senza DB.

### 5.3 Flusso Utente Principale

1. L'utente si registra (email + verifica) o accede con SSO
2. Crea un nuovo viaggio compilando un wizard multi-step (Survey): tipo, date, budget, numero persone, preferenze
3. L'AI genera 3 proposte di destinazione personalizzate
4. L'utente invita i partecipanti tramite link condivisibile
5. Tutti votano le proposte → il sistema determina il vincitore
6. Lo stato del viaggio passa a "BOOKED"
7. L'AI genera l'itinerario giornaliero ottimizzato
8. La dashboard mostra: mappa interattiva, timeline, spese, foto, logistica, chat AI
9. I partecipanti aggiungono spese durante il viaggio
10. Il sistema calcola automaticamente i bilanci finali

---

## 6. Struttura del Progetto

```
splitplan-ai/
├── backend/
│   ├── main.py                    # Entry point FastAPI, CORS, router registration
│   ├── models.py                  # Modelli SQLModel (Account, Trip, Participant, Proposal, Vote, ItineraryItem, Expense, Photo, DemoLead, ProcessedStripeEvent)
│   ├── database.py                # Engine PostgreSQL/SQLite, session factory
│   ├── auth.py                    # JWT authentication, get_current_user
│   ├── admin_auth.py              # Admin token verification
│   ├── email_templates.py         # Template HTML per email transazionali
│   ├── alembic/                   # Migrazioni database
│   │   ├── env.py
│   │   └── versions/
│   ├── routers/
│   │   ├── trips.py               # Core: proposte AI, votazione, itinerario, chat AI, PDF export
│   │   ├── users.py               # Auth, profilo, verifica email, reset password
│   │   ├── expenses.py            # Gestione spese, calcolo bilanci
│   │   ├── photos.py              # Upload e gestione foto
│   │   ├── itinerary.py           # CRUD itinerario
│   │   ├── calendar.py            # Google Calendar OAuth2
│   │   ├── payments.py            # Stripe checkout, webhooks, crediti/abbonamenti
│   │   ├── leads.py               # Raccolta lead B2B (demo request)
│   │   ├── flights.py             # Link prenotazione voli
│   │   └── sso.py                 # Single Sign-On
│   ├── utils/
│   │   ├── access.py              # Controllo accessi e permessi
│   │   ├── crypto.py              # Encrypt/decrypt (token Google Calendar)
│   │   ├── currency.py            # Conversione valute
│   │   └── email_utils.py         # Configurazione SMTP
│   └── tests/
│       ├── conftest.py
│       ├── test_auth.py
│       ├── test_expenses.py
│       └── test_trips.py
├── src/
│   ├── main.jsx                   # Entry point React
│   ├── App.jsx                    # Router principale, stato utente, offline banner
│   ├── api.js                     # Layer API centralizzato (JWT, error handling, URL resolution)
│   ├── i18n.js                    # Configurazione i18next
│   ├── components/
│   │   ├── Hero.jsx               # Landing: hero section
│   │   ├── PainPoints.jsx         # Landing: problemi che risolve
│   │   ├── Solution.jsx           # Landing: come SplitPlan risolve
│   │   ├── Features.jsx           # Landing: lista funzionalità
│   │   ├── Pricing.jsx            # Landing: piani e prezzi
│   │   ├── Business.jsx           # Landing: sezione B2B
│   │   ├── ROICalculator.jsx      # Calcolatore ROI interattivo
│   │   ├── Footer.jsx             # Footer
│   │   ├── Navbar.jsx             # Barra navigazione
│   │   ├── Survey.jsx             # Wizard creazione viaggio (multi-step)
│   │   ├── Voting.jsx             # Votazione proposte con UI animata
│   │   ├── Budget.jsx             # Gestione spese e bilanci
│   │   ├── Timeline.jsx           # Itinerario con timeline visuale
│   │   ├── Map.jsx                # Mappa interattiva Leaflet
│   │   ├── Chatbot.jsx            # Chat AI per modifiche itinerario
│   │   ├── Logistics.jsx          # Link voli e hotel
│   │   ├── HotelConfirmation.jsx  # Conferma hotel + geocodifica
│   │   ├── Photos.jsx             # Galleria foto
│   │   ├── Events.jsx             # Eventi e POI
│   │   ├── Finance.jsx            # Sezione finanziaria
│   │   ├── ErrorBoundary.jsx      # Error boundary React
│   │   ├── Toast.jsx              # Notifiche toast
│   │   ├── Modal.jsx              # Modali globali
│   │   └── ui/                    # Componenti UI base (button, input, label, alert, calendar, popover, drawer, skeleton)
│   ├── context/
│   │   ├── ThemeContext.jsx        # Dark/light mode
│   │   ├── ToastContext.jsx        # Gestione notifiche
│   │   └── ModalContext.jsx        # Gestione modali
│   ├── hooks/
│   │   └── useSpotlight.js        # Hook custom per spotlight/tutorial
│   ├── pages/
│   │   ├── Dashboard.jsx          # Dashboard viaggio (tab navigation)
│   │   ├── MyTrips.jsx            # Lista viaggi con filtri
│   │   ├── Auth.jsx               # Login, registrazione, verifica email
│   │   ├── ResetPassword.jsx      # Reset password
│   │   ├── Market.jsx             # Acquisto crediti e abbonamenti
│   │   ├── CheckoutSuccess.jsx    # Post-pagamento Stripe
│   │   ├── ShareTrip.jsx          # Condivisione viaggio + join
│   │   ├── CalendarCallback.jsx   # Callback OAuth2 Google Calendar
│   │   ├── DemoRequest.jsx        # Form richiesta demo B2B
│   │   ├── Privacy.jsx            # Privacy policy
│   │   └── Terms.jsx              # Termini di servizio
│   └── utils/
│       └── trainline.js           # Integrazione link Trainline
├── splitplan-mobile/              # App mobile (Expo + React Native, early stage)
├── public/
│   ├── sitemap.xml
│   ├── robots.txt
│   ├── manifest.webmanifest
│   ├── llms.txt
│   └── locales/                   # File traduzione i18n (it, en)
├── package.json                   # Dipendenze frontend + script build
├── vite.config.js                 # Config Vite (PWA, proxy, code splitting)
├── vercel.json                    # Config deployment Vercel (routes, builds, headers)
├── tailwind.config.js             # Config Tailwind CSS
└── index.html                     # Entry HTML (meta SEO, OG tags, JSON-LD schema)
```

---

## 7. Modello Dati (Database)

Il database PostgreSQL (Supabase) contiene le seguenti tabelle principali, gestite tramite SQLModel:

- **Account** — Utente registrato: email, password hash, nome, cognome, verifica email, crediti, abbonamento (piano, scadenza, auto-renew), utilizzo AI giornaliero, token Google Calendar, lingua, consensi GDPR.

- **Trip** — Viaggio: nome, destinazione, tipo (leisure/business), budget (min/max, per persona), date, numero persone, preferenze (must-have, must-avoid, vibe), dati hotel (nome, coordinate, costo), logistica (aeroporto partenza/arrivo, orari, mezzo di trasporto), stato (PLANNING → BOOKED), proposta vincente, token di condivisione, flag premium, orari di lavoro (per business trip), cache eventi.

- **Participant** — Partecipante a un viaggio, collegato ad Account e Trip. Flag organizzatore.

- **Proposal** — Proposta generata dall'AI: destinazione, descrizione, stima prezzo, immagine, codice IATA.

- **Vote** — Voto di un partecipante su una proposta (score numerico).

- **ItineraryItem** — Singola attività dell'itinerario: titolo, descrizione, orario inizio/fine, tipo, coordinate GPS.

- **Expense** — Spesa: pagatore, descrizione, importo (originale + convertito in EUR), valuta, tasso di cambio, data, categoria, lista ID partecipanti coinvolti (JSON string).

- **Photo** — Foto del viaggio: URL, caption.

- **ProcessedStripeEvent** — Deduplicazione eventi webhook Stripe.

- **DemoLead** — Lead B2B: nome, azienda, email, telefono, dimensione team, frequenza viaggi, messaggio.

---

## 8. Monetizzazione

### Modello Freemium + Crediti + Abbonamenti

| Piano | Prezzo | Contenuto |
|---|---|---|
| **Free** | Gratis | Creazione viaggio base, partecipazione a viaggi altrui |
| **1 Credito** | €3,99 | Sblocca 1 viaggio Premium (itinerario AI completo) |
| **3 Crediti** | €8,99 | 3 viaggi Premium (~25% risparmio) |
| **Pro Mensile** | €7,99/mese | Itinerari AI illimitati, tutte le funzionalità |
| **Pro Annuale** | €76,99/anno | Come mensile (~50% risparmio) |

### Funzionalità Premium (bloccate per utenti free)
Generazione itinerario AI dettagliato, chat AI per modifiche itinerario, logistica avanzata (link voli/hotel), export PDF, mappe offline, supporto prioritario.

### Revenue Stream Aggiuntivi (pianificati)
Affiliate marketing (Skyscanner, Booking.com), API B2B white-label per agenzie di viaggio, dati aggregati anonimizzati per operatori turistici.

### Pagamenti
Integrazione Stripe con Checkout Session e webhooks per aggiornamento automatico crediti/abbonamenti. Deduplicazione eventi tramite tabella ProcessedStripeEvent.

---

## 9. Requisiti Funzionali

| ID | Requisito | Stato |
|---|---|---|
| RF-01 | L'utente può registrarsi con email e ricevere verifica | Implementato |
| RF-02 | L'utente può effettuare login con JWT persistente | Implementato |
| RF-03 | L'utente può resettare la password via email | Implementato |
| RF-04 | L'utente può creare un viaggio compilando un wizard multi-step | Implementato |
| RF-05 | L'AI genera 3 proposte personalizzate per ogni viaggio | Implementato |
| RF-06 | I partecipanti possono votare le proposte | Implementato |
| RF-07 | Il sistema determina automaticamente la proposta vincente | Implementato |
| RF-08 | L'AI genera un itinerario giornaliero ottimizzato | Implementato |
| RF-09 | L'itinerario è visualizzato su mappa interattiva | Implementato |
| RF-10 | L'utente può modificare l'itinerario via chat AI | Implementato |
| RF-11 | I partecipanti possono aggiungere spese multi-valuta | Implementato |
| RF-12 | Il sistema calcola automaticamente i bilanci | Implementato |
| RF-13 | L'utente può invitare partecipanti tramite link | Implementato |
| RF-14 | L'utente può caricare foto del viaggio | Implementato |
| RF-15 | L'utente può sincronizzare l'itinerario con Google Calendar | Implementato |
| RF-16 | L'utente può acquistare crediti/abbonamenti via Stripe | Implementato |
| RF-17 | L'utente può esportare l'itinerario in PDF | Implementato |
| RF-18 | L'app è installabile come PWA | Implementato |
| RF-19 | L'app funziona in modalità offline (dati cached) | Implementato |
| RF-20 | L'utente può passare tra italiano e inglese | Implementato |
| RF-21 | L'utente può confermare l'hotel con geocodifica automatica | Implementato |
| RF-22 | L'utente può visualizzare link diretti per prenotare voli e hotel | Implementato |
| RF-23 | Le aziende possono richiedere una demo tramite form dedicato | Implementato |
| RF-24 | Admin panel per gestione utenti e monitoraggio API | Non implementato |
| RF-25 | Notifiche real-time (WebSocket/polling) | Non implementato |
| RF-26 | Mappe offline per utenti Pro | Non implementato |

---

## 10. Requisiti Non Funzionali

| ID | Requisito | Stato |
|---|---|---|
| RNF-01 | **Performance:** Tempo di risposta API < 500ms per operazioni CRUD | Soddisfatto |
| RNF-02 | **Scalabilità:** Architettura serverless su Vercel (auto-scaling) | Soddisfatto |
| RNF-03 | **Sicurezza:** Password hashate con bcrypt, JWT per autenticazione | Soddisfatto |
| RNF-04 | **Sicurezza:** Headers di sicurezza (HSTS, X-Frame-Options, CSP, Referrer-Policy) | Soddisfatto |
| RNF-05 | **Sicurezza:** Limite upload file a 3MB | Soddisfatto |
| RNF-06 | **Disponibilità:** Deployment su Vercel con CDN globale | Soddisfatto |
| RNF-07 | **Usabilità:** Design responsive mobile-first | Soddisfatto |
| RNF-08 | **Usabilità:** Dark mode | Soddisfatto |
| RNF-09 | **Affidabilità:** Error boundary React + global exception handler FastAPI | Soddisfatto |
| RNF-10 | **SEO:** Meta tag, OG tags, JSON-LD schema, sitemap.xml, robots.txt, llms.txt | Soddisfatto |
| RNF-11 | **Accessibilità offline:** PWA con service worker e caching | Soddisfatto |
| RNF-12 | **Rate limiting AI:** Controllo utilizzo giornaliero per utenti free | Soddisfatto |
| RNF-13 | **GDPR:** Consenso privacy/terms, privacy policy, terms of service | Soddisfatto |
| RNF-14 | **Testing:** Suite test backend (pytest) per auth, trips, expenses | Parziale |
| RNF-15 | **CI/CD:** Pipeline di continuous integration | Non implementato |

---

## 11. Debito Tecnico e Aree di Miglioramento

### Criticità alte
- **Rate limiting basato su DB SQL:** La logica di contropressione per l'AI (daily_ai_usage) richiede aggiornamenti sincroni alla tabella Account. Sotto alto traffico causerebbe lock contention. Soluzione proposta: migrazione a Redis.
- **Componenti frontend monolitici:** Survey.jsx e Budget.jsx superano le 400 righe, mescolando fetch, stato e markup. Da suddividere in sub-componenti.
- **Fallback silenziosi in api.js:** Gli errori API vengono mascherati con console.warn e fallback a localStorage, nascondendo problemi reali all'utente.

### Priorità medie
- Admin panel mancante
- Notifiche real-time (WebSocket) non implementate
- Copertura test limitata (solo auth, trips, expenses lato backend; nessun test frontend)

### Evoluzione futura
- Migrazione a SSR (Next.js o Remix) per migliorare SEO e LCP
- App mobile nativa (Expo/React Native è in fase early stage nella directory `/splitplan-mobile`)
- Dominio personalizzato (attualmente su sottodominio Vercel)
- Blog e content strategy per SEO organico
- Backlink building (Product Hunt, G2, startup directories italiane)

---

## 12. Variabili d'Ambiente

**Frontend (.env):** `VITE_API_URL`

**Backend (.env):** `DATABASE_URL`, `SECRET_KEY`, `GOOGLE_API_KEY`, `STRIPE_SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SMTP_USER`, `SMTP_PASSWORD`, `SUPABASE_URL`, `SUPABASE_KEY`, `FRONTEND_URL`

---

## 13. Comandi di Sviluppo

```bash
# Frontend
npm install          # Installa dipendenze
npm run dev          # Dev server su http://localhost:5173
npm run build        # Build produzione in dist/
npm run preview      # Preview build produzione
npm run lint         # ESLint

# Backend
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000

# Database
alembic upgrade head  # Applica migrazioni
```

Il dev server Vite fa proxy di `/api/*` verso `http://localhost:8000`.

---

## 14. Deployment

Il progetto è deployato su **Vercel** come monorepo:

- Il frontend viene buildato come static site (Vite → dist/)
- Il backend FastAPI viene deployato come funzione serverless Python (`@vercel/python`)
- Le route `/api/*` vengono instradate alla funzione Python
- Tutte le altre route servono `index.html` (SPA fallback)
- Headers di sicurezza configurati nel `vercel.json`
- Database PostgreSQL su Supabase (region EU West 1)
- react-snap pre-renderizza le pagine pubbliche (/, /demo, /privacy, /terms, /roi) a build time

---

*Documento generato il 2 Aprile 2026 dall'analisi completa del codebase SplitPlan AI.*
