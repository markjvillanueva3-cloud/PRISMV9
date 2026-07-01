#!/usr/bin/env node
// tier: T3
/**
 * injection-budget-snapshot-refresh.mjs -- SessionStart opportunistic refresher
 * for the steady-state injection-budget snapshot the CAP gate reads.
 *
 * TOKEN-EFFICIENCY-INJECT/U-INJECTION-BUDGET-REFRESH (2026-06-11, slot:bravo).
 *
 * The CAP gate (injection-budget-cap-enforce.mjs) fail-OPENS on a stale/missing
 * snapshot -- so without a refresher it would only ever enforce while the seed
 * snapshot is fresh, then go dormant. This hook closes that loop: on SessionStart,
 * if the snapshot is older than the refresh interval (default 12h), it spawns the
 * steady-state probe DETACHED (never blocks SessionStart) to rewrite the snapshot.
 * A fleet-wide throttle marker (cooldown, default 30m) stops the 26-chat fleet
 * from probe-storming on a shared boot -- only the first session past the interval
 * triggers a refresh; the rest see the fresh marker and skip.
 *
 * NEVER blocks: always emits {continue:true}. The probe runs in the background
 * (~30-60s later, 60 hooks x 2 passes) and the NEXT session sees a fresh snapshot.
 * The spawn is unref'd + stdio-ignored so it outlives this hook without holding
 * the session.
 *
 * Knobs:
 *   PRISM_INJECTION_BUDGET_REFRESH_DISABLE=1       off
 *   PRISM_INJECTION_BUDGET_REFRESH_INTERVAL_MS=N   staleness threshold (default 12h)
 *   PRISM_INJECTION_BUDGET_REFRESH_COOLDOWN_MS=N   fleet throttle (default 30m)
 *
 * Test seam: decideRefresh(...) + ageOfFile(...) are pure over injected inputs.
 *
 * @module .claude/hooks/injection-budget-snapshot-refresh
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { STEADY_SNAPSHOT_PATH } from "../../scripts/measure-userpromptsubmit-budget.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..", "..");
export const MEASURE_SCRIPT = path.join(ROOT, "scripts", "measure-userpromptsubmit-budget.mjs");
export const REFRESH_MARKER_PATH = path.join(ROOT, "state", "shared", "injection-budget-refresh.lock");

export const DEFAULT_INTERVAL_MS = 12 * 60 * 60 * 1000;   // 12h staleness (< CAP gate 24h TTL)
export const DEFAULT_COOLDOWN_MS = 30 * 60 * 1000;        // 30m fleet throttle

/** Pure: positive interval (ms) from env, else default. */
export function intervalFromEnv(env = process.env) {
  const n = env?.PRISM_INJECTION_BUDGET_REFRESH_INTERVAL_MS != null ? Number(env.PRISM_INJECTION_BUDGET_REFRESH_INTERVAL_MS) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_INTERVAL_MS;
}

/** Pure: positive cooldown (ms) from env, else default. */
export function cooldownFromEnv(env = process.env) {
  const n = env?.PRISM_INJECTION_BUDGET_REFRESH_COOLDOWN_MS != null ? Number(env.PRISM_INJECTION_BUDGET_REFRESH_COOLDOWN_MS) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_COOLDOWN_MS;
}

/** Pure: age (ms) from a JSON file's timestamp field (number ms or ISO string); Infinity if unreadable/absent. */
export function ageOfFile(filePath, field, { fsImpl = fs, nowMs = Date.now() } = {}) {
  try {
    const j = JSON.parse(fsImpl.readFileSync(filePath, "utf8"));
    const v = j?.[field];
    const t = typeof v === "number" ? v : Date.parse(v ?? "");
    return Number.isFinite(t) ? Math.max(0, nowMs - t) : Infinity;
  } catch {
    return Infinity;
  }
}

/** Pure: decide whether to trigger a background refresh. */
export function decideRefresh({ snapshotAgeMs, lastAttemptAgeMs, interval, cooldown, disabled }) {
  if (disabled) return { refresh: false, reason: "disabled" };
  if (snapshotAgeMs <= interval) return { refresh: false, reason: "snapshot fresh" };
  if (lastAttemptAgeMs <= cooldown) return { refresh: false, reason: "another refresh attempt in cooldown" };
  return { refresh: true, reason: "snapshot stale and no recent fleet attempt" };
}

// ---- script entry ----------------------------------------------------------

function writeMarker({ fsImpl = fs, nowMs = Date.now() } = {}) {
  try {
    const tmp = `${REFRESH_MARKER_PATH}.${process.pid}.tmp`;
    fsImpl.writeFileSync(tmp, JSON.stringify({ lastAttemptMs: nowMs, host: process.env.COMPUTERNAME || "?", pid: process.pid }));
    fsImpl.renameSync(tmp, REFRESH_MARKER_PATH);
    return true;
  } catch {
    return false;
  }
}

function spawnProbeDetached() {
  try {
    const child = spawn(process.execPath, [MEASURE_SCRIPT, "--steady-state", "--write-snapshot"], {
      detached: true, windowsHide: true,
      stdio: "ignore",
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function main() {
  try {
    const env = process.env;
    const decision = decideRefresh({
      snapshotAgeMs: ageOfFile(STEADY_SNAPSHOT_PATH, "measured_at"),
      lastAttemptAgeMs: ageOfFile(REFRESH_MARKER_PATH, "lastAttemptMs"),
      interval: intervalFromEnv(env),
      cooldown: cooldownFromEnv(env),
      disabled: env.PRISM_INJECTION_BUDGET_REFRESH_DISABLE === "1",
    });
    if (decision.refresh) {
      writeMarker();
      spawnProbeDetached();
      process.stdout.write(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext: "[injection-budget] steady-state snapshot stale -> background refresh spawned; CAP gate enforces on fresh data next session.",
        },
      }));
    } else {
      process.stdout.write(JSON.stringify({ continue: true }));
    }
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
  process.exit(0);
}

const invokedAsScript = (() => {
  try {
    const self = new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/i, "$1");
    return path.resolve(self) === path.resolve(process.argv[1] ?? "");
  } catch {
    return false;
  }
})();
if (invokedAsScript) main();
