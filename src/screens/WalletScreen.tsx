import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SOLANA_CLUSTER } from '../constants/solana';
import { COLORS } from '../constants';
import { WalletButton } from '../components/WalletButton';
import { SeekerVerifiedBadge } from '../components/SeekerVerifiedBadge';
import { useSeekerVerification } from '../hooks/useSeekerVerification';
import { useSolanaWallet } from '../hooks/useSolanaWallet';

const PERKS = ['perks2xTitle', 'perksEventsTitle', 'perksChatTitle'] as const;
const PERK_DESCS = ['perks2xDesc', 'perksEventsDesc', 'perksChatDesc'] as const;
const PERK_ICONS = ['⚡', '🎫', '💬'];

export default function WalletScreen() {
  const { t } = useTranslation();
  const { connected } = useSolanaWallet();
  const { verified } = useSeekerVerification();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('wallet.title')}</Text>

      {/* Balance card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{t('wallet.balance')}</Text>
        <Text style={styles.balanceAmount}>0.00 SOL</Text>
        <Text style={styles.cluster}>{SOLANA_CLUSTER}</Text>
      </View>

      {/* Action row */}
      {connected && (
        <View style={styles.actions}>
          {(['send', 'receive', 'swap'] as const).map((action) => (
            <TouchableOpacity key={action} style={styles.actionBtn}>
              <Text style={styles.actionText}>{t(`wallet.${action}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Connect / address display */}
      <WalletButton />

      {/* SGT verification — shown once wallet is connected */}
      {connected && (
        <View style={styles.verificationSection}>
          <SeekerVerifiedBadge />
        </View>
      )}

      {/* Seeker perks panel */}
      <View style={styles.perksCard}>
        <Text style={styles.perksTitle}>
          {verified ? '✅ Seeker Benefits Active' : '🔒 Seeker Benefits'}
        </Text>
        {PERKS.map((perk, i) => (
          <View key={perk} style={styles.perkRow}>
            <Text style={styles.perkIcon}>{PERK_ICONS[i]}</Text>
            <View style={styles.perkText}>
              <Text style={[styles.perkTitle, !verified && styles.locked]}>
                {t(`verification.${perk}`)}
              </Text>
              <Text style={styles.perkDesc}>{t(`verification.${PERK_DESCS[i]}`)}</Text>
            </View>
            {verified && <Text style={styles.check}>✓</Text>}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text },
  balanceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
  },
  balanceLabel: { color: COLORS.textMuted, fontSize: 14, marginBottom: 8 },
  balanceAmount: { color: COLORS.text, fontSize: 36, fontWeight: 'bold' },
  cluster: { color: COLORS.primary, fontSize: 12, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionText: { color: COLORS.text, fontWeight: '600' },
  verificationSection: { alignItems: 'center', paddingVertical: 8 },
  perksCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  perksTitle: { color: COLORS.text, fontWeight: '700', fontSize: 15, marginBottom: 4 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  perkIcon: { fontSize: 22 },
  perkText: { flex: 1 },
  perkTitle: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  locked: { color: COLORS.textMuted },
  perkDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  check: { color: '#22c55e', fontSize: 16, fontWeight: '700' },
});
