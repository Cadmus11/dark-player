import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Heart, ClockClockwise, MicrophoneStage, TrendUp,
  VinylRecord, User, Folder,
} from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { ScreenLayout } from '../components/ScreenLayout';
import type { FolderFilterType } from './FolderScreen';

interface CoreItem {
  key: string;
  icon: (color: string) => React.ReactNode;
  label: string;
  filterType: FolderFilterType;
}

const CORE_ITEMS: CoreItem[] = [
  { key: 'liked', icon: (c) => <Heart size={24} color={c} weight="fill" />, label: 'Liked Songs', filterType: 'favorites' },
  { key: 'recent', icon: (c) => <ClockClockwise size={24} color={c} weight="fill" />, label: 'Recently Played', filterType: 'recent' },
  { key: 'lyrics', icon: (c) => <MicrophoneStage size={24} color={c} weight="fill" />, label: 'With Lyrics', filterType: 'recent' },
  { key: 'top', icon: (c) => <TrendUp size={24} color={c} weight="fill" />, label: 'Most Played', filterType: 'mostPlayed' },
  { key: 'albums', icon: (c) => <VinylRecord size={24} color={c} weight="fill" />, label: 'Albums', filterType: 'recent' },
  { key: 'artists', icon: (c) => <User size={24} color={c} weight="fill" />, label: 'Artists', filterType: 'recent' },
  { key: 'folders', icon: (c) => <Folder size={24} color={c} weight="fill" />, label: 'Folders', filterType: 'recent' },
];

export const CorePage = React.memo(function CorePage() {
  const navigation = useNavigation<any>();
  const { primaryColor, textColor, mutedColor, isDarkMode } = useTheme();

  return (
    <ScreenLayout>
      <View className="mb-4 px-4">
        <Text className="text-2xl font-extrabold" style={{ color: textColor }}>
          Core
        </Text>
        <Text className="mt-1 text-sm" style={{ color: mutedColor }}>
          Browse your library
        </Text>
      </View>
      <View className="flex-row flex-wrap px-4">
        {CORE_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={item.key}
            className="mb-3 w-[48%] items-center rounded-[28px] p-5"
            style={{
              marginRight: index % 2 === 0 ? 12 : 0,
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              borderWidth: 1,
              borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}
            onPress={() => navigation.navigate('FolderList', { title: item.label, filterType: item.filterType })}>
            <View
              className="mb-3 h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: `${primaryColor}15` }}>
              {item.icon(primaryColor)}
            </View>
            <Text className="text-center text-sm font-semibold" style={{ color: textColor }}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScreenLayout>
  );
});
