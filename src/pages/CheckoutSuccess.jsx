import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyCheckoutSession } from '../api';
import { useToast } from '../context/ToastContext';
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

const CheckoutSuccess = ({ onUserUpdate }) => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('loading'); // loading, success, error
    const [data, setData] = useState(null);
    const navigate = useNavigate();
    const { showToast } = useToast();

    useEffect(() => {
        const sessionId = searchParams.get('session_id');
        if (!sessionId) {
            setStatus('error');
            return;
        }

        const verify = async () => {
            try {
                const result = await verifyCheckoutSession(sessionId);
                setData(result);
                if (onUserUpdate) {
                    onUserUpdate(result);
                }
                setStatus('success');
                showToast("Pagamento completato con successo! 🎉", "success");
            } catch (e) {
                console.error("Verify error:", e);
                setStatus('error');
                showToast("Errore nella verifica del pagamento", "error");
            }
        };

        // Piccolo delay per dare tempo al webhook
        setTimeout(verify, 1500);
    }, [searchParams]);

    return (
        <div className="min-h-screen pt-24 pb-12 bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center">
            <div className="max-w-md w-full mx-4">
                {status === 'loading' && (
                    <div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/5 rounded-[2.5rem] p-12 text-center animate-pulse">
                        <div className="w-20 h-20 bg-primary-blue/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Sparkles className="w-10 h-10 text-primary-blue animate-spin" />
                        </div>
                        <h2 className="text-2xl font-black text-text-main dark:text-white mb-2">
                            Verifica in corso...
                        </h2>
                        <p className="text-gray-500 font-medium">
                            Stiamo confermando il tuo pagamento
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/5 rounded-[2.5rem] p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-10 h-10 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-black text-text-main dark:text-white mb-2">
                            Pagamento Confermato! 🎉
                        </h2>
                        <p className="text-gray-500 font-medium mb-8">
                            {data?.product_type?.startsWith('credit')
                                ? `I tuoi crediti sono stati aggiornati.`
                                : `Il tuo abbonamento ${data?.subscription_plan || ''} è ora attivo!`
                            }
                        </p>

                        {data?.credits !== undefined && (
                            <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-2xl mb-8 border border-gray-100 dark:border-white/5">
                                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Saldo Attuale</p>
                                <div className="text-4xl font-black text-primary-blue">🪙 {data.credits}</div>
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => navigate('/my-trips')}
                                className="w-full py-4 bg-primary-blue text-white rounded-2xl font-black transition-all duration-300 uppercase text-xs tracking-widest shadow-lg shadow-primary-blue/20 hover:shadow-xl flex items-center justify-center gap-2"
                            >
                                I Miei Viaggi <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => navigate('/market')}
                                className="w-full py-4 bg-gray-100 dark:bg-white/5 rounded-2xl font-black transition-all duration-300 uppercase text-xs tracking-widest hover:bg-gray-200 dark:hover:bg-white/10"
                            >
                                Torna al Market
                            </button>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/5 rounded-[2.5rem] p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">⚠️</span>
                        </div>
                        <h2 className="text-2xl font-black text-text-main dark:text-white mb-2">
                            Qualcosa è andato storto
                        </h2>
                        <p className="text-gray-500 font-medium mb-8">
                            Non siamo riusciti a verificare il pagamento. Se l'addebito è stato effettuato, i crediti verranno aggiunti automaticamente.
                        </p>
                        <button
                            onClick={() => navigate('/market')}
                            className="w-full py-4 bg-primary-blue text-white rounded-2xl font-black transition-all duration-300 uppercase text-xs tracking-widest"
                        >
                            Torna al Market
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CheckoutSuccess;
