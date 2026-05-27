import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { CaretLeft, Play, Star } from 'phosphor-react-native';
import { useFiles } from '../context/FileContext';
import { useTheme } from '../context/ThemeContext';
import { formatDuration } from '../services/FileService';
import { ScreenLayout } from '../components/ScreenLayout';
import type { FileItem } from '../types';

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
  const { videos } = useFiles();
  const { textColor, mutedColor, primaryColor, borderColor } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

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
      <View className="flex-row items-center justify-between pt-[60] px-5 pb-5">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2.5">
          <CaretLeft size={24} color={textColor} />
        </TouchableOpacity>
        <Text className="text-xl font-semibold" style={{ color: textColor }}>Top Videos</Text>
        <View className="w-10" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {hero && (
          <TouchableOpacity
            className="mx-5 mb-6 rounded-2xl overflow-hidden"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            onPress={() => navigateToFile(hero)}>
            <View className="w-full" style={{ aspectRatio: 16 / 9, backgroundColor: 'rgba(255,255,255,0.05)' }}>
              {hero.thumbnail ? (
                <Image source={{ uri: hero.thumbnail }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Play size={48} color={primaryColor} weight="fill" />
                </View>
              )}
              <View className="absolute top-3 left-3 bg-black/60 rounded-full px-3 py-1 flex-row items-center">
                <Star size={14} color="#fbbf24" weight="fill" />
                <Text className="text-white text-xs font-bold ml-1">#1 Pick</Text>
              </View>
              {hero.duration && (
                <View className="absolute bottom-3 right-3 bg-black/70 rounded-md px-2 py-0.5">
                  <Text className="text-white text-xs">{formatDuration(hero.duration)}</Text>
                </View>
              )}
            </View>
            <View className="p-4">
              <Text className="text-base font-bold mb-1" style={{ color: textColor }} numberOfLines={1}>{hero.name}</Text>
              <Text className="text-xs" style={{ color: mutedColor }}>
                {hero.size ? `${(hero.size / 1048576).toFixed(0)} MB` : ''}
                {hero.duration ? ` • ${formatDuration(hero.duration)}` : ''}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <Text className="text-lg font-bold mb-4 px-5" style={{ color: textColor }}>All Top Picks</Text>

        <View className="flex-row flex-wrap px-[18]">
          {topVideos.map((video) => (
            <TouchableOpacity
              key={video.uri}
              className="mb-4 rounded-xl overflow-hidden"
              style={{
                width: CARD_WIDTH,
                marginRight: 10,
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderColor: borderColor,
                borderWidth: 1,
              }}
              onPress={() => navigateToFile(video)}>
              <View style={{ height: CARD_HEIGHT * 0.6, backgroundColor: 'rgba(255,255,255,0.05)' }}>
                {video.thumbnail ? (
                  <Image source={{ uri: video.thumbnail }} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Play size={24} color={primaryColor} weight="fill" />
                  </View>
                )}
                {video.duration && (
                  <View className="absolute bottom-2 right-2 bg-black/70 rounded-md px-1.5 py-0.5">
                    <Text className="text-white text-[10px]">{formatDuration(video.duration)}</Text>
                  </View>
                )}
              </View>
              <View className="p-2.5">
                <Text className="text-xs font-semibold" style={{ color: textColor }} numberOfLines={2}>{video.name}</Text>
                <Text className="text-[10px] mt-1" style={{ color: mutedColor }}>
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
