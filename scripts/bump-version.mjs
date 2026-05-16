#!/usr/bin/env node
// Usage: node scripts/bump-version.mjs <version>
// Example: node scripts/bump-version.mjs 1.2.0
// Updates version in both package.json and src/manifest.json.

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: node scripts/bump-version.mjs <major.minor.patch>');
  process.exit(1);
}

function updateJson(filePath, updater) {
  const abs = resolve(root, filePath);
  const json = JSON.parse(readFileSync(abs, 'utf8'));
  updater(json);
  writeFileSync(abs, JSON.stringify(json, null, 2) + '\n');
  console.log(`Updated ${filePath} → ${json.version}`);
}

updateJson('package.json', (pkg) => { pkg.version = version; });

// Chrome manifest accepts "1.2.3" or "1.2" but not "1.2.3.0"-style extras.
updateJson('src/manifest.json', (manifest) => { manifest.version = version; });
