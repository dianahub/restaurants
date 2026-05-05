import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from '../utils/i18n';
import { SOLANA_CLUSTER } from '../constants/solana';

export default function WalletScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('wallet.title')}</Text>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{t('wallet.balance')}</Text>
        <Text style={styles.balanceAmount}>0.00 SOL</Text>
        <Text style={styles.cluster}>{SOLANA_CLUSTER}</Text>
      </View>

      <View style={styles.actions}>
        {(['send', 'receive', 'swap'] as const).map((action) => (
          <TouchableOpacity key={action} style={styles.actionBtn}>
            <Text style={styles.actionText}>{t(`wallet.${action}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.connectBtn}>
        <Text style={styles.connectText}>{t('wallet.connectWallet')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 24 },
  balanceCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#9945FF44',
  },
  balanceLabel: { color: '#9ca3af', fontSize: 14, marginBottom: 8 },
  balanceAmount: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  cluster: { color: '#9945FF', fontSize: 12, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff1a',
  },
  actionText: { color: '#fff', fontWeight: '600' },
  connectBtn: { backgroundColor: '#9945FF', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  connectText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
