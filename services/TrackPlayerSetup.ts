import TrackPlayer, { Capability, RatingType } from 'react-native-track-player';

let isInitialized = false;

export async function setupTrackPlayer(): Promise<boolean> {
  if (isInitialized) return true;
  try {
    await TrackPlayer.setupPlayer({
      waitForBuffer: true,
    });
    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
      ],
    });
    isInitialized = true;
    return true;
  } catch {
    return false;
  }
}

export async function addTracks(tracks: {
  id: string;
  url: string;
  title: string;
  artist?: string;
  album?: string;
  artwork?: string;
  duration?: number;
}[]) {
  await TrackPlayer.add(tracks);
}

export async function playTrack(trackId: string) {
  await TrackPlayer.skip(trackId);
  await TrackPlayer.play();
}

export async function clearQueue() {
  await TrackPlayer.reset();
}

export async function getTrackPlayerState() {
  const state = await TrackPlayer.getPlaybackState();
  const track = await TrackPlayer.getActiveTrack();
  const position = await TrackPlayer.getProgress();
  return { state, track, position };
}

export { TrackPlayer };
