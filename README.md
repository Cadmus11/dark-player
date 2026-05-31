# 🎵 Dark Player

**Lumora** — An immersive, AI-ready music and video player for the future of mobile media.

![License](https://img.shields.io/badge/license-MIT-green)
![Language](https://img.shields.io/badge/language-TypeScript-blue)
![Platform](https://img.shields.io/badge/platform-React%20Native-blueviolet)

## ✨ Features

- 🎵 **Audio Playback** - Advanced music player with queue, repeat, shuffle, and speed control
- 🎬 **Video Playback** - Full-featured video player with subtitle support (SRT)
- 📁 **Local File Management** - Browse music and videos from device storage
- 🔍 **Search & Filtering** - Quick media discovery
- 🎨 **Themable UI** - Light/Dark mode with NativeWind styling
- 🌍 **Multi-language Support** - i18n ready
- 💾 **Offline First** - MMKV-based caching for instant startup
- 📱 **Cross-Platform** - iOS and Android via Expo

## 🏗 Architecture

The app uses a **singleton engine pattern** with Zustand state management:

```
Device APIs (expo-av, expo-media-library, expo-file-system)
    ↓
ENGINES (singletons with MMKV persistence)
├── FileEngine        - Media scanning & caching
├── AudioEngine       - Audio playback management
├── VideoEngine       - Video playback state
└── QueueEngine       - Playback queue
    ↓
ZUSTAND STORES (thin wrappers, synced via subscriptions)
├── mediaStore        - File listings
├── playbackStore     - Audio state
├── playlistStore     - Playlist data
└── settingsStore     - User preferences
    ↓
CONTEXT PROVIDERS (derived state, memoized)
├── FileContext       - Aggregated file collections
├── ThemeContext      - UI theming
├── LanguageContext   - i18n
└── FontContext       - Font settings
    ↓
SCREENS & COMPONENTS (React.memo, optimized selectors)
```

**Key Documentation**:
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) - Detailed system architecture
- [`flow.md`](./flow.md) - Data and control flow diagrams
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) - Contributing guidelines

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- (iOS) Xcode command line tools
- (Android) Android Studio

### Installation

```bash
# Clone repository
git clone https://github.com/Cadmus11/dark-player.git
cd dark-player

# Install dependencies
npm install

# Start development server
npm start
```

### Running on Devices

```bash
# Web
npm run web

# iOS Simulator
npm run ios

# Android Emulator
npm run android
```

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start Expo dev server |
| `npm run web` | Run on web browser |
| `npm run ios` | Run on iOS simulator |
| `npm run android` | Run on Android emulator |
| `npm run prebuild` | Generate native code |
| `npm run lint` | Run ESLint + Prettier check |
| `npm run format` | Auto-fix lint & formatting issues |
| `npm run typecheck` | Run TypeScript type checking |

## 🛠 Development

### Code Quality

All code is linted and formatted:

```bash
npm run lint          # Check
npm run format        # Auto-fix
npm run typecheck     # Type checking
```

### Project Structure

```
├── App.tsx                    # Root navigation
├── screens/                   # Page-level components
├── components/                # Reusable UI components
├── engines/                   # Singleton service engines
├── stores/                    # Zustand state stores
├── services/                  # Utility services
├── context/                   # React Context providers
├── hooks/                     # Custom React hooks
├── types/                     # TypeScript definitions
├── constants/                 # App constants
└── i18n/                      # Internationalization
```

### State Management

Always use **selectors** to optimize performance:

```typescript
// ✅ Good - Only selectedFields trigger re-render
const { isPlaying, currentFile } = usePlaybackStore(
  (s) => ({ isPlaying: s.isPlaying, currentFile: s.currentFile })
);

// ❌ Bad - All store changes trigger re-render
const store = usePlaybackStore();
```

## 🤝 Contributing

We welcome contributions! See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for:
- Code style and conventions
- Git workflow and branch naming
- Pull request process
- Testing requirements

### Quick Start

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: add your feature"

# Push and create PR
git push origin feature/your-feature
```

## 🐛 Troubleshooting

### App won't start
```bash
rm -rf node_modules package-lock.json
npm install
npm start -- --clear
```

### Permission errors
Check `Info.plist` (iOS) or `AndroidManifest.xml` (Android) for required permissions.

### Build issues
```bash
npm run prebuild -- --clean
npm run ios  # or android
```

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zustand](https://github.com/pmndrs/zustand)

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details

## 👤 Author

**Cadmus11** - [GitHub](https://github.com/Cadmus11)

## 🌟 Roadmap

- [ ] AI-powered recommendations
- [ ] Lyrics synchronization
- [ ] Chromecast / AirPlay support
- [ ] Cloud sync for playlists
- [ ] User authentication
- [ ] Advanced equalizer
- [ ] Podcast support

---

**Made with ❤️ for music and video lovers**
