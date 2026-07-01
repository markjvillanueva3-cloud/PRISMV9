// scripts/lib/octopus-record-lib.mjs
//
// U-HOC02 — pure-core lib for octopus-output → Hermes ledger.
//
// Records each octopus 7-voice consensus run as a structured JSONL entry the
// Hermes skill-loop pipeline can cluster on. The entry shape mirrors the
// existing skill-candidates.jsonl entries so clusterCandidates +
// gateCandidate can promote recurring consensus patterns into codified
// policies ("for prompts matching X, the answer is Y; skip octopus").
//
// Pure-core: every I/O arg injected. Caller writes the JSONL line.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { redactSecrets } from "./redact-secrets.mjs";

export const SCHEMA_VERSION = "1.0.0";
export const DEFAULT_LEDGER = "H:/prism/state/shared/octopus-runs.jsonl";
export const KIND_OCTOPUS = "octopus-consensus";

// Defensive redaction pass over psnExemplars before they are persisted to the
// shared-branch ledger. The loader already redacts every snippet at the source,
// but a caller may build exemplars from un-redacted corpora — so we mask any
// secret-shaped string here too (belt-and-suspenders, never trust upstream).
// Recursively masks every string leaf; preserves the object/array structure so
// downstream Hermes clustering still reads { legs:[{name,hits:[{text,score}]}] }.
export function redactExemplars(value) {
  if (typeof value === "string") return redactSecrets(value);
  if (Array.isArray(value)) return value.map((v) => redactExemplars(v));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = redactExemplars(v);
    return out;
  }
  return value; // numbers / null / bool pass through untouched
}

// Build a structured ledger entry from an octopus run.
// Inputs are flexible — the caller passes what it has; missing fields default
// to null and downstream Hermes consumers see them as "absent". R12: every
// field is named even when null so cluster signatures are stable.
export function buildOctopusEntry({
  prompt,
  voices,            // array of { id, verdict, score?, dissent? }
  consensus,         // { verdict, confidence?, dissent_items? }
  psnExemplars,      // optional — { tribal?:[], skills?:[], wiki?:[] } injected (HOC01 output)
  routerDecision,    // optional — from HOC03 (route:single-claude | route:octopus | …)
  slot,
  chatId,
  outcome,           // optional operator feedback ('correct'|'wrong'|'pending')
  at = new Date().toISOString(),
}) {
  if (typeof prompt !== "string" || prompt.length === 0) {
    throw new Error("buildOctopusEntry: prompt required");
  }
  if (!Array.isArray(voices) || voices.length === 0) {
    throw new Error("buildOctopusEntry: voices[] required (non-empty)");
  }
  // Signature mirrors skill-candidate convention — a concise tool-call-style
  // hash that buckets semantically-similar prompts. For octopus, the signature
  // is verdict-pattern based ("4-1-split" / "unanimous" / "3-2-tie"), so the
  // cluster lens groups by consensus shape.
  const verdictTally = new Map();
  for (const v of voices) {
    const k = String(v?.verdict ?? "unknown");
    verdictTally.set(k, (verdictTally.get(k) || 0) + 1);
  }
  const tallyDesc = [...verdictTally.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([v, n]) => `${v}=${n}`)
    .join("|");
  const signature = `octopus:${tallyDesc}`;
  // WRITE-TIME REDACTION (P5 data-leak fix): every free-text field persisted to
  // the shared-branch ledger is passed through redactSecrets so a secret embedded
  // in a prompt (sk-…/ghp_…/Bearer …/api_key=…) can NEVER survive verbatim into
  // the ledger — and therefore never into knowledge/memories/generated/WEEKLY-*.md
  // (which is NOT gitignored). psnExemplars already went through redactExemplars;
  // we extend the same masking to prompt, semanticSummary, consensus.verdict +
  // dissent_items, and each voice's verdict + dissent. redactSecrets is pure +
  // fail-soft (non-string → "") so this can never throw into the octopus run.
  const safePrompt = redactSecrets(prompt.slice(0, 4096));
  return {
    schemaVersion: SCHEMA_VERSION,
    at,
    slot: slot ?? null,
    chatId: chatId ?? null,
    eligible: true,
    reason: "octopus-completed",
    kind: KIND_OCTOPUS,
    signature,
    callCount: voices.length,
    outcome: outcome ?? "pending",
    prompt: safePrompt,
    voices: voices.map((v) => ({
      id: String(v?.id ?? "unknown"),
      verdict: redactSecrets(String(v?.verdict ?? "unknown")),
      score: Number.isFinite(Number(v?.score)) ? Number(v.score) : null,
      dissent: typeof v?.dissent === "string" ? redactSecrets(v.dissent.slice(0, 512)) : null,
    })),
    consensus: consensus
      ? {
          verdict: redactSecrets(String(consensus.verdict ?? "unknown")),
          confidence: Number.isFinite(Number(consensus.confidence)) ? Number(consensus.confidence) : null,
          dissent_items: Array.isArray(consensus.dissent_items)
            ? consensus.dissent_items.slice(0, 16).map((d) => redactSecrets(String(d).slice(0, 256)))
            : [],
        }
      : null,
    psnExemplars: psnExemplars && typeof psnExemplars === "object" ? redactExemplars(psnExemplars) : null,
    routerDecision: typeof routerDecision === "string" ? routerDecision : null,
    // Adds a semanticSummary so HRP01 sub-clustering can split octopus runs
    // by the prompt's actual intent, not just the verdict tally. Redacted too —
    // it is prompt.slice(0,256), so an early-prompt secret would otherwise leak here.
    semanticSummary: redactSecrets(prompt.slice(0, 256)),
  };
}

