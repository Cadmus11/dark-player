import { getInfoAsync } from 'expo-file-system/legacy';
import type { FileItem, FileType } from '../types';
import { CancellationToken } from './Cancellation';
import { withRetry } from './RetryService';
import { getArtColor } from '../utils/file-type';
import type { RawAsset } from './RawAssetFetcher';

const SIZE_CONCURRENCY = 4;
const LRC_CONCURRENCY = 12;

function isTransient(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    if (m.includes('cancel') || m.includes('abort')) return false;
    if (m.includes('permission') || m.includes('denied')) return false;
    return true;
  }
  return true;
}

export async function processAssets(
  rawAssets: RawAsset[],
  token: CancellationToken,
  onProgress?: (processed: number, total: number) => void
): Promise<FileItem[]> {
  if (rawAssets.length === 0) return [];

  const sizeMap = await resolveMissingSizes(rawAssets, token);
  token.throwIfCancelled();

  const audioAssets = rawAssets.filter((a) => a.mediaType === 'audio');
  const lrcMap =
    audioAssets.length > 0 ? await detectLyrics(audioAssets, token) : new Map<string, boolean>();

  const items: FileItem[] = rawAssets.map((asset, idx) => {
    const size = asset.fileSize ?? sizeMap.get(asset.uri);
    return {
      uri: asset.uri,
      name: asset.filename,
      type: asset.mediaType as FileType,
      assetId: asset.id,
      modifiedAt: asset.modificationTime,
      createdAt: asset.creationTime,
      thumbnail: asset.mediaType === 'video' ? asset.uri : undefined,
      duration: asset.duration || undefined,
      artColor: getArtColor(asset.filename),
      size,
      hasLyrics: asset.mediaType === 'audio' ? lrcMap.get(asset.uri) : undefined,
    };
  });

  onProgress?.(items.length, items.length);
  return items;
}

async function resolveMissingSizes(
  assets: RawAsset[],
  token: CancellationToken
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const missing = assets.filter((a) => !a.fileSize);
  if (missing.length === 0) return result;

  for (let i = 0; i < missing.length; i += SIZE_CONCURRENCY) {
    token.throwIfCancelled();
    const batch = missing.slice(i, i + SIZE_CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(async (a) => {
        const info = await withRetry(() => getInfoAsync(a.uri), {
          maxAttempts: 2,
          baseDelayMs: 150,
          maxDelayMs: 600,
          retryOn: isTransient,
          signal: token.signal,
        });
        return { uri: a.uri, size: info.exists ? (info.size ?? 0) : 0 };
      })
    );
    for (const s of settled) {
      if (s.status === 'fulfilled' && s.value.size) {
        result.set(s.value.uri, s.value.size);
      }
    }
  }
  return result;
}

async function detectLyrics(
  assets: RawAsset[],
  token: CancellationToken
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  if (assets.length === 0) return result;

  for (let i = 0; i < assets.length; i += LRC_CONCURRENCY) {
    token.throwIfCancelled();
    const batch = assets.slice(i, i + LRC_CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(async (a) => {
        const lrcPath = a.uri.replace(/\.[^.]+$/, '.lrc');
        const info = await withRetry(() => getInfoAsync(lrcPath), {
          maxAttempts: 1,
          baseDelayMs: 100,
          signal: token.signal,
        });
        return { uri: a.uri, exists: info.exists };
      })
    );
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value.exists) {
        result.set(r.value.uri, true);
      }
    }
  }
  return result;
}
