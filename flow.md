# Lumora — Data & Control Flow

## 1. File Loading Flow

```
Device Media Library / File System (expo-media-library, expo-file-system/legacy)
  |
  v
FileEngine (singleton, MMKV cache)
  - scanAll() reads from device APIs, caches results as JSON in MMKV
  - loadFromCache() reads MMKV for instant offline startup
  - ShouldRescan() triggers full scan if >24h stale or CACHE_VERSION mismatch
  - Falls back to FileSystem.getInfoAsync() when asset.fileSize is null
  |
  v
mediaStore (Zustand)
  - scanMedia() calls FileEngine.scanAll(), sets loading/progress/result arrays
  - loadCache() calls FileEngine.loadFromCache() on startup, sets permissionsGranted: true
  - getFilteredAudio() applies hidden-files filter (<15s songs excluded by default)
  |
  v
Domain Hooks (useDomainSelectors, useVisibleAudio, useFavorites)
  - Read mediaStore, playlistStore, settingsStore directly
  - Derive: visibleAudio, allFiles, categories, fileCounts (all via useMemo)
  - loadCache / scan / etc. called from HydrationService on app start
  |
  v
Screens & Components (React.memo wrapped)
  - use domain hooks for aggregate collections
  - use direct store selectors for individual fields (minimal re-renders)
  - e.g. useMediaStore((s) => s.audio) for file listings
```

## 2. Playback Flow

### Audio

```
User tap on file / autoplay next
  |
  v
playbackStore.play(file, queue, index) -> AudioEngine.playFile(file)
  |
  v
AudioEngine (expo-audio AudioPlayer singleton)
  - Creates AudioPlayer, manages queue, repeat, shuffle, speed
  - _onPlaybackStatusUpdate fires on every tick
  - Persists state to MMKV
  - subscribe(notify) pattern pushes state changes
  - Parallel playback guard: sets _busy flag, calls videoEngine.stop()
  |
  v
MetadataService.extract(uri) (runs in parallel)
  ├── Reads ID3 tags via music-metadata-browser (base64 via expo-file-system)
  ├── Saves artwork to cache dir, emits ARTWORK_LOADED
  ├── Extracts lyrics (embedded → LRC sidecar → LRCLib API)
  └── Caches result in SQLite (DatabaseService)
  |
  v
NowPlayingNotification.update(file)
  ├── Sets lockscreen metadata (title, artist, artwork)
  └── Updates notification with prev/play-pause/next buttons
  |
  v
playbackStore (Zustand, subscribed to AudioEngine)
  - State: currentFile, queue, position, duration, isPlaying, repeat, shuffle
  - Delegates play/pause/seek/next/prev to AudioEngine
  |
  v
Components
  - NowPlayingBar (persistent above tab bar when source==='music')
  - MusicPlayerScreen (full player with controls, queue, lyrics, artwork)
```

### Video

```
User taps video file -> VideoPlayerScreen
  |
  v
videoPlaybackStore.loadFile(file) -> VideoEngine.loadFile(file)
  |
  v
VideoEngine (expo-video VideoPlayer singleton)
  - Creates VideoPlayer via useVideoPlayer({ uri })
  - Manages contentFit (contain/cover/fill), subtitles, speed
  - PanResponder swipe-up/down for next/prev video
  - subscribe(notify) pattern pushes state changes
  - stop() called by AudioEngine for mutual exclusion
  |
  v
VideoPlayerScreen (reads from videoPlaybackStore)
  - Renders <VideoView style={{ flex: 1 }}>
  - Subtitles via VideoEnhancementService (SRT parsing)
  - Bottom sheets for settings (speed, subtitles, loop mode)
  |
  v
MiniPlayer (persistent above tab bar when source==='video')
```

## 3. Navigation Structure

