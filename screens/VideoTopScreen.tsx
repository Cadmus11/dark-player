import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Image } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, FileItem } from '../types';
import { CaretLeft, Play, Star } from 'phosphor-react-native';
import { useMediaStore } from '../stores/mediaStore';
import { useTheme } from '../context/ThemeContext';
import { formatDuration } from '../services/FileService';
import { ScreenLayout } from '../components/ScreenLayout';

type VideoTopScreenProps = NativeStackScreenProps<RootStackParamList, 'VideoTop'>;

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.4;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

function scoreVideoQuality(v: FileItem): number {
  if (!v.duration || v.duration <= 0) return 0;
  const bitrate = (v.size || 0) / v.duration;
  const durationScore = Math.min(v.duration / 60000, 10);
  return bitrate * 1000 + durationScore;
}

export function VideoTopScreen({ navigation }: VideoTopScreenProps) {
  const videos = useMediaStore((s) => s.videos);
  const { textColor, mutedColor, primaryColor, borderColor, isDarkMode } = useTheme();

  const topVideos = useMemo(() => {
    return [...videos]
      .filter((v) => v.duration && v.duration > 0)
      .sort((a, b) => scoreVideoQuality(b) - scoreVideoQuality(a))
      .slice(0, 30);
  }, [videos]);

  const hero = topVideos[0];

  const navigateToFile = (file: FileItem) => {
    navigation.navigate('VideoPlayer', { file });
  };

  return (
    <ScreenLayout noTopBar>
      <View className="flex-row items-center justify-between px-5 pb-5 pt-[60]">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2.5">
          <CaretLeft size={24} color={textColor} />
        </TouchableOpacity>
        <Text className="text-xl font-semibold" style={{ color: textColor }}>
          Top Videos
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}>
        {hero && (
          <TouchableOpacity
            className="mx-5 mb-6 overflow-hidden rounded-2xl"
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
            onPress={() => navigateToFile(hero)}>
            <View
              className="w-full"
              style={{
                aspectRatio: 16 / 9,
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              }}>
              {hero.thumbnail ? (
                <Image
                  source={{ uri: hero.thumbnail }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Play size={48} color={primaryColor} weight="fill" />
                </View>
              )}
              <View className="absolute left-3 top-3 flex-row items-center rounded-full bg-black/60 px-3 py-1">
                <Star size={14} color="#fbbf24" weight="fill" />
                <Text className="ml-1 text-xs font-bold text-white">#1 Pick</Text>
              </View>
              {hero.duration && (
                <View className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-0.5">
                  <Text className="text-xs text-white">{formatDuration(hero.duration)}</Text>
                </View>
              )}
            </View>
            <View className="p-4">
              <Text
                className="mb-1 text-base font-bold"
                style={{ color: textColor }}
                numberOfLines={1}>
                {hero.name}
              </Text>
              <Text className="text-xs" style={{ color: mutedColor }}>
                {hero.size ? `${(hero.size / 1048576).toFixed(0)} MB` : ''}
                {hero.duration ? ` • ${formatDuration(hero.duration)}` : ''}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <Text className="mb-4 px-5 text-lg font-bold" style={{ color: textColor }}>
          All Top Picks
        </Text>

        <View className="flex-row flex-wrap px-[18]">
          {topVideos.map((video) => (
            <TouchableOpacity
              key={video.uri}
              className="mb-4 overflow-hidden rounded-xl"
              style={{
                width: CARD_WIDTH,
                marginRight: 10,
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                borderColor: borderColor,
                borderWidth: 1,
              }}
              onPress={() => navigateToFile(video)}>
              <View
                style={{
                  height: CARD_HEIGHT * 0.6,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                }}>
                {video.thumbnail ? (
                  <Image
                    source={{ uri: video.thumbnail }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Play size={24} color={primaryColor} weight="fill" />
                  </View>
                )}
                {video.duration && (
                  <View className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5">
                    <Text className="text-[10px] text-white">{formatDuration(video.duration)}</Text>
                  </View>
                )}
              </View>
              <View className="p-2.5">
                <Text
                  className="text-xs font-semibold"
                  style={{ color: textColor }}
                  numberOfLines={2}>
                  {video.name}
                </Text>
                <Text className="mt-1 text-[10px]" style={{ color: mutedColor }}>
                  {video.size ? `${(video.size / 1048576).toFixed(0)} MB` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
