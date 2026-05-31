import React from 'react';
import { View, Text, TouchableOpacity, Share, Alert } from 'react-native';
import { Playlist, Queue, ShareNetwork, EyeSlash, Trash, X } from 'phosphor-react-native';
import type { FileItem, FileAction } from '../types';
import { useTheme } from '../context/ThemeContext';

interface SelectionBarProps {
  selectedUris: Set<string>;
  selectedFiles: FileItem[];
  onClearSelection: () => void;
  onAction: (action: FileAction, files: FileItem[]) => void;
  primaryColor: string;
}

export function SelectionBar({
  selectedUris,
  selectedFiles,
  onClearSelection,
  onAction,
  primaryColor,
}: SelectionBarProps) {
  const { textColor, isDarkMode } = useTheme();
  if (selectedUris.size === 0) return null;

  const count = selectedUris.size;

  const handleDelete = () => {
    Alert.alert(
      'Delete Files',
      `Permanently delete ${count} file${count !== 1 ? 's' : ''}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onAction('delete', selectedFiles),
        },
      ]
    );
  };

  return (
    <View
      className="absolute bottom-0 left-0 right-0 z-50 border-t px-4 pb-[30] pt-3"
      style={{
        backgroundColor: isDarkMode ? '#18181b' : '#f4f4f5',
        borderTopColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#d4d4d8',
      }}>
      <View className="mb-3 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={onClearSelection}
          className="h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
          <X size={18} color={textColor} />
        </TouchableOpacity>
        <Text className="text-sm font-bold" style={{ color: textColor }}>
          {count} selected
        </Text>
        <View className="w-8" />
      </View>
      <View className="flex-row justify-around gap-1">
        <ActionBtn
          icon={<Playlist size={20} color={textColor} />}
          label="Add to"
          onPress={() => onAction('addToPlaylist', selectedFiles)}
        />
        <ActionBtn
          icon={<Queue size={20} color={textColor} />}
          label="Play Next"
          onPress={() => onAction('playNext', selectedFiles)}
        />
        <ActionBtn
          icon={<ShareNetwork size={20} color={textColor} />}
          label="Share"
          onPress={async () => {
            try {
              await Share.share({
                message: selectedFiles.map((f) => f.name).join('\n'),
              });
            } catch {}
          }}
        />
        <ActionBtn
          icon={<EyeSlash size={20} color={textColor} />}
          label="Hide"
          onPress={() => onAction('hide', selectedFiles)}
        />
        <ActionBtn
          icon={<Trash size={20} color="#ef4444" />}
          label="Delete"
          onPress={handleDelete}
        />
      </View>
    </View>
  );
}

function ActionBtn({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  const { mutedColor } = useTheme();
  return (
    <TouchableOpacity
      className="min-w-[56] items-center gap-1 rounded-xl px-2.5 py-2"
      onPress={onPress}>
      {icon}
      <Text className="text-[10px] font-semibold" style={{ color: mutedColor }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
