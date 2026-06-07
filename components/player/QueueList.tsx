import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image } from 'react-native';
import { MusicNotes, X } from 'phosphor-react-native';
import type { FileItem } from '../../types';
import { formatDuration } from '../../utils/format';

interface QueueListProps {
  items: FileItem[];
  currentIndex: number;
  isPlaying: boolean;
  primaryColor: string;
  currentFile: FileItem | null;
  dynamicTextColor: string;
  dynamicMutedColor: string;
  onPlayIndex: (index: number) => void;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
}

export function QueueList({
  items,
  currentIndex,
  isPlaying,
  primaryColor,
  dynamicTextColor,
  dynamicMutedColor,
  onPlayIndex,
  onRemove,
  onMove,
}: QueueListProps) {
  const [reorderIdx, setReorderIdx] = useState<number | null>(null);
  const scrollRef = useRef<FlatList>(null);

  if (items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <MusicNotes size={48} color="#52525b" />
        <Text className="mt-4 text-base" style={{ color: dynamicMutedColor }}>
          Queue is empty
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {reorderIdx !== null && (
        <View
          className="flex-row items-center justify-between px-5 py-2"
          style={{ backgroundColor: 'rgba(39,39,42,0.8)' }}>
          <Text className="text-sm" style={{ color: dynamicMutedColor }}>
            Move &ldquo;{items[reorderIdx]?.name?.substring(0, 20)}&rdquo;
          </Text>
          <TouchableOpacity onPress={() => setReorderIdx(null)}>
            <Text className="text-sm font-bold" style={{ color: primaryColor }}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        ref={scrollRef}
        data={items}
        keyExtractor={(item) => item.uri}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item, index }) => {
          const isCurrent = index === currentIndex;
          const isReorderActive = reorderIdx !== null;
          const isThisReordering = reorderIdx === index;

          return (
            <View
              className="flex-row items-center px-4"
              style={[
                {
                  minHeight: 64,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255,255,255,0.05)',
                },
                isCurrent && { backgroundColor: `${primaryColor}12` },
              ]}>
              <TouchableOpacity
                className="mr-2 h-10 w-8 items-center justify-center"
                onLongPress={() => setReorderIdx(index)}
                delayLongPress={300}
                onPress={() => {
                  if (!isReorderActive) onPlayIndex(index);
                }}>
                <View className="gap-0.5">
                  <View className="h-0.5 w-3.5 rounded bg-zinc-500" />
                  <View className="h-0.5 w-3.5 rounded bg-zinc-500" />
                  <View className="h-0.5 w-3.5 rounded bg-zinc-500" />
                </View>
              </TouchableOpacity>
              <Text
                className="mr-2 w-8 text-center text-sm font-bold"
                style={{ color: isCurrent ? primaryColor : dynamicMutedColor }}>
                {isCurrent && isPlaying ? '\u25B6' : `${index + 1}`}
              </Text>
              <View
                className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${item.artColor || primaryColor}20` }}>
                {item.thumbnail ? (
                  <Image source={{ uri: item.thumbnail }} className="h-10 w-10 rounded-xl" />
                ) : (
                  <MusicNotes size={18} color={isCurrent ? primaryColor : dynamicMutedColor} />
                )}
              </View>
              <View className="flex-1">
                <Text
                  className="text-sm font-semibold"
                  numberOfLines={1}
                  style={{ color: isCurrent ? primaryColor : dynamicTextColor }}>
                  {item.name}
                </Text>
                <Text className="mt-0.5 text-xs" style={{ color: dynamicMutedColor }}>
                  {item.artist || (item.duration ? formatDuration(item.duration) : '')}
                </Text>
              </View>
              {isReorderActive && isThisReordering ? (
                <View className="flex-row gap-1">
                  <TouchableOpacity
                    className="h-9 w-9 items-center justify-center rounded-full active:bg-white/10"
                    onPress={() => {
                      if (index > 0) {
                        onMove(index, index - 1);
                        setReorderIdx(index - 1);
                      }
                    }}>
                    <Text className="text-lg font-bold" style={{ color: dynamicMutedColor }}>
                      {'\u25B2'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="h-9 w-9 items-center justify-center rounded-full active:bg-white/10"
                    onPress={() => {
                      if (index < items.length - 1) {
                        onMove(index, index + 1);
                        setReorderIdx(index + 1);
                      }
                    }}>
                    <Text className="text-lg font-bold" style={{ color: dynamicMutedColor }}>
                      {'\u25BC'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : isReorderActive ? (
                <TouchableOpacity
                  className="rounded-lg px-3 py-1.5"
                  style={{ borderWidth: 1, borderColor: dynamicMutedColor }}
                  onPress={() => {
                    if (reorderIdx !== null && reorderIdx !== index) {
                      onMove(reorderIdx, index);
                      setReorderIdx(null);
                    }
                  }}>
                  <Text className="text-xs font-semibold" style={{ color: dynamicMutedColor }}>
                    Move Here
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  className="ml-2 h-9 w-9 items-center justify-center rounded-full active:bg-white/10"
                  onPress={() => onRemove(index)}>
                  <X size={16} color="#71717a" />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}
