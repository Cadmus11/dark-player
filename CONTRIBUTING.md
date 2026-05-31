# Contributing to Dark Player 🎵

Thank you for your interest in contributing to Dark Player! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Commit Messages](#commit-messages)
- [Pull Requests](#pull-requests)

## Code of Conduct

Please be respectful and constructive in all interactions. We're committed to providing a welcoming and inclusive environment.

## Getting Started

### 1. Fork and Clone

```bash
# Fork on GitHub, then:
git clone https://github.com/YOUR_USERNAME/dark-player.git
cd dark-player
git remote add upstream https://github.com/Cadmus11/dark-player.git
```

### 2. Create a Feature Branch

```bash
# Always branch from main/master
git fetch upstream
git checkout -b feature/your-feature-name upstream/main

# Branch naming conventions:
# feature/description          - New feature
# fix/bug-description          - Bug fix
# docs/description             - Documentation
# refactor/description         - Code refactoring
# test/description             - Tests or test improvements
# chore/description            - Build, deps, tooling
```

### 3. Install Dependencies

```bash
npm install
# or
yarn install
```

## Development Workflow

### Running the App

```bash
# Start development server
npm start

# Run on specific platform
npm run ios           # iOS Simulator
npm run android       # Android Emulator
npm run web           # Web browser
```

### Code Quality

**Before committing, always run:**

```bash
# Check TypeScript
npm run typecheck

# Lint and format
npm run format        # Auto-fix
npm run lint          # Check only
```

### Making Changes

1. **Keep commits atomic** - One logical change per commit
2. **Write meaningful commit messages** - See [Commit Messages](#commit-messages)
3. **Update documentation** - If your changes affect user-facing behavior
4. **Add type safety** - Use TypeScript, avoid `any`
5. **Follow architecture** - See [Architecture Guidelines](#architecture-guidelines)

## Coding Standards

### TypeScript

- Use strict mode (already enabled in `tsconfig.json`)
- Avoid `any` types; use proper typing
- Use `const` by default, `let` only when necessary
- Use descriptive variable names

```typescript
// ✅ Good
const activeUsers: User[] = users.filter(u => u.isActive);

// ❌ Bad
const x: any = users.filter((u: any) => u.isActive);
```

### React Components

- Use **functional components** with hooks
- Wrap expensive components with `React.memo`
- Use **custom hooks** for shared logic
- Keep components focused and single-responsibility

```typescript
// ✅ Good
interface PlayerProps {
  file: MediaFile;
  onPlay: () => void;
}

const AudioPlayer = React.memo(({ file, onPlay }: PlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  // ...
});

// ❌ Bad
function AudioPlayer(props) {
  const isPlaying = props.isPlaying;
  // ...
}
```

### File Organization

```
components/
├── ComponentName.tsx        # Component code
├── ComponentName.types.ts   # Type definitions (if complex)
└── useComponentLogic.ts     # Custom hooks (if applicable)
```

### Styling with NativeWind

```typescript
// ✅ Use Tailwind classes via NativeWind
<View className="flex-1 bg-bg-primary dark:bg-dark-bg-primary p-4">
  <Text className="text-white dark:text-gray-200">Content</Text>
</View>

// ❌ Avoid hardcoded colors (breaks light mode)
<View style={{ backgroundColor: 'black' }}>
```

### State Management

- Use **Zustand selectors** to minimize re-renders
- Prefer **local state** for component-scoped data
- Document store structure in comments

```typescript
// ✅ Good - Selector prevents re-renders
const { isPlaying } = usePlaybackStore(s => ({ isPlaying: s.isPlaying }));

// ❌ Bad - Re-renders on any store change
const store = usePlaybackStore();
```

## Architecture Guidelines

### Adding Features

**New Screen**:
1. Create `screens/YourScreen.tsx`
2. Add type to `RootStackParamList` in `App.tsx`
3. Register route in Stack.Navigator
4. Document in architecture overview

**New Store**:
1. Create `stores/yourStore.ts` using Zustand
2. Subscribe to engine updates if applicable
3. Initialize in `HydrationService.ts`
4. Export hook for use in components

**New Engine**:
1. Create `engines/YourEngine.ts` as singleton
2. Implement `subscribe/notify` pattern
3. Connect to Zustand store
4. Document lifecycle in `flow.md`

### Engines Pattern

Engines are singletons that own device APIs:

```typescript
// ✅ Good engine structure
class FileEngine {
  private static instance: FileEngine;
  private listeners: Set<Listener> = new Set();
  private cache: FileCache;

  private constructor() {
    this.cache = new FileCache();
  }

  static getInstance(): FileEngine {
    if (!FileEngine.instance) {
      FileEngine.instance = new FileEngine();
    }
    return FileEngine.instance;
  }

  async scanAll(): Promise<FileItem[]> {
    // Implementation
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(data: any): void {
    this.listeners.forEach(l => l(data));
  }
}
```

## Testing

### Manual Testing

1. **Before submitting a PR, test on**:
   - iOS Simulator
   - Android Emulator
   - (Optional) Physical devices

2. **Test scenarios**:
   - Feature works as described
   - No console errors or warnings
   - No TypeScript errors (`npm run typecheck`)
   - Lint passes (`npm run lint`)

### Adding Tests

While the project doesn't currently have automated tests, if you add test files:
- Use Jest for unit tests
- Use Detox for E2E tests
- Place in `__tests__` directories
- Run: `npm test`

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): short description

Optional longer description explaining why and what changed.

Fixes #123
```

**Types**:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring (no behavior change)
- `test:` - Tests
- `chore:` - Build, dependencies, tooling
- `perf:` - Performance improvements
- `style:` - Code style (formatting, semicolons, etc.)

**Examples**:
```bash
git commit -m "feat(player): add playback speed control"
git commit -m "fix(audio): prevent memory leak in AudioEngine"
git commit -m "docs: update architecture guide"
git commit -m "refactor: consolidate player components"
```

## Pull Requests

### Before Opening a PR

- [ ] Code is TypeScript strict
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] Changes work on iOS and Android
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with main
- [ ] Changes are minimal and focused

### PR Template

```markdown
## Description
Brief explanation of changes

## Type
- [ ] Feature
- [ ] Bug fix
- [ ] Documentation
- [ ] Refactoring

## Changes
- Change 1
- Change 2

## Testing
How to test these changes

## Related Issues
Fixes #123

## Checklist
- [ ] Code follows style guidelines
- [ ] TypeScript strict mode passes
- [ ] Lint and format pass
- [ ] Documentation updated
```

### PR Review Process

1. Maintainer reviews code for:
   - Correctness and architecture
   - Code quality and style
   - Performance implications
   - Test coverage

2. Address feedback:
   - Push new commits (don't force-push)
   - Re-request review

3. Once approved:
   - Squash commits if needed
   - Merge to main

## Getting Help

- Check existing [Issues](https://github.com/Cadmus11/dark-player/issues)
- Ask questions in new Issue (use `question` label)
- Review [`flow.md`](./flow.md) for architecture details
- Check [Expo Docs](https://docs.expo.dev/) for platform-specific issues

## 🎉 Thank You

Your contributions make Dark Player better! If you have any questions, feel free to reach out.

Happy coding! 🎵
