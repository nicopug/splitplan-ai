import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { AuthProvider } from '@/context/AuthContext';

// Force full dark theme
const SplitPlanDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#000',
    card: '#000',
    text: '#fff',
    border: 'rgba(255,255,255,0.05)',
    primary: '#fff',
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={SplitPlanDark}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="auth"
            options={{
              headerShown: false,
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="pricing"
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
            }}
          />
          <Stack.Screen
            name="trip/[id]"
            options={{
              headerShown: true,
              headerBackTitle: 'Indietro',
              headerTitle: '',
              headerStyle: { backgroundColor: '#000' },
              headerTintColor: '#fff',
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="survey/[tripId]"
            options={{
              headerShown: true,
              headerBackTitle: 'Indietro',
              headerTitle: 'Preferenze',
              headerStyle: { backgroundColor: '#000' },
              headerTintColor: '#fff',
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="expense/[tripId]"
            options={{
              presentation: 'modal',
              headerShown: true,
              headerTitle: 'Aggiungi Spesa',
              headerStyle: { backgroundColor: '#0a0a0a' },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen
            name="chat/[tripId]"
            options={{
              headerShown: true,
              headerBackTitle: 'Indietro',
              headerTitle: 'SplitPlan AI',
              headerStyle: { backgroundColor: '#000' },
              headerTintColor: '#fff',
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </AuthProvider>
  );
}
