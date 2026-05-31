import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { GridFour, ListDashes } from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import type { LayoutMode } from '../types';

interface LayoutToggleProps {
  mode: LayoutMode;
  onChange: (mode: LayoutMode) => void;
  primaryColor?: string;
}

export default function LayoutToggle({ mode, onChange, primaryColor }: LayoutToggleProps) {
  const { primaryColor: themePrimary, isDarkMode, mutedColor } = useTheme();
  const pc = primaryColor || themePrimary;
  const isActive = (m: LayoutMode) => m === mode;

  return (
    <View
      className="flex-row gap-0.5 rounded-[10px] p-1"
      style={{ backgroundColor: isDarkMode ? '#27272a' : '#e4e4e7' }}>
      <TouchableOpacity
        onPress={() => onChange('grid')}
        className="h-8 w-8 items-center justify-center rounded-lg"
        style={isActive('grid') ? { backgroundColor: pc } : undefined}>
        <GridFour
          size={18}
          weight="bold"
          color={isActive('grid') ? (isDarkMode ? '#18181b' : '#ffffff') : mutedColor}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onChange('list')}
        className="h-8 w-8 items-center justify-center rounded-lg"
        style={isActive('list') ? { backgroundColor: pc } : undefined}>
        <ListDashes
          size={18}
          weight="bold"
          color={isActive('list') ? (isDarkMode ? '#18181b' : '#ffffff') : mutedColor}
        />
      </TouchableOpacity>
    </View>
  );
}
