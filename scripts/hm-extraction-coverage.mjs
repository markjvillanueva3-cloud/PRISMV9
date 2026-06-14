#!/usr/bin/env node
/**
 * hm-extraction-coverage.mjs — META artifact for HM-TRAINING-EXHAUSTION-AUDIT-2026-05-20.
 *
 * Deterministic re-runnable measurement of the hyperMILL/hyperCAD-S training-corpus
 * exhaustion state. Drives Phase 6 of every subsequent /forge-audit-v2 re-run.
 *
 * Returns JSON with:
 *  - corpus_on_disk: count of HM PDFs under Resources/OPEN MIND
 *  - extracted: count of doc-*.json relating to HM
 *  - hm_tip_total: sum of .tips.length across HM-related extractions
 *  - zero_tip_files: list of extractions with 0 tips (extraction failures)
 *  - unprocessed_pdfs: PDFs on disk without a corresponding extraction-log entry
 *  - embed_index_hm_count: count of HM-source entries in tribal-embed-index
 *  - consumers: grep-confirmed consumer engines
 *  - graphsage_pool: GraphSAGE GNN ghost-pool size (data-dormancy proxy)
 *
 * Usage:
 *   node scripts/hm-extraction-coverage.mjs            # human-readable
 *   node scripts/hm-extraction-coverage.mjs --json     # JSON
 *
 * Re-runnable, advisory, never mutates state.
 */
import fs from "node:fs";
import path from "node:path";
import { streamTribalEntries } from "./lib/load-tribal-index.mjs";

const ROOT = process.env.PRISM_ROOT || "H:/prism";
const RESOURCES = path.join(ROOT, "Resources/OPEN MIND");
const STORE = path.join(ROOT, "cad-engine/knowledge_store");
const EMBED_INDEX = path.join(ROOT, "state/shared/tribal-embed-index.json");
const EXTRACTION_LOG = path.join(ROOT, "mcp-server/data/state/extraction-log.json");
const NN_EVAL = path.join(ROOT, "state/shared/nn-graph/NN-EVAL.json");
const ENGINES_DIR = path.join(ROOT, "mcp-server/src/engines");

const HM_RE = /hyper.?mill|hyper.?cad|automation.?center|virtual.?machining|virtual.?tool|tool.?builder|synchronization.?tool/i;

function walkPdfs(dir, depth = 0, maxDepth = 6, out = []) {
  if (depth > maxDepth) return out;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkPdfs(p, depth + 1, maxDepth, out);
    else if (e.isFile() && /\.pdf$/i.test(e.name)) out.push(p);
  }
  return out;
}

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function tipCount(j) {
  if (!j) return 0;
  if (Array.isArray(j.tips)) return j.tips.length;
  if (Array.isArray(j)) return j.length;
  return 0;
}

function isHmExtraction(filename) {
  return /^doc-(hypermill|hmautocolor|cad-manual|fusion-cad|automation-center|virtual-tool|virtual-machining|virtual-mc|tool-builder|synchronization-tool|sql-tool-db|sql-macro|hypermill-sql)/i.test(filename);
}

const pdfs = walkPdfs(RESOURCES);
const hmPdfs = pdfs.filter(p => HM_RE.test(p));

const storeFiles = fs.existsSync(STORE)
  ? fs.readdirSync(STORE).filter(f => f.startsWith("doc-") && f.endsWith(".json"))
  : [];
const hmExtractions = storeFiles.filter(isHmExtraction);

let hmTipTotal = 0;
const zeroTipFiles = [];
const perFile = {};
for (const f of hmExtractions) {
  const j = readJsonSafe(path.join(STORE, f));
  const t = tipCount(j);
  hmTipTotal += t;
  perFile[f] = t;
  if (t === 0) zeroTipFiles.push(f);
}

const extractionLog = readJsonSafe(EXTRACTION_LOG);
const loggedIds = new Set();
if (extractionLog && Array.isArray(extractionLog.entries)) {
  for (const e of extractionLog.entries) loggedIds.add((e.id || "").toLowerCase());
} else if (extractionLog && extractionLog.extractions) {
  for (const e of extractionLog.extractions) loggedIds.add((e.id || "").toLowerCase());
}

const unprocessedPdfs = [];
for (const p of hmPdfs) {
  const base = path.basename(p, ".pdf").toLowerCase();
  const slug = base.replace(/[^a-z0-9]+/g, "-");
  let found = false;
  for (const id of loggedIds) {
    if (id.includes(slug.slice(0, 12)) || slug.includes(id.slice(0, 12))) { found = true; break; }
  }
  if (!found) unprocessedPdfs.push(path.relative(ROOT, p));
}

