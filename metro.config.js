const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// eslint-disable-next-line no-undef
const config = getDefaultConfig(__dirname);

// config.resolver.unstable_enablePackageExports disabled to fix react-native-track-player ESM resolution

module.exports = withNativeWind(config, { input: './global.css' });
