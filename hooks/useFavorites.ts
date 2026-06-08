import { useCallback, useMemo, useEffect } from 'react';
import { useFavoritesStore } from '../stores/favoritesStore';
import type { FileItem } from '../types';

export function useFavorites(allFiles: FileItem[]) {
  const favoriteUris = useFavoritesStore((s) => s.favoriteUris);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const loaded = useFavoritesStore((s) => s.loaded);

  useEffect(() => {
    if (!loaded) {
      useFavoritesStore.getState().load();
    }
  }, [loaded]);

  const isFavorite = useCallback((uri: string) => favoriteUris.includes(uri), [favoriteUris]);

  const favoriteFiles = useMemo(
    () => allFiles.filter((f) => favoriteUris.includes(f.uri)),
    [allFiles, favoriteUris]
  );

  return {
    favoriteUris,
    favoriteFiles,
    isFavorite,
    toggleFavorite,
    isToggling: false,
  };
}
