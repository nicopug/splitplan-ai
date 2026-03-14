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
    Alert,
    StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { createTrip } from '@/lib/api';

export default function CreateTripScreen() {
    const router = useRouter();
    const { user } = useAuth();

    const [tripName, setTripName] = useState('');
    const [tripType, setTripType] = useState<'GROUP' | 'SOLO' | null>(null);
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!tripName.trim()) {
            Alert.alert('Attenzione', 'Inserisci un nome per il viaggio.');
            return;
        }
        if (!tripType) {
            Alert.alert('Attenzione', 'Seleziona il tipo di viaggio.');
            return;
        }

        setLoading(true);
        try {
            const data = await createTrip({ name: tripName.trim(), trip_type: tripType });
            setTripName('');
            setTripType(null);
            router.push(`/survey/${data.trip_id}` as any);
        } catch (e: any) {
            Alert.alert('Errore', e.message || 'Errore nella creazione del viaggio.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <View style={s.center}>
                <Text style={{ fontSize: 48, marginBottom: 24 }}>🔒</Text>
                <Text style={[s.title, { marginBottom: 8 }]}>Accesso Richiesto</Text>
                <Text style={[s.sub, { textAlign: 'center', marginBottom: 32 }]}>
                    Accedi per creare un nuovo viaggio{'\n'}con l'Intelligenza Artificiale.
                </Text>
                <Pressable onPress={() => router.push('/auth')} style={s.btnPrimary}>
                    <Text style={s.btnPrimaryText}>ACCEDI</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: '#000' }}
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 80 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={{ marginBottom: 40 }}>
                    <Text style={s.label}>NUOVO VIAGGIO</Text>
                    <Text style={s.title}>Crea un Piano</Text>
                    <Text style={[s.sub, { marginTop: 8 }]}>
                        L'AI genererà proposte di destinazione, itinerari e budget ottimizzati per te.
                    </Text>
                </View>

                {/* Trip Name */}
                <View style={{ marginBottom: 32 }}>
                    <Text style={[s.label, { marginBottom: 8, marginLeft: 4 }]}>NOME DEL VIAGGIO</Text>
                    <TextInput
                        style={s.input}
                        placeholder="Es: Weekend a Parigi"
                        placeholderTextColor="#555"
                        value={tripName}
                        onChangeText={setTripName}
                    />
                </View>

                {/* Trip Type */}
                <View style={{ marginBottom: 40 }}>
                    <Text style={[s.label, { marginBottom: 16, marginLeft: 4 }]}>TIPO DI VIAGGIO</Text>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        <Pressable
                            onPress={() => setTripType('GROUP')}
                            style={[s.typeCard, tripType === 'GROUP' && s.typeCardActive]}
                        >
                            <Text style={{ fontSize: 28, marginBottom: 12 }}>👥</Text>
                            <Text style={[s.typeLabel, tripType === 'GROUP' && { color: '#fff' }]}>In Gruppo</Text>
                            <Text style={{ color: '#666', fontSize: 10, marginTop: 4, textAlign: 'center' }}>Voti e spese condivise</Text>
                        </Pressable>

                        <Pressable
                            onPress={() => setTripType('SOLO')}
                            style={[s.typeCard, tripType === 'SOLO' && s.typeCardActive]}
                        >
                            <Text style={{ fontSize: 28, marginBottom: 12 }}>✈️</Text>
                            <Text style={[s.typeLabel, tripType === 'SOLO' && { color: '#fff' }]}>Da Solo</Text>
                            <Text style={{ color: '#666', fontSize: 10, marginTop: 4, textAlign: 'center' }}>Ritmo tuo, zero compromessi</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Create Button */}
                <Pressable
                    onPress={handleCreate}
                    disabled={loading || !tripName.trim() || !tripType}
                    style={[
                        s.btnPrimary,
                        { width: '100%', alignItems: 'center' },
                        (!tripName.trim() || !tripType) && { backgroundColor: 'rgba(255,255,255,0.1)' },
                    ]}
                >
                    {loading ? (
                        <ActivityIndicator color={!tripName.trim() || !tripType ? '#fff' : '#000'} />
                    ) : (
                        <Text style={[
                            s.btnPrimaryText,
                            (!tripName.trim() || !tripType) && { color: '#666' },
                        ]}>
                            CREA VIAGGIO
                        </Text>
                    )}
                </Pressable>
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
    title: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '800',
    },
    sub: {
        color: '#888',
        fontSize: 14,
        lineHeight: 22,
    },
    label: {
        color: '#666',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 3,
        marginBottom: 4,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        color: '#fff',
        fontSize: 15,
    },
    typeCard: {
        flex: 1,
        alignItems: 'center',
        padding: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    typeCardActive: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderColor: 'rgba(255,255,255,0.3)',
    },
    typeLabel: {
        color: '#888',
        fontWeight: '700',
        fontSize: 14,
    },
    btnPrimary: {
        backgroundColor: '#fff',
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 12,
    },
    btnPrimaryText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 12,
        letterSpacing: 2,
    },
});
