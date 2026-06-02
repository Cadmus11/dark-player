import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppNavigation } from '../hooks/useAppNavigation';
import {
  Heart,
  ClockClockwise,
  MicrophoneStage,
  TrendUp,
  VinylRecord,
  User,
  Folder,
} from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { ScreenLayout } from '../components/ScreenLayout';
import { ThemedText } from '../components/ThemedText';
import type { FolderFilterType } from '../types';

interface CoreItem {
  key: string;
  icon: (color: string) => React.ReactNode;
  label: string;
  filterType: FolderFilterType;
}

const CORE_ITEMS: CoreItem[] = [
  {
    key: 'liked',
    icon: (c) => <Heart size={24} color={c} weight="fill" />,
    label: 'Liked Songs',
    filterType: 'favorites',
  },
  {
    key: 'recent',
    icon: (c) => <ClockClockwise size={24} color={c} weight="fill" />,
    label: 'Recently Played',
    filterType: 'recent',
  },
  {
    key: 'lyrics',
    icon: (c) => <MicrophoneStage size={24} color={c} weight="fill" />,
    label: 'With Lyrics',
    filterType: 'recent',
  },
  {
    key: 'top',
    icon: (c) => <TrendUp size={24} color={c} weight="fill" />,
    label: 'Most Played',
    filterType: 'mostPlayed',
  },
  {
    key: 'albums',
    icon: (c) => <VinylRecord size={24} color={c} weight="fill" />,
    label: 'Albums',
    filterType: 'recent',
  },
  {
    key: 'artists',
    icon: (c) => <User size={24} color={c} weight="fill" />,
    label: 'Artists',
    filterType: 'recent',
  },
  {
    key: 'folders',
    icon: (c) => <Folder size={24} color={c} weight="fill" />,
    label: 'Folders',
    filterType: 'recent',
  },
];

export const CorePage = React.memo(function CorePage() {
  const navigation = useAppNavigation();
  const { primaryColor, isDarkMode, borderColor } = useTheme();

  const cardBg = isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
  const cardBorder = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const iconBg = `${primaryColor}12`;

  return (
    <ScreenLayout>
      <View className="mb-5 px-4">
        <ThemedText variant="h1">Core</ThemedText>
        <ThemedText variant="caption" style={{ marginTop: 2 }}>Browse your library</ThemedText>
      </View>
      <View className="flex-row flex-wrap px-3">
        {CORE_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.7}
            style={[
              styles.card,
              {
                backgroundColor: cardBg,
                borderColor: cardBorder,
                marginRight: index % 2 === 0 ? 8 : 0,
              },
            ]}
            onPress={() =>
              navigation.navigate('FolderList', { title: item.label, filterType: item.filterType })
            }>
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
              {item.icon(primaryColor)}
            </View>
            <ThemedText variant="body" style={{ textAlign: 'center', fontWeight: '600' }}>
              {item.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </ScreenLayout>
  );
});

const styles = StyleSheet.create({
  card: {
    width: '48%',
    marginBottom: 10,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
});
