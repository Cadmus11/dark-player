import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { House, MusicNote, VideoCamera, FileText, MagnifyingGlass, Gear } from 'phosphor-react-native';

const TABS = [
  { key: 'HomeTab', label: 'Home', Icon: House },
  { key: 'MusicTab', label: 'Music', Icon: MusicNote },
  { key: 'VideosTab', label: 'Videos', Icon: VideoCamera },
  { key: 'DocumentsTab', label: 'Documents', Icon: FileText },
  { key: 'SearchTab', label: 'Search', Icon: MagnifyingGlass },
  { key: 'SettingsTab', label: 'Settings', Icon: Gear },
];

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
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
              size={20}
              color={isFocused ? '#C2FC4A' : 'rgba(255, 255, 255, 0.4)'}
              weight={isFocused ? 'fill' : 'regular'}
            />
            <Text style={[styles.label, isFocused && styles.labelActive]}>
              {tab.label}
            </Text>
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
    paddingTop: 8,
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
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500',
    marginTop: 4,
  },
  labelActive: {
    color: '#C2FC4A',
  },
});
