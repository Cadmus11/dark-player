import { useMemo } from 'react';
import { useMediaStore } from '../stores/mediaStore';
import { usePlaylistStore } from '../stores/playlistStore';
import { useVisibleAudio } from './useVisibleAudio';
import {
  useFavoritesQuery,
  useRecentFilesQuery,
  useRecentlyPlayedQuery,
  useSearchHistoryQuery,
} from './queries/useStorageQueries';
import { usePlaylistsQuery } from './queries/usePlaylistQuery';
import type {
  FileItem,
  Category,
  Playlist,
  PlaylistData,
  RecentlyPlayed,
  SavedSearch,
} from '../types';

export function useCategories(): Category[] {
  const videos = useMediaStore((s) => s.videos);
  const audio = useVisibleAudio();

  return useMemo(
    () => [
      {
        id: 'videos',
        name: 'Videos',
        icon: 'videos',
        type: 'video',
        count: videos.length,
        color: '#6c5ce7',
      },
      {
        id: 'music',
        name: 'Music',
        icon: 'music',
        type: 'audio',
        count: audio.length,
        color: '#00cec9',
      },
    ],
    [videos.length, audio.length]
  );
}

export function useAllFiles(): FileItem[] {
  const videos = useMediaStore((s) => s.videos);
  const audio = useMediaStore((s) => s.audio);
  return useMemo(() => [...videos, ...audio], [videos, audio]);
}

export function useFileCounts(): { videos: number; audio: number; total: number } {
  const videos = useMediaStore((s) => s.videos);
  const audio = useMediaStore((s) => s.audio);
  return useMemo(
    () => ({
      videos: videos.length,
      audio: audio.length,
      total: videos.length + audio.length,
    }),
    [videos.length, audio.length]
  );
}

export function useExpandedPlaylists(): Playlist[] {
  const allFiles = useAllFiles();
  const { data: playlists } = usePlaylistsQuery();

  return useMemo(
    () =>
      (playlists ?? []).map((p: PlaylistData) => ({
        id: p.id,
        name: p.name,
        files: allFiles.filter((f) => p.songIds.includes(f.uri)),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        coverUri: p.artwork,
      })),
    [playlists, allFiles]
  );
}

export function usePlaylistById(id: string): Playlist | undefined {
  const allFiles = useAllFiles();
  const playlists = usePlaylistStore((s) => s.playlists);

  return useMemo(() => {
    const p = playlists.find((pl) => pl.id === id);
    if (!p) return undefined;
    return {
      id: p.id,
      name: p.name,
      files: allFiles.filter((f) => p.songIds.includes(f.uri)),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      coverUri: p.artwork,
    };
  }, [id, playlists, allFiles]);
}

export function useFavoriteFiles(): FileItem[] {
  const allFiles = useAllFiles();
  const { data: favoriteUris = [] } = useFavoritesQuery();

  return useMemo(
    () => allFiles.filter((f) => favoriteUris.includes(f.uri)),
    [allFiles, favoriteUris]
  );
}

export function useRecentFiles(): FileItem[] {
  const allFiles = useAllFiles();
  const { data: recentFiles = [] } = useRecentFilesQuery();

  return useMemo(
    () => recentFiles.filter((f) => allFiles.some((af) => af.uri === f.uri)),
    [recentFiles, allFiles]
  );
}

export function useRecentlyPlayed(): RecentlyPlayed[] {
  const { data: recentlyPlayed = [] } = useRecentlyPlayedQuery();
  return recentlyPlayed;
}

export function useSearchHistory(): SavedSearch[] {
  const { data: searchHistory = [] } = useSearchHistoryQuery();
  return searchHistory;
}
