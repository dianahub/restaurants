import { clusterApiUrl } from '@solana/web3.js';

export const SOLANA_ENDPOINT = 'https://api.devnet.solana.com';
export const SOLANA_CLUSTER = 'devnet' as const;

// Fallback using web3.js helper (same result)
export const SOLANA_RPC_URL = clusterApiUrl('devnet');
