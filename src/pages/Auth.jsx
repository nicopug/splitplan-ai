import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { register, login, verifyEmail, toggleSubscription, forgotPassword } from '../api';
import { Button } from '../components/ui/button';

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

    const handlePlanChoice = async (planType) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (planType) {
                const res = await toggleSubscription(planType);
                user.is_subscribed = res.is_subscribed;
                user.subscription_plan = res.subscription_plan;
                localStorage.setItem('user', JSON.stringify(user));
            }
            navigate('/');
            setTimeout(() => window.location.reload(), 100);
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

                if (onLogin) onLogin(res.user);

                if (localStorage.getItem('pending_plan_selection') === 'true') {
                    localStorage.removeItem('pending_plan_selection');
                    setShowPlanSelection(true);
                } else {
                    navigate('/');
                    setTimeout(() => window.location.reload(), 100);
                }
            } else {
                if (formData.password !== formData.confirmPassword) {
                    throw new Error('Le password non coincidono');
                }
                await register({
                    name: formData.name,
                    surname: formData.surname,
                    email: formData.email,
                    password: formData.password
                });

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

    if (showPlanSelection) {
        return (
            <div className="min-h-screen bg-black pt-24 pb-12">
                <div className="container max-w-5xl">
                    <div className="text-center mb-16">
                        <span className="subtle-heading">MEMBERSHIP</span>
                        <h2 className="text-white text-4xl lg:text-5xl font-semibold mb-4">Scegli il tuo Piano</h2>
                        <p className="text-gray-500 text-lg max-w-2xl mx-auto">Accedi a funzionalità esclusive per pianificare il viaggio perfetto.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Free Plan */}
                        <div className="premium-card flex flex-col">
                            <div className="flex-1">
                                <span className="subtle-heading">BASIC</span>
                                <h3 className="text-2xl font-semibold text-white mb-2">Viaggiatore</h3>
                                <div className="text-4xl font-bold text-white mb-6">Gratis</div>
                                <p className="text-sm text-gray-500 mb-8 leading-relaxed">Tutto l'essenziale per organizzare in gruppo.</p>
                                <ul className="space-y-4 mb-8 text-xs font-medium text-gray-400">
                                    <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> 20 Chiamate AI / giorno</li>
                                    <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> Itinerari Smart</li>
                                    <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> Chat di Gruppo</li>
                                </ul>
                            </div>
                            <Button onClick={() => handlePlanChoice(null)} variant="outline" className="w-full">
                                INIZIA GRATIS
                            </Button>
                        </div>

                        {/* Pro Monthly */}
                        <div className="premium-card flex flex-col border-white/20 bg-white/5">
                            <div className="flex-1">
                                <span className="subtle-heading text-blue-400">MOST POPULAR</span>
                                <h3 className="text-2xl font-semibold text-white mb-2">Pro Mensile</h3>
                                <div className="text-4xl font-bold text-white mb-6">€4.99<span className="text-sm text-gray-500 font-normal ml-1">/mese</span></div>
                                <p className="text-sm text-gray-500 mb-8 leading-relaxed">Per chi vuole il controllo totale e IA illimitata.</p>
                                <ul className="space-y-4 mb-8 text-xs font-medium text-gray-400">
                                    <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> AI Illimitata</li>
                                    <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> PDF Automation</li>
                                    <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> Assistenza Prioritaria</li>
                                </ul>
                            </div>
                            <Button onClick={() => handlePlanChoice('MONTHLY')} className="w-full">
                                SCEGLI MENSILE
                            </Button>
                        </div>

                        {/* Pro Annual */}
                        <div className="premium-card flex flex-col border-white/10">
                            <div className="flex-1">
                                <span className="subtle-heading text-emerald-500">SAVE 50%</span>
                                <h3 className="text-2xl font-semibold text-white mb-2">Pro Annuale</h3>
                                <div className="text-4xl font-bold text-white mb-6">€29.99<span className="text-sm text-gray-500 font-normal ml-1">/anno</span></div>
                                <p className="text-sm text-gray-500 mb-8 leading-relaxed">Il miglior valore per veri esploratori.</p>
                                <ul className="space-y-4 mb-8 text-xs font-medium text-gray-400">
                                    <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> Tutto di Pro Mensile</li>
                                    <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> Badge Esclusivo</li>
                                    <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> Blocco Prezzo</li>
                                </ul>
                            </div>
                            <Button onClick={() => handlePlanChoice('ANNUAL')} variant="secondary" className="w-full">
                                SCEGLI ANNUALE
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
        <div className="min-h-screen bg-black flex flex-col justify-center items-center px-4 pt-24 pb-12">
            <div className="premium-card w-full max-w-sm border-white/5 bg-zinc-950/50 backdrop-blur-md">
                <div className="flex justify-center mb-6">
                    <img 
                        src="/file.svg" 
                        alt="SplitPlan Logo" 
                        className="w-16 h-16 invert"
                    />
                </div>
                <div className="text-center mb-8">
                    <h2 className="text-white text-2xl font-semibold mb-2">
                        {isLogin ? 'Bentornato su SplitPlan' : 'Crea il tuo Account'}
                    </h2>
                    <p className="text-gray-500 text-xs tracking-wide">
                        {isLogin ? 'ACCEDI PER GESTIRE I TUOI VIAGGI' : 'INIZIA A PIANIFICARE CON I TUOI AMICI'}
                    </p>
                </div>

                {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-sm mb-6 text-center">{error}</div>}
                {message && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs rounded-sm mb-6 text-center">{message}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-500 tracking-widest uppercase ml-1">Nome</label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Mario"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/20 transition-colors"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-500 tracking-widest uppercase ml-1">Cognome</label>
                                <input
                                    type="text"
                                    name="surname"
                                    placeholder="Rossi"
                                    value={formData.surname}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/20 transition-colors"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 tracking-widest uppercase ml-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="mario@esempio.it"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/20 transition-colors"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-gray-500 tracking-widest uppercase ml-1">Password</label>
                            {isLogin && (
                                <span
                                    onClick={() => {
                                        setShowForgot(true);
                                        setError('');
                                        setMessage('');
                                    }}
                                    className="text-[10px] font-bold text-gray-600 hover:text-white cursor-pointer transition-colors tracking-widest uppercase"
                                >
                                    DIMENTICATA?
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="••••••••"
                                className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/20 transition-colors pr-10"
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        {formData.password && !isLogin && (
                            <div className="pt-1">
                                <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full transition-all duration-500"
                                        style={{ width: `${strength.score}%`, backgroundColor: strength.color }}
                                    ></div>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: strength.color }}>{strength.label}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {!isLogin && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 tracking-widest uppercase ml-1">Conferma Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/20 transition-colors"
                                />
                            </div>
                        </div>
                    )}

                    <div className="pt-4">
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'CARICAMENTO...' : (isLogin ? 'ACCEDI' : 'REGISTRATI')}
                        </Button>
                    </div>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-[10px] font-bold text-gray-600 tracking-widest uppercase">
                        {isLogin ? (
                            <>NON HAI UN ACCOUNT? <span onClick={() => setIsLogin(false)} className="text-white cursor-pointer hover:underline underline-offset-4 ml-1">REGISTRATI</span></>
                        ) : (
                            <>HAI GIÀ UN ACCOUNT? <span onClick={() => setIsLogin(true)} className="text-white cursor-pointer hover:underline underline-offset-4 ml-1">ACCEDI</span></>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Auth;
