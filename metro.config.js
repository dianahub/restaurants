const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const emptyShim = path.resolve(__dirname, "shims/empty.js");

config.resolver.extraNodeModules = {
  assert: require.resolve("assert"),
  fs: emptyShim,
  path: emptyShim,
  os: emptyShim,
  net: emptyShim,
  tls: emptyShim,
  child_process: emptyShim,
  dns: emptyShim,
  http2: emptyShim,
};

module.exports = config;
