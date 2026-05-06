import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants';
import { SGT_REWARD_MULTIPLIER } from '../constants/sgt';
import { useSeekerVerification } from '../hooks/useSeekerVerification';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { CoinBurst } from '../components/CoinBurst';
import { DEMO_WALLET, DEMO_EVENTS, DEMO_RESTAURANTS } from '../utils/demo';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { connected } = useSolanaWallet();
  const { verified } = useSeekerVerification();
  const [burstVisible, setBurstVisible] = useState(false);

  const lang = i18n.language.startsWith('es') ? 'es' : 'en';
  const multiplier = verified ? SGT_REWARD_MULTIPLIER : 1;

  const handleCheckIn = () => {
    setBurstVisible(true);
  };

  const todaysEvents = DEMO_EVENTS.filter((e) => {
    const d = new Date(e.date);
    return d.toDateString() === new Date().toDateString();
  });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>Pot of Gold</Text>
            <Text style={styles.welcome}>{t('home.welcome')}</Text>
          </View>
          {verified && (
            <View style={styles.multiplierBadge}>
              <Text style={styles.multiplierText}>{t('verification.multiplierActive')}</Text>
            </View>
          )}
        </View>

        {/* XAUm balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>
            {lang === 'es' ? 'Tu Oro' : 'Your Gold'}
          </Text>
          <Text style={styles.balanceAmount}>{DEMO_WALLET.xaumBalance} XAUm</Text>
          <Text style={styles.balanceUsd}>${DEMO_WALLET.xaumUsdValue.toFixed(2)}</Text>
          <View style={styles.streakRow}>
            <Text style={styles.streak}>🔥 {t('home.streakDays', { count: DEMO_WALLET.streak })}</Text>
            <Text style={styles.rank}>🏆 #{DEMO_WALLET.rank}</Text>
          </View>
        </View>

        {/* Check-in card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t('home.dailyCheckIn')}</Text>
            {multiplier > 1 && (
              <View style={styles.multiplierPill}>
                <Text style={styles.multiplierPillText}>{multiplier}× Gold</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.button} onPress={handleCheckIn}>
            <Text style={styles.buttonText}>{t('home.checkInButton')}</Text>
          </TouchableOpacity>
          <Text style={styles.rewardHint}>
            🥇 {lang === 'es'
              ? `Gana ${multiplier}× XAUm en cada visita`
              : `Earn ${multiplier}× XAUm on every visit`}
          </Text>
        </View>

        {/* Today's events */}
        {todaysEvents.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>
                {lang === 'es' ? '⭐ Eventos de Hoy' : '⭐ Tonight\'s Events'}
              </Text>
            </View>
            {todaysEvents.map((evt) => (
              <View key={evt.nftAddress} style={styles.eventCard}>
                <View style={styles.eventCardTop}>
                  <View style={styles.goldBadge}>
                    <Text style={styles.goldBadgeText}>{evt.gold_multiplier}× Gold</Text>
                  </View>
                  {evt.ticket_price_sol === 0 && (
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeBadgeText}>{t('events.free')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.eventTitle}>
                  {lang === 'es' ? evt.name_es : evt.name_en}
                </Text>
                <Text style={styles.eventVenue}>
                  {lang === 'es' ? evt.restaurantName_es : evt.restaurantName_en}
                </Text>
                <Text style={styles.eventTime}>
                  {new Date(evt.date).toLocaleTimeString(lang === 'es' ? 'es-ES' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {' · '}
                  {evt.totalRsvps} {lang === 'es' ? 'asistirán' : 'going'}
                </Text>
                <TouchableOpacity style={styles.rsvpBtn}>
                  <Text style={styles.rsvpBtnText}>{t('events.rsvp')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* Nearby restaurants preview */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>
            {lang === 'es' ? '📍 Cerca de Ti' : '📍 Near You'}
          </Text>
        </View>
        {DEMO_RESTAURANTS.slice(0, 3).map((r) => (
          <View key={r.nftAddress} style={styles.restaurantRow}>
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>
                {lang === 'es' ? r.name_es : r.name_en}
              </Text>
              <Text style={styles.restaurantMeta}>
                {r.cuisine} · {r.distanceKm.toFixed(1)} km
              </Text>
            </View>
            <View style={[styles.multiplierBubble, r.reward_multiplier > 1 && styles.multiplierBubbleActive]}>
              <Text style={styles.multiplierBubbleText}>{r.reward_multiplier}×</Text>
            </View>
          </View>
        ))}

        {/* Seeker-exclusive event stub */}
        <Text style={styles.sectionTitle}>{t('home.featuredEvents')}</Text>
        <View style={[styles.eventCard, !verified && styles.eventCardLocked]}>
          <View style={styles.exclusiveBadge}>
            <Text style={styles.exclusiveBadgeText}>{t('verification.seekerExclusiveEvent')}</Text>
          </View>
          <Text style={styles.eventTitle}>
            {connected && !verified ? '🔒 ' : ''}Seeker Genesis Meet-Up
          </Text>
          {!verified && connected && (
            <Text style={styles.lockedHint}>{t('verification.lockedForSeekers')}</Text>
          )}
        </View>
      </ScrollView>

      {/* Coin burst overlay — shown on check-in */}
      <CoinBurst
        visible={burstVisible}
        multiplier={multiplier}
        label={`+${(0.001 * multiplier).toFixed(4)} XAUm`}
        onComplete={() => setBurstVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, gap: 16 },

  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  appName: { fontSize: 22, fontWeight: '900', color: COLORS.gold, letterSpacing: -0.5 },
  welcome: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
  multiplierBadge: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  multiplierText: { color: '#000', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },

  balanceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.gold + '44',
    gap: 4,
  },
  balanceLabel: { color: COLORS.textMuted, fontSize: 13 },
  balanceAmount: { color: COLORS.gold, fontSize: 32, fontWeight: '900' },
  balanceUsd: { color: COLORS.textMuted, fontSize: 14 },
  streakRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  streak: { color: COLORS.text, fontSize: 13 },
  rank: { color: COLORS.text, fontSize: 13 },

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
    backgroundColor: COLORS.gold,
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
  rewardHint: { color: COLORS.gold, fontSize: 12, textAlign: 'center' },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },

  eventCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gold + '33',
    gap: 8,
  },
  eventCardLocked: { opacity: 0.6 },
  eventCardTop: { flexDirection: 'row', gap: 8 },
  goldBadge: {
    backgroundColor: COLORS.gold,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  goldBadgeText: { color: '#000', fontSize: 11, fontWeight: '800' },
  freeBadge: {
    backgroundColor: COLORS.success + '22',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  freeBadgeText: { color: COLORS.success, fontSize: 11, fontWeight: '600' },
  eventTitle: { color: COLORS.text, fontWeight: '700', fontSize: 16 },
  eventVenue: { color: COLORS.textMuted, fontSize: 13 },
  eventTime: { color: COLORS.textMuted, fontSize: 12 },
  rsvpBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rsvpBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  restaurantInfo: { gap: 3 },
  restaurantName: { color: COLORS.text, fontWeight: '600', fontSize: 15 },
  restaurantMeta: { color: COLORS.textMuted, fontSize: 12 },
  multiplierBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiplierBubbleActive: { backgroundColor: COLORS.gold + '22', borderWidth: 1, borderColor: COLORS.gold },
  multiplierBubbleText: { color: COLORS.gold, fontWeight: '800', fontSize: 13 },

  exclusiveBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.gold + '22',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  exclusiveBadgeText: { color: COLORS.gold, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  lockedHint: { color: COLORS.textMuted, fontSize: 12 },
});
