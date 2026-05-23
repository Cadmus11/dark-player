# Virtualized Rendering Strategy — Lumora

## Current State
FileGrid and FileList use React Native FlatList. For libraries exceeding 10k items, FlatList exhibits:
- Increased JS thread pressure during scroll
- Memory bloat from offscreen items
- Slow mount time
- Poor low-end Android performance

## Recommendation: FlashList (Shopify)

### Why FlashList
- Recycling pool instead of window + buffer
- `estimatedItemSize` enables precomputed layout
- `getItemType` enables view-type reuse
- Over 10x less memory for large lists
- Sub-16ms frame times at 60fps

### Implementation Strategy

```tsx
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={items}
  renderItem={renderItem}
  estimatedItemSize={80}
  keyExtractor={(item) => item.uri}
  getItemType={(item) => item.type}
  extraData={favorites}
/>
```

### Migration Steps
1. Install `@shopify/flash-list`
2. Replace FlatList in FileGrid, FileList, MusicScreen, SearchScreen
3. Set `estimatedItemSize` per layout mode:
   - List: 80px
   - Grid small: 120px
   - Grid medium: 160px
   - Grid big: 200px
4. Add `getItemType` for video vs audio cells
5. Memoize renderItem with React.memo
6. Thumbnail lazy loading via ArtworkService

### Item Memoization

```tsx
const FileGridItem = React.memo(({ item, onPress }: { item: FileItem; onPress: (f: FileItem) => void }) => {
  const thumbnail = useMemo(() => artworkService.getCached(item.uri), [item.uri]);
  return <GridCell file={item} thumbnail={thumbnail} onPress={onPress} />;
});
```

### Key Requirements
- Stable `keyExtractor` (always item.uri)
- Avoid inline functions in renderItem
- Use `extraData` for reactive favorites, selection
- Thumbnail lazy load with placeholder
- Avoid re-rendering entire list on single item change

### Performance Targets
- 10k items: < 50MB RAM, < 16ms frame time
- 50k items: < 150MB RAM, < 20ms frame time
- Scroll velocity: > 1000px/s with no dropped frames
- Mount time: < 200ms for 10k items
