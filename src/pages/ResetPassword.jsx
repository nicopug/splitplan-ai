import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword, validateResetToken } from '../api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
                <div className="auth-glass-card">
                    <h2 className="text-2xl font-bold mb-4">Errore</h2>
                    {renderError(error || "Token di reset mancante o non valido.")}
                    <Button variant="outline" className="mt-4 border-white/20 hover:bg-white/5 text-white" onClick={() => navigate('/auth')}>
                        Torna al Login
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-glass-card">
                <h2>Reimposta Password</h2>
                <p className="auth-subtitle">Inserisci la tua nuova password</p>

                {error && renderError(error)}
                {message && renderSuccess(message)}

                {!message && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Nuova Password</Label>
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
                            {password && (
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
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Conferma Nuova Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
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
                        <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-500 mt-6 shadow-lg shadow-blue-500/20" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? 'Aggiornamento...' : 'Aggiorna Password'}
                        </Button>
                    </form>
                )}

                {message && (
                    <p className="mt-4 text-center">Verrai reindirizzato al login tra pochi secondi...</p>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
