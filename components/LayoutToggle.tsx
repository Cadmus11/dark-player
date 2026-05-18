import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { GridFour, ListDashes } from 'phosphor-react-native';
import type { LayoutMode } from '../types';

interface LayoutToggleProps {
  mode: LayoutMode;
  onChange: (mode: LayoutMode) => void;
  primaryColor?: string;
}

export default function LayoutToggle({ mode, onChange, primaryColor = '#C2FC4A' }: LayoutToggleProps) {
  const isActive = (m: LayoutMode) => m === mode;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => onChange('grid')}
        style={[styles.btn, isActive('grid') && { backgroundColor: primaryColor }]}
      >
        <GridFour size={18} weight="bold" color={isActive('grid') ? '#18181b' : '#a1a1aa'} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onChange('list')}
        style={[styles.btn, isActive('list') && { backgroundColor: primaryColor }]}
      >
        <ListDashes size={18} weight="bold" color={isActive('list') ? '#18181b' : '#a1a1aa'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', backgroundColor: '#27272a', borderRadius: 10, padding: 4, gap: 2 },
  btn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
});
