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
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const PLANS = [
    {
        id: 'FREE',
        title: 'Free',
        desc: 'Esplora le basi della pianificazione',
        price: '€0',
        emoji: '✈️',
        color: '#666',
        features: ['1 Viaggio Attivo', 'Itinerari Standard', 'Votazioni Gruppo']
    },
    {
        id: 'MONTHLY',
        title: 'Pro Mensile',
        desc: 'Potenza illimitata per i tuoi viaggi',
        price: '€4,99/mese',
        emoji: '💎',
        color: '#8b5cf6',
        popular: true,
        features: ['Viaggi Illimitati', 'AI Premium Butler', 'Mappe Offline', 'Sconti Partner']
    },
    {
        id: 'ANNUAL',
        title: 'Pro Annuale',
        desc: 'Il miglior valore per veri esploratori',
        price: '€29,99/anno',
        emoji: '👑',
        color: '#f59e0b',
        features: ['Tutto del piano Mensile', '2 Mesi Gratis', 'Supporto Prioritario']
    },
];

export default function OnboardingPricingScreen() {
    const router = useRouter();
    const [selected, setSelected] = useState('MONTHLY');

    const handleContinue = () => {
        // Qui si potrebbe chiamare l'API per impostare il piano iniziale o avviare checkout
        router.replace('/(tabs)');
    };

    return (
        <View style={s.container}>
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
                <View style={s.header}>
                    <Text style={s.subheading}>BENVENUTO SU SPLITPLAN</Text>
                    <Text style={s.title}>Scegli il tuo <Text style={{ color: '#3b82f6' }}>Piano</Text></Text>
                    <Text style={s.subtitle}>Inizia la tua prossima avventura con il piede giusto.</Text>
                </View>

                <View style={s.plansContainer}>
                    {PLANS.map((plan) => (
                        <Pressable
                            key={plan.id}
                            style={[
                                s.planCard,
                                selected === plan.id && { borderColor: plan.color, backgroundColor: 'rgba(255,255,255,0.03)' }
                            ]}
                            onPress={() => setSelected(plan.id)}
                        >
                            {plan.popular && (
                                <View style={[s.popularBadge, { backgroundColor: plan.color }]}>
                                    <Text style={s.popularText}>CONSIGLIATO</Text>
                                </View>
                            )}

                            <View style={s.planHeader}>
                                <View style={[s.emojiBox, { backgroundColor: plan.color + '20' }]}>
                                    <Text style={{ fontSize: 24 }}>{plan.emoji}</Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 16 }}>
                                    <Text style={s.planTitle}>{plan.title}</Text>
                                    <Text style={s.planPrice}>{plan.price}</Text>
                                </View>
                                <View style={[s.radio, selected === plan.id && { borderColor: plan.color }]}>
                                    {selected === plan.id && <View style={[s.radioInner, { backgroundColor: plan.color }]} />}
                                </View>
                            </View>

                            <Text style={s.planDesc}>{plan.desc}</Text>

                            {selected === plan.id && (
                                <View style={s.featuresList}>
                                    {plan.features.map((f, i) => (
                                        <View key={i} style={s.featureItem}>
                                            <Ionicons name="checkmark-circle" size={16} color={plan.color} />
                                            <Text style={s.featureText}>{f}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </Pressable>
                    ))}
                </View>
            </ScrollView>

            <View style={s.footer}>
                <Pressable style={s.btnContinue} onPress={handleContinue}>
                    <Text style={s.btnContinueText}>INIZIA A PIANIFICARE</Text>
                </Pressable>
                <Text style={s.footerNote}>Puoi cambiare piano in qualsiasi momento dal Market.</Text>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 24,
        alignItems: 'center',
        marginBottom: 32,
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
        lineHeight: 20,
    },
    plansContainer: {
        paddingHorizontal: 20,
        gap: 16,
    },
    planCard: {
        backgroundColor: '#0a0a0a',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
    },
    popularBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderBottomLeftRadius: 16,
    },
    popularText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: '900',
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    emojiBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    planTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
    planPrice: {
        color: '#888',
        fontSize: 14,
        fontWeight: '600',
    },
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    planDesc: {
        color: '#666',
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 12,
    },
    featuresList: {
        marginTop: 8,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        gap: 8,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    featureText: {
        color: '#aaa',
        fontSize: 13,
        fontWeight: '500',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#000',
        padding: 24,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    btnContinue: {
        backgroundColor: '#fff',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    btnContinueText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
    },
    footerNote: {
        color: '#555',
        fontSize: 11,
        textAlign: 'center',
    },
});
