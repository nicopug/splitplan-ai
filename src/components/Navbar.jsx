import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
    const [user, setUser] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
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