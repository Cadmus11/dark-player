import * as MediaLibrary from 'expo-media-library';
import { getInfoAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import type { FileItem, FileType } from '../types';
import { CancellationToken, isCancelled } from './Cancellation';
import { withRetry } from './RetryService';
import { eventBus, AppEvents } from './EventBus';

const PAGE_SIZE = 200;
const MAX_PAGES = 50;
const SIZE_CONCURRENCY = 4;
const LRC_CONCURRENCY = 12;
const SCAN_TIMEOUT_MS = 60_000;

const ART_COLORS = [
  '#00E5FF',
  '#3B82F6',
  '#8B5CF6',
  '#22D3EE',
  '#A855F7',
  '#38BDF8',
  '#F97316',
  '#22C55E',
  '#EF4444',
  '#FB7185',
  '#00F5D4',
  '#00FF66',
];

function getArtColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ART_COLORS[Math.abs(hash) % ART_COLORS.length];
}

export interface MediaScanOptions {
  type: 'video' | 'audio';
  token?: CancellationToken;
  onProgress?: (loaded: number, hasMore: boolean) => void;
  resolveLrc?: boolean;
}

export interface MediaScanResult {
  items: FileItem[];
  totalPages: number;
  truncated: boolean;
}

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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

async function fetchPage(
  type: 'video' | 'audio',
  after: string | undefined,
  token: CancellationToken
): Promise<MediaLibrary.PagedInfo<MediaLibrary.Asset>> {
  return withRetry(
    () =>
      withTimeout(
        MediaLibrary.getAssetsAsync({
          mediaType: type,
          first: PAGE_SIZE,
          sortBy: ['creationTime'],
          ...(after ? { after } : {}),
        }),
        SCAN_TIMEOUT_MS,
        'getAssetsAsync'
      ),
    {
      maxAttempts: 3,
      baseDelayMs: 400,
      maxDelayMs: 3000,
      retryOn: isTransient,
      onAttempt: (n, e) => {
        if (n > 1) eventBus.emit(AppEvents.SCAN_FAILED, { reason: 'page_fetch_retry', n, e });
      },
      signal: token.signal,
    }
  );
}

async function resolveMissingSizes(
  assets: MediaLibrary.Asset[],
  token: CancellationToken
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const missing: MediaLibrary.Asset[] = [];
  for (const a of assets) {
    const size = (a as MediaLibrary.Asset & { fileSize?: number }).fileSize;
    if (!size) missing.push(a);
  }
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
  items: FileItem[],
  token: CancellationToken
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  if (items.length === 0) return result;
  for (let i = 0; i < items.length; i += LRC_CONCURRENCY) {
    token.throwIfCancelled();
    const batch = items.slice(i, i + LRC_CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(async (it) => {
        const lrcPath = it.uri.replace(/\.[^.]+$/, '.lrc');
        const info = await withRetry(() => getInfoAsync(lrcPath), {
          maxAttempts: 1,
          baseDelayMs: 100,
          signal: token.signal,
        });
        return { uri: it.uri, exists: info.exists };
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

function dedupeAssets(assets: MediaLibrary.Asset[]): MediaLibrary.Asset[] {
  const seen = new Set<string>();
  const out: MediaLibrary.Asset[] = [];
  for (const a of assets) {
    const key = a.id || a.uri;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

function mapAssets(
  assets: MediaLibrary.Asset[],
  type: FileType,
  sizeMap: Map<string, number>,
  lrcMap: Map<string, boolean>
): FileItem[] {
  return assets.map((asset) => {
    const size =
      (asset as MediaLibrary.Asset & { fileSize?: number }).fileSize ?? sizeMap.get(asset.uri);
    return {
      uri: asset.uri,
      name: asset.filename,
      type,
      assetId: asset.id,
      modifiedAt: asset.modificationTime * 1000,
      createdAt: asset.creationTime * 1000,
      thumbnail: type === 'video' ? asset.uri : undefined,
      duration: asset.duration ? asset.duration * 1000 : undefined,
      artColor: getArtColor(asset.filename),
      size,
      hasLyrics: type === 'audio' ? lrcMap.get(asset.uri) : undefined,
    };
  });
}

export async function scanMedia(options: MediaScanOptions): Promise<MediaScanResult> {
  if (Platform.OS === 'web') {
    return { items: [], totalPages: 0, truncated: false };
  }

  const ct = options.token ?? new CancellationToken();
  const assets: MediaLibrary.Asset[] = [];
  let after: string | undefined;
  let totalPages = 0;
  let truncated = false;

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      ct.throwIfCancelled();
      const paged = await fetchPage(options.type, after, ct);
      totalPages++;
      if (paged.assets.length === 0) break;
      assets.push(...paged.assets);
      options.onProgress?.(assets.length, paged.hasNextPage);
      if (!paged.hasNextPage) break;
      if (!paged.endCursor) {
        truncated = true;
        break;
      }
      after = paged.endCursor;
    }

    ct.throwIfCancelled();

    const unique = dedupeAssets(assets);
    const sizeMap = await resolveMissingSizes(unique, ct);
    ct.throwIfCancelled();

    const lrcMap =
      options.type === 'audio' && options.resolveLrc !== false
        ? await detectLyrics(
            unique.map((a) => ({ uri: a.uri }) as FileItem),
            ct
          )
        : new Map<string, boolean>();

    const items = mapAssets(unique, options.type, sizeMap, lrcMap);
    return { items, totalPages, truncated };
  } catch (err) {
    if (isCancelled(err)) throw err;
    eventBus.emit(AppEvents.SCAN_FAILED, { reason: 'scan_media_error', err });
    return { items: [], totalPages, truncated };
  }
}
