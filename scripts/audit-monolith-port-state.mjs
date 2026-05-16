#!/usr/bin/env node
/**
 * audit-monolith-port-state.mjs
 * KNOWLEDGE-CONVERSION-MS0 / Phase 0 / U-KC-A1 + U-KC-A2
 *
 * Cross-references the PRISM v8.89 monolith extraction corpus against the
 * current mcp-server/src tree to produce a port-state ledger (U-KC-A1), and
 * confirms the coursework content-mining candidates are unwired (U-KC-A2).
 *
 * ADVISORY ONLY. Classification is IDF-weighted name-token match — it does NOT
 * verify behavioral equivalence. A human verifies against the actual src file
 * before any port decision. See the ledger `caveat` field for the full
 * meaning of each state label.
 *
 * Usage:  node scripts/audit-monolith-port-state.mjs [--json] [--frozen-time]
 *           --json         suppress the human summary, ledger only
 *           --frozen-time  pin generatedAt to the epoch (byte-stable diffs);
 *                          PRISM_AUDIT_FROZEN_TIME=<iso> overrides the value
 * Output: state/shared/specs/monolith-port-ledger.json  (always)
 * Exit:   0 ok · 2 missing/invalid required input · 3 ledger write failure
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const p = (...s) => resolve(ROOT, ...s);
const rel = (abs) => (abs.startsWith(ROOT) ? abs.slice(ROOT.length + 1) : abs).replace(/\\/g, "/");

const INPUTS = {
  inventory:  p("extracted_modules/MONOLITH_MODULE_INVENTORY.json"),
  index:      p("scripts/extraction/monolith_index.json"),
  extracted:  p("extracted"),
  srcAlgo:    p("mcp-server/src/algorithms"),
  srcEng:     p("mcp-server/src/engines"),
  srcRoot:    p("mcp-server/src"),
  candidates: p("state/shared/tribal-graph/course-content-candidates.jsonl"),
  tribalEng:  p("mcp-server/src/engines/TribalKnowledgeEngine.ts"),
};
const OUT = p("state/shared/specs/monolith-port-ledger.json");

const ARGS = process.argv.slice(2);
const JSON_ONLY = ARGS.includes("--json");
const FROZEN_TIME = process.env.PRISM_AUDIT_FROZEN_TIME ||
  (ARGS.includes("--frozen-time") ? "1970-01-01T00:00:00.000Z" : null);

function fail(code, msg) {
  console.error("[audit-monolith-port-state] FATAL: " + msg);
  process.exit(code);
}
function loadJSON(path) {
  if (!existsSync(path)) fail(2, "missing required input: " + path);
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (e) { fail(2, "invalid JSON in " + path + ": " + e.message); }
}

// ---------------------------------------------------------------- tokenizer
// Generic words that carry no discriminating signal — dropped before scoring.
const STOPWORDS = new Set([
  "prism", "engine", "module", "modules", "system", "systems", "manager",
  "lookup", "the", "and", "of", "for", "js", "ts", "model", "models", "calc",
  "calculator", "advanced", "core", "master", "complete", "library", "test",
  "tests", "mit", "class", "const", "window", "function", "api", "data",
  "util", "utils", "helper", "registry", "orchestrator",
]);
function tokenize(name) {
  return String(name || "")
    .replace(/\.(js|ts|mjs|json)$/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")        // split camelCase
    .split(/[^A-Za-z0-9]+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length >= 2 && !/^\d+$/.test(t) && !STOPWORDS.has(t));
}
const tokenSet = (name) => new Set(tokenize(name));

// ------------------------------------------------- current PRISM code index
function listTs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .sort()                                        // deterministic ordering
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts") &&
                   !f.endsWith(".test.ts") && f !== "index.ts" && f !== "types.ts")
    .map((f) => ({ file: rel(join(dir, f)), name: basename(f, ".ts"), tokens: tokenSet(f) }))
    .filter((e) => e.tokens.size > 0);
}
const prismAlgos = listTs(INPUTS.srcAlgo);
const prismEngines = listTs(INPUTS.srcEng);
if (prismEngines.length === 0) fail(2, "no engines indexed under " + rel(INPUTS.srcEng));
const prismAll = [
  ...prismAlgos.map((e) => ({ ...e, kind: "algorithm" })),
  ...prismEngines.map((e) => ({ ...e, kind: "engine" })),
];

// IDF over the combined PRISM index — rare tokens (taylor, kienzle, kalman)
// dominate the score; common tokens (force, model) contribute little.
const docFreq = new Map();
for (const e of prismAll) for (const t of e.tokens) docFreq.set(t, (docFreq.get(t) || 0) + 1);
const N = prismAll.length;
const idf = (t) => Math.log((N + 1) / ((docFreq.get(t) || 0) + 1)) + 1;

// ----------------------------------------------------------------- classify
const STRONG = 0.62; // IDF-weighted containment → confident name equivalence
const WEAK = 0.34;   // below this, no meaningful name overlap
function scoreMatch(monoTokens, candTokens) {
  // idf() is always >= 1, so den > 0 whenever monoTokens is non-empty; classify
  // returns early on empty monoTokens, so scoreMatch is never called with one.
  let num = 0, den = 0;
  for (const t of monoTokens) {
    const w = idf(t);
    den += w;
    if (candTokens.has(t)) num += w;
  }
  return den === 0 ? 0 : num / den;
}
function classify(name) {
  const mono = tokenSet(name);
  if (mono.size === 0) {
    return { state: "unclassifiable", score: 0, match: null,
             note: "name reduces to no discriminating tokens" };
  }
  let best = null;
  const strong = [];
  for (const e of prismAll) {
    const s = scoreMatch(mono, e.tokens);
    if (!best || s > best.score) best = { score: s, file: e.file, kind: e.kind };
    if (s >= STRONG) strong.push({ file: e.file, kind: e.kind, score: +s.toFixed(3) });
  }
  if (!best) {
    // Unreachable while prismEngines.length > 0 (guarded above) — defensive
    // so a future refactor that empties the index degrades, not crashes.
    return { state: "unclassifiable", score: 0, match: null,
             note: "no PRISM index entries available to match against" };
  }
  strong.sort((a, b) => b.score - a.score);
  const r = { score: +best.score.toFixed(3), match: best.score >= WEAK ? best.file : null };
  if (best.score >= STRONG) {
    // A strong name match means the item is ported. Multiple strong matches do
    // NOT make it un-ported — they mean it is ported (possibly more than once);
    // a human confirms which implementation is canonical.
    r.state = "ported";
    if (strong.length > 1) {
      r.note = strong.length + " strong matches — ported (possibly duplicated); " +
               "human confirms the canonical implementation";
      r.alternatives = strong.slice(0, 5);
    }
  } else if (best.score >= WEAK) {
    r.state = "ambiguous";
    r.note = "partial name match — human verify ported-vs-unported " +
             "(token match cannot bridge acronyms/synonyms)";
  } else {
    r.state = "unported";
    r.match = null;
    r.note = "no name-token match — NOT a port directive; equivalent logic may " +
             "exist under an unrelated name, or the item may be config/deprecated/test";
  }
  return r;
}
function tally(arr) {
  const t = {};
  for (const x of arr) t[x.state] = (t[x.state] || 0) + 1;
  return t;
}
function tallyBy(arr, key) {
  const t = {};
  for (const x of arr) { const k = x[key] || "?"; t[k] = (t[k] || 0) + 1; }
  return t;
}

// ------------------------------------------- U-KC-A1 §1: 20 named algorithms
// Grep-verified overrides — IDF token-match is structurally blind to acronyms
// ("Fast Fourier Transform" vs FFTAnalyzer), synonyms, and algorithms embedded
// inside a larger engine rather than living in a standalone file. Every entry
// below was confirmed by content grep across mcp-server/src on 2026-05-16. The
// audit applies the verified verdict unconditionally and records the original
// token score; it also re-checks the pinned `match` file still exists, so a
// later rename/delete surfaces as `staleOverride` instead of silent rot.
const OVERRIDE_DATE = "2026-05-16";
const VERIFIED_OVERRIDES = {
  "Merchant Shear Angle": {
    state: "ported", match: "mcp-server/src/engines/CuttingMechanicsEngine.ts",
    evidence: "Merchant orthogonal-cutting shear-angle model embedded across " +
      "CuttingMechanicsEngine / AdvancedCuttingMathEngine / MillingPhysicsKernelEngine " +
      "(grep 'merchant' = 82 src files)",
  },
  "Newton-Raphson": {
    state: "ported", match: "mcp-server/src/engines/AdvancedMathematicalMethodsEngine.ts",
    evidence: "root-finding implemented in AdvancedMathematicalMethodsEngine + " +
      "AdvancedMLStatisticsEngine (grep 'raphson' = 22 src files)",
  },
  "Fast Fourier Transform": {
    state: "ported", match: "mcp-server/src/algorithms/FFTAnalyzer.ts",
    evidence: "FFTAnalyzer.ts + FourierAnalysisEngine.ts + SignalProcessingEngine " +
      "(grep 'fourier|FFT' = 82 src files); token-match missed the FFT acronym",
  },
  "Taylor Tool Life": {
    state: "ported", match: "mcp-server/src/algorithms/ExtendedTaylorModel.ts",
    evidence: "ExtendedTaylorModel.ts + TaylorToolLifeEngine.ts " +
      "(TaylorToolLifeEngine.test.ts present)",
  },
  "K-Means Clustering": {
    state: "ported", match: "mcp-server/src/algorithms/ClusteringEngine.ts",
    evidence: "ClusteringEngine.ts (k-means) + ClusterAnalysisEngine + " +
      "FeatureClusteringEngine (grep 'k-means|kmeans' = 31 src files)",
  },
  "Random Forest": {
    state: "ported", match: "mcp-server/src/engines/EnsembleMLEngine.ts",
    evidence: "random-forest in EnsembleMLEngine + AdvancedMLStatisticsEngine + " +
      "AdvancedStatisticalLearningEngine (grep 'random forest' = 31 src files)",
  },
  "BFGS Optimization": {
    state: "ported", match: "mcp-server/src/engines/GradientOptimizationEngine.ts",
    evidence: "BFGS in GradientOptimizationEngine + OptimizationEngine + SQPEngine + " +
      "TrustRegionEngine (grep 'bfgs' = 10 src files)",
  },
  "Gradient Descent": {
    state: "ported", match: "mcp-server/src/engines/GradientOptimizationEngine.ts",
    evidence: "GradientOptimizationEngine + OptimizationEngine + ConvexOptimizationEngine " +
      "(grep 'gradient descent' = 45 src files)",
  },
};
const inv = loadJSON(INPUTS.inventory);
if (!Array.isArray(inv.algorithms) || inv.algorithms.length === 0) {
  fail(2, "MONOLITH_MODULE_INVENTORY.json has no non-empty 'algorithms' array " +
          "— malformed required input (refusing to report an empty audit as complete)");
}
const namedAlgorithms = inv.algorithms.map((name) => {
  const n = String(name);
  const c = classify(n);
  const ov = VERIFIED_OVERRIDES[n];
  if (ov) {
    // Override applies whenever it exists — confirming OR correcting the token
    // verdict — so every grep-verified algorithm carries its evidence.
    const matchFileExists = existsSync(p(ov.match));
    const entry = {
      name: n, state: ov.state, match: ov.match, matchFileExists,
      evidenceTier: "grep-content-verified", verified: true,
      verifiedMethod: "content-grep " + OVERRIDE_DATE, evidence: ov.evidence,
      tokenScore: c.score,
    };
    if (!matchFileExists) {
      entry.staleOverride = true;
      entry.note = "OVERRIDE STALE — pinned match file " + ov.match +
                   " no longer exists on disk; re-verify before relying on this verdict";
    } else if (ov.state !== c.state) {
      entry.note = "token-match said '" + c.state + "' (score " + c.score +
                   "); grep verification corrected it to '" + ov.state + "'";
    }
    return entry;
  }
  // Not in the override map — token name-match only. evidenceTier makes the
  // weaker evidence explicit so the headline finding cannot over-claim.
  return { name: n, ...c, evidenceTier: "name-match", verified: false };
});
const verifiedCount = namedAlgorithms.filter((a) => a.verified).length;
const nameMatchCount = namedAlgorithms.length - verifiedCount;
const staleOverrideCount = namedAlgorithms.filter((a) => a.staleOverride).length;
const allAlgorithmsPorted = namedAlgorithms.every((a) => a.state === "ported");

// ------------------------- U-KC-A1 §2: extracted/<category>/*.js code files
const extractedArtifacts = {};
if (existsSync(INPUTS.extracted)) {
  for (const cat of readdirSync(INPUTS.extracted).sort()) {
    const catPath = join(INPUTS.extracted, cat);
    let st;
    try { st = statSync(catPath); } catch { continue; }
    if (!st.isDirectory()) continue;
    const files = readdirSync(catPath).sort().filter((f) => f.endsWith(".js"));
    if (files.length === 0) continue;
    extractedArtifacts[cat] = files.map((f) => ({ file: cat + "/" + f, ...classify(f) }));
  }
}

// ----------------------------------- U-KC-A1 §3: 948 indexed monolith modules
// monolith_index.json records module DECLARATION lines only (start==end for
// nearly every entry) — line_count is NOT a reliable size signal and is not
// used for classification. Port-state is decided purely by name-token cross-
// reference; the monolith category is carried as a Phase-1 Lane routing hint.
const idx = loadJSON(INPUTS.index);
if (!idx.modules || typeof idx.modules !== "object" || Object.keys(idx.modules).length === 0) {
  fail(2, "monolith_index.json has no 'modules' map — malformed required input");
}
const DATA_CATEGORIES = new Set(["databases", "materials", "knowledge_bases", "tools", "machines"]);
const indexedModules = Object.values(idx.modules).map((m) => {
  const cat = m.category || "";
  return {
    name: m.name,
    category: cat,
    type: m.type || "",
    laneHint: DATA_CATEGORIES.has(cat)
      ? "A/B2 (data -> tribal knowledge)"
      : "B/C (code -> engine/algorithm)",
    ...classify(m.name),
  };
});

// ------------------------------------ U-KC-A2: coursework wiring confirmation
function walkSrc(dir, acc = [], depth = 0) {
  if (depth > 8 || !existsSync(dir)) return acc;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name === "node_modules" || e.name === "__tests__" || e.name.startsWith(".")) continue;
    const fp = join(dir, e.name);
    if (e.isDirectory()) walkSrc(fp, acc, depth + 1);
    else if (e.name.endsWith(".ts")) acc.push(fp);
  }
  return acc;
}
// Needle is the candidate-record kind value, which is also a substring of the
// candidate filename — broad enough to catch a kind-filter consumer or a file
// reference, while still being a distinctive literal.
const NEEDLE = "course-content-candidate";
const consumers = walkSrc(INPUTS.srcRoot)
  .filter((f) => { try { return readFileSync(f, "utf8").includes(NEEDLE); } catch { return false; } })
  .map(rel);
const candidateRecords = existsSync(INPUTS.candidates)
  ? readFileSync(INPUTS.candidates, "utf8").split(/\r?\n/).filter(Boolean).length
  : 0;
const tribalEngineExists = existsSync(INPUTS.tribalEng);
let tribalHasIngest = false;
if (tribalEngineExists) {
  try { tribalHasIngest = /\bingest\s*\(/.test(readFileSync(INPUTS.tribalEng, "utf8")); }
  catch { /* leave false */ }
}

