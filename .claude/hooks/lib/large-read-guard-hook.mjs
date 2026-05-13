#!/usr/bin/env node
// tier: T1
/**
 * large-read-guard-hook.mjs — PreToolUse Read
 * Warns when reading a file without offset/limit that is likely large.
 * Saves tokens by encouraging targeted reads instead of full-file dumps.
 */
import * as fs from 'fs';

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch { return ""; }
}

const _raw = readStdinSafe();
if (!_raw) { console.log(JSON.stringify({ continue: true })); process.exit(0); }
const input = JSON.parse(_raw);

const filePath = (input.tool_input?.file_path || '').replace(/\\/g, '/');
const hasOffset = input.tool_input?.offset !== undefined;
const hasLimit = input.tool_input?.limit !== undefined;

// Skip if already using offset/limit, or if it's an image/pdf/notebook
if (hasOffset || hasLimit || !filePath) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const skipExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.ipynb', '.json'];
if (skipExtensions.some(ext => filePath.toLowerCase().endsWith(ext))) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Check file size and line count
try {
  const winPath = filePath.replace(/\//g, '\\');
  const stats = fs.statSync(winPath);
  const sizeKB = stats.size / 1024;

  // For text files, count actual lines
  let lineCount = 0;
  if (sizeKB < 500) { // Only count lines for files under 500KB
    try {
      const content = fs.readFileSync(winPath, 'utf-8');
      lineCount = content.split('\n').length;
    } catch {
      lineCount = Math.round(stats.size / 80); // fallback estimate
    }
  } else {
    lineCount = Math.round(stats.size / 80); // estimate for very large files
  }

  if (lineCount > 500) {
    // Large file (>500 lines) — warn and suggest targeted read
    console.log(JSON.stringify({
      continue: true,
      additionalContext: `FILE SIZE GUARD: ${filePath.split('/').pop()} has ${lineCount} lines (${Math.round(sizeKB)}KB). Files >500 lines should use offset/limit to read only the relevant section. Consider: which specific function/section do you need?`
    }));
  } else if (sizeKB > 50) {
    // Smaller line count but still large KB — might be dense
    console.log(JSON.stringify({
      continue: true,
      additionalContext: `TOKEN SAVE: ${filePath.split('/').pop()} is ${Math.round(sizeKB)}KB (${lineCount} lines). Consider using offset/limit for targeted reads.`
    }));
  } else {
    console.log(JSON.stringify({ continue: true }));
  }
} catch {
  // File might not exist yet or path resolution failed — allow the read
  console.log(JSON.stringify({ continue: true }));
}
