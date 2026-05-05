import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants';
import { SGT_REWARD_MULTIPLIER } from '../constants/sgt';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { useSeekerVerification } from '../hooks/useSeekerVerification';
import { SeekerVerifiedBadge } from '../components/SeekerVerifiedBadge';

const MENU_ITEMS = ['settings', 'notifications', 'privacy', 'help'] as const;

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { connected, isSeekerDevice } = useSolanaWallet();
  const { verified, mintAddress } = useSeekerVerification();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('profile.title')}</Text>

      {/* Avatar + verification badges */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatar, verified && styles.avatarVerified]}>
          <Text style={styles.avatarText}>👤</Text>
        </View>

        <View style={styles.badgeRow}>
          {/* Method 1: UI-only device detection — cosmetic only */}
          {isSeekerDevice && (
            <View style={styles.hardwareBadge}>
              <Text style={styles.hardwareBadgeText}>SEEKER</Text>
            </View>
          )}
          {/* Method 2: SGT-verified badge — gates real features */}
          <SeekerVerifiedBadge />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{t('profile.level', { level: 1 })}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{t('profile.points', { count: 0 })}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, verified && styles.statValueGold]}>
            {verified ? `${SGT_REWARD_MULTIPLIER}×` : '1×'}
          </Text>
          <Text style={styles.statLabel}>Multiplier</Text>
        </View>
      </View>

      {/* SGT mint address — shown to verified users */}
      {verified && mintAddress && (
        <View style={styles.mintCard}>
          <Text style={styles.mintLabel}>SGT Mint</Text>
          <Text style={styles.mintAddress} numberOfLines={1} ellipsizeMode="middle">
            {mintAddress}
          </Text>
        </View>
      )}

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
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, alignSelf: 'flex-start' },
  avatarSection: { alignItems: 'center', gap: 12 },
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
  avatarVerified: { borderColor: '#22c55e', borderWidth: 3 },
  avatarText: { fontSize: 40 },
  badgeRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  hardwareBadge: {
    backgroundColor: '#F5C518',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  hardwareBadgeText: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  statsRow: { flexDirection: 'row', width: '100%', gap: 12 },
  stat: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  statValueGold: { color: '#F5C518' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  mintCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#22c55e33',
  },
  mintLabel: { color: '#22c55e', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  mintAddress: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'monospace' },
  menu: { width: '100%', gap: 2 },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
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
