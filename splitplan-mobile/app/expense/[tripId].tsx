import React, { useState, useEffect } from 'react';
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
    Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getParticipants, addExpense } from '@/lib/api';

type Participant = {
    id: number;
    name: string;
};

export default function AddExpenseScreen() {
    const { tripId } = useLocalSearchParams<{ tripId: string }>();
    const router = useRouter();

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [selectedPayer, setSelectedPayer] = useState<number | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const parts = await getParticipants(Number(tripId));
                setParticipants(parts);
                if (parts.length > 0) {
                    setSelectedPayer(parts[0].id);
                }
            } catch (e: any) {
                Alert.alert('Errore', 'Impossibile caricare i partecipanti');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [tripId]);

    const handleSubmit = async () => {
        if (!description.trim() || !amount.trim() || !selectedPayer) {
            Alert.alert('Attenzione', 'Compila tutti i campi');
            return;
        }

        const numericAmount = parseFloat(amount.replace(',', '.'));
        if (isNaN(numericAmount) || numericAmount <= 0) {
            Alert.alert('Errore', 'Inserisci un importo valido');
            return;
        }

        setSaving(true);
        try {
            await addExpense({
                trip_id: Number(tripId),
                description: description.trim(),
                amount: numericAmount,
                currency: 'EUR',
                payer_id: selectedPayer,
            });
            router.back();
        } catch (e: any) {
            Alert.alert('Errore', e.message || 'Errore durante il salvataggio');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={s.center}>
                <ActivityIndicator color="#fff" size="large" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: '#0a0a0a' }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">

                {/* Descrizione */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={s.label}>DESCRIZIONE</Text>
                    <TextInput
                        style={s.input}
                        placeholder="Es: Cena da Mario"
                        placeholderTextColor="#555"
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                {/* Importo */}
                <View style={{ marginBottom: 32 }}>
                    <Text style={s.label}>IMPORTO (€)</Text>
                    <TextInput
                        style={[s.input, { fontSize: 24, fontWeight: '700' }]}
                        placeholder="0.00"
                        placeholderTextColor="#555"
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                    />
                </View>

                {/* Chi ha pagato? */}
                <View style={{ marginBottom: 40 }}>
                    <Text style={s.label}>CHI HA PAGATO?</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        {participants.map((p) => (
                            <Pressable
                                key={p.id}
                                onPress={() => setSelectedPayer(p.id)}
                                style={[
                                    s.payerCapsule,
                                    selectedPayer === p.id && s.payerCapsuleActive,
                                ]}
                            >
                                <Text style={[
                                    s.payerText,
                                    selectedPayer === p.id && { color: '#000', fontWeight: '700' }
                                ]}>
                                    {p.name}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Submit */}
                <Pressable
                    onPress={handleSubmit}
                    disabled={saving || !description.trim() || !amount.trim()}
                    style={[
                        s.btnPrimary,
                        (saving || !description.trim() || !amount.trim()) && { opacity: 0.5 }
                    ]}
                >
                    {saving ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text style={s.btnPrimaryText}>AGGIUNGI SPESA</Text>
                    )}
                </Pressable>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    center: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    label: {
        color: '#666',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 8,
        marginLeft: 4,
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
    payerCapsule: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    payerCapsuleActive: {
        backgroundColor: '#fff',
        borderColor: '#fff',
    },
    payerText: {
        color: '#888',
        fontSize: 14,
    },
    btnPrimary: {
        backgroundColor: '#fff',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
    },
    btnPrimaryText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 12,
        letterSpacing: 2,
    },
});
