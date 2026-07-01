#!/usr/bin/env node
/**
 * batch-compat-scorer.mjs — Stage 2 of the lego-stacking plan.
 *
 * Consumes PRISM-COHORTS.json (Stage 1: cohort-detector.mjs output) and
 * emits a 12×12 cohort-compatibility matrix scoring whether engines from
 * cohort A can stack onto / replace / bridge with cohort B without full
 * rewrites.
 *
 * Scoring axes (per ordered pair (A,B)):
 *
 *   domain_overlap     (0.40) — Jaccard over inferred engine-name domains
 *                                (Lathe/Mill/Wedm/CAD/CAM/ERP/Quality/Tribal/...).
 *                                Two cohorts that both contain LatheEngine + LatheBridge
 *                                are *structurally* candidates for lego-stacking
 *                                even if they were written in different eras.
 *
 *   shape_overlap      (0.30) — Jaccard over engine-name shape suffixes
 *                                (Engine/Bridge/Manager/Adapter/Registry/...).
 *                                Same shape = same API role = drop-in candidate.
 *
 *   import_compat      (0.15) — importStyle pairwise compat:
 *                                cjs-era↔cjs-era = 1.0 · esm-js↔esm-js = 1.0
 *                                esm-plain↔esm-js = 0.85 (NodeNext shim)
 *                                cjs-era↔esm-* = 0.20 (full rewrite class)
 *
 *   vintage_proximity  (0.15) — same-era cohorts (e.g. both iter12-18) = 1.0;
 *                                pre-ESM ↔ generic-bridge era = 0.10.
 *
 * Bridge cost class (derived from total score):
 *   ≥0.80 → LOW    (drop-in / direct re-use)
 *   ≥0.55 → MEDIUM (thin adapter shim worth shipping in Stage 3)
 *   <0.55 → HIGH   (defer / consider full rewrite)
 *
 * Top-K recommendations: name the (A,B) pairs with MEDIUM cost class whose
 * combined engine count is highest — those are the highest-leverage shim
 * targets for Stage 3 (lego adapter shim library) + Stage 4 (auto-wire).
 *
 * Inputs : state/shared/specs/PRISM-COHORTS.json
 * Outputs: state/shared/specs/COHORT-COMPAT-MATRIX.json
 *          state/shared/specs/COHORT-COMPAT-MATRIX.md
 *
 * Karpathy R12 / fail-loud: every emitted score carries `mustHumanVerify:true`
 * + `caveat` naming the model used (Jaccard + heuristic weights, NOT a trained
 * compat classifier). Operator MUST inspect before promoting any bridge
 * recommendation to a Stage 3 shim implementation.
 *
 * Usage:
 *   node H:/prism/scripts/batch-compat-scorer.mjs                  # full run
 *   node H:/prism/scripts/batch-compat-scorer.mjs --top 10         # top-10 bridges
 *   node H:/prism/scripts/batch-compat-scorer.mjs --no-html        # md+json only
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const COHORTS_PATH = path.join(REPO_ROOT, "state/shared/specs/PRISM-COHORTS.json");
const OUT_JSON = path.join(REPO_ROOT, "state/shared/specs/COHORT-COMPAT-MATRIX.json");
const OUT_MD   = path.join(REPO_ROOT, "state/shared/specs/COHORT-COMPAT-MATRIX.md");

// ─── CLI ────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, arr) => {
    if (!a.startsWith("--")) return [];
    const k = a.slice(2);
    const next = arr[i + 1];
    if (next === undefined || next.startsWith("--")) return [[k, true]];
    return [[k, next]];
  }),
);
const TOP_K = Number(args.top ?? 10);

// ─── Load Stage 1 output ────────────────────────────────────────────
if (!fs.existsSync(COHORTS_PATH)) {
  console.error(`[batch-compat-scorer] FATAL: ${COHORTS_PATH} missing — run scripts/cohort-detector.mjs first`);
  process.exit(1);
}
const stage1 = JSON.parse(fs.readFileSync(COHORTS_PATH, "utf8"));
const cohorts = stage1.cohorts || [];
const perEng = stage1.perEngineDetail || [];

if (cohorts.length === 0) {
  console.error("[batch-compat-scorer] FATAL: no cohorts in Stage 1 output");
  process.exit(1);
}

// Build cohort → engines map (engines are strings + we enrich with importStyle from perEng)
const engStyleByName = new Map();
for (const e of perEng) engStyleByName.set(e.name, e.importStyle || "unknown");

const cohortEngines = new Map();
const cohortFullCount = new Map();
for (const c of cohorts) {
  const engines = Array.isArray(c.engines) ? c.engines : [];
  cohortEngines.set(c.cohort, engines);
  // c.count is the TRUE engine count; c.engines may be a sampled subset.
  // Use the sampled subset for feature extraction (statistically sufficient),
  // but the true count for engineCount + combinedEngineCount surface metrics.
  cohortFullCount.set(c.cohort, Number(c.count) || engines.length);
}

// ─── Feature extraction ─────────────────────────────────────────────

// Domain tokens we recognize in engine names. Ordered by specificity so the
// most-specific tokens get matched first (e.g. "MillTurn" before "Mill").
const DOMAIN_TOKENS = [
  "MillTurn", "WireEDM", "SinkerEDM", "SwissT", "SubSpindle",
  "Lathe", "Mill", "Wedm", "Sinker", "Grinder", "Welder", "Laser", "Waterjet",
  "Cad", "Cam", "Toolpath", "Post", "Fixture", "Workholding", "Probing",
  "Material", "Tool", "Coolant", "Spindle", "Carbide", "Ceramic",
  "Erp", "Quote", "Quoting", "Order", "Customer", "Vendor", "Cost", "Pricing",
  "Quality", "Cpk", "Spc", "Gauge", "Cmm", "Inspection",
  "Safety", "Collision", "Deflection", "Chatter", "Thermal", "Wear",
  "Knowledge", "Tribal", "Playbook", "Wiki", "Memory", "Reasoning", "Learning",
  "Speed", "Feed", "Optimization", "Optimizer",
  "Schema", "Registry", "Hook", "Skill", "Dispatcher", "Agent", "Bridge",
  "Operator", "Shop", "Floor", "Schedule", "Scheduling", "Capacity",
  "Lora", "Cnn", "Hnsw", "Vector", "Embedding", "Bm25", "Rag",
];

// API shape suffixes we recognize.
const SHAPE_SUFFIXES = [
  "Engine", "Bridge", "Manager", "Service", "Adapter", "Registry",
  "Repository", "Provider", "Coordinator", "Orchestrator", "Builder",
  "Generator", "Validator", "Optimizer", "Calculator", "Recommender",
  "Detector", "Classifier", "Predictor", "Synthesizer", "Wizard",
  "Pipeline", "Workflow", "Singleton", "Strategy",
];

function extractDomains(name) {
  const out = new Set();
  for (const tok of DOMAIN_TOKENS) {
    // case-insensitive substring match
    if (name.toLowerCase().includes(tok.toLowerCase())) out.add(tok);
  }
  return out;
}
function extractShape(name) {
  for (const suf of SHAPE_SUFFIXES) {
    if (name.endsWith(suf)) return suf;
  }
  return null;
}

// Build per-cohort feature aggregates: domain frequencies + shape frequencies.
function buildCohortProfile(cohortName) {
  const engines = cohortEngines.get(cohortName) || [];
  const domains = new Map();
  const shapes = new Map();
  const styles = new Map();
  for (const eng of engines) {
    const name = typeof eng === "string" ? eng : eng.name;
    if (!name) continue;
    for (const d of extractDomains(name)) domains.set(d, (domains.get(d) || 0) + 1);
    const sh = extractShape(name);
    if (sh) shapes.set(sh, (shapes.get(sh) || 0) + 1);
    const st = engStyleByName.get(name) || "unknown";
    styles.set(st, (styles.get(st) || 0) + 1);
  }
  return {
    cohort: cohortName,
    engineCount: cohortFullCount.get(cohortName) || engines.length,
    sampledFeatureEngines: engines.length,
    domains, shapes, styles,
  };
}

const profiles = cohorts.map(c => buildCohortProfile(c.cohort));
const profileByName = new Map(profiles.map(p => [p.cohort, p]));

// ─── Scoring functions ──────────────────────────────────────────────

function jaccardWeighted(mapA, mapB) {
  // Jaccard over keys, weighted by min-count overlap to reward dense overlap
  // (cohorts that both have 50 Lathe engines score higher than cohorts that
  // both have 1 Lathe engine).
  const keys = new Set([...mapA.keys(), ...mapB.keys()]);
  if (keys.size === 0) return 0;
  let inter = 0, union = 0;
  for (const k of keys) {
    const a = mapA.get(k) || 0;
    const b = mapB.get(k) || 0;
    inter += Math.min(a, b);
    union += Math.max(a, b);
  }
  return union === 0 ? 0 : inter / union;
}

// Pairwise import-style compat lookup. Symmetric.
const STYLE_PAIRS = {
  "esm-js,esm-js":       1.00,
  "esm-plain,esm-plain": 1.00,
  "cjs-era,cjs-era":     1.00,
  "unknown,unknown":     0.60,
  "esm-plain,esm-js":    0.85, // NodeNext shim
  "cjs-era,esm-plain":   0.30,
  "cjs-era,esm-js":      0.20,
  "esm-js,unknown":      0.55,
  "esm-plain,unknown":   0.55,
  "cjs-era,unknown":     0.40,
};
function importStyleCompat(stylesA, stylesB) {
  // Dominant style per cohort (highest count)
  const dom = (m) => [...m.entries()].sort((a,b) => b[1]-a[1])[0]?.[0] || "unknown";
  const a = dom(stylesA), b = dom(stylesB);
  const key1 = `${a},${b}`, key2 = `${b},${a}`;
  return STYLE_PAIRS[key1] ?? STYLE_PAIRS[key2] ?? 0.5;
}

// Vintage proximity — cohort names encode era. Rough buckets:
//   pre-ESM     : cjs-era
//   early-ESM   : esm-plain (pre-NodeNext), iter<12, mtime-q1..q4
//   current-ESM : esm-js (NodeNext), iter12-18, iter19-23, iter24+
//   deprecated  : deprecated
const ERA_OF = (cohortName) => {
  const n = cohortName.toLowerCase();
  if (n.startsWith("cjs-era")) return "preESM";
  if (n.startsWith("esm-plain") || n.includes("iter<12")) return "earlyESM";
  if (n.startsWith("esm-js") || n.includes("iter12-18") || n.includes("iter19-23") || n.includes("iter24+")) return "currentESM";
  if (n.startsWith("deprecated")) return "deprecated";
  return "earlyESM"; // mtime-q1..q4 default
};
const ERA_DIST = {
  preESM: { preESM: 1.0, earlyESM: 0.40, currentESM: 0.10, deprecated: 0.20 },
  earlyESM: { preESM: 0.40, earlyESM: 1.0, currentESM: 0.70, deprecated: 0.30 },
  currentESM: { preESM: 0.10, earlyESM: 0.70, currentESM: 1.0, deprecated: 0.15 },
  deprecated: { preESM: 0.20, earlyESM: 0.30, currentESM: 0.15, deprecated: 1.0 },
};
function vintageProximity(cohortA, cohortB) {
  const a = ERA_OF(cohortA), b = ERA_OF(cohortB);
  return ERA_DIST[a]?.[b] ?? 0.3;
}

// Combined score with the documented weights.
function scorePair(profA, profB) {
  const dom = jaccardWeighted(profA.domains, profB.domains);
  const shp = jaccardWeighted(profA.shapes, profB.shapes);
  const imp = importStyleCompat(profA.styles, profB.styles);
  const vin = vintageProximity(profA.cohort, profB.cohort);
  const total = 0.40 * dom + 0.30 * shp + 0.15 * imp + 0.15 * vin;
  return {
    total: Number(total.toFixed(3)),
    domain: Number(dom.toFixed(3)),
    shape: Number(shp.toFixed(3)),
    importStyle: Number(imp.toFixed(3)),
    vintage: Number(vin.toFixed(3)),
  };
}

function costClass(total) {
  if (total >= 0.80) return "LOW";
  if (total >= 0.55) return "MEDIUM";
  return "HIGH";
}

// ─── Build matrix ────────────────────────────────────────────────────

const cohortNames = profiles.map(p => p.cohort);
const matrix = []; // matrix[i][j] = score record
const flat = [];   // all pairs flat for top-K sort
for (let i = 0; i < cohortNames.length; i++) {
  const row = [];
  for (let j = 0; j < cohortNames.length; j++) {
    if (i === j) {
      row.push({ total: 1.0, domain: 1, shape: 1, importStyle: 1, vintage: 1, cost: "SELF" });
      continue;
    }
    const s = scorePair(profiles[i], profiles[j]);
    const c = costClass(s.total);
    row.push({ ...s, cost: c });
    flat.push({
      from: cohortNames[i],
      to: cohortNames[j],
      ...s,
      cost: c,
      fromEngineCount: profiles[i].engineCount,
      toEngineCount: profiles[j].engineCount,
      combinedEngineCount: profiles[i].engineCount + profiles[j].engineCount,
    });
  }
  matrix.push(row);
}

// Top-K MEDIUM-cost bridges by combined engine count (highest leverage Stage 3 targets)
const mediumBridges = flat
  .filter(p => p.cost === "MEDIUM")
  .sort((a, b) => b.combinedEngineCount - a.combinedEngineCount)
  .slice(0, TOP_K);

// Top-K LOW-cost bridges (drop-in opportunities — no shim needed, just re-use)
const lowBridges = flat
  .filter(p => p.cost === "LOW")
  .sort((a, b) => b.combinedEngineCount - a.combinedEngineCount)
  .slice(0, TOP_K);

// ─── Persist JSON ────────────────────────────────────────────────────

const jsonOut = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  generatedBy: "scripts/batch-compat-scorer.mjs",
  source: { cohortsPath: COHORTS_PATH, cohortCount: cohortNames.length, totalEngines: profiles.reduce((s,p) => s+p.engineCount, 0) },
  scoringModel: {
    weights: { domain: 0.40, shape: 0.30, importStyle: 0.15, vintage: 0.15 },
    costThresholds: { LOW: 0.80, MEDIUM: 0.55 },
    domainTokens: DOMAIN_TOKENS.length,
    shapeSuffixes: SHAPE_SUFFIXES.length,
    note: "Heuristic Jaccard + hand-tuned weights — NOT a trained classifier",
  },
  cohortProfiles: profiles.map(p => ({
    cohort: p.cohort,
    engineCount: p.engineCount,
    topDomains: [...p.domains.entries()].sort((a,b) => b[1]-a[1]).slice(0, 8).map(([d,c]) => ({ domain: d, count: c })),
    topShapes: [...p.shapes.entries()].sort((a,b) => b[1]-a[1]).slice(0, 5).map(([s,c]) => ({ shape: s, count: c })),
    dominantImportStyle: [...p.styles.entries()].sort((a,b) => b[1]-a[1])[0]?.[0] || "unknown",
    era: ERA_OF(p.cohort),
  })),
  cohortOrder: cohortNames,
  matrix: matrix.map(row => row.map(cell => cell.total)),
  matrixDetail: matrix,
  topMediumCostBridges: mediumBridges,
  topLowCostBridges: lowBridges,
  caveat: "ADVISORY ONLY. Scores are heuristic Jaccard over name-derived features, NOT validated API compat. Every recommended bridge MUST be human-verified before Stage 3 shim implementation.",
  mustHumanVerify: true,
};
fs.writeFileSync(OUT_JSON, JSON.stringify(jsonOut, null, 2));

// ─── Render markdown ─────────────────────────────────────────────────

const md = [];
md.push("# Cohort Compatibility Matrix (Stage 2 of lego-stacking plan)");
md.push("");
md.push(`**Generated:** ${jsonOut.generatedAt}`);
md.push(`**Source:** \`${path.relative(REPO_ROOT, COHORTS_PATH)}\` — ${cohortNames.length} cohorts, ${jsonOut.source.totalEngines.toLocaleString()} engines`);
md.push(`**Scoring:** ${JSON.stringify(jsonOut.scoringModel.weights)} weights · ${DOMAIN_TOKENS.length} domain tokens · ${SHAPE_SUFFIXES.length} shape suffixes`);
md.push("");
md.push("> **Advisory only.** Heuristic scores; every bridge candidate must be human-verified before Stage 3 shim implementation.");
md.push("");

// Cohort profile table
md.push("## Cohort profiles");
md.push("");
md.push("| Cohort | Engines | Era | Top domain | Top shape | Import style |");
md.push("|---|---:|---|---|---|---|");
for (const p of jsonOut.cohortProfiles) {
  const td = p.topDomains[0] ? `${p.topDomains[0].domain}(${p.topDomains[0].count})` : "—";
  const ts = p.topShapes[0] ? `${p.topShapes[0].shape}(${p.topShapes[0].count})` : "—";
  md.push(`| ${p.cohort} | ${p.engineCount} | ${p.era} | ${td} | ${ts} | ${p.dominantImportStyle} |`);
}
md.push("");

// Heat-map matrix (compact ASCII)
md.push("## Compatibility heat-map (12×12, total score)");
md.push("");
md.push("Rows = source cohort, columns = target cohort. Cell = `score (cost-class)`.");
md.push("Cost classes: **LOW** = drop-in · **MED** = shim worth shipping · **HIGH** = full rewrite.");
md.push("");
const shortName = (c) => {
  // Pick a compact 6-char abbreviation per cohort name for the column headers.
  const tokens = c.split(/[\s\-(]/).filter(Boolean);
  return (tokens[0] || c).slice(0, 8);
};
md.push("| from \\ to | " + cohortNames.map(shortName).join(" | ") + " |");
md.push("|---" + cohortNames.map(() => "|---").join("") + "|");
for (let i = 0; i < cohortNames.length; i++) {
  const cells = matrix[i].map((cell, j) => {
    if (i === j) return "—";
    const cls = cell.cost === "LOW" ? "LO" : cell.cost === "MEDIUM" ? "MD" : "HI";
    return `${cell.total.toFixed(2)} ${cls}`;
  });
  md.push(`| **${shortName(cohortNames[i])}** | ${cells.join(" | ")} |`);
}
md.push("");

// Top-K bridge recommendations
md.push("## Top recommended MEDIUM-cost bridges (Stage 3 shim targets)");
md.push("");
md.push("Highest-leverage candidates for adapter-shim implementation. Each shim potentially unlocks `combinedEngineCount` engines for cross-cohort re-use.");
md.push("");
md.push("| Rank | From → To | Score | Domain | Shape | Combined engines |");
md.push("|---:|---|---:|---:|---:|---:|");
mediumBridges.forEach((b, i) => {
  md.push(`| ${i + 1} | ${shortName(b.from)} → ${shortName(b.to)} | ${b.total} | ${b.domain} | ${b.shape} | ${b.combinedEngineCount} |`);
});
if (mediumBridges.length === 0) md.push("| — | _no medium-cost bridges found_ | — | — | — | — |");
md.push("");

md.push("## Top LOW-cost bridges (drop-in re-use, no shim needed)");
md.push("");
md.push("| Rank | From → To | Score | Combined engines |");
md.push("|---:|---|---:|---:|");
lowBridges.forEach((b, i) => {
  md.push(`| ${i + 1} | ${shortName(b.from)} → ${shortName(b.to)} | ${b.total} | ${b.combinedEngineCount} |`);
});
if (lowBridges.length === 0) md.push("| — | _no low-cost bridges found_ | — | — |");
md.push("");

md.push("## How to use this");
md.push("");
md.push("1. **For Stage 3** (lego adapter shim library): pick the top MEDIUM bridges. Each shim's API surface = intersection of the top shapes from both cohort profiles.");
md.push("2. **For Stage 4** (bridge-auto-wire --shims): the JSON `topMediumCostBridges[]` is the input. Each entry becomes a synthetic edge `oldNode → shim → newNode` in the graph.");
md.push("3. **For Stage 5** (cohort-drift-watch): the JSON `cohortOrder[]` is the baseline. Any new cohort appearing in a later Stage 1 run that isn't in this list = drift event.");
md.push("");
md.push("## Re-run");
md.push("");
md.push("```bash");
md.push("node H:/prism/scripts/cohort-detector.mjs              # refresh Stage 1");
md.push("node H:/prism/scripts/batch-compat-scorer.mjs           # refresh this artifact");
md.push("node H:/prism/scripts/batch-compat-scorer.mjs --top 20  # more bridge candidates");
md.push("```");

fs.writeFileSync(OUT_MD, md.join("\n"));

// ─── Stdout summary ─────────────────────────────────────────────────

console.error(``);
console.error(`─── batch-compat-scorer — done ───────────────────────────`);
console.error(`  Cohorts scored:               ${cohortNames.length}`);
console.error(`  Total engines:                ${jsonOut.source.totalEngines.toLocaleString()}`);
console.error(`  Pairs evaluated:              ${flat.length}`);
console.error(`  LOW    (drop-in):             ${flat.filter(p => p.cost === "LOW").length}`);
console.error(`  MEDIUM (shim candidate):      ${flat.filter(p => p.cost === "MEDIUM").length}`);
console.error(`  HIGH   (full rewrite):        ${flat.filter(p => p.cost === "HIGH").length}`);
console.error(`  Top MEDIUM bridge:            ${mediumBridges[0] ? `${mediumBridges[0].from} → ${mediumBridges[0].to} (${mediumBridges[0].total})` : "(none)"}`);
console.error(`  JSON:                         ${OUT_JSON}`);
console.error(`  MD:                           ${OUT_MD}`);
console.error(`──────────────────────────────────────────────────────────`);
