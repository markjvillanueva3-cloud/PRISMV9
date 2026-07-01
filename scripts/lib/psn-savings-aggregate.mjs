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
  applyDedupCache(byLedger, totals, dedupCacheJson);
  return { byLedger, totals };
}

/**
 * Shared: fold the injection-dedup cache (a JSON object keyed by injector→hash,
 * NOT JSONL) into an existing {byLedger, totals}. Each hash under each bucket is
 * one suppressed re-injection = one "hit". Mutates byLedger + totals in place so
 * the full-parse (aggregateSavings) and incremental (incrementalAggregate) paths
 * produce byte-identical output. Robust to malformed JSON (silent skip).
 */
export function applyDedupCache(byLedger, totals, dedupCacheJson) {
  if (!dedupCacheJson) return;
  try {
    const cache = typeof dedupCacheJson === "string" ? JSON.parse(dedupCacheJson) : dedupCacheJson;
    let dedupHits = 0;
    for (const bucket of Object.values(cache || {})) {
      if (bucket && typeof bucket === "object") dedupHits += Object.keys(bucket).length;
    }
    byLedger["injection-dedup-cache"] = { lines: dedupHits, nudges: 0, hits: dedupHits, misses: 0, savedTokens: 0 };
    totals.hits += dedupHits;
  } catch { /* ignore malformed cache */ }
}

export function summarizeJsonl(text) {
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
      // prompt-rewrites: the live rewriter emits THREE shapes (PSN-REWRITE-SHAPE-FIX
      // 2026-06-21, slot:alpha -- corrects the 2026-06-19 "fully dead / 0h is honest"
      // memory, which sampled only recent null lines; the full ledger has 349
      // structured-OBJECT successes the old string-only check miscounted as misses):
      //   1. non-empty STRING  -> legacy compression rewrite: hit + (rawLen-newLen)
      //      char-delta savings (the prompt was shortened in place).
      //   2. structured OBJECT (e.g. {goal,scope,acceptance_criteria,...}, NOT
      //      {skip:true}) -> a REAL successful rewrite, but it is injected as
      //      additionalContext (augmentation, NOT substitution of the raw prompt),
      //      so it does NOT compress input tokens. Count the HIT (the rewriter ran
      //      and produced a grounding) but credit ZERO savings -- attributing a
      //      (rawLen-newLen) delta here would be an R12 over-credit (the exact trap
      //      [[reference_psn_aggregate_schema_mismatch_2026_06_12]] warns about).
      //   3. null / "" / {skip:true} -> the rewriter skipped: miss.
      const rw = e.rewrite;
      if (typeof rw === "string" && rw.length > 0) {
        out.hits += 1;
        const rawLen = typeof e.raw === "string" ? e.raw.length : 0;
        const newLen = rw.length;
        if (rawLen > newLen) {
          // ~4 chars/token approx; only positive deltas
          out.savedTokens += Math.max(0, Math.round((rawLen - newLen) / 4));
        }
      } else if (
        rw && typeof rw === "object" && !Array.isArray(rw) &&
        rw.skip !== true && !e.skip_reason && Object.keys(rw).length > 0
      ) {
        // structured rewrite succeeded -> real activity (hit), zero compression savings.
        // !e.skip_reason guard: the rewriter logs the FULL structured object even when
        // it self-rejects (e.g. skip_reason:"low-confidence", prompt-rewriter-ollama.mjs),
        // so a logged-but-rejected rewrite must NOT be over-counted as a hit (forward-safe;
        // 0 live occurrences today but closes the latent edge).
        out.hits += 1;
      } else {
        out.misses += 1;
      }
    } else if (e.nudge === true) {
      out.nudges += 1;
    }
  }
  return out;
}

