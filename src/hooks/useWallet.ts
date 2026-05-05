import { useState, useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { SOLANA_ENDPOINT } from '../constants/solana';

export function useWallet() {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const connection = new Connection(SOLANA_ENDPOINT, 'confirmed');

  const refreshBalance = useCallback(async () => {
    if (!publicKey) return;
    const lamports = await connection.getBalance(publicKey);
    setBalance(lamports / 1e9);
  }, [publicKey]);

  return { publicKey, setPublicKey, balance, refreshBalance, connection };
}
