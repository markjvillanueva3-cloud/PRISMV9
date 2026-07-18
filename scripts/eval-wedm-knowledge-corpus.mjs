/**
 * eval-wedm-knowledge-corpus.mjs — a KNOWLEDGE-appropriate evaluator for the
 * WEDM knowledge training corpus (instruction → advisory answer).
 *
 * WHY THIS EXISTS (honest finding, slot mike 2026-05-30): the existing RLHF
 * gauntlet (WEDMLoRARewardShapingEngine + WEDMLoRASafetyEvaluatorEngine) scores
 * PROGRAM output — G-code syntax + discharge-parameter safety. Run against the
 * 171-pair KNOWLEDGE corpus (advisory text, not raw NC), those scorers are
 * mismatched: advisory text has no G-code to reward and no discharge params to
 * safety-check, so it scores artificially negative. That is a corpus↔evaluator
 * mismatch, not a corpus defect. This script is the missing eval for the
 * knowledge track. It scores three axes that DO apply to advisory text:
 *
 *   1. instruction_following — did the answer actually address what was asked?
 *      (recall of the instruction's salient terms in the output)
 *   2. grounding             — is the answer anchored in concrete WEDM specifics
 *      (G/M/E/H codes, numeric+unit values, named wire/controller, discharge
 *      terms) vs vague hand-waving?
 *   3. reasoning             — coherence / domain coverage / justification.
 *      Sourced from the authoritative WEDMLoRAReasoningEvaluatorEngine when the
 *      script is run under tsx (which resolves the engine .ts via its .js
 *      specifier); under plain `node` the engine is unreachable so a labeled
 *      lean proxy is used and announced (R12 — never silently pretends the
 *      engine ran). To get the authoritative axis:
 *          npx tsx scripts/eval-wedm-knowledge-corpus.mjs
 *
 * SCOPE CAVEAT (honest): these axes measure lexical RELEVANCE + SPECIFICITY +
 * rhetoric — they are a cheap quality SCREEN, NOT a factual-correctness gauge. An
 * answer that echoes the instruction's nouns and sprinkles one code + one
 * numeric+unit + a "because" can clear threshold without being correct. Treat
 * pass_rate as "is this answer on-topic and concrete", not "is this answer
 * right". The emitted report stamps this caveat too.
 *
 * Pure-core + injected reader (RGS-MS1 lesson): axes 1, 2 and the proxy are pure
 * functions with zero engine import, fully node:test-able. main() injects the
 * real reasoning engine via dynamic import.
 *
 *   node scripts/eval-wedm-knowledge-corpus.mjs                 # all splits (proxy axis)
 *   npx tsx scripts/eval-wedm-knowledge-corpus.mjs              # authoritative reasoning axis
 *   node scripts/eval-wedm-knowledge-corpus.mjs --split train   # one split
 *
 * No ${...} template literals (scripts/ security hook). String concat only.
 *
 * @module scripts/eval-wedm-knowledge-corpus
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS_DIR = path.join(REPO_ROOT, "mcp-server/data/training/wedm-knowledge");

// Blend weights — reasoning highest (coherent domain reasoning is the point),
// instruction_following next (relevance), grounding last (specificity floor).
const W_IF = 0.4;
const W_GROUND = 0.25;
const W_REASON = 0.35;
const PASS_THRESHOLD = 0.6;
const GROUNDING_TARGET = 4; // anchor categories present for full grounding credit

// Generic framing words stripped from instruction salient-term extraction — they
// appear in nearly every prompt ("explain the following ... as an expert") and
// in every WEDM answer, so counting them would inflate instruction_following.
const FRAMING_STOPWORDS = new Set([
  "the", "and", "for", "with", "this", "that", "your", "you", "are", "was",
  "explain", "following", "detail", "describe", "what", "which", "how", "when",
  "why", "expert", "wire", "edm", "wire-edm", "controller", "given", "below",
  "answer", "question", "provide", "recommend", "consider", "should", "would",
  "about", "into", "from", "they", "their", "them", "have", "has", "will",
]);

/** WEDM domain vocabulary for the lean reasoning proxy (linguistic tokens, NOT
 * physics constants — the heavyweight 5-axis source is
 * WEDMLoRAReasoningEvaluatorEngine). */
const WEDM_DOMAIN_TERMS = [
  "spark gap", "kerf", "overburn", "wire tension", "wire-break", "awt",
  "dielectric", "deionized", "conductivity", "flush", "nozzle", "pulse-on",
  "pulse-off", "ton", "toff", "peak current", "rough", "skim", "trim", "pass",
  "taper", "recast", "haz", "white layer", "surface finish", "e-code",
  "tech table", "mitsubishi", "sodick", "agie", "makino", "fa-10s",
];

const JUSTIFICATION_CONNECTIVES = [
  "because", "therefore", "since", "so that", "hence", "thus", "as a result",
  "consequently", "due to", "in order to", "the reason", "rationale",
];

