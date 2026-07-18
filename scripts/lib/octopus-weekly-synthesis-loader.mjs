// scripts/lib/octopus-weekly-synthesis-loader.mjs
//
// PSN-OCTOPUS-FLEET-SYNERGY-MS0 / P5 — U-FLEET-P5-WEEKLY-SYNTHESIS-OCTOPUS-LOADER.
//
// Feeds the octopus multi-LLM consensus ledger (state/shared/octopus-runs.jsonl)
// into the long-horizon reflective memory produced by the WeeklySynthesisEngine
// (mcp-server/src/engines/WeeklySynthesisEngine.ts). The engine synthesizes a
// Sunday weekly retro from the daily-context lineage returned by an injectable
// LoaderFn. This lib composes a SECOND synthesis source — a single markdown
// brief that summarizes the week's cross-vendor consensus runs — and registers
// it ALONGSIDE the engine's defaultLoader, so the retro can reflect on what the
// fleet's model-consensus actually decided.
//
// CONTRACT bridged (the engine's DI boundary, WeeklySynthesisEngine.ts L85-92):
//   LoaderFn(opts:{vaultRoot,date}) -> Promise<WeeklySource[]>
//   WeeklySource :: { date:string, path:string, body:string, bytes:number }
// We do NOT bolt octopus reads inline into the engine — we COMPOSE: wrap the
// base loader, append our octopus brief as one extra WeeklySource. The engine
// then truncates each source again at its own MAX_SOURCE_BYTES gate, so the
// octopus brief honors the same byte budget as every daily-context brief.
//
// DEFAULT-OFF KNOB (zero behavior change for existing callers):
//   PRISM_WEEKLY_SYNTHESIS_OCTOPUS=1  enables the composed loader. When unset
//   (or any value !== "1"), composeOctopusLoader returns the base loader
//   UNCHANGED — the engine's behavior is byte-identical to before this unit.
//
// FAIL-SOFT (R12): a missing/empty/corrupt ledger never throws and never
// aborts the weekly retro — it simply contributes zero octopus sources (the
// daily-context briefs still synthesize). readOctopusLedger already skips
// malformed JSONL lines; we additionally guard every step.
//
// Karpathy discipline:
//   CLASSIFY: bounded read + filter + project of an append-only JSONL ledger
//   TECHNIQUE: readOctopusLedger (reuse) -> kind filter -> recency sort -> cap N
//              -> render markdown brief -> byte-truncate
//   EDGE CASES: ledger absent, empty, all-malformed, non-octopus kinds only,
//     missing consensus/voices fields, NaN/garbage maxRecords/maxBytes,
//     oversized single record (adversarial), invalid `at` timestamps
//   FAILURE MODES: every projection try/caught; whole loader fail-soft to []

import { readOctopusLedger, KIND_OCTOPUS } from "./octopus-record-lib.mjs";
import { redactSecrets } from "./redact-secrets.mjs";
import { readConsensusOutcomes, listOutcomeDomains, OUTCOME_BASE } from "./octopus-consumption-bridge.mjs";

// Re-exported so the WeeklySynthesisEngine wire can enable the per-domain rollup by passing the
// feed directory through composeOctopusLoader({outcomesDir}) without importing the bridge itself.
export const OCTOPUS_OUTCOMES_DIR = OUTCOME_BASE;

// The byte budget MUST agree with the engine's MAX_SOURCE_BYTES (6000). The
// engine re-truncates anyway, but truncating here keeps the prompt cheap if a
// caller bypasses the engine. We do NOT import the TS constant (the .ts engine
// is bundled, not resolvable from a plain-.mjs runtime), so it is exported here
// for the test to assert it equals the engine's value (no silent drift). If the
// engine ever bumps MAX_SOURCE_BYTES, the test pins this to follow.
export const OCTOPUS_SOURCE_MAX_BYTES = 6_000;

// Cap how many recent consensus records fold into one weekly brief. A week of
// fleet octopus runs is small, but an unbounded fold would let a runaway ledger
// blow the byte budget before truncation even reads it. 40 is generous for a
// week and keeps the pre-truncation render bounded.
export const DEFAULT_MAX_RECORDS = 40;

// Hard floors/ceilings so a garbage env/opt can never produce a pathological
// read (negative slice, NaN budget, multi-MB render).
const MAX_RECORDS_CEILING = 500;
const MAX_BYTES_CEILING = 64_000;
const MAX_BYTES_FLOOR = 256;

// The synthetic source's stable identity in the retro. The `date` is the retro
// anchor (so it always lands inside the engine's 7-day window) and the `path`
// is a sentinel URI (never read from disk) that makes the source identifiable
// in the retro frontmatter + "Source briefs" list.
export const OCTOPUS_SOURCE_DATE_FALLBACK = "octopus";
export const OCTOPUS_SOURCE_SENTINEL_PATH = "octopus://consensus-ledger";

