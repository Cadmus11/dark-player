import React, { type ReactNode } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurBackground } from './BlurBackground';
import { TopBar } from './TopBar';

interface ScreenLayoutProps {
  children: ReactNode;
  scroll?: boolean;
  noTopBar?: boolean;
  noSafeArea?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  blurOverride?: number;
  fitOverride?: 'cover' | 'contain';
}

export function ScreenLayout({
  children,
  scroll = false,
  noTopBar = false,
  noSafeArea = false,
  style,
  contentStyle,
  blurOverride,
  fitOverride,
}: ScreenLayoutProps) {
  const content = (
    <View style={[styles.content, contentStyle]}>
      {!noTopBar && <TopBar />}
      {scroll ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
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
    <BlurBackground blurOverride={blurOverride} fitOverride={fitOverride}>
      <StatusBar barStyle="light-content" backgroundColor="#06060B" translucent />
      {noSafeArea ? content : <SafeAreaView style={styles.safeArea}>{content}</SafeAreaView>}
    </BlurBackground>
  );

  if (style) {
    return <View style={[styles.container, style]}>{wrapped}</View>;
  }

  return wrapped;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 100 },
});
