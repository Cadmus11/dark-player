// const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
// const { withNativeWind } = require('nativewind/metro');
// const path = require('path');

// const config = {
//   resolver: {
//     blockList: [/react-native-css-interop\/\.cache\/.*/],
//   },
// };

// const metroConfig = mergeConfig(getDefaultConfig(__dirname), config);

// module.exports = withNativeWind(metroConfig, {
//   input: './global.css',
// });

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [/react-native-css-interop\/\.cache\/.*/];

config.resolver.sourceExts = Array.from(new Set([...(config.resolver.sourceExts || []), 'wasm']));

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === '@gorhom/bottom-sheet') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'shims/gorhom-bottom-sheet.web.tsx'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
  input: './global.css',
});
