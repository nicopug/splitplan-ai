import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ApiErrorBanner = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleError = () => setVisible(true);
        const handleRecovered = () => setVisible(false);

        window.addEventListener('splitplan:network-error', handleError);
        window.addEventListener('splitplan:api-recovered', handleRecovered);
        return () => {
            window.removeEventListener('splitplan:network-error', handleError);
            window.removeEventListener('splitplan:api-recovered', handleRecovered);
        };
    }, []);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ y: -48, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -48, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="fixed top-0 left-0 right-0 z-[9999] bg-red-500 text-white px-4 py-3 flex items-center justify-between gap-4 shadow-lg"
                >
                    <div className="flex items-center gap-3">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                        <p className="text-[11px] font-black uppercase tracking-widest">
                            Server non raggiungibile — verifica la tua connessione
                        </p>
                    </div>
                    <button
                        onClick={() => setVisible(false)}
                        className="shrink-0 text-white/70 hover:text-white transition-colors text-lg leading-none"
                        aria-label="Chiudi"
                    >
                        ×
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ApiErrorBanner;
