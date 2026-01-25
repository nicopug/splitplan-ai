import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
    const [user, setUser] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    }, [location.pathname]);

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

                    {/* Logo Stilizzato */}
                    <Link to="/" className="flex items-center gap-2.5 group">
                        {/* Icona Aeroplanino Minimal */}
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-blue rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                            <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 2 9 18zm0 0v-8" />
                            </svg>
                        </div>
                        {/* Testo Logo */}
                        <span className="text-2xl md:text-3xl font-black tracking-tight flex items-center" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            <span className="bg-gradient-to-r from-primary-blue to-blue-400 bg-clip-text text-transparent">Split</span>
                            <span className="text-text-main dark:text-white">Plan</span>
                            <span className="text-primary-blue ml-0.5">.</span>
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-xl"
                            title="Cambia Tema"
                        >
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                        {location.pathname === '/' && (
                            <>
                                <a
                                    href="#how-it-works"
                                    className="font-medium text-text-main hover:text-primary-blue transition-colors"
                                >
                                    Come Funziona
                                </a>
                                <a
                                    href="#features"
                                    className="font-medium text-text-main hover:text-primary-blue transition-colors"
                                >
                                    Funzionalità
                                </a>
                                <a
                                    href="#pricing"
                                    className="font-medium text-text-main hover:text-primary-blue transition-colors"
                                >
                                    Prezzi
                                </a>
                            </>
                        )}

                        {user ? (
                            <div className="flex items-center gap-4">
                                <span className="font-semibold text-text-main flex items-center gap-2">
                                    Ciao, {user.name}
                                    {user.is_subscribed && <span className="text-xl">💎</span>}
                                </span>
                                <button
                                    onClick={handleLogout}
                                    className="btn-secondary px-4 py-2 text-sm rounded-lg"
                                >
                                    Esci
                                </button>
                            </div>
                        ) : (
                            <Link to="/auth" className="btn btn-primary px-6 py-2.5 text-base">
                                Accedi
                            </Link>
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
                
                .animate-slideDown {
                    animation: slideDown 0.2s ease-out;
                }
            `}</style>
        </nav>
    );
};

export default Navbar;