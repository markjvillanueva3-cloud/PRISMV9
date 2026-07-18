#!/usr/bin/env node
/**
 * scripts/verify-cam-training-corpus.mjs — CAM-AI-TRAINING-MS0/U-CAMT-CORPUS-VERIFY
 *
 * Verifies the 7 corpora emitted in iter 44-54 are healthy: file exists,
 * line counts match the manifest, JSONL records parse, provenance carries
 * realDataOnly:true + verbatim operator constraint string.
 *
 * Pivot for iter 57: the named PrintToProgramPipelineEngine surface
 * already exists in this worktree as a prior-milestone engine (108KB)
 * — duplication guard would block. This corpus health-check is the
 * higher-leverage unit (validates the YOLO sleep run's outputs).
 *
 * Exit 0 = healthy; exit 1 = any check failed.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);
const CORPUS = join(REPO_ROOT, "state", "shared", "corpus");

const OPERATOR_CONSTRAINT = "no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)";
let failures = 0;

function check(name, cond, detail) {
  const mark = cond ? "✓" : "✗";
  console.log(`  ${mark} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
}

function loadJsonl(file) {
  if (!existsSync(file)) return null;
  return readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

function loadJson(file) {
  if (!existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; }
}

console.log("== iter 44+74: per-system function coverage ==");
for (const sys of ["hypermill", "mastercam", "esprit", "fusion360"]) {
  const r = loadJson(join(CORPUS, `cam-coverage-${sys}.json`));
  check(`coverage-${sys} exists`, r !== null);
  if (r) {
    check(`coverage-${sys} 100%`, r.coveragePct === 100, `pct=${r.coveragePct}`);
    check(`coverage-${sys} totalFunctions>0`, r.totalFunctions > 0, `n=${r.totalFunctions}`);
  }
}
const nxcov = loadJson(join(CORPUS, "cam-coverage-nxcam.json"));
check("coverage-nxcam exists", nxcov !== null);
if (nxcov) check("coverage-nxcam >=95%", nxcov.coveragePct >= 95, `pct=${nxcov.coveragePct}`);

console.log("\n== iter 47+74: per-system CamTemplate JSONL ==");
const expectedTemplateCounts = { hypermill: 23, mastercam: 17, esprit: 18, fusion360: 48, nxcam: 35 };
for (const [sys, expected] of Object.entries(expectedTemplateCounts)) {
  const records = loadJsonl(join(CORPUS, `cam-templates-${sys}.jsonl`));
  check(`templates-${sys} count=${expected}`, records?.length === expected, `got ${records?.length}`);
  if (records && records.length > 0) {
    const first = records[0];
    check(`templates-${sys}[0] has provenance.realDataOnly`, first.provenance?.realDataOnly === true);
    check(`templates-${sys}[0] has operator constraint`, first.provenance?.operatorConstraint === OPERATOR_CONSTRAINT);
  }
}

console.log("\n== iter 50: LoRA dataset ==");
const lora = loadJsonl(join(CORPUS, "cam-lora-dataset.jsonl"));
check("lora dataset count=424", lora?.length === 424, `got ${lora?.length}`);
if (lora && lora.length > 0) {
  check("lora[0] has messages array", Array.isArray(lora[0].messages));
  check("lora[0] has user + assistant roles", lora[0].messages?.[0]?.role === "user" && lora[0].messages?.[1]?.role === "assistant");
  check("lora[0] metadata.provenance present", lora[0].metadata?.provenance?.realDataOnly === true);
}

console.log("\n== iter 51+75: RAG index (5 systems) ==");
const rag = loadJsonl(join(CORPUS, "cam-rag-index.jsonl"));
check("rag records count=141", rag?.length === 141, `got ${rag?.length}`);
if (rag && rag.length > 0) {
  check("rag[0] has text field", typeof rag[0].text === "string");
  check("rag[0] text non-empty", rag[0].text?.length > 50);
  check("rag[0] metadata.provenance present", rag[0].metadata?.provenance?.realDataOnly === true);
}

console.log("\n== iter 52+75: wiki entries (5 systems) ==");
const wikiRoot = join(CORPUS, "wiki");
if (existsSync(wikiRoot)) {
  let total = 0;
  for (const sys of Object.keys(expectedTemplateCounts)) {
    const dir = join(wikiRoot, sys);
    if (existsSync(dir)) {
      const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
      check(`wiki/${sys} count=${expectedTemplateCounts[sys]}`, files.length === expectedTemplateCounts[sys], `got ${files.length}`);
      total += files.length;
    }
  }
  check("wiki total=141", total === 141, `got ${total}`);
} else {
  check("wiki dir exists", false);
}

console.log("\n== iter 53+75: tribal tips (5 systems) ==");
const tribal = loadJsonl(join(CORPUS, "cam-tribal-tips.jsonl"));
check("tribal tips count=928", tribal?.length === 928, `got ${tribal?.length}`);
if (tribal && tribal.length > 0) {
  check("tribal[0] tip non-empty", tribal[0].tip?.length > 20);
  check("tribal[0] has domain", typeof tribal[0].domain === "string");
}

console.log("\n== iter 88: unified training manifest v2 ==");
const manifest = loadJson(join(CORPUS, "cam-training-manifest.json"));
check("manifest exists", manifest !== null);
if (manifest) {
  check("manifest schemaVersion=2.0.0", manifest.schemaVersion === "2.0.0");
  check("manifest counts.templates=141", manifest.counts?.templates === 141);
  check("manifest counts.loraTuples=424", manifest.counts?.loraTuples === 424);
  check("manifest counts.ragEntries=141", manifest.counts?.ragEntries === 141);
  check("manifest counts.wikiEntries=141", manifest.counts?.wikiEntries === 141);
  check("manifest counts.tribalTips=928", manifest.counts?.tribalTips === 928);
  check("manifest counts.masterTrainingSet=3766", manifest.counts?.masterTrainingSet === 3766);
  check("manifest counts.physicsMerged=1520", manifest.counts?.physicsMerged === 1520);
  check("manifest provenance.realDataOnly", manifest.provenance?.realDataOnly === true);
  check("manifest provenance.operatorConstraint", manifest.provenance?.operatorConstraint === OPERATOR_CONSTRAINT);
}

console.log("\n== iter 82+87: MASTER training set ==");
const master = loadJsonl(join(CORPUS, "cam-master-training-set.jsonl"));
check("master count=3766", master?.length === 3766, `got ${master?.length}`);
if (master && master.length > 0) {
  const tracks = new Set(master.map((r) => r.metadata?.track).filter(Boolean));
  check("master has >=8 tracks", tracks.size >= 8, `tracks=${tracks.size}`);
}

console.log("\n== iter 90: master holdout split ==");
const mTrain = loadJsonl(join(CORPUS, "cam-master-train.jsonl"));
const mHoldout = loadJsonl(join(CORPUS, "cam-master-holdout.jsonl"));
check("master train+holdout = master", (mTrain?.length ?? 0) + (mHoldout?.length ?? 0) === 3766);

console.log("\n== iter 91: corpus validation report ==");
const validation = loadJson(join(CORPUS, "cam-master-corpus-validation.json"));
check("validation report exists", validation !== null);
if (validation) check("validation 100% pass", validation.failing === 0, `${validation.passing}/${validation.totalTuples}`);

console.log(`\n${failures === 0 ? "✓ ALL CHECKS PASS" : `✗ ${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
