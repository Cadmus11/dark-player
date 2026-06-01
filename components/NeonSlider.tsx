import React, { useRef, useMemo } from 'react';
import { View, PanResponder, type GestureResponderEvent, type PanResponderGestureState } from 'react-native';

interface NeonSliderProps {
  progress: number;
  onSeek: (percentage: number) => void;
  onSeekStart?: () => void;
  onSeekEnd?: () => void;
  width?: number;
  showThumb?: boolean;
  height?: number;
  primaryColor?: string;
  secondaryColor?: string;
  bufferColor?: string;
  bufferedProgress?: number;
}

export function NeonSlider({
  progress,
  onSeek,
  onSeekStart,
  onSeekEnd,
  width: containerWidth,
  showThumb = true,
  height = 4,
  primaryColor = '#00E5FF',
  secondaryColor,
  bufferColor,
  bufferedProgress,
}: NeonSliderProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const clampedBuffered =
    bufferedProgress !== undefined ? Math.min(Math.max(bufferedProgress, 0), 1) : 0;
  const trackBgColor = secondaryColor ? secondaryColor + '40' : 'rgba(255, 255, 255, 0.1)';
  const trackRef = useRef<View>(null);
  const trackLayout = useRef({ x: 0, width: 300 });

  const getFraction = (locationX: number) => {
    const w = trackLayout.current.width || containerWidth || 300;
    return Math.min(Math.max(locationX / w, 0), 1);
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e: GestureResponderEvent) => {
      trackLayout.current.x = 0;
      const fraction = getFraction(e.nativeEvent.locationX);
      onSeek(fraction);
      onSeekStart?.();
    },
    onPanResponderMove: (e: GestureResponderEvent, _gs: PanResponderGestureState) => {
      const fraction = getFraction(e.nativeEvent.locationX);
      onSeek(fraction);
    },
    onPanResponderRelease: (_e: GestureResponderEvent, _gs: PanResponderGestureState) => {
      onSeekEnd?.();
    },
    onPanResponderTerminate: () => {
      onSeekEnd?.();
    },
  }), [onSeek, onSeekStart, onSeekEnd, containerWidth]);

  return (
    <View
      ref={trackRef}
      className="justify-center"
      style={{ height: height + 24, width: containerWidth }}
      onLayout={() => {
        trackRef.current?.measureInWindow((_x, _y, w) => {
          trackLayout.current.width = w;
        });
      }}
      {...panResponder.panHandlers}>
      <View
        className="overflow-visible rounded-[3px]"
        style={{ height, backgroundColor: trackBgColor }}>
        {bufferedProgress !== undefined && clampedBuffered > 0 && (
          <View
            className="absolute rounded-[3px]"
            style={{
              width: `${clampedBuffered * 100}%` as unknown as number,
              height,
              backgroundColor: bufferColor || primaryColor + '30',
            }}
          />
        )}
        <View
          className="rounded-[3px]"
          style={{
            width: `${clampedProgress * 100}%` as unknown as number,
            height,
            backgroundColor: primaryColor,
            shadowColor: primaryColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 6,
            elevation: 3,
          }}
        />
        {showThumb && (
          <View
            className="absolute -top-1.5 -ml-2.5 h-5 w-5 rounded-full"
            style={{
              left: `${clampedProgress * 100}%` as unknown as number,
              backgroundColor: primaryColor,
              shadowColor: primaryColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 8,
              elevation: 4,
            }}
          />
        )}
      </View>
    </View>
  );
}
