/**
 * Bumps the patch version in app.json (and package.json) so each build
 * has a higher CFBundleShortVersionString for App Store submission.
 * Run before: eas build --platform ios --profile production
 *
 * Usage: node scripts/bump-version.js
 */
const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const packageJsonPath = path.join(__dirname, '..', 'package.json');

function bumpPatch(version) {
  const parts = version.split('.').map(Number);
  if (parts.length < 3) parts.push(0);
  parts[2] = (parts[2] || 0) + 1;
  return parts.join('.');
}

// app.json
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const current = appJson.expo.version;
const next = bumpPatch(current);
appJson.expo.version = next;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
console.log(`app.json: ${current} → ${next}`);

// package.json (keep in sync)
if (fs.existsSync(packageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  pkg.version = next;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`package.json: ${current} → ${next}`);
}