// -- Incremental / offset-based aggregation (U-PSN-INCREMENTAL-AGGREGATE, slot:alpha
//    2026-06-22) ---------------------------------------------------------------
// The deferred follow-up to U-PSN-AGGREGATE-TAILREAD-FIX: instead of re-parsing every
// ledger in full on each aggregate run (a per-run cost that grows unbounded with the 4
// append-only ledgers -- pre-tool-savings-multi / rtk-adoption / read-auto / nav), carry
// a per-ledger byte offset + the prior per-ledger stats, and on each run parse ONLY the
// bytes appended since the last checkpoint. Read cost is then bounded by the per-run
// delta, NOT the file size, permanently retiring the 64MB crash-guard as a routine path.
//
// Correctness invariant: for append-only ledgers, fold(prevStats, summarize(deltaLines))
// == summarize(fullFile), because summarizeJsonl is a pure per-line sum and the offset
// always lands on a '\n' boundary (so deltas split cleanly on whole lines). Re-baseline
// (full re-read) on a detected shrink (prune/rotation truncates the file) or a changed
// file head (front-rewrite) keeps the result identical to a full parse. A partial final
// line (concurrent half-write) is deferred to the next run -- strictly safer than parsing
// a half-written record. See [[reference_psn_aggregate_tailread_fix_2026_06_21]].

const NEWLINE = 0x0a;
export const HEAD_PROBE_BYTES = 128;

export function emptyStats() {
  return { lines: 0, nudges: 0, hits: 0, misses: 0, savedTokens: 0 };
}

/** Pure field-wise add of two summary objects. */
export function foldStats(a, b) {
  return {
    lines: (a?.lines || 0) + (b?.lines || 0),
    nudges: (a?.nudges || 0) + (b?.nudges || 0),
    hits: (a?.hits || 0) + (b?.hits || 0),
    misses: (a?.misses || 0) + (b?.misses || 0),
    savedTokens: (a?.savedTokens || 0) + (b?.savedTokens || 0),
  };
}

/**
 * Pure: from a Buffer slice, return the text of COMPLETE (newline-terminated) lines and
 * the byte index just past the last consumed '\n' (so the caller advances its offset to
 * a clean boundary, deferring any trailing partial line).
 *   - dropLeadingPartial: when the slice began mid-file (a tail-capped re-baseline), skip
 *     everything up to and including the first '\n' so the first parsed line is whole.
 * Returns { text, endOffset } where endOffset is relative to the start of `buf`.
 */
export function sliceCompleteLines(buf, { dropLeadingPartial = false } = {}) {
  if (!buf || buf.length === 0) return { text: "", endOffset: 0 };
  let begin = 0;
  if (dropLeadingPartial) {
    const firstNl = buf.indexOf(NEWLINE);
    if (firstNl === -1) return { text: "", endOffset: buf.length }; // whole slice is one partial line
    begin = firstNl + 1;
  }
  const lastNl = buf.lastIndexOf(NEWLINE);
  if (lastNl < begin) return { text: "", endOffset: begin }; // no complete line after begin
  return { text: buf.toString("utf8", begin, lastNl + 1), endOffset: lastNl + 1 };
}

/**
 * Incremental aggregator. I/O is injected (so it is unit-testable with in-memory fakes):
 *   - statSize(name)            -> current byte size, or null/0 if missing/empty
 *   - readHead(name, n)         -> first `n` bytes as utf8 (rotation/front-rewrite probe)
 *   - readRange(name, start, end) -> Buffer of bytes [start, end)
 * Inputs:
 *   - ids: ordered ledger names (keys into the I/O callbacks)
 *   - checkpoint: prior { [name]: {offset, size, head} } (empty/absent => cold start)
 *   - prevByLedger: prior per-ledger stats { [name]: stats }
 *   - maxReadBytes: re-baseline crash-guard cap (a tail-capped re-baseline undercounts the
 *     dropped head -- same disclosed behavior as the legacy 64MB ceiling)
 *   - dedupCacheJson: the injection-dedup cache (object|string|null), folded via the SAME
 *     applyDedupCache helper as aggregateSavings so totals are byte-identical.
 * Returns { byLedger, totals, checkpoint } -- the new checkpoint persists to the sidecar.
 */
