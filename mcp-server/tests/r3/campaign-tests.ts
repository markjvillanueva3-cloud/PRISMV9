/**
 * R3-MS3 CampaignEngine Integration Tests
 * Tests all 4 campaign actions + validation + edge cases
 */
import {
  createCampaign,
  validateCampaign,
  optimizeCampaign,
  estimateCycleTime,
  listCampaignActions,
  CAMPAIGN_ACTIONS,
  type CampaignConfig,
  type OperationResult,
} from "../../src/engines/CampaignEngine.js";

interface TestCase {
  name: string;
  run: () => string[];
}

// === Test Data ===

const steelMaterial = { id: "mat_1045", name: "AISI 1045", iso_group: "P", hardness_hb: 200 };
const titaniumMaterial = { id: "mat_ti64", name: "Ti-6Al-4V", iso_group: "S", hardness_hb: 350 };
const aluminumMaterial = { id: "mat_6061", name: "6061-T6", iso_group: "N", hardness_hb: 95 };

const baseOps = [
  { sequence: 1, feature: "face", tool_diameter_mm: 50, cutting_speed_m_min: 200, feed_per_tooth_mm: 0.15, axial_depth_mm: 2, radial_depth_mm: 40, coolant: "flood" },
  { sequence: 2, feature: "pocket", tool_diameter_mm: 16, cutting_speed_m_min: 150, feed_per_tooth_mm: 0.08, axial_depth_mm: 5, radial_depth_mm: 8, coolant: "flood" },
  { sequence: 3, feature: "drill", tool_diameter_mm: 8.5, tool_type: "drill", cutting_speed_m_min: 80, feed_per_tooth_mm: 0.12, axial_depth_mm: 25, coolant: "tsc" },
];

const baseConfig: CampaignConfig = {
  name: "Test Campaign",
  materials: [steelMaterial, aluminumMaterial],
  operations: baseOps,
  machine: { name: "Haas VF-2", max_spindle_rpm: 8100, max_power_kw: 22.4, max_torque_nm: 122 },
  constraints: { max_tool_changes: 5, max_cycle_time_min: 30, target_tool_life_min: 15 },
};

// Pre-computed operation results (simulating IntelligenceEngine output)
function makeOpResults(materialIdx: number): OperationResult[] {
  const factor = materialIdx === 0 ? 1.0 : 0.8; // aluminum is easier
  return [
    { sequence: 1, feature: "face", cutting_speed_m_min: 200, feed_rate_mm_min: 764, spindle_rpm: 1273, mrr_cm3_min: 6.1, cutting_force_n: 1200 * factor, tool_life_min: 45, cycle_time_min: 1.5, surface_finish_ra: 1.6, power_kw: 3.2 * factor, warnings: [] },
    { sequence: 2, feature: "pocket", cutting_speed_m_min: 150, feed_rate_mm_min: 380, spindle_rpm: 2984, mrr_cm3_min: 1.5, cutting_force_n: 800 * factor, tool_life_min: 30, cycle_time_min: 5.0, surface_finish_ra: 0.8, power_kw: 2.1 * factor, warnings: [] },
    { sequence: 3, feature: "drill", cutting_speed_m_min: 80, feed_rate_mm_min: 192, spindle_rpm: 2994, mrr_cm3_min: 0.9, cutting_force_n: 600 * factor, tool_life_min: 60, cycle_time_min: 0.8, surface_finish_ra: 3.2, power_kw: 1.5 * factor, warnings: [] },
  ];
}

// === Tests ===

