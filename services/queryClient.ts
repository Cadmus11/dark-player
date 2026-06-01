import { MMKV } from 'react-native-mmkv';
import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const storage = new MMKV({ id: 'tanstack-query' });

export const mmkvStorage = {
  getItem: (key: string): string | null => storage.getString(key) ?? null,
  setItem: (key: string, value: string): void => storage.set(key, value),
  removeItem: (key: string): void => storage.delete(key),
};

export const queryPersister = createSyncStoragePersister({
  storage: mmkvStorage,
  key: 'TANSTACK_QUERY_CACHE',
  throttleTime: 1000,
});

let _queryClient: QueryClient | null = null;

export function createPersistedQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
      },
    },
  });
}

export function getPersistedQueryClient(): QueryClient {
  if (!_queryClient) {
    _queryClient = createPersistedQueryClient();
  }
  return _queryClient;
}
