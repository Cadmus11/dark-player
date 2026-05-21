import { useMemo } from 'react';
import { useMediaStore } from '../stores/mediaStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { FileItem } from '../types';

export function useVisibleAudio(): FileItem[] {
  const audio = useMediaStore((s) => s.audio);
  const hiddenFiles = useSettingsStore((s) => s.hiddenFiles);

  return useMemo(() => {
    if (!hiddenFiles.hideShortSongs) return audio;
    const minMs = (hiddenFiles.minDurationSeconds || 15) * 1000;
    return audio.filter((f) => {
      if (f.duration === undefined) return true;
      return f.duration >= minMs;
    });
  }, [audio, hiddenFiles.hideShortSongs, hiddenFiles.minDurationSeconds]);
}
