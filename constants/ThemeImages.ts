import { ImageRequireSource } from 'react-native';

export interface ThemeImagePreset {
  key: string;
  name: string;
  source: ImageRequireSource;
}

const images: Record<string, ThemeImagePreset> = {
  angel: { key: 'angel', name: 'Angel', source: require('../assets/theme_images/angel.jpg') },
  cubic: { key: 'cubic', name: 'Cubic', source: require('../assets/theme_images/cubic.jpg') },
  download: { key: 'download', name: 'Download', source: require('../assets/theme_images/download.jpg') },
  flower: { key: 'flower', name: 'Flower', source: require('../assets/theme_images/flower.jpg') },
  g_wagon: { key: 'g_wagon', name: 'G-Wagon', source: require('../assets/theme_images/g_wagon.jpg') },
  gradient: { key: 'gradient', name: 'Gradient', source: require('../assets/theme_images/gradient.jpg') },
  hex: { key: 'hex', name: 'Hex', source: require('../assets/theme_images/hex.jpg') },
  life: { key: 'life', name: 'Life', source: require('../assets/theme_images/life.jpg') },
  nissan: { key: 'nissan', name: 'Nissan', source: require('../assets/theme_images/nissan.jpg') },
  porsche: { key: 'porsche', name: 'Porsche', source: require('../assets/theme_images/porsche.jpg') },
  red: { key: 'red', name: 'Red', source: require('../assets/theme_images/red.jpg') },
  samurai: { key: 'samurai', name: 'Samurai', source: require('../assets/theme_images/samurai.jpg') },
  ship: { key: 'ship', name: 'Ship', source: require('../assets/theme_images/ship.jpg') },
  smile: { key: 'smile', name: 'Smile', source: require('../assets/theme_images/smile.jpg') },
  street: { key: 'street', name: 'Street', source: require('../assets/theme_images/street.jpg') },
};

export const PRESET_IMAGE_LIST: ThemeImagePreset[] = Object.values(images);

export function getPresetImage(key: string): ThemeImagePreset | undefined {
  return images[key];
}

export function getPresetImageSource(key: string): ImageRequireSource | undefined {
  return images[key]?.source;
}
