/**
 * R3-P2: GCodeTemplateEngine Integration Tests
 *
 * Tests parametric G-code generation across 6 controllers and 13 operations.
 *
 * Test cases (12):
 *  1. Fanuc facing → contains G90, G54, tool change, bi-directional passes
 *  2. Fanuc peck drilling → G83 with Q peck depth
 *  3. Siemens drilling → CYCLE81 syntax
 *  4. Heidenhain drilling → CYCL DEF 1.0
 *  5. Fanuc tapping → G84 with M29 rigid tap
 *  6. Fanuc boring → G76 fine bore
 *  7. Thread milling → helical G02/G03 interpolation
 *  8. Circular pocket → spiral-out G02 arcs
 *  9. Profile with cutter comp → G41/G42 + G40 cancel
 * 10. Multi-operation program → header + operations + footer
 * 11. Controller alias resolution → "840d" → Siemens
 * 12. Unknown controller → throws error
 */

import {
  generateGCode,
  generateProgram,
  resolveController,
  listControllers,
  listOperations,
} from "../../src/engines/GCodeTemplateEngine.js";

interface TestCase {
  name: string;
  run: () => string[]; // returns error messages (empty = pass)
}

const TESTS: TestCase[] = [
  // =====================================================
  // 1. Fanuc facing
  // =====================================================
  {
    name: "Fanuc facing: contains G90, tool change, linear moves",
    run: () => {
      const errs: string[] = [];
      const r = generateGCode("fanuc", "facing", {
        rpm: 800,
        feed_rate: 500,
        tool_number: 1,
        z_depth: -0.5,
        x_end: 100,
        y_end: 50,
        tool_diameter: 50,
      });
      if (!r.gcode.includes("G90")) errs.push("Missing G90 (absolute mode)");
      if (!r.gcode.includes("T1")) errs.push("Missing tool call T1");
      if (!r.gcode.includes("M6")) errs.push("Missing M6 (tool change)");
      if (!r.gcode.includes("S800")) errs.push("Missing S800 spindle speed");
      if (!r.gcode.includes("M3")) errs.push("Missing M3 (spindle CW)");
      if (!r.gcode.includes("G1") && !r.gcode.includes("G01")) errs.push("Missing linear move");
      if (r.controller !== "Fanuc") errs.push(`Expected Fanuc, got ${r.controller}`);
      if (r.controller_family !== "fanuc") errs.push(`Expected fanuc family, got ${r.controller_family}`);
      if (r.line_count < 5) errs.push(`Expected >=5 lines, got ${r.line_count}`);
      if (r.operation !== "facing") errs.push(`Expected facing, got ${r.operation}`);
      return errs;
    },
  },

  // =====================================================
  // 2. Fanuc peck drilling (G83)
  // =====================================================
  {
    name: "Fanuc peck drilling: G83 with Q peck depth",
    run: () => {
      const errs: string[] = [];
      const r = generateGCode("fanuc", "peck_drilling", {
        rpm: 1200,
        feed_rate: 80,
        tool_number: 3,
        z_depth: -25,
        peck_depth: 5,
        coolant: "flood",
      });
      if (!r.gcode.includes("G83")) errs.push("Missing G83 peck drill cycle");
      if (!r.gcode.includes("Q")) errs.push("Missing Q peck depth parameter");
      if (!r.gcode.includes("G80")) errs.push("Missing G80 cycle cancel");
      if (!r.gcode.includes("T3")) errs.push("Missing tool T3");
      if (!r.gcode.includes("S1200")) errs.push("Missing S1200 speed");
      if (r.operation !== "peck_drilling") errs.push(`Wrong op: ${r.operation}`);
      return errs;
    },
  },

  // =====================================================
  // 3. Siemens standard drilling (CYCLE81)
  // =====================================================
  {
    name: "Siemens drilling: CYCLE81 syntax",
    run: () => {
      const errs: string[] = [];
      const r = generateGCode("siemens", "drilling", {
        rpm: 1500,
        feed_rate: 100,
        z_depth: -15,
      });
      if (!r.gcode.includes("CYCLE81")) errs.push("Missing CYCLE81");
      if (r.controller_family !== "siemens") errs.push(`Expected siemens, got ${r.controller_family}`);
      // Siemens uses ; for comments
      if (!r.gcode.includes(";")) errs.push("Missing ; comment syntax");
      return errs;
    },
  },

  // =====================================================
  // 4. Heidenhain drilling (CYCL DEF)
  // =====================================================
  {
    name: "Heidenhain drilling: CYCL DEF 1.0 syntax",
    run: () => {
      const errs: string[] = [];
      const r = generateGCode("heidenhain", "drilling", {
        rpm: 1200,
        feed_rate: 80,
        z_depth: -20,
      });
      if (!r.gcode.includes("CYCL DEF")) errs.push("Missing CYCL DEF");
      if (!r.gcode.includes("CYCL CALL")) errs.push("Missing CYCL CALL");
      if (!r.gcode.includes("TOOL CALL")) errs.push("Missing TOOL CALL");
      if (r.controller_family !== "heidenhain") errs.push(`Expected heidenhain, got ${r.controller_family}`);
      return errs;
    },
  },

  // =====================================================
  // 5. Fanuc tapping (G84)
  // =====================================================
  {
    name: "Fanuc tapping: G84 rigid tap with pitch",
    run: () => {
      const errs: string[] = [];
      const r = generateGCode("fanuc", "tapping", {
        rpm: 500,
        feed_rate: 500, // will be overridden by S*pitch
        pitch: 1.5,
        z_depth: -20,
      });
      if (!r.gcode.includes("G84")) errs.push("Missing G84 tapping cycle");
      // Rigid tapping should show M29 or use calculated F = S * pitch
      if (!r.gcode.includes("M29") && !r.gcode.includes("F750")) {
        // F = 500 rpm * 1.5 pitch = 750
        errs.push("Missing M29 or calculated F=S*pitch");
      }
      if (r.operation !== "tapping") errs.push(`Wrong op: ${r.operation}`);
      return errs;
    },
  },

  // =====================================================
  // 6. Fanuc boring (G76)
  // =====================================================
  {
    name: "Fanuc boring: G76 fine bore with shift",
    run: () => {
      const errs: string[] = [];
      const r = generateGCode("fanuc", "boring", {
        rpm: 800,
        feed_rate: 50,
        z_depth: -30,
        shift_amount: 0.5,
      });
      if (!r.gcode.includes("G76")) errs.push("Missing G76 fine bore cycle");
      if (!r.gcode.includes("G80")) errs.push("Missing G80 cycle cancel");
      if (r.operation !== "boring") errs.push(`Wrong op: ${r.operation}`);
      return errs;
    },
  },

  // =====================================================
  // 7. Thread milling — helical interpolation
  // =====================================================
  {
    name: "Thread milling: helical G02/G03 interpolation",
    run: () => {
      const errs: string[] = [];
      const r = generateGCode("fanuc", "thread_milling", {
        rpm: 2000,
        feed_rate: 200,
        thread_diameter: 20,
        thread_pitch: 2.0,
        thread_depth: 15,
        tool_diameter: 6,
        thread_direction: "right",
      });
      // Should contain helical arc (G02 or G03)
      if (!r.gcode.includes("G02") && !r.gcode.includes("G03")) {
        errs.push("Missing helical interpolation (G02/G03)");
      }
      if (r.operation !== "thread_milling") errs.push(`Wrong op: ${r.operation}`);
      // Notes should mention thread specs
      if (r.notes.length === 0) errs.push("Expected notes about thread specs");
      return errs;
    },
  },

  // =====================================================
  // 8. Circular pocket
  // =====================================================
  {
    name: "Circular pocket: spiral-out with arcs",
    run: () => {
      const errs: string[] = [];
      const r = generateGCode("fanuc", "circular_pocket", {
        rpm: 1500,
        feed_rate: 400,
        pocket_diameter: 40,
        pocket_depth: 10,
        tool_diameter: 10,
      });
      if (!r.gcode.includes("G02") && !r.gcode.includes("G03") && !r.gcode.includes("G2") && !r.gcode.includes("G3")) {
        errs.push("Missing circular arc moves for pocket");
      }
      if (r.operation !== "circular_pocket") errs.push(`Wrong op: ${r.operation}`);
      if (r.line_count < 5) errs.push(`Expected >=5 lines, got ${r.line_count}`);
      return errs;
    },
  },

  // =====================================================
  // 9. Profile with cutter comp
  // =====================================================
  {
    name: "Profile: cutter comp G41/G42 with approach + cancel",
    run: () => {
      const errs: string[] = [];
      const r = generateGCode("fanuc", "profile", {
        rpm: 1000,
        feed_rate: 300,
        z_depth: -5,
        comp_side: "left",
        profile_points: [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
          { x: 50, y: 30 },
          { x: 0, y: 30 },
        ],
      });
      if (!r.gcode.includes("G41")) errs.push("Missing G41 (left cutter comp)");
      if (!r.gcode.includes("G40")) errs.push("Missing G40 (cancel comp)");
      if (r.operation !== "profile") errs.push(`Wrong op: ${r.operation}`);
      return errs;
    },
  },

  // =====================================================
  // 10. Multi-operation program
  // =====================================================
  {
    name: "Multi-op program: header + facing + drilling + footer",
    run: () => {
      const errs: string[] = [];
      const r = generateProgram("haas", [
        { operation: "program_header", params: { rpm: 0, feed_rate: 0, program_number: 1001, program_name: "TEST_PART" } },
        { operation: "facing", params: { rpm: 800, feed_rate: 500, tool_number: 1, z_depth: -0.5 } },
        { operation: "peck_drilling", params: { rpm: 1500, feed_rate: 100, tool_number: 2, z_depth: -20, peck_depth: 5 } },
        { operation: "program_footer", params: { rpm: 0, feed_rate: 0 } },
      ]);
      if (r.operation !== "program") errs.push(`Expected 'program', got ${r.operation}`);
      if (!r.gcode.includes("O1001") && !r.gcode.includes("1001")) errs.push("Missing program number");
      if (!r.gcode.includes("M30")) errs.push("Missing M30 program end");
      if (!r.gcode.includes("G83")) errs.push("Missing G83 peck drill in multi-op");
      if (r.line_count < 10) errs.push(`Expected >=10 lines for multi-op, got ${r.line_count}`);
      return errs;
    },
  },

  // =====================================================
  // 11. Controller alias resolution
  // =====================================================
  {
    name: "Controller alias: '840d' resolves to Siemens",
    run: () => {
      const errs: string[] = [];
      const ctrl = resolveController("840d");
      if (ctrl.family !== "siemens") errs.push(`Expected siemens, got ${ctrl.family}`);
      // Also test case-insensitive
      const ctrl2 = resolveController("FANUC");
      if (ctrl2.family !== "fanuc") errs.push(`Expected fanuc for 'FANUC', got ${ctrl2.family}`);
      // Test Haas alias
      const ctrl3 = resolveController("haas vf");
      if (ctrl3.family !== "haas") errs.push(`Expected haas for 'haas vf', got ${ctrl3.family}`);
      return errs;
    },
  },

  // =====================================================
  // 12. Unknown controller → error
  // =====================================================
  {
    name: "Unknown controller: throws descriptive error",
    run: () => {
      const errs: string[] = [];
      try {
        resolveController("mitsubishi");
        errs.push("Should have thrown for unknown controller");
      } catch (e: any) {
        if (!e.message.includes("Unknown controller")) errs.push(`Wrong error: ${e.message}`);
      }
      return errs;
    },
  },

  // =====================================================
  // 13. Input validation: rejects zero RPM
  // =====================================================
  {
    name: "Validation: rejects zero RPM",
    run: () => {
      const errs: string[] = [];
      try {
        generateGCode("fanuc", "drilling", { rpm: 0, feed_rate: 100, z_depth: -10 });
        errs.push("Should have thrown for zero RPM");
      } catch (e: any) {
        if (!e.message.includes("Invalid RPM")) errs.push(`Wrong error: ${e.message}`);
      }
      return errs;
    },
  },

  // =====================================================
  // 14. Input validation: rejects negative feed rate
  // =====================================================
  {
    name: "Validation: rejects negative feed rate",
    run: () => {
      const errs: string[] = [];
      try {
        generateGCode("fanuc", "facing", { rpm: 1000, feed_rate: -50 });
        errs.push("Should have thrown for negative feed rate");
      } catch (e: any) {
        if (!e.message.includes("Invalid feed rate")) errs.push(`Wrong error: ${e.message}`);
      }
      return errs;
    },
  },

  // =====================================================
  // 15. Input validation: rejects tool too large for thread
  // =====================================================
  {
    name: "Validation: rejects tool_dia >= thread_dia",
    run: () => {
      const errs: string[] = [];
      try {
        generateGCode("fanuc", "thread_milling", {
          rpm: 2000,
          feed_rate: 200,
          thread_diameter: 10,
          tool_diameter: 12, // tool bigger than thread
        });
        errs.push("Should have thrown for oversized tool");
      } catch (e: any) {
        if (!e.message.includes("Tool diameter")) errs.push(`Wrong error: ${e.message}`);
      }
      return errs;
    },
  },

  // =====================================================
  // 16. Validation: positive z_depth triggers warning
  // =====================================================
  {
    name: "Validation: positive z_depth produces warning",
    run: () => {
      const errs: string[] = [];
      const r = generateGCode("fanuc", "drilling", {
        rpm: 1200,
        feed_rate: 100,
        z_depth: 5, // positive — unusual
      });
      if (!r.warnings.some((w) => w.includes("z_depth is positive"))) {
        errs.push("Expected warning about positive z_depth");
      }
      return errs;
    },
  },
];

