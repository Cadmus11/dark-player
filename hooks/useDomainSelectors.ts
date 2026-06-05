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
import type {
  FileItem,
  Category,
  Playlist,
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

function useFilesByUri(): Map<string, FileItem> {
  const allFiles = useAllFiles();
  return useMemo(() => {
    const map = new Map<string, FileItem>();
    for (const f of allFiles) map.set(f.uri, f);
    return map;
  }, [allFiles]);
}

export function useExpandedPlaylists(): Playlist[] {
  const filesByUri = useFilesByUri();
  const playlists = usePlaylistStore((s) => s.playlists);

  return useMemo(
    () =>
      playlists.map((p) => {
        const files = p.songIds.map((uri) => filesByUri.get(uri)).filter(Boolean) as FileItem[];
        return {
          id: p.id,
          name: p.name,
          files,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          coverUri: files[0]?.thumbnail || p.artwork,
        };
      }),
    [playlists, filesByUri]
  );
}

export function usePlaylistById(id: string): Playlist | undefined {
  const filesByUri = useFilesByUri();
  const playlists = usePlaylistStore((s) => s.playlists);

  return useMemo(() => {
    const p = playlists.find((pl) => pl.id === id);
    if (!p) return undefined;
    const files = p.songIds.map((uri) => filesByUri.get(uri)).filter(Boolean) as FileItem[];
    return {
      id: p.id,
      name: p.name,
      files,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      coverUri: files[0]?.thumbnail || p.artwork,
    };
  }, [id, playlists, filesByUri]);
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

  return useMemo(() => {
    const uriSet = new Set<string>();
    for (const f of allFiles) uriSet.add(f.uri);
    return recentFiles.filter((f) => uriSet.has(f.uri));
  }, [recentFiles, allFiles]);
}

export function useRecentlyPlayed(): RecentlyPlayed[] {
  const { data: recentlyPlayed = [] } = useRecentlyPlayedQuery();
  return recentlyPlayed;
}

export function useSearchHistory(): SavedSearch[] {
  const { data: searchHistory = [] } = useSearchHistoryQuery();
  return searchHistory;
}
