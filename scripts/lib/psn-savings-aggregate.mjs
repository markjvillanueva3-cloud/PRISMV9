// scripts/lib/psn-savings-aggregate.mjs
// -------------------------------------
// PSN-SAVINGS-AGGREGATE/U-PSA01 (2026-05-24, slot:alpha)
//
// Unifies the 6 token-savings telemetry sidecars shipped this session into
// one PSN-friendly daily summary. Pure-function aggregator; the Stop hook
// calling this owns file I/O.
//
// Tracked ledgers:
//   1. rtk-savings-ledger.jsonl                  → bash rtk hit/miss + saved-tokens
//   2. prompt-rewrites.jsonl                     → rewriter skip/success
//   3. pre-tool-savings-multi.jsonl              → Grep/Glob/Write/Bash-git nudges
//   4. read-auto-limit-ledger.jsonl              → Read offset/limit advisories
//   5. read-offset-nudges.jsonl                  → (legacy, may not exist)
//   6. injection-dedup-cache.json (state-only)   → injection dedup hit count

/**
 * Pure: aggregate any number of JSONL strings + a single key→object cache.
 * Returns {byLedger, totals: {nudges, hits, misses, savedTokens}}.
 *
 * Each ledger entry minimum shape: {ts, kind|nudge?, est_tokens?}
 * Robust to malformed lines (silent skip).
 */
export function aggregateSavings(ledgerInputs, dedupCacheJson = null) {
  const byLedger = {};
  const totals = { nudges: 0, hits: 0, misses: 0, savedTokens: 0, ledgersWithData: 0 };
  for (const [name, text] of Object.entries(ledgerInputs || {})) {
    const stats = summarizeJsonl(text);
    byLedger[name] = stats;
    if (stats.lines > 0) totals.ledgersWithData += 1;
    totals.nudges += stats.nudges;
    totals.hits += stats.hits;
    totals.misses += stats.misses;
    totals.savedTokens += stats.savedTokens;
  }
  // Injection-dedup cache is a JSON object, not JSONL — count entries
  if (dedupCacheJson) {
    try {
      const cache = typeof dedupCacheJson === "string" ? JSON.parse(dedupCacheJson) : dedupCacheJson;
      let dedupHits = 0;
      for (const bucket of Object.values(cache || {})) {
        if (bucket && typeof bucket === "object") dedupHits += Object.keys(bucket).length;
      }
      byLedger["injection-dedup-cache"] = { lines: dedupHits, nudges: 0, hits: dedupHits, misses: 0, savedTokens: 0 };
      totals.hits += dedupHits;
    } catch { /* ignore */ }
  }
  return { byLedger, totals };
}

function summarizeJsonl(text) {
  const out = { lines: 0, nudges: 0, hits: 0, misses: 0, savedTokens: 0 };
  if (!text || typeof text !== "string") return out;
  for (const line of text.split("\n")) {
    if (!line) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    out.lines += 1;
    // Disambiguate by shape:
    //   rtk-savings-ledger     uses {kind:'hit'|'miss'|'skip', est_tokens}
    //   pre-tool-savings-multi uses {nudge:bool, reason}
    //   rtk-adoption-measure   uses {kind:'measured', delta_pct} (no nudge, no hit/miss)
    //   prompt-rewrites        uses {rewrite:string|null, raw, skip_reason}
    //   read-auto-limit-ledger uses {kind:'nudge-emitted'|'already-bounded', ...}
    if (e.kind === "hit") {
      out.hits += 1;
      if (Number.isFinite(e.est_tokens)) out.savedTokens += e.est_tokens;
    } else if (e.kind === "miss") {
      out.misses += 1;
    } else if (e.kind === "measured") {
      // Adoption-measure entries are observations, not nudges; count as misses
      // (i.e. "was already-rtk'd, no further save available") so the ledger
      // shows up in ledgersWithData but doesn't inflate hit/nudge counts.
      out.misses += 1;
    } else if (e.kind === "nudge-emitted") {
      // read-auto-limit nudge fired = save claimed
      out.hits += 1;
    } else if (e.kind === "already-bounded") {
      // Read call already had offset/limit; no further save possible
      out.misses += 1;
    } else if (Object.prototype.hasOwnProperty.call(e, "rewrite")) {
      // prompt-rewrites: rewrite is a non-empty string → hit; null/empty → miss
      if (typeof e.rewrite === "string" && e.rewrite.length > 0) {
        out.hits += 1;
        const rawLen = typeof e.raw === "string" ? e.raw.length : 0;
        const newLen = e.rewrite.length;
        if (rawLen > newLen) {
          // ~4 chars/token approx; only positive deltas
          out.savedTokens += Math.max(0, Math.round((rawLen - newLen) / 4));
        }
      } else {
        out.misses += 1;
      }
    } else if (e.nudge === true) {
      out.nudges += 1;
    }
  }
  return out;
}
