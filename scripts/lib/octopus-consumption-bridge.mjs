// scripts/lib/octopus-consumption-bridge.mjs
//
// PSN-OCTOPUS-FLEET-SYNERGY-MS0 / U-FLEET-CONSUME — the consumption substrate.
//
// "Corpus availability ≠ consumption": the octopus now RAGs every galaxy's corpus
// (U-FLEET-P5-ALL-GALAXIES), but its consensus output was going only to the run-ledger.
// This bridge turns each octopus consensus into a per-galaxy OUTCOME record on a feed the
// galaxy's self-improving AI (MillAGI/LatheAGI/QuotingClosedLoop, kind="octopus_consensus")
// can ingest — so the fleet consensus flows BACK into each galaxy's learning loop. This is
// the producer→feed half (octopus run publishes); the engine-side fold (read this feed into
// the EWMA) is the safety-reviewed next step on this foundation.
//
// Pure + fail-soft. Never throws to the caller — a bad consensus / unwritable feed degrades
// to a no-op so a publish failure can never abort an octopus run.
//
// Karpathy discipline:
//   CLASSIFY: transform (consensus→outcome) + append-only ledger I/O
//   TECHNIQUE: pure mapper + O_APPEND (lost-update-free) + bounded tail read
//   EDGE CASES: null/garbage consensus, missing fields, traversal-y domain, absent feed,
//     unparseable feed lines, oversized feed (bounded read)
//   FAILURE MODES: unwritable dir / read error → fail-soft ({ok:false}/[]) — never throw

import * as fs from "node:fs";
import * as path from "node:path";
import { redactSecrets } from "./redact-secrets.mjs";

export const OCTOPUS_OUTCOME_SCHEMA_VERSION = "1.0.0";
export const OUTCOME_KIND = "octopus_consensus";
// Exported so per-domain consumers (e.g. the weekly per-galaxy rollup) can resolve the feed
// directory without re-hard-coding the path.
export const OUTCOME_BASE = "H:/prism/state/shared/octopus-outcomes";
// Same allowlist the corpus loader uses for domains — blocks path traversal in the feed path.
const SAFE_DOMAIN_RE = /^[a-z0-9][a-z0-9_-]*$/i;
const DEFAULT_READ_LIMIT = 50;
const MAX_READ_BYTES = 1_000_000; // bounded tail read — never slurp an unbounded feed
const MAX_FIELD_CHARS = 2000;     // free-text fields (verdict/summary) capped before write — bounded record

/** Coerce to a finite number in [0,1], else undefined (drops the key). */
function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/**
 * Pure map: octopus consensus result → a galaxy outcome record. Defensive about the
 * consensus shape (the dispatch/ledger layers have varied it) — reads the common fields and
 * omits anything missing. Does NOT stamp a timestamp itself (caller passes `at`) so the map
 * stays pure + deterministic for tests.
 *
 * @param {string} domain   — galaxy key (e.g. "mill")
 * @param {object} consensus— mapConsensusToLedger's `.consensus` ({verdict, confidence, dissent_items, semanticSummary}).
 *                            NOTE: voices are NOT here — they are a SIBLING of consensus, passed via opts.voices.
 * @param {object} [opts]   — { at?: ISO string, voices?: Array (the SIBLING voices[]), successCount?: number }
 * @returns {object|null}   — the outcome record, or null when there is nothing to publish
 */
export function consensusToOutcome(domain, consensus, opts = {}) {
  if (typeof domain !== "string" || !SAFE_DOMAIN_RE.test(domain.trim())) return null;
  if (!consensus || typeof consensus !== "object") return null;
  // VOICES live on the dispatch result as a SIBLING of consensus — mapConsensusToLedger returns
  // `{ voices, consensus:{verdict,confidence,dissent_items}, successCount }`, so consensus itself
  // carries NO voices. Take them via opts (the real wiring); the consensus.voices/voteBreakdown
  // fallback is only for a direct caller passing a self-contained object.
  const voices = Array.isArray(opts.voices) ? opts.voices
    : Array.isArray(consensus.voices) ? consensus.voices
    : Array.isArray(consensus.voteBreakdown) ? consensus.voteBreakdown : [];
  // successCount = voices that actually ANSWERED (the meaningful denominator) — from opts (real),
  // else derived from voice verdicts ("answered"), else the full roster as a last resort.
  const answered = voices.filter((v) => v && v.verdict === "answered").length;
  const successCount = Number.isFinite(opts.successCount) ? Number(opts.successCount)
    : answered > 0 ? answered : voices.length;
  const dissent = Array.isArray(consensus.dissent_items) ? consensus.dissent_items
    : Array.isArray(consensus.dissent) ? consensus.dissent : [];
  const verdict = typeof consensus.verdict === "string" ? consensus.verdict
    : typeof consensus.decision === "string" ? consensus.decision : "";
  // Nothing meaningful to publish (e.g. the stub/zero-voice case) → null, never a fake outcome.
  if (!verdict && voices.length === 0) return null;

  const summary = typeof consensus.semanticSummary === "string" ? consensus.semanticSummary
    : typeof consensus.summary === "string" ? consensus.summary : "";
  const out = {
    schemaVersion: OCTOPUS_OUTCOME_SCHEMA_VERSION,
    kind: OUTCOME_KIND,
    domain: domain.trim(),
    verdict: redactSecrets(verdict).slice(0, MAX_FIELD_CHARS),
    voiceCount: voices.length,
    successCount,
    // RAW dissent_items count — NOISY: mapConsensusToLedger packs per-voice failure reasons +
    // a recommendation tag in here, NOT a clean disagreement metric. The SOUND agreement signal
    // is `confidence` below; consumers should weight on confidence, not this count.
    dissentItemCount: dissent.length,
    at: typeof opts.at === "string" && opts.at ? opts.at : null,
  };
  const conf = clamp01(consensus.confidence ?? consensus.agreementScore);
  if (conf !== undefined) out.confidence = conf;
  if (summary) out.semanticSummary = redactSecrets(summary).slice(0, MAX_FIELD_CHARS);
  return out;
}

