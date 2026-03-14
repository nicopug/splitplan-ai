import React, { useState, useRef, useEffect } from 'react';
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
import { chatWithAI } from '@/lib/api';

type Message = {
    id: string;
    role: 'user' | 'ai';
    text: string;
};

export default function ChatScreen() {
    const { tripId } = useLocalSearchParams<{ tripId: string }>();
    const router = useRouter();

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'ai',
            text: "Ciao! Sono il tuo assistente AI. Come posso aiutarti con l'itinerario oggi?",
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        // Scroll to bottom on new message
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages]);

    const handleSend = async () => {
        if (!inputText.trim() || loading) return;

        const userText = inputText.trim();
        const newUserMsg: Message = { id: Date.now().toString(), role: 'user', text: userText };
        setMessages((prev) => [...prev, newUserMsg]);
        setInputText('');
        setLoading(true);

        try {
            // Map frontend messages to backend history format
            const history = messages.map(m => ({ role: m.role, text: m.text }));

            const res = await chatWithAI(Number(tripId), userText, history);

            const newAiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: res.reply || "Itinerario aggiornato!",
            };
            setMessages((prev) => [...prev, newAiMsg]);
        } catch (e: any) {
            Alert.alert('Errore', e.message || 'Errore di comunicazione con l\'assistente.');
            // Remove the user message if failed? Optional.
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1, backgroundColor: '#000' }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={{ padding: 24, paddingBottom: 32, flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
            >
                {messages.map((msg) => (
                    <View
                        key={msg.id}
                        style={[
                            s.messageBubble,
                            msg.role === 'user' ? s.userBubble : s.aiBubble,
                        ]}
                    >
                        {msg.role === 'ai' && <Text style={{ fontSize: 20, marginRight: 8 }}>🤖</Text>}
                        <Text style={{ color: msg.role === 'user' ? '#000' : '#fff', fontSize: 15, flex: 1, lineHeight: 22 }}>
                            {msg.text}
                        </Text>
                    </View>
                ))}

                {loading && (
                    <View style={[s.messageBubble, s.aiBubble, { paddingVertical: 16, width: 80, justifyContent: 'center' }]}>
                        <ActivityIndicator color="#fff" size="small" />
                    </View>
                )}
            </ScrollView>

            {/* Input Area */}
            <View style={s.inputContainer}>
                <TextInput
                    style={s.input}
                    placeholder="Chiedi di modificare l'itinerario..."
                    placeholderTextColor="#666"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={500}
                />
                <Pressable
                    onPress={handleSend}
                    disabled={!inputText.trim() || loading}
                    style={[
                        s.sendBtn,
                        (!inputText.trim() || loading) && { opacity: 0.5 },
                    ]}
                >
                    <Text style={{ fontSize: 20 }}>⬆️</Text>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    messageBubble: {
        maxWidth: '85%',
        padding: 16,
        borderRadius: 20,
        marginBottom: 16,
        flexDirection: 'row',
    },
    userBubble: {
        backgroundColor: '#fff',
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        backgroundColor: '#0a0a0a',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    input: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 24,
        minHeight: 48,
        maxHeight: 120,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 14,
        color: '#fff',
        fontSize: 15,
        marginRight: 12,
    },
    sendBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
