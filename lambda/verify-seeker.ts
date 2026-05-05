/**
 * Lambda handler: POST /api/verify-seeker
 *
 * Deploy this independently of the mobile app (AWS Lambda, Vercel Function,
 * Cloudflare Worker, etc.). It must NOT be bundled into the React Native app.
 *
 * Required environment variables:
 *   HELIUS_RPC_URL   — e.g. https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
 *   CLAIMED_MINTS_DB — connection string / table name for your anti-sybil store
 *
 * Request body (JSON):
 *   {
 *     signInInput:  SolanaSignInInput   (the payload you passed to wallet.signIn)
 *     signInOutput: SolanaSignInOutput  (what the wallet returned)
 *     walletAddress: string             (base-58 public key)
 *   }
 *
 * Response:
 *   { verified: boolean, mintAddress: string | null }
 */

import { Connection } from '@solana/web3.js';
import { verifySignIn } from '@solana/wallet-standard-util';
import type { SolanaSignInInput, SolanaSignInOutput } from '@solana/wallet-standard-features';
import { checkWalletForSGT } from '../src/utils/seekerVerification';

// ---------------------------------------------------------------------------
// Anti-sybil store — swap in your DB of choice
// ---------------------------------------------------------------------------

/**
 * Returns true if this SGT mint has already been used to verify a different
 * user. Replace the body with your DynamoDB / Postgres / Redis call.
 *
 * DynamoDB example:
 *   const client = new DynamoDBClient({});
 *   const res = await client.send(new GetItemCommand({
 *     TableName: process.env.CLAIMED_MINTS_TABLE,
 *     Key: { mintAddress: { S: mintAddress } },
 *   }));
 *   return !!res.Item;
 */
async function isMintAlreadyClaimed(mintAddress: string): Promise<boolean> {
  // TODO: replace with real DB lookup
  void mintAddress;
  return false;
}

/**
 * Records that this mint address is now claimed by a user.
 * Call after a successful verification to prevent re-use.
 */
async function claimMint(mintAddress: string, walletAddress: string): Promise<void> {
  // TODO: replace with real DB write
  void mintAddress;
  void walletAddress;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

interface VerifyRequest {
  signInInput: SolanaSignInInput;
  signInOutput: SolanaSignInOutput;
  walletAddress: string;
}

interface VerifyResponse {
  verified: boolean;
  mintAddress: string | null;
  error?: string;
}

// AWS Lambda-compatible handler signature — adapt as needed for other runtimes
export async function handler(event: { body: string }): Promise<{
  statusCode: number;
  body: string;
  headers: Record<string, string>;
}> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const fail = (status: number, error: string) => ({
    statusCode: status,
    headers,
    body: JSON.stringify({ verified: false, mintAddress: null, error } satisfies VerifyResponse),
  });

  // 1. Parse body
  let req: VerifyRequest;
  try {
    req = JSON.parse(event.body) as VerifyRequest;
  } catch {
    return fail(400, 'Invalid JSON body');
  }

  const { signInInput, signInOutput, walletAddress } = req;
  if (!signInInput || !signInOutput || !walletAddress) {
    return fail(400, 'Missing required fields');
  }

  // 2. Verify SIWS signature — proves the caller owns the wallet
  const signatureValid = verifySignIn(signInInput, signInOutput);
  if (!signatureValid) {
    return fail(401, 'Invalid SIWS signature');
  }

  // Ensure the signed address matches the claimed wallet
  if (signInOutput.account.address !== walletAddress) {
    return fail(401, 'Wallet address mismatch');
  }

  // 3. Check for SGT in wallet via Helius + Token-2022 extension validation
  const heliusRpcUrl = process.env.HELIUS_RPC_URL;
  if (!heliusRpcUrl) {
    return fail(500, 'Server misconfigured: HELIUS_RPC_URL not set');
  }

  // Use mainnet connection for SGT check — SGTs live on mainnet
  const connection = new Connection(heliusRpcUrl, 'confirmed');

  const { verified, mintAddress } = await checkWalletForSGT(
    walletAddress,
    heliusRpcUrl,
    connection,
  );

  if (!verified || !mintAddress) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ verified: false, mintAddress: null } satisfies VerifyResponse),
    };
  }

  // 4. Anti-sybil: each SGT mint can only verify one account
  //    SGTs are transferable, so check the mint address, not the token account
  const alreadyClaimed = await isMintAlreadyClaimed(mintAddress);
  if (alreadyClaimed) {
    return fail(409, 'SGT mint already claimed by another account');
  }

  // 5. Record the claim and return success
  await claimMint(mintAddress, walletAddress);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ verified: true, mintAddress } satisfies VerifyResponse),
  };
}
