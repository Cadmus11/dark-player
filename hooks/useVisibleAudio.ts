import { useMemo } from 'react';
import { useMediaStore } from '../stores/mediaStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { FileItem } from '../types';

export function useVisibleAudio(): FileItem[] {
  const audio = useMediaStore((s) => s.audio);
  const hiddenFiles = useSettingsStore((s) => s.hiddenFiles);

  return useMemo(() => {
    const minMs = (hiddenFiles.minDurationSeconds || 15) * 1000;
    return audio.filter((f) => {
      if (hiddenFiles.hideShortSongs && f.duration !== undefined && f.duration < minMs) {
        return false;
      }
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      if (hiddenFiles.hideExtensions.includes(ext)) return false;
      if (hiddenFiles.hideOpus && ext === 'opus') return false;
      return true;
    });
  }, [audio, hiddenFiles]);
}
