#!/usr/bin/env node
// tier: T3
/**
 * stop-system-awareness-freshness.mjs — SYSTEM-AWARENESS-FRESHNESS-MS0/U-SAF-F1.
 *
 * Stop-hook advisory that detects whether THIS session introduced new staleness
 * to PRISM's awareness layer (new milestone in commits with no CLAUDE.md
 * summary, broken wikilink added, etc.). Surfaces a `systemMessage` advisory
 * — NEVER blocks Stop. Sister to `## Recent regressions` inbox pattern but
 * for new-staleness findings rather than bug findings.
 *
 * Detection:
 *   - Reads baseline snapshot at `state/shared/SYSTEM-AWARENESS-FRESHNESS-BASELINE-<date>.json`.
 *   - Runs fresh audit (7-day lookback for speed).
 *   - If high-severity finding count increased vs baseline → advisory.
 *   - 4-hour global throttle (single stamp file) — multiple chats hitting Stop
 *     within the window collapse to one advisory.
 *
 * Fail-OPEN by construction: missing baseline / spawn error / parse error all
 * exit 0 silently. A noisy advisory is worse than no advisory (R12).
 *
 * Knobs:
 *   PRISM_SAF_STOP_DISABLE=1           — turn off this hook entirely
 *   PRISM_SAF_STOP_THROTTLE_MS=N       — override 4h default
 *   PRISM_SAF_STOP_BASELINE=path       — override baseline path
 *
 * Wired: Stop[N] advisory (no continueOnError concerns — exit 0 always).
 */
