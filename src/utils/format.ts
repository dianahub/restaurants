export function ellipsify(str: string, maxLen = 8): string {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
}

export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

export function solToLamports(sol: number): number {
  return Math.round(sol * 1_000_000_000);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
