// module.exports = function (api) {
//   api.cache(true);
//   let plugins = [];

//   plugins.push('react-native-worklets/plugin');

//   return {
//     presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],

//     plugins,
//   };
// };

// module.exports = function (api) {
//   api.cache(true);

//   return {
//     presets: ['babel-preset-expo'],
//     plugins: ['nativewind/babel', 'react-native-reanimated/plugin', 'react-native-worklets/plugin'],
//   };
// };



module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],

    plugins: [
      // 1. NativeWind must be first
      'nativewind/babel',

      // 2. Reanimated must come BEFORE worklets
      'react-native-reanimated/plugin',

      // 3. Worklets last
      'react-native-worklets/plugin',
    ],
  };
};