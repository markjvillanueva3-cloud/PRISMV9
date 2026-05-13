#!/usr/bin/env node
// tier: T4
/**
 * karpathy-discipline-inject.mjs — SessionStart hook
 *
 * Injects the canonical Karpathy 4 rules into the main thread at the start
 * of every session. Subagents already inherit these via agent-rules-inject.mjs;
 * this hook closes the gap on the main thread so the discipline survives
 * compactions and is reinforced once per session without spamming every prompt.
 *
 * Idempotency:
 *   - We write a daily stamp to data/state/karpathy-stamp.json. If the
 *     current session already saw the rules today, we emit a 1-line
 *     reminder instead of the full block.
 *   - SessionStart fires once per cold-start, not on every prompt.
 *
 * Failure mode: any error -> emit {continue:true} and exit 0. Never block.
 */

import fs from "node:fs";
import path from "node:path";

const STAMP_DIR = "H:/prism/mcp-server/data/state";
const STAMP_FILE = path.join(STAMP_DIR, "karpathy-stamp.json");

const RULES = [
  "**Karpathy Discipline (always active):**",
  "1. **Think Before Coding** — CLASSIFY → TECHNIQUE → EDGE CASES → FAILURE MODES → THEN WRITE.",
  "2. **Simplicity First** — minimum code that solves the problem; no abstractions for single-use.",
  "3. **Surgical Changes** — touch only what you must; every changed line traces to the user's request.",
  "4. **Goal-Driven Execution** — state success criteria; loop until verified.",
  "Hard-blocked patterns: placeholder comments, empty catch blocks, stub throws, trivial test assertions, focused/skipped tests, inline Kienzle/Taylor constants.",
  "",
  "**PRISM Awareness (always active):**",
  "• Read `PRISM-INVENTORY-LATEST.md` for live counts — never quote stale numbers from CLAUDE.md/MEMORY.md.",
  "• Prefer MCP dispatcher actions over reimplementation (90+ dispatchers, 5,700+ actions) — see `DISPATCHER_DIGEST.md`.",
  "• Before creating ANY engine/algorithm/hook/skill: `duplicationGuardEngine.mustCheckBeforeCreating()` THROWS on duplicates.",
  "• Check `ENGINE_DIGEST.md` before proposing a new engine; check `mcp-server/data/state/extraction-log.json` before re-extracting.",
  "• Per-chat HANDOFF lives at `state/shared/handoffs/HANDOFF-<instance>.md` — never write to legacy `state/HANDOFF.md`.",
  "• Test shop = JM Die Company (`mcp-server/src/data/jm-die-profile.ts`). Tribal knowledge via `prismSelfAwarenessEngine.searchTribalKnowledge()`.",
].join("\n");

function readStdin() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function loadStamp() {
  try {
    return JSON.parse(fs.readFileSync(STAMP_FILE, "utf-8"));
  } catch {
    return { last: null, sessions: 0 };
  }
}

function saveStamp(stamp) {
  try {
    if (!fs.existsSync(STAMP_DIR)) fs.mkdirSync(STAMP_DIR, { recursive: true });
    fs.writeFileSync(STAMP_FILE, JSON.stringify(stamp, null, 2));
  } catch {
    /* non-fatal — hooks must never throw */
  }
}

function main() {
  // Drain stdin (SessionStart payload) — we don't need its contents.
  readStdin();

  const today = new Date().toISOString().slice(0, 10);
  const stamp = loadStamp();
  const sameDay = stamp.last === today;
  stamp.last = today;
  stamp.sessions = (stamp.sessions || 0) + 1;
  saveStamp(stamp);

  const body = sameDay
    ? "✓ Karpathy discipline reaffirmed (CLASSIFY → TECHNIQUE → EDGE CASES → FAILURE MODES → WRITE; simplicity > abstraction; surgical edits; goal-driven)."
    : RULES;

  console.log(
    JSON.stringify({
      continue: true,
      systemMessage: body,
    }),
  );
}

try {
  main();
} catch {
  console.log(JSON.stringify({ continue: true }));
}
