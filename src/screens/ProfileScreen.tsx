import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from '../utils/i18n';

const MENU_ITEMS = ['settings', 'notifications', 'privacy', 'help'] as const;

export default function ProfileScreen() {
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('profile.title')}</Text>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>👤</Text>
      </View>
      <Text style={styles.level}>{t('profile.level', { level: 1 })}</Text>
      <Text style={styles.points}>{t('profile.points', { count: 0 })}</Text>

      <View style={styles.menu}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity key={item} style={styles.menuItem}>
            <Text style={styles.menuLabel}>{t(`profile.${item}`)}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn}>
        <Text style={styles.logoutText}>{t('profile.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { padding: 20, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 24, alignSelf: 'flex-start' },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#9945FF',
    marginBottom: 12,
  },
  avatarText: { fontSize: 40 },
  level: { color: '#9945FF', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  points: { color: '#9ca3af', fontSize: 14, marginBottom: 28 },
  menu: { width: '100%', gap: 2, marginBottom: 32 },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
  },
  menuLabel: { color: '#fff', fontSize: 16 },
  chevron: { color: '#6b7280', fontSize: 20 },
  logoutBtn: { borderWidth: 1, borderColor: '#ef444444', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 },
  logoutText: { color: '#ef4444', fontWeight: '600', fontSize: 16 },
});
