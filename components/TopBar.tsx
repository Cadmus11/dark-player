import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useFont } from '../context/FontContext';

export function TopBar() {
  const { t } = useLanguage();
  const { fontFamily } = useFont();

  return (
    <View style={styles.container}>
      <Image source={require('../assets/icon.png')} style={styles.avatar} />
      <Text style={[styles.username, fontFamily ? { fontFamily } : undefined]}>{t('topbar.title')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 12,
  },
});
