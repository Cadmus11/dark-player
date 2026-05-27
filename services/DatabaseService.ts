import SQLite from 'react-native-sqlite-storage';
import type { MediaMetadata } from '../types';

SQLite.enablePromise(true);

let db: any = null;

async function getDb(): Promise<any> {
  if (db) return db;
  db = await SQLite.openDatabase({ name: 'lumora.db', location: 'default' });
  await db.executeSql(
    `CREATE TABLE IF NOT EXISTS metadata_cache (
      uri TEXT PRIMARY KEY,
      metadata TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    )`
  );
  await db.executeSql(
    `CREATE TABLE IF NOT EXISTS artwork_cache (
      uri TEXT PRIMARY KEY,
      file_path TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    )`
  );
  return db;
}

export const DatabaseService = {
  async cacheMetadata(uri: string, metadata: MediaMetadata): Promise<void> {
    const d = await getDb();
    await d.executeSql(
      'INSERT OR REPLACE INTO metadata_cache (uri, metadata, cached_at) VALUES (?, ?, ?)',
      [uri, JSON.stringify(metadata), Date.now()]
    );
  },

  async getCachedMetadata(uri: string): Promise<MediaMetadata | null> {
    try {
      const d = await getDb();
      const [results] = await d.executeSql(
        'SELECT metadata FROM metadata_cache WHERE uri = ?',
        [uri]
      );
      if (results.rows.length > 0) {
        return JSON.parse(results.rows.item(0).metadata);
      }
    } catch {}
    return null;
  },

  async clearMetadataCache(): Promise<void> {
    const d = await getDb();
    await d.executeSql('DELETE FROM metadata_cache');
  },

  async cacheArtworkPath(uri: string, filePath: string): Promise<void> {
    const d = await getDb();
    await d.executeSql(
      'INSERT OR REPLACE INTO artwork_cache (uri, file_path, cached_at) VALUES (?, ?, ?)',
      [uri, filePath, Date.now()]
    );
  },

  async getCachedArtworkPath(uri: string): Promise<string | null> {
    try {
      const d = await getDb();
      const [results] = await d.executeSql(
        'SELECT file_path FROM artwork_cache WHERE uri = ?',
        [uri]
      );
      if (results.rows.length > 0) {
        return results.rows.item(0).file_path;
      }
    } catch {}
    return null;
  },

  async clearAll(): Promise<void> {
    const d = await getDb();
    await d.executeSql('DELETE FROM metadata_cache');
    await d.executeSql('DELETE FROM artwork_cache');
  },

  async close(): Promise<void> {
    if (db) {
      await db.close();
      db = null;
    }
  },
};
