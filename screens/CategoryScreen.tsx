import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { CaretLeft, VideoCamera, MusicNote } from 'phosphor-react-native';
import { useFiles } from '../context/FileContext';
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
  const { videos, audio } = useFiles();
  const { textColor, mutedColor } = useTheme();

  const CategoryIcon = CATEGORY_ICON_MAP[type] || CATEGORY_ICON_MAP[icon] || MusicNote;

  const files = type === 'video' ? videos : audio;

  const navigateToFile = (file: FileItem) => {
    if (type === 'video') navigation.navigate('VideoPlayer', { file });
    else navigation.navigate('MusicPlayer', { file });
  };

  const renderListItem = ({ item }: { item: FileItem }) => (
    <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-b-white/10" onPress={() => navigateToFile(item)}>
      <View className="flex-row items-center flex-1">
        <View className="w-11 h-11 rounded-xl bg-white/10 justify-center items-center mr-3">
          <FileIcon type={item.type} size={22} />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] mb-1" style={{ color: textColor }} numberOfLines={1}>{item.name}</Text>
          <View className="flex-row items-center">
            {item.size && <Text className="text-xs" style={{ color: mutedColor }}>{formatFileSize(item.size)}</Text>}
            {item.duration && (
              <>
                <Text className="text-xs mx-1.5" style={{ color: mutedColor }}>•</Text>
                <Text className="text-xs" style={{ color: mutedColor }}>{formatDuration(item.duration)}</Text>
              </>
            )}
          </View>
        </View>
      </View>
      <Text className="text-xl" style={{ color: mutedColor }}>›</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenLayout noTopBar>
      <View className="flex-row items-center justify-between pt-[60] px-5 pb-5">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2.5">
          <CaretLeft size={24} color={textColor} />
        </TouchableOpacity>
        <View className="flex-row items-center">
          <CategoryIcon size={20} color={textColor} />
          <Text className="text-xl font-semibold ml-1" style={{ color: textColor }}> {title}</Text>
        </View>
        <View className="w-10" />
      </View>
      <FlatList
        data={files}
        renderItem={renderListItem}
        keyExtractor={(item: FileItem) => item.uri}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        windowSize={7}
        maxToRenderPerBatch={10}
        removeClippedSubviews
        initialNumToRender={8}
        ListEmptyComponent={
          <View className="items-center justify-center py-[100]">
            <CategoryIcon size={64} color={mutedColor} />
            <Text className="text-base mt-4" style={{ color: mutedColor }}>No {title.toLowerCase()} found</Text>
          </View>
        }
      />
    </ScreenLayout>
  );
}
