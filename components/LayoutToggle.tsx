import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { GridFour, ListDashes } from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import type { LayoutMode } from '../types';
import { hapticSelection } from '../utils/haptics';

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
        onPress={() => {
          hapticSelection();
          onChange('grid');
        }}
        className="h-11 w-11 items-center justify-center rounded-lg"
        style={isActive('grid') ? { backgroundColor: pc } : undefined}
        accessibilityLabel="Grid view"
        accessibilityRole="radio"
        accessibilityState={{ checked: isActive('grid') }}>
        <GridFour
          size={18}
          weight="bold"
          color={isActive('grid') ? (isDarkMode ? '#18181b' : '#ffffff') : mutedColor}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          hapticSelection();
          onChange('list');
        }}
        className="h-11 w-11 items-center justify-center rounded-lg"
        style={isActive('list') ? { backgroundColor: pc } : undefined}
        accessibilityLabel="List view"
        accessibilityRole="radio"
        accessibilityState={{ checked: isActive('list') }}>
        <ListDashes
          size={18}
          weight="bold"
          color={isActive('list') ? (isDarkMode ? '#18181b' : '#ffffff') : mutedColor}
        />
      </TouchableOpacity>
    </View>
  );
}
