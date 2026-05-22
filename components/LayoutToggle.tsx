import React from 'react';
import { TouchableOpacity, View } from 'react-native';
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
    <View className="flex-row bg-[#27272a] rounded-[10px] p-1 gap-0.5">
      <TouchableOpacity
        onPress={() => onChange('grid')}
        className="w-8 h-8 rounded-lg justify-center items-center"
        style={isActive('grid') ? { backgroundColor: primaryColor } : undefined}
      >
        <GridFour size={18} weight="bold" color={isActive('grid') ? '#18181b' : '#a1a1aa'} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onChange('list')}
        className="w-8 h-8 rounded-lg justify-center items-center"
        style={isActive('list') ? { backgroundColor: primaryColor } : undefined}
      >
        <ListDashes size={18} weight="bold" color={isActive('list') ? '#18181b' : '#a1a1aa'} />
      </TouchableOpacity>
    </View>
  );
}
