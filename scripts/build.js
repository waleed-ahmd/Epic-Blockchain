"use strict";

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");

const filesToCopy = [
  "config.example.js",
  "verification-page/verification.html",
  "verification-page/verification.css",
  "verification-page/verification.js",
  "verification-page/merkleUtils.js",
  "verification-page/blockchainClient.js",
  "contracts/MessageIntegrity.sol"
];

function copyFile(relativePath) {
  const source = path.join(projectRoot, relativePath);
  const target = path.join(distDir, relativePath);

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyLocalConfigIfPresent() {
  const source = path.join(projectRoot, "config.js");
  const target = path.join(distDir, "config.js");

  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    console.log("Copied local config.js into dist/config.js.");
    return;
  }

  fs.copyFileSync(path.join(projectRoot, "config.example.js"), target);
  console.log("No local config.js found. Copied config.example.js into dist/config.js.");
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

for (const file of filesToCopy) {
  copyFile(file);
}

copyLocalConfigIfPresent();

console.log("Build complete: dist/");
