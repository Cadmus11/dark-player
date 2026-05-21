import { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/StorageService';
import type { FileItem } from '../types';

export function useFavorites(allFiles: FileItem[]) {
  const [favoriteUris, setFavoriteUris] = useState<string[]>([]);

  useEffect(() => {
    StorageService.getFavorites().then(setFavoriteUris);
  }, []);

  const toggleFavorite = useCallback(async (uri: string) => {
    const updated = await StorageService.toggleFavorite(uri);
    setFavoriteUris(updated);
    return updated;
  }, []);

  const isFavorite = useCallback((uri: string) => favoriteUris.includes(uri), [favoriteUris]);

  const favoriteFiles = allFiles.filter((f) => favoriteUris.includes(f.uri));

  return { favoriteUris, favoriteFiles, toggleFavorite, isFavorite };
}
