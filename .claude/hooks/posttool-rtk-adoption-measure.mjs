#!/usr/bin/env node
// tier: T3
/**
 * posttool-rtk-adoption-measure.mjs — PostToolUse:Bash
 *
 * PSN-RTK-ADOPTION-MEASURE/U-RAM01 (2026-05-24, slot:alpha)
 *
 * Closes audit gap #3: post-tool measurement layer. When an rtk-prefixed
 * Bash command completes, measure the ACTUAL observed-bytes vs the heuristic
 * estimate. Calibration data feeds back into RTK_SAVINGS_FRACTION recalibration.
 *
 * Records to state/shared/dashboards/rtk-adoption-measure.jsonl as
 * {kind:"measured", base, est_tokens, observed_bytes, observed_tokens, delta_pct}.
 *
 * Pure helpers exported for tests:
 *   - baseFromRtkCommand(cmd) → string | null  (extracts the wrapped base cmd)
 *   - calibrate({est_tokens, observed_tokens}) → {delta_pct, classification}
 */

import { readFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";

const TELEMETRY = "H:/prism/state/shared/dashboards/rtk-adoption-measure.jsonl";

export function baseFromRtkCommand(cmd) {
  if (!cmd || typeof cmd !== "string") return null;
  // Match: optional `command ` prefix, then `rtk <base>...`
  const m = cmd.trim().match(/^(?:command\s+)?rtk\s+([A-Za-z][A-Za-z0-9_-]*)/);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Pure: compute delta between heuristic estimate and observed.
 * Returns {delta_pct, classification: 'underestimate'|'overestimate'|'on-target'}.
 * on-target ≡ |delta| ≤ 15% (within calibration noise floor).
 */
export function calibrate({ est_tokens, observed_tokens }) {
  if (!Number.isFinite(est_tokens) || est_tokens <= 0 || !Number.isFinite(observed_tokens)) {
    return { delta_pct: null, classification: "no-data" };
  }
  const delta_pct = ((observed_tokens - est_tokens) / est_tokens) * 100;
  let classification;
  if (Math.abs(delta_pct) <= 15) classification = "on-target";
  else if (delta_pct > 15) classification = "underestimate"; // RTK saved LESS than we projected
  else classification = "overestimate";                       // RTK saved MORE than we projected
  return { delta_pct: Math.round(delta_pct * 10) / 10, classification };
}

function pass() { process.stdout.write(JSON.stringify({ continue: true })); }

function readStdinSync() {
  try { return JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { return {}; }
}

function recordTelemetry(entry) {
  try {
    if (!existsSync(dirname(TELEMETRY))) mkdirSync(dirname(TELEMETRY), { recursive: true });
    appendFileSync(TELEMETRY, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
  } catch { /* fail-soft */ }
}

function main() {
  if (process.env.PRISM_RTK_ADOPTION_DISABLE === "1") return pass();
  const input = readStdinSync();
  const cmd = input?.tool_input?.command;
  const stdout = input?.tool_response?.stdout || input?.tool_response?.output || "";
  const base = baseFromRtkCommand(cmd);
  if (!base) return pass(); // not an rtk command — nothing to measure
  if (typeof stdout !== "string") return pass();

  // RTK_SAVINGS_FRACTION mirrored from rtk-prefix-reminder.mjs
  const FRACTIONS = {
    git: 0.70, gh: 0.55, npm: 0.85, npx: 0.75, yarn: 0.75, pnpm: 0.80,
    vitest: 0.95, tsc: 0.83, tsx: 0.50, node: 0.40,
    docker: 0.85, "docker-compose": 0.80,
    grep: 0.75, rg: 0.75, find: 0.70, cat: 0.60, ls: 0.65,
  };
  const NOMINAL_VERBOSE_TOKENS = 1000;
  const fraction = FRACTIONS[base] ?? 0.50;
  const est_tokens = Math.round(NOMINAL_VERBOSE_TOKENS * fraction);

  const observed_bytes = Buffer.byteLength(stdout, "utf8");
  const observed_tokens = Math.round(observed_bytes / 4); // ~4 bytes/token avg

  const cal = calibrate({ est_tokens, observed_tokens });

  recordTelemetry({
    kind: "measured",
    base,
    est_tokens,
    observed_bytes,
    observed_tokens,
    delta_pct: cal.delta_pct,
    classification: cal.classification,
  });
  pass();
}

if (process.argv[1] && process.argv[1].endsWith("posttool-rtk-adoption-measure.mjs")) {
  try { main(); } catch { pass(); }
}
