import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { House, MusicNote, VideoCamera, FileText, MagnifyingGlass, Gear } from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const TABS = [
  { key: 'HomeTab', labelKey: 'nav.home', Icon: House },
  { key: 'MusicTab', labelKey: 'nav.music', Icon: MusicNote },
  { key: 'VideosTab', labelKey: 'nav.videos', Icon: VideoCamera },
  { key: 'DocumentsTab', labelKey: 'nav.documents', Icon: FileText },
  { key: 'SearchTab', labelKey: 'nav.search', Icon: MagnifyingGlass },
  { key: 'SettingsTab', labelKey: 'nav.settings', Icon: Gear },
];

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { primaryColor } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const tab = TABS.find((t) => t.key === route.name);

        if (!tab) return null;

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tab}
          >
            <tab.Icon
              size={22}
              color={isFocused ? primaryColor : 'rgba(255, 255, 255, 0.4)'}
              weight={isFocused ? 'fill' : 'regular'}
            />
            {isFocused && (
              <Text style={[styles.label, { color: primaryColor }]}>
                {t(tab.labelKey)}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 3,
  },
});
