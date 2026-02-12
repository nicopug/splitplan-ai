import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { exchangeCalendarToken } from '../api';

const CalendarCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [status, setStatus] = useState('connecting'); // 'connecting', 'success', 'error'

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get('code');
            const state = searchParams.get('state');

            if (!code || !state) {
                console.error("Missing code or state in URL");
                setStatus('error');
                showToast("Errore: Dati mancanti nel callback di Google", "error");
                navigate('/');
                return;
            }

            try {
                // Lo stato è in formato tripId:userId
                const [tripId] = state.split(':');

                // Usiamo l'API per scambiare il codice
                await exchangeCalendarToken(code, state);

                setStatus('success');
                showToast("Account connesso correttamente! 📅", "success");

                // Redirect alla dashboard del viaggio
                if (tripId) {
                    navigate(`/trip/${tripId}`);
                } else {
                    navigate('/my-trips');
                }
            } catch (err) {
                console.error("Token exchange failed", err);
                setStatus('error');
                showToast("Errore durante il collegamento del calendario: " + err.message, "error");
                navigate('/');
            }
        };

        handleCallback();
    }, [searchParams, navigate, showToast]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-bg-light">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                <div className="mb-6">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {status === 'connecting' ? 'Collegamento in corso...' : 'Configurazione completata'}
                </h2>
                <p className="text-gray-600">
                    {status === 'connecting'
                        ? 'Stiamo scambiando le informazioni con Google per sincronizzare il tuo calendario.'
                        : 'Ti stiamo riportando al tuo viaggio...'}
                </p>

                <div className="mt-8 flex items-center justify-center gap-2 grayscale opacity-50">
                    <img src="/logo.png" alt="SplitPlan" className="h-6" />
                    <span className="text-gray-400">×</span>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google Calendar" className="h-6" />
                </div>
            </div>
        </div>
    );
};

export default CalendarCallback;
