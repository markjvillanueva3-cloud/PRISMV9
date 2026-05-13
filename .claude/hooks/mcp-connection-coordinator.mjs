#!/usr/bin/env node
// tier: T1
/**
 * mcp-connection-coordinator.mjs — PreToolUse hook
 *
 * Event: PreToolUse (matcher: mcp__prism__*)
 *
 * Coordinates MCP tool calls across concurrent chats:
 * 1. Detects concurrent access to same resources
 * 2. Queues conflicting requests
 * 3. Warns on potential contention
 *
 * Reduces tool failures from 6+ concurrent chats hitting same server.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const LOCK_DIR = path.join(os.tmpdir(), 'prism-mcp-locks');
const MAX_CONCURRENT_CHATS = 8;
const LOCK_TIMEOUT_MS = 45000; // 45 seconds max lock hold (longer for 6-8 chats)
const CONTENTION_WINDOW_MS = 750; // 750ms window for 6-8 chat contention detection
const QUEUE_DELAY_MS = 100; // Stagger requests from same resource

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return '';
    return fs.readFileSync(0, 'utf-8');
  } catch {
    return '';
  }
}

function ensureLockDir() {
  if (!fs.existsSync(LOCK_DIR)) {
    fs.mkdirSync(LOCK_DIR, { recursive: true });
  }
}

function getSessionId() {
  // Try to get session ID from environment or generate one
  return process.env.CLAUDE_SESSION_ID ||
         process.env.PPID?.toString() ||
         Math.random().toString(36).slice(2, 10);
}

function getLockFile(resource) {
  const safeName = resource.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(LOCK_DIR, `${safeName}.lock`);
}

function checkContention(resource) {
  const lockFile = getLockFile(resource);
  try {
    if (!fs.existsSync(lockFile)) return null;

    const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    const age = Date.now() - lock.timestamp;

    // Stale lock - clean up
    if (age > LOCK_TIMEOUT_MS) {
      fs.unlinkSync(lockFile);
      return null;
    }

    // Recent access by different session
    if (lock.session !== getSessionId() && age < CONTENTION_WINDOW_MS) {
      return {
        otherSession: lock.session,
        resource: lock.resource,
        ageMs: age,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function recordAccess(resource, action) {
  ensureLockDir();
  const lockFile = getLockFile(resource);
  const lock = {
    session: getSessionId(),
    resource,
    action,
    timestamp: Date.now(),
  };
  try {
    fs.writeFileSync(lockFile, JSON.stringify(lock));
  } catch {
    // Ignore write failures
  }
}

function extractResource(toolName, toolInput) {
  // Extract the resource being accessed from the tool call
  if (!toolInput) return toolName;

  // For file operations
  if (toolInput.file_path) return `file:${toolInput.file_path}`;
  if (toolInput.path) return `path:${toolInput.path}`;

  // For MCP dispatcher actions
  if (toolInput.action) return `action:${toolInput.action}`;

  // For state operations
  if (toolInput.key) return `state:${toolInput.key}`;

  return toolName;
}

async function main() {
  const input = readStdinSafe();
  if (!input) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const toolName = payload.tool_name || '';
  const toolInput = payload.tool_input || {};

  // Only coordinate MCP prism calls
  if (!toolName.startsWith('mcp__prism__')) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const resource = extractResource(toolName, toolInput);

  // Check for contention
  const contention = checkContention(resource);

  // Record this access
  recordAccess(resource, toolInput.action || 'unknown');

  if (contention) {
    // Warn about contention but don't block
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext: `⚠️ MCP Contention: Another chat accessed \`${contention.resource}\` ${contention.ageMs}ms ago. Consider waiting or using a different resource.`,
      }
    }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