import { readFileSync, writeFileSync, statSync, existsSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const STAMP_PATH = "H:/prism/state/shared/.saf-stop-throttle.stamp";
const DEFAULT_THROTTLE_MS = 4 * 60 * 60 * 1000; // 4h
const BASELINE_DIR = "H:/prism/state/shared";
const BASELINE_PREFIX = "SYSTEM-AWARENESS-FRESHNESS-BASELINE-";

// ─── Pure core (exported for tests) ─────────────────────────────────────

/**
 * Decide whether the throttle window has elapsed.
 * - lastStampMs: epoch ms of the last advisory write (or null if missing).
 * - nowMs / throttleMs: clock + window.
 * Returns true if a fresh advisory may fire.
 */
export function throttleAllows({ lastStampMs, nowMs, throttleMs }) {
  if (!Number.isFinite(lastStampMs) || lastStampMs <= 0) return true;
  if (!Number.isFinite(nowMs)) return true; // unknown clock → allow
  return (nowMs - lastStampMs) >= throttleMs;
}

/**
 * Find the most-recent baseline file by name-suffix date (YYYY-MM-DD).
 * Pure: takes `readDir` shape, returns the chosen filename or null.
 */
export function pickLatestBaseline(dirEntries) {
  if (!Array.isArray(dirEntries)) return null;
  const matches = dirEntries
    .filter((e) => typeof e === "string" && e.startsWith(BASELINE_PREFIX) && e.endsWith(".json"))
    .sort(); // ISO-date suffix sorts lexicographically by date
  return matches.length > 0 ? matches[matches.length - 1] : null;
}

/**
 * Compute the regression delta vs baseline.
 * Returns { highRegressed, baselineHigh, freshHigh, newTokens, droppedTokens }.
 *
 * - highRegressed: true if fresh high-severity count > baseline.
 * - newTokens: milestone tokens present in fresh but not baseline (cat 1).
 * - droppedTokens: tokens that ARE in CLAUDE.md now but weren't (improvement).
 */
export function computeDelta(baseline, fresh) {
  if (!baseline || !fresh || !Array.isArray(baseline.findings) || !Array.isArray(fresh.findings)) {
    return { ok: false, reason: "invalid baseline or fresh audit shape" };
  }
  const baselineHigh = baseline.findings.filter((f) => f.severity === "high").length;
  const freshHigh = fresh.findings.filter((f) => f.severity === "high").length;
  const baselineTokens = new Set(baseline.findings.filter((f) => f.category === 1).map((f) => f.token));
  const freshTokens = new Set(fresh.findings.filter((f) => f.category === 1).map((f) => f.token));
  const newTokens = [...freshTokens].filter((t) => !baselineTokens.has(t));
  const droppedTokens = [...baselineTokens].filter((t) => !freshTokens.has(t));
  return {
    ok: true,
    highRegressed: freshHigh > baselineHigh,
    baselineHigh,
    freshHigh,
    newTokensCount: newTokens.length,
    newTokensSample: newTokens.slice(0, 5),
    droppedTokensCount: droppedTokens.length,
  };
}

/**
 * Format the advisory body shown to the operator (≤80 chars/line ideal).
 */
export function formatAdvisory(delta) {
  if (!delta || !delta.ok) return null;
  if (!delta.highRegressed && delta.newTokensCount === 0) return null;
  const lines = [
    "🧠 SAF advisory — session may have introduced new awareness-layer staleness:",
    `  high-severity findings: baseline ${delta.baselineHigh} → fresh ${delta.freshHigh}` +
      (delta.highRegressed ? " (REGRESSED)" : ""),
    `  new milestone tokens missing CLAUDE.md summary: ${delta.newTokensCount}`,
  ];
  if (delta.newTokensSample.length > 0) {
    lines.push(`  sample: ${delta.newTokensSample.join(", ")}`);
  }
  if (delta.droppedTokensCount > 0) {
    lines.push(`  (good news: ${delta.droppedTokensCount} prior token(s) now summarized)`);
  }
  lines.push(
    "  Drain: see state/shared/specs/SYSTEM-AWARENESS-FRESHNESS-MS0.md or " +
      "run `node scripts/system-awareness-freshness-audit.mjs` for full inventory.",
  );
  return lines.join("\n");
}

// ─── Hook I/O ───────────────────────────────────────────────────────────

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function readBaseline() {
  try {
    const explicit = process.env.PRISM_SAF_STOP_BASELINE;
    if (explicit && existsSync(explicit)) {
      return JSON.parse(readFileSync(explicit, "utf-8"));
    }
    const entries = readdirSync(BASELINE_DIR).filter((n) => typeof n === "string");
    const name = pickLatestBaseline(entries);
    if (!name) return null;
    return JSON.parse(readFileSync(join(BASELINE_DIR, name), "utf-8"));
  } catch {
    return null;
  }
}

function readStamp() {
  try {
    if (!existsSync(STAMP_PATH)) return null;
    return statSync(STAMP_PATH).mtimeMs;
  } catch {
    return null;
  }
}

function writeStamp() {
  try { writeFileSync(STAMP_PATH, String(Date.now()) + "\n"); } catch { /* best-effort */ }
}

async function runFreshAudit() {
  try {
    const mod = await import("file:///H:/prism/scripts/system-awareness-freshness-audit.mjs");
    const readFile = mod.makeReadFile();
    const readDir = mod.makeReadDir();
    const gitLog = await mod.makeGitLogAsync();
    return mod.buildAudit({ readFile, readDir, gitLog, lookbackDays: 7 });
  } catch {
    return null;
  }
}

function emitAdvisory(body) {
  process.stdout.write(JSON.stringify({
    continue: true,
    systemMessage: body,
  }));
}

async function main() {
  if (process.env.PRISM_SAF_STOP_DISABLE === "1") return 0;

  const throttleMs = parseInt(process.env.PRISM_SAF_STOP_THROTTLE_MS || String(DEFAULT_THROTTLE_MS), 10) || DEFAULT_THROTTLE_MS;
  const lastStamp = readStamp();
  if (!throttleAllows({ lastStampMs: lastStamp, nowMs: Date.now(), throttleMs })) return 0;

  // Consume stdin (PreToolUse contract — we don't actually need it but draining
  // avoids EPIPE on the harness side).
  readStdinSafe();

  const baseline = readBaseline();
  if (!baseline) return 0; // fail-open

  const fresh = await runFreshAudit();
  if (!fresh) return 0;

  const delta = computeDelta(baseline, fresh);
  const advisory = formatAdvisory(delta);
  if (!advisory) return 0; // no regression to surface

  writeStamp();
  emitAdvisory(advisory);
  return 0;
}

// Windows-safe main detection
const __isMain = (() => {
  try {
    const argv = process.argv[1] || "";
    return basename(argv).toLowerCase() === basename(fileURLToPath(import.meta.url)).toLowerCase();
  } catch { return false; }
})();
if (__isMain) {
  main().then((code) => process.exit(code || 0)).catch(() => process.exit(0));
}
