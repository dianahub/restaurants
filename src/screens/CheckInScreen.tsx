import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { CameraView } from 'expo-camera';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { useSolanaWallet } from '../hooks/useSolanaWallet';

const PROGRAM_ID = new PublicKey('CHKNxaum1111111111111111111111111111111111111');
const XAUM_MINT = new PublicKey('XAUmGo1d111111111111111111111111111111111111');
const GPS_RADIUS_METERS = 100;
const BASE_REWARD = 0.0001;

type Tab = 'qr' | 'nfc';
type NftType = 'restaurant' | 'event';

interface CheckInResult {
  xaumAmount: number;
  multiplier: number;
  nftType: NftType;
}

export default function CheckInScreen() {
  const { t } = useTranslation();
  const { account, signAndSendTransaction, connected } = useSolanaWallet();
  const [activeTab, setActiveTab] = useState<Tab>('qr');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    NfcManager.start().catch(() => {});
    return () => { NfcManager.cancelTechnologyRequest().catch(() => {}); };
  }, []);

  const showConfetti = useCallback(() => {
    confettiAnim.setValue(0);
    Animated.sequence([
      Animated.timing(confettiAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(confettiAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ]).start(() => setResult(null));
  }, [confettiAnim]);

  const verifyGPS = async (restaurantLat: number, restaurantLng: number): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return false;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const dist = getDistance(loc.coords.latitude, loc.coords.longitude, restaurantLat, restaurantLng);
    return dist <= GPS_RADIUS_METERS;
  };

  const performCheckIn = async (nftAddress: string) => {
    if (!connected || !account) {
      Alert.alert(t('checkIn.connectWallet'));
      return;
    }
    setLoading(true);
    try {
      const nftPubkey = new PublicKey(nftAddress);
      // Determine NFT type by checking if event_config PDA exists
      const nftType = await detectNftType(nftPubkey);
      const multiplier = nftType === 'event' ? 5 : 1; // Default; actual comes from on-chain

      // GPS verification (skip for events)
      if (nftType === 'restaurant') {
        // In production, fetch restaurant coords from on-chain metadata
        const nearRestaurant = await verifyGPS(0, 0).catch(() => false);
        if (!nearRestaurant) {
          Alert.alert(t('checkIn.gpsFailTitle'), t('checkIn.gpsFail'));
          setLoading(false);
          return;
        }
      }

      // Build and send transaction via MWA
      const ix = buildCheckInInstruction(nftPubkey, account.address.toBase58(), nftType);
      const tx = new Transaction().add(ix);
      await signAndSendTransaction(tx, 0);

      const xaumAmount = BASE_REWARD * multiplier;
      const checkInResult: CheckInResult = { xaumAmount, multiplier, nftType };
      setResult(checkInResult);
      showConfetti();

      // Push notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('checkIn.notifTitle'),
          body: t('checkIn.notifBody', { amount: xaumAmount }),
        },
        trigger: null,
      });
    } catch (e: any) {
      Alert.alert(t('checkIn.error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQRScanned = ({ data }: { data: string }) => {
    if (!loading) performCheckIn(data);
  };

  const handleNfcTap = async () => {
    try {
      setLoading(true);
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      const payload = tag?.ndefMessage?.[0]?.payload;
      if (payload) {
        const text = String.fromCharCode(...payload.slice(3)); // skip language code prefix
        await performCheckIn(text);
      }
    } catch {
      Alert.alert(t('checkIn.nfcError'));
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {});
      setLoading(false);
    }
  };

  const confettiScale = confettiAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1.3, 1] });
  const confettiOpacity = confettiAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] });

  return (
    <View style={styles.container}>
      {/* Tab selector */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'qr' && styles.tabActive]}
          onPress={() => setActiveTab('qr')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'qr' }}
        >
          <Text style={[styles.tabText, activeTab === 'qr' && styles.tabTextActive]}>
            {t('checkIn.scanQR')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'nfc' && styles.tabActive]}
          onPress={() => setActiveTab('nfc')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'nfc' }}
        >
          <Text style={[styles.tabText, activeTab === 'nfc' && styles.tabTextActive]}>
            {t('checkIn.tapNFC')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'qr' ? (
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={loading ? undefined : handleQRScanned}
          />
        ) : (
          <TouchableOpacity style={styles.nfcButton} onPress={handleNfcTap} disabled={loading}>
            <Text style={styles.nfcIcon}>📱</Text>
            <Text style={styles.nfcText}>{t('checkIn.holdNFC')}</Text>
          </TouchableOpacity>
        )}

        {loading && <ActivityIndicator size="large" color="#FFD700" style={styles.loader} />}
      </View>

      {/* Success overlay */}
      {result && (
        <Animated.View
          style={[styles.overlay, { opacity: confettiOpacity, transform: [{ scale: confettiScale }] }]}
        >
          <Text style={styles.confetti}>🎉✨🥇✨🎉</Text>
          <Text style={styles.rewardText}>
            {t('checkIn.earned', { amount: result.xaumAmount })}
          </Text>
          {result.nftType === 'event' && result.multiplier > 1 && (
            <Text style={styles.multiplierText}>
              {t('checkIn.eventBonus', { multiplier: result.multiplier })}
            </Text>
          )}
        </Animated.View>
      )}
    </View>
  );
}

// --- Helpers ---

function buildCheckInInstruction(
  nftMint: PublicKey,
  userAddress: string,
  nftType: NftType,
): TransactionInstruction {
  const user = new PublicKey(userAddress);
  const discriminator = nftType === 'event'
    ? Buffer.from([0x5d, 0x9e, 0xd0, 0x2a, 0x7c, 0x3b, 0x1f, 0x44]) // event_check_in
    : Buffer.from([0xa1, 0xc2, 0xd3, 0xe4, 0xf5, 0x06, 0x17, 0x28]); // check_in

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: nftMint, isSigner: false, isWritable: false },
    ],
    data: discriminator,
  });
}

async function detectNftType(_nftMint: PublicKey): Promise<NftType> {
  // In production: check if event_config PDA exists on-chain
  // For now, default to restaurant
  return 'restaurant';
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  tabs: { flexDirection: 'row', paddingTop: 60, paddingHorizontal: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#FFD700' },
  tabText: { fontSize: 16, color: '#888' },
  tabTextActive: { color: '#FFD700', fontWeight: '600' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  camera: { width: '90%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden' },
  nfcButton: { alignItems: 'center', padding: 40, backgroundColor: '#2a2a4e', borderRadius: 24 },
  nfcIcon: { fontSize: 64 },
  nfcText: { color: '#fff', fontSize: 18, marginTop: 16 },
  loader: { position: 'absolute' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)' },
  confetti: { fontSize: 48 },
  rewardText: { color: '#FFD700', fontSize: 22, fontWeight: 'bold', marginTop: 16, textAlign: 'center' },
  multiplierText: { color: '#FF6B35', fontSize: 18, fontWeight: '600', marginTop: 8 },
});
