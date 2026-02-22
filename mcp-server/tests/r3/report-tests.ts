/**
 * R3-P2 ReportRenderer Integration Tests
 * Tests all 7 report types + dispatcher + edge cases
 */
import {
  renderReport,
  listReportTypes,
  REPORT_TYPES,
} from "../../src/engines/ReportRenderer.js";

interface TestCase {
  name: string;
  run: () => string[];
}

const tests: TestCase[] = [
  // === Report Type 1: Setup Sheet ===
  {
    name: "Setup sheet: basic render",
    run: () => {
      const errs: string[] = [];
      const r = renderReport("setup_sheet", {
        part_name: "Bracket A-100",
        material: "AISI 1045",
        iso_group: "P",
        machine: "DMG MORI DMU 50",
        tools: [
          { sequence: 1, type: "End Mill", diameter_mm: 12, flutes: 4, coating: "TiAlN" },
          { sequence: 2, type: "Drill", diameter_mm: 8.5, coating: "TiN" },
        ],
        operations: [
          {
            sequence: 1, feature: "pocket",
            phases: [
              { type: "roughing", cutting_speed: 180, feed_per_tooth: 0.08, axial_depth: 3, radial_depth: 6, spindle_speed: 4775, feed_rate: 1528 },
              { type: "finishing", cutting_speed: 220, feed_per_tooth: 0.05, axial_depth: 0.5, radial_depth: 12, spindle_speed: 5836, feed_rate: 1167 },
            ],
            coolant: { strategy: "flood", pressure_bar: 20 },
            cycle_time_min: 4.5,
          },
        ],
        safety_notes: ["Check tool runout before start"],
        total_cycle_time_min: 4.5,
      });
      if (r.type !== "setup_sheet") errs.push(`Wrong type: ${r.type}`);
      if (!r.markdown.includes("Bracket A-100")) errs.push("Missing part name in markdown");
      if (!r.markdown.includes("AISI 1045")) errs.push("Missing material in markdown");
      if (!r.markdown.includes("End Mill")) errs.push("Missing tool info");
      if (!r.markdown.includes("roughing")) errs.push("Missing phase info");
      if (r.line_count < 10) errs.push(`Too few lines: ${r.line_count}`);
      if (r.sections.length < 2) errs.push(`Too few sections: ${r.sections.length}`);
      return errs;
    },
  },

  // === Report Type 2: Process Plan ===
  {
    name: "Process plan: multi-step",
    run: () => {
      const errs: string[] = [];
      const r = renderReport("process_plan", {
        part_name: "Housing-200",
        material: "6061-T6",
        operations: [
          { step: 1, description: "Face top surface", machine: "VMC", tools_required: ["50mm facemill"], estimated_time_min: 2 },
          { step: 2, description: "Drill 4x M8 holes", tools_required: ["6.8mm drill", "M8 tap"], quality_checks: ["Check hole depth"], estimated_time_min: 5 },
          { step: 3, description: "Profile contour", parameters: { "Vc": "200 m/min", "ap": "3 mm" }, estimated_time_min: 8 },
        ],
        total_time_min: 15,
      });
      if (r.type !== "process_plan") errs.push(`Wrong type: ${r.type}`);
      if (!r.markdown.includes("Housing-200")) errs.push("Missing part name");
      if (!r.markdown.includes("Face top surface")) errs.push("Missing step description");
      if (!r.markdown.includes("M8 tap")) errs.push("Missing tool reference");
      return errs;
    },
  },

  // === Report Type 3: Cost Estimate ===
  {
    name: "Cost estimate: batch calculation",
    run: () => {
      const errs: string[] = [];
      const r = renderReport("cost_estimate", {
        part_name: "Widget-300",
        quantity: 100,
        material_cost: 5.50,
        machine_cost_per_hour: 85,
        cycle_time_min: 12,
        setup_time_min: 30,
        tool_cost_per_part: 1.20,
        labor_cost_per_hour: 45,
      });
      if (r.type !== "cost_estimate") errs.push(`Wrong type: ${r.type}`);
      if (!r.markdown.includes("Widget-300")) errs.push("Missing part name");
      if (!r.markdown.includes("100")) errs.push("Missing quantity");
      // Should have cost values
      if (!r.markdown.includes("$") && !r.markdown.includes("cost")) errs.push("Missing cost values");
      return errs;
    },
  },

  // === Report Type 4: Tool List ===
  {
    name: "Tool list: formatted table",
    run: () => {
      const errs: string[] = [];
      const r = renderReport("tool_list", {
        part_name: "Test Part",
        tools: [
          { position: 1, description: "Roughing endmill", type: "endmill", diameter_mm: 16, manufacturer: "Sandvik", catalog_number: "R390-016A16", coating: "TiAlN" },
          { position: 2, description: "Finishing endmill", type: "endmill", diameter_mm: 10, coating: "AlCrN" },
          { position: 3, description: "Center drill", type: "drill", diameter_mm: 3.15 },
        ],
      });
      if (r.type !== "tool_list") errs.push(`Wrong type: ${r.type}`);
      if (!r.markdown.includes("Sandvik")) errs.push("Missing manufacturer");
      if (!r.markdown.includes("R390")) errs.push("Missing catalog number");
      if (!r.markdown.includes("|")) errs.push("Missing table formatting");
      return errs;
    },
  },

  // === Report Type 5: Inspection Plan ===
  {
    name: "Inspection plan: critical features",
    run: () => {
      const errs: string[] = [];
      const r = renderReport("inspection_plan", {
        part_name: "Shaft-400",
        part_number: "SH-400-REV-C",
        features: [
          { feature_id: "D1", description: "Main bore", nominal: 25.000, tolerance: "H7", measurement_method: "bore gauge", frequency: "100%", critical: true },
          { feature_id: "D2", description: "Shoulder diameter", nominal: 40.000, tolerance: "±0.05", measurement_method: "micrometer", frequency: "1 in 5" },
          { feature_id: "L1", description: "Overall length", nominal: 120.000, tolerance: "±0.1", measurement_method: "caliper" },
        ],
        general_tolerances: "ISO 2768-mK",
        surface_finish_spec: "Ra 1.6 μm max",
      });
      if (r.type !== "inspection_plan") errs.push(`Wrong type: ${r.type}`);
      if (!r.markdown.includes("Shaft-400")) errs.push("Missing part name");
      if (!r.markdown.includes("H7")) errs.push("Missing tolerance spec");
      if (!r.markdown.includes("bore gauge")) errs.push("Missing measurement method");
      // Critical feature should be highlighted somehow
      if (!r.markdown.toLowerCase().includes("critical")) errs.push("No critical feature indication");
      return errs;
    },
  },

  // === Report Type 6: Alarm Report ===
  {
    name: "Alarm report: full diagnosis",
    run: () => {
      const errs: string[] = [];
      const r = renderReport("alarm_report", {
        alarm_code: "SV0401",
        alarm_name: "Servo Alarm: X-axis Position Error",
        machine: "Fanuc 0i-MD",
        severity: "ERROR",
        probable_causes: ["Servo motor overload", "Encoder cable fault", "Ball screw binding"],
        remediation_steps: ["Check servo motor connections", "Inspect encoder cable", "Verify ball screw lubrication"],
        prevention_tips: ["Regular lubrication schedule", "Cable inspection quarterly"],
      });
      if (r.type !== "alarm_report") errs.push(`Wrong type: ${r.type}`);
      if (!r.markdown.includes("SV0401")) errs.push("Missing alarm code");
      if (!r.markdown.includes("Servo motor overload")) errs.push("Missing probable cause");
      if (!r.markdown.includes("Check servo motor")) errs.push("Missing remediation step");
      return errs;
    },
  },

  // === Report Type 7: Speed/Feed Card ===
  {
    name: "Speed/feed card: compact format",
    run: () => {
      const errs: string[] = [];
      const r = renderReport("speed_feed_card", {
        material: "AISI 4140",
        iso_group: "P",
        operations: [
          { operation: "Face milling", tool_diameter_mm: 50, cutting_speed_m_min: 200, feed_per_tooth_mm: 0.15, axial_depth_mm: 2, radial_depth_mm: 40, spindle_speed_rpm: 1273, feed_rate_mm_min: 764, coolant: "flood" },
          { operation: "Slot milling", tool_diameter_mm: 16, cutting_speed_m_min: 150, feed_per_tooth_mm: 0.06, axial_depth_mm: 8, radial_depth_mm: 16, spindle_speed_rpm: 2984, feed_rate_mm_min: 716, coolant: "flood" },
        ],
      });
      if (r.type !== "speed_feed_card") errs.push(`Wrong type: ${r.type}`);
      if (!r.markdown.includes("AISI 4140")) errs.push("Missing material");
      if (!r.markdown.includes("Face milling")) errs.push("Missing operation");
      if (!r.markdown.includes("200")) errs.push("Missing cutting speed value");
      return errs;
    },
  },

  // === Meta & Validation ===
  {
    name: "listReportTypes returns 7 types",
    run: () => {
      const errs: string[] = [];
      const types = listReportTypes();
      if (types.length !== 7) errs.push(`Expected 7 report types, got ${types.length}`);
      if (REPORT_TYPES.length !== 7) errs.push(`REPORT_TYPES constant has ${REPORT_TYPES.length}, expected 7`);
      return errs;
    },
  },
  {
    name: "Unknown report type throws",
    run: () => {
      const errs: string[] = [];
      try {
        renderReport("nonexistent_type", {});
        errs.push("Should have thrown for unknown type");
      } catch (e: any) {
        if (!e.message.includes("ReportRenderer")) errs.push(`Wrong error prefix: ${e.message}`);
      }
      return errs;
    },
  },
  {
    name: "Missing required field throws",
    run: () => {
      const errs: string[] = [];
      try {
        renderReport("setup_sheet", { material: "steel" });
        errs.push("Should have thrown for missing part_name");
      } catch (e: any) {
        if (!e.message.includes("ReportRenderer")) errs.push(`Wrong error prefix: ${e.message}`);
      }
      return errs;
    },
  },
  {
    name: "Report includes footer",
    run: () => {
      const errs: string[] = [];
      const r = renderReport("alarm_report", { alarm_code: "TEST001" });
      if (!r.markdown.includes("PRISM")) errs.push("Missing PRISM footer");
      return errs;
    },
  },

  // === Phase 8A: Cost sensitivity analysis ===
  {
    name: "Cost estimate: sensitivity analysis section",
    run: () => {
      const errs: string[] = [];
      const r = renderReport("cost_estimate", {
        part_name: "Test Part",
        quantity: 100,
        material_cost: 5.00,
        machine_cost_per_hour: 120,
        cycle_time_min: 8,
        tool_cost_per_part: 1.50,
        labor_cost_per_hour: 45,
      });
      if (!r.markdown.includes("Cost Sensitivity")) errs.push("Missing sensitivity section");
      if (!r.markdown.includes("HIGH") || !r.markdown.includes("MEDIUM") || !r.markdown.includes("LOW")) {
        // At least some sensitivity levels should appear
        if (!r.markdown.includes("HIGH") && !r.markdown.includes("MEDIUM") && !r.markdown.includes("LOW")) {
          errs.push("No sensitivity levels shown");
        }
      }
      return errs;
    },
  },

  // === Phase 8A: Cost outlier warnings ===
  {
    name: "Cost estimate: zero material cost warning",
    run: () => {
      const errs: string[] = [];
      const r = renderReport("cost_estimate", {
        part_name: "Free Material Part",
        quantity: 10,
        material_cost: 0,
        cycle_time_min: 5,
      });
      if (!r.warnings.some(w => w.includes("$0.00"))) {
        errs.push("Should warn about zero material cost");
      }
      return errs;
    },
  },

  // === Phase 8B: Alarm report with controller-specific fields ===
  {
    name: "Alarm report: extended controller-specific fields",
    run: () => {
      const errs: string[] = [];
      const r = renderReport("alarm_report", {
        alarm_code: "SV0445",
        alarm_name: "Servo: X Position Error Excessive",
        controller: "FANUC",
        controller_family: "FANUC 0i-MD",
        severity: "critical",
        alarm_category: "Servo",
        axis_affected: "X",
        requires_power_cycle: true,
        mttr_minutes: 45,
        probable_causes: ["Servo motor overload"],
        remediation_steps: ["Check motor connections"],
      });
      if (!r.markdown.includes("FANUC")) errs.push("Missing controller");
      if (!r.markdown.includes("Servo")) errs.push("Missing alarm category");
      if (!r.markdown.includes("Power Cycle Required")) errs.push("Missing power cycle flag");
      if (!r.markdown.includes("45 min")) errs.push("Missing MTTR");
      return errs;
    },
  },

  // === Phase 8C: Inspection plan with IT grade ===
  {
    name: "Inspection plan: IT grade column for numeric tolerances",
    run: () => {
      const errs: string[] = [];
      const r = renderReport("inspection_plan", {
        part_name: "Precision Shaft",
        features: [
          {
            feature_id: "F1",
            description: "Outer diameter",
            nominal: 50,
            tolerance: "±0.025 mm",
            measurement_method: "CMM",
            frequency: "100%",
            critical: true,
          },
          {
            feature_id: "F2",
            description: "Length",
            nominal: 100,
            tolerance: "±0.5 mm",
            measurement_method: "caliper",
            frequency: "1 in 10",
            critical: false,
          },
        ],
      });
      if (!r.markdown.includes("IT Grade")) errs.push("Missing IT Grade column header");
      // ±0.025mm on 50mm nominal should be around IT6-IT7
      if (!r.markdown.includes("IT")) errs.push("No IT grade values computed");
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

  console.log(`\nReportRenderer: ${pass}/${pass + fail} passed`);
  if (failures.length > 0) {
    console.log("Failures:", failures.join(", "));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
