import { useState, useEffect } from 'react';
import { MetadataService } from '../services/Metadata/MetadataService';
import { mediaRepository } from '../services/MediaRepository';
import { metadataQueue } from '../services/MetadataQueue';
import { eventBus, AppEvents } from '../services/EventBus';
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
        const cached = mediaRepository.getMetadata(uri) || MetadataService.getCached(uri);
        if (!cancelled) {
          if (cached) {
            setMetadata(cached);
            setLoading(false);
          } else {
            metadataQueue.enqueueCritical({ uri, name: fileName } as any);
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

    const unsubscribe = eventBus.on(
      AppEvents.METADATA_PARSED,
      (parsedUri: string, meta: MediaMetadata) => {
        if (parsedUri === uri && !cancelled) {
          setMetadata(meta);
          setLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uri, fileName]);

  return { data: metadata, loading };
}
