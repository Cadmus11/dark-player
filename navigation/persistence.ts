import { MMKV } from 'react-native-mmkv';
import type { NavigationState, PartialState } from '@react-navigation/native';

const storage = new MMKV({ id: 'navigation-state' });
const STATE_KEY = '@nav_state';
const STATE_VERSION = 1;

type PersistableState = NavigationState | PartialState<NavigationState> | undefined;

export function loadNavigationState(): PersistableState {
  try {
    const version = storage.getNumber('version');
    if (version !== STATE_VERSION) {
      storage.delete(STATE_KEY);
      storage.set('version', STATE_VERSION);
      return undefined;
    }
    const raw = storage.getString(STATE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return undefined;
    return parsed as PersistableState;
  } catch {
    return undefined;
  }
}

export function saveNavigationState(state: NavigationState | undefined): void {
  if (!state) {
    storage.delete(STATE_KEY);
    return;
  }
  try {
    storage.set(STATE_KEY, JSON.stringify(state));
  } catch {
    // quota or serialization issue: drop state, do not crash
  }
}

export function clearNavigationState(): void {
  storage.delete(STATE_KEY);
}
