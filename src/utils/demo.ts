/**
 * demo.ts — Seed data for Miami Beach hackathon demo.
 * Provides realistic restaurant, event, leaderboard, and wallet fixture data.
 */

import type { RestaurantNFT } from './digitalTwin';

// ---------------------------------------------------------------------------
// Restaurants (Miami Beach, real coordinates)
// ---------------------------------------------------------------------------

export const DEMO_RESTAURANTS: (RestaurantNFT & { distanceKm: number })[] = [
  {
    nftAddress: 'DEMO_NFT_CASAMIA_001',
    metadataUri: '',
    ownerAddress: 'DEMO_OWNER_001',
    name_en: 'Casa Mia',
    name_es: 'Casa Mia',
    description_en: 'Authentic Italian trattoria on Collins Ave with wood-fired pizza and fresh pasta.',
    description_es: 'Trattoria italiana auténtica en Collins Ave con pizza al horno de leña y pasta fresca.',
    cuisine: 'Italian',
    lat: 25.7825,
    lng: -80.13,
    reward_multiplier: 3,
    gold_staked: 450,
    todays_special_en: 'Truffle tagliatelle with black truffle and parmigiano',
    todays_special_es: 'Tagliatelle de trufa con trufa negra y parmigiano',
    logo_url: '',
    language_preference: 'both',
    distanceKm: 0.4,
  },
  {
    nftAddress: 'DEMO_NFT_ELRINCON_002',
    metadataUri: '',
    ownerAddress: 'DEMO_OWNER_002',
    name_en: 'El Rincón',
    name_es: 'El Rincón',
    description_en: 'Traditional Cuban restaurant on Ocean Drive with live music nightly.',
    description_es: 'Restaurante cubano tradicional en Ocean Drive con música en vivo todas las noches.',
    cuisine: 'Cuban',
    lat: 25.778,
    lng: -80.131,
    reward_multiplier: 1,
    gold_staked: 120,
    todays_special_en: 'Ropa vieja with black beans and sweet plantains',
    todays_special_es: 'Ropa vieja con frijoles negros y plátanos maduros',
    logo_url: '',
    language_preference: 'es',
    distanceKm: 0.8,
  },
  {
    nftAddress: 'DEMO_NFT_SUNSETTACOS_003',
    metadataUri: '',
    ownerAddress: 'DEMO_OWNER_003',
    name_en: 'Sunset Tacos',
    name_es: 'Tacos del Atardecer',
    description_en: 'Vibrant Mexican street tacos on Lincoln Road. Happy hour tonight 4× gold!',
    description_es: 'Vibrantes tacos mexicanos en Lincoln Road. ¡Happy hour esta noche 4× oro!',
    cuisine: 'Mexican',
    lat: 25.79,
    lng: -80.139,
    reward_multiplier: 4,
    gold_staked: 820,
    todays_special_en: '🌮 Happy Hour 5-9pm — 4× XAUm on every check-in!',
    todays_special_es: '🌮 Happy Hour 5-9pm — ¡4× XAUm en cada check-in!',
    logo_url: '',
    language_preference: 'both',
    distanceKm: 1.2,
  },
  {
    nftAddress: 'DEMO_NFT_WYNWOODBITES_004',
    metadataUri: '',
    ownerAddress: 'DEMO_OWNER_004',
    name_en: 'Wynwood Bites',
    name_es: 'Wynwood Bites',
    description_en: 'Artisan American bites on 5th St. Wine tasting Friday 8× gold multiplier.',
    description_es: 'Bocados americanos artesanales en 5th St. Cata de vinos el viernes con multiplicador 8× oro.',
    cuisine: 'American',
    lat: 25.7745,
    lng: -80.134,
    reward_multiplier: 2,
    gold_staked: 310,
    todays_special_en: 'Smash burger with wagyu beef and truffle fries',
    todays_special_es: 'Smash burger de wagyu con papas fritas de trufa',
    logo_url: '',
    language_preference: 'both',
    distanceKm: 1.7,
  },
  {
    nftAddress: 'DEMO_NFT_LAPALMA_005',
    metadataUri: '',
    ownerAddress: 'DEMO_OWNER_005',
    name_en: 'La Palma',
    name_es: 'La Palma',
    description_en: 'Spanish tapas bar on Española Way — the heart of Miami Beach.',
    description_es: 'Bar de tapas españolas en Española Way — el corazón de Miami Beach.',
    cuisine: 'Spanish',
    lat: 25.776,
    lng: -80.135,
    reward_multiplier: 1,
    gold_staked: 95,
    todays_special_en: 'Gambas al ajillo and jamón ibérico charcuterie board',
    todays_special_es: 'Gambas al ajillo y tabla de jamón ibérico',
    logo_url: '',
    language_preference: 'es',
    distanceKm: 1.4,
  },
];

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface DemoEvent {
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

function todayAt(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function nextFridayAt(hour: number): string {
  const d = new Date();
  const daysUntilFriday = (5 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilFriday);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const DEMO_EVENTS: DemoEvent[] = [
  {
    nftAddress: 'DEMO_EVENT_HAPPYHOUR_001',
    name_en: 'Sunset Tacos Happy Hour',
    name_es: 'Happy Hour Tacos del Atardecer',
    restaurantNFT: 'DEMO_NFT_SUNSETTACOS_003',
    restaurantName_en: 'Sunset Tacos',
    restaurantName_es: 'Tacos del Atardecer',
    lat: 25.79,
    lng: -80.139,
    date: todayAt(17),
    gold_multiplier: 4,
    ticket_price_sol: 0,
    type: 'happy-hour',
    totalRsvps: 47,
  },
  {
    nftAddress: 'DEMO_EVENT_WINETASTING_002',
    name_en: 'Wynwood Wine Tasting',
    name_es: 'Cata de Vinos Wynwood',
    restaurantNFT: 'DEMO_NFT_WYNWOODBITES_004',
    restaurantName_en: 'Wynwood Bites',
    restaurantName_es: 'Wynwood Bites',
    lat: 25.7745,
    lng: -80.134,
    date: nextFridayAt(19),
    gold_multiplier: 8,
    ticket_price_sol: 0.5,
    type: 'wine-tasting',
    totalRsvps: 12,
  },
];

// ---------------------------------------------------------------------------
// Leaderboard (10 bilingual entries — mix of EN and ES names)
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  rank: number;
  display: string;
  xaum: number;
  isMe: boolean;
  flag?: string;
}

export function buildLeaderboard(walletDisplay: string): LeaderboardEntry[] {
  return [
    { rank: 1, display: 'goldking.skr', xaum: 4250, isMe: false },
    { rank: 2, display: 'carlos.skr', xaum: 3890, isMe: false, flag: '🇪🇸' },
    { rank: 3, display: walletDisplay, xaum: 2890, isMe: true },
    { rank: 4, display: 'miami_sol.skr', xaum: 2100, isMe: false, flag: '🇺🇸' },
    { rank: 5, display: 'ana_reyes.skr', xaum: 1850, isMe: false, flag: '🇲🇽' },
    { rank: 6, display: 'nftlover.skr', xaum: 1320, isMe: false },
    { rank: 7, display: 'juan_crypto.skr', xaum: 980, isMe: false, flag: '🇨🇴' },
    { rank: 8, display: 'solana.skr', xaum: 750, isMe: false },
    { rank: 9, display: 'maria_gold.skr', xaum: 420, isMe: false, flag: '🇨🇺' },
    { rank: 10, display: 'hodler.skr', xaum: 180, isMe: false },
  ];
}

// ---------------------------------------------------------------------------
// Demo wallet state
// ---------------------------------------------------------------------------

export const DEMO_WALLET = {
  xaumBalance: 0.005,
  xaumUsdValue: 15.23,
  solBalance: 2.47,
  streak: 7,
  rank: 3,
  level: 4,
  points: 2890,
  ticketNFTs: 3,
  goldPrice: 3046, // USD per troy oz
} as const;
