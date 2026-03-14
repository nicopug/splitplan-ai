import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { getUserTrips, hideTrip } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';

type Trip = {
  id: number;
  name: string;
  destination: string | null;
  status: string;
  trip_type: string;
  start_date: string | null;
  end_date: string | null;
  num_people: number;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  SURVEY: { label: 'SONDAGGIO', color: '#f59e0b' },
  VOTING: { label: 'VOTAZIONE', color: '#3b82f6' },
  CONSENSUS_REACHED: { label: 'CONSENSO', color: '#06b6d4' },
  LOGISTICS: { label: 'LOGISTICA', color: '#f97316' },
  BOOKED: { label: 'PRENOTATO', color: '#10b981' },
  COMPLETED: { label: 'ARCHIVIATO', color: '#888' },
};

export default function TripsScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  const loadTrips = useCallback(async () => {
    try {
      const data = await getUserTrips();
      setTrips(data);
    } catch (e) {
      console.error('Failed to load trips:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user) loadTrips();
    else setLoading(false);
  }, [user, authLoading]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTrips();
  }, [loadTrips]);

  const handleDeleteTrip = async (id: number, name: string) => {
    Alert.alert(
      'Cancella Viaggio',
      `Sei sicuro di voler nascondere "${name}" dalla tua cronologia?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Cancella',
          style: 'destructive',
          onPress: async () => {
            try {
              await hideTrip(id);
              loadTrips();
            } catch (e: any) {
              Alert.alert('Errore', e.message);
            }
          }
        },
      ]
    );
  };

  const filteredTrips = useMemo(() => {
    if (activeTab === 'active') {
      return trips.filter(t => t.status !== 'COMPLETED').reverse();
    } else {
      return trips.filter(t => t.status === 'COMPLETED').reverse();
    }
  }, [trips, activeTab]);

  if (authLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={s.center}>
        <Text style={[s.label, { marginBottom: 12 }]}>SPLITPLAN AI</Text>
        <Text style={[s.title, { marginBottom: 12 }]}>I Tuoi Viaggi</Text>
        <Text style={[s.subtitle, { marginBottom: 32, textAlign: 'center', lineHeight: 22 }]}>
          Accedi o registrati per vedere e{'\n'}gestire i tuoi viaggi.
        </Text>
        <Pressable onPress={() => router.push('/auth')} style={s.btnPrimary}>
          <Text style={s.btnPrimaryText}>ACCEDI</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={[s.label, { marginTop: 16 }]}>CARICAMENTO...</Text>
      </View>
    );
  }

  const renderTrip = ({ item }: { item: Trip }) => {
    const status = STATUS_LABELS[item.status] || { label: item.status, color: '#6b7280' };
    const isCompleted = item.status === 'COMPLETED';

    return (
      <Pressable
        onPress={() => router.push(`/trip/${item.id}` as any)}
        style={[s.card, isCompleted && { opacity: 0.8 }]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View style={[s.badge, { backgroundColor: status.color + '20' }]}>
                <Text style={[s.badgeText, { color: status.color }]}>{status.label}</Text>
              </View>
              <Text style={s.label}>
                {item.trip_type === 'SOLO' ? '✈️ SOLO' : `👥 ${item.num_people}`}
              </Text>
            </View>
            <Text style={s.cardTitle}>{item.name}</Text>
            {item.destination && <Text style={s.cardDest}>📍 {item.destination}</Text>}
          </View>

          <Pressable
            onPress={() => handleDeleteTrip(item.id, item.name)}
            style={s.deleteBtn}
          >
            <Ionicons name="trash-outline" size={18} color="#eb445a" />
          </Pressable>
        </View>

        {item.start_date && item.end_date && (
          <View style={s.cardFooter}>
            <Text style={s.label}>
              📅 {new Date(item.start_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
              {' → '}
              {new Date(item.end_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 16 }}>
        <Text style={s.label}>DASHBOARD</Text>
        <Text style={s.title}>I Miei Viaggi</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabContainer}>
        <Pressable
          onPress={() => setActiveTab('active')}
          style={[s.tab, activeTab === 'active' && s.tabActive]}
        >
          <Text style={[s.tabText, activeTab === 'active' && s.tabTextActive]}>ATTIVI</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('archived')}
          style={[s.tab, activeTab === 'archived' && s.tabActive]}
        >
          <Text style={[s.tabText, activeTab === 'archived' && s.tabTextActive]}>ARCHIVIO</Text>
        </Pressable>
      </View>

      <FlatList
        data={filteredTrips}
        renderItem={renderTrip}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        ListEmptyComponent={
          <View style={{ marginTop: 60, alignItems: 'center' }}>
            <Text style={{ fontSize: 48, marginBottom: 20 }}>🛸</Text>
            <Text style={s.subtitle}>Nessun viaggio trovato in questa sezione.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      />
    </View>
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
  subtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
  label: {
    color: '#666',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#fff',
  },
  tabText: {
    color: '#666',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  tabTextActive: {
    color: '#000',
  },
  card: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDest: {
    color: '#888',
    fontSize: 14,
  },
  cardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(235, 68, 90, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