/** Resolve a safe feed path for a domain, or null if the domain is unsafe. */
export function feedPathFor(domain, baseDir = OUTCOME_BASE) {
  if (typeof domain !== "string") return null;
  const d = domain.trim();
  if (!SAFE_DOMAIN_RE.test(d)) return null; // SAFE_DOMAIN_RE has no slash/dot → no traversal
  return path.join(baseDir, `${d}.jsonl`);
}

/**
 * Publish an octopus consensus as a galaxy outcome (append-only, O_APPEND so concurrent octopus
 * runs never lose-update). Fail-soft: returns { ok, path?, error? } — never throws.
 *
 * @param {string} domain
 * @param {object} consensus — mapConsensusToLedger output's `.consensus` ({verdict,confidence,dissent_items})
 * @param {object} [opts] — { at?: ISO, voices?: Array (the SIBLING voices[]), successCount?: number, baseDir?: string (tests) }
 */
export function publishConsensusOutcome(domain, consensus, opts = {}) {
  try {
    const baseDir = typeof opts.baseDir === "string" ? opts.baseDir : OUTCOME_BASE;
    const feed = feedPathFor(domain, baseDir);
    if (!feed) return { ok: false, error: "unsafe-or-missing-domain" };
    const rec = consensusToOutcome(domain, consensus, { at: opts.at, voices: opts.voices, successCount: opts.successCount });
    if (!rec) return { ok: false, error: "no-publishable-consensus" };
    fs.mkdirSync(path.dirname(feed), { recursive: true });
    fs.appendFileSync(feed, `${JSON.stringify(rec)}\n`, { flag: "a" });
    return { ok: true, path: feed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Read the most-recent consensus outcomes for a galaxy (for engine ingestion). Bounded tail
 * read; unparseable lines skipped. Fail-soft: returns [] on any error / absent feed.
 *
 * @param {string} domain
 * @param {object} [opts] — { limit?: number, baseDir?: string (tests) }
 * @returns {object[]} most-recent-last, up to `limit`
 */
export function readConsensusOutcomes(domain, opts = {}) {
  try {
    const baseDir = typeof opts.baseDir === "string" ? opts.baseDir : OUTCOME_BASE;
    const feed = feedPathFor(domain, baseDir);
    if (!feed || !fs.existsSync(feed)) return [];
    const limit = Number.isFinite(opts.limit) && opts.limit > 0 ? Math.floor(opts.limit) : DEFAULT_READ_LIMIT;
    let text = fs.readFileSync(feed, "utf8");
    if (text.length > MAX_READ_BYTES) text = text.slice(text.length - MAX_READ_BYTES);
    const recs = [];
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      try {
        const o = JSON.parse(t);
        if (o && o.kind === OUTCOME_KIND) recs.push(o);
      } catch { /* skip unparseable line (possible partial first line after the byte-slice) */ }
    }
    return recs.slice(-limit);
  } catch {
    return [];
  }
}

/**
 * Enumerate the domains that currently have an octopus-outcomes feed (one
 * `<domain>.jsonl` per galaxy). For per-domain consumers (e.g. the weekly
 * per-galaxy consensus rollup) that need to discover feeds without a
 * hand-maintained domain list. Only names that pass SAFE_DOMAIN_RE are
 * returned (a stray/hostile filename can never become a "domain"). Fail-soft →
 * [] on a missing dir or any read error.
 *
 * @param {object} [opts] — { baseDir?: string (tests) }
 * @returns {string[]} sorted, unique, safe domain keys that have a feed
 */
export function listOutcomeDomains(opts = {}) {
  try {
    const baseDir = typeof opts.baseDir === "string" ? opts.baseDir : OUTCOME_BASE;
    if (!fs.existsSync(baseDir)) return [];
    const domains = new Set();
    for (const name of fs.readdirSync(baseDir)) {
      if (!name.endsWith(".jsonl")) continue;
      const domain = name.slice(0, -".jsonl".length);
      if (SAFE_DOMAIN_RE.test(domain)) domains.add(domain);
    }
    return [...domains].sort();
  } catch {
    return [];
  }
}
