import * as Haptics from 'expo-haptics';

export function hapticLight() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function hapticMedium() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function hapticHeavy() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}

export function hapticSelection() {
  Haptics.selectionAsync().catch(() => {});
}

export function hapticNotification(type: 'success' | 'warning' | 'error' = 'success') {
  const style =
    type === 'success'
      ? Haptics.NotificationFeedbackType.Success
      : type === 'warning'
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Error;
  Haptics.notificationAsync(style).catch(() => {});
}
