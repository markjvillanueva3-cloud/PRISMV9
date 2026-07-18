// build-cadgen-archetype-recipe.mjs -- reconcile the archetype BUILD RECIPES to what the corpus proves
// (U-CADGEN-ARCHETYPE-RECIPE-RECONCILE, slot:delta 2026-07-03).
//
// THE DEFECT (quantified 2026-07-03): cad-text-to-cadquery.mjs injects a per-archetype build-ORDER hint
// into every generation prompt via loadArchetypeRecipe, from the STATIC hand-authored ARCHETYPE-RECIPES.json
// (2026-05-25). classifyRequestArchetype maps cylinder/bushing/shaft -> "shaft" and ring/disc/turned ->
// "revolve"; BOTH static recipes prescribe op.revolve. But mining the 277 successful gens shows shaft
// (n=85) and revolve (n=51) are 100% .circle().extrude(), 0% revolve -- 136 gens (49%) get a "revolve"
// hint while every successful one EXTRUDED a circle. The static recipe assumed the CAD-idiomatic revolve;
// the cadquery/build123d idiom (and what the local LLM succeeds with) is EXTRUDE a circle.
//
// THIS RECONCILER mines the ORDERED op-sequences the successful gens actually used, per build archetype,
// and emits a corpus-grounded `cadquery` platform recipe into ARCHETYPE-RECIPES.json -- ADDITIVELY: it sets
// ONLY recipes[archetype]["cadquery"], NEVER touching the curated fusion360/solidworks/... sections. The
// companion 1-line edit makes the gen path call loadArchetypeRecipe(request, {platform:"cadquery"}); its
// existing fallback (byPlatform[platform] || byPlatform.fusion360 || first) keeps every archetype WITHOUT a
// cadquery section on its current behavior -- fully backward-compatible. So a round part now gets the
// proven "sketch.circle -> op.extrude" hint. This is the self-learning "templates match what works" fix.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyRequestArchetype } from "./cad-text-to-cadquery.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GEN_DIR = path.resolve(ROOT, "state", "shared", "cad-text-gen");
const RECIPES_PATH = path.resolve(ROOT, "state", "shared", "cad-action-templates", "ARCHETYPE-RECIPES.json");

const MIN_EVIDENCE = 5;   // an archetype needs >= this many gens before we trust a mined recipe
const FREQ_THRESHOLD = 0.5; // keep an op only if it appears in >= this fraction of the archetype's gens
const TS_SUFFIX_RE = /-(\d{10,})$/;

