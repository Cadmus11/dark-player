import { Platform } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import type { FileItem } from '../types';

let soundRef: Audio.Sound | null = null;
let currentFile: FileItem | null = null;
let onNextCallback: (() => void) | null = null;
let onPrevCallback: (() => void) | null = null;
let onToggleCallback: ((playing: boolean) => void) | null = null;
let isPlaying = false;

export async function setupAudioMode() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    staysActiveInBackground: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

export function setCallbacks(opts: {
  onNext?: () => void;
  onPrev?: () => void;
  onToggle?: (playing: boolean) => void;
}) {
  if (opts.onNext) onNextCallback = opts.onNext;
  if (opts.onPrev) onPrevCallback = opts.onPrev;
  if (opts.onToggle) onToggleCallback = opts.onToggle;
}

export function setSoundRef(sound: Audio.Sound | null) {
  soundRef = sound;
}

export function setCurrentMedia(file: FileItem | null) {
  currentFile = file;
}

export function setPlaying(playing: boolean) {
  isPlaying = playing;
}

export function getCurrentFile() {
  return currentFile;
}

export function getIsPlaying() {
  return isPlaying;
}
