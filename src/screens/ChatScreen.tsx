import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants';
import { FREE_CHATBOT_DAILY_LIMIT } from '../constants/sgt';
import { useSeekerVerification } from '../hooks/useSeekerVerification';
import { useSolanaWallet } from '../hooks/useSolanaWallet';

export default function ChatScreen() {
  const { t } = useTranslation();
  const { connected } = useSolanaWallet();
  const { verified } = useSeekerVerification();

  // Track daily messages for non-verified users (in production: persist to AsyncStorage)
  const [messagesUsed, setMessagesUsed] = useState(0);

  const remainingMessages = FREE_CHATBOT_DAILY_LIMIT - messagesUsed;
  const limitReached = !verified && remainingMessages <= 0;

  const handleSend = () => {
    if (limitReached) return;
    if (!verified) setMessagesUsed((n) => n + 1);
    // TODO: send message logic
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('chat.title')}</Text>
        <TouchableOpacity style={styles.newBtn}>
          <Text style={styles.newBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Usage indicator for non-SGT users */}
      {connected && !verified && (
        <View style={[styles.limitBanner, remainingMessages <= 3 && styles.limitBannerWarn]}>
          <Text style={styles.limitBannerText}>
            {remainingMessages > 0
              ? t('verification.chatLimitWarning', { remaining: remainingMessages })
              : t('verification.chatLimitReached')}
          </Text>
        </View>
      )}

      {verified && (
        <View style={styles.unlimitedBanner}>
          <Text style={styles.unlimitedText}>💬 {t('verification.perksChatDesc')}</Text>
        </View>
      )}

      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{t('chat.noConversations')}</Text>
        {!limitReached && (
          <TouchableOpacity style={styles.button} onPress={() => {}}>
            <Text style={styles.buttonText}>{t('chat.startConversation')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Message input — disabled at limit */}
      <View style={[styles.inputRow, limitReached && styles.inputRowDisabled]}>
        <TextInput
          style={styles.input}
          placeholder={limitReached ? t('verification.chatLimitReached') : t('chat.typeMessage')}
          placeholderTextColor={COLORS.textMuted}
          editable={!limitReached}
        />
        <TouchableOpacity
          style={[styles.sendBtn, limitReached && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={limitReached}
        >
          <Text style={styles.sendBtnText}>{t('chat.send')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text },
  newBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBtnText: { color: COLORS.text, fontSize: 24, fontWeight: '300' },
  limitBanner: {
    backgroundColor: '#1a1a00',
    borderWidth: 1,
    borderColor: '#F5C518',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  limitBannerWarn: {
    borderColor: COLORS.error,
    backgroundColor: '#2e1a1a',
  },
  limitBannerText: { color: '#F5C518', fontSize: 13, textAlign: 'center' },
  unlimitedBanner: {
    backgroundColor: '#1a2e1a',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  unlimitedText: { color: '#22c55e', fontSize: 13, textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyTitle: { color: COLORS.textMuted, fontSize: 16 },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  buttonText: { color: COLORS.text, fontWeight: '700', fontSize: 16 },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputRowDisabled: { opacity: 0.5 },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    color: COLORS.text,
    fontSize: 15,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.surface },
  sendBtnText: { color: COLORS.text, fontWeight: '700' },
});
