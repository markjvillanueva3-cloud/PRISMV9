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
      { encoding: "utf8", timeout: TIMEOUT_MS, stdio: ["ignore", "pipe", "pipe"] },
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
    "Knobs: `PRISM_AUDIT_VIZ_FIRST_DISABLE=1` | `PRISM_AUDIT_VIZ_FIRST_K=N` | `PRISM_AUDIT_VIZ_FIRST_TIMEOUT_MS=N` | `PRISM_AUDIT_VIZ_FIRST_STRICT_FILTER=0`.",
  ].join("\n");
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

  const result = queryVizFind(noun);
  if (!result.ok) return;

  const hits = clampHits(result.out, TOP_K);
  const payload = {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: buildBody(matched, noun, hits),
    },
  };
  process.stdout.write(JSON.stringify(payload));
}

// Run main() only when invoked as a CLI; preserve ESM exports for testing.
const isMain = import.meta.url === pathToFileURL(path.resolve(process.argv[1] || "")).href;
if (isMain) main();

export { STRONG_AUDIT_KEYWORDS, WEAK_AUDIT_KEYWORDS, MIN_NOUN_LEN };
