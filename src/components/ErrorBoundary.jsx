import React from 'react';

// Chiave in sessionStorage: garantisce che il ricaricamento automatico avvenga
// UNA sola volta. Senza, un errore che si ripresenta anche dopo il reload
// manderebbe la pagina in un ciclo infinito di ricaricamenti.
const CHIAVE_RICARICA = 'splitplan_reload_chunk';

/**
 * Riconosce gli errori dovuti a un deploy avvenuto mentre la pagina era aperta.
 *
 * I nomi dei file generati da Vite contengono un hash del contenuto. Dopo un
 * deploy i vecchi file non esistono piu': il browser, che ha ancora in memoria
 * la versione precedente dell'app, prova a caricare un chunk con l'hash vecchio,
 * il server risponde con la fallback SPA (index.html, quindi text/html) e il
 * caricamento del modulo fallisce. Sintomi tipici:
 *   "Failed to fetch dynamically imported module"
 *   "Expected a JavaScript-or-Wasm module script but the server responded
 *    with a MIME type of text/html"
 */
const isErroreDiChunk = (error) => {
    const messaggio = `${error?.message || ''} ${error?.name || ''}`;
    return /dynamically imported module|Importing a module script failed|Failed to load module script|ChunkLoadError|MIME type/i.test(
        messaggio
    );
};

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, ricaricoInCorso: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);

        // L'app in esecuzione e' di una versione precedente a quella pubblicata:
        // l'unica cosa che serve e' riprendere i file aggiornati. Ricaricare a
        // mano funzionava, ma l'utente si trovava davanti una schermata di
        // errore generica senza sapere cosa fare, e il pulsante "Riprova"
        // ritentava lo stesso import fallito restituendo di nuovo l'errore.
        if (isErroreDiChunk(error) && !sessionStorage.getItem(CHIAVE_RICARICA)) {
            sessionStorage.setItem(CHIAVE_RICARICA, '1');
            this.setState({ ricaricoInCorso: true });
            window.location.reload();
        }
    }

    componentDidMount() {
        // Arrivati qui senza errori, la versione caricata e' buona: si azzera la
        // guardia, cosi' il prossimo deploy potra' di nuovo ricaricare una volta.
        sessionStorage.removeItem(CHIAVE_RICARICA);
    }

    render() {
        if (this.state.ricaricoInCorso) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-base)] gap-4">
                    <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-[var(--text-muted)]">Aggiornamento all'ultima versione…</p>
                </div>
            );
        }

        if (this.state.hasError) {
            const erroreDiVersione = isErroreDiChunk(this.state.error);

            return (
                <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-4">
                    <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm shadow-2xl p-8 text-center">
                        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 mb-2">
                            {erroreDiVersione ? 'Versione non aggiornata' : 'Errore Imprevisto'}
                        </p>
                        <h1 className="text-xl font-black uppercase tracking-tight text-[var(--text-primary)] mb-3">
                            {erroreDiVersione ? 'Serve un aggiornamento' : 'Qualcosa è andato storto'}
                        </h1>
                        <p className="text-sm text-[var(--text-muted)] mb-8">
                            {erroreDiVersione
                                ? "È stata pubblicata una nuova versione mentre la pagina era aperta. Ricarica per continuare."
                                : "Si è verificato un errore imprevisto. Puoi ricaricare la pagina o tornare alla home."}
                        </p>
                        <div className="flex flex-col gap-2">
                            {/* Su un errore di versione "Riprova" ritenterebbe lo stesso
                                import fallito: l'unica azione utile e' ricaricare. */}
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-sm bg-[var(--accent-primary)] text-[var(--bg-base)] hover:opacity-90 transition-all"
                            >
                                Ricarica la pagina
                            </button>
                            {!erroreDiVersione && (
                                <button
                                    onClick={() => this.setState({ hasError: false, error: null })}
                                    className="w-full px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-sm border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-all"
                                >
                                    Riprova
                                </button>
                            )}
                            <button
                                onClick={() => window.location.href = '/'}
                                className="w-full px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-all"
                            >
                                Torna alla Home
                            </button>
                        </div>
                        {import.meta.env.DEV && (
                            <div className="mt-8 p-4 bg-[var(--bg-surface)] border border-red-500/20 rounded-sm text-left overflow-auto max-h-40">
                                <p className="text-[10px] font-mono text-red-500 whitespace-pre-wrap">
                                    {this.state.error && this.state.error.toString()}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
