/**
 * Vercel Serverless Function — POST /api/verify-seeker
 *
 * Deploy: push to GitHub → Vercel auto-deploys.
 * Set these in your Vercel project → Settings → Environment Variables:
 *   HELIUS_RPC_URL   https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
 *   CLAIMED_MINTS_TABLE  (optional, for DynamoDB anti-sybil store)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Connection } from '@solana/web3.js';
import { verifySignIn } from '@solana/wallet-standard-util';
import type { SolanaSignInInput, SolanaSignInOutput } from '@solana/wallet-standard-features';
import { checkWalletForSGT } from '../src/utils/seekerVerification';

// ---------------------------------------------------------------------------
// Anti-sybil store
// Replace with DynamoDB / Postgres / Upstash when you're ready for production.
// This in-memory set resets on each cold start — fine for testing.
// ---------------------------------------------------------------------------
const claimedMints = new Set<string>();

async function isMintAlreadyClaimed(mintAddress: string): Promise<boolean> {
  return claimedMints.has(mintAddress);
}

async function claimMint(mintAddress: string): Promise<void> {
  claimedMints.add(mintAddress);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

interface VerifyBody {
  signInInput: SolanaSignInInput;
  signInOutput: SolanaSignInOutput;
  walletAddress: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — allow the mobile app to call this from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { signInInput, signInOutput, walletAddress } = (req.body ?? {}) as Partial<VerifyBody>;

  if (!signInInput || !signInOutput || !walletAddress) {
    return res.status(400).json({ verified: false, mintAddress: null, error: 'Missing fields' });
  }

  // 1. Verify SIWS — proves caller owns the wallet
  const signatureValid = verifySignIn(signInInput, signInOutput);
  if (!signatureValid) {
    return res.status(401).json({ verified: false, mintAddress: null, error: 'Invalid signature' });
  }

  if ((signInOutput.account as { address: string }).address !== walletAddress) {
    return res.status(401).json({ verified: false, mintAddress: null, error: 'Address mismatch' });
  }

  // 2. Check SGT via Helius
  const heliusRpcUrl = process.env.HELIUS_RPC_URL;
  if (!heliusRpcUrl) {
    return res.status(500).json({ verified: false, mintAddress: null, error: 'HELIUS_RPC_URL not set' });
  }

  const connection = new Connection(heliusRpcUrl, 'confirmed');
  const { verified, mintAddress } = await checkWalletForSGT(walletAddress, heliusRpcUrl, connection);

  if (!verified || !mintAddress) {
    return res.status(200).json({ verified: false, mintAddress: null });
  }

  // 3. Anti-sybil
  if (await isMintAlreadyClaimed(mintAddress)) {
    return res.status(409).json({ verified: false, mintAddress: null, error: 'SGT already claimed' });
  }

  await claimMint(mintAddress);
  return res.status(200).json({ verified: true, mintAddress });
}
