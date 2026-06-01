import { create } from 'zustand';
import { equalizerEngine } from '../engine/EqualizerEngine';
import type { EqualizerSettings, EQPreset } from '../types';

interface EqualizerStoreState {
  gains: number[];
  preset: string;
  enabled: boolean;
  presets: EQPreset[];
  bands: { frequency: number; label: string }[];

  setBandGain: (index: number, gain: number) => void;
  resetToFlat: () => void;
  applyPreset: (name: string) => void;
  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  getSettings: () => EqualizerSettings;
}

export const useEqualizerStore = create<EqualizerStoreState>((set, get) => {
  const settings = equalizerEngine.getSettings();
  const presets = equalizerEngine.getPresets();
  const bands = equalizerEngine.getBands();

  return {
    gains: settings.gains,
    preset: settings.preset,
    enabled: settings.enabled,
    presets,
    bands,

    setBandGain: (index: number, gain: number) => {
      equalizerEngine.setBandGain(index, gain);
      const s = equalizerEngine.getSettings();
      set({ gains: s.gains, preset: s.preset });
    },

    resetToFlat: () => {
      equalizerEngine.resetToFlat();
      const s = equalizerEngine.getSettings();
      set({ gains: s.gains, preset: s.preset, enabled: s.enabled });
    },

    applyPreset: (name: string) => {
      equalizerEngine.applyPreset(name);
      const s = equalizerEngine.getSettings();
      set({ gains: s.gains, preset: s.preset });
    },

    setEnabled: (enabled: boolean) => {
      equalizerEngine.setEnabled(enabled);
      set({ enabled });
    },

    toggleEnabled: () => {
      const next = !get().enabled;
      equalizerEngine.setEnabled(next);
      set({ enabled: next });
    },

    getSettings: () => equalizerEngine.getSettings(),
  };
});
