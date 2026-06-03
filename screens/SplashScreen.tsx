import React, { useEffect, useRef } from 'react';
import { Animated, Image, StatusBar } from 'react-native';
import { useMediaStore } from '../stores/mediaStore';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const finishedRef = useRef(false);

  useEffect(() => {
    const done = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onFinish?.();
    };

    const unsub = useMediaStore.subscribe((s) => {
      if (s.hydrationStage >= 2) {
        unsub();
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(done);
      }
    });

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    const forceTimeout = setTimeout(() => {
      unsub();
      if (!finishedRef.current) {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(done);
      }
    }, 4000);

    return () => {
      unsub();
      clearTimeout(forceTimeout);
    };
  }, [fadeAnim, onFinish]);

  return (
    <Animated.View className="flex-1" style={{ opacity: fadeAnim }}>
      <StatusBar hidden />
      <Image
        source={require('../assets/splash.png')}
        className="absolute inset-0 h-full w-full"
        resizeMode="cover"
      />
    </Animated.View>
  );
}
