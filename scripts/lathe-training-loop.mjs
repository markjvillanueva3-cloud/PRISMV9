#!/usr/bin/env node
/**
 * lathe-training-loop.mjs — PSN-integrated self-improving training loop driver.
 *
 * Implements the 11-stage loop specified in
 *   state/shared/specs/SPEC-LATHE-PSN-FULL-LOOP-TRAINING-2026-05-26.md
 *
 * This is the BOOTSTRAP driver. Stages 1-3 are functional (parse + quality
 * pipeline). Stages 4-11 are SKELETONS that emit structured stage records
 * to a JSONL ledger for the operator to drive via review UI. Operator
 * implements full stage bodies per U-LATHE-LOOP-STAGE-IMPL-1-TO-5 /
 * U-LATHE-LOOP-STAGE-IMPL-6-TO-11.
 *
 * USAGE:
 *   node scripts/lathe-training-loop.mjs --part path/to/program.MIN --iso M --iter 1
 *   node scripts/lathe-training-loop.mjs --batch H:/PRISM/JM\ DIE/CNC\ LATHE/<customer>  --iso P --iter 1 --max 10
 *
 * Output:
 *   state/shared/lathe-training-loop/iter-<N>-<timestamp>.jsonl  (one row per part processed)
 *
 * @milestone WHISKEY-ACADEMY-LATHE-BRIDGE-MS0/U-LATHE-TRAINING-LOOP
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseProgram,
  validateTools,
  validateConsistency,
  validatePhysics,
  scoreOperationSequence,
  aggregateQualityScore,
  extractProgramParameters,
  scorePhysicsIssues,
} from "./lathe-quality-pipeline.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const MASTER_INDEX_PATH = path.resolve(repoRoot, "mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json");
const ACADEMY_PRIORS_PATH = path.resolve(repoRoot, "mcp-server/data/lathe-academy-priors.json");

function loadJson(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }

/** Single-part loop iteration — emits 11 stage records into the JSONL ledger. */
export function runLoopForPart(filePath, isoGroup, iterNum, masterIndex, academyPriors, opts = {}) {
  const startedAt = new Date().toISOString();
  const text = fs.readFileSync(filePath, "utf8");

  // STAGE 1 — GATHER (the file was passed in, but record the source)
  const stage1 = { stage: 1, name: "GATHER", file: filePath, char_count: text.length };

  // STAGE 2 — PARSE
  const parsed = parseProgram(text);
  const stage2 = { stage: 2, name: "PARSE", ok: parsed.ok,
                   tool_count: parsed.ok ? parsed.tool_blocks.length : 0,
                   ops: parsed.ok ? parsed.operation_sequence : [],
                   g_codes: parsed.ok ? parsed.g_codes : [] };

  // STAGE 3 — VALIDATE (run the quality pipeline)
  const programParams = extractProgramParameters(text);
  const tools = validateTools(text, masterIndex);
  const consistency = validateConsistency(parsed, isoGroup, masterIndex);
  const physics = validatePhysics(parsed, isoGroup, academyPriors, programParams);
  const seq = scoreOperationSequence(parsed);
  const physicsScore = scorePhysicsIssues(physics.issues);
  const aggregate = aggregateQualityScore({
    tool_validation: tools.insertsFound.length > 0 ? 80 : 50,
    consistency: consistency.issues.length > 0 ? 75 : 50,
    physics: physicsScore,
    sequence: seq.score,
  });
  const physicsSeverity = {
    critical: physics.issues.filter(i => i.severity === "critical").length,
    warning: physics.issues.filter(i => i.severity === "warning").length,
    suggestion: physics.issues.filter(i => i.severity === "suggestion").length,
  };
  const stage3 = {
    stage: 3, name: "VALIDATE",
    inserts: tools.insertsFound,
    program_params: programParams,
    consistency_count: consistency.issues.length,
    physics_count: physics.issues.length,
    physics_severity: physicsSeverity,
    physics_score: physicsScore,
    sequence_score: seq.score,
    quality_score: aggregate.score,
    quality_breakdown: aggregate.breakdown,
  };

  // STAGES 4-11 — SKELETON RECORDS (operator implements full bodies)
  const stage4 = { stage: 4, name: "REASON", status: "skeleton",
                   note: "TODO: invoke PRISMCreativeReasoningEngine.explore('optimal') with master_index + course-5 priors + 186 page records" };
  const stage5 = { stage: 5, name: "GENERATE", status: "skeleton",
                   note: "TODO: invoke LathePrintProgramEmitterEngine to emit corrected .MIN" };
  const stage6 = { stage: 6, name: "DIFF", status: "skeleton",
                   note: "TODO: line + semantic diff vs original; emit A-to-C and B-to-C deltas" };
  const stage7 = { stage: 7, name: "OPERATOR_REVIEW", status: "pending_operator",
                   ui_target: "mcp-server/web/lathe-loop-review (TODO)" };
  const stage8 = { stage: 8, name: "LEARN", status: "skeleton", sinks: ["memory", "rag_cag", "lora"] };
  const stage9 = { stage: 9, name: "EMBED", status: "skeleton",
                   gnn_target: "scripts/lib/graph-node-embedding-bridge.mjs (U-NN-PREDICTOR-EMBED-WIRE follow-up)" };
  const stage10 = { stage: 10, name: "WIKI_PROMOTE", status: "skeleton",
                    threshold: "≥3 similar corrections across different parts" };
  const stage11 = { stage: 11, name: "SYSTEM_VIZ_TICK", status: "skeleton",
                    roost: "ghost.lathe_training_loop (TODO scripts/generate-lathe-loop-features.mjs)" };

  return {
    schemaVersion: "1.0.0",
    iter: iterNum,
    part: filePath.replace(/\\/g, "/"),
    iso_group: isoGroup,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    stages: [stage1, stage2, stage3, stage4, stage5, stage6, stage7, stage8, stage9, stage10, stage11],
    summary: {
      quality_score: aggregate.score,
      operations_observed: parsed.ok ? parsed.operation_sequence : [],
      inserts_observed: tools.insertsFound,
      ready_for_operator_review: aggregate.score !== null,
    },
  };
}

