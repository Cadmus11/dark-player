import * as SQLite from 'expo-sqlite';
import type { MediaMetadata } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('lumora.db');
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS metadata_cache (
      uri TEXT PRIMARY KEY,
      metadata TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    )`
  );
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS artwork_cache (
      uri TEXT PRIMARY KEY,
      file_path TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    )`
  );
  return db;
}

export const DatabaseService = {
  /** Pre-warm the DB connection early so metadata extraction isn't blocked */
  async prewarm(): Promise<void> {
    await getDb();
  },

  async cacheMetadata(uri: string, metadata: MediaMetadata): Promise<void> {
    const d = await getDb();
    await d.runAsync(
      'INSERT OR REPLACE INTO metadata_cache (uri, metadata, cached_at) VALUES (?, ?, ?)',
      [uri, JSON.stringify(metadata), Date.now()]
    );
  },

  async getCachedMetadata(uri: string): Promise<MediaMetadata | null> {
    try {
      const d = await getDb();
      const row = await d.getFirstAsync<{ metadata: string }>(
        'SELECT metadata FROM metadata_cache WHERE uri = ?',
        [uri]
      );
      if (row) {
        return JSON.parse(row.metadata);
      }
    } catch (e) { console.warn('[DatabaseService]', e); }
    return null;
  },

  async clearMetadataCache(): Promise<void> {
    const d = await getDb();
    await d.execAsync('DELETE FROM metadata_cache');
  },

  async cacheArtworkPath(uri: string, filePath: string): Promise<void> {
    const d = await getDb();
    await d.runAsync(
      'INSERT OR REPLACE INTO artwork_cache (uri, file_path, cached_at) VALUES (?, ?, ?)',
      [uri, filePath, Date.now()]
    );
  },

  async getCachedArtworkPath(uri: string): Promise<string | null> {
    try {
      const d = await getDb();
      const row = await d.getFirstAsync<{ file_path: string }>(
        'SELECT file_path FROM artwork_cache WHERE uri = ?',
        [uri]
      );
      if (row) {
        return row.file_path;
      }
    } catch (e) { console.warn('[DatabaseService]', e); }
    return null;
  },

  async clearAll(): Promise<void> {
    const d = await getDb();
    await d.execAsync('DELETE FROM metadata_cache');
    await d.execAsync('DELETE FROM artwork_cache');
  },

  async close(): Promise<void> {
    if (db) {
      await db.closeAsync();
      db = null;
    }
  },
};
