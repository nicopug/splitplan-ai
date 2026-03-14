import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, signOut } = useAuth();

    const handleLogout = async () => {
        await signOut();
        router.replace('/auth');
    };

    if (!user) {
        return (
            <View style={s.center}>
                <Text style={{ fontSize: 48, marginBottom: 24 }}>👤</Text>
                <Text style={[s.title, { marginBottom: 8 }]}>Il tuo Profilo</Text>
                <Text style={[s.sub, { textAlign: 'center', marginBottom: 32 }]}>
                    Accedi per visualizzare il tuo profilo{'\n'}e le impostazioni.
                </Text>
                <Pressable onPress={() => router.push('/auth')} style={s.btnPrimary}>
                    <Text style={s.btnPrimaryText}>ACCEDI</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ padding: 24, paddingTop: 80 }}>
            {/* Header */}
            <View style={{ marginBottom: 40 }}>
                <Text style={s.label}>ACCOUNT</Text>
                <Text style={s.title}>Il tuo Profilo</Text>
            </View>

            {/* Avatar */}
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
                <View style={s.avatar}>
                    <Text style={{ fontSize: 36, color: '#fff' }}>
                        {user.name?.[0]?.toUpperCase() || '?'}
                    </Text>
                </View>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 16 }}>
                    {user.name} {user.surname}
                </Text>
                <Text style={{ color: '#888', fontSize: 14, marginTop: 4 }}>{user.email}</Text>
            </View>

            {/* Info Card */}
            <View style={s.card}>
                <View style={[s.row, { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }]}>
                    <Text style={s.rowLabel}>PIANO</Text>
                    <Text style={s.rowValue}>
                        {user.is_subscribed ? (user.subscription_plan === 'ANNUAL' ? 'Pro Annuale' : 'Pro Mensile') : 'Free'}
                    </Text>
                </View>
                <View style={s.row}>
                    <Text style={s.rowLabel}>CREDITI AI</Text>
                    <Text style={s.rowValue}>{user.credits} 🪙</Text>
                </View>
            </View>

            {/* Logout */}
            <Pressable onPress={handleLogout} style={s.btnDanger}>
                <Text style={{ color: '#f87171', fontWeight: '700', fontSize: 12, letterSpacing: 2 }}>ESCI</Text>
            </Pressable>

            {/* Version */}
            <Text style={{ color: '#333', fontSize: 10, textAlign: 'center', marginTop: 40, letterSpacing: 2 }}>
                SPLITPLAN AI v1.0.0
            </Text>
        </ScrollView>
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
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        backgroundColor: '#0a0a0a',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    rowLabel: {
        color: '#666',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2,
    },
    rowValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
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
    btnDanger: {
        backgroundColor: 'rgba(248,113,113,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(248,113,113,0.2)',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 24,
    },
});
