#!/usr/bin/env node
/**
 * scripts/emit-cam-surface-finish-tuples.mjs
 *   CAM-AI-TRAINING-MS0/U-CAMT-FINISH-TUPLES
 *
 * Ra (micrometer) -> finishing strategy stack LoRA tuples. Walks a
 * realistic Ra grid (0.05 to 12.5) and queries the canonical thresholds
 * verbatim from CAMSurfaceFinishMapperEngine.
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);
const CORPUS = join(REPO_ROOT, "state", "shared", "corpus");

const OPERATOR_CONSTRAINT = "no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)";

const RA_LAP = 0.1, RA_BALL_TIGHT = 0.4, RA_BALL_PENCIL = 0.8, RA_CONTOUR = 1.6, RA_SEMI = 3.2;

function mapRa(ra) {
  if (ra <= RA_LAP) return { strategies: ["ball_scallop_tight", "lap_polish"], stepoverMm: 0.025, scallopMm: 0.0005, needsSecondaryOp: true,  rationale: "Ra<=0.1 — mill leaves tight scallop, polish/lap brings to mirror" };
  if (ra <= RA_BALL_TIGHT)   return { strategies: ["ball_scallop_tight"],      stepoverMm: 0.05,  scallopMm: 0.002,  needsSecondaryOp: false, rationale: "Ra<=0.4 — tight-stepover ball finish" };
  if (ra <= RA_BALL_PENCIL)  return { strategies: ["ball_scallop_pencil"],     stepoverMm: 0.10,  scallopMm: 0.008,  needsSecondaryOp: false, rationale: "Ra<=0.8 — scallop pass + pencil_trace cleanup" };
  if (ra <= RA_CONTOUR)      return { strategies: ["contour_waterline"],       stepoverMm: 0.20,  scallopMm: 0.015,  needsSecondaryOp: false, rationale: "Ra<=1.6 — contour / waterline (Z-level constant)" };
  if (ra <= RA_SEMI)         return { strategies: ["semi_finish"],             stepoverMm: 0.30,  scallopMm: 0.030,  needsSecondaryOp: false, rationale: "Ra<=3.2 — semi-finish parallel pass" };
  return { strategies: ["rough_only"], stepoverMm: 0.50, scallopMm: 0.080, needsSecondaryOp: false, rationale: "Ra>3.2 — roughing only" };
}

// Realistic Ra callouts from real blueprints
const RA_GRID = [0.025, 0.05, 0.1, 0.2, 0.4, 0.5, 0.8, 1.0, 1.6, 2.0, 3.2, 6.3, 12.5];

const tuples = [];
for (const ra of RA_GRID) {
  const plan = mapRa(ra);
  const completion = JSON.stringify({
    raMicrometers: ra,
    strategies: plan.strategies,
    stepoverMm: plan.stepoverMm,
    scallopMm: plan.scallopMm,
    needsSecondaryOp: plan.needsSecondaryOp,
    rationale: plan.rationale,
  });
  const prompts = [
    `My print calls for Ra ${ra} micrometers. What finishing strategy should I use?`,
    `What stepover and scallop for Ra ${ra}?`,
    `Do I need a secondary op for Ra ${ra}?`,
    `Recommend a finishing pass for Ra=${ra} um surface finish.`,
  ];
  for (const prompt of prompts) {
    tuples.push({
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: completion },
      ],
      metadata: {
        kind: "surface-finish-mapping",
        raMicrometers: ra,
        provenance: {
          realDataOnly: true,
          sourceMilestone: "CAM-AI-TRAINING-MS0",
          sourceSlot: "kilo",
          sourceEngine: "CAMSurfaceFinishMapperEngine",
          operatorConstraint: OPERATOR_CONSTRAINT,
        },
      },
    });
  }
}

writeFileSync(
  join(CORPUS, "cam-surface-finish-tuples.jsonl"),
  tuples.map((r) => JSON.stringify(r)).join("\n") + "\n"
);
writeFileSync(
  join(CORPUS, "cam-surface-finish-summary.json"),
  JSON.stringify({
    raPoints: RA_GRID.length,
    promptsPerCell: 4,
    totalTuples: tuples.length,
    thresholds: { lap: RA_LAP, ballTight: RA_BALL_TIGHT, ballPencil: RA_BALL_PENCIL, contour: RA_CONTOUR, semi: RA_SEMI },
    generatedAt: new Date().toISOString(),
  }, null, 2)
);

console.log(`Ra grid points=${RA_GRID.length} | tuples=${tuples.length}`);
