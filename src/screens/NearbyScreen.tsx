import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useTranslation } from '../utils/i18n';

export default function NearbyScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('nearby.title')}</Text>
      <TextInput
        style={styles.search}
        placeholder={t('nearby.searchPlaceholder')}
        placeholderTextColor="#6b7280"
      />
      <Text style={styles.hint}>{t('nearby.enableLocation')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  search: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffffff1a',
  },
  hint: { color: '#6b7280', textAlign: 'center', marginTop: 40 },
});
