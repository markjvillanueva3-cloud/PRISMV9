#!/usr/bin/env node
/**
 * sf-psn-leverage-rank.mjs — META artifact for /forge-audit-v2
 * scope: speed-and-feed calculation engines + decisioning pipelines.
 *
 * Re-runnable measurement of how much of PRISM's math/science capability
 * (the `src/algorithms/` module library) and the PSN knowledge surfaces
 * (Obsidian-brain memory, wiki, tribal, neural/AI, playbook, system-viz)
 * the Speed-Feed calculation engines actually compose at decision time.
 *
 * A one-shot audit rots in 30 days; this ranker compounds — re-run it after
 * any SF-PSN-WIRE-MS0 unit ships to confirm the composition gap shrank.
 *
 * Pure file I/O only — no shell, no child_process.
 *
 * Usage:
 *   node scripts/sf-psn-leverage-rank.mjs            # human summary
 *   node scripts/sf-psn-leverage-rank.mjs --json     # machine JSON
 *
 * Exit codes: 0 = ran clean, 1 = I/O error, 2 = no SF engines found.
 *
 * @module scripts/sf-psn-leverage-rank
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = "1.0.0";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENGINES_DIR = join(ROOT, "mcp-server", "src", "engines");
const ALGORITHMS_DIR = join(ROOT, "mcp-server", "src", "algorithms");
const OUT = join(ROOT, "state", "shared", "sf-psn-leverage-rank.json");

/** High-leverage algorithm modules a physics-grade SF calc should compose. */
const HIGH_LEVERAGE = [
  "KienzleForceModel", "ExtendedTaylorModel", "JaegerTempField",
  "StabilityLobeDiagram", "FRFStabilityLobe", "RCSA", "GilbertMRRModel",
  "JohnsonCookModel", "UsuiWearModel", "BayesianWearModel",
  "ThermalPartitionModel", "BayesianOptimizer", "SurfaceFinishPredictor",
  "ChipThinningCompensation", "PowerTorqueCalc",
];

/** PSN knowledge surfaces — import-spec substrings that signal a connection. */
const PSN_SURFACES = {
  "obsidian-brain/memory": [/prism_memory/i, /MemoryGraph/i, /memory_search/i, /Obsidian/i, /QdrantMemory/i],
  "wiki": [/WikiIndex/i, /wiki_query/i, /\/wiki\//i],
  "tribal": [/TribalKnowledge/i],
  "neural/ai": [/CrossProcessNeural/i, /DeepLearning/i, /NeuralInference/i, /AdvancedAI/i, /UltimateAI/i],
  "playbook": [/MachiningPlaybook/i],
  "system-viz": [/system-?viz/i, /SystemGraph/i],
};

const IMPORT_RE = /from\s*["']([^"']+)["']/g;
const DYNAMIC_RE = /(?:await\s+import|[^.\w]import|\brequire)\s*\(\s*["']([^"']+)["']\s*\)/g;

function fail(code, msg) {
  process.stderr.write(`sf-psn-leverage-rank: ${msg}\n`);
  process.exit(code);
}

function listAlgorithmModules() {
  let entries;
  try {
    entries = readdirSync(ALGORITHMS_DIR);
  } catch (e) {
    fail(1, `cannot read algorithms dir: ${e.message}`);
  }
  return entries
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => f.replace(/\.ts$/, ""))
    .filter((n) => n !== "index" && n !== "types");
}

function listSpeedFeedEngines() {
  let entries;
  try {
    entries = readdirSync(ENGINES_DIR);
  } catch (e) {
    fail(1, `cannot read engines dir: ${e.message}`);
  }
  return entries.filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && /speedfeed/i.test(f),
  );
}

function extractSpecs(src) {
  const specs = new Set();
  for (const m of src.matchAll(IMPORT_RE)) specs.add(m[1]);
  for (const m of src.matchAll(DYNAMIC_RE)) specs.add(m[1]);
  return [...specs];
}

function basename(spec) {
  return spec.split("/").pop().replace(/\.js$/, "").replace(/\.ts$/, "");
}

function main() {
  const json = process.argv.includes("--json");
  const algorithmModules = listAlgorithmModules();
  const sfEngines = listSpeedFeedEngines();
  if (sfEngines.length === 0) fail(2, "no speed-feed engines found");

  const composedAlgorithms = new Set();
  const psnConnected = new Set();
  const perEngine = {};

  for (const file of sfEngines) {
    let src;
    try {
      src = readFileSync(join(ENGINES_DIR, file), "utf8");
    } catch (e) {
      fail(1, `cannot read ${file}: ${e.message}`);
    }
    const specs = extractSpecs(src);
    const algos = [];
    const psn = [];
    for (const spec of specs) {
      if (/\/algorithms\//.test(spec)) {
        const name = basename(spec);
        composedAlgorithms.add(name);
        algos.push(name);
      }
      for (const [surface, patterns] of Object.entries(PSN_SURFACES)) {
        if (patterns.some((p) => p.test(spec))) {
          psnConnected.add(surface);
          if (!psn.includes(surface)) psn.push(surface);
        }
      }
    }
    perEngine[file.replace(/\.ts$/, "")] = {
      importSpecs: specs.length,
      algorithmModules: algos.sort(),
      psnSurfaces: psn.sort(),
    };
  }

  const available = algorithmModules.length;
  const composed = [...composedAlgorithms].filter((a) => algorithmModules.includes(a));
  const gapPct = available > 0 ? Math.round(((available - composed.length) / available) * 1000) / 10 : 0;
  const psnMissing = Object.keys(PSN_SURFACES).filter((s) => !psnConnected.has(s));
  const highLeverageDormant = HIGH_LEVERAGE.filter((m) => !composedAlgorithms.has(m));

  const report = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    summary: {
      sfEnginesScanned: sfEngines.length,
      algorithmModulesAvailable: available,
      algorithmModulesComposed: composed.length,
      compositionGapPct: gapPct,
      psnSurfacesConnected: [...psnConnected].sort(),
      psnSurfacesMissing: psnMissing,
      highLeverageDormantCount: highLeverageDormant.length,
      ok: true,
    },
    composedAlgorithmModules: composed.sort(),
    highLeverageDormant,
    perEngine,
  };

  try {
    writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
  } catch (e) {
    fail(1, `cannot write ${OUT}: ${e.message}`);
  }

  if (json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return;
  }
  const s = report.summary;
  process.stdout.write(
    `SF x PSN leverage rank\n` +
      `  SF engines scanned ........ ${s.sfEnginesScanned}\n` +
      `  algorithm modules ......... ${s.algorithmModulesComposed} composed / ${s.algorithmModulesAvailable} available\n` +
      `  composition gap ........... ${s.compositionGapPct}%\n` +
      `  PSN surfaces connected .... ${s.psnSurfacesConnected.join(", ") || "(none)"}\n` +
      `  PSN surfaces MISSING ...... ${s.psnSurfacesMissing.join(", ") || "(none)"}\n` +
      `  high-leverage dormant ..... ${s.highLeverageDormantCount}: ${report.highLeverageDormant.join(", ")}\n` +
      `  -> ${OUT}\n`,
  );
}

main();
