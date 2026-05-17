import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';

interface SplashScreenProps {
  onFinish: () => void;
}

const { width } = Dimensions.get('window');

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [animValues] = useState({
    logoOpacity: new Animated.Value(0),
    logoScale: new Animated.Value(0.3),
    logoRotate: new Animated.Value(0),
    titleOpacity: new Animated.Value(0),
    subtitleOpacity: new Animated.Value(0),
    lineOpacity: new Animated.Value(0),
    lineWidth: new Animated.Value(0),
    glowPulse: new Animated.Value(0),
    fadeOut: new Animated.Value(1),
  });

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(animValues.glowPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(animValues.glowPulse, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.sequence([
      Animated.parallel([
        Animated.timing(animValues.logoOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(animValues.logoScale, {
          toValue: 1,
          tension: 40,
          friction: 5,
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
          toValue: 140,
          duration: 600,
          useNativeDriver: false,
        }),
      ]),
      Animated.timing(animValues.subtitleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(1000),
      Animated.timing(animValues.fadeOut, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => onFinish());

    pulse.start();
  }, []);

  const glowInterpolation = animValues.glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.6],
  });

  return (
    <Animated.View style={[styles.container, { opacity: animValues.fadeOut }]}>
      <StatusBar hidden />
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: animValues.logoOpacity,
              transform: [
                { scale: animValues.logoScale },
              ],
            },
          ]}
        >
          <View style={styles.logoWrapper}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Animated.View
            style={[
              styles.glowRing,
              { opacity: glowInterpolation },
            ]}
          />
          <Animated.View
            style={[
              styles.glowRingOuter,
              { opacity: Animated.multiply(glowInterpolation, 0.4) },
            ]}
          />
        </Animated.View>

        <Animated.Text
          style={[styles.title, { opacity: animValues.titleOpacity }]}
        >
          LUMORA
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
          Your Media, Immersive
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
    backgroundColor: '#06060B',
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
  logoWrapper: {
    width: 130,
    height: 130,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(194, 252, 74, 0.2)',
    overflow: 'hidden',
  },
  logoImage: {
    width: 90,
    height: 90,
  },
  glowRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 42,
    borderWidth: 1.5,
    borderColor: '#C2FC4A',
  },
  glowRingOuter: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 52,
    borderWidth: 1,
    borderColor: '#C2FC4A',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 6,
    marginBottom: 20,
  },
  lineContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  line: {
    height: 2,
    backgroundColor: '#C2FC4A',
    shadowColor: '#C2FC4A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 3,
  },
  footer: {
    marginBottom: 60,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.2)',
  },
});
