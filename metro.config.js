const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = {};

const metroConfig = mergeConfig(getDefaultConfig(__dirname), config);

module.exports = withNativeWind(metroConfig, {
  input: './global.css',
});
