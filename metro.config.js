const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const emptyShim = path.resolve(__dirname, "shims/empty.js");

// Node.js core modules and packages that don't exist in React Native
const shimmedModules = new Set([
  "assert",
  "child_process",
  "cluster",
  "crypto",
  "csv-parse",
  "csv-stringify",
  "dgram",
  "dns",
  "fs",
  "http",
  "http2",
  "https",
  "inquirer",
  "net",
  "os",
  "path",
  "readline",
  "stream",
  "stream/promises",
  "tls",
  "worker_threads",
  "zlib",
]);

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (shimmedModules.has(moduleName)) {
    return { type: "sourceFile", filePath: emptyShim };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
