#!/usr/bin/env node
// U-GALAXY-MS1-C1 pilot — classify flat memories into Domain-Galaxy namespaces.
//
// Scans knowledge/memories/{feedback,reference,project}/*.md, reads each frontmatter +
// body, runs a keyword classifier per galaxy, and emits a routing proposal at
// state/shared/memory-galaxy-routing.json. DOES NOT MOVE FILES — operator review
// gates the migration. Per Bibryam P2 cascade + R7 surface-don't-average:
// uncertain classifications go to "cross-galaxy" or "universal" buckets, not forced
// into a single galaxy.
//
// Usage:
//   node scripts/classify-memories-by-galaxy.mjs                  # dry run, emits routing JSON
//   node scripts/classify-memories-by-galaxy.mjs --galaxy mill    # filter to one galaxy (pilot)
//   node scripts/classify-memories-by-galaxy.mjs --verbose        # log per-file decisions
//
// Output: state/shared/memory-galaxy-routing.json
//   { schemaVersion, generatedAt, totalScanned, byGalaxy: {<galaxy>: [paths]},
//     unclassified: [paths], crossGalaxy: [{path, galaxies: [<a>, <b>]}] }
//
// Next step (operator review → run migration): a separate script reads the JSON
// + git-mv files preserving wiki-link integrity + appends redirect stubs.
//
// Fail-soft: malformed memory files → unclassified bucket; never throws.

import fs from "node:fs";
import path from "node:path";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const MEMORY_ROOTS = ["feedback", "reference", "project"].map(t =>
  path.join(PRISM, "knowledge/memories", t),
);
const OUTPUT = path.join(PRISM, "state/shared/memory-galaxy-routing.json");

// Galaxy → keyword set. Drawn from per-galaxy CLAUDE.md filename-heuristic sections
// shipped in U-GALAXY-MS1-EXTEND-4-GALAXIES + U-GALAXY-MS1-MEMORY-PARITY-3-CORE-GALAXIES.
const GALAXY_KEYWORDS = {
  mill: ["mill", "milling", "chip-load", "chatter", "deflection", "5-axis", "kienzle", "taylor", "hsm", "trochoidal", "spindle", "helix", "ball-end", "face-mill", "end-mill", "hypermill"],
  lathe: ["lathe", "turning", "css", "g96", "g97", "threading", "parting", "grooving", "boring-bar", "sub-spindle", "swiss", "bar-feeder", "live-tooling", "hard-turn", "diamond-turn"],
  wedm: ["wedm", "edm", "wire-edm", "sinker", "discharge", "dielectric", "flushing", "recast", "wire-break", "wire-tension", "taper-cut", "no-core", "multi-pass", "skim-pass"],
  quoting: ["quote", "quoting", "cost", "pricing", "bid", "estimat", "billing", "freight", "qp-", "bootstrap-distribution", "customer-rate"],
  business: ["business", "erp", "payroll", "pto", "hr", "employee", "customer", "vendor", "po", "ap", "ar", "billing", "accounting", "invoice"],
  academy: ["academy", "course", "learning", "training", "lesson", "quiz", "certification", "mit", "role-academy"],
  "post-processor": ["post", "gcode", "master-post", "fanuc", "okuma", "siemens", "heidenhain", "hurco", "haas", "mazak", "mitsubishi", "dialect", "ppg", "controller"],
  cad: ["cad", "dfm", "tolerance", "feature-recognition", "blueprint", "assembly", "step", "iges", "parasolid", "cad-rag"],
  cam: ["cam", "toolpath", "strategy", "mastercam", "esprit", "nx-cam", "powermill", "workholding", "fixture"],
  "shop-floor": ["shop-floor", "machine-live", "traveler", "alarm", "override", "per-machine", "real-time", "spindle-load"],
  "mit-curriculum": ["mit", "ocw", "curriculum", "safe-expression", "operator-splitting", "ode-integrator", "fdm", "fem", "lagrangian"],
  "pdf-corpus": ["pdf", "pypdf", "corpus", "extract", "ocr", "page-level", "pdf-learn", "jm-die"],
  "pdf-corpus-mill": ["pdf-corpus-mill"], // sub-galaxy; tight pattern
  quality: ["quality", "spc", "cpk", "cmm", "surface-finish", "gauge", "fai", "inspection"],
  "cad-fusion-live": ["cad-fusion-live", "fusion-live", "autodesk-fusion"],
  "speed-feed": ["speed-feed", "sfc", "auto-speed-feed", "ultimate-speed-feed"],
  "knowledge-conversion": ["knowledge-conversion", "course-forge", "3-lane-router"],
  "compliance-safety": ["compliance", "safety-validation", "cobot", "osha", "iso-14955", "omega-threshold", "s-x-score"],
  "corpus-aggregation": ["corpus-aggregation", "learn-corpus", "corpus-harvest"],
  "tribal-knowledge": ["tribal", "cited-tip", "shop-knowledge", "distill-tribal"],
  "agent-orchestration": ["zebra", "orchestrat", "swarm", "hive-mind", "fleet-precheck", "slot-context"],
};

