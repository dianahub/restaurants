# SeekerApp — Claude Code Guide

## What This Is
Solana-powered React Native Expo app for the Seeker phone (Solana Mobile).
Discover events, earn rewards, chat, connect Seed Vault wallet, verify SGT ownership.

## Repo & Deployment
- **GitHub**: https://github.com/dianahub/restaurants (yes, the repo is named "restaurants")
- **Vercel API**: https://restaurants-3r6r77lsk-diana-castillos-projects-822715ab.vercel.app
- **Verify endpoint**: `{vercel-url}/api/verify-seeker`
- **EAS project ID**: `08ef34b6-86c8-4c23-9610-223c9cf15a29`

## Stack
- React Native 0.83.2 + Expo SDK 55
- React Navigation (bottom tabs) — NOT expo-router (kept in app/ but unused as entry)
- Solana: `@wallet-ui/react-native-web3js`, `@solana-mobile/mobile-wallet-adapter-protocol`
- i18n: `i18next` + `react-i18next` + `expo-localization` (auto-detects es/en)
- Token-2022: `@solana/spl-token` 0.4.14 for SGT extension parsing

## Entry Point
```
index.js → registerRootComponent(App)   ← NOT expo-router/entry
App.tsx  → SafeAreaProvider
             I18nextProvider(i18n)
               QueryClientProvider
                 MobileWalletProvider(devnet)
                   NavigationContainer
                     MainTabs (5 tabs)
```

## Commands
```bash
npm run dev          # Expo dev server
npm run android      # Run on Android device/emulator
eas build -p android --profile preview   # Cloud APK build (no local Android SDK needed)
eas build -p android --profile development  # Dev client build
```

## Folder Structure
```
SeekerApp/
├── App.tsx                    # Root with all providers
├── index.js                   # Entry: registerRootComponent(App)
├── api/
│   └── verify-seeker.ts       # Vercel Function — SGT verification Lambda
├── src/
│   ├── screens/               # 5 tab screens
│   │   ├── HomeScreen.tsx     # Events + 2× multiplier if SGT verified
│   │   ├── NearbyScreen.tsx   # Location search
│   │   ├── ChatScreen.tsx     # Chat + daily limit (10/day non-SGT, unlimited SGT)
│   │   ├── WalletScreen.tsx   # Balance + WalletButton + SeekerVerifiedBadge + perks
│   │   └── ProfileScreen.tsx  # Level/points/multiplier + verified badge + SGT mint
│   ├── components/
│   │   ├── WalletButton.tsx       # Connect/disconnect, shows .skr domain or 4…4 address
│   │   ├── SeekerVerifiedBadge.tsx # Green verified badge or "Verify" button
│   │   └── SolanaProvider.tsx     # Simple Connection context (devnet)
│   ├── hooks/
│   │   ├── useSolanaWallet.ts     # Wraps useMobileWallet + isSeekerDevice + skrDomain
│   │   ├── useSeekerVerification.ts # SIWS → Lambda → { verified, mintAddress }
│   │   ├── useWallet.ts           # Basic balance hook
│   │   └── useLocation.ts         # expo-location with permission flow
│   ├── utils/
│   │   ├── i18n.ts               # i18next init — auto-detects es/en from device locale
│   │   ├── seekerVerification.ts  # checkWalletForSGT() — Helius + Token-2022 checks
│   │   └── format.ts             # ellipsify, lamports↔SOL, formatDistance
│   ├── constants/
│   │   ├── index.ts              # COLORS, SPACING
│   │   ├── solana.ts             # SOLANA_ENDPOINT = https://api.devnet.solana.com
│   │   └── sgt.ts                # SGT_MINT_AUTHORITY, SGT_METADATA_AUTHORITY, limits
│   └── locales/
│       ├── en.json               # All UI strings English (tabs, events, rewards, errors...)
│       └── es.json               # All UI strings Spanish
├── lambda/
│   └── verify-seeker.ts          # AWS Lambda version of the verify handler (reference)
└── app/                          # expo-router screens from template (kept for Solana infra)
    └── (tabs)/account/           # send/receive/airdrop flows — reference for WalletScreen
```

## Environment Variables

### Local `.env` (gitignored — never commit)
```
EXPO_PUBLIC_VERIFY_ENDPOINT=https://restaurants-3r6r77lsk-diana-castillos-projects-822715ab.vercel.app/api/verify-seeker
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

### Vercel Dashboard → Settings → Environment Variables
```
HELIUS_RPC_URL       https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
EXPO_PUBLIC_VERIFY_ENDPOINT   https://restaurants-3r6r77lsk-...vercel.app/api/verify-seeker
```

## Solana Config
- **Network**: Devnet (`https://api.devnet.solana.com`)
- **MWA APP_IDENTITY**: `{ name: 'Seeker App', uri: 'https://seekerapp.xyz', icon: 'favicon.ico' }`
- **Chain ID**: `solana:devnet`
- **SGT checks run on mainnet** (Helius mainnet RPC) — SGTs live on mainnet

## SGT Verification (Two Methods)

### Method 1 — UI only (cosmetic, NOT secure)
```ts
Platform.constants.Model === 'Seeker'  // shows gold SEEKER badge only
```

### Method 2 — Secure (gates real features)
Three Token-2022 extension checks must ALL pass:
1. `mintAuthority` === `GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4`
2. `MetadataPointer.metadataAddress` === `GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te`
3. `TokenGroupMember` extension present on the mint

Anti-sybil: track **mint address** (not token account) — SGTs are transferable.

### Verification flow
```
User taps "Verify Seeker"
  → useMobileWallet().signIn()     ← SIWS proof, Seed Vault handles biometrics
  → POST /api/verify-seeker        ← sends signInInput + signInOutput + walletAddress
    → verifySignIn()               ← @solana/wallet-standard-util, proves wallet ownership
    → checkWalletForSGT()          ← Helius pagination + 3 extension checks
    → isMintAlreadyClaimed()       ← anti-sybil
    → { verified: true, mintAddress }
```

## SGT-Gated Features
| Feature | Non-SGT | SGT Verified |
|---|---|---|
| Reward multiplier | 1× | **2× gold** |
| Seeker-exclusive events | 🔒 locked | Unlocked |
| Chatbot | 10 msg/day | Unlimited |
| Profile avatar | Purple border | Green border |

## Seeker Device Notes (from docs.solanamobile.com)
- Seed Vault is the built-in wallet — access via MWA ONLY, never Seed Vault SDK directly
- Biometric approval handled automatically by the OS on connect
- For emulator: install Mock MWA Wallet → github.com/solana-mobile/mock-mwa-wallet
- `.skr` domains: resolved from `account.label` — if it ends in `.skr` it's displayed

## EAS Build (cloud build — no local Android SDK needed)
```bash
# First time setup (already done):
npm config set prefix ~/.npm-global
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc
npm install -g eas-cli
eas login
eas init --id 08ef34b6-86c8-4c23-9610-223c9cf15a29

# Build APK for Seeker device:
eas build -p android --profile preview
# → Download APK link → sideload on Seeker → done
```

## Known Issues / TODO
- `EXPO_PUBLIC_VERIFY_ENDPOINT` placeholder in `.env` — update after Vercel deploys
- Anti-sybil store in `api/verify-seeker.ts` is in-memory (resets on cold start) — swap for DynamoDB/Postgres for production
- `expo-barcode-scanner` removed in SDK 51+ — use `expo-camera` barcode scanning instead
- `app/(tabs)/` expo-router screens kept but unused — can be deleted to clean up
