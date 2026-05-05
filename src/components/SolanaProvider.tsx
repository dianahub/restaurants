import React, { createContext, useContext, ReactNode } from 'react';
import { Connection } from '@solana/web3.js';
import { SOLANA_ENDPOINT } from '../constants/solana';

interface SolanaContextValue {
  connection: Connection;
}

const SolanaContext = createContext<SolanaContextValue>({
  connection: new Connection(SOLANA_ENDPOINT, 'confirmed'),
});

export function SolanaProvider({ children }: { children: ReactNode }) {
  const connection = new Connection(SOLANA_ENDPOINT, 'confirmed');
  return <SolanaContext.Provider value={{ connection }}>{children}</SolanaContext.Provider>;
}

export function useSolana() {
  return useContext(SolanaContext);
}
