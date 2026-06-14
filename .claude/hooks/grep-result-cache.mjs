#!/usr/bin/env node
// tier: T3
/**
 * grep-result-cache.mjs - PostToolUse Grep
 * Detects repeated identical Grep searches within a 5-min TTL and nudges to
 * reuse the prior result. NOTE: PostToolUse fires AFTER the Grep ran, so it
 * cannot un-run the repeat -- this is a post-hoc repeat-grep NUDGE, not a
 * token-returning cache. Savings are realized only if the model heeds it.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { dirname, join } from 'path';

const CACHE_DIR = process.env.PRISM_GREP_CACHE_DIR || join(process.env.HOME || process.env.USERPROFILE, '.claude', 'cache');
const CACHE_FILE = join(CACHE_DIR, 'grep-cache.json');
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 50;

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  // Fail-soft (R12): a malformed/empty PostToolUse payload must not crash the
  // hook and silently kill the grep cache for the turn. Mirrors the sibling
  // grep-index-first.mjs stdin guard.
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}
const { tool_name, tool_input, tool_result } = input;

if (tool_name !== 'Grep') {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Ensure cache directory exists
if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
}

// Load cache
let cache = { entries: {}, lastClean: Date.now() };
try {
  if (existsSync(CACHE_FILE)) {
    cache = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
  }
} catch {
  cache = { entries: {}, lastClean: Date.now() };
}

// Create cache key from grep parameters
const cacheKey = createHash('md5')
  .update(JSON.stringify({
    pattern: tool_input?.pattern,
    path: tool_input?.path,
    glob: tool_input?.glob,
    type: tool_input?.type,
  }))
  .digest('hex');

const now = Date.now();

// Clean old entries periodically
if (now - cache.lastClean > CACHE_TTL_MS) {
  const expired = [];
  for (const [key, entry] of Object.entries(cache.entries)) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      expired.push(key);
    }
  }
  for (const key of expired) {
    delete cache.entries[key];
  }
  cache.lastClean = now;
}

// Check if this was a cache hit (we record on first search, warn on repeat)
const existing = cache.entries[cacheKey];
if (existing && (now - existing.timestamp < CACHE_TTL_MS)) {
  // This is a repeat search within TTL
  const timeSince = Math.round((now - existing.timestamp) / 1000);
  console.log(JSON.stringify({ continue: true, systemMessage: `⚡ Repeated grep detected (same search ${timeSince}s ago). Result count: ${existing.resultCount}. Consider reusing previous results.`
  }));

  // Update hit count
  existing.hits = (existing.hits || 0) + 1;
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  process.exit(0);
}

// Record this search — tool_result may be undefined (e.g., Grep returned no content field)
let resultText = '';
if (typeof tool_result === 'string') {
  resultText = tool_result;
} else if (tool_result && typeof tool_result === 'object') {
  resultText = JSON.stringify(tool_result);
}
const resultCount = resultText ? (resultText.match(/\n/g) || []).length : 0;

cache.entries[cacheKey] = {
  pattern: tool_input?.pattern,
  path: tool_input?.path || '.',
  timestamp: now,
  resultCount,
  hits: 0
};

// Limit cache size
const keys = Object.keys(cache.entries);
if (keys.length > MAX_CACHE_ENTRIES) {
  // Remove oldest entries
  const sorted = keys.sort((a, b) => cache.entries[a].timestamp - cache.entries[b].timestamp);
  for (let i = 0; i < keys.length - MAX_CACHE_ENTRIES; i++) {
    delete cache.entries[sorted[i]];
  }
}

writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
console.log(JSON.stringify({ continue: true }));
