import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { ArrowUp, ArrowDown } from 'phosphor-react-native';
import type { SortField, SortDirection } from '../types';

interface SortOption {
  field: SortField;
  label: string;
  group: 'general' | 'music' | 'video';
}

const ALL_SORT_OPTIONS: SortOption[] = [
  { field: 'name', label: 'Name', group: 'general' },
  { field: 'date', label: 'Date Modified', group: 'general' },
  { field: 'newest', label: 'Newest First', group: 'general' },
  { field: 'size', label: 'File Size', group: 'general' },
  { field: 'type', label: 'File Type', group: 'general' },
  { field: 'duration', label: 'Duration', group: 'general' },
  { field: 'artist', label: 'Artist', group: 'music' },
  { field: 'album', label: 'Album', group: 'music' },
  { field: 'playCount', label: 'Play Count', group: 'music' },
  { field: 'recentlyPlayed', label: 'Recently Played', group: 'music' },
];

interface SortModalProps {
  visible: boolean;
  onClose: () => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSelect: (field: SortField, direction: SortDirection) => void;
  primaryColor: string;
  textColor: string;
  mutedColor: string;
  isDarkMode: boolean;
}

export function SortModal({
  visible,
  onClose,
  sortField,
  sortDirection,
  onSelect,
  primaryColor,
  textColor,
  mutedColor,
  isDarkMode,
}: SortModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        className="flex-1 items-center justify-center bg-black/70"
        onPress={onClose}>
        <View
          className="w-4/5 max-w-[340px] rounded-[28px] p-6"
          style={{ backgroundColor: isDarkMode ? '#27272a' : '#ffffff' }}>
          <Text className="mb-1 text-center text-lg font-extrabold" style={{ color: textColor }}>
            Sort by
          </Text>
          <Text className="mb-4 text-center text-xs" style={{ color: mutedColor }}>
            Tap again to reverse order
          </Text>

          {ALL_SORT_OPTIONS.map((option) => {
            const isActive = sortField === option.field;
            return (
              <TouchableOpacity
                key={option.field}
                className="mb-1 flex-row items-center justify-between rounded-xl px-4 py-3.5"
                style={isActive ? { backgroundColor: `${primaryColor}15` } : undefined}
                onPress={() => {
                  if (isActive) {
                    const nextDir: SortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                    onSelect(option.field, nextDir);
                  } else {
                    onSelect(option.field, option.field === 'name' ? 'asc' : 'desc');
                  }
                  onClose();
                }}>
                <View className="flex-row items-center gap-3">
                  <Text
                    className="text-base"
                    style={{
                      color: isActive ? primaryColor : textColor,
                      fontWeight: isActive ? '700' : '500',
                    }}>
                    {option.label}
                  </Text>
                </View>
                {isActive &&
                  (sortDirection === 'asc' ? (
                    <ArrowUp size={18} color={primaryColor} weight="bold" />
                  ) : (
                    <ArrowDown size={18} color={primaryColor} weight="bold" />
                  ))}
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
