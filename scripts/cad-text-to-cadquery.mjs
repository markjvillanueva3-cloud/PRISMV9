#!/usr/bin/env node
/**
 * cad-text-to-cadquery.mjs -- the Ollama text->CAD generation bridge
 * (U-CAD-TEXT-BRIDGE, slot:zulu 2026-06-12; operator: "everything hard coded,
 * bridged and wired so we can utilize the prism ai systems on ollama to do
 * cad generation").
 *
 * PATTERN (open-source recon, DELTA-CAD-GALAXY-MAX-BUILDOUT-2026-06-12.md):
 * CadQuery/build123d + local LLM = parametric STEP for free (the strongest
 * open-source combo; Seek-CAD proves the fully-local loop on DeepSeek-R1-32B,
 * Text-to-CadQuery proves qwen-coder-class models generate CadQuery well --
 * BOTH model classes are resident in this box's Ollama).
 *
 * WHAT RUNS TODAY: text request -> hard-coded delta-doctrine prompt (inch
 * units, proven-emitter rules, JM conventions) + feature-template names ->
 * qwen2.5-coder:32b via /api/generate -> python code-fence extracted +
 * validated -> staged to state/shared/cad-text-gen/<slug>-<ts>/ (model.py +
 * request.json + status.json). STAGING-ONLY writes; nothing touches shared
 * indexes.
 *
 * WHAT LIGHTS UP LATER (no code change needed): if `import build123d` or
 * `import cadquery` succeeds in the portable Python, the staged model.py is
 * EXECUTED -> STEP -> validated via scripts/cad-analyze-step.mjs. Until then
 * status.json says executed:false with the named unblock
 * (U-QUEBEC-MCP-CADQUERY-MERGE / pip install cadquery build123d).
 *
 * Exit codes: 0 staged ok (executed or honestly-deferred) - 2 usage -
 *             3 generation invalid (no usable code) - 4 Ollama unreachable.
 *
 * Usage:
 *   node scripts/cad-text-to-cadquery.mjs "a 1 inch cube with a 0.25in center hole"
 *   node scripts/cad-text-to-cadquery.mjs "<text>" --model deepseek-r1:32b --json
 */

import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRequestedDims, gradeDimAccuracy, kernelDimsOf } from "./cad-gen-accuracy.mjs";
import { parseRequestPrint } from "./cad-request-print.mjs";
import { partSpecFromStepText, runSelfCheck } from "./cad-self-check.mjs";
import { mfgInterpretation } from "./cad-mfg-logic.mjs";
import { dimsFromPartSpec } from "./cad-print-dims.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
export const STAGING_ROOT = join(REPO_ROOT, "state", "shared", "cad-text-gen");
export const DEFAULT_MODEL = "qwen2.5-coder:32b"; // repo heavy-code default; --model deepseek-r1:32b for Seek-CAD-style reasoning
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
const FEATURE_TEMPLATE_INDEX = join(REPO_ROOT, "state", "shared", "cad-feature-templates", "INDEX.json");
const GEN_TIMEOUT_MS = 180_000;
const PYTHON = process.env.PRISM_PYTHON || "H:/Tools/python/python.exe";

// Closed-loop ledger alignment (U-CAD-TEXT-LEARN-LOOP): CADTrialErrorLearningEngine's
// default ledger path is cwd-relative (process.cwd()/data/state/cad-failure-ledger.jsonl),
// so this repo-root script and the mcp-server dispatcher would otherwise feed DIFFERENT
// ledgers. Anchor both to the mcp-server canonical path so text->CAD generation outcomes
// accumulate in the SAME ledger the cad_learning_* recommendations read. (The cwd-relative
// engine default is a latent divergence -- flagged for an engine-side absolute-default fix.)
if (!process.env.PRISM_CAD_FAILURE_LEDGER) {
  process.env.PRISM_CAD_FAILURE_LEDGER = join(REPO_ROOT, "mcp-server", "data", "state", "cad-failure-ledger.jsonl");
}

/** Pure: filesystem-safe slug from the request text. */
export function slugify(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "cad-request";
}

/**
 * Fail-soft: pull the CANONICAL system prompt from the existing
 * CadQueryCodeGeneratorEngine (its header documents the intended pipeline
 * "NL description -> LLM (with this prompt) -> CadQuery code" -- the engine
 * shipped the prompt+validate+execute half; THIS script is the LLM caller
 * that was never built). pathToFileURL is REQUIRED on Windows dynamic import
 * (U-YT-INGEST-URL-FIX lesson, same day).
 */
export async function loadEnginePrompt(importImpl = (s) => import(s)) {
  try {
    const { pathToFileURL } = await import("node:url");
    const mod = await importImpl(pathToFileURL(resolve(REPO_ROOT, "mcp-server", "dist", "engines", "CadQueryCodeGeneratorEngine.js")).href);
    const eng = mod.cadQueryCodeGeneratorEngine || (mod.CadQueryCodeGeneratorEngine && new mod.CadQueryCodeGeneratorEngine());
    const p = eng && typeof eng.getCodeGenPrompt === "function" ? eng.getCodeGenPrompt() : null;
    return typeof p === "string" && p.length > 50 ? p : null;
  } catch { return null; } // bridge still works on the built-in doctrine block alone
}

/**
 * Fail-soft: rank the CAD-draw tribal corpus (the SAME delta tips the
 * cad_learning_* recommendations inject, U-CAD-LEARN-TRIBAL-INJECT) for this
 * request and return the top tip strings, so every local-LLM generation carries
 * the shop's hard-won draw rules -- closing the tribal-injection gap the goal
 * names for the text->CAD loop. Mirrors loadEnginePrompt's dist-load pattern
 * (pathToFileURL REQUIRED on Windows dynamic import). Returns [] on any failure
 * -- generation still runs on the hard-coded doctrine block alone. The universal
 * consume:"all" tip (delta-tribal-004 topology-before-tolerance) always matches,
 * so a generic part context still yields at least the doctrine tip.
 *
 * @param {string} request
 * @param {(s: string) => Promise<any>} [importImpl] injectable for tests (no disk)
 * @returns {Promise<string[]>} ranked tip strings, capped at 5
 */