// --------------------------------------------------------------- the ledger
const ledger = {
  schemaVersion: "1.0.0",
  kind: "monolith-port-ledger",
  milestone: "KNOWLEDGE-CONVERSION-MS0",
  unit: "U-KC-A1+U-KC-A2",
  advisoryOnly: true,
  mustHumanVerify: true,
  generatedAt: FROZEN_TIME || new Date().toISOString(),
  generator: "scripts/audit-monolith-port-state.mjs",
  caveat:
    "Classification is IDF-weighted name-token match against current src/algorithms " +
    "+ src/engines. STATE LABELS: 'ported' = a current src file shares the item's " +
    "discriminating name tokens (existence + name match — NOT behavioral-equivalence " +
    "verified). 'unported' = NO name-token match — this is NOT a port directive: " +
    "equivalent logic may exist under an unrelated name, and the count is dominated " +
    "by deprecated shims, config blobs, test fixtures and route tables that should " +
    "never be ported (see summary.indexedModules.unportedByCategory). 'ambiguous' = " +
    "partial/multiple match; a human decides ported-vs-superseded. 'unclassifiable' = " +
    "the name reduced to no discriminating tokens, so no match was attempted. " +
    "namedAlgorithms entries with evidenceTier='grep-content-verified' carry operator-" +
    "pinned verdicts (content-grep dated " + OVERRIDE_DATE + ", see VERIFIED_OVERRIDES " +
    "in the generator) and are re-checked for file existence each run; entries with " +
    "evidenceTier='name-match' rest on token-match alone. Verify the actual src file " +
    "before any port decision.",
  thresholds: {
    strong: STRONG, weak: WEAK,
    scoring: "IDF-weighted token containment over current src/algorithms + src/engines",
  },
  prismIndex: {
    algorithms: prismAlgos.length,
    engines: prismEngines.length,
    distinctTokens: docFreq.size,
  },
  planCorrections: [
    "KNOWLEDGE-CONVERSION-PLAN.md states S1-MS2 / L1-P0-MS1 / L2-P0-MS1 are 'complete'. " +
      "Their milestone envelopes are status=not_started. Port-state in this ledger is " +
      "derived from LIVE src/ cross-reference, which is envelope-independent and authoritative.",
    "The monolith inventory reports 71 formulas only as a detection COUNT " +
      "(statistics.formulas_found); there is no discrete 71-formula list. The portable " +
      "formula CODE lives in extracted/formulas/*.js — audited here under extractedArtifacts.formulas.",
    "8 of the 20 namedAlgorithms verdicts are operator-pinned grep-verified overrides " +
      "(dated " + OVERRIDE_DATE + "). The remaining 12 rest on name-token match only. " +
      "Re-run this generator if src/ has changed materially since that date.",
  ],
  summary: {
    namedAlgorithms: { total: namedAlgorithms.length, ...tally(namedAlgorithms) },
    namedAlgorithmsEvidence: {
      grepContentVerified: verifiedCount,
      nameMatchOnly: nameMatchCount,
      staleOverrides: staleOverrideCount,
    },
    namedAlgorithmsFinding: allAlgorithmsPorted
      ? "All " + namedAlgorithms.length + " monolith core algorithms resolve to a current " +
        "PRISM file — " + verifiedCount + " grep-content-verified, " + nameMatchCount +
        " by name-match only. Lane B algorithm-port (U-KC-C2) is effectively confirm-only; " +
        "spot-check the " + nameMatchCount + " name-match entries before closeout." +
        (staleOverrideCount ? "  WARNING: " + staleOverrideCount +
          " override(s) are STALE (pinned file missing) — re-verify." : "")
      : "Some monolith core algorithms did not resolve to a PRISM file — see namedAlgorithms[].",
    extractedArtifacts: Object.fromEntries(
      Object.entries(extractedArtifacts).map(([k, v]) => [k, { total: v.length, ...tally(v) }])
    ),
    indexedModules: {
      total: indexedModules.length,
      ...tally(indexedModules),
      byLaneHint: tallyBy(indexedModules, "laneHint"),
      unportedByCategory: tallyBy(indexedModules.filter((m) => m.state === "unported"), "category"),
      note: "'unported' = no name match, NOT 'needs porting' — see caveat. " +
            "unportedByCategory shows how many fall in non-code categories.",
    },
  },
  namedAlgorithms,
  extractedArtifacts,
  indexedModules,
  courseworkWiring: {
    unit: "U-KC-A2",
    candidateFile: rel(INPUTS.candidates),
    candidateRecords,
    scanMethod: "literal-substring scan for '" + NEEDLE + "' over mcp-server/src/**/*.ts, " +
      "excluding __tests__/; dynamic-path construction and non-.ts loaders are NOT detected",
    consumersInSrc: consumers,
    wired: consumers.length > 0,
    verdict: consumers.length === 0
      ? "UNWIRED — no .ts file under mcp-server/src contains the literal '" + NEEDLE +
        "' reference; the " + candidateRecords + " content-mining candidates have no " +
        "detected consumer. (See scanMethod for the limits of this check.)"
      : "POSSIBLY WIRED — " + consumers.length + " .ts file(s) contain the '" + NEEDLE +
        "' reference; inspect each before treating the candidates as unwired.",
    laneATarget: {
      engine: rel(INPUTS.tribalEng),
      exists: tribalEngineExists,
      hasIngestMethod: tribalHasIngest,
      note: tribalEngineExists && tribalHasIngest
        ? "Confirmed Lane A target: TribalKnowledgeEngine.ingest() is present; it accepts " +
          "KnowledgeTip[]. DOC_KNOWLEDGE_DIR is the auto-load path for Phase 1 (U-KC-B1/B2)."
        : "TribalKnowledgeEngine.ingest() NOT confirmed — re-locate the Lane A ingest " +
          "surface before starting Phase 1.",
    },
  },
};

