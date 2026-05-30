import RNFS from 'react-native-fs';
import type { VideoEnhancementSettings, VideoQualityTarget, EnhancementJob } from '../types';

const ENHANCED_DIR = `${RNFS.CachesDirectoryPath}enhanced/`;

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
  const exists = await RNFS.exists(ENHANCED_DIR);
  if (!exists) {
    await RNFS.mkdir(ENHANCED_DIR);
  }
}

function generateJobId(): string {
  jobCounter += 1;
  return `enhance_${Date.now()}_${jobCounter}`;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function buildOutputUri(sourceUri: string, qualityTarget: VideoQualityTarget): string {
  const parts = sourceUri.split('/');
  const fileName = parts[parts.length - 1] || 'video.mp4';
  const sanitized = sanitizeFileName(fileName);
  const ext = sanitized.includes('.') ? sanitized.split('.').pop() : 'mp4';
  const base = sanitized.includes('.') ? sanitized.slice(0, sanitized.lastIndexOf('.')) : sanitized;
  const suffix = qualityTarget !== 'original' ? `_${qualityTarget}` : '_enhanced';
  return `${ENHANCED_DIR}${base}${suffix}.${ext || 'mp4'}`;
}

async function ensureFFmpeg(): Promise<boolean> {
  try {
    const FFmpegKit = require('ffmpeg-kit-react-native');
    return !!FFmpegKit;
  } catch {
    return false;
  }
}

function buildFFmpegCommand(
  sourceUri: string,
  outputUri: string,
  settings: VideoEnhancementSettings
): string[] {
  const filters: string[] = [];

  if (settings.colorEnhancement) {
    filters.push('eq=brightness=0.06:saturation=1.3:contrast=1.1');
  }

  if (settings.sharpening) {
    filters.push('unsharp=5:5:1.0:5:5:0.0');
  }

  if (settings.denoise) {
    filters.push('hqdn3d=3:2:3:2');
  }

  if (settings.hdr) {
    filters.push('zscale=t=linear:npl=100,tonemap=hable:desat=0,zscale=t=bt709,format=yuv420p');
  }

  const dims = QUALITY_DIMENSIONS[settings.qualityTarget];
  const scaleFilter =
    settings.qualityTarget !== 'original' && dims.width > 0
      ? `scale=${dims.width}:${dims.height}:flags=lanczos`
      : null;

  let vf = '';
  if (scaleFilter && filters.length > 0) {
    vf = `-vf ${[scaleFilter, ...filters].join(',')}`;
  } else if (scaleFilter) {
    vf = `-vf ${scaleFilter}`;
  } else if (filters.length > 0) {
    vf = `-vf ${filters.join(',')}`;
  }

  const cmd = ['-i', sourceUri];
  if (vf) cmd.push(...vf.split(' '));
  cmd.push(
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '23',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-y',
    outputUri
  );

  return cmd;
}

export const VideoEnhancementService = {
  getQualityOptions: () => QUALITY_DIMENSIONS,

  isAvailable: async (): Promise<boolean> => {
    try {
      const hasFFmpeg = await ensureFFmpeg();
      return hasFFmpeg;
    } catch {
      return false;
    }
  },

  enhanceVideo: async (
    sourceUri: string,
    settings: VideoEnhancementSettings,
    onProgress?: (progress: number) => void,
    onLog?: (log: string) => void
  ): Promise<EnhancementJob> => {
    const jobId = generateJobId();
    const job: EnhancementJob = {
      id: jobId,
      sourceUri,
      outputUri: buildOutputUri(sourceUri, settings.qualityTarget),
      settings,
      status: 'processing',
      progress: 0,
      createdAt: Date.now(),
    };

    await ensureDirectory();

    const hasFFmpeg = await ensureFFmpeg();

    if (!hasFFmpeg) {
      onLog?.('FFmpeg not available. Copying file as fallback.');
      const dest = job.outputUri;
      await RNFS.copyFile(sourceUri, dest);
      job.status = 'completed';
      job.progress = 1;
      onProgress?.(1);
      return job;
    }

    try {
      const FFmpegKit = require('ffmpeg-kit-react-native');
      const cmd = buildFFmpegCommand(sourceUri, job.outputUri, settings);

      const session = await FFmpegKit.FFmpegKit.executeAsync(
        cmd.join(' '),
        async (session: any) => {
          const returnCode = await session.getReturnCode();
          if (returnCode?.isValueSuccess()) {
            job.status = 'completed';
            job.progress = 1;
            onProgress?.(1);
            onLog?.('Enhancement completed successfully');
          } else {
            job.status = 'failed';
            const logs = await session.getAllLogsAsString();
            onLog?.(`FFmpeg failed: ${logs}`);
          }
        },
        (log: any) => {
          const text = log.getMessage();
          onLog?.(text);
          const match = text.match(/time=(\d+):(\d+):(\d+)/);
          if (match) {
            onProgress?.(0.5);
          }
        }
      );

      onProgress?.(0.1);
    } catch (error) {
      job.status = 'failed';
      onLog?.(`Enhancement error: ${error}`);
    }

    return job;
  },

  getEnhancedFileUri: async (
    sourceUri: string,
    settings: VideoEnhancementSettings
  ): Promise<string | null> => {
    const outputUri = buildOutputUri(sourceUri, settings.qualityTarget);
    const exists = await RNFS.exists(outputUri);
    if (exists) {
      return outputUri;
    }
    return null;
  },

  clearCache: async (): Promise<void> => {
    await ensureDirectory();
    const files = await RNFS.readDir(ENHANCED_DIR);
    await Promise.all(files.map((f) => RNFS.unlink(f.path)));
  },

  getCacheSize: async (): Promise<number> => {
    await ensureDirectory();
    const files = await RNFS.readDir(ENHANCED_DIR);
    let total = 0;
    for (const f of files) {
      total += f.size || 0;
    }
    return total;
  },
};
