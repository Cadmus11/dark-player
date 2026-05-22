import { setAudioModeAsync } from 'expo-audio';

let isInitialized = false;

export async function setupAudioSession(): Promise<boolean> {
  if (isInitialized) return true;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
    isInitialized = true;
    return true;
  } catch {
    return false;
  }
}
