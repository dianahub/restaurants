/**
 * digitalTwin.ts — Restaurant Digital Twin via Metaplex NFT on devnet
 *
 * Architecture:
 *   1. App uploads metadata JSON → /api/restaurant (action=upload-metadata) → S3 → URI
 *   2. App mints NFT via Metaplex using that URI, signed through MWA (Seed Vault on Seeker)
 *   3. App saves restaurant record + NFT address → /api/restaurant (action=create) → DynamoDB
 *
 * getNearbyRestaurants queries DynamoDB via Lambda with bounding box,
 * then sorts client-side by distance + gold_staked weight.
 */

import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { Metaplex, walletAdapterIdentity } from '@metaplex-foundation/js';

// Minimal WalletAdapter shape required by Metaplex walletAdapterIdentity
interface WalletAdapter {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  name: string;
  url: string;
  icon: string;
  readyState: string;
  supportedTransactionVersions?: ReadonlySet<string | number>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendTransaction(...args: unknown[]): Promise<string>;
  signTransaction?<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions?<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOLANA_ENDPOINT } from '../constants/solana';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RestaurantData {
  name_en: string;
  name_es: string;
  description_en: string;
  description_es: string;
  cuisine: string;
  lat: number;
  lng: number;
  reward_multiplier: number;
  gold_staked: number;
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  todays_special_en?: string;
  todays_special_es?: string;
  logo_url?: string;
  language_preference: 'en' | 'es' | 'both';
}

export interface RestaurantNFT extends RestaurantData {
  nftAddress: string;
  metadataUri: string;
  ownerAddress: string;
}

// Shape passed in from useMobileWallet()
export interface MWAWalletRef {
  account: { publicKey: PublicKey; address: PublicKey } | undefined;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
}

const API_BASE =
  process.env.EXPO_PUBLIC_VERIFY_ENDPOINT?.replace('/verify-seeker', '') ??
  'https://restaurants-3r6r77lsk-diana-castillos-projects-822715ab.vercel.app';

const ASYNC_KEY = 'seekerapp:owned_restaurant';

// ---------------------------------------------------------------------------
// MWA → WalletAdapter bridge (so Metaplex can sign via Seed Vault)
// ---------------------------------------------------------------------------

function buildWalletAdapter(mwa: MWAWalletRef): WalletAdapter {
  if (!mwa.account) throw new Error('Wallet not connected');
  return {
    publicKey: mwa.account.publicKey,
    connected: true,
    connecting: false,
    disconnecting: false,
    name: 'Seed Vault' as never,
    url: '',
    icon: '',
    readyState: 'Installed' as never,
    supportedTransactionVersions: new Set(['legacy', 0] as const),
    connect: async () => {},
    disconnect: async () => {},
    sendTransaction: async () => '' as never,
    signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> =>
      mwa.signTransaction(tx),
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(
      txs: T[],
    ): Promise<T[]> => mwa.signTransactions(txs),
  };
}

function buildMetaplex(mwa: MWAWalletRef, connection: Connection): Metaplex {
  return Metaplex.make(connection).use(walletAdapterIdentity(buildWalletAdapter(mwa)));
}

// ---------------------------------------------------------------------------
// Metadata helpers
// ---------------------------------------------------------------------------

function toNFTAttributes(data: RestaurantData) {
  const attrs: { trait_type: string; value: string | number }[] = [
    { trait_type: 'description_en', value: data.description_en },
    { trait_type: 'description_es', value: data.description_es },
    { trait_type: 'cuisine', value: data.cuisine },
    { trait_type: 'lat', value: data.lat },
    { trait_type: 'lng', value: data.lng },
    { trait_type: 'reward_multiplier', value: data.reward_multiplier },
    { trait_type: 'gold_staked', value: data.gold_staked },
    { trait_type: 'language_preference', value: data.language_preference },
  ];
  if (data.instagram) attrs.push({ trait_type: 'instagram', value: data.instagram });
  if (data.tiktok) attrs.push({ trait_type: 'tiktok', value: data.tiktok });
  if (data.twitter) attrs.push({ trait_type: 'twitter', value: data.twitter });
  if (data.todays_special_en) attrs.push({ trait_type: 'todays_special_en', value: data.todays_special_en });
  if (data.todays_special_es) attrs.push({ trait_type: 'todays_special_es', value: data.todays_special_es });
  return attrs;
}

function attributesToData(
  attributes: { trait_type: string; value: string | number }[],
): Partial<RestaurantData> {
  const map = Object.fromEntries(attributes.map((a) => [a.trait_type, a.value]));
  return map as Partial<RestaurantData>;
}

// ---------------------------------------------------------------------------
// S3 metadata upload via Lambda
// ---------------------------------------------------------------------------

