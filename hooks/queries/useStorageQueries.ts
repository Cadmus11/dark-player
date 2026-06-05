import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export function useToggleFavoriteMutation() {
  const queryClient = useQueryClient();

  return useMutation<string[], Error, string, { previous: string[] | undefined }>({
    mutationFn: (uri) => StorageService.toggleFavorite(uri),
    onMutate: async (uri) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.storage.favorites() });
      const previous = queryClient.getQueryData<string[]>(queryKeys.storage.favorites());
      if (previous) {
        const next = previous.includes(uri)
          ? previous.filter((u) => u !== uri)
          : [...previous, uri];
        queryClient.setQueryData(queryKeys.storage.favorites(), next);
      }
      return { previous };
    },
    onError: (_err, _uri, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.storage.favorites(), context.previous);
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.storage.favorites(), updated);
    },
  });
}

export function useRecentFilesQuery() {
  return useQuery<FileItem[]>({
    queryKey: queryKeys.storage.recentFiles(),
    queryFn: () => StorageService.getRecentFiles(),
    staleTime: staleTimes.storage,
  });
}

export function useAddRecentFileMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, FileItem, { previous: FileItem[] | undefined }>({
    mutationFn: (file) => StorageService.addToRecentFiles(file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.storage.recentFiles() });
    },
  });
}

export function useRecentlyPlayedQuery() {
  return useQuery<RecentlyPlayed[]>({
    queryKey: queryKeys.storage.recentlyPlayed(),
    queryFn: () => StorageService.getRecentlyPlayed(),
    staleTime: staleTimes.storage,
  });
}

export function useAddRecentlyPlayedMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, FileItem, { previous: RecentlyPlayed[] | undefined }>({
    mutationFn: (file) => StorageService.addToRecentlyPlayed(file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.storage.recentlyPlayed() });
    },
  });
}

export function useSearchHistoryQuery() {
  return useQuery<SavedSearch[]>({
    queryKey: queryKeys.storage.searchHistory(),
    queryFn: () => StorageService.getSearchHistory(),
    staleTime: staleTimes.storage,
  });
}

export function useSaveSearchMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, { previous: SavedSearch[] | undefined }>({
    mutationFn: (query) => StorageService.saveSearch(query),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.storage.searchHistory() });
    },
  });
}

export function useRemoveSearchMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, { previous: SavedSearch[] | undefined }>({
    mutationFn: (id) => StorageService.removeSearch(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.storage.searchHistory() });
    },
  });
}

export function useClearSearchHistoryMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void, { previous: SavedSearch[] | undefined }>({
    mutationFn: () => StorageService.clearSearchHistory(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.storage.searchHistory() });
      const previous = queryClient.getQueryData<SavedSearch[]>(
        queryKeys.storage.searchHistory()
      );
      queryClient.setQueryData<SavedSearch[]>(queryKeys.storage.searchHistory(), []);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.storage.searchHistory(), context.previous);
      }
    },
  });
}