// Per-domain rollup (U-FLEET-CONSUME consumption): a SECOND synthetic source that reads the
// per-galaxy octopus-outcomes feeds (state/shared/octopus-outcomes/<domain>.jsonl) — distinct from
// the global-ledger brief above. The feeds are domain-keyed AND carry only real dispatched+ok
// consensus (the ledger is neither), so this gives the retro a clean "what did the fleet conclude
// per galaxy" view the flat ledger cannot.
export const OCTOPUS_ROLLUP_SOURCE_DATE_FALLBACK = "octopus-rollup";
export const OCTOPUS_ROLLUP_SENTINEL_PATH = "octopus://per-domain-rollup";
// Recent real-consensus outcomes folded per galaxy. A week of real fleet consensus per domain is
// small; 5 keeps the latest decisions without letting one busy galaxy dominate the byte budget.
export const DEFAULT_PER_DOMAIN_LIMIT = 5;
const MAX_DOMAINS_CEILING = 100;

const ENABLE_KNOB = "PRISM_WEEKLY_SYNTHESIS_OCTOPUS";

/** Clamp `n` to [floor, ceiling]; fall back to `dflt` for non-finite input. */
function clampInt(n, dflt, floor, ceiling) {
  const v = Number(n);
  if (!Number.isFinite(v)) return dflt;
  const i = Math.trunc(v);
  if (i < floor) return floor;
  if (i > ceiling) return ceiling;
  return i;
}

/** UTF-8 byte length of a string (single source of truth for `bytes`). */
function byteLen(s) {
  return Buffer.byteLength(s, "utf8");
}

/**
 * Truncate `body` to at most `max` UTF-8 bytes, appending a marker if it had to
 * cut. Mirrors WeeklySynthesisEngine.truncateBody's behavior (byte-safe slice
 * that never leaves a dangling U+FFFD from a mid-codepoint cut). Kept local —
 * the engine helper is a bundled TS export not resolvable from plain .mjs.
 */
export function truncateToBytes(body, max = OCTOPUS_SOURCE_MAX_BYTES) {
  const cap = clampInt(max, OCTOPUS_SOURCE_MAX_BYTES, MAX_BYTES_FLOOR, MAX_BYTES_CEILING);
  const buf = Buffer.from(String(body), "utf8");
  if (buf.length <= cap) return String(body);
  // toString may cut mid-codepoint leaving U+FFFD; strip a trailing run of it.
  return buf.toString("utf8", 0, cap).replace(/�+$/, "") + "\n\n[truncated]\n";
}

/**
 * Render ONE consensus record into a few terse markdown lines. Pure + defensive
 * — every field is optional in the wild, so each is coalesced. The verdict +
 * confidence + voice-tally are the load-bearing signal for the retro.
 */
export function renderConsensusRecord(rec) {
  const at = typeof rec?.at === "string" && rec.at ? rec.at : "(no-timestamp)";
  const prompt =
    typeof rec?.semanticSummary === "string" && rec.semanticSummary
      ? rec.semanticSummary
      : typeof rec?.prompt === "string"
        ? rec.prompt.slice(0, 256)
        : "(no-prompt)";
  const verdict =
    rec?.consensus && typeof rec.consensus.verdict === "string"
      ? rec.consensus.verdict
      : "(no-consensus)";
  // NB: `Number(null)` is 0 (finite), so a null/absent confidence would render
  // a bogus `conf=0.00`. Require the raw value to be a finite NUMBER first.
  const rawConf = rec?.consensus ? rec.consensus.confidence : undefined;
  const conf =
    typeof rawConf === "number" && Number.isFinite(rawConf)
      ? ` conf=${rawConf.toFixed(2)}`
      : "";
  const voiceCount = Array.isArray(rec?.voices) ? rec.voices.length : 0;
  const sig = typeof rec?.signature === "string" ? rec.signature : "octopus:?";
  const outcome = typeof rec?.outcome === "string" ? rec.outcome : "pending";
  // DEFENSE-IN-DEPTH (P5): the write-time redactor in buildOctopusEntry already
  // masks secrets BEFORE they hit the ledger, but a PRE-FIX ledger line could
  // still carry a raw secret in prompt/verdict. Mask the free-text fields again
  // at render time so a legacy raw secret can never reach the WEEKLY-*.md brief.
  // redactSecrets is pure + fail-soft (non-string → ""), so it never throws.
  const safePrompt = redactSecrets(prompt.replace(/\s+/g, " ").trim());
  const safeVerdict = redactSecrets(verdict);
  const lines = [
    `- **${at}** [${sig}] (${voiceCount} voice${voiceCount === 1 ? "" : "s"}, outcome=${outcome})`,
    `  - prompt: ${safePrompt}`,
    `  - consensus: ${safeVerdict}${conf}`,
  ];
  return lines.join("\n");
}

