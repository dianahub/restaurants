import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  GestureResponderEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { COLORS } from '../constants';

function ellipsifyAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

interface WalletButtonProps {
  /** Override the displayed label (bypasses auto label logic) */
  label?: string;
  onConnected?: () => void;
}

/**
 * Bilingual wallet connect/disconnect button.
 *
 * - Disconnected: shows "Connect Wallet" / "Conectar Billetera"
 * - Connected:    shows truncated address (4…4) or .skr domain if available
 * - Long press when connected → disconnects
 * - Gold "SEEKER" badge appears on real Seeker hardware (isSeekerDevice)
 *
 * Must be rendered inside MobileWalletProvider and I18nextProvider.
 */
export function WalletButton({ label: labelOverride, onConnected }: WalletButtonProps) {
  const { t } = useTranslation();
  const { account, connected, connect, disconnect, isSeekerDevice, skrDomain } =
    useSolanaWallet();

  const [loading, setLoading] = React.useState(false);

  const displayLabel = React.useMemo(() => {
    if (labelOverride) return labelOverride;
    if (!connected) return t('wallet.connectWallet');
    if (skrDomain) return skrDomain;
    if (account?.address) return ellipsifyAddress(account.address.toString());
    return t('wallet.connectWallet');
  }, [labelOverride, connected, skrDomain, account, t]);

  const handlePress = async () => {
    if (connected) return;
    setLoading(true);
    try {
      await connect();
      onConnected?.();
    } finally {
      setLoading(false);
    }
  };

  const handleLongPress = async (_e: GestureResponderEvent) => {
    if (!connected) return;
    setLoading(true);
    try {
      await disconnect();
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={[styles.button, connected ? styles.connected : styles.disconnected]}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.text} size="small" />
      ) : (
        <Text style={[styles.label, connected && styles.labelConnected]} numberOfLines={1}>
          {displayLabel}
        </Text>
      )}

      {isSeekerDevice && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>SEEKER</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
    minWidth: 160,
  },
  disconnected: {
    backgroundColor: COLORS.primary,
  },
  connected: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  label: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  labelConnected: {
    color: COLORS.primaryLight,
  },
  // Gold hardware badge — only shown on real Seeker device
  badge: {
    backgroundColor: '#F5C518',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
