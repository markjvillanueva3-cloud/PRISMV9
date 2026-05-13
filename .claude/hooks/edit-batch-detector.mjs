#!/usr/bin/env node
// tier: T3
/**
 * edit-batch-detector.mjs - PostToolUse Edit
 * Detects multiple small edits to same file, suggests batching.
 * Token savings: 30-50% on multi-edit patterns
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const TRACKER_DIR = join(process.env.HOME || process.env.USERPROFILE, '.claude', 'cache');
const TRACKER_FILE = join(TRACKER_DIR, 'edit-batch-tracker.json');
const WINDOW_MS = 60 * 1000; // 1 minute window
const BATCH_THRESHOLD = 3; // Warn after 3 edits to same file

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input, session_id } = input;

if (tool_name !== 'Edit') {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const filePath = tool_input?.file_path;
if (!filePath) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Ensure cache directory exists
if (!existsSync(TRACKER_DIR)) {
  mkdirSync(TRACKER_DIR, { recursive: true });
}

// Load tracker
let tracker = { files: {}, lastClean: Date.now() };
try {
  if (existsSync(TRACKER_FILE)) {
    tracker = JSON.parse(readFileSync(TRACKER_FILE, 'utf8'));
  }
} catch {
  tracker = { files: {}, lastClean: Date.now() };
}

const now = Date.now();
const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');

// Clean old entries
if (now - tracker.lastClean > WINDOW_MS * 2) {
  const expired = [];
  for (const [path, entry] of Object.entries(tracker.files)) {
    if (now - entry.lastEdit > WINDOW_MS) {
      expired.push(path);
    }
  }
  for (const path of expired) {
    delete tracker.files[path];
  }
  tracker.lastClean = now;
}

// Track this edit
if (!tracker.files[normalizedPath]) {
  tracker.files[normalizedPath] = {
    count: 0,
    firstEdit: now,
    lastEdit: now,
    edits: []
  };
}

const entry = tracker.files[normalizedPath];

// Reset if outside window
if (now - entry.lastEdit > WINDOW_MS) {
  entry.count = 0;
  entry.firstEdit = now;
  entry.edits = [];
}

entry.count++;
entry.lastEdit = now;
entry.edits.push({
  timestamp: now,
  oldStringPreview: (tool_input?.old_string || '').substring(0, 50)
});

// Keep only recent edits
entry.edits = entry.edits.slice(-10);

// Save tracker
writeFileSync(TRACKER_FILE, JSON.stringify(tracker, null, 2));

// Warn if over threshold
if (entry.count >= BATCH_THRESHOLD) {
  const timeSpan = Math.round((now - entry.firstEdit) / 1000);
  const message = [
    `🔄 Multiple edits detected: ${entry.count} edits to same file in ${timeSpan}s`,
    `  File: ${filePath}`,
    `  Consider: Combine related changes into a single Edit call`,
    `  Benefits: Fewer round-trips, easier to review, atomic changes`,
    `  Tip: Plan all changes first, then make one comprehensive edit`,
  ].join('\n');

  console.log(JSON.stringify({ message }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
