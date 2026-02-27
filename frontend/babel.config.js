module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Vision Camera Frame Processor Plugin
      ['react-native-worklets-core/plugin'],
      // Reanimated plugin must be last
      ['react-native-reanimated/plugin', {
        globals: ['__scanCodes', '__scanFaces', '__scanBarcodes'],
      }],
    ],
  };
};
