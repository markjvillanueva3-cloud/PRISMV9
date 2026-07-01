#!/usr/bin/env node
// tier: T4
/**
 * rtk-path-ensure.mjs — SessionStart hook
 *
 * H: drive is portable between work PC and home PC.
 * RTK hook outputs `rtk <cmd>` but rtk must be in bash PATH.
 * This hook ensures rtk symlink exists in a PATH directory.
 */

import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';

const RTK_SOURCE = '/h/.tools/rtk/rtk.exe';
const RTK_SOURCE_WIN = 'H:\\.tools\\rtk\\rtk.exe';

// Check if rtk source exists
if (!existsSync(RTK_SOURCE_WIN) && !existsSync('/h/.tools/rtk/rtk.exe')) {
  console.log('⚠ RTK not found at H:\\.tools\\rtk\\rtk.exe');
  process.exit(0);
}

// Check if rtk is already in PATH
try {
  execSync('which rtk', { windowsHide: true, encoding: 'utf8', stdio: 'pipe' });
  // Already available, nothing to do
  process.exit(0);
} catch {
  // Not in PATH, need to create symlink
}

// Find a suitable bin directory in PATH
const pathDirs = (process.env.PATH || '').split(/[;:]/);
const candidates = [
  join(homedir(), 'bin'),
  '/c/Users/wompu/bin',
  '/c/Users/Admin/bin',
  '/usr/local/bin',
  '/mingw64/bin'
];

let targetDir = null;
for (const dir of candidates) {
  // Check if dir exists and is in PATH
  const normalizedDir = dir.replace(/\\/g, '/').toLowerCase();
  const inPath = pathDirs.some(p =>
    p.replace(/\\/g, '/').toLowerCase() === normalizedDir ||
    p.replace(/\\/g, '/').toLowerCase().includes(normalizedDir)
  );

  if (inPath) {
    try {
      execSync(`mkdir -p "${dir}"`, { windowsHide: true, stdio: 'pipe' });
      targetDir = dir;
      break;
    } catch {
      continue;
    }
  }
}

if (!targetDir) {
  // Create ~/bin and hope it's in PATH
  targetDir = join(homedir(), 'bin').replace(/\\/g, '/');
  try {
    execSync(`mkdir -p "${targetDir}"`, { windowsHide: true, stdio: 'pipe' });
  } catch {
    console.log('⚠ Could not create bin directory for rtk symlink');
    process.exit(0);
  }
}

// Create symlink
const targetPath = `${targetDir}/rtk`;
try {
  execSync(`ln -sf "${RTK_SOURCE}" "${targetPath}"`, { windowsHide: true, stdio: 'pipe' });
  console.log(`✓ RTK symlinked: ${targetPath} → ${RTK_SOURCE}`);
} catch (err) {
  console.log(`⚠ Failed to symlink rtk: ${err.message}`);
}
