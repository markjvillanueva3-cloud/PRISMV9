#!/usr/bin/env node
// tier: T3
/**
 * read-already-have.mjs - PreToolUse Read
 * Warns when trying to re-read a file that was just written or edited.
 * Token savings: 100% (completely unnecessary read)
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const RECENT_FILE = join(process.env.HOME || process.env.USERPROFILE, '.claude', 'cache', 'recent-writes.json');
const WINDOW_MS = 60 * 1000; // 1 minute window

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input, session_id } = input;

// Track writes on Write/Edit PostToolUse
// Check reads on Read PreToolUse

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

// If this is a Read, check if file was recently written
if (tool_name === 'Read') {
  const filePath = tool_input?.file_path;
  if (filePath) {
    // Normalize path for comparison
    const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');

    const recent = recentWrites.files[normalizedPath];
    if (recent && (now - recent.timestamp < WINDOW_MS)) {
      const secondsAgo = Math.round((now - recent.timestamp) / 1000);
      const message = [
        `⚡ File was just ${recent.operation}d ${secondsAgo}s ago:`,
        `  ${filePath}`,
        `  You already have the content from the ${recent.operation} operation.`,
        `  Re-reading wastes tokens. Trust the previous operation succeeded.`,
        `  If you need to verify, check the tool result from ${recent.operation}.`,
      ].join('\n');

      console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: message } }));
      process.exit(0);
    }
  }
}

// Save updated state
try {
  const cacheDir = join(process.env.HOME || process.env.USERPROFILE, '.claude', 'cache');
  if (!existsSync(cacheDir)) {
    const { mkdirSync } = await import('fs');
    mkdirSync(cacheDir, { recursive: true });
  }
  writeFileSync(RECENT_FILE, JSON.stringify(recentWrites, null, 2));
} catch {
  // Ignore write errors
}

console.log(JSON.stringify({ continue: true }));
