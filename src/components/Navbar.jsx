import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/logo_splitplan.jpg';

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
        <nav className="sticky top-0 z-50 bg-bg-creme border-b border-gray-200 backdrop-blur-sm bg-opacity-95">
            <div className="container">
                <div className="flex items-center justify-between h-20 md:h-24">

                    {/* Logo */}
                    <Link to="/" className="flex items-center">
                        <img
                            src={logo}
                            alt="SplitPlan Logo"
                            className="h-12 md:h-16 w-auto mix-blend-multiply hover:scale-105 transition-transform"
                        />
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
                                <span className="font-semibold text-primary-blue flex items-center gap-2">
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
                                        <span className="font-semibold text-primary-blue flex items-center gap-2">
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