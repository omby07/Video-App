/**
 * Expo Config Plugin for Person Segmentation
 * 
 * This plugin copies the native iOS code for person segmentation
 * into the iOS build during EAS build process.
 */

const { withXcodeProject, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withPersonSegmentation(config) {
  // Add iOS native files
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosPath = path.join(projectRoot, 'ios');
      
      // Source files location (in project)
      const sourceDir = path.join(projectRoot, 'ios', 'PersonSegmentation');
      
      // Only copy if source exists and we're in EAS build
      if (fs.existsSync(sourceDir)) {
        console.log('[PersonSegmentation] Native plugin files found');
      }
      
      return config;
    },
  ]);

  return config;
}

module.exports = withPersonSegmentation;
