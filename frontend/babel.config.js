module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Worklets core plugin for frame processors
      ['react-native-worklets-core/plugin'],
      // Reanimated plugin with segmentPerson as a worklet function
      [
        'react-native-reanimated/plugin',
        {
          globals: ['segmentPerson'],
        },
      ],
    ],
  };
};
