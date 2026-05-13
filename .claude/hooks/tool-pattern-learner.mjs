#!/usr/bin/env node
// tier: T3
/**
 * tool-pattern-learner.mjs - PostToolUse (all tools)
 * Tracks tool sequences and suggests shortcuts for common patterns.
 * Learning hook - improves over time.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const PATTERNS_DIR = join(process.env.HOME || process.env.USERPROFILE, '.claude', 'learning');
const PATTERNS_FILE = join(PATTERNS_DIR, 'tool-patterns.json');
const MAX_SEQUENCE_LENGTH = 5;
const MIN_PATTERN_COUNT = 3; // Suggest after seeing pattern 3+ times

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input, session_id } = input;

if (!tool_name) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Ensure learning directory exists
if (!existsSync(PATTERNS_DIR)) {
  mkdirSync(PATTERNS_DIR, { recursive: true });
}

// Load patterns
let patterns = { sequences: [], shortcuts: {}, lastUpdate: Date.now() };
try {
  if (existsSync(PATTERNS_FILE)) {
    patterns = JSON.parse(readFileSync(PATTERNS_FILE, 'utf8'));
  }
} catch {
  patterns = { sequences: [], shortcuts: {}, lastUpdate: Date.now() };
}

// Create a signature for this tool call
const signature = createSignature(tool_name, tool_input);

// Add to recent sequence
patterns.sequences.push({
  tool: tool_name,
  signature,
  timestamp: Date.now()
});

// Keep only recent entries
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const now = Date.now();
patterns.sequences = patterns.sequences.filter(s => now - s.timestamp < WINDOW_MS);

// Limit sequence length
if (patterns.sequences.length > MAX_SEQUENCE_LENGTH * 3) {
  patterns.sequences = patterns.sequences.slice(-MAX_SEQUENCE_LENGTH * 3);
}

// Analyze for patterns
const recentSequence = patterns.sequences.slice(-MAX_SEQUENCE_LENGTH).map(s => s.signature);
const sequenceKey = recentSequence.join(' → ');

// Track this sequence
if (!patterns.shortcuts[sequenceKey]) {
  patterns.shortcuts[sequenceKey] = { count: 0, firstSeen: now, tools: recentSequence };
}
patterns.shortcuts[sequenceKey].count++;
patterns.shortcuts[sequenceKey].lastSeen = now;

// Check for known efficient shortcuts
const suggestions = [];

// Common inefficient patterns
const inefficientPatterns = {
  'Glob → Read → Read → Read': 'Consider: Read files in parallel or use Agent for multi-file analysis',
  'Grep → Read → Grep → Read': 'Consider: Single Grep with broader pattern, then selective Read',
  'Edit → Edit → Edit': 'Consider: Batch edits into single Edit with larger old_string/new_string',
  'Read → Edit → Read': 'Consider: Skip the post-edit Read - Edit success means content is updated',
  'Bash:git status → Bash:git diff': 'Consider: rtk git status includes key diff info',
  'Agent → Agent → Agent': 'Consider: Single Agent with comprehensive prompt, or parallel Agents',
};

for (const [pattern, suggestion] of Object.entries(inefficientPatterns)) {
  if (sequenceKey.includes(pattern.split(' → ').slice(0, 3).join(' → '))) {
    suggestions.push(suggestion);
  }
}

// Check if this is a frequently repeated pattern
const patternCount = patterns.shortcuts[sequenceKey]?.count || 0;
if (patternCount >= MIN_PATTERN_COUNT && recentSequence.length >= 3) {
  suggestions.push(`Pattern "${sequenceKey}" seen ${patternCount} times - consider creating a skill or script`);
}

// Save patterns
patterns.lastUpdate = now;
writeFileSync(PATTERNS_FILE, JSON.stringify(patterns, null, 2));

if (suggestions.length > 0) {
  const message = [
    `📊 Tool pattern insight:`,
    ...suggestions.map(s => `  • ${s}`),
  ].join('\n');
  console.log(JSON.stringify({ continue: true, systemMessage: message }));
} else {
  console.log(JSON.stringify({ continue: true }));
}

function createSignature(toolName, input) {
  // Create a compact signature for pattern matching
  switch (toolName) {
    case 'Bash':
      const cmd = (input?.command || '').split(' ')[0];
      return `Bash:${cmd}`;
    case 'Read':
    case 'Write':
    case 'Edit':
      return toolName;
    case 'Grep':
      return 'Grep';
    case 'Glob':
      return 'Glob';
    case 'Agent':
      return `Agent:${input?.subagent_type || 'general'}`;
    default:
      return toolName;
  }
}
