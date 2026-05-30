// module.exports = function (api) {
//   api.cache(true);
//   let plugins = [];

//   plugins.push('react-native-worklets/plugin');

//   return {
//     presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],

//     plugins,
//   };
// };

module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel', 'react-native-reanimated/plugin', 'react-native-worklets/plugin'],
  };
};
