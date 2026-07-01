#!/usr/bin/env node
// tier: T4
/**
 * chat-state-isolator.mjs — SessionStart hook
 *
 * Event: SessionStart
 *
 * Creates chat-specific state directories to prevent cross-chat conflicts:
 * 1. Creates isolated state directory for this chat session
 * 2. Sets environment hints for other hooks
 * 3. Cleans up stale chat directories (>48h old)
 *
 * State isolation prevents 6+ concurrent chats from clobbering each other.
 */

import fs from 'node:fs';
import path from 'node:path';

const STATE_ROOT = 'H:/prism/state/chat-isolated';
const MAX_CONCURRENT_CHATS = 8;
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours
const MANIFEST_FILE = 'H:/prism/state/chat-isolated/CHAT_MANIFEST.json';

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return '';
    return fs.readFileSync(0, 'utf-8');
  } catch {
    return '';
  }
}

function getSessionId() {
  // Extract from environment or stdin
  try {
    const input = readStdinSafe();
    if (input) {
      const payload = JSON.parse(input);
      if (payload.session_id) return payload.session_id;
    }
  } catch {}

  return process.env.CLAUDE_SESSION_ID ||
         `chat-${Date.now().toString(36)}`;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function cleanStaleDirectories() {
  try {
    if (!fs.existsSync(STATE_ROOT)) return 0;

    const now = Date.now();
    let cleaned = 0;

    const dirs = fs.readdirSync(STATE_ROOT);
    for (const dir of dirs) {
      // Skip manifest file
      if (dir === 'CHAT_MANIFEST.json') continue;

      const dirPath = path.join(STATE_ROOT, dir);
      try {
        const stats = fs.statSync(dirPath);
        if (stats.isDirectory() && (now - stats.mtimeMs) > STALE_THRESHOLD_MS) {
          fs.rmSync(dirPath, { recursive: true, force: true });
          updateManifest(dir, 'remove');
          cleaned++;
        }
      } catch {
        // Skip if can't read stats
      }
    }

    return cleaned;
  } catch {
    return 0;
  }
}

function updateManifest(sessionId, action) {
  try {
    let manifest = { chats: {}, lastUpdated: null };
    if (fs.existsSync(MANIFEST_FILE)) {
      manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
    }

    if (action === 'add') {
      manifest.chats[sessionId] = {
        started: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        pid: process.ppid,
      };
    } else if (action === 'remove') {
      delete manifest.chats[sessionId];
    }

    manifest.lastUpdated = new Date().toISOString();
    manifest.activeCount = Object.keys(manifest.chats).length;

    // Warn if exceeding expected concurrent chats
    if (manifest.activeCount > MAX_CONCURRENT_CHATS) {
      manifest.warning = `${manifest.activeCount} chats active (expected max ${MAX_CONCURRENT_CHATS})`;
    }

    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
    return manifest.activeCount;
  } catch {
    return -1;
  }
}

function createChatState(sessionId) {
  const chatDir = path.join(STATE_ROOT, sessionId);
  ensureDir(chatDir);

  // Create standard subdirectories
  ensureDir(path.join(chatDir, 'claims'));
  ensureDir(path.join(chatDir, 'cache'));
  ensureDir(path.join(chatDir, 'temp'));

  // Write session marker
  const marker = {
    session_id: sessionId,
    created: new Date().toISOString(),
    pid: process.ppid,
  };
  fs.writeFileSync(
    path.join(chatDir, 'session.json'),
    JSON.stringify(marker, null, 2)
  );

  // Update global manifest
  updateManifest(sessionId, 'add');

  return chatDir;
}

async function main() {
  const sessionId = getSessionId();

  // Clean stale directories first
  const cleaned = cleanStaleDirectories();

  // Create isolated state for this chat
  const chatDir = createChatState(sessionId);

  // Get active chat count from manifest
  let activeCount = 1;
  try {
    if (fs.existsSync(MANIFEST_FILE)) {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
      activeCount = manifest.activeCount || 1;
    }
  } catch {}

  // Report setup
  const lines = [];
  lines.push(`**Chat Isolation:** \`${sessionId.slice(0, 8)}\` (${activeCount}/${MAX_CONCURRENT_CHATS} active)`);
  if (cleaned > 0) {
    lines.push(`Cleaned ${cleaned} stale`);
  }
  if (activeCount > MAX_CONCURRENT_CHATS) {
    lines.push(`⚠️ Exceeding expected chat limit`);
  }

  // Silence knob (TOKEN-EFFICIENCY-INJECT/U-KNOB-CLOSE) -- the dir-isolation work
  // above is load-bearing and ALWAYS runs; this only drops the context line.
  if (process.env.PRISM_CHAT_STATE_ISOLATOR_SILENT === '1') {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: lines.join(' | '),
    }
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
