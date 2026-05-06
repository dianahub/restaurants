import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';

export type EventFilter = 'all' | 'tonight' | 'this-week' | 'free' | 'paid';

export interface NearbyEvent {
  nftAddress: string;
  name_en: string;
  name_es: string;
  restaurantNFT: string;
  restaurantName_en: string;
  restaurantName_es: string;
  lat: number;
  lng: number;
  date: string; // ISO 8601
  gold_multiplier: number;
  ticket_price_sol: number; // 0 = free
  type: string;
  isToday: boolean;
  totalRsvps: number;
  localizedName: string;
  distanceKm: number;
}

interface RawEvent {
  nftAddress: string;
  name_en: string;
  name_es: string;
  restaurantNFT: string;
  restaurantName_en: string;
  restaurantName_es: string;
  lat: number;
  lng: number;
  date: string;
  gold_multiplier: number;
  ticket_price_sol: number;
  type: string;
  totalRsvps: number;
}

const BASE_URL = (process.env.EXPO_PUBLIC_VERIFY_ENDPOINT ?? '').replace(
  '/api/verify-seeker',
  '',
);

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isEventToday(dateStr: string): boolean {
  const eventDate = new Date(dateStr);
  const today = new Date();
  return (
    eventDate.getFullYear() === today.getFullYear() &&
    eventDate.getMonth() === today.getMonth() &&
    eventDate.getDate() === today.getDate()
  );
}

function applyFilter(events: NearbyEvent[], filter: EventFilter): NearbyEvent[] {
  const now = new Date();
  switch (filter) {
    case 'all':
      return events;
    case 'tonight': {
      return events.filter((e) => {
        const d = new Date(e.date);
        return isEventToday(e.date) && d.getHours() >= 17;
      });
    }
    case 'this-week': {
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return events.filter((e) => {
        const d = new Date(e.date);
        return d >= now && d <= weekFromNow;
      });
    }
    case 'free':
      return events.filter((e) => e.ticket_price_sol === 0);
    case 'paid':
      return events.filter((e) => e.ticket_price_sol > 0);
    default:
      return events;
  }
}

export function useNearbyEvents(
  location: Location.LocationObject | null,
  lang: 'en' | 'es',
  filter: EventFilter,
): {
  events: NearbyEvent[];
  loading: boolean;
  error: string | null;
  restaurantNFTsWithEventToday: Set<string>;
} {
  const [allEvents, setAllEvents] = useState<NearbyEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const langRef = useRef(lang);
  langRef.current = lang;

  const fetchEvents = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    setError(null);
    try {
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      const url = `${BASE_URL}/api/events?action=nearby&lat=${lat}&lng=${lng}&radius=5`;
      const res = await fetch(url);
      if (!res.ok) {
        setAllEvents([]);
        return;
      }
      const data = (await res.json()) as { events?: RawEvent[] };
      const raw: RawEvent[] = data.events ?? [];
      const mapped: NearbyEvent[] = raw.map((e) => ({
        ...e,
        isToday: isEventToday(e.date),
        localizedName:
          langRef.current === 'es' ? e.name_es || e.name_en : e.name_en || e.name_es,
        distanceKm: haversineKm(lat, lng, e.lat, e.lng),
      }));
      // Sort by date ascending
      mapped.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setAllEvents(mapped);
    } catch {
      // Graceful fallback — API not deployed yet
      setAllEvents([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [location]);

  // Re-localize on lang change
  useEffect(() => {
    setAllEvents((prev) =>
      prev.map((e) => ({
        ...e,
        localizedName: lang === 'es' ? e.name_es || e.name_en : e.name_en || e.name_es,
      })),
    );
  }, [lang]);

  // Initial fetch + 60s interval
  useEffect(() => {
    if (!location) return;
    fetchEvents();
    const interval = setInterval(fetchEvents, 60_000);
    return () => clearInterval(interval);
  }, [fetchEvents, location]);

  const events = applyFilter(allEvents, filter).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const restaurantNFTsWithEventToday = new Set(
    allEvents.filter((e) => e.isToday).map((e) => e.restaurantNFT),
  );

  return { events, loading, error, restaurantNFTsWithEventToday };
}
