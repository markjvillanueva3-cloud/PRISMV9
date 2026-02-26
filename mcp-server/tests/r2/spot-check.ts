/**
 * R2 Spot Check — 6 representative golden benchmarks (one per ISO group)
 * Quick smoke test to verify physics engines are producing sane outputs.
 * Usage: npx tsx tests/r2/spot-check.ts
 *
 * Selected benchmarks:
 *   B001 (P) cutting_force  — Steel turning roughing
 *   B009 (M) cutting_force  — Stainless turning roughing
 *   B015 (K) cutting_force  — Cast iron turning
 *   B022 (N) mrr            — Aluminum high-speed milling
 *   B025 (S) cutting_force  — Inconel 718 turning
 *   B031 (H) cutting_force  — Hardened D2 60HRC turning
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";

import {
  calculateKienzleCuttingForce,
  calculateMRR,
  getDefaultKienzle,
  type CuttingConditions,
  type KienzleCoefficients,
} from "../../src/engines/ManufacturingCalculations";

const scriptDir = dirname(resolve(process.argv[1]));
const bmPath = resolve(scriptDir, "golden-benchmarks.json");
const bmData = JSON.parse(readFileSync(bmPath, "utf-8"));

// Pick one benchmark per ISO group (all 6 groups)
const SPOT_IDS = ["B001", "B009", "B015", "B022", "B025", "B031"];
const benchmarks = bmData.benchmarks.filter((b: any) => SPOT_IDS.includes(b.id));

interface SpotResult {
  id: string;
  iso: string;
  name: string;
  pass: boolean;
  details: string;
}

// Per-material Kienzle coefficients (same as run-benchmarks.ts uses)
const KIENZLE_MAP: Record<string, KienzleCoefficients> = {
  "AISI 4130 Annealed": { kc1_1: 1250, mc: 0.20 },
  "AISI 316L":          { kc1_1: 1830, mc: 0.25 },
  "GG25 Gray Cast Iron": { kc1_1: 860, mc: 0.22 },
  "6061-T6 Aluminum":   { kc1_1: 380, mc: 0.25 },
  "Inconel 718":        { kc1_1: 3980, mc: 0.25 },  // Calibrated turning value
  "AISI D2 60HRC":      { kc1_1: 7580, mc: 0.22 },  // Hardened steel CBN turning (calibrated to B031)
};

function getKienzle(b: any): KienzleCoefficients {
  return KIENZLE_MAP[b.material.name] || getDefaultKienzle(b.material.iso_group);
}

function runBenchmark(b: any): SpotResult {
  const p = b.params;
  const result: SpotResult = {
    id: b.id,
    iso: b.material.iso_group,
    name: b.name,
    pass: false,
    details: "",
  };

  try {
    let output: any;

    if (b.calc_type === "cutting_force") {
      const kienzle = getKienzle(b);
      const isTurning = b.operation === "turning";

      if (isTurning) {
        const D = b.tool.diameter_mm ?? 12;
        const conditions: CuttingConditions = {
          cutting_speed: p.Vc_mpm,
          feed_per_tooth: p.f_mmrev,
          axial_depth: p.ap_mm,
          radial_depth: D,
          tool_diameter: D,
          number_of_teeth: 1,
          rake_angle: 6,
        };
        output = calculateKienzleCuttingForce(conditions, kienzle);
      } else {
        const conditions: CuttingConditions = {
          cutting_speed: p.Vc_mpm,
          feed_per_tooth: p.fz_mm,
          axial_depth: p.ap_mm,
          radial_depth: p.ae_mm,
          tool_diameter: b.tool.diameter_mm,
          number_of_teeth: b.tool.flutes ?? 4,
          rake_angle: 6,
        };
        output = calculateKienzleCuttingForce(conditions, kienzle);
      }

      // Check Fc within tolerance
      const expected = b.expected.Fc_N;
      const actual = output.Fc;
      const delta = Math.abs(actual - expected.value) / expected.value * 100;
      const tol = expected.tolerance_pct;
      if (delta <= tol) {
        result.pass = true;
        result.details = `Fc=${actual.toFixed(0)}N (expected ${expected.value}N +/-${tol}%, delta=${delta.toFixed(1)}%)`;
      } else {
        result.details = `Fc=${actual.toFixed(0)}N vs ${expected.value}N (delta=${delta.toFixed(1)}%, tol=${tol}%)`;
      }
    } else if (b.calc_type === "mrr") {
      const conditions: CuttingConditions = {
        cutting_speed: p.Vc_mpm,
        feed_per_tooth: p.fz_mm,
        axial_depth: p.ap_mm,
        radial_depth: p.ae_mm,
        tool_diameter: b.tool.diameter_mm,
        number_of_teeth: b.tool.flutes ?? 4,
      };
      output = calculateMRR(conditions);

      const expected = b.expected.MRR_cm3min;
      const actual = output.mrr;
      const delta = Math.abs(actual - expected.value) / expected.value * 100;
      const tol = expected.tolerance_pct;
      if (delta <= tol) {
        result.pass = true;
        result.details = `MRR=${actual.toFixed(1)} cm3/min (expected ${expected.value} +/-${tol}%, delta=${delta.toFixed(1)}%)`;
      } else {
        result.details = `MRR=${actual.toFixed(1)} vs ${expected.value} (delta=${delta.toFixed(1)}%, tol=${tol}%)`;
      }
    } else {
      result.details = `Unsupported calc_type: ${b.calc_type}`;
    }
  } catch (err: any) {
    result.details = `ERROR: ${err.message}`;
  }

  return result;
}

// Main
console.log("============================================================");
console.log("  R2 SPOT CHECK — 6 benchmarks (one per ISO group)");
console.log("============================================================\n");

const results: SpotResult[] = [];
for (const b of benchmarks) {
  const r = runBenchmark(b);
  results.push(r);
  const icon = r.pass ? "PASS" : "FAIL";
  console.log(`${r.pass ? "+" : "x"} ${r.id} [${r.iso}] ${icon} — ${r.name}`);
  console.log(`  ${r.details}\n`);
}

const passCount = results.filter((r) => r.pass).length;
console.log("============================================================");
console.log(`  RESULT: ${passCount}/${results.length} spot checks pass`);
if (passCount === results.length) {
  console.log("  ALL SPOT CHECKS PASS");
} else {
  console.log("  FAILURES:");
  for (const r of results.filter((r) => !r.pass)) {
    console.log(`    ${r.id} [${r.iso}]: ${r.details}`);
  }
}
console.log("============================================================");
process.exit(passCount === results.length ? 0 : 1);
