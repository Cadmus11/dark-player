# Media Player Issues & Improvements

This document outlines identified issues and feature improvements for the Dark Player.

## 🔴 Critical Issues

### 1. Memory Leak in AudioEngine
**Problem**: Audio playback may not properly clean up resources  
**Impact**: Long-term app usage causes memory pressure  
**Solution**: Implement proper cleanup in unmount/dispose

```typescript
// Issue location: engines/AudioEngine.ts
// Fix: Add unload() call on cleanup

useEffect(() => {
  return () => {
    AudioEngine.getInstance().unload();
  };
}, []);
```

### 2. Queue Desynchronization
**Problem**: Playback queue can become out of sync with current file  
**Impact**: Skip/next buttons may not work correctly  
**Solution**: Add queue validation and sync checks

```typescript
// Proposed fix
async validateQueue(currentIndex: number): Promise<void> {
  if (currentIndex >= this.queue.length) {
    this.position = 0;
    this.queue = await QueueEngine.getInstance().buildQueue(
      this.currentFile ? [this.currentFile] : []
    );
    this.notify();
  }
}
```

### 3. Subtitle Sync Issues (Video Player)
**Problem**: SRT subtitles may drift out of sync during playback  
**Impact**: Subtitles show at wrong times  
**Solution**: Implement timestamp validation with +/- tolerance

```typescript
// Proposed fix in VideoPlayerScreen
const SUBTITLE_TOLERANCE_MS = 100;

function shouldShowSubtitle(currentTime: number, subtitleTime: number): boolean {
  return Math.abs(currentTime - subtitleTime) <= SUBTITLE_TOLERANCE_MS;
}
```

### 4. Audio Focus Not Managed
**Problem**: Audio continues playing when system needs focus  
**Impact**: App doesn't respect phone calls, alarms, etc.  
**Solution**: Implement audio focus listener

```typescript
// Proposed implementation
class AudioFocusManager {
  private static focused = true;
  
  static requestFocus(): boolean {
    // Request audio focus from system
    // Pause other apps
    return true;
  }
  
  static releaseFocus(): void {
    // Release audio focus
    AudioEngine.getInstance().pause();
  }
}
```

---

## 🟡 High-Priority Issues

### 5. Seek Position Clamping
**Problem**: Seeking beyond duration can crash or hang  
**Impact**: User attempts to seek past song end  
**Solution**: Validate and clamp seek positions

```typescript
// Fix in AudioEngine
async seek(position: number): Promise<void> {
  const clamped = Math.max(0, Math.min(position, this.duration));
  await this.sound.setPositionAsync(clamped);
}
```

### 6. Playback Resume Bug
**Problem**: App may not resume from correct position on restart  
**Impact**: Users lose their place in songs  
**Solution**: Store position more frequently

```typescript
// In AudioEngine._onPlaybackStatusUpdate
if (status.isLoaded && !status.isBuffering) {
  // Update position every second instead of on change
  if (Date.now() - lastSaveTime > 1000) {
    this.persistState();
    lastSaveTime = Date.now();
  }
}
```

### 7. Video Scrubbing Performance
**Problem**: Dragging progress bar causes frame drops  
**Impact**: Janky seek experience  
**Solution**: Debounce seek updates during dragging

```typescript
const [isSeeking, setIsSeeking] = useState(false);

const handleSeekComplete = useCallback(
  debounce((value: number) => {
    videoPlayer.seekBy(value);
    setIsSeeking(false);
  }, 300),
  []
);
```

### 8. Missing Error Recovery
**Problem**: Playback errors don't fallback gracefully  
**Impact**: App becomes unresponsive  
**Solution**: Add error boundary with retry logic

```typescript
async play(file: FileItem): Promise<void> {
  let retries = 0;
  const MAX_RETRIES = 3;
  
  while (retries < MAX_RETRIES) {
    try {
      await this.sound.loadAsync({ uri: file.path });
      await this.sound.playAsync();
      return;
    } catch (error) {
      retries++;
      if (retries >= MAX_RETRIES) {
        this.notify({ error: 'Failed to play file after 3 attempts' });
        throw error;
      }
      await delay(500);
    }
  }
}
```