try {
  writeFileSync(OUT, JSON.stringify(ledger, null, 2));
} catch (e) {
  fail(3, "cannot write ledger to " + rel(OUT) + ": " + e.message);
}

// ------------------------------------------------------------------ summary
if (!JSON_ONLY) {
  const s = ledger.summary;
  console.log("MONOLITH PORT-STATE LEDGER  ->  " + rel(OUT));
  console.log("PRISM index: " + prismAlgos.length + " algorithms + " +
              prismEngines.length + " engines (" + docFreq.size + " distinct tokens)");
  console.log("\n== Named algorithms (" + s.namedAlgorithms.total + ") == " +
              JSON.stringify(s.namedAlgorithms));
  for (const a of namedAlgorithms) {
    const sc = a.score != null ? a.score : a.tokenScore;
    const tier = a.evidenceTier === "grep-content-verified" ? "  [grep-verified]"
               : a.evidenceTier === "name-match" ? "  [name-match]" : "";
    console.log("  " + a.state.padEnd(11) + a.name.padEnd(30) +
                (a.match ? "-> " + a.match : "(best " + sc + ")") + tier +
                (a.staleOverride ? "  *** STALE ***" : ""));
  }
  console.log("  finding: " + s.namedAlgorithmsFinding);
  console.log("\n== Extracted artifact files by category ==");
  for (const [k, v] of Object.entries(s.extractedArtifacts)) {
    console.log("  " + k.padEnd(16) + JSON.stringify(v));
  }
  console.log("\n== Indexed modules (" + s.indexedModules.total + ") ==");
  console.log("  " + JSON.stringify({
    ported: s.indexedModules.ported, ambiguous: s.indexedModules.ambiguous,
    unported: s.indexedModules.unported, unclassifiable: s.indexedModules.unclassifiable,
    byLaneHint: s.indexedModules.byLaneHint,
  }));
  console.log("  unported is NOT a port directive — see ledger caveat + unportedByCategory");
  console.log("\n== Coursework (U-KC-A2) ==");
  console.log("  " + ledger.courseworkWiring.verdict);
  console.log("  Lane A target: TribalKnowledgeEngine exists=" + tribalEngineExists +
              " ingest()=" + tribalHasIngest);
}
console.log("[audit-monolith-port-state] OK -> " + rel(OUT));
