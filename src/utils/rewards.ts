import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';

const XAUM_MINT = new PublicKey('XAUmGo1d111111111111111111111111111111111111');
const PROGRAM_ID = new PublicKey('CHKNxaum1111111111111111111111111111111111111');
const XAUM_DECIMALS = 6;
const connection = new Connection(clusterApiUrl('devnet'));

export interface CheckInRecord {
  wallet: string;
  restaurant: string;
  timestamp: number;
  xaumAmount: number;
}

export interface EventTicket {
  mint: string;
  name: string;
}

/** Get user's total XAUm SPL token balance */
export async function getTotalGoldEarned(wallet: string): Promise<number> {
  const owner = new PublicKey(wallet);
  const ata = await getAssociatedTokenAddress(XAUM_MINT, owner);
  try {
    const account = await getAccount(connection, ata);
    return Number(account.amount) / 10 ** XAUM_DECIMALS;
  } catch {
    return 0;
  }
}

/** Fetch on-chain CheckInEvent logs for a wallet */
export async function getCheckInHistory(wallet: string): Promise<CheckInRecord[]> {
  const owner = new PublicKey(wallet);
  const signatures = await connection.getSignaturesForAddress(owner, { limit: 100 });
  const records: CheckInRecord[] = [];

  for (const sig of signatures) {
    const tx = await connection.getParsedTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
    if (!tx?.meta?.logMessages) continue;

    for (const log of tx.meta.logMessages) {
      if (log.includes('Program data:') && log.includes(PROGRAM_ID.toBase58())) {
        // Decode CheckInEvent from program log
        try {
          const dataB64 = log.split('Program data: ')[1];
          if (!dataB64) continue;
          const buf = Buffer.from(dataB64, 'base64');
          records.push({
            wallet: new PublicKey(buf.slice(8, 40)).toBase58(),
            restaurant: new PublicKey(buf.slice(40, 72)).toBase58(),
            timestamp: buf.readBigInt64LE(72) as unknown as number,
            xaumAmount: Number(buf.readBigUInt64LE(80)) / 10 ** XAUM_DECIMALS,
          });
        } catch {
          // skip malformed logs
        }
      }
    }
  }
  return records;
}

/** Calculate consecutive check-in streak days for a specific restaurant */
export async function getCheckInStreak(wallet: string, restaurantNFT: string): Promise<number> {
  const history = await getCheckInHistory(wallet);
  const filtered = history
    .filter((r) => r.restaurant === restaurantNFT)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (filtered.length === 0) return 0;

  let streak = 1;
  const DAY = 86400;
  for (let i = 1; i < filtered.length; i++) {
    const diff = filtered[i - 1].timestamp - filtered[i].timestamp;
    if (diff >= DAY && diff < DAY * 2) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/** Fetch current gold price in USD from CoinGecko */
export async function getCurrentGoldPriceUSD(): Promise<number> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=usd',
  );
  const data = await res.json();
  return data['tether-gold']?.usd ?? 0;
}

/** List event ticket NFTs held by wallet (Metaplex standard) */
export async function getEventTickets(wallet: string): Promise<EventTicket[]> {
  const owner = new PublicKey(wallet);
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, {
    programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  });

  const tickets: EventTicket[] = [];
  for (const { account } of tokenAccounts.value) {
    const info = account.data.parsed?.info;
    if (info?.tokenAmount?.uiAmount === 1 && info?.tokenAmount?.decimals === 0) {
      // NFT — check if it has event_config PDA
      const mint = new PublicKey(info.mint);
      const [eventConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('event_config'), mint.toBuffer()],
        PROGRAM_ID,
      );
      const configAccount = await connection.getAccountInfo(eventConfigPda);
      if (configAccount) {
        tickets.push({ mint: info.mint, name: `Event #${tickets.length + 1}` });
      }
    }
  }
  return tickets;
}