---

## 🟠 Medium-Priority Issues

### 9. Loudness Normalization Missing
**Problem**: Different files have vastly different volumes  
**Impact**: User must adjust volume between songs  
**Solution**: Implement ReplayGain or volume normalization

```typescript
interface PlaybackStore {
  volumeNormalization: boolean;
  targetLoudness: number; // -14 LUFS (Spotify standard)
  
  async applyLoudnessNormalization(file: FileItem): Promise<void> {
    // Calculate gain and apply
  }
}
```

### 10. Large File Handling
**Problem**: Very large video files may buffer poorly  
**Impact**: Videos stutter or don't play  
**Solution**: Implement adaptive bitrate or streaming

```typescript
// Add to VideoEngine
interface VideoOptions {
  preferredBitrate?: number; // kbps
  bufferSize?: number; // MB
  maxBuffer?: number;
}

async play(file: FileItem, options?: VideoOptions): Promise<void> {
  const uri = await this.selectBestBitrate(file, options);
  // Use HTTP Range requests for better buffering
}
```

### 11. Missing Now Playing Metadata
**Problem**: Lock screen doesn't show current song info  
**Impact**: Poor native integration  
**Solution**: Use expo-system-ui or react-native-track-player

```typescript
// Proposed: Add NowPlayingMetadata
interface NowPlayingMetadata {
  title: string;
  artist: string;
  album: string;
  artwork: string;
  duration: number;
  position: number;
}

function updateNowPlaying(metadata: NowPlayingMetadata): void {
  // Update system media controls
}
```

### 12. Repeat/Shuffle UI Lag
**Problem**: UI lag when toggling repeat/shuffle on large queues  
**Impact**: Buttons feel unresponsive  
**Solution**: Memoize queue operations

```typescript
const setRepeat = useCallback((mode: RepeatMode) => {
  playbackStore.setState({ repeatMode: mode });
  // Don't rebuild entire queue
}, []);
```

---

## ✨ Feature Enhancements

### 13. Equalizer Support
**Description**: Add 5-band or 10-band equalizer  
**Impact**: Users can customize audio to their preference  
**Implementation**: Use audio nodes or EQ middleware

```typescript
interface EqualizerBand {
  frequency: number; // Hz
  gain: number; // dB (-12 to +12)
}

class EqualizerEngine {
  static async applyEQ(bands: EqualizerBand[]): Promise<void> {
    // Apply using Web Audio API or native EQ
  }
}
```

### 14. Gapless Playback
**Description**: Eliminate silence between tracks  
**Impact**: Better for continuous albums (Pink Floyd, etc.)  
**Implementation**: Pre-buffer next track

```typescript
async prepareNextTrack(): Promise<void> {
  if (this.queue[this.currentIndex + 1]) {
    const nextFile = this.queue[this.currentIndex + 1];
    // Pre-load to memory (don't play yet)
    this.nextSound = new Audio.Sound();
    await this.nextSound.loadAsync({ uri: nextFile.path });
  }
}
```

### 15. Crossfade Between Tracks
**Description**: Add crossfade when switching tracks  
**Impact**: Smoother listening experience  
**Implementation**: Fade out current + fade in next

```typescript
async crossfadeToNext(duration: number = 2000): Promise<void> {
  const fadeOutStart = this.duration - (duration / 1000);
  
  await Animated.parallel([
    Animated.timing(currentVolume, {
      toValue: 0,
      duration,
      useNativeDriver: false,
    }),
    Animated.timing(nextVolume, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    }),
  ]).start();
}
```

### 16. Scrobbling Support (Last.fm)
**Description**: Send play history to Last.fm  
**Impact**: Tracks listening history, recommendations  
**Implementation**: HTTP API calls to Last.fm

