import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { NavigationContainer, NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './context/ThemeContext';
import { ColorAwarenessProvider } from './context/ColorAwarenessContext';
import { LanguageProvider } from './context/LanguageContext';
import { FontProvider } from './context/FontContext';
import { OverlayProvider } from './services/OverlaySystem';
import { QueryProvider } from './hooks/queries/QueryProvider';
import { startHydration } from './services/HydrationService';
import { lifecycleManager } from './services/LifecycleManager';
import { notificationService } from './services/NotificationService';
import { SplashScreen } from './screens/SplashScreen';
import { MusicScreen } from './screens/MusicScreen';
import { VideosScreen } from './screens/VideosScreen';
import { PlaylistsScreen } from './screens/PlaylistsScreen';
import { CorePage } from './screens/CorePage';
import { SearchScreen } from './screens/SearchScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { CategoryScreen } from './screens/CategoryScreen';
import { FolderScreen } from './screens/FolderScreen';
import { VideoTopScreen } from './screens/VideoTopScreen';
import { PrivateFolderScreen } from './screens/PrivateFolderScreen';
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
  MusicTab: undefined;
  VideosTab: undefined;
  PlaylistsTab: undefined;
  CoreTab: undefined;
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
  PrivateFolder: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <View className="flex-1 bg-bg-primary dark:bg-dark-bg-primary">
      <Tab.Navigator tabBar={() => null} screenOptions={{ headerShown: false }}>
        <Tab.Screen name="MusicTab" component={MusicScreen} />
        <Tab.Screen name="VideosTab" component={VideosScreen} />
        <Tab.Screen name="PlaylistsTab" component={PlaylistsScreen} />
        <Tab.Screen name="CoreTab" component={CorePage} />
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
  contentStyle: { backgroundColor: 'transparent' },
};

export default function App() {
  useEffect(() => {
    lifecycleManager.initialize();
    startHydration();
    notificationService.setup().catch(console.error);
    return () => {
      lifecycleManager.cleanup();
      notificationService.cleanup();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <QueryProvider>
            <ErrorBoundary>
              <LanguageProvider>
                <FontProvider>
                  <ThemeProvider>
                    <ColorAwarenessProvider>
                      <OverlayProvider>
                        <NavigationContainer>
                          <Stack.Navigator screenOptions={screenOptions}>
                            <Stack.Screen name="MainTabs" component={MainTabs} />
                            <Stack.Screen name="Category" component={CategoryScreen} />
                            <Stack.Screen name="FolderList" component={FolderScreen} />
                            <Stack.Screen name="VideoTop" component={VideoTopScreen} />
                            <Stack.Screen name="PrivateFolder" component={PrivateFolderScreen} />
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
                    </ColorAwarenessProvider>
                  </ThemeProvider>
                </FontProvider>
              </LanguageProvider>
            </ErrorBoundary>
          </QueryProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
