import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    RefreshControl,
    Image,
    Alert,
    StyleSheet,
    TextInput,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import {
    getTrip,
    getProposals,
    voteProposal,
    getItinerary,
    getExpenses,
    getBalances,
    getParticipants,
    confirmHotel,
    resetHotel
} from '@/lib/api';

type TripData = {
    id: number;
    name: string;
    destination: string | null;
    status: string;
    trip_type: string;
    start_date: string | null;
    end_date: string | null;
    num_people: number;
    budget: number | null;
    budget_per_person: number | null;
    accommodation?: string | null;
    transport_mode?: string;
    departure_airport?: string;
    destination_iata?: string;
    real_destination?: string;
    departure_city?: string;
};

type Proposal = {
    id: number;
    destination: string;
    description: string;
    image_url: string;
    avg_score: number;
    votes_count: number;
};

type ItineraryItem = {
    id: number;
    day: number;
    time: string;
    title: string;
    description: string;
    category: string;
};

type Expense = {
    id: number;
    description: string;
    amount: number;
    currency: string;
    paid_by_name: string;
    created_at: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    SURVEY: { label: 'SONDAGGIO', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.1)' },
    VOTING: { label: 'VOTAZIONE', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.1)' },
    CONSENSUS_REACHED: { label: 'CONSENSO', color: '#22d3ee', bg: 'rgba(6, 182, 212, 0.1)' },
    LOGISTICS: { label: 'LOGISTICA', color: '#fb923c', bg: 'rgba(249, 115, 22, 0.1)' },
    BOOKED: { label: 'PRENOTATO', color: '#34d399', bg: 'rgba(16, 185, 129, 0.1)' },
    COMPLETED: { label: 'COMPLETATO', color: '#9ca3af', bg: 'rgba(107, 114, 128, 0.1)' },
};

