#!/usr/bin/env node
// scripts/xray-trainset-to-lora.mjs
//
// U-XRAY-BLUEPRINT-LORA-STAGE — the xray→india LoRA seam (staging runner).
//
// Reads the closed-loop OCR trainset, maps it to the BlueprintLoRABridgeEngine's LoRATrainingPair[]
// contract (via the pure adapter), then routes through the REAL bridge (prepareTrainingSet →
// exportBundle) to drop a provider-formatted bundle under the staging dir for india to pick up.
// ZERO new engines: the bridge owns anonymize/serialize/staging-gate/manifest; this script only
// adapts the shape, invokes the real engine, and writes a staging summary.
//
// Routes through the COMPILED engine (mcp-server/dist/...) directly — no MCP daemon needed (the
// dispatcher does the identical import internally). Fail-soft: if the dist engine can't load, it
// still emits the precomputedPairs[] artifact + the exact dispatcher call so india/MCP can finish.
//
// HONEST (R12): the staged bundle is a TEXT/PATH bundle (pdfPath is an image path string, NOT pixels).
// A real vision LoRA needs india to load the image → a VLM. This proves the wiring + carries the
// labels/provenance; it is NOT a runnable fine-tune (see INDIA-HANDOFF-blueprint-lora.md for the
// 3 blockers: Blackwell-compatible torch, peft/datasets/trl, a real VL trainer + operator-verified
// eval split).
//
// USAGE: node scripts/xray-trainset-to-lora.mjs [--trainset <path>] [--json]
// EXIT: 0 = staged (or fail-soft artifact written) · 2 = no trainable pairs · 3 = setup error.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { argv, exit } from "node:process";

import { trainsetToLoRAPairs } from "./lib/trainset-to-lora-pairs.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STAGING_DIR = "mcp-server/data/training/lora/staging"; // bridge DEFAULT_STAGING_DIR (no marker needed)
const OUT_DIR = join(REPO_ROOT, "state", "shared", "ocr-training-loop");

function parseArgs(args) {
  const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  return {
    trainset: get("--trainset", join(REPO_ROOT, "state", "shared", "ocr-training-loop", "trainset.jsonl")),
    json: args.includes("--json"),
  };
}

/**
 * Last-wins dedup identity for a trainset row. The resumable runner appends per-page rows BEFORE the
 * per-print cursor, so a reaper kill mid-print leaves duplicate rows on resume (same page re-emitted).
 * The runner promises these are deduped here last-wins by key+page (runner report note). Falls back to
 * image, then part. Two genuinely-different pages of one print carry distinct page/image → never
 * collapsed; a legacy row without key/page dedups by its image path.
 */
export function trainsetRowDedupKey(row) {
  if (!row || typeof row !== "object") return null;
  if (row.key != null && row.page != null) return `${row.key}#p${row.page}`;
  if (row.image != null) return String(row.image);
  if (row.part != null) return String(row.part);
  return null;
}

function readTrainset(path) {
  if (!existsSync(path)) return { rows: [], error: `trainset not found: ${path}` };
  let raw;
  try { raw = readFileSync(path, "utf8"); } catch (e) { return { rows: [], error: `read failed: ${e instanceof Error ? e.message : String(e)}` }; }
  // Last-wins dedup: a later row for the same key+page supersedes an earlier (resume-duplicate) one.
  // A row with no usable identity is kept (can't be a resume duplicate). Survivor order preserved.
  const byKey = new Map();
  const keyless = [];
  let deduped = 0;
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    let row;
    try { row = JSON.parse(t); } catch { continue; } // skip malformed line; fail-loud below if zero rows
    const k = trainsetRowDedupKey(row);
    if (k === null) { keyless.push(row); continue; }
    if (byKey.has(k)) deduped++;
    byKey.set(k, row); // last-wins
  }
  const rows = [...byKey.values(), ...keyless];
  return { rows, deduped, error: rows.length ? null : "trainset has no parseable rows" };
}

