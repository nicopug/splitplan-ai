import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const Navbar = ({ user: propUser }) => {
    const [user, setUser] = useState(propUser);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showCreditsShop, setShowCreditsShop] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef(null);
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
            if (showNotifications && notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showUserMenu, showNotifications]);

    // Polling notifiche ogni 30s (solo se loggato)
    useEffect(() => {
        if (!user) return;
        const fetchCount = async () => {
            try {
                const api = await import('../api');
                const data = await api.getUnreadCount();
                setUnreadCount(data.count ?? 0);
            } catch (_) {}
        };
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [user]);

    const handleOpenNotifications = async () => {
        setShowNotifications(prev => !prev);
        if (!showNotifications) {
            try {
                const api = await import('../api');
                const data = await api.getNotifications();
                setNotifications(data.notifications ?? []);
            } catch (_) {}
        }
    };

    const handleMarkRead = async (id) => {
        try {
            const api = await import('../api');
            await api.markNotificationRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (_) {}
    };

    const handleMarkAllRead = async () => {
        try {
            const api = await import('../api');
            await api.markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (_) {}
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/');
        setMobileMenuOpen(false);
    };

    const handleDeleteAccount = async () => {
        const confirmed = window.confirm(
            "Sei sicuro di voler eliminare il tuo account? Tutti i tuoi dati verranno cancellati permanentemente. Questa azione non è reversibile."
        );
        if (!confirmed) return;

        const doubleConfirm = window.confirm(
            "Ultima conferma: vuoi davvero procedere con l'eliminazione definitiva del tuo account?"
        );
        if (!doubleConfirm) return;

        try {
            const api = await import('../api');
            await api.deleteAccount();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            toast.success("Account eliminato con successo.");
            navigate('/');
        } catch (err) {
            toast.error("Errore durante l'eliminazione: " + err.message);
        }
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-[100] bg-[var(--glass-bg)] backdrop-blur-md border-b border-[var(--glass-border)] h-[var(--header-height)] transition-colors duration-300">
            <div className="container h-full">
                <div className="flex items-center justify-between h-full relative">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <img 
                            src="/file.svg" 
                            alt="SplitPlan Logo" 
                            className={`w-14 h-14 transition-all duration-500 group-hover:rotate-12 ${theme === 'dark' ? 'invert' : ''}`}
                        />
                        <span className="text-[var(--text-primary)] text-lg font-semibold tracking-tight uppercase group-hover:opacity-70 transition-all">
                            SplitPlan
                        </span>
                    </Link>

                    {/* Desktop Links - Centered */}
                    <div className="hidden md:flex items-center gap-10 absolute left-1/2 -translate-x-1/2">
                        {location.pathname === '/' ? (
                            <>
                                {['how-it-works', 'features', 'pricing'].map((id) => (
                                    <a
                                        key={id}
                                        href={`#${id}`}
                                        className="text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] uppercase tracking-widest transition-colors duration-300"
                                    >
                                        {t(`nav.${id.replace(/-/g, '')}`, id.replace(/-/g, ' ').toUpperCase())}
                                    </a>
                                ))}
                            </>
                        ) : (
                            <Link to="/" className="text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] uppercase tracking-widest transition-colors">
                                {t('nav.home', 'HOME')}
                            </Link>
                        )}
                    </div>


                    {/* Right Side: User & CTA */}
                    <div className="hidden md:flex items-center gap-6">
                        {/* Language Toggle */}
                        <button
                            onClick={() => changeLanguage(currentLanguage.startsWith('it') ? 'en' : 'it')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border-medium)] hover:bg-[var(--accent-muted)] transition-all text-[var(--text-primary)] text-[11px] font-black tracking-widest uppercase"
                            aria-label="Switch language"
                        >
                            <span className={currentLanguage.startsWith('it') ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>IT</span>
                            <span className="text-[var(--text-muted)]">|</span>
                            <span className={currentLanguage.startsWith('en') ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>EN</span>
                        </button>

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-[var(--accent-muted)] transition-colors text-[var(--text-primary)]"
                            aria-label={theme === 'light' ? "Switch to dark theme" : "Switch to light theme"}
                        >
                            {theme === 'light' ? (
                                <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                            ) : (
                                <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            )}
                        </button>

                        {/* Notification Bell */}
                        {user && (
                            <div className="relative" ref={notifRef}>
                                <button
                                    onClick={handleOpenNotifications}
                                    className="relative p-2 rounded-full hover:bg-[var(--accent-muted)] transition-colors text-[var(--text-primary)]"
                                    aria-label="Notifiche"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {showNotifications && (
                                    <div className="absolute top-full right-0 mt-2 w-80 bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-sm shadow-2xl z-[110] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
                                            <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Notifiche</span>
                                            {unreadCount > 0 && (
                                                <button onClick={handleMarkAllRead} className="text-[10px] text-[var(--accent-primary)] hover:underline uppercase tracking-wider">
                                                    Segna tutte lette
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-72 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <p className="text-xs text-[var(--text-muted)] text-center py-6">Nessuna notifica</p>
                                            ) : (
                                                notifications.map(n => (
                                                    <div
                                                        key={n.id}
                                                        onClick={() => {
                                                            if (!n.is_read) handleMarkRead(n.id);
                                                            if (n.trip_id) {
                                                                setShowNotifications(false);
                                                                navigate(`/trip/${n.trip_id}`);
                                                            }
                                                        }}
                                                        className={`px-4 py-3 border-b border-[var(--border-subtle)] transition-colors ${n.trip_id ? 'cursor-pointer hover:bg-[var(--bg-card-hover)]' : 'cursor-default'} ${!n.is_read ? 'bg-[var(--accent-muted)]' : ''}`}
                                                    >
                                                        <p className={`text-xs font-semibold ${!n.is_read ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                                            {n.title}
                                                        </p>
                                                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">{n.message}</p>
                                                        {n.trip_id && (
                                                            <p className="text-[10px] text-[var(--accent-primary)] mt-1 font-bold uppercase tracking-wider">Vai al viaggio →</p>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {user ? (
                            <div className="flex items-center gap-4 user-menu-container relative">
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="flex items-center gap-3 px-3 py-1.5 rounded-sm hover:bg-[var(--accent-muted)] transition-all text-[var(--text-primary)] border border-transparent hover:border-[var(--border-medium)]"
                                >
                                    <div className="w-6 h-6 rounded-full bg-[var(--accent-muted)] border border-[var(--border-medium)] flex items-center justify-center text-[10px] font-bold">
                                        {user?.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <span className="text-[13px] font-medium tracking-tight">
                                        {user?.name || 'Utente'}
                                    </span>
                                </button>

                                {showUserMenu && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-sm shadow-2xl overflow-hidden z-[110] animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="p-1.5 border-b border-[var(--border-subtle)]">
                                            <Link
                                                to="/my-trips"
                                                className="flex items-center gap-3 px-4 py-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-sm transition-colors uppercase tracking-widest"
                                            >
                                                {t('nav.myTrips')}
                                            </Link>
                                            {user?.is_manager && (
                                                <Link
                                                    to="/manager"
                                                    className="flex items-center gap-3 px-4 py-2.5 text-xs text-amber-600 dark:text-amber-400 hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-sm transition-colors uppercase tracking-widest font-bold"
                                                >
                                                    Dashboard Aziendale
                                                </Link>
                                            )}
                                            <Link
                                                to="/market"
                                                className="flex items-center gap-3 px-4 py-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-sm transition-colors uppercase tracking-widest"
                                            >
                                                {t('nav.market')}
                                            </Link>
                                        </div>
                                        <div className="p-1.5 space-y-0.5">
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center gap-3 w-full px-4 py-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-sm transition-colors text-left uppercase tracking-widest"
                                            >
                                                {t('nav.logout')}
                                            </button>
                                            <button
                                                onClick={handleDeleteAccount}
                                                className="flex items-center gap-3 w-full px-4 py-2.5 text-xs text-red-500/80 hover:text-red-400 hover:bg-red-500/5 rounded-sm transition-colors text-left uppercase tracking-widest"
                                            >
                                                Elimina Account
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-6">
                                <Link to="/auth" className="text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-widest">
                                    {t('nav.login')}
                                </Link>
                                <Link
                                    to="/auth"
                                    className="bg-[var(--accent-primary)] text-[var(--bg-base)] text-[13px] font-bold px-6 py-2 rounded-sm hover:opacity-90 transition-all uppercase tracking-widest"
                                >
                                    {t('nav.getStarted', 'Get Started')}
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-3">
                        {/* Language Toggle Mobile */}
                        <button
                            onClick={() => changeLanguage(currentLanguage.startsWith('it') ? 'en' : 'it')}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-[var(--border-medium)] text-[10px] font-black tracking-widest uppercase text-[var(--text-primary)]"
                            aria-label="Switch language"
                        >
                            <span className={currentLanguage.startsWith('it') ? 'opacity-100' : 'opacity-40'}>IT</span>
                            <span className="opacity-20">|</span>
                            <span className={currentLanguage.startsWith('en') ? 'opacity-100' : 'opacity-40'}>EN</span>
                        </button>
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-[var(--text-primary)]"
                            aria-label={theme === 'light' ? "Switch to dark theme" : "Switch to light theme"}
                        >
                            {theme === 'light' ? (
                                <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                            ) : (
                                <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            )}
                        </button>
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2 text-[var(--text-primary)] hover:bg-[var(--accent-muted)] rounded-sm transition-colors"
                            aria-label="Toggle menu"
                        >
                            <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {mobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                                ) || null}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-white/5 py-8 animate-in fade-in slide-in-from-top-4 duration-300 bg-black absolute left-0 right-0 top-full">
                        <div className="flex flex-col gap-6 px-6">
                            {location.pathname === '/' && (
                                <>
                                    {['how-it-works', 'features', 'pricing'].map((id) => (
                                        <a
                                            key={id}
                                            href={`#${id}`}
                                            className="text-lg font-medium text-gray-400 hover:text-white uppercase tracking-widest transition-colors"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            {t(`nav.${id.replace(/-/g, '')}`, id.replace(/-/g, ' ').toUpperCase())}
                                        </a>
                                    ))}
                                    <div className="h-px bg-white/5 my-2"></div>
                                </>
                            )}

                            {user ? (
                                <div className="space-y-6">
                                    <div className="pb-2">
                                        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 mb-2">Account</div>
                                        <div className="text-2xl font-semibold text-white tracking-tight">
                                            {user?.name || 'Utente'}
                                        </div>
                                    </div>

                                    <Link
                                        to="/my-trips"
                                        className="block text-lg text-gray-400 hover:text-white uppercase tracking-widest transition-colors"
                                    >
                                        {t('nav.myTrips')}
                                    </Link>

                                    {user?.is_manager && (
                                        <Link
                                            to="/manager"
                                            className="block text-lg text-amber-400 hover:text-white uppercase tracking-widest transition-colors font-bold"
                                        >
                                            Dashboard Aziendale
                                        </Link>
                                    )}

                                    <Link
                                        to="/market"
                                        className="block text-lg text-gray-400 hover:text-white uppercase tracking-widest transition-colors"
                                    >
                                        {t('nav.market')}
                                    </Link>

                                    <button
                                        onClick={handleLogout}
                                        className="block w-full text-left text-lg text-gray-400 hover:text-white uppercase tracking-widest transition-colors"
                                    >
                                        {t('nav.logout')}
                                    </button>

                                    <button
                                        onClick={handleDeleteAccount}
                                        className="block w-full text-left text-lg text-red-500/80 hover:text-red-400 uppercase tracking-widest transition-colors"
                                    >
                                        Elimina Account
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    to="/auth"
                                    className="bg-white text-black text-center text-lg font-bold py-4 rounded-sm uppercase tracking-widest"
                                >
                                    {t('nav.getStarted', 'Get Started')}
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
