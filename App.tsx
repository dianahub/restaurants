/**
 * App.tsx — Pot of Gold root
 *
 * Provider order (outermost → innermost):
 *   SafeAreaProvider
 *     I18nextProvider        ← translations available everywhere
 *       QueryClientProvider  ← react-query
 *         MobileWalletProvider ← MWA on devnet; Seed Vault on real Seeker
 *           AppContent (onboarding gate + main tabs)
 *
 * On real Seeker hardware: Seed Vault wallet is accessed via MWA automatically.
 * Do NOT use the Seed Vault SDK directly — MWA is the only supported path.
 */
import './src/utils/i18n'; // initialise i18next before any component renders

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';
import { I18nextProvider } from 'react-i18next';
import { useTranslation } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MobileWalletProvider } from '@wallet-ui/react-native-web3js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { loadSavedLanguage } from './src/utils/i18n';

import HomeScreen from './src/screens/HomeScreen';
import NearbyScreen from './src/screens/NearbyScreen';
import ChatScreen from './src/screens/ChatScreen';
import WalletScreen from './src/screens/WalletScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { COLORS } from './src/constants';

const ONBOARDING_KEY = 'pot_of_gold:onboarding_complete';
const SOLANA_DEVNET_ENDPOINT = 'https://api.devnet.solana.com';

const APP_IDENTITY = {
  name: 'Pot of Gold',
  uri: 'https://seekerapp.xyz',
  icon: 'favicon.ico',
} as const;

const queryClient = new QueryClient();

export type RootTabParamList = {
  Home: undefined;
  Nearby: undefined;
  Chat: undefined;
  Wallet: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<keyof RootTabParamList, string> = {
  Home: '🏠',
  Nearby: '📍',
  Chat: '💬',
  Wallet: '👛',
  Profile: '👤',
};

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>;
}

function MainTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 62,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused }) => (
          <TabIcon icon={TAB_ICONS[route.name as keyof RootTabParamList]} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('tabs.home') }} />
      <Tab.Screen name="Nearby" component={NearbyScreen} options={{ tabBarLabel: t('tabs.nearby') }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarLabel: t('tabs.chat') }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ tabBarLabel: t('tabs.wallet') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t('tabs.profile') }} />
    </Tab.Navigator>
  );
}

// Handles onboarding gate + language loading before rendering main app
function AppContent() {
  // null = still checking, false = show onboarding, true = show app
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(ONBOARDING_KEY),
      loadSavedLanguage(),
    ]).then(([val]) => {
      setOnboardingDone(val === 'true');
    });
  }, []);

  // Still loading — render nothing (splash screen covers this)
  if (onboardingDone === null) return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;

  if (!onboardingDone) {
    return <OnboardingScreen onComplete={() => setOnboardingDone(true)} />;
  }

  return (
    <NavigationContainer>
      <MainTabs />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <MobileWalletProvider
            chain="solana:devnet"
            endpoint={SOLANA_DEVNET_ENDPOINT}
            identity={APP_IDENTITY}
          >
            <AppContent />
            <StatusBar style="light" />
          </MobileWalletProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
