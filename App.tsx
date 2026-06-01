import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { NavigationContainer } from '@react-navigation/native';
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
import { MiniPlayer } from './components/player/MiniPlayer';
import { NowPlayingBar } from './components/player/NowPlayingBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PlayerBoundary } from './components/FeatureBoundary';
import type {
  MainTabParamList,
  RootStackParamList,
} from './types';
import './global.css';

const MusicScreen = lazy(() => import('./screens/MusicScreen').then(m => ({ default: m.MusicScreen })));
const VideosScreen = lazy(() => import('./screens/VideosScreen').then(m => ({ default: m.VideosScreen })));
const PlaylistsScreen = lazy(() => import('./screens/PlaylistsScreen').then(m => ({ default: m.PlaylistsScreen })));
const CorePage = lazy(() => import('./screens/CorePage').then(m => ({ default: m.CorePage })));
const SearchScreen = lazy(() => import('./screens/SearchScreen').then(m => ({ default: m.SearchScreen })));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const CategoryScreen = lazy(() => import('./screens/CategoryScreen').then(m => ({ default: m.CategoryScreen })));
const FolderScreen = lazy(() => import('./screens/FolderScreen').then(m => ({ default: m.FolderScreen })));
const VideoTopScreen = lazy(() => import('./screens/VideoTopScreen').then(m => ({ default: m.VideoTopScreen })));
const PrivateFolderScreen = lazy(() => import('./screens/PrivateFolderScreen').then(m => ({ default: m.PrivateFolderScreen })));
const VideoPlayerScreen = lazy(() => import('./screens/VideoPlayerScreen').then(m => ({ default: m.VideoPlayerScreen })));
const MusicPlayerScreen = lazy(() => import('./screens/MusicPlayerScreen').then(m => ({ default: m.MusicPlayerScreen })));

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function ScreenFallback() {
  return (
    <View className="flex-1 items-center justify-center bg-bg-primary dark:bg-dark-bg-primary">
      <ActivityIndicator size="large" color="#00E5FF" />
    </View>
  );
}

function MainTabs() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <View className="flex-1 bg-bg-primary dark:bg-dark-bg-primary">
      <Tab.Navigator tabBar={() => null} screenOptions={{ headerShown: false, lazy: true }}>
        <Tab.Screen name="MusicTab">
          {() => (
            <Suspense fallback={<ScreenFallback />}>
              <MusicScreen />
            </Suspense>
          )}
        </Tab.Screen>
        <Tab.Screen name="VideosTab">
          {() => (
            <Suspense fallback={<ScreenFallback />}>
              <VideosScreen />
            </Suspense>
          )}
        </Tab.Screen>
        <Tab.Screen name="PlaylistsTab">
          {() => (
            <Suspense fallback={<ScreenFallback />}>
              <PlaylistsScreen />
            </Suspense>
          )}
        </Tab.Screen>
        <Tab.Screen name="CoreTab">
          {() => (
            <Suspense fallback={<ScreenFallback />}>
              <CorePage />
            </Suspense>
          )}
        </Tab.Screen>
        <Tab.Screen name="SearchTab">
          {() => (
            <Suspense fallback={<ScreenFallback />}>
              <SearchScreen />
            </Suspense>
          )}
        </Tab.Screen>
        <Tab.Screen name="SettingsTab">
          {() => (
            <Suspense fallback={<ScreenFallback />}>
              <SettingsScreen />
            </Suspense>
          )}
        </Tab.Screen>
      </Tab.Navigator>
      <NowPlayingBar />
      <MiniPlayer />
    </View>
  );
}

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: 'transparent' },
  animation: 'slide_from_right' as const,
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

  const handleNavigationReady = useCallback(() => {
    performance?.mark?.('navigation-ready');
  }, []);

  const handleStateChange = useCallback(() => {
    performance?.mark?.('navigation-state-change');
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
                        <NavigationContainer
                          onReady={handleNavigationReady}
                          onStateChange={handleStateChange}>
                          <Suspense fallback={<ScreenFallback />}>
                            <Stack.Navigator screenOptions={screenOptions}>
                              <Stack.Screen name="MainTabs" component={MainTabs} />
                              <Stack.Screen name="Category">
                                {(props) => (
                                  <Suspense fallback={<ScreenFallback />}>
                                    <CategoryScreen {...props} />
                                  </Suspense>
                                )}
                              </Stack.Screen>
                              <Stack.Screen name="FolderList">
                                {(props) => (
                                  <Suspense fallback={<ScreenFallback />}>
                                    <FolderScreen {...props} />
                                  </Suspense>
                                )}
                              </Stack.Screen>
                              <Stack.Screen name="VideoTop">
                                {(props) => (
                                  <Suspense fallback={<ScreenFallback />}>
                                    <VideoTopScreen {...props} />
                                  </Suspense>
                                )}
                              </Stack.Screen>
                              <Stack.Screen name="PrivateFolder">
                                {(props) => (
                                  <Suspense fallback={<ScreenFallback />}>
                                    <PrivateFolderScreen {...props} />
                                  </Suspense>
                                )}
                              </Stack.Screen>
                              <Stack.Screen name="VideoPlayer">
                                {(props) => (
                                  <Suspense fallback={<ScreenFallback />}>
                                    <PlayerBoundary>
                                      <VideoPlayerScreen {...props} />
                                    </PlayerBoundary>
                                  </Suspense>
                                )}
                              </Stack.Screen>
                              <Stack.Screen name="MusicPlayer">
                                {(props) => (
                                  <Suspense fallback={<ScreenFallback />}>
                                    <MusicPlayerScreen {...props} />
                                  </Suspense>
                                )}
                              </Stack.Screen>
                            </Stack.Navigator>
                          </Suspense>
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
