import { MetadataService } from './Metadata/MetadataService';
import { mediaRepository } from './MediaRepository';
import { backgroundTaskManager } from './BackgroundTaskManager';
import { eventBus, AppEvents } from './EventBus';
import type { FileItem } from '../types';

class MetadataQueueClass {
  private static instance: MetadataQueueClass;
  private _processed = new Set<string>();
  private _processing = false;

  static getInstance(): MetadataQueueClass {
    if (!MetadataQueueClass.instance) {
      MetadataQueueClass.instance = new MetadataQueueClass();
    }
    return MetadataQueueClass.instance;
  }

  enqueueCritical(file: FileItem): void {
    if (this._processed.has(file.uri)) return;
    backgroundTaskManager.enqueue(
      async () => {
        await this._processOne(file);
      },
      { priority: 'critical' }
    );
  }

  enqueueHigh(files: FileItem[]): void {
    const unprocessed = files.filter((f) => !this._processed.has(f.uri));
    for (const file of unprocessed) {
      backgroundTaskManager.enqueue(
        async () => {
          await this._processOne(file);
        },
        { priority: 'high' }
      );
    }
  }

  enqueueBatch(files: FileItem[], onProgress?: (done: number, total: number) => void): void {
    const unprocessed = files.filter((f) => !this._processed.has(f.uri));
    if (unprocessed.length === 0) return;

    let done = 0;
    const total = unprocessed.length;

    for (const file of unprocessed) {
      backgroundTaskManager.enqueue(
        async () => {
          await this._processOne(file);
          done++;
          onProgress?.(done, total);
        },
        { priority: 'low' }
      );
    }
  }

  enqueueVisible(files: FileItem[]): void {
    const unprocessed = files.filter((f) => !this._processed.has(f.uri));
    for (const file of unprocessed) {
      backgroundTaskManager.enqueue(
        async () => {
          await this._processOne(file);
        },
        { priority: 'normal' }
      );
    }
  }

  private async _processOne(file: FileItem): Promise<void> {
    if (this._processed.has(file.uri)) return;

    try {
      const cached = mediaRepository.getMetadata(file.uri);
      if (cached) {
        this._processed.add(file.uri);
        mediaRepository.updateMetadata(file.uri, cached);
        return;
      }

      const metadata = await MetadataService.extract(file.uri, file.name);
      this._processed.add(file.uri);
      mediaRepository.setMetadata(file.uri, metadata);
      mediaRepository.updateMetadata(file.uri, metadata);
      eventBus.emit(AppEvents.METADATA_PARSED, file.uri, metadata);
    } catch (e) {
      console.warn('[MetadataQueue]', e);
    }
  }

  markProcessed(uri: string): void {
    this._processed.add(uri);
  }

  clearProcessed(): void {
    this._processed.clear();
  }

  get processedCount(): number {
    return this._processed.size;
  }

  cancelAll(): void {
    backgroundTaskManager.cancelAll();
  }
}

export const metadataQueue = MetadataQueueClass.getInstance();
