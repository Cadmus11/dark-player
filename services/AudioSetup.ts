import { Audio } from 'expo-av';

let isInitialized = false;

export async function setupAudioSession(): Promise<boolean> {
  if (isInitialized) return true;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
    isInitialized = true;
    return true;
  } catch {
    return false;
  }
}
