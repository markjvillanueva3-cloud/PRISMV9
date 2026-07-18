#!/usr/bin/env node
/**
 * scripts/emit-cam-iso286-fit-tuples.mjs
 *   CAM-AI-TRAINING-MS0/U-CAMT-FIT-TUPLES
 *
 * Walk ISO 286 size bands × IT grades and emit LoRA tuples teaching the
 * model "given nominal + tolerance band → IT grade + which fit letter".
 *
 * Sourced from CAMISO286FitClassifierEngine IT_GRADE_MICROMETERS table.
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);
const CORPUS = join(REPO_ROOT, "state", "shared", "corpus");

const OPERATOR_CONSTRAINT = "no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)";

// Verbatim from CAMISO286FitClassifierEngine.ts SIZE_BANDS + IT_GRADE_MICROMETERS
const SIZE_BANDS = [
  { over: 0,    upTo: 3,    label: "0-3" },
  { over: 3,    upTo: 6,    label: "3-6" },
  { over: 6,    upTo: 10,   label: "6-10" },
  { over: 10,   upTo: 18,   label: "10-18" },
  { over: 18,   upTo: 30,   label: "18-30" },
  { over: 30,   upTo: 50,   label: "30-50" },
  { over: 50,   upTo: 80,   label: "50-80" },
  { over: 80,   upTo: 120,  label: "80-120" },
  { over: 120,  upTo: 180,  label: "120-180" },
  { over: 180,  upTo: 250,  label: "180-250" },
  { over: 250,  upTo: 315,  label: "250-315" },
  { over: 315,  upTo: 400,  label: "315-400" },
  { over: 400,  upTo: 500,  label: "400-500" },
];

const IT_TABLE_UM = [
  { 5: 4,   6: 6,   7: 10,  8: 14,  9: 25,  10: 40,  11: 60,  12: 100 },
  { 5: 5,   6: 8,   7: 12,  8: 18,  9: 30,  10: 48,  11: 75,  12: 120 },
  { 5: 6,   6: 9,   7: 15,  8: 22,  9: 36,  10: 58,  11: 90,  12: 150 },
  { 5: 8,   6: 11,  7: 18,  8: 27,  9: 43,  10: 70,  11: 110, 12: 180 },
  { 5: 9,   6: 13,  7: 21,  8: 33,  9: 52,  10: 84,  11: 130, 12: 210 },
  { 5: 11,  6: 16,  7: 25,  8: 39,  9: 62,  10: 100, 11: 160, 12: 250 },
  { 5: 13,  6: 19,  7: 30,  8: 46,  9: 74,  10: 120, 11: 190, 12: 300 },
  { 5: 15,  6: 22,  7: 35,  8: 54,  9: 87,  10: 140, 11: 220, 12: 350 },
  { 5: 18,  6: 25,  7: 40,  8: 63,  9: 100, 10: 160, 11: 250, 12: 400 },
  { 5: 20,  6: 29,  7: 46,  8: 72,  9: 115, 10: 185, 11: 290, 12: 460 },
  { 5: 23,  6: 32,  7: 52,  8: 81,  9: 130, 10: 210, 11: 320, 12: 520 },
  { 5: 25,  6: 36,  7: 57,  8: 89,  9: 140, 10: 230, 11: 360, 12: 570 },
  { 5: 27,  6: 40,  7: 63,  8: 97,  9: 155, 10: 250, 11: 400, 12: 630 },
];

const FIT_GUIDANCE = {
  6:  "precision running fit (g6, h6, k6) — gears, bearings, precision shafts",
  7:  "general locational/transition fit (H7, h7, g6) — typical mechanical assembly",
  8:  "loose running / clearance fit (H8, f8, d9) — clearance bushings, slides",
  9:  "rough running fit (H9, e9) — non-critical clearance",
  10: "wide clearance (H10) — non-critical mounting",
  11: "very wide clearance / press / forge (H11) — castings, weldments",
  12: "datum reference, no fit class — rough/forged stock",
};

const tuples = [];
for (let i = 0; i < SIZE_BANDS.length; i++) {
  const band = SIZE_BANDS[i];
  const itVals = IT_TABLE_UM[i];
  const nominal = (band.over + band.upTo) / 2;
  for (const [it, um] of Object.entries(itVals)) {
    const totalMm = um / 1000;
    const halfMm = totalMm / 2;
    const completion = JSON.stringify({
      nominalMm: nominal,
      sizeBandMm: band.label,
      itGrade: Number(it),
      totalToleranceUm: um,
      totalToleranceMm: totalMm,
      bilateralHalfMm: Number(halfMm.toFixed(4)),
      typicalFitGuidance: FIT_GUIDANCE[it] ?? "see ISO 286-1 Table 1",
    });
    const prompts = [
      `What IT grade matches a ${nominal} mm dimension with ${totalMm} mm total tolerance?`,
      `For a ${band.label} mm size band, what's the IT${it} tolerance?`,
      `Recommend a fit class for ${nominal} mm +/- ${halfMm.toFixed(4)} mm.`,
    ];
    for (const prompt of prompts) {
      tuples.push({
        messages: [
          { role: "user", content: prompt },
          { role: "assistant", content: completion },
        ],
        metadata: {
          kind: "iso286-fit-classification",
          sizeBandMm: band.label, itGrade: Number(it), totalUm: um,
          provenance: {
            realDataOnly: true,
            sourceMilestone: "CAM-AI-TRAINING-MS0",
            sourceSlot: "kilo",
            sourceEngine: "CAMISO286FitClassifierEngine",
            standardSource: "ISO 286-1:2010 Annex B",
            operatorConstraint: OPERATOR_CONSTRAINT,
          },
        },
      });
    }
  }
}

writeFileSync(
  join(CORPUS, "cam-iso286-fit-tuples.jsonl"),
  tuples.map((r) => JSON.stringify(r)).join("\n") + "\n"
);

writeFileSync(
  join(CORPUS, "cam-iso286-fit-summary.json"),
  JSON.stringify({
    sizeBands: SIZE_BANDS.length,
    itGrades: 8,
    promptsPerCell: 3,
    totalTuples: tuples.length,
    source: "ISO 286-1:2010 Annex B verbatim",
    generatedAt: new Date().toISOString(),
  }, null, 2)
);

console.log(`sizeBands=${SIZE_BANDS.length} | IT grades=8 | tuples=${tuples.length}`);
