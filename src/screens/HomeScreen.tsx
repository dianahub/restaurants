import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from '../utils/i18n';

export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('home.title')}</Text>
      <Text style={styles.welcome}>{t('home.welcome')}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('home.dailyCheckIn')}</Text>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>{t('home.checkInButton')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>{t('home.featuredEvents')}</Text>
      <Text style={styles.empty}>{t('home.noEvents')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  welcome: { fontSize: 16, color: '#9ca3af', marginBottom: 24 },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#9945FF33',
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 },
  button: {
    backgroundColor: '#9945FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 12 },
  empty: { color: '#6b7280', fontSize: 14, textAlign: 'center', marginTop: 20 },
});
