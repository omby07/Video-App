module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Worklets core plugin for frame processors (must be before reanimated)
      ['react-native-worklets-core/plugin'],
      // Reanimated plugin must be last
      'react-native-reanimated/plugin',
    ],
  };
};
