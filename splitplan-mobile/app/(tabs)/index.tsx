import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Pressable,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { getUserTrips, getUserStats } from '@/lib/api';

type Stats = {
    total_trips: number;
    completed_trips: number;
    total_expenses: number;
};

type Trip = {
    id: number;
    name: string;
    destination: string | null;
    status: string;
};

const STATUS_EMOJI: Record<string, string> = {
    SURVEY: '📋',
    VOTING: '🗳️',
    CONSENSUS_REACHED: '🤝',
    LOGISTICS: '🏨',
    BOOKED: '✅',
    COMPLETED: '🏁',
};

export default function HomeScreen() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [stats, setStats] = useState<Stats | null>(null);
    const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) { setLoading(false); return; }

        const load = async () => {
            try {
                const [statsData, tripsData] = await Promise.all([
                    getUserStats().catch(() => null),
                    getUserTrips().catch(() => []),
                ]);
                if (statsData) setStats(statsData);
                setRecentTrips(tripsData.slice(0, 3));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user, authLoading]);

    // ─── Auth Loading ───────────────────────────────────────────────
    if (authLoading) {
        return (
            <View style={s.center}>
                <ActivityIndicator color="#fff" size="large" />
            </View>
        );
    }

    // ─── Not Logged In — Welcome Screen ─────────────────────────────
    if (!user) {
        return (
            <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                <Text style={{ fontSize: 56, marginBottom: 24 }}>✈️</Text>
                <Text style={s.heroTitle}>SplitPlan AI</Text>
                <Text style={s.heroSub}>
                    L'Agente di Viaggio AI{'\n'}All-in-One
                </Text>

                <View style={s.featureList}>
                    {[
                        { emoji: '🤖', title: 'AI Travel Agent', desc: 'Proposte personalizzate generate dall\'AI' },
                        { emoji: '🗳️', title: 'Voto Democratico', desc: 'Il tuo gruppo decide insieme' },
                        { emoji: '💰', title: 'CFO Finanziario', desc: 'Spese condivise, senza stress' },
                        { emoji: '🗺️', title: 'Itinerario Smart', desc: 'Ottimizzato giorno per giorno' },
                    ].map((f, i) => (
                        <View key={i} style={s.featureRow}>
                            <Text style={{ fontSize: 24 }}>{f.emoji}</Text>
                            <View style={{ flex: 1, marginLeft: 16 }}>
                                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{f.title}</Text>
                                <Text style={{ color: '#666', fontSize: 12, marginTop: 2 }}>{f.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <Pressable onPress={() => router.push('/auth')} style={s.btnPrimary}>
                    <Text style={s.btnPrimaryText}>INIZIA ORA</Text>
                </Pressable>

                <Pressable onPress={() => router.push('/auth')} style={{ marginTop: 16 }}>
                    <Text style={{ color: '#666', fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>
                        HAI GIÀ UN ACCOUNT? <Text style={{ color: '#fff' }}>ACCEDI</Text>
                    </Text>
                </Pressable>
            </ScrollView>
        );
    }

    // ─── Logged In — Dashboard ──────────────────────────────────────
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ padding: 24, paddingTop: 64, paddingBottom: 120 }}>
            {/* Greeting */}
            <View style={{ marginBottom: 32 }}>
                <Text style={s.label}>DASHBOARD</Text>
                <Text style={s.greeting}>{greeting}, {user.name} 👋</Text>
            </View>

            {/* Quick Actions */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
                <Pressable onPress={() => router.push('/(tabs)/create')} style={s.quickAction}>
                    <Text style={{ fontSize: 24, marginBottom: 8 }}>✨</Text>
                    <Text style={s.quickLabel}>Nuovo Viaggio</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/(tabs)/trips')} style={s.quickAction}>
                    <Text style={{ fontSize: 24, marginBottom: 8 }}>📋</Text>
                    <Text style={s.quickLabel}>I Miei Viaggi</Text>
                </Pressable>
            </View>

            {/* Stats */}
            {stats && (
                <View style={{ marginBottom: 32 }}>
                    <Text style={[s.label, { marginBottom: 12 }]}>LE TUE STATISTICHE</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={s.statCard}>
                            <Text style={s.statNumber}>{stats.total_trips || 0}</Text>
                            <Text style={s.statLabel}>Viaggi</Text>
                        </View>
                        <View style={s.statCard}>
                            <Text style={s.statNumber}>{stats.completed_trips || 0}</Text>
                            <Text style={s.statLabel}>Completati</Text>
                        </View>
                        <View style={s.statCard}>
                            <Text style={s.statNumber}>{user.credits}</Text>
                            <Text style={s.statLabel}>Crediti AI</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Recent Trips */}
            {recentTrips.length > 0 && (
                <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={s.label}>ATTIVITÀ RECENTI</Text>
                        <Pressable onPress={() => router.push('/(tabs)/trips')}>
                            <Text style={{ color: '#888', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>VEDI TUTTI →</Text>
                        </Pressable>
                    </View>
                    {recentTrips.map((trip) => (
                        <Pressable
                            key={trip.id}
                            onPress={() => router.push(`/trip/${trip.id}` as any)}
                            style={s.recentCard}
                        >
                            <Text style={{ fontSize: 20, marginRight: 12 }}>{STATUS_EMOJI[trip.status] || '📌'}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{trip.name}</Text>
                                {trip.destination && (
                                    <Text style={{ color: '#666', fontSize: 12, marginTop: 2 }}>📍 {trip.destination}</Text>
                                )}
                            </View>
                            <Text style={{ color: '#333', fontSize: 18 }}>›</Text>
                        </Pressable>
                    ))}
                </View>
            )}

            {/* Empty state if no trips */}
            {recentTrips.length === 0 && !loading && (
                <View style={s.emptyCard}>
                    <Text style={{ fontSize: 40, marginBottom: 12 }}>🌍</Text>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 }}>Pronto a partire?</Text>
                    <Text style={{ color: '#666', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
                        Crea il tuo primo viaggio e lascia che l'AI pianifichi tutto per te.
                    </Text>
                    <Pressable onPress={() => router.push('/(tabs)/create')} style={[s.btnPrimary, { paddingHorizontal: 32 }]}>
                        <Text style={s.btnPrimaryText}>CREA IL TUO PRIMO VIAGGIO</Text>
                    </Pressable>
                </View>
            )}
        </ScrollView>
    );
}

const s = StyleSheet.create({
    center: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroTitle: {
        color: '#fff',
        fontSize: 36,
        fontWeight: '900',
        letterSpacing: -1,
        marginBottom: 8,
    },
    heroSub: {
        color: '#888',
        fontSize: 18,
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: 40,
    },
    featureList: {
        width: '100%',
        marginBottom: 40,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0a0a0a',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
    },
    greeting: {
        color: '#fff',
        fontSize: 26,
        fontWeight: '800',
    },
    label: {
        color: '#666',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 3,
        marginBottom: 4,
    },
    quickAction: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
    },
    quickLabel: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    statCard: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    statNumber: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 4,
    },
    statLabel: {
        color: '#666',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    recentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0a0a0a',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 14,
        padding: 16,
        marginBottom: 8,
    },
    emptyCard: {
        backgroundColor: '#0a0a0a',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        marginTop: 8,
    },
    btnPrimary: {
        backgroundColor: '#fff',
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 10,
    },
    btnPrimaryText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 12,
        letterSpacing: 2,
    },
});
