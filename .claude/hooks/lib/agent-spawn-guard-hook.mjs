#!/usr/bin/env node
// tier: T1
/**
 * agent-spawn-guard-hook.mjs — PreToolUse Agent
 * Tracks agent spawn frequency. Warns when 3+ agents spawned in quick
 * succession — suggests using direct tools (Read/Grep/Glob) which are
 * cheaper and faster for simple lookups.
 */
import * as fs from 'fs';
const { writeFileSync, existsSync, mkdirSync } = fs;
import { dirname } from 'path';

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch { return ""; }
}

const _raw = readStdinSafe();
if (!_raw) { console.log(JSON.stringify({ continue: true })); process.exit(0); }
const input = JSON.parse(_raw);

const TRACKER_PATH = 'H:/prism/state/agent-spawn-tracker.json';

// Load tracker
let tracker = { spawns: [], total_session: 0 };
try { tracker = JSON.parse(readFileSync(TRACKER_PATH, 'utf-8')); } catch {}

const now = Date.now();

// Record this spawn
tracker.spawns.push(now);
tracker.total_session++;

// Keep only last 10 spawns
tracker.spawns = tracker.spawns.slice(-10);

// Check frequency — 3+ agents in last 2 minutes
const twoMinAgo = now - 120000;
const recentCount = tracker.spawns.filter(t => t > twoMinAgo).length;

// Save tracker
const dir = dirname(TRACKER_PATH);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
writeFileSync(TRACKER_PATH, JSON.stringify(tracker, null, 2));

if (recentCount >= 3) {
  const desc = (input.tool_input?.description || input.tool_input?.prompt || '').substring(0, 80);
  console.log(JSON.stringify({
    continue: true,
    additionalContext: `TOKEN SAVE: ${recentCount} agents spawned in 2 min (${tracker.total_session} total this session). Agents cost 5-50x more tokens than direct tools. For simple file lookups, use Read/Grep/Glob directly. Reserve agents for complex multi-step research.`
  }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
