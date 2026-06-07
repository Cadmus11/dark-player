import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { MagnifyingGlass, Clock, X, VideoCamera, MusicNote } from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { useSearchQuery } from '../hooks/useSearchQuery';
import { useSearchHistoryStore } from '../stores/searchHistoryStore';
import { SearchService } from '../services/Search/SearchService';
import type { FileItem, FileType } from '../types';
import { FileIcon } from '../components/FileIcon';
import { ScreenLayout } from '../components/ScreenLayout';

const TYPE_FILTERS: { type: FileType | 'all'; label: string; Icon: React.ElementType }[] = [
  { type: 'all', label: 'All', Icon: MagnifyingGlass },
  { type: 'video', label: 'Videos', Icon: VideoCamera },
  { type: 'audio', label: 'Music', Icon: MusicNote },
];

export const SearchScreen = React.memo(function SearchScreen() {
  const navigation = useAppNavigation();
  const { primaryColor, textColor, mutedColor, borderColor, isDarkMode } = useTheme();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FileType | 'all'>('all');
  const [isFocused, setIsFocused] = useState(false);
  const searchHistory = useSearchHistoryStore((s) => s.searchHistory);
  const loadSearchHistory = useSearchHistoryStore((s) => s.load);

  React.useEffect(() => {
    loadSearchHistory();
  }, [loadSearchHistory]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const rawResults = useSearchQuery(query);
  const results = useMemo(() => {
    if (activeFilter === 'all') return rawResults;
    return rawResults.filter((f) => f.type === activeFilter);
  }, [rawResults, activeFilter]);

  const showHistory = !query.trim() && isFocused;

  const navigateToFile = (file: FileItem) => {
    if (file.type === 'video') navigation.navigate('VideoPlayer', { file });
    else if (file.type === 'audio') navigation.navigate('MusicPlayer', { file });
  };

  const handleSearch = (text: string) => {
    setQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim()) {
      searchTimer.current = setTimeout(() => {
        SearchService.saveHistory(text.trim());
      }, 500);
    }
  };

  const handleHistoryTap = (searchQuery: string) => {
    setQuery(searchQuery);
    SearchService.saveHistory(searchQuery);
  };

  const removeSearch = (id: string) => {
    SearchService.removeHistory(id);
  };

  const clearSearchHistory = () => {
    SearchService.clearHistory();
  };

  const renderItem = ({ item }: { item: FileItem }) => (
    <TouchableOpacity
      className="flex-row items-center gap-3 py-2.5"
      onPress={() => navigateToFile(item)}>
      <View
        className="h-10 w-10 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: `${primaryColor}10` }}>
        <FileIcon type={item.type} size={20} />
      </View>
      <View className="flex-1">
        <Text
          className="mb-0.5 text-sm font-semibold"
          style={{ color: textColor }}
          numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="text-xs capitalize" style={{ color: mutedColor }}>
          {item.type}
          {item.artist ? ` • ${item.artist}` : ''}
        </Text>
      </View>
      <Text className="text-xl" style={{ color: mutedColor }}>
        ›
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScreenLayout>
      <View className="px-4 pb-2 pt-1">
        <View
          className="mb-4 flex-row items-center gap-2.5 rounded-xl border px-3.5 py-3"
          style={{
            backgroundColor: isDarkMode ? '#27272a' : '#ffffff',
            borderColor: isFocused ? primaryColor : borderColor,
          }}>
          <MagnifyingGlass size={20} color={isFocused ? primaryColor : mutedColor} weight="bold" />
          <TextInput
            className="flex-1 text-[15px]"
            style={{ color: textColor }}
            placeholder="Search your media..."
            placeholderTextColor={mutedColor}
            value={query}
            onChangeText={handleSearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 100)}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={18} color={mutedColor} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="flex-row gap-2 px-4">
          {TYPE_FILTERS.map(({ type, label, Icon }) => (
            <TouchableOpacity
              key={type}
              className="flex-row items-center gap-1.5 rounded-[10px] px-3 py-2"
              style={{
                backgroundColor:
                  activeFilter === type ? primaryColor : isDarkMode ? '#27272a' : '#e4e4e7',
              }}
              onPress={() => setActiveFilter(type)}>
              <Icon
                size={14}
                color={activeFilter === type ? textColor : mutedColor}
                weight={activeFilter === type ? 'bold' : 'regular'}
              />
              <Text
                className="text-xs font-semibold"
                style={{
                  color: activeFilter === type ? textColor : mutedColor,
                  fontWeight: activeFilter === type ? '700' : '500',
                }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {showHistory && (
          <View className="mt-3">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Clock size={16} color={mutedColor} />
                <Text className="text-sm font-bold" style={{ color: textColor }}>
                  Recent Searches
                </Text>
              </View>
              {searchHistory.length > 0 && (
                <TouchableOpacity onPress={clearSearchHistory}>
                  <Text className="text-[13px] font-semibold" style={{ color: primaryColor }}>
                    Clear All
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {searchHistory.length > 0 ? (
              searchHistory.slice(0, 10).map((search) => (
                <View
                  key={search.id}
                  className="flex-row items-center justify-between border-b py-3"
                  style={{ borderBottomColor: borderColor }}>
                  <TouchableOpacity
                    className="flex-1 flex-row items-center gap-3"
                    onPress={() => handleHistoryTap(search.query)}>
                    <Clock size={16} color={mutedColor} />
                    <Text className="flex-1 text-sm" style={{ color: textColor }} numberOfLines={1}>
                      {search.query}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeSearch(search.id)}>
                    <X size={14} color={mutedColor} />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text className="py-5 text-center text-sm" style={{ color: mutedColor }}>
                No recent searches
              </Text>
            )}
          </View>
        )}
      </View>

      <FlashList
        data={query.trim() ? results : []}
        renderItem={renderItem}
        keyExtractor={(item: FileItem) => item.uri}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          query.trim() ? (
            <View className="items-center justify-center py-20">
              <MagnifyingGlass size={56} color={mutedColor} />
              <Text className="mt-4 text-base" style={{ color: mutedColor }}>
                No results found
              </Text>
            </View>
          ) : (
            <View className="items-center justify-center py-20">
              <MagnifyingGlass size={56} color={mutedColor} />
              <Text className="mt-4 text-base" style={{ color: mutedColor }}>
                Search your media files
              </Text>
            </View>
          )
        }
      />
    </ScreenLayout>
  );
});
