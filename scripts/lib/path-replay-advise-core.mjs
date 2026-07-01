#!/usr/bin/env node
// scripts/lib/path-replay-advise-core.mjs — WORKING-PATH-CAPTURE-MS0 / U-WPC-REPLAY-WIRE (alpha, 2026-05-31).
//
// The CONSUMPTION-side wiring logic: surface PROVEN working-paths to whichever domain chat is working,
// so it REPLAYS a known-good path instead of re-deriving. Fleet-wide (one logic, all domains) — pairs
// with path-derive.mjs (capture) + path-ledger.mjs (find/replay). Advisory only; replay execution stays
// gated by each domain's own S(x)/operator gate (derived paths are hypotheses — see provenance marker).
//
// This file holds the TESTABLE LOGIC (alpha-writable, tested here). The thin UserPromptSubmit hook that
// reads stdin + emits additionalContext lives at .claude/hooks/path-replay-advise.mjs — a harness-exec
// file that must be PLACED FROM THE MAIN TREE (hard-blocked from a slot worktree to prevent silent hook
// drift). It is shipped as a golf patch-sibling: state/shared/dashboards/patches/HOOK-PATCH-PATH-REPLAY-ADVISE.md
//
// Knobs (read by the hook): PRISM_PATH_REPLAY_ADVISE_DISABLE=1 · _TOPK (default 3) · _THROTTLE_MS (default 600000).

import fs from "node:fs";
import { findWorkingPaths, SLOT_GALAXY_MAP } from "./path-ledger.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const CHAT_SLOTS = `${PRISM_ROOT}/state/shared/chat-slots.json`;
const THROTTLE_FILE = `${PRISM_ROOT}/state/shared/.path-replay-advise-throttle.json`;
export const DEFAULT_THROTTLE_MS = 600000;

// Resolve slot from session_id via chat-slots.json (same match pattern as outcome-bus-auto-tap.mjs).
// slotsRaw injectable for hermetic tests.
export function resolveSlot(sessionId, slotsRaw) {
  try {
    const raw = slotsRaw || JSON.parse(fs.readFileSync(CHAT_SLOTS, "utf8"));
    const slots = raw.slots || raw;
    for (const [slot, st] of Object.entries(slots)) {
      if (st && typeof st.chatId === "string" && sessionId && st.chatId.includes(String(sessionId).slice(0, 8))) return slot;
    }
  } catch { /* silent */ }
  return null;
}

// Pure core: slot → advisory object or null. findFn injectable for hermetic tests.
export function adviseReplay({ slot, topK = 3, roots, findFn = findWorkingPaths }) {
  const domain = SLOT_GALAXY_MAP[slot];
  if (!domain) return null; // not a recognized domain slot
  let paths = [];
  try { paths = findFn(domain, "", { roots, topK }) || []; } catch { return null; }
  if (!Array.isArray(paths) || !paths.length) return null;
  return {
    domain,
    count: paths.length,
    top: paths.slice(0, topK).map((p) => ({
      goalType: p.goalType, score: p.score, provenance: p.provenance || "explicit", steps: p.stepsCount || 0,
    })),
  };
}

export function formatAdvisory(a) {
  if (!a) return "";
  const lines = a.top.map((t) => `  • ${t.goalType} — score ${t.score}, ${t.provenance}, ${t.steps} steps`).join("\n");
  return `## 🔁 Proven working-paths for your domain (${a.domain}) — REPLAY before re-deriving\n`
    + `${a.count} captured path(s) exist for ${a.domain}. Top:\n${lines}\n`
    + `→ \`node H:/prism/scripts/path-ledger.mjs find ${a.domain} --query "<your goal>"\` ranks them by similarity; `
    + `if a match scores high, \`replay <workingPathId>\` emits an ExecutionPlan. Derived (non-explicit) paths are `
    + `hypotheses — confirm via your S(x) gate before trusting. (WORKING-PATH-CAPTURE-MS0; disable: PRISM_PATH_REPLAY_ADVISE_DISABLE=1)`;
}

// Throttle: ≤1 advisory per slot per window. Fail-soft (read/write injectable; race → at most a few extra).
export function throttled(slot, opts = {}) {
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  const win = Number.isFinite(opts.windowMs) ? opts.windowMs : DEFAULT_THROTTLE_MS;
  const read = opts.read || (() => { try { return JSON.parse(fs.readFileSync(THROTTLE_FILE, "utf8")); } catch { return {}; } });
  const write = opts.write || ((l) => { try { fs.writeFileSync(THROTTLE_FILE, JSON.stringify(l)); } catch { /* swallow */ } });
  let ledger = {};
  try { ledger = read() || {}; } catch { ledger = {}; }
  const last = Number(ledger[slot]) || 0;
  if (now - last < win) return true;
  ledger[slot] = now;
  write(ledger);
  return false;
}
