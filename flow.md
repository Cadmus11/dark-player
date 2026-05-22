# Lumora — Data & Control Flow

## 1. File Loading Flow

```
Device Media Library / File System (expo-media-library, expo-file-system)
  |
  v
FileEngine (singleton, MMKV cache)
  - scanAll() reads from device APIs, caches results as JSON in MMKV
  - loadFromCache() reads MMKV for instant offline startup
  - ShouldRescan() triggers full scan if >24h stale or CACHE_VERSION mismatch
  |
  v
mediaStore (Zustand)
  - scanMedia() calls FileEngine.scanAll(), sets loading/progress/result arrays
  - loadCache() calls FileEngine.loadFromCache() on startup
  - getFilteredAudio() applies hidden-files filter (<15s songs excluded by default)
  |
  v
FileContext (React context)
  - Reads mediaStore, playlistStore, settingsStore
  - Derives: visibleAudio, allFiles, categories, docCategories, playlists,
    favoriteFiles, recentlyPlayed, searchHistory (all via useMemo)
  - On mount: loads settings, playlists, cache; triggers scan if needed
  |
  v
Screens & Components
  - useFiles() hook from FileContext for file data/actions
  - useMediaStore(selector) for direct store reads (minimal re-renders)
```

## 2. Playback Flow

### Audio

```
useAudioPlayback() hook / user tap
  |
  v
playbackStore.play(file) -> AudioEngine.play(file)
  |
  v
AudioEngine (expo-av Audio.Sound singleton)
  - Creates/resumes Audio.Sound, manages queue, repeat, shuffle, speed
  - _onPlaybackStatusUpdate fires on every tick
  - Persists state to MMKV
  - subscribe(notify) pattern pushes state changes
  |
  v
playbackStore (Zustand, subscribed to AudioEngine)
  - State: currentFile, queue, position, duration, isPlaying, repeat, shuffle
  - Delegates play/pause/seek/next/prev to AudioEngine
  |
  v
Components
  - NowPlayingBar (persistent above tab bar when source==='music')
  - MusicPlayerScreen (full player with controls, queue, lyrics)
```

### Video

```
User taps video file -> VideoPlayerScreen
  |
  v
VideoPlayerScreen (no store wrapper, uses VideoEngine directly)
  - Creates <Video ref={videoRef}> and passes to VideoEngine.attachVideoRef()
  - VideoEngine handles load, play/pause, subtitle polling, fullscreen
  - Play modes (loop, loopAll, shuffle, pauseAfter) managed locally
  - HistoryService.record() on track end
  |
  v
MiniPlayer (persistent above tab bar when source==='video')
```

## 3. Navigation Structure

```
App.tsx
  NavigationContainer
    Stack.Navigator (no header, transparent cards)
      MainTabs (BottomTabNavigator, custom BottomTabBar)
      | -- HomeTab       -> HomeScreen
      | -- MusicTab      -> MusicScreen
      | -- VideosTab     -> VideosScreen
      | -- DocumentsTab  -> DocumentsScreen
      | -- SearchTab     -> SearchScreen
      | -- SettingsTab   -> SettingsScreen
      |
      | -- (modal) Category       -> CategoryScreen
      | -- (modal) VideoPlayer    -> VideoPlayerScreen
      | -- (modal) MusicPlayer    -> MusicPlayerScreen
      | -- (modal) ImageViewer    -> ImageViewerScreen
      | -- (modal) DocumentViewer -> DocumentViewerScreen
      | -- (modal) DocumentReader -> DocumentReaderScreen
      | -- (modal) Profile        -> ProfileScreen
      |
      Permanent overlays (inside MainTabs):
        - NowPlayingBar (audio, above tab bar)
        - MiniPlayer (video, above tab bar)
```

## 4. State Management Flow

```
  ENGINES (singletons, MMKV persistence)
  ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌────────────┐
  │FileEngine│ │AudioEngine│ │VideoEngine │ │QueueEngine │
  │(MMKV)    │ │(MMKV)     │ │(ephemeral) │ │(MMKV)      │
  └────┬─────┘ └─────┬─────┘ └─────┬──────┘ └──────┬─────┘
       │ subscribe   │ subscribe   │               │ subscribe
       v             v             v               v
  ┌─────────────────────────────────────────────────────────┐
  │  ZUSTAND STORES (thin wrappers synced via subscriptions) │
  │  mediaStore  playbackStore  (no store)  playlistStore    │
  │  settingsStore                              profileStore │
  └─────────┬───────────────────────────────────────┬───────┘
            │                                       │
            v                                       v
  ┌─────────────────────────────────────────────────────────┐
  │  CONTEXT PROVIDERS                                      │
  │  FileContext   ThemeContext   LanguageContext  FontCtx  │
  └─────────────────────────┬───────────────────────────────┘
                            │
                            v
  SCREENS & COMPONENTS (selectors for perf)
```

## Key Flow Patterns

- **Engines** own all device APIs (expo-av, expo-media-library, MMKV) and emit state via subscribe/notify
- **Zustand stores** subscribe to engines and bridge state into React
- **FileContext** aggregates multiple stores into derived collections (avoid re-computation in screens)
- **Screens** prefer direct store selectors over FileContext when reading individual fields (performance)
- **VideoPlayerScreen** is the exception — reads VideoEngine directly without a store wrapper
- **Settings** persist to MMKV via settingsStore and load on every app start
