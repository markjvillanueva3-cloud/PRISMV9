#!/usr/bin/env node
// tier: T3
/**
 * stop-psn-autonomy-tick.mjs — Stop hook (T3 advisory)
 *
 * Auto-fires PSN autonomy primitives 1+3 on session end:
 *   - Primitive #1: run psn-autonomy-data-ingest.mjs (append new events to ledger)
 *   - Primitive #3: build trainer manifest from the last-N-event window;
 *     emit recommended_targets via `additionalContext` so the next session
 *     sees which slots are over-reward-threshold.
 *
 * NEVER FAILS THE STOP. Throttled to 1 fire / 5 minutes per session id.
 *
 * Knobs:
 *   PRISM_PSN_AUTONOMY_TICK_DISABLE=1   — skip entirely
 *   PRISM_PSN_AUTONOMY_TICK_INTERVAL_MS=N — throttle interval (default 300000)
 *   PRISM_PSN_AUTONOMY_TICK_WINDOW=N    — events from the tail of the ledger to
 *                                          aggregate (default 500)
 *
 * Author: charlie slot (claude-451f7328) /goal-10 iter1, 2026-05-24.
 * Doctrine: feedback_always_capture_lessons (autonomy primitives 1+3).
 */
import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

const REPO = "H:/prism";
const STATE_DIR = path.join(REPO, "state/shared");
const SIGNAL_LEDGER = path.join(STATE_DIR, "psn-training-signal.jsonl");
const MANIFEST_PATH = path.join(STATE_DIR, "psn-trainer-manifest-latest.json");
const TICK_STAMPS = path.join(STATE_DIR, "psn-autonomy-tick-stamps.json");
const INGEST_SCRIPT = path.join(REPO, "scripts/psn-autonomy-data-ingest.mjs");
const ENGINE_PATH = path.join(REPO, "mcp-server/src/engines/PSNAutonomyLoopEngine.ts");

const DEFAULT_INTERVAL_MS = 300_000;
const DEFAULT_WINDOW = 500;

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
}

function writeJsonAtomic(p, obj) {
  const tmp = `${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, p);
}

function silenced() {
  return process.env.PRISM_PSN_AUTONOMY_TICK_DISABLE === "1";
}

function intervalMs() {
  const v = Number(process.env.PRISM_PSN_AUTONOMY_TICK_INTERVAL_MS);
  return Number.isFinite(v) && v >= 30_000 ? v : DEFAULT_INTERVAL_MS;
}

function windowSize() {
  const v = Number(process.env.PRISM_PSN_AUTONOMY_TICK_WINDOW);
  return Number.isFinite(v) && v >= 10 && v <= 100_000 ? v : DEFAULT_WINDOW;
}

function throttled(sessionId) {
  const stamps = readJson(TICK_STAMPS, {});
  const last = Number(stamps[sessionId] ?? 0);
  return Date.now() - last < intervalMs();
}

function markFired(sessionId) {
  const stamps = readJson(TICK_STAMPS, {});
  stamps[sessionId] = Date.now();
  // Prune stamps older than 24h
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const k of Object.keys(stamps)) if (Number(stamps[k]) < cutoff) delete stamps[k];
  writeJsonAtomic(TICK_STAMPS, stamps);
}

function runIngest() {
  if (!fs.existsSync(INGEST_SCRIPT)) return { ok: false, reason: "ingest-missing" };
  try {
    execFileSync(process.execPath, [INGEST_SCRIPT], { windowsHide: true,
      encoding: "utf8",
      stdio: "pipe",
      timeout: 30_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

/**
 * Reward computation copied inline (no engine import — keep hook deps zero).
 * Mirrors `PSNAutonomyLoopEngine.scoreEvent` weights.
 */
const W = { scrutiny_pass: 0.35, unit_shipped: 0.30, scoped_commit: 0.10 };
function scoreEvent(e) {
  if (e.type === "scrutiny_outcome") return e.passed ? W.scrutiny_pass : 0;
  if (e.type === "unit_shipped") return W.unit_shipped;
  if (e.type === "scoped_commit") return W.scoped_commit;
  return 0;
}

function buildManifest(events) {
  const perSlot = new Map();
  for (const e of events) {
    if (!e.slot) continue;
    const r = scoreEvent(e);
    const cur = perSlot.get(e.slot) ?? { sum: 0, n: 0 };
    cur.sum += r;
    cur.n += 1;
    perSlot.set(e.slot, cur);
  }
  const ranked = [...perSlot.entries()]
    .map(([slot, { sum, n }]) => ({ slot, mean_reward: sum / n, n }))
    .sort((a, b) => b.mean_reward - a.mean_reward);
  const recommended = ranked
    .filter((r) => r.mean_reward >= 0.20 && r.n >= 3)
    .map((r) => ({ slot: r.slot, reason: `mean_reward=${r.mean_reward.toFixed(3)} over ${r.n} events — adapter-fine-tune candidate` }));
  return { generated_at: new Date().toISOString(), window_events: events.length, high_reward_slots: ranked, recommended_targets: recommended };
}

function readTailEvents(n) {
  if (!fs.existsSync(SIGNAL_LEDGER)) return [];
  const raw = fs.readFileSync(SIGNAL_LEDGER, "utf8").split("\n").filter(Boolean);
  const tail = raw.slice(-n);
  const events = [];
  for (const line of tail) {
    try { events.push(JSON.parse(line)); } catch { /* skip malformed */ }
  }
  return events;
}

function main() {
  if (silenced()) return;
  let payload = {};
  try { payload = JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch { payload = {}; }
  const sessionId = String(payload.session_id ?? payload.sessionId ?? "unknown");
  if (throttled(sessionId)) return;

  const ingest = runIngest();
  const events = readTailEvents(windowSize());
  const manifest = buildManifest(events);

  try {
    writeJsonAtomic(MANIFEST_PATH, {
      ...manifest,
      ingest_status: ingest,
      engine_present: fs.existsSync(ENGINE_PATH),
      session_id: sessionId,
    });
  } catch { /* fail-soft */ }

  markFired(sessionId);

  // Emit advisory context for the NEXT session (non-blocking)
  const top = manifest.recommended_targets.slice(0, 3);
  if (top.length === 0) return;
  const lines = top.map((t) => `  • ${t.slot} — ${t.reason}`).join("\n");
  const out = {
    hookSpecificOutput: {
      hookEventName: "Stop",
      additionalContext: `## 🧬 PSN autonomy tick (P1+P3)\n` +
        `Ingested fresh signals; trainer manifest written to \`state/shared/psn-trainer-manifest-latest.json\` (${manifest.window_events} events in window, ${manifest.high_reward_slots.length} slot(s) ranked).\n` +
        `**Adapter fine-tune candidates (mean_reward ≥ 0.20, n ≥ 3):**\n${lines}\n` +
        `_Knobs: PRISM_PSN_AUTONOMY_TICK_DISABLE=1, PRISM_PSN_AUTONOMY_TICK_INTERVAL_MS=N. Doctrine: PSN-AUTONOMY-RESEARCH-R4._`,
    },
  };
  process.stdout.write(JSON.stringify(out));
}

main();
