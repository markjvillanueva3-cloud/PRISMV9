#!/usr/bin/env node
// scripts/training-driver-print-to-cam.mjs
//
// U-TDP01 — Print-to-CAM training driver CLI shell.
//
// Wires the pure orchestrator (scripts/lib/training-driver-lib.mjs) to:
//   - extract: spawns prism_cad:blueprint_rag_extract via spawnSync of the MCP
//              client OR an injected stub when --stub-mode is set
//   - driveCad: spawns prism_cad:cad_class_drive_build (with use_corpus_evidence=true)
//   - driveCam: spawns prism_cam:cam_fusion_build_setup_create
//   - recordEvent: appends one JSONL line to state/shared/blueprint-accuracy-events.jsonl
//                  (the canonical hook→consumer bridge file)
//
// HARD RULE: the CLI never directly invokes vision LLMs or live Fusion360. Those
// surfaces require operator-gated credentials. --stub-mode replaces extract/CAD/CAM
// with deterministic stubs that exercise the wire end-to-end without external
// dependencies — useful for cron smoke-tests + regression gates.
//
// USAGE:
//   node scripts/training-driver-print-to-cam.mjs --pdf <path> --part-class <class> [--operator <id>]
//   node scripts/training-driver-print-to-cam.mjs --pdf <path> --part-class <class> --stub-mode
//   node scripts/training-driver-print-to-cam.mjs --batch <jobs.json> [--stub-mode] [--json]
//
// EXIT CODES:
//   0 — pipeline ran AND record stage succeeded (training signal recorded)
//   2 — record stage failed (silent training-signal loss prevented — fail-loud)
//   3 — invalid args / no jobs

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { argv, env, exit } from "node:process";
import { fileURLToPath } from "node:url";

import { runPipeline, aggregateBatch } from "./lib/training-driver-lib.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_EVENTS_FILE = env.PRISM_BPA_EVENTS_FILE || join(REPO_ROOT, "state", "shared", "blueprint-accuracy-events.jsonl");

// ── Arg parsing (minimal — no external deps) ───────────────────────

function parseArgs(args) {
  const out = { pdf: null, partClass: null, operator: null, batch: null, stubMode: false, json: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--pdf") out.pdf = args[++i];
    else if (a === "--part-class") out.partClass = args[++i];
    else if (a === "--operator") out.operator = args[++i];
    else if (a === "--batch") out.batch = args[++i];
    else if (a === "--stub-mode") out.stubMode = true;
    else if (a === "--json") out.json = true;
  }
  return out;
}

// ── Adapters ───────────────────────────────────────────────────────

/** Stub adapters — deterministic, no external deps. Used for smoke-tests + cron. */
// Per-part_class synthetic dimension recipes. Each recipe emits dims with the
// canonical BlueprintExtraction shape ({kind, nominal, tolerance: {upper, lower}})
// so U-TDP03's aggregator can mine them. Values are intentionally varied (small
// jitter) so the aggregator's distribution stats produce non-degenerate output
// even in stub mode — gives operators a sanity-baseline to compare real
// extractions against.
const STUB_DIM_RECIPES = {
  extrude_punch: () => [
    { kind: "central_oil_hole", nominal: 1.27 + (Math.random() - 0.5) * 0.05, tolerance: { upper: 0.025, lower: -0.025 } },
    { kind: "stepped_revolved_axis", nominal: 6.35 + (Math.random() - 0.5) * 0.5, tolerance: { upper: 0.013, lower: -0.013 } },
    { kind: "bevel_face_chamfer", nominal: 0.5, tolerance: { upper: 0.1, lower: -0.1 } },
  ],
  die: () => [
    { kind: "ejector_pin_hole", nominal: 4.76 + (Math.random() - 0.5) * 0.05, tolerance: { upper: 0.025, lower: -0.025 } },
    { kind: "stepped_revolved_axis", nominal: 12.7 + (Math.random() - 0.5) * 0.5, tolerance: { upper: 0.05, lower: -0.05 } },
    { kind: "datum_relief", nominal: 1.0, tolerance: { upper: 0.1, lower: -0.1 } },
  ],
  shaft: () => [
    { kind: "stepped_revolved_axis", nominal: 25.4 + (Math.random() - 0.5) * 1.0, tolerance: { upper: 0.013, lower: -0.013 } },
    { kind: "datum_relief", nominal: 0.5, tolerance: { upper: 0.05, lower: -0.05 } },
    { kind: "bevel_face_chamfer", nominal: 0.5, tolerance: { upper: 0.1, lower: -0.1 } },
  ],
};

