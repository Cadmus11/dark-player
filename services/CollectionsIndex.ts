import type { FileItem } from '../types';
import { eventBus, AppEvents } from './EventBus';

const BATCH_SIZE = 500;

export interface Album {
  id: string;
  name: string;
  artist: string;
  songs: FileItem[];
  artwork?: string;
  songCount: number;
  totalDuration: number;
}

export interface Artist {
  id: string;
  name: string;
  songs: FileItem[];
  albums: string[];
  songCount: number;
}

export interface Folder {
  uri: string;
  name: string;
  files: FileItem[];
  fileCount: number;
}

class CollectionsIndexClass {
  private static instance: CollectionsIndexClass;
  private _albumsMap = new Map<string, Album>();
  private _artistsMap = new Map<string, Artist>();
  private _foldersMap = new Map<string, Folder>();
  private _built = false;

  static getInstance(): CollectionsIndexClass {
    if (!CollectionsIndexClass.instance) {
      CollectionsIndexClass.instance = new CollectionsIndexClass();
    }
    return CollectionsIndexClass.instance;
  }

  build(audioFiles: FileItem[], videoFiles: FileItem[]): void {
    this._albumsMap.clear();
    this._artistsMap.clear();
    this._foldersMap.clear();

    for (const file of audioFiles) {
      this._indexAudio(file);
    }

    for (const file of [...audioFiles, ...videoFiles]) {
      this._indexFolder(file);
    }

    this._built = true;
    eventBus.emit(AppEvents.COLLECTION_BUILT);
  }

  async buildChunked(audioFiles: FileItem[], videoFiles: FileItem[]): Promise<void> {
    this._albumsMap.clear();
    this._artistsMap.clear();
    this._foldersMap.clear();

    for (let i = 0; i < audioFiles.length; i += BATCH_SIZE) {
      const batch = audioFiles.slice(i, i + BATCH_SIZE);
      for (const file of batch) {
        this._indexAudio(file);
      }
      if (i + BATCH_SIZE < audioFiles.length) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const allFiles = [...audioFiles, ...videoFiles];
    for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
      const batch = allFiles.slice(i, i + BATCH_SIZE);
      for (const file of batch) {
        this._indexFolder(file);
      }
      if (i + BATCH_SIZE < allFiles.length) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    this._built = true;
    eventBus.emit(AppEvents.COLLECTION_BUILT);
  }

  updateFile(file: FileItem): void {
    if (file.type === 'audio') {
      this._indexAudio(file);
    }
    this._indexFolder(file);
  }

  removeFile(uri: string): void {
    for (const [key, album] of this._albumsMap) {
      album.songs = album.songs.filter((f) => f.uri !== uri);
      album.songCount = album.songs.length;
      album.totalDuration = album.songs.reduce((sum, f) => sum + (f.duration || 0), 0);
      if (album.songs.length === 0) this._albumsMap.delete(key);
    }

    for (const [key, artist] of this._artistsMap) {
      artist.songs = artist.songs.filter((f) => f.uri !== uri);
      artist.songCount = artist.songs.length;
      if (artist.songs.length === 0) this._artistsMap.delete(key);
    }

    for (const [key, folder] of this._foldersMap) {
      folder.files = folder.files.filter((f) => f.uri !== uri);
      folder.fileCount = folder.files.length;
      if (folder.files.length === 0) this._foldersMap.delete(key);
    }
  }

  getAlbums(): Album[] {
    return Array.from(this._albumsMap.values()).sort((a, b) => b.songCount - a.songCount);
  }

  getAlbum(id: string): Album | undefined {
    return this._albumsMap.get(id);
  }

  getArtists(): Artist[] {
    return Array.from(this._artistsMap.values()).sort((a, b) => b.songCount - a.songCount);
  }

  getArtist(id: string): Artist | undefined {
    return this._artistsMap.get(id);
  }

  getFolders(): Folder[] {
    return Array.from(this._foldersMap.values()).sort((a, b) => b.fileCount - a.fileCount);
  }

  getFolder(uri: string): Folder | undefined {
    return this._foldersMap.get(uri);
  }

  getAlbumsMap(): Map<string, Album> {
    return this._albumsMap;
  }

  getArtistsMap(): Map<string, Artist> {
    return this._artistsMap;
  }

  getFoldersMap(): Map<string, Folder> {
    return this._foldersMap;
  }

  get isBuilt(): boolean {
    return this._built;
  }

  clear(): void {
    this._albumsMap.clear();
    this._artistsMap.clear();
    this._foldersMap.clear();
    this._built = false;
  }

  private _indexAudio(file: FileItem): void {
    const albumName = file.album || 'Unknown Album';
    const artistName = file.artist || 'Unknown Artist';
    const albumKey = `${albumName}::${artistName}`.toLowerCase();
    const artistKey = artistName.toLowerCase();

    if (!this._albumsMap.has(albumKey)) {
      this._albumsMap.set(albumKey, {
        id: albumKey,
        name: albumName,
        artist: artistName,
        songs: [],
        songCount: 0,
        totalDuration: 0,
      });
    }
    const album = this._albumsMap.get(albumKey)!;
    const songExists = album.songs.some((f) => f.uri === file.uri);
    if (!songExists) {
      album.songs.push(file);
      album.songCount = album.songs.length;
      album.totalDuration = album.songs.reduce((sum, f) => sum + (f.duration || 0), 0);
      if (file.thumbnail && !album.artwork) album.artwork = file.thumbnail;
    }

    if (!this._artistsMap.has(artistKey)) {
      this._artistsMap.set(artistKey, {
        id: artistKey,
        name: artistName,
        songs: [],
        albums: [],
        songCount: 0,
      });
    }
    const artist = this._artistsMap.get(artistKey)!;
    const artistSongExists = artist.songs.some((f) => f.uri === file.uri);
    if (!artistSongExists) {
      artist.songs.push(file);
      artist.songCount = artist.songs.length;
      if (file.album && !artist.albums.includes(file.album)) {
        artist.albums.push(file.album);
      }
    }
  }

  private _indexFolder(file: FileItem): void {
    const folderUri = file.parentUri || 'unknown';
    const folderName = folderUri.split('/').pop() || 'Unknown';

    if (!this._foldersMap.has(folderUri)) {
      this._foldersMap.set(folderUri, {
        uri: folderUri,
        name: folderName,
        files: [],
        fileCount: 0,
      });
    }
    const folder = this._foldersMap.get(folderUri)!;
    const fileExists = folder.files.some((f) => f.uri === file.uri);
    if (!fileExists) {
      folder.files.push(file);
      folder.fileCount = folder.files.length;
    }
  }
}

export const collectionsIndex = CollectionsIndexClass.getInstance();
