#!/usr/bin/env node
// tier: T3
/**
 * write-tracker.mjs - PostToolUse Write/Edit
 * Tracks recently written/edited files for read-already-have detection.
 * Companion hook to read-already-have.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const CACHE_DIR = join(process.env.HOME || process.env.USERPROFILE, '.claude', 'cache');
const RECENT_FILE = join(CACHE_DIR, 'recent-writes.json');
const WINDOW_MS = 60 * 1000; // 1 minute window

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input } = input;

// Only track Write and Edit
if (!['Write', 'Edit'].includes(tool_name)) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const filePath = tool_input?.file_path;
if (!filePath) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Ensure cache directory exists
if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
}

// Load recent writes
let recentWrites = { files: {}, lastClean: Date.now() };
try {
  if (existsSync(RECENT_FILE)) {
    recentWrites = JSON.parse(readFileSync(RECENT_FILE, 'utf8'));
  }
} catch {
  recentWrites = { files: {}, lastClean: Date.now() };
}

const now = Date.now();
const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');

// Clean old entries
if (now - recentWrites.lastClean > WINDOW_MS * 2) {
  const expired = [];
  for (const [path, entry] of Object.entries(recentWrites.files)) {
    if (now - entry.timestamp > WINDOW_MS) {
      expired.push(path);
    }
  }
  for (const path of expired) {
    delete recentWrites.files[path];
  }
  recentWrites.lastClean = now;
}

// Record this write/edit
recentWrites.files[normalizedPath] = {
  operation: tool_name === 'Write' ? 'write' : 'edit',
  timestamp: now
};

// Save
writeFileSync(RECENT_FILE, JSON.stringify(recentWrites, null, 2));

console.log(JSON.stringify({ continue: true }));
