import { AppState, AppStateStatus } from 'react-native';
import { eventBus, AppEvents } from './EventBus';

type LifecycleListener = (state: LifecycleState) => void;

export type LifecycleState = 'active' | 'background' | 'inactive';

class LifecycleManagerClass {
  private static instance: LifecycleManagerClass;
  private _appState: AppStateStatus = 'active';
  private _lifecycleState: LifecycleState = 'active';
  private _listeners = new Set<LifecycleListener>();
  private _subscription: any = null;
  private _initialized = false;

  static getInstance(): LifecycleManagerClass {
    if (!LifecycleManagerClass.instance) {
      LifecycleManagerClass.instance = new LifecycleManagerClass();
    }
    return LifecycleManagerClass.instance;
  }

  initialize(): void {
    if (this._initialized) return;
    this._initialized = true;
    this._subscription = AppState.addEventListener('change', this._handleChange);
  }

  private _handleChange = (next: AppStateStatus): void => {
    const prev = this._appState;
    this._appState = next;

    if (next === 'active' && prev !== 'active') {
      this._lifecycleState = 'active';
      eventBus.emit(AppEvents.LIFECYCLE_FOREGROUND);
    } else if (next === 'background') {
      this._lifecycleState = 'background';
      eventBus.emit(AppEvents.LIFECYCLE_BACKGROUND);
    } else if (next === 'inactive') {
      this._lifecycleState = 'inactive';
      eventBus.emit(AppEvents.LIFECYCLE_INACTIVE);
    }

    this._notify();
  };

  private _notify(): void {
    this._listeners.forEach((cb) => cb(this._lifecycleState));
  }

  subscribe(listener: LifecycleListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  getState(): LifecycleState {
    return this._lifecycleState;
  }

  isActive(): boolean {
    return this._lifecycleState === 'active';
  }

  isBackground(): boolean {
    return this._lifecycleState === 'background';
  }

  cleanup(): void {
    if (this._subscription) {
      this._subscription.remove();
      this._subscription = null;
    }
    this._listeners.clear();
    this._initialized = false;
  }
}

export const lifecycleManager = LifecycleManagerClass.getInstance();
