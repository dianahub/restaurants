import React, { Component, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { useLocation } from '../hooks/useLocation';
import { useNearbyRestaurants, NearbyRestaurant } from '../hooks/useNearbyRestaurants';
import { useNearbyEvents, NearbyEvent, EventFilter } from '../hooks/useNearbyEvents';
import { ellipsify } from '../utils/format';
import { buildLeaderboard } from '../utils/demo';

// ---------------------------------------------------------------------------
// Error Boundary — catches any render crash so the screen never goes blank
// ---------------------------------------------------------------------------

interface BoundaryState { hasError: boolean }

class ErrorBoundary extends Component<{ children: React.ReactNode }, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={boundaryStyles.container}>
          <Text style={boundaryStyles.emoji}>🗺️</Text>
          <Text style={boundaryStyles.title}>Map unavailable</Text>
          <Text style={boundaryStyles.sub}>Showing list view instead</Text>
          <TouchableOpacity
            style={boundaryStyles.btn}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={boundaryStyles.btnText}>Try again</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

const boundaryStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  sub: { color: COLORS.textMuted, fontSize: 14, marginBottom: 24 },
  btn: { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ---------------------------------------------------------------------------
// Static demo data — always visible, even if hooks return nothing
// ---------------------------------------------------------------------------

const DEMO_RESTAURANTS: NearbyRestaurant[] = [
  {
    nftAddress: 'demo-1', metadataUri: '', ownerAddress: '',
    name_en: 'Casa Mia', name_es: 'Casa Mía', cuisine: 'Italian', language_preference: 'both',
    description_en: 'Authentic Italian', description_es: 'Italiana auténtica',
    todays_special_en: 'Truffle tagliatelle', todays_special_es: 'Tagliatelle con trufa',
    lat: 25.7617, lng: -80.1918, gold_staked: 450, reward_multiplier: 2,
    localizedName: 'Casa Mia', localizedDescription: 'Authentic Italian',
    localizedSpecial: 'Truffle tagliatelle', distanceKm: 0.3,
  },
  {
    nftAddress: 'demo-2', metadataUri: '', ownerAddress: '',
    name_en: 'El Rincón', name_es: 'El Rincón', cuisine: 'Mexican', language_preference: 'es',
    description_en: 'Homestyle Mexican', description_es: 'Mexicana casera',
    todays_special_en: 'Mole enchiladas', todays_special_es: 'Enchiladas con mole',
    lat: 25.7617, lng: -80.1918, gold_staked: 310, reward_multiplier: 1.5,
    localizedName: 'El Rincón', localizedDescription: 'Homestyle Mexican',
    localizedSpecial: 'Mole enchiladas', distanceKm: 0.6,
  },
  {
    nftAddress: 'demo-3', metadataUri: '', ownerAddress: '',
    name_en: 'Sunset Tacos', name_es: 'Tacos Atardecer', cuisine: 'Mexican', language_preference: 'both',
    description_en: 'Street tacos & mezcal', description_es: 'Tacos y mezcal',
    todays_special_en: 'Al pastor + free agua fresca', todays_special_es: 'Al pastor + agua gratis',
    lat: 25.7617, lng: -80.1918, gold_staked: 180, reward_multiplier: 1,
    localizedName: 'Sunset Tacos', localizedDescription: 'Street tacos & mezcal',
    localizedSpecial: 'Al pastor + free agua fresca', distanceKm: 1.1,
  },
  {
    nftAddress: 'demo-4', metadataUri: '', ownerAddress: '',
    name_en: 'Wynwood Bites', name_es: 'Wynwood Bites', cuisine: 'Fusion', language_preference: 'en',
    description_en: 'Creative fusion', description_es: 'Fusión creativa',
    todays_special_en: 'Wagyu smash burger', todays_special_es: 'Burger de wagyu',
    lat: 25.7617, lng: -80.1918, gold_staked: 520, reward_multiplier: 2,
    localizedName: 'Wynwood Bites', localizedDescription: 'Creative fusion',
    localizedSpecial: 'Wagyu smash burger', distanceKm: 1.4,
  },
  {
    nftAddress: 'demo-5', metadataUri: '', ownerAddress: '',
    name_en: 'La Palma', name_es: 'La Palma', cuisine: 'Cuban', language_preference: 'es',
    description_en: 'Cuban & Caribbean', description_es: 'Cubana y caribeña',
    todays_special_en: 'Ropa vieja bowl', todays_special_es: 'Bowl de ropa vieja',
    lat: 25.7617, lng: -80.1918, gold_staked: 270, reward_multiplier: 1.5,
    localizedName: 'La Palma', localizedDescription: 'Cuban & Caribbean',
    localizedSpecial: 'Ropa vieja bowl', distanceKm: 1.8,
  },
];

const RESTAURANT_EMOJIS: Record<string, string> = {
  'demo-1': '🍝', 'demo-2': '🌮', 'demo-3': '🌯', 'demo-4': '🍔', 'demo-5': '🥘',
};

const DEMO_EVENTS: NearbyEvent[] = [
  {
    nftAddress: 'ev-1', name_en: 'Salsa Night', name_es: 'Noche de Salsa',
    restaurantNFT: 'demo-5', restaurantName_en: 'La Palma', restaurantName_es: 'La Palma',
    lat: 25.7617, lng: -80.1918, date: new Date(Date.now() + 3 * 3600_000).toISOString(),
    gold_multiplier: 3, ticket_price_sol: 0, type: 'music', isToday: true,
    totalRsvps: 42, localizedName: 'Salsa Night', distanceKm: 1.8,
  },
  {
    nftAddress: 'ev-2', name_en: "Chef's Table Tasting", name_es: 'Mesa del Chef',
    restaurantNFT: 'demo-1', restaurantName_en: 'Casa Mia', restaurantName_es: 'Casa Mía',
    lat: 25.7617, lng: -80.1918, date: new Date(Date.now() + 2 * 86400_000).toISOString(),
    gold_multiplier: 2, ticket_price_sol: 0.5, type: 'dining', isToday: false,
    totalRsvps: 18, localizedName: 'Chef\'s Table Tasting', distanceKm: 0.3,
  },
  {
    nftAddress: 'ev-3', name_en: 'Taco Tuesday Fiesta', name_es: 'Martes de Tacos',
    restaurantNFT: 'demo-3', restaurantName_en: 'Sunset Tacos', restaurantName_es: 'Tacos Atardecer',
    lat: 25.7617, lng: -80.1918, date: new Date(Date.now() + 86400_000).toISOString(),
    gold_multiplier: 2, ticket_price_sol: 0, type: 'special', isToday: false,
    totalRsvps: 67, localizedName: 'Taco Tuesday Fiesta', distanceKm: 1.1,
  },
  {
    nftAddress: 'ev-4', name_en: 'Mezcal & Art Walk', name_es: 'Arte y Mezcal',
    restaurantNFT: 'demo-4', restaurantName_en: 'Wynwood Bites', restaurantName_es: 'Wynwood Bites',
    lat: 25.7617, lng: -80.1918, date: new Date(Date.now() + 4 * 86400_000).toISOString(),
    gold_multiplier: 2.5, ticket_price_sol: 0.1, type: 'art', isToday: false,
    totalRsvps: 33, localizedName: 'Mezcal & Art Walk', distanceKm: 1.4,
  },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FILTER_CHIPS: EventFilter[] = ['all', 'tonight', 'this-week', 'free', 'paid'];

interface LeaderEntry { rank: number; display: string; xaum: number; isMe: boolean }

function getCountdown(): string {
  const now = new Date();
  const nextMonday = new Date(now);
  const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);
  const diffMs = nextMonday.getTime() - now.getTime();
  if (diffMs <= 0) return '0h 0m';
  const totalMinutes = Math.floor(diffMs / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

// ---------------------------------------------------------------------------
// NearbyScreen (inner, wrapped by ErrorBoundary below)
// ---------------------------------------------------------------------------

function NearbyScreenInner() {
  const { t } = useTranslation();
  const { account, userLanguage } = useSolanaWallet();
  const lang: 'en' | 'es' = userLanguage.startsWith('es') ? 'es' : 'en';

  const { location } = useLocation();
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');
  const [countdown, setCountdown] = useState(getCountdown());

  const { restaurants: fetchedRestaurants } = useNearbyRestaurants(location, lang);
  const { events: fetchedEvents } = useNearbyEvents(location, lang, eventFilter);

  const restaurants = fetchedRestaurants.length > 0 ? fetchedRestaurants : DEMO_RESTAURANTS;
  const events = fetchedEvents.length > 0 ? fetchedEvents : DEMO_EVENTS;

  const walletAddress = account?.publicKey?.toString() ?? null;
  const leaderboard = useMemo(
    () => buildLeaderboard(walletAddress ? ellipsify(walletAddress) : 'You'),
    [walletAddress],
  ) as LeaderEntry[];

  useEffect(() => {
    const interval = setInterval(() => setCountdown(getCountdown()), 1_000);
    return () => clearInterval(interval);
  }, []);

  const filterKey: Record<EventFilter, string> = {
    all: 'nearby.filterAll',
    tonight: 'nearby.filterTonight',
    'this-week': 'nearby.filterThisWeek',
    free: 'nearby.filterFree',
    paid: 'nearby.filterPaid',
  };

  // ---- Tab Bar ----
  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {([
        { label: t('nearby.tabRestaurants'), idx: 0 },
        { label: t('nearby.tabEvents'), idx: 1 },
        { label: t('nearby.tabLeaderboard'), idx: 2 },
      ] as { label: string; idx: 0 | 1 | 2 }[]).map(({ label, idx }) => (
        <TouchableOpacity
          key={idx}
          style={[styles.tabPill, activeTab === idx && styles.tabPillActive]}
          onPress={() => setActiveTab(idx)}
        >
          <Text style={[styles.tabPillText, activeTab === idx && styles.tabPillTextActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ---- Restaurant Card ----
  const renderRestaurantCard = (r: NearbyRestaurant) => {
    const emoji = RESTAURANT_EMOJIS[r.nftAddress] ?? '🍽️';
    const isGold = r.reward_multiplier >= 2;
    return (
      <View key={r.nftAddress} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardEmoji}>
            <Text style={styles.cardEmojiText}>{emoji}</Text>
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.cardName}>{r.localizedName}</Text>
            <Text style={styles.cardCuisine}>{r.localizedDescription}</Text>
          </View>
          {r.reward_multiplier > 1 && (
            <View style={[styles.multiplierBadge, isGold && styles.multiplierBadgeGold]}>
              <Text style={[styles.multiplierText, isGold && styles.multiplierTextGold]}>
                {r.reward_multiplier}× Gold
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardBadgeRow}>
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceBadgeText}>📍 {r.distanceKm.toFixed(1)} km</Text>
          </View>
          <View style={styles.stakedBadge}>
            <Text style={styles.stakedBadgeText}>🪙 {r.gold_staked} staked</Text>
          </View>
        </View>

        {r.localizedSpecial ? (
          <View style={styles.specialBox}>
            <Text style={styles.specialLabel}>TODAY'S SPECIAL</Text>
            <Text style={styles.specialText}>{r.localizedSpecial}</Text>
          </View>
        ) : null}

        <View style={styles.cardButtons}>
          <TouchableOpacity style={styles.btnPrimary}>
            <Text style={styles.btnPrimaryText}>{t('nearby.checkIn')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnOutline}>
            <Text style={styles.btnOutlineText}>{t('nearby.viewEvents')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ---- Event Card ----
  const renderEventCard = (e: NearbyEvent) => {
    const dateLabel = (() => {
      try {
        return new Date(e.date).toLocaleDateString(
          lang === 'es' ? 'es-ES' : 'en-US',
          { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
        );
      } catch {
        return e.date;
      }
    })();

    const typeEmoji: Record<string, string> = {
      music: '🎵', dining: '🍽️', art: '🎨', special: '⭐',
    };

    return (
      <View key={e.nftAddress} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardEmoji, styles.cardEmojiEvent]}>
            <Text style={styles.cardEmojiText}>{typeEmoji[e.type] ?? '⭐'}</Text>
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.cardName}>{e.localizedName}</Text>
            <Text style={styles.cardCuisine}>{e.restaurantName_en}</Text>
          </View>
          <View style={styles.multiplierBadgeGold}>
            <Text style={styles.multiplierTextGold}>{e.gold_multiplier}× Gold</Text>
          </View>
        </View>

        <View style={styles.cardBadgeRow}>
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceBadgeText}>📅 {dateLabel}</Text>
          </View>
          {e.isToday && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>TODAY</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBadgeRow}>
          <View style={styles.stakedBadge}>
            <Text style={styles.stakedBadgeText}>👥 {e.totalRsvps} going</Text>
          </View>
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceBadgeText}>📍 {e.distanceKm.toFixed(1)} km</Text>
          </View>
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceBadgeText}>
              {e.ticket_price_sol === 0 ? '🎟️ Free' : `🎟️ ${e.ticket_price_sol} SOL`}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.btnPrimary}>
          <Text style={styles.btnPrimaryText}>
            {e.ticket_price_sol === 0 ? 'RSVP Free' : t('events.buyTicket')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ---- Leaderboard Row ----
  const renderLeaderRow = ({ item }: { item: LeaderEntry }) => {
    const medals = ['🥇', '🥈', '🥉'];
    const medal = item.rank <= 3 ? medals[item.rank - 1] : null;
    return (
      <View style={[styles.leaderRow, item.isMe && styles.leaderRowMe]}>
        <Text style={[styles.leaderRank, item.rank <= 3 && styles.leaderRankTop]}>
          #{item.rank}
        </Text>
        {medal ? <Text style={styles.leaderMedal}>{medal}</Text> : <View style={{ width: 24 }} />}
        <Text style={[styles.leaderName, item.isMe && styles.leaderNameMe]}>{item.display}</Text>
        <Text style={[styles.leaderXaum, item.isMe && styles.leaderXaumMe]}>
          {t('nearby.xaumEarned', { amount: item.xaum })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderTabBar()}

      {/* ---- Restaurants Tab ---- */}
      {activeTab === 0 && (
        <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
          <Text style={styles.sectionHeader}>
            {t('nearby.tabRestaurants')} · {restaurants.length} nearby
          </Text>
          {restaurants.map(renderRestaurantCard)}
        </ScrollView>
      )}

      {/* ---- Events Tab ---- */}
      {activeTab === 1 && (
        <View style={styles.listContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScrollContainer}
            contentContainerStyle={styles.filterScrollContent}
          >
            {FILTER_CHIPS.map((chip) => (
              <TouchableOpacity
                key={chip}
                style={[styles.filterChip, eventFilter === chip && styles.filterChipActive]}
                onPress={() => setEventFilter(chip)}
              >
                <Text style={[styles.filterChipText, eventFilter === chip && styles.filterChipTextActive]}>
                  {t(filterKey[chip])}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView contentContainerStyle={styles.listContent}>
            <Text style={styles.sectionHeader}>
              {t('nearby.tabEvents')} · {events.length} upcoming
            </Text>
            {events.length > 0
              ? events.map(renderEventCard)
              : <Text style={styles.emptyText}>{t('nearby.noEvents')}</Text>
            }
          </ScrollView>
        </View>
      )}

      {/* ---- Leaderboard Tab ---- */}
      {activeTab === 2 && (
        <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          <Text style={styles.leaderTitle}>{t('nearby.leaderboardWeekly')}</Text>
          <Text style={styles.leaderPrize}>{t('nearby.leaderboardPrize')}</Text>
          <View style={styles.myRankBanner}>
            <Text style={styles.myRankText}>{t('nearby.yourRank', { rank: 7 })}</Text>
            <Text style={styles.countdownText}>{t('nearby.weeklyReset', { time: countdown })}</Text>
          </View>
          <FlatList
            data={leaderboard}
            keyExtractor={(item) => String(item.rank)}
            renderItem={renderLeaderRow}
            scrollEnabled={false}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Default export — wrapped in ErrorBoundary
// ---------------------------------------------------------------------------

export default function NearbyScreen() {
  return (
    <ErrorBoundary>
      <NearbyScreenInner />
    </ErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: COLORS.background,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  tabPillActive: { backgroundColor: COLORS.primary },
  tabPillText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  tabPillTextActive: { color: '#fff' },

  // List layout
  listContainer: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionHeader: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 12,
  },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 40 },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  cardEmoji: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F5C51822',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmojiEvent: { backgroundColor: '#9C6ADE22' },
  cardEmojiText: { fontSize: 24 },
  cardHeaderInfo: { flex: 1 },
  cardName: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  cardCuisine: { color: COLORS.textMuted, fontSize: 13 },

  // Badges
  cardBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  distanceBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  distanceBadgeText: { color: COLORS.textMuted, fontSize: 12 },
  stakedBadge: {
    backgroundColor: '#F5C51811',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  stakedBadgeText: { color: '#F5C518', fontSize: 12, fontWeight: '600' },
  multiplierBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  multiplierBadgeGold: {
    backgroundColor: '#F5C518',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  multiplierText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
  multiplierTextGold: { color: '#000', fontSize: 12, fontWeight: '800' },
  todayBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  todayBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Special
  specialBox: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  specialLabel: { color: '#F5C518', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  specialText: { color: '#fff', fontSize: 13 },

  // Buttons
  cardButtons: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btnPrimary: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnOutlineText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },

  // Filter chips
  filterScrollContainer: { maxHeight: 52 },
  filterScrollContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: '#F5C518' },
  filterChipText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#000' },

  // Leaderboard
  leaderTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4, marginTop: 16 },
  leaderPrize: { color: '#F5C518', fontSize: 13, fontWeight: '600', marginBottom: 16 },
  myRankBanner: {
    borderWidth: 2,
    borderColor: '#F5C518',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#F5C51811',
  },
  myRankText: { color: '#F5C518', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  countdownText: { color: COLORS.textMuted, fontSize: 13 },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: COLORS.surface,
    gap: 8,
  },
  leaderRowMe: { backgroundColor: '#F5C51822', borderWidth: 1, borderColor: '#F5C518' },
  leaderRank: { color: COLORS.textMuted, fontSize: 14, fontWeight: '700', minWidth: 32 },
  leaderRankTop: { color: '#F5C518' },
  leaderMedal: { fontSize: 18, width: 24, textAlign: 'center' },
  leaderName: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '500' },
  leaderNameMe: { fontWeight: '800' },
  leaderXaum: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  leaderXaumMe: { color: '#F5C518', fontWeight: '800' },
});