/**
 * Read + project the octopus ledger into the markdown BODY of one weekly brief.
 * Returns "" when there is nothing to fold (caller treats "" as "no source").
 * Never throws.
 *
 * opts:
 *   ledgerPath  — override the default ledger path (tests inject a fixture)
 *   maxRecords  — cap on records folded (default DEFAULT_MAX_RECORDS)
 *   maxBytes    — byte budget for the rendered body (default OCTOPUS_SOURCE_MAX_BYTES)
 */
export function buildOctopusBriefBody(opts = {}) {
  let entries;
  try {
    entries = readOctopusLedger({ ledgerPath: opts.ledgerPath });
  } catch {
    return ""; // fail-soft — ledger unreadable
  }
  if (!Array.isArray(entries) || entries.length === 0) return "";

  // Keep only real octopus-consensus rows (the ledger could in principle carry
  // other kinds; filter so a foreign row never poses as a consensus brief).
  const consensus = entries.filter((e) => e && e.kind === KIND_OCTOPUS);
  if (consensus.length === 0) return "";

  // Most-recent first by ISO `at`. localeCompare on ISO-8601 strings is a valid
  // chronological sort; rows with a missing/garbage `at` sort to the end.
  const sorted = consensus.slice().sort((a, b) => {
    const av = typeof a?.at === "string" ? a.at : "";
    const bv = typeof b?.at === "string" ? b.at : "";
    return bv.localeCompare(av);
  });

  const maxRecords = clampInt(opts.maxRecords, DEFAULT_MAX_RECORDS, 1, MAX_RECORDS_CEILING);
  const recent = sorted.slice(0, maxRecords);

  const header = [
    "# Octopus multi-LLM consensus — recent fleet runs",
    "",
    `${recent.length} of ${consensus.length} consensus run(s), most-recent first:`,
    "",
  ];
  const rendered = [];
  for (const rec of recent) {
    try {
      rendered.push(renderConsensusRecord(rec));
    } catch {
      // skip a single un-renderable record — never abort the whole brief
    }
  }
  if (rendered.length === 0) return "";

  const body = header.join("\n") + rendered.join("\n");
  return truncateToBytes(body, opts.maxBytes);
}

/**
 * Build the single octopus WeeklySource (the additional synthesis source), or
 * null when the ledger contributes nothing. `anchorDate` is the retro's anchor
 * (the engine's `date`) so the synthetic source always lands inside the 7-day
 * loader window. Never throws.
 */
export function loadOctopusSource(opts = {}) {
  const body = buildOctopusBriefBody(opts);
  if (!body) return null;
  const date =
    typeof opts.anchorDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(opts.anchorDate)
      ? opts.anchorDate
      : OCTOPUS_SOURCE_DATE_FALLBACK;
  return {
    date,
    path: OCTOPUS_SOURCE_SENTINEL_PATH,
    body,
    bytes: byteLen(body),
  };
}

/**
 * Read the per-galaxy octopus-outcomes feeds and project them into a per-domain rollup markdown
 * body — one line per galaxy with a recent real-consensus outcome (latest verdict + confidence +
 * voice tally). Returns "" when no galaxy has outcomes (caller treats "" as "no source"). Never
 * throws — every feed read is fail-soft.
 *
 * opts:
 *   outcomesDir    — feed directory (default OCTOPUS_OUTCOMES_DIR; tests inject a tmp dir)
 *   perDomainLimit — recent outcomes read per galaxy (default DEFAULT_PER_DOMAIN_LIMIT)
 *   maxDomains     — cap galaxies folded (default/ceiling MAX_DOMAINS_CEILING)
 *   maxBytes       — byte budget for the rendered body (default OCTOPUS_SOURCE_MAX_BYTES)
 */
