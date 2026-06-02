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
import { Plus, MusicNote, Queue } from 'phosphor-react-native';
import { usePlaylistStore } from '../stores/playlistStore';
import { useExpandedPlaylists } from '../hooks/useDomainSelectors';
import { useTheme } from '../context/ThemeContext';
import { ScreenLayout } from '../components/ScreenLayout';
import { ThemedText } from '../components/ThemedText';
import { EmptyState } from '../components/EmptyState';
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

  const cardBgColor = isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
  const cardBorder = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  return (
    <ScreenLayout>
      <View className="mb-3 flex-row items-center justify-between px-4">
        <ThemedText variant="h2">Playlists</ThemedText>
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
                className="w-[calc(50%-6px)] items-center shadow-lg"
                style={{
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  backgroundColor: cardBgColor,
                  paddingVertical: 20,
                  paddingHorizontal: 12,
                }}
                onPress={() => navigation.navigate('MusicTab')}
                onLongPress={() => handlePlaylistLongPress(playlist)}>
                {playlist.coverUri ? (
                  <View
                    style={{
                      shadowColor: primaryColor,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 12,
                      elevation: 6,
                      borderRadius: 16,
                    }}>
                    <RNImage
                      source={{ uri: playlist.coverUri }}
                      className="mb-3 h-[120px] w-[120px]"
                      style={{ borderRadius: 16 }}
                    />
                  </View>
                ) : (
                  <View
                    className="mb-3 h-[120px] w-[120px] items-center justify-center"
                    style={{
                      borderRadius: 16,
                      backgroundColor: `${primaryColor}10`,
                      borderWidth: 1,
                      borderColor: `${primaryColor}20`,
                    }}>
                    <Queue size={36} color={primaryColor} weight="thin" />
                  </View>
                )}
                <ThemedText
                  variant="body"
                  style={{ textAlign: 'center', fontWeight: '600' }}
                  numberOfLines={1}>
                  {playlist.name}
                </ThemedText>
                <ThemedText variant="caption" style={{ marginTop: 2 }}>
                  {playlist.files.length} tracks
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <EmptyState
            icon={<Queue size={32} color={primaryColor} weight="thin" />}
            title="No playlists yet"
            description="Create your first playlist to organize your music"
            actionLabel="Create Playlist"
            onAction={handleCreatePlaylist}
          />
        )}
      </ScrollView>

      <Modal visible={showPlaylistInput} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/70">
          <View
            className="w-[85%] max-w-[360px] rounded-[28px] p-6"
            style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: borderColor }}>
            <ThemedText variant="h3" style={{ textAlign: 'center', marginBottom: 16 }}>
              New Playlist
            </ThemedText>
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