/** Anchor detectors for the grounding axis — each category contributes once.
 * - gm_code is a deliberately LOOSE heuristic: it also matches incidental tokens
 *   shaped like a code (e.g. "M16"). In WEDM advisory text the noise floor is
 *   small because real answers heavily use genuine G/M codes; e_code/h_register
 *   are WEDM-specific and far less ambiguous.
 * - numeric_unit: inches appear in WEDM only as fractional offsets ("0.0085 in")
 *   or spelled out ("4 inch"), so the inch arms require a decimal OR the full
 *   word — this rejects the English preposition "in" ("3 passes in the rough")
 *   that a bare "in" unit token would falsely score. Ambiguous bare "us"
 *   (pronoun) is dropped in favor of µs/µsec. */
const GROUNDING_DETECTORS = {
  gm_code: /\b[GM]\d{1,3}(\.\d)?\b/,
  e_code: /\bE\d{3,4}\b/,
  h_register: /\bH\d{1,3}\b/,
  numeric_unit: /\d*\.\d+\s*in(?:ch)?\b|\d+\s*inch\b|\d+(\.\d+)?\s*(ipm|bar|µm|um|mm|mohm|mΩ|µs|µsec|tpi|volt|°|deg|g\/step|grams?)\b/i,
  named_wire: /\b(brass|zinc[-\s]?coated|coated|gamma[-\s]?phase|molybdenum|tungsten)\b/i,
  named_machine: /\b(fa-?10s|fa-?20s|mitsubishi|sodick|makino|agie|charmilles|mv-?series)\b/i,
};

/**
 * Extract salient lower-cased terms from a prompt — tokens length>=4, or short
 * domain codes (g29, e12xx, h175, uv, ra, ip), minus generic framing words.
 */
export function salientTerms(text) {
  const toks = String(text ?? "")
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9.\-]*[a-z0-9]|[a-z0-9]/g) || [];
  const out = new Set();
  for (const t of toks) {
    if (FRAMING_STOPWORDS.has(t)) continue;
    const isShortCode = /^[gmeh]\d/.test(t) || t === "uv" || t === "ra" || t === "ip";
    if (t.length >= 4 || isShortCode) out.add(t);
  }
  return out;
}

/** Crude stem: drop a trailing plural/gerund/past so "passes"~"pass". */
function stem(t) {
  return t.replace(/(ing|ed|es|s)$/i, "");
}

/**
 * instruction_following — fraction of the instruction's salient terms that
 * appear (verbatim or stemmed-substring) in the output. 0..1. No salient demand
 * → 1.0 (nothing specific was asked, so it is vacuously addressed).
 */
export function instructionFollowingScore(instruction, input, output) {
  const terms = salientTerms(String(instruction ?? "") + " " + String(input ?? ""));
  if (terms.size === 0) return 1;
  const out = String(output ?? "").toLowerCase();
  let hit = 0;
  for (const t of terms) {
    if (out.includes(t) || out.includes(stem(t))) hit += 1;
  }
  return Math.round((hit / terms.size) * 1000) / 1000;
}

/**
 * grounding — how many distinct concrete-anchor categories appear in the output,
 * normalized to GROUNDING_TARGET. 0..1. Rewards specificity over hand-waving.
 */
export function groundingScore(output) {
  const text = String(output ?? "");
  let present = 0;
  for (const re of Object.values(GROUNDING_DETECTORS)) {
    if (re.test(text)) present += 1;
  }
  return Math.round(Math.min(1, present / GROUNDING_TARGET) * 1000) / 1000;
}

/**
 * Lean reasoning proxy (build-independent fallback for the authoritative
 * WEDMLoRAReasoningEvaluatorEngine): domain-term coverage + justification
 * connectives + structure/length. 0..1. Clearly NOT the engine's full 5-axis
 * scorer — a self-contained signal so the runner works without a build.
 */
export function reasoningProxyScore(output) {
  const text = String(output ?? "");
  const low = text.toLowerCase();
  let domainHits = 0;
  for (const term of WEDM_DOMAIN_TERMS) {
    if (low.includes(term)) domainHits += 1;
    if (domainHits >= 6) break;
  }
  const domainCov = domainHits / 6;
  let connHits = 0;
  for (const c of JUSTIFICATION_CONNECTIVES) {
    if (low.includes(c)) connHits += 1;
    if (connHits >= 2) break;
  }
  const justif = connHits / 2;
  const lenScore = Math.min(1, text.length / 200);
  const structureBonus = /(\n\s*[-*\d]|;\s|\. )/.test(text) ? 1 : 0.6;
  const structure = Math.min(1, lenScore * structureBonus + (lenScore >= 1 ? 0.1 : 0));
  const score = 0.4 * domainCov + 0.3 * justif + 0.3 * structure;
  return Math.round(Math.min(1, score) * 1000) / 1000;
}

/** Blend the three axes into the knowledge score. 0..1. */
export function blendKnowledgeScore(instructionFollowing, grounding, reasoning) {
  const s = W_IF * instructionFollowing + W_GROUND * grounding + W_REASON * reasoning;
  return Math.round(Math.min(1, Math.max(0, s)) * 1000) / 1000;
}