export async function loadTribalTips(request, importImpl = (s) => import(s)) {
  try {
    const { pathToFileURL } = await import("node:url");
    const engMod = await importImpl(
      pathToFileURL(resolve(REPO_ROOT, "mcp-server", "dist", "engines", "CADTribalDrawInjectionEngine.js")).href,
    );
    const dataMod = await importImpl(
      pathToFileURL(resolve(REPO_ROOT, "mcp-server", "dist", "data", "cadDrawTribalTips.js")).href,
    );
    const engine = engMod.cadTribalDrawInjectionEngine;
    let corpus = dataMod.CAD_DRAW_TRIBAL_TIPS;
    if (!engine || typeof engine.recommend !== "function" || !Array.isArray(corpus)) return [];
    // MERGE background-synthesized knowledge (U-DELTA-CAD-KNOWLEDGE-SYNTH): the Hermes/Grok cron appends
    // CADTribalTip-shaped design rules to cad-knowledge-synth.jsonl; fold them into the corpus so the
    // generator uses the freshly-synthesized ME+CAD knowledge WITHOUT a rebuild. Fail-soft.
    try {
      const synth = readFileSync(resolve(REPO_ROOT, "state", "shared", "cad-knowledge-synth.jsonl"), "utf8")
        .split(/\r?\n/).filter(Boolean)
        .map((l) => { try { return JSON.parse(l); } catch { return null; } })
        .filter((o) => o && typeof o.tip === "string" && o.domain === "cad");
      if (synth.length) corpus = corpus.concat(synth);
    } catch { /* no synth file yet -> corpus unchanged */ }
    const injection = engine.recommend(
      { operation: "generate", featureType: "part", query: String(request || "").slice(0, 200), limit: 5 },
      corpus,
    );
    const applied = injection && Array.isArray(injection.applied) ? injection.applied : [];
    const tips = applied.map((t) => (t && typeof t.tip === "string" ? t.tip : "")).filter((s) => s.length > 0);
    // Electrode-context gate (U-DELTA-CADGEN-SPARKGAP-FIX P1, 3-of-3 arm C): the spark-gap/electrode tip
    // is sinker-EDM-electrode-specific -- a plain part must NOT be undersized. The tribal matcher
    // over-injects it onto plain parts via a stopword token overlap ("by"), which CONTRADICTS the
    // buildPrompt "plain parts get NO allowance" doctrine and silently undersized ~16% of GEN parts.
    // Drop electrode-only tips unless the request itself names an electrode/burning surface.
    const ELECTRODE_RE = /electrode|sinker[\s-]?edm|burning\s+surface|spark\s*gap/i;
    return ELECTRODE_RE.test(String(request || "")) ? tips : tips.filter((t) => !ELECTRODE_RE.test(t));
  } catch { return []; } // tribal injection is advisory -- never block generation
}

/**
 * Fail-soft: read THIS shop's LEARNED CAD-generation failure modes back into the prompt --
 * the missing REVERSE arrow (U-CAD-TEXT-LEARN-PROMPT). The script already FEEDS outcomes into
 * the cad-failure-ledger (ingestGenerationOutcome); this reads the ledger's learned patterns
 * via the CALIBRATED CADTrialErrorLearningEngine.recommendAdjustments (U-CAD-LEARN-CALIBRATE)
 * and returns guidance strings so each generation is steered AWAY from the modes that have
 * historically failed -- closing the generate -> outcome -> ledger -> LEARN -> next-generation
 * loop (before this, the ledger was a dead end for the generation prompt). Replays the canonical
 * ledger so the fresh-process singleton reflects accumulated learning. Empty ledger / any failure
 * -> [] (generation still runs on doctrine + tribal alone). Mirrors loadTribalTips's dist-load;
 * pathToFileURL is REQUIRED on Windows dynamic import.
 *
 * @param {string} request
 * @param {(s: string) => Promise<any>} [importImpl] injectable for tests (no disk)
 * @returns {Promise<string[]>} ranked learned-risk guidance strings, capped at 5
 */
export async function loadLearnedRisk(request, importImpl = (s) => import(s)) {
  try {
    const { pathToFileURL } = await import("node:url");
    const mod = await importImpl(
      pathToFileURL(resolve(REPO_ROOT, "mcp-server", "dist", "engines", "CADTrialErrorLearningEngine.js")).href,
    );
    const eng = mod.cadTrialErrorLearningEngine || (mod.CADTrialErrorLearningEngine && new mod.CADTrialErrorLearningEngine());
    if (!eng || typeof eng.recommendAdjustments !== "function") return [];
    // Replay the canonical ledger so the singleton reflects accumulated learning (no-op in tests
    // where the injected engine has no loadFromDisk; a fresh/missing ledger is harmless).
    if (typeof eng.loadFromDisk === "function") { try { eng.loadFromDisk(); } catch { /* fresh ledger */ } }
    const rec = eng.recommendAdjustments({ partType: slugify(request).slice(0, 24) }, { calibrate: true });
    if (!rec || typeof rec !== "object") return [];
    const out = [];
    // Prefer the engine's actionable adjustment suggestions; fall back to the top risk categories.
    for (const s of Array.isArray(rec.suggestions) ? rec.suggestions : []) {
      if (s && typeof s.action === "string" && s.action.trim().length > 0) {
        out.push(s.rationale ? `${s.action.trim()} (${String(s.rationale).trim()})` : s.action.trim());
      }
    }
    if (out.length === 0) {
      for (const c of Array.isArray(rec.topRiskCategories) ? rec.topRiskCategories : []) {
        if (c && typeof c.category === "string" && typeof c.rate === "number") {
          out.push(`avoid ${c.category} -- historical fail rate ${Math.round(c.rate * 100)}%`);
        }
      }
    }
    return out.slice(0, 5);
  } catch { return []; } // learned-risk injection is advisory -- never block generation
}

