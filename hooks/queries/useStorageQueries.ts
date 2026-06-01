import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { StorageService } from '../../services/StorageService';
import { staleTimes } from './QueryProvider';
import type { FileItem, RecentlyPlayed, SavedSearch } from '../../types';

export function useFavoritesQuery() {
  return useQuery<string[]>({
    queryKey: queryKeys.storage.favorites(),
    queryFn: () => StorageService.getFavorites(),
    staleTime: staleTimes.storage,
  });
}

export function useRecentFilesQuery() {
  return useQuery<FileItem[]>({
    queryKey: queryKeys.storage.recentFiles(),
    queryFn: () => StorageService.getRecentFiles(),
    staleTime: staleTimes.storage,
  });
}

export function useRecentlyPlayedQuery() {
  return useQuery<RecentlyPlayed[]>({
    queryKey: queryKeys.storage.recentlyPlayed(),
    queryFn: () => StorageService.getRecentlyPlayed(),
    staleTime: staleTimes.storage,
  });
}

export function useSearchHistoryQuery() {
  return useQuery<SavedSearch[]>({
    queryKey: queryKeys.storage.searchHistory(),
    queryFn: () => StorageService.getSearchHistory(),
    staleTime: staleTimes.storage,
  });
}
