import { useMemo } from 'react';
import { useMediaStore } from '../stores/mediaStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { FileItem } from '../types';

export function useHiddenAudio(): { hiddenFiles: FileItem[]; fullAudio: FileItem[] } {
  const audio = useMediaStore((s) => s.audio);
  const hiddenFiles = useSettingsStore((s) => s.hiddenFiles);

  return useMemo(() => {
    if (!hiddenFiles.hideShortSongs) return { hiddenFiles: [], fullAudio: audio };
    const minMs = (hiddenFiles.minDurationSeconds || 15) * 1000;
    const filtered = audio.filter((f) => f.duration !== undefined && f.duration < minMs);
    return { hiddenFiles: filtered, fullAudio: audio };
  }, [audio, hiddenFiles.hideShortSongs, hiddenFiles.minDurationSeconds]);
}
