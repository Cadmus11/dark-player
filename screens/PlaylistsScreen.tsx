import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Image as RNImage,
  Alert,
  Platform,
} from 'react-native';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { Plus, MusicNote } from 'phosphor-react-native';
import { usePlaylistStore } from '../stores/playlistStore';
import { useExpandedPlaylists } from '../hooks/useDomainSelectors';
import { useTheme } from '../context/ThemeContext';
import { ScreenLayout } from '../components/ScreenLayout';
import { GlassIcon } from '../components/GlassIcon';
import type { Playlist } from '../types';

export const PlaylistsScreen = React.memo(function PlaylistsScreen() {
  const navigation = useAppNavigation();
  const playlists = useExpandedPlaylists();
  const playlistStore = usePlaylistStore();
  const { textColor, mutedColor, primaryColor, isDarkMode, borderColor, cardBg } = useTheme();
  const [showPlaylistInput, setShowPlaylistInput] = useState(false);
  const [playlistInput, setPlaylistInput] = useState('');

  const handleCreatePlaylist = () => {
    setPlaylistInput(`Playlist ${playlists.length + 1}`);
    setShowPlaylistInput(true);
  };

  const handlePlaylistCreateConfirm = async () => {
    if (playlistInput.trim()) {
      await playlistStore.create(playlistInput.trim());
    }
    setShowPlaylistInput(false);
    setPlaylistInput('');
  };

  const handlePlaylistLongPress = (playlist: Playlist) => {
    Alert.alert(playlist.name, undefined, [
      {
        text: 'Rename',
        onPress: () => {
          if (Platform.OS === 'ios') {
            Alert.prompt(
              'Rename Playlist',
              'Enter new name',
              async (name) => {
                if (name?.trim()) playlistStore.rename(playlist.id, name.trim());
              },
              'plain-text',
              playlist.name
            );
          } else {
            playlistStore.rename(playlist.id, `${playlist.name} (edited)`);
          }
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          playlistStore.delete(playlist.id);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <ScreenLayout>
      <View className="mb-3 flex-row items-center justify-between px-4">
        <Text className="text-lg font-bold tracking-[0.5]" style={{ color: textColor }}>
          Playlists
        </Text>
        <TouchableOpacity onPress={handleCreatePlaylist}>
          <GlassIcon size={32}>
            <Plus size={16} color={primaryColor} weight="bold" />
          </GlassIcon>
        </TouchableOpacity>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}>
        {playlists.length > 0 ? (
          <View className="flex-row flex-wrap gap-3">
            {playlists.map((playlist) => (
              <TouchableOpacity
                key={playlist.id}
                className="w-[calc(50%-6px)] items-center rounded-[28px] p-4 shadow-lg"
                style={{
                  borderWidth: 1,
                  borderColor: borderColor,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                }}
                onPress={() => navigation.navigate('MusicTab')}
                onLongPress={() => handlePlaylistLongPress(playlist)}>
                {playlist.coverUri ? (
                  <RNImage
                    source={{ uri: playlist.coverUri }}
                    className="mb-2.5 h-[120px] w-[120px] rounded-xl"
                  />
                ) : (
                  <View
                    className="mb-2.5 h-[120px] w-[120px] items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${primaryColor}15` }}>
                    <MusicNote size={32} color={primaryColor} weight="bold" />
                  </View>
                )}
                <Text
                  className="mb-0.5 text-center text-sm font-semibold"
                  style={{ color: textColor }}
                  numberOfLines={1}>
                  {playlist.name}
                </Text>
                <Text className="text-[11px]" style={{ color: mutedColor }}>
                  {playlist.files.length} tracks
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <TouchableOpacity
            className="mt-10 items-center rounded-[28px] p-8"
            style={{
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: borderColor,
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            }}
            onPress={handleCreatePlaylist}>
            <GlassIcon size={48}>
              <Plus size={24} color={primaryColor} weight="bold" />
            </GlassIcon>
            <Text className="mt-2 text-sm" style={{ color: mutedColor }}>
              Create your first playlist
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Playlist Name Input Modal */}
      <Modal visible={showPlaylistInput} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/70">
          <View
            className="w-[85%] max-w-[360px] rounded-[28px] p-6"
            style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: borderColor }}>
            <Text className="mb-4 text-center text-lg font-extrabold" style={{ color: textColor }}>
              New Playlist
            </Text>
            <TextInput
              className="mb-5 rounded-xl px-4 py-3"
              style={{
                color: textColor,
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderWidth: 1,
                borderColor: borderColor,
              }}
              placeholder="Playlist name"
              placeholderTextColor={mutedColor}
              value={playlistInput}
              onChangeText={setPlaylistInput}
              autoFocus
              selectTextOnFocus
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 items-center rounded-xl py-3"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                }}
                onPress={() => {
                  setShowPlaylistInput(false);
                  setPlaylistInput('');
                }}>
                <Text className="text-sm font-semibold" style={{ color: mutedColor }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-xl py-3"
                style={{ backgroundColor: primaryColor }}
                onPress={handlePlaylistCreateConfirm}>
                <Text className="text-sm font-bold" style={{ color: '#18181b' }}>
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
});
