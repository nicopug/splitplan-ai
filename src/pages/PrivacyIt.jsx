const PrivacyIt = () => {
    return (
        <div className="container py-24 pt-[var(--header-height)]">
            <div dangerouslySetInnerHTML={{
                __html: `
<style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
  h1 { font-size: 2em; border-bottom: 2px solid #eaeaea; padding-bottom: 10px; }
  h2 { font-size: 1.5em; margin-top: 1.5em; border-bottom: 1px solid #eaeaea; padding-bottom: 5px; }
  h3 { font-size: 1.2em; margin-top: 1.2em; }
  p { margin-bottom: 1em; }
  ul { margin-bottom: 1em; padding-left: 20px; }
  li { margin-bottom: 0.5em; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 1.5em; font-size: 14px; }
  th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
  th { background-color: #f2f2f2; font-weight: bold; }
  tr:nth-child(even) { background-color: #f9f9f9; }
</style>

<h1>Informativa sulla Privacy — SplitPlan AI</h1>
<p><em>Ultimo aggiornamento: 2026-04-04</em></p>

<p>La presente Informativa sulla Privacy descrive come SplitPlan AI ("SplitPlan", "noi", "ci" o "nostro") raccoglie, utilizza, divulga e protegge le informazioni personali degli utenti che accedono o utilizzano il nostro servizio software disponibile all'indirizzo splitplan.ai (il "Servizio"). SplitPlan AI agisce in qualità di <strong>Titolare del Trattamento</strong> ai sensi del Regolamento (UE) 2016/679 (GDPR).</p>
<p>Leggere attentamente la presente Informativa prima di utilizzare il Servizio. L'utilizzo del Servizio implica l'accettazione delle pratiche descritte nella presente Informativa.</p>

<h2>1. Titolare del Trattamento</h2>
<p><strong>SplitPlan AI</strong><br/>
Email: <a href="mailto:splitplan.ai@gmail.com">splitplan.ai@gmail.com</a><br/>
Per esercitare i propri diritti o per qualsiasi richiesta relativa al trattamento dei dati personali, scrivere all'indirizzo sopra indicato con oggetto "Richiesta Privacy — GDPR".</p>

<h2>2. Dati Personali Raccolti</h2>
<p>Raccogliamo i seguenti tipi di dati personali:</p>
<ul>
  <li><strong>Dati di registrazione e account</strong>: nome, cognome, indirizzo e-mail, password (in formato hash), lingua preferita;</li>
  <li><strong>Dati di utilizzo</strong>: pagine visitate, funzionalità utilizzate, clic, interazioni con l'interfaccia, timestamp delle sessioni;</li>
  <li><strong>Dati di viaggio</strong>: destinazioni, date, preferenze, partecipanti ai viaggi, itinerari generati, note spese;</li>
  <li><strong>Dati di pagamento</strong>: processati tramite Stripe; non conserviamo numeri di carta o dati bancari completi;</li>
  <li><strong>Dati aziendali (solo account B2B)</strong>: ragione sociale, partita IVA, indirizzo, limiti di spesa, dati dei dipendenti gestiti;</li>
  <li><strong>Dati tecnici</strong>: indirizzo IP (anonimizzato dove possibile), tipo di browser, sistema operativo, cookie di sessione.</li>
</ul>

<h2>3. Finalità e Basi Giuridiche del Trattamento</h2>
<table>
  <thead>
    <tr>
      <th>Finalità</th>
      <th>Base Giuridica (art. GDPR)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Erogazione del Servizio e gestione dell'account</td>
      <td>Esecuzione del contratto (art. 6.1.b)</td>
    </tr>
    <tr>
      <td>Generazione di itinerari e stime budget tramite AI</td>
      <td>Esecuzione del contratto (art. 6.1.b)</td>
    </tr>
    <tr>
      <td>Invio di comunicazioni di servizio (conferma registrazione, reset password)</td>
      <td>Esecuzione del contratto (art. 6.1.b)</td>
    </tr>
    <tr>
      <td>Analisi dell'utilizzo e miglioramento del prodotto</td>
      <td>Legittimo interesse (art. 6.1.f)</td>
    </tr>
    <tr>
      <td>Session Replay per miglioramento UX (PostHog, Clarity)</td>
      <td>Legittimo interesse (art. 6.1.f) — con mascheramento obbligatorio dei dati sensibili</td>
    </tr>
    <tr>
      <td>Marketing e comunicazioni promozionali</td>
      <td>Consenso (art. 6.1.a) — revocabile in qualsiasi momento</td>
    </tr>
    <tr>
      <td>Adempimento di obblighi legali e fiscali</td>
      <td>Obbligo legale (art. 6.1.c)</td>
    </tr>
    <tr>
      <td>Prevenzione di frodi e sicurezza del Servizio</td>
      <td>Legittimo interesse (art. 6.1.f)</td>
    </tr>
  </tbody>
</table>

<h2>4. Cookie e Tecnologie di Tracciamento</h2>
<p>Utilizziamo cookie tecnici necessari per il funzionamento del Servizio e cookie analitici di terze parti. I cookie tecnici non richiedono consenso. I cookie analitici vengono attivati in base alla base giuridica del legittimo interesse, con possibilità di opt-out. Per gestire le preferenze sui cookie, contattare <a href="mailto:splitplan.ai@gmail.com">splitplan.ai@gmail.com</a>.</p>

<h2>5. Condivisione dei Dati con Terze Parti</h2>
<p>Non vendiamo i dati personali degli utenti. Condividiamo i dati esclusivamente con i seguenti soggetti:</p>
<ul>
  <li><strong>Fornitori di servizi tecnici</strong> (hosting, database, e-mail transazionale) — vincolati da accordi di trattamento dei dati (DPA);</li>
  <li><strong>Strumenti di analisi di terze parti</strong> — elencati nella Sezione 7;</li>
  <li><strong>Stripe</strong> — per il trattamento dei pagamenti, in qualità di titolare autonomo del trattamento;</li>
  <li><strong>Google (Gemini API)</strong> — per la generazione di contenuti AI; i dati inviati a Google sono limitati ai prompt necessari per la generazione;</li>
  <li><strong>Autorità competenti</strong> — qualora richiesto da un obbligo legale o da un'autorità giudiziaria.</li>
</ul>

<h2>6. Trasferimenti Internazionali di Dati</h2>
<p>Alcuni dei nostri fornitori (Google, Stripe, PostHog US, Microsoft) hanno sede negli Stati Uniti. Per tali trasferimenti adottiamo le <strong>Clausole Contrattuali Standard (SCC)</strong> approvate dalla Commissione Europea, garantendo un livello di protezione equivalente a quello del SEE.</p>

<h2>7. Strumenti di Analisi e Tracciamento di Terze Parti</h2>
<p>Utilizziamo i seguenti strumenti di terze parti per analizzare il comportamento degli utenti, migliorare l'esperienza d'uso e supportare le nostre operazioni commerciali:</p>
<table>
  <thead>
    <tr>
      <th>Strumento</th>
      <th>Fornitore</th>
      <th>Finalità</th>
      <th>Dati Trasferiti a</th>
      <th>Informativa Privacy</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>PostHog</strong></td>
      <td>PostHog Inc. / PostHog EU</td>
      <td>Analytics di prodotto, tracciamento eventi e <strong>Session Replay</strong>. I campi di input sensibili (password, dati di pagamento) sono mascherati a livello SDK prima di qualsiasi trasmissione e non vengono mai registrati.</td>
      <td>UE (eu.posthog.com) o USA in base alla regione</td>
      <td><a href="https://posthog.com/privacy" target="_blank" rel="noopener">posthog.com/privacy</a></td>
    </tr>
    <tr>
      <td><strong>Google Analytics 4 (GA4)</strong></td>
      <td>Google LLC</td>
      <td>Statistiche aggregate sul traffico del sito web, visualizzazioni di pagina e tracciamento delle conversioni. Gli indirizzi IP sono anonimizzati.</td>
      <td>USA (Clausole Contrattuali Standard)</td>
      <td><a href="https://policies.google.com/privacy" target="_blank" rel="noopener">policies.google.com/privacy</a></td>
    </tr>
    <tr>
      <td><strong>Google Tag Manager (GTM)</strong></td>
      <td>Google LLC</td>
      <td>Sistema di gestione dei tag per la distribuzione e il controllo degli script di tracciamento. GTM non raccoglie dati personali direttamente.</td>
      <td>USA (Clausole Contrattuali Standard)</td>
      <td><a href="https://policies.google.com/privacy" target="_blank" rel="noopener">policies.google.com/privacy</a></td>
    </tr>
    <tr>
      <td><strong>Microsoft Clarity</strong></td>
      <td>Microsoft Corporation</td>
      <td>Heatmap e registrazioni delle sessioni per analizzare pattern di clic e comportamento di scorrimento. I campi personali e sensibili sono mascherati per impostazione predefinita.</td>
      <td>USA (Clausole Contrattuali Standard)</td>
      <td><a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noopener">Dichiarazione Privacy Microsoft</a></td>
    </tr>
  </tbody>
</table>
<p><strong>Session Replay e Mascheramento dei Dati.</strong> Gli strumenti di Session Replay (PostHog e Microsoft Clarity) possono registrare movimenti del mouse, clic e comportamento di scorrimento. Tutti i campi di form classificati come sensibili — inclusi password, numeri di carta di pagamento e campi di identificazione personale — sono mascherati a livello SDK prima di qualsiasi trasmissione e non sono mai memorizzati o visualizzabili nelle registrazioni. L'utente può opporsi alla registrazione delle sessioni in qualsiasi momento contattando <a href="mailto:splitplan.ai@gmail.com">splitplan.ai@gmail.com</a>.</p>

<h2>8. Conservazione dei Dati</h2>
<p>Conserviamo i dati personali per il tempo strettamente necessario alle finalità per cui sono stati raccolti:</p>
<ul>
  <li><strong>Dati account</strong>: per tutta la durata del rapporto contrattuale e per 5 anni successivi alla chiusura dell'account (per obbligo legale e difesa in giudizio);</li>
  <li><strong>Dati di utilizzo e analitici</strong>: massimo 26 mesi (in linea con le linee guida del Garante Europeo);</li>
  <li><strong>Dati di pagamento</strong>: conservati da Stripe secondo la propria politica di conservazione;</li>
  <li><strong>Note spese e documenti B2B</strong>: 10 anni (obbligo fiscale italiano ai sensi del D.P.R. 633/1972).</li>
</ul>

<h2>9. Diritti dell'Interessato</h2>
<p>In qualità di interessato ai sensi del GDPR, l'utente ha i seguenti diritti:</p>
<ul>
  <li><strong>Diritto di accesso (art. 15 GDPR)</strong>: ottenere conferma del trattamento e una copia dei dati personali detenuti;</li>
  <li><strong>Diritto di rettifica (art. 16 GDPR)</strong>: richiedere la correzione di dati inesatti o incompleti;</li>
  <li><strong>Diritto alla cancellazione / "Diritto all'Oblio" (art. 17 GDPR)</strong>: richiedere la cancellazione dei dati in determinate circostanze (si veda la Sezione 10);</li>
  <li><strong>Diritto di limitazione del trattamento (art. 18 GDPR)</strong>: richiedere la sospensione del trattamento in determinate circostanze;</li>
  <li><strong>Diritto alla portabilità dei dati (art. 20 GDPR)</strong>: ricevere i propri dati in formato strutturato e leggibile da dispositivo automatico;</li>
  <li><strong>Diritto di opposizione (art. 21 GDPR)</strong>: opporsi al trattamento basato sul legittimo interesse;</li>
  <li><strong>Diritto di revoca del consenso</strong>: revocare il consenso in qualsiasi momento, senza pregiudizio per la liceità del trattamento effettuato prima della revoca;</li>
  <li><strong>Diritto di proporre reclamo</strong>: presentare reclamo al Garante per la Protezione dei Dati Personali (www.garanteprivacy.it).</li>
</ul>
<p>Per esercitare i propri diritti, scrivere a <a href="mailto:splitplan.ai@gmail.com">splitplan.ai@gmail.com</a> con oggetto "Richiesta Diritti GDPR". Risponderemo entro 30 giorni di calendario.</p>

<h2>10. Diritto alla Cancellazione ("Diritto all'Oblio") — Procedura</h2>
<p>L'utente può richiedere la cancellazione dei propri dati personali nei seguenti casi:</p>
<ul>
  <li>I dati non sono più necessari rispetto alle finalità per cui sono stati raccolti;</li>
  <li>L'utente revoca il consenso e non sussiste altra base giuridica per il trattamento;</li>
  <li>L'utente si oppone al trattamento e non sussistono motivi legittimi prevalenti;</li>
  <li>I dati sono stati trattati illecitamente;</li>
  <li>La cancellazione è necessaria per adempiere un obbligo legale.</li>
</ul>
<p><strong>Come inviare una richiesta di cancellazione:</strong> inviare un'e-mail a <a href="mailto:splitplan.ai@gmail.com">splitplan.ai@gmail.com</a> con oggetto <em>"Richiesta Diritto alla Cancellazione"</em>, indicando nome e cognome, indirizzo e-mail dell'account e una descrizione dei dati da cancellare. Confermeremo la ricezione entro 5 giorni lavorativi e completeremo la cancellazione entro 30 giorni di calendario, salvo eccezioni.</p>
<p><strong>Cancellazione presso terze parti.</strong> A seguito di una richiesta valida, inoltreremo la richiesta anche ai fornitori di strumenti analitici di terze parti elencati nella Sezione 7. Gli utenti di PostHog possono inviare una richiesta diretta su <a href="https://posthog.com/privacy" target="_blank" rel="noopener">posthog.com/privacy</a>. I dati di Google Analytics possono essere eliminati tramite le <a href="https://support.google.com/analytics/answer/9450800" target="_blank" rel="noopener">API di eliminazione utente GA4</a>. I dati di Microsoft Clarity possono essere rimossi contattando Microsoft tramite il loro portale privacy.</p>
<p><strong>Eccezioni.</strong> Il diritto alla cancellazione non si applica quando il trattamento è necessario per: adempiere un obbligo legale; l'accertamento, l'esercizio o la difesa di un diritto in sede giudiziaria; motivi di interesse pubblico rilevante.</p>

<h2>11. Sicurezza dei Dati</h2>
<p>Adottiamo misure tecniche e organizzative adeguate per proteggere i dati personali da accesso non autorizzato, divulgazione, alterazione o distruzione. Tali misure includono crittografia TLS per i dati in transito, hashing delle password, accesso ai dati con privilegi minimi e monitoraggio continuo della sicurezza. In caso di violazione dei dati personali che possa comportare un rischio elevato per i diritti e le libertà degli interessati, provvederemo alla notifica agli interessati nei modi e nei tempi previsti dall'art. 34 GDPR.</p>

<h2>12. Minori</h2>
<p>Il Servizio non è destinato a persone di età inferiore a 18 anni. Non raccogliamo consapevolmente dati personali di minori. Qualora venissimo a conoscenza di dati personali di minori, li cancelleremo tempestivamente.</p>

<h2>13. Modifiche alla presente Informativa</h2>
<p>Ci riserviamo il diritto di aggiornare la presente Informativa in qualsiasi momento. Le modifiche significative saranno comunicate tramite avviso nel Servizio o per e-mail. L'uso continuato del Servizio dopo la pubblicazione delle modifiche costituisce accettazione dell'Informativa aggiornata.</p>

<h2>14. Come Esercitare i Diritti / Contatti</h2>
<p>Per qualsiasi richiesta relativa alla privacy, al trattamento dei dati personali o per esercitare i diritti previsti dal GDPR:</p>
<p>
  <strong>E-mail:</strong> <a href="mailto:splitplan.ai@gmail.com">splitplan.ai@gmail.com</a><br/>
  <strong>Oggetto:</strong> "Richiesta Privacy — GDPR"<br/>
  <strong>Tempo di risposta:</strong> entro 30 giorni di calendario dalla ricezione della richiesta completa.
</p>
<p>L'utente ha altresì il diritto di presentare reclamo all'autorità di controllo competente. In Italia: <strong>Garante per la Protezione dei Dati Personali</strong> — <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener">www.garanteprivacy.it</a>.</p>

<p><em>La presente Informativa sulla Privacy è stata aggiornata il 2026-04-04.</em></p>
` }} />
        </div>
    );
};

export default PrivacyIt;
