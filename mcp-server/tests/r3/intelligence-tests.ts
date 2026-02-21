/**
 * R3-MS0 Intelligence Engine Integration Tests
 *
 * Tests the intelligence dispatcher wiring and implemented actions:
 *   1. job_plan (existing implementation)
 *   2. setup_sheet
 *   3. process_cost
 *   4. material_recommend
 *   5. tool_recommend
 *   6. machine_recommend
 *   7. Stub actions return structured "not implemented" errors
 */

import { registryManager } from "../../src/registries/manager.js";
import { executeIntelligenceAction } from "../../src/engines/IntelligenceEngine.js";

interface TestCase {
  name: string;
  action: string;
  params: Record<string, any>;
  validate: (result: any) => string[]; // returns array of failure messages
}

const TESTS: TestCase[] = [
  // =====================================================
  // 1. job_plan — existing implementation
  // =====================================================
  {
    name: "job_plan: 4140 Steel pocket milling (P-group)",
    action: "job_plan",
    params: {
      material: "4140 Steel",
      feature: "pocket",
      dimensions: { depth: 15, width: 50, length: 100 },
      tolerance: 0.05,
      surface_finish: 1.6,
    },
    validate: (r) => {
      const errs: string[] = [];
      if (!r.material) errs.push("Missing material object");
      if (!r.operations || r.operations.length === 0) errs.push("No operations");
      if (r.operations) {
        const rough = r.operations.find((o: any) => o.type === "roughing");
        if (rough && (rough.params.cutting_speed < 50 || rough.params.cutting_speed > 400)) {
          errs.push(`P-group Vc out of range: ${rough.params.cutting_speed}`);
        }
      }
      if (r.confidence === undefined || r.confidence <= 0) errs.push("Bad confidence");
      if (!r.safety) errs.push("Missing safety object");
      return errs;
    },
  },
  {
    name: "job_plan: 6061-T6 face milling (N-group)",
    action: "job_plan",
    params: {
      material: "6061-T6",
      feature: "face",
      dimensions: { depth: 3, width: 80, length: 200 },
    },
    validate: (r) => {
      const errs: string[] = [];
      if (!r.material) errs.push("Missing material object");
      if (!r.operations || r.operations.length === 0) errs.push("No operations");
      if (r.operations) {
        const rough = r.operations.find((o: any) => o.type === "roughing");
        // 6061-T6 (N-group) roughing: Vc typically 80-600 m/min depending on hardness
        if (rough && rough.params.cutting_speed < 80) {
          errs.push(`N-group (aluminum) Vc too low: ${rough.params.cutting_speed}`);
        }
      }
      if (r.confidence === undefined || r.confidence <= 0) errs.push("Bad confidence");
      return errs;
    },
  },
  {
    name: "job_plan: Inconel 718 slot milling (S-group)",
    action: "job_plan",
    params: {
      material: "Inconel 718",
      feature: "slot",
      dimensions: { depth: 8, width: 12, length: 60 },
    },
    validate: (r) => {
      const errs: string[] = [];
      if (!r.material) errs.push("Missing material object");
      if (!r.operations || r.operations.length === 0) errs.push("No operations");
      if (r.confidence === undefined || r.confidence <= 0) errs.push("Bad confidence");
      return errs;
    },
  },

  // =====================================================
  // 2. setup_sheet
  // =====================================================
  {
    name: "setup_sheet: 4140 Steel pocket (json format)",
    action: "setup_sheet",
    params: {
      material: "4140 Steel",
      operations: [{ feature: "pocket", depth: 15, width: 50, length: 100 }],
      format: "json",
    },
    validate: (r) => {
      const errs: string[] = [];
      if (!r.header) errs.push("Missing header section");
      if (!r.operations || r.operations.length === 0) errs.push("No operations in sheet");
      if (!r.tools || r.tools.length === 0) errs.push("No tools listed");
      if (r.format !== "json") errs.push(`Expected format=json, got ${r.format}`);
      return errs;
    },
  },
  {
    name: "setup_sheet: markdown format",
    action: "setup_sheet",
    params: {
      material: "6061-T6",
      operations: [{ feature: "face", depth: 3, width: 80, length: 200 }],
      format: "markdown",
    },
    validate: (r) => {
      const errs: string[] = [];
      if (!r.header) errs.push("Missing header");
      if (!r.markdown || typeof r.markdown !== "string") errs.push("Missing markdown string");
      if (r.format !== "markdown") errs.push(`Expected format=markdown, got ${r.format}`);
      return errs;
    },
  },

  // =====================================================
  // 3. process_cost
  // =====================================================
  {
    name: "process_cost: 4140 Steel pocket, batch=100",
    action: "process_cost",
    params: {
      material: "4140 Steel",
      operations: [{ feature: "pocket", depth: 15, width: 50, length: 100 }],
      machine_rate_per_hour: 75,
      tool_cost: 45,
      batch_size: 100,
      setup_time_min: 30,
    },
    validate: (r) => {
      const errs: string[] = [];
      if (r.total_cost_per_part === undefined || r.total_cost_per_part <= 0)
        errs.push(`Bad total_cost_per_part: ${r.total_cost_per_part}`);
      if (r.machine_cost === undefined) errs.push("Missing machine_cost");
      if (r.tool_cost_per_part === undefined) errs.push("Missing tool_cost_per_part");
      if (r.cycle_time_min === undefined) errs.push("Missing cycle_time_min");
      return errs;
    },
  },

  // =====================================================
  // 4. material_recommend
  // =====================================================
  {
    name: "material_recommend: general milling, medium hardness",
    action: "material_recommend",
    params: {
      application: "general milling",
      iso_group: "P",
      hardness_range: { min: 150, max: 300 },
      priorities: ["machinability", "cost"],
      limit: 5,
    },
    validate: (r) => {
      const errs: string[] = [];
      if (!r.candidates || !Array.isArray(r.candidates)) errs.push("Missing candidates array");
      if (r.candidates && r.candidates.length === 0) errs.push("No candidates returned");
      if (r.candidates?.[0]) {
        if (!r.candidates[0].name) errs.push("Top candidate missing name");
        if (r.candidates[0].score === undefined) errs.push("Top candidate missing score");
      }
      return errs;
    },
  },

  // =====================================================
  // 5. tool_recommend
  // =====================================================
  {
    name: "tool_recommend: endmill for P-group steel pocket",
    action: "tool_recommend",
    params: {
      material: "4140 Steel",
      feature: "pocket",
      iso_group: "P",
      diameter_range: { min: 8, max: 20 },
      limit: 5,
    },
    validate: (r) => {
      const errs: string[] = [];
      if (!r.candidates || !Array.isArray(r.candidates)) errs.push("Missing candidates array");
      if (r.candidates && r.candidates.length === 0) errs.push("No candidates returned");
      if (r.candidates?.[0]) {
        if (!r.candidates[0].name && !r.candidates[0].id) errs.push("Top candidate missing name/id");
        if (r.candidates[0].score === undefined) errs.push("Top candidate missing score");
      }
      return errs;
    },
  },

  // =====================================================
  // 6. machine_recommend
  // =====================================================
  {
    name: "machine_recommend: 3-axis VMC for medium part",
    action: "machine_recommend",
    params: {
      part_envelope: { x: 300, y: 200, z: 100 },
      type: "VMC",
      min_spindle_rpm: 8000,
      limit: 5,
    },
    validate: (r) => {
      const errs: string[] = [];
      if (!r.candidates || !Array.isArray(r.candidates)) errs.push("Missing candidates array");
      if (r.candidates && r.candidates.length === 0) errs.push("No candidates returned");
      if (r.candidates?.[0]) {
        if (!r.candidates[0].name && !r.candidates[0].id) errs.push("Top candidate missing name/id");
      }
      return errs;
    },
  },

  // =====================================================
  // 7. Stub actions return proper error
  // =====================================================
  {
    name: "what_if: returns stub error",
    action: "what_if",
    params: { baseline: { cutting_speed: 200 }, changes: { cutting_speed: 250 } },
    validate: (_r) => {
      // This should have thrown -- validated in the runner
      return ["what_if should have thrown not-implemented"];
    },
  },
];

