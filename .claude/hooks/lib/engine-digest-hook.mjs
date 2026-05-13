#!/usr/bin/env node
// tier: T1
/**
 * engine-digest-hook.mjs — PreToolUse Read
 * When reading an engine file, injects a 1-line summary from ENGINE_DIGEST.md
 * to help understand the engine's purpose before reading the full file.
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

// Only process engine files
if (!filePath.includes('/engines/') || !filePath.endsWith('.ts')) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Skip test files
if (filePath.includes('.test.') || filePath.includes('__tests__')) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Extract engine name from filename
const fileName = filePath.split('/').pop().replace('.ts', '');

// Try to find the engine in ENGINE_DIGEST.md
const digestPaths = [
  'H:/prism/data/docs/ENGINE_DIGEST.md',
  'H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md'
];

let digest = null;
for (const digestPath of digestPaths) {
  try {
    const content = fs.readFileSync(digestPath.replace(/\//g, '\\'), 'utf-8');
    // Look for pattern: - **EngineName**: description
    const pattern = new RegExp(`^- \\*\\*${fileName}\\*\\*:\\s*(.+)$`, 'm');
    const match = content.match(pattern);
    if (match) {
      digest = match[1].trim();
      break;
    }
  } catch {
    // File not found, try next path
  }
}

if (digest) {
  console.log(JSON.stringify({
    continue: true,
    additionalContext: `ENGINE DIGEST: ${fileName} — ${digest}`
  }));
} else {
  // Engine not in digest (orphan or new) — still allow read
  console.log(JSON.stringify({
    continue: true,
    additionalContext: `ENGINE: ${fileName} (not in ENGINE_DIGEST.md — may be new or orphaned)`
  }));
}
