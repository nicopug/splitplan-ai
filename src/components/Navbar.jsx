import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const Navbar = ({ user: propUser }) => {
    const [user, setUser] = useState(propUser);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showCreditsShop, setShowCreditsShop] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    const currentLanguage = i18n.language || 'it';

    const changeLanguage = async (lng) => {
        i18n.changeLanguage(lng);
        if (user) {
            try {
                const api = await import('../api');
                await api.updateLanguage(lng);
                console.log("Language updated in DB:", lng);

                // Aggiorna lo stato utente locale per riflettere il cambiamento se necessario
                const updatedUser = { ...user, language: lng };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
            } catch (err) {
                console.error("Failed to update language in DB:", err);
            }
        }
    };

    useEffect(() => {
        if (propUser) {
            setUser(propUser);
        } else {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        }
    }, [propUser]);

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
        <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
            <div className="container">
                <div className="flex items-center justify-between h-20 md:h-24">

                    {/* Logo & Navigation Links */}
                    <div className="flex items-center gap-8">
                        <Link to="/" className="flex items-center gap-2.5 group">
                            <div style={{
                                width: '40px', height: '40px',
                                background: 'linear-gradient(135deg, #8b5cf6, #22d3ee)',
                                borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 0 16px rgba(139,92,246,0.5)',
                                transition: 'all 0.3s'
                            }}
                                onMouseOver={e => { e.currentTarget.style.boxShadow = '0 0 30px rgba(139,92,246,0.8)'; e.currentTarget.style.transform = 'scale(1.1) rotate(3deg)'; }}
                                onMouseOut={e => { e.currentTarget.style.boxShadow = '0 0 16px rgba(139,92,246,0.5)'; e.currentTarget.style.transform = 'none'; }}
                            >
                                <svg style={{ width: '20px', height: '20px', color: '#fff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 2 9 18zm0 0v-8" />
                                </svg>
                            </div>
                            <span style={{ fontSize: '1.35rem', fontWeight: '900', letterSpacing: '-0.02em', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center' }}>
                                <span style={{ background: 'linear-gradient(135deg, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Split</span>
                                <span style={{ color: '#f0f0ff' }}>Plan</span>
                                <span style={{ background: 'linear-gradient(135deg, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginLeft: '1px' }}>.</span>
                            </span>
                        </Link>

                        {/* Desktop Links */}
                        <div className="hidden lg:flex items-center gap-6">
                            {location.pathname === '/' && (
                                <>
                                    {['#how-it-works', '#features', '#pricing'].map((href, i) => (
                                        <a key={href} href={href} style={{
                                            fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em',
                                            fontWeight: '700', color: '#4a4a6e', textDecoration: 'none',
                                            transition: 'color 0.2s'
                                        }}
                                            onMouseOver={e => e.currentTarget.style.color = '#a78bfa'}
                                            onMouseOut={e => e.currentTarget.style.color = '#4a4a6e'}
                                        >
                                            {[t('nav.howItWorks'), t('nav.features'), t('nav.pricing')][i]}
                                        </a>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Theme & User */}
                    <div className="hidden md:flex items-center gap-6">
                        {user ? (
                            <div className="flex items-center gap-4 user-menu-container relative">
                                <div className="flex items-center gap-3">
                                    {!user.is_subscribed && (
                                        <button
                                            onClick={() => setShowCreditsShop(true)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                padding: '5px 12px', border: '1px solid rgba(234,179,8,0.3)',
                                                borderRadius: '10px', background: 'rgba(234,179,8,0.08)',
                                                cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                            title="Negozio Crediti"
                                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(234,179,8,0.15)'; e.currentTarget.style.borderColor = 'rgba(234,179,8,0.5)'; }}
                                            onMouseOut={e => { e.currentTarget.style.background = 'rgba(234,179,8,0.08)'; e.currentTarget.style.borderColor = 'rgba(234,179,8,0.3)'; }}
                                        >
                                            <span style={{ fontSize: '14px' }}>🪙</span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#fbbf24' }}>
                                                {user.credits || 0} <span className="hidden sm:inline">{t('nav.credits')}</span>
                                            </span>
                                        </button>
                                    )}

                                    {/* Language Switcher */}
                                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
                                        {['it', 'en'].map(lng => (
                                            <button key={lng}
                                                onClick={() => changeLanguage(lng)}
                                                style={{
                                                    padding: '3px 10px', fontSize: '10px', fontWeight: '800',
                                                    borderRadius: '7px', border: 'none', cursor: 'pointer',
                                                    textTransform: 'uppercase', transition: 'all 0.2s',
                                                    background: currentLanguage.startsWith(lng) ? 'rgba(139,92,246,0.25)' : 'transparent',
                                                    color: currentLanguage.startsWith(lng) ? '#a78bfa' : '#4a4a6e',
                                                }}
                                            >
                                                {lng.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={toggleTheme}
                                        style={{ padding: '6px', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', opacity: 0.6, transition: 'opacity 0.2s' }}
                                        onMouseOver={e => e.currentTarget.style.opacity = '1'}
                                        onMouseOut={e => e.currentTarget.style.opacity = '0.6'}
                                        title="Cambia Tema"
                                    >
                                        {theme === 'dark' ? '☀️' : '🌙'}
                                    </button>

                                    <button
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '5px 10px', borderRadius: '10px', border: 'none',
                                            background: 'transparent', cursor: 'pointer', transition: 'background 0.2s'
                                        }}
                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(139,92,246,0.08)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #8b5cf6, #22d3ee)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: '700', fontSize: '13px', color: '#fff'
                                        }}>
                                            {user?.name?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <span style={{ fontWeight: '600', color: '#d0d0e8', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {user?.name || 'Utente'}
                                            {user?.is_subscribed && <span>💎</span>}
                                        </span>
                                        <svg style={{ width: '14px', height: '14px', color: '#4a4a6e', transition: 'transform 0.2s', transform: showUserMenu ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </div>

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
                                                {t('nav.myTrips')}
                                            </Link>
                                            <Link
                                                to="/market"
                                                className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                                </svg>
                                                {t('nav.market')}
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
                                                {t('nav.logout')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <button
                                    onClick={toggleTheme}
                                    style={{ padding: '6px', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', opacity: 0.6, transition: 'opacity 0.2s' }}
                                    onMouseOver={e => e.currentTarget.style.opacity = '1'}
                                    onMouseOut={e => e.currentTarget.style.opacity = '0.6'}
                                    title="Cambia Tema"
                                >
                                    {theme === 'dark' ? '☀️' : '🌙'}
                                </button>
                                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
                                    {['it', 'en'].map(lng => (
                                        <button key={lng}
                                            onClick={() => changeLanguage(lng)}
                                            style={{
                                                padding: '3px 10px', fontSize: '10px', fontWeight: '800',
                                                borderRadius: '7px', border: 'none', cursor: 'pointer',
                                                textTransform: 'uppercase', transition: 'all 0.2s',
                                                background: currentLanguage.startsWith(lng) ? 'rgba(139,92,246,0.25)' : 'transparent',
                                                color: currentLanguage.startsWith(lng) ? '#a78bfa' : '#4a4a6e',
                                            }}
                                        >
                                            {lng.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                                <Link to="/auth" className="btn btn-primary px-6 py-2.5 text-sm font-bold">
                                    {t('nav.login')}
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
                    <div className="md:hidden border-t border-white/10 py-4 animate-slideDown bg-[#1a1a1a] rounded-b-2xl shadow-2xl overflow-hidden mt-0">
                        <div className="flex flex-col gap-1 px-2">
                            {/* Theme Toggle in Mobile */}
                            <button
                                onClick={toggleTheme}
                                className="px-4 py-3 text-left font-bold text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center justify-between group"
                            >
                                <span className="flex items-center gap-3">
                                    <span className="text-xl group-hover:scale-110 transition-transform">{theme === 'dark' ? '☀️' : '🌙'}</span>
                                    {theme === 'dark' ? 'Modalità Chiara' : 'Modalità Scura'}
                                </span>
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-primary-blue' : 'bg-gray-600'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                </div>
                            </button>

                            <div className="h-px bg-white/5 my-2 mx-4"></div>

                            {location.pathname === '/' && (
                                <>
                                    <a
                                        href="#how-it-works"
                                        className="px-4 py-3 font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                                    >
                                        Come Funziona
                                    </a>
                                    <a
                                        href="#features"
                                        className="px-4 py-3 font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                                    >
                                        Funzionalità
                                    </a>
                                    <a
                                        href="#pricing"
                                        className="px-4 py-3 font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                                    >
                                        Prezzi
                                    </a>
                                    <div className="h-px bg-white/5 my-2 mx-4"></div>
                                </>
                            )}

                            {user ? (
                                <div className="space-y-1">
                                    <div className="px-4 py-3 mb-2">
                                        <div className="text-[0.65rem] uppercase tracking-wider font-bold text-gray-500 mb-1">Account</div>
                                        <div className="font-black text-white text-lg flex items-center gap-2">
                                            Ciao, {user?.name || 'Utente'}
                                            {user?.is_subscribed && <span className="text-xl">💎</span>}
                                        </div>
                                    </div>

                                    <Link
                                        to="/my-trips"
                                        className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                                    >
                                        <svg className="w-5 h-5 text-primary-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                        </svg>
                                        <span className="font-bold">I miei Viaggi</span>
                                    </Link>

                                    <Link
                                        to="/market"
                                        className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                                    >
                                        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                        </svg>
                                        <span className="font-bold">Negozio</span>
                                    </Link>

                                    <div className="h-px bg-white/5 my-3 mx-4"></div>

                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors text-left font-bold"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Esci
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    to="/auth"
                                    className="mx-4 my-2 btn btn-primary px-6 py-3.5 text-center font-black shadow-lg shadow-blue-500/20"
                                >
                                    Accedi Subito
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>

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
                                            await import('../api').then(api => api.createCheckout('credit_1'));
                                        }}
                                        className="btn btn-primary px-4 py-2 text-sm font-bold"
                                    >
                                        3,99€
                                    </button>
                                </div>

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
                                            await import('../api').then(api => api.createCheckout('credit_3'));
                                        }}
                                        className="btn btn-primary px-4 py-2 text-sm font-bold"
                                    >
                                        8,99€
                                    </button>
                                </div>

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