import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { useLocation } from '../hooks/useLocation';
import { useNearbyRestaurants, NearbyRestaurant } from '../hooks/useNearbyRestaurants';
import { useNearbyEvents, NearbyEvent, EventFilter } from '../hooks/useNearbyEvents';
import { ellipsify } from '../utils/format';
import { buildLeaderboard } from '../utils/demo';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHEET_HEIGHT = 320;
const DEFAULT_LAT = 37.7749;
const DEFAULT_LNG = -122.4194;
const FILTER_CHIPS: EventFilter[] = ['all', 'tonight', 'this-week', 'free', 'paid'];

// ---------------------------------------------------------------------------
// Leaderboard mock data (outside component to avoid re-creation)
// ---------------------------------------------------------------------------

interface LeaderEntry {
  rank: number;
  display: string;
  xaum: number;
  isMe: boolean;
}

// ---------------------------------------------------------------------------
// Helper: compute countdown to next Monday 00:00 UTC
// ---------------------------------------------------------------------------

function getCountdown(): string {
  const now = new Date();
  const nextMonday = new Date(now);
  // getDay(): 0=Sun,1=Mon,...,6=Sat
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
// NearbyScreen
// ---------------------------------------------------------------------------

export default function NearbyScreen() {
  const { t } = useTranslation();
  const { account, userLanguage } = useSolanaWallet();
  const lang: 'en' | 'es' = userLanguage.startsWith('es') ? 'es' : 'en';

  const { location } = useLocation();

  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);
  const [selectedRestaurant, setSelectedRestaurant] = useState<NearbyRestaurant | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<NearbyEvent | null>(null);
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');
  const [countdown, setCountdown] = useState(getCountdown());

  // Hooks
  const { restaurants, loading: rLoading } = useNearbyRestaurants(location, lang);
  const { events, restaurantNFTsWithEventToday } = useNearbyEvents(location, lang, eventFilter);

  const walletAddress = account?.publicKey?.toString() ?? null;

  // ---------------------------------------------------------------------------
  // Leaderboard entries (derived from walletAddress)
  // ---------------------------------------------------------------------------
  const leaderboard = useMemo(
    () => buildLeaderboard(walletAddress ? ellipsify(walletAddress) : 'You'),
    [walletAddress],
  ) as LeaderEntry[];

  // ---------------------------------------------------------------------------
  // Animations
  // ---------------------------------------------------------------------------
  const sheetAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Pulse loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Countdown ticker
  useEffect(() => {
    const interval = setInterval(() => setCountdown(getCountdown()), 1_000);
    return () => clearInterval(interval);
  }, []);

  // ---------------------------------------------------------------------------
  // Sheet helpers
  // ---------------------------------------------------------------------------
  const showSheet = useCallback(() => {
    Animated.spring(sheetAnim, {
      toValue: 0,
      tension: 65,
      useNativeDriver: true,
    }).start();
  }, [sheetAnim]);

  const hideSheet = useCallback(() => {
    Animated.timing(sheetAnim, {
      toValue: SHEET_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedRestaurant(null);
      setSelectedEvent(null);
    });
  }, [sheetAnim]);

  // ---------------------------------------------------------------------------
  // Map region
  // ---------------------------------------------------------------------------
  const mapRegion = useMemo(
    () => ({
      latitude: location?.coords.latitude ?? DEFAULT_LAT,
      longitude: location?.coords.longitude ?? DEFAULT_LNG,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }),
    [location],
  );

  // ---------------------------------------------------------------------------
  // Pulse ring interpolation
  // ---------------------------------------------------------------------------
  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });

  // ---------------------------------------------------------------------------
  // Filter chip i18n key map
  // ---------------------------------------------------------------------------
  const filterKey: Record<EventFilter, string> = {
    all: 'nearby.filterAll',
    tonight: 'nearby.filterTonight',
    'this-week': 'nearby.filterThisWeek',
    free: 'nearby.filterFree',
    paid: 'nearby.filterPaid',
  };

  // ---------------------------------------------------------------------------
  // Tab bar
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Restaurant marker
  // ---------------------------------------------------------------------------
  const renderRestaurantMarker = (r: NearbyRestaurant) => {
    const size = Math.max(28, Math.min(52, 28 + (r.gold_staked / 100) * 2.4));
    const pulsing = r.reward_multiplier > 1;
    const hasEventToday = restaurantNFTsWithEventToday.has(r.nftAddress);

    return (
      <Marker
        key={r.nftAddress}
        coordinate={{ latitude: r.lat, longitude: r.lng }}
        tracksViewChanges={pulsing}
        onPress={() => {
          setSelectedRestaurant(r);
          setSelectedEvent(null);
          showSheet();
        }}
      >
        <View style={{ width: size + 16, height: size + 16, alignItems: 'center', justifyContent: 'center' }}>
          {pulsing && (
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  width: size + 12,
                  height: size + 12,
                  borderRadius: (size + 12) / 2,
                  transform: [{ scale: pulseScale }],
                  opacity: pulseOpacity,
                },
              ]}
            />
          )}
          <View
            style={[
              styles.restaurantMarker,
              { width: size, height: size, borderRadius: size / 2 },
            ]}
          >
            <Text style={{ fontSize: size * 0.45 }}>🥇</Text>
          </View>
          {hasEventToday && (
            <View style={styles.eventBadge}>
              <Text style={{ fontSize: 10 }}>⭐</Text>
            </View>
          )}
        </View>
      </Marker>
    );
  };

  // ---------------------------------------------------------------------------
  // Event marker
  // ---------------------------------------------------------------------------
  const renderEventMarker = (e: NearbyEvent) => {
    const size = Math.max(28, Math.min(48, 24 + e.gold_multiplier * 6));
    const pulsing = e.gold_multiplier > 1;

    return (
      <Marker
        key={e.nftAddress}
        coordinate={{ latitude: e.lat, longitude: e.lng }}
        tracksViewChanges={pulsing}
        onPress={() => {
          setSelectedEvent(e);
          setSelectedRestaurant(null);
          showSheet();
        }}
      >
        <View style={{ width: size + 16, height: size + 16, alignItems: 'center', justifyContent: 'center' }}>
          {pulsing && (
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  width: size + 12,
                  height: size + 12,
                  borderRadius: (size + 12) / 2,
                  transform: [{ scale: pulseScale }],
                  opacity: pulseOpacity,
                },
              ]}
            />
          )}
          <View
            style={[
              styles.eventMarker,
              { width: size, height: size, borderRadius: size / 2 },
              e.isToday && styles.eventMarkerToday,
            ]}
          >
            <Text style={{ fontSize: size * 0.45 }}>⭐</Text>
          </View>
        </View>
      </Marker>
    );
  };

  // ---------------------------------------------------------------------------
  // Restaurant bottom sheet content
  // ---------------------------------------------------------------------------
  const renderRestaurantSheet = (r: NearbyRestaurant) => (
    <View style={styles.sheetContent}>
      <View style={styles.sheetHandle} />
      <TouchableOpacity style={styles.sheetClose} onPress={hideSheet}>
        <Text style={styles.sheetCloseText}>×</Text>
      </TouchableOpacity>
      <Text style={styles.sheetTitle}>{r.localizedName}</Text>
      <Text style={styles.sheetSubtitle}>{r.cuisine}</Text>
      <View style={styles.sheetRow}>
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceBadgeText}>{r.distanceKm.toFixed(1)} km</Text>
        </View>
        <View style={styles.xaumBadge}>
          <Text style={styles.xaumBadgeText}>
            {t('nearby.xaumRate', { rate: r.gold_staked })}
          </Text>
        </View>
      </View>
      {r.localizedSpecial ? (
        <View style={styles.specialBox}>
          <Text style={styles.specialLabel}>{t('nearby.todaysSpecial')}</Text>
          <Text style={styles.specialText}>{r.localizedSpecial}</Text>
        </View>
      ) : null}
      <View style={styles.sheetButtons}>
        <TouchableOpacity style={styles.btnPrimary}>
          <Text style={styles.btnPrimaryText}>{t('nearby.checkIn')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnOutline}>
          <Text style={styles.btnOutlineText}>{t('nearby.viewEvents')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnOutline}>
          <Text style={styles.btnOutlineText}>{t('nearby.chatAbout')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ---------------------------------------------------------------------------
  // Event bottom sheet content
  // ---------------------------------------------------------------------------
  const renderEventSheet = (e: NearbyEvent) => {
    const dateLabel = new Date(e.date).toLocaleDateString(
      lang === 'es' ? 'es-ES' : 'en-US',
      { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    );

    return (
      <View style={styles.sheetContent}>
        <View style={styles.sheetHandle} />
        <TouchableOpacity style={styles.sheetClose} onPress={hideSheet}>
          <Text style={styles.sheetCloseText}>×</Text>
        </TouchableOpacity>
        <View style={styles.sheetRow}>
          {e.isToday && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>{t('nearby.eventToday')}</Text>
            </View>
          )}
          <View style={styles.goldBadge}>
            <Text style={styles.goldBadgeText}>{e.gold_multiplier}× Gold</Text>
          </View>
        </View>
        <Text style={styles.sheetTitle}>{e.localizedName}</Text>
        <Text style={styles.sheetSubtitle}>{dateLabel}</Text>
        <Text style={styles.rsvpCount}>{t('nearby.goingCount', { count: e.totalRsvps })}</Text>
        <Text style={styles.ticketText}>
          {e.ticket_price_sol === 0
            ? t('nearby.ticketFree')
            : t('nearby.ticketPrice', { amount: e.ticket_price_sol })}
        </Text>
        <TouchableOpacity style={styles.btnPrimary}>
          <Text style={styles.btnPrimaryText}>
            {e.ticket_price_sol === 0 ? 'RSVP' : t('events.buyTicket')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ---------------------------------------------------------------------------
  // Leaderboard row
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      {renderTabBar()}

      {/* ---- Restaurants Tab ---- */}
      {activeTab === 0 && (
        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFillObject}
            initialRegion={mapRegion}
            showsUserLocation
            onPress={() => {
              if (selectedRestaurant || selectedEvent) hideSheet();
            }}
          >
            {restaurants.map(renderRestaurantMarker)}
          </MapView>

          {rLoading && (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <Text style={styles.loadingText}>{t('nearby.loading')}</Text>
            </View>
          )}

          {restaurants.length === 0 && !rLoading && (
            <View style={styles.emptyOverlay} pointerEvents="none">
              <Text style={styles.emptyText}>{t('nearby.noRestaurants')}</Text>
            </View>
          )}

          {/* Bottom sheet */}
          <Animated.View
            style={[
              styles.bottomSheet,
              { transform: [{ translateY: sheetAnim }] },
            ]}
          >
            {selectedRestaurant ? renderRestaurantSheet(selectedRestaurant) : null}
          </Animated.View>
        </View>
      )}

      {/* ---- Events Tab ---- */}
      {activeTab === 1 && (
        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFillObject}
            initialRegion={mapRegion}
            showsUserLocation
            onPress={() => {
              if (selectedEvent || selectedRestaurant) hideSheet();
            }}
          >
            {events.map(renderEventMarker)}
          </MapView>

          {/* Filter chips overlay */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScrollContainer}
            contentContainerStyle={styles.filterScrollContent}
            pointerEvents="box-none"
          >
            {FILTER_CHIPS.map((chip) => (
              <TouchableOpacity
                key={chip}
                style={[
                  styles.filterChip,
                  eventFilter === chip && styles.filterChipActive,
                ]}
                onPress={() => setEventFilter(chip)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    eventFilter === chip && styles.filterChipTextActive,
                  ]}
                >
                  {t(filterKey[chip])}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {events.length === 0 && (
            <View style={styles.emptyOverlay} pointerEvents="none">
              <Text style={styles.emptyText}>{t('nearby.noEvents')}</Text>
            </View>
          )}

          {/* Bottom sheet */}
          <Animated.View
            style={[
              styles.bottomSheet,
              { transform: [{ translateY: sheetAnim }] },
            ]}
          >
            {selectedEvent ? renderEventSheet(selectedEvent) : null}
          </Animated.View>
        </View>
      )}

      {/* ---- Leaderboard Tab ---- */}
      {activeTab === 2 && (
        <ScrollView style={styles.leaderContainer}>
          <Text style={styles.leaderTitle}>{t('nearby.leaderboardWeekly')}</Text>
          <Text style={styles.leaderPrize}>{t('nearby.leaderboardPrize')}</Text>

          {/* Your rank banner */}
          <View style={styles.myRankBanner}>
            <Text style={styles.myRankText}>{t('nearby.yourRank', { rank: 7 })}</Text>
            <Text style={styles.countdownText}>
              {t('nearby.weeklyReset', { time: countdown })}
            </Text>
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
  tabPillActive: {
    backgroundColor: COLORS.primary,
  },
  tabPillText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  tabPillTextActive: {
    color: '#fff',
  },

  // Map
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },

  // Overlays
  loadingOverlay: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 13,
  },
  emptyOverlay: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyText: {
    color: '#fff',
    fontSize: 14,
  },

  // Filter chips
  filterScrollContainer: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
  },
  filterScrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#F5C518',
  },
  filterChipText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#000',
  },

  // Markers
  restaurantMarker: {
    backgroundColor: '#F5C518',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventMarker: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventMarkerToday: {
    borderWidth: 3,
    borderColor: '#FF6B35',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#F5C518',
    backgroundColor: 'transparent',
  },
  eventBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 20,
  },
  sheetContent: {
    flex: 1,
    padding: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textMuted,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetClose: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseText: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 22,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  sheetSubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 12,
  },
  sheetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  distanceBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceBadgeText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  xaumBadge: {
    backgroundColor: '#F5C51833',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xaumBadgeText: {
    color: '#F5C518',
    fontSize: 13,
    fontWeight: '600',
  },
  goldBadge: {
    backgroundColor: '#F5C518',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  goldBadgeText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
  todayBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  specialBox: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  specialLabel: {
    color: '#F5C518',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  specialText: {
    color: '#fff',
    fontSize: 14,
  },
  sheetButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 'auto',
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  btnOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnOutlineText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  rsvpCount: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 4,
  },
  ticketText: {
    color: '#F5C518',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },

  // Leaderboard
  leaderContainer: {
    flex: 1,
    padding: 16,
  },
  leaderTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  leaderPrize: {
    color: '#F5C518',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
  },
  myRankBanner: {
    borderWidth: 2,
    borderColor: '#F5C518',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#F5C51811',
  },
  myRankText: {
    color: '#F5C518',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  countdownText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
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
  leaderRowMe: {
    backgroundColor: '#F5C51822',
    borderWidth: 1,
    borderColor: '#F5C518',
  },
  leaderRank: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 32,
  },
  leaderRankTop: {
    color: '#F5C518',
  },
  leaderMedal: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  leaderName: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  leaderNameMe: {
    fontWeight: '800',
  },
  leaderXaum: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  leaderXaumMe: {
    color: '#F5C518',
    fontWeight: '800',
  },
});
