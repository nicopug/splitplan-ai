import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
    const [user, setUser] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showCreditsShop, setShowCreditsShop] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // Chiudi menu quando cambia pagina
    useEffect(() => {
        setMobileMenuOpen(false);
        setShowUserMenu(false);
    }, [location.pathname]);

    // Click away to close user menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showUserMenu && !event.target.closest('.user-menu-container')) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showUserMenu]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/');
        setMobileMenuOpen(false);
    };

    return (
        <nav className="sticky top-0 z-50 bg-bg-creme border-b border-gray-200 dark:border-white/10 backdrop-blur-sm bg-opacity-95">
            <div className="container">
                <div className="flex items-center justify-between h-20 md:h-24">

                    {/* Logo & Navigation Links */}
                    <div className="flex items-center gap-8">
                        <Link to="/" className="flex items-center gap-2.5 group">
                            <div className="w-10 h-10 md:w-11 md:h-11 bg-primary-blue rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                <svg className="w-6 h-6 md:w-6.5 md:h-6.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 2 9 18zm0 0v-8" />
                                </svg>
                            </div>
                            <span className="text-xl md:text-2xl font-black tracking-tight flex items-center" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                <span className="bg-gradient-to-r from-primary-blue to-blue-400 bg-clip-text text-transparent">Split</span>
                                <span
                                    className="dark:text-white"
                                    style={{ color: theme === 'dark' ? '#ffffff' : '#0f172a' }}
                                >
                                    Plan
                                </span>
                                <span className="text-primary-blue ml-0.5">.</span>
                            </span>
                        </Link>

                        {/* Desktop Links - Reduced size and moved here */}
                        <div className="hidden lg:flex items-center gap-6">
                            {location.pathname === '/' && (
                                <>
                                    <a
                                        href="#how-it-works"
                                        className="text-[0.65rem] uppercase tracking-wider font-bold text-text-main opacity-60 hover:opacity-100 hover:text-primary-blue transition-all"
                                    >
                                        Come Funziona
                                    </a>
                                    <a
                                        href="#features"
                                        className="text-[0.65rem] uppercase tracking-wider font-bold text-text-main opacity-60 hover:opacity-100 hover:text-primary-blue transition-all"
                                    >
                                        Funzionalità
                                    </a>
                                    <a
                                        href="#pricing"
                                        className="text-[0.65rem] uppercase tracking-wider font-bold text-text-main opacity-60 hover:opacity-100 hover:text-primary-blue transition-all"
                                    >
                                        Prezzi
                                    </a>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Theme & User */}
                    <div className="hidden md:flex items-center gap-6">
                        {user ? (
                            <div className="flex items-center gap-4 user-menu-container relative">
                                <div className="flex items-center gap-3">
                                    {/* Credit Counter - Only for non-premium users */}
                                    {!user.is_subscribed && (
                                        <button
                                            onClick={() => setShowCreditsShop(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-xl transition-all duration-200 group"
                                            title="Negozio Crediti"
                                        >
                                            <span className="text-base group-hover:scale-125 transition-transform duration-300">🪙</span>
                                            <span className="text-xs font-bold text-yellow-700">
                                                {user.credits || 0} <span className="hidden sm:inline">Crediti</span>
                                            </span>
                                        </button>
                                    )}

                                    {/* Moved Theme Switcher here */}
                                    <button
                                        onClick={toggleTheme}
                                        className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-lg"
                                        title="Cambia Tema"
                                    >
                                        {theme === 'dark' ? '☀️' : '🌙'}
                                    </button>

                                    {/* Interactive User Button */}
                                    <button
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-all duration-200"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary-blue text-white flex items-center justify-center font-bold text-sm">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-semibold text-text-main text-sm flex items-center gap-2">
                                            {user.name}
                                            {user.is_subscribed && <span className="text-lg">💎</span>}
                                        </span>
                                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Dropdown Menu (Epic Games Style) */}
                                {showUserMenu && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-[#1a1a1a] rounded-xl shadow-2xl border border-white/10 overflow-hidden z-[100] animate-slideDownFast">
                                        <div className="p-3 border-b border-white/5">
                                            <div className="text-[0.65rem] uppercase tracking-wider font-bold text-gray-500 mb-2 px-3">Account</div>
                                            <Link
                                                to="/my-trips"
                                                className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                                </svg>
                                                I miei Viaggi
                                            </Link>
                                            <Link
                                                to="/market"
                                                className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                                </svg>
                                                Negozio
                                            </Link>
                                        </div>
                                        <div className="p-2">
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                </svg>
                                                Esci
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={toggleTheme}
                                    className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-lg"
                                    title="Cambia Tema"
                                >
                                    {theme === 'dark' ? '☀️' : '🌙'}
                                </button>
                                <Link to="/auth" className="btn btn-primary px-6 py-2.5 text-sm font-bold">
                                    Accedi
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label="Toggle menu"
                    >
                        <svg
                            className="w-6 h-6 text-text-main"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            {mobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu Dropdown */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-gray-200 py-4 animate-slideDown">
                        <div className="flex flex-col gap-4">
                            <button
                                onClick={toggleTheme}
                                className="px-4 py-2 text-left font-medium text-text-main hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                            >
                                {theme === 'dark' ? '☀️ Modalità Chiara' : '🌙 Modalità Scura'}
                            </button>

                            {location.pathname === '/' && (
                                <>
                                    <a
                                        href="#how-it-works"
                                        className="px-4 py-2 font-medium text-text-main hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Come Funziona
                                    </a>
                                    <a
                                        href="#features"
                                        className="px-4 py-2 font-medium text-text-main hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Funzionalità
                                    </a>
                                    <a
                                        href="#pricing"
                                        className="px-4 py-2 font-medium text-text-main hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Prezzi
                                    </a>
                                    <div className="border-t border-gray-200 my-2"></div>
                                </>
                            )}

                            {user ? (
                                <>
                                    <div className="px-4 py-2">
                                        <span className="font-semibold text-text-main flex items-center gap-2">
                                            Ciao, {user.name}
                                            {user.is_subscribed && <span className="text-xl">💎</span>}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="mx-4 btn-secondary px-4 py-2 text-sm rounded-lg text-center"
                                    >
                                        Esci
                                    </button>
                                </>
                            ) : (
                                <Link
                                    to="/auth"
                                    className="mx-4 btn btn-primary px-6 py-2.5 text-center"
                                >
                                    Accedi
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Credits Shop Modal */}
            {showCreditsShop && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div
                        className="bg-white dark:bg-[#1a1a1a] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-white/10 animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 md:p-8">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-text-main dark:text-white">Negozio Crediti 🪙</h2>
                                    <p className="text-sm text-gray-500">Sblocca viaggi Premium o funzioni AI</p>
                                </div>
                                <button
                                    onClick={() => setShowCreditsShop(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                                >
                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="grid gap-4">
                                {/* Pack 1 */}
                                <div className="p-4 rounded-2xl border-2 border-gray-100 dark:border-white/5 hover:border-primary-blue transition-all group flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="text-3xl">🪙</div>
                                        <div>
                                            <div className="font-bold text-text-main dark:text-white text-lg">1 Credito</div>
                                            <div className="text-xs text-gray-500">Sblocca 1 viaggio Premium</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            await import('../api').then(api => api.buyCredits(1));
                                            setUser(JSON.parse(localStorage.getItem('user')));
                                            setShowCreditsShop(false);
                                        }}
                                        className="btn btn-primary px-4 py-2 text-sm font-bold"
                                    >
                                        3,99€
                                    </button>
                                </div>

                                {/* Pack 3 */}
                                <div className="p-4 rounded-2xl border-2 border-primary-blue/30 bg-blue-50/10 hover:border-primary-blue transition-all group relative overflow-hidden flex items-center justify-between">
                                    <div className="absolute top-0 right-0 bg-primary-blue text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-tighter">I Più Scelti</div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-3xl">🪙🪙🪙</div>
                                        <div>
                                            <div className="font-bold text-text-main dark:text-white text-lg">3 Crediti</div>
                                            <div className="text-xs text-gray-500">Risparmia il 25%</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            await import('../api').then(api => api.buyCredits(3));
                                            setUser(JSON.parse(localStorage.getItem('user')));
                                            setShowCreditsShop(false);
                                        }}
                                        className="btn btn-primary px-4 py-2 text-sm font-bold"
                                    >
                                        8,99€
                                    </button>
                                </div>

                                {/* Subscription */}
                                <div className="p-4 rounded-2xl border-2 border-purple-500/30 bg-purple-50/10 hover:border-purple-500 transition-all group flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="text-3xl">💎</div>
                                        <div>
                                            <div className="font-bold text-text-main dark:text-white text-lg">Abbonamento Pro</div>
                                            <div className="text-xs text-gray-500">Viaggi illimitati ogni mese</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate('/#pricing')}
                                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-all"
                                    >
                                        4,99€/mese
                                    </button>
                                </div>
                            </div>

                            <p className="mt-6 text-center text-[10px] text-gray-400">
                                Transazioni sicure gestite da Stripe. I crediti non scadono mai.
                            </p>

                            <div className="mt-4 flex justify-center">
                                <button
                                    onClick={() => setShowCreditsShop(false)}
                                    className="text-sm font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors py-2 px-4"
                                >
                                    Annulla
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Inline Animation */}
            <style jsx>{`
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes slideDownFast {
                    from {
                        opacity: 0;
                        transform: translateY(-5px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-slideDown {
                    animation: slideDown 0.2s ease-out;
                }
                
                .animate-slideDownFast {
                    animation: slideDownFast 0.15s ease-out;
                }
            `}</style>
        </nav>
    );
};

export default Navbar;