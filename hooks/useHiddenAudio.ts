import { useMemo } from 'react';
import { useMediaStore } from '../stores/mediaStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { FileItem } from '../types';

export function useHiddenAudio(): { hiddenFiles: FileItem[]; fullAudio: FileItem[] } {
  const audio = useMediaStore((s) => s.audio);
  const hiddenFiles = useSettingsStore((s) => s.hiddenFiles);

  return useMemo(() => {
    const isHidden = (f: FileItem) => {
      const minMs = (hiddenFiles.minDurationSeconds || 15) * 1000;
      if (hiddenFiles.hideShortSongs && f.duration !== undefined && f.duration < minMs) return true;
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      if (hiddenFiles.hideExtensions.includes(ext)) return true;
      if (hiddenFiles.hideOpus && ext === 'opus') return true;
      return false;
    };
    return { hiddenFiles: audio.filter(isHidden), fullAudio: audio };
  }, [audio, hiddenFiles]);
}
