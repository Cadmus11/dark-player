import React, { useEffect, useRef } from 'react';
import { Animated, Image, StatusBar } from 'react-native';
import { useMediaStore } from '../stores/mediaStore';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const finishedRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const done = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onFinishRef.current?.();
    };

    if (useMediaStore.getState().hydrationStage >= 2) {
      console.log('[SplashScreen] Already at hydrationStage >= 2, finishing.');
      done();
      return;
    }

    const unsub = useMediaStore.subscribe((s) => {
      if (s.hydrationStage >= 2) {
        console.log('[SplashScreen] hydrationStage reached 2, fading out.');
        unsub();
        clearTimeout(forceTimeout);
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
      done();
    }, 4000);

    return () => {
      unsub();
      clearTimeout(forceTimeout);
    };
  }, [fadeAnim]);

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
