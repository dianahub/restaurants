import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from '../utils/i18n';

export default function ChatScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('chat.title')}</Text>
        <TouchableOpacity style={styles.newBtn}>
          <Text style={styles.newBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{t('chat.noConversations')}</Text>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>{t('chat.startConversation')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  newBtn: { backgroundColor: '#9945FF', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  newBtnText: { color: '#fff', fontSize: 24, fontWeight: '300' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#6b7280', fontSize: 16, marginBottom: 20 },
  button: { backgroundColor: '#9945FF', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
