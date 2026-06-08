import type { FileItem } from '../types';

interface IndexEntry {
  uri: string;
  nameTokens: string[];
  artistTokens: string[];
  albumTokens: string[];
  genreTokens: string[];
  yearStr: string;
  file: FileItem;
}

const BATCH_SIZE = 500;

class SearchIndexClass {
  private static instance: SearchIndexClass;
  private _entries: IndexEntry[] = [];
  private _uriMap = new Map<string, IndexEntry>();
  private _built = false;

  static getInstance(): SearchIndexClass {
    if (!SearchIndexClass.instance) {
      SearchIndexClass.instance = new SearchIndexClass();
    }
    return SearchIndexClass.instance;
  }

  build(files: FileItem[]): void {
    this._entries = [];
    this._uriMap.clear();

    for (const file of files) {
      const entry: IndexEntry = {
        uri: file.uri,
        nameTokens: this._tokenize(file.name),
        artistTokens: this._tokenize(file.artist || ''),
        albumTokens: this._tokenize(file.album || ''),
        genreTokens: this._tokenize(file.genre || ''),
        yearStr: file.year ? String(file.year) : '',
        file,
      };
      this._entries.push(entry);
      this._uriMap.set(file.uri, entry);
    }

    this._built = true;
  }

  async buildChunked(files: FileItem[]): Promise<void> {
    this._entries = [];
    this._uriMap.clear();

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      for (const file of batch) {
        const entry: IndexEntry = {
          uri: file.uri,
          nameTokens: this._tokenize(file.name),
          artistTokens: this._tokenize(file.artist || ''),
          albumTokens: this._tokenize(file.album || ''),
          genreTokens: this._tokenize(file.genre || ''),
          yearStr: file.year ? String(file.year) : '',
          file,
        };
        this._entries.push(entry);
        this._uriMap.set(file.uri, entry);
      }
      if (i + BATCH_SIZE < files.length) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    this._built = true;
  }

  updateFile(file: FileItem): void {
    const existing = this._uriMap.get(file.uri);
    if (existing) {
      existing.file = file;
      existing.nameTokens = this._tokenize(file.name);
      existing.artistTokens = this._tokenize(file.artist || '');
      existing.albumTokens = this._tokenize(file.album || '');
      existing.genreTokens = this._tokenize(file.genre || '');
      existing.yearStr = file.year ? String(file.year) : '';
    } else {
      const entry: IndexEntry = {
        uri: file.uri,
        nameTokens: this._tokenize(file.name),
        artistTokens: this._tokenize(file.artist || ''),
        albumTokens: this._tokenize(file.album || ''),
        genreTokens: this._tokenize(file.genre || ''),
        yearStr: file.year ? String(file.year) : '',
        file,
      };
      this._entries.push(entry);
      this._uriMap.set(file.uri, entry);
    }
  }

  removeFile(uri: string): void {
    const entry = this._uriMap.get(uri);
    if (entry) {
      const idx = this._entries.indexOf(entry);
      if (idx !== -1) this._entries.splice(idx, 1);
      this._uriMap.delete(uri);
    }
  }

  search(query: string): FileItem[] {
    if (!query.trim() || !this._built) return [];

    const q = query.toLowerCase().trim();
    const queryTokens = this._tokenize(q);
    const results: { file: FileItem; score: number }[] = [];

    for (const entry of this._entries) {
      let score = 0;
      const nameStr = entry.file.name.toLowerCase();
      const artistStr = (entry.file.artist || '').toLowerCase();
      const albumStr = (entry.file.album || '').toLowerCase();

      if (nameStr === q) score += 100;
      else if (nameStr.startsWith(q)) score += 50;
      else if (nameStr.includes(q)) score += 25;

      if (artistStr.includes(q)) score += 15;
      if (albumStr.includes(q)) score += 10;
      if (entry.file.genre?.toLowerCase().includes(q)) score += 8;
      if (entry.yearStr === q) score += 12;

      for (const token of queryTokens) {
        if (entry.nameTokens.some((t) => t.includes(token))) score += 5;
        if (entry.artistTokens.some((t) => t.includes(token))) score += 3;
        if (entry.albumTokens.some((t) => t.includes(token))) score += 2;
        if (entry.genreTokens.some((t) => t.includes(token))) score += 2;
        if (entry.yearStr.includes(token)) score += 2;
      }

      if (score > 0) results.push({ file: entry.file, score });
    }

    return results.sort((a, b) => b.score - a.score).map((r) => r.file);
  }

  getAlbums(): Map<string, { name: string; artist: string; songs: FileItem[] }> {
    const map = new Map<string, { name: string; artist: string; songs: FileItem[] }>();
    for (const entry of this._entries) {
      if (entry.file.type !== 'audio') continue;
      const album = entry.file.album || 'Unknown Album';
      const artist = entry.file.artist || 'Unknown Artist';
      const key = `${album}::${artist}`.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { name: album, artist, songs: [] });
      }
      map.get(key)!.songs.push(entry.file);
    }
    return map;
  }

  getArtists(): Map<string, { name: string; songs: FileItem[]; albums: Set<string> }> {
    const map = new Map<string, { name: string; songs: FileItem[]; albums: Set<string> }>();
    for (const entry of this._entries) {
      if (entry.file.type !== 'audio') continue;
      const artist = entry.file.artist || 'Unknown Artist';
      if (!map.has(artist.toLowerCase())) {
        map.set(artist.toLowerCase(), { name: artist, songs: [], albums: new Set() });
      }
      const a = map.get(artist.toLowerCase())!;
      a.songs.push(entry.file);
      if (entry.file.album) a.albums.add(entry.file.album);
    }
    return map;
  }

  getFolders(): Map<string, FileItem[]> {
    const map = new Map<string, FileItem[]>();
    for (const entry of this._entries) {
      const folder = entry.file.parentUri || 'Unknown';
      if (!map.has(folder)) map.set(folder, []);
      map.get(folder)!.push(entry.file);
    }
    return map;
  }

  get isBuilt(): boolean {
    return this._built;
  }

  get size(): number {
    return this._entries.length;
  }

  clear(): void {
    this._entries = [];
    this._uriMap.clear();
    this._built = false;
  }

  private _tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[\s\-_.]+/)
      .filter(Boolean);
  }
}

export const searchIndex = SearchIndexClass.getInstance();
