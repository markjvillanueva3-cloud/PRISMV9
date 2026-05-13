#!/usr/bin/env node
// tier: T3
/**
 * path-frequency-tracker.mjs - PostToolUse Read/Edit/Write
 * Tracks frequently accessed paths for session optimization.
 * Enables pre-caching of hot files on session start.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const TRACKER_DIR = join(process.env.HOME || process.env.USERPROFILE, '.claude', 'learning');
const TRACKER_FILE = join(TRACKER_DIR, 'path-frequency.json');
const MAX_PATHS = 100;
const DECAY_FACTOR = 0.95; // Older accesses count less

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input } = input;

// Only track file operations
if (!['Read', 'Edit', 'Write'].includes(tool_name)) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const filePath = tool_input?.file_path;
if (!filePath) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Ensure learning directory exists
if (!existsSync(TRACKER_DIR)) {
  mkdirSync(TRACKER_DIR, { recursive: true });
}

// Load tracker
let tracker = { paths: {}, directories: {}, lastDecay: Date.now() };
try {
  if (existsSync(TRACKER_FILE)) {
    tracker = JSON.parse(readFileSync(TRACKER_FILE, 'utf8'));
  }
} catch {
  tracker = { paths: {}, directories: {}, lastDecay: Date.now() };
}

const now = Date.now();
const normalizedPath = filePath.replace(/\\/g, '/');
const dir = dirname(normalizedPath);

// Apply decay daily
const DAY_MS = 24 * 60 * 60 * 1000;
if (now - tracker.lastDecay > DAY_MS) {
  for (const path of Object.keys(tracker.paths)) {
    tracker.paths[path].score *= DECAY_FACTOR;
    if (tracker.paths[path].score < 0.1) {
      delete tracker.paths[path];
    }
  }
  for (const dir of Object.keys(tracker.directories)) {
    tracker.directories[dir].score *= DECAY_FACTOR;
    if (tracker.directories[dir].score < 0.1) {
      delete tracker.directories[dir];
    }
  }
  tracker.lastDecay = now;
}

// Update path frequency
if (!tracker.paths[normalizedPath]) {
  tracker.paths[normalizedPath] = {
    score: 0,
    firstAccess: now,
    lastAccess: now,
    accessCount: 0,
    operations: { Read: 0, Edit: 0, Write: 0 }
  };
}

const pathEntry = tracker.paths[normalizedPath];
pathEntry.score += 1;
pathEntry.lastAccess = now;
pathEntry.accessCount++;
pathEntry.operations[tool_name] = (pathEntry.operations[tool_name] || 0) + 1;

// Update directory frequency
if (!tracker.directories[dir]) {
  tracker.directories[dir] = {
    score: 0,
    fileCount: 0,
    lastAccess: now
  };
}
tracker.directories[dir].score += 0.5;
tracker.directories[dir].lastAccess = now;

// Limit tracked paths
const paths = Object.entries(tracker.paths);
if (paths.length > MAX_PATHS) {
  // Keep highest scored paths
  paths.sort((a, b) => b[1].score - a[1].score);
  tracker.paths = Object.fromEntries(paths.slice(0, MAX_PATHS));
}

// Calculate hot paths for session suggestions
const hotPaths = Object.entries(tracker.paths)
  .filter(([_, entry]) => entry.score >= 3)
  .sort((a, b) => b[1].score - a[1].score)
  .slice(0, 5);

// Save tracker
writeFileSync(TRACKER_FILE, JSON.stringify(tracker, null, 2));

// Only output stats periodically (every 20 accesses to this path)
if (pathEntry.accessCount % 20 === 0 && hotPaths.length >= 3) {
  const message = [
    `📈 Path frequency stats (top ${hotPaths.length}):`,
    ...hotPaths.map(([p, e]) => `  • ${p.split('/').slice(-2).join('/')} (score: ${e.score.toFixed(1)})`),
    `  Tip: Hot paths can be pre-loaded for faster context on session start.`,
  ].join('\n');
  // PostToolUse: bare `message` is not a recognized top-level key — use hookSpecificOutput
  console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: message } }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
