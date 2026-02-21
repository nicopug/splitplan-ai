# 🌍 SplitPlan — AI-Powered Group Trip Planner

> *Pianifica viaggi di gruppo senza stress, con l'intelligenza artificiale che fa il lavoro duro per te.*

---

## 🧭 Cos'è SplitPlan

SplitPlan è un'applicazione web full-stack che risolve uno dei problemi più frustranti del viaggiare in gruppo: **organizzare tutto**. Dalla scelta della destinazione alla divisione delle spese, SplitPlan centralizza ogni aspetto del viaggio in un'unica piattaforma intelligente, guidata dall'AI.

L'utente crea un viaggio, invita i partecipanti, e lascia che Gemini AI generi proposte di destinazione personalizzate. Il gruppo vota, l'itinerario viene costruito automaticamente, e la dashboard tiene traccia di tutto — spese, mappa, foto, logistica.

---

## ✨ Funzionalità Principali

### 🤖 Generazione AI delle Proposte
- L'AI (Google Gemini 2.5 Flash) genera **3 proposte di viaggio personalizzate** basandosi su budget, numero di persone, date, preferenze di vibe, must-have e must-avoid.
- Ogni proposta include: destinazione, descrizione, stima del costo, immagine e codice IATA dell'aeroporto.
- Supporto sia per viaggi **leisure** che **business** (con orari di lavoro configurabili).

### 🗳️ Sistema di Votazione con Consenso
- Ogni partecipante vota le proposte con un punteggio.
- Quando tutti hanno votato, il sistema determina automaticamente la proposta vincente e cambia lo stato del viaggio in `BOOKED`.
- Funzione di **simulazione voti** per testing e demo.

### 🗺️ Itinerario Interattivo con Mappa
- Una volta prenotato il viaggio, l'AI genera un **itinerario giornaliero ottimizzato** con attività, orari e coordinate geografiche.
- Le attività vengono ordinate con un algoritmo **Nearest Neighbor** per minimizzare gli spostamenti.
- Visualizzazione su **mappa interattiva** (Leaflet + OpenStreetMap) con marker per ogni attività e per l'hotel.
- **Chat AI integrata** (SplitPlan Assistant) per modificare l'itinerario in linguaggio naturale (aggiungere/rimuovere attività).

### 🏨 Gestione Hotel
- Conferma manuale dell'hotel con nome, indirizzo e costo.
- Geocodifica automatica tramite **Nominatim (OSM)** per posizionare l'hotel sulla mappa.
- Estrazione automatica dei dati da ricevute/screenshot tramite AI (OCR intelligente).

### ✈️ Logistica & Link di Prenotazione
- Link diretti a **Skyscanner** per i voli (con aeroporto di partenza, IATA destinazione, date e numero persone).
- Link diretti a **Booking.com** per gli hotel.
- Timeline visuale del viaggio con orari di arrivo/partenza.

### 💰 Gestione Spese & Bilancio
- Aggiunta spese con supporto **multi-valuta** (conversione automatica in EUR).
- Calcolo automatico dei **bilanci** tra partecipanti ("chi deve quanto a chi").
- Categorizzazione spese (cibo, trasporti, alloggio, ecc.).
- Stima AI del budget totale del viaggio.

### 📸 Galleria Foto del Viaggio
- Upload e visualizzazione foto per ogni viaggio.
- Galleria con caption personalizzabili.

### 📅 Integrazione Google Calendar
- Sincronizzazione dell'itinerario con **Google Calendar** tramite OAuth2.
- Aggiunta automatica degli eventi del viaggio al calendario personale.

### 👥 Collaborazione Multi-Utente
- Invito partecipanti tramite **link condivisibile** (token univoco).
- Ogni partecipante può unirsi al viaggio e votare le proposte.
- Visualizzazione pubblica del viaggio tramite link di sola lettura.

### 🔐 Autenticazione & Account
- Registrazione con verifica email.
- Login JWT con token persistente.
- Reset password via email.
- Profilo utente con crediti e stato abbonamento.

