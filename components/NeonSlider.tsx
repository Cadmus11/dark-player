import React from 'react';
import { View, TouchableOpacity } from 'react-native';

interface NeonSliderProps {
  progress: number;
  onSeek: (percentage: number) => void;
  width?: number;
  showThumb?: boolean;
  height?: number;
  primaryColor?: string;
}

export function NeonSlider({
  progress,
  onSeek,
  width: containerWidth,
  showThumb = true,
  height = 4,
  primaryColor = '#C2FC4A',
}: NeonSliderProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <TouchableOpacity
      className="justify-center"
      style={{ height: height + 20, width: containerWidth }}
      onPress={(e) => {
        const { locationX } = e.nativeEvent;
        const percentage = locationX / (containerWidth || 300);
        onSeek(Math.min(Math.max(percentage, 0), 1));
      }}
      activeOpacity={1}>
      <View
        className="overflow-visible rounded-[3px]"
        style={{ height, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
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
            className="absolute -top-1.5 -ml-2 h-4 w-4 rounded-full"
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
    </TouchableOpacity>
  );
}
