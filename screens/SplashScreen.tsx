import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';

interface SplashScreenProps {
  onFinish: () => void;
}

const { width, height } = Dimensions.get('window');

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [animValues] = useState({
    logoOpacity: new Animated.Value(0),
    logoScale: new Animated.Value(0.5),
    titleOpacity: new Animated.Value(0),
    subtitleOpacity: new Animated.Value(0),
    lineOpacity: new Animated.Value(0),
    lineWidth: new Animated.Value(0),
    fadeOut: new Animated.Value(1),
  });

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(animValues.logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(animValues.logoScale, {
          toValue: 1,
          tension: 50,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(animValues.titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(animValues.lineOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(animValues.lineWidth, {
          toValue: 120,
          duration: 600,
          useNativeDriver: false,
        }),
      ]),
      Animated.timing(animValues.subtitleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(1200),
      Animated.timing(animValues.fadeOut, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: animValues.fadeOut }]}>
      <StatusBar hidden />
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: animValues.logoOpacity,
              transform: [{ scale: animValues.logoScale }],
            },
          ]}
        >
          <View style={styles.logoBg}>
            <Text style={styles.logoIcon}>📂</Text>
          </View>
          <View style={styles.glowRing} />
        </Animated.View>

        <Animated.Text
          style={[styles.title, { opacity: animValues.titleOpacity }]}
        >
          Dark Manager
        </Animated.Text>

        <Animated.View
          style={[
            styles.lineContainer,
            { opacity: animValues.lineOpacity },
          ]}
        >
          <Animated.View
            style={[
              styles.line,
              { width: animValues.lineWidth },
            ]}
          />
        </Animated.View>

        <Animated.Text
          style={[styles.subtitle, { opacity: animValues.subtitleOpacity }]}
        >
          Your Files, Beautifully Organized
        </Animated.Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>v1.0.0</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBg: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6c5ce7',
    shadowColor: '#6c5ce7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoIcon: {
    fontSize: 56,
  },
  glowRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(108, 92, 231, 0.2)',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
    marginBottom: 16,
    textShadowColor: 'rgba(108, 92, 231, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  lineContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  line: {
    height: 2,
    backgroundColor: '#6c5ce7',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
  },
  footer: {
    marginBottom: 60,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
  },
});
