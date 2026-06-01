type EventHandler = (...args: any[]) => void;

export const AppEvents = {
  TRACK_CHANGED: 'track:changed',
  PLAYBACK_STARTED: 'playback:started',
  PLAYBACK_PAUSED: 'playback:paused',
  PLAYBACK_STOPPED: 'playback:stopped',
  PLAYBACK_FAILED: 'playback:failed',
  SCAN_STARTED: 'scan:started',
  SCAN_COMPLETED: 'scan:completed',
  SCAN_FAILED: 'scan:failed',
  QUEUE_CHANGED: 'queue:changed',
  PERMISSIONS_CHANGED: 'permissions:changed',
  ARTWORK_LOADED: 'artwork:loaded',
  ARTWORK_FAILED: 'artwork:failed',
  LIFECYCLE_FOREGROUND: 'lifecycle:foreground',
  LIFECYCLE_BACKGROUND: 'lifecycle:background',
  LIFECYCLE_INACTIVE: 'lifecycle:inactive',
  SETTINGS_CHANGED: 'settings:changed',
  FAVORITES_CHANGED: 'favorites:changed',
  STORAGE_PRESSURE: 'storage:pressure',
  MEMORY_WARNING: 'memory:warning',
  HYDRATION_PHASE: 'hydration:phase',
  COLOR_THEME_CHANGED: 'color:theme:changed',
  ARTWORK_COLORS_EXTRACTED: 'artwork:colors:extracted',
  MOOD_CHANGED: 'mood:changed',
} as const;

export type AppEvent = (typeof AppEvents)[keyof typeof AppEvents];

class EventBusService {
  private _listeners = new Map<string, Set<EventHandler>>();
  private _onceListeners = new Map<string, Set<EventHandler>>();
  private _enabled = true;

  on(event: AppEvent, handler: EventHandler): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(handler);
    return () => {
      this._listeners.get(event)?.delete(handler);
    };
  }

  once(event: AppEvent, handler: EventHandler): () => void {
    if (!this._onceListeners.has(event)) {
      this._onceListeners.set(event, new Set());
    }
    const wrapped = (...args: any[]) => {
      handler(...args);
      this._onceListeners.get(event)?.delete(wrapped);
    };
    this._onceListeners.get(event)!.add(wrapped);
    return () => {
      this._onceListeners.get(event)?.delete(wrapped);
    };
  }

  emit(event: AppEvent, ...args: any[]): void {
    if (!this._enabled) return;
    this._listeners.get(event)?.forEach((handler) => {
      try {
        handler(...args);
      } catch {}
    });
    this._onceListeners.get(event)?.forEach((handler) => {
      try {
        handler(...args);
      } catch {}
    });
    this._onceListeners.get(event)?.clear();
  }

  off(event: AppEvent, handler: EventHandler): void {
    this._listeners.get(event)?.delete(handler);
    this._onceListeners.get(event)?.delete(handler);
  }

  removeAll(event?: AppEvent): void {
    if (event) {
      this._listeners.delete(event);
      this._onceListeners.delete(event);
    } else {
      this._listeners.clear();
      this._onceListeners.clear();
    }
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  listenerCount(event: AppEvent): number {
    return (this._listeners.get(event)?.size || 0) + (this._onceListeners.get(event)?.size || 0);
  }
}

export const eventBus = new EventBusService();
