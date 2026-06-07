import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from '../types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['com.darkmanager.app://', 'https://lumora.app'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          MusicTab: 'music',
          VideosTab: 'videos',
          PlaylistsTab: 'playlists',
          CoreTab: 'core',
          SearchTab: 'search',
          SettingsTab: 'settings',
        },
      },
      Category: 'category/:type/:title',
      FolderList: 'folder/:title/:filterType',
      VideoTop: 'videos/top',
      PrivateFolder: 'private',
    },
  },
};
