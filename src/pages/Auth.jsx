import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { register, login, verifyEmail, toggleSubscription, forgotPassword } from '../api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

import './Auth.css';

const Auth = ({ onLogin }) => {
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
    const [showPassword, setShowPassword] = useState(false);

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

                // Notify parent immediately
                if (onLogin) onLogin(res.user);

                // Show plan selection ONLY if we just registered
                if (localStorage.getItem('pending_plan_selection') === 'true') {
                    localStorage.removeItem('pending_plan_selection');
                    setShowPlanSelection(true);
                } else {
                    navigate('/');
                    // Small delay to ensure state propagates before reload if necessary
                    setTimeout(() => window.location.reload(), 100);
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

                // Mark that we need to show plan selection on first login
                localStorage.setItem('pending_plan_selection', 'true');

                setMessage("Registrazione completata! Controlla la tua email per verificare l'account prima di accedere.");
                setIsLogin(true);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const renderError = (msg) => (
        <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{msg}</span>
        </div>
    );

    const renderSuccess = (msg) => (
        <div className="flex items-center gap-2 p-3 mb-4 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{msg}</span>
        </div>
    );

    if (showPlanSelection) {
        return (
            <div className="auth-container">
                <div className="auth-glass-card plan-selection">
                    <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Scegli il tuo Piano</h2>
                    <p style={{ marginBottom: '2.5rem', opacity: 0.8 }}>Accedi a funzionalità esclusive per pianificare il viaggio perfetto.</p>

                    <div className="plans-grid">
                        <div className="plan-card" style={{ padding: '2rem', background: 'white', borderRadius: '24px', border: '1px solid #e0e0e0', margin: '0 auto', width: '100%' }}>
                            <div>
                                <h3 style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>Viaggiatore</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: '800', margin: '1rem 0', color: 'var(--primary-blue)' }}>Gratis</div>
                                <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>Tutto l'essenziale per organizzare.</p>
                                <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', marginBottom: '2rem' }}>
                                    <li style={{ marginBottom: '0.8rem' }}>Pianificazione AI Base</li>
                                    <li style={{ marginBottom: '0.8rem' }}>Itinerari Smart</li>
                                    <li style={{ marginBottom: '0.8rem' }}>Prenotazioni Integrate</li>
                                    <li style={{ marginBottom: '0.8rem' }}>Chat di Gruppo</li>
                                </ul>
                            </div>
                            <button onClick={() => handlePlanChoice(false)} className="btn btn-secondary btn-full">Seleziona</button>
                        </div>

                        <div className="plan-card premium premium-card-offset" style={{ padding: '2rem', background: 'var(--dark-navy)', borderRadius: '24px', position: 'relative', color: 'white', margin: '0 auto', width: '100%' }}>
                            <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-orange)', color: 'white', padding: '0.25rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>CONSIGLIATO</div>
                            <div>
                                <h3 style={{ fontSize: '1.5rem', color: 'white' }}>L'Organizzatore</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: '800', margin: '1rem 0', color: 'var(--secondary-blue)' }}>€4.99<span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)' }}>/mese</span></div>
                                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem' }}>Per chi vuole il controllo totale.</p>
                                <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', marginBottom: '2rem' }}>
                                    <li style={{ marginBottom: '0.8rem' }}>CFO del Viaggio</li>
                                    <li style={{ marginBottom: '0.8rem' }}>Budget Guard (Alert Spese)</li>
                                    <li style={{ marginBottom: '0.8rem' }}>Assistenza AI Prioritaria</li>
                                    <li style={{ marginBottom: '0.8rem' }}>Export Video Ricordi</li>
                                </ul>
                            </div>
                            <Button onClick={() => handlePlanChoice(true)} variant="premium" className="w-full h-12 text-lg shadow-lg shadow-orange-500/20">
                                Attiva Premium
                            </Button>
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

                    {error && renderError(error)}
                    {message && renderSuccess(message)}

                    {!message && (
                        <form onSubmit={handleForgotSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="forgot-email">Email</Label>
                                <Input
                                    id="forgot-email"
                                    type="email"
                                    value={forgotEmail}
                                    onChange={e => setForgotEmail(e.target.value)}
                                    required
                                    placeholder="mario@esempio.it"
                                    className="bg-white/5 border-white/10 text-white"
                                />
                            </div>
                            <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-500" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {loading ? 'Invio...' : 'Invia Link di Reset'}
                            </Button>
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

                {error && renderError(error)}
                {message && renderSuccess(message)}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    name="name"
                                    placeholder="Es. Mario"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="bg-white/5 border-white/10 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="surname">Cognome</Label>
                                <Input
                                    id="surname"
                                    type="text"
                                    name="surname"
                                    placeholder="Es. Rossi"
                                    value={formData.surname}
                                    onChange={handleChange}
                                    required
                                    className="bg-white/5 border-white/10 text-white"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            placeholder="mario@esempio.it"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="••••••••"
                                className="bg-white/5 border-white/10 text-white pr-10"
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {formData.password && !isLogin && (
                            <div className="pt-2">
                                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full transition-all duration-300"
                                        style={{ width: `${strength.score}%`, backgroundColor: strength.color }}
                                    ></div>
                                </div>
                                <span className="text-[10px] uppercase tracking-wider font-bold mt-1 block" style={{ color: strength.color }}>{strength.label}</span>
                            </div>
                        )}
                    </div>

                    {!isLogin && (
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Conferma Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    placeholder="••••••••"
                                    className="bg-white/5 border-white/10 text-white pr-10"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    )}

                    <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-500 mt-6 shadow-lg shadow-blue-500/20" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? 'Caricamento...' : (isLogin ? 'Accedi' : 'Registrati')}
                    </Button>

                    {isLogin && (
                        <div className="text-right mt-2">
                            <span
                                onClick={() => {
                                    setShowForgot(true);
                                    setError('');
                                    setMessage('');
                                }}
                                className="text-sm text-blue-400 cursor-pointer hover:text-blue-300 transition-colors"
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