let embedIndexHmCount = 0;
try {
  // Two recall surfaces for HM:
  //  (a) entries whose source string itself names hyperMILL/hyperCAD/HM-doc (legacy/wiki bucket)
  //  (b) entries in the tribal-knowledge-store source bucket (U-HMT-EMBED-INDEX-WIRE shipped 2026-05-20)
  //      with a meta.source_file naming an HM extraction.
  // Shard-aware + O(1)-heap: the index sharded 2026-06-08 and the monolith EMBED_INDEX
  // is now an absent orphan (a whole-file readFileSync would ENOENT AND, on the 503MB
  // shards, exceed V8's 512MiB string cap). streamTribalEntries walks entries one at a
  // time; the SAME two regexes run on each entry's compact JSON and per-entry counts SUM
  // to the identical total the whole-blob match produced (each entry carries its own
  // source / source_file). String.match with a /g regex ignores lastIndex, so reusing
  // the regex objects across entries is safe.
  const RX_DIRECT = /"source"\s*:\s*"(doc-hypermill|hypermill|hyperCAD|doc-cad-manual|doc-automation-center|doc-virtual-tool|doc-tool-builder|doc-synchronization-tool)/gi;
  const RX_STORE = /"source_file"\s*:\s*"doc-(hypermill|hmautocolor|cad-manual|fusion-cad|automation-center|virtual-tool|virtual-mc|virtual-machining|tool-builder|synchronization-tool|sql-tool-db|sql-macro|hypermill-sql)/gi;
  const manifestPath = EMBED_INDEX.replace(/\.json$/i, "") + ".manifest.json";
  if (fs.existsSync(EMBED_INDEX) || fs.existsSync(manifestPath)) {
    streamTribalEntries(EMBED_INDEX, (e) => {
      const s = JSON.stringify(e);
      embedIndexHmCount += (s.match(RX_DIRECT) || []).length + (s.match(RX_STORE) || []).length;
    });
  }
} catch { /* embed index missing or unreadable */ }

const consumerCandidates = [
  "HyperMillDeepLearningEngine.ts",
  "HyperMillStrategyKnowledgeEngine.ts",
  "HyperMillAIOrchestrationEngine.ts",
  "HyperMillFunctionIndexEngine.ts",
  "MillingAIUnificationEngine.ts",
  "CAMTrainingExtractionAggregatorEngine.ts",
  "CAMPluginSDKEngine.ts",
  "PostProcessorAGIMasterRegistryEngine.ts",
];
const consumers = consumerCandidates.filter(f => fs.existsSync(path.join(ENGINES_DIR, f)));

let graphsagePool = 0;
let graphsageDeferred = null;
const nnEval = readJsonSafe(NN_EVAL);
if (nnEval) {
  graphsagePool = nnEval.poolSize ?? nnEval.referencePoolSize ?? 0;
  graphsageDeferred = nnEval.deferred ?? null;
}

const summary = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  corpus_on_disk: hmPdfs.length,
  extracted: hmExtractions.length,
  hm_tip_total: hmTipTotal,
  zero_tip_files: zeroTipFiles,
  zero_tip_count: zeroTipFiles.length,
  unprocessed_pdfs: unprocessedPdfs,
  unprocessed_count: unprocessedPdfs.length,
  embed_index_hm_count: embedIndexHmCount,
  consumers,
  consumer_count: consumers.length,
  graphsage_pool: graphsagePool,
  graphsage_deferred: graphsageDeferred,
  per_file_tips: perFile,
  baselines_for_audit: {
    F1_hypercad_zero_tip: perFile["doc-cad-manual-en-us.json"] ?? null,
    F4_embed_index_blind: embedIndexHmCount === 0,
    F7_graphsage_dormant: graphsagePool === 0,
  },
};

if (process.argv.includes("--json")) {
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
} else {
  console.log("HM Training Exhaustion — Coverage Snapshot");
  console.log("===========================================");
  console.log(`Generated:        ${summary.generatedAt}`);
  console.log(`Corpus on disk:   ${summary.corpus_on_disk} PDFs`);
  console.log(`Extracted files:  ${summary.extracted}`);
  console.log(`HM tips total:    ${summary.hm_tip_total}`);
  console.log(`Zero-tip files:   ${summary.zero_tip_count}${summary.zero_tip_count ? " — " + summary.zero_tip_files.join(", ") : ""}`);
  console.log(`Unprocessed PDFs: ${summary.unprocessed_count}`);
  if (summary.unprocessed_count) for (const u of summary.unprocessed_pdfs) console.log(`  - ${u}`);
  console.log(`Embed-index HM:   ${summary.embed_index_hm_count} entries  ${summary.embed_index_hm_count === 0 ? "(CRITICAL — vector recall blind)" : ""}`);
  console.log(`Consumers wired:  ${summary.consumer_count}/8`);
  console.log(`GraphSAGE pool:   ${summary.graphsage_pool}  deferred=${summary.graphsage_deferred}`);
  console.log("");
  console.log("Audit baselines:");
  for (const [k, v] of Object.entries(summary.baselines_for_audit)) console.log(`  ${k}: ${JSON.stringify(v)}`);
}
