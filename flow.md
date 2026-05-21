# Lumora — Agent Reference

## Commands
- **TypeCheck**: `npx tsc --noEmit --skipLibCheck` (or `npm run typecheck`)
- **Lint**: `npm run lint`
- **Format**: `npm run format`

## Project Overview
React Native (Expo SDK 55, RN 0.83, React 19) media player. Dark theme, file-based, plays audio/video, browses documents. Uses Zustand stores, centralized engines, and a layout system with blur backgrounds.

## Architecture
- `engine/` — AudioEngine, VideoEngine, FileEngine, QueueEngine (singletons, MMKV-persisted)
- `stores/` — Zustand stores (mediaStore, playbackStore, playlistStore, settingsStore) delegating to engines
- `context/` — FileContext (orchestrator), ThemeContext (dark themes + blur/fit settings, color themes, gradients, light/dark)
- `hooks/` — useAudioPlayback, useMediaFiles, useFavorites, useVisibleAudio, useHiddenAudio
- `services/` — Sorting (+ 'newest' field), Search, History (play sessions, cumulative playtime), Metadata, Storage, FileService
- `components/` — ScreenLayout, BlurBackground, SkeletonLoader, ErrorBoundary, FileIcon, GlassCard, MiniPlayer, NowPlayingBar, FileList (selection mode), FileGrid, SelectionBar, LayoutToggle
- `screens/` — All 13 screens
- `types/index.ts` — Shared types including ColorTheme[], Album, Artist, FileAction

## Key Conventions
- **No comments** in code unless asked
- **`expo-file-system`** must use `const FileSystem: any = require('expo-file-system')` workaround (Expo SDK 55 API change)
- **`@missingcore/audio-metadata`** — metadata reader (replaces unmaintained `react-native-music-metadata`)
- **`app.png`** from assets used for app logo everywhere
- Songs **<15s** filtered by default; visible in Settings > Hidden Files
- **No emoji** unless user explicitly requests
- Background blur 0–100, fit toggle (cover/contain)

---

# Feature Status

## Implemented
- ✅ **Background play** — AudioEngine: `staysActiveInBackground: true`
- ✅ **Minimized music play** — MiniPlayer + NowPlayingBar persist across tabs
- ✅ **Color themes** — 9 presets (Midnight, Forest, Ocean, Sunset, Lavender, Amber, Rose, Slate, Light) in ThemeContext
- ✅ **Light/Dark mode** — Dark/Light toggle in Settings, auto-applies backgrounds/colors
- ✅ **Accent colors** — 16-color circle picker in Settings, stored in ThemeSettings
- ✅ **Gradient themes** — 6 gradient presets (Deep Space, Neon, Cyber, Ocean, Forest, Sunset) in Settings
- ✅ **Font loading** — FontContext + FONT_OPTIONS + expo-font loading logic ready, just need font files in `assets/fonts/`
- ✅ **i18n** — LanguageContext with language/locale switching works, needs more locale files
- ✅ **App About screen** — Settings > About shows Lumora, version, features list, dev credit
- ✅ **"Rate Lumora"** — Links to Play Store / App Store in Settings
- ✅ **"Share Lumora"** — Native share in Settings
- ✅ **"Private Folder"** — Actual file creation in app document directory via PrivateFolderService, add/remove/list files
- ✅ **Exact file counts** — `categories` and `docCategories` computed from real filtered lengths
- ✅ **Playtime tracking** — HistoryService with play sessions (start/pause/resume/end), cumulative per song
- ✅ **Recently deleted tracking** — Stored via StorageService, shows list + dates in Settings; trash backup enables restore and permanent delete
- ✅ **Search scrollable categories** — Category chips wrapped in horizontal ScrollView
- ✅ **A–Z scrollbar** — MusicScreen when `sortField === 'name'` renders SectionList + alphabet strip
- ✅ **File badges** — "LYRICS" and "ART" pills on file rows in MusicScreen
- ✅ **Delete files** — VideoPlayer has delete button with confirm dialog, uses expo-file-system or MediaLibrary
- ✅ **Share files** — VideoPlayer has share button via native Share API
- ✅ **Albums (auto-created)** — HomeScreen `buildAlbums()` from audio file metadata
- ✅ **Artists (auto-created)** — HomeScreen `buildArtists()` from audio file metadata
- ✅ **"Newest" sort** — Added to SortField, Sorting service, sort modals in MusicScreen + DocumentsScreen
- ✅ **Shorts (short videos)** — HomeScreen section for videos ≤60s
- ✅ **Permissions UI** — Permission rationale screen on first launch, fallback to Settings deep-link
- ✅ **Long-hold multi-select** — FileList supports selection mode with SelectionBar (Add to, Play Next, Share, Hide, Delete)
- ✅ **Video play modes** — Loop One, Loop All, Shuffle, Pause After Play in VideoPlayerScreen
- ✅ **Video info popup** — Name, Size, Duration, Resolution, Play Mode, Speed
- ✅ **Video PiP** — Picture-in-Picture button + fullscreen entry via expo-av
- ✅ **Video audio tracks** — Audio Mode toggle + subtitle toggle + language selector (10 languages)
- ✅ **Notifications settings** — New media notification + push notification switches
- ✅ **Sleep timer** — Minutes / End of Track / End of Queue modes
- ✅ **Playback settings** — Play with other apps, crossfade, gapless playback

