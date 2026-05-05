/**
 * seekerVerification.ts
 *
 * SGT (Seeker Genesis Token) verification using Token-2022 extensions.
 * All three conditions must pass for a wallet to be considered verified:
 *   1. mintAuthority === SGT_MINT_AUTHORITY
 *   2. MetadataPointer.metadataAddress === SGT_METADATA_AUTHORITY
 *   3. TokenGroupMember extension is present on the mint
 *
 * Anti-sybil note (per docs.solanamobile.com):
 *   SGTs are transferable between wallet accounts, so always track the
 *   *mint address*, not the token account address, for uniqueness.
 *
 * Uses Helius getTokenAccountsByOwnerV2 with cursor pagination so wallets
 * with hundreds of Token-2022 accounts are handled correctly.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  unpackMint,
  getMetadataPointerState,
  getTokenGroupMemberState,
} from '@solana/spl-token';
import { SGT_MINT_AUTHORITY, SGT_METADATA_AUTHORITY } from '../constants/sgt';

// ---------------------------------------------------------------------------
// Helius paginated fetch
// ---------------------------------------------------------------------------

interface HeliusTokenAccount {
  pubkey: string;
  account: {
    data: [string, 'base64'];
    executable: boolean;
    lamports: number;
    owner: string;
    rentEpoch: number;
    space: number;
  };
}

interface HeliusResponse {
  id: number;
  jsonrpc: string;
  result: {
    context: { slot: number };
    value: HeliusTokenAccount[];
  };
  cursor?: string;
}

async function fetchToken2022AccountsPage(
  heliusRpcUrl: string,
  walletAddress: string,
  cursor?: string,
): Promise<{ accounts: HeliusTokenAccount[]; nextCursor: string | undefined }> {
  const params: unknown[] = [
    walletAddress,
    { programId: TOKEN_2022_PROGRAM_ID.toString() },
    { encoding: 'base64', limit: 1000, ...(cursor ? { cursor } : {}) },
  ];

  const res = await fetch(heliusRpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwnerV2', params }),
  });

  if (!res.ok) throw new Error(`Helius RPC error: ${res.status}`);
  const json: HeliusResponse = await res.json();

  return {
    accounts: json.result?.value ?? [],
    nextCursor: json.cursor,
  };
}

async function fetchAllToken2022Accounts(
  heliusRpcUrl: string,
  walletAddress: string,
): Promise<HeliusTokenAccount[]> {
  const all: HeliusTokenAccount[] = [];
  let cursor: string | undefined;

  do {
    const { accounts, nextCursor } = await fetchToken2022AccountsPage(
      heliusRpcUrl,
      walletAddress,
      cursor,
    );
    all.push(...accounts);
    cursor = nextCursor;
  } while (cursor);

  return all;
}

// ---------------------------------------------------------------------------
// Per-mint SGT check
// ---------------------------------------------------------------------------

async function isSGTMint(connection: Connection, mintAddress: PublicKey): Promise<boolean> {
  const accountInfo = await connection.getAccountInfo(mintAddress);
  if (!accountInfo) return false;

  // Unpack with Token-2022 program so all TLV extensions are decoded
  const mint = unpackMint(mintAddress, accountInfo, TOKEN_2022_PROGRAM_ID);

  // Condition 1 — mint authority
  if (!mint.mintAuthority || !mint.mintAuthority.equals(SGT_MINT_AUTHORITY)) {
    return false;
  }

  // Condition 2 — MetadataPointer must point to the official SGT metadata account
  const metadataPointer = getMetadataPointerState(mint);
  if (!metadataPointer?.metadataAddress?.equals(SGT_METADATA_AUTHORITY)) {
    return false;
  }

  // Condition 3 — TokenGroupMember extension must be present
  const tokenGroupMember = getTokenGroupMemberState(mint);
  if (!tokenGroupMember) {
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SGTCheckResult {
  verified: boolean;
  /** The mint address of the verified SGT, or null if not found.
   *  Track this for anti-sybil — SGTs are transferable, so one SGT mint
   *  should only map to one user account in your backend. */
  mintAddress: string | null;
}

/**
 * Checks whether a wallet holds a valid SGT by inspecting all Token-2022
 * token accounts via Helius with pagination, then verifying the three
 * required extensions on each mint.
 *
 * @param walletAddress  Base-58 wallet public key
 * @param heliusRpcUrl   Full Helius RPC URL including api-key query param
 * @param connection     Solana Connection for fetching mint account data
 */
export async function checkWalletForSGT(
  walletAddress: string,
  heliusRpcUrl: string,
  connection: Connection,
): Promise<SGTCheckResult> {
  let accounts: HeliusTokenAccount[];
  try {
    accounts = await fetchAllToken2022Accounts(heliusRpcUrl, walletAddress);
  } catch (err) {
    console.error('[SGT] Helius fetch failed:', err);
    return { verified: false, mintAddress: null };
  }

  for (const tokenAccount of accounts) {
    // Derive mint from the token account owner field isn't right — we need
    // to decode the token account data to get the mint. For base64 encoded
    // accounts, parse the raw data: first 32 bytes = mint pubkey.
    let mintAddress: PublicKey;
    try {
      const raw = Buffer.from(tokenAccount.account.data[0], 'base64');
      mintAddress = new PublicKey(raw.subarray(0, 32));
    } catch {
      continue;
    }

    try {
      const verified = await isSGTMint(connection, mintAddress);
      if (verified) {
        return { verified: true, mintAddress: mintAddress.toString() };
      }
    } catch {
      // Non-fatal — continue checking remaining accounts
      continue;
    }
  }

  return { verified: false, mintAddress: null };
}
