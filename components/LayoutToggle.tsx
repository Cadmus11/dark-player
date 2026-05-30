import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { GridFour, ListDashes } from 'phosphor-react-native';
import type { LayoutMode } from '../types';

interface LayoutToggleProps {
  mode: LayoutMode;
  onChange: (mode: LayoutMode) => void;
  primaryColor?: string;
}

export default function LayoutToggle({
  mode,
  onChange,
  primaryColor = '#C2FC4A',
}: LayoutToggleProps) {
  const isActive = (m: LayoutMode) => m === mode;

  return (
    <View className="flex-row gap-0.5 rounded-[10px] bg-[#27272a] p-1">
      <TouchableOpacity
        onPress={() => onChange('grid')}
        className="h-8 w-8 items-center justify-center rounded-lg"
        style={isActive('grid') ? { backgroundColor: primaryColor } : undefined}>
        <GridFour size={18} weight="bold" color={isActive('grid') ? '#18181b' : '#a1a1aa'} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onChange('list')}
        className="h-8 w-8 items-center justify-center rounded-lg"
        style={isActive('list') ? { backgroundColor: primaryColor } : undefined}>
        <ListDashes size={18} weight="bold" color={isActive('list') ? '#18181b' : '#a1a1aa'} />
      </TouchableOpacity>
    </View>
  );
}
