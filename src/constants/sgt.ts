import { PublicKey } from '@solana/web3.js';

// Official SGT (Seeker Genesis Token) addresses — docs.solanamobile.com
export const SGT_MINT_AUTHORITY = new PublicKey('GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4');
export const SGT_METADATA_AUTHORITY = new PublicKey('GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te');
export const TOKEN_2022_PROGRAM_ID_STR = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

// Feature gates
export const SGT_REWARD_MULTIPLIER = 2;
export const FREE_CHATBOT_DAILY_LIMIT = 10; // messages/day for non-SGT users
