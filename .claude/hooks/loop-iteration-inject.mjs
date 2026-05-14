#!/usr/bin/env node
// tier: T2
/**
 * loop-iteration-inject.mjs — UserPromptSubmit hook for /loop awareness.
 *
 * Fires when the user types `/loop` (with or without interval). Surfaces:
 *   - any paused/active loop state for this session (sessionId from stdin)
 *   - global list of running loops (so a chat doesn't accidentally start a 2nd)
 *   - reminder of Karpathy R10 (checkpoint between iterations)
 *
 * Non-blocking. Adds context only — never refuses the prompt.
 *
 * Output schema: { hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: string } }
 *
 * Env knobs:
 *   PRISM_LOOP_INJECT_DISABLE=1  → skip entirely
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

const LOOP_STATE_HELPER = path.join("H:", "prism", ".claude", "helpers", "loop-state.mjs");
const NODE_BIN = process.execPath;

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = fs.readFileSync(0, "utf-8");
    if (!raw || !raw.trim().startsWith("{")) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function isLoopPrompt(prompt) {
  if (typeof prompt !== "string") return false;
  // Match /loop, /loop 5m, /loop /pick-unit, etc.
  return /(^|\s)\/loop(\s|$)/.test(prompt);
}

function safeSpawn(args) {
  try {
    const r = spawnSync(NODE_BIN, [LOOP_STATE_HELPER, ...args], { encoding: "utf-8", timeout: 2000 });
    if (r.status === 0 && r.stdout) return JSON.parse(r.stdout);
  } catch { /* ignore */ }
  return null;
}

function buildContext(stdin) {
  const sid = stdin?.session_id;
  const lines = [];
  let mine = null;
  if (sid) mine = safeSpawn(["read", "--session", sid]);
  if (mine && mine.sessionId) {
    lines.push(`📌 /loop state for THIS session: iter ${mine.iter}/${mine.target} · status=${mine.status} · task=${mine.task}`);
    if (mine.status === "running") {
      lines.push(`   last tick: ${mine.lastTickAt}`);
      lines.push(`   ▶ Resume by passing the same /loop prompt; helper-tick after each iter:`);
      lines.push(`     node H:/prism/.claude/helpers/loop-state.mjs tick --session ${sid} --status ok --note "<one-line>"`);
    } else if (mine.status === "stale" || mine.status === "abandoned") {
      lines.push(`   ⚠ loop is ${mine.status} — either resume + tick, or end:`);
      lines.push(`     node H:/prism/.claude/helpers/loop-state.mjs end --session ${sid} --reason "<why>"`);
    }
  } else if (sid) {
    lines.push(`📌 No active /loop state for this session — starting fresh.`);
    lines.push(`   Bookend the loop with:`);
    lines.push(`     node H:/prism/.claude/helpers/loop-state.mjs start --session ${sid} --task "<task>" --target 20`);
    lines.push(`     node H:/prism/.claude/helpers/loop-state.mjs tick  --session ${sid} --status ok --note "<one-line>"   # each iter`);
    lines.push(`     node H:/prism/.claude/helpers/loop-state.mjs end   --session ${sid} --reason done                       # at finish`);
  }

  const list = safeSpawn(["list"]);
  if (list && Array.isArray(list.loops) && list.loops.length > 0) {
    const others = list.loops.filter((l) => l.sessionId !== sid && l.status === "running");
    if (others.length > 0) {
      lines.push(``);
      lines.push(`🌐 Other active /loop sessions across fleet (${others.length}):`);
      for (const l of others.slice(0, 5)) {
        const ageMin = Math.round(l.staleMs / 60000);
        lines.push(`   • ${l.sessionId.slice(0, 8)} — ${l.task.slice(0, 50)} — iter ${l.iter}/${l.target} — ${ageMin}m old`);
      }
    }
  }

  if (lines.length === 0) return null;
  lines.unshift(`─── /loop awareness ─────────────────────────────`);
  lines.push(`💡 Karpathy R10: checkpoint state between iterations — never continue from a state you can't describe.`);
  lines.push(`────────────────────────────────────────────────`);
  return lines.join("\n");
}

function main() {
  if (String(process.env.PRISM_LOOP_INJECT_DISABLE ?? "") === "1") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const stdin = readStdin();
  const prompt = stdin?.prompt ?? stdin?.user_prompt ?? "";
  if (!isLoopPrompt(prompt)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const ctx = buildContext(stdin);
  if (!ctx) { process.stdout.write(JSON.stringify({ continue: true })); return; }
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: ctx },
  }));
}

try { main(); }
catch { process.stdout.write(JSON.stringify({ continue: true })); }
