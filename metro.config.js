// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Folders that are not part of the mobile app. Skipping them keeps Metro fast
// and avoids OneDrive "cloud-only" placeholder files that Metro cannot read.
const skip = ["grassroots-v2", "functions", "dist", "output", "tmp", "app display", ".video-deps", "docs"];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const extra = skip.map((dir) => new RegExp("^" + esc(path.join(__dirname, dir)) + "([\\\\/].*)?$"));
const existing = config.resolver.blockList;
config.resolver.blockList = [].concat(existing || [], extra);

module.exports = config;
