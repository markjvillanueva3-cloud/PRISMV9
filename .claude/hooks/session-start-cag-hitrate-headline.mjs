#!/usr/bin/env node
// tier: T2
/**
 * session-start-cag-hitrate-headline.mjs -- SessionStart hook
 *
 * AGENTIC-SUBSTRATE-BRIDGE/U-CAG-HITRATE-HEADLINE (2026-06-14, slot:bravo)
 *
 * Producer -> consumer closure on the CAG telemetry chain:
 *   record  (recordCagStat in scripts/lib/galaxy-cag-cache.mjs, called from
 *            galaxy-reasoning-bridge.reasonForGalaxy)
 *   query   (prism_session:cag_stats dispatcher action -- U-CAG-STATS-DISPATCH)
 *   surface (THIS hook -- 1-line SessionStart awareness headline)
 *
 * "You cannot optimize an offload/cache rate you cannot see." This makes the
 * AI substrate's CAG cache efficiency visible in every session's awareness, the
 * same way session-start-savings-headline surfaces the token-savings substrate.
 * Reuses the canonical summarizeCagStats() (R8 -- this hook is .mjs, so unlike
 * the TS dispatcher it can import the source-of-truth helper directly).
 *
 * Pure helper exported for tests:
 *   - formatCagHeadline(summary, opts) -> string | null  (null when too sparse)
 *
 * Knobs:
 *   PRISM_CAG_HEADLINE_DISABLE=1
 *   PRISM_CAG_HEADLINE_MIN_TOTAL=N (default 3 -- don't surface near-empty data)
 */

import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readCagStats, summarizeCagStats, CAG_STATS_FILE } from "../../scripts/lib/galaxy-cag-cache.mjs";

const DEFAULT_MIN_TOTAL = 3;
const STALE_MAX_HOURS = 168; // 1 week -- CAG stats are cumulative all-time; a week-dormant substrate is noise.

function pass() { process.stdout.write(JSON.stringify({ continue: true })); }

/**
 * Pure: render the CAG hit-rate headline from a summarizeCagStats() result.
 * Returns null when the data is too sparse to be informative (total < minTotal),
 * or the input is malformed. Never throws.
 */
export function formatCagHeadline(summary, opts = {}) {
  const minTotal = Number.isFinite(opts.minTotal) ? opts.minTotal : DEFAULT_MIN_TOTAL;
  if (!summary || typeof summary !== "object") return null;
  const total = Number.isFinite(summary.total) ? summary.total : 0;
  if (total < minTotal) return null;
  const rate = Number.isFinite(summary.hitRate) ? summary.hitRate : 0;
  const pct = (rate * 100).toFixed(0);
  const galaxies = Number.isFinite(summary.galaxies) ? summary.galaxies : 0;
  // Top galaxies by exercise volume (total), each with its own hit-rate.
  const top = Object.entries(summary.byGalaxy || {})
    .map(([g, v]) => ({ g, total: (v && v.total) || 0, rate: (v && v.hitRate) || 0 }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((x) => `${x.g} ${(x.rate * 100).toFixed(0)}%`)
    .join(", ");
  const lines = [
    `## 🧮 CAG substrate hit-rate`,
    `**${pct}% hit-rate** over **${total}** galaxy-reasoning lookup(s) across **${galaxies}** galaxy(ies)${top ? ` -- top: ${top}` : ""}.`,
  ];
  // Warm-rate self-explainer (U-CAG-HITRATE-HONESTY, slot:alpha): the raw fleet rate is dominated by
  // UNAVOIDABLE first-ask (cold/novel) misses -- at ~1 lookup/galaxy a cold cache physically cannot
  // hit. When miss reasons have been recorded, surface the warm hit-rate (over RECOVERABLE traffic
  // only) so a future chat doesn't chase a low raw rate that is pure cold-start. Rendered only when
  // warmHitRate is a finite number (legacy/untagged data carries null -> headline is unchanged).
  if (Number.isFinite(summary.warmHitRate)) {
    const warmPct = (summary.warmHitRate * 100).toFixed(0);
    const cold = Number.isFinite(summary.coldMisses) ? summary.coldMisses : 0;
    const addr = Number.isFinite(summary.addressableMisses) ? summary.addressableMisses : 0;
    const misses = Number.isFinite(summary.misses) ? summary.misses : 0;
    const coldClause = cold > 0 ? ` -- ${cold} of ${misses} miss(es) are unavoidable first-asks` : "";
    const addrClause = addr > 0 ? `; ${addr} recoverable (doctrine-fingerprint churn -- the real fixable signal)` : ", 0 recoverable misses (cache healthy)";
    lines.push(`**Warm-traffic hit-rate ${warmPct}%** (cold-start excluded)${coldClause}${addrClause}.`);
  }
  lines.push(`_AI-substrate cache efficiency (galaxy-reasoning-bridge CAG). Query: \`prism_session:cag_stats\`. Disable: \`PRISM_CAG_HEADLINE_DISABLE=1\`._`);
  return lines.join("\n");
}

function main() {
  if (process.env.PRISM_CAG_HEADLINE_DISABLE === "1") return pass();
  if (!existsSync(CAG_STATS_FILE)) return pass();
  // Reject a week-stale sink -- a dormant CAG substrate's all-time rate is noise, not awareness.
  try {
    const st = statSync(CAG_STATS_FILE);
    const ageH = (Date.now() - st.mtimeMs) / (3600 * 1000);
    if (ageH > STALE_MAX_HOURS) return pass();
  } catch { return pass(); }
  let summary;
  try { summary = summarizeCagStats(readCagStats(CAG_STATS_FILE)); } catch { return pass(); }
  const minTotal = Number.parseInt(process.env.PRISM_CAG_HEADLINE_MIN_TOTAL ?? String(DEFAULT_MIN_TOTAL), 10);
  const headline = formatCagHeadline(summary, { minTotal });
  if (!headline) return pass();
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: headline },
  }));
}

// Robust main-guard: resolved-path equality (NOT a bare endsWith, which a superstring-named sibling
// would false-trigger on import -- the OOM bug fixed in U-CROSS-PC-VERIFY-WIRE). Fail-soft -> pass.
const isMain = (() => {
  try { return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) { try { main(); } catch { pass(); } }
