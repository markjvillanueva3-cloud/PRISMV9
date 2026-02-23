#!/usr/bin/env node
/**
 * Audit Log Rotation (IMP-R4-2)
 * Rotates audit.jsonl and error.jsonl when they exceed size threshold.
 * Keeps last 5 rotated files. Run at session start.
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join('C:\\PRISM\\state', 'logs');
const MAX_SIZE_MB = 5;
const MAX_ROTATED = 5;
const LOG_FILES = ['audit.jsonl', 'error.jsonl'];

function rotateFile(filePath) {
  if (!fs.existsSync(filePath)) return false;

  const stats = fs.statSync(filePath);
  const sizeMB = stats.size / (1024 * 1024);

  if (sizeMB < MAX_SIZE_MB) return false;

  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rotatedName = `${base}.${dateStr}.${Date.now()}${ext}`;
  const rotatedPath = path.join(dir, rotatedName);

  fs.renameSync(filePath, rotatedPath);
  console.log(`  Rotated ${path.basename(filePath)} (${sizeMB.toFixed(1)}MB) → ${rotatedName}`);

  // Cleanup old rotated files
  const rotated = fs.readdirSync(dir)
    .filter(f => f.startsWith(base + '.') && f !== path.basename(filePath))
    .sort()
    .reverse();

  if (rotated.length > MAX_ROTATED) {
    const toDelete = rotated.slice(MAX_ROTATED);
    toDelete.forEach(f => {
      fs.unlinkSync(path.join(dir, f));
      console.log(`  Deleted old: ${f}`);
    });
  }

  return true;
}

function main() {
  console.log('[LOG-ROTATE] Checking audit log sizes...');

  if (!fs.existsSync(LOG_DIR)) {
    console.log('[LOG-ROTATE] No logs directory yet. Skipping.');
    return;
  }

  let rotated = 0;
  for (const file of LOG_FILES) {
    const fp = path.join(LOG_DIR, file);
    if (rotateFile(fp)) rotated++;
    else if (fs.existsSync(fp)) {
      const sizeMB = (fs.statSync(fp).size / (1024 * 1024)).toFixed(1);
      console.log(`  ${file}: ${sizeMB}MB (OK, threshold: ${MAX_SIZE_MB}MB)`);
    }
  }

  console.log(`[LOG-ROTATE] Done. ${rotated} file(s) rotated.`);
}

main();
