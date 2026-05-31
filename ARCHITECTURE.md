# Dark Player Architecture Guide

This document provides an in-depth overview of the Dark Player architecture, design patterns, and how to extend the system.

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Layers](#core-layers)
3. [Engine Pattern](#engine-pattern)
4. [State Management](#state-management)
5. [Data Flow](#data-flow)
6. [Performance Optimization](#performance-optimization)
7. [Error Handling](#error-handling)
8. [Extending the System](#extending-the-system)

## System Overview

Dark Player uses a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                     │
│              (React Components & Navigation)                │
├─────────────────────────────────────────────────────────────┤
│                      STATE MANAGEMENT LAYER                 │
│         (Zustand Stores + React Context Providers)          │
├─────────────────────────────────────────────────────────────┤
│                      ENGINE LAYER (SINGLETONS)              │
│            (Device API Wrappers + MMKV Persistence)         │
├─────────────────────────────────────────────────────────────┤
│                    PLATFORM LAYER                           │
│      (Expo APIs: expo-av, expo-media-library, MMKV)         │
└─────────────────────────────────────────────────────────────┘
```

## Core Layers

### 1. **Platform Layer**

Direct interfaces to device capabilities:

- `expo-audio` - Audio playback
- `expo-video` - Video playback
- `expo-media-library` - Media library access
- `expo-file-system/legacy` - File system operations
- `react-native-mmkv` - High-performance key-value storage
- `expo-notifications` - Push notifications

### 2. **Engine Layer (Singletons)**

Engines own all platform API access and emit state changes via observer pattern.

#### FileEngine

Responsible for discovering and caching media files.

```typescript
FileEngine.getInstance()
  ├── scanAll()              // Scans device media
  ├── loadFromCache()        // Loads from MMKV
  ├── shouldRescan()         // 24h timeout or version check
  └── subscribe(listener)    // Notifies on changes
```

**Cache Strategy**:

- Stores scan results in MMKV as JSON
- Cache key: `@MEDIA_CACHE_v1`
- Invalidates if > 24 hours old or version mismatch
- Falls back to FileSystem API for missing data

#### AudioEngine

Manages audio playback using `expo-audio`.

```typescript
AudioEngine.getInstance()
  ├── playFile(file)         // Start or resume
  ├── pause()                // Pause playback
  ├── resume()               // Resume playback
  ├── togglePlay()           // Play/pause toggle
  ├── seekTo(position)       // Seek to time
  ├── skipToNext() / skipToPrevious()  // Queue navigation
  ├── setRepeat(mode)        // Repeat/shuffle
  ├── setSpeed(rate)         // Playback speed
  ├── stop()                 // Stop and release player
  └── subscribe(listener)    // State updates on every tick
```

**State Persistence**:

- Current position, repeat mode, shuffle state saved to MMKV
- Restored on app restart
- Fires `_onPlaybackStatusUpdate` callback for fine-grained state changes

#### VideoEngine

Manages video playback (ephemeral, no persistence).

```typescript
VideoEngine.getInstance()
  ├── loadFile(file)         // Initialize player
  ├── play()                 // Start/resume
  ├── pause()                // Pause
  ├── togglePlayback()       // Play/pause toggle
  ├── seekTo(percentage)     // Seek to percentage
  ├── skip(seconds)          // Skip forward/backward
  ├── stop()                 // Release player (mutual exclusion with AudioEngine)
  ├── setRate(rate)          // Playback speed
  ├── setContentFit(mode)    // contain/cover/fill
  ├── setSubtitlesEnabled(enabled)
  ├── toggleSubtitles()
  ├── setFullscreen(bool)
  ├── getState()             // Snapshot of current state
  └── subscribe(listener)
```

**Note**: Video state is ephemeral and doesn't persist across app restarts.

#### QueueEngine

Manages the playback queue and shuffle/repeat logic.

```typescript
QueueEngine.getInstance()
  ├── buildQueue(files, startIndex)
  ├── nextInQueue()
  ├── previousInQueue()
  └── updateQueue(files)
```

### 3. **State Management Layer (Zustand Stores)**

Thin wrappers around engines that subscribe to their state updates.

#### mediaStore

```typescript
interface MediaStore {
  // State
  loading: boolean;
  scanProgress: number;
  scanStage: string;
  permissionsGranted: boolean;
  error: string | null;
  hydrationStage: number;
  audio: FileItem[];
  videos: FileItem[];

  // Actions
  scanMedia(): Promise<void>;
  loadCache(): void;
  getFilteredAudio(settings: HiddenFilesSettings): FileItem[];
  getHiddenAudio(settings: HiddenFilesSettings): FileItem[];
}

// Usage
const audio = useMediaStore((s) => s.audio);
```

**Subscription**: Subscribes to FileEngine updates + ARTWORK_LOADED event  
**Persistence**: Via FileEngine's MMKV cache

#### playbackStore

```typescript
interface PlaybackStore {
  // State
  currentFile: FileItem | null;
  isPlaying: boolean;
  source: 'none' | 'music' | 'video';
  position: number;
  duration: number;
  progress: number;
  queue: FileItem[];
  currentIndex: number;
  shuffle: boolean;
  repeat: 'none' | 'all' | 'one';
  playbackSpeed: number;

  // Actions
  play(file?: FileItem, queue?: FileItem[], startIndex?: number): void;
  playIndex(index: number): void;
  pause(): void;
  resume(): void;
  togglePlay(): void;
  stop(): void;
  seekTo(millis: number): void;
  next(): void;
  previous(): void;
  setRate(rate: number): void;
  setRepeat(mode: RepeatMode): void;
  cycleRepeat(): void;
  toggleShuffle(): void;
  setQueue(queue: FileItem[], startIndex?: number): void;
  moveInQueue(fromIndex: number, toIndex: number): void;
}

// Usage - Selector pattern prevents unnecessary re-renders
const { isPlaying, currentFile } = usePlaybackStore((s) => ({
  isPlaying: s.isPlaying,
  currentFile: s.currentFile,
}));
```

**Subscription**: Subscribes to AudioEngine updates  
**Persistence**: Via AudioEngine's MMKV cache

#### playlistStore

Manages playlists and favorites.

**Persistence**: Saved to AsyncStorage or MMKV

#### videoPlaybackStore

Thin wrapper around VideoEngine, mirrors all video playback state into React.

```typescript
interface VideoPlaybackStore {
  currentFile: FileItem | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  playbackSpeed: number;
  contentFit: 'contain' | 'cover' | 'fill';
  subtitlesEnabled: boolean;
  subtitles: SubtitleEntry[];
  currentSubtitle: string;
  isFullscreen: boolean;
  isReady: boolean;
  error: string | null;

  loadFile(file: FileItem): Promise<void>;
  togglePlayback(): void;
  seekTo(percentage: number): void;
  skip(seconds: number): void;
  setRate(rate: number): void;
  setContentFit(mode: 'contain' | 'cover' | 'fill'): void;
  toggleSubtitles(): void;
  setFullscreen(fullscreen: boolean): void;
  next(): void;
  previous(): void;
  reset(): void;
}
```

**Subscription**: Subscribes to VideoEngine updates  
**Persistence**: Ephemeral (no MMKV) — state resets on app restart

#### settingsStore

Manages user preferences (theme, language, font, background blur, notification toggles).

**Persistence**: Persists to MMKV on every change

### 4. **Context Layer**

React Context providers for derived state and cross-cutting concerns.

#### ThemeContext

Provides theming system with light/dark mode, accent colors, gradient backgrounds, size modes (small/medium/big), and 15 bundled preset images.

**Key Rule**: Never hardcode colors like `text-white`. Always use context-based colors (`textColor`, `mutedColor`, `borderColor`, `cardBg`).

#### LanguageContext

Internationalization provider.

#### FontContext

Font family management.

### 5. **Domain Hooks Layer**

Custom hooks that aggregate data from multiple Zustand stores into derived collections, replacing the former FileContext.

```
├── useDomainSelectors      - useCategories, useAllFiles, useFileCounts, useExpandedPlaylists
├── useFavorites            - Favorite files management
├── useVisibleAudio         - Filtered audio (excludes <15s songs by default)
├── useHiddenAudio          - Short songs hidden by default
```

All computed values wrapped in `useMemo` to prevent re-computation. Screens prefer direct store selectors for individual fields (performance), and domain hooks for aggregate collections.

### 6. **Presentation Layer (Components & Screens)**

React components that consume store state and context.

**Screens** - Page-level components representing navigation destinations  
**Components** - Reusable UI components wrapped with `React.memo` where appropriate

## Engine Pattern

### Design Pattern

The Engine pattern provides a singleton facade over platform APIs:

```typescript
class MyEngine {
  private static instance: MyEngine | null = null;
  private listeners = new Set<(state: State) => void>();

  static getInstance(): MyEngine {
    if (!MyEngine.instance) {
      MyEngine.instance = new MyEngine();
    }
    return MyEngine.instance;
  }

  subscribe(listener: (state: State) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(state: State): void {
    this.listeners.forEach((l) => l(state));
  }

  async doSomething(): Promise<void> {
    // Implementation
    this.notify(newState);
  }
}
```

### Benefits

1. **Single Responsibility** - Each engine owns one platform concern
2. **Testability** - Mock engines easily in tests
3. **Lifecycle Management** - Control initialization and cleanup
4. **State Persistence** - Engines manage their own MMKV caching
5. **Performance** - Only notify listeners of relevant changes

## State Management

### Store Selection Pattern

Always use **selectors** to prevent unnecessary re-renders:

```typescript
// ✅ Good - Only selectedFields trigger re-render
const { isPlaying, currentFile } = usePlaybackStore((s) => ({
  isPlaying: s.isPlaying,
  currentFile: s.currentFile,
}));

// ❌ Bad - All store changes trigger re-render
const store = usePlaybackStore();
```

### Subscription Pattern

Zustand stores subscribe to engines:

```typescript
const unsubscribe = AudioEngine.getInstance().subscribe((audioState) => {
  set({
    currentFile: audioState.currentFile,
    isPlaying: audioState.isPlaying,
  });
});
```

## Data Flow

### File Loading Flow

```
App Start
  ↓
HydrationService
  ↓
mediaStore.loadCache()
  ↓
FileEngine.loadFromCache() from MMKV
  ↓
If cache stale (>24h or version mismatch):
  FileEngine.scanAll() → Device APIs (expo-media-library)
    → MetadataService extracts embedded artwork & metadata
    → Stores results in SQLite (DatabaseService) + artwork files on disk
  ↓
mediaStore updated → Components re-render via selectors
```

### Audio Playback Flow

```
User taps play
  ↓
playbackStore.play(file, queue, index)
  ↓
AudioEngine.playFile(file)
  ↓
expo-audio AudioPlayer created/resumed
  ↓
MetadataService.extract(uri) reads ID3 tags via music-metadata-browser
  ├── Extracts artwork → saves to cache directory
  ├── Extracts lyrics (embedded, LRC sidecar, or LRCLib API)
  └── Emits ARTWORK_LOADED → mediaStore updates FileItem.thumbnail
  ↓
_onPlaybackStatusUpdate fires on each tick
  ↓
AudioEngine notifies subscribers
  ↓
playbackStore updated → UI re-renders (via selectors)
  ↓
NowPlayingNotification updates lockscreen metadata + notification buttons
NotificationService tracks scan completion status
```

### Video Playback Flow

```
User taps video
  ↓
VideoPlayerScreen
  ↓
videoPlaybackStore.loadFile(file) → VideoEngine.loadFile(file)
  ↓
expo-video useVideoPlayer + VideoView
  ↓
MetadataService.extract(uri) for embedded metadata
  ↓
Subtitles loaded (SRT parsing via VideoEnhancementService)
  ↓
VideoEngine subscribes → videoPlaybackStore updated
  ↓
User gestures (swipe-up/down) → Next/prev video
Permanent MiniPlayer (above tab bar when source === 'video')
```

## Performance Optimization

### 1. Component Memoization

```typescript
const AudioFileItem = React.memo(({ file, onPlay }: Props) => (
  <TouchableOpacity onPress={onPlay}>
    <Text>{file.title}</Text>
  </TouchableOpacity>
));
```

### 2. Zustand Selectors

```typescript
// Only selectedFields trigger re-render
const { title, artist } = useMediaStore((s) => ({
  title: s.currentFile?.title,
  artist: s.currentFile?.artist,
}));
```

### 3. useMemo for Derived State

```typescript
const visibleAudio = useMemo(
  () => getFilteredAudio(allFiles, hiddenFiles),
  [allFiles, hiddenFiles]
);
```

### 4. Lazy Loading with FlashList

```typescript
<FlashList
  data={files}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <FileListItem file={item} />}
  estimatedItemSize={80}  // v2 auto-measures, optional hint
/>
```

**Note**: `@shopify/flash-list` v2 replaces `FlatList` for all long lists (FileList, MusicScreen, SearchScreen, FolderScreen, CategoryScreen). `FileGrid` keeps `FlatList` because FlashList v2 doesn't support `numColumns`.

### 5. MMKV Cache Strategy

- Use versioned keys: `@MEDIA_CACHE_v1`
- Invalidate on version bump
- Keep cache under 5MB

## Error Handling

### Cancellation Pattern

Long-running operations (scans, async tasks) use `Cancellation` service with tokens:

```typescript
const token = taskManager.createScope('media-scan');
// Check cancellation periodically
if (isCancelled(e)) return;
```

### Engine Try/Catch Recovery

Engines wrap all platform API calls in try/catch and fall back gracefully.

### LifecycleManager

Initializes services in order (permissions → storage → hydration) with timeouts.

## Services Overview

Key services living in `services/`:

| Service                 | Purpose                                                                         |
| ----------------------- | ------------------------------------------------------------------------------- |
| MetadataService         | ID3 tag parsing, artwork extraction (music-metadata-browser + expo-file-system) |
| LyricsService           | LRC parser, LRCLib API fetcher, MMKV cache                                      |
| NotificationService     | Scan-complete/failed system notifications                                       |
| NowPlayingNotification  | Lockscreen metadata + notification buttons (prev/play-pause/next)               |
| PrivateFolderService    | Passcode-protected private file storage                                         |
| ArtworkService          | Album art management                                                            |
| DatabaseService         | SQLite cache for media metadata                                                 |
| EventBus                | Typed event emitter (ARTWORK_LOADED, SCAN_COMPLETED, etc.)                      |
| PermissionService       | Media library permission requests                                               |
| HistoryService          | Playback history with MMKV cache                                                |
| SearchService           | Full-text search over file names                                                |
| SortService             | File sorting utilities                                                          |
| VideoEnhancementService | SRT subtitle parsing                                                            |
| OverlaySystem           | Bottom sheet overlay management                                                 |
| MemoryManager           | Memory pressure handling                                                        |
| Cancellation            | Task cancellation tokens                                                        |

## Extending the System

### Adding a New Screen

1. Create `screens/YourScreen.tsx`
2. Add type to `RootStackParamList` in `App.tsx`
3. Register route in Stack.Navigator

### Adding a New Store

1. Create `stores/yourStore.ts` using Zustand
2. Subscribe to engine updates if applicable
3. Initialize in `HydrationService.ts`
4. Export hook (`useYourStore`) for use in components
5. Register in domain hooks (`hooks/`) if aggregate selectors needed

### Adding a New Engine

1. Create `engines/YourEngine.ts` as singleton
2. Implement `subscribe/notify` pattern
3. Connect to Zustand store
4. Document lifecycle in `flow.md`

---

**For detailed data flow, see [`flow.md`](./flow.md)**
