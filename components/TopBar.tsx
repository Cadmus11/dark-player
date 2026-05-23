import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MagnifyingGlass, Gear } from 'phosphor-react-native';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export function TopBar() {
  const navigation = useNavigation<any>();
  const { t } = useLanguage();
  const { textColor } = useTheme();

  return (
    <View className="flex-row items-center justify-between pt-[60] px-5 pb-4">
      <TouchableOpacity onPress={() => navigation.navigate('HomeTab')}>
        <Text className="text-lg font-semibold tracking-wide" style={{ color: textColor }}>{t('topbar.title')}</Text>
      </TouchableOpacity>
      <View className="flex-row items-center gap-4">
        <TouchableOpacity onPress={() => navigation.navigate('SearchTab')}>
          <MagnifyingGlass size={22} color={textColor} weight="bold" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('SettingsTab')}>
          <Gear size={22} color={textColor} weight="bold" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
