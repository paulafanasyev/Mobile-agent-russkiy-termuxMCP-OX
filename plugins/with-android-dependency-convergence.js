const { withProjectBuildGradle, withAppBuildGradle } = require('@expo/config-plugins');

const GRPC_VERSION = '1.83.1';
const NETTY_VERSION = '4.2.17.Final';

const marker = '// OX2 dependency convergence: gRPC 1.83.1 + Netty 4.2.17.Final';
const packagingMarker = '// OX Android packagingOptions bridge';

module.exports = function withAndroidDependencyConvergence(config) {
  config = withProjectBuildGradle(config, (projectConfig) => {
    if (projectConfig.modResults.language !== 'groovy') {
      throw new Error('OX2 Android dependency convergence requires a Groovy android/build.gradle');
    }

    const contents = projectConfig.modResults.contents;
    if (!contents.includes(marker)) {
      projectConfig.modResults.contents = `${contents}\n\n${marker}\nallprojects {\n  configurations.configureEach {\n    resolutionStrategy.eachDependency { details ->\n      if (details.requested.group == 'io.grpc') {\n        details.useVersion('${GRPC_VERSION}')\n        details.because('Keep all gRPC modules on one supported release line and remove stale 1.39/1.45/1.69 branches')\n      }\n      if (details.requested.group == 'io.netty') {\n        details.useVersion('${NETTY_VERSION}')\n        details.because('Keep all Netty modules on one security-maintained 4.2 release line')\n      }\n    }\n  }\n}\n`;
    }

    return projectConfig;
  });

  config = withAppBuildGradle(config, (appConfig) => {
    if (appConfig.modResults.language !== 'groovy') {
      throw new Error('OX Android packagingOptions bridge requires a Groovy android/app/build.gradle');
    }

    const contents = appConfig.modResults.contents;
    if (!contents.includes(packagingMarker)) {
      appConfig.modResults.contents = `${contents}\n\n${packagingMarker}\nandroid {\n  packagingOptions {\n    ['pickFirsts', 'excludes'].each { prop ->\n      def value = project.findProperty("android.packagingOptions.$prop")\n      if (value) {\n        value.split(',').each {\n          android.packagingOptions[prop] += it\n        }\n      }\n    }\n  }\n}\n`;
    }

    return appConfig;
  });

  return config;
};