## Still to Build
*(All features from the checklist are implemented.)*

## Known Issues & Concerns
- **Subtitle support incomplete** — `VideoPlayerScreen.loadSubtitles()` was a stub (now fixed). Subtitles still need actual `.srt`/`.vtt` file lookup from the device.
- **FileEngine/FileService code duplication** — `ART_COLORS`, `getArtColor()`, `EXTENSION_MAP`, `getFileType()`, `getDocumentSubType()`, `formatFileSize()`, `formatDuration()` are duplicated between both files. Future refactor should consolidate into `FileService` and have `FileEngine` delegate.
- **Sort modals duplicated** — MusicScreen, VideosScreen, DocumentsScreen each have near-identical sort modal code. Extract into a reusable `SortModal` component.
- **Accessibility missing** — No `accessible` / `accessibilityLabel` / `accessibilityRole` on any interactive elements. Future pass needed.
- **Hardcoded i18n strings** — SettingsScreen still has ~15+ hardcoded strings (e.g., "Private Folder", "Share Lumora", "Dark Mode", "Future Updates"). These should be migrated to `t()` keys.
- **Perf: Context re-renders** — FileContext still causes cascade re-renders when any store field changes. Further selector optimization needed.
- **No cache invalidation on app version change** — FileEngine cache only invalidates on `CACHE_VERSION` bump, not on app update. Consider version-based invalidation.

## Future Updates (listed in Settings > Future Updates)
- Lyrics & Karaoke — synced lyrics with auto-fetch
- 10-Band Equalizer — custom presets, bass boost, reverb
- Chromecast & AirPlay — stream to TV/speakers
- Local Network Share — Wi-Fi file sharing between devices
- Smart Playlists — auto-generated by genre/mood/count
- Full Offline Mode — cloud download, Plex/Jellyfin/SMB
- Podcast Support — discovery, subscriptions, auto-downloads
- Advanced Sleep Timer — fade-out, smart detection
- Live Wallpaper Backdrops — animated/motion backgrounds
- More Languages — community translations
- Custom Font Upload — import .ttf files in-app
- Android Auto & CarPlay — driving mode UI
- Crossfade Playback — seamless transitions
- PDF Bookmarks & Annotations — highlight, notes
- Photo Editing Tools — crop, rotate, filters
- Manual Cover Upload — upload custom cover art for songs/albums via ImagePicker

## Fonts Required
Place these `.ttf` files in `assets/fonts/` to enable custom fonts in Settings > Fonts:

| File | Font Name | Key |
|------|-----------|-----|
| `Inter-Regular.ttf` | Inter | `inter` |
| `Inter-Bold.ttf` | Inter Bold | `interBold` |
| `PlayfairDisplay-Regular.ttf` | Playfair Display | `playfair` |
| `JetBrainsMono-Regular.ttf` | JetBrains Mono | `jetbrains` |
| `Nunito-Regular.ttf` | Nunito | `nunito` |
| `Poppins-Regular.ttf` | Poppins | `poppins` |
| `Poppins-Bold.ttf` | Poppins Bold | `poppinsBold` |

Download from Google Fonts or any font foundry. Once placed, the app auto-loads them on next launch. If font files are missing, the app uses system fonts as fallback without crashing.
