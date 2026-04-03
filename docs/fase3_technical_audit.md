# FASE 3 — Technical Audit & Health Check

> Audit by Claude Code (Sonnet 4.6) | 2026-04-03

---

## Sezione 1 — Alembic & SQLModel: Coerenza dei Tipi

### 1.1 Catena migrazioni

```
None ← 2cab18db85c5 (initial) ← a1b2c3d4e5f6 (add is_manager) ← b2c3d4e5f6a7 (add company_id)
```

Catena lineare, nessun branch. Gli ID `a1b2c3d4e5f6` e `b2c3d4e5f6a7` sono scritti a mano (Alembic usa hash casuali), ma funzionalmente corretti.

**Problema**: la migrazione `initial` esegue solo `alter_column`. Non crea le tabelle. Significa che le tabelle sono state create inizialmente con `SQLModel.metadata.create_all()` fuori dal sistema di migrazioni. Se si esegue `alembic upgrade head` su un DB vuoto, le tabelle non vengono create e le alter falliscono.

| Stato | Valutazione |
|---|---|
| Catena migration | OK |
| Reversibilita' (downgrade) | OK — tutti i downgrade sono implementati |
| Creazione tabelle da zero | PROBLEMA — non gestita da Alembic |

---

### 1.2 Type Inconsistencies nel modello SQLModel

| Campo | Tipo nel Model | Tipo ideale | Rischio |
|---|---|---|---|
| `ItineraryItem.start_time` | `str` | `datetime` | Parsing manuale in ogni lettura, no timezone |
| `ItineraryItem.end_time` | `Optional[str]` | `Optional[datetime]` | Stessa issue |
| `Expense.date` | `str` | `date` | Ordinamento alfabetico != cronologico |
| `Expense.involved_ids` | `Optional[str]` | `JSON column` | `json.loads()` manuale obbligatorio ovunque |
| `Account.last_usage_reset` | `Optional[str]` | `Optional[date]` | Confronto date come stringhe (fragile) |
| `Account.subscription_expiry` | `Optional[str]` | `Optional[datetime]` | No enforcement di scadenza automatica |
| `Trip.work_start_time` | `Optional[str]` | `Optional[time]` | No validazione formato HH:MM |
| `Trip.work_end_time` | `Optional[str]` | `Optional[time]` | Stessa issue |

**Impatto maggiore**: `Account.last_usage_reset` e' confrontato come stringa nel rate limiting atomico (trips.py:146). Funziona perche' il formato ISO `YYYY-MM-DD` e' ordinabile lessicograficamente, ma e' fragile e non esplicito.

---

### 1.3 Il problema critico: `company_id` senza tabella Company

```python
# models.py:27
company_id: Optional[int] = Field(default=None)
# Nessun foreign_key="company.id" — non esiste una tabella Company
```

`company_id` e' un intero libero senza integrità referenziale. Non esiste un modello `Company`. Questo significa:

- Due account con lo stesso `company_id` formano implicitamente un'azienda
- Non c'e' modo di rinominare un'azienda, impostare policy o configurarla
- Nessun indice su `company_id` — query di filtraggio lente su dataset grandi
- Nessuna CASCADE DELETE — se un "gruppo aziendale" va rimosso, va fatto manualmente

