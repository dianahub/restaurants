import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useMobileWallet } from '@wallet-ui/react-native-web3js';
import { useTranslation } from 'react-i18next';
import type { Transaction, VersionedTransaction } from '@solana/web3.js';

// .skr domains are issued by Seeker platform through MWA account labels.
// The wallet's `account.label` field carries the .skr username when assigned.
function resolveSkrDomain(label?: string): string | null {
  if (!label) return null;
  const trimmed = label.trim();
  return trimmed.endsWith('.skr') ? trimmed : null;
}

export interface SolanaWalletState {
  account: ReturnType<typeof useMobileWallet>['account'];
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: ReturnType<typeof useMobileWallet>['signAndSendTransaction'];
  isSeekerDevice: boolean;
  skrDomain: string | null;
  userLanguage: string;
}

/**
 * Wraps useMobileWallet with Seeker-specific context:
 *  - isSeekerDevice  → true when running on real Seeker hardware
 *  - skrDomain       → .skr username from the connected account label (null if unavailable)
 *  - userLanguage    → active i18n locale (es | en)
 *
 * On a real Seeker the Seed Vault wallet is accessed exclusively through MWA —
 * never call the Seed Vault SDK directly. Biometric approval is handled by the OS.
 * For emulator testing install the Mock MWA Wallet:
 *   https://github.com/solana-mobile/mock-mwa-wallet
 */
export function useSolanaWallet(): SolanaWalletState {
  const { account, accounts, connect, disconnect, signAndSendTransaction } = useMobileWallet();
  const { i18n } = useTranslation();

  // Real Seeker hardware reports Model as "Seeker"
  const isSeekerDevice =
    Platform.OS === 'android' &&
    (Platform.constants as Record<string, unknown>)?.Model === 'Seeker';

  const skrDomain = resolveSkrDomain(account?.label);
  const connected = (accounts?.length ?? 0) > 0;

  const handleConnect = useCallback(async () => {
    await connect();
  }, [connect]);

  const handleDisconnect = useCallback(async () => {
    await disconnect();
  }, [disconnect]);

  return {
    account,
    connected,
    connect: handleConnect,
    disconnect: handleDisconnect,
    signAndSendTransaction,
    isSeekerDevice,
    skrDomain,
    userLanguage: i18n.language,
  };
}
