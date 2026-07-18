#!/usr/bin/env node
/**
 * scripts/emit-cam-deflection-grid.mjs
 *   CAM-AI-TRAINING-MS0/U-CAMT-DEFLECTION-GRID
 *
 * Euler-Bernoulli cantilever tool-tip deflection across
 * (tool material, stickout L, diameter d, force F) grid.
 *
 * δ = F * L^3 / (3 * E * I), I = π * d^4 / 64
 *
 * Real moduli verbatim from CAMToolStickoutDeflectionEngine MODULUS_TABLE.
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);
const CORPUS = join(REPO_ROOT, "state", "shared", "corpus");

const OPERATOR_CONSTRAINT = "no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)";

// Verbatim from CAMToolStickoutDeflectionEngine.ts:45-51 (GPa)
const MODULUS_TABLE = {
  carbide:      580,
  hss:          210,
  tool_steel:   200,
  cobalt_hss:   220,
  diamond_pcd:  1050,
};

const STICKOUT_MM = [10, 20, 30, 50];
const DIAMETER_MM = [3, 6, 10, 16];
const FORCE_N = [50, 100, 200, 500];

const tuples = [];
const csvRows = ["toolMaterial,modulus_GPa,stickout_L_mm,diameter_d_mm,force_F_N,I_mm4,stiffness_N_per_mm,deflection_mm,unstable_at_h0p1"];

for (const [toolMat, E_GPa] of Object.entries(MODULUS_TABLE)) {
  const E_Nmm2 = E_GPa * 1000; // GPa = 1000 N/mm^2
  for (const L of STICKOUT_MM) {
    for (const d of DIAMETER_MM) {
      const I = (Math.PI * Math.pow(d, 4)) / 64; // mm^4
      const stiffness = (3 * E_Nmm2 * I) / Math.pow(L, 3); // N/mm
      for (const F of FORCE_N) {
        const deflectionMm = F / stiffness;
        const ratioVsTypicalChip = deflectionMm / 0.1; // chip thickness 0.1mm rule-of-thumb
        const unstable = ratioVsTypicalChip > 0.1;
        const toolNice = toolMat.replace(/_/g, " ");
        csvRows.push(`${toolMat},${E_GPa},${L},${d},${F},${I.toFixed(2)},${stiffness.toFixed(1)},${deflectionMm.toFixed(4)},${unstable}`);
        const completion = JSON.stringify({
          toolMaterial: toolMat,
          modulusGPa: E_GPa,
          stickoutMm: L,
          toolDiameterMm: d,
          forceN: F,
          iMm4: Number(I.toFixed(3)),
          stiffnessNmm: Number(stiffness.toFixed(2)),
          deflectionMm: Number(deflectionMm.toFixed(4)),
          unstable,
          formula: "delta = F*L^3 / (3*E*I), I = pi*d^4/64",
        });
        tuples.push({
          messages: [
            { role: "user", content: `How much will a ${toolNice} tool deflect at ${L}mm stickout, ${d}mm diameter, ${F}N tip force?` },
            { role: "assistant", content: completion },
          ],
          metadata: {
            kind: "deflection-prediction",
            toolMaterial: toolMat, stickoutMm: L, diameterMm: d, forceN: F,
            provenance: {
              realDataOnly: true,
              sourceMilestone: "CAM-AI-TRAINING-MS0",
              sourceSlot: "kilo",
              sourceEngine: "CAMToolStickoutDeflectionEngine",
              operatorConstraint: OPERATOR_CONSTRAINT,
            },
          },
        });
      }
    }
  }
}

writeFileSync(join(CORPUS, "cam-deflection-grid.csv"), csvRows.join("\n") + "\n");
writeFileSync(
  join(CORPUS, "cam-deflection-tuples.jsonl"),
  tuples.map((r) => JSON.stringify(r)).join("\n") + "\n"
);
writeFileSync(
  join(CORPUS, "cam-deflection-summary.json"),
  JSON.stringify({
    toolMaterials: Object.keys(MODULUS_TABLE).length,
    stickoutGrid: STICKOUT_MM,
    diameterGrid: DIAMETER_MM,
    forceGrid: FORCE_N,
    matrixCells: tuples.length,
    formula: "delta = F*L^3 / (3*E*I), I = pi*d^4/64",
    generatedAt: new Date().toISOString(),
  }, null, 2)
);

console.log(`tool materials=${Object.keys(MODULUS_TABLE).length} | L=${STICKOUT_MM.length} | d=${DIAMETER_MM.length} | F=${FORCE_N.length} | cells=${tuples.length}`);
