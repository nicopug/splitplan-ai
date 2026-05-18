import { JsonLd } from '../components/JsonLd';

const TERMS_IT_SCHEMA = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': 'https://splitplan-ai.vercel.app/terms#webpage',
    name: 'Termini di Servizio — SplitPlan AI',
    description: 'Termini di servizio di SplitPlan AI, piattaforma SaaS di gestione trasferte aziendali e viaggi di gruppo con AI.',
    inLanguage: 'it',
    isPartOf: { '@id': 'https://splitplan-ai.vercel.app/#website' },
    about: { '@id': 'https://splitplan-ai.vercel.app/#organization' },
    breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://splitplan-ai.vercel.app/' },
            { '@type': 'ListItem', position: 2, name: 'Termini', item: 'https://splitplan-ai.vercel.app/terms' },
        ],
    },
};

const TermsIt = () => {
    return (
        <div className="container py-24 pt-[var(--header-height)]">
            <JsonLd id="terms-it-jsonld" schema={TERMS_IT_SCHEMA} />
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
  table { width: 100%; border-collapse: collapse; margin-bottom: 1.5em; }
  th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 14px; }
  th { background-color: #f2f2f2; }
  tr:nth-child(even) { background-color: #f9f9f9; }
</style>

<h1>Termini di Servizio — SplitPlan AI</h1>

<h2>Avviso Legale</h2>
<p>Il presente documento costituisce un contratto legalmente vincolante tra l'utente e SplitPlan AI. Si raccomanda di leggere attentamente i presenti Termini prima di utilizzare il Servizio.</p>

<h2>1. Introduzione</h2>
<p>I presenti Termini di Servizio ("Termini") disciplinano l'accesso e l'utilizzo del servizio software SplitPlan AI, compresi tutti i siti web, le reti, le applicazioni e gli altri servizi forniti da SplitPlan AI (collettivamente, il "Servizio"). I presenti Termini costituiscono un accordo legalmente vincolante tra l'utente e SplitPlan AI ("noi", "ci" o "nostro"). Accedendo o utilizzando il Servizio, l'utente riconosce di aver letto, compreso e di accettare di essere vincolato dai presenti Termini.</p>

<h2>2. Definizioni</h2>
<p><strong>"Utente"</strong> si riferisce alla persona fisica o giuridica che accede o utilizza il Servizio.</p>
<p><strong>"Abbonamento"</strong> si riferisce al diritto acquistato di accedere e utilizzare il Servizio secondo il piano selezionato.</p>
<p><strong>"Contenuto"</strong> si riferisce a qualsiasi testo, immagine, video, audio o altro materiale presente sul Servizio o attraverso di esso.</p>
<p><strong>"Dati Utente"</strong> si riferisce a qualsiasi dato, informazione o materiale caricato, inserito o altrimenti fornito al Servizio dall'utente.</p>
<p><strong>"Diritti di Proprietà Intellettuale"</strong> indica tutti i diritti di brevetto, copyright, marchi registrati, segreti commerciali e altri diritti di proprietà intellettuale.</p>
<p><strong>"Titolare del Trattamento"</strong> ai sensi del Regolamento (UE) 2016/679 (GDPR) indica SplitPlan AI, in quanto soggetto che determina le finalità e i mezzi del trattamento dei dati personali.</p>

<h2>3. Accettazione dei Termini</h2>
<p>Accedendo o utilizzando il Servizio, l'utente accetta di essere vincolato dai presenti Termini e dalla nostra Informativa sulla Privacy, incorporata per riferimento. Qualora l'utente utilizzi il Servizio per conto di un'organizzazione, dichiara e garantisce di avere l'autorità per vincolare tale organizzazione ai presenti Termini. Se non si accettano i presenti Termini, non è consentito accedere al Servizio.</p>

<h2>4. Modifiche ai Termini</h2>
<p>Ci riserviamo il diritto di modificare i presenti Termini in qualsiasi momento. Forniremo avviso di modifiche significative pubblicando un avviso prominente sul Servizio o inviando un'e-mail. L'uso continuato del Servizio dopo tali modifiche costituisce accettazione dei Termini rivisti. Qualora l'utente non accetti i Termini rivisti, dovrà cessare di utilizzare il Servizio.</p>

<h2>5. Requisiti di Idoneità</h2>
<p>Per utilizzare il Servizio, è necessario avere almeno 18 anni o l'età della maggiore età nella propria giurisdizione, se superiore. Utilizzando il Servizio, l'utente dichiara e garantisce di soddisfare tali requisiti. Qualora si utilizzi il Servizio per conto di un'organizzazione, si dichiara e garantisce che l'organizzazione accetta di essere vincolata dai presenti Termini.</p>

<h2>6. Descrizione del Servizio</h2>
<p>SplitPlan AI è una piattaforma di pianificazione viaggi di gruppo basata sull'intelligenza artificiale che consente agli utenti di organizzare viaggi di gruppo, votare le destinazioni, generare itinerari con l'AI e suddividere le spese. Le funzionalità specifiche disponibili dipendono dal piano di Abbonamento selezionato.</p>

<h2>7. Condizioni di Abbonamento</h2>
<p>L'accesso al Servizio richiede un Abbonamento a pagamento. Salvo diversamente specificato al momento dell'acquisto:</p>
<ul>
  <li>Gli abbonamenti sono fatturati su base mensile o annuale;</li>
  <li>L'Abbonamento si rinnoverà automaticamente al termine di ogni periodo di fatturazione, salvo disdetta prima della data di rinnovo;</li>
  <li>L'utente autorizza l'addebito del metodo di pagamento per la quota di Abbonamento all'inizio di ogni periodo di fatturazione;</li>
  <li>In caso di upgrade, il metodo di pagamento sarà addebitato immediatamente per la differenza di costo proporzionale;</li>
  <li>In caso di downgrade, la modifica avrà effetto all'inizio del successivo periodo di fatturazione.</li>
</ul>
<p>I prezzi possono essere modificati con preavviso. L'uso continuato del Servizio dopo una variazione di prezzo costituisce accettazione dell'importo modificato.</p>
<p>L'utente può disdire l'Abbonamento in qualsiasi momento tramite le impostazioni dell'account o contattandoci. In caso di disdetta, il Servizio sarà accessibile fino alla fine del periodo di fatturazione in corso, senza diritto a rimborso parziale, salvo quanto espressamente previsto dai presenti Termini o dalla legge applicabile.</p>

<h2>8. Prove Gratuite</h2>
<p>Potremmo offrire prove gratuite del Servizio. L'idoneità alla prova gratuita è determinata a nostra discrezione. Salvo disdetta prima della scadenza del periodo di prova gratuita, il metodo di pagamento sarà addebitato automaticamente per il primo periodo di fatturazione dell'Abbonamento.</p>

<h2>9. Disponibilità del Servizio e Supporto</h2>
<p>Faremo ragionevoli sforzi per mantenere il Servizio operativo 24 ore su 24, 7 giorni su 7. Tuttavia, non garantiamo un accesso continuo e ininterrotto al Servizio. Ci riserviamo il diritto di sospendere l'accesso al Servizio, in tutto o in parte, per manutenzione, aggiornamenti o per far fronte a problemi di sicurezza. Il supporto tecnico è fornito in base al piano di Abbonamento.</p>

<h2>10. Account Utente</h2>
<p>Per accedere al Servizio è necessario creare un account. L'utente è responsabile di:</p>
<ul>
  <li>Fornire informazioni accurate, aggiornate e complete;</li>
  <li>Mantenere la riservatezza della propria password e dell'account;</li>
  <li>Tutte le attività che si svolgono sotto il proprio account;</li>
  <li>Notificarci immediatamente di qualsiasi uso non autorizzato dell'account.</li>
</ul>
<p>Ci riserviamo il diritto di sospendere o chiudere l'account dell'utente a nostra discrezione qualora riteniamo che abbia violato i presenti Termini o che l'account rappresenti un rischio per il Servizio o per altri utenti.</p>

<h2>11. Uso Lecito</h2>
<p>L'utente si impegna a utilizzare il Servizio esclusivamente per scopi leciti e in conformità ai presenti Termini. È vietato, tra l'altro:</p>
<ul>
  <li>Utilizzare il Servizio per scopi illegali o non autorizzati;</li>
  <li>Violare leggi o regolamenti applicabili;</li>
  <li>Violare i diritti di terzi, inclusi i diritti di proprietà intellettuale;</li>
  <li>Tentare di violare misure di sicurezza o autenticazione;</li>
  <li>Trasmettere virus, malware o codici dannosi;</li>
  <li>Interferire con o interrompere il Servizio;</li>
  <li>Raccogliere informazioni dal Servizio in modo non autorizzato.</li>
</ul>

<h2>12. Dati Utente</h2>
<p>L'utente mantiene tutti i diritti di proprietà sui propri Dati Utente. Caricando o fornendo Dati Utente al Servizio, concede a SplitPlan AI una licenza mondiale, non esclusiva, esente da royalty, per utilizzare, riprodurre, archiviare e distribuire tali dati esclusivamente nella misura necessaria per fornire il Servizio.</p>
<p>L'utente è l'unico responsabile dell'accuratezza, qualità, integrità, legalità e appropriatezza dei propri Dati Utente.</p>

<h2>13. Sicurezza dei Dati e Privacy</h2>
<p>Trattiamo i dati personali in conformità al Regolamento (UE) 2016/679 (GDPR). L'utente ha il diritto di accedere, rettificare, cancellare, limitare il trattamento e richiedere la portabilità dei propri dati. Per i dettagli, consultare la nostra Informativa sulla Privacy.</p>

<h2>14. Livello di Servizio</h2>
<p>Faremo ragionevoli sforzi commerciali per rendere il Servizio disponibile con un uptime di almeno il 99,9%, escludendo la manutenzione programmata.</p>

<h2>15. Proprietà Intellettuale</h2>
<p>Tutti i contenuti forniti da SplitPlan AI — inclusi il Servizio, il sito web, testi, grafiche, loghi, icone e software — sono di proprietà di SplitPlan AI o dei suoi fornitori di contenuti e sono protetti dalle leggi internazionali sul copyright e sui marchi registrati.</p>
<p>Concediamo all'utente una licenza limitata, non esclusiva, non trasferibile e revocabile per utilizzare il Servizio per i propri scopi aziendali interni o personali, in conformità ai presenti Termini.</p>

<h2>16. Feedback</h2>
<p>SplitPlan AI accoglie con favore feedback, commenti e suggerimenti ("Feedback"). L'utente concede a SplitPlan AI una licenza perpetua, irrevocabile, non esclusiva, esente da royalty per utilizzare il Feedback in qualsiasi modo, senza obbligo di attribuzione o compensazione.</p>

<h2>17. Integrazioni con Terze Parti</h2>
<p>Il Servizio può consentire l'accesso a siti web, app, contenuti e servizi di terze parti. Quando si utilizzano servizi di terze parti, si applicano i rispettivi termini e le rispettive informative sulla privacy. SplitPlan AI non è responsabile del comportamento, delle funzionalità o dei contenuti di tali servizi.</p>

<h2>18. Esclusione di Garanzie</h2>
<p>NELLA MISURA MASSIMA CONSENTITA DALLA LEGGE APPLICABILE, IL SERVIZIO È FORNITO "COSÌ COM'È" E "COME DISPONIBILE", SENZA GARANZIE DI ALCUN TIPO, ESPRESSE O IMPLICITE. SPLITPLAN AI NON GARANTISCE CHE IL SERVIZIO SARÀ ININTERROTTO, PRIVO DI ERRORI O SICURO.</p>

<h2>19. Limitazione di Responsabilità</h2>
<p>Nulla nei presenti Termini limita la nostra responsabilità per frode, morte o lesioni personali causate dalla nostra negligenza, o per qualsiasi altra responsabilità che non può essere esclusa o limitata dalla legge applicabile. Fatta salva tale eccezione, la nostra responsabilità aggregata massima per qualsiasi singolo evento non supererà l'importo pagato dall'utente a SplitPlan AI nei 12 mesi precedenti.</p>

<h2>20. Manleva</h2>
<p>L'utente si impegna a tenere indenne SplitPlan AI, i suoi dirigenti, dipendenti e agenti da qualsiasi reclamo, responsabilità, danno, perdita, costo o spesa derivante dalla violazione dei presenti Termini, dai Dati Utente o dall'uso del Servizio.</p>

<h2>21. Legge Applicabile</h2>
<p>I presenti Termini sono disciplinati e interpretati in conformità alla legge italiana e alla normativa dell'Unione Europea applicabile. Ciò non pregiudica i diritti dell'utente in qualità di consumatore ai sensi della legge del proprio paese di residenza.</p>

<h2>22. Risoluzione delle Controversie</h2>
<p>In caso di controversia, le parti tenteranno di risolverla amichevolmente. L'utente ha il diritto di adire i tribunali del proprio paese di residenza o di utilizzare la piattaforma ODR (Online Dispute Resolution) della Commissione Europea.</p>

<h2>23. Accordo Integrale</h2>
<p>I presenti Termini, comprensivi della nostra Informativa sulla Privacy e di qualsiasi altro accordo ivi citato, costituiscono l'intero accordo tra l'utente e SplitPlan AI in merito all'uso del Servizio e sostituiscono qualsiasi accordo precedente tra le parti.</p>

<h2>24. Rinuncia e Divisibilità</h2>
<p>Il mancato esercizio da parte di SplitPlan AI di un diritto o disposizione dei presenti Termini non costituirà una rinuncia a tale diritto o disposizione. Se una disposizione dei presenti Termini è ritenuta non valida o inapplicabile, le disposizioni rimanenti rimarranno pienamente in vigore.</p>

<h2>25. Cessione</h2>
<p>I presenti Termini e i relativi diritti e licenze non possono essere trasferiti o ceduti dall'utente senza il previo consenso scritto di SplitPlan AI, ma possono essere ceduti da SplitPlan AI senza restrizioni.</p>

<h2>26. Recesso e Risoluzione</h2>
<p>Ci riserviamo il diritto di sospendere o risolvere l'accesso al Servizio a nostra esclusiva discrezione, con o senza preavviso, per comportamenti che riteniamo in violazione dei presenti Termini o dannosi per altri utenti o per il Servizio. In caso di risoluzione:</p>
<ul>
  <li>La licenza di utilizzo del Servizio cesserà immediatamente;</li>
  <li>L'utente perderà l'accesso ai Dati Utente archiviati nel Servizio, salvo diversa disposizione del piano di Abbonamento;</li>
  <li>SplitPlan AI potrà, ma non è obbligata a, eliminare i Dati Utente dopo un determinato periodo.</li>
</ul>
<p>Per richiedere la chiusura dell'account, contattare <a href="mailto:splitplan.ai@gmail.com">splitplan.ai@gmail.com</a>.</p>

<h2>27. Sopravvivenza</h2>
<p>Tutte le disposizioni dei presenti Termini che per loro natura devono sopravvivere alla risoluzione sopravvivranno alla stessa, incluse, a titolo esemplificativo, le disposizioni sulla proprietà, le esclusioni di garanzia, la manleva e le limitazioni di responsabilità.</p>

<h2>28. Forza Maggiore</h2>
<p>SplitPlan AI non sarà responsabile per ritardi o inadempimenti derivanti da cause al di fuori del suo ragionevole controllo, inclusi, a titolo esemplificativo, atti di forza maggiore, guerre, terrorismo, calamità naturali, epidemie o pandemie.</p>

<h2>29. Nessun Beneficiario Terzo</h2>
<p>I presenti Termini non conferiscono diritti di beneficiario a terze parti.</p>

<h2>30. Informazioni di Contatto</h2>
<p>Per qualsiasi domanda relativa ai presenti Termini, contattare: <a href="mailto:splitplan.ai@gmail.com">splitplan.ai@gmail.com</a>.</p>

<h2>31. Contenuti Generati dall'Intelligenza Artificiale — Limitazione di Responsabilità</h2>
<p>SplitPlan AI utilizza sistemi di intelligenza artificiale, tra cui Google Gemini 2.5 Flash, per generare itinerari, stime di budget, suggerimenti di viaggio e altri contenuti ("Contenuti AI"). Utilizzando il Servizio, l'utente riconosce e accetta quanto segue:</p>
<ul>
  <li><strong>Nessuna garanzia di accuratezza.</strong> I Contenuti AI sono generati automaticamente e possono contenere errori, omissioni o informazioni non aggiornate. SplitPlan AI non rilascia alcuna dichiarazione o garanzia, espressa o implicita, riguardo all'accuratezza, completezza, affidabilità o idoneità di qualsiasi Contenuto AI.</li>
  <li><strong>Suggerimenti indicativi, non impegni contrattuali.</strong> Le stime di budget, i costi previsionali e gli itinerari di viaggio prodotti dall'AI sono suggerimenti indicativi basati su modelli statistici e dati pubblicamente disponibili. Non costituiscono una garanzia contrattuale, un'offerta vincolante né una promessa di prezzi o disponibilità specifici.</li>
  <li><strong>Responsabilità dell'utente.</strong> L'utente è il solo responsabile di verificare in modo indipendente qualsiasi Contenuto AI prima di farvi affidamento per prenotazioni di viaggio, decisioni finanziarie o qualsiasi altro scopo. SplitPlan AI non sarà responsabile per perdite, danni o spese derivanti dall'affidamento dell'utente sui Contenuti AI.</li>
  <li><strong>Massimale di responsabilità per Contenuti AI.</strong> Nella misura massima consentita dalla legge applicabile, la responsabilità di SplitPlan AI derivante o connessa ai Contenuti AI non supererà EUR 50,00 o l'importo pagato dall'utente nei tre mesi precedenti il reclamo, a seconda di quale sia maggiore.</li>
</ul>

<h2>32. Account Aziendali (B2B) — Responsabilità del Manager e Governance Aziendale</h2>
<p>La presente sezione si applica alle aziende, organizzazioni e a qualsiasi entità che crei o gestisca un Account Aziendale ("Account B2B") per conto di dipendenti o membri del team ("Utenti Gestiti").</p>
<ul>
  <li><strong>Amministratore Autorizzato.</strong> Il soggetto che crea o gestisce un Account B2B ("Manager") dichiara e garantisce di essere debitamente autorizzato a vincolare l'organizzazione ai presenti Termini e alla nostra Informativa sulla Privacy.</li>
  <li><strong>Responsabilità del Manager.</strong> Il Manager è responsabile di: (i) garantire che tutti gli Utenti Gestiti siano informati dei presenti Termini e dell'Informativa sulla Privacy; (ii) configurare correttamente le policy di spesa, i limiti di budget e i permessi di accesso; (iii) monitorare e approvare le richieste di trasferta e le note spese degli Utenti Gestiti; (iv) revocare tempestivamente l'accesso agli Utenti Gestiti che lasciano l'organizzazione o non sono più autorizzati.</li>
  <li><strong>Responsabilità solidale per gli Utenti Gestiti.</strong> L'organizzazione risponde in solido con i propri Utenti Gestiti per qualsiasi violazione dei presenti Termini. SplitPlan AI si riserva il diritto di sospendere o risolvere qualsiasi Account B2B in caso di violazione da parte di un Utente Gestito, senza pregiudizio per qualsiasi altro rimedio disponibile.</li>
  <li><strong>Accuratezza dei dati aziendali.</strong> Il Manager è il solo responsabile dell'accuratezza dei dati aziendali inseriti nella piattaforma (partita IVA, indirizzo di fatturazione, limiti di spesa). SplitPlan AI non sarà responsabile per note spese errate o inadempienze di conformità derivanti da configurazioni non corrette.</li>
  <li><strong>Report esportati.</strong> La "Nota Spese Ufficiale" in formato PDF e qualsiasi altro documento finanziario esportato sono generati dai dati inseriti dagli utenti. SplitPlan AI non certifica l'accuratezza di tali documenti a fini fiscali, legali o contabili. L'organizzazione è responsabile della verifica di tutti i documenti esportati prima della loro presentazione a qualsiasi autorità competente.</li>
</ul>

<h2>Conformità Normativa — GDPR</h2>

<h3>Raccolta dei Dati ai sensi del GDPR</h3>
<p>In conformità al Regolamento Generale sulla Protezione dei Dati (GDPR), raccogliamo e trattiamo i dati personali solo quando disponiamo di una base giuridica per farlo. Tale base include il trattamento basato sul consenso, l'esecuzione di un contratto, un obbligo legale, la tutela di interessi vitali, l'esecuzione di un compito di interesse pubblico o i nostri legittimi interessi, a condizione che non prevalgano sui diritti fondamentali dell'interessato.</p>

<h3>Trattamento dei Dati ai sensi del GDPR</h3>
<p>Trattiamo i dati personali in conformità ai principi del GDPR: liceità, correttezza e trasparenza; limitazione della finalità; minimizzazione dei dati; esattezza; limitazione della conservazione; integrità e riservatezza.</p>

<h3>Diritti dell'Interessato ai sensi del GDPR</h3>
<p>Agli utenti residenti nello Spazio Economico Europeo (SEE) sono riconosciuti i seguenti diritti:</p>
<ul>
  <li><strong>Diritto di accesso</strong>: richiedere una copia dei dati personali detenuti;</li>
  <li><strong>Diritto di rettifica</strong>: richiedere la correzione di dati inesatti o incompleti;</li>
  <li><strong>Diritto alla cancellazione ("diritto all'oblio")</strong>: richiedere la cancellazione dei dati personali in determinate circostanze;</li>
  <li><strong>Diritto di limitazione del trattamento</strong>: richiedere la limitazione del trattamento in determinate circostanze;</li>
  <li><strong>Diritto alla portabilità dei dati</strong>: ricevere i propri dati in formato strutturato, di uso comune e leggibile da dispositivo automatico;</li>
  <li><strong>Diritto di opposizione</strong>: opporsi al trattamento dei dati personali in determinate circostanze;</li>
  <li><strong>Diritti relativi alle decisioni automatizzate</strong>: richiedere l'intervento umano nelle decisioni automatizzate che incidono significativamente sull'interessato.</li>
</ul>
<p>Per esercitare tali diritti, contattare <a href="mailto:splitplan.ai@gmail.com">splitplan.ai@gmail.com</a>. Risponderemo entro 30 giorni.</p>

<h3>Trasferimenti Internazionali di Dati</h3>
<p>In caso di trasferimento di dati personali al di fuori del SEE, adotteremo adeguate salvaguardie, quali Clausole Contrattuali Standard approvate dalla Commissione Europea.</p>

<h2>Foro Competente</h2>
<p>Per qualsiasi controversia relativa all'interpretazione, all'esecuzione o alla risoluzione dei presenti Termini, le parti si impegnano in via preliminare a tentare una risoluzione amichevole. Qualora tale tentativo non abbia esito positivo, il <strong>Foro competente è quello di Bologna</strong>, Italia, con esclusione di qualsiasi altro foro, salvo diversa disposizione inderogabile di legge a tutela del consumatore.</p>
<p>La presente clausola non pregiudica il diritto dell'utente consumatore di adire i tribunali del proprio paese di residenza ai sensi della normativa europea applicabile.</p>

<p><em>Ultimo aggiornamento: 2026-04-04</em></p>
` }} />
        </div>
    );
};

export default TermsIt;
