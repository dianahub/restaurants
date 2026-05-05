import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants';
import { SGT_REWARD_MULTIPLIER } from '../constants/sgt';
import { useSeekerVerification } from '../hooks/useSeekerVerification';
import { useSolanaWallet } from '../hooks/useSolanaWallet';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { connected } = useSolanaWallet();
  const { verified } = useSeekerVerification();

  const multiplier = verified ? SGT_REWARD_MULTIPLIER : 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('home.title')}</Text>
        {verified && (
          <View style={styles.multiplierBadge}>
            <Text style={styles.multiplierText}>{t('verification.multiplierActive')}</Text>
          </View>
        )}
      </View>
      <Text style={styles.welcome}>{t('home.welcome')}</Text>

      {/* Daily check-in card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{t('home.dailyCheckIn')}</Text>
          {multiplier > 1 && (
            <View style={styles.multiplierPill}>
              <Text style={styles.multiplierPillText}>{multiplier}× Gold</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>{t('home.checkInButton')}</Text>
        </TouchableOpacity>
        {verified && (
          <Text style={styles.rewardHint}>
            {/* e.g. "You'll earn 2× gold for this check-in" */}
            🥇 {multiplier}× {t('verification.perks2xDesc')}
          </Text>
        )}
      </View>

      {/* Seeker-only events section */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>{t('home.featuredEvents')}</Text>
      </View>

      {/* Seeker-exclusive event card */}
      <View style={[styles.eventCard, !verified && styles.eventCardLocked]}>
        <View style={styles.exclusiveBadge}>
          <Text style={styles.exclusiveBadgeText}>{t('verification.seekerExclusiveEvent')}</Text>
        </View>
        <Text style={styles.eventTitle}>
          {connected && !verified ? '🔒 ' : ''}Seeker Genesis Meet-Up
        </Text>
        {!verified && connected ? (
          <Text style={styles.lockedHint}>{t('verification.lockedForSeekers')}</Text>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>{t('home.upcomingEvents')}</Text>
      <Text style={styles.empty}>{t('home.noEvents')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text },
  multiplierBadge: {
    backgroundColor: '#F5C518',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  multiplierText: { color: '#000', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  welcome: { fontSize: 16, color: COLORS.textMuted },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  multiplierPill: {
    backgroundColor: '#F5C518',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  multiplierPillText: { color: '#000', fontWeight: '800', fontSize: 11 },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: COLORS.text, fontWeight: '700', fontSize: 16 },
  rewardHint: { color: '#F5C518', fontSize: 12, textAlign: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  eventCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F5C51844',
    gap: 8,
  },
  eventCardLocked: { opacity: 0.6 },
  exclusiveBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5C51822',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#F5C518',
  },
  exclusiveBadgeText: { color: '#F5C518', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  eventTitle: { color: COLORS.text, fontWeight: '600', fontSize: 15 },
  lockedHint: { color: COLORS.textMuted, fontSize: 12 },
  empty: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8 },
});
