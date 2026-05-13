#!/usr/bin/env node
// tier: T4
/**
 * stop_on_repeat_error.mjs — Stop hook
 *
 * Reads error-memory.json. If any error signature has fired ≥3 times in the
 * last 24h with no resolved fix, blocks exit until either a feedback memory
 * is added OR the offending entries are marked resolved.
 *
 * Forces graduation from log-the-error to write-the-rule.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const ERROR_MEMORY = "H:/prism/mcp-server/data/state/error-memory.json";
const MEMORY_DIR = join(homedir(), ".claude", "projects", "H--prism", "memory");
const WINDOW_MS = 24 * 60 * 60 * 1000;
const THRESHOLD = 3;

function parseInput() {
  try { return JSON.parse(readFileSync(0, "utf8")); } catch { return {}; }
}

function pass(msg = "pass") {
  console.log(JSON.stringify({ continue: true, systemMessage: msg }));
}

function block(reason) {
  console.log(JSON.stringify({ continue: false, stopReason: reason }));
}

function loadMemory() {
  if (!existsSync(ERROR_MEMORY)) return null;
  try { return JSON.parse(readFileSync(ERROR_MEMORY, "utf8")); } catch { return null; }
}

function feedbackWritten(sessionStartMs) {
  if (!existsSync(MEMORY_DIR)) return false;
  try {
    return readdirSync(MEMORY_DIR)
      .filter((f) => f.startsWith("feedback_") && f.endsWith(".md"))
      .some((f) => {
        try { return statSync(join(MEMORY_DIR, f)).mtimeMs >= sessionStartMs; } catch { return false; }
      });
  } catch { return false; }
}

async function main() {
  const input = parseInput();
  if (input.stop_hook_active === true) return pass("already-blocked");

  const mem = loadMemory();
  if (!mem || !Array.isArray(mem.errors) || mem.errors.length === 0) return pass("no-errors");

  const cutoff = Date.now() - WINDOW_MS;
  const counts = new Map();
  for (const e of mem.errors) {
    if (!e?.signature || !e?.timestamp) continue;
    if (e.resolved) continue;
    const ts = Date.parse(e.timestamp);
    if (Number.isNaN(ts) || ts < cutoff) continue;
    const key = `${e.type || "?"}:${e.signature}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const offenders = [...counts.entries()]
    .filter(([, n]) => n >= THRESHOLD)
    .sort((a, b) => b[1] - a[1]);

  if (offenders.length === 0) return pass("under-threshold");

  // If a feedback memory was written this session, allow exit (assume covered)
  // Use 4h window as a proxy for "this session"
  if (feedbackWritten(Date.now() - 4 * 60 * 60 * 1000)) {
    return pass("feedback-written");
  }

  const list = offenders.slice(0, 5).map(([k, n]) => `  - ${k}  (${n}× in 24h)`).join("\n");
  block(
    `${offenders.length} error pattern(s) recurring without resolution:\n${list}\n\n` +
    `Either:\n` +
    `  1. Mark resolved entries in ${ERROR_MEMORY} with {fix, prevention}, OR\n` +
    `  2. Write a feedback_*.md rule preventing the recurrence, OR\n` +
    `  3. Build a hook that catches it before it fires.\n\n` +
    `Logging without learning is just bookkeeping.`
  );
}

main().catch(() => pass("error"));
