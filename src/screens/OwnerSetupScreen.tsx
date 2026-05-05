/**
 * OwnerSetupScreen — Restaurant Digital Twin setup
 *
 * Bilingual (EN/ES tabs). If owner fills only one language,
 * tapping "Create" auto-translates the other via Claude before minting.
 *
 * Flow:
 *   Fill form → pick logo → tap Create Digital Twin
 *     → auto-translate missing language (Claude)
 *     → upload logo to S3
 *     → mint Metaplex NFT (Seed Vault signs on Seeker)
 *     → save to DynamoDB + AsyncStorage
 *     → show NFT address + Explorer link
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useMobileWallet } from '@wallet-ui/react-native-web3js';
import { Connection } from '@solana/web3.js';
import { COLORS } from '../constants';
import { SOLANA_ENDPOINT } from '../constants/solana';
import {
  createRestaurantNFT,
  type RestaurantData,
  type RestaurantNFT,
} from '../utils/digitalTwin';

const API_BASE =
  process.env.EXPO_PUBLIC_VERIFY_ENDPOINT?.replace('/verify-seeker', '') ??
  'https://restaurants-3r6r77lsk-diana-castillos-projects-822715ab.vercel.app';

const CUISINE_OPTIONS = [
  'Mexican', 'Italian', 'Japanese', 'Chinese', 'American',
  'Indian', 'Thai', 'Mediterranean', 'French', 'Other',
];

type LangTab = 'en' | 'es';

export default function OwnerSetupScreen() {
  const { t, i18n } = useTranslation();
  const { account, signTransaction, signTransactions } = useMobileWallet();

  const [activeTab, setActiveTab] = useState<LangTab>(
    i18n.language.startsWith('es') ? 'es' : 'en',
  );

  // Form fields
  const [name_en, setNameEn] = useState('');
  const [name_es, setNameEs] = useState('');
  const [description_en, setDescEn] = useState('');
  const [description_es, setDescEs] = useState('');
  const [todays_special_en, setSpecialEn] = useState('');
  const [todays_special_es, setSpecialEs] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [twitter, setTwitter] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  // State
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('');
  const [result, setResult] = useState<RestaurantNFT | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Logo picker
  // ---------------------------------------------------------------------------

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError(t('restaurant.logoPermissionDenied'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
      setLogoBase64(result.assets[0].base64 ?? null);
    }
  };

  // ---------------------------------------------------------------------------
  // Auto-translate via Claude Lambda
  // ---------------------------------------------------------------------------

  async function autoTranslateMissing(): Promise<{
    name_en: string; name_es: string;
    description_en: string; description_es: string;
  }> {
    const needEn = !name_en.trim() || !description_en.trim();
    const needEs = !name_es.trim() || !description_es.trim();
    if (!needEn && !needEs) {
      return { name_en, name_es, description_en, description_es };
    }

    const targetLang = needEs ? 'es' : 'en';
    setStep(t('restaurant.autoTranslating'));

    const res = await fetch(`${API_BASE}/api/restaurant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'translate',
        targetLang,
        name_en: name_en || undefined,
        name_es: name_es || undefined,
        description_en: description_en || undefined,
        description_es: description_es || undefined,
      }),
    });

    const translated = await res.json();
    return {
      name_en: translated.name_en ?? name_en,
      name_es: translated.name_es ?? name_es,
      description_en: translated.description_en ?? description_en,
      description_es: translated.description_es ?? description_es,
    };
  }

  // ---------------------------------------------------------------------------
  // S3 logo upload
  // ---------------------------------------------------------------------------

  async function uploadLogo(): Promise<string | undefined> {
    if (!logoBase64) return undefined;
    setStep(t('restaurant.uploadingLogo'));
    const res = await fetch(`${API_BASE}/api/restaurant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upload-metadata',
        name: `logo-${Date.now()}`,
        metadata: { image_base64: logoBase64, type: 'image/jpeg' },
      }),
    });
    const { uri } = await res.json();
    return uri;
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const handleCreate = async () => {
    if (!account) { setError(t('errors.walletNotConnected')); return; }
    if (!cuisine) { setError(t('restaurant.cuisineRequired')); return; }

    const hasEnough = (name_en || name_es) && (description_en || description_es);
    if (!hasEnough) { setError(t('restaurant.fillAtLeastOne')); return; }

    setLoading(true);
    setError(null);

    try {
      // 1. Auto-translate missing language
      const translated = await autoTranslateMissing();

      // 2. Upload logo
      const logo_url = await uploadLogo();

      // 3. Build data object
      const data: RestaurantData = {
        ...translated,
        todays_special_en,
        todays_special_es,
        cuisine,
        lat: 0,   // TODO: inject from useLocation() hook
        lng: 0,
        reward_multiplier: 1,
        gold_staked: 0,
        instagram: instagram || undefined,
        tiktok: tiktok || undefined,
        twitter: twitter || undefined,
        logo_url,
        language_preference:
          translated.name_en && translated.name_es ? 'both' : activeTab,
      };

      // 4. Mint NFT (Seed Vault signs on Seeker)
      setStep(t('restaurant.mintingNFT'));
      const connection = new Connection(SOLANA_ENDPOINT, 'confirmed');
      const mwa = { account, signTransaction, signTransactions };
      const nft = await createRestaurantNFT(mwa as never, data, connection);

      setResult(nft);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setLoading(false);
      setStep('');
    }
  };

  // ---------------------------------------------------------------------------
  // Success screen
  // ---------------------------------------------------------------------------

  if (result) {
    const explorerUrl = `https://explorer.solana.com/address/${result.nftAddress}?cluster=devnet`;
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.successTitle}>🎉 {t('restaurant.createSuccess')}</Text>
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>{t('restaurant.nftAddress')}</Text>
          <Text style={styles.resultValue} selectable>{result.nftAddress}</Text>
          <TouchableOpacity style={styles.explorerBtn} onPress={() => Linking.openURL(explorerUrl)}>
            <Text style={styles.explorerBtnText}>{t('restaurant.viewOnExplorer')}</Text>
          </TouchableOpacity>
        </View>
        {result.logo_url && (
          <Image source={{ uri: result.logo_url }} style={styles.logoPreview} />
        )}
        <Text style={styles.nameResult}>
          {result.name_en} / {result.name_es}
        </Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => setResult(null)}>
          <Text style={styles.doneBtnText}>{t('common.done')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------

  const isEn = activeTab === 'en';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{t('restaurant.setupTitle')}</Text>

      {/* Language tabs */}
      <View style={styles.tabs}>
        {(['en', 'es'] as LangTab[]).map((lang) => (
          <TouchableOpacity
            key={lang}
            style={[styles.tab, activeTab === lang && styles.tabActive]}
            onPress={() => setActiveTab(lang)}
          >
            <Text style={[styles.tabText, activeTab === lang && styles.tabTextActive]}>
              {lang === 'en' ? '🇺🇸 English' : '🇪🇸 Español'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.hint}>{t('restaurant.tabHint')}</Text>

      {/* Name */}
      <Text style={styles.label}>{t('restaurant.nameLabel')}</Text>
      <TextInput
        style={styles.input}
        value={isEn ? name_en : name_es}
        onChangeText={isEn ? setNameEn : setNameEs}
        placeholder={t('restaurant.namePlaceholder')}
        placeholderTextColor={COLORS.textMuted}
      />

      {/* Description */}
      <Text style={styles.label}>{t('restaurant.descriptionLabel')}</Text>
      <TextInput
        style={[styles.input, styles.inputMulti]}
        value={isEn ? description_en : description_es}
        onChangeText={isEn ? setDescEn : setDescEs}
        placeholder={t('restaurant.descriptionPlaceholder')}
        placeholderTextColor={COLORS.textMuted}
        multiline
        numberOfLines={4}
      />

      {/* Today's special */}
      <Text style={styles.label}>{t('restaurant.todaysSpecialLabel')}</Text>
      <TextInput
        style={styles.input}
        value={isEn ? todays_special_en : todays_special_es}
        onChangeText={isEn ? setSpecialEn : setSpecialEs}
        placeholder={t('restaurant.todaysSpecialPlaceholder')}
        placeholderTextColor={COLORS.textMuted}
      />

      {/* Cuisine */}
      <Text style={styles.label}>{t('restaurant.cuisineLabel')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {CUISINE_OPTIONS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, cuisine === c && styles.chipActive]}
            onPress={() => setCuisine(c)}
          >
            <Text style={[styles.chipText, cuisine === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Social */}
      <Text style={styles.label}>{t('restaurant.socialLabel')}</Text>
      {[
        { icon: '📸', val: instagram, set: setInstagram, ph: 'Instagram @handle' },
        { icon: '🎵', val: tiktok, set: setTiktok, ph: 'TikTok @handle' },
        { icon: '🐦', val: twitter, set: setTwitter, ph: 'Twitter/X @handle' },
      ].map(({ icon, val, set, ph }) => (
        <View key={ph} style={styles.socialRow}>
          <Text style={styles.socialIcon}>{icon}</Text>
          <TextInput
            style={[styles.input, styles.socialInput]}
            value={val}
            onChangeText={set}
            placeholder={ph}
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
          />
        </View>
      ))}

      {/* Logo */}
      <Text style={styles.label}>{t('restaurant.logoLabel')}</Text>
      <TouchableOpacity style={styles.logoPicker} onPress={pickLogo}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.logoThumb} />
        ) : (
          <Text style={styles.logoPickerText}>{t('restaurant.uploadLogo')}</Text>
        )}
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Submit */}
      <TouchableOpacity
        style={[styles.createBtn, loading && styles.createBtnDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#000" size="small" />
            <Text style={styles.createBtnText}>{step || t('common.loading')}</Text>
          </View>
        ) : (
          <Text style={styles.createBtnText}>{t('restaurant.createButton')}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, gap: 12, paddingBottom: 60 },
  title: { fontSize: 26, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' },
  tabText: { color: COLORS.textMuted, fontWeight: '600' },
  tabTextActive: { color: COLORS.primary },
  hint: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center' },
  label: { color: COLORS.text, fontWeight: '600', fontSize: 14, marginTop: 4 },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },
  inputMulti: { height: 100, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' },
  chipText: { color: COLORS.textMuted, fontSize: 13 },
  chipTextActive: { color: COLORS.primary, fontWeight: '700' },
  socialRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  socialIcon: { fontSize: 22 },
  socialInput: { flex: 1 },
  logoPicker: {
    height: 120, backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  logoThumb: { width: 116, height: 116, borderRadius: 14 },
  logoPickerText: { color: COLORS.textMuted, fontSize: 15 },
  error: { color: COLORS.error, fontSize: 13, textAlign: 'center' },
  createBtn: {
    backgroundColor: '#F5C518', borderRadius: 16,
    paddingVertical: 18, alignItems: 'center', marginTop: 8,
  },
  createBtnDisabled: { opacity: 0.7 },
  createBtnText: { color: '#000', fontWeight: '900', fontSize: 17, letterSpacing: 0.3 },
  loadingRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  // Success
  successTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  resultCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#22c55e33', gap: 10,
  },
  resultLabel: { color: '#22c55e', fontSize: 12, fontWeight: '600' },
  resultValue: { color: COLORS.text, fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  explorerBtn: {
    backgroundColor: '#22c55e22', borderWidth: 1, borderColor: '#22c55e',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  explorerBtnText: { color: '#22c55e', fontWeight: '700' },
  logoPreview: { width: 100, height: 100, borderRadius: 50, alignSelf: 'center' },
  nameResult: { color: COLORS.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  doneBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  doneBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 16 },
});
