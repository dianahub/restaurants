import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SOLANA_CLUSTER } from '../constants/solana';
import { COLORS } from '../constants';
import { WalletButton } from '../components/WalletButton';
import { SeekerVerifiedBadge } from '../components/SeekerVerifiedBadge';
import { useSeekerVerification } from '../hooks/useSeekerVerification';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { DEMO_WALLET } from '../utils/demo';

const PERKS = ['perks2xTitle', 'perksEventsTitle', 'perksChatTitle'] as const;
const PERK_DESCS = ['perks2xDesc', 'perksEventsDesc', 'perksChatDesc'] as const;
const PERK_ICONS = ['⚡', '🎫', '💬'];

function useCountUp(target: number, decimals = 3, durationMs = 1400) {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const steps = 40;
    const increment = target / steps;
    const delay = durationMs / steps;
    let current = 0;
    let count = 0;

    const id = setInterval(() => {
      count++;
      current = count >= steps ? target : current + increment;
      setValue(parseFloat(current.toFixed(decimals + 2)));
      if (count >= steps) clearInterval(id);
    }, delay);

    return () => clearInterval(id);
  }, [target]);

  return value;
}

export default function WalletScreen() {
  const { t, i18n } = useTranslation();
  const { connected } = useSolanaWallet();
  const { verified } = useSeekerVerification();

  const lang = i18n.language.startsWith('es') ? 'es' : 'en';

  const animatedXaum = useCountUp(DEMO_WALLET.xaumBalance, 4);
  const animatedSol = useCountUp(DEMO_WALLET.solBalance, 2);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('wallet.title')}</Text>

      {/* XAUm gold balance (primary) */}
      <View style={styles.goldCard}>
        <Text style={styles.goldLabel}>
          {lang === 'es' ? 'Oro XAUm' : 'XAUm Gold'}
        </Text>
        <Text style={styles.goldAmount}>{animatedXaum.toFixed(4)} XAUm</Text>
        <Text style={styles.goldUsd}>${DEMO_WALLET.xaumUsdValue.toFixed(2)}</Text>
        <View style={styles.goldPriceRow}>
          <Text style={styles.goldPriceLabel}>
            {lang === 'es' ? 'Precio del oro:' : 'Gold price:'}
          </Text>
          <Text style={styles.goldPrice}>${DEMO_WALLET.goldPrice.toLocaleString()}/oz</Text>
        </View>
      </View>

      {/* SOL balance card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{t('wallet.balance')}</Text>
        <Text style={styles.balanceAmount}>{animatedSol.toFixed(2)} SOL</Text>
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

      {/* SGT verification */}
      {connected && (
        <View style={styles.verificationSection}>
          <SeekerVerifiedBadge />
        </View>
      )}

      {/* NFT tickets */}
      <View style={styles.nftCard}>
        <Text style={styles.nftTitle}>{t('wallet.nftCollection')}</Text>
        <View style={styles.nftRow}>
          {Array.from({ length: DEMO_WALLET.ticketNFTs }, (_, i) => (
            <View key={i} style={styles.nftItem}>
              <Text style={styles.nftIcon}>🎫</Text>
              <Text style={styles.nftLabel}>Ticket #{i + 1}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Seeker perks */}
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

  goldCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.gold + '66',
    gap: 4,
  },
  goldLabel: { color: COLORS.textMuted, fontSize: 13 },
  goldAmount: { color: COLORS.gold, fontSize: 34, fontWeight: '900' },
  goldUsd: { color: COLORS.textMuted, fontSize: 16, marginTop: 2 },
  goldPriceRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  goldPriceLabel: { color: COLORS.textMuted, fontSize: 12 },
  goldPrice: { color: COLORS.gold, fontSize: 12, fontWeight: '600' },

  balanceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
  },
  balanceLabel: { color: COLORS.textMuted, fontSize: 14, marginBottom: 6 },
  balanceAmount: { color: COLORS.text, fontSize: 28, fontWeight: 'bold' },
  cluster: { color: COLORS.primary, fontSize: 11, marginTop: 6, textTransform: 'uppercase', letterSpacing: 1 },

  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionText: { color: COLORS.text, fontWeight: '600' },

  verificationSection: { alignItems: 'center', paddingVertical: 4 },

  nftCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  nftTitle: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
  nftRow: { flexDirection: 'row', gap: 10 },
  nftItem: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nftIcon: { fontSize: 28 },
  nftLabel: { color: COLORS.textMuted, fontSize: 11 },

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
  check: { color: COLORS.success, fontSize: 16, fontWeight: '700' },
});
