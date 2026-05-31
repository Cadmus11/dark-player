import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { CaretLeft, VideoCamera, MusicNote } from 'phosphor-react-native';
import { useMediaStore } from '../stores/mediaStore';
import { useTheme } from '../context/ThemeContext';
import { formatDuration, formatFileSize } from '../services/FileService';
import { ScreenLayout } from '../components/ScreenLayout';
import { FileIcon } from '../components/FileIcon';
import type { FileItem } from '../types';

type CategoryScreenProps = NativeStackScreenProps<RootStackParamList, 'Category'>;

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  videos: VideoCamera,
  music: MusicNote,
  audio: MusicNote,
};

export function CategoryScreen({ navigation, route }: CategoryScreenProps) {
  const { type, title, icon } = route.params;
  const videos = useMediaStore((s) => s.videos);
  const audio = useMediaStore((s) => s.audio);
  const { textColor, mutedColor, isDarkMode } = useTheme();

  const CategoryIcon = CATEGORY_ICON_MAP[type] || CATEGORY_ICON_MAP[icon] || MusicNote;

  const files = type === 'video' ? videos : audio;

  const navigateToFile = (file: FileItem) => {
    if (type === 'video') navigation.navigate('VideoPlayer', { file });
    else navigation.navigate('MusicPlayer', { file });
  };

  const renderListItem = ({ item }: { item: FileItem }) => (
    <TouchableOpacity
      className="flex-row items-center justify-between py-3"
      style={{
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      }}
      onPress={() => navigateToFile(item)}>
      <View className="flex-1 flex-row items-center">
        <View
          className="mr-3 h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
          <FileIcon type={item.type} size={22} />
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-[15px]" style={{ color: textColor }} numberOfLines={1}>
            {item.name}
          </Text>
          <View className="flex-row items-center">
            {item.size && (
              <Text className="text-xs" style={{ color: mutedColor }}>
                {formatFileSize(item.size)}
              </Text>
            )}
            {item.duration && (
              <>
                <Text className="mx-1.5 text-xs" style={{ color: mutedColor }}>
                  •
                </Text>
                <Text className="text-xs" style={{ color: mutedColor }}>
                  {formatDuration(item.duration)}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>
      <Text className="text-xl" style={{ color: mutedColor }}>
        ›
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScreenLayout noTopBar>
      <View className="flex-row items-center justify-between px-5 pb-5 pt-[60]">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2.5">
          <CaretLeft size={24} color={textColor} />
        </TouchableOpacity>
        <View className="flex-row items-center">
          <CategoryIcon size={20} color={textColor} />
          <Text className="ml-1 text-xl font-semibold" style={{ color: textColor }}>
            {' '}
            {title}
          </Text>
        </View>
        <View className="w-10" />
      </View>
      <FlashList
        data={files}
        renderItem={renderListItem}
        keyExtractor={(item: FileItem) => item.uri}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-[100]">
            <CategoryIcon size={64} color={mutedColor} />
            <Text className="mt-4 text-base" style={{ color: mutedColor }}>
              No {title.toLowerCase()} found
            </Text>
          </View>
        }
      />
    </ScreenLayout>
  );
}
