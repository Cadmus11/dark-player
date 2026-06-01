import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, FileItem, PrivateFileEntry } from '../types';
import { CaretLeft, Lock, LockOpen, Trash, Folder, Fingerprint } from 'phosphor-react-native';
import { PrivateFolderService } from '../services/PrivateFolderService';
import { useTheme } from '../context/ThemeContext';
import { ScreenLayout } from '../components/ScreenLayout';
import { FileIcon } from '../components/FileIcon';
import { fileEngine } from '../engine/FileEngine';

type PrivateFolderProps = NativeStackScreenProps<RootStackParamList, 'PrivateFolder'>;

export function PrivateFolderScreen({ navigation }: PrivateFolderProps) {
  const { textColor, mutedColor, primaryColor, borderColor, isDarkMode } = useTheme();
  const [entries, setEntries] = useState<PrivateFileEntry[]>([]);
  const [unlocked, setUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(true);
  const [canUseBio, setCanUseBio] = useState(false);

  useEffect(() => {
    (async () => {
      const exists = await PrivateFolderService.isSetup();
      if (!exists) {
        setLoading(false);
        return;
      }
      const hasPin = await PrivateFolderService.hasPasscode();
      if (!hasPin) {
        setUnlocked(true);
      }
      const bioAvailable = await PrivateFolderService.canUseBiometrics();
      setCanUseBio(bioAvailable);
      const bioEnabled = await PrivateFolderService.isBiometricsEnabled();
      if (bioAvailable && bioEnabled) {
        const authed = await PrivateFolderService.authenticateBiometrics();
        if (authed) {
          setUnlocked(true);
        }
      }
      const files = await PrivateFolderService.getPrivateFiles();
      setEntries(files);
      setLoading(false);
    })();
  }, []);

  const handleUnlock = useCallback(async () => {
    const valid = await PrivateFolderService.verifyPasscode(passcode);
    if (valid) {
      setUnlocked(true);
      setPasscode('');
    } else {
      setPasscode('');
      Alert.alert('Error', 'Incorrect passcode.');
    }
  }, [passcode]);

  const handleBioUnlock = useCallback(async () => {
    const authed = await PrivateFolderService.authenticateBiometrics();
    if (authed) {
      setUnlocked(true);
    }
  }, []);

  const handleRemove = useCallback(async (uri: string) => {
    await PrivateFolderService.removeFile(uri);
    setEntries((prev) => prev.filter((e) => e.uri !== uri));
  }, []);

  const handlePlay = useCallback(
    async (entry: PrivateFileEntry) => {
      const file: FileItem = {
        uri: entry.uri,
        name: entry.name,
        type: PrivateFolderService.inferType(entry.name),
        artColor: fileEngine.getArtColor(entry.name),
      };
      if (file.type === 'video') {
        navigation.navigate('VideoPlayer', { file });
      } else {
        navigation.navigate('MusicPlayer', { file });
      }
    },
    [navigation]
  );

  const renderItem = ({ item }: { item: PrivateFileEntry }) => (
    <TouchableOpacity
      className="flex-row items-center justify-between py-3"
      style={{
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      }}
      onPress={() => handlePlay(item)}>
      <View className="flex-1 flex-row items-center">
        <View className="mr-3 h-11 w-11 items-center justify-center rounded-xl bg-white/10">
          <FileIcon type={PrivateFolderService.inferType(item.name)} size={22} />
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-[15px]" style={{ color: textColor }} numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-xs" style={{ color: mutedColor }}>
            Added {new Date(item.addedAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        className="rounded-lg px-3 py-1.5"
        style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}
        onPress={() => {
          Alert.alert('Remove File', `Remove "${item.name}" from private folder?`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: () => handleRemove(item.uri),
            },
          ]);
        }}>
        <Trash size={14} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <ScreenLayout noTopBar>
      <View className="flex-row items-center justify-between px-5 pb-5 pt-[60]">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2.5">
          <CaretLeft size={24} color={textColor} />
        </TouchableOpacity>
        <Text className="text-xl font-semibold" style={{ color: textColor }}>
          Private Folder
        </Text>
        <View className="w-10" />
      </View>

      {loading ? null : !unlocked ? (
        <View className="flex-1 items-center justify-center px-8">
          <Lock size={48} color={mutedColor} />
          <Text className="mb-6 mt-4 text-center text-base" style={{ color: mutedColor }}>
            Enter passcode to access private folder
          </Text>
          <View className="w-full max-w-[240] flex-row gap-2">
            <View
              className="flex-1 rounded-xl border px-4 py-3"
              style={{ borderColor, backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5' }}>
              <TextInput
                className="text-center text-lg tracking-[8]"
                style={{ color: textColor }}
                placeholder="· · · ·"
                placeholderTextColor={mutedColor}
                secureTextEntry
                keyboardType="number-pad"
                maxLength={6}
                value={passcode}
                onChangeText={(t) => {
                  setPasscode(t);
                  if (t.length === 6) {
                    PrivateFolderService.verifyPasscode(t).then((valid) => {
                      if (valid) {
                        setUnlocked(true);
                        setPasscode('');
                      } else {
                        setPasscode('');
                        Alert.alert('Error', 'Incorrect passcode.');
                      }
                    });
                  }
                }}
              />
            </View>
            <TouchableOpacity
              className="items-center justify-center rounded-xl px-5"
              style={{ backgroundColor: primaryColor }}
              onPress={handleUnlock}>
              <LockOpen size={20} color={isDarkMode ? '#06060B' : '#ffffff'} />
            </TouchableOpacity>
          </View>
          {canUseBio && (
            <TouchableOpacity
              className="mt-4 flex-row items-center gap-2 rounded-xl px-5 py-2.5"
              style={{ backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5' }}
              onPress={handleBioUnlock}>
              <Fingerprint size={18} color={primaryColor} />
              <Text className="text-sm font-semibold" style={{ color: primaryColor }}>
                Unlock with Biometrics
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : entries.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Folder size={64} color={mutedColor} />
          <Text className="mt-4 text-base" style={{ color: mutedColor }}>
            No files in private folder
          </Text>
          <Text className="mt-1 text-sm" style={{ color: mutedColor }}>
            Move files from your library to keep them private
          </Text>
        </View>
      ) : (
        <FlashList
          data={entries}
          renderItem={renderItem}
          keyExtractor={(item: PrivateFileEntry) => item.uri}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenLayout>
  );
}
