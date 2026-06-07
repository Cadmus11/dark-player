import { useState, useEffect } from 'react';
import { MetadataService } from '../services/Metadata/MetadataService';
import type { MediaMetadata } from '../types';

export function useMetadata(uri: string, fileName: string) {
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uri) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const cached = await MetadataService.getCached(uri);
        if (!cancelled) {
          if (cached) {
            setMetadata(cached);
            setLoading(false);
          } else {
            const extracted = await MetadataService.extract(uri, fileName);
            if (!cancelled) {
              setMetadata(extracted);
              setLoading(false);
            }
          }
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uri, fileName]);

  return { data: metadata, loading };
}
