import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);

// Lazy-load TrackPlayer to avoid ESM resolution issues during startup
setTimeout(() => {
  try {
    const TrackPlayer = require('react-native-track-player').default || require('react-native-track-player');
    if (TrackPlayer) {
      TrackPlayer.registerPlaybackService(() => require('./services/PlaybackService'));
    }
  } catch (e) {
    console.warn('Failed to register TrackPlayer playback service:', e);
  }
}, 0);
