#!/usr/bin/env node
/**
 * scripts/emit-cam-operator-gate-tuples.mjs
 *   CAM-AI-TRAINING-MS0/U-CAMT-OPERATOR-GATE-TUPLES
 *
 * Encodes the 12-item CAMOperatorGate pre-cut checklist as LoRA tuples:
 *   (a) Per-item "why does this matter?" Q&A (12 items)
 *   (b) Severity classification Q&A
 *   (c) Sample failure scenarios with computed S(x)
 *
 * S(x) penalties + 0.98 shop-floor gate threshold verbatim from engine.
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);
const CORPUS = join(REPO_ROOT, "state", "shared", "corpus");

const OPERATOR_CONSTRAINT = "no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)";

const ITEMS = [
  { id: "wcs_set",                severity: "block",     penalty: -0.20, why: "WCS not probed - tool will crash, dig into stock or air-cut wrong location" },
  { id: "tool_offsets_loaded",    severity: "block",     penalty: -0.20, why: "missing H/D offsets - tool moves to wrong Z, drives into vise/table or stays too high" },
  { id: "stock_clamped",          severity: "block",     penalty: -0.20, why: "unsecured stock will shift mid-cut - tool break, part launched, operator injured" },
  { id: "doors_closed",           severity: "block",     penalty: -0.20, why: "open doors disable interlocks - chips/coolant ejected, machine safety violation" },
  { id: "coolant_ready",          severity: "warn_high", penalty: -0.05, why: "no coolant flow = thermal damage to part + accelerated tool wear (still cuttable but compromised)" },
  { id: "spindle_warm",           severity: "warn_low",  penalty: -0.02, why: "cold spindle drifts thermally - precision suffers (cold-first tolerance hit ~5 microns)" },
  { id: "program_reviewed",       severity: "warn_high", penalty: -0.05, why: "unverified program may contain G00 in middle of cut, missing M30, wrong unit (G20/G21)" },
  { id: "dry_run_done",           severity: "warn_high", penalty: -0.05, why: "no dry-run means rapid moves above stock unverified - first crash is the live one" },
  { id: "first_part_inspected",   severity: "warn_low",  penalty: -0.02, why: "first-piece QC catches systematic offset before scrapping the batch" },
  { id: "tool_breakage_check",    severity: "warn_high", penalty: -0.05, why: "missed broken tool = recutting on a stub, marked surface, broken next tool" },
  { id: "e_stop_reachable",       severity: "block",     penalty: -0.20, why: "operator >arms-length from e-stop cannot abort a crash in time" },
  { id: "tool_wear_within_limits",severity: "warn_high", penalty: -0.05, why: "worn tool = increased Fc, surface finish degradation, tool failure mid-cut" },
];

const SHOP_FLOOR_GATE = 0.98;
const BASE_SX = 1.0;

const tuples = [];

// Per-item "why" Q&A
for (const item of ITEMS) {
  const completion = JSON.stringify({
    item: item.id,
    severity: item.severity,
    sxPenalty: item.penalty,
    why: item.why,
    blocking: item.severity === "block",
  });
  const prompts = [
    `Why is ${item.id.replace(/_/g, " ")} a pre-cut checklist item?`,
    `What happens if you skip ${item.id.replace(/_/g, " ")} before starting a cut?`,
    `Is ${item.id.replace(/_/g, " ")} a blocking item or a warning?`,
  ];
  for (const prompt of prompts) {
    tuples.push({
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: completion },
      ],
      metadata: {
        kind: "operator-gate-rationale",
        item: item.id, severity: item.severity,
        provenance: {
          realDataOnly: true,
          sourceMilestone: "CAM-AI-TRAINING-MS0",
          sourceSlot: "kilo",
          sourceEngine: "CAMOperatorGateEngine",
          operatorConstraint: OPERATOR_CONSTRAINT,
        },
      },
    });
  }
}

// Sample-checklist S(x) scenarios
const SCENARIOS = [
  { label: "all-pass", failed: [], expectedSx: BASE_SX, expectedPass: true },
  { label: "warm-spindle-skipped", failed: ["spindle_warm"], expectedSx: 0.98, expectedPass: true },
  { label: "coolant-off", failed: ["coolant_ready"], expectedSx: 0.95, expectedPass: false },
  { label: "no-WCS", failed: ["wcs_set"], expectedSx: 0.80, expectedPass: false },
  { label: "doors-open+stock-loose", failed: ["doors_closed", "stock_clamped"], expectedSx: 0.60, expectedPass: false },
  { label: "no-dry-run+no-program-review", failed: ["dry_run_done", "program_reviewed"], expectedSx: 0.90, expectedPass: false },
];
for (const s of SCENARIOS) {
  const completion = JSON.stringify({
    scenario: s.label,
    failedItems: s.failed,
    sxScore: s.expectedSx,
    shopFloorGate: SHOP_FLOOR_GATE,
    passed: s.expectedPass,
    rationale: `S(x)=${s.expectedSx} ${s.expectedPass ? ">=" : "<"} ${SHOP_FLOOR_GATE} gate`,
  });
  const prompt = `What's the S(x) score if these checklist items fail: ${s.failed.length === 0 ? "none (all pass)" : s.failed.join(", ")}?`;
  tuples.push({
    messages: [
      { role: "user", content: prompt },
      { role: "assistant", content: completion },
    ],
    metadata: {
      kind: "operator-gate-scenario",
      failedItems: s.failed,
      provenance: {
        realDataOnly: true,
        sourceMilestone: "CAM-AI-TRAINING-MS0",
        sourceSlot: "kilo",
        sourceEngine: "CAMOperatorGateEngine",
        operatorConstraint: OPERATOR_CONSTRAINT,
      },
    },
  });
}

writeFileSync(
  join(CORPUS, "cam-operator-gate-tuples.jsonl"),
  tuples.map((r) => JSON.stringify(r)).join("\n") + "\n"
);
writeFileSync(
  join(CORPUS, "cam-operator-gate-summary.json"),
  JSON.stringify({
    items: ITEMS.length,
    promptsPerItem: 3,
    scenarios: SCENARIOS.length,
    totalTuples: tuples.length,
    shopFloorGate: SHOP_FLOOR_GATE,
    generatedAt: new Date().toISOString(),
  }, null, 2)
);

console.log(`items=${ITEMS.length} | scenarios=${SCENARIOS.length} | total tuples=${tuples.length}`);