```typescript
interface ScrobblingService {
  scrobbleTrack(file: FileItem, timestamp: number): Promise<void>;
  updateNowPlaying(file: FileItem): Promise<void>;
  getUserLovedTracks(): Promise<FileItem[]>;
}
```

### 17. Bookmarks/Resume Points
**Description**: Allow users to mark positions in long tracks  
**Impact**: Easier podcast/audiobook navigation  
**Implementation**: Store bookmark array with timestamps

```typescript
interface Bookmark {
  fileId: string;
  timestamp: number;
  label: string;
  createdAt: Date;
}

interface PlaylistStore {
  bookmarks: Bookmark[];
  addBookmark(fileId: string, timestamp: number, label: string): void;
  jumpToBookmark(bookmarkId: string): void;
}
```

### 18. Variable Speed Playback
**Description**: Play at 0.5x to 2x speed  
**Impact**: Faster consumption of podcasts/audiobooks  
**Status**: May be partially implemented

```typescript
// Ensure proper persistence
interface PlaybackStore {
  playbackSpeed: number; // 0.5 to 2.0
  
  setPlaybackSpeed(speed: number): Promise<void> {
    await AudioEngine.getInstance().setSpeed(speed);
    MMKV.setNumber('playbackSpeed', speed);
  }
}
```

### 19. Sleep Timer
**Description**: Auto-stop playback after X minutes  
**Impact**: Battery saving, automated stop for sleeping users  
**Implementation**: setTimeout with callback

```typescript
class SleepTimerManager {
  private timer: NodeJS.Timeout | null = null;
  
  setSleepTimer(minutes: number): void {
    this.cancel();
    this.timer = setTimeout(() => {
      AudioEngine.getInstance().pause();
    }, minutes * 60 * 1000);
  }
  
  cancel(): void {
    if (this.timer) clearTimeout(this.timer);
  }
}
```

### 20. Playlist Export/Import
**Description**: Export playlists as M3U, PLS, or JSON  
**Impact**: Users can share and backup playlists  
**Implementation**: File export service

```typescript
interface PlaylistExportService {
  exportToM3U(playlist: Playlist): string;
  exportToJSON(playlist: Playlist): string;
  importFromM3U(content: string): Promise<Playlist>;
}
```

---

## 🔧 Code Quality Improvements

### 21. Add Unit Tests
- Test AudioEngine state transitions
- Test queue operations with edge cases
- Test subtitle parsing and sync

### 22. Error Logging
- Implement Sentry or similar for error tracking
- Log playback failures with context

### 23. Performance Monitoring
- Add performance metrics for seek time
- Monitor memory usage during long playback

### 24. Accessibility Improvements
- Add screen reader support for player controls
- Implement keyboard navigation
- High contrast mode support

---

## 📋 Implementation Roadmap

### Phase 1 (Critical Fixes)
- [ ] Fix memory leak in AudioEngine
- [ ] Fix queue desynchronization
- [ ] Implement audio focus management
- [ ] Add seek position clamping

### Phase 2 (High Priority)
- [ ] Improve playback resume
- [ ] Add error recovery with retry
- [ ] Fix video scrubbing performance
- [ ] Add subtitle sync tolerance

### Phase 3 (Medium Priority)
- [ ] Implement volume normalization
- [ ] Add large file handling
- [ ] Implement now playing metadata
- [ ] Fix repeat/shuffle lag

### Phase 4 (Features)
- [ ] Equalizer support
- [ ] Gapless playback
- [ ] Crossfading
- [ ] Sleep timer
- [ ] Bookmarks/resume points
- [ ] Scrobbling

### Phase 5 (Advanced)
- [ ] Playlist export/import
- [ ] Unit tests
- [ ] Performance monitoring
- [ ] Accessibility improvements

---

## 📝 Notes

- All fixes should include unit tests where applicable
- Performance improvements should be benchmarked
- New features should be toggleable in settings
- Document breaking changes in CHANGELOG
- Get community feedback before major features
