#!/usr/bin/env node
// tier: T2
// PER-SLOT-AUTO-CAPTURE/U-AC01 — auto-capture important session signals into
// per-slot memories without explicit "remember this" from the operator.
//
// Stop hook. Reads `state/shared/chat-bus/recent.jsonl` + scrutiny ledger +
// outcome bus for high-signal events from THIS slot's session, then writes
// per-slot memories so they auto-feed into the master brain via the existing
// stop-obsidian-memory-feed.mjs Stop hook.
//
// NO `child_process` / NO `execSync` — pure fs reads only (security policy:
// security_reminder_hook flags exec). Signal sources are all PRISM state
// files written by other hooks during the session.
//
// Signal classes (per session):
//   - Scrutiny PASS verdicts → reference memory (ship-worthy outcome)
//   - Bug-find wiki gate fires → feedback memory (regression class)
//   - Outcome bus failure→success pairs → feedback memory (fix pattern)
//
// Persistence chain:
//   C:/auto-memory/*.md
//     → stop-obsidian-memory-feed.mjs (existing Stop hook chains after this)
//     → H:/prism/knowledge/memories/<type>/*.md
//     → tribal-by-domain-inject + master-index regen
//
// Fail-soft: NEVER throws, NEVER blocks Stop. Empty signal → silent skip.
// Per-day cap: max 5 new memories per slot per session (anti-spam).
//
// Knobs:
//   PRISM_AUTO_CAPTURE_DISABLE=1     — kill the hook
//   PRISM_AUTO_CAPTURE_DRY_RUN=1     — log signals but don't write
//   PRISM_AUTO_CAPTURE_MAX_PER_RUN=N — daily cap (default 5)

import fs from "node:fs";
import { resolveObsidianMemDir } from "../../scripts/lib/obsidian-mem-dir.mjs";

const DISABLE = process.env.PRISM_AUTO_CAPTURE_DISABLE === "1";
const DRY_RUN = process.env.PRISM_AUTO_CAPTURE_DRY_RUN === "1";
const MAX_PER_RUN = Number(process.env.PRISM_AUTO_CAPTURE_MAX_PER_RUN ?? "5");
const MEMORY_DIR = resolveObsidianMemDir(); // homedir-derived, single-sourced (was hardcoded wompu path)
const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";

function exit(payload) {
  process.stdout.write(JSON.stringify(payload ?? { continue: true }));
  process.exit(0);
}

if (DISABLE) exit();

let stdin = "";
try {
  for await (const chunk of process.stdin) stdin += chunk;
} catch { /* no stdin */ }

let env;
try { env = stdin ? JSON.parse(stdin) : {}; } catch { env = {}; }

function resolveSlot() {
  try {
    const sessionId = env.session_id || env.sessionId || "";
    if (!sessionId) return null;
    const raw = JSON.parse(fs.readFileSync(`${PRISM_ROOT}/state/shared/chat-slots.json`, "utf8"));
    const slots = raw.slots || raw;
    for (const [slot, state] of Object.entries(slots)) {
      if (state && (state.chatId || "").includes(sessionId.slice(0, 8))) return slot;
    }
  } catch { /* silent */ }
  return null;
}

const slot = resolveSlot();
if (!slot) exit();

const today = new Date().toISOString().slice(0, 10);
const sidecarPath = `${PRISM_ROOT}/state/shared/.auto-capture-ledger.json`;
let ledger;
try { ledger = JSON.parse(fs.readFileSync(sidecarPath, "utf8")); } catch { ledger = {}; }
ledger[today] ??= {};
ledger[today][slot] ??= 0;
if (ledger[today][slot] >= MAX_PER_RUN) exit();

function tailJsonl(path, maxLines = 50) {
  try {
    const raw = fs.readFileSync(path, "utf8");
    return raw.trim().split("\n").slice(-maxLines).map(l => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

const signals = [];

// 1. Scrutiny PASS verdicts — slot shipped clean
try {
  const ledger3way = JSON.parse(fs.readFileSync(`${PRISM_ROOT}/mcp-server/data/state/SCRUTINY_LEDGER.json`, "utf8"));
  const myEntry = (ledger3way.entries ?? ledger3way)[env.session_id || ""];
  if (myEntry && myEntry.opusReviewed === true && myEntry.claudeReviewed === true && myEntry.codexReviewed === true) {
    signals.push({
      topic: `clean_ship_${(myEntry.notes ?? "session").replace(/[^\w]+/g, "_").slice(0, 40)}`,
      type: "reference",
      body: `3-of-3 PASS verdict for session. Arms: A=${myEntry.reviews?.opus?.notes ?? "n/a"} · B=${myEntry.reviews?.claude?.notes ?? "n/a"} · C=${myEntry.reviews?.codex?.notes ?? myEntry.notes ?? "n/a"}`,
      signal: "scrutiny-pass",
    });
  }
} catch { /* no ledger entry */ }

// 2. Outcome bus failure→success pairs from this session
const outcomes = tailJsonl(`${PRISM_ROOT}/state/shared/outcome-bus.jsonl`, 200);
const myOutcomes = outcomes.filter(o => o.slot === slot && o.session_id === (env.session_id ?? ""));
const fixPairs = myOutcomes.filter(o => o.success === true && o.previously_failed === true);
for (const pair of fixPairs.slice(0, 2)) {
  signals.push({
    topic: `fixed_${(pair.task ?? "task").replace(/[^\w]+/g, "_").slice(0, 40)}`,
    type: "feedback",
    body: `Resolved recurring failure: ${pair.task ?? "(unnamed)"}\n\nApproach: ${pair.result ?? "(no detail)"}\n\nWhy: this pattern previously failed; this session got it right — promoting to feedback so the next session doesn't re-try the broken approach.`,
    signal: "fix-pattern",
  });
}

if (signals.length === 0) exit();

const writtenPaths = [];
for (const sig of signals) {
  if (ledger[today][slot] >= MAX_PER_RUN) break;
  const name = `${sig.type}_${slot}_${sig.topic}_${today.replace(/-/g, "_")}`.slice(0, 100);
  const outPath = `${MEMORY_DIR}/${name}.md`;
  if (fs.existsSync(outPath)) continue;
  const content = `---
name: ${name}
description: Auto-captured by stop-auto-capture-per-slot for slot:${slot} — ${sig.signal}.
metadata:
  type: ${sig.type}
  auto_captured: true
  slot: ${slot}
  signal: ${sig.signal}
---

${sig.body}

_Auto-promoted on Stop. If genuinely important, expand to a full ${sig.type} memory; otherwise leave for the indexer._
`;
  if (DRY_RUN) {
    writtenPaths.push(`[dry-run] ${outPath}`);
  } else {
    try {
      fs.writeFileSync(outPath, content);
      writtenPaths.push(outPath);
      ledger[today][slot]++;
    } catch { /* swallow */ }
  }
}

if (!DRY_RUN) {
  try { fs.writeFileSync(sidecarPath, JSON.stringify(ledger, null, 2)); } catch { /* swallow */ }
}

if (writtenPaths.length === 0) exit();

exit({
  continue: true,
  systemMessage: `🧠 auto-captured ${writtenPaths.length} memor${writtenPaths.length === 1 ? "y" : "ies"} for slot:${slot}:\n${writtenPaths.map(p => `  - ${p.split("/").pop()}`).join("\n")}\n_(disable: PRISM_AUTO_CAPTURE_DISABLE=1)_`,
});
