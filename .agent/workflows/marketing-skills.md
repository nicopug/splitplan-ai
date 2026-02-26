---
description: Guida all'uso dei Marketing Skills nel progetto SplitPlan
---
# 🚀 Marketing Automation & Strategy Workflow

Questo workflow ti permette di sfruttare la cartella `marketingskills` integrata nel progetto per accelerare la crescita di SplitPlan.

## 1. Come invocare le Skill
Le skill sono state integrate in `.claude/skills/`. Puoi chiedere all'AI di eseguire task specifici facendo riferimento a queste capacità:

- **CRO (Ottimizzazione Conversioni)**: "Usa la skill `page-cro` per analizzare la landing page e suggerire miglioramenti per aumentare le conversioni."
- **Copywriting**: "Usa la skill `copywriting` per scrivere un'email di benvenuto che convinca gli utenti a creare il loro primo viaggio."
- **SEO**: "Esegui un `seo-audit` tecnico sulle pagine correnti di SplitPlan."
- **Strategia**: "Genera 10 `marketing-ideas` per promuovere SplitPlan su TikTok/Instagram."

## 2. Il Punto di Riferimento: Marketing Context
Tutte le skill leggono la loro configurazione da `.claude/product-marketing-context.md`. Se il prodotto cambia o vuoi testare un nuovo posizionamento:
1. Modifica quel file.
2. Chiedi all'AI di rigenerare i testi basandosi sul nuovo contesto.

## 3. Uso dei Tool CLI
Nella cartella `.claude/tools/` sono presenti tool per integrazioni API. Puoi chiedere all'assistente di:
- "Configura il tracking GA4 usando i tool in `.claude/tools/clis/ga4.js`."
- "Verifica l'integrazione Stripe usando `stripe.js`."

## 4. Esempi di Comandi Rapidi
- `Analizza il flusso di registrazione (signup-flow-cro) e trova dove gli utenti abbandonano.`
- `Crea una sequenza di 3 email per recuperare i carrelli abbandonati (acquisto crediti).`
- `Ottimizza i tag meta del sito per la keyword 'pianificatore viaggi gruppo AI'.`

---
// turbo-all
