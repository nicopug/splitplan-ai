import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    ActivityIndicator,
    Alert,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { generateProposals, getTrip } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';

const TRIP_TYPES = [
    { id: 'beach', emoji: '🏖️', label: 'Mare' },
    { id: 'mountain', emoji: '⛰️', label: 'Montagna' },
    { id: 'city', emoji: '🏙️', label: 'Città' },
    { id: 'adventure', emoji: '🧗', label: 'Avventura' },
    { id: 'culture', emoji: '🏛️', label: 'Cultura' },
    { id: 'relax', emoji: '🧘', label: 'Relax' },
];

export default function SurveyScreen() {
    const { tripId } = useLocalSearchParams<{ tripId: string }>();
    const router = useRouter();

    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [tripType, setTripType] = useState<'GROUP' | 'SOLO' | null>(null);

    const [formData, setFormData] = useState({
        destination: '',
        departure_airport: '',
        budget: '',
        num_people: '2',
        start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000),
        must_have: '',
        must_avoid: '',
        vibe: [] as string[],
        participant_names: [] as string[],
        transport_mode: 'FLIGHT',
        trip_intent: 'LEISURE',
        work_start_time: '09:00',
        work_end_time: '18:00',
        work_days: 'Monday,Tuesday,Wednesday,Thursday,Friday'
    });

    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    useEffect(() => {
        const fetchTrip = async () => {
            try {
                const data = await getTrip(Number(tripId));
                setTripType(data.trip_type);
                if (data.trip_type === 'SOLO') {
                    setFormData(prev => ({ ...prev, num_people: '1' }));
                }
            } catch (error) {
                console.error("Failed to load trip data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTrip();
    }, [tripId]);

    // Update participant names array when num_people changes
    useEffect(() => {
        if (tripType !== 'GROUP') return;

        const count = parseInt(formData.num_people) || 1;
        const needed = Math.max(0, count - 1);

        setFormData(prev => {
            const currentNames = [...prev.participant_names];
            if (currentNames.length < needed) {
                while (currentNames.length < needed) currentNames.push("");
            } else if (currentNames.length > needed) {
                currentNames.splice(needed);
            }
            return { ...prev, participant_names: currentNames };
        });
    }, [formData.num_people, tripType]);

    const handleIntentSelect = (intent: string) => {
        setFormData({ ...formData, trip_intent: intent });
        setStep(1);
    };

    const handleTransportSelect = (mode: string) => {
        setFormData({ ...formData, transport_mode: mode });
        setStep(2);
    };

    const toggleVibe = (id: string) => {
        setFormData(prev => ({
            ...prev,
            vibe: prev.vibe.includes(id)
                ? prev.vibe.filter(t => t !== id)
                : [...prev.vibe, id]
        }));
    };

    const handleParticipantNameChange = (index: number, name: string) => {
        const newNames = [...formData.participant_names];
        newNames[index] = name;
        setFormData({ ...formData, participant_names: newNames });
    };

    const handleSubmit = async () => {
        if (!formData.destination) {
            Alert.alert('Attenzione', 'Inserisci una destinazione.');
            return;
        }
        if (!formData.budget) {
            Alert.alert('Attenzione', 'Inserisci un budget.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                budget: parseFloat(formData.budget),
                num_people: parseInt(formData.num_people) || 1,
                start_date: formData.start_date.toISOString().split('T')[0],
                end_date: formData.end_date.toISOString().split('T')[0],
                vibe: formData.vibe.join(', ')
            };

            await generateProposals(Number(tripId), payload);
            router.replace(`/trip/${tripId}` as any);
        } catch (e: any) {
            Alert.alert('Errore', e.message || 'Errore nella generazione delle proposte');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={s.center}>
                <ActivityIndicator color="#fff" size="large" />
            </View>
        );
    }

    // ─── STEP 0: TRIP INTENT ─────────────────────────────────────────
    if (step === 0) {
        return (
            <View style={s.container}>
                <View style={s.header}>
                    <Text style={s.label}>PASSAGGIO 1 DI 3</Text>
                    <Text style={s.title}>Qual è lo scopo del viaggio?</Text>
                    <Text style={s.subtitle}>Questo ci aiuterà a personalizzare l'itinerario perfetto per te.</Text>
                </View>

                <View style={s.intentContainer}>
                    <Pressable
                        style={[s.intentCard, formData.trip_intent === 'LEISURE' && s.intentCardActive]}
                        onPress={() => handleIntentSelect('LEISURE')}
                    >
                        <View style={s.iconCircle}>
                            <Ionicons name="umbrella-outline" size={32} color="#fff" />
                        </View>
                        <Text style={s.intentTitle}>VACANZA</Text>
                        <Text style={s.intentDesc}>Relax, divertimento e scoperta.</Text>
                    </Pressable>

                    <Pressable
                        style={[s.intentCard, formData.trip_intent === 'BUSINESS' && s.intentCardActive]}
                        onPress={() => handleIntentSelect('BUSINESS')}
                    >
                        <View style={s.iconCircle}>
                            <Ionicons name="briefcase-outline" size={32} color="#fff" />
                        </View>
                        <Text style={s.intentTitle}>LAVORO</Text>
                        <Text style={s.intentDesc}>Efficienza e produttività professionale.</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    // ─── STEP 1: TRANSPORT MODE ──────────────────────────────────────
    if (step === 1) {
        return (
            <View style={s.container}>
                <View style={s.header}>
                    <Text style={s.label}>PASSAGGIO 2 DI 3</Text>
                    <Text style={s.title}>Come ti sposterai?</Text>
                    <Text style={s.subtitle}>Scegli il mezzo di trasporto principale per raggiungere la destinazione.</Text>
                </View>

                <View style={s.transportContainer}>
                    {[
                        { id: 'FLIGHT', label: 'AEREO', icon: 'airplane-outline' as const },
                        { id: 'TRAIN', label: 'TRENO', icon: 'train-outline' as const },
                        { id: 'CAR', label: 'AUTO', icon: 'car-outline' as const },
                    ].map(mode => (
                        <Pressable
                            key={mode.id}
                            style={[s.transportCard, formData.transport_mode === mode.id && s.transportCardActive]}
                            onPress={() => handleTransportSelect(mode.id)}
                        >
                            <Ionicons name={mode.icon} size={28} color={formData.transport_mode === mode.id ? "#000" : "#fff"} />
                            <Text style={[s.transportLabel, formData.transport_mode === mode.id && { color: '#000' }]}>{mode.label}</Text>
                        </Pressable>
                    ))}
                </View>

                <Pressable onPress={() => setStep(0)} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={20} color="#666" />
                    <Text style={s.backBtnText}>INDIETRO</Text>
                </Pressable>
            </View>
        );
    }

    // ─── STEP 2: FULL DETAILS ────────────────────────────────────────
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1, backgroundColor: '#000' }}
        >
            <ScrollView contentContainerStyle={s.scrollContainer} keyboardShouldPersistTaps="handled">
                <View style={s.header}>
                    <Text style={s.label}>PASSAGGIO 3 DI 3</Text>
                    <Text style={s.title}>Definiamo i dettagli</Text>
                    <Text style={s.subtitle}>Quasi pronto! Inserisci le ultime informazioni per generare il piano.</Text>
                </View>

                {/* Form Group: Basic Info */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>DESTINAZIONE</Text>
                    <TextInput
                        style={s.input}
                        placeholder="Es: Europa, Giappone, Parigi..."
                        placeholderTextColor="#444"
                        value={formData.destination}
                        onChangeText={text => setFormData({ ...formData, destination: text })}
                    />

                    <Text style={[s.sectionTitle, { marginTop: 16 }]}>{formData.transport_mode === 'FLIGHT' ? 'AEROPORTO PARTENZA' : 'CITTÀ DI PARTENZA'}</Text>
                    <TextInput
                        style={s.input}
                        placeholder={formData.transport_mode === 'FLIGHT' ? "Es: MXP, FCO..." : "Es: Milano, Roma..."}
                        placeholderTextColor="#444"
                        value={formData.departure_airport}
                        onChangeText={text => setFormData({ ...formData, departure_airport: text })}
                    />
                </View>

                {/* BUDGET & PEOPLE */}
                <View style={s.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.sectionTitle}>BUDGET TOTALE (€)</Text>
                        <TextInput
                            style={s.input}
                            placeholder="Es: 1500"
                            placeholderTextColor="#444"
                            keyboardType="numeric"
                            value={formData.budget}
                            onChangeText={text => setFormData({ ...formData, budget: text })}
                        />
                    </View>
                    {tripType === 'GROUP' && (
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={s.sectionTitle}>PERSONE</Text>
                            <TextInput
                                style={s.input}
                                placeholder="Es: 2"
                                placeholderTextColor="#444"
                                keyboardType="numeric"
                                value={formData.num_people}
                                onChangeText={text => setFormData({ ...formData, num_people: text.replace(/[^0-9]/g, '') })}
                            />
                        </View>
                    )}
                </View>

                {/* DATES */}
                <View style={s.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.sectionTitle}>PARTENZA</Text>
                        <Pressable style={s.inputDate} onPress={() => setShowStartPicker(true)}>
                            <Ionicons name="calendar-outline" size={18} color="#888" style={{ marginRight: 8 }} />
                            <Text style={s.dateText}>{formData.start_date.toLocaleDateString('it-IT')}</Text>
                        </Pressable>
                        {showStartPicker && (
                            <DateTimePicker
                                value={formData.start_date}
                                mode="date"
                                display="default"
                                onChange={(e, d) => {
                                    setShowStartPicker(Platform.OS === 'ios');
                                    if (d) setFormData({ ...formData, start_date: d });
                                }}
                            />
                        )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={s.sectionTitle}>RITORNO</Text>
                        <Pressable style={s.inputDate} onPress={() => setShowEndPicker(true)}>
                            <Ionicons name="calendar-outline" size={18} color="#888" style={{ marginRight: 8 }} />
                            <Text style={s.dateText}>{formData.end_date.toLocaleDateString('it-IT')}</Text>
                        </Pressable>
                        {showEndPicker && (
                            <DateTimePicker
                                value={formData.end_date}
                                mode="date"
                                display="default"
                                minimumDate={formData.start_date}
                                onChange={(e, d) => {
                                    setShowEndPicker(Platform.OS === 'ios');
                                    if (d) setFormData({ ...formData, end_date: d });
                                }}
                            />
                        )}
                    </View>
                </View>

                {/* PARTICIPANT NAMES (Group only) */}
                {tripType === 'GROUP' && formData.participant_names.length > 0 && (
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>CHI VIENE CON TE?</Text>
                        <View style={s.namesGrid}>
                            {formData.participant_names.map((name, idx) => (
                                <TextInput
                                    key={idx}
                                    style={[s.input, { marginBottom: 8 }]}
                                    placeholder={`Nome Amico ${idx + 2}`}
                                    placeholderTextColor="#444"
                                    value={name}
                                    onChangeText={text => handleParticipantNameChange(idx, text)}
                                />
                            ))}
                        </View>
                    </View>
                )}

                {/* BUSINESS CONFIGURATION */}
                {formData.trip_intent === 'BUSINESS' && (
                    <View style={s.businessBox}>
                        <Text style={s.businessTitle}>CONFIGURAZIONE LAVORO 💼</Text>
                        <Text style={s.businessDesc}>L'AI organizzerà le attività extra fuori dagli orari indicati.</Text>

                        <View style={s.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.sectionTitle}>INIZIO</Text>
                                <TextInput
                                    style={s.input}
                                    value={formData.work_start_time}
                                    onChangeText={t => setFormData({ ...formData, work_start_time: t })}
                                />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={s.sectionTitle}>FINE</Text>
                                <TextInput
                                    style={s.input}
                                    value={formData.work_end_time}
                                    onChangeText={t => setFormData({ ...formData, work_end_time: t })}
                                />
                            </View>
                        </View>
                    </View>
                )}

                {/* VIBE / ATMOSPHERE */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>ATMOSFERA</Text>
                    <View style={s.vibeRow}>
                        {TRIP_TYPES.map(v => (
                            <Pressable
                                key={v.id}
                                onPress={() => toggleVibe(v.id)}
                                style={[s.vibeChip, formData.vibe.includes(v.id) && s.vibeChipActive]}
                            >
                                <Text style={{ fontSize: 16 }}>{v.emoji}</Text>
                                <Text style={[s.vibeText, formData.vibe.includes(v.id) && { color: '#000' }]}>{v.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* PREFERENCES */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>COSA NON PUÒ MANCARE?</Text>
                    <TextInput
                        style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
                        multiline
                        placeholder="Es: Musei, Spiagge, Shopping..."
                        placeholderTextColor="#444"
                        value={formData.must_have}
                        onChangeText={text => setFormData({ ...formData, must_have: text })}
                    />

                    <Text style={[s.sectionTitle, { marginTop: 16 }]}>COSA VORRESTI EVITARE?</Text>
                    <TextInput
                        style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
                        multiline
                        placeholder="Es: Club, Trekking faticosi..."
                        placeholderTextColor="#444"
                        value={formData.must_avoid}
                        onChangeText={text => setFormData({ ...formData, must_avoid: text })}
                    />
                </View>

                {/* SUBMIT */}
                <Pressable
                    onPress={handleSubmit}
                    disabled={submitting}
                    style={s.submitBtn}
                >
                    {submitting ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <ActivityIndicator color="#000" size="small" style={{ marginRight: 12 }} />
                            <Text style={s.submitBtnText}>ANALISI IN CORSO...</Text>
                        </View>
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={s.submitBtnText}>GENERA PROPOSTE AI ✨</Text>
                        </View>
                    )}
                </Pressable>

                <Pressable onPress={() => setStep(1)} style={[s.backBtn, { marginTop: 16, alignSelf: 'center', paddingBottom: 40 }]}>
                    <Ionicons name="arrow-back" size={16} color="#666" />
                    <Text style={[s.backBtnText, { fontSize: 10 }]}>TORNA AI TRASPORTI</Text>
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
    },
    container: {
        flex: 1,
        backgroundColor: '#000',
        padding: 24,
        paddingTop: 60,
    },
    scrollContainer: {
        padding: 24,
        paddingTop: 60,
        paddingBottom: 100,
    },
    header: {
        marginBottom: 40,
    },
    label: {
        color: '#666',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 3,
        marginBottom: 8,
    },
    title: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    subtitle: {
        color: '#888',
        fontSize: 16,
        lineHeight: 24,
    },
    intentContainer: {
        gap: 16,
    },
    intentCard: {
        backgroundColor: '#0a0a0a',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 32,
    },
    intentCardActive: {
        borderColor: 'rgba(255,255,255,0.3)',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    iconCircle: {
        width: 64,
        height: 64,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    intentTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 4,
    },
    intentDesc: {
        color: '#666',
        fontSize: 14,
    },
    transportContainer: {
        gap: 12,
    },
    transportCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0a0a0a',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 20,
    },
    transportCardActive: {
        backgroundColor: '#fff',
        borderColor: '#fff',
    },
    transportLabel: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 2,
        marginLeft: 16,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 32,
    },
    backBtnText: {
        color: '#666',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginLeft: 8,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: '#666',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#0a0a0a',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: '#fff',
        fontSize: 14,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    inputDate: {
        backgroundColor: '#0a0a0a',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        color: '#fff',
        fontSize: 14,
    },
    namesGrid: {
        marginTop: 4,
    },
    businessBox: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 32,
    },
    businessTitle: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 4,
    },
    businessDesc: {
        color: '#666',
        fontSize: 11,
        marginBottom: 20,
    },
    vibeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    vibeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0a0a0a',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 50,
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
    },
    vibeChipActive: {
        backgroundColor: '#fff',
        borderColor: '#fff',
    },
    vibeText: {
        color: '#666',
        fontSize: 11,
        fontWeight: '700',
    },
    submitBtn: {
        backgroundColor: '#fff',
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    submitBtnText: {
        color: '#000',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 2,
    },
});
