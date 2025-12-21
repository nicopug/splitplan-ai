import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/logo_splitplan.jpg';

const Navbar = () => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/');
    };

    return (
        <nav style={{ height: 'var(--header-height)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem' }}>
            <div className="logo" style={{ display: 'flex', alignItems: 'center' }}>
                <Link to="/">
                    <img src={logo} alt="SplitPlan Logo" style={{ height: '60px', width: 'auto', mixBlendMode: 'multiply', filter: 'brightness(1.05) contrast(1.05)' }} />
                </Link>
            </div>
            <div className="links" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                {location.pathname === '/' && (
                    <>
                        <a href="#how-it-works" style={{ fontWeight: '500' }}>Come Funziona</a>
                        <a href="#features" style={{ fontWeight: '500' }}>Funzionalità</a>
                        <a href="#pricing" style={{ fontWeight: '500' }}>Prezzi</a>
                    </>
                )}

                {user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontWeight: '600', color: 'var(--primary-blue)' }}>
                            Ciao, {user.name} {user.is_subscribed ? '💎' : ''}
                        </span>
                        <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                            Esci
                        </button>
                    </div>
                ) : (
                    <Link to="/auth" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
                        Accedi
                    </Link>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