Per la narrativa B2B presentata in Confindustria, questo e' il gap architetturale piu' rilevante: l'entita' centrale (l'Azienda) non esiste nel DB.

---

## Sezione 2 — Gemini 2.5 Flash: Analisi Prompt

### 2.1 Mappa delle 8 chiamate

| # | Endpoint | LINGUA | response_mime_type JSON | Google Search | Parsing |
|---|---|---|---|---|---|
| 1 | `/extract-receipt` hotel | ✅ | ❌ | ❌ | strip+loads |
| 2 | `/extract-receipt` volo | ✅ | ❌ | ❌ | strip+loads |
| 3 | `/estimate-budget` | ❌ | ❌ | ❌ | strip+loads |
| 4 | `/search-logistics` hotel | ❌ | ❌ | ❌ | strip+loads |
| 5 | `/estimate-costs` | ✅ | ❌ | ❌ | json.loads |
| 6 | `/generate-proposals` | ✅ | ❌ | ❌ | strip+loads |
| 7 | `/generate-itinerary` | ✅ | ❌ | ❌ | loads |
| 8 | `/trip-events` | ✅ | ❌ | ✅ grounding | regex+loads |

**Sintesi**: 0/8 usano `response_mime_type="application/json"`. Questa config forza Gemini a non aggiungere mai testo fuori dal JSON. Il parsing manuale con `.replace("```json", "")` fallisce se Gemini 2.5 Flash cambia leggermente il suo formato di output (cosa che succede tra versioni del modello).

---

### 2.2 Il prompt piu' rischioso: generate-proposals (trips.py:1424)

Il prompt di generazione proposte chiede a Gemini 3 task in simultanea:

```
TASK 1: Trova IATA di partenza
TASK 2: Genera N proposte con temi diversi
TASK 3: Analizza la distanza e suggerisci il mezzo di trasporto
```

**Problema**: i multi-task prompt aumentano la probabilita' che Gemini ignori uno dei task o li mescoli nel JSON di output. Se TASK 1 fallisce (IATA sbagliato), la proposta viene generata con un aeroporto errato. Il fallback in `flights.py` per IATA inference esiste ma non e' collegato a questo path.

**Raccomandazione**: splitare in 2 chiamate o usare un JSON schema strutturato con `response_schema`.

---

### 2.3 Il prompt migliore: trip-events (trips.py:2742)

```python
config=types.GenerateContentConfig(
    tools=[types.Tool(google_search=types.GoogleSearch())]
)
```

Questa e' la chiamata piu' avanzata. Usa il grounding con Google Search per recuperare eventi reali (festival, concerti, etc.) nella destinazione. E' un differenziatore competitivo concreto. Va evidenziato nella demo.

---

### 2.4 Calcolo costo per chiamata (stima)

Gemini 2.5 Flash pricing (aprile 2026):
- Input: ~$0.075/1M token
- Output: ~$0.30/1M token

Stima per le chiamate principali:

| Chiamata | Input est. | Output est. | Costo est. |
|---|---|---|---|
| generate-proposals | ~800 token | ~600 token | ~$0.0004 |
| generate-itinerary | ~1200 token | ~2000 token | ~$0.0007 |
| trip-events (con Search) | ~500 token + search | ~800 token | ~$0.001 |
| chatbot | ~1500 token | ~300 token | ~$0.0001 |

Costo per utente per pianificazione completa: **< $0.005**. Gemini 2.5 Flash e' la scelta giusta per questo use case — costo irrisorio, velocita' alta.

---

### 2.5 Ottimizzazioni disponibili (zero costo)

1. **`response_mime_type="application/json"`**: elimina il parsing fragile, zero token extra
2. **`response_schema`**: definire lo schema Pydantic del JSON atteso, Gemini lo rispetta al 100%
3. **`ai_client` check prima della prompt construction** (chatbot, trips.py:2293): attualmente il prompt viene costruito DOPO il check, sprecando CPU se il client non c'e'

---

## Sezione 3 — Error Handling: FastAPI

### 3.1 Schema attuale

```
HTTPException (specifico per route) ─► FastAPI default handler (JSON 4xx)
Exception (qualsiasi altro errore) ─► global_exception_handler (JSON 500 generico)
```

**Global handler** (main.py:123): ✅ Corretto — logga su stderr, restituisce JSON 500 generico senza esporre dettagli interni.

### 3.2 Problemi identificati

**A. Endpoint `migrate-calendar` in produzione [P1]**
```python
# main.py:93-117
@app.get("/admin/migrate-calendar", dependencies=[Depends(verify_admin_token)])
def migrate_db_calendar():
    conn.execute(text("ALTER TABLE account ADD COLUMN IF NOT EXISTS ..."))
```
Esegue DDL direttamente via API. E' protetto da `X-Admin-Token`, ma:
- L'endpoint non ha test
- Un token leakato permette DDL arbitrario sul DB
- Le stesse colonne sono gia' in Alembic — questo endpoint e' obsoleto ma non rimosso

**B. Bare `except:` clauses [P2]**
In trips.py esistono almeno 3 istanze di `except:` nudo che catturano tutto (incluso `SystemExit`). Pattern corretto: `except Exception as e:`.

**C. Fallback silenzioso AI client [P2]**
```python
# trips.py:581-582
if not ai_client:
    return {"budget_min": 0, "budget_max": 0, "breakdown": {}}
```
Restituisce dati zerati senza notificare l'utente. L'UI mostra "€0" come budget stimato. Un errore di configurazione (GOOGLE_API_KEY mancante) diventa silenzioso.

**D. Error detail esposto in leads.py [P1]**
```python
# leads.py:86
raise HTTPException(status_code=500, detail=f"Error saving lead: {str(e)}")
```
L'eccezione raw (`str(e)`) viene esposta al client. Puo' contenere dettagli del DB (nome tabella, vincoli).

---

## Sezione 4 — Error Handling: React

### 4.1 Schema attuale

```
App.jsx (try-catch) ─► ErrorBoundary (class component) ─► {routes}
                                                            └─► Suspense (lazy loading)
```

### 4.2 Problemi identificati

**A. try-catch intorno al JSX non funziona in React [P1]**
```javascript
// App.jsx:100-159
try {
  return (
    <ErrorBoundary>
      <Routes>...</Routes>
    </ErrorBoundary>
  );
} catch (err) {
  setGlobalError(err.message);
  return null;
}
```
Questo try-catch NON cattura errori durante il render. In React, i render errors vengono catturati solo da `componentDidCatch` (ErrorBoundary). Il `globalError` state (righe 86-98) non viene mai impostato da questo catch — il codice e' dead code.

**B. Nessun handler per errori asincroni globali [P2]**
```javascript
// App.jsx — MANCANTE
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
```
API calls che falliscono senza un `.catch()` (es. dentro `useEffect` senza try-catch) producono rejection non catturate, invisibili all'utente e al developer.

**C. ErrorBoundary non granulare [P2]**
Un solo ErrorBoundary wrappa tutto. Se `Dashboard.jsx` (36KB) crasha durante il render, l'intera app mostra la schermata di errore. L'utente perde il contesto della pagina.

Soluzione: `<ErrorBoundary>` individuale per ogni route critica:
```jsx
<Route path="/trip/:id" element={
  <ErrorBoundary>
    <Dashboard />
  </ErrorBoundary>
} />
```

**D. ErrorBoundary non cattura [P2]**
La classe ErrorBoundary esistente non cattura:
- Errori in event handlers
- Errori in codice asincrono (setTimeout, fetch)
- Errori in server-side rendering (non usato, ma da documentare)

---

## Sezione 5 — Matrice Priorita' FASE 3

| ID | Area | Finding | Priorita' | Effort Fix |
|---|---|---|---|---|
| T01 | SQLModel | `company_id` senza FK e tabella Company | **P0** | Alto |
| T02 | Gemini | 0/8 chiamate usano `response_mime_type` | **P0** | Basso |
| T03 | FastAPI | `migrate-calendar` endpoint in produzione | P1 | Basso |
| T04 | FastAPI | `str(e)` esposto in leads.py 500 | P1 | Basso |
| T05 | React | try-catch inutile intorno al render | P1 | Basso |
| T06 | Alembic | Tabelle non create da Alembic da zero | P1 | Medio |
| T07 | SQLModel | 8 campi data/time come `str` | P2 | Alto |
| T08 | React | Nessun `unhandledrejection` listener | P2 | Basso |
| T09 | React | ErrorBoundary non granulare | P2 | Basso |
| T10 | Gemini | Multi-task prompt proposals (fragile) | P2 | Medio |
| T11 | FastAPI | Bare `except:` clauses | P2 | Basso |
| T12 | Gemini | AI client check dopo prompt construction | P2 | Basso |

---

## Sezione 6 — Quick Wins FASE 3 (< 30 min totali)

### Fix T02 — Gemini JSON mode (5 min, massimo impatto)

Aggiungere a ogni `generate_content` che non ha gia' un `config`:
```python
from google.genai import types

response = await ai_client.aio.models.generate_content(
    model=AI_MODEL,
    contents=prompt,
    config=types.GenerateContentConfig(
        response_mime_type="application/json"
    )
)
# Poi: data = json.loads(response.text) — nessun replace necessario
```

### Fix T03 — Rimuovere migrate-calendar (2 min)

Rimuovere o commentare le righe 93-117 di main.py. La migrazione e' gia' in Alembic.

### Fix T04 — Error detail generico in leads.py (1 min)

```python
# Prima:
raise HTTPException(status_code=500, detail=f"Error saving lead: {str(e)}")
# Dopo:
logger.error(f"[LEADS] Error saving lead: {e}")
raise HTTPException(status_code=500, detail="Errore interno. Riprova.")
```

### Fix T05 — Rimuovere try-catch inutile da App.jsx (2 min)

Rimuovere il blocco try-catch alle righe 100-160. L'ErrorBoundary gestisce gia' gli errori di render. Il `globalError` state e il blocco if (righe 57, 86-98) sono dead code da rimuovere.

### Fix T08 — Aggiungere unhandledrejection listener (3 min)

```javascript
// App.jsx, dentro il useEffect esistente
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  // Opzionale: showToast('Errore imprevisto', 'error');
});
```

---

## Sezione 7 — Cose Corrette (non toccare)

| Area | Finding |
|---|---|
| Rate limiting | UPDATE atomico corretto, no race condition |
| Auth JWT | Dipendency injection corretta, token type check |
| CORS | Origins specifiche, no wildcard in produzione |
| Gemini trip-events | Google Search grounding — feature differenziante |
| Stripe idempotency | `ProcessedStripeEvent` pattern corretto |
| Offline detection | `navigator.onLine` + event listeners |
| Lazy loading | Tutti i page components sono lazy con Suspense |
| Security headers | Vercel config enterprise-grade |
| Admin token | `secrets.compare_digest` — timing-safe comparison |
