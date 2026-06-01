export const queryKeys = {
  media: {
    all: ['media'] as const,
    videos: () => [...queryKeys.media.all, 'videos'] as const,
    audio: () => [...queryKeys.media.all, 'audio'] as const,
  },
  metadata: {
    all: ['metadata'] as const,
    byUri: (uri: string) => [...queryKeys.metadata.all, uri] as const,
  },
  artwork: {
    all: ['artwork'] as const,
    byUri: (uri: string) => [...queryKeys.artwork.all, uri] as const,
  },
  playlists: {
    all: ['playlists'] as const,
  },
  search: {
    all: ['search'] as const,
    query: (q: string) => [...queryKeys.search.all, q] as const,
  },
  storage: {
    all: ['storage'] as const,
    favorites: () => [...queryKeys.storage.all, 'favorites'] as const,
    recentFiles: () => [...queryKeys.storage.all, 'recentFiles'] as const,
    recentlyPlayed: () => [...queryKeys.storage.all, 'recentlyPlayed'] as const,
    searchHistory: () => [...queryKeys.storage.all, 'searchHistory'] as const,
  },
};
