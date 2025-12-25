import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { register, login, verifyEmail, toggleSubscription, forgotPassword } from '../api';

import './Auth.css';

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [showPlanSelection, setShowPlanSelection] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [strength, setStrength] = useState({ score: 0, label: '', color: '' });

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    useEffect(() => {
        if (token) {
            handleVerification(token);
        }
    }, [token]);

    const handleVerification = async (verifyToken) => {
        try {
            setLoading(true);
            const res = await verifyEmail(verifyToken);
            setMessage(res.message);
            setIsLogin(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const validatePassword = (pass) => {
        let score = 0;
        if (pass.length > 8) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[0-9]/.test(pass)) score++;
        if (/[^A-Za-z0-9]/.test(pass)) score++;

        const labels = ['Troppo debole', 'Debole', 'Media', 'Forte', 'Molto Forte'];
        const colors = ['#ff4d4d', '#ffa64d', '#ffdb4d', '#99ff33', '#00ff00'];

        setStrength({
            score: (score / 4) * 100,
            label: labels[score],
            color: colors[score]
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'password' && !isLogin) {
            validatePassword(value);
        }
    };

    const handlePlanChoice = async (isPremium) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (isPremium) {
                const res = await toggleSubscription(user.email);
                user.is_subscribed = res.is_subscribed;
                localStorage.setItem('user', JSON.stringify(user));
            }
            navigate('/');
            // Force reload to update navbar
            window.location.reload();
        } catch (err) {
            setError("Errore durante l'attivazione: " + err.message);
        }
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            const res = await forgotPassword(forgotEmail);
            setMessage(res.message);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            if (isLogin) {
                const res = await login({ email: formData.email, password: formData.password });
                localStorage.setItem('token', res.access_token);
                localStorage.setItem('user', JSON.stringify(res.user));

                if (res.user.is_subscribed) {
                    navigate('/');
                    window.location.reload();
                } else {
                    setShowPlanSelection(true);
                }
            } else {
                if (formData.password !== formData.confirmPassword) {
                    throw new Error('Le password non coincidono');
                }
                const res = await register({
                    name: formData.name,
                    surname: formData.surname,
                    email: formData.email,
                    password: formData.password
                });
                setMessage("Registrazione completata! Ora puoi accedere.");
                setIsLogin(true);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (showPlanSelection) {
        return (
            <div className="auth-container">
                <div className="auth-glass-card plan-selection">
                    <h2>Scegli il tuo Piano</h2>
                    <p style={{ marginBottom: '2rem' }}>Accedi a funzionalità esclusive per pianificare il viaggio perfetto.</p>

                    <div className="plans-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', textAlign: 'left' }}>
                        <div className="plan-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.5)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>Base (Free)</h3>
                            <p className="price" style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0.5rem 0' }}>€0</p>
                            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                                <li>Pianificazione condivisa</li>
                                <li>Votazione destinazione</li>
                                <li>Gestione spese base</li>
                            </ul>
                            <button onClick={() => handlePlanChoice(false)} className="btn btn-secondary btn-full" style={{ fontSize: '0.9rem' }}>Seleziona</button>
                        </div>

                        <div className="plan-card premium" style={{ padding: '1.5rem', background: 'rgba(35, 89, 158, 0.05)', borderRadius: '16px', border: '2px solid var(--primary-blue)', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '-12px', right: '10px', background: 'var(--primary-blue)', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem' }}>CONSIGLIATO</div>
                            <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-blue)' }}>Premium 💎</h3>
                            <p className="price" style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0.5rem 0' }}>€9.99</p>
                            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                <li>Tutto quello che c'è in Base</li>
                                <li><b>Link Deep Booking & Skyscanner</b></li>
                                <li>Supporto IA Prioritario</li>
                                <li>Foto del viaggio illimitate</li>
                            </ul>
                            <button onClick={() => handlePlanChoice(true)} className="btn btn-primary btn-full" style={{ fontSize: '0.9rem' }}>Attiva Premium</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (showForgot) {

        return (
            <div className="auth-container">
                <div className="auth-glass-card">
                    <h2>Recupero Password</h2>
                    <p className="auth-subtitle">Inserisci la tua email per ricevere il link di reset</p>

                    {error && <div className="auth-error">{error}</div>}
                    {message && <div className="auth-success">{message}</div>}

                    {!message && (
                        <form onSubmit={handleForgotSubmit} className="auth-form">
                            <div className="auth-field">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={forgotEmail}
                                    onChange={e => setForgotEmail(e.target.value)}
                                    required
                                    placeholder="mario@esempio.it"
                                />
                            </div>
                            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                                {loading ? 'Invio...' : 'Invia Link di Reset'}
                            </button>
                        </form>
                    )}

                    <div className="auth-switch" style={{ marginTop: '1.5rem' }}>
                        <span onClick={() => setShowForgot(false)}>Torna al Login</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-glass-card">
                <h2>{isLogin ? 'Bentornato su SplitPlan' : 'Crea il tuo Account'}</h2>
                <p className="auth-subtitle">
                    {isLogin ? 'Accedi per gestire i tuoi viaggi' : 'Inizia a pianificare con i tuoi amici'}
                </p>

                {error && <div className="auth-error">{error}</div>}
                {message && <div className="auth-success">{message}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    {!isLogin && (
                        <div className="auth-row">
                            <div className="auth-field">
                                <label>Nome</label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Es. Mario"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="auth-field">
                                <label>Cognome</label>
                                <input
                                    type="text"
                                    name="surname"
                                    placeholder="Es. Rossi"
                                    value={formData.surname}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div className="auth-field">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="mario@esempio.it"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="auth-field">
                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                        {!isLogin && formData.password && (
                            <div className="strength-meter">
                                <div
                                    className="strength-bar"
                                    style={{ width: `${strength.score}%`, backgroundColor: strength.color }}
                                ></div>
                                <span style={{ color: strength.color }}>{strength.label}</span>
                            </div>
                        )}
                    </div>

                    {!isLogin && (
                        <div className="auth-field">
                            <label>Conferma Password</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                        {loading ? 'Caricamento...' : (isLogin ? 'Accedi' : 'Registrati')}
                    </button>

                    {isLogin && (
                        <div className="auth-forgot-link" style={{ textAlign: 'right', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                            <span
                                onClick={() => {
                                    setShowForgot(true);
                                    setError('');
                                    setMessage('');
                                }}
                                style={{ color: 'var(--primary-blue)', cursor: 'pointer', opacity: 0.8 }}
                            >
                                Password dimenticata?
                            </span>
                        </div>
                    )}
                </form>

                <div className="auth-switch">
                    {isLogin ? (
                        <>Non hai un account? <span onClick={() => setIsLogin(false)}>Registrati</span></>
                    ) : (
                        <>Hai già un account? <span onClick={() => setIsLogin(true)}>Accedi</span></>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Auth;
