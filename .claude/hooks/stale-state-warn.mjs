#!/usr/bin/env node
// tier: T2
/**
 * stale-state-warn.mjs — UserPromptSubmit hook (one-line nudge).
 *
 * If BUILD_STATE.json + MILESTONE_PROGRESS.json + the latest
 * UNWIRED-ENGINE-AUDIT-*.json are all older than STALE_HOURS, inject a
 * one-sentence warning so the chat knows to regenerate before relying
 * on the auto-injected BUILD_STATE summary.
 *
 * Why: build-state-inject regenerates BUILD_STATE itself if stale, but
 * BUILD_STATE depends on the OTHER two surfaces. If MILESTONE_PROGRESS
 * is 3 days old, BUILD_STATE rebuilds with 3-day-old envelope data and
 * never warns. This hook closes that gap by checking the dependency
 * chain explicitly.
 *
 * The chain-regen in build-state-snapshot.mjs already handles
 * regeneration — this hook is a belt to its suspenders, surfacing
 * staleness BEFORE the user makes a decision based on stale data.
 *
 * Fail-open. Never blocks. Disable: PRISM_STALE_STATE_WARN=0.
 */

import { existsSync, statSync, readdirSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = "H:/prism";
const STATE_DIR = path.join(REPO_ROOT, "state/shared");
const STALE_HOURS = 48;
const STALE_HOURS_HARD = 168; // 1 week — escalate the message

function readStdin() {
  try {
    return require("node:fs").readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function ageHours(p) {
  if (!existsSync(p)) return Infinity;
  return (Date.now() - statSync(p).mtimeMs) / (1000 * 60 * 60);
}

function latestUnwiredAuditPath() {
  try {
    const files = readdirSync(STATE_DIR).filter((f) =>
      /^UNWIRED-ENGINE-AUDIT-\d{4}-\d{2}-\d{2}\.json$/.test(f),
    );
    if (files.length === 0) return null;
    return path.join(STATE_DIR, files.sort().slice(-1)[0]);
  } catch {
    return null;
  }
}

function emit(eventName, additionalContext) {
  process.stdout.write(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: eventName,
        additionalContext,
      },
    }),
  );
}

(() => {
  if (process.env.PRISM_STALE_STATE_WARN === "0") process.exit(0);

  try {
    const buildState = path.join(STATE_DIR, "BUILD_STATE.json");
    const milestone = path.join(STATE_DIR, "MILESTONE_PROGRESS.json");
    const unwired = latestUnwiredAuditPath();

    const ages = {
      BUILD_STATE: ageHours(buildState),
      MILESTONE_PROGRESS: ageHours(milestone),
      UNWIRED_AUDIT: unwired ? ageHours(unwired) : Infinity,
    };

    const stale = Object.entries(ages).filter(([, h]) => h > STALE_HOURS);
    if (stale.length === 0) process.exit(0);

    const oldest = stale.sort((a, b) => b[1] - a[1])[0];
    const tone = oldest[1] > STALE_HOURS_HARD ? "⚠️ STALE" : "ℹ️ stale";
    const hours = Math.round(oldest[1]);
    const days = Math.round(hours / 24);

    let stdin = "";
    try {
      stdin = readStdin();
    } catch {
      /* no stdin */
    }
    let event = "UserPromptSubmit";
    try {
      const data = stdin ? JSON.parse(stdin) : {};
      event = data?.hook_event_name || data?.hookEventName || event;
    } catch {
      /* default event */
    }

    const msg =
      `${tone}: ${oldest[0]} is ${days}d old. ` +
      `Auto-injected BUILD_STATE may reflect outdated reality. ` +
      `Regen all 3 surfaces: \`node H:/prism/scripts/build-state-snapshot.mjs\` ` +
      `(chain-fires the dependency regens automatically). Ages: ` +
      Object.entries(ages)
        .map(([k, h]) => `${k}=${h === Infinity ? "missing" : Math.round(h) + "h"}`)
        .join(", ");

    emit(event, msg);
    process.exit(0);
  } catch {
    process.exit(0);
  }
})();
