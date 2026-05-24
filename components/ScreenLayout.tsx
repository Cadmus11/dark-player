import React, { type ReactNode } from 'react';
import { View, ScrollView, StatusBar, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurBackground } from './BlurBackground';
import { TopBar } from './TopBar';
import { useTheme } from '../context/ThemeContext';

interface ScreenLayoutProps {
  children: ReactNode;
  scroll?: boolean;
  noTopBar?: boolean;
  noSafeArea?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function ScreenLayout({
  children,
  scroll = false,
  noTopBar = false,
  noSafeArea = false,
  style,
  contentStyle,
}: ScreenLayoutProps) {
  const { isDarkMode, theme } = useTheme();
  const content = (
    <View className="flex-1" style={contentStyle}>
      {!noTopBar && <TopBar />}
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </View>
  );

  const wrapped = (
    <BlurBackground>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#06060B' : '#F0F8FF'} translucent />
      {noSafeArea ? content : <SafeAreaView className="flex-1">{content}</SafeAreaView>}
    </BlurBackground>
  );

  if (style) {
    return <View className="flex-1" style={style}>{wrapped}</View>;
  }

  return wrapped;
}
