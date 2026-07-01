#!/usr/bin/env node
// tier: T3 (observer — never blocks Stop; scans expired stamps + reverts priority)
/**
 * active-chat-priority-decay.mjs — Stop hook for FLEET-REAPER-MS3/U-FR-MS3-A.
 *
 * Scans `state/shared/.active-chat-boost/*.json` for stamps past their
 * `expiresAt` and reverts those PIDs to Normal priority. Idempotent —
 * missing PIDs are a no-op, and the stamp is removed after a successful
 * revert (so a later sweep doesn't re-process it).
 *
 * Strictly advisory — never blocks Stop. Non-Windows + missing helper =
 * silent no-op.
 *
 * Knobs:
 *   PRISM_FR_BOOST_DISABLE=1     master kill switch (skips revert + stamp cleanup)
 *   PRISM_FLEET_REAPER_DISABLE=1 master fleet-wide kill (also respected)
 */

import { readFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import {
  isWindows,
  setPriorityForPids,
} from "../helpers/claude-tree-priority.mjs";

import { listStampDir, STAMP_DIR } from "./active-chat-priority-boost.mjs";

function emit(systemMessage) {
  const out = { continue: true };
  if (systemMessage) out.systemMessage = systemMessage;
  process.stdout.write(JSON.stringify(out) + "\n");
}

/**
 * Pure decision: which stamps are expired? Returns the subset of stamps
 * whose `expiresAt` is in the past relative to nowMs. Malformed stamps
 * (missing/non-numeric expiresAt) are NOT returned — they're skipped
 * silently (fail-soft).
 */
export function pickExpiredStamps(stamps, nowMs) {
  return stamps.filter(s => {
    if (!s || typeof s !== "object") return false;
    const exp = Number(s.expiresAt);
    if (!Number.isFinite(exp)) return false;
    return exp <= nowMs;
  });
}

/**
 * Load + parse all stamp files. Fail-soft: any malformed/unreadable stamp is
 * silently dropped. Returns the parsed stamp object with the `_path` field
 * added so the caller can unlink after revert.
 */
export function loadStamps(stampList, {
  readFile = (p) => readFileSync(p, "utf8"),
} = {}) {
  const out = [];
  for (const entry of stampList) {
    try {
      const text = readFile(entry.path);
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") {
        parsed._path = entry.path;
        out.push(parsed);
      }
    } catch { /* skip — malformed stamp */ }
  }
  return out;
}

export function main(opts = {}) {
  // Master kill switches — but DO NOT abort cleanup. We still want to revert
  // priorities for previously-boosted chats even if boosting is now disabled
  // (otherwise a chat stays at AboveNormal forever after the operator flips
  // the kill switch). Skip revert ONLY if non-Windows (the priority change
  // would be a no-op anyway).
  const masterDisabled =
    process.env.PRISM_FR_BOOST_DISABLE === "1" ||
    process.env.PRISM_FLEET_REAPER_DISABLE === "1";
  // ↑ retain the variable for telemetry; behavior continues so we revert
  //   any leftover boosts even when the feature was just disabled.

  if (!isWindows() && !opts._forceForTest) return emit();

  const now = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const stampList = (opts.listStampDir || listStampDir)(opts.dir || STAMP_DIR);
  if (stampList.length === 0) return emit();

  const loaded = (opts.loadStamps || loadStamps)(stampList);
  const expired = pickExpiredStamps(loaded, now);
  if (expired.length === 0) return emit();

  let totalReverted = 0;
  let totalFailed = 0;
  for (const stamp of expired) {
    const pids = Array.isArray(stamp.pids) ? stamp.pids.filter(p => Number.isFinite(p) && p > 0) : [];
    if (pids.length === 0) {
      // No pids to revert — just drop the stamp.
      try { (opts.unlink || unlinkSync)(stamp._path); } catch { /* best-effort */ }
      continue;
    }
    const setter = opts.setPriorityForPids || setPriorityForPids;
    const results = setter(pids, "Normal", opts._setOpts || {});
    for (const r of results) {
      if (r.ok) totalReverted += 1;
      else totalFailed += 1;
    }
    try { (opts.unlink || unlinkSync)(stamp._path); } catch { /* best-effort — stamp may have been cleaned by a sibling sweep */ }
  }

  // Telemetry note in systemMessage; never blocks.
  const note = masterDisabled
    ? `priority-decay: reverted ${totalReverted} PID(s) across ${expired.length} expired stamp(s) (${totalFailed} failures) — master kill switch on, but legacy stamps cleared`
    : `priority-decay: reverted ${totalReverted} PID(s) across ${expired.length} expired stamp(s) (${totalFailed} failures)`;
  return emit(note);
}

const invokedAsCli = (() => {
  try {
    return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch { return false; }
})();
if (invokedAsCli) {
  try { main(); }
  catch (err) {
    try { process.stderr.write(`active-chat-priority-decay: ${err && err.message ? err.message : String(err)}\n`); } catch { /* swallow */ }
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  }
}
