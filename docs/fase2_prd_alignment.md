# FASE 2 — PRD Alignment Report (aggiornato con PRD.md reale)

> Audit by Claude Code (Sonnet 4.6) | 2026-04-03
> PRD Baseline: PRD.md v1.0 (2 Aprile 2026)

---

## Metodologia

Confronto sistematico tra il PRD.md (sezioni 4, 9, 10, 11) e lo stato reale del codice
rilevato in FASE 1 e dai file letti direttamente.

La struttura del report segue questa logica:
1. **Gap Confermati** — il PRD dice "Non implementato", il codice conferma
2. **Gap Scoperti** — il PRD dice "Implementato", il codice dice altro
3. **Rischi** — non citati nel PRD, trovati nel codice

---

## 1. Gap Confermati (PRD onesto con se stesso)

Questi sono gap che il PRD riconosce esplicitamente. Li confermo e aggiungo contesto.

### RF-24 — Admin Panel [P1]
**PRD:** "Non implementato"  
**Codice:** `/admin/init-db` e `/admin/migrate-calendar` esistono in main.py ma sono
stub/deprecati. Nessuna UI admin. Nessun monitoraggio API key usage, nessuna gestione
utenti da interfaccia.  
**Impatto demo:** Nella demo B2B, la domanda "come gestisco i miei utenti?" non ha risposta
visuale. Il giudice può chiederlo.

---

### RF-25 — Notifiche Real-time [P2]
**PRD:** "Non implementato"  
**Codice:** Confermato — nessun WebSocket, nessun polling. I partecipanti non sanno in
tempo reale quando qualcuno vota.  
**Impatto demo:** Minore, si può workaroundare con un refresh manuale durante la demo.

---

### RF-26 — Mappe offline [P2]
**PRD:** "Non implementato"  
**Codice:** Il service worker casha le pagine ma non i tile OSM.  
**Impatto demo:** Trascurabile se la demo avviene con connessione.

---

### RNF-14 — Testing parziale [P1]
**PRD:** "Parziale"  
**Codice:** test_auth.py + test_expenses.py + test_trips.py (2 test: create e list trip).
**Zero test per endpoint AI** (8 chiamate Gemini senza copertura).  
**Impatto demo:** Un crash durante la demo live su un endpoint AI non sarebbe stato
rilevato in pre-deploy. Rischio concreto.

---

### RNF-15 — CI/CD [P2]
**PRD:** "Non implementato"  
**Codice:** Nessun `.github/workflows/`. Deploy manuale su Vercel.  
**Impatto demo:** Nessuno immediato, ma ogni giudice tecnico lo noterà.

---

## 2. Gap Scoperti (PRD dice "Implementato", codice dice altro)

Questi sono i finding piu' rilevanti: il PRD marca qualcosa come fatto, ma l'analisi del
codice rivela che e' parziale, fragile o incompleto.

---

### GAP-A | Export PDF non testato e con str(e) esposto [P1]

**PRD RF-17:** "Implementato"  
**Codice (trips.py:2422):** L'endpoint `/trips/{id}/export-pdf` esiste e usa FPDF.  
**Problema trovato (trips.py:1633):**
```python
raise HTTPException(status_code=500, detail=f"Errore nella generazione: {str(e)}")
```
Il dettaglio dell'eccezione raw viene esposto al client in piu' endpoint, incluso questo.
Puo' contenere stack trace o nomi di tabelle PostgreSQL.  
Stesso pattern in leads.py:86.

---

### GAP-B | RNF-09 Error Boundary — "Soddisfatto" ma con dead code [P1]

**PRD RNF-09:** "Affidabilità: Error boundary React + global exception handler FastAPI — Soddisfatto"  
**Codice (App.jsx:100-160):**
```javascript
try {
  return (<ErrorBoundary>...</ErrorBoundary>);
} catch (err) {
  setGlobalError(err.message);  // ← mai eseguito
}
```
In React, gli errori di render NON vengono catturati da try-catch sincroni — solo da
`componentDidCatch`. Il blocco `if (globalError)` alle righe 86-98 e lo stato `globalError`
sono **dead code che non viene mai raggiunto**. Il PRD lo marca come soddisfatto, ma c'e'
codice che da' false sense of security.

L'ErrorBoundary esiste ed e' corretto, ma e' UN SOLO boundary per tutta l'app. Un crash
in Dashboard (36KB) porta l'intera app alla schermata di errore.

---

### GAP-C | SSO non e' enterprise SSO [P1]

**PRD RF-11/Section 4.11:** "SSO (Single Sign-On) — Implementato"  
**PRD Section 5.3:** "L'utente si registra [...] o accede con SSO"  
**Codice (sso.py):** E' Google OAuth2 sign-in. Nessun SAML, nessun OIDC con Microsoft
Entra/Okta.

Problema concreto in sso.py:125:
```python
# JWT esposto come query parameter — presente in browser history e server logs
return RedirectResponse(url=f"{frontend_url}/auth?token={jwt_token}")
```

Problema concreto in sso.py:29:
```python
# URL hardcoded — rompe su qualsiasi dominio non Vercel
return "https://splitplan-ai.vercel.app/api/auth/google/callback"
```
Se il prodotto viene spostato su un dominio custom (es. `splitplan.io`), il Google SSO
smette di funzionare senza modifiche al codice.

