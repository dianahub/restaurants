import * as FileSystem from 'expo-file-system';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NearbyRestaurant {
  name: string;
  distance: string;
  reward_multiplier: number;
  cuisine: string;
}

export interface UpcomingEvent {
  name: string;
  restaurant: string;
  date: string;
  gold_multiplier: number;
  ticket_price: number;
}

export interface ChatContext {
  walletAddress: string | null;
  skrDomain: string | null;
  language: string;
  xaumBalance: number;
  usdValue: number;
  city: string;
  neighborhood: string;
  streak: number;
  rank: number;
  isSeekerDevice: boolean;
  nearbyRestaurants: NearbyRestaurant[];
  upcomingEvents: UpcomingEvent[];
  mode: 'customer' | 'owner';
  // Owner-mode extras
  restaurantName?: string;
  restaurantNFT?: string;
  todayCheckInCount?: number;
  weekGoldDistributed?: number;
  connectedSocials?: string[];
  currentRewardMultiplier?: number;
}

export type ChatAction =
  | { action: 'send_sol'; to: string; amount: number }
  | { action: 'checkin'; nft_address: string }
  | { action: 'buy_ticket'; event_nft: string; price_sol: number }
  | { action: 'rsvp_event'; event_nft: string }
  | { action: 'update_special'; en: string; es: string }
  | { action: 'create_event'; type: string; date: string; gold_multiplier: number; price_sol: number; name_en: string; name_es: string }
  | { action: 'post_social'; caption_en: string; caption_es: string; platforms: string[] }
  | { action: 'update_reward_multiplier'; value: number }
  | { action: 'query_balance' }
  | { action: 'find_restaurants'; cuisine?: string; min_gold?: number }
  | { action: 'find_events'; date?: string; type?: string; free_only?: boolean }
  | { action: 'notify_rsvps'; event_nft: string; message_en: string; message_es: string };

export interface ChatResult {
  text: string;
  action: ChatAction | null;
}

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const VERIFY_ENDPOINT = process.env.EXPO_PUBLIC_VERIFY_ENDPOINT ?? '';
const BASE_URL = VERIFY_ENDPOINT.replace('/api/verify-seeker', '');
const CHAT_ENDPOINT = `${BASE_URL}/api/chat`;
const TRANSCRIBE_ENDPOINT = `${BASE_URL}/api/transcribe`;

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

function buildSystemPrompt(ctx: ChatContext): string {
  const walletDisplay = ctx.skrDomain ?? ctx.walletAddress ?? 'Not connected';

  const restaurantList =
    ctx.nearbyRestaurants.length > 0
      ? ctx.nearbyRestaurants
          .map((r) => `  - ${r.name} (${r.distance}, ${r.cuisine}, ${r.reward_multiplier}x multiplier)`)
          .join('\n')
      : '  None found';

  const eventList =
    ctx.upcomingEvents.length > 0
      ? ctx.upcomingEvents
          .map(
            (e) =>
              `  - ${e.name} at ${e.restaurant} on ${e.date} (${e.gold_multiplier}x gold, ${e.ticket_price === 0 ? 'Free' : e.ticket_price + ' SOL'})`,
          )
          .join('\n')
      : '  None found';

  const ownerSection =
    ctx.mode === 'owner'
      ? `\n- Restaurant name: ${ctx.restaurantName ?? 'Not set'}
- Restaurant NFT: ${ctx.restaurantNFT ?? 'Not minted'}
- Today's check-in count: ${ctx.todayCheckInCount ?? 0}
- This week's gold distributed: ${ctx.weekGoldDistributed ?? 0} XAUm
- Connected social accounts: ${ctx.connectedSocials?.join(', ') || 'None'}
- Current reward multiplier: ${ctx.currentRewardMultiplier ?? 1}x`
      : '';

  return `You are Pot of Gold AI, the intelligent bilingual assistant for the Pot of Gold app on Solana Mobile. You are fluent in both English and Spanish. ALWAYS respond in the same language the user writes in. If they write in Spanish, respond in Spanish. If they write in English, respond in English. Never mix languages in the same response.

User context:
- Wallet: ${walletDisplay}
- Language preference: ${ctx.language}
- Gold balance: ${ctx.xaumBalance} XAUm (worth $${ctx.usdValue.toFixed(2)} at current gold price)
- Location: ${ctx.city}, ${ctx.neighborhood}
- Check-in streak: ${ctx.streak} days
- Leaderboard rank: #${ctx.rank}
- Is verified Seeker device: ${ctx.isSeekerDevice}
- Nearby restaurants (within 2km):
${restaurantList}
- Upcoming events near user (next 7 days):
${eventList}
- Mode: ${ctx.mode}${ownerSection}

Available tool actions (return as JSON when triggered):
{ "action": "send_sol", "to": string, "amount": number }
{ "action": "checkin", "nft_address": string }
{ "action": "buy_ticket", "event_nft": string, "price_sol": number }
{ "action": "rsvp_event", "event_nft": string }
{ "action": "update_special", "en": string, "es": string }
{ "action": "create_event", "type": string, "date": string, "gold_multiplier": number, "price_sol": number, "name_en": string, "name_es": string }
{ "action": "post_social", "caption_en": string, "caption_es": string, "platforms": string[] }
{ "action": "update_reward_multiplier", "value": number }
{ "action": "query_balance" }
{ "action": "find_restaurants", "cuisine"?: string, "min_gold"?: number }
{ "action": "find_events", "date"?: string, "type"?: string, "free_only"?: boolean }
{ "action": "notify_rsvps", "event_nft": string, "message_en": string, "message_es": string }

When triggering a transaction action, always confirm details with the user first in their language before executing. On Seeker devices, remind them the Seed Vault will handle the secure signing.

Always be friendly, concise, and helpful. Use 🥇 for gold topics.`;
}

// ---------------------------------------------------------------------------
// Action parser — finds JSON action block embedded in AI response
// ---------------------------------------------------------------------------

function parseAction(text: string): ChatResult {
  // Match ```json { ... } ``` blocks or bare {"action": ...} objects
  const fenced = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
  const bare = text.match(/(\{"action"\s*:[\s\S]*?\})/);
  const match = fenced ?? bare;

  if (!match) return { text, action: null };

  try {
    const action = JSON.parse(match[1]) as ChatAction;
    const cleanText = text.replace(match[0], '').replace(/\n{3,}/g, '\n\n').trim();
    return { text: cleanText, action };
  } catch {
    return { text, action: null };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sendMessage(
  userMessage: string,
  context: ChatContext,
  history: HistoryMessage[],
): Promise<ChatResult> {
  const systemPrompt = buildSystemPrompt(context);
  const messages: HistoryMessage[] = [...history, { role: 'user', content: userMessage }];

  const res = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, messages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
    throw new Error(err.error ?? `Chat error ${res.status}`);
  }

  const data = (await res.json()) as { text: string; error?: string };
  if (data.error) throw new Error(data.error);

  return parseAction(data.text);
}

export async function transcribeAudio(
  audioUri: string,
  format: 'wav' | 'm4a' | 'mp3' = 'wav',
): Promise<{ transcript: string; languageCode: string }> {
  const base64 = await FileSystem.readAsStringAsync(audioUri, {
    encoding: 'base64',
  });

  const res = await fetch(TRANSCRIBE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: base64, format }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
    throw new Error(err.error ?? 'Transcription failed');
  }

  return res.json() as Promise<{ transcript: string; languageCode: string }>;
}