function parseArgs(argv) {
  const args = { part: null, batch: null, iso: null, iter: 1, max: 50, out: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--part") args.part = argv[++i];
    else if (a === "--batch") args.batch = argv[++i];
    else if (a === "--iso") args.iso = argv[++i];
    else if (a === "--iter") args.iter = parseInt(argv[++i], 10);
    else if (a === "--max") args.max = parseInt(argv[++i], 10);
    else if (a === "--out") args.out = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const masterIndex = loadJson(MASTER_INDEX_PATH);
  const academyPriors = loadJson(ACADEMY_PRIORS_PATH);

  const files = [];
  if (args.part) files.push(args.part);
  if (args.batch) {
    if (!fs.existsSync(args.batch)) {
      process.stderr.write("# batch dir not found: " + args.batch + "\n");
      process.exit(2);
    }
    // Walk one level; .MIN files only
    const entries = fs.readdirSync(args.batch);
    for (const e of entries) {
      const full = path.join(args.batch, e);
      try {
        const st = fs.statSync(full);
        if (st.isFile() && /\.MIN$/i.test(e)) files.push(full);
      } catch {/*skip*/}
      if (files.length >= args.max) break;
    }
  }

  if (files.length === 0) {
    process.stderr.write("Usage: --part program.MIN [--iso M]  OR  --batch dir [--max 50]\n");
    process.exit(2);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = args.out || path.resolve(repoRoot, "state/shared/lathe-training-loop/iter-" + args.iter + "-" + ts + ".jsonl");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, "");

  let totalQuality = 0, scoredParts = 0;
  for (const f of files) {
    try {
      const record = runLoopForPart(f, args.iso, args.iter, masterIndex, academyPriors);
      fs.appendFileSync(outPath, JSON.stringify(record) + "\n");
      if (typeof record.summary.quality_score === "number") {
        totalQuality += record.summary.quality_score;
        scoredParts++;
      }
    } catch (e) {
      fs.appendFileSync(outPath, JSON.stringify({ part: f, error: e.message }) + "\n");
    }
  }

  const summary = {
    iter: args.iter,
    files_processed: files.length,
    scored_parts: scoredParts,
    avg_quality_score: scoredParts > 0 ? Math.round(totalQuality / scoredParts) : null,
    output_jsonl: outPath,
  };
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch(e => { process.stderr.write("FATAL " + e.stack + "\n"); process.exit(1); });
