#!/usr/bin/env node
/**
 * State snapshot with verified restore capability (VG-01)
 * Creates timestamped snapshots of critical state files
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STATE_DIR = 'C:\\PRISM\\state';
const SNAPSHOT_DIR = path.join(STATE_DIR, 'snapshots');
const SRC_DIR = 'C:\\PRISM\\mcp-server\\src';

const SNAPSHOT_FILES = [
  // State files
  { src: path.join(STATE_DIR, 'HOT_RESUME.md'), key: 'hot_resume' },
  { src: path.join(STATE_DIR, 'ACTION_TRACKER.md'), key: 'action_tracker' },
  { src: path.join(STATE_DIR, 'CURRENT_STATE.json'), key: 'current_state' },
  // Critical source
  { src: path.join(SRC_DIR, 'tools', 'autoHookWrapper.ts'), key: 'auto_hook_wrapper' },
  { src: path.join(SRC_DIR, 'index.ts'), key: 'index' },
];

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function createSnapshot() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const snapDir = path.join(SNAPSHOT_DIR, `snap-${ts}`);
  fs.mkdirSync(snapDir, { recursive: true });
  
  const manifest = { timestamp: ts, files: {}, verified: false };
  
  for (const { src, key } of SNAPSHOT_FILES) {
    if (fs.existsSync(src)) {
      const content = fs.readFileSync(src);
      const destPath = path.join(snapDir, `${key}${path.extname(src)}`);
      fs.writeFileSync(destPath, content);
      manifest.files[key] = {
        original: src,
        snapshot: destPath,
        hash: hashContent(content),
        size: content.length
      };
    }
  }
  
  // Verify restore capability
  let restoreOk = true;
  for (const [key, info] of Object.entries(manifest.files)) {
    const restored = fs.readFileSync(info.snapshot);
    if (hashContent(restored) !== info.hash) {
      console.error(`[SNAPSHOT] Restore verification FAILED for ${key}`);
      restoreOk = false;
    }
  }
  
  manifest.verified = restoreOk;
  fs.writeFileSync(path.join(snapDir, 'MANIFEST.json'), JSON.stringify(manifest, null, 2));
  
  // Cleanup old snapshots (keep last 5)
  const snaps = fs.readdirSync(SNAPSHOT_DIR).filter(d => d.startsWith('snap-')).sort();
  while (snaps.length > 5) {
    const old = snaps.shift();
    fs.rmSync(path.join(SNAPSHOT_DIR, old), { recursive: true, force: true });
  }
  
  console.log(`[SNAPSHOT] Created: ${snapDir} (${Object.keys(manifest.files).length} files, verified=${restoreOk})`);
  return manifest;
}

if (require.main === module) createSnapshot();
module.exports = { createSnapshot };
