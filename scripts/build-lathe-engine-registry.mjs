#!/usr/bin/env node
// U-LTH01: Lathe Engine Inventory Reconciliation
// Scans src/engines/Lathe*.ts, builds lathe-engine-registry.json

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve("H:/prism/mcp-server");
const ENG_DIR = resolve(ROOT, "src/engines");
const TEST_DIR = resolve(ROOT, "src/__tests__");
const OUT = resolve(ROOT, "data/state/lathe-engine-registry.json");

const CATEGORY_RULES = [
  [/AGI|NearAGI|AGICore/i, "agi"],
  [/Reasoning|Logic|Reason/i, "reasoning"],
  [/DeepLearning|NeuralIntelligence|Transformer|Attention|Ensemble|Bayesian|Genetic|Anomaly|Transfer|Meta|Causal|KnowledgeGraph|Reinforcement|Active/i, "ml"],
  [/Physics|Thermodynamics|Chip|Kinematics|Metallurgy|CuttingChemistry|ScienceHardening|UnifiedScience|UnifiedPhysics/i, "physics"],
  [/Training|Harvester|Archive|Knowledge/i, "learning_pipeline"],
  [/PostProcessor|PP|PostAI/i, "post_processor"],
  [/Orchestrat|Facade|Ultra/i, "orchestration"],
  [/Workholding|ChuckJaw|Collision|DatumReference|Coaxiality|ProbeCycle/i, "setup_workholding"],
  [/Program|Sequence|MultiOp|Changeover|Signoff|Backtrace|Replay|Style/i, "programming"],
  [/Cost|OpTime|Breakdown|CostModel/i, "cost_business"],
  [/Coolant|BirdNest|ChipClearance|Parting|CSS|Feedback|StockEvolution|EnvelopeBreach|BlockTimeProfiler|BlockEngagement|DeviationMap|SubSpindle|AuxAxis/i, "process_control"],
  [/Classifier|PartFamily|FirstPiece|QualityGate/i, "quality_pipeline"],
  [/Troubleshoot|ExpertAdvisor|Predictive|MachineIntelligence|Intelligence|ShopAware|ResourceKnowledge|TribalInjector|JMDieKnowledge|SelfAwareness/i, "intelligence"],
];

function categorize(name) {
  const cats = [];
  for (const [re, cat] of CATEGORY_RULES) if (re.test(name)) cats.push(cat);
  return cats.length ? cats : ["uncategorized"];
}

function shortcode(name) {
  return name.replace(/^Lathe/, "").replace(/Engine$/, "");
}

function analyzeEngine(filename) {
  const path = resolve(ENG_DIR, filename);
  const src = readFileSync(path, "utf8");
  const loc = src.split("\n").length;
  const exports = [
    ...src.matchAll(/^export\s+(const|class|function|interface|type|default)\s+(\w+)/gm)
  ].map(m => ({ kind: m[1], name: m[2] }));
  const name = filename.replace(/\.ts$/, "");
  const testFile = `${name}.test.ts`;
  const hasTest = existsSync(resolve(TEST_DIR, testFile));
  return {
    name,
    shortcode: shortcode(name),
    file: `src/engines/${filename}`,
    loc,
    export_count: exports.length,
    top_exports: exports.slice(0, 5),
    categories: categorize(name),
    test_file: hasTest ? `src/__tests__/${testFile}` : null,
    has_test: hasTest,
  };
}

function findDuplicates(engines) {
  // Group by shortcode similarity (prefix 12 chars)
  const byPrefix = new Map();
  for (const e of engines) {
    const key = e.shortcode.substring(0, 12);
    if (!byPrefix.has(key)) byPrefix.set(key, []);
    byPrefix.get(key).push(e.name);
  }
  return [...byPrefix.entries()]
    .filter(([_, names]) => names.length > 1)
    .map(([prefix, names]) => ({ prefix, candidates: names }));
}

function main() {
  const files = readdirSync(ENG_DIR).filter(f => /^Lathe.*\.ts$/.test(f) && !f.endsWith(".test.ts"));
  const engines = files.map(analyzeEngine);
  const withTests = engines.filter(e => e.has_test).length;
  const totalLoc = engines.reduce((sum, e) => sum + e.loc, 0);

  const categoriesCount = {};
  for (const e of engines) for (const c of e.categories) categoriesCount[c] = (categoriesCount[c] || 0) + 1;

  const duplicates = findDuplicates(engines);

  const registry = {
    schemaVersion: 1,
    generated_at: new Date().toISOString(),
    generated_by: "U-LTH01 (LATHE-MASTER Phase P0)",
    filesystem_count: files.length,
    registry_count: engines.length,
    count_delta: engines.length - files.length,
    test_coverage: {
      with_test: withTests,
      without_test: engines.length - withTests,
      percent: Math.round((withTests / engines.length) * 100),
    },
    total_loc: totalLoc,
    avg_loc: Math.round(totalLoc / engines.length),
    categories_count: categoriesCount,
    duplicate_candidates: duplicates,
    engines: engines.sort((a, b) => a.name.localeCompare(b.name)),
  };

  writeFileSync(OUT, JSON.stringify(registry, null, 2));
  console.log(`wrote ${OUT}`);
  console.log(`  engines: ${engines.length}`);
  console.log(`  tests: ${withTests} (${registry.test_coverage.percent}%)`);
  console.log(`  total LOC: ${totalLoc}`);
  console.log(`  categories: ${Object.keys(categoriesCount).length}`);
  console.log(`  duplicate prefix groups: ${duplicates.length}`);
}

main();
