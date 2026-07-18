#!/usr/bin/env node
// tier: T2
// audit-viz-first-inject.mjs — UserPromptSubmit T2 hook.
// When an audit/discovery intent is detected, auto-run
// `node scripts/system-viz-query.mjs find <noun>` and inject the top-K hits
// so the chat sees the answer BEFORE reaching for Grep/Glob.
//
// Knobs: PRISM_AUDIT_VIZ_FIRST_DISABLE=1 · PRISM_AUDIT_VIZ_FIRST_K=N (1..20, def 5)
//        PRISM_AUDIT_VIZ_FIRST_TIMEOUT_MS=N (500..30000, def 8000) · PRISM_ROOT
//        PRISM_AUDIT_VIZ_FIRST_STRICT_FILTER=0 (default "1", set "0" to restore
//          pre-2026-05-19 behavior: any matched keyword + any noun fires.
//          The MIN_NOUN_LEN=3 floor still applies under both modes — it was
//          present in the original gate and is intentionally preserved.)
//
// Detection note: longest-prefix-wins is FIRST-match — a prompt like
// "find all audit log entries" matches "find all" (WEAK), not "audit"
// (STRONG). The gate then evaluates the WEAK bucket for that prompt.
//
// Rate-gate (2026-05-19, SLOT-COMPACT-SYNERGY-MS0 Wave 3):
// Keywords split into STRONG (always fires on any noun) and WEAK (requires a
// PRISM-shaped noun — quoted / CamelCase / kebab-≥2-segs — but NOT the
// fallback any-non-stopword path). A prompt like "find all the widgets" no
// longer fires; "find all KienzleForceModelEngine" still does. Closes ~50%
// of false fires per audit measurement (1112B × ~150 prompts ≈ 165KB/session).

import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { hashBlock, shouldEmit, recordEmit, formatDedupedMarker, pruneTag } from "../../scripts/lib/injection-dedup.mjs";

const DEFAULT_TOP_K = 5;
const MIN_TOP_K = 1;
const MAX_TOP_K = 20;
const DEFAULT_TIMEOUT_MS = 8000;
const MIN_TIMEOUT_MS = 500;
const MAX_TIMEOUT_MS = 30_000;
const MIN_NOUN_LEN = 3;
const MIN_CAMEL_LEN = 3;
const MAX_CAMEL_LEN = 40;
const MIN_KEBAB_SEGMENTS = 2;
const MAX_KEBAB_SEGMENTS = 6;
const MIN_FALLBACK_LEN = 4;
const MAX_FALLBACK_LEN = 30;
const MIN_QUOTED_LEN = 3;
const MAX_QUOTED_LEN = 60;

const DISABLE = process.env.PRISM_AUDIT_VIZ_FIRST_DISABLE === "1";
const TOP_K = Math.max(MIN_TOP_K, Math.min(MAX_TOP_K, parseInt(process.env.PRISM_AUDIT_VIZ_FIRST_K || String(DEFAULT_TOP_K), 10) || DEFAULT_TOP_K));
const TIMEOUT_MS = Math.max(MIN_TIMEOUT_MS, Math.min(MAX_TIMEOUT_MS, parseInt(process.env.PRISM_AUDIT_VIZ_FIRST_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS), 10) || DEFAULT_TIMEOUT_MS));
const STRICT_FILTER = process.env.PRISM_AUDIT_VIZ_FIRST_STRICT_FILTER !== "0";
const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";

// Injection-dedup sidecar (shared across the fleet's dedup-adopting hooks) + TTL.
// Matches the slot-domain-awareness-inject adopter (same sidecar + 5min window).
const DEDUP_SIDECAR_REL = "state/shared/dashboards/injection-dedup-cache.json";
const DEDUP_TTL_MS = 5 * 60_000;

// STRONG keywords carry inherent audit intent — they fire on any noun-match.
const STRONG_AUDIT_KEYWORDS = new Set([
  "audit", "inventory", "orphan", "duplicate", "unwired",
  "survey", "reconcile", "enumerate", "gap analysis",
]);

// WEAK keywords are generic search verbs — they only fire when the extracted
// noun looks PRISM-shaped (quoted / CamelCase / kebab-≥2-segments). A noun
// pulled by the fallback any-non-stopword path is NOT enough.
const WEAK_AUDIT_KEYWORDS = new Set([
  "are there any", "find all", "where is", "check for",
  "how many", "list all", "what exists", "missing",
]);

// Longest-prefix wins so multi-word patterns match before single-word ones.
// Combined view used by detectAuditIntent — multi-word phrases first.
const AUDIT_KEYWORDS = [
  "are there any", "gap analysis", "find all", "where is", "check for",
  "how many", "list all", "what exists",
  "audit", "inventory", "orphan", "duplicate", "unwired",
  "missing", "survey", "reconcile", "enumerate",
];

const STOPWORDS = new Set([
  "the", "and", "for", "all", "any", "are", "you", "from", "with", "have", "has",
  "this", "that", "what", "where", "when", "how", "many", "much", "some", "exists",
  "missing", "audit", "inventory", "orphan", "duplicate", "unwired", "survey",
  "reconcile", "enumerate", "check", "find", "list", "should", "could", "would",
  "really", "today", "yesterday", "tomorrow", "session", "currently", "actually",
]);

