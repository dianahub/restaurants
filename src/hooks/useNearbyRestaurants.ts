import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { getNearbyRestaurants, RestaurantNFT } from '../utils/digitalTwin';

export interface NearbyRestaurant extends RestaurantNFT {
  distanceKm: number;
  localizedName: string;
  localizedDescription: string;
  localizedSpecial: string | null;
}

function localizeRestaurant(
  r: RestaurantNFT & { distanceKm: number },
  lang: 'en' | 'es',
): NearbyRestaurant {
  return {
    ...r,
    localizedName: lang === 'es' ? r.name_es || r.name_en : r.name_en || r.name_es,
    localizedDescription:
      lang === 'es'
        ? r.description_es || r.description_en
        : r.description_en || r.description_es,
    localizedSpecial:
      lang === 'es'
        ? r.todays_special_es ?? r.todays_special_en ?? null
        : r.todays_special_en ?? r.todays_special_es ?? null,
  };
}

export function useNearbyRestaurants(
  location: Location.LocationObject | null,
  lang: 'en' | 'es',
): {
  restaurants: NearbyRestaurant[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [restaurants, setRestaurants] = useState<NearbyRestaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const langRef = useRef(lang);
  langRef.current = lang;

  const fetchRestaurants = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    setError(null);
    try {
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      const results = await getNearbyRestaurants(lat, lng, 5);
      setRestaurants(results.map((r) => localizeRestaurant(r, langRef.current)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, [location]);

  // Re-localize when lang changes without re-fetching
  useEffect(() => {
    setRestaurants((prev) =>
      prev.map((r) => localizeRestaurant(r, lang)),
    );
  }, [lang]);

  // Initial fetch + interval
  useEffect(() => {
    if (!location) return;
    fetchRestaurants();
    const interval = setInterval(fetchRestaurants, 60_000);
    return () => clearInterval(interval);
  }, [fetchRestaurants, location]);

  return { restaurants, loading, error, refetch: fetchRestaurants };
}
