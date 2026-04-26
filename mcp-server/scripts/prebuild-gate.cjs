/**
 * Prebuild gate - validates build prerequisites
 * Minimal implementation - passes through if no critical issues
 */
'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// Check tsconfig.json exists
const tsconfigPath = path.join(rootDir, 'tsconfig.json');
if (!fs.existsSync(tsconfigPath)) {
  console.error('ERROR: tsconfig.json not found');
  process.exit(1);
}

// Check src directory exists
const srcDir = path.join(rootDir, 'src');
if (!fs.existsSync(srcDir)) {
  console.error('ERROR: src/ directory not found');
  process.exit(1);
}

console.log('✓ Prebuild gate passed');
