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
        <nav className="fixed top-0 left-0 right-0 z-[100] bg-black/80 backdrop-blur-md border-b border-white/5 h-[var(--header-height)]">
            <div className="container h-full">
                <div className="flex items-center justify-between h-full relative">

                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center transition-transform duration-500 group-hover:rotate-12">
                            <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                            </svg>
                        </div>
                        <span className="text-white text-lg font-semibold tracking-tight uppercase group-hover:text-gray-300 transition-colors">
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
                                        className="text-[13px] font-medium text-gray-400 hover:text-white uppercase tracking-widest transition-colors duration-300"
                                    >
                                        {t(`nav.${id.replace(/-/g, '')}`, id.replace(/-/g, ' ').toUpperCase())}
                                    </a>
                                ))}
                            </>
                        ) : (
                            <Link to="/" className="text-[13px] font-medium text-gray-400 hover:text-white uppercase tracking-widest transition-colors">
                                {t('nav.home', 'HOME')}
                            </Link>
                        )}
                    </div>


                    {/* Right Side: User & CTA */}
                    <div className="hidden md:flex items-center gap-6">
                        {user ? (
                            <div className="flex items-center gap-4 user-menu-container relative">
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="flex items-center gap-3 px-3 py-1.5 rounded-sm hover:bg-white/5 transition-all text-white border border-transparent hover:border-white/10"
                                >
                                    <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                                        {user?.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <span className="text-[13px] font-medium tracking-tight">
                                        {user?.name || 'Utente'}
                                    </span>
                                </button>

                                {showUserMenu && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-black border border-white/10 rounded-sm shadow-2xl overflow-hidden z-[110] animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="p-1.5 border-b border-white/5">
                                            <Link
                                                to="/my-trips"
                                                className="flex items-center gap-3 px-4 py-2.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-sm transition-colors uppercase tracking-widest"
                                            >
                                                {t('nav.myTrips')}
                                            </Link>
                                            <Link
                                                to="/market"
                                                className="flex items-center gap-3 px-4 py-2.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-sm transition-colors uppercase tracking-widest"
                                            >
                                                {t('nav.market')}
                                            </Link>
                                        </div>
                                        <div className="p-1.5">
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center gap-3 w-full px-4 py-2.5 text-xs text-red-500/80 hover:text-red-400 hover:bg-red-500/5 rounded-sm transition-colors text-left uppercase tracking-widest"
                                            >
                                                {t('nav.logout')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-6">
                                <Link to="/auth" className="text-[13px] font-medium text-gray-400 hover:text-white transition-colors uppercase tracking-widest">
                                    {t('nav.login')}
                                </Link>
                                <Link
                                    to="/auth"
                                    className="bg-white text-black text-[13px] font-bold px-6 py-2 rounded-sm hover:bg-gray-200 transition-all uppercase tracking-widest"
                                >
                                    {t('nav.getStarted', 'Get Started')}
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 text-white hover:bg-white/5 rounded-sm transition-colors"
                        aria-label="Toggle menu"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {mobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
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

                                    <Link
                                        to="/market"
                                        className="block text-lg text-gray-400 hover:text-white uppercase tracking-widest transition-colors"
                                    >
                                        {t('nav.market')}
                                    </Link>

                                    <button
                                        onClick={handleLogout}
                                        className="block w-full text-left text-lg text-red-500/80 hover:text-red-400 uppercase tracking-widest transition-colors"
                                    >
                                        {t('nav.logout')}
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