### 📱 PWA & Offline Mode
- Installabile come **Progressive Web App** su mobile e desktop.
- Modalità offline con caching locale dei dati del viaggio.
- Banner di notifica quando si è offline.

---

## 👤 A Chi è Rivolto

### Target Primario
**Giovani adulti (18–35 anni)** che viaggiano in gruppo con amici o colleghi. Persone che:
- Organizzano 2–5 viaggi all'anno
- Trovano frustrante coordinare decisioni tra più persone
- Usano già strumenti come WhatsApp, Google Sheets o Notion per organizzarsi (ma in modo frammentato)
- Sono tech-savvy e aperti a soluzioni AI

### Target Secondario
- **Team aziendali** che organizzano trasferte o team retreat (supporto modalità Business con orari di lavoro)
- **Organizzatori di eventi** che gestiscono gruppi numerosi

### Settore
Travel Tech / AI-powered productivity tools / Group collaboration software

---

## 💸 Monetizzazione

### Modello Attuale: Freemium + Crediti

Il modello di business si basa su un sistema **freemium con crediti** e **abbonamenti**:

| Piano | Prezzo | Cosa include |
|---|---|---|
| **Free** | Gratis | Creazione viaggio base, partecipazione a viaggi altrui |
| **1 Credito** | €3,99 | Sblocca 1 viaggio Premium (itinerario AI completo) |
| **3 Crediti** | €8,99 | 3 viaggi Premium (risparmio ~25%) |
| **SplitPlan Pro Mensile** | €4,99/mese | Itinerari AI illimitati, tutte le funzionalità |
| **SplitPlan Pro Annuale** | €29,99/anno | Come mensile, risparmio ~50% |

### Funzionalità Premium (bloccate per utenti free)
- Generazione itinerario AI dettagliato
- Chat AI per modifiche itinerario
- Logistica avanzata (link voli/hotel)
- Export PDF
- Mappe offline
- Supporto prioritario

### Revenue Stream Aggiuntivi (pianificati)
- **Affiliate marketing**: commissioni su prenotazioni voli (Skyscanner) e hotel (Booking.com)
- **API B2B**: licenza white-label per agenzie di viaggio
- **Dati aggregati anonimizzati**: insight sui trend di viaggio per operatori turistici

### Stack di Pagamento
- Integrazione **Stripe** pianificata (attualmente il sistema crediti è simulato lato backend)
- SSL Encryption per tutte le transazioni

---

## 🏗️ Cosa è Già Costruito

### ✅ Backend (FastAPI + PostgreSQL)
- [x] Architettura API RESTful completa
- [x] Autenticazione JWT (register, login, verify email, reset password)
- [x] CRUD completo per Trip, Participants, Proposals, Votes
- [x] Integrazione Google Gemini AI per generazione proposte
- [x] Generazione itinerario AI con ottimizzazione geografica
- [x] Sistema di votazione con calcolo vincitore
- [x] Chat AI per modifiche itinerario (ADD/DELETE attività)
- [x] Stima budget AI
- [x] Gestione spese multi-valuta con calcolo bilanci
- [x] Upload e gestione foto
- [x] Geocodifica con Nominatim (OSM)
- [x] Integrazione Google Calendar (OAuth2)
- [x] Sistema crediti e abbonamenti (logica backend)
- [x] Link condivisibili con token univoco
- [x] Estrazione dati da ricevute tramite AI
- [x] Deployment su Vercel (serverless)
- [x] Database PostgreSQL su Supabase

