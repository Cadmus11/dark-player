import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';
import { CancellationToken, isCancelled } from './Cancellation';
import { withRetry } from './RetryService';
import { eventBus, AppEvents } from './EventBus';

const PAGE_SIZE = 200;
const MAX_PAGES = 50;
const SCAN_TIMEOUT_MS = 60_000;

export interface RawAsset {
  id: string;
  uri: string;
  filename: string;
  mediaType: 'video' | 'audio';
  duration: number;
  modificationTime: number;
  creationTime: number;
  fileSize?: number;
}

export interface FetchResult {
  assets: RawAsset[];
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

export async function fetchRawAssets(
  type: 'video' | 'audio',
  token?: CancellationToken,
  onProgress?: (loaded: number, hasMore: boolean) => void
): Promise<FetchResult> {
  if (Platform.OS === 'web') {
    return { assets: [], totalPages: 0, truncated: false };
  }

  const ct = token ?? new CancellationToken();
  const rawAssets: MediaLibrary.Asset[] = [];
  let after: string | undefined;
  let totalPages = 0;
  let truncated = false;

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      ct.throwIfCancelled();
      const paged = await fetchPage(type, after, ct);
      totalPages++;
      if (paged.assets.length === 0) break;
      rawAssets.push(...paged.assets);
      onProgress?.(rawAssets.length, paged.hasNextPage);
      if (!paged.hasNextPage) break;
      if (!paged.endCursor) {
        truncated = true;
        break;
      }
      after = paged.endCursor;
    }

    ct.throwIfCancelled();
    const unique = dedupeAssets(rawAssets);

    const assets: RawAsset[] = unique.map((a) => ({
      id: a.id,
      uri: a.uri,
      filename: a.filename,
      mediaType: type,
      duration: a.duration ? a.duration * 1000 : 0,
      modificationTime: a.modificationTime * 1000,
      creationTime: a.creationTime * 1000,
      fileSize: (a as any).fileSize || undefined,
    }));

    return { assets, totalPages, truncated };
  } catch (err) {
    if (isCancelled(err)) throw err;
    eventBus.emit(AppEvents.SCAN_FAILED, { reason: 'fetch_raw_error', err });
    return { assets: [], totalPages, truncated };
  }
}
