import React, { useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer, NavigatorScreenParams } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './context/ThemeContext';
import { FileProvider } from './context/FileContext';
import { LanguageProvider } from './context/LanguageContext';
import { FontProvider } from './context/FontContext';
import { OverlayProvider } from './services/OverlaySystem';
import { startHydration } from './services/HydrationService';
import { lifecycleManager } from './services/LifecycleManager';
import { HomeScreen } from './screens/HomeScreen';
import { MusicScreen } from './screens/MusicScreen';
import { VideosScreen } from './screens/VideosScreen';
import { SearchScreen } from './screens/SearchScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { CategoryScreen } from './screens/CategoryScreen';
import { FolderScreen } from './screens/FolderScreen';
import { VideoTopScreen } from './screens/VideoTopScreen';
import { VideoPlayerScreen } from './screens/VideoPlayerScreen';
import { MusicPlayerScreen } from './screens/MusicPlayerScreen';
import { MiniPlayer } from './components/player/MiniPlayer';
import { NowPlayingBar } from './components/player/NowPlayingBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PlayerBoundary } from './components/FeatureBoundary';
import type { FileItem, FileType } from './types';
import type { FolderFilterType } from './screens/FolderScreen';
import './global.css';

export type MainTabParamList = {
  HomeTab: undefined;
  MusicTab: undefined;
  VideosTab: undefined;
  SearchTab: undefined;
  SettingsTab: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  Category: { type: FileType; title: string; icon: string };
  FolderList: { title: string; filterType: FolderFilterType };
  VideoTop: undefined;
  VideoPlayer: { file: FileItem; isAudioOnly?: boolean };
  MusicPlayer: { file: FileItem; isVideoAsAudio?: boolean };
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <View className="flex-1 bg-bg-primary dark:bg-dark-bg-primary">
      <Tab.Navigator
        tabBar={() => null}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="HomeTab" component={HomeScreen} />
        <Tab.Screen name="MusicTab" component={MusicScreen} />
        <Tab.Screen name="VideosTab" component={VideosScreen} />
        <Tab.Screen name="SearchTab" component={SearchScreen} />
        <Tab.Screen name="SettingsTab" component={SettingsScreen} />
      </Tab.Navigator>
      <NowPlayingBar />
      <MiniPlayer />
    </View>
  );
}

const screenOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: 'transparent' },
};

export default function App() {
  useEffect(() => {
    lifecycleManager.initialize();
    startHydration();
    return () => lifecycleManager.cleanup();
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
      <LanguageProvider>
        <FontProvider>
        <ThemeProvider>
          <FileProvider>
            <OverlayProvider>
              <NavigationContainer>
                <Stack.Navigator screenOptions={screenOptions}>
                  <Stack.Screen name="MainTabs" component={MainTabs} />
                  <Stack.Screen name="Category" component={CategoryScreen} />
                  <Stack.Screen name="FolderList" component={FolderScreen} />
                  <Stack.Screen name="VideoTop" component={VideoTopScreen} />
                  <Stack.Screen name="VideoPlayer">
                    {(props) => (
                      <PlayerBoundary>
                        <VideoPlayerScreen {...props} />
                      </PlayerBoundary>
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="MusicPlayer" component={MusicPlayerScreen} />
                </Stack.Navigator>
              </NavigationContainer>
            </OverlayProvider>
          </FileProvider>
        </ThemeProvider>
        </FontProvider>
      </LanguageProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