/**
 * Evaluate one corpus pair. `reasoning01` is INJECTED (pure-core) — 0..1; main()
 * passes the real engine's overall_score/100, tests pass a known value.
 */
export function evaluateKnowledgePair(pair, reasoning01) {
  const instructionFollowing = instructionFollowingScore(pair.instruction, pair.input, pair.output);
  const grounding = groundingScore(pair.output);
  const reasoning =
    typeof reasoning01 === "number" ? reasoning01 : reasoningProxyScore(pair.output);
  const knowledge_score = blendKnowledgeScore(instructionFollowing, grounding, reasoning);
  return {
    instruction_following: instructionFollowing,
    grounding,
    reasoning: Math.round(reasoning * 1000) / 1000,
    knowledge_score,
    passed: knowledge_score >= PASS_THRESHOLD,
  };
}

function mean(nums) {
  if (nums.length === 0) return 0;
  const s = nums.reduce((a, b) => a + b, 0);
  return Math.round((s / nums.length) * 1000) / 1000;
}

function readSplit(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));
}

// ── CLI runner ──
async function main() {
  const argv = process.argv.slice(2);
  const splitIdx = argv.indexOf("--split");
  const onlySplit = splitIdx >= 0 ? argv[splitIdx + 1] : null;
  const splits = onlySplit ? [onlySplit] : ["train", "val", "test"];

  // Inject the authoritative reasoning engine if the build's .js is present;
  // else fall back to the lean proxy (logged — fail-loud about which ran).
  let reasoningFn = null;
  let reasoningSource = "proxy (lean, build-independent)";
  try {
    const mod = await import("../mcp-server/src/engines/WEDMLoRAReasoningEvaluatorEngine.js");
    const eng = mod.wedmLoRAReasoningEvaluatorEngine;
    if (eng && typeof eng.evaluate === "function") {
      reasoningFn = (output) => eng.evaluate(output).overall_score / 100;
      reasoningSource = "WEDMLoRAReasoningEvaluatorEngine (authoritative)";
    }
  } catch (err) {
    console.error(
      "[eval-wedm-knowledge] reasoning engine unavailable (" +
        (err && err.message ? err.message : String(err)) +
        ") — using lean proxy. For the authoritative reasoning axis run this script " +
        "via `npx tsx scripts/eval-wedm-knowledge-corpus.mjs` (tsx resolves the engine .ts " +
        "through its .js specifier; plain `node` cannot — the build emits a dist bundle, not src .js).",
    );
  }

  const report = {
    reasoning_source: reasoningSource,
    caveat:
      "Axes measure lexical relevance + specificity + rhetoric — a cheap on-topic/concrete " +
      "SCREEN, NOT a factual-correctness gauge. pass_rate ~= 'on-topic and concrete', not 'correct'.",
    splits: {},
    generated_for: "wedm-knowledge corpus",
  };
  let grand = [];
  for (const split of splits) {
    const file = path.join(CORPUS_DIR, "wedm_knowledge_" + split + ".jsonl");
    const pairs = readSplit(file);
    if (pairs.length === 0) {
      console.error("[eval-wedm-knowledge] WARN: no pairs at " + file.replace(/\\/g, "/"));
      continue;
    }
    const ks = [];
    const ifs = [];
    const gs = [];
    const rs = [];
    let passed = 0;
    const byKind = {};
    const byCategory = {};
    for (const p of pairs) {
      const r = reasoningFn ? evaluateKnowledgePair(p, reasoningFn(p.output)) : evaluateKnowledgePair(p);
      ks.push(r.knowledge_score);
      ifs.push(r.instruction_following);
      gs.push(r.grounding);
      rs.push(r.reasoning);
      if (r.passed) passed += 1;
      const kind = (p.meta && p.meta.kind) || "unknown";
      const cat = (p.meta && p.meta.category) || "unknown";
      (byKind[kind] ??= []).push(r.knowledge_score);
      (byCategory[cat] ??= []).push(r.knowledge_score);
    }
    grand = grand.concat(ks);
    report.splits[split] = {
      n: pairs.length,
      mean_knowledge_score: mean(ks),
      mean_instruction_following: mean(ifs),
      mean_grounding: mean(gs),
      mean_reasoning: mean(rs),
      pass_rate: Math.round((passed / pairs.length) * 1000) / 1000,
      by_kind: Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, { n: v.length, mean: mean(v) }])),
      by_category: Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, { n: v.length, mean: mean(v) }])),
    };
  }
  report.overall_mean_knowledge_score = mean(grand);
  report.n_total = grand.length;

  const outPath = path.join(CORPUS_DIR, "knowledge-eval-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log("=== WEDM KNOWLEDGE-CORPUS EVAL ===");
  console.log("reasoning axis: " + reasoningSource);
  console.log(JSON.stringify(report, null, 2));
  console.log("[eval-wedm-knowledge] OK — report: " + outPath.replace(/\\/g, "/"));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("[eval-wedm-knowledge] FATAL: " + (err && err.message ? err.message : String(err)));
    process.exit(1);
  });
}