export function buildPerDomainConsensusRollup(opts = {}) {
  const outcomesDir =
    typeof opts.outcomesDir === "string" && opts.outcomesDir ? opts.outcomesDir : OCTOPUS_OUTCOMES_DIR;
  let domains;
  try {
    domains = listOutcomeDomains({ baseDir: outcomesDir });
  } catch {
    return ""; // fail-soft — feed dir unreadable
  }
  if (!Array.isArray(domains) || domains.length === 0) return "";

  const perDomainLimit = clampInt(opts.perDomainLimit, DEFAULT_PER_DOMAIN_LIMIT, 1, 100);
  const maxDomains = clampInt(opts.maxDomains, MAX_DOMAINS_CEILING, 1, MAX_DOMAINS_CEILING);

  const rows = [];
  for (const domain of domains.slice(0, maxDomains)) {
    let outcomes;
    try {
      outcomes = readConsensusOutcomes(domain, { baseDir: outcomesDir, limit: perDomainLimit });
    } catch {
      continue; // skip a single unreadable feed — never abort the rollup
    }
    if (!Array.isArray(outcomes) || outcomes.length === 0) continue;
    // readConsensusOutcomes returns most-recent-LAST, so the latest decision is the tail.
    const latest = outcomes[outcomes.length - 1];
    // DEFENSE-IN-DEPTH: the publish side already redacts verdict/summary, but re-mask here so a
    // legacy/pre-fix feed line can never carry a raw secret into the WEEKLY-*.md brief.
    const verdict = redactSecrets(
      typeof latest?.verdict === "string" && latest.verdict ? latest.verdict : "(no-verdict)",
    );
    const conf =
      typeof latest?.confidence === "number" && Number.isFinite(latest.confidence)
        ? ` conf=${latest.confidence.toFixed(2)}`
        : "";
    const voiceCount = Number.isFinite(latest?.voiceCount) ? latest.voiceCount : 0;
    const successCount = Number.isFinite(latest?.successCount) ? latest.successCount : voiceCount;
    const at = typeof latest?.at === "string" && latest.at ? latest.at : "(no-timestamp)";
    rows.push(
      `- **${domain}** — ${outcomes.length} recent outcome(s); latest @ ${at}: ${verdict}${conf} (${successCount}/${voiceCount} voices)`,
    );
  }
  if (rows.length === 0) return "";

  const header = [
    "# Octopus per-domain fleet consensus (real outcomes by galaxy)",
    "",
    `${rows.length} galaxy(ies) with recent real-consensus outcomes:`,
    "",
  ];
  return truncateToBytes(header.join("\n") + rows.join("\n"), opts.maxBytes);
}

/**
 * Build the per-domain rollup WeeklySource (the SECOND additional synthesis source), or null when
 * no galaxy feed contributes anything. `anchorDate` keeps the synthetic source inside the engine's
 * 7-day window. Never throws.
 */
export function loadPerDomainRollupSource(opts = {}) {
  const body = buildPerDomainConsensusRollup(opts);
  if (!body) return null;
  const date =
    typeof opts.anchorDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(opts.anchorDate)
      ? opts.anchorDate
      : OCTOPUS_ROLLUP_SOURCE_DATE_FALLBACK;
  return {
    date,
    path: OCTOPUS_ROLLUP_SENTINEL_PATH,
    body,
    bytes: byteLen(body),
  };
}

/**
 * Compose the octopus loader on TOP of an existing LoaderFn. Returns a NEW
 * LoaderFn that yields the base sources PLUS the octopus brief (when the ledger
 * has content). DEFAULT-OFF: when the enable knob is not "1", returns the base
 * loader UNCHANGED so existing callers observe zero behavior change.
 *
 * env is injected so tests toggle the knob without mutating process.env.
 *
 * The composed loader is itself fail-soft: if the base loader throws we let it
 * propagate (the engine's step-2 try/catch already maps that to `no-sources`),
 * but the octopus side is fully contained — a ledger failure can never turn a
 * succeeding base load into a failure.
 */
export function composeOctopusLoader(baseLoader, opts = {}) {
  if (typeof baseLoader !== "function") {
    throw new Error("composeOctopusLoader: baseLoader must be a LoaderFn");
  }
  const env = opts.env || process.env;
  const enabled = String(env?.[ENABLE_KNOB] || "") === "1";
  if (!enabled) return baseLoader; // zero behavior change

  return async function octopusComposedLoader(loaderOpts) {
    const baseSources = await baseLoader(loaderOpts);
    const base = Array.isArray(baseSources) ? baseSources : [];
    const extra = [];
    // Source 1: the global consensus-ledger brief (P5).
    try {
      const octopus = loadOctopusSource({
        ledgerPath: opts.ledgerPath,
        maxRecords: opts.maxRecords,
        maxBytes: opts.maxBytes,
        anchorDate: loaderOpts?.date,
      });
      if (octopus) extra.push(octopus);
    } catch {
      /* fail-soft — octopus never breaks the base load */
    }
    // Source 2: the per-domain rollup from the U-FLEET-CONSUME feeds. ONLY when an outcomesDir is
    // explicitly provided (production passes OCTOPUS_OUTCOMES_DIR; existing ledger-only callers omit
    // it → byte-identical behavior, no per-domain source appended).
    if (typeof opts.outcomesDir === "string" && opts.outcomesDir) {
      try {
        const rollup = loadPerDomainRollupSource({
          outcomesDir: opts.outcomesDir,
          perDomainLimit: opts.perDomainLimit,
          maxDomains: opts.maxDomains,
          maxBytes: opts.maxBytes,
          anchorDate: loaderOpts?.date,
        });
        if (rollup) extra.push(rollup);
      } catch {
        /* fail-soft — the rollup never breaks the base load */
      }
    }
    return extra.length ? [...base, ...extra] : base;
  };
}
