import React, { type ReactNode } from 'react';
import { View, ScrollView, StatusBar, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurBackground } from './BlurBackground';
import { EdgeLighting } from './EdgeLighting';
import { TopBar } from './TopBar';
import { useTheme } from '../context/ThemeContext';
import { useColorAwareness } from '../context/ColorAwarenessContext';

interface ScreenLayoutProps {
  children: ReactNode;
  scroll?: boolean;
  noTopBar?: boolean;
  noSafeArea?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  onSortPress?: () => void;
  sortLabel?: string;
  enableEdgeLighting?: boolean;
}

export function ScreenLayout({
  children,
  scroll = false,
  noTopBar = false,
  noSafeArea = false,
  style,
  contentStyle,
  onSortPress,
  sortLabel,
  enableEdgeLighting = false,
}: ScreenLayoutProps) {
  const { isDarkMode, backgroundColor } = useTheme();
  const { canUseArtwork, themeColors } = useColorAwareness();

  const content = (
    <View className="flex-1" style={contentStyle}>
      {!noTopBar && <TopBar onSortPress={onSortPress} sortLabel={sortLabel} />}
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </View>
  );

  const wrapped = (
    <BlurBackground>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={canUseArtwork ? themeColors.background : backgroundColor}
        translucent
      />
      {enableEdgeLighting ? (
        <EdgeLighting>
          {noSafeArea ? content : <SafeAreaView className="flex-1">{content}</SafeAreaView>}
        </EdgeLighting>
      ) : noSafeArea ? (
        content
      ) : (
        <SafeAreaView className="flex-1">{content}</SafeAreaView>
      )}
    </BlurBackground>
  );

  if (style) {
    return (
      <View className="flex-1" style={style}>
        {wrapped}
      </View>
    );
  }

  return wrapped;
}
