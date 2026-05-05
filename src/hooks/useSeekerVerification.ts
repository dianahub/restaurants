/**
 * useSeekerVerification
 *
 * Calls /api/verify-seeker with a SIWS proof to confirm the connected wallet
 * holds a valid SGT. Verification state persists for the session; cleared on
 * wallet disconnect.
 *
 * Method 1 (isSeekerDevice from useSolanaWallet) — UI-only, cosmetic badges.
 * Method 2 (verified from this hook)            — secure, gates real features.
 */

import { useState, useCallback, useEffect } from 'react';
import { useMobileWallet } from '@wallet-ui/react-native-web3js';

export interface SeekerVerificationState {
  verified: boolean;
  verifying: boolean;
  mintAddress: string | null;
  error: string | null;
  verify: () => Promise<void>;
}

// Set this to your deployed Lambda URL
const VERIFY_ENDPOINT =
  process.env.EXPO_PUBLIC_VERIFY_ENDPOINT ?? 'https://api.seekerapp.xyz/verify-seeker';

const SIWS_DOMAIN = 'seekerapp.xyz';

export function useSeekerVerification(): SeekerVerificationState {
  const { account, accounts, signIn } = useMobileWallet();

  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset on wallet disconnect
  useEffect(() => {
    if (!accounts?.length) {
      setVerified(false);
      setMintAddress(null);
      setError(null);
    }
  }, [accounts]);

  const verify = useCallback(async () => {
    if (!account) {
      setError('Connect wallet first');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      // Step 1: Get a SIWS signature — proves ownership of the wallet
      const signInInput = {
        domain: SIWS_DOMAIN,
        address: account.address.toString(),
        statement: 'Verify Seeker Genesis Token ownership for SeekerApp.',
        uri: 'https://seekerapp.xyz',
        version: '1',
        chainId: 'solana:mainnet',
        nonce: Math.random().toString(36).slice(2),
        issuedAt: new Date().toISOString(),
      };

      const signInOutput = await signIn(signInInput);

      // Step 2: Send to backend Lambda for SGT check + anti-sybil
      const res = await fetch(VERIFY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signInInput,
          signInOutput: {
            account: {
              address: signInOutput.account.address.toString(),
              publicKey: Array.from(signInOutput.account.publicKey.toBytes()),
            },
            signedMessage: Array.from(signInOutput.signedMessage),
            signature: Array.from(signInOutput.signature),
          },
          walletAddress: account.address.toString(),
        }),
      });

      const data = (await res.json()) as {
        verified: boolean;
        mintAddress: string | null;
        error?: string;
      };

      if (!res.ok || data.error) {
        setError(data.error ?? 'Verification failed');
        setVerified(false);
      } else {
        setVerified(data.verified);
        setMintAddress(data.mintAddress);
        if (!data.verified) {
          setError('No SGT found in this wallet');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  }, [account, signIn]);

  return { verified, verifying, mintAddress, error, verify };
}
