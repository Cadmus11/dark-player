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
- `expo-av` - Audio/Video playback engine
- `expo-media-library` - Media library access
- `expo-file-system` - File system operations
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
Manages audio playback using `expo-av`.

```typescript
AudioEngine.getInstance()
  ├── play(file)             // Start or resume
  ├── pause()                // Pause playback
  ├── seek(position)         // Seek to time
  ├── next() / prev()        // Queue navigation
  ├── setRepeat(mode)        // Repeat/shuffle
  ├── setSpeed(rate)         // Playback speed
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
  ├── play(file)             // Initialize player
  ├── setSubtitles(srtUrl)   // Load SRT subtitles
  └── notifyStateChange()    // Emit to subscribers
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
  progress: number;
  audio: FileItem[];
  videos: FileItem[];
  folders: FolderItem[];
  
  // Actions
  scanMedia(): Promise<void>;
  loadCache(): Promise<void>;
  getFilteredAudio(): FileItem[];
}

// Usage
const files = useMediaStore((s) => s.audio);
```

**Subscription**: Subscribes to FileEngine updates  
**Persistence**: Via FileEngine's MMKV cache

#### playbackStore
```typescript
interface PlaybackStore {
  // State
  currentFile: FileItem | null;
  queue: FileItem[];
  position: number;
  duration: number;
  isPlaying: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
  
  // Actions
  play(file: FileItem): void;
  pause(): void;
  seek(position: number): void;
}

// Usage - Selector pattern prevents unnecessary re-renders
const { isPlaying, currentFile } = usePlaybackStore(
  (s) => ({ isPlaying: s.isPlaying, currentFile: s.currentFile })
);
```

**Subscription**: Subscribes to AudioEngine updates  
**Persistence**: Via AudioEngine's MMKV cache

#### playlistStore
Manages playlists and favorites.

**Persistence**: Saved to AsyncStorage or MMKV

#### settingsStore
Manages user preferences (theme, language, font).

**Persistence**: Persists to MMKV on every change

### 4. **Context Layer**

React Context providers for derived state and cross-cutting concerns.

#### FileContext
Aggregates data from multiple stores into derived collections.

```typescript
interface FileContextType {
  allFiles: FileItem[];
  visibleAudio: FileItem[];
  categories: Category[];
  search(query: string): void;
  toggleFavorite(fileId: string): void;
}
```

**Performance**: All computed values wrapped in `useMemo` to prevent re-computation

#### ThemeContext
Provides theming system with light/dark mode.

**Key Rule**: Never hardcode colors like `text-white`. Always use context-based colors.

#### LanguageContext
Internationalization provider.

#### FontContext
Font family management.

### 5. **Presentation Layer (Components & Screens)**

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
const { isPlaying, currentFile } = usePlaybackStore(
  (s) => ({ isPlaying: s.isPlaying, currentFile: s.currentFile })
);

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
lifecycleManager.initialize()
  ↓
startHydration()
  ↓
mediaStore.loadCache()
  ↓
FileEngine.loadFromCache() from MMKV
  ↓
If cache stale (>24h or version mismatch):
  FileEngine.scanAll() → Device APIs
  ↓
mediaStore updated → Components re-render
```

### Audio Playback Flow

```
User taps play
  ↓
playbackStore.play(file)
  ↓
AudioEngine.play(file)
  ↓
Audio.Sound created/resumed
  ↓
_onPlaybackStatusUpdate fires on each tick
  ↓
AudioEngine notifies subscribers
  ↓
playbackStore updated → UI re-renders (via selectors)
```

### Video Playback Flow

```
User taps video
  ↓
VideoPlayerScreen
  ↓
useVideoPlayer({ uri })
  ↓
VideoView renders
  ↓
User gestures (swipe-up/down) → Next/prev video
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

### 4. Lazy Loading with FlatList

```typescript
<FlatList
  data={files}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <FileListItem file={item} />}
  removeClippedSubviews={true}
  maxToRenderPerBatch={20}
  initialNumToRender={20}
/>
```

### 5. MMKV Cache Strategy

- Use versioned keys: `@MEDIA_CACHE_v1`
- Invalidate on version bump
- Keep cache under 5MB

## Error Handling

### ErrorBoundary Component

Catches React component errors:

```typescript
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### FeatureBoundary (PlayerBoundary)

Wraps player screens for graceful degradation.

### Engine Error Recovery

```typescript
async play(file: FileItem): Promise<void> {
  try {
    await this.sound.loadAsync({ uri: file.path });
    await this.sound.playAsync();
  } catch (error) {
    console.error('Playback failed:', error);
    this.notify({ error: 'Failed to play file' });
  }
}
```

## Extending the System

### Adding a New Screen

1. Create `screens/YourScreen.tsx`
2. Add type to `RootStackParamList` in `App.tsx`
3. Register route in Stack.Navigator

### Adding a New Store

1. Create `stores/yourStore.ts` using Zustand
2. Subscribe to engine updates if applicable
3. Initialize in `HydrationService.ts`
4. Export hook for use in components

### Adding a New Engine

1. Create `engines/YourEngine.ts` as singleton
2. Implement `subscribe/notify` pattern
3. Connect to Zustand store
4. Document lifecycle in `flow.md`

---

**For detailed data flow, see [`flow.md`](./flow.md)**
