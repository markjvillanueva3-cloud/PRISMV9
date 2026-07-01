#!/usr/bin/env node
// tier: T2
// zulu-build-pointer-inject.mjs -- UserPromptSubmit
//
// ZULU-BUILDLOOP INCR 4 (slot:zulu, 2026-06-15). The CONSUMER half of the autonomous
// build loop. INCR 1-3 (queue core + cron driver + scheduled task) keep
// state/shared/zulu-build-loop-next.json continuously fresh with the next GATED build
// unit for the builder slot. This hook SURFACES that pointer to the builder chat
// (default "bravo") on every UserPromptSubmit -- so the loop is actually CONSUMED:
// the builder sees its next unit without anyone reading the pointer by hand.
//
// Behavior (all decisions delegated to the pure core scripts/lib/zulu-build-pointer.mjs):
//   - resolve the current slot from the input; if it is NOT the directive's builder
//     slot -> silent no-op (cheap-when-irrelevant: every other slot exits immediately).
//   - if the queue is drained / no next unit -> silent no-op.
//   - else inject a compact advisory block naming the next gated unit + the pointer path.
//   - per-session throttle (default 30 min, re-fires immediately when next.id CHANGES)
//     so a /loop re-submitting the same prompt every tick does not re-inject each tick.
//
// SAFETY: read-only surfacing. Never builds/commits/writes engine code. The per-unit
// build+test+3-of-3 scrutiny stays with the builder chat -- surfacing a pointer can
// never bypass that gate. Advisory only; never blocks. Fail-soft: any error -> continue.
//
// Knobs:
//   PRISM_ZULU_BUILD_POINTER_INJECT_DISABLE=1   no-op
//   PRISM_ZULU_BUILD_POINTER_INJECT_TTL_MS=N    same-unit re-inject throttle (default 1800000 = 30m; 0 = off)
//   PRISM_ROOT                                  repo root (default H:/prism)
//
// ASCII-only (ascii-guard).

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { chatIdFromInput, activeSlotName } from "../helpers/wiki-domain-bias.mjs";
import { shapePointerInjection } from "../../scripts/lib/zulu-build-pointer.mjs";
import { decideThrottle, statePathFor, loadPrev, savePrev, pruneStaleSessions } from "../../scripts/lib/inject-throttle.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const POINTER_PATH = path.join(PRISM_ROOT, "state/shared/zulu-build-loop-next.json");
const THROTTLE_DIR = path.join(PRISM_ROOT, "mcp-server/data/state/inject-throttle/zulu-build-pointer");
const TTL_MS = (() => {
  const raw = process.env.PRISM_ZULU_BUILD_POINTER_INJECT_TTL_MS;
  if (raw === undefined) return 1_800_000;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 1_800_000;
})();

function approve(extra) {
  process.stdout.write(JSON.stringify({ continue: true, ...(extra || {}) }));
}
function buildOutput(additionalContext) {
  return { hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext } };
}

function readInput() {
  try { return JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { return {}; }
}
function readPointer() {
  try {
    if (!existsSync(POINTER_PATH)) return null;
    const j = JSON.parse(readFileSync(POINTER_PATH, "utf8"));
    return (j && typeof j === "object") ? j : null;
  } catch { return null; }
}

async function main() {
  if (process.env.PRISM_ZULU_BUILD_POINTER_INJECT_DISABLE === "1") return approve();
  const input = readInput();

  let slot = null;
  try { slot = activeSlotName(chatIdFromInput(input)); } catch { slot = null; }

  const directive = readPointer();
  const decision = shapePointerInjection({ directive, currentSlot: slot });
  if (!decision.inject) return approve();

  // Per-session throttle so a /loop (identical re-submitted prompt) does not re-inject
  // the same unit every tick; a CHANGED next.id (new throttleKey) re-fires immediately.
  if (TTL_MS > 0) {
    try {
      // Keyed per-session; falls back to per-SLOT keying only if the harness omits a
      // session id (rare on UserPromptSubmit). In that degraded case two concurrent
      // builder chats would share one 30m window -- deliberately coarse, benign (the
      // throttle is advisory and the fleet does not run two of one slot).
      const sid = input.session_id || input.sessionId || slot;
      const statePath = statePathFor(sid, { stateDir: THROTTLE_DIR });
      const prev = loadPrev(statePath);
      const { skip, next } = decideThrottle({ prev, hash: `zbp:${decision.throttleKey}`, nowMs: Date.now(), ttlMs: TTL_MS });
      if (skip) return approve();
      savePrev(statePath, next, { stateDir: THROTTLE_DIR });
      // GC stale per-session throttle files so this dedicated dir cannot grow unbounded
      // across compaction-rotated session ids (only the builder slot ever writes here).
      pruneStaleSessions(THROTTLE_DIR, { nowMs: Date.now() });
    } catch { /* throttle is best-effort; fall through to inject */ }
  }

  try {
    const { incrementFeature } = await import("../helpers/feature-counter.mjs");
    incrementFeature("ZuluBuildPointerInject", { slot });
  } catch { /* counter best-effort */ }

  return approve(buildOutput(decision.text));
}

try {
  const r = main();
  if (r && typeof r.then === "function") r.catch(() => approve());
} catch { approve(); }