async function main() {
  const opts = parseArgs(argv.slice(2));
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  // 1. Read + map.
  const { rows, error, deduped } = readTrainset(opts.trainset);
  if (error && !rows.length) { console.error(`ERROR: ${error}`); return 3; }
  const pairs = trainsetToLoRAPairs(rows);
  console.log(`\n🔗 xray→india LoRA stage · trainset=${opts.trainset}`);
  console.log(`   rows=${rows.length}${deduped ? ` (deduped ${deduped} resume-duplicate row(s))` : ""} · trainable pairs=${pairs.length}`);
  if (!pairs.length) {
    console.error(`NO TRAINABLE PAIRS — every label was gated out (single-model run / below trust floor). Nothing to stage. (R12: refusing to emit an empty/garbage bundle.)`);
    return 2;
  }

  // 2. Route through the REAL bridge (compiled engine — no MCP needed).
  const distPath = join(REPO_ROOT, "mcp-server", "dist", "engines", "BlueprintLoRABridgeEngine.js");
  let engine = null, loadErr = null;
  try {
    const mod = await import(pathToFileURL(distPath).href);
    engine = mod.blueprintLoRABridgeEngine;
    if (!engine || typeof engine.prepareTrainingSet !== "function") { loadErr = "dist engine missing prepareTrainingSet"; engine = null; }
  } catch (e) { loadErr = e instanceof Error ? e.message : String(e); }

  const caveats = [
    "TEXT/PATH bundle — pdfPath is an image PATH string, NOT pixels. A real vision LoRA needs india to load the image into a VLM.",
    `corpus is ${pairs.length} pair(s) from ${rows.length} print(s) — proves the wiring, NOT a trainable corpus (<<50-sample floor).`,
    "labels are ensemble-distilled pseudo-labels (synthetic→real OOD); the eval gate MUST score against operator_verified data, which xray does NOT yet have.",
    "NO fine-tune can run until india lands a Blackwell(sm_120)-compatible torch + peft/datasets/trl + a real VL trainer. See INDIA-HANDOFF-blueprint-lora.md.",
  ];

  mkdirSync(OUT_DIR, { recursive: true });
  const summaryPath = join(OUT_DIR, "lora-staging-summary.json");
  const pairsArtifact = join(OUT_DIR, "lora-precomputed-pairs.json");

  if (!engine) {
    // Fail-soft: emit the pairs artifact + the exact dispatcher call india/MCP must run.
    writeFileSync(pairsArtifact, JSON.stringify({ confidenceTier: "ensemble_consensus", precomputedPairs: pairs }, null, 2));
    const summary = {
      schemaVersion: "1.0.0", staged: false, reason: `dist engine unavailable: ${loadErr}`,
      precomputedPairs: pairsArtifact, pairCount: pairs.length, confidenceTier: "ensemble_consensus",
      dispatcherCall: {
        prepare: `prism_cad blueprint_lora_prepare_set { confidenceTier:"ensemble_consensus", precomputedPairs: <${pairsArtifact}> }`,
        export: `prism_cad blueprint_lora_export { setId:<from prepare>, provider:"local-lora", outputPath:"${STAGING_DIR}/blueprint-ocr-${stamp}.jsonl" }`,
      },
      caveats, mustHumanVerify: true,
    };
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`\n  ⚠ dist engine unavailable (${loadErr}) — wrote fail-soft artifact + dispatcher call.`);
    console.log(`    pairs → ${pairsArtifact}`);
    console.log(`    summary → ${summaryPath}`);
    if (opts.json) console.log(JSON.stringify(summary));
    return 0;
  }

  // 3. prepareTrainingSet → exportBundle (to staging — no operator marker needed under staging dir).
  const set = await engine.prepareTrainingSet({ confidenceTier: "ensemble_consensus", io: { loadTrainingPairs: async () => pairs } });
  const outputPath = `${STAGING_DIR}/blueprint-ocr-${stamp}.jsonl`;
  const manifest = await engine.exportBundle({ setId: set.setId, provider: "local-lora", outputPath });

  const summary = {
    schemaVersion: "1.0.0", staged: true,
    setId: set.setId, bundleId: manifest.bundleId, provider: manifest.provider,
    pairCount: manifest.pairCount, confidenceTier: manifest.confidenceTier,
    anonymizationApplied: manifest.anonymizationApplied, outputPath: manifest.outputPath,
    sourceTrainset: opts.trainset, stagedAt: stamp,
    handoff: "state/shared/ocr-training-loop/INDIA-HANDOFF-blueprint-lora.md",
    caveats, mustHumanVerify: true,
  };
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`\n  ✓ staged via BlueprintLoRABridgeEngine (real, no MCP)`);
  console.log(`    setId=${set.setId} bundle=${manifest.bundleId}`);
  console.log(`    ${manifest.pairCount} pairs · tier=${manifest.confidenceTier} · anonymized=${manifest.anonymizationApplied}`);
  console.log(`    bundle → ${manifest.outputPath}`);
  console.log(`    summary → ${summaryPath}`);
  console.log(`  ⚠ ${caveats.length} caveats recorded (text/path not pixels; ${pairs.length}-pair proof; pseudo-labels; no Blackwell trainer). india owns the fine-tune — see handoff.`);
  if (opts.json) console.log(JSON.stringify(summary));
  return 0;
}

// Run-as-main guard — importing this module (e.g. for trainsetRowDedupKey in the test) must NOT run
// the staging pipeline / process.exit (the same import-side-effect P1 fixed in the manifest builder).
if (argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((c) => exit(c)).catch((e) => { console.error("FATAL:", e instanceof Error ? e.stack : String(e)); exit(3); });
}
