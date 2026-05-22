import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MagnifyingGlass, Gear } from 'phosphor-react-native';
import { useLanguage } from '../context/LanguageContext';

export function TopBar() {
  const navigation = useNavigation<any>();
  const { t } = useLanguage();

  return (
    <View className="flex-row items-center justify-between pt-[60] px-5 pb-4">
      <TouchableOpacity onPress={() => navigation.navigate('HomeTab')} className="flex-row items-center gap-2.5">
        <Image source={require('../assets/app.png')} className="w-[30px] h-[30px] rounded-lg" />
        <Text className="text-white text-lg font-semibold tracking-wide">{t('topbar.title')}</Text>
      </TouchableOpacity>
      <View className="flex-row items-center gap-4">
        <TouchableOpacity onPress={() => navigation.navigate('SearchTab')}>
          <MagnifyingGlass size={22} color="rgba(255, 255, 255, 0.6)" weight="bold" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('SettingsTab')}>
          <Gear size={22} color="rgba(255, 255, 255, 0.6)" weight="bold" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
