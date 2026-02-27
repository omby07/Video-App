module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Worklets core plugin for frame processors
      ['react-native-worklets-core/plugin'],
      // Reanimated plugin with selfie segmentation global
      [
        'react-native-reanimated/plugin',
        {
          globals: ['__getSelfieSegmentation'],
        },
      ],
    ],
  };
};
