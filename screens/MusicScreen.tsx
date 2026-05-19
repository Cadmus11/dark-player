import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MusicNote, ListDashes, GridFour, ArrowDown, ArrowUp, FunnelSimple } from 'phosphor-react-native';
import { useFiles } from '../context/FileContext';
import { useTheme } from '../context/ThemeContext';
import type { FileItem, SortField, SortDirection, LayoutMode } from '../types';
import { TopBar } from '../components/TopBar';
import LayoutToggle from '../components/LayoutToggle';
import FileGrid from '../components/FileGrid';
import FileList from '../components/FileList';

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'date', label: 'Date' },
  { field: 'artist', label: 'Artist' },
  { field: 'duration', label: 'Duration' },
  { field: 'size', label: 'Size' },
];

export function MusicScreen() {
  const { audio } = useFiles();
  const navigation = useNavigation<any>();
  const { primaryColor, textColor, mutedColor } = useTheme();
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('list');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showSortModal, setShowSortModal] = useState(false);

  const toggleDirection = useCallback(() => {
    setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
  }, []);

  const sortedAudio = useMemo(() => {
    const arr = [...audio];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'date':
          cmp = (b.modifiedAt || 0) - (a.modifiedAt || 0);
          break;
        case 'artist':
          cmp = (a.artist || '').localeCompare(b.artist || '');
          break;
        case 'duration':
          cmp = (b.duration || 0) - (a.duration || 0);
          break;
        case 'size':
          cmp = (b.size || 0) - (a.size || 0);
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [audio, sortField, sortDirection]);

  const currentSortLabel = SORT_OPTIONS.find((o) => o.field === sortField)?.label || 'Name';

  const navigateToFile = useCallback((file: FileItem) => {
    navigation.navigate('MusicPlayer', { file, queue: sortedAudio });
  }, [navigation, sortedAudio]);

  const renderSortModal = useMemo(() => (
    <Modal visible={showSortModal} transparent animationType="fade">
      <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSortModal(false)}>
        <View style={[styles.modalContent, { backgroundColor: '#27272a' }]}>
          <Text style={[styles.modalTitle, { color: '#ffffff' }]}>Sort by</Text>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.field}
              style={[
                styles.modalOption,
                sortField === opt.field && { backgroundColor: `${primaryColor}15` },
              ]}
              onPress={() => {
                if (sortField === opt.field) {
                  toggleDirection();
                } else {
                  setSortField(opt.field);
                  setSortDirection(opt.field === 'name' ? 'asc' : 'desc');
                }
                setShowSortModal(false);
              }}
            >
              <Text style={[
                styles.modalOptionText,
                { color: sortField === opt.field ? primaryColor : '#e4e4e7' },
                sortField === opt.field && { fontWeight: '700' },
              ]}>
                {opt.label}
              </Text>
              {sortField === opt.field && (
                sortDirection === 'asc' ? (
                  <ArrowUp size={18} color={primaryColor} />
                ) : (
                  <ArrowDown size={18} color={primaryColor} />
                )
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  ), [showSortModal, sortField, sortDirection, primaryColor, toggleDirection]);

  return (
    <View style={[styles.container, { backgroundColor: '#18181b' }]}>
      <TopBar />
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: textColor }]}>Music</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortModal(true)}>
            <FunnelSimple size={16} color={mutedColor} />
            <Text style={[styles.sortBtnText, { color: mutedColor }]}>{currentSortLabel}</Text>
            {sortDirection === 'asc' ? (
              <ArrowUp size={14} color={mutedColor} />
            ) : (
              <ArrowDown size={14} color={mutedColor} />
            )}
          </TouchableOpacity>
          <LayoutToggle mode={layoutMode} onChange={setLayoutMode} primaryColor={primaryColor} />
        </View>
      </View>
      <View key={layoutMode} style={{ flex: 1 }}>
        {layoutMode === 'list' ? (
          <FileList
            data={sortedAudio}
            onPress={navigateToFile}
            primaryColor={primaryColor}
            textColor={textColor}
            mutedColor={mutedColor}
            emptyMessage="No music found"
          />
        ) : (
          <FileGrid
            data={sortedAudio}
            onPress={navigateToFile}
            primaryColor={primaryColor}
            textColor={textColor}
            mutedColor={mutedColor}
            emptyMessage="No music found"
          />
        )}
      </View>
      {renderSortModal}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  sortBtnText: { fontSize: 11, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { borderRadius: 24, padding: 24, width: '80%', maxWidth: 320 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8 },
  modalOptionText: { fontSize: 16, fontWeight: '500' },
});