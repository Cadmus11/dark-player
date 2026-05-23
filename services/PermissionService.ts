import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';
import { eventBus, AppEvents } from './EventBus';

export type PermissionStatus = 'UNKNOWN' | 'REQUESTING' | 'GRANTED' | 'PARTIAL' | 'DENIED' | 'BLOCKED';

interface PermissionState {
  mediaLibrary: PermissionStatus;
  notification: PermissionStatus;
  lastChecked: number;
}

type PermissionListener = (state: PermissionState) => void;

const CHECK_COOLDOWN = 30_000;

class PermissionServiceClass {
  private static instance: PermissionServiceClass;
  private _state: PermissionState = {
    mediaLibrary: 'UNKNOWN',
    notification: 'UNKNOWN',
    lastChecked: 0,
  };
  private _listeners = new Set<PermissionListener>();

  static getInstance(): PermissionServiceClass {
    if (!PermissionServiceClass.instance) {
      PermissionServiceClass.instance = new PermissionServiceClass();
    }
    return PermissionServiceClass.instance;
  }

  subscribe(listener: PermissionListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private _notify(): void {
    this._listeners.forEach((cb) => cb({ ...this._state }));
  }

  getState(): Readonly<PermissionState> {
    return { ...this._state };
  }

  async checkMediaLibrary(): Promise<PermissionStatus> {
    if (Platform.OS === 'web') {
      this._state.mediaLibrary = 'GRANTED';
      this._notify();
      return 'GRANTED';
    }

    const now = Date.now();
    if (now - this._state.lastChecked < CHECK_COOLDOWN && this._state.mediaLibrary !== 'UNKNOWN') {
      return this._state.mediaLibrary;
    }

    try {
      this._state.lastChecked = now;
      const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync();

      if (status === 'granted') {
        this._state.mediaLibrary = 'GRANTED';
      } else if (status === 'limited') {
        this._state.mediaLibrary = 'PARTIAL';
      } else if (canAskAgain) {
        this._state.mediaLibrary = 'DENIED';
      } else {
        this._state.mediaLibrary = 'BLOCKED';
      }
    } catch {
      this._state.mediaLibrary = 'DENIED';
    }

    this._notify();
    eventBus.emit(AppEvents.PERMISSIONS_CHANGED, this._state);
    return this._state.mediaLibrary;
  }

  async requestMediaLibrary(): Promise<PermissionStatus> {
    if (Platform.OS === 'web') {
      this._state.mediaLibrary = 'GRANTED';
      this._notify();
      return 'GRANTED';
    }

    if (this._state.mediaLibrary === 'BLOCKED') {
      return 'BLOCKED';
    }

    try {
      this._state.mediaLibrary = 'REQUESTING';
      this._notify();
      this._state.lastChecked = Date.now();

      const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();

      if (status === 'granted') {
        this._state.mediaLibrary = 'GRANTED';
      } else if (status === 'limited') {
        this._state.mediaLibrary = 'PARTIAL';
      } else if (canAskAgain) {
        this._state.mediaLibrary = 'DENIED';
      } else {
        this._state.mediaLibrary = 'BLOCKED';
      }
    } catch {
      this._state.mediaLibrary = 'DENIED';
    }

    this._notify();
    eventBus.emit(AppEvents.PERMISSIONS_CHANGED, this._state);
    return this._state.mediaLibrary;
  }

  isGranted(): boolean {
    return this._state.mediaLibrary === 'GRANTED' || this._state.mediaLibrary === 'PARTIAL';
  }

  canScan(): boolean {
    return this._state.mediaLibrary === 'GRANTED' || this._state.mediaLibrary === 'PARTIAL' || this._state.mediaLibrary === 'UNKNOWN';
  }

  reset(): void {
    this._state = { mediaLibrary: 'UNKNOWN', notification: 'UNKNOWN', lastChecked: 0 };
    this._notify();
  }
}

export const permissionService = PermissionServiceClass.getInstance();
