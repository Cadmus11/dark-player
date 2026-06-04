import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MagnifyingGlass, Gear, FunnelSimple, CaretDown } from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { Navbar } from './Navbar';
import { hapticLight } from '../utils/haptics';

interface TopBarProps {
  onSortPress?: () => void;
  sortLabel?: string;
}

export function TopBar({ onSortPress, sortLabel }: TopBarProps) {
  const navigation = useAppNavigation();
  const { primaryColor, textColor } = useTheme();

  return (
    <View>
      <View className="flex-row items-center justify-between px-5 pb-2 pt-3">
        <TouchableOpacity onPress={() => navigation.navigate('MusicTab')}>
          <Text
            style={{
              fontFamily: 'Poppins',
              fontSize: 24,
              color: textColor,
            }}>
            Lumora
          </Text>
        </TouchableOpacity>
        <View className="flex-row items-center gap-4">
          {onSortPress && (
            <TouchableOpacity onPress={() => { hapticLight(); onSortPress(); }} className="flex-row items-center gap-1"
              accessibilityLabel={`Sort by ${sortLabel || 'current'}`}
              accessibilityRole="button">
              <FunnelSimple size={18} color={primaryColor} weight="bold" />
              {sortLabel && (
                <Text className="text-[11px] font-semibold" style={{ color: primaryColor }}>
                  {sortLabel}
                </Text>
              )}
              <CaretDown size={10} color={primaryColor} weight="bold" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => { hapticLight(); navigation.navigate('SearchTab'); }}
            accessibilityLabel="Search"
            accessibilityRole="button">
            <MagnifyingGlass size={20} color={textColor} weight="bold" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { hapticLight(); navigation.navigate('SettingsTab'); }}
            accessibilityLabel="Settings"
            accessibilityRole="button">
            <Gear size={20} color={textColor} weight="bold" />
          </TouchableOpacity>
        </View>
      </View>
      <Navbar />
    </View>
  );
}
