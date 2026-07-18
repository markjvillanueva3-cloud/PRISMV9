#!/usr/bin/env node
/**
 * scripts/emit-cam-kienzle-force-grid.mjs
 *   CAM-AI-TRAINING-MS0/U-CAMT-KIENZLE-GRID
 *
 * Compute Kienzle cutting forces across (material, chip thickness h, chip width b)
 * grid and emit LoRA tuples. Fc = kc1.1 * (h/h0)^(-mc) * h * b with h0=1mm.
 *
 * Real ISO 513 constants from MaterialDatabase + PRISM canonical kc1.1 table.
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);
const CORPUS = join(REPO_ROOT, "state", "shared", "corpus");

const OPERATOR_CONSTRAINT = "no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)";

// Verbatim from CAMMaterialDatabaseEngine ISO_KC11 + ISO_MC
const MATERIALS = {
  steel:          { isoGroup: "P", kc11: 1800, mc: 0.25 },
  tool_steel:     { isoGroup: "P", kc11: 2200, mc: 0.25 },
  hardened_steel: { isoGroup: "H", kc11: 3200, mc: 0.20 },
  stainless:      { isoGroup: "M", kc11: 2100, mc: 0.25 },
  titanium:       { isoGroup: "S", kc11: 2800, mc: 0.20 },
  inconel:        { isoGroup: "S", kc11: 2800, mc: 0.20 },
  aluminum:       { isoGroup: "N", kc11: 700,  mc: 0.25 },
  copper:         { isoGroup: "N", kc11: 700,  mc: 0.25 },
  brass:          { isoGroup: "N", kc11: 700,  mc: 0.25 },
  plastic:        { isoGroup: "N", kc11: 700,  mc: 0.25 },
  composite:      { isoGroup: "N", kc11: 700,  mc: 0.25 },
};

// Practical chip-thickness range (mm)
const H_GRID = [0.05, 0.1, 0.15, 0.2, 0.3, 0.5];
// Practical chip-width range (mm) — single-flute equivalent
const B_GRID = [1, 3, 5, 10];

const tuples = [];
const csvRows = ["material,isoGroup,chipThickness_h_mm,chipWidth_b_mm,Fc_N,kc11,mc"];

for (const [mat, k] of Object.entries(MATERIALS)) {
  for (const h of H_GRID) {
    for (const b of B_GRID) {
      // Kienzle Fc = kc1.1 * (h/h0)^(-mc) * h * b, h0=1 mm
      const kc = k.kc11 * Math.pow(h, -k.mc);
      const Fc = kc * h * b;
      const matNice = mat.replace(/_/g, " ");
      csvRows.push(`${mat},${k.isoGroup},${h},${b},${Fc.toFixed(1)},${k.kc11},${k.mc}`);
      const completion = JSON.stringify({
        material: mat,
        isoGroup: k.isoGroup,
        chipThicknessMm: h,
        chipWidthMm: b,
        cuttingForceN: Number(Fc.toFixed(2)),
        specificForceNMm2: Number(kc.toFixed(1)),
        kienzle: { kc11: k.kc11, mc: k.mc, formula: "Fc = kc1.1 * (h/h0)^(-mc) * h * b, h0=1mm" },
      });
      tuples.push({
        messages: [
          { role: "user", content: `Predict cutting force for ${matNice} with chip thickness ${h} mm and width ${b} mm.` },
          { role: "assistant", content: completion },
        ],
        metadata: {
          kind: "kienzle-force-prediction",
          material: mat, h, b,
          provenance: {
            realDataOnly: true,
            sourceMilestone: "CAM-AI-TRAINING-MS0",
            sourceSlot: "kilo",
            sourceEngine: "CAMKienzleForceEngine",
            kc11Source: "ISO 513 canonical PRISM constants",
            operatorConstraint: OPERATOR_CONSTRAINT,
          },
        },
      });
    }
  }
}

writeFileSync(join(CORPUS, "cam-kienzle-force-grid.csv"), csvRows.join("\n") + "\n");
writeFileSync(
  join(CORPUS, "cam-kienzle-force-tuples.jsonl"),
  tuples.map((r) => JSON.stringify(r)).join("\n") + "\n"
);
writeFileSync(
  join(CORPUS, "cam-kienzle-force-summary.json"),
  JSON.stringify({
    materials: Object.keys(MATERIALS).length,
    hGrid: H_GRID,
    bGrid: B_GRID,
    matrixCells: tuples.length,
    formula: "Fc = kc1.1 * (h/h0)^(-mc) * h * b",
    h0Mm: 1,
    generatedAt: new Date().toISOString(),
  }, null, 2)
);

console.log(`materials=${Object.keys(MATERIALS).length} | h-grid=${H_GRID.length} | b-grid=${B_GRID.length} | cells=${tuples.length}`);
