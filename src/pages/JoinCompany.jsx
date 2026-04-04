import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinCompany } from '../api';
import { useToast } from '../context/ToastContext';
import { motion } from 'framer-motion';
import { Building2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const JoinCompany = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const [joined, setJoined] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('token');
        setToken(t || null);
    }, []);

    const handleJoin = async () => {
        setLoading(true);
        try {
            const data = await joinCompany(token);
            setJoined(true);
            showToast(data.message || 'Benvenuto!', 'success');
            setTimeout(() => navigate('/my-trips'), 2000);
        } catch (err) {
            showToast(err.message || 'Token non valido o scaduto.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Token assente
    if (token === null) {
        return (
            <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center px-4 pt-[var(--header-height)]">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-8 text-center"
                >
                    <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
                        <AlertCircle className="w-7 h-7 text-red-500" />
                    </div>
                    <h1 className="text-xl font-black uppercase tracking-tight mb-2">Link Non Valido</h1>
                    <p className="text-sm text-[var(--text-muted)] mb-6">
                        Questo link di invito non è valido. Chiedi al tuo manager di generarne uno nuovo.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        Torna alla Home
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center px-4 pt-[var(--header-height)]">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-8 text-center"
            >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 ${joined ? 'bg-emerald-500/10' : 'bg-[var(--accent-primary)]/10'}`}>
                    {joined
                        ? <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                        : <Building2 className="w-7 h-7 text-[var(--accent-primary)]" />
                    }
                </div>

                {joined ? (
                    <>
                        <h1 className="text-xl font-black uppercase tracking-tight mb-2">Benvenuto nel Team!</h1>
                        <p className="text-sm text-[var(--text-muted)]">Stai per essere reindirizzato ai tuoi viaggi...</p>
                    </>
                ) : (
                    <>
                        <span className="text-[10px] font-black tracking-[0.25em] uppercase text-[var(--text-subtle)] block mb-2">Invito Aziendale</span>
                        <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Unisciti all'Azienda</h1>
                        <p className="text-sm text-[var(--text-muted)] mb-8">
                            Hai ricevuto un invito per entrare nel team aziendale su SplitPlan.
                            Clicca il pulsante per accettare.
                        </p>
                        <button
                            onClick={handleJoin}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[var(--accent-primary)] text-[var(--bg-base)] text-[10px] font-black uppercase tracking-widest rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                            {loading ? 'Elaborazione...' : 'Unisciti all\'Azienda'}
                        </button>
                        <p className="text-[10px] text-[var(--text-subtle)] mt-4">
                            Devi essere loggato per accettare l'invito.
                        </p>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default JoinCompany;