// cadquery/build123d primitive tokens -> the recipe op-verb vocabulary. op.cut folds the corpus's dominant
// cut idioms .cutThruAll (40x) + .cutBlind (8x) + .cut + the hole helpers (the plain `.cut(` token alone
// misses cutThruAll/cutBlind -- corpus finding, delta-cad agent 2026-07-03).
const OP_TOKENS = [
  ["sketch.create-plane", /\bWorkplane\s*\(/],
  ["sketch.circle", /\.circle\s*\(/],
  ["sketch.rect-2pt", /\.(rect|box)\s*\(/],
  ["sketch.line-polyline", /\.(polyline|polygon|moveTo|lineTo)\s*\(/],
  ["sketch.spline-poly", /\.spline\s*\(/],
  ["op.extrude", /\.extrude\s*\(/],
  ["op.revolve", /\.revolve\s*\(/],
  ["op.loft", /\.loft\s*\(/],
  ["op.sweep", /\.sweep\s*\(/],
  ["op.cut", /\.(cutThruAll|cutBlind|cut|hole|cboreHole|cskHole)\s*\(/],
  ["op.shell", /\.shell\s*\(/],
  ["op.chamfer", /\.chamfer\s*\(/],
  ["op.fillet", /\.fillet\s*\(/],
];

// Canonical build order: sketch setup -> profile -> primary solid op -> subtractive -> finishing.
const CANON_ORDER = [
  "sketch.create-plane", "sketch.rect-2pt", "sketch.circle", "sketch.line-polyline", "sketch.arc-cse",
  "sketch.spline-poly", "op.extrude", "op.revolve", "op.loft", "op.sweep", "op.cut", "op.shell",
  "op.chamfer", "op.fillet",
];

// cadquery idiom shown in the recipe step's `fn` (documentation only -- loadArchetypeRecipe uses `op`).
const CADQUERY_FN = {
  "sketch.create-plane": 'Workplane("XY")',
  "sketch.circle": ".circle(r)",
  "sketch.rect-2pt": ".rect(w,h) / .box(w,h,d)",
  "sketch.line-polyline": ".polyline(pts).close()",
  "sketch.spline-poly": ".spline(pts)",
  "op.extrude": ".extrude(h)",
  "op.revolve": ".revolve(angle)",
  "op.loft": ".loft()",
  "op.sweep": ".sweep(path)",
  "op.cut": ".cutThruAll() / .cutBlind(d) / .cut(tool)",
  "op.shell": ".shell(t)",
  "op.chamfer": ".chamfer(d)",
  "op.fillet": ".fillet(r)",
};

/**
 * Ordered, de-duplicated op-verb list a cadquery script uses, by first-appearance character position.
 * @param {string} code  a model.py
 * @returns {string[]}
 */
export function extractOpSequence(code) {
  const src = String(code || "");
  const hits = [];
  for (const [op, re] of OP_TOKENS) {
    const m = src.match(re);
    if (m && typeof m.index === "number") hits.push([m.index, op]);
  }
  hits.sort((a, b) => a[0] - b[0]);
  const seen = new Set();
  const seq = [];
  for (const [, op] of hits) { if (!seen.has(op)) { seen.add(op); seq.push(op); } }
  return seq;
}

/**
 * Given the op-sets of every gen for one archetype, produce the corpus-grounded ordered recipe: keep ops
 * with frequency >= FREQ_THRESHOLD, ordered by CANON_ORDER. Returns { steps, freq } or null if < MIN_EVIDENCE.
 * @param {string[][]} opSets  one entry per gen (its extractOpSequence)
 */
export function canonicalRecipeForArchetype(opSets, { minEvidence = MIN_EVIDENCE, freqThreshold = FREQ_THRESHOLD } = {}) {
  if (!Array.isArray(opSets) || opSets.length < minEvidence) return null;
  const n = opSets.length;
  const counts = new Map();
  for (const set of opSets) for (const op of new Set(set)) counts.set(op, (counts.get(op) || 0) + 1);
  const kept = [];
  const freq = {};
  for (const op of CANON_ORDER) {
    const c = counts.get(op) || 0;
    const f = c / n;
    if (f >= freqThreshold) { kept.push(op); freq[op] = Math.round(f * 100); }
  }
  if (!kept.length) return null;
  return { steps: kept, freq, n };
}

function readGens(genDir, { readdir = fs.readdirSync, existsSync = fs.existsSync, readText = (p) => fs.readFileSync(p, "utf8") } = {}) {
  const byArchetype = new Map();
  const stats = { gensScanned: 0, parseFailures: 0, noArchetype: 0, notExecuted: 0 };
  let entries;
  try { entries = readdir(genDir, { withFileTypes: true }); } catch { return { byArchetype, stats }; }
  for (const ent of entries) {
    if (!ent.isDirectory || !ent.isDirectory() || !TS_SUFFIX_RE.test(ent.name)) continue;
    const dir = path.join(genDir, ent.name);
    const rq = path.join(dir, "request.json");
    const py = path.join(dir, "model.py");
    const step = path.join(dir, "model.step");
    if (!existsSync(rq) || !existsSync(py)) continue;
    // Ground recipes ONLY in gens that actually EXECUTED to a solid (model.step present) -- a failed
    // attempt's op-sequence (e.g. a broken revolve that never ran) would pollute the recipe. Scrutiny
    // arm B caught the original mining ALL staged dirs, not just the executed ones.
    if (!existsSync(step)) { stats.notExecuted++; continue; }
    let request;
    try { request = JSON.parse(readText(rq)).request; } catch { stats.parseFailures++; continue; }
    if (typeof request !== "string" || !request.trim()) { stats.parseFailures++; continue; }
    let code;
    try { code = readText(py); } catch { stats.parseFailures++; continue; }
    const arch = classifyRequestArchetype(request);
    if (arch === "unknown") { stats.noArchetype++; continue; } // loadArchetypeRecipe returns [] for unknown -- no recipe to reconcile
    stats.gensScanned++;
    if (!byArchetype.has(arch)) byArchetype.set(arch, []);
    byArchetype.get(arch).push(extractOpSequence(code));
  }
  return { byArchetype, stats };
}

/**
 * Build the corpus-grounded cadquery recipe object { archetype: [step,...] } from the gen corpus.
 * @returns {{ recipes: object, stats: object }}
 */
export function buildCadqueryRecipes(genDir = GEN_DIR, deps = {}) {
  const { byArchetype, stats: readStats } = readGens(genDir, deps);
  const recipes = {};
  const stats = { ...readStats, byArchetype: {}, archetypesWritten: 0, archetypesSkippedLowEvidence: 0 };
  for (const [arch, opSets] of byArchetype) {
    stats.byArchetype[arch] = opSets.length;
    const canon = canonicalRecipeForArchetype(opSets, deps);
    if (!canon) { stats.archetypesSkippedLowEvidence++; continue; }
    recipes[arch] = canon.steps.map((op) => ({
      op, platform: "cadquery", fn: CADQUERY_FN[op] || "", args: [],
      notes: `corpus-grounded: ${canon.n} gens, ${canon.freq[op]}% freq`,
    }));
    stats.archetypesWritten++;
  }
  return { recipes, stats };
}

/**
 * Merge the mined cadquery recipes into ARCHETYPE-RECIPES.json ADDITIVELY: set ONLY recipes[arch]["cadquery"],
 * preserving every existing platform section. Atomic tmp+rename. Returns the paths of archetypes updated.
 */
export function writeRecipes(minedRecipes, recipesPath = RECIPES_PATH, { readText = (p) => fs.readFileSync(p, "utf8") } = {}) {
  const doc = JSON.parse(readText(recipesPath));
  if (!doc || typeof doc !== "object" || !doc.recipes || typeof doc.recipes !== "object") {
    throw new Error(`ARCHETYPE-RECIPES.json missing a .recipes object at ${recipesPath}`);
  }
  const updated = [];
  for (const [arch, steps] of Object.entries(minedRecipes)) {
    if (!doc.recipes[arch] || typeof doc.recipes[arch] !== "object") doc.recipes[arch] = {}; // new archetype -> platform map
    doc.recipes[arch].cadquery = steps; // ADDITIVE: only the cadquery key; curated platforms untouched
    updated.push(arch);
  }
  doc.cadqueryReconciledAt = new Date().toISOString();
  const tmp = `${recipesPath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(doc, null, 2) + "\n");
  fs.renameSync(tmp, recipesPath); // atomic -- a truncating write would leave the live gen-steering file torn
  return updated;
}

export const __test = { extractOpSequence, canonicalRecipeForArchetype, buildCadqueryRecipes, OP_TOKENS, CANON_ORDER };

// ---- CLI -------------------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const { recipes, stats } = buildCadqueryRecipes();
  if (args.includes("--write")) { stats.wrote = writeRecipes(recipes); }
  if (args.includes("--json")) {
    console.log(JSON.stringify({ stats, recipes: Object.fromEntries(Object.entries(recipes).map(([a, s]) => [a, s.map((x) => x.op)])) }, null, 2));
  } else {
    console.log(`archetype-recipe reconcile: scanned ${stats.gensScanned} gens (${stats.noArchetype} unknown-archetype skipped, ${stats.parseFailures} parse-fail)`);
    for (const [a, s] of Object.entries(recipes)) console.log(`  ${a.padEnd(14)} (${stats.byArchetype[a]} gens) -> ${s.map((x) => x.op).join(" -> ")}`);
    console.log(`  written=${stats.archetypesWritten} skippedLowEvidence=${stats.archetypesSkippedLowEvidence}`);
    if (stats.wrote) console.log(`  wrote cadquery sections for [${stats.wrote.join(", ")}] -> ${RECIPES_PATH}`);
    else console.log(`  (dry -- pass --write to emit)`);
  }
}
