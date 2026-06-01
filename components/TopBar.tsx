import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { MagnifyingGlass, Gear, FunnelSimple } from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { Navbar } from './Navbar';

interface TopBarProps {
  onSortPress?: () => void;
  sortLabel?: string;
}

export function TopBar({ onSortPress, sortLabel }: TopBarProps) {
  const navigation = useNavigation<any>();
  const { primaryColor, textColor, mutedColor } = useTheme();

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
            <TouchableOpacity onPress={onSortPress}>
              <FunnelSimple size={20} color={primaryColor} weight="bold" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => navigation.navigate('SearchTab')}>
            <MagnifyingGlass size={20} color={textColor} weight="bold" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('SettingsTab')}>
            <Gear size={20} color={textColor} weight="bold" />
          </TouchableOpacity>
        </View>
      </View>
      <Navbar />
    </View>
  );
}
