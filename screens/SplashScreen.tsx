import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  StatusBar,
} from 'react-native';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View className="flex-1" style={{ opacity: fadeAnim }}>
      <StatusBar hidden />
      <Image
        source={require('../assets/splash.png')}
        className="absolute inset-0 w-full h-full"
        resizeMode="cover"
      />
    </Animated.View>
  );
}
