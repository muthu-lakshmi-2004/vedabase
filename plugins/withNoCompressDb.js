const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Prevents Android's build system (AAPT) from compressing .db files
 * inside the APK. Without this, sqlite database assets get corrupted
 * when copied via expo-file-system in a release build, even though
 * everything works fine in dev mode.
 */
module.exports = function withNoCompressDb(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const contents = config.modResults.contents;

      if (!contents.includes('aaptOptions')) {
        config.modResults.contents = contents.replace(
          /android\s*\{/,
          `android {\n    aaptOptions {\n        noCompress "db"\n    }`
        );
      } else if (!contents.includes('noCompress "db"')) {
        config.modResults.contents = contents.replace(
          /aaptOptions\s*\{/,
          `aaptOptions {\n        noCompress "db"`
        );
      }
    }
    return config;
  });
};