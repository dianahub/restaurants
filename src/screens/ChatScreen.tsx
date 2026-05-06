import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Audio } from 'expo-av';
import { COLORS } from '../constants';
import { FREE_CHATBOT_DAILY_LIMIT } from '../constants/sgt';
import { useSeekerVerification } from '../hooks/useSeekerVerification';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import {
  sendMessage,
  transcribeAudio,
  type ChatAction,
  type ChatContext,
  type HistoryMessage,
} from '../utils/chatbot';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
  action?: ChatAction;
  pendingConfirm?: boolean;
}

type VoiceState = 'idle' | 'recording' | 'transcribing';

// ---------------------------------------------------------------------------
// Typing indicator — three pulsing dots
// ---------------------------------------------------------------------------

function TypingIndicator() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - i * 200),
        ]),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.typingRow}>
      <View style={styles.aiBubble}>
        <View style={styles.typingDots}>
          {dots.map((dot, i) => (
            <Animated.View
              key={i}
              style={[styles.dot, { opacity: dot, transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Action confirmation card
// ---------------------------------------------------------------------------

function ActionCard({
  action,
  onConfirm,
  onCancel,
}: {
  action: ChatAction;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  const label = (() => {
    switch (action.action) {
      case 'send_sol':
        return t('chatbot.actionSendSol', { amount: action.amount, to: action.to.slice(0, 6) + '…' });
      case 'checkin':
        return t('chatbot.actionCheckin');
      case 'buy_ticket':
        return t('chatbot.actionBuyTicket', { amount: action.price_sol });
      case 'rsvp_event':
        return t('chatbot.actionRsvp');
      case 'update_special':
        return t('chatbot.actionUpdateSpecial');
      case 'create_event':
        return t('chatbot.actionCreateEvent');
      case 'post_social':
        return t('chatbot.actionPostSocial');
      case 'update_reward_multiplier':
        return t('chatbot.actionUpdateMultiplier', { value: action.value });
      case 'notify_rsvps':
        return t('chatbot.actionNotifyRsvps');
      default:
        return action.action;
    }
  })();

  return (
    <View style={styles.actionCard}>
      <Text style={styles.actionLabel}>🥇 {label}</Text>
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
          <Text style={styles.confirmBtnText}>{t('chatbot.confirm')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>{t('chatbot.cancel')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({
  msg,
  onConfirmAction,
  onCancelAction,
}: {
  msg: ChatMessage;
  onConfirmAction: (id: string) => void;
  onCancelAction: (id: string) => void;
}) {
  const isUser = msg.role === 'user';

  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>{msg.text}</Text>
        {msg.action && msg.pendingConfirm && (
          <ActionCard
            action={msg.action}
            onConfirm={() => onConfirmAction(msg.id)}
            onCancel={() => onCancelAction(msg.id)}
          />
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Quick chips
// ---------------------------------------------------------------------------

const CHIPS = ['chipFindGold', 'chipEvents', 'chipBalance', 'chipOwnerMode'] as const;

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ChatScreen() {
  const { t, i18n } = useTranslation();
  const { account, connected, connect, skrDomain, isSeekerDevice, userLanguage } = useSolanaWallet();
  const { verified } = useSeekerVerification();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: t('chatbot.welcomeMessage'),
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [mode, setMode] = useState<'customer' | 'owner'>('customer');
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [showChips, setShowChips] = useState(true);

  const listRef = useRef<FlatList>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const inputRef = useRef<TextInput>(null);

  const remainingMessages = FREE_CHATBOT_DAILY_LIMIT - messagesUsed;
  const limitReached = !verified && remainingMessages <= 0;

  // Build chat context from current app state (mock data for unimplemented fields)
  const buildContext = useCallback((): ChatContext => ({
    walletAddress: account?.address?.toString() ?? null,
    skrDomain,
    language: userLanguage,
    xaumBalance: 0,
    usdValue: 0,
    city: 'Unknown',
    neighborhood: 'Unknown',
    streak: 0,
    rank: 999,
    isSeekerDevice,
    nearbyRestaurants: [],
    upcomingEvents: [],
    mode,
    // Owner extras (populated when mode === 'owner')
    restaurantName: undefined,
    restaurantNFT: undefined,
    todayCheckInCount: 0,
    weekGoldDistributed: 0,
    connectedSocials: [],
    currentRewardMultiplier: 1,
  }), [account, skrDomain, userLanguage, isSeekerDevice, mode]);

  // Convert messages to API history format
  const buildHistory = useCallback(
    (msgs: ChatMessage[]): HistoryMessage[] =>
      msgs
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.text })),
    [],
  );

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const full: ChatMessage = { ...msg, id: Date.now().toString() + Math.random(), timestamp: new Date() };
    setMessages((prev) => [...prev, full]);
    return full;
  }, []);

  // ---------------------------------------------------------------------------
  // Send a text message
  // ---------------------------------------------------------------------------

  const doSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping || limitReached) return;

      setShowChips(false);
      setInputText('');
      if (!verified) setMessagesUsed((n) => n + 1);

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: trimmed,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      try {
        const history = buildHistory(messages);
        const result = await sendMessage(trimmed, buildContext(), history);

        const hasAction = result.action !== null;
        addMessage({
          role: 'assistant',
          text: result.text,
          action: result.action ?? undefined,
          pendingConfirm: hasAction,
        });
      } catch (err) {
        addMessage({
          role: 'system',
          text: t('chatbot.errorSend'),
        });
      } finally {
        setIsTyping(false);
        setTimeout(scrollToBottom, 100);
      }
    },
    [isTyping, limitReached, verified, messages, buildContext, buildHistory, addMessage, t, scrollToBottom],
  );

  // ---------------------------------------------------------------------------
  // Voice recording
  // ---------------------------------------------------------------------------

  const startRecording = useCallback(async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('errors.cameraDenied'));
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setVoiceState('recording');
    } catch {
      Alert.alert(t('chatbot.errorVoice'));
    }
  }, [t]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    setVoiceState('transcribing');

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error('No audio file');

      const { transcript } = await transcribeAudio(uri, Platform.OS === 'ios' ? 'm4a' : 'wav');
      setInputText(transcript);
      inputRef.current?.focus();
    } catch {
      Alert.alert(t('chatbot.errorVoice'));
    } finally {
      setVoiceState('idle');
    }
  }, [t]);

  const handleMicPress = useCallback(() => {
    if (voiceState === 'idle') startRecording();
    else if (voiceState === 'recording') stopRecording();
  }, [voiceState, startRecording, stopRecording]);

  // ---------------------------------------------------------------------------
  // Action confirm / cancel
  // ---------------------------------------------------------------------------

  const handleConfirmAction = useCallback((msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, pendingConfirm: false } : m)),
    );
    // TODO: execute the action (send_sol, checkin, buy_ticket, etc.)
    // This is where you'd call the appropriate Solana transaction function.
    if (isSeekerDevice) Alert.alert(t('chatbot.seedVaultHint'));
  }, [isSeekerDevice, t]);

  const handleCancelAction = useCallback((msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, pendingConfirm: false } : m)),
    );
  }, []);

  // ---------------------------------------------------------------------------
  // Quick chip handler
  // ---------------------------------------------------------------------------

  const handleChip = useCallback(
    (key: typeof CHIPS[number]) => {
      const chipMessages: Record<typeof CHIPS[number], string> = {
        chipFindGold: t('chatbot.chipFindGold'),
        chipEvents: t('chatbot.chipEvents'),
        chipBalance: t('chatbot.chipBalance'),
        chipOwnerMode: mode === 'customer' ? t('chatbot.chipOwnerMode') : t('chatbot.chipCustomerMode'),
      };
      doSend(chipMessages[key]);
    },
    [t, doSend, mode],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const micLabel = voiceState === 'recording'
    ? t('chatbot.voiceListening')
    : voiceState === 'transcribing'
    ? t('chatbot.voiceProcessing')
    : '';

  const placeholder =
    voiceState !== 'idle'
      ? t('chatbot.placeholderVoice')
      : limitReached
      ? t('verification.chatLimitReached')
      : t('chatbot.placeholder');

  if (!connected) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.centerEmoji}>🥇</Text>
        <Text style={styles.centerTitle}>{t('chatbot.title')}</Text>
        <Text style={styles.centerDesc}>{t('chatbot.connectWalletFirst')}</Text>
        <TouchableOpacity style={styles.connectBtn} onPress={connect}>
          <Text style={styles.connectBtnText}>{t('chatbot.connectButton')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('chatbot.title')}</Text>
          {!verified && remainingMessages > 0 && (
            <Text style={[styles.limitHint, remainingMessages <= 3 && styles.limitHintWarn]}>
              {t('verification.chatLimitWarning', { remaining: remainingMessages })}
            </Text>
          )}
          {verified && <Text style={styles.unlimitedHint}>{t('verification.perksChatDesc')}</Text>}
        </View>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'owner' && styles.modeBtnOwner]}
          onPress={() => setMode((m) => (m === 'customer' ? 'owner' : 'customer'))}
        >
          <Text style={styles.modeBtnText}>
            {mode === 'owner' ? t('chatbot.ownerModeLabel') : t('chatbot.customerModeLabel')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Message list */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={scrollToBottom}
        renderItem={({ item }) => (
          <MessageBubble
            msg={item}
            onConfirmAction={handleConfirmAction}
            onCancelAction={handleCancelAction}
          />
        )}
        ListFooterComponent={isTyping ? <TypingIndicator /> : null}
      />

      {/* Quick chips — visible before first user message */}
      {showChips && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={styles.chipsContainer}
        >
          {CHIPS.map((key) => (
            <TouchableOpacity key={key} style={styles.chip} onPress={() => handleChip(key)}>
              <Text style={styles.chipText}>{t(`chatbot.${key}`)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Voice state label */}
      {micLabel ? (
        <View style={styles.voiceLabel}>
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={styles.voiceLabelText}>{micLabel}</Text>
        </View>
      ) : null}

      {/* Input row */}
      <View style={[styles.inputRow, limitReached && styles.inputRowDisabled]}>
        {/* Mic button */}
        <TouchableOpacity
          style={[styles.micBtn, voiceState === 'recording' && styles.micBtnActive]}
          onPress={handleMicPress}
          disabled={voiceState === 'transcribing' || limitReached}
        >
          <Text style={styles.micBtnText}>{voiceState === 'recording' ? '⏹' : '🎤'}</Text>
        </TouchableOpacity>

        {/* Text input */}
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          editable={!limitReached && voiceState === 'idle'}
          multiline
          maxLength={500}
          onSubmitEditing={() => doSend(inputText)}
          returnKeyType="send"
          blurOnSubmit
        />

        {/* Send button */}
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || limitReached) && styles.sendBtnDisabled]}
          onPress={() => doSend(inputText)}
          disabled={!inputText.trim() || limitReached || isTyping}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  centerEmoji: { fontSize: 48 },
  centerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  centerDesc: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
  connectBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  connectBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 16 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  limitHint: { fontSize: 11, color: '#F5C518', marginTop: 2 },
  limitHintWarn: { color: COLORS.error },
  unlimitedHint: { fontSize: 11, color: COLORS.success, marginTop: 2 },

  modeBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeBtnOwner: { borderColor: '#F5C518', backgroundColor: '#1a1a00' },
  modeBtnText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },

  listContent: { padding: 12, paddingBottom: 8, flexGrow: 1 },

  bubbleRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  aiBubble: { backgroundColor: COLORS.surface, borderBottomLeftRadius: 4 },
  userBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleText: { color: COLORS.text, fontSize: 15, lineHeight: 22 },
  userBubbleText: { color: '#fff' },

  typingRow: { flexDirection: 'row', marginBottom: 10 },
  typingDots: { flexDirection: 'row', gap: 5, padding: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.textMuted },

  actionCard: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#111120',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F5C518',
    gap: 8,
  },
  actionLabel: { color: '#F5C518', fontSize: 13, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#22c55e',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: { color: COLORS.textMuted, fontSize: 13 },

  chipsContainer: { maxHeight: 48, flexShrink: 0 },
  chipsRow: { paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  chip: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: { color: COLORS.primaryLight, fontSize: 13, fontWeight: '600' },

  voiceLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  voiceLabelText: { color: COLORS.textMuted, fontSize: 12 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputRowDisabled: { opacity: 0.4 },

  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  micBtnActive: { backgroundColor: '#3a0000', borderColor: COLORS.error },
  micBtnText: { fontSize: 20 },

  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.surface },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