// Append a JSONL entry to the ledger. Creates parent dir if missing.
// Returns the ledger path written.
//
// CONCURRENCY: uses a TRUE O_APPEND write (fs flag "a"). The prior implementation
// did read-all + concat + rename, which is a lost-update race — two concurrent
// writers both read the same N lines, each appends its own line, and the second
// rename clobbers the first's entry (one run silently dropped). O_APPEND makes
// every write atomically seek-to-end+append at the OS level, so concurrent
// appends interleave by whole lines and can never lose each other. One
// \n-terminated JSON line per entry; schema unchanged.
//
// R12 fail-soft: a write error (disk full, EACCES) must NOT throw into the
// octopus run — the consensus result still stands even if the ledger write
// fails. Returns the ledger path regardless; logs the cause to opts.onError.
export function appendOctopusEntry(entry, opts = {}) {
  const ledger = opts.ledgerPath || DEFAULT_LEDGER;
  try {
    const dir = dirname(ledger);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const line = JSON.stringify(entry) + "\n";
    appendFileSync(ledger, line, { encoding: "utf8", flag: "a" });
  } catch (e) {
    // Never throw to the caller — ledger persistence is best-effort telemetry.
    if (typeof opts.onError === "function") {
      try { opts.onError(e); } catch { /* swallow — fail-soft is absolute */ }
    }
  }
  return ledger;
}

// Convenience composer — given full octopus result, build + append + return entry.
export function recordOctopusRun(input, opts = {}) {
  const entry = buildOctopusEntry(input);
  const ledger = appendOctopusEntry(entry, opts);
  return { entry, ledger };
}

// Read+parse the ledger — returns array of entries (skips malformed lines).
export function readOctopusLedger(opts = {}) {
  const ledger = opts.ledgerPath || DEFAULT_LEDGER;
  if (!existsSync(ledger)) return [];
  // BUFFER read (NOT "utf8"): the ledger is append-only + unbounded, so once it crosses
  // V8's 512 MiB single-string cap (0x1fffffe8) a readFileSync(...,"utf8") THROWS
  // ERR_STRING_TOO_LONG before any parse -- the exact silent-loss class that clobbered the
  // tribal brain 33,639->1 (2026-06-08). A Buffer has no string cap; each LINE is sliced to a
  // small string (never the whole file), so a multi-hundred-MB JSONL ledger reads fine.
  // R12 FAIL LOUD: the file EXISTS (checked above), so a read failure here is a real I/O error
  // (lock/permission/EISDIR), NOT an absent ledger -- THROW rather than return [] (a silent []
  // would masquerade as "no runs" and zero the octopus learning arm of WeeklySynthesis + the
  // per-domain rollup; consumers that want fail-soft wrap this in try/catch, e.g.
  // octopus-weekly-synthesis-loader.buildOctopusBriefBody).
  let buf;
  try {
    buf = readFileSync(ledger);
  } catch (e) {
    throw new Error(
      `readOctopusLedger: ledger exists but is unreadable (${ledger}): ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  const out = [];
  let start = 0;
  while (start < buf.length) {
    let nl = buf.indexOf(0x0a, start); // newline byte
    if (nl === -1) nl = buf.length;
    if (nl > start) {
      const line = buf.toString("utf8", start, nl).trim(); // ONE line -> small string, never >cap
      if (line) {
        try {
          const j = JSON.parse(line);
          if (j && typeof j === "object") out.push(j);
        } catch { /* skip malformed line */ }
      }
    }
    start = nl + 1;
  }
  return out;
}

// Summarise per-voice statistics across the ledger — input to HOC04 voice
// diversity tuning. For each voice id, returns:
//   { totalRuns, dissentCount, uniqueCorrectCount, alignedCount, dissentRate }
// dissent is "voice's verdict differs from consensus verdict";
// uniqueCorrect needs operator outcome=correct AND voice was the only dissenter
// who matched the consensus's final corrected verdict. With outcome=pending,
// uniqueCorrect stays at 0 — operator feedback fills it later.
export function computeVoiceStats(entries) {
  const byId = new Map();
  if (!Array.isArray(entries)) return byId;
  for (const e of entries) {
    if (!e || e.kind !== KIND_OCTOPUS) continue;
    const cv = e.consensus?.verdict;
    for (const v of e.voices || []) {
      // HOC04 voice-weight tuning is VENDOR-level (octopus-setup.mjs is vendor-
      // keyed), so normalize the ledger's per-model diagnostic id (`ollama:<model>`
      // from U-OCTOPUS-VOICE-ID-DIAG) back to the bare vendor for this aggregation.
      // The LEDGER keeps the per-model id (a dropped local voice stays diagnosable);
      // this stat bucket keys by vendor so a proposal maps cleanly to the vendor
      // weight config (R7: the diagnosability change must NOT silently shift HOC04
      // to per-model tuning). Only `ollama:` is model-tagged; other ids are bare.
      const rawId = v?.id || "unknown";
      const id = rawId.startsWith("ollama:") ? "ollama" : rawId;
      const slot = byId.get(id) || { id, totalRuns: 0, dissentCount: 0, uniqueCorrectCount: 0, alignedCount: 0 };
      slot.totalRuns += 1;
      if (cv && v.verdict !== cv) slot.dissentCount += 1;
      else if (cv && v.verdict === cv) slot.alignedCount += 1;
      byId.set(id, slot);
    }
  }
  for (const s of byId.values()) {
    s.dissentRate = s.totalRuns > 0 ? s.dissentCount / s.totalRuns : 0;
  }
  return byId;
}