const DIM_PRIOR_DATASET = resolve(REPO_ROOT, "state", "shared", "lora", "cad-dimension-dataset.jsonl");
// KERNEL-GT dim priors (authoritative Fusion-kernel envelopes) -- PREFERRED over the point-cloud dataset,
// which is unreliable for complex/curved parts (only ~33% agree with the kernel -- U-DELTA-FUSION-KERNEL-EXEC-FALLBACK).
// Produced by `cad-fusion-live-roundtrip.mjs --kernel-dimprior`; absent until kernel sweeps accumulate (then auto-preferred).
const DIM_PRIOR_KERNEL_DATASET = resolve(REPO_ROOT, "state", "shared", "lora", "cad-dimension-dataset-kernel.jsonl");
// PRISMATIC-corpus dim priors -- point-cloud envelopes harvested from the FULL STEP corpus but ONLY for
// plane-only prismatic parts, the ONE geometry class whose point-cloud envelope agrees with the Fusion
// kernel (the live CORPUS-KERNEL finding: only the prismatic bracket agreed; curved parts disagreed
// 47-100%). So this is TRUSTWORTHY corpus-wide coverage WITHOUT a Fusion sweep -- preferred over the
// legacy mixed point dataset, below the authoritative kernel set. Produced by `--corpus-harvest`.
const DIM_PRIOR_PRISMATIC_DATASET = resolve(REPO_ROOT, "state", "shared", "lora", "cad-dimension-dataset-prismatic.jsonl");
// RADII priors (typical hole/bore/fillet radii per class) -- RELIABLE corpus-wide because radii are
// explicit STEP literals, not point-cloud approximations. Appended to the envelope prior INDEPENDENT of
// which envelope dataset wins (a part needs both its overall size AND its feature radii). From `--corpus-harvest`.
const DIM_PRIOR_RADII_DATASET = resolve(REPO_ROOT, "state", "shared", "lora", "cad-dimension-dataset-radii.jsonl");

/**
 * True iff the request states an explicit dimension (a number + length unit). When it does, the LEARNED
 * class prior is NEVER injected -- explicit dims always win, BY CONSTRUCTION: the prior can never compete
 * with a stated dimension because it is only offered when none is present. This is the structural guard
 * against the spark-gap-class failure (an injected value overriding an explicit one).
 */
