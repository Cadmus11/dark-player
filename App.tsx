import React from 'react';
import { View } from 'react-native';
import { NavigationContainer, NavigatorScreenParams } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './context/ThemeContext';
import { FileProvider } from './context/FileContext';
import { LanguageProvider } from './context/LanguageContext';
import { FontProvider } from './context/FontContext';
import { HomeScreen } from './screens/HomeScreen';
import { MusicScreen } from './screens/MusicScreen';
import { VideosScreen } from './screens/VideosScreen';
import { DocumentsScreen } from './screens/DocumentsScreen';
import { SearchScreen } from './screens/SearchScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { CategoryScreen } from './screens/CategoryScreen';
import { VideoPlayerScreen } from './screens/VideoPlayerScreen';
import { MusicPlayerScreen } from './screens/MusicPlayerScreen';
import { ImageViewerScreen } from './screens/ImageViewerScreen';
import { DocumentViewerScreen } from './screens/DocumentViewerScreen';
import { DocumentReaderScreen } from './screens/DocumentReaderScreen';
import { BottomTabBar } from './components/BottomTabBar';
import { MiniPlayer } from './components/player/MiniPlayer';
import { NowPlayingBar } from './components/player/NowPlayingBar';
import type { FileItem, FileType, DocumentSubType } from './types';
import './global.css';

export type MainTabParamList = {
  HomeTab: undefined;
  MusicTab: undefined;
  VideosTab: undefined;
  DocumentsTab: undefined;
  SearchTab: undefined;
  SettingsTab: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  Category: { type: FileType; title: string; icon: string; subType?: DocumentSubType };
  VideoPlayer: { file: FileItem; isAudioOnly?: boolean };
  MusicPlayer: { file: FileItem; isVideoAsAudio?: boolean };
  ImageViewer: { file: FileItem };
  DocumentViewer: { file: FileItem };
  DocumentReader: { file: FileItem };
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <View style={{ flex: 1, backgroundColor: '#06060B' }}>
      <Tab.Navigator
        tabBar={(props) => <BottomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="HomeTab" component={HomeScreen} />
        <Tab.Screen name="MusicTab" component={MusicScreen} />
        <Tab.Screen name="VideosTab" component={VideosScreen} />
        <Tab.Screen name="DocumentsTab" component={DocumentsScreen} />
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
  contentStyle: { backgroundColor: '#06060B' },
};

export default function App() {
  return (
    <SafeAreaProvider>
    <LanguageProvider>
      <FontProvider>
      <ThemeProvider>
        <FileProvider>
          <NavigationContainer>
            <Stack.Navigator screenOptions={screenOptions}>
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen name="Category" component={CategoryScreen} />
              <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} />
              <Stack.Screen name="MusicPlayer" component={MusicPlayerScreen} />
              <Stack.Screen name="ImageViewer" component={ImageViewerScreen} />
              <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} />
              <Stack.Screen name="DocumentReader" component={DocumentReaderScreen} />
            </Stack.Navigator>
          </NavigationContainer>
          <StatusBar style="auto" />
        </FileProvider>
      </ThemeProvider>
      </FontProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