function readPromptStdin() {
  try {
    const raw = fs.readFileSync(0, "utf8");
    if (!raw || !raw.trim()) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function detectAuditIntent(text) {
  if (!text) return null;
  const lc = text.toLowerCase();
  for (const kw of AUDIT_KEYWORDS) if (lc.includes(kw)) return kw;
  return null;
}

export function extractNoun(prompt, matchedKw) {
  if (!prompt || !matchedKw) return { noun: null, source: null };
  const lc = prompt.toLowerCase();
  const idx = lc.indexOf(matchedKw);
  if (idx < 0) return { noun: null, source: null };
  const tail = prompt.slice(idx + matchedKw.length);

  const quotedRx = new RegExp(`["'\`]([A-Za-z][A-Za-z0-9_.\\-/]{${MIN_QUOTED_LEN - 1},${MAX_QUOTED_LEN - 1}})["'\`]`);
  const q = tail.match(quotedRx);
  if (q) return { noun: q[1], source: "quoted" };

  const camelRx = new RegExp(`\\b([A-Z][A-Za-z0-9]{${MIN_CAMEL_LEN - 1},${MAX_CAMEL_LEN - 1}}(?:Engine|Dispatcher|Hook|Skill|Script|Action|Registry)?)\\b`);
  const cc = tail.match(camelRx);
  if (cc) return { noun: cc[1], source: "camel" };

  const kebabRx = new RegExp(`\\b([a-z][a-z0-9]+(?:-[a-z0-9]+){${MIN_KEBAB_SEGMENTS - 1},${MAX_KEBAB_SEGMENTS - 1}})\\b`);
  const hp = tail.match(kebabRx);
  if (hp) return { noun: hp[1], source: "kebab" };

  const tokens = tail.toLowerCase().match(new RegExp(`\\b[a-z][a-z0-9-]{${MIN_FALLBACK_LEN - 1},${MAX_FALLBACK_LEN - 1}}\\b`, "g")) || [];
  for (const t of tokens) if (!STOPWORDS.has(t)) return { noun: t, source: "fallback" };
  return { noun: null, source: null };
}

// Pure rate-gate predicate. Exported for direct testing — the main()
// integration is also covered by the subprocess oracle test.
export function shouldFire(matched, nounResult, strictFilter = true) {
  if (!matched || !nounResult || !nounResult.noun) return false;
  if (typeof nounResult.noun !== "string") return false;
  if (nounResult.noun.length < MIN_NOUN_LEN) return false;
  if (!strictFilter) return true;
  if (STRONG_AUDIT_KEYWORDS.has(matched)) return true;
  if (WEAK_AUDIT_KEYWORDS.has(matched)) {
    return nounResult.source !== "fallback";
  }
  // Unknown bucket (future keyword added without classification) — legacy fire.
  return true;
}

function queryVizFind(noun) {
  try {
    const scriptPath = path.join(PRISM_ROOT, "scripts", "system-viz-query.mjs");
    if (!fs.existsSync(scriptPath)) return { ok: false, reason: "no-script" };
    const out = execFileSync(
      process.execPath,
      [scriptPath, "find", noun],
      { windowsHide: true, encoding: "utf8", timeout: TIMEOUT_MS, stdio: ["ignore", "pipe", "pipe"] },
    );
    if (!out || !out.trim()) return { ok: false, reason: "empty-output" };
    if (/^Found 0 node\(s\)/i.test(out)) return { ok: false, reason: "no-match" };
    return { ok: true, out };
  } catch (e) {
    return { ok: false, reason: "subprocess-error", error: String(e?.message || e) };
  }
}

function clampHits(rawOut, k) {
  const lines = rawOut.split("\n");
  const header = lines.shift() ?? "";
  const trimmed = lines.filter((l) => l.trim().length > 0).slice(0, k);
  return [header, ...trimmed].join("\n").trimEnd();
}

function buildBody(matched, noun, hits) {
  return [
    `🔎 **Audit-viz-first** (intent="${matched}", noun="${noun}")`,
    "Auto-ran `node scripts/system-viz-query.mjs find " + noun + "` BEFORE Grep/Glob:",
    "",
    "```",
    hits,
    "```",
    "",
    "Doctrine: prefer system-viz-query over fs scans when any hit matches the intent.",
    "On a hit: `node scripts/system-viz-query.mjs node-card <id>` (token-cheap read) or `near <id>` (semantically-related nodes by 768d cosine) -- both stream a sidecar, never the 884MB graph.",
    // Orientation intents ("where is" / "how many" / "what exists" / "list all" ...)
    // usually want a GROUNDED natural-language answer, not just a node list. Route that
    // reflex into synergy-ask -- the graph+vault->Ollama combiner ($0) -- so the three
    // substrates JOIN instead of staying siloed (the utilization-protocol gap). STRONG
    // audit intents (audit/orphan/unwired/enumerate) want the raw node list, so they get
    // no synergy nudge. WEAK_AUDIT_KEYWORDS is exactly the orientation-verb set.
    ...(WEAK_AUDIT_KEYWORDS.has(matched)
      ? ["For a GROUNDED answer (graph + vault + Ollama, $0): `node scripts/synergy-ask.mjs \"" + noun + "\"` -- joins these graph hits with Obsidian-vault snippets into one cited answer."]
      : []),
    "Knobs: `PRISM_AUDIT_VIZ_FIRST_DISABLE=1` | `PRISM_AUDIT_VIZ_FIRST_K=N` | `PRISM_AUDIT_VIZ_FIRST_TIMEOUT_MS=N` | `PRISM_AUDIT_VIZ_FIRST_STRICT_FILTER=0`.",
  ].join("\n");
}

// Pure dedup decision (TOKEN-SAVINGS-EXPAND/U-PSN-INJECTION-DEDUP-LIB). Unlike
// slot-domain-awareness (which hashes its CHEAP static block), this hook fires on most
// prompts -- audit verbs ("audit"/"ghost"/"unwired") are common in directive/boilerplate
// text -- and pays an EXPENSIVE system-viz-query subprocess to build its block. So we key
// the dedup on the INPUT (`intent::noun`) so a dedup-hit can skip BOTH the subprocess and
// the re-injection. Exported for unit testing (no stdin/subprocess needed).
//   action: "bypass" -> dedup off / no session_id -> run normally (pre-dedup behavior)
//           "marker" -> identical input seen within TTL -> emit the 1-line skip marker
//           "emit"   -> first-emit / TTL-expiry -> run the query; recordEmit ONLY on success
// recordEmit happening only after a successful query+emit (see main) guarantees a "marker"
// decision always implies a prior successful injection for that input.
export function decideAuditVizEmit({ cache, sid8, matched, noun, now = Date.now(), ttlMs = DEDUP_TTL_MS, dedupDisabled = false }) {
  if (dedupDisabled || !sid8) return { action: "bypass", hookTag: null, contentHash: null };
  const hookTag = `audit-viz-first:${sid8}`;
  const contentHash = hashBlock(`${matched}::${noun}`);
  const decision = shouldEmit(cache, hookTag, contentHash, now, ttlMs);
  return { action: decision.emit ? "emit" : "marker", hookTag, contentHash };
}

function main() {
  if (DISABLE) return;
  const j = readPromptStdin();
  if (!j) return;
  const prompt = j.prompt || j.user_message || j.userPrompt || "";
  if (!prompt) return;

  const matched = detectAuditIntent(prompt);
  if (!matched) return;

  const nounResult = extractNoun(prompt, matched);
  if (!shouldFire(matched, nounResult, STRICT_FILTER)) return;
  const noun = nounResult.noun;

  // Injection-dedup adopter: read the shared sidecar, decide emit/marker/bypass.
  // Fail-soft at every step (sidecar read/write error, dedup-disabled, missing
  // session_id) -> emit path -> zero regression vs the pre-dedup behavior.
  const dedupDisabled = process.env.PRISM_INJECTION_DEDUP_DISABLE === "1";
  const sid8 = String(j.session_id || "").slice(0, 8);
  const sidecar = path.join(PRISM_ROOT, DEDUP_SIDECAR_REL);
  const now = Date.now();
  let cache = {};
  if (!dedupDisabled && sid8) {
    try { cache = JSON.parse(fs.readFileSync(sidecar, "utf8")); } catch { cache = {}; }
    // pruneTag (NOT pruneExpired): prune ONLY this hook's tag in the SHARED
    // sidecar so a 5min prune can't evict a 24h sibling. Tag mirrors the one
    // decideAuditVizEmit derives (`audit-viz-first:${sid8}`).
    cache = pruneTag(cache, `audit-viz-first:${sid8}`, now, DEDUP_TTL_MS);
  }

  const d = decideAuditVizEmit({ cache, sid8, matched, noun, now, dedupDisabled });
  if (d.action === "marker") {
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: formatDedupedMarker(d.hookTag) },
    }));
    return;
  }

  // "emit" or "bypass": run the (expensive) query now.
  const result = queryVizFind(noun);
  if (!result.ok) return; // no record on failure -> next identical input retries

  const hits = clampHits(result.out, TOP_K);
  // Record AFTER a successful query so a future dedup-hit is always valid.
  if (d.action === "emit" && d.contentHash) {
    try {
      const newCache = recordEmit(cache, d.hookTag, d.contentHash, now);
      fs.mkdirSync(path.dirname(sidecar), { recursive: true });
      fs.writeFileSync(sidecar, JSON.stringify(newCache), "utf8");
    } catch { /* sidecar write fail-soft -- emit still proceeds */ }
  }

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: buildBody(matched, noun, hits) },
  }));
}

// Run main() only when invoked as a CLI; preserve ESM exports for testing.
const isMain = import.meta.url === pathToFileURL(path.resolve(process.argv[1] || "")).href;
if (isMain) main();

export { STRONG_AUDIT_KEYWORDS, WEAK_AUDIT_KEYWORDS, MIN_NOUN_LEN, DEDUP_TTL_MS, buildBody };