// ============================================================================
// UTILITY: List test coverage summary
// ============================================================================

const COVERAGE_SUMMARY = {
  controllers_tested: ["fanuc", "siemens", "heidenhain", "haas"],
  operations_tested: [
    "facing", "drilling", "peck_drilling", "tapping", "boring",
    "thread_milling", "circular_pocket", "profile",
    "program_header", "program_footer",
  ],
  features_tested: [
    "controller alias resolution",
    "case-insensitive controller lookup",
    "unknown controller error",
    "multi-operation program generation",
    "controller-specific canned cycles",
    "cutter compensation",
    "helical interpolation",
    "input validation (RPM, feed rate, tool geometry)",
    "safety warnings (positive z_depth)",
  ],
};

// ============================================================================
// RUNNER
// ============================================================================

async function runTests(): Promise<void> {
  console.log("=== R3-P2 G-Code Template Engine Tests ===\n");
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

  console.log("\nCoverage summary:");
  console.log(`  Controllers: ${COVERAGE_SUMMARY.controllers_tested.join(", ")}`);
  console.log(`  Operations: ${COVERAGE_SUMMARY.operations_tested.join(", ")}`);
  console.log(`  Features: ${COVERAGE_SUMMARY.features_tested.length} features verified`);
  console.log("\nAll G-code template tests passed!");
}

runTests().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
