// craco.config.js
const fs = require("fs");
const Module = require("module");
const path = require("path");
require("dotenv").config();

const hasTsConfig = fs.existsSync(path.resolve(__dirname, "tsconfig.json"));

if (!process.env.DISABLE_ESLINT_PLUGIN) {
  process.env.DISABLE_ESLINT_PLUGIN = "true";
}

if (!hasTsConfig) {
  const originalModuleLoad = Module._load;
  const NoopForkTsCheckerPlugin = class NoopForkTsCheckerPlugin {
    apply() {}

    static getCompilerHooks() {
      return {
        issues: {
          tap() {},
        },
      };
    }
  };

  // CRA eagerly requires ForkTsChecker even for JS projects. On newer Node
  // runtimes that transitive dependency can crash before the webpack config is
  // fully assembled, so we short-circuit it for this repo's JS-only setup.
  Module._load = function patchedModuleLoad(request, parent, isMain) {
    const parentFilename = parent?.filename || "";

    if (
      request === "react-dev-utils/ForkTsCheckerWebpackPlugin" ||
      request === "react-dev-utils/ForkTsCheckerWarningWebpackPlugin"
    ) {
      return NoopForkTsCheckerPlugin;
    }

    if (
      request === "ajv-keywords" &&
      /node_modules\/(?:babel-loader|file-loader|fork-ts-checker-webpack-plugin)\//.test(parentFilename)
    ) {
      return () => {};
    }

    return originalModuleLoad.call(this, request, parent, isMain);
  };
}

// Check if we're in development/preview mode (not production build)
// Craco sets NODE_ENV=development for start, NODE_ENV=production for build
const isDevServer = process.env.NODE_ENV !== "production";

// Environment variable overrides
const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

let webpackConfig = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      // This project is JavaScript-only. Removing the TypeScript checker avoids
      // a known schema-utils / ajv mismatch during CRA production builds.
      webpackConfig.plugins = webpackConfig.plugins.filter(
        (plugin) => plugin?.constructor?.name !== "ForkTsCheckerWebpackPlugin"
      );

      // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
        ],
      };

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }
      return webpackConfig;
    },
  },
};

if (process.env.DISABLE_ESLINT_PLUGIN !== "true") {
  webpackConfig.eslint = {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  };
}

webpackConfig.devServer = (devServerConfig) => {
  // Add health check endpoints if enabled
  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      // Call original setup if exists
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }

      // Setup health endpoints
      setupHealthEndpoints(devServer, healthPluginInstance);

      return middlewares;
    };
  }

  return devServerConfig;
};

module.exports = webpackConfig;
