import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface NeonSliderProps {
  progress: number;
  onSeek: (percentage: number) => void;
  width?: number;
  showThumb?: boolean;
  height?: number;
}

export function NeonSlider({
  progress,
  onSeek,
  width: containerWidth,
  showThumb = true,
  height = 4,
}: NeonSliderProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <TouchableOpacity
      style={[styles.track, { height: height + 20, width: containerWidth }]}
      onPress={(e) => {
        const { locationX } = e.nativeEvent;
        const trackWidth = containerWidth || e.nativeEvent.target;
        const percentage = locationX / (containerWidth || trackWidth);
        onSeek(Math.min(Math.max(percentage, 0), 1));
      }}
      activeOpacity={1}
    >
      <View style={[styles.trackBg, { height }]}>
        <View
          style={[
            styles.trackFill,
            { width: `${clampedProgress * 100}%`, height },
          ]}
        />
        {showThumb && (
          <View
            style={[
              styles.thumb,
              { left: `${clampedProgress * 100}%` as unknown as number },
            ]}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    justifyContent: 'center',
  },
  trackBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'visible',
  },
  trackFill: {
    backgroundColor: '#C2FC4A',
    borderRadius: 3,
    shadowColor: '#C2FC4A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  thumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    marginLeft: -8,
    shadowColor: '#C2FC4A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
});