const tests: TestCase[] = [
  // === createCampaign ===
  {
    name: "Create campaign: 2 materials, 3 ops each",
    run: () => {
      const errs: string[] = [];
      const opResults = [makeOpResults(0), makeOpResults(1)];
      const r = createCampaign(baseConfig, opResults);
      if (r.name !== "Test Campaign") errs.push(`Wrong name: ${r.name}`);
      if (r.material_count !== 2) errs.push(`Wrong material count: ${r.material_count}`);
      if (r.results.length !== 2) errs.push(`Wrong results count: ${r.results.length}`);
      // Both materials should pass (safe parameters)
      for (const mr of r.results) {
        if (mr.status !== "pass" && mr.status !== "warning") errs.push(`Material ${mr.material.name} unexpected status: ${mr.status}`);
        if (mr.cumulative_safety.safety_score < 0.5) errs.push(`Safety score too low for ${mr.material.name}: ${mr.cumulative_safety.safety_score}`);
        if (mr.total_cycle_time_min <= 0) errs.push(`Invalid cycle time for ${mr.material.name}`);
      }
      // Summary
      if (r.summary.total_pass + r.summary.total_warning !== 2) errs.push(`Pass+warning should be 2`);
      if (r.summary.avg_cycle_time_min <= 0) errs.push(`Invalid avg cycle time`);
      return errs;
    },
  },

  {
    name: "Create campaign: cumulative wear tracking",
    run: () => {
      const errs: string[] = [];
      // Create operations with short tool life to force tool changes
      const shortLifeOps: OperationResult[] = [
        { sequence: 1, feature: "face", cutting_speed_m_min: 200, feed_rate_mm_min: 764, spindle_rpm: 1273, mrr_cm3_min: 6.1, cutting_force_n: 1200, tool_life_min: 3, cycle_time_min: 4.0, power_kw: 5.0, warnings: [] },
        { sequence: 2, feature: "pocket", cutting_speed_m_min: 150, feed_rate_mm_min: 380, spindle_rpm: 2984, mrr_cm3_min: 1.5, cutting_force_n: 800, tool_life_min: 2, cycle_time_min: 5.0, power_kw: 3.0, warnings: [] },
      ];
      const config: CampaignConfig = {
        name: "Wear Test",
        materials: [steelMaterial],
        operations: baseOps.slice(0, 2),
        machine: { max_power_kw: 22 },
      };
      const r = createCampaign(config, [shortLifeOps]);
      const safety = r.results[0].cumulative_safety;
      // With 4 min op on 3 min life + 5 min op on 2 min life, should trigger tool changes
      if (safety.tool_changes_required < 1) errs.push(`Expected tool changes, got ${safety.tool_changes_required}`);
      if (safety.total_tool_wear_pct <= 100) errs.push(`Expected >100% wear, got ${safety.total_tool_wear_pct}`);
      return errs;
    },
  },

  {
    name: "Create campaign: quarantine on extreme conditions",
    run: () => {
      const errs: string[] = [];
      // Create very bad operation results
      const badOps: OperationResult[] = [
        { sequence: 1, feature: "slot", cutting_speed_m_min: 500, feed_rate_mm_min: 2000, spindle_rpm: 10000, mrr_cm3_min: 50, cutting_force_n: 5000, tool_life_min: 1, cycle_time_min: 20, power_kw: 30, warnings: ["extreme"] },
      ];
      const config: CampaignConfig = {
        name: "Bad Campaign",
        materials: [titaniumMaterial],
        operations: [{ sequence: 1, feature: "slot", tool_diameter_mm: 16 }],
        machine: { max_power_kw: 10 },
        constraints: { max_cycle_time_min: 5, target_tool_life_min: 30 },
      };
      const r = createCampaign(config, [badOps]);
      const status = r.results[0].status;
      // Should be fail or quarantine due to extreme conditions
      if (status === "pass") errs.push(`Expected fail/quarantine for extreme conditions, got pass`);
      if (r.summary.total_fail + r.summary.total_quarantine < 1) errs.push(`Expected at least 1 fail/quarantine`);
      return errs;
    },
  },

  // === validateCampaign ===
  {
    name: "Validate campaign: valid config",
    run: () => {
      const errs: string[] = [];
      const r = validateCampaign(baseConfig);
      if (!r.valid) errs.push(`Should be valid, errors: ${r.errors.join(", ")}`);
      if (r.errors.length > 0) errs.push(`Should have 0 errors, got ${r.errors.length}`);
      return errs;
    },
  },

  {
    name: "Validate campaign: missing name throws",
    run: () => {
      const errs: string[] = [];
      const r = validateCampaign({ ...baseConfig, name: "" });
      if (r.valid) errs.push("Should be invalid for empty name");
      if (r.errors.length === 0) errs.push("Should have errors");
      return errs;
    },
  },

  {
    name: "Validate campaign: out of bounds parameters",
    run: () => {
      const errs: string[] = [];
      const config: CampaignConfig = {
        name: "Bad Params",
        materials: [steelMaterial],
        operations: [
          { sequence: 1, feature: "face", tool_diameter_mm: 50, cutting_speed_m_min: 5000, feed_per_tooth_mm: 5.0 },
        ],
      };
      const r = validateCampaign(config);
      if (r.valid) errs.push("Should be invalid for out-of-bounds cutting speed and feed");
      if (r.errors.length < 1) errs.push(`Expected errors for bounds violations, got ${r.errors.length}`);
      return errs;
    },
  },

  {
    name: "Validate campaign: duplicate sequences",
    run: () => {
      const errs: string[] = [];
      const config: CampaignConfig = {
        name: "Dup Seq",
        materials: [steelMaterial],
        operations: [
          { sequence: 1, feature: "face", tool_diameter_mm: 50 },
          { sequence: 1, feature: "pocket", tool_diameter_mm: 16 },
        ],
      };
      const r = validateCampaign(config);
      if (r.valid) errs.push("Should be invalid for duplicate sequences");
      return errs;
    },
  },

  // === optimizeCampaign ===
  {
    name: "Optimize campaign: productivity objective",
    run: () => {
      const errs: string[] = [];
      const r = optimizeCampaign(baseConfig, { objective: "productivity" });
      if (!r.optimized_order || r.optimized_order.length === 0) errs.push("Missing optimized order");
      if (r.estimated_improvement_pct === undefined) errs.push("Missing improvement estimate");
      if (r.operation_adjustments.length === 0) errs.push("Expected some adjustments for productivity");
      return errs;
    },
  },

  {
    name: "Optimize campaign: quality objective",
    run: () => {
      const errs: string[] = [];
      const r = optimizeCampaign(baseConfig, { objective: "quality" });
      if (!r.optimized_order || r.optimized_order.length === 0) errs.push("Missing optimized order");
      // Quality should suggest feed reduction
      const feedAdj = r.operation_adjustments.find(a => a.field.includes("feed"));
      if (feedAdj && feedAdj.optimized > feedAdj.original) errs.push("Quality should reduce feed, not increase");
      return errs;
    },
  },

  {
    name: "Optimize campaign: balanced objective",
    run: () => {
      const errs: string[] = [];
      const r = optimizeCampaign(baseConfig, { objective: "balanced" });
      if (!r.optimized_order) errs.push("Missing optimized order");
      if (r.warnings === undefined) errs.push("Missing warnings array");
      return errs;
    },
  },

  // === estimateCycleTime ===
  {
    name: "Cycle time estimate: basic",
    run: () => {
      const errs: string[] = [];
      const r = estimateCycleTime(baseConfig);
      if (r.materials_count !== 2) errs.push(`Wrong materials count: ${r.materials_count}`);
      if (r.operations_per_material !== 3) errs.push(`Wrong ops count: ${r.operations_per_material}`);
      if (r.estimated_total_time_min <= 0) errs.push(`Invalid total time: ${r.estimated_total_time_min}`);
      if (r.time_per_material_min <= 0) errs.push(`Invalid per-material time: ${r.time_per_material_min}`);
      if (r.estimated_cutting_time_min <= 0) errs.push(`Invalid cutting time`);
      return errs;
    },
  },

  {
    name: "Cycle time estimate: with batch size",
    run: () => {
      const errs: string[] = [];
      const config = { ...baseConfig, batch_size: 50 };
      const r = estimateCycleTime(config);
      if (!r.batch_time_min || r.batch_time_min <= 0) errs.push(`Missing or invalid batch time`);
      if (r.batch_time_min && r.batch_time_min <= r.estimated_total_time_min) errs.push(`Batch time should be > single run time`);
      return errs;
    },
  },

  // === Meta ===
  {
    name: "listCampaignActions returns 4 actions",
    run: () => {
      const errs: string[] = [];
      const actions = listCampaignActions();
      if (actions.length !== 4) errs.push(`Expected 4 actions, got ${actions.length}`);
      if (CAMPAIGN_ACTIONS.length !== 4) errs.push(`CAMPAIGN_ACTIONS has ${CAMPAIGN_ACTIONS.length}, expected 4`);
      return errs;
    },
  },

  {
    name: "createCampaign: missing config throws",
    run: () => {
      const errs: string[] = [];
      try {
        createCampaign(null as any, []);
        errs.push("Should have thrown for null config");
      } catch (e: any) {
        if (!e.message.includes("CampaignEngine")) errs.push(`Wrong error prefix: ${e.message}`);
      }
      return errs;
    },
  },

  {
    name: "createCampaign: mismatched material/results count throws",
    run: () => {
      const errs: string[] = [];
      try {
        createCampaign(baseConfig, [makeOpResults(0)]); // 2 materials but only 1 result array
        errs.push("Should have thrown for mismatched counts");
      } catch (e: any) {
        if (!e.message.includes("CampaignEngine")) errs.push(`Wrong error prefix: ${e.message}`);
      }
      return errs;
    },
  },
];

// ── Runner ──────────────────────────────────────────────────────────────────

async function main() {
  let pass = 0;
  let fail = 0;
  const failures: string[] = [];

  for (const t of tests) {
    try {
      const errs = t.run();
      if (errs.length === 0) {
        console.log(`  ✓ ${t.name}`);
        pass++;
      } else {
        console.log(`  ✗ ${t.name}`);
        errs.forEach((e) => console.log(`      ${e}`));
        fail++;
        failures.push(t.name);
      }
    } catch (e: any) {
      console.log(`  ✗ ${t.name} — EXCEPTION: ${e.message}`);
      fail++;
      failures.push(t.name);
    }
  }

  console.log(`\nCampaignEngine: ${pass}/${pass + fail} passed`);
  if (failures.length > 0) {
    console.log("Failures:", failures.join(", "));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
