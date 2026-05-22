import React from 'react';
import { View, Text, TouchableOpacity, Share, Alert } from 'react-native';
const FileSystem: any = require('expo-file-system');
import { Playlist, Queue, ShareNetwork, EyeSlash, Trash, X } from 'phosphor-react-native';
import type { FileItem, FileAction } from '../types';

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
    <View className="absolute bottom-0 left-0 right-0 bg-[#18181b] border-t border-t-white/10 pb-[30] pt-3 px-4 z-50">
      <View className="flex-row items-center justify-between mb-3">
        <TouchableOpacity onPress={onClearSelection} className="w-8 h-8 rounded-full justify-center items-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <X size={18} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-sm font-bold text-white">{count} selected</Text>
        <View className="w-8" />
      </View>
      <View className="flex-row justify-around gap-1">
        <ActionBtn icon={<Playlist size={20} color="#ffffff" />} label="Add to" onPress={() => onAction('addToPlaylist', selectedFiles)} />
        <ActionBtn icon={<Queue size={20} color="#ffffff" />} label="Play Next" onPress={() => onAction('playNext', selectedFiles)} />
        <ActionBtn icon={<ShareNetwork size={20} color="#ffffff" />} label="Share" onPress={async () => {
          try {
            await Share.share({
              message: selectedFiles.map((f) => f.name).join('\n'),
            });
          } catch {}
        }} />
        <ActionBtn icon={<EyeSlash size={20} color="#ffffff" />} label="Hide" onPress={() => onAction('hide', selectedFiles)} />
        <ActionBtn icon={<Trash size={20} color="#ef4444" />} label="Delete" onPress={handleDelete} />
      </View>
    </View>
  );
}

function ActionBtn({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity className="items-center gap-1 py-2 px-2.5 rounded-xl min-w-[56]" onPress={onPress}>
      {icon}
      <Text className="text-[10px] font-semibold text-white/70">{label}</Text>
    </TouchableOpacity>
  );
}
