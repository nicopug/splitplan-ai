import React, { useState, useEffect } from 'react';
import { createTrip } from '../api';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';

const Hero = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { showPrompt } = useModal();
    const [user, setUser] = useState(null);
    const [showTypeSelection, setShowTypeSelection] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handleIniziaOra = () => {
        if (user) {
            setShowTypeSelection(true);
        } else {
            navigate('/auth');
        }
    };

    const handleCreateTrip = async (type) => {
        setShowTypeSelection(false);

        const title = type === 'SOLO' ? "Nuova Avventura Solitaria" : "Nuovo Viaggio di Gruppo";
        const message = type === 'SOLO' ? "Come vuoi chiamare la tua avventura?" : "Che nome diamo a questo viaggio?";
        const placeholder = type === 'SOLO' ? "Es: Il mio cammino" : "Es: Estate 2024 Corfù";

        const tripName = await showPrompt(title, message, placeholder);
        if (!tripName) return;

        setLoading(true);
        try {
            const data = await createTrip({
                name: tripName,
                trip_type: type
            });
            showToast("Viaggio creato con successo! ✈️", "success");
            navigate(`/trip/${data.trip_id}`);
        } catch (error) {
            showToast("Errore: " + error.message, "error");
        } finally {
            setLoading(false);
        }
    };



    return (
        <header className="section pt-8 pb-12 md:pt-12 md:pb-24 relative overflow-hidden">
            <div className="container">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

                    {/* Content - Ordine mobile: 2, Desktop: 1 */}
                    <div className="space-y-4 md:space-y-6 text-center lg:text-left order-2 lg:order-1">
                        <span className="inline-block text-xs sm:text-sm uppercase tracking-widest text-accent-orange font-bold">
                            Il Futuro dei Viaggi è Qui
                        </span>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                            L'Agente di Viaggio AI <br className="hidden sm:block" />
                            <span className="text-accent-green">All-in-One</span>
                        </h1>

                        <p className="text-base sm:text-lg lg:text-xl text-text-muted max-w-xl mx-auto lg:mx-0">
                            Dimentica le chat infinite e i file Excel. SplitPlan è il tuo Agente, Mediatore e CFO personale.
                            Organizza viaggi perfetti senza stress.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                            <button
                                className="btn btn-primary w-full sm:w-auto px-8 md:px-10"
                                onClick={handleIniziaOra}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner"></span>
                                        Caricamento...
                                    </>
                                ) : (
                                    'Inizia Ora'
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Visual - Ordine mobile: 1, Desktop: 2 */}
                    <div className="relative order-1 lg:order-2">
                        <div className="bg-white rounded-2xl md:rounded-3xl p-3 md:p-4 shadow-lg transform -rotate-2 hover:rotate-0 transition-transform duration-300 border border-gray-100 overflow-hidden">
                            <img
                                src="/app-preview.png"
                                alt="SplitPlan Dashboard Preview"
                                className="w-full h-auto rounded-xl md:rounded-2xl"
                                loading="lazy"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Type Selection Modal - Responsive */}
            {showTypeSelection && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl animate-slideUp">

                        <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8 text-primary-blue">
                            Come viaggi oggi?
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                            {/* Group Trip */}
                            <button
                                onClick={() => handleCreateTrip('GROUP')}
                                className="group relative p-6 md:p-8 rounded-xl md:rounded-2xl border-2 border-primary-blue 
                                         hover:bg-primary-blue transition-all duration-300 text-center
                                         transform hover:scale-105 active:scale-95"
                            >
                                <div className="text-5xl md:text-6xl mb-4 transform group-hover:scale-110 transition-transform">
                                    👯‍♀️
                                </div>
                                <h3 className="text-lg md:text-xl font-bold mb-2 text-primary-blue group-hover:text-white transition-colors">
                                    In Gruppo
                                </h3>
                                <p className="text-sm text-gray-600 group-hover:text-white group-hover:text-opacity-90 transition-colors">
                                    Risolvi i conflitti e dividi le spese.
                                </p>
                            </button>

                            {/* Solo Trip */}
                            <button
                                onClick={() => handleCreateTrip('SOLO')}
                                className="group relative p-6 md:p-8 rounded-xl md:rounded-2xl border-2 border-accent-orange 
                                         hover:bg-accent-orange transition-all duration-300 text-center
                                         transform hover:scale-105 active:scale-95"
                            >
                                <div className="text-5xl md:text-6xl mb-4 transform group-hover:scale-110 transition-transform">
                                    🎒
                                </div>
                                <h3 className="text-lg md:text-xl font-bold mb-2 text-accent-orange group-hover:text-white transition-colors">
                                    Da Solo
                                </h3>
                                <p className="text-sm text-gray-600 group-hover:text-white group-hover:text-opacity-90 transition-colors">
                                    Ritmo tuo, zero compromessi.
                                </p>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowTypeSelection(false)}
                            className="w-full mt-6 py-3 text-gray-600 hover:text-gray-900 
                                     transition-colors rounded-lg hover:bg-gray-50"
                        >
                            Annulla
                        </button>
                    </div>
                </div>
            )}

            {/* Inline Animations */}
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }
                
                .animate-slideUp {
                    animation: slideUp 0.3s ease-out;
                }
            `}</style>
        </header>
    );
};

export default Hero;