import React, { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createPersistedQueryClient, queryPersister } from '../../services/queryClient';
import type { ReactNode } from 'react';

export const staleTimes = {
  media: 5 * 60 * 1000,
  metadata: 24 * 60 * 1000,
  artwork: 24 * 60 * 1000,
  playlists: 5 * 60 * 1000,
  storage: 5 * 60 * 1000,
};

let _queryClient: ReturnType<typeof createPersistedQueryClient> | null = null;

export function getQueryClient() {
  if (!_queryClient) {
    _queryClient = createPersistedQueryClient();
  }
  return _queryClient;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [qc] = useState(() => getQueryClient());

  useEffect(() => {
    persistQueryClient({
      queryClient: qc,
      persister: queryPersister,
      maxAge: 24 * 60 * 60 * 1000,
    });
  }, [qc]);

  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
