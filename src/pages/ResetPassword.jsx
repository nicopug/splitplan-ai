import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword, validateResetToken } from '../api';
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
                    <h2>Errore</h2>
                    <p>{error || "Token di reset mancante o non valido."}</p>
                    <button className="btn btn-primary mt-4" onClick={() => navigate('/auth')}>Torna al Login</button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-glass-card">
                <h2>Reimposta Password</h2>
                <p className="auth-subtitle">Inserisci la tua nuova password</p>

                {error && <div className="auth-error">{error}</div>}
                {message && <div className="auth-success">{message}</div>}

                {!message && (
                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="auth-field">
                            <label>Nuova Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={e => {
                                        setPassword(e.target.value);
                                        validatePassword(e.target.value);
                                    }}
                                    required
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                            {password && (
                                <div className="strength-meter">
                                    <div
                                        className="strength-bar"
                                        style={{ width: `${strength.score}%`, backgroundColor: strength.color }}
                                    ></div>
                                    <span style={{ color: strength.color }}>{strength.label}</span>
                                </div>
                            )}
                        </div>
                        <div className="auth-field">
                            <label>Conferma Nuova Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                            {loading ? 'Aggiornamento...' : 'Aggiorna Password'}
                        </button>
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
