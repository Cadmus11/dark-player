import { enableScreens, enableFreeze, screensEnabled } from 'react-native-screens';
import { Platform } from 'react-native';

let _initialized = false;

export function setupNavigation(): void {
  if (_initialized) return;
  _initialized = true;

  if (Platform.OS === 'web') return;

  try {
    if (!screensEnabled()) {
      enableScreens(true);
    }
    enableFreeze(true);
  } catch (e) {
    console.warn('[Navigation] screens init failed:', e);
  }
}
