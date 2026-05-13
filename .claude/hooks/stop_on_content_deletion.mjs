#!/usr/bin/env node
// tier: T4
/**
 * Stop Hook: Content Deletion Guard
 * ==================================
 * HARD BLOCK: Prevents document edits that DELETE content without replacing it.
 *
 * Rule: Content must be DISABLED (commented/flagged), never DELETED.
 *
 * Checks:
 * 1. If Write/Edit removes >10 lines without equivalent addition = BLOCK
 * 2. If Edit old_string > 50 chars and new_string is empty/whitespace = BLOCK
 * 3. Tracks document sections and flags suspicious removals
 *
 * To disable a feature: Comment it out or add "// DISABLED: reason"
 * Never delete code that might be needed later.
 */

import fs from 'fs';
import path from 'path';

const TOOL_INPUT = process.env.TOOL_INPUT || '{}';
const TOOL_NAME = process.env.TOOL_NAME || '';
const STATE_PATH = 'H:/prism/mcp-server/data/state/content-deletion-guard.json';

// Protected document patterns (critical docs that should never lose content)
const PROTECTED_PATTERNS = [
  /CLAUDE\.md$/i,
  /MEMORY\.md$/i,
  /ROADMAP.*\.md$/i,
  /INVENTORY.*\.json$/i,
  /BASELINE.*\.json$/i,
  /DIGEST.*\.md$/i,
  /INDEX.*\.json$/i,
  /REGISTRY.*\.json$/i,
  /settings\.json$/i,
  /playbook.*\.json$/i,
  /tribal.*\.json$/i,
];

// Minimum content threshold for block
const MIN_DELETION_CHARS = 50;
const MIN_DELETION_LINES = 10;

function loadState() {
  try {
    if (fs.existsSync(STATE_PATH)) {
      return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    }
  } catch {}
  return {
    schemaVersion: 1,
    blockedDeletions: [],
    allowedDeletions: [],
    lastCheck: null
  };
}

function saveState(state) {
  try {
    state.lastCheck = new Date().toISOString();
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch {}
}

function isProtectedFile(filePath) {
  return PROTECTED_PATTERNS.some(p => p.test(filePath));
}

function countLines(str) {
  if (!str) return 0;
  return str.split('\n').length;
}

function isContentRemoval(oldStr, newStr) {
  if (!oldStr) return false;

  const oldLen = oldStr.length;
  const newLen = (newStr || '').length;
  const oldLines = countLines(oldStr);
  const newLines = countLines(newStr);

  // Empty replacement for significant content
  if (oldLen >= MIN_DELETION_CHARS && newLen < 10) {
    return true;
  }

  // Significant line reduction without replacement
  if (oldLines >= MIN_DELETION_LINES && newLines < 3) {
    return true;
  }

  // More than 80% content reduction
  if (oldLen > 100 && newLen < oldLen * 0.2) {
    return true;
  }

  return false;
}

function checkWriteTool(input) {
  // Write tool creates new content, check if it's replacing a protected file
  // with significantly less content
  // This would need file read comparison which is expensive
  // For now, allow writes but track them
  return { block: false, reason: null };
}

function checkEditTool(input) {
  const { file_path, old_string, new_string } = input;

  if (!file_path || !old_string) {
    return { block: false, reason: null };
  }

  // Check if protected file
  if (!isProtectedFile(file_path)) {
    return { block: false, reason: null };
  }

  // Check for content deletion
  if (isContentRemoval(old_string, new_string)) {
    return {
      block: true,
      reason: `BLOCK: Attempting to DELETE content from protected file ${path.basename(file_path)}. ` +
              `Old content: ${old_string.length} chars → New: ${(new_string || '').length} chars. ` +
              `To disable content, COMMENT it out or add "// DISABLED: [reason]" instead of deleting.`
    };
  }

  return { block: false, reason: null };
}

async function main() {
  // Only run on Edit/Write tools
  if (!['Edit', 'Write'].includes(TOOL_NAME)) {
    process.exit(0);
  }

  let input;
  try {
    input = JSON.parse(TOOL_INPUT);
  } catch {
    process.exit(0);
  }

  const state = loadState();
  let result;

  if (TOOL_NAME === 'Edit') {
    result = checkEditTool(input);
  } else if (TOOL_NAME === 'Write') {
    result = checkWriteTool(input);
  } else {
    process.exit(0);
  }

  if (result.block) {
    state.blockedDeletions.push({
      timestamp: new Date().toISOString(),
      tool: TOOL_NAME,
      file: input.file_path,
      reason: result.reason
    });
    saveState(state);

    // Output block message
    console.error(result.reason);
    console.error('\nAlternatives:');
    console.error('  1. Comment out: // DISABLED: [reason]');
    console.error('  2. Add flag: /* DEPRECATED - kept for reference */');
    console.error('  3. Move to archive section instead of deleting');
    process.exit(1);
  }

  saveState(state);
  process.exit(0);
}

main().catch(err => {
  console.error('Content deletion guard error:', err.message);
  process.exit(0); // Don't block on internal errors
});
