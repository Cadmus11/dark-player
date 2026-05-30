import {
  cacheDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  deleteAsync,
  copyAsync,
  readDirectoryAsync,
} from 'expo-file-system/legacy';
import type { VideoEnhancementSettings, VideoQualityTarget, EnhancementJob } from '../types';

const ENHANCED_DIR = `${cacheDirectory || ''}enhanced/`;

const QUALITY_DIMENSIONS: Record<
  VideoQualityTarget,
  { width: number; height: number; label: string }
> = {
  original: { width: 0, height: 0, label: 'Original' },
  hd: { width: 1280, height: 720, label: 'HD (720p)' },
  fullhd: { width: 1920, height: 1080, label: 'Full HD (1080p)' },
  '4k': { width: 3840, height: 2160, label: '4K (2160p)' },
};

let jobCounter = 0;

async function ensureDirectory(): Promise<void> {
  const info = await getInfoAsync(ENHANCED_DIR);
  if (!info.exists) {
    await makeDirectoryAsync(ENHANCED_DIR);
  }
}

function generateJobId(): string {
  jobCounter += 1;
  return `enhance_${Date.now()}_${jobCounter}`;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function buildOutputUri(sourceUri: string, _qualityTarget: VideoQualityTarget): string {
  const parts = sourceUri.split('/');
  const fileName = parts[parts.length - 1] || 'video.mp4';
  const sanitized = sanitizeFileName(fileName);
  const ext = sanitized.includes('.') ? sanitized.split('.').pop() : 'mp4';
  const base = sanitized.includes('.') ? sanitized.slice(0, sanitized.lastIndexOf('.')) : sanitized;
  return `${ENHANCED_DIR}${base}_enhanced.${ext || 'mp4'}`;
}

export const VideoEnhancementService = {
  getQualityOptions: () => QUALITY_DIMENSIONS,

  isAvailable: async (): Promise<boolean> => {
    return false;
  },

  enhanceVideo: async (
    sourceUri: string,
    _settings: VideoEnhancementSettings,
    onProgress?: (progress: number) => void,
    onLog?: (log: string) => void
  ): Promise<EnhancementJob> => {
    const jobId = generateJobId();
    const job: EnhancementJob = {
      id: jobId,
      sourceUri,
      outputUri: buildOutputUri(sourceUri, _settings.qualityTarget),
      settings: _settings,
      status: 'processing',
      progress: 0,
      createdAt: Date.now(),
    };

    await ensureDirectory();

    onLog?.('Enhancing not available. Copying file.');
    const dest = job.outputUri;
    await copyAsync({ from: sourceUri, to: dest });
    job.status = 'completed';
    job.progress = 1;
    onProgress?.(1);

    return job;
  },

  getEnhancedFileUri: async (
    sourceUri: string,
    settings: VideoEnhancementSettings
  ): Promise<string | null> => {
    const outputUri = buildOutputUri(sourceUri, settings.qualityTarget);
    const info = await getInfoAsync(outputUri);
    if (info.exists) {
      return outputUri;
    }
    return null;
  },

  clearCache: async (): Promise<void> => {
    await ensureDirectory();
    const names = await readDirectoryAsync(ENHANCED_DIR);
    await Promise.all(names.map((name) => deleteAsync(ENHANCED_DIR + name, { idempotent: true })));
  },

  getCacheSize: async (): Promise<number> => {
    await ensureDirectory();
    const names = await readDirectoryAsync(ENHANCED_DIR);
    let total = 0;
    for (const name of names) {
      const info = await getInfoAsync(ENHANCED_DIR + name);
      if (info.exists) total += info.size;
    }
    return total;
  },
};
