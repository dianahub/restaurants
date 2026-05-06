const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const emptyShim = path.resolve(__dirname, "shims/empty.js");

config.resolver.extraNodeModules = {
  assert: require.resolve("assert"),
  // Node-only modules used by @irys/sdk, arbundles, and other Metaplex transitive deps
  fs: emptyShim,
  path: emptyShim,
  os: emptyShim,
  net: emptyShim,
  tls: emptyShim,
  child_process: emptyShim,
  dns: emptyShim,
  http2: emptyShim,
  stream: emptyShim,
  "stream/promises": emptyShim,
  zlib: emptyShim,
  http: emptyShim,
  https: emptyShim,
  crypto: emptyShim,
  readline: emptyShim,
  worker_threads: emptyShim,
  cluster: emptyShim,
  dgram: emptyShim,
  "csv-parse": emptyShim,
  "csv-stringify": emptyShim,
  inquirer: emptyShim,
};

module.exports = config;
