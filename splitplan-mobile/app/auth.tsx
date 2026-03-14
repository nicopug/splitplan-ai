import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { login, register, forgotPassword } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';

export default function AuthScreen() {
    const router = useRouter();
    const { signIn } = useAuth();

    const [isLogin, setIsLogin] = useState(true);
    const [showForgot, setShowForgot] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [forgotEmail, setForgotEmail] = useState('');

    const handleSubmit = async () => {
        setError('');
        setMessage('');
        setLoading(true);
        try {
            if (isLogin) {
                const res = await login({ email: formData.email, password: formData.password });
                await signIn(res.access_token, res.user);
                router.replace('/(tabs)');
            } else {
                if (formData.password !== formData.confirmPassword) {
                    throw new Error('Le password non coincidono');
                }
                await register({
                    name: formData.name,
                    surname: formData.surname,
                    email: formData.email,
                    password: formData.password,
                });
                
                setMessage("Registrazione completata! Ora puoi effettuare l'accesso.");
                
                // NEW: Switch to Login Screen after successful registration
                setTimeout(() => {
                    setIsLogin(true);
                    setMessage('');
                    // Optionally clear confirm password so it's clean for next time
                    setFormData(prev => ({ ...prev, confirmPassword: '' }));
                }, 2000);
            }
        } catch (err: any) {
            setError(err.message || 'Errore sconosciuto');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotSubmit = async () => {
        setError('');
        setMessage('');
        setLoading(true);
        try {
            const res = await forgotPassword(forgotEmail);
            setMessage(res.message || 'Email di recupero inviata!');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ─── Forgot Password ─────────────────────────────────────────────
    if (showForgot) {
        return (
            <View style={s.center}>
                <View style={s.card}>
                    <Text style={[s.title, { textAlign: 'center', marginBottom: 8 }]}>Recupero Password</Text>
                    <Text style={[s.label, { textAlign: 'center', marginBottom: 32 }]}>INSERISCI LA TUA EMAIL</Text>

                    {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}
                    {message ? <View style={s.successBox}><Text style={s.successText}>{message}</Text></View> : null}

                    {!message && (
                        <>
                            <TextInput
                                style={[s.input, { marginBottom: 24 }]}
                                placeholder="mario@esempio.it"
                                placeholderTextColor="#666"
                                value={forgotEmail}
                                onChangeText={setForgotEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            <Pressable onPress={handleForgotSubmit} disabled={loading} style={s.btnPrimary}>
                                {loading ? <ActivityIndicator color="#000" /> : (
                                    <Text style={s.btnPrimaryText}>INVIA LINK DI RESET</Text>
                                )}
                            </Pressable>
                        </>
                    )}

                    <Pressable onPress={() => { setShowForgot(false); setError(''); setMessage(''); }} style={{ marginTop: 24 }}>
                        <Text style={[s.label, { textAlign: 'center' }]}>← TORNA AL LOGIN</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    // ─── Main Auth ────────────────────────────────────────────────────
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: '#000' }}
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}
                keyboardShouldPersistTaps="handled"
            >
                <View style={s.card}>
                    {/* Header */}
                    <View style={{ alignItems: 'center', marginBottom: 32 }}>
                        <Text style={[s.title, { marginBottom: 8 }]}>
                            {isLogin ? 'Bentornato su SplitPlan' : 'Crea il tuo Account'}
                        </Text>
                        <Text style={s.label}>
                            {isLogin ? 'ACCEDI PER GESTIRE I TUOI VIAGGI' : 'INIZIA A PIANIFICARE CON I TUOI AMICI'}
                        </Text>
                    </View>

                    {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}
                    {message ? <View style={s.successBox}><Text style={s.successText}>{message}</Text></View> : null}

                    {/* Registration fields */}
                    {!isLogin && (
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.inputLabel}>NOME</Text>
                                <TextInput
                                    style={s.input}
                                    placeholder="Mario"
                                    placeholderTextColor="#555"
                                    value={formData.name}
                                    onChangeText={(v) => setFormData((p) => ({ ...p, name: v }))}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.inputLabel}>COGNOME</Text>
                                <TextInput
                                    style={s.input}
                                    placeholder="Rossi"
                                    placeholderTextColor="#555"
                                    value={formData.surname}
                                    onChangeText={(v) => setFormData((p) => ({ ...p, surname: v }))}
                                />
                            </View>
                        </View>
                    )}

                    {/* Email */}
                    <View style={{ marginBottom: 16 }}>
                        <Text style={s.inputLabel}>EMAIL</Text>
                        <TextInput
                            style={s.input}
                            placeholder="mario@esempio.it"
                            placeholderTextColor="#555"
                            value={formData.email}
                            onChangeText={(v) => setFormData((p) => ({ ...p, email: v }))}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Password */}
                    <View style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <Text style={s.inputLabel}>PASSWORD</Text>
                            {isLogin && (
                                <Pressable onPress={() => { setShowForgot(true); setError(''); setMessage(''); }}>
                                    <Text style={[s.inputLabel, { color: '#555' }]}>DIMENTICATA?</Text>
                                </Pressable>
                            )}
                        </View>
                        <View style={s.passwordContainer}>
                            <TextInput
                                style={[s.input, { flex: 1, borderRightWidth: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                                placeholder="••••••••"
                                placeholderTextColor="#555"
                                value={formData.password}
                                onChangeText={(v) => setFormData((p) => ({ ...p, password: v }))}
                                secureTextEntry={!showPassword}
                            />
                            <Pressable
                                style={s.eyeButton}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Ionicons
                                    name={showPassword ? "eye-off" : "eye"}
                                    size={20}
                                    color="#666"
                                />
                            </Pressable>
                        </View>
                    </View>

                    {/* Confirm Password */}
                    {!isLogin && (
                        <View style={{ marginBottom: 16 }}>
                            <Text style={s.inputLabel}>CONFERMA PASSWORD</Text>
                            <View style={s.passwordContainer}>
                                <TextInput
                                    style={[s.input, { flex: 1, borderRightWidth: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                                    placeholder="••••••••"
                                    placeholderTextColor="#555"
                                    value={formData.confirmPassword}
                                    onChangeText={(v) => setFormData((p) => ({ ...p, confirmPassword: v }))}
                                    secureTextEntry={!showConfirmPassword}
                                />
                                <Pressable
                                    style={s.eyeButton}
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <Ionicons
                                        name={showConfirmPassword ? "eye-off" : "eye"}
                                        size={20}
                                        color="#666"
                                    />
                                </Pressable>
                            </View>
                        </View>
                    )}

                    {/* Submit */}
                    <Pressable onPress={handleSubmit} disabled={loading} style={[s.btnPrimary, { marginTop: 16, width: '100%', alignItems: 'center' }]}>
                        {loading ? <ActivityIndicator color="#000" /> : (
                            <Text style={s.btnPrimaryText}>{isLogin ? 'ACCEDI' : 'REGISTRATI'}</Text>
                        )}
                    </Pressable>

                    {/* Toggle */}
                    <Pressable
                        onPress={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }}
                        style={{ marginTop: 32 }}
                    >
                        <Text style={[s.label, { textAlign: 'center' }]}>
                            {isLogin ? 'NON HAI UN ACCOUNT? ' : 'HAI GIÀ UN ACCOUNT? '}
                            <Text style={{ color: '#fff' }}>{isLogin ? 'REGISTRATI' : 'ACCEDI'}</Text>
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    center: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#0a0a0a',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 32,
    },
    title: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
    },
    label: {
        color: '#666',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 3,
    },
    inputLabel: {
        color: '#666',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 6,
        marginLeft: 4,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: '#fff',
        fontSize: 14,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    eyeButton: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderLeftWidth: 0,
        borderTopRightRadius: 10,
        borderBottomRightRadius: 10,
        paddingHorizontal: 12,
        height: 48, // Deve combaciare con l'altezza dell'input
        justifyContent: 'center',
    },
    btnPrimary: {
        backgroundColor: '#fff',
        paddingVertical: 14,
        borderRadius: 10,
    },
    btnPrimaryText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 12,
        letterSpacing: 2,
        textAlign: 'center',
    },
    errorBox: {
        backgroundColor: 'rgba(239,68,68,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.2)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    errorText: {
        color: '#f87171',
        fontSize: 12,
        textAlign: 'center',
    },
    successBox: {
        backgroundColor: 'rgba(16,185,129,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(16,185,129,0.2)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    successText: {
        color: '#34d399',
        fontSize: 12,
        textAlign: 'center',
    },
});
