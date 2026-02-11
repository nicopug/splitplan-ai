# 🌍 SplitPlan AI: La Piattaforma Definitiva per Viaggi di Gruppo

> **"Organizzare un viaggio con gli amici non dovrebbe essere la parte più stressante della vacanza."**

**SplitPlan AI** è l'ecosistema digitale che rivoluziona il modo in cui i gruppi pianificano, vivono e pagano i loro viaggi. Unendo la potenza dell'**Intelligenza Artificiale Generativa (Google Gemini)** alla precisione dei dati geografici in tempo reale (**OpenStreetMap**), SplitPlan elimina il caos delle chat di gruppo, i fogli Excel infiniti e le discussioni sui soldi.

---

## 🌟 Visione e Obiettivi

L'obiettivo di SplitPlan è creare un **"Travel Agent Digitale"** che sia democratico, trasparente e incredibilmente intelligente. Non si limita a suggerire dove andare, ma agisce come:
1.  **Mediatore**: Mette d'accordo tutti tramite un sistema di voto imparziale.
2.  **CFO (Direttore Finanziario)**: Gestisce budget, valute e debiti con precisione millimetrica.
3.  **Guida Locale**: Crea itinerari ottimizzati geograficamente, evitando trappole per turisti e ottimizzando i tempi.

---

## 🚀 Funzionalità Principali (Deep Dive)

### 🧠 1. Motore AI "Gemini-Powered"
Il cuore di SplitPlan è un'istanza personalizzata di **Google Gemini 2.5 Flash**, ottimizzata per il travel planning.
-   **Comprensione del "Vibe"**: L'AI analizza richieste complesse come *"Vorremmo un addio al celibato a Berlino, ma non troppo costoso e con focus sulla birra artigianale"*.
-   **Generazione Proattiva**: Crea 3 proposte di viaggio distinte (es. "Economica", "Bilanciata", "Lusso") incluse di stime voli e hotel.
-   **Chat Contestuale**: L'assistente virtuale ricorda la cronologia della conversazione. Puoi dire *"Sposta la cena di sabato a domenica"* e lui eseguirà la modifica logica senza bisogno di ripetere il contesto.

### 🗳️ 2. Sistema di Voto Democratico
Risolve l'eterno problema del *"Dove andiamo?"*.
-   **Link di Invito**: Ogni viaggio ha un `share_token` unico. Basta inviare il link su WhatsApp.
-   **Voto Pesato**: Gli utenti votano le proposte da 1 a 5 stelle.
-   **Algoritmo di Selezione**: Il sistema calcola il vincitore basandosi sulla somma dei punteggi, garantendo la scelta che massimizza la felicità complessiva del gruppo.

### 🗺️ 3. Mappe e Geocoding di Precisione (Novità!)
Abbiamo sviluppato un sistema proprietario per garantire che i punti sulla mappa siano perfetti.
-   **Integrazione Overpass API**: Il sistema interroga direttamente il database di OpenStreetMap per trovare i "nodi" esatti di ristoranti, lidi e musei.
-   **Anti-Hallucination**: L'AI ha il divieto assoluto di inventare coordinate. Se un luogo non ha coordinate certe, il backend esegue un fallback intelligente cercando indirizzi specifici (es. "Lungomare di Rimini") per evitare che i segnalini finiscano in mare o in punti irraggiungibili.
-   **Visualizzazione Ibrida**: Mappa interattiva con marker differenziati per categoria (🍕 Cibo, 🏖️ Spiaggia, 🏨 Hotel, ✈️ Volo).

### 💰 4. Modulo Finanziario (CFO Mode)
Un sistema contabile completo integrato nell'app.
-   **Standardizzazione Costi**: Che tu viaggi in aereo, treno o auto, il sistema uniforma tutto sotto la voce `transport_cost` per un budget coerente.
-   **Multivaluta Reale**: Supporta l'inserimento di spese in qualsiasi valuta (Yen, Dollari, Sterline). Il sistema converte istantaneamente in Euro usando tassi di mercato aggiornati.
-   **Calcolo Debiti (Settle Up)**: A fine viaggio, un algoritmo minimizza il numero di transazioni necessarie per pareggiare i conti (es. "A deve dare 10€ a B", invece che "A da 5 a C e C da 5 a B").
-   **Budget Predittivo**: L'AI stima quanto spenderai per vitto e alloggio in base al costo della vita della destinazione specifica.

