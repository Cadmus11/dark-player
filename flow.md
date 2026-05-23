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
  - Falls back to FileSystem.getInfoAsync() when asset.fileSize is null
  |
  v
mediaStore (Zustand)
  - scanMedia() calls FileEngine.scanAll(), sets loading/progress/result arrays
  - loadCache() calls FileEngine.loadFromCache() on startup, sets permissionsGranted: true
  - getFilteredAudio() applies hidden-files filter (<15s songs excluded by default)
  |
  v
FileContext (React context)
  - Reads mediaStore, playlistStore, settingsStore
  - Derives: visibleAudio, allFiles, categories, playlists,
    favoriteFiles, recentlyPlayed, searchHistory (all via useMemo)
  - On mount: loads settings, playlists, cache; triggers scan if needed
  |
  v
Screens & Components (React.memo wrapped)
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
VideoPlayerScreen (no store wrapper, uses expo-video VideoPlayer + VideoView)
  - Creates useVideoPlayer({ uri }) and renders <VideoView style={{ flex: 1 }}>
  - Play modes (loop, loopAll, shuffle, pauseAfter) managed locally
  - Subtitle support (SRT parsing, sync polling)
  - PanResponder swipe-up/down for next/prev video
  - Bottom sheets animate from off-screen (translateY = screenHeight -> 0)
  |
  v
MiniPlayer (persistent above tab bar when source==='video')
```

## 3. Navigation Structure

```
App.tsx
  SafeAreaProvider
    LanguageProvider
      FontProvider
        ThemeProvider
          FileProvider
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
Modal visible={true} animationType="fade"
  |
  v
useEffect watches isVisible:
  - translateY = screenHeight (off-screen below)
  -> Animated.spring(translateY, { toValue: 0, ... })
  |
  v
Content slides up from below the screen into view
  |
  v
On swipe-down (>80px) or backdrop tap:
  -> Animated.timing(translateY, { toValue: screenHeight })
     .start(() => onClose())
  |
  v
Sheet exits downward, then modal hides
```

## Key Flow Patterns

- **Engines** own all device APIs (expo-av, expo-media-library, MMKV) and emit state via subscribe/notify
- **Zustand stores** subscribe to engines and bridge state into React
- **FileContext** aggregates multiple stores into derived collections (avoid re-computation in screens)
- **Screens** prefer direct store selectors over FileContext when reading individual fields (performance)
- **VideoPlayerScreen** is the exception — reads VideoEngine directly without a store wrapper
- **Settings** persist to MMKV via settingsStore and load on every app start
- **Bottom sheets** use spring entry (from off-screen) and timed exit (to off-screen) for smooth animations
- **Theme** provides dynamic textColor/mutedColor — never hardcode `text-white` (breaks light mode)
- **Permissions** are auto-granted on cache load so permission screen doesn't reappear every open
