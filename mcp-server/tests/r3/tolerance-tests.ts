/**
 * R3-P2: Tolerance Engine Integration Tests
 *
 * Tests ISO 286-1:2010 tolerance calculations against known reference values.
 *
 * Test cases (8):
 *  1. IT7 for 25mm nominal → 21 μm
 *  2. IT6 for 50mm nominal → 16 μm (cross-check different band)
 *  3. IT8 for 10mm nominal → 22 μm (edge of size band)
 *  4. H7/g6 fit at 25mm → clearance fit
 *  5. H7/p6 fit at 25mm → interference fit
 *  6. 3-dimension stack-up → RSS < worst-case
 *  7. Cpk = 1.33 for centered process
 *  8. findAchievableGrade → returns valid IT grade for deflection
 */

import {
  calculateITGrade,
  analyzeShaftHoleFit,
  toleranceStackUp,
  calculateCpk,
  findAchievableGrade,
} from "../../src/engines/ToleranceEngine.js";

interface TestCase {
  name: string;
  run: () => string[]; // returns error messages (empty = pass)
}

const TESTS: TestCase[] = [
  // =====================================================
  // 1. IT7 for 25mm → 21 μm (ISO 286 reference)
  // =====================================================
  {
    name: "IT grade: IT7 @ 25mm = 21 μm",
    run: () => {
      const errs: string[] = [];
      const r = calculateITGrade(25, 7);
      if (r.tolerance_um !== 21) errs.push(`Expected 21 μm, got ${r.tolerance_um}`);
      if (r.tolerance_mm !== 0.021) errs.push(`Expected 0.021 mm, got ${r.tolerance_mm}`);
      if (r.grade_label !== "IT7") errs.push(`Expected IT7, got ${r.grade_label}`);
      if (r.size_band !== "18–30 mm") errs.push(`Expected 18–30 mm, got ${r.size_band}`);
      return errs;
    },
  },

  // =====================================================
  // 2. IT6 for 50mm → 16 μm (ISO 286 reference)
  // =====================================================
  {
    name: "IT grade: IT6 @ 50mm = 16 μm",
    run: () => {
      const errs: string[] = [];
      const r = calculateITGrade(50, 6);
      if (r.tolerance_um !== 16) errs.push(`Expected 16 μm, got ${r.tolerance_um}`);
      if (r.size_band !== "30–50 mm") errs.push(`Expected 30–50 mm, got ${r.size_band}`);
      return errs;
    },
  },

  // =====================================================
  // 3. IT8 for 10mm → 22 μm (size band boundary test)
  // =====================================================
  {
    name: "IT grade: IT8 @ 10mm = 22 μm",
    run: () => {
      const errs: string[] = [];
      const r = calculateITGrade(10, 8);
      if (r.tolerance_um !== 22) errs.push(`Expected 22 μm, got ${r.tolerance_um}`);
      if (r.size_band !== "6–10 mm") errs.push(`Expected 6–10 mm, got ${r.size_band}`);
      return errs;
    },
  },

  // =====================================================
  // 4. H7/g6 fit at 25mm → clearance fit
  // =====================================================
  {
    name: "Fit analysis: H7/g6 @ 25mm = clearance",
    run: () => {
      const errs: string[] = [];
      const r = analyzeShaftHoleFit(25, "H7/g6");
      if (r.fit_type !== "clearance") errs.push(`Expected clearance, got ${r.fit_type}`);
      if (r.hole.tolerance_um !== 21) errs.push(`Hole tolerance: expected 21, got ${r.hole.tolerance_um}`);
      if (r.shaft.tolerance_um !== 13) errs.push(`Shaft tolerance: expected 13, got ${r.shaft.tolerance_um}`);
      // H7: lower=25.000, upper=25.021. g6: upper=24.993, lower=24.980
      if (r.hole.lower_mm !== 25) errs.push(`Hole lower: expected 25.000, got ${r.hole.lower_mm}`);
      if (Math.abs(r.hole.upper_mm - 25.021) > 0.0005) errs.push(`Hole upper: expected 25.021, got ${r.hole.upper_mm}`);
      if (r.min_clearance_mm <= 0) errs.push(`Min clearance should be > 0 for clearance fit, got ${r.min_clearance_mm}`);
      if (r.max_clearance_mm <= r.min_clearance_mm) errs.push(`Max clearance should be > min clearance`);
      return errs;
    },
  },

  // =====================================================
  // 5. H7/p6 fit at 25mm → interference fit
  // =====================================================
  {
    name: "Fit analysis: H7/p6 @ 25mm = interference",
    run: () => {
      const errs: string[] = [];
      const r = analyzeShaftHoleFit(25, "H7/p6");
      if (r.fit_type !== "interference") errs.push(`Expected interference, got ${r.fit_type}`);
      if (r.shaft.tolerance_um !== 13) errs.push(`Shaft IT6 tolerance: expected 13, got ${r.shaft.tolerance_um}`);
      // p6 shaft: ei=+22, es=+35. H7 hole: EI=0, ES=+21
      // Max interference = shaft upper - hole lower = 35 - 0 = 35 μm → min_clearance = -0.035
      if (r.min_clearance_mm >= 0) errs.push(`Min clearance should be < 0 for interference fit, got ${r.min_clearance_mm}`);
      if (r.max_clearance_mm >= 0) errs.push(`Max clearance should be < 0 for interference fit, got ${r.max_clearance_mm}`);
      return errs;
    },
  },

  // =====================================================
  // 6. Tolerance stack-up: 3 dimensions, RSS < worst-case
  // =====================================================
  {
    name: "Stack-up: 3 dims, RSS < worst-case",
    run: () => {
      const errs: string[] = [];
      const r = toleranceStackUp([
        { nominal: 50, tolerance: 0.025 },
        { nominal: 30, tolerance: 0.021 },
        { nominal: 20, tolerance: 0.033 },
      ]);
      if (r.dimensions_analyzed !== 3) errs.push(`Expected 3 dims, got ${r.dimensions_analyzed}`);
      if (r.mean_dimension !== 100) errs.push(`Mean: expected 100, got ${r.mean_dimension}`);
      // worst_case = 0.025 + 0.021 + 0.033 = 0.079
      if (Math.abs(r.worst_case_tolerance - 0.079) > 0.001) errs.push(`WC: expected 0.079, got ${r.worst_case_tolerance}`);
      // RSS = sqrt(0.025² + 0.021² + 0.033²) = sqrt(0.000625+0.000441+0.001089) = sqrt(0.002155) ≈ 0.04642
      if (r.rss_tolerance >= r.worst_case_tolerance) errs.push(`RSS (${r.rss_tolerance}) should be < WC (${r.worst_case_tolerance})`);
      if (r.rss_tolerance < 0.04 || r.rss_tolerance > 0.05) errs.push(`RSS expected ~0.046, got ${r.rss_tolerance}`);
      return errs;
    },
  },

  // =====================================================
  // 7. Cpk = 1.33 for centered process at 4σ capability
  // =====================================================
  {
    name: "Cpk: centered process → Cpk=1.33",
    run: () => {
      const errs: string[] = [];
      // Cpk = tolerance / (3σ) = 0.020 / (3 × 0.005) = 1.33
      const r = calculateCpk(25, 0.020, 0.005);
      if (Math.abs(r.cpk - 1.33) > 0.01) errs.push(`Cpk: expected 1.33, got ${r.cpk}`);
      if (Math.abs(r.cp - 1.33) > 0.01) errs.push(`Cp: expected 1.33, got ${r.cp}`);
      if (r.capability_rating !== "good") errs.push(`Rating: expected 'good', got '${r.capability_rating}'`);
      if (r.upper_spec !== 25.020) errs.push(`USL: expected 25.020, got ${r.upper_spec}`);
      if (r.lower_spec !== 24.980) errs.push(`LSL: expected 24.980, got ${r.lower_spec}`);
      return errs;
    },
  },

  // =====================================================
  // 8. findAchievableGrade: deflection → IT grade
  // =====================================================
  {
    name: "findAchievableGrade: 0.005mm deflection @ 25mm",
    run: () => {
      const errs: string[] = [];
      // 2 × 0.005 = 0.010mm = 10 μm required → IT6 (13μm) for 18-30mm band
      const r = findAchievableGrade(25, 0.005);
      if (!r) { errs.push("Expected a result, got null"); return errs; }
      if (r.grade > 7) errs.push(`Expected IT6 or IT7, got IT${r.grade}`);
      if (r.tolerance_um < 10) errs.push(`Tolerance should be ≥ 10 μm (2× deflection), got ${r.tolerance_um}`);
      return errs;
    },
  },

  // =====================================================
  // 9. Edge case: rejects malformed fit class
  // =====================================================
  {
    name: "Fit analysis: rejects malformed fit class",
    run: () => {
      const errs: string[] = [];
      try {
        analyzeShaftHoleFit(25, "h7/G6");
        errs.push("Should have thrown for malformed fit class (inverted case)");
      } catch (e: any) {
        if (!e.message.includes("Invalid fit class")) errs.push(`Wrong error: ${e.message}`);
      }
      return errs;
    },
  },

  // =====================================================
  // 10. Edge case: IT7 @ 1mm (lower boundary)
  // =====================================================
  {
    name: "IT grade: IT7 @ 1mm (lower boundary)",
    run: () => {
      const errs: string[] = [];
      const r = calculateITGrade(1, 7);
      if (r.tolerance_um !== 10) errs.push(`Expected 10 μm, got ${r.tolerance_um}`);
      if (r.size_band !== "1–3 mm") errs.push(`Expected 1–3 mm band, got ${r.size_band}`);
      return errs;
    },
  },
];

// ============================================================================
// RUNNER
// ============================================================================

async function runTests(): Promise<void> {
  console.log("=== R3-P2 Tolerance Engine Tests ===\n");
  console.log(`Running ${TESTS.length} tests...\n`);

  let passed = 0;
  let failed = 0;
  const failures: Array<{ name: string; errors: string[] }> = [];

  for (const test of TESTS) {
    process.stdout.write(`  ${test.name} ... `);
    try {
      const errs = test.run();
      if (errs.length > 0) {
        console.log("FAIL");
        failures.push({ name: test.name, errors: errs });
        failed++;
      } else {
        console.log("PASS");
        passed++;
      }
    } catch (err: any) {
      console.log("ERROR");
      failures.push({ name: test.name, errors: [err.message || String(err)] });
      failed++;
    }
  }

  console.log(`\n--- Results: ${passed}/${TESTS.length} passed, ${failed} failed ---`);

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`  ${f.name}:`);
      for (const e of f.errors) {
        console.log(`    - ${e}`);
      }
    }
    process.exit(1);
  }

  console.log("\nAll tolerance tests passed!");
}

runTests().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
