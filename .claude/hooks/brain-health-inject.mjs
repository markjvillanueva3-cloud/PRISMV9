#!/usr/bin/env node
/**
 * .claude/hooks/brain-health-inject.mjs
 *
 * SessionStart hook -- surfaces a BRAIN-MACHINERY failure to every chat when (and only when) the
 * self-improving overnight brain stops working. Reads the already-fresh vault-health rollup
 * (state/shared/vault-health.json, kept current by U-SIERRA-BRAIN-VHEALTH-STEP inside brain-refresh)
 * -- NO subprocess. Fires ONLY on machinery problems:
 *   - a brain-refresh pipeline FAILED (the overnight brain BUILD broke; names which pipeline)
 *   - a gap-sentinel measurement went STALE (the refresh stopped running -> brain not self-measuring)
 *   - a brain report is MISSING (a detector produced nothing)
 *   - the rollup itself is very stale (>24h -> brain-refresh likely not firing at all)
 *
 * It deliberately does NOT fire on data-QUALITY content warns (supersession/contradiction/ambiguous);
 * those are surfaced inside vault-health for whoever runs it, and would be noise on every SessionStart.
 * So this inject is SILENT in the healthy steady state (machinery fine) = ~zero cost, and high-value
 * exactly when the brain is broken. Mirrors the substrate-health-inject discipline.
 *
 * Discipline: ADVISORY only, NEVER blocks; exit 0 on every error class (no inject beats a crashed one).
 * Knob: PRISM_BRAIN_HEALTH_INJECT=0 disables. PRISM_BRAIN_HEALTH_ROLLUP_STALE_H=N (default 24).
 *
 * Stdin: SessionStart JSON envelope (ignored). Stdout: hookSpecificOutput.additionalContext or {}.
 */

// tier: T2
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/PRISM";
const ROLLUP_FILE = path.join(PRISM_ROOT, "state/shared/vault-health.json");
const MAX_BYTES = 1_000_000; // hostile/corrupt-payload guard
const DEFAULT_ROLLUP_STALE_H = 24;
// Measurements brain-refresh itself keeps fresh (rot/supersession via U-SIERRA-BRAIN-GAP-SENTINELS)
// + the brain-refresh row. ONLY these signal "the overnight machinery stopped" when stale/missing.
// ambiguous/contradiction run on their own cadence (or are deliberate residuals), so their lag is
// NOT a brain-refresh failure -- excluding them keeps this inject from firing every session on a
// known-residual lag (caught live: a stale `ambiguous` row was a false positive).
const CORE_MEASUREMENTS = new Set(["rot", "supersession", "brain-refresh"]);

function emit(additionalContext) {
  const payload = additionalContext
    ? { hookSpecificOutput: { hookEventName: "SessionStart", additionalContext } }
    : {};
  process.stdout.write(JSON.stringify(payload) + "\n");
  process.exit(0);
}

/**
 * Pure: given the parsed vault-health rollup + the rollup file age, produce the inject string, or
 * null when the brain MACHINERY is healthy (data-quality content warns are intentionally ignored).
 */
export function formatBrainHealth(roll, { rollupAgeMs = 0, rollupStaleH = DEFAULT_ROLLUP_STALE_H } = {}) {
  if (!roll || typeof roll !== "object" || !Array.isArray(roll.rows)) return null;
  const problems = [];

  const br = roll.rows.find((r) => r && r.key === "brain-refresh");
  if (br && br.severity === "warn") problems.push(`overnight brain-refresh FAILED -- ${br.detail ?? "see vault-health"}`);

  const stale = roll.rows.filter((r) => r && r.stale && CORE_MEASUREMENTS.has(r.key)).map((r) => r.key);
  if (stale.length) problems.push(`stale brain measurement(s): ${stale.join(", ")} (brain-refresh not running)`);

  const missing = roll.rows.filter((r) => r && r.state === "missing" && CORE_MEASUREMENTS.has(r.key)).map((r) => r.key);
  if (missing.length) problems.push(`missing brain report(s): ${missing.join(", ")}`);

  const staleMs = Math.max(1, rollupStaleH) * 3600_000;
  if (rollupAgeMs > staleMs) problems.push(`brain-health summary itself is ${Math.floor(rollupAgeMs / 3600_000)}h stale -- brain-refresh may not be firing`);

  if (!problems.length) return null; // healthy machinery -> silent (content warns are NOT machinery)

  return [
    "## 🧠 Brain-health alert (self-improving overnight brain machinery)",
    ...problems.map((p) => `   - ${p}`),
    "   _Fix: `node scripts/brain-refresh.mjs --force --verbose` ; full report: `node scripts/vault-health.mjs --text`. Disable: PRISM_BRAIN_HEALTH_INJECT=0_",
  ].join("\n");
}

function main() {
  if (process.env.PRISM_BRAIN_HEALTH_INJECT === "0") return emit(null);
  const rollupStaleH = Number(process.env.PRISM_BRAIN_HEALTH_ROLLUP_STALE_H) || DEFAULT_ROLLUP_STALE_H;
  try {
    if (!existsSync(ROLLUP_FILE)) return emit(null); // never run -> nothing to assert (brain-refresh writes it)
    const st = statSync(ROLLUP_FILE);
    if (st.size > MAX_BYTES) return emit(null); // corrupt/hostile -> silent
    const roll = JSON.parse(readFileSync(ROLLUP_FILE, "utf8"));
    return emit(formatBrainHealth(roll, { rollupAgeMs: Date.now() - st.mtimeMs, rollupStaleH }));
  } catch {
    return emit(null); // fail-soft: a parse/read error never blocks or crashes SessionStart
  }
}

function isInvokedDirectly() {
  if (typeof process.argv[1] !== "string") return false;
  try {
    return path.relative(fileURLToPath(import.meta.url), path.resolve(process.argv[1])) === "";
  } catch {
    return false;
  }
}

if (isInvokedDirectly()) {
  try { main(); } catch { emit(null); }
}
