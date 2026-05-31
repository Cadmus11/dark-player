import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MagnifyingGlass, Gear, MusicNote, VideoCamera } from 'phosphor-react-native';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export function TopBar() {
  const navigation = useNavigation<any>();
  const { t } = useLanguage();
  const { primaryColor, textColor, mutedColor, isDarkMode } = useTheme();

  const state = navigation.getState();
  const mainTabs = state?.routes?.find((r: any) => r.name === 'MainTabs');
  const tabState = mainTabs?.state;
  const currentTab: string = tabState?.routeNames?.[tabState?.index ?? 0] ?? 'HomeTab';

  const activeSegment = currentTab === 'MusicTab' ? 'music' : currentTab === 'VideosTab' ? 'videos' : null;

  return (
    <View>
      <View className="flex-row items-center justify-between px-5 pt-3 pb-1">
        <TouchableOpacity onPress={() => navigation.navigate('HomeTab')}>
          <Text className="text-base font-semibold tracking-wide" style={{ color: textColor }}>
            {t('topbar.title')}
          </Text>
        </TouchableOpacity>
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => navigation.navigate('SearchTab')}>
            <MagnifyingGlass size={20} color={textColor} weight="bold" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('SettingsTab')}>
            <Gear size={20} color={textColor} weight="bold" />
          </TouchableOpacity>
        </View>
      </View>
      <View className="flex-row items-center justify-center px-5 pb-2">
        <View className="flex-row rounded-full p-0.5" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}>
          <TouchableOpacity
            className="flex-row items-center rounded-full px-5 py-1.5"
            style={activeSegment === 'music' ? { backgroundColor: primaryColor + '30' } : { opacity: 0.6 }}
            onPress={() => navigation.navigate('MusicTab')}>
            <MusicNote
              size={15}
              color={activeSegment === 'music' ? primaryColor : mutedColor}
              weight={activeSegment === 'music' ? 'fill' : 'regular'}
            />
            <Text
              className="ml-1.5 text-sm font-semibold"
              style={{ color: activeSegment === 'music' ? primaryColor : mutedColor }}>
              {t('nav.music')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center rounded-full px-5 py-1.5"
            style={activeSegment === 'videos' ? { backgroundColor: primaryColor + '30' } : { opacity: 0.6 }}
            onPress={() => navigation.navigate('VideosTab')}>
            <VideoCamera
              size={15}
              color={activeSegment === 'videos' ? primaryColor : mutedColor}
              weight={activeSegment === 'videos' ? 'fill' : 'regular'}
            />
            <Text
              className="ml-1.5 text-sm font-semibold"
              style={{ color: activeSegment === 'videos' ? primaryColor : mutedColor }}>
              {t('nav.videos')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
