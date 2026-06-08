import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { useNavigationState } from '@react-navigation/native';
import {
  MusicNote,
  VideoCamera,
  VinylRecord,
  FolderSimple,
  MicrophoneStage,
  Playlist,
  SquaresFour,
} from 'phosphor-react-native';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useTheme } from '../context/ThemeContext';
import { useColorAwareness } from '../context/ColorAwarenessContext';
import { hapticLight } from '../utils/haptics';

const TABS = [
  { key: 'MusicTab', route: 'MusicTab', icon: MusicNote, label: 'Music' },
  { key: 'VideosTab', route: 'VideosTab', icon: VideoCamera, label: 'Videos' },
  { key: 'CoreTab', route: 'CoreTab', icon: SquaresFour, label: 'Core' },
  {
    key: 'Albums',
    route: 'Category',
    icon: VinylRecord,
    label: 'Albums',
    params: { type: 'audio', title: 'Albums', icon: 'music' },
  },
  {
    key: 'Folders',
    route: 'FolderList',
    icon: FolderSimple,
    label: 'Folders',
    params: { title: 'Folders', filterType: 'folders' as const },
  },
  {
    key: 'Artists',
    route: 'Category',
    icon: MicrophoneStage,
    label: 'Artists',
    params: { type: 'audio', title: 'Artists', icon: 'music' },
  },
  { key: 'PlaylistsTab', route: 'PlaylistsTab', icon: Playlist, label: 'Playlists' },
] as const;

export function Navbar() {
  const navigation = useAppNavigation();
  const { primaryColor, mutedColor } = useTheme();
  const { canUseArtwork, themeColors } = useColorAwareness();

  const tabState = useNavigationState((state) => {
    const mainTabs = state?.routes?.find((r) => r.name === 'MainTabs');
    return mainTabs?.state;
  });

  const currentTab: string | undefined = tabState?.routeNames?.[tabState?.index ?? 0] ?? 'MusicTab';

  const activeColor = canUseArtwork ? themeColors.accent : primaryColor;
  const inactiveColor = canUseArtwork ? themeColors.textSecondary : mutedColor;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-2">
      {TABS.map((tab) => {
        const isActive = currentTab === tab.key;
        const Icon = tab.icon;
        return (
          <TouchableOpacity
            key={tab.key}
            className="mr-2 flex-row items-center rounded-full px-4 py-1.5"
            style={{
              borderWidth: 1,
              borderColor: isActive ? activeColor : inactiveColor + '40',
              backgroundColor: isActive ? activeColor + '15' : 'transparent',
            }}
            onPress={() => {
              hapticLight();
              if ('params' in tab && tab.params) {
                navigation.navigate(tab.route as any, tab.params as any);
              } else {
                navigation.navigate(tab.route as any);
              }
            }}
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}>
            <Icon
              size={15}
              color={isActive ? activeColor : inactiveColor}
              weight={isActive ? 'fill' : 'regular'}
            />
            <Text
              className="ml-1.5 text-sm font-semibold"
              style={{ color: isActive ? activeColor : inactiveColor }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