function readFileSafe(p) {
  try { return fs.readFileSync(p, "utf8"); } catch { return null; }
}

function scoreGalaxy(text, keywords) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of keywords) if (lower.includes(kw)) score++;
  return score;
}

function classify(text, galaxyFilter = null) {
  const scores = {};
  const galaxies = galaxyFilter
    ? { [galaxyFilter]: GALAXY_KEYWORDS[galaxyFilter] || [] }
    : GALAXY_KEYWORDS;
  for (const [galaxy, kws] of Object.entries(galaxies)) {
    const s = scoreGalaxy(text, kws);
    if (s > 0) scores[galaxy] = s;
  }
  return scores;
}

function scanMemories() {
  const out = [];
  for (const root of MEMORY_ROOTS) {
    if (!fs.existsSync(root)) continue;
    const t = path.basename(root);
    let files;
    try { files = fs.readdirSync(root); } catch { continue; }
    for (const f of files) {
      if (!f.endsWith(".md")) continue;
      out.push({ path: path.join(root, f), name: f, kind: t });
    }
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes("--verbose");
  const galaxyFlagIdx = args.indexOf("--galaxy");
  const galaxyFilter = galaxyFlagIdx >= 0 ? args[galaxyFlagIdx + 1] : null;

  const memos = scanMemories();
  const byGalaxy = {};
  for (const g of Object.keys(GALAXY_KEYWORDS)) byGalaxy[g] = [];
  const unclassified = [];
  const crossGalaxy = [];

  for (const m of memos) {
    const content = readFileSafe(m.path);
    if (!content) { unclassified.push(m.path); continue; }
    const scores = classify(content, galaxyFilter);
    const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      unclassified.push(m.path);
      if (verbose) console.error(`UNCLASSIFIED: ${m.name}`);
      continue;
    }
    if (entries.length === 1 || entries[0][1] >= entries[1][1] * 2) {
      // Dominant galaxy (2x next-best) → assign
      byGalaxy[entries[0][0]].push(m.path);
      if (verbose) console.error(`${entries[0][0].toUpperCase()}: ${m.name} (score=${entries[0][1]})`);
    } else {
      // Multiple competitive galaxies → cross-galaxy bucket
      const top = entries.slice(0, 3).map(([g]) => g);
      crossGalaxy.push({ path: m.path, galaxies: top });
      if (verbose) console.error(`CROSS [${top.join(",")}]: ${m.name}`);
    }
  }

  const result = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    galaxyFilter,
    totalScanned: memos.length,
    summary: {
      classified: Object.values(byGalaxy).reduce((a, b) => a + b.length, 0),
      crossGalaxy: crossGalaxy.length,
      unclassified: unclassified.length,
    },
    byGalaxy,
    crossGalaxy,
    unclassified,
  };

  const dir = path.dirname(OUTPUT);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2));

  console.log(`Scanned ${result.totalScanned} memories.`);
  console.log(`Classified: ${result.summary.classified}`);
  console.log(`Cross-galaxy: ${result.summary.crossGalaxy}`);
  console.log(`Unclassified (universal candidate): ${result.summary.unclassified}`);
  console.log(`Output: ${OUTPUT}`);
  console.log(`\nReview the routing JSON, then run a follow-up migration script ` +
    `(NOT INCLUDED — operator-touch) to git-mv files into knowledge/memories/<galaxy>/ subtrees.`);
}

try { main(); } catch (e) {
  console.error("Classifier crashed:", e.message);
  process.exit(1);
}
