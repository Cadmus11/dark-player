const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = {
  resolver: {
    blockList: [
      /react-native-css-interop\/\.cache\/.*/,
    ],
  },
};

const metroConfig = mergeConfig(getDefaultConfig(__dirname), config);

module.exports = withNativeWind(metroConfig, {
  input: './global.css',
});
