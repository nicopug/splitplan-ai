import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword, validateResetToken } from '../api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from '../components/ui/card';
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import './Auth.css';


const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isValidating, setIsValidating] = useState(true);
    const [strength, setStrength] = useState({ score: 0, label: '', color: '' });
    const [showPassword, setShowPassword] = useState(false);

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

    useEffect(() => {
        const validate = async () => {
            if (!token) {
                setIsValidating(false);
                return;
            }
            try {
                await validateResetToken(token);
                setIsValidating(false);
            } catch (err) {
                setError("Il link di reset non è valido o è scaduto.");
                setIsValidating(false);
            }
        };
        validate();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Le password non coincidono");
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await resetPassword(token, password);
            setMessage(res.message);
            setTimeout(() => navigate('/auth'), 3000);
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

    if (isValidating) {
        return (
            <div className="auth-container">
                <div className="auth-glass-card">
                    <h2>Verifica in corso...</h2>
                    <p>Stiamo validando il tuo link di sicurezza.</p>
                </div>
            </div>
        );
    }

    if (!token || (error && !message)) {
        return (
            <div className="auth-container">
                <Card className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border-white/10 shadow-3xl rounded-[32px] overflow-hidden border-t-red-500/20">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-white">Errore</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {renderError(error || "Token di reset mancante o non valido.")}
                        <Button variant="outline" className="w-full mt-4 border-white/10 hover:bg-white/5 text-white rounded-xl" onClick={() => navigate('/auth')}>
                            Torna al Login
                        </Button>
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
                        <CardTitle className="text-2xl font-bold text-white mb-1">Reimposta Password</CardTitle>
                        <CardDescription className="text-white/60">Inserisci la tua nuova password</CardDescription>
                    </div>
                    <CardAction>
                        <Button
                            variant="link"
                            className="text-blue-400 hover:text-blue-300 p-0 h-auto font-bold text-[10px] uppercase tracking-widest"
                            onClick={() => navigate('/auth')}
                        >
                            Login
                        </Button>
                    </CardAction>
                </CardHeader>

                <CardContent>
                    {error && renderError(error)}
                    {message && renderSuccess(message)}

                    {!message && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2.5">
                                <Label htmlFor="password" title="Nuova Password" className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Nuova Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={e => {
                                            setPassword(e.target.value);
                                            validatePassword(e.target.value);
                                        }}
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
                                {password && (
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
                            <div className="space-y-2.5">
                                <Label htmlFor="confirmPassword" title="Conferma Nuova Password" className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Conferma Nuova Password</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
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
                            <Button type="submit" className="w-full h-13 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl mt-4 shadow-xl shadow-blue-600/20" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Aggiorna Password'}
                            </Button>
                        </form>
                    )}

                    {message && (
                        <p className="mt-6 text-center text-sm text-white/60">Verrai reindirizzato al login tra pochi secondi...</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ResetPassword;
