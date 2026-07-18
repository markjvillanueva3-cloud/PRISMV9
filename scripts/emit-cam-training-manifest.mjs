#!/usr/bin/env node
/**
 * scripts/emit-cam-training-manifest.mjs — CAM-AI-TRAINING-MS0/U-CAMT-MANIFEST-EMIT
 *
 * Composes the 5 emitted corpora (templates / clickSequences-via-coverage /
 * wiki / tribal / lora / rag) into a single TrainingManifest the AI training
 * pipelines ingest with one read.
 *
 * Output: state/shared/corpus/cam-training-manifest.json
 *
 * Mirrors CAMTrainingManifestEngine.build() schema (shipped iter 28) but
 * implemented as a runner that reads the on-disk JSONL artifacts.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);
const CORPUS_ROOT = join(REPO_ROOT, "state", "shared", "corpus");
const WIKI_ROOT = join(CORPUS_ROOT, "wiki");
const TARGET_SYSTEMS = ["hypermill", "mastercam", "esprit", "fusion360", "nxcam"];

function loadJsonl(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

function hashContent(items) {
  if (!items || items.length === 0) return undefined;
  return createHash("sha256").update(JSON.stringify(items)).digest("hex").slice(0, 16);
}

function countWikiFiles() {
  if (!existsSync(WIKI_ROOT)) return { total: 0, perSystem: {} };
  const perSystem = {};
  let total = 0;
  for (const sys of TARGET_SYSTEMS) {
    const dir = join(WIKI_ROOT, sys);
    if (!existsSync(dir)) {
      perSystem[sys] = 0;
      continue;
    }
    const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
    perSystem[sys] = files.length;
    total += files.length;
  }
  return { total, perSystem };
}

function loadAllTemplates() {
  const out = [];
  for (const sys of TARGET_SYSTEMS) {
    out.push(...loadJsonl(join(CORPUS_ROOT, `cam-templates-${sys}.jsonl`)));
  }
  return out;
}

function main() {
  mkdirSync(CORPUS_ROOT, { recursive: true });

  const templates = loadAllTemplates();
  const loraTuples = loadJsonl(join(CORPUS_ROOT, "cam-lora-dataset.jsonl"));
  const ragRecords = loadJsonl(join(CORPUS_ROOT, "cam-rag-index.jsonl"));
  const tribalTips = loadJsonl(join(CORPUS_ROOT, "cam-tribal-tips.jsonl"));
  const wiki = countWikiFiles();

  // Per-system aggregation (templates + tribal + wiki — the 3 we can attribute).
  const perSystem = {};
  for (const sys of TARGET_SYSTEMS) {
    perSystem[sys] = {
      templates: templates.filter((t) => t.system === sys).length,
      clickSequences: 0, // emitted elsewhere via iter 44 coverage (mapped count)
      wikiEntries: wiki.perSystem[sys] ?? 0,
      tribalTips: tribalTips.filter((t) => t.system === sys).length,
      loraTuples: loraTuples.filter((t) => t.metadata?.system === sys).length,
      ragRecords: ragRecords.filter((r) => r.metadata?.system === sys).length,
    };
  }

  // Load the extended tracks shipped iter 71-87
  const loraV2 = loadJsonl(join(CORPUS_ROOT, "cam-lora-dataset-v2.jsonl"));
  const loraMerged = loadJsonl(join(CORPUS_ROOT, "cam-lora-dataset-merged.jsonl"));
  const physicsMerged = loadJsonl(join(CORPUS_ROOT, "cam-physics-tuples-merged.jsonl"));
  const paramReco = loadJsonl(join(CORPUS_ROOT, "cam-param-recommendation.jsonl"));
  const crossTranslation = loadJsonl(join(CORPUS_ROOT, "cam-cross-system-translation.jsonl"));
  const iso286Fit = loadJsonl(join(CORPUS_ROOT, "cam-iso286-fit-tuples.jsonl"));
  const surfaceFinish = loadJsonl(join(CORPUS_ROOT, "cam-surface-finish-tuples.jsonl"));
  const coolant = loadJsonl(join(CORPUS_ROOT, "cam-coolant-decision-tuples.jsonl"));
  const operatorGate = loadJsonl(join(CORPUS_ROOT, "cam-operator-gate-tuples.jsonl"));
  const speedsFeeds = loadJsonl(join(CORPUS_ROOT, "cam-speeds-feeds-tuples.jsonl"));
  const toolLife = loadJsonl(join(CORPUS_ROOT, "cam-tool-life-tuples.jsonl"));
  const kienzle = loadJsonl(join(CORPUS_ROOT, "cam-kienzle-force-tuples.jsonl"));
  const deflection = loadJsonl(join(CORPUS_ROOT, "cam-deflection-tuples.jsonl"));
  const masterTraining = loadJsonl(join(CORPUS_ROOT, "cam-master-training-set.jsonl"));

  const manifest = {
    schemaVersion: "2.0.0",
    generatedAt: new Date().toISOString(),
    counts: {
      templates: templates.length,
      clickSequences: 0,
      wikiEntries: wiki.total,
      tribalTips: tribalTips.length,
      loraTuples: loraTuples.length,
      ragEntries: ragRecords.length,
      // iter 71-87 extensions
      loraV2: loraV2.length,
      loraMerged: loraMerged.length,
      physicsMerged: physicsMerged.length,
      paramReco: paramReco.length,
      crossTranslation: crossTranslation.length,
      iso286Fit: iso286Fit.length,
      surfaceFinish: surfaceFinish.length,
      coolant: coolant.length,
      operatorGate: operatorGate.length,
      speedsFeeds: speedsFeeds.length,
      toolLife: toolLife.length,
      kienzle: kienzle.length,
      deflection: deflection.length,
      masterTrainingSet: masterTraining.length,
    },
    hashes: {
      templates: hashContent(templates),
      wikiEntries: wiki.total > 0 ? createHash("sha256").update(JSON.stringify(wiki.perSystem)).digest("hex").slice(0, 16) : undefined,
      tribalTips: hashContent(tribalTips),
      loraTuples: hashContent(loraTuples),
      ragEntries: hashContent(ragRecords),
    },
    provenance: {
      realDataOnly: true,
      sourceMilestone: "CAM-AI-TRAINING-MS0",
      sourceSlot: "kilo",
      operatorConstraint: "no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)",
    },
    perSystem,
    coverage: { systems: TARGET_SYSTEMS.length, systemsCovered: TARGET_SYSTEMS },
  };

  const outFile = join(CORPUS_ROOT, "cam-training-manifest.json");
  writeFileSync(outFile, JSON.stringify(manifest, null, 2));
  console.log(`Training manifest → ${outFile}`);
  console.log(`  templates: ${manifest.counts.templates}`);
  console.log(`  loraTuples: ${manifest.counts.loraTuples}`);
  console.log(`  ragEntries: ${manifest.counts.ragEntries}`);
  console.log(`  wikiEntries: ${manifest.counts.wikiEntries}`);
  console.log(`  tribalTips: ${manifest.counts.tribalTips}`);
  console.log(`  TOTAL artifacts: ${manifest.counts.templates + manifest.counts.loraTuples + manifest.counts.ragEntries + manifest.counts.wikiEntries + manifest.counts.tribalTips}`);
}

main();
