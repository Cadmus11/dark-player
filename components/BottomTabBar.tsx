import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { House, MusicNote, VideoCamera, MagnifyingGlass, Gear } from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const TABS = [
  { key: 'HomeTab', labelKey: 'nav.home', Icon: House },
  { key: 'MusicTab', labelKey: 'nav.music', Icon: MusicNote },
  { key: 'VideosTab', labelKey: 'nav.videos', Icon: VideoCamera },
  { key: 'SearchTab', labelKey: 'nav.search', Icon: MagnifyingGlass },
  { key: 'SettingsTab', labelKey: 'nav.settings', Icon: Gear },
];

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { primaryColor, textColor, mutedColor, cardBg, borderColor, isDarkMode } = useTheme();
  const { t } = useLanguage();

  return (
    <View
      className="flex-row pb-6 pt-2.5"
      style={{ backgroundColor: cardBg, borderTopWidth: 1, borderTopColor: borderColor }}>
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
            className="flex-1 items-center justify-center">
            <tab.Icon
              size={22}
              color={isFocused ? primaryColor : mutedColor}
              weight={isFocused ? 'fill' : 'regular'}
            />
            {isFocused && (
              <Text className="mt-0.5 text-[10px] font-medium" style={{ color: primaryColor }}>
                {t(tab.labelKey)}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
