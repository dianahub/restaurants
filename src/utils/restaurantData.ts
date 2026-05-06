/**
 * Shared restaurant data helpers that do not import Metaplex.
 *
 * Keep map/list data access separate from NFT minting so the normal React
 * Native bundle does not pull in Node-only Metaplex dependencies.
 */

export const API_BASE =
  process.env.EXPO_PUBLIC_VERIFY_ENDPOINT?.replace('/verify-seeker', '') ??
  'https://restaurants-3r6r77lsk-diana-castillos-projects-822715ab.vercel.app'

export interface RestaurantData {
  name_en: string
  name_es: string
  description_en: string
  description_es: string
  cuisine: string
  lat: number
  lng: number
  reward_multiplier: number
  gold_staked: number
  instagram?: string
  tiktok?: string
  twitter?: string
  todays_special_en?: string
  todays_special_es?: string
  logo_url?: string
  language_preference: 'en' | 'es' | 'both'
}

export interface RestaurantNFT extends RestaurantData {
  nftAddress: string
  metadataUri: string
  ownerAddress: string
}

export function toNFTAttributes(data: RestaurantData) {
  const attrs: { trait_type: string; value: string | number }[] = [
    { trait_type: 'description_en', value: data.description_en },
    { trait_type: 'description_es', value: data.description_es },
    { trait_type: 'cuisine', value: data.cuisine },
    { trait_type: 'lat', value: data.lat },
    { trait_type: 'lng', value: data.lng },
    { trait_type: 'reward_multiplier', value: data.reward_multiplier },
    { trait_type: 'gold_staked', value: data.gold_staked },
    { trait_type: 'language_preference', value: data.language_preference },
  ]
  if (data.instagram) attrs.push({ trait_type: 'instagram', value: data.instagram })
  if (data.tiktok) attrs.push({ trait_type: 'tiktok', value: data.tiktok })
  if (data.twitter) attrs.push({ trait_type: 'twitter', value: data.twitter })
  if (data.todays_special_en) attrs.push({ trait_type: 'todays_special_en', value: data.todays_special_en })
  if (data.todays_special_es) attrs.push({ trait_type: 'todays_special_es', value: data.todays_special_es })
  return attrs
}

export function attributesToData(
  attributes: { trait_type: string; value: string | number }[],
): Partial<RestaurantData> {
  const map = Object.fromEntries(attributes.map((a) => [a.trait_type, a.value]))
  return map as Partial<RestaurantData>
}

export async function uploadMetadataToS3(data: RestaurantData, name: string): Promise<string> {
  const payload = {
    action: 'upload-metadata',
    name,
    metadata: {
      name,
      description: data.description_en,
      image: data.logo_url ?? '',
      attributes: toNFTAttributes(data),
      properties: { category: 'image', files: [] },
    },
  }
  const res = await fetch(`${API_BASE}/api/restaurant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Metadata upload failed')
  const { uri } = (await res.json()) as { uri: string }
  return uri
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function getNearbyRestaurants(
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<(RestaurantNFT & { distanceKm: number })[]> {
  const res = await fetch(`${API_BASE}/api/restaurant?action=nearby&lat=${lat}&lng=${lng}&radius=${radiusKm}`)
  if (!res.ok) return []
  const { restaurants } = (await res.json()) as { restaurants: RestaurantNFT[] }

  return restaurants
    .map((r) => ({ ...r, distanceKm: haversineKm(lat, lng, r.lat, r.lng) }))
    .filter((r) => r.distanceKm <= radiusKm)
    .sort((a, b) => {
      const scoreA = a.distanceKm - a.gold_staked * 0.1
      const scoreB = b.distanceKm - b.gold_staked * 0.1
      return scoreA - scoreB
    })
}
