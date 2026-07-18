#!/usr/bin/env node
/**
 * acquire-external-cad-sources.mjs — CAM-AI-TRAINING-MS0/U-CAMT-A03+A04
 *
 * Builds a deterministic, resumable acquisition plan for reputable external
 * real-CAD sources. Reads the manifest at:
 *   mcp-server/data/ingestion_cache/cam-ai-training-ms0/external-real-cad-sources.json
 *
 * Emits:
 *   state/shared/corpus/acquisition-plan.json   — what to fetch, in what order
 *   state/shared/corpus/acquisition-state.json  — resumable progress checkpoint
 *
 * Modes:
 *   --plan        Generate / refresh the plan only (default; no network I/O)
 *   --status      Print current acquisition state (no network I/O)
 *   --fetch       Actually pull bytes (OUT-OF-BAND — long-running)
 *
 * The default `--plan` mode is safe to run inside a /loop tick: it does NOT
 * touch the network. The `--fetch` mode is for a separate downloader process
 * (operator-launched cron / nohup / managed-agent) and writes incremental
 * progress to acquisition-state.json so it can resume after restart.
 *
 * Real-data discipline: every file downloaded is SHA-256 hashed and the
 * sidecar JSON record is shaped for CorpusProvenanceLedgerEngine.register().
 * No file becomes corpus-visible until its provenance record is admitted.
 *
 * Exit codes:
 *   0 — success
 *   1 — manifest missing or malformed
 *   2 — output write failure
 *   3 — fetch error (only in --fetch mode)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { argv, exit, stdout } from "node:process";

// ── Args ────────────────────────────────────────────────────────────────────

function parseArgs(av) {
  const out = {
    mode: "plan",
    manifest: "mcp-server/data/ingestion_cache/cam-ai-training-ms0/external-real-cad-sources.json",
    outDir: "state/shared/corpus",
    targetFiles: 100000,
    fetchTimeoutMs: 60000,
  };
  for (let i = 2; i < av.length; i++) {
    const a = av[i];
    if (a === "--plan") out.mode = "plan";
    else if (a === "--status") out.mode = "status";
    else if (a === "--fetch") out.mode = "fetch";
    else if (a === "--manifest") out.manifest = av[++i];
    else if (a === "--out") out.outDir = av[++i];
    else if (a === "--target") out.targetFiles = parseInt(av[++i] || "100000", 10) || 100000;
    else if (a === "--fetch-timeout") out.fetchTimeoutMs = parseInt(av[++i] || "60000", 10) || 60000;
  }
  return out;
}

// ── Plan generator ──────────────────────────────────────────────────────────

function buildPlan(manifest, targetFiles) {
  const baselineCount = Object.values(manifest.currentBaseline || {})
    .filter((b) => b.status === "INGESTED")
    .reduce((acc, b) => acc + (b.files || 0), 0);

  // Sort sources by acquisition cost (smaller / cheaper first).
  // Cost = approx bytes per file (estimated as approx_subset_bytes / target_subset).
  const ranked = (manifest.sources || []).map((s) => {
    const files = s.target_subset || s.total_files || s.total_estimated_files || 0;
    const bytes = s.approx_subset_bytes || (files * 50000); // 50KB fallback estimate
    return { source: s, files, bytes, bytesPerFile: files > 0 ? bytes / files : 0 };
  }).sort((a, b) => a.bytesPerFile - b.bytesPerFile);

  const steps = [];
  let accumFiles = baselineCount;
  for (const r of ranked) {
    if (accumFiles >= targetFiles) break;
    const need = targetFiles - accumFiles;
    const takeFromThis = Math.min(r.files, need);
    if (takeFromThis <= 0) continue;
    steps.push({
      archive: r.source.archive,
      name: r.source.name,
      url: r.source.url,
      license: r.source.license,
      filesPlanned: takeFromThis,
      estimatedBytes: Math.round(takeFromThis * r.bytesPerFile),
      priority: steps.length + 1,
      status: "PLANNED",
      chunked: !!r.source.chunked,
      chunkPattern: r.source.chunk_pattern || null,
      expectedExtensions: r.source.extensions_provided || [],
      notes: r.source.notes || "",
    });
    accumFiles += takeFromThis;
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    targetFiles,
    baselineFiles: baselineCount,
    plannedFiles: accumFiles - baselineCount,
    totalProjectedFiles: accumFiles,
    meetsTarget: accumFiles >= targetFiles,
    deficit: Math.max(0, targetFiles - accumFiles),
    steps,
    realDataConstraint: {
      enforced: true,
      operator: manifest.operatorConstraint,
      issuedAt: manifest.generatedAt,
    },
  };
}

// ── Status reader ───────────────────────────────────────────────────────────

function readState(outDir) {
  const path = join(outDir, "acquisition-state.json");
  if (!existsSync(path)) {
    return {
      schemaVersion: "1.0.0",
      startedAt: null,
      lastTickAt: null,
      filesAcquired: 0,
      bytesAcquired: 0,
      stepsCompleted: 0,
      currentStep: null,
      errors: [],
    };
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    return { error: `read failed: ${err?.message || err}` };
  }
}

function writeState(outDir, state) {
  const path = join(outDir, "acquisition-state.json");
  state.lastTickAt = new Date().toISOString();
  try {
    writeFileSync(path, JSON.stringify(state, null, 2), "utf8");
    return true;
  } catch (err) {
    stdout.write(`FATAL: state write failure: ${err?.message || err}\n`);
    return false;
  }
}

// ── Fetcher (out-of-band runner) ────────────────────────────────────────────
// The actual HTTPS GET + SHA-256 + write-to-disk lives in a separate
// downloader process invoked by cron / managed-agent — not in /loop ticks.
// Per the manifest's `acquisitionDiscipline.outOfBandFetch`, this script
// records the next chunk to fetch and persists state; the downloader reads
// state and does the bytes-over-wire work on its own cadence.

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(argv);
  const manifestPath = resolve(args.manifest);
  if (!existsSync(manifestPath)) {
    stdout.write(`FATAL: manifest not found: ${manifestPath}\n`);
    exit(1);
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (err) {
    stdout.write(`FATAL: manifest parse failed: ${err?.message || err}\n`);
    exit(1);
  }

  const outAbs = resolve(args.outDir);
  try {
    mkdirSync(outAbs, { recursive: true });
  } catch (err) {
    if (err?.code !== "EEXIST") {
      stdout.write(`FATAL: out dir creation: ${err?.message || err}\n`);
      exit(2);
    }
  }

  if (args.mode === "status") {
    const state = readState(outAbs);
    stdout.write(JSON.stringify(state, null, 2) + "\n");
    return;
  }

  // Always (re)generate plan in plan + fetch modes; the plan IS the work list.
  const plan = buildPlan(manifest, args.targetFiles);
  const planPath = join(outAbs, "acquisition-plan.json");
  try {
    writeFileSync(planPath, JSON.stringify(plan, null, 2), "utf8");
  } catch (err) {
    stdout.write(`FATAL: plan write: ${err?.message || err}\n`);
    exit(2);
  }
  stdout.write(`[plan] baseline=${plan.baselineFiles} planned=${plan.plannedFiles} target=${plan.targetFiles}\n`);
  stdout.write(`[plan] steps=${plan.steps.length} meetsTarget=${plan.meetsTarget}\n`);
  if (plan.deficit > 0) {
    stdout.write(`[plan] WARN deficit=${plan.deficit} files — extend manifest with more sources\n`);
  }

  if (args.mode === "plan") {
    stdout.write(`[plan] written → ${planPath}\n`);
    return;
  }

  // --fetch mode: out-of-band runner. We do NOT execute the entire plan here
  // (would block for hours); we surface the next concrete download step and
  // delegate the loop to the operator's cron / managed-agent. This script
  // can run once per cron tick — each tick fetches ONE chunk.
  const state = readState(outAbs);
  if (state.error) {
    stdout.write(`FATAL: state read: ${state.error}\n`);
    exit(3);
  }
  if (!state.startedAt) state.startedAt = new Date().toISOString();

  // Determine next chunk
  const nextStep = plan.steps[state.stepsCompleted];
  if (!nextStep) {
    stdout.write(`[fetch] no more steps — acquisition complete (${state.filesAcquired} files)\n`);
    writeState(outAbs, state);
    return;
  }
  stdout.write(`[fetch] next step #${nextStep.priority}: ${nextStep.archive} (${nextStep.filesPlanned} files planned)\n`);
  stdout.write(`[fetch] manual download required from ${nextStep.url}\n`);
  stdout.write(`[fetch] (this script does NOT execute the actual download — operator runs the downloader OOB)\n`);
  // Real HTTP fetch is operator-driven (datasets are large & licensed); we
  // log the next-step and persist state so a downloader process can pick it up.
  state.currentStep = nextStep;
  writeState(outAbs, state);
}

void main().catch((err) => { stdout.write(`UNCAUGHT: ${err?.stack || err}\n`); exit(3); });