### ✅ Frontend (React 19 + Vite + Tailwind CSS 4)
- [x] Landing page completa (Hero, Features, Pricing, Footer)
- [x] Autenticazione (login, registrazione, verifica email, reset password)
- [x] Dashboard viaggio con navigazione a tab
- [x] Componente votazione proposte con UI animata
- [x] Mappa interattiva con Leaflet
- [x] Itinerario con timeline visuale
- [x] Chat AI integrata nella dashboard
- [x] Gestione spese con form e visualizzazione bilanci
- [x] Galleria foto
- [x] Componente logistica (link voli e hotel)
- [x] Conferma hotel con geocodifica
- [x] Pagina "I Miei Viaggi" con lista e filtri
- [x] Pagina Market (acquisto crediti e abbonamenti)
- [x] Condivisione viaggio e join tramite link
- [x] Modalità offline con caching locale
- [x] PWA (installabile su mobile)
- [x] Dark mode support
- [x] Design responsive (mobile-first)

---

## 🚧 Cosa Manca / Da Fare

### 🔴 Priorità Alta
- [x] **Integrazione Stripe reale** — il pagamento crediti/abbonamenti è attualmente simulato; serve implementare Stripe Checkout con webhook per aggiornare lo stato abbonamento
- [x] **Differenziazione Free vs Premium** — il gate dei contenuti premium non è ancora completamente enforced lato backend per tutti gli endpoint
- [x] **Rate limiting AI** — nessun limite alle chiamate Gemini per utente free; rischio di costi API elevati
- [x] **Email transazionali** — il sistema di verifica email e reset password richiede un provider SMTP configurato in produzione (es. SendGrid, Resend)

### 🟡 Priorità Media
- [x] **Export PDF** — funzionalità per scaricare l'itinerario e le spese in formato PDF
- [x] **Gestione abbonamenti** — logica di scadenza abbonamento, disattivazione rinnovo e visualizzazione stato nel Market
- [x] **Test automatizzati** — suite di test unitari e di integrazione per il backend (pytest)
- [ ] **Admin panel** — nessuna interfaccia di amministrazione per gestire utenti, monitorare utilizzo API, ecc.
- [ ] **Mappe offline** — menzionate come feature Pro ma non implementate
- [ ] **Notifiche real-time** — nessun sistema di notifica quando un partecipante vota o l'itinerario viene generato (WebSocket o polling)

### 🟢 Priorità Bassa / Future Features
- [x] **Storico viaggi & Statistiche** — Implementazione della sezione archivio con dashboard di riepilogo per i viaggi conclusi.
- [ ] **App mobile nativa** (React Native o Flutter)
- [ ] **Integrazione Amadeus API** per prezzi voli reali (era stata iniziata ma rimossa)
- [ ] **Raccomandazioni ristoranti** tramite Overpass API (POI discovery)
- [ ] **Sondaggi pre-viaggio** (Survey component già presente ma non integrato nel flusso principale)
- [ ] **Integrazione con altri calendari** (Apple Calendar, Outlook)
- [ ] **Supporto multi-lingua** (attualmente solo italiano nell'UI)

---

## 📊 Utenti & Feedback

> **Nessun utente reale acquisito al momento.** Il prodotto è in fase di sviluppo attivo e non è ancora stato lanciato pubblicamente.

Nessun feedback esterno ricevuto. Il testing è stato condotto esclusivamente dall'autore del progetto.

---

## 🛠️ Stack Tecnologico (Riepilogo)

| Layer | Tecnologia |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS 4, React Router 7 |
| **Mappe** | Leaflet, React-Leaflet, OpenStreetMap |
| **Backend** | FastAPI (Python) |
| **ORM** | SQLModel (SQLAlchemy + Pydantic) |
| **Database** | PostgreSQL (Supabase) |
| **AI** | Google Gemini 2.5 Flash (Google GenAI SDK) |
| **Auth** | JWT (python-jose, passlib) |
| **Geodata** | Nominatim OSM, Overpass API |
| **Deployment** | Vercel (frontend + backend serverless) |
| **PWA** | vite-plugin-pwa |

---

## 🔗 Link Utili

- **Produzione:** [splitplan-ai.vercel.app](https://splitplan-ai.vercel.app)
- **Repository:** privato

---

*Ultimo aggiornamento: Febbraio 2026*