async function uploadMetadataToS3(data: RestaurantData, name: string): Promise<string> {
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
  };
  const res = await fetch(`${API_BASE}/api/restaurant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Metadata upload failed');
  const { uri } = (await res.json()) as { uri: string };
  return uri;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function createRestaurantNFT(
  mwa: MWAWalletRef,
  data: RestaurantData,
  connection: Connection,
): Promise<RestaurantNFT> {
  if (!mwa.account) throw new Error('Wallet not connected');

  const name = data.language_preference === 'es' ? data.name_es : data.name_en;

  // 1. Upload metadata JSON to S3 via Lambda, get URI
  const metadataUri = await uploadMetadataToS3(data, name);

  // 2. Mint NFT via Metaplex (Seed Vault signs on Seeker)
  const metaplex = buildMetaplex(mwa, connection);
  const { nft } = await metaplex.nfts().create({
    name,
    uri: metadataUri,
    sellerFeeBasisPoints: 0,
    isMutable: true,
  });

  const result: RestaurantNFT = {
    ...data,
    nftAddress: nft.address.toString(),
    metadataUri,
    ownerAddress: mwa.account.address.toString(),
  };

  // 3. Persist in DynamoDB via Lambda
  await fetch(`${API_BASE}/api/restaurant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', restaurant: result }),
  });

  // 4. Cache locally
  await AsyncStorage.setItem(ASYNC_KEY, JSON.stringify(result));

  return result;
}

export async function updateRestaurantNFT(
  mwa: MWAWalletRef,
  nftAddress: string,
  updates: Partial<RestaurantData>,
  connection: Connection,
): Promise<RestaurantNFT> {
  if (!mwa.account) throw new Error('Wallet not connected');

  // Merge with existing cached data
  const cached = await AsyncStorage.getItem(ASYNC_KEY);
  const existing: RestaurantNFT = cached ? JSON.parse(cached) : ({} as RestaurantNFT);
  const merged: RestaurantNFT = { ...existing, ...updates, nftAddress };

  const name = merged.language_preference === 'es' ? merged.name_es : merged.name_en;
  const newUri = await uploadMetadataToS3(merged, name);

  const metaplex = buildMetaplex(mwa, connection);
  const nft = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(nftAddress) });
  await metaplex.nfts().update({ nftOrSft: nft, uri: newUri, name });

  merged.metadataUri = newUri;

  await fetch(`${API_BASE}/api/restaurant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', nftAddress, updates: merged }),
  });

  await AsyncStorage.setItem(ASYNC_KEY, JSON.stringify(merged));
  return merged;
}

export async function getRestaurantNFT(
  nftAddress: string,
  connection: Connection,
): Promise<RestaurantNFT | null> {
  try {
    const metaplex = Metaplex.make(connection);
    const nft = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(nftAddress) });

    // Fetch metadata JSON from URI
    const res = await fetch(nft.uri);
    const meta = await res.json();
    const attrs = attributesToData(meta.attributes ?? []);

    return {
      nftAddress,
      metadataUri: nft.uri,
      ownerAddress: nft.creators[0]?.address?.toString() ?? '',
      name_en: meta.name ?? '',
      name_es: meta.name ?? '',
      description_en: meta.description ?? '',
      description_es: (attrs.description_es as string) ?? meta.description ?? '',
      cuisine: (attrs.cuisine as string) ?? '',
      lat: Number(attrs.lat ?? 0),
      lng: Number(attrs.lng ?? 0),
      reward_multiplier: Number(attrs.reward_multiplier ?? 1),
      gold_staked: Number(attrs.gold_staked ?? 0),
      instagram: attrs.instagram as string | undefined,
      tiktok: attrs.tiktok as string | undefined,
      twitter: attrs.twitter as string | undefined,
      todays_special_en: attrs.todays_special_en as string | undefined,
      todays_special_es: attrs.todays_special_es as string | undefined,
      logo_url: meta.image,
      language_preference: (attrs.language_preference as 'en' | 'es' | 'both') ?? 'both',
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Haversine distance (km)
// ---------------------------------------------------------------------------

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

export async function getNearbyRestaurants(
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<(RestaurantNFT & { distanceKm: number })[]> {
  const res = await fetch(
    `${API_BASE}/api/restaurant?action=nearby&lat=${lat}&lng=${lng}&radius=${radiusKm}`,
  );
  if (!res.ok) return [];
  const { restaurants } = (await res.json()) as { restaurants: RestaurantNFT[] };

  return restaurants
    .map((r) => ({ ...r, distanceKm: haversineKm(lat, lng, r.lat, r.lng) }))
    .filter((r) => r.distanceKm <= radiusKm)
    .sort((a, b) => {
      // Weight: closer = better, more gold_staked = better
      const scoreA = a.distanceKm - a.gold_staked * 0.1;
      const scoreB = b.distanceKm - b.gold_staked * 0.1;
      return scoreA - scoreB;
    });
}
