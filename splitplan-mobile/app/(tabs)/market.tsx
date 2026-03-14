import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';

const { width } = Dimensions.get('window');

const PACKS = [
    { id: 'credit_1', title: '1 Credito', desc: 'Sblocca un viaggio Premium', price: '€3,99', emoji: '🪙', color: '#fbbf24' },
    { id: 'credit_3', title: '3 Crediti', desc: 'Risparmia il 25%', price: '€8,99', emoji: '🪙🪙🪙', color: '#3b82f6', popular: true },
    { id: 'sub_monthly', title: 'SplitPlan Pro Mensile', desc: 'Accesso illimitato\nper 1 mese', price: '€4,99/mese', emoji: '💎', color: '#8b5cf6' },
    { id: 'sub_annual', title: 'Piano Annuale', desc: 'Il miglior valore per\ngrandi viaggiatori', price: '€29,99/anno', emoji: '👑', color: '#f59e0b', dark: true },
];

export default function MarketScreen() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleAction = (id: string) => {
        // In a real mobile app, here we would integrate with RevenueCat or Apple/Google Pay
        // For now, we mimic the web behavior or show a placeholder
        console.log('Action for:', id);
    };

    return (
        <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 100 }}>
            {/* Header Widget */}
            <LinearGradient
                colors={['#0a0a0a', '#111']}
                style={s.header}
            >
                <View style={s.headerContent}>
                    <Text style={s.subheading}>SPLITPLAN MARKET</Text>
                    <Text style={s.title}>Potenzia i tuoi <Text style={{ color: '#3b82f6' }}>Viaggi</Text></Text>
                    <Text style={s.subtitle}>Scegli come vivere la tua prossima avventura.</Text>
                </View>
            </LinearGradient>

            {/* Credit Status Card */}
            <View style={s.walletContainer}>
                <View style={s.walletCard}>
                    <View>
                        <Text style={s.walletLabel}>SALDO ATTUALE</Text>
                        <Text style={s.walletValue}>🪙 {user?.credits || 0}</Text>
                        <Text style={s.walletSub}>Crediti disponibili</Text>
                    </View>
                    <Ionicons name="sparkles" size={32} color="#3b82f6" style={{ opacity: 0.5 }} />
                </View>
            </View>

            {/* Grid Packs */}
            <View style={s.grid}>
                {PACKS.map((pack) => (
                    <Pressable
                        key={pack.id}
                        style={[s.packCard, pack.popular && s.packCardPopular, pack.dark && { backgroundColor: '#151515' }]}
                        onPress={() => handleAction(pack.id)}
                    >
                        {pack.popular && (
                            <View style={s.popularBadge}>
                                <Text style={s.popularText}>I PIÙ SCELTI</Text>
                            </View>
                        )}
                        <View style={[s.emojiBox, { backgroundColor: pack.color + '15' }]}>
                            <Text style={{ fontSize: 32 }}>{pack.emoji}</Text>
                        </View>
                        <Text style={s.packTitle}>{pack.title}</Text>
                        <Text style={s.packDesc}>{pack.desc}</Text>

                        <View style={s.packFooter}>
                            <Text style={s.packPrice}>{pack.price}</Text>
                            <View style={[s.buyBtn, pack.popular && s.buyBtnPopular]}>
                                <Text style={[s.buyBtnText, pack.popular && { color: '#fff' }]}>ACQUISTA</Text>
                            </View>
                        </View>
                    </Pressable>
                ))}
            </View>

            {/* Features List */}
            <View style={s.featuresContainer}>
                <Text style={s.featuresTitle}>PERCHÉ <Text style={{ color: '#3b82f6' }}>PRO?</Text></Text>
                <View style={s.featuresList}>
                    {["Itinerari AI Illimitati", "PDF Automation", "Chat Butler AI 24/7", "Mappe Offline & Export"].map((f, i) => (
                        <View key={i} style={s.featureItem}>
                            <Ionicons name="flash" size={14} color="#3b82f6" />
                            <Text style={s.featureText}>{f}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        paddingTop: 80,
        paddingBottom: 40,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerContent: {
        alignItems: 'center',
        textAlign: 'center',
    },
    subheading: {
        color: '#3b82f6',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 3,
        marginBottom: 12,
    },
    title: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        color: '#888',
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    walletContainer: {
        padding: 24,
        marginTop: -20,
    },
    walletCard: {
        backgroundColor: '#0a0a0a',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 24,
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    walletLabel: {
        color: '#666',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
        marginBottom: 4,
    },
    walletValue: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '900',
        marginBottom: 2,
    },
    walletSub: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 12,
        justifyContent: 'center',
    },
    packCard: {
        width: width / 2 - 20,
        backgroundColor: '#0a0a0a',
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        padding: 20,
        margin: 8,
        alignItems: 'center',
    },
    packCardPopular: {
        borderColor: 'rgba(59, 130, 246, 0.3)',
        backgroundColor: '#0d0d12',
    },
    popularBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#3b82f6',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderBottomLeftRadius: 16,
        borderTopRightRadius: 31,
    },
    popularText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: '900',
    },
    emojiBox: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    packTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 4,
    },
    packDesc: {
        color: '#666',
        fontSize: 11,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 14,
    },
    packFooter: {
        marginTop: 'auto',
        width: '100%',
        alignItems: 'center',
    },
    packPrice: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 12,
    },
    buyBtn: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
    },
    buyBtnPopular: {
        backgroundColor: '#3b82f6',
    },
    buyBtnText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    featuresContainer: {
        margin: 24,
        padding: 24,
        backgroundColor: 'rgba(59, 130, 246, 0.03)',
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.1)',
    },
    featuresTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 16,
        textAlign: 'center',
    },
    featuresList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '45%',
    },
    featureText: {
        color: '#888',
        fontSize: 11,
        fontWeight: '700',
    },
});