function makeStubAdapters() {
  return {
    extract: async ({ pdf_path, part_class }) => {
      const recipe = STUB_DIM_RECIPES[part_class] || (() => [{ kind: "unspecified_dim", nominal: 10.0 }]);
      return {
        success: true,
        extraction: {
          pdf_path,
          part_class,
          confidence: 0.85,
          dimensions: recipe(),
          gdt: [],
          source: "stub-mode",
        },
      };
    },
    driveCad: async ({ part_class, built_kinds, use_corpus_evidence }) => ({
      success: true,
      setup_id: `stub-setup-${part_class}-${Date.now()}`,
      dispatched: [
        { kind: "central_oil_hole", build_hint: "extrude:cut", ok: true },
        { kind: "bevel_face_chamfer", build_hint: "chamfer", ok: true },
      ],
      skipped: [],
      built_kinds_after: [...built_kinds, "central_oil_hole", "bevel_face_chamfer"],
      use_corpus_evidence,
    }),
    driveCam: async ({ part_class, cad_setup_id }) => ({
      success: true,
      nc_output: `; STUB MODE — ${part_class} from ${cad_setup_id}\nO0001\nT01 M06\nG54 G90 G00 X0 Y0\nM30`,
    }),
    recordEvent: async (event) => {
      try {
        const eventsDir = dirname(DEFAULT_EVENTS_FILE);
        if (!existsSync(eventsDir)) mkdirSync(eventsDir, { recursive: true });
        appendFileSync(DEFAULT_EVENTS_FILE, JSON.stringify(event) + "\n");
        return { success: true, written_to: DEFAULT_EVENTS_FILE };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
  };
}

/**
 * Live adapters — wire to real MCP dispatchers via a spawned helper. Production
 * use requires the MCP server to be running on its configured port.
 *
 * NOTE: The full live wiring (vision LLM credentials, Fusion360 live bridge auth)
 * is operator-gated and not bundled with the CLI. The live adapters here surface
 * a FAILED stage with a clear "operator gating required" message so the
 * training driver's failure-path tests are exercised against real production
 * shape, not a synthetic happy path.
 */
function makeLiveAdapters() {
  const operatorGate = (stage) => async () => ({
    success: false,
    error: `${stage} live adapter requires operator-gated credentials — re-run with --stub-mode for smoke-test, or set PRISM_TDP_OPERATOR_OK=1 (will-fail-loud)`,
  });
  return {
    extract: env.PRISM_TDP_OPERATOR_OK === "1"
      ? async ({ pdf_path, part_class }) => ({
          success: false,
          error: `live extract not yet wired — pdf=${pdf_path} part_class=${part_class} (see U-TDP02 for production wire)`,
        })
      : operatorGate("extract"),
    driveCad: operatorGate("driveCad"),
    driveCam: operatorGate("driveCam"),
    recordEvent: async (event) => {
      try {
        const eventsDir = dirname(DEFAULT_EVENTS_FILE);
        if (!existsSync(eventsDir)) mkdirSync(eventsDir, { recursive: true });
        appendFileSync(DEFAULT_EVENTS_FILE, JSON.stringify(event) + "\n");
        return { success: true, written_to: DEFAULT_EVENTS_FILE };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
  };
}

// ── Main ───────────────────────────────────────────────────────────

async function runOne(pdf_path, part_class, operator_id, adapters) {
  return runPipeline({ pdf_path, part_class, operator_id, built_kinds: [], use_corpus_evidence: true }, adapters);
}

async function runBatch(batchPath, adapters) {
  if (!existsSync(batchPath)) {
    throw new Error(`batch file not found: ${batchPath}`);
  }
  const raw = JSON.parse(readFileSync(batchPath, "utf8"));
  if (!Array.isArray(raw)) {
    throw new Error(`batch file must contain a JSON array of {pdf_path, part_class[, operator_id]} objects`);
  }
  const results = [];
  for (const job of raw) {
    if (!job?.pdf_path || !job?.part_class) {
      results.push({ success: false, summary: { pdf_path: job?.pdf_path ?? "?", part_class: job?.part_class ?? "?", happyPath: false }, stages: { record: { status: "skipped" } }, event: null });
      continue;
    }
    results.push(await runOne(job.pdf_path, job.part_class, job.operator_id ?? null, adapters));
  }
  return results;
}

async function main() {
  const args = parseArgs(argv.slice(2));
  if (!args.pdf && !args.batch) {
    console.error("ERR: must provide --pdf <path> --part-class <class>  OR  --batch <jobs.json>");
    exit(3);
  }
  if (args.pdf && !args.partClass) {
    console.error("ERR: --pdf requires --part-class");
    exit(3);
  }

  const adapters = args.stubMode ? makeStubAdapters() : makeLiveAdapters();

  if (args.batch) {
    const results = await runBatch(args.batch, adapters);
    const agg = aggregateBatch(results);
    if (args.json) {
      console.log(JSON.stringify({ batch_path: args.batch, results, aggregate: agg, events_file: DEFAULT_EVENTS_FILE }, null, 2));
    } else {
      console.log(`[tdp] batch=${args.batch} runs=${agg.runCount} success=${agg.successCount} happy=${agg.fullyHappyPathCount}`);
      console.log(`[tdp] stages.extract: ok=${agg.byStageStatus.extract.ok} failed=${agg.byStageStatus.extract.failed} skipped=${agg.byStageStatus.extract.skipped}`);
      console.log(`[tdp] stages.cad:     ok=${agg.byStageStatus.cad.ok} failed=${agg.byStageStatus.cad.failed} skipped=${agg.byStageStatus.cad.skipped}`);
      console.log(`[tdp] stages.cam:     ok=${agg.byStageStatus.cam.ok} failed=${agg.byStageStatus.cam.failed} skipped=${agg.byStageStatus.cam.skipped}`);
      console.log(`[tdp] stages.record:  ok=${agg.byStageStatus.record.ok} failed=${agg.byStageStatus.record.failed} skipped=${agg.byStageStatus.record.skipped}`);
      console.log(`[tdp] events appended to: ${DEFAULT_EVENTS_FILE}`);
    }
    // Fail-loud: any record stage failure → exit 2
    if (agg.byStageStatus.record.failed > 0) exit(2);
    exit(0);
  }

  const r = await runOne(args.pdf, args.partClass, args.operator, adapters);
  if (args.json) {
    console.log(JSON.stringify({ ...r, events_file: DEFAULT_EVENTS_FILE }, null, 2));
  } else {
    console.log(`[tdp] pdf=${args.pdf} part_class=${args.partClass}`);
    for (const stage of ["extract", "cad", "cam", "record"]) {
      const s = r.stages[stage];
      const tag = s.status === "ok" ? "✓" : s.status === "failed" ? "✗" : "—";
      console.log(`[tdp] ${tag} ${stage.padEnd(8)}: ${s.status}${s.reason ? `  reason: ${s.reason}` : ""}`);
    }
    console.log(`[tdp] happy_path=${r.event.payload.accurate} confidence=${r.event.payload.extraction_confidence}`);
    console.log(`[tdp] event appended to: ${DEFAULT_EVENTS_FILE}`);
  }
  if (!r.success) exit(2);
  exit(0);
}

main().catch((e) => {
  console.error(`[tdp] FATAL: ${e instanceof Error ? e.message : String(e)}`);
  exit(3);
});