export function incrementalAggregate({
  ids,
  checkpoint = {},
  prevByLedger = {},
  statSize,
  readHead,
  readRange,
  maxReadBytes = 64_000_000,
  dedupCacheJson = null,
}) {
  const byLedger = {};
  const newCheckpoint = {};
  for (const name of ids || []) {
    const size = statSize(name);
    if (size == null || size === 0) {
      byLedger[name] = emptyStats();
      newCheckpoint[name] = { offset: 0, size: size || 0, head: "" };
      continue;
    }
    const cp = checkpoint[name];
    const prev = cp && prevByLedger[name] ? prevByLedger[name] : null;
    const head = readHead(name, HEAD_PROBE_BYTES);
    const shrunk = !!cp && size < (cp.size ?? 0);
    // Front-rewrite detection: a pure append always EXTENDS the head prefix (and for a
    // file smaller than the probe window the head grows as bytes are appended), so an
    // exact `head !== cp.head` would false-positive on every small-file append. Compare
    // by prefix instead: only a rewrite that changes the early bytes breaks startsWith.
    // (A shrink-then-rewrite is already caught by the size guard above.) RESIDUAL (R12,
    // disclosed): an in-place rewrite of bytes PAST the 128-byte head window that does NOT
    // shrink the file would escape both guards and fold a delta onto stale stats. This is
    // unreachable for the current producers -- all 6+ ledgers are append-only JSONL whose
    // only non-append mutation is stop-ledger-prune's head-drop (which always shrinks). A
    // future producer that body-rewrites-without-shrinking would need a tail anchor or a
    // checkpoint-region content hash here.
    const rotated = !!cp && typeof cp.head === "string" && cp.head.length > 0 && !head.startsWith(cp.head);
    const prevOffset = cp?.offset ?? 0;

    if (!prev || shrunk || rotated) {
      // RE-BASELINE: prior stats invalid (cold start, prune-shrink, or front-rewrite).
      const start = size > maxReadBytes ? size - maxReadBytes : 0;
      const buf = readRange(name, start, size);
      const { text, endOffset } = sliceCompleteLines(buf, { dropLeadingPartial: start > 0 });
      byLedger[name] = summarizeJsonl(text);
      newCheckpoint[name] = { offset: start + endOffset, size, head };
    } else if (size > prevOffset) {
      // DELTA: parse only the bytes appended since the checkpoint. prevOffset is always a
      // clean line boundary, so the slice starts at a line start; a partial final line is
      // deferred (offset stays before it) rather than parsed half-written.
      const buf = readRange(name, prevOffset, size);
      const { text, endOffset } = sliceCompleteLines(buf, { dropLeadingPartial: false });
      byLedger[name] = foldStats(prev, summarizeJsonl(text));
      newCheckpoint[name] = { offset: prevOffset + endOffset, size, head };
    } else {
      // UNCHANGED (size === prevOffset, no shrink/rotation): carry prior stats; no read.
      byLedger[name] = prev;
      newCheckpoint[name] = { offset: prevOffset, size, head };
    }
  }
  // Totals over the JSONL ledgers, mirroring aggregateSavings exactly, then fold the dedup
  // cache via the shared helper so the incremental + full-parse paths are byte-identical.
  const totals = { nudges: 0, hits: 0, misses: 0, savedTokens: 0, ledgersWithData: 0 };
  for (const stats of Object.values(byLedger)) {
    if (stats.lines > 0) totals.ledgersWithData += 1;
    totals.nudges += stats.nudges;
    totals.hits += stats.hits;
    totals.misses += stats.misses;
    totals.savedTokens += stats.savedTokens;
  }
  applyDedupCache(byLedger, totals, dedupCacheJson);
  return { byLedger, totals, checkpoint: newCheckpoint };
}
