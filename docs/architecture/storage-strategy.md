# Storage Architecture — Lumora

## Decision: MMKV + Future SQLite

### Current (MMKV)
- Settings
- Playback snapshots (lightweight position/state)
- Playlist metadata
- Cache versioning + timestamps
- Queue state (audio + video)

### Future (SQLite via expo-sqlite)
- Media index (FileItem[])
- Metadata table (artist, album, genre, etc.)
- Search index (FTS5)
- Recently played / history
- Artwork cache index
- Playlist song IDs

### Migration Path
1. Add expo-sqlite dependency
2. Create `MediaDatabase` class with normalized schema
3. Write migration from MMKV arrays → SQLite rows
4. Keep MMKV for small key-value state only
5. Add incremental sync between FileEngine and SQLite

### Schema (Future)

```sql
CREATE TABLE media (
  uri TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER,
  mime_type TEXT,
  modified_at INTEGER,
  created_at INTEGER,
  duration INTEGER,
  artist TEXT,
  album TEXT,
  art_color TEXT,
  thumbnail TEXT,
  subtitle_uri TEXT,
  has_lyrics INTEGER DEFAULT 0,
  last_scanned_at INTEGER
);

CREATE TABLE metadata (
  uri TEXT PRIMARY KEY,
  title TEXT,
  artist TEXT,
  album TEXT,
  genre TEXT,
  year INTEGER,
  bitrate INTEGER,
  sample_rate INTEGER,
  track_number INTEGER,
  composer TEXT,
  artwork_uri TEXT,
  FOREIGN KEY (uri) REFERENCES media(uri)
);

CREATE VIRTUAL TABLE media_fts USING fts5(name, artist, album);
```

### Storage Separation

| Data | Store | Reason |
|------|-------|--------|
| Settings | MMKV | Tiny, frequent reads/writes |
| Playback position | MMKV | Fast restore |
| Media index | SQLite | Large, needs querying |
| Artwork cache | FileSystem | Binary large objects |
| Playlists | SQLite | Relations |
| History | SQLite | Analytics |

### Anti-patterns to Avoid
- Storing giant serialized FileItem arrays in MMKV
- Keeping full media lists in React context
- Parsing large JSON blobs on startup
- Blocking UI on file I/O
