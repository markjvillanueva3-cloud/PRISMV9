#!/usr/bin/env node
/**
 * quoting-alert-banner — iter28: turn latest-drift-alert.json into a
 * SessionStart-compatible additionalContext block.
 *
 * Future iter wires this as a SessionStart hook so chats see the alert level
 * on session open. Today, ships as a standalone script (operator runs it, OR
 * a Stop-hook prints it to AGENT_CHAT, OR a peer wires it into the
 * SessionStart bundle when peer-coordination time allows).
 *
 * Exports:
 *   formatAlertBanner(state) -> {text, shouldInject}
 *     state: the iter15 state-file payload {schema_version, ts_iso, alert, summary}
 *     text: human-readable markdown block
 *     shouldInject: true only if alert.level === "alert" or "warn"
 *                   (operators don't want to see "ok" banner spam every session)
 *
 *   loadAndFormatAlert(path) -> Promise<{text, shouldInject}>
 *     reads + parses + formats in one call; null path uses default location
 *
 * Behavior matrix:
 *   level=alert -> 🚨 banner with all reasons + remediation pointer
 *   level=warn  -> ⚠ banner (lighter)
 *   level=info  -> shouldInject=false (silent unless --verbose)
 *   level=ok    -> shouldInject=false
 *   no state file -> shouldInject=false (silent — first-run case)
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-ALERT-BANNER (charlie /goal-yolo iter28)
 */

import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_STATE_PATH = "state/shared/quoting/latest-drift-alert.json";
const STALE_HOURS_THRESHOLD = 48;

/**
 * Pure formatter — turns the iter15 state-file shape into a banner.
 * Defensive against null/non-object/missing-fields.
 */
export function formatAlertBanner(state, opts = {}) {
  const verbose = Boolean(opts.verbose);
  const nowMs = typeof opts.nowMs === "number" ? opts.nowMs : Date.now();

  if (!state || typeof state !== "object") {
    return {
      shouldInject: false,
      text: "",
      reason: "no-state-file",
    };
  }
  const alert = state.alert ?? {};
  const summary = state.summary ?? null;
  const level = typeof alert.level === "string" ? alert.level : "info";
  const reasons = Array.isArray(alert.reasons) ? alert.reasons : [];

  // Staleness check — a 3-day-old state file probably means the cron isn't running.
  // Use raw fractional hours for the comparison (so 48h+1m correctly flags as stale);
  // keep Math.round only for the displayed value.
  let staleHours = null;
  let staleHoursRaw = null;
  if (typeof state.ts_iso === "string") {
    const t = new Date(state.ts_iso).getTime();
    if (Number.isFinite(t)) {
      staleHoursRaw = (nowMs - t) / 3_600_000;
      staleHours = Math.round(staleHoursRaw);
    }
  }
  const isStale = staleHoursRaw !== null && staleHoursRaw > STALE_HOURS_THRESHOLD;

  // Only ALERT and WARN inject unless verbose=true (then INFO injects too).
  // OK never injects. Stale always injects (since something's broken).
  const shouldInject = level === "alert" || level === "warn" || isStale || (verbose && level === "info");

  if (!shouldInject) {
    return { shouldInject: false, text: "", reason: `level=${level} (silent)` };
  }

  // Build the markdown block.
  let icon = "ℹ";
  let header = `quoting calibration: ${level.toUpperCase()}`;
  if (level === "alert") {
    icon = "🚨";
    header = `QUOTING CALIBRATION ALERT — operator attention needed`;
  } else if (level === "warn") {
    icon = "⚠";
    header = `quoting calibration WARN — investigate next maintenance window`;
  }
  if (isStale) {
    icon = "🕰";
    header = `quoting calibration state STALE (${staleHours}h since last run, > ${STALE_HOURS_THRESHOLD}h threshold)`;
  }

  const lines = [];
  lines.push(`## ${icon} ${header}`);
  lines.push("");
  if (reasons.length > 0) {
    lines.push("**Reasons:**");
    for (const r of reasons) {
      lines.push(`- ${r}`);
    }
    lines.push("");
  }
  if (summary && typeof summary === "object") {
    const m = summary.mape_pct_avg;
    const trend = summary.mape_trend;
    const cov = summary.cov_gate_fail_rate;
    const safe = summary.safe_to_activate_rate;
    lines.push(`**Last window:** count=${summary.count ?? "?"} · MAPE avg=${m ?? "?"}% · trend=${trend ?? "?"} · cov_gate_fail=${cov !== undefined ? (cov * 100).toFixed(1) + "%" : "?"} · safe=${safe !== undefined ? (safe * 100).toFixed(1) + "%" : "?"}`);
    lines.push("");
  }
  lines.push(`**Triage:** see \`state/shared/quoting/PIPELINE-RUNBOOK.md\` §Troubleshooting.`);
  lines.push(`**State file:** \`${state.active_factor_path ?? DEFAULT_STATE_PATH}\``);
  if (typeof state.ts_iso === "string") {
    lines.push(`**Last update:** ${state.ts_iso}${staleHours !== null ? ` (${staleHours}h ago)` : ""}`);
  }

  return {
    shouldInject: true,
    text: lines.join("\n"),
    reason: isStale ? "stale" : `level=${level}`,
  };
}

/** Load + parse + format in one call. Returns silent-OK on missing file. */
export async function loadAndFormatAlert(path, opts = {}) {
  const resolvedPath = path ?? resolve(process.cwd(), DEFAULT_STATE_PATH);
  let raw;
  try {
    raw = await fs.readFile(resolvedPath, "utf-8");
  } catch {
    return { shouldInject: false, text: "", reason: "no-state-file" };
  }
  let state;
  try {
    state = JSON.parse(raw);
  } catch (e) {
    return { shouldInject: true, text: `## 🚨 quoting-alert-banner: state file unparseable\n\nPath: \`${resolvedPath}\`\nError: ${String(e)}\n\nFix: regenerate via \`node scripts/quoting-train-drift-alert.mjs --json\`.`, reason: "parse-error" };
  }
  return formatAlertBanner(state, opts);
}

// ---------- CLI ----------
const ARGS = process.argv.slice(2);
function flag(name) { return ARGS.includes(`--${name}`); }
function val(name, dflt) {
  const i = ARGS.indexOf(`--${name}`);
  return i >= 0 && i + 1 < ARGS.length ? ARGS[i + 1] : dflt;
}

async function main() {
  const path = val("state", null);
  const verbose = flag("verbose");
  const jsonOut = flag("json");
  const forceEmit = flag("force"); // emit even when shouldInject=false

  const result = await loadAndFormatAlert(path, { verbose });

  if (jsonOut) {
    process.stdout.write(JSON.stringify({ shouldInject: result.shouldInject, reason: result.reason, text: result.text }) + "\n");
  } else if (result.shouldInject || forceEmit) {
    process.stdout.write(result.text + "\n");
  } else {
    process.stderr.write(`[alert-banner] silent (${result.reason})\n`);
  }
  // Exit code mirrors the iter12 drift-alert convention:
  //   2 = alert level · 1 = warn level · 0 = otherwise (silent OK or info)
  // Caller can grep exit code without parsing the JSON.
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    process.stderr.write(`[alert-banner] UNHANDLED: ${e}\n`);
    process.exit(1);
  });
}
