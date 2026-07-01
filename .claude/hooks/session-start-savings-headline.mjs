#!/usr/bin/env node
// tier: T2
/**
 * session-start-savings-headline.mjs — SessionStart hook
 *
 * PSN-SAVINGS-AGGREGATE/U-PSA02 (2026-05-24, slot:alpha)
 *
 * Producer→consumer closure: stop-psn-savings-aggregate writes a unified
 * daily summary; this hook reads it on SessionStart + surfaces a 1-line
 * headline. Closes the loop so the operator SEES the cumulative savings
 * from PRISM's compounding token-savings substrate.
 *
 * Pure helpers exported for tests:
 *   - formatHeadline(aggregate) → string | null
 *   - formatLedgerBreakdown(byLedger) → string  (per-ledger compact breakdown)
 *
 * Knobs:
 *   PRISM_SAVINGS_HEADLINE_DISABLE=1
 *   PRISM_SAVINGS_HEADLINE_MIN_HITS=N (default 5 — don't surface near-empty data)
 */

import { readFileSync, existsSync, statSync } from "node:fs";

const AGGREGATE = "H:/prism/state/shared/dashboards/psn-savings-aggregate.json";
const DEFAULT_MIN_HITS = 5;
const STALE_MAX_HOURS = 48;
const BREAKDOWN_MAX_CHARS = 200;

// Compact label mapping for the breakdown line — full ledger keys are too long
// for a 200-char cap once 5+ ledgers are present.
const LEDGER_LABEL = {
  "rtk-savings-ledger": "rtk",
  "prompt-rewrites": "rewriter",
  "pre-tool-savings-multi": "multi",
  "read-auto-limit": "read",
  "rtk-adoption-measure": "rtkAdopt",
  "injection-dedup-cache": "dedup",
};

function pass() { process.stdout.write(JSON.stringify({ continue: true })); }

/**
 * Pure: render a per-ledger breakdown line from the byLedger map.
 *
 * Example output (≤200 chars):
 *   `multi(3n=0.0k) · rtk(84h=42.0k) · rtkAdopt(0h/0m=0.0k) · dedup(7h=0.0k) +1 more`
 *
 * Returns "" on empty/null/non-object input (never throws).
 * Capped at BREAKDOWN_MAX_CHARS (200); excess ledgers collapsed into `+N more`.
 */
export function formatLedgerBreakdown(byLedger) {
  if (!byLedger || typeof byLedger !== "object") return "";
  const entries = [];
  for (const [name, stats] of Object.entries(byLedger)) {
    if (!stats || typeof stats !== "object") continue;
    const label = LEDGER_LABEL[name] || name;
    const nudges = Number.isFinite(stats.nudges) ? stats.nudges : 0;
    const hits = Number.isFinite(stats.hits) ? stats.hits : 0;
    const misses = Number.isFinite(stats.misses) ? stats.misses : 0;
    const saved = Number.isFinite(stats.savedTokens) ? stats.savedTokens : 0;
    const lines = Number.isFinite(stats.lines) ? stats.lines : 0;
    // Skip ledgers with literally zero activity AND zero lines — they add noise.
    if (lines === 0 && hits === 0 && nudges === 0 && misses === 0) continue;
    const savedK = (saved / 1000).toFixed(1);
    // Shape per dominant signal: nudge-class ledgers show `Nn`, hit-class show
    // `Nh`, ledgers tracking both (rtk-adoption-measure) show `Nh/Nm`.
    let fragment;
    if (nudges > 0 && hits === 0) {
      fragment = `${label}(${nudges}n=${savedK}k)`;
    } else if (hits > 0 && nudges === 0 && misses === 0) {
      fragment = `${label}(${hits}h=${savedK}k)`;
    } else if (hits > 0 || misses > 0) {
      // hit/miss telemetry (rtk-adoption-measure, rtk-savings-ledger)
      fragment = `${label}(${hits}h/${misses}m=${savedK}k)`;
    } else {
      // nudges-only or pure-line ledger
      fragment = `${label}(${nudges}n=${savedK}k)`;
    }
    entries.push(fragment);
  }
  if (entries.length === 0) return "";
  // Greedy fit under cap; surplus collapses into `+N more`.
  const SEP = " · ";
  let line = "";
  let included = 0;
  for (let i = 0; i < entries.length; i += 1) {
    const candidate = line ? `${line}${SEP}${entries[i]}` : entries[i];
    const remaining = entries.length - i - 1;
    const tail = remaining > 0 ? ` +${remaining} more` : "";
    if ((candidate + tail).length > BREAKDOWN_MAX_CHARS && line) {
      // Stop here, tail-out
      const moreCount = entries.length - included;
      return `${line} +${moreCount} more`;
    }
    line = candidate;
    included += 1;
  }
  return line;
}

/**
 * Pure: render the headline from an aggregate object. Returns null when
 * data is too sparse to be informative.
 */
export function formatHeadline(aggregate, opts = {}) {
  const minHits = Number.isFinite(opts.minHits) ? opts.minHits : DEFAULT_MIN_HITS;
  if (!aggregate || typeof aggregate !== "object") return null;
  const { totals } = aggregate;
  if (!totals) return null;
  const activity = (totals.hits || 0) + (totals.nudges || 0);
  if (activity < minHits) return null;
  const savedK = ((totals.savedTokens || 0) / 1000).toFixed(1);
  const ledgersWithData = totals.ledgersWithData || 0;
  const breakdown = formatLedgerBreakdown(aggregate.byLedger);
  const lines = [
    `## 📈 PSN savings (cumulative)`,
    `**${totals.hits} hits** · **${totals.nudges} nudges** · est saved **~${savedK}k tokens** across ${ledgersWithData} substrate(s) (rtk + dedup + rewriter + multi-tool + read-auto + rtk-adopt).`,
  ];
  if (breakdown) lines.push(`Detectors: ${breakdown}`);
  lines.push(`_Source: \`state/shared/dashboards/psn-savings-aggregate.json\` (U-PSA01/U-PSA02). Disable: \`PRISM_SAVINGS_HEADLINE_DISABLE=1\`._`);
  return lines.join("\n");
}

function main() {
  if (process.env.PRISM_SAVINGS_HEADLINE_DISABLE === "1") return pass();
  if (!existsSync(AGGREGATE)) return pass();

  // Reject stale (>48h old) — avoids surfacing days-old numbers as if current
  try {
    const st = statSync(AGGREGATE);
    const ageH = (Date.now() - st.mtimeMs) / (3600 * 1000);
    if (ageH > STALE_MAX_HOURS) return pass();
  } catch { return pass(); }

  let agg;
  try { agg = JSON.parse(readFileSync(AGGREGATE, "utf8")); } catch { return pass(); }

  const minHits = Number.parseInt(process.env.PRISM_SAVINGS_HEADLINE_MIN_HITS ?? String(DEFAULT_MIN_HITS), 10);
  const headline = formatHeadline(agg, { minHits });
  if (!headline) return pass();

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: headline },
  }));
}

if (process.argv[1] && process.argv[1].endsWith("session-start-savings-headline.mjs")) {
  try { main(); } catch { pass(); }
}
