/**
 * R3-MS0 Intelligence Engine Integration Tests
 *
 * Tests all 11 intelligence actions (17 test cases):
 *   1-3.  job_plan (P-group with stability, N-group, S-group)
 *   4-5.  setup_sheet (json + markdown formats)
 *   6.    process_cost (batch costing)
 *   7.    material_recommend
 *   8.    tool_recommend
 *   9.    machine_recommend
 *  10.    what_if (scenario comparison)
 *  11-12. failure_diagnose (chatter + tool wear with physics cross-check)
 *  13-14. failure_diagnose (alarm code lookup + alarm+symptoms combo)
 *  15.    parameter_optimize (multi-objective)
 *  16.    cycle_time_estimate (multi-operation)
 *  17.    quality_predict (surface + deflection + thermal)
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
      // Stability lobes should now be present
      if (!r.stability) errs.push("Missing stability object");
      if (r.stability && r.stability.critical_depth_mm === undefined) errs.push("Missing critical_depth_mm in stability");
      if (r.stability && r.stability.is_stable === undefined) errs.push("Missing is_stable flag in stability");
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
  // 7. what_if — scenario comparison
  // =====================================================
  {
    name: "what_if: speed increase scenario (4140 Steel)",
    action: "what_if",
    params: {
      material: "4140 Steel",
      baseline: { cutting_speed: 150, feed_per_tooth: 0.1, axial_depth: 3, radial_depth: 6 },
      changes: { cutting_speed: 200 },
    },
    validate: (r) => {
      const errs: string[] = [];
      if (!r.baseline) errs.push("Missing baseline metrics");
      if (!r.scenario) errs.push("Missing scenario metrics");
      if (!r.deltas) errs.push("Missing deltas");
      if (r.scenario?.cutting_speed !== 200) errs.push(`Scenario speed should be 200, got ${r.scenario?.cutting_speed}`);
      if (r.deltas?.tool_life_min?.percent === undefined) errs.push("Missing tool life delta");
      if (r.deltas?.mrr_cm3_min?.percent === undefined) errs.push("Missing MRR delta");
      // Higher speed should reduce tool life
      if (r.deltas?.tool_life_min?.percent >= 0) errs.push("Tool life should decrease with higher speed");
      return errs;
    },
  },

  // =====================================================
  // 8. failure_diagnose — symptom matching
  // =====================================================
  {
    name: "failure_diagnose: chatter symptoms",
    action: "failure_diagnose",
    params: {
      symptoms: ["vibration", "surface marks", "noise"],
      material: "4140 Steel",
    },
    validate: (r) => {
      const errs: string[] = [];
      if (!r.diagnoses || !Array.isArray(r.diagnoses)) errs.push("Missing diagnoses array");
      if (r.diagnoses && r.diagnoses.length === 0) errs.push("No diagnoses matched");
      if (r.diagnoses?.[0]) {
        if (r.diagnoses[0].id !== "chatter") errs.push(`Top diagnosis should be chatter, got ${r.diagnoses[0].id}`);
        if (!r.diagnoses[0].root_causes || r.diagnoses[0].root_causes.length === 0) errs.push("Missing root causes");
        if (!r.diagnoses[0].remedies || r.diagnoses[0].remedies.length === 0) errs.push("Missing remedies");
      }
      if (r.symptoms_analyzed?.length !== 3) errs.push(`Expected 3 symptoms analyzed, got ${r.symptoms_analyzed?.length}`);
      return errs;
    },
  },
  {
    name: "failure_diagnose: tool wear with physics cross-check",
    action: "failure_diagnose",
    params: {
      symptoms: ["premature tool wear", "short life"],
      material: "Inconel 718",
      parameters: { cutting_speed: 60, feed_per_tooth: 0.08, axial_depth: 2 },
    },
    validate: (r) => {
      const errs: string[] = [];
      if (!r.diagnoses || r.diagnoses.length === 0) errs.push("No diagnoses matched");
      // Should match premature_wear
      const hasWear = r.diagnoses?.some((d: any) => d.id === "premature_wear");
      if (!hasWear) errs.push("Should diagnose premature_wear");
      // Physics cross-check should be present
      if (!r.physics_cross_check) errs.push("Missing physics cross-check (parameters were provided)");
      if (r.physics_cross_check && !r.physics_cross_check.estimated_tool_life_min)
        errs.push("Cross-check missing tool life estimate");
      return errs;
    },
  },

  // =====================================================
  // 9a. failure_diagnose — alarm code lookup
  // =====================================================
  {
    name: "failure_diagnose: FANUC alarm code lookup",
    action: "failure_diagnose",
    params: {
      alarm_code: "1001",
      controller: "FANUC",
    },
    validate: (r: any) => {
      const errs: string[] = [];
      if (!r.symptoms_analyzed || !Array.isArray(r.symptoms_analyzed))
        errs.push("Missing symptoms_analyzed array");
      if (!r.diagnoses || !Array.isArray(r.diagnoses))
        errs.push("Missing diagnoses array");
      // alarm field should be present (either a decoded alarm or a fallback note)
      if (r.alarm === undefined) errs.push("Missing alarm field in response");
      return errs;
    },
  },

  // =====================================================
  // 9b. failure_diagnose — alarm code with symptoms combo
  // =====================================================
  {
    name: "failure_diagnose: alarm code + symptoms combined",
    action: "failure_diagnose",
    params: {
      symptoms: ["vibration", "noise"],
      alarm_code: "410",
      controller: "FANUC",
    },
    validate: (r: any) => {
      const errs: string[] = [];
      if (!r.symptoms_analyzed || r.symptoms_analyzed.length < 2)
        errs.push("Should have at least 2 symptoms (user-provided + alarm-injected)");
      if (!r.diagnoses || r.diagnoses.length === 0)
        errs.push("Should have at least one diagnosis for vibration/noise");
      if (r.alarm === undefined) errs.push("Missing alarm field in response");
      return errs;
    },
  },

  // =====================================================
  // 10. parameter_optimize — multi-objective optimization
  // =====================================================
  {
    name: "parameter_optimize: 4140 Steel, balanced objectives",
    action: "parameter_optimize",
    params: {
      material: "4140 Steel",
      objectives: { productivity: 0.3, cost: 0.3, quality: 0.2, tool_life: 0.2 },
      constraints: { max_power: 15 },
    },
    validate: (r) => {
      const errs: string[] = [];
      if (!r.optimal_parameters) errs.push("Missing optimal_parameters");
      if (r.optimal_parameters) {
        if (!r.optimal_parameters.cutting_speed || r.optimal_parameters.cutting_speed <= 0)
          errs.push("Invalid optimal cutting speed");
        if (!r.optimal_parameters.feed_per_tooth || r.optimal_parameters.feed_per_tooth <= 0)
          errs.push("Invalid optimal feed");
      }
      if (!r.predicted_outcomes) errs.push("Missing predicted outcomes");
      if (r.iterations === undefined || r.iterations <= 0) errs.push("No optimization iterations");
      if (!r.minimum_cost_speed) errs.push("Missing minimum cost speed");
      return errs;
    },
  },

  // =====================================================
  // 10. cycle_time_estimate — multi-operation estimation
  // =====================================================
  {
    name: "cycle_time_estimate: 3-op pocket + face + slot",
    action: "cycle_time_estimate",
    params: {
      material: "4140 Steel",
      operations: [
        { feature: "pocket", depth: 15, width: 50, length: 100, operation: "roughing" },
        { feature: "pocket", depth: 15, width: 50, length: 100, operation: "finishing" },
        { feature: "face", depth: 3, width: 80, length: 200, operation: "roughing" },
      ],
    },
    validate: (r) => {
      const errs: string[] = [];
      if (r.total_time_min === undefined || r.total_time_min <= 0) errs.push("Invalid total time");
      if (r.cutting_time_min === undefined || r.cutting_time_min <= 0) errs.push("Invalid cutting time");
      if (!r.operations || r.operations.length !== 3) errs.push(`Expected 3 operation details, got ${r.operations?.length}`);
      if (r.utilization_percent === undefined) errs.push("Missing utilization");
      if (r.tool_changes !== 2) errs.push(`Expected 2 tool changes, got ${r.tool_changes}`);
      return errs;
    },
  },

  // =====================================================
  // 11. quality_predict — surface + deflection + thermal
  // =====================================================
  {
    name: "quality_predict: 4140 Steel finishing parameters",
    action: "quality_predict",
    params: {
      material: "4140 Steel",
      parameters: {
        cutting_speed: 200,
        feed_per_tooth: 0.05,
        axial_depth: 1,
        radial_depth: 1.2,
        tool_diameter: 12,
        number_of_teeth: 4,
      },
      nose_radius: 0.8,
      operation: "milling",
    },
    validate: (r) => {
      const errs: string[] = [];
      if (!r.surface_finish) errs.push("Missing surface_finish");
      if (r.surface_finish && (r.surface_finish.Ra === undefined || r.surface_finish.Ra <= 0))
        errs.push("Invalid Ra value");
      if (r.surface_finish && (r.surface_finish.Rz === undefined || r.surface_finish.Rz <= 0))
        errs.push("Invalid Rz value");
      if (r.deflection?.max_deflection_mm === undefined) errs.push("Missing deflection data");
      if (r.thermal?.max_temperature_C === undefined) errs.push("Missing thermal data");
      if (!r.achievable_tolerance) errs.push("Missing tolerance estimate");
      if (r.cutting_force_N === undefined || r.cutting_force_N <= 0) errs.push("Missing cutting force");
      return errs;
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
