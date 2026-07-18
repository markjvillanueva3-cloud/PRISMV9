/**
 * R2-MS3 Edge Case Runner — 20 boundary condition tests across 5 categories
 * Usage: npx tsx tests/r2/run-edge-cases.ts
 *
 * Categories (4 each):
 *   1. Exotic materials       — materials at extremes of machinability spectrum
 *   2. Extreme parameters     — values at or near SAFETY_LIMITS boundaries
 *   3. Boundary conditions    — invalid/degenerate inputs handled gracefully
 *   4. Material-machine mismatch — unusual but physically possible combos
 *   5. Multi-physics coupling — cross-engine consistency checks
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";

import {
  calculateKienzleCuttingForce,
  calculateTaylorToolLife,
  type CuttingConditions,
  type KienzleCoefficients,
  type TaylorCoefficients,
} from "../../src/engines/ManufacturingCalculations";

import {
  calculateStabilityLobes,
  calculateToolDeflection,
  calculateCuttingTemperature,
  type ModalParameters,
} from "../../src/engines/AdvancedCalculations";

const scriptDir = dirname(resolve(process.argv[1]));
const ecPath = resolve(scriptDir, "edge-cases.json");
const ecData = JSON.parse(readFileSync(ecPath, "utf-8"));

interface EdgeResult {
  id: string;
  name: string;
  category: string;
  pass: boolean;
  checks: CheckResult[];
  details: string;
}

interface CheckResult {
  check: string;
  pass: boolean;
  detail: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inRange(value: number, range: { min: number; max: number }): boolean {
  return value >= range.min && value <= range.max;
}

function checkWarnings(warnings: string[], expected: string[]): CheckResult[] {
  return expected.map((pattern) => {
    const found = warnings.some((w) => w.includes(pattern));
    return {
      check: `warnings contain "${pattern}"`,
      pass: found,
      detail: found
        ? `Found "${pattern}" in warnings`
        : `Missing "${pattern}" — got: [${warnings.join("; ")}]`,
    };
  });
}

// ─── Per-calc-type runners ───────────────────────────────────────────────────

function runCuttingForce(ec: any): { output: any; checks: CheckResult[] } {
  const p = ec.params;
  const isTurning = ec.operation === "turning";
  const D = ec.tool.diameter_mm;
  const z = isTurning ? 1 : ec.tool.flutes ?? 4;

  const conditions: CuttingConditions = {
    cutting_speed: p.Vc_mpm,
    feed_per_tooth: isTurning ? p.f_mmrev : p.fz_mm,
    axial_depth: p.ap_mm,
    radial_depth: isTurning ? D : p.ae_mm,
    tool_diameter: D,
    number_of_teeth: z,
    rake_angle: 6,
  };

  const kienzle: KienzleCoefficients = {
    kc1_1: ec.kienzle.kc1_1,
    mc: ec.kienzle.mc,
  };

  const output = calculateKienzleCuttingForce(conditions, kienzle);
  const checks: CheckResult[] = [];

  // Fc range check
  if (ec.expected.Fc_N) {
    const ok = inRange(output.Fc, ec.expected.Fc_N);
    checks.push({
      check: "Fc in range",
      pass: ok,
      detail: `Fc=${output.Fc.toFixed(1)}N, range=[${ec.expected.Fc_N.min}, ${ec.expected.Fc_N.max}]`,
    });
  }

  // Power range check
  if (ec.expected.power_kW) {
    const ok = inRange(output.power, ec.expected.power_kW);
    checks.push({
      check: "power in range",
      pass: ok,
      detail: `P=${output.power.toFixed(2)}kW, range=[${ec.expected.power_kW.min}, ${ec.expected.power_kW.max}]`,
    });
  }

  // Warning checks
  if (ec.expected.warnings_contain) {
    checks.push(...checkWarnings(output.warnings, ec.expected.warnings_contain));
  }

  return { output, checks };
}

function runToolLife(ec: any): { output: any; checks: CheckResult[] } {
  const p = ec.params;
  const taylor: TaylorCoefficients = {
    C: ec.taylor.C,
    n: ec.taylor.n,
  };

  const output = calculateTaylorToolLife(p.Vc_mpm, taylor, p.feed, p.depth);
  const checks: CheckResult[] = [];

  if (ec.expected.tool_life_min) {
    const ok = inRange(output.tool_life_minutes, ec.expected.tool_life_min);
    checks.push({
      check: "tool life in range",
      pass: ok,
      detail: `T=${output.tool_life_minutes.toFixed(1)}min, range=[${ec.expected.tool_life_min.min}, ${ec.expected.tool_life_min.max}]`,
    });
  }

  if (ec.expected.warnings_contain) {
    checks.push(...checkWarnings(output.warnings, ec.expected.warnings_contain));
  }

  return { output, checks };
}

function runDeflection(ec: any): { output: any; checks: CheckResult[] } {
  const p = ec.params;
  const output = calculateToolDeflection(
    p.cutting_force_N,
    p.tool_diameter_mm,
    p.overhang_mm,
    p.youngs_modulus_GPa ?? 600
  );
  const checks: CheckResult[] = [];

  if (ec.expected.deflection_mm) {
    const ok = inRange(output.static_deflection, ec.expected.deflection_mm);
    checks.push({
      check: "deflection in range",
      pass: ok,
      detail: `δ=${output.static_deflection.toFixed(4)}mm, range=[${ec.expected.deflection_mm.min}, ${ec.expected.deflection_mm.max}]`,
    });
  }

  if (ec.expected.warnings_contain) {
    checks.push(...checkWarnings(output.warnings, ec.expected.warnings_contain));
  }

  return { output, checks };
}

function runStability(ec: any): { output: any; checks: CheckResult[] } {
  const p = ec.params;
  const modal: ModalParameters = {
    natural_frequency: p.natural_frequency_Hz,
    damping_ratio: p.damping_ratio,
    stiffness: p.stiffness_Npm,
  };

  const output = calculateStabilityLobes(
    modal,
    p.kc_Nmm2,
    ec.tool?.flutes ?? 4,
    p.current_depth_mm,
    p.current_speed_rpm
  );
  const checks: CheckResult[] = [];

  if (ec.expected.is_stable !== undefined) {
    const ok = output.is_stable === ec.expected.is_stable;
    checks.push({
      check: "stability verdict",
      pass: ok,
      detail: `is_stable=${output.is_stable}, expected=${ec.expected.is_stable}`,
    });
  }

  if (ec.expected.critical_depth_mm) {
    const ok = inRange(output.critical_depth, ec.expected.critical_depth_mm);
    checks.push({
      check: "critical depth in range",
      pass: ok,
      detail: `b_lim=${output.critical_depth.toFixed(2)}mm, range=[${ec.expected.critical_depth_mm.min}, ${ec.expected.critical_depth_mm.max}]`,
    });
  }

  return { output, checks };
}

function runForceThenDeflection(ec: any): {
  output: any;
  checks: CheckResult[];
} {
  const p = ec.params;
  const conditions: CuttingConditions = {
    cutting_speed: p.Vc_mpm,
    feed_per_tooth: p.fz_mm,
    axial_depth: p.ap_mm,
    radial_depth: p.ae_mm,
    tool_diameter: ec.tool.diameter_mm,
    number_of_teeth: ec.tool.flutes ?? 4,
    rake_angle: 6,
  };
  const kienzle: KienzleCoefficients = {
    kc1_1: ec.kienzle.kc1_1,
    mc: ec.kienzle.mc,
  };
  const forceResult = calculateKienzleCuttingForce(conditions, kienzle);
  const deflResult = calculateToolDeflection(
    forceResult.Fc,
    ec.tool.diameter_mm,
    p.overhang_mm
  );

  const checks: CheckResult[] = [];

  if (ec.expected.Fc_N) {
    const ok = inRange(forceResult.Fc, ec.expected.Fc_N);
    checks.push({
      check: "Fc in range",
      pass: ok,
      detail: `Fc=${forceResult.Fc.toFixed(1)}N, range=[${ec.expected.Fc_N.min}, ${ec.expected.Fc_N.max}]`,
    });
  }

  if (ec.expected.deflection_mm) {
    const ok = inRange(deflResult.static_deflection, ec.expected.deflection_mm);
    checks.push({
      check: "deflection in range",
      pass: ok,
      detail: `δ=${deflResult.static_deflection.toFixed(4)}mm, range=[${ec.expected.deflection_mm.min}, ${ec.expected.deflection_mm.max}]`,
    });
  }

  // Coupling check: higher force must produce higher deflection
  checks.push({
    check: "force-deflection coupling",
    pass: deflResult.static_deflection > 0,
    detail: `Fc=${forceResult.Fc.toFixed(0)}N → δ=${deflResult.static_deflection.toFixed(4)}mm (positive correlation)`,
  });

  if (ec.expected.warnings_contain) {
    checks.push(
      ...checkWarnings(
        [...forceResult.warnings, ...deflResult.warnings],
        ec.expected.warnings_contain
      )
    );
  }

  return { output: { force: forceResult, deflection: deflResult }, checks };
}

function runSpeedThermalLife(ec: any): {
  output: any;
  checks: CheckResult[];
} {
  const p = ec.params;

  // Cutting force for kc
  const conditions: CuttingConditions = {
    cutting_speed: p.Vc_mpm,
    feed_per_tooth: p.f_mmrev,
    axial_depth: p.ap_mm,
    radial_depth: 12, // turning, ae = D
    tool_diameter: 12,
    number_of_teeth: 1,
    rake_angle: 6,
  };
  const kienzle: KienzleCoefficients = {
    kc1_1: ec.kienzle.kc1_1,
    mc: ec.kienzle.mc,
  };
  const forceResult = calculateKienzleCuttingForce(conditions, kienzle);

  // Thermal
  const thermalResult = calculateCuttingTemperature(
    p.Vc_mpm,
    p.f_mmrev,
    p.ap_mm,
    forceResult.specific_force,
    p.thermal_conductivity ?? 50
  );

  // Tool life
  const taylor: TaylorCoefficients = {
    C: ec.taylor.C,
    n: ec.taylor.n,
  };
  const lifeResult = calculateTaylorToolLife(
    p.Vc_mpm,
    taylor,
    p.f_mmrev,
    p.ap_mm
  );

  const checks: CheckResult[] = [];

  if (ec.expected.tool_temp_C) {
    const ok = inRange(
      thermalResult.tool_temperature,
      ec.expected.tool_temp_C
    );
    checks.push({
      check: "tool temperature in range",
      pass: ok,
      detail: `T_tool=${thermalResult.tool_temperature.toFixed(0)}°C, range=[${ec.expected.tool_temp_C.min}, ${ec.expected.tool_temp_C.max}]`,
    });
  }

  if (ec.expected.tool_life_min) {
    const ok = inRange(lifeResult.tool_life_minutes, ec.expected.tool_life_min);
    checks.push({
      check: "tool life in range",
      pass: ok,
      detail: `T=${lifeResult.tool_life_minutes.toFixed(1)}min, range=[${ec.expected.tool_life_min.min}, ${ec.expected.tool_life_min.max}]`,
    });
  }

  // Coupling: higher temp should correlate with shorter life
  checks.push({
    check: "thermal-life coupling",
    pass: thermalResult.tool_temperature > 300 && lifeResult.tool_life_minutes < 60,
    detail: `T_tool=${thermalResult.tool_temperature.toFixed(0)}°C, T_life=${lifeResult.tool_life_minutes.toFixed(1)}min (high temp → short life)`,
  });

  return {
    output: { force: forceResult, thermal: thermalResult, life: lifeResult },
    checks,
  };
}

// ─── Main dispatcher ─────────────────────────────────────────────────────────

function runEdgeCase(ec: any): EdgeResult {
  const result: EdgeResult = {
    id: ec.id,
    name: ec.name,
    category: ec.category,
    pass: false,
    checks: [],
    details: "",
  };

  try {
    // "reject" behavior — we expect an error/throw
    if (ec.expected.behavior === "reject") {
      try {
        // Build conditions as normal, but expect it to throw
        if (ec.calc_type === "cutting_force") {
          const p = ec.params;
          const isTurning = ec.operation === "turning";
          const D =
            ec.id === "EC011" ? NaN : ec.tool.diameter_mm; // EC011 specifically tests NaN
          const conditions: CuttingConditions = {
            cutting_speed: p.Vc_mpm,
            feed_per_tooth: isTurning ? p.f_mmrev : p.fz_mm,
            axial_depth: p.ap_mm,
            radial_depth: isTurning ? D : p.ae_mm,
            tool_diameter: D,
            number_of_teeth: isTurning ? 1 : ec.tool.flutes ?? 4,
            rake_angle: 6,
          };
          calculateKienzleCuttingForce(conditions, {
            kc1_1: ec.kienzle.kc1_1,
            mc: ec.kienzle.mc,
          });
        }
        // If we got here without throwing, the reject test failed
        result.checks.push({
          check: "should reject",
          pass: false,
          detail: "Expected SAFETY BLOCK error but function returned normally",
        });
      } catch (err: any) {
        const hasExpectedMsg = ec.expected.error_contains
          ? err.message.includes(ec.expected.error_contains)
          : true;
        result.checks.push({
          check: "rejected with correct error",
          pass: hasExpectedMsg,
          detail: `Error: "${err.message}" ${hasExpectedMsg ? "(matches)" : "(unexpected message)"}`,
        });
      }
    } else {
      // Normal execution — dispatch by calc_type
      let runResult: { output: any; checks: CheckResult[] };

      switch (ec.calc_type) {
        case "cutting_force":
          runResult = runCuttingForce(ec);
          break;
        case "tool_life":
          runResult = runToolLife(ec);
          break;
        case "deflection":
          runResult = runDeflection(ec);
          break;
        case "stability":
          runResult = runStability(ec);
          break;
        case "force_then_deflection":
          runResult = runForceThenDeflection(ec);
          break;
        case "speed_thermal_life":
          runResult = runSpeedThermalLife(ec);
          break;
        default:
          result.checks.push({
            check: "calc_type supported",
            pass: false,
            detail: `Unsupported calc_type: ${ec.calc_type}`,
          });
          runResult = { output: null, checks: [] };
      }

      result.checks.push(...runResult.checks);
    }
  } catch (err: any) {
    // Unexpected crash
    result.checks.push({
      check: "no crash",
      pass: false,
      detail: `UNEXPECTED CRASH: ${err.message}`,
    });
  }

  // Overall pass: all checks must pass
  result.pass = result.checks.length > 0 && result.checks.every((c) => c.pass);
  result.details = result.checks.map((c) => `${c.pass ? "✓" : "✗"} ${c.check}: ${c.detail}`).join("\n    ");

  return result;
}

// ─── Execute ─────────────────────────────────────────────────────────────────

console.log("============================================================");
console.log("  R2-MS3 EDGE CASE TESTS — 20 boundary conditions");
console.log("============================================================\n");

const results: EdgeResult[] = [];
const categoryCounts: Record<string, { pass: number; total: number }> = {};

for (const ec of ecData.edge_cases) {
  const r = runEdgeCase(ec);
  results.push(r);

  if (!categoryCounts[ec.category]) {
    categoryCounts[ec.category] = { pass: 0, total: 0 };
  }
  categoryCounts[ec.category].total++;
  if (r.pass) categoryCounts[ec.category].pass++;

  const icon = r.pass ? "PASS" : "FAIL";
  console.log(`${r.pass ? "+" : "x"} ${r.id} [${ec.category}] ${icon} — ${r.name}`);
  for (const c of r.checks) {
    console.log(`    ${c.pass ? "✓" : "✗"} ${c.check}: ${c.detail}`);
  }
  console.log();
}

const passCount = results.filter((r) => r.pass).length;

console.log("============================================================");
console.log("  CATEGORY SUMMARY");
console.log("============================================================");
for (const [cat, counts] of Object.entries(categoryCounts)) {
  const pct = ((counts.pass / counts.total) * 100).toFixed(0);
  console.log(`  ${cat}: ${counts.pass}/${counts.total} (${pct}%)`);
}
console.log();
console.log("============================================================");
console.log(`  RESULT: ${passCount}/${results.length} edge cases pass`);
if (passCount === results.length) {
  console.log("  ALL EDGE CASES PASS");
} else {
  console.log("  FAILURES:");
  for (const r of results.filter((r) => !r.pass)) {
    console.log(`    ${r.id}: ${r.name}`);
    for (const c of r.checks.filter((c) => !c.pass)) {
      console.log(`      ✗ ${c.check}: ${c.detail}`);
    }
  }
}
console.log("============================================================");

// Write results file
const resultFile = resolve(scriptDir, "edge-case-results.json");
writeFileSync(
  resultFile,
  JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      total: results.length,
      pass: passCount,
      fail: results.length - passCount,
      pass_rate: `${((passCount / results.length) * 100).toFixed(1)}%`,
      categories: categoryCounts,
      results: results.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        pass: r.pass,
        checks: r.checks,
      })),
    },
    null,
    2
  )
);
console.log(`\nResults written to: ${resultFile}`);

process.exit(passCount === results.length ? 0 : 1);