export function hasExplicitDims(request) {
  // Detect a stated length dimension. SAFETY ASYMMETRY (the design principle): a false-POSITIVE only
  // SUPPRESSES a learned prior (a lost convenience, never harmful), whereas a false-NEGATIVE LEAKS a
  // prior that can contradict a stated dim (the spark-gap-class bug). So this errs toward detection.
  // Two LINEAR patterns (bounded {0,14} run -> no ReDoS; arm-C P1) covering the real phrasings:
  //  (1) a number, then up to 14 chars of dimension-continuation (digits/dots/spaces/x/×/*/-//),
  //      then a full length-unit WORD -- catches "2 inch", "2-inch", "2x1 inch", "2.0 x 1.0 x 0.5 inch"
  //      (the multi-axis NxMxK form arm-B flagged), "50mm", "3 cm";
  //  (2) a number then an immediate short/symbol unit -- "2in", `1.5"`, "2'", "2 ft".
  // A hyphen/x before a NON-unit word ("3-jaw", "2-axis") never matches -- a unit must follow.
  const s = String(request || "").slice(0, 8192); // bound the scan (arm-C P2 defense-in-depth)
  return /\d[\d.\s×x*/-]{0,14}(?:inch|inches|millimet\w*|mm|cm|feet|foot|ft)\b/i.test(s)
    || /\d[\s-]{0,3}(?:in\b|ft\b|["'″′])/i.test(s); // glued/hyphen short units: 2in, 0.5-in, 2', 2″ ("in" needs a digit within 3 chars -> the "in" preposition never matches)
}

/** Keyword-classify a free-text request to a known cad-corpus part_class (fallback "general"). */
export function classifyRequestPartClass(request) {
  const s = String(request || "").toLowerCase();
  const MAP = [
    ["valve_body", /\bvalve\b/], ["extrude_punch", /\bpunch\b/], ["blisk", /\bblisk\b/],
    ["impeller", /\bimpeller\b/], ["bushing", /\bbushing\b/], ["casing", /\bcasing\b/],
    ["bracket", /\bbracket\b/], ["shaft", /\bshaft\b/], ["die", /\bdie\b/], ["plate", /\bplate\b/],
  ];
  for (const [cls, re] of MAP) if (re.test(s)) return cls;
  return "general";
}

/**
 * Fail-soft: load the LEARNED per-class dimensional prior (envelope + radii) for this request from the
 * cad-dimension-dataset, so an UNDER-SPECIFIED request ("a typical bushing") draws from this shop's
 * accumulated dimensions -- the goal's "database you draw from for quicker cad generation". Returns []
 * when the request already states explicit dims (hasExplicitDims -> explicit dims win) or on any failure.
 * @param {string} request
 * @returns {string[]} the matched class's prior output strings (capped by the caller)
 */
export function loadClassDimPrior(request, { readFileImpl = readFileSync, datasetPath = DIM_PRIOR_DATASET, kernelDatasetPath = DIM_PRIOR_KERNEL_DATASET, prismaticDatasetPath = DIM_PRIOR_PRISMATIC_DATASET, radiiDatasetPath = DIM_PRIOR_RADII_DATASET } = {}) {
  try {
    if (hasExplicitDims(request)) return []; // explicit dims present -> never offer a learned prior
    const cls = classifyRequestPartClass(request);
    // Read all class-matching `output` strings from one dataset (absent/unparseable -> []).
    const readHits = (ds) => {
      if (!ds) return [];
      let text;
      try { text = readFileImpl(ds, "utf8"); } catch { return []; }
      const out = [];
      for (const line of String(text).split(/\r?\n/)) {
        if (!line.trim()) continue;
        let row;
        try { row = JSON.parse(line); } catch { continue; }
        if (typeof row?.instruction === "string" && row.instruction.includes(`classified as "${cls}"`) && typeof row.output === "string" && row.output.trim()) {
          out.push(row.output.trim());
        }
      }
      return out;
    };
    const out = [];
    // ENVELOPE prior: first dataset (KERNEL-GT authoritative -> PRISMATIC corpus -> legacy point) with a
    // class hit wins (trust order). The point dataset is unreliable for curved parts -> last resort.
    for (const ds of [kernelDatasetPath, prismaticDatasetPath, datasetPath]) {
      const hits = readHits(ds);
      if (hits.length) { out.push(...hits); break; }
    }
    // RADII prior: ALWAYS appended (reliable corpus-wide, independent of the envelope source) -- a part
    // needs BOTH its overall envelope AND its typical hole/bore/fillet radii for accurate generation.
    out.push(...readHits(radiiDatasetPath));
    return out;
  } catch { return []; } // dimensional-prior injection is advisory -- never block generation
}

const ARCHETYPE_RECIPES_PATH = resolve(REPO_ROOT, "state", "shared", "cad-action-templates", "ARCHETYPE-RECIPES.json");

// Ordered most-SPECIFIC -> general; first match wins. Each entry maps a build ARCHETYPE (a recipe key
// in ARCHETYPE-RECIPES.json) to the request phrasings that imply it. Bounded alternations only (\b
// anchors, no nested quantifiers) -> linear-time, no ReDoS (the dim-prior arm-C lesson). The map is the
// build-shape taxonomy (how the part is MADE), distinct from classifyRequestPartClass's corpus
// part_class taxonomy (what the part IS, for dimensional priors) -- complementary, not a duplicate.
const ARCHETYPE_KEYWORDS = [
  ["assembly", /\bassembl|\bmating\b|\bmate[ds]?\b|\bsub-?assembl|\bcomponents?\b|\bfasten/],
  ["threaded", /\bthread|\btapp?ed\b|\bscrew\b|\bbolt\b|\bnpt\b|\bunc\b|\bunf\b|\bm\d+\s*x\s*[\d.]/],
  ["complex-organic", /\bblisk\b|\bimpeller\b|\bturbine\b|\bblade\b|\bairfoil\b|\bvane\b|\borganic\b|\bfreeform\b/],
  ["loft-sweep", /\bloft|\bswept?\b|\bsweep\b|\btransition\b|\btaper(?:ed|ing)?\b|\bduct\b|\bmanifold\b/],
  ["shell", /\bshell|\bhollow\b|\bthin[\s-]?wall|\bcasing\b|\benclosure\b|\bhousing\b|\bcup\b|\btank\b/],
  ["pocket", /\bpocket|\bcounter-?bore\b|\bc'?bore\b|\brecess|\bslot\b|\bgroove\b|\bcavity\b/],
  ["revolve", /\brevolv|\bring\b|\bwasher\b|\bdisc\b|\bdisk\b|\bcone\b|\bsphere\b|\btorus\b|\bturned\b|\bspacer\b/],
  ["shaft", /\bshaft\b|\baxle\b|\bspindle\b|\bpin\b|\bdowel\b|\brod\b|\bcylinder\b|\bbushing\b/],
  ["flat-plate", /\bplate\b|\bbracket\b|\bgusset\b|\bflat\b|\bbar\b|\btab\b|\bblock\b/],
  ["extrude", /\bextrud|\bprofile\b|\bprism\b|\bcube\b|\bbox\b|\bchannel\b/],
];

/**
 * Keyword-classify a free-text request to one of the 11 BUILD ARCHETYPES (the recipe keys in
 * ARCHETYPE-RECIPES.json). Ordered most-specific -> general; first match wins; default "unknown".
 * Advisory only -- a misclassification at worst injects a slightly-off build-ORDER hint (no numeric
 * values; the request always governs), so this errs toward a concrete archetype.
 */
export function classifyRequestArchetype(request) {
  const s = String(request || "").toLowerCase();
  for (const [arch, re] of ARCHETYPE_KEYWORDS) if (re.test(s)) return arch;
  return "unknown";
}

/**
 * Fail-soft: load the canonical BUILD RECIPE (ordered OPERATION sequence) for the request's archetype
 * from ARCHETYPE-RECIPES.json, so each local-LLM generation follows the shop's proven build order for
 * that part family -- the goal's "templates / design pipelines for quicker cad generation". Returns the
 * platform-INVARIANT op verbs ONLY (sketch.rect-2pt -> op.extrude -> ...), NEVER the platform-specific
 * fn names (Fusion's features.extrudeFeatures.addSimple etc.): the GEN target is build123d/cadquery, so
 * injecting another platform's API calls would steer the model to hallucinate them. Returns [] on the
 * "unknown" archetype (its op-sequence is empty by design), an absent recipe, or any failure --
 * generation still runs on doctrine + tribal + priors alone.
 * @param {string} request
 * @returns {string[]} 0 or 1 formatted recipe line (matches the buildPrompt array-of-strings convention)
 */
export function loadArchetypeRecipe(request, { readFileImpl = readFileSync, recipesPath = ARCHETYPE_RECIPES_PATH, platform = "fusion360" } = {}) {
  try {
    const arch = classifyRequestArchetype(request);
    if (arch === "unknown") return []; // no archetype-specific build order to offer
    const recipes = JSON.parse(readFileImpl(recipesPath, "utf8"))?.recipes;
    const byPlatform = recipes && recipes[arch];
    if (!byPlatform || typeof byPlatform !== "object") return [];
    // op verbs are platform-INVARIANT within an archetype -> any platform's step list yields the same
    // sequence; prefer the requested platform, then fusion360 (delta canonical), then the first present.
    const steps = byPlatform[platform] || byPlatform.fusion360 || Object.values(byPlatform)[0];
    if (!Array.isArray(steps) || steps.length === 0) return [];
    const ops = [];
    for (const st of steps) {
      const op = st && typeof st.op === "string" ? st.op.trim() : ""; // op ONLY -- never st.fn
      if (op && !ops.includes(op)) ops.push(op); // dedup, preserve order
    }
    return ops.length ? [`${arch} part -- build order: ${ops.join(" -> ")}`] : [];
  } catch { return []; } // build-recipe injection is advisory -- never block generation
}

/**
 * Pure: assemble the generation prompt. The delta doctrine is HARD-CODED here
 * (operator directive) so every local-LLM generation carries the galaxy's
 * known-failure rules without any retrieval dependency; the engine's canonical
 * codegen prompt is PREPENDED when loadable, and feature-template names are
 * appended when available (RAG-lite, fail-soft).
 */
export function buildPrompt(request, templateNames = [], enginePrompt = null, tribalTips = [], learnedRisk = [], classDimPriors = [], recipe = []) {
  const tips = Array.isArray(tribalTips) ? tribalTips.filter((t) => typeof t === "string" && t.trim().length > 0) : [];
  const learned = Array.isArray(learnedRisk) ? learnedRisk.filter((t) => typeof t === "string" && t.trim().length > 0) : [];
  const priors = Array.isArray(classDimPriors) ? classDimPriors.filter((t) => typeof t === "string" && t.trim().length > 0) : [];
  const rec = Array.isArray(recipe) ? recipe.filter((t) => typeof t === "string" && t.trim().length > 0) : [];
  return [
    enginePrompt ? enginePrompt : null,
    enginePrompt ? "" : null,
    "You are PRISM's CAD code generator. Produce a COMPLETE, runnable Python script",
    "using build123d (preferred) or cadquery that models the requested part and",
    "exports it as STEP to the file path given by the OUTPUT_STEP environment",
    "variable (fall back to 'out.step').",
    "",
    "HARD RULES (JM Die shop conventions -- violating any makes the part scrap):",
    "- UNITS (direction matters -- a wrong conversion is scrap): dimensions are INCHES",
    "  unless the request explicitly states metric (mm/cm). build123d/cadquery are",
    "  mm-native. INCH request -> MULTIPLY by 25.4 to get mm (IN = 25.4; length = 2.0 * IN).",
    "  METRIC request -> use the millimetre number DIRECTLY; do NOT introduce IN, do NOT",
    "  convert. NEVER DIVIDE a dimension by IN or 25.4 -- `length = 101.6 / IN` makes the",
    "  part 25.4x too small (the most common scrap-class units bug).",
    "- Parametrize every dimension as a named variable at the top of the script.",
    "- Solids only -- no open shells; the STEP must be a manifold B-rep.",
    "- No periodic B-spline surface tricks; use primitive booleans/extrudes/",
    "  revolves/fillets (malformed periodic splines open BLANK in Fusion).",
    "- DIMENSIONAL ACCURACY IS PARAMOUNT: build every part at its EXACT nominal",
    "  dimensions. Apply a material allowance ONLY when the request EXPLICITLY names",
    "  a sinker-EDM electrode or burning surface -- then undersize burning surfaces by",
    "  0.0015 inch per side (0.003 inch total spark gap). A plain plate/block/cube/",
    "  cylinder/bushing/etc gets NO allowance -- use its exact stated size.",
    "- UNITS: if you ever apply an inch allowance, subtract it IN INCHES before the mm",
    "  conversion: `(2.0 - 0.003) * IN`. NEVER `(2.0 - 0.003 * IN) * IN` -- subtracting a",
    "  mm value from an inch value is a units bug that systematically mis-sizes the part.",
    "- EXPORT API (EXACT -- a wrong method name produces NO STEP and fails the run):",
    "  `import os` then `OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')`.",
    "  For cadquery: `from cadquery import exporters` then",
    "  `exporters.export(result, OUTPUT_STEP)` -- a Workplane has NO .exportStep() method.",
    "  For build123d: `from build123d import export_step` then `export_step(result, OUTPUT_STEP)`.",
    "- Output ONLY one python code block. No prose before or after it.",
    templateNames.length ? "" : null,
    templateNames.length ? `Known PRISM feature templates you may pattern-match against: ${templateNames.slice(0, 20).join(", ")}.` : null,
    rec.length ? "" : null,
    rec.length ? "REFERENCE BUILD RECIPE (the shop's canonical operation order for this part's archetype -- a build-order HINT to translate into build123d/cadquery idioms; the request's dimensions and features always govern, and you may add/skip steps as the part needs):" : null,
    ...rec.slice(0, 1).map((t) => `- ${t.trim()}`),
    tips.length ? "" : null,
    tips.length ? "SHOP TRIBAL KNOWLEDGE (hard-won CAD-draw rules -- apply where relevant):" : null,
    ...tips.slice(0, 5).map((t) => `- ${t.trim()}`),
    learned.length ? "" : null,
    learned.length ? "LEARNED FAILURE MODES (from this shop's CAD-generation history -- steer the design AWAY from these):" : null,
    ...learned.slice(0, 5).map((t) => `- ${t.trim()}`),
    priors.length ? "" : null,
    priors.length ? "LEARNED SHOP DIMENSIONS (this shop's MEASURED median dimensions for this part class, from real production parts -- for any dimension the request leaves UNSPECIFIED, use these measured values DIRECTLY; do NOT round them to 'nicer' numbers or substitute generic defaults. Any dimension the request states EXPLICITLY always wins):" : null,
    ...priors.slice(0, 2).map((t) => `- ${t.trim()}`),
    "",
    `REQUEST: ${String(request).trim()}`,
  ].filter((l) => l !== null).join("\n");
}

/** Pure: extract the first python code fence (or bare code as fallback). */
export function extractPythonCode(llmText) {
  const text = String(llmText || "");
  const fence = text.match(/```(?:python|py)?\s*\n([\s\S]*?)```/);
  const code = fence ? fence[1].trim() : "";
  return code || null;
}

/**
 * Pure: is the generated code plausibly a CAD script? Cheap structural gates
 * only (the real validation is execution + cad-analyze-step downstream).
 * Returns a reason string or null when acceptable.
 */
export function codeInvalidReason(code, { requestIsMetric: metric = false } = {}) {
  if (!code || code.length < 40) return "empty/trivial generation";
  if (!/import\s+(build123d|cadquery)|from\s+(build123d|cadquery)/.test(code)) {
    return "no build123d/cadquery import -- not a CAD script";
  }
  if (!/step/i.test(code)) return "no STEP export present";
  // A DIMENSION divided by IN or 25.4 makes the part 25.4x too small -- the mm-request units bug the
  // self-check sweep caught (`length_mm = 101.6 / IN` -> 4.0mm). Reject so it fails loud + records a signal.
  if (/=\s*-?\d[\d.]*\s*\/\s*(?:IN\b|25\.4)/.test(code)) return "dimension divided by IN/25.4 -- 25.4x-undersize units bug";
  // The inverse on a METRIC request: scaling a mm dimension BY IN makes it 25.4x too BIG (`length = 14.5 * IN`).
  // mm is native, so a metric part must never multiply a dimension by IN (the sweep caught 321.82 for a 12.67mm part).
  if (metric && (/[\d.)]\s*\*\s*IN\b/.test(code) || /\bIN\s*\*\s*\d/.test(code))) return "metric dimension multiplied by IN -- 25.4x-oversize units bug";
  // INCH requests must show the inch->mm conversion; a METRIC request legitimately has NONE (mm is native),
  // so requiring it there would reject a correct mm script and push the LLM toward the buggy /IN division.
  if (!metric && !/25\.4|\bIN\b|\binch/i.test(code)) return "no inch->mm conversion evidence (JM units rule)";
  return null;
}

/**
 * OFFLINE feature-aware self-check (Fusion-FREE): decipher the request into a ground-truth print (envelope +
 * features) and grade the generated STEP's extracted dims against it. Catches missing-feature / wrong-dim
 * defects at GENERATION time (incl. the headless overnight loop, which has no Fusion). Records a verdict --
 * NEVER rejects (curved parts are bbox-advisory). Fail-soft: any error -> {accurate:null, reason}. Pure given text.
 */
export function offlineSelfCheck(request, stepText) {
  try {
    const gt = parseRequestPrint(request || "");
    if (!gt.dims.length) return { accurate: null, reason: "request states no parseable dimensions" };
    const spec = partSpecFromStepText(stepText || "", { label: "staged" });
    const v = runSelfCheck({ printDims: gt.dims, partDims: dimsFromPartSpec(spec), bboxReliable: spec.bboxReliable });
    return { accurate: v.accurate, score: v.score, dimAccuracy: v.dimAccuracy, completeness: v.completeness, missingCount: v.missingCount, extraCount: v.extraCount, bboxReliable: v.bboxReliable, bboxAdvisory: v.bboxAdvisory };
  } catch (e) { return { accurate: null, reason: `self-check skipped: ${String(e?.message ?? e).slice(0, 80)}` }; }
}

/**
 * offlineMfgLogic -- Stage-2 manufacturing interpretation (U-DELTA-CAD-MFG-LOGIC). Deciphers the
 * request print and derives the STOCK BODY ("add material for finishing operations") + a
 * WORKHOLDING proposal ("add features for clamping or work holding") -- the operator's "logic"
 * half. Request-derived (no STEP/Fusion needed), so it attaches even when execution failed.
 * Advisory only: authoritative collision-clearance + jaw/clamp FORCE adequacy defer to the safety
 * engines + Fusion. Infers lathe vs mill from the deciphered shape. Fail-soft. Pure given text.
 */
export function offlineMfgLogic(request, opts = {}) {
  try {
    const gt = parseRequestPrint(request || "");
    if (!gt.dims.length) return { applicable: false, reason: "request states no parseable dimensions" };
    const round = new Set(["disc", "cylinder", "cone", "two-body"]);
    const process = opts.process || (round.has(gt.shape) ? "lathe" : "mill");
    return mfgInterpretation(gt, { ...opts, process });
  } catch (e) { return { applicable: false, reason: `mfg-logic skipped: ${String(e?.message ?? e).slice(0, 80)}` }; }
}

/** Pure: does the request explicitly state PURELY metric units (mm/cm, no inch)? Then mm is native -- no conversion. */
export function requestIsMetric(request) {
  const s = String(request || "");
  return /\b\d[\d.]*\s*(?:mm|millimet\w*|cm|centimet\w*)\b/i.test(s)
    && !/\d[\d.]*\s*(?:inch|inches|in\b|ft|feet|foot|["'″′])/i.test(s);
}

/**
 * Pure: classify a generation's evaluated outcome into a learning signal, or null
 * when there is NO signal to record (U-CAD-TEXT-LEARN-LOOP). An env gap (cadquery
 * not installed) is NOT a failure -- the generation may be perfectly good, just
 * unexecutable -- so it returns null and the ledger is never polluted with a false
 * failure (R9/R12). Maps to CADTrialErrorLearningEngine RegenerationOutcome.status.
 *
 * @param invalidReason set when the LLM output was not usable CAD code (a real error)
 * @param status the executeStaged/main status object (executed/analysisExit/evaluated)
 * @returns {{status:"pass"|"fail"|"error", reason?:string} | null}
 */
export function classifyGenerationOutcome({ invalidReason = null, status = null } = {}) {
  if (invalidReason) return { status: "error", reason: String(invalidReason) };
  if (!status) return null;
  if (status.executed === true) {
    if (status.analysisExit !== 0) return { status: "fail", reason: `step analysis exit ${status.analysisExit}` };
    // AUTHORITATIVE dimensional signal (U-DELTA-CADGEN-KERNEL-LEARN): when a kernel-accuracy verdict is present
    // (--kernel-validate + Fusion up + explicit dims), it OVERRIDES the structural pass -- a part that executes
    // + analyzes fine but is the WRONG SIZE is a real FAIL (the signal the structural/point-cloud check misses).
    // accurate:null (skipped: Fusion down / no explicit dims) or absent -> fall back to the structural pass.
    const ka = status.kernelAccuracy;
    if (ka && ka.accurate === false) {
      return { status: "fail", reason: `kernel dims off ${(100 * (ka.maxRelErr ?? 0)).toFixed(1)}% (kernel ${JSON.stringify(ka.kernelDims)} vs requested ${JSON.stringify(ka.requestedDims)})` };
    }
    // Fusion-FREE dimensional/feature signal (U-DELTA-CADGEN-SELFCHECK-LEARN): when the authoritative kernel
    // verdict is absent (the overnight loop has no Fusion) but the offline self-check graded a RELIABLE-bbox
    // (prismatic) part as inaccurate, that is a real FAIL the structural check misses -> a learnable defect.
    // Curved parts (bboxAdvisory / bboxReliable=false) are NOT failed here -- the offline check is unreliable
    // for them (raw-STEP over-count); defer those to the Fusion kernel verdict.
    const sc = status.selfCheck;
    if ((!ka || ka.accurate == null) && sc && sc.accurate === false && sc.bboxReliable === true && sc.bboxAdvisory !== true) {
      return { status: "fail", reason: `self-check off: ${sc.missingCount} missing + ${sc.extraCount} extra feature(s), dimAcc ${(100 * (sc.dimAccuracy ?? 0)).toFixed(0)}%` };
    }
    return { status: "pass" };
  }
  // executed:false -- an env gap (evaluated:false) yields NO signal; any other false is a real run failure.
  if (status.evaluated === false) return null;
  return { status: "fail", reason: status.reason ? String(status.reason) : "execution failed" };
}

/**
 * Pure: build a CADTrialErrorLearningEngine RegenerationOutcome from a classified
 * generation. testId is deterministic from the slug (the ledger is append-only;
 * uniqueness is not required); the engine stamps the timestamp. generator names the
 * model class so the learner can slice reasoning-model vs coder-model failure rates.
 */
export function buildGenerationOutcomeRecord(request, model, classification) {
  const slug = slugify(request);
  return {
    testId: `cadtext-${slug}`,
    originalPath: `text://${slug}`,
    status: classification.status,
    partType: slug.slice(0, 24) || "cad-request",
    generator: /deepseek|r1/i.test(String(model || "")) ? "cadquery-reasoning" : "cadquery-text",
    ...(classification.reason ? { error: String(classification.reason).slice(0, 300) } : {}),
  };
}

/**
 * Fail-soft: feed a classified generation outcome into the CAD learning ledger so each
 * text->CAD generation becomes a training signal (closes the predictions->outcomes loop;
 * the cad_learning_* recommendations -- now tribal-injected, U-CAD-LEARN-TRIBAL-INJECT --
 * read this same ledger). A null classification (no signal) or any import/ingest error
 * never breaks the generation path. pathToFileURL is required for Windows dynamic import.
 */
export async function ingestGenerationOutcome(request, model, classification, importImpl = (s) => import(s)) {
  if (!classification) return { ingested: false, reason: "no-signal" };
  try {
    const { pathToFileURL } = await import("node:url");
    const mod = await importImpl(
      pathToFileURL(resolve(REPO_ROOT, "mcp-server", "dist", "engines", "CADTrialErrorLearningEngine.js")).href,
    );
    const eng = mod.cadTrialErrorLearningEngine || (mod.CADTrialErrorLearningEngine && new mod.CADTrialErrorLearningEngine());
    if (eng && typeof eng.ingest === "function") {
      eng.ingest(buildGenerationOutcomeRecord(request, model, classification));
      return { ingested: true, status: classification.status };
    }
    return { ingested: false, reason: "engine-unavailable" };
  } catch (e) {
    return { ingested: false, reason: `ingest-failed: ${e?.message || e}` };
  }
}

function loadTemplateNames() {
  try {
    const j = JSON.parse(readFileSync(FEATURE_TEMPLATE_INDEX, "utf8"));
    const arr = Array.isArray(j) ? j : (j.templates || j.entries || []);
    return arr.map((t) => (typeof t === "string" ? t : t && (t.id || t.name))).filter(Boolean);
  } catch { return []; } // RAG-lite is additive; absence never blocks generation
}

function ollamaGenerate(prompt, model) {
  // keep_alive keeps the model GPU-resident across a batch so back-to-back gens under fleet GPU
  // contention hit a WARM model instead of cold-reloading -> evicting -> timing out (the exit-4
  // "ollama call failed" errors in the overnight loop). Proven approach: the OCR runner's
  // PRISM_OLLAMA_VISION_KEEP_ALIVE=15m. Override via PRISM_OLLAMA_GEN_KEEP_ALIVE.
  const body = JSON.stringify({ model, prompt, stream: false, keep_alive: process.env.PRISM_OLLAMA_GEN_KEEP_ALIVE || "15m", options: { temperature: 0.2 } });
  const r = spawnSync("curl", ["-s", "-m", String(Math.floor(GEN_TIMEOUT_MS / 1000)), "-X", "POST",
    `${OLLAMA_URL}/api/generate`, "-H", "Content-Type: application/json", "-d", body],
  { encoding: "utf8", timeout: GEN_TIMEOUT_MS + 10_000, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
  if (r.status !== 0 || !r.stdout) return { ok: false, error: `ollama call failed (curl exit ${r.status})` };
  try {
    const j = JSON.parse(r.stdout);
    if (!j.response) return { ok: false, error: `no response field: ${r.stdout.slice(0, 160)}` };
    return { ok: true, text: j.response };
  } catch (e) { return { ok: false, error: `ollama response parse: ${e.message}` }; }
}

/** Can the portable Python execute the generated code? Probed at runtime so the execution branch self-activates when the env lands. */
function pythonCadAvailable() {
  for (const mod of ["build123d", "cadquery"]) {
    const r = spawnSync(PYTHON, ["-c", `import ${mod}`], { encoding: "utf8", timeout: 30_000, windowsHide: true });
    if (r.status === 0) return mod;
  }
  return null;
}

function executeStaged(dir, mod) {
  const stepPath = join(dir, "model.step");
  const r = spawnSync(PYTHON, [join(dir, "model.py")], {
    encoding: "utf8", timeout: 120_000, windowsHide: true, cwd: dir,
    env: { ...process.env, OUTPUT_STEP: stepPath },
  });
  if (r.status !== 0) return { executed: false, reason: `python exit ${r.status}: ${String(r.stderr || "").slice(-400)}` };
  if (!existsSync(stepPath)) return { executed: false, reason: "script ran but produced no model.step" };
  const a = spawnSync(process.execPath, [join(REPO_ROOT, "scripts", "cad-analyze-step.mjs"), stepPath],
    { encoding: "utf8", timeout: 60_000, windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  return { executed: true, via: mod, stepPath, analysisExit: a.status, analysisTail: String(a.stdout || "").slice(-600) };
}

export async function main(argv = process.argv.slice(2)) {
  const request = argv.find((a) => !a.startsWith("--"));
  if (!request) { console.error("usage: node scripts/cad-text-to-cadquery.mjs \"<part description>\" [--model m] [--json]"); return 2; }
  const mi = argv.indexOf("--model");
  const model = mi !== -1 && argv[mi + 1] ? argv[mi + 1] : DEFAULT_MODEL;

  const tribalTips = await loadTribalTips(request);
  // Reverse arrow (U-CAD-TEXT-LEARN-PROMPT): steer this generation away from the shop's
  // historically-failing modes, read from the same ledger this loop feeds.
  const learnedRisk = await loadLearnedRisk(request);
  const classDimPriors = loadClassDimPrior(request);
  // Archetype build-recipe (U-DELTA-CADGEN-RECIPE-INJECT): the shop's canonical operation ORDER for the
  // request's build archetype, so generation follows a proven build sequence -- advisory, op-verbs only.
  // Classify ONCE and reuse for the recipe + both staged-metadata records (loadArchetypeRecipe re-derives
  // its own internally; this hoist removes the two redundant main-side calls -- scrutiny P2).
  const archetype = classifyRequestArchetype(request);
  const recipe = loadArchetypeRecipe(request);
  const prompt = buildPrompt(request, loadTemplateNames(), await loadEnginePrompt(), tribalTips, learnedRisk, classDimPriors, recipe);
  const gen = ollamaGenerate(prompt, model);
  if (!gen.ok) { console.error(`[cad-text] OLLAMA UNREACHABLE/FAILED: ${gen.error}`); return 4; }

  const code = extractPythonCode(gen.text);
  const invalid = codeInvalidReason(code, { requestIsMetric: requestIsMetric(request) });
  if (invalid) {
    // A non-CAD / unusable generation IS a real learning signal (code_error), unlike an env gap.
    await ingestGenerationOutcome(request, model, classifyGenerationOutcome({ invalidReason: invalid }));
    console.error(`[cad-text] generation INVALID: ${invalid}`); console.error(String(gen.text).slice(0, 400)); return 3;
  }

  const dir = join(STAGING_ROOT, `${slugify(request)}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "model.py"), code, "utf8");
  writeFileSync(join(dir, "request.json"), JSON.stringify({ request, model, generatedAt: new Date().toISOString(), promptChars: prompt.length, tribalTipCount: tribalTips.length, learnedRiskCount: learnedRisk.length, archetype, recipeInjected: recipe.length > 0 }, null, 2), "utf8");

  const mod = pythonCadAvailable();
  const status = mod
    ? executeStaged(dir, mod)
    : { executed: false, evaluated: false, reason: "build123d/cadquery not installed in portable Python -- unblock: U-QUEBEC-MCP-CADQUERY-MERGE or pip install build123d cadquery (then re-run; this branch self-activates)" };

  // KERNEL accuracy (additive, --kernel-validate): the staged STEP's point-cloud bbox (status.inspect) is
  // UNRELIABLE for holed/curved parts (a correct 50x30x20-with-hole reads [50,50,30]), so grade the part's
  // AUTHORITATIVE Fusion-kernel bbox vs the dims the request stated. Fail-soft: Fusion down / no explicit
  // dims / no STEP -> simply omitted, never breaks generation (the headless overnight loop runs without Fusion).
  if (argv.includes("--kernel-validate") && status.executed && status.stepPath) {
    const reqDims = parseRequestedDims(request);
    if (reqDims?.dimsMm) {
      const port = parseInt(process.env.PRISM_FUSION_DELTA_PORT || "18362", 10) || 18362;
      const baseUrl = `http://127.0.0.1:${port}`;
      try {
        const h = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(4000) }).then((r) => r.json());
        if (h?.status === "ok") {
          const kernelDims = await kernelDimsOf(resolve(status.stepPath), { baseUrl });
          status.kernelAccuracy = gradeDimAccuracy(kernelDims, reqDims.dimsMm);
        } else { status.kernelAccuracy = { accurate: null, reason: "fusion bridge not ok" }; }
      } catch (e) { status.kernelAccuracy = { accurate: null, reason: `kernel-validate skipped: ${String(e?.message ?? e).slice(0, 80)}` }; }
    }
  }
  // OFFLINE feature-aware self-check (Fusion-FREE -- always runs, incl. the headless overnight loop). Records
  // a verdict at GENERATION time; never rejects (curved parts are bbox-advisory). Fail-soft.
  if (status.executed && status.stepPath) {
    try { status.selfCheck = offlineSelfCheck(request, readFileSync(status.stepPath, "utf8")); }
    catch (e) { status.selfCheck = { accurate: null, reason: `stepPath read failed: ${String(e?.message ?? e).slice(0, 60)}` }; }
  }
  // OFFLINE Stage-2 manufacturing logic (U-DELTA-CAD-MFG-LOGIC): decipher the print -> stock body
  // ("material for finishing") + workholding ("clamping features"). Request-derived (no Fusion);
  // advisory training annotation, NOT a pass/fail signal. Fail-soft.
  status.mfgLogic = offlineMfgLogic(request);
  writeFileSync(join(dir, "status.json"), JSON.stringify(status, null, 2), "utf8");

  // Close the predictions->outcomes loop: feed this generation's evaluated result into the
  // CAD learning ledger (env-gap = no signal, never a false failure). Fail-soft.
  const learn = await ingestGenerationOutcome(request, model, classifyGenerationOutcome({ status }));

  const summary = { dir, model, codeChars: code.length, tribalTipCount: tribalTips.length, learnedRiskCount: learnedRisk.length, archetype, recipeInjected: recipe.length > 0, ...status, learningSignal: learn };
  console.log(argv.includes("--json") ? JSON.stringify(summary, null, 2) : `[cad-text] staged ${dir} executed=${!!status.executed}${status.reason ? ` (${status.reason.slice(0, 120)})` : ""}`);
  return 0;
}

const __isMain = (() => {
  try { return !!process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]); }
  catch { return false; }
})();
if (__isMain) main().then((c) => process.exit(c)).catch((e) => { console.error(`[cad-text] fatal: ${e?.message || e}`); process.exit(1); });
