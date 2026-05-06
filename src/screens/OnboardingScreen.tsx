import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants';
import { WalletButton } from '../components/WalletButton';
import { saveLanguage } from '../utils/i18n';
import { useSolanaWallet } from '../hooks/useSolanaWallet';

const ONBOARDING_KEY = 'pot_of_gold:onboarding_complete';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onComplete: () => void;
}

// ---------------------------------------------------------------------------
// Language selector shown on screen 1
// ---------------------------------------------------------------------------

function LanguagePicker({ current, onChange }: { current: string; onChange: (l: 'en' | 'es') => void }) {
  return (
    <View style={styles.langRow}>
      <TouchableOpacity
        style={[styles.langBtn, current === 'en' && styles.langBtnActive]}
        onPress={() => onChange('en')}
      >
        <Text style={styles.langFlag}>🇺🇸</Text>
        <Text style={[styles.langLabel, current === 'en' && styles.langLabelActive]}>EN</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.langBtn, current === 'es' && styles.langBtnActive]}
        onPress={() => onChange('es')}
      >
        <Text style={styles.langFlag}>🇪🇸</Text>
        <Text style={[styles.langLabel, current === 'es' && styles.langLabelActive]}>ES</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Dot indicator
// ---------------------------------------------------------------------------

function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === active && styles.dotActive]} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main onboarding component
// ---------------------------------------------------------------------------

export default function OnboardingScreen({ onComplete }: Props) {
  const { t, i18n } = useTranslation();
  const { connected } = useSolanaWallet();
  const [page, setPage] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const lang = i18n.language.startsWith('es') ? 'es' : 'en';

  const changeLang = async (l: 'en' | 'es') => {
    await saveLanguage(l);
  };

  const markComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onComplete();
  };

  const goTo = (nextPage: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    // Update after fade starts
    setTimeout(() => setPage(nextPage), 150);
  };

  // ---------------------------------------------------------------------------
  // Screen content
  // ---------------------------------------------------------------------------

  const screens = [
    {
      icon: '🥇',
      title: t('onboarding.screen1Title'),
      subtitle: t('onboarding.screen1Subtitle'),
      cta: t('onboarding.getStarted'),
      showLangPicker: true,
      onCTA: () => goTo(1),
    },
    {
      icon: '⭐',
      title: t('onboarding.screen2Title'),
      subtitle: t('onboarding.screen2Subtitle'),
      cta: t('onboarding.screen2CTA'),
      showLangPicker: false,
      onCTA: () => goTo(2),
    },
    {
      icon: '👛',
      title: t('onboarding.screen3Title'),
      subtitle: t('onboarding.screen3Subtitle'),
      cta: null, // CTA is the WalletButton
      showLangPicker: false,
      onCTA: null,
    },
  ];

  const current = screens[page];

  return (
    <View style={styles.container}>
      {/* Skip button */}
      {page < 2 && (
        <TouchableOpacity style={styles.skipBtn} onPress={markComplete}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      )}

      {/* Language picker (screen 1 only) */}
      {current.showLangPicker && (
        <LanguagePicker current={lang} onChange={changeLang} />
      )}

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Icon */}
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>{current.icon}</Text>
        </View>

        {/* Feature bullets on screen 2 */}
        {page === 1 && (
          <View style={styles.features}>
            {[
              { icon: '🏪', en: 'Check in at restaurants', es: 'Haz check-in en restaurantes' },
              { icon: '🎫', en: 'Attend gold events', es: 'Asiste a eventos dorados' },
              { icon: '🥇', en: 'Earn XAUm — real gold', es: 'Gana XAUm — oro real' },
              { icon: '📈', en: '2× with Seeker SGT', es: '2× con Seeker SGT' },
            ].map((item) => (
              <View key={item.icon} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{item.icon}</Text>
                <Text style={styles.featureLabel}>{lang === 'es' ? item.es : item.en}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.subtitle}>{current.subtitle}</Text>

        {/* Screen 3: wallet button */}
        {page === 2 && (
          <View style={styles.walletArea}>
            <WalletButton onConnected={markComplete} />
            <TouchableOpacity style={styles.secondaryBtn} onPress={markComplete}>
              <Text style={styles.secondaryBtnText}>{t('onboarding.screen3Skip')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Screens 1 & 2: CTA button */}
        {current.cta && current.onCTA && (
          <TouchableOpacity style={styles.ctaBtn} onPress={current.onCTA}>
            <Text style={styles.ctaBtnText}>{current.cta}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Dot indicator */}
      <Dots count={3} active={page} />

      {/* Back button on pages 1-2 */}
      {page > 0 && (
        <TouchableOpacity style={styles.backBtn} onPress={() => goTo(page - 1)}>
          <Text style={styles.backBtnText}>‹ {t('onboarding.next').includes('Next') ? 'Back' : 'Atrás'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
  },
  skipText: { color: COLORS.textMuted, fontSize: 15 },

  langRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  langBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '22',
  },
  langFlag: { fontSize: 18 },
  langLabel: { color: COLORS.textMuted, fontWeight: '600', fontSize: 14 },
  langLabelActive: { color: COLORS.primary },

  content: { alignItems: 'center', width: '100%', gap: 20 },

  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  icon: { fontSize: 56 },

  features: { width: '100%', gap: 12, marginBottom: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  featureLabel: { color: COLORS.text, fontSize: 15, fontWeight: '500' },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },

  walletArea: { width: '100%', alignItems: 'center', gap: 16, marginTop: 8 },

  ctaBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  ctaBtnText: { color: '#FFF', fontWeight: '800', fontSize: 17 },

  secondaryBtn: { paddingVertical: 10 },
  secondaryBtnText: { color: COLORS.textMuted, fontSize: 14 },

  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
    borderRadius: 4,
  },

  backBtn: { position: 'absolute', bottom: 48, left: 32 },
  backBtnText: { color: COLORS.textMuted, fontSize: 15 },
});