// ============================================================================
// RUNNER
// ============================================================================

async function runTests(): Promise<void> {
  console.log("=== R3 Intelligence Engine Integration Tests ===\n");

  // Initialize registries
  console.log("Initializing registries...");
  await registryManager.initialize();
  console.log("Registries ready.\n");

  let passed = 0;
  let failed = 0;
  let stubCorrect = 0;
  const failures: Array<{ name: string; errors: string[] }> = [];

  for (const test of TESTS) {
    process.stdout.write(`  ${test.name} ... `);

    try {
      const result = await executeIntelligenceAction(test.action as any, test.params);

      // For stub tests, we expected an error but got a result
      if (test.name.includes("stub error")) {
        // Stubs should throw -- if we got here, the stub was replaced (which is fine if validate passes)
        const errs = test.validate(result);
        if (errs.length > 0) {
          console.log("FAIL");
          failures.push({ name: test.name, errors: errs });
          failed++;
        } else {
          console.log("PASS (implemented)");
          passed++;
        }
        continue;
      }

      const errs = test.validate(result);
      if (errs.length > 0) {
        console.log("FAIL");
        failures.push({ name: test.name, errors: errs });
        failed++;
      } else {
        console.log("PASS");
        passed++;
      }
    } catch (err: any) {
      // For stub tests, an error is expected
      if (test.name.includes("stub error")) {
        if (err.message.includes("not yet implemented")) {
          console.log("PASS (stub confirmed)");
          stubCorrect++;
          passed++;
        } else {
          console.log(`FAIL (unexpected error: ${err.message})`);
          failures.push({ name: test.name, errors: [`Unexpected error: ${err.message}`] });
          failed++;
        }
        continue;
      }

      console.log("FAIL (exception)");
      failures.push({ name: test.name, errors: [err.message] });
      failed++;
    }
  }

  // Summary
  console.log(`\n=== Results: ${passed}/${TESTS.length} passed, ${failed} failed, ${stubCorrect} stubs confirmed ===`);

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

  console.log("\nAll tests passed!");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
