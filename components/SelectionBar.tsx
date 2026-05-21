import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native';
const FileSystem: any = require('expo-file-system');
import { Playlist, Queue, ShareNetwork, EyeSlash, Trash, X, Play } from 'phosphor-react-native';
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClearSelection} style={styles.cancelBtn}>
          <X size={18} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.count}>{count} selected</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={styles.actions}>
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
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      {icon}
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#18181b',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 30,
    paddingTop: 12,
    paddingHorizontal: 16,
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  count: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 4,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    minWidth: 56,
  },
  actionLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
});