export default function TripDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuth();

    const getBudgetLabel = (amount: number | null) => {
        if (!amount || amount === 0) return '—';
        if (amount <= 300) return 'Economico (< €300)';
        if (amount <= 600) return 'Medio (€300 - €600)';
        return 'Premium (> €600)';
    };

    const [trip, setTrip] = useState<TripData | null>(null);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [isOrganizer, setIsOrganizer] = useState(false);
    const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [balances, setBalances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('info');
    const [initializing, setInitializing] = useState(true);
    const [confirmingHotel, setConfirmingHotel] = useState(false);
    const [hotelForm, setHotelForm] = useState({
        hotel_name: '',
        hotel_address: '',
        transport_cost: '0',
        hotel_cost: '0',
        arrival_time: '12:00',
        return_time: '10:00',
    });

    const loadData = useCallback(async () => {
        try {
            const tripData = await getTrip(Number(id));
            setTrip(tripData);

            // Determina isOrganizer
            const participants = await getParticipants(Number(id));
            if (user) {
                const me = participants.find((p: any) => p.account_id === user.id);
                setIsOrganizer(me?.is_organizer || false);
            }

            // Load relevant data based on trip status
            if (['VOTING', 'CONSENSUS_REACHED'].includes(tripData.status)) {
                try { const p = await getProposals(Number(id)); setProposals(p); } catch (e) { }
            }
            if (['BOOKED', 'COMPLETED', 'LOGISTICS'].includes(tripData.status)) {
                try { const it = await getItinerary(Number(id)); setItinerary(it); } catch (e) { }
                try { const ex = await getExpenses(Number(id)); setExpenses(ex); } catch (e) { }
                try { const b = await getBalances(Number(id)); setBalances(b); } catch (e) { }

                // Default tab for BOOKED trips
                if (initializing) {
                    if (!tripData.accommodation) {
                        setActiveTab('logistics');
                    } else {
                        setActiveTab('itinerary');
                    }
                }
            }
        } catch (e) {
            console.error('Failed to load trip:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setInitializing(false);
        }
    }, [id]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const onRefresh = () => { setRefreshing(true); loadData(); };

    const handleVote = async (proposalId: number, score: number) => {
        if (!user) return;
        try {
            await voteProposal(proposalId, user.id, score);
            Alert.alert('Voto registrato! ✅');
            loadData();
        } catch (e: any) {
            Alert.alert('Errore', e.message);
        }
    };

    const handleConfirmHotel = async () => {
        setConfirmingHotel(true);
        try {
            await confirmHotel(Number(id), {
                ...hotelForm,
                transport_cost: parseFloat(hotelForm.transport_cost) || 0,
                hotel_cost: parseFloat(hotelForm.hotel_cost) || 0,
                transport_mode: trip?.transport_mode,
            });
            Alert.alert('Logistica confermata! 🏢', 'L\'itinerario è stato generato con successo.');
            loadData();
            setActiveTab('itinerary');
        } catch (e: any) {
            Alert.alert('Errore', e.message);
        } finally {
            setConfirmingHotel(false);
        }
    };

    const handleReset = async () => {
        Alert.alert(
            'Resetta Logistica',
            'Vuoi davvero resettare i dati dell\'hotel? L\'itinerario verrà rimosso.',
            [
                { text: 'Annulla', style: 'cancel' },
                {
                    text: 'Resetta',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await resetHotel(Number(id));
                            setItinerary([]);
                            loadData();
                            setActiveTab('logistics');
                        } catch (e: any) {
                            Alert.alert('Errore', e.message);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // ─── Loading ────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color="#fff" size="large" />
                <Text style={s.loadingText}>CARICAMENTO...</Text>
            </View>
        );
    }

    if (!trip) {
        return (
            <View style={[s.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }]}>
                <Text style={{ fontSize: 48, marginBottom: 24 }}>🔍</Text>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' }}>Viaggio non trovato</Text>
            </View>
        );
    }

    const statusCfg = STATUS_CONFIG[trip.status] || { label: trip.status, color: '#9ca3af', bg: 'rgba(107, 114, 128, 0.1)' };

    // Helper for Logistics links
    const getLogisticsLinks = () => {
        const origin = trip.departure_airport || "MXP";
        const dest = trip.destination_iata || "JFK";
        const formatDate = (dateStr: string | null) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            return d.toISOString().split('T')[0];
        };
        const start = formatDate(trip.start_date);
        const end = formatDate(trip.end_date);
        const numP = trip.num_people || 1;

        const skyscanner = `https://www.skyscanner.it/trasporti/voli/${origin}/${dest}/${start.replace(/-/g, '')}/${end.replace(/-/g, '')}/?adultsv2=${numP}&cabinclass=economy&rtn=1`;
        const booking = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(trip.real_destination || trip.destination || 'Hotel')}&checkin=${start}&checkout=${end}&group_adults=${numP}`;
        const trainline = `https://www.thetrainline.com/it/search/${encodeURIComponent(trip.departure_city || 'Milano')}/${encodeURIComponent(trip.real_destination || trip.destination || 'Roma')}/${start}`;

        return { skyscanner, booking, trainline };
    };

    const links = getLogisticsLinks();

    // ─── Tabs for different sections ────────────────────────────────
    const tabs = [
        { key: 'info', label: 'Info' },
        ...(trip.status === 'BOOKED' || trip.status === 'LOGISTICS' ? [{ key: 'logistics', label: 'Logistica' }] : []),
        ...(proposals.length > 0 ? [{ key: 'proposals', label: 'Proposte' }] : []),
        ...(trip.status === 'BOOKED' || trip.status === 'LOGISTICS' || itinerary.length > 0 ? [{ key: 'itinerary', label: 'Itinerario' }] : []),
        ...(trip.status === 'BOOKED' || expenses.length > 0 ? [{ key: 'expenses', label: 'Spese' }] : []),
    ];

    return (
        <View style={s.container}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
            >
                {/* ─── Header ─────────────────────────────────────────────── */}
                <View style={s.header}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={[s.statusBadge, { backgroundColor: statusCfg.bg }]}>
                            <Text style={[s.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                        </View>
                        <Text style={{ color: '#ffffff44', fontSize: 10, fontWeight: '700' }}>V 1.2</Text>
                    </View>
                    <Text style={s.tripName}>{trip.name}</Text>
                    {trip.destination && (
                        <Text style={s.tripDestination}>📍 {trip.destination}</Text>
                    )}
                </View>

                {/* ─── Tab Bar ────────────────────────────────────────────── */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll} contentContainerStyle={s.tabScrollContainer}>
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <Pressable
                                key={tab.key}
                                onPress={() => setActiveTab(tab.key)}
                                style={[s.tabButton, isActive && s.tabButtonActive]}
                            >
                                <Text style={[s.tabButtonText, isActive && s.tabButtonTextActive]}>
                                    {tab.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                {/* ─── Tab Content ────────────────────────────────────────── */}
                <View style={s.content}>
                    {/* INFO TAB */}
                    {activeTab === 'info' && (
                        <View>
                            <View style={s.card}>
                                <View style={s.cardRow}>
                                    <Text style={s.cardLabel}>TIPO</Text>
                                    <Text style={s.cardValue}>
                                        {trip.trip_type === 'SOLO' ? '✈️ Solo' : `👥 Gruppo (${trip.num_people})`}
                                    </Text>
                                </View>
                                {trip.budget_per_person != null && trip.budget_per_person > 0 && (
                                    <View style={s.cardRow}>
                                        <Text style={s.cardLabel}>BUDGET</Text>
                                        <Text style={s.cardValue}>{getBudgetLabel(trip.budget_per_person)}</Text>
                                    </View>
                                )}
                                {trip.start_date && trip.end_date && (
                                    <View style={[s.cardRow, { borderBottomWidth: 0 }]}>
                                        <Text style={s.cardLabel}>DATE</Text>
                                        <Text style={s.cardValue}>
                                            {new Date(trip.start_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                                            {' → '}
                                            {new Date(trip.end_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Action Buttons based on status */}
                            {trip.status === 'SURVEY' && isOrganizer && (
                                <Pressable
                                    onPress={() => router.push(`/survey/${trip.id}` as any)}
                                    style={s.btnPrimary}
                                >
                                    <Text style={s.btnPrimaryText}>COMPILA PREFERENZE ✏️</Text>
                                </Pressable>
                            )}
                        </View>
                    )}

                    {/* LOGISTICS TAB */}
                    {activeTab === 'logistics' && (
                        <View style={{ gap: 20 }}>
                            <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: '#3b82f6' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <View style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 10, borderRadius: 12, marginRight: 15 }}>
                                        <Ionicons
                                            name={trip.transport_mode === 'TRAIN' ? 'train-outline' : trip.transport_mode === 'CAR' ? 'car-outline' : 'airplane-outline'}
                                            size={24}
                                            color="#3b82f6"
                                        />
                                    </View>
                                    <View>
                                        <Text style={s.proposalTitle}>Trasporto</Text>
                                        <Text style={s.cardLabel}>{trip.transport_mode?.toUpperCase() || 'AEREO'}</Text>
                                    </View>
                                </View>

                                <Text style={s.proposalDesc}>
                                    Partenza da <Text style={{ color: '#fff' }}>{trip.departure_city || trip.departure_airport || 'tua città'}</Text> verso <Text style={{ color: '#fff' }}>{trip.real_destination || trip.destination}</Text>.
                                </Text>

                                {trip.transport_mode === 'CAR' ? (
                                    <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 12, marginTop: 10 }}>
                                        <Text style={{ color: '#888', fontSize: 13 }}>Il viaggio è previsto in auto. Organizzati con i partecipanti per dividere i costi del carburante e dei pedaggi!</Text>
                                    </View>
                                ) : (
                                    <Pressable
                                        onPress={() => Linking.openURL(trip.transport_mode === 'TRAIN' ? links.trainline : links.skyscanner)}
                                        style={s.btnPrimary}
                                    >
                                        <Text style={s.btnPrimaryText}>PRENOTA ORA 🎫</Text>
                                    </Pressable>
                                )}
                            </View>

                            <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: '#ec4899' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <View style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', padding: 10, borderRadius: 12, marginRight: 15 }}>
                                        <Ionicons name="business-outline" size={24} color="#ec4899" />
                                    </View>
                                    <View>
                                        <Text style={s.proposalTitle}>Alloggio</Text>
                                        <Text style={s.cardLabel}>BOOKING.COM</Text>
                                    </View>
                                </View>
                                <Text style={s.proposalDesc}>
                                    Ti consigliamo di cercare una struttura centrale a <Text style={{ color: '#fff' }}>{trip.real_destination || trip.destination}</Text> per facilitare gli spostamenti.
                                </Text>
                                <Pressable
                                    onPress={() => Linking.openURL(links.booking)}
                                    style={[s.btnPrimary, { backgroundColor: '#ec4899' }]}
                                >
                                    <Text style={[s.btnPrimaryText, { color: '#fff' }]}>CERCA HOTEL 🏨</Text>
                                </Pressable>
                            </View>

                            {/* FORM LOGISTICA (Sotto i link) */}
                            {!trip.accommodation && isOrganizer && (
                                <View style={[s.card, { marginTop: 10 }]}>
                                    <Text style={[s.proposalTitle, { marginBottom: 4 }]}>Conferma Prenotazione</Text>
                                    <Text style={[s.proposalDesc, { marginBottom: 24 }]}>Inserisci i dettagli dell'hotel scelto per generare l'itinerario finale.</Text>

                                    <Text style={s.inputLabel}>NOME HOTEL / AIRBNB</Text>
                                    <TextInput
                                        value={hotelForm.hotel_name}
                                        onChangeText={(t) => setHotelForm({ ...hotelForm, hotel_name: t })}
                                        placeholder="Es. Hotel Majestic"
                                        placeholderTextColor="#444"
                                        style={s.input}
                                    />

                                    <Text style={s.inputLabel}>INDIRIZZO / ZONA</Text>
                                    <TextInput
                                        value={hotelForm.hotel_address}
                                        onChangeText={(t) => setHotelForm({ ...hotelForm, hotel_address: t })}
                                        placeholder="Es. Via del Corso, Roma"
                                        placeholderTextColor="#444"
                                        style={s.input}
                                    />

                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.inputLabel}>SPESA TRASPORTO (€)</Text>
                                            <TextInput
                                                value={hotelForm.transport_cost}
                                                onChangeText={(t) => setHotelForm({ ...hotelForm, transport_cost: t })}
                                                keyboardType="numeric"
                                                style={s.input}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.inputLabel}>SPESA HOTEL (€)</Text>
                                            <TextInput
                                                value={hotelForm.hotel_cost}
                                                onChangeText={(t) => setHotelForm({ ...hotelForm, hotel_cost: t })}
                                                keyboardType="numeric"
                                                style={s.input}
                                            />
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.inputLabel}>ORA ARRIVO</Text>
                                            <TextInput
                                                value={hotelForm.arrival_time}
                                                onChangeText={(t) => setHotelForm({ ...hotelForm, arrival_time: t })}
                                                placeholder="12:00"
                                                placeholderTextColor="#444"
                                                style={s.input}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.inputLabel}>ORA RITORNO</Text>
                                            <TextInput
                                                value={hotelForm.return_time}
                                                onChangeText={(t) => setHotelForm({ ...hotelForm, return_time: t })}
                                                placeholder="10:00"
                                                placeholderTextColor="#444"
                                                style={s.input}
                                            />
                                        </View>
                                    </View>

                                    <Pressable
                                        onPress={handleConfirmHotel}
                                        disabled={confirmingHotel}
                                        style={[s.btnPrimary, { marginTop: 24 }]}
                                    >
                                        {confirmingHotel ? (
                                            <ActivityIndicator size="small" color="#000" />
                                        ) : (
                                            <Text style={s.btnPrimaryText}>CONFERMA E GENERA ✨</Text>
                                        )}
                                    </Pressable>
                                </View>
                            )}

                            {trip.accommodation && isOrganizer && (
                                <Pressable onPress={handleReset} style={{ alignItems: 'center', padding: 10 }}>
                                    <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>RESETTA E MODIFICA LOGISTICA 🔄</Text>
                                </Pressable>
                            )}
                        </View>
                    )}

                    {/* PROPOSALS TAB */}
                    {activeTab === 'proposals' && (
                        <View style={{ gap: 16 }}>
                            {proposals.map((p) => (
                                <View key={p.id} style={[s.card, { padding: 0, overflow: 'hidden' }]}>
                                    {p.image_url && (
                                        <Image source={{ uri: p.image_url }} style={s.proposalImg} resizeMode="cover" />
                                    )}
                                    <View style={{ padding: 20 }}>
                                        <Text style={s.proposalTitle}>{p.destination}</Text>
                                        <Text style={s.proposalDesc}>{p.description}</Text>
                                        <View style={s.voteInfoRow}>
                                            <Text style={s.voteInfoText}>⭐ {p.avg_score?.toFixed(1) || '—'} · {p.votes_count || 0} voti</Text>
                                        </View>
                                        <View style={s.voteBtnRow}>
                                            {[1, 2, 3, 4, 5].map((score) => (
                                                <Pressable key={score} onPress={() => handleVote(p.id, score)} style={s.voteBtn}>
                                                    <Text style={s.voteBtnText}>{score}⭐</Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* ITINERARIO TAB */}
                    {activeTab === 'itinerary' && (
                        <View style={{ gap: 12 }}>
                            {trip.status === 'BOOKED' && !trip.accommodation ? (
                                <View style={s.card}>
                                    <Ionicons name="hourglass-outline" size={32} color="#888" style={{ marginBottom: 12 }} />
                                    <Text style={s.proposalTitle}>{isOrganizer ? 'Configura Logistica' : 'In Attesa...'}</Text>
                                    <Text style={s.proposalDesc}>
                                        {isOrganizer
                                            ? 'Completa i dati nella tab "Logistica" per generare l\'itinerario finale.'
                                            : 'L\'organizzatore sta confermando i dettagli dell\'alloggio. Torna più tardi!'}
                                    </Text>
                                    {isOrganizer && (
                                        <Pressable onPress={() => setActiveTab('logistics')} style={s.btnPrimary}>
                                            <Text style={s.btnPrimaryText}>VAI A LOGISTICA ➔</Text>
                                        </Pressable>
                                    )}
                                </View>
                            ) : (
                                <>
                                    <View style={{ marginBottom: 40 }}>
                                        {itinerary.map((item, idx) => (
                                            <View key={item.id || idx} style={s.card}>
                                                <View style={s.itineraryRow}>
                                                    <View style={s.dayBadge}><Text style={s.dayBadgeText}>G{item.day}</Text></View>
                                                    <Text style={s.timeText}>{item.time}</Text>
                                                </View>
                                                <Text style={s.itineraryTitle}>{item.title}</Text>
                                                <Text style={s.itineraryDesc}>{item.description}</Text>
                                            </View>
                                        ))}
                                        {isOrganizer && trip.accommodation && (
                                            <Pressable onPress={handleReset} style={{ alignItems: 'center', marginVertical: 20 }}>
                                                <Text style={{ color: '#666', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>MODIFICA LOGISTICA 🛠️</Text>
                                            </Pressable>
                                        )}
                                    </View>
                                    <Pressable onPress={() => router.push(`/chat/${trip.id}` as any)} style={s.aiBtn}>
                                        <Text style={s.aiBtnText}>CHIEDI ALL'AI</Text>
                                        <Text style={{ fontSize: 18 }}>🤖</Text>
                                    </Pressable>
                                </>
                            )}
                        </View>
                    )}

                    {/* EXPENSES TAB */}
                    {activeTab === 'expenses' && (
                        <View style={{ gap: 12 }}>
                            <Pressable onPress={() => router.push(`/expense/${trip.id}` as any)} style={s.addExpenseBtn}>
                                <Text style={s.addExpenseText}>AGGIUNGI SPESA</Text>
                                <Text style={{ fontSize: 18 }}>💰</Text>
                            </Pressable>
                            {expenses.length > 0 && <Text style={s.sectionHeader}>TUTTE LE SPESE</Text>}
                            {expenses.map((exp) => (
                                <View key={exp.id} style={[s.card, s.expenseRow]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.expenseTitle}>{exp.description}</Text>
                                        <Text style={s.expenseSub}>Pagato da {exp.paid_by_name} · {new Date(exp.created_at).toLocaleDateString('it-IT')}</Text>
                                    </View>
                                    <Text style={s.expenseAmount}>€{exp.amount.toFixed(2)}</Text>
                                </View>
                            ))}
                            {balances.length > 0 && (
                                <View style={{ marginTop: 16 }}>
                                    <Text style={[s.sectionHeader, { marginBottom: 12 }]}>BILANCI (COME DIVIDERE)</Text>
                                    {balances.map((b, idx) => (
                                        <View key={idx} style={[s.card, s.expenseRow, { marginBottom: 8 }]}>
                                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                                                <Text style={s.balanceName}>{b.from}</Text>
                                                <Text style={s.balanceText}>deve a</Text>
                                                <Text style={s.balanceName}>{b.to}</Text>
                                            </View>
                                            <Text style={s.balanceAmount}>€{b.amount?.toFixed(2)}{b.amount === undefined && b.formatted}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView >
        </View >
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loadingText: {
        color: '#666',
        fontSize: 12,
        marginTop: 16,
        fontWeight: '700',
        letterSpacing: 2,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 24,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginBottom: 12,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 2,
    },
    tripName: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '800',
    },
    tripDestination: {
        color: '#888',
        fontSize: 16,
        marginTop: 4,
    },
    tabScroll: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    tabScrollContainer: {
        gap: 8,
        paddingRight: 48, // To ensure last item isn't cut off by screen edge
    },
    tabButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    tabButtonActive: {
        backgroundColor: '#fff',
    },
    tabButtonText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        color: '#666',
    },
    tabButtonTextActive: {
        color: '#000',
    },
    content: {
        paddingHorizontal: 24,
    },
    card: {
        backgroundColor: '#0a0a0a',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    cardLabel: {
        color: '#666',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 2,
    },
    cardValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
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
    proposalImg: {
        width: '100%',
        height: 180,
    },
    proposalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    proposalDesc: {
        color: '#888',
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 16,
    },
    voteInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    voteInfoText: {
        color: '#666',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    voteBtnRow: {
        flexDirection: 'row',
        gap: 8,
    },
    voteBtn: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    voteBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    itineraryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    dayBadge: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    dayBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    timeText: {
        color: '#666',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    itineraryTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    itineraryDesc: {
        color: '#888',
        fontSize: 14,
        lineHeight: 22,
    },
    aiBtn: {
        backgroundColor: '#fff',
        paddingVertical: 16,
        marginTop: 8,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    aiBtnText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 12,
        letterSpacing: 2,
        marginRight: 8,
    },
    addExpenseBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 16,
        marginBottom: 8,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addExpenseText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 12,
        letterSpacing: 2,
        marginRight: 8,
    },
    sectionHeader: {
        color: '#666',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        marginTop: 8,
        marginLeft: 4,
    },
    expenseRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        marginBottom: 0, // Let the gap manage spacing
    },
    expenseTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    expenseSub: {
        color: '#666',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginTop: 4,
    },
    expenseAmount: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 16,
    },
    balanceName: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    balanceText: {
        color: '#666',
        fontSize: 12,
        marginHorizontal: 8,
    },
    balanceAmount: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
        marginLeft: 8,
    },
    inputLabel: {
        color: '#666',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 8,
        padding: 12,
        color: '#fff',
        fontSize: 14,
    },
});
