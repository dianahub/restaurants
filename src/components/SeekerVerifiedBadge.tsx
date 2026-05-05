import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSeekerVerification } from '../hooks/useSeekerVerification';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { COLORS } from '../constants';

/**
 * Renders one of three states:
 *   • Not connected — nothing shown
 *   • Connected, not verified — "Verify Seeker" button
 *   • Verified — gold "Verified Seeker ✓" badge
 *
 * isSeekerDevice (Platform.constants.Model check) controls the cosmetic gold
 * SEEKER hardware label only — it does NOT gate features.
 * Only `verified` from useSeekerVerification gates real rewards/events/chat.
 */
export function SeekerVerifiedBadge() {
  const { t } = useTranslation();
  const { connected, isSeekerDevice } = useSolanaWallet();
  const { verified, verifying, error, verify } = useSeekerVerification();

  if (!connected) return null;

  if (verified) {
    return (
      <View style={styles.verifiedRow}>
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedText}>{t('verification.verifiedBadge')} ✓</Text>
        </View>
        {isSeekerDevice && (
          <View style={styles.hardwareBadge}>
            <Text style={styles.hardwareBadgeText}>SEEKER</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.verifyButton, verifying && styles.verifyButtonDisabled]}
        onPress={verify}
        disabled={verifying}
      >
        {verifying ? (
          <ActivityIndicator color={COLORS.text} size="small" />
        ) : (
          <Text style={styles.verifyButtonText}>{t('verification.verifyButton')}</Text>
        )}
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Text style={styles.hint}>{t('verification.verifyHint')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifiedBadge: {
    backgroundColor: '#1a2e1a',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  verifiedText: {
    color: '#22c55e',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  hardwareBadge: {
    backgroundColor: '#F5C518',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  hardwareBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  verifyButton: {
    backgroundColor: '#1a2e1a',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    minWidth: 180,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: '#22c55e',
    fontWeight: '700',
    fontSize: 14,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    textAlign: 'center',
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
});
