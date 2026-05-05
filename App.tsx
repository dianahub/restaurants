/**
 * App.tsx — SeekerApp root
 *
 * Provider order (outermost → innermost):
 *   SafeAreaProvider
 *     I18nextProvider        ← translations available everywhere
 *       QueryClientProvider  ← react-query (used by template Solana hooks)
 *         MobileWalletProvider ← MWA on devnet; Seed Vault on real Seeker
 *           NavigationContainer
 *             MainTabs (5 bottom tabs, labels translated)
 *
 * On real Seeker hardware: Seed Vault wallet is accessed via MWA automatically.
 * Do NOT use the Seed Vault SDK directly — MWA is the only supported path.
 * For emulator: install Mock MWA Wallet → github.com/solana-mobile/mock-mwa-wallet
 */
import './src/utils/i18n'; // initialise i18next before any component renders

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';
import { I18nextProvider } from 'react-i18next';
import { useTranslation } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MobileWalletProvider } from '@wallet-ui/react-native-web3js';
import i18n from './src/utils/i18n';

import HomeScreen from './src/screens/HomeScreen';
import NearbyScreen from './src/screens/NearbyScreen';
import ChatScreen from './src/screens/ChatScreen';
import WalletScreen from './src/screens/WalletScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { COLORS } from './src/constants';

const SOLANA_DEVNET_ENDPOINT = 'https://api.devnet.solana.com';

const APP_IDENTITY = {
  name: 'Seeker App',
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
          backgroundColor: '#1a1a2e',
          borderTopColor: '#ffffff1a',
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
            <NavigationContainer>
              <MainTabs />
            </NavigationContainer>
            <StatusBar style="light" />
          </MobileWalletProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