### 🚗 5. Calcolo Viaggio in Auto
Per i viaggi "On the Road":
-   **Stima Carburante & Pedaggi**: L'AI calcola i chilometri e i costi autostradali reali per il tragitto A/R.
-   **Integrazione Spese**: Questi costi vengono automaticamente aggiunti al bilancio condiviso come "Travel_Road".

---

## 🏗️ Architettura Tecnica

SplitPlan è un'applicazione **Full-Stack** moderna, progettata per essere scalabile e manutenibile.

### **Frontend (Client-Side)**
-   **React 19**: L'ultima versione della libreria UI più popolare al mondo.
-   **Vite**: Build tool di nuova generazione per caricamenti istantanei.
-   **Tailwind CSS 4.0**: Styling atomico per un design responsivo e moderno.
-   **React Router 7**: Gestione avanzata della navigazione e dei deep link.
-   **PWA Ready**: Struttura pronta per essere installata come app su mobile.

### **Backend (Server-Side)**
-   **FastAPI**: Il framework Python più veloce sul mercato, con supporto nativo per la programmazione asincrona (`async/await`).
-   **SQLModel**: ORM moderno che unisce la potenza di SQLAlchemy alla validazione dati di Pydantic.
-   **Supabase (PostgreSQL)**: Database relazionale robusto e scalabile nel cloud.
-   **Python-Jose**: Per la gestione sicura dei token di autenticazione JWT.

---

## 📂 Struttura del Codice

Una panoramica per sviluppatori che vogliono orientarsi nel progetto:

```
/
├── backend/                  # Il cervello dell'applicazione
│   ├── main.py               # Entry point e configurazione CORS
│   ├── models.py             # Definizioni del Database (Tabelle e Relazioni)
│   ├── routers/              # Endpoint API divisi per funzionalità
│   │   ├── trips.py          # Logica Core: AI, Itinerari, Geocoding
│   │   ├── expenses.py       # Logica Contabile: Spese e Bilanci
│   │   ├── users.py          # Autenticazione e Gestione Utenti
│   │   └── itinerary.py      # Gestione Drag&Drop e Orari
│   └── utils/                # Funzioni di supporto (es. valute, email)
│
├── src/                      # L'interfaccia utente (React)
│   ├── api.js                # Layer di comunicazione con il Backend (Fetch wrappers)
│   ├── pages/                # Le schermate principali (Dashboard, Login, Home)
│   ├── components/           # Blocchi UI riutilizzabili
│   │   ├── Map.jsx           # Componente Mappa Avanzato (Leaflet)
│   │   ├── Budget.jsx        # Grafici e Statistiche Finanziarie
│   │   ├── Chat.jsx          # Interfaccia Chat con l'AI
│   │   └── ...
│   └── context/              # Gestione Stato Globale (User, Toast, Theme)
│
└── public/                   # Asset statici (Immagini, Icone PWA)
```

---

## 🔮 Roadmap Futura

SplitPlan non si ferma qui. Ecco cosa abbiamo in cantiere:
1.  **Google Maps Native**: Migrazione completa alle API di Google Maps per Street View e recensioni in tempo reale dei luoghi.
2.  **Export PDF**: Possibilità di scaricare l'itinerario come un vero e proprio biglietto di viaggio stampabile.
3.  **Integrazione Meteo**: Suggerimenti AI basati sulle previsioni del tempo reali durante il viaggio.
4.  **Splitwise Sync**: Sincronizzazione bidirezionale con account Splitwise esistenti.

---

## 📝 Changelog Recente

### **Febbraio 2026 - The "Precision" Update**
-   ✅ **Fix Mappe**: Risolto il bug dei punti in mare. Ora il sistema priorizza i nodi terrestri e usa il geocoding del lungomare come fallback.
-   ✅ **Standardizzazione Costi**: Rinominato `flight_cost` in `transport_cost` per supportare ufficialmente i treni.
-   ✅ **AI Prompt Refinement**: L'AI ora ha regole ferree: non può inventare coordinate e deve rispettare tassativamente gli orari di arrivo/ritorno.
