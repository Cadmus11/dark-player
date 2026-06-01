import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import {
  MusicNote,
  VideoCamera,
  VinylRecord,
  FolderSimple,
  MicrophoneStage,
  Playlist,
  SquaresFour,
} from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';

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
    params: { title: 'Folders', filterType: 'recent' as const },
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
  const navigation = useNavigation<any>();
  const { primaryColor, mutedColor } = useTheme();

  const tabState = useNavigationState((state) => {
    const mainTabs = state?.routes?.find((r) => r.name === 'MainTabs');
    return mainTabs?.state;
  });

  const currentTab: string | undefined = tabState?.routeNames?.[tabState?.index ?? 0] ?? 'MusicTab';

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-2">
      {TABS.map((tab) => {
        const isActive = currentTab === tab.key;
        const Icon = tab.icon;
        return (
          <TouchableOpacity
            key={tab.key}
            className="mr-2 flex-row items-center rounded-full px-4 py-1.5"
            style={isActive ? { backgroundColor: primaryColor + '20' } : { opacity: 0.6 }}
            onPress={() => {
              if ('params' in tab && tab.params) {
                navigation.navigate(tab.route as any, tab.params as any);
              } else {
                navigation.navigate(tab.route as any);
              }
            }}>
            <Icon
              size={15}
              color={isActive ? primaryColor : mutedColor}
              weight={isActive ? 'fill' : 'regular'}
            />
            <Text
              className="ml-1.5 text-sm font-semibold"
              style={{ color: isActive ? primaryColor : mutedColor }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
