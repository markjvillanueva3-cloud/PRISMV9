#!/usr/bin/env node
// tier: T2
// U-META-INJECT-PATTERNS — UserPromptSubmit hook that surfaces the most
// recent consolidator output (META_LEARNING_LEDGER.jsonl) as a compact
// failure-pattern warning block. Closes the Layer-4 INJECTION half of the
// training loop:
//
//   CAMFeedbackLoop.recordOutcome
//     → state/shared/kip-outcomes.jsonl  (U-KIP-OUTCOME-RECORDER)
//     → meta-learning-consolidator.mjs   (U-META-LEARNING-CONSOLIDATOR)
//     → META_LEARNING_LEDGER.jsonl       (operator-promoted)
//     → THIS HOOK injects relevant failure patterns next prompt
//
// Article-1 Layer-4 dreaming completes the cycle: the agent SEES its own
// repeat-failure patterns on every prompt — context that compounds across
// sessions, doesn't decay between /compact boundaries.
//
// Safety: never throws; UserPromptSubmit must not block. On any error,
// emits empty additionalContext.
//
// Knobs:
//   PRISM_META_INJECT_DISABLE=1       — revert this hook entirely
//   PRISM_META_INJECT_LEDGER=<path>   — override active ledger path
//   PRISM_META_INJECT_TOP_N=<n>       — max failure-patterns to surface (default 3)
//   PRISM_META_INJECT_VERBOSE=1       — include ledger path in footer

import fs from "node:fs";
import path from "node:path";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const DEFAULT_LEDGER = path.join(PRISM_ROOT, "state/shared/meta-learning/META_LEARNING_LEDGER.jsonl");
const DEFAULT_TOP_N = 3;
const MAX_TOP_N = 10;

function emit(payload) {
  process.stdout.write(JSON.stringify(payload));
  process.exit(0);
}
function emitEmpty() {
  emit({ continue: true });
}

function getLedgerPath() {
  return process.env.PRISM_META_INJECT_LEDGER || DEFAULT_LEDGER;
}

function getTopN() {
  const v = Number(process.env.PRISM_META_INJECT_TOP_N);
  if (!Number.isFinite(v) || v < 1) return DEFAULT_TOP_N;
  return Math.min(v, MAX_TOP_N);
}

/**
 * Read the LAST consolidation entry (last non-empty line) from the active
 * ledger. Older entries are historical — only the latest pattern set is
 * actionable on the current prompt.
 *
 * Returns null if file missing, empty, or last line is corrupt.
 */
export function readLatestConsolidation(ledgerPath) {
  if (!fs.existsSync(ledgerPath)) return null;
  let raw;
  try {
    raw = fs.readFileSync(ledgerPath, "utf8");
  } catch {
    return null;
  }
  const lines = raw.split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return null;
  try {
    return JSON.parse(lines[lines.length - 1]);
  } catch {
    return null;
  }
}

/**
 * Pick top-N failure patterns ordered by severity (high → medium → low) then
 * by sample count (higher = more confidence in the pattern). Returns at most
 * topN items.
 */
export function pickTopFailures(entry, topN) {
  if (!entry || !entry.patterns || !Array.isArray(entry.patterns.failures)) return [];
  const SEVERITY_RANK = { high: 0, medium: 1, low: 2 };
  return entry.patterns.failures
    .slice() // don't mutate input
    .sort((a, b) => {
      const sa = SEVERITY_RANK[a.severity] ?? 99;
      const sb = SEVERITY_RANK[b.severity] ?? 99;
      if (sa !== sb) return sa - sb;
      return (b.samples ?? 0) - (a.samples ?? 0);
    })
    .slice(0, Math.max(1, topN));
}

/**
 * Build the markdown block injected as additionalContext. Returns null if
 * there are no patterns to surface (avoid prompt-bloat per article-1 mistake
 * #2: "dumping everything into the memory file").
 */
export function formatInjectBlock(failures, entry, opts = {}) {
  if (!Array.isArray(failures) || failures.length === 0) return null;
  const verbose = !!opts.verbose;
  const lines = [
    "## 🧠 Meta-learning — recent failure patterns (Layer-4 dreaming)",
    "",
    `_Top ${failures.length} repeat-failure pattern(s) from the last consolidation pass. Source: META_LEARNING_LEDGER.jsonl._`,
    "",
  ];
  for (const f of failures) {
    const pct = ((f.successRate ?? 0) * 100).toFixed(1);
    lines.push(
      `- **${f.severity?.toUpperCase() || "?"}** · \`${f.source}::${f.outcomeType}\` — ${f.samples} sample(s), ${pct}% success rate`,
    );
  }
  lines.push("");
  lines.push(
    "_When you encounter one of these (source, outcomeType) pairs in this prompt, treat it as a known-failing pattern — surface the constraint up-front, escalate, or pick a different approach. Disable: `PRISM_META_INJECT_DISABLE=1`._",
  );
  if (verbose && entry?.inputs?.ledgerPath) {
    lines.push("");
    lines.push(`_(ledger: ${entry.inputs.ledgerPath}, consolidated ${entry.ts})_`);
  }
  return lines.join("\n");
}

async function main() {
  if (process.env.PRISM_META_INJECT_DISABLE === "1") return emitEmpty();

  // Read stdin (UserPromptSubmit envelope) but don't block forever.
  try {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    // We don't actually need the envelope for this hook — it operates on
    // global ledger state. Just drain stdin to keep the harness contract clean.
    void Buffer.concat(chunks);
  } catch {
    return emitEmpty();
  }

  const entry = readLatestConsolidation(getLedgerPath());
  if (!entry) return emitEmpty();

  const failures = pickTopFailures(entry, getTopN());
  const block = formatInjectBlock(failures, entry, {
    verbose: process.env.PRISM_META_INJECT_VERBOSE === "1",
  });
  if (!block) return emitEmpty();

  return emit({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: block },
  });
}

// Run only as main entry — keeps module importable for tests.
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  void main();
}
