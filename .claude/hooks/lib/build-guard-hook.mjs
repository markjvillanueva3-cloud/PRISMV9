#!/usr/bin/env node
// tier: T3
/**
 * build-guard-hook.mjs — PostToolUse Write|Edit
 * Calls BuildGuardChainEngine.trackEdit() to track edits and suggest tests.
 * After 3 edits: suggest tests. After 5: require. After 12: block without review.
 */
import * as fs from 'fs';
const { writeFileSync, mkdirSync, existsSync } = fs;

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const TRACKER_PATH = 'H:/prism/state/build-guard-tracker.json';
const _raw = readStdinSafe();
if (!_raw) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}
const input = JSON.parse(_raw);

const filePath = (input.tool_input?.file_path || '').replace(/\\/g, '/');
if (!filePath.endsWith('.ts') || !filePath.includes('mcp-server/src/') || filePath.includes('.test.')) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Load tracker
let tracker = { session_edits: 0, edits_since_test: 0, edits_since_review: 0, edited_files: [], engines_written: [], test_files_written: [], last_edit_timestamp: '' };
try { tracker = JSON.parse(readFileSync(TRACKER_PATH, 'utf-8')); } catch {}

const basename = filePath.split('/').pop();
const isEngine = filePath.includes('/engines/') && !filePath.includes('.test.');

tracker.session_edits++;
tracker.edits_since_test++;
tracker.edits_since_review++;
if (!tracker.edited_files.includes(filePath)) tracker.edited_files.push(filePath);
if (isEngine && !tracker.engines_written.includes(basename)) tracker.engines_written.push(basename);
tracker.last_edit_timestamp = new Date().toISOString();
tracker.edited_files = tracker.edited_files.slice(-20);

mkdirSync('H:/prism/state', { recursive: true });
writeFileSync(TRACKER_PATH, JSON.stringify(tracker, null, 2));

const count = tracker.edits_since_test;
const reviewCount = tracker.edits_since_review;

if (reviewCount >= 12) {
  console.log(JSON.stringify({ additionalContext: `BUILD GUARD: ${reviewCount} edits without review. Run /prism-review before continuing.` }));
} else if (count >= 5) {
  const files = tracker.edited_files.slice(-5).map(f => f.split('/').pop()).join(', ');
  console.log(JSON.stringify({ additionalContext: `BUILD GUARD: ${count} edits without tests. Edited: ${files}. Run affected tests now.` }));
} else if (count >= 3) {
  console.log(JSON.stringify({ additionalContext: `BUILD GUARD: ${count} edits since last test run. Consider running tests soon.` }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