```
App.tsx
  OverlayProvider
    SafeAreaProvider
      LanguageProvider
        FontProvider
          ThemeProvider
            ErrorBoundary
              NavigationContainer
                Stack.Navigator (no header, transparent cards)
                  MainTabs (BottomTabNavigator, tabBar={() => null})
                  | -- HomeTab       -> HomeScreen
                  | -- MusicTab      -> MusicScreen
                  | -- VideosTab     -> VideosScreen
                  | -- SearchTab     -> SearchScreen
                  | -- SettingsTab   -> SettingsScreen
                  |
                  | -- (modal) Category       -> CategoryScreen
                  | -- (modal) VideoPlayer    -> VideoPlayerScreen
                  | -- (modal) MusicPlayer    -> MusicPlayerScreen
                  | -- (modal) PrivateFolder  -> PrivateFolderScreen
                  | -- (modal) Folder         -> FolderScreen
                  | -- (modal) VideoTop       -> VideoTopScreen
                  |
                  Permanent overlays (inside MainTabs):
                    - NowPlayingBar (audio, above tab bar)
                    - MiniPlayer (video, above tab bar)
                    - PlayerBoundary wraps screens with players
```

## 4. State Management Flow

```
  ENGINES (singletons, MMKV persistence)
  ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌────────────┐
  │FileEngine│ │AudioEngine│ │VideoEngine │ │QueueEngine │
  │(MMKV)    │ │(MMKV)     │ │(ephemeral) │ │(MMKV)      │
  └────┬─────┘ └─────┬─────┘ └─────┬──────┘ └──────┬─────┘
       │ subscribe   │ subscribe   │ subscribe     │ subscribe
       v             v             v               v
  ┌─────────────────────────────────────────────────────────┐
  │  ZUSTAND STORES (thin wrappers synced via subscriptions) │
  │  mediaStore   playbackStore   videoPlaybackStore         │
  │  playlistStore                settingsStore              │
  └─────────┬───────────────────────────────────────┬───────┘
            │                                       │
            v                                       v
  ┌─────────────────────────────────────────────────────────┐
  │  DOMAIN HOOKS + CONTEXT PROVIDERS                        │
  │  useDomainSelectors  ThemeContext  LanguageContext       │
  │  useVisibleAudio     FontContext                         │
  └─────────────────────────┬───────────────────────────────┘
                            │
                            v
  SCREENS & COMPONENTS (React.memo, selectors for perf)
```

## 5. Bottom Sheet Pattern

```
User taps trigger (e.g. 3-dot menu)
  |
  v
State setter (e.g. setShowMenu(true))
  |
  v
Modal visible={true} animationType="fade" (or "slide" for queue sheet)
  |
  v
For animated sheets (renderSheet/useSheetSwipe):
  - translateY = screenHeight (off-screen below)
  -> Animated.spring(translateY, { toValue: 0, ... })
  |
  v
For simple modals (queue, playlists):
  - Built-in Modal animation handles presentation
  - Queue sheet uses "slide" animation, occupies bottom 2/3
  |
  v
On backdrop tap:
  -> setShowX(false) to dismiss
  |
  v
Sheet exits via Modal's built-in animation
```

## Key Flow Patterns

- **Engines** own all device APIs (expo-audio, expo-video, expo-media-library, MMKV) and emit state via subscribe/notify
- **Zustand stores** subscribe to engines and bridge state into React
- **Domain hooks** aggregate multiple stores into derived collections (avoid re-computation in screens)
- **Screens** prefer direct store selectors when reading individual fields (performance)
- **VideoPlayerScreen** uses videoPlaybackStore (not raw VideoEngine — store wrapper exists)
- **Audio thumbnail pipeline**: ID3 extraction → ARTWORK_LOADED event → mediaStore updates FileItem.thumbnail → playbackStore.currentFile.thumbnail updated
- **Parallel playback guard**: AudioEngine.\_busy flag + videoEngine.stop() before audio starts
- **Settings** persist to MMKV via settingsStore and load on every app start
- **Bottom sheets** use Modal (animationType="fade"/"slide") with optional manual translateY animation
- **Theme** provides dynamic textColor/mutedColor — never hardcode `text-white` (breaks light mode)
- **Permissions** are auto-granted on cache load so permission screen doesn't reappear every open
