import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './context/ThemeContext';
import { FileProvider } from './context/FileContext';
import { HomeScreen } from './screens/HomeScreen';
import { CategoryScreen } from './screens/CategoryScreen';
import { DocumentsScreen } from './screens/DocumentsScreen';
import { VideoPlayerScreen } from './screens/VideoPlayerScreen';
import { MusicPlayerScreen } from './screens/MusicPlayerScreen';
import { ImageViewerScreen } from './screens/ImageViewerScreen';
import { DocumentViewerScreen } from './screens/DocumentViewerScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import type { FileItem, FileType, DocumentSubType } from './types';
import './global.css';

export type RootStackParamList = {
  Home: undefined;
  Category: { type: FileType; title: string; icon: string; subType?: DocumentSubType };
  Documents: undefined;
  VideoPlayer: { file: FileItem };
  MusicPlayer: { file: FileItem };
  ImageViewer: { file: FileItem };
  DocumentViewer: { file: FileItem };
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: '#0a0a0a' },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <FileProvider>
          <NavigationContainer>
            <Stack.Navigator screenOptions={screenOptions}>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Category" component={CategoryScreen} />
              <Stack.Screen name="Documents" component={DocumentsScreen} />
              <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} />
              <Stack.Screen name="MusicPlayer" component={MusicPlayerScreen} />
              <Stack.Screen name="ImageViewer" component={ImageViewerScreen} />
              <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
            </Stack.Navigator>
          </NavigationContainer>
          <StatusBar style="auto" />
        </FileProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
