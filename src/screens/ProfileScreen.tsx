import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants';
import { SGT_REWARD_MULTIPLIER } from '../constants/sgt';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { useSeekerVerification } from '../hooks/useSeekerVerification';
import { SeekerVerifiedBadge } from '../components/SeekerVerifiedBadge';
import { saveLanguage } from '../utils/i18n';
import { DEMO_WALLET } from '../utils/demo';

const MENU_ITEMS = ['settings', 'notifications', 'privacy', 'help'] as const;

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { connected, isSeekerDevice, skrDomain, account } = useSolanaWallet();
  const { verified, mintAddress } = useSeekerVerification();

  const lang = i18n.language.startsWith('es') ? 'es' : 'en';
  const multiplier = verified ? SGT_REWARD_MULTIPLIER : 1;

  const displayName = skrDomain ?? (account?.address ? `${account.address.toString().slice(0, 6)}…` : null);

  const toggleLanguage = async () => {
    await saveLanguage(lang === 'es' ? 'en' : 'es');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header row: title + language toggle */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('profile.title')}</Text>
        <TouchableOpacity style={styles.langToggle} onPress={toggleLanguage}>
          <Text style={styles.langFlag}>{lang === 'es' ? '🇪🇸' : '🇺🇸'}</Text>
          <Text style={styles.langCode}>{lang.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar + badges */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatar, verified && styles.avatarVerified]}>
          <Text style={styles.avatarText}>🥇</Text>
        </View>
        {displayName && <Text style={styles.displayName}>{displayName}</Text>}
        <View style={styles.badgeRow}>
          {isSeekerDevice && (
            <View style={styles.hardwareBadge}>
              <Text style={styles.hardwareBadgeText}>SEEKER</Text>
            </View>
          )}
          <SeekerVerifiedBadge />
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{t('profile.streak', { count: DEMO_WALLET.streak })}</Text>
          <Text style={styles.statLabel}>🔥</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{t('profile.rank', { rank: DEMO_WALLET.rank })}</Text>
          <Text style={styles.statLabel}>🏆</Text>
        </View>
        <View style={[styles.stat, verified && styles.statGold]}>
          <Text style={[styles.statValue, verified && styles.statValueGold]}>
            {multiplier}×
          </Text>
          <Text style={styles.statLabel}>Gold</Text>
        </View>
      </View>

      {/* XAUm balance card */}
      <View style={styles.xaumCard}>
        <View style={styles.xaumRow}>
          <Text style={styles.xaumLabel}>{t('profile.xaum', { amount: DEMO_WALLET.xaumBalance })}</Text>
          <Text style={styles.xaumUsd}>${DEMO_WALLET.xaumUsdValue.toFixed(2)}</Text>
        </View>
        <Text style={styles.xaumSub}>
          {lang === 'es' ? 'respaldado por oro real' : 'backed by real gold'} 🥇
        </Text>
      </View>

      {/* SGT mint address */}
      {verified && mintAddress && (
        <View style={styles.mintCard}>
          <Text style={styles.mintLabel}>SGT Mint</Text>
          <Text style={styles.mintAddress} numberOfLines={1} ellipsizeMode="middle">
            {mintAddress}
          </Text>
        </View>
      )}

      {/* Language section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
        <View style={styles.langRow}>
          <TouchableOpacity
            style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
            onPress={() => saveLanguage('en')}
          >
            <Text style={styles.langBtnFlag}>🇺🇸</Text>
            <Text style={[styles.langBtnText, lang === 'en' && styles.langBtnTextActive]}>English</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, lang === 'es' && styles.langBtnActive]}
            onPress={() => saveLanguage('es')}
          >
            <Text style={styles.langBtnFlag}>🇪🇸</Text>
            <Text style={[styles.langBtnText, lang === 'es' && styles.langBtnTextActive]}>Español</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity key={item} style={styles.menuItem}>
            <Text style={styles.menuLabel}>{t(`profile.${item}`)}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {connected && (
        <TouchableOpacity style={styles.logoutBtn}>
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, alignItems: 'center', gap: 20 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langFlag: { fontSize: 18 },
  langCode: { color: COLORS.text, fontWeight: '700', fontSize: 13 },

  avatarSection: { alignItems: 'center', gap: 8 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarVerified: { borderColor: COLORS.success, borderWidth: 3 },
  avatarText: { fontSize: 40 },
  displayName: { color: COLORS.primaryLight, fontSize: 15, fontWeight: '600' },
  badgeRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  hardwareBadge: {
    backgroundColor: '#F5C518',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  hardwareBadgeText: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },

  statsRow: { flexDirection: 'row', width: '100%', gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statGold: { borderColor: COLORS.gold },
  statValue: { color: COLORS.text, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  statValueGold: { color: COLORS.gold },
  statLabel: { color: COLORS.textMuted, fontSize: 18 },

  xaumCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.gold + '55',
    gap: 6,
  },
  xaumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xaumLabel: { color: COLORS.gold, fontSize: 20, fontWeight: '800' },
  xaumUsd: { color: COLORS.textMuted, fontSize: 14 },
  xaumSub: { color: COLORS.textMuted, fontSize: 12 },

  mintCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.success + '33',
  },
  mintLabel: { color: COLORS.success, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  mintAddress: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'monospace' },

  section: { width: '100%', gap: 10 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' },
  langBtnFlag: { fontSize: 20 },
  langBtnText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 14 },
  langBtnTextActive: { color: COLORS.primary },

  menu: { width: '100%', gap: 2 },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuLabel: { color: COLORS.text, fontSize: 16 },
  chevron: { color: COLORS.textMuted, fontSize: 20 },

  logoutBtn: {
    borderWidth: 1,
    borderColor: COLORS.error + '44',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  logoutText: { color: COLORS.error, fontWeight: '600', fontSize: 16 },
});
