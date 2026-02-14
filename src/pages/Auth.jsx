import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { register, login, verifyEmail, toggleSubscription, forgotPassword } from '../api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from '../components/ui/card';
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
                <div className="max-w-4xl w-full">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-bold text-white mb-3">Scegli il tuo Piano</h2>
                        <p className="text-white/60">Accedi a funzionalità esclusive per pianificare il viaggio perfetto.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10 p-8 rounded-[32px] hover:bg-white/[0.08] transition-all">
                            <CardHeader className="p-0 mb-6">
                                <CardTitle className="text-xl text-white/50 font-bold uppercase tracking-widest">Viaggiatore</CardTitle>
                                <div className="text-4xl font-black text-white mt-2">Gratis</div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <p className="text-xs text-white/40 mb-6 font-medium">Tutto l'essenziale per organizzare.</p>
                                <ul className="space-y-4 mb-8">
                                    {['Pianificazione AI Base', 'Itinerari Smart', 'Prenotazioni Integrate', 'Chat di Gruppo'].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-white/70">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <Button onClick={() => handlePlanChoice(false)} variant="outline" className="w-full h-12 rounded-xl border-white/20 text-white hover:bg-white/10">
                                    Seleziona
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900/80 backdrop-blur-2xl border-blue-500/20 p-8 rounded-[32px] relative shadow-2xl shadow-blue-500/10 border-t-blue-500/40">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg shadow-orange-500/30 uppercase tracking-widest">
                                Consigliato
                            </div>
                            <CardHeader className="p-0 mb-6">
                                <CardTitle className="text-xl text-blue-400 font-bold uppercase tracking-widest">L'Organizzatore</CardTitle>
                                <div className="text-4xl font-black text-white mt-2 flex items-baseline gap-1">
                                    €4.99<span className="text-sm font-medium text-white/40">/mese</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <p className="text-xs text-white/40 mb-6 font-medium">Per chi vuole il controllo totale.</p>
                                <ul className="space-y-4 mb-8">
                                    {['CFO del Viaggio', 'Budget Guard (Alert Spese)', 'Assistenza AI Prioritaria', 'Export Video Ricordi'].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-white/90">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <Button onClick={() => handlePlanChoice(true)} className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20">
                                    Attiva Premium
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }


    if (showForgot) {
        return (
            <div className="auth-container">
                <Card className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border-white/10 shadow-3xl rounded-[32px] overflow-hidden border-t-blue-500/20">
                    <CardHeader>
                        <div>
                            <CardTitle className="text-2xl font-bold text-white mb-1">Recupero Password</CardTitle>
                            <CardDescription className="text-white/60">Inserisci la tua email per ricevere il link di reset</CardDescription>
                        </div>
                        <CardAction>
                            <Button
                                variant="link"
                                className="text-blue-400 hover:text-blue-300 p-0 h-auto font-bold text-[10px] uppercase tracking-widest"
                                onClick={() => setShowForgot(false)}
                            >
                                Login
                            </Button>
                        </CardAction>
                    </CardHeader>

                    <CardContent>
                        {error && renderError(error)}
                        {message && renderSuccess(message)}

                        {!message && (
                            <form onSubmit={handleForgotSubmit} className="space-y-6">
                                <div className="space-y-2.5">
                                    <Label htmlFor="forgot-email" className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Email</Label>
                                    <Input
                                        id="forgot-email"
                                        type="email"
                                        value={forgotEmail}
                                        onChange={e => setForgotEmail(e.target.value)}
                                        required
                                        placeholder="mario@esempio.it"
                                        className="bg-white/[0.03] border-white/10 text-white h-12 rounded-2xl focus:ring-blue-500/20"
                                    />
                                </div>
                                <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl mt-4" disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Invia Link di Reset'}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <Card className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border-white/10 shadow-3xl rounded-[32px] overflow-hidden border-t-blue-500/20">
                <CardHeader>
                    <div>
                        <CardTitle className="text-2xl font-bold text-white mb-1">
                            {isLogin ? 'Bentornato su SplitPlan' : 'Crea il tuo Account'}
                        </CardTitle>
                        <CardDescription className="text-white/60">
                            {isLogin ? 'Accedi per gestire i tuoi viaggi' : 'Inizia a pianificare con i tuoi amici'}
                        </CardDescription>
                    </div>
                    <CardAction>
                        <Button
                            variant="link"
                            className="text-blue-400 hover:text-blue-300 p-0 h-auto font-bold text-xs uppercase tracking-widest"
                            onClick={() => setIsLogin(!isLogin)}
                        >
                            {isLogin ? 'Registrati' : 'Accedi'}
                        </Button>
                    </CardAction>
                </CardHeader>

                <CardContent>
                    {error && renderError(error)}
                    {message && renderSuccess(message)}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {!isLogin && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2.5">
                                    <Label htmlFor="name" className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Nome</Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        name="name"
                                        placeholder="Es. Mario"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        className="bg-white/[0.03] border-white/10 text-white h-12 rounded-2xl focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <Label htmlFor="surname" className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Cognome</Label>
                                    <Input
                                        id="surname"
                                        type="text"
                                        name="surname"
                                        placeholder="Es. Rossi"
                                        value={formData.surname}
                                        onChange={handleChange}
                                        required
                                        className="bg-white/[0.03] border-white/10 text-white h-12 rounded-2xl focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2.5">
                            <Label htmlFor="email" className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                placeholder="mario@esempio.it"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="bg-white/[0.03] border-white/10 text-white h-12 rounded-2xl focus:ring-blue-500/20"
                            />
                        </div>

                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between px-1">
                                <Label htmlFor="password" className="text-[10px] font-black text-white/40 uppercase tracking-widest">Password</Label>
                                {isLogin && (
                                    <span
                                        onClick={() => {
                                            setShowForgot(true);
                                            setError('');
                                            setMessage('');
                                        }}
                                        className="text-[10px] font-bold text-blue-400 cursor-pointer hover:text-blue-300 transition-colors uppercase tracking-wider"
                                    >
                                        Dimenticata?
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="••••••••"
                                    className="bg-white/[0.03] border-white/10 text-white h-12 rounded-2xl focus:ring-blue-500/20 pr-10"
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
                                <div className="pt-2 px-1">
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full transition-all duration-300"
                                            style={{ width: `${strength.score}%`, backgroundColor: strength.color }}
                                        ></div>
                                    </div>
                                    <span className="text-[10px] uppercase tracking-wider font-black mt-1.5 block" style={{ color: strength.color }}>{strength.label}</span>
                                </div>
                            )}
                        </div>

                        {!isLogin && (
                            <div className="space-y-2.5">
                                <Label htmlFor="confirmPassword" className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Conferma Password</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                        placeholder="••••••••"
                                        className="bg-white/[0.03] border-white/10 text-white h-12 rounded-2xl focus:ring-blue-500/20 pr-10"
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

                        <Button type="submit" className="w-full h-13 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl mt-4 shadow-xl shadow-blue-600/20 group transition-all" disabled={loading}>
                            {loading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span>{isLogin ? 'Entra nel Viaggio' : 'Inizia l\'Avventura'}</span>
                                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                        <span className="text-[10px]">→</span>
                                    </div>
                                </div>
                            )}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="bg-white/[0.02] border-t border-white/5 py-6 px-10 flex flex-col gap-4">
                    <p className="text-[10px] text-white/40 text-center uppercase tracking-[0.2em]">Oppure continua con</p>
                    <Button variant="outline" className="w-full h-11 bg-transparent border-white/10 hover:bg-white/5 text-white rounded-xl flex items-center gap-3">
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 grayscale opacity-50 contrast-125" />
                        <span className="text-xs font-bold">Google Account</span>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Auth;