---

### GAP-D | 0/8 chiamate Gemini usano JSON mode [P0 — critico per demo]

**PRD Section 4.1/4.3/4.4:** "AI genera proposte / itinerario / chat — Implementato"  
**Codice (trips.py):** 8 chiamate `generate_content`, tutte con parsing manuale fragile:
```python
raw = response.text.replace("```json", "").replace("```", "").strip()
data = json.loads(raw)  # crasha se Gemini aggiunge 1 parola fuori dal JSON
```
`response_mime_type="application/json"` non e' usato in nessuna delle 8 chiamate.
Gemini 2.5 Flash varia il formato di output tra versioni. Un aggiornamento del modello
prima della competizione potrebbe rompere silenziosamente la generazione proposte o
l'itinerario.

---

### GAP-E | Entita' Company non esiste nel DB [P0 — critico per pitch B2B]

**PRD Section 3:** "Target Primario — Team aziendali"  
**PRD Section 7:** nessuna tabella Company elencata (solo DemoLead)  
**Codice (models.py:27):**
```python
company_id: Optional[int] = Field(default=None)
# Nessun foreign_key, nessuna tabella Company
```
L'azienda e' il concetto centrale del pitch B2B, ma e' rappresentata solo da un intero
libero nel modello Account. Non c'e' modo di:
- Assegnare un nome/ragione sociale a un'azienda
- Configurare policy aziendali (es. budget massimo per trasferta)
- Mostrare a un giudice "questa e' la dashboard dell'azienda X con N dipendenti"

La CompanyDashboard mostra trasferte filtrate per `is_manager`, ma senza un'entita'
Company, non c'e' isolamento garantito tra aziende diverse.

---

### GAP-F | DemoLead usato come request body diretto [P1]

**PRD Section 4.15:** "Form dedicato per raccolta lead aziendali — Implementato"  
**Codice (leads.py:66):**
```python
async def create_demo_lead(lead: DemoLead, ...):
    session.add(lead)
```
`DemoLead` e' il modello della tabella DB usato direttamente come corpo della richiesta
HTTP. Un client malintenzionato puo' inviare `"id": 1` o `"created_at": "2020-01-01"` nel
JSON e sovrascrivere valori auto-generati nel DB.

Fix: separare `DemoLeadCreate(BaseModel)` senza `id` e `created_at`.

---

## 3. Matrice Priorita' Completa

| ID | Tipo | PRD Status | Priorita' | Effort | Impatto Demo |
|---|---|---|---|---|---|
| GAP-D | Gap scoperto | "Implementato" | **P0** | Basso | Crash live |
| GAP-E | Gap scoperto | Non citato | **P0** | Alto | Pitch B2B fragile |
| GAP-A | Gap scoperto | "Implementato" | P1 | Basso | Info leak |
| GAP-B | Gap scoperto | "Soddisfatto" | P1 | Basso | False safety |
| GAP-C | Gap scoperto | "Implementato" | P1 | Basso | Dominio custom rompe |
| GAP-F | Gap scoperto | "Implementato" | P1 | Basso | Security |
| RF-24 | Gap confermato | "Non implementato" | P1 | Alto | Domanda senza risposta |
| RNF-14 | Gap confermato | "Parziale" | P1 | Alto | Zero safety net AI |
| RF-25 | Gap confermato | "Non implementato" | P2 | Alto | Demo workaroundabile |
| RNF-15 | Gap confermato | "Non implementato" | P2 | Medio | Solo percezione |
| RF-26 | Gap confermato | "Non implementato" | P2 | Alto | Trascurabile in demo |

---

## 4. Cosa il PRD Non Cita ma e' Corretto nel Codice

Queste feature non sono nel PRD ma sono implementate bene — vale la pena citarle
nella presentazione perche' aumentano la percezione di maturita':

| Feature | File |
|---|---|
| Google Search grounding per eventi locali | trips.py:2746 |
| Nearest Neighbor per ottimizzazione itinerario | trips.py (itinerary generation) |
| Stripe idempotency con tabella dedicata | models.py ProcessedStripeEvent |
| Token Google Calendar cifrato in DB | utils/crypto.py |
| Offline banner nativo + PWA service worker | App.jsx + vite.config.js |
| `secrets.compare_digest` per admin token | admin_auth.py |
| `llms.txt` per AI crawler | public/llms.txt |

---

## 5. Quick Wins pre-Confindustria (< 2h totali)

In ordine di impatto/effort:

1. **GAP-D** — Aggiungere `response_mime_type="application/json"` a 5 chiamate Gemini.
   Elimina il rischio crash in demo. **5 minuti, 5 righe.**

2. **GAP-C** — Fix SSO callback URL: sostituire stringa hardcoded con `os.getenv("FRONTEND_URL")`.
   Permette deploy su dominio custom. **2 minuti, 1 riga.**

3. **GAP-A / GAP-F** — Sostituire `str(e)` nei 500 con messaggio generico + logger.error.
   Creare `DemoLeadCreate` separato. **20 minuti, 15 righe.**

4. **GAP-B** — Rimuovere dead code try-catch da App.jsx, aggiungere ErrorBoundary per route Dashboard.
   **15 minuti.**
