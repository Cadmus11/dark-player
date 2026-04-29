import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { formatDuration } from '../services/FileService';

type VideoPlayerScreenProps = NativeStackScreenProps<RootStackParamList, 'VideoPlayer'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function VideoPlayerScreen({ navigation, route }: VideoPlayerScreenProps) {
  const { file } = route.params;
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [showControls, setShowControls] = useState(true);

  const isPlaying = status && 'isPlaying' in status ? status.isPlaying : false;
  const position = status && 'positionMillis' in status ? status.positionMillis : 0;
  const duration = status && 'durationMillis' in status ? status.durationMillis : 0;

  const togglePlayback = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  };

  const seekTo = async (percentage: number) => {
    if (!videoRef.current || !duration) return;
    await videoRef.current.setPositionAsync(Math.round(percentage * duration));
  };

  const goBack = () => {
    videoRef.current?.stopAsync();
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <TouchableOpacity
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={() => setShowControls(!showControls)}
      >
        <Video
          ref={videoRef}
          source={{ uri: file.uri }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          onPlaybackStatusUpdate={setStatus}
        />

        {showControls && (
          <View style={styles.controlsOverlay}>
            <View style={styles.headerControls}>
              <TouchableOpacity style={styles.controlButton} onPress={goBack}>
                <Text style={styles.controlIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.title} numberOfLines={1}>
                {file.name}
              </Text>
              <View style={{ width: 44 }} />
            </View>

            <View style={styles.centerControls}>
              <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
                <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomControls}>
              <View style={styles.progressContainer}>
                <TouchableOpacity
                  style={styles.progressBar}
                  onPress={(e) => {
                    const { locationX } = e.nativeEvent;
                    seekTo(locationX / SCREEN_WIDTH);
                  }}
                >
                  <View
                    style={[
                      styles.progressFill,
                      { width: duration ? `${(position / duration) * 100}%` : '0%' },
                    ]}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{formatDuration(position as number)}</Text>
                <Text style={styles.timeText}>{formatDuration(duration as number)}</Text>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  videoContainer: { flex: 1 },
  video: { width: '100%', height: '100%' },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'space-between',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  controlButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  controlIcon: { fontSize: 28, color: '#ffffff' },
  title: { flex: 1, fontSize: 16, color: '#ffffff', textAlign: 'center', marginHorizontal: 10 },
  centerControls: { alignItems: 'center' },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: { fontSize: 36, color: '#ffffff' },
  bottomControls: { paddingHorizontal: 20, paddingBottom: 40 },
  progressContainer: { height: 20, justifyContent: 'center' },
  progressBar: { height: 4, backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: '#6c5ce7', borderRadius: 2 },
  timeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  timeText: { fontSize: 12, color: 'rgba(255, 255, 255, 0.7)' },
});
