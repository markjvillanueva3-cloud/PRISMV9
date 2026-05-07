/**
 * LatheProgramSMTEncoderEngine Tests
 *
 * U-LTH63: SMT-LIB2 encoder for formal verification
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheProgramSMTEncoderEngine } from "../engines/LatheProgramSMTEncoderEngine.js";

describe("LatheProgramSMTEncoderEngine", () => {
  beforeEach(() => {
    latheProgramSMTEncoderEngine.setConfig({
      x_min: -50,
      x_max: 300,
      z_min: -500,
      z_max: 50,
      f_max: 10000,
      s_max: 6000,
      z_safe: 10,
      x_home: 0,
      z_home: 0,
    });
  });

  describe("G-Code Parsing", () => {
    it("parses simple G-code program", () => {
      const program = `
        G21 G90
        G0 X100 Z50
        G1 Z-50 F200
        M30
      `;

      const blocks = latheProgramSMTEncoderEngine.parseGCode(program);

      expect(blocks.length).toBe(4);
      expect(blocks[0].g_codes).toContain("G21");
      expect(blocks[0].g_codes).toContain("G90");
      expect(blocks[1].x).toBe(100);
      expect(blocks[1].z).toBe(50);
      expect(blocks[2].f).toBe(200);
      expect(blocks[3].m_codes).toContain("M30");
    });

    it("parses negative coordinates", () => {
      const program = "G1 X-10.5 Z-100.25";
      const blocks = latheProgramSMTEncoderEngine.parseGCode(program);

      expect(blocks[0].x).toBe(-10.5);
      expect(blocks[0].z).toBe(-100.25);
    });

    it("parses tool and spindle", () => {
      const program = "T0101 S1500 M3";
      const blocks = latheProgramSMTEncoderEngine.parseGCode(program);

      expect(blocks[0].t).toBe(101);
      expect(blocks[0].s).toBe(1500);
      expect(blocks[0].m_codes).toContain("M3");
    });

    it("parses arc parameters I K R", () => {
      const program = "G2 X50 Z-20 I10 K-15";
      const blocks = latheProgramSMTEncoderEngine.parseGCode(program);

      expect(blocks[0].g_codes).toContain("G2");
      expect(blocks[0].i).toBe(10);
      expect(blocks[0].k).toBe(-15);
    });

    it("ignores comments", () => {
      const program = `
        (COMMENT LINE)
        G0 X10
        (ANOTHER COMMENT)
        G1 Z-5
      `;
      const blocks = latheProgramSMTEncoderEngine.parseGCode(program);

      expect(blocks.length).toBe(2);
    });

    it("ignores program number and percent signs", () => {
      const program = `
        %
        O1234
        G0 X0 Z0
        M30
        %
      `;
      const blocks = latheProgramSMTEncoderEngine.parseGCode(program);

      expect(blocks.length).toBe(2);
      expect(blocks[0].g_codes).toContain("G0");
    });
  });

  describe("SMT Encoding", () => {
    it("encodes simple program to SMT", () => {
      const program = `
        G21 G90
        G0 X50 Z10
        G1 Z-30 F100
      `;

      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-001", program);

      expect(result.success).toBe(true);
      expect(result.proof_input).not.toBeNull();
      expect(result.proof_input!.block_count).toBe(3);
      expect(result.stats.constraints_generated).toBeGreaterThan(0);
    });

    it("generates variables for each block", () => {
      const program = "G0 X10\nG1 Z-5";
      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-002", program);

      const xVars = result.proof_input!.variables.filter(v => v.name.startsWith("x_"));
      const zVars = result.proof_input!.variables.filter(v => v.name.startsWith("z_"));

      expect(xVars.length).toBe(3); // x_0, x_1, x_2
      expect(zVars.length).toBe(3);
    });

    it("generates initial state constraints", () => {
      const program = "G0 X10";
      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-003", program);

      const initConstraints = result.proof_input!.constraints.filter(c => c.id.startsWith("init_"));

      expect(initConstraints.length).toBe(5); // x, z, f, s, t
    });

    it("generates transition constraints for X moves", () => {
      const program = "G90 G0 X100";
      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-004", program);

      const xTransition = result.proof_input!.constraints.find(c => c.id === "trans_x_1");

      expect(xTransition).toBeDefined();
      expect(xTransition!.constant).toBe(100);
    });

    it("handles incremental mode G91", () => {
      const program = `
        G91
        G0 X10 Z-5
      `;
      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-005", program);

      const xTransition = result.proof_input!.constraints.find(c => c.id === "trans_x_2");

      expect(xTransition).toBeDefined();
      expect(xTransition!.variables).toContain("x_2");
      expect(xTransition!.variables).toContain("x_1");
    });

    it("generates envelope constraints", () => {
      const program = "G0 X50";
      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-006", program);

      const envConstraints = result.proof_input!.constraints.filter(c => c.id.startsWith("env_"));

      expect(envConstraints.length).toBeGreaterThan(0);
      expect(envConstraints.some(c => c.id.includes("x_min"))).toBe(true);
      expect(envConstraints.some(c => c.id.includes("x_max"))).toBe(true);
    });

    it("generates feedrate limit constraints", () => {
      const program = "G1 X10 F500";
      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-007", program);

      const feedConstraints = result.proof_input!.constraints.filter(c => c.id.startsWith("feed_limit"));

      expect(feedConstraints.length).toBeGreaterThan(0);
    });

    it("generates spindle limit constraints", () => {
      const program = "S3000 M3";
      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-008", program);

      const spindleConstraints = result.proof_input!.constraints.filter(c => c.id.startsWith("spindle_limit"));

      expect(spindleConstraints.length).toBeGreaterThan(0);
    });

    it("generates rapid safety constraints for G0", () => {
      const program = "G0 X50 Z10";
      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-009", program);

      const rapidConstraints = result.proof_input!.constraints.filter(c => c.id.startsWith("rapid_safe"));

      expect(rapidConstraints.length).toBeGreaterThan(0);
    });

    it("generates tool change safety constraints", () => {
      const program = `
        T0101
        G0 X50
        T0202
      `;
      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-010", program);

      const toolChangeConstraints = result.proof_input!.constraints.filter(c => c.id.startsWith("tool_change_safe"));

      expect(toolChangeConstraints.length).toBe(2); // T01->T0101 and T0101->T0202
    });

    it("generates home constraint for M30", () => {
      const program = `
        G0 X50
        G0 X0 Z0
        M30
      `;
      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-011", program);

      const homeConstraint = result.proof_input!.constraints.find(c => c.id === "home_z_end");

      expect(homeConstraint).toBeDefined();
    });

    it("handles unit conversion G20/G21", () => {
      const program = `
        G20
        G0 X1.0
      `;
      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-012", program);

      const xTransition = result.proof_input!.constraints.find(c => c.id === "trans_x_2");

      expect(xTransition).toBeDefined();
      expect(xTransition!.constant).toBeCloseTo(25.4, 1); // 1 inch = 25.4mm
    });
  });

  describe("Arc Encoding", () => {
    it("flags arc constraints as nonlinear", () => {
      const program = "G2 X50 Z-20 I10 K-15";
      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-ARC-001", program);

      const arcConstraints = result.proof_input!.constraints.filter(c => c.id.startsWith("arc_"));

      expect(arcConstraints.some(c => c.type === "nonlinear")).toBe(true);
    });

    it("generates warning for arc constraints", () => {
      const program = "G2 X50 Z-20 I10 K-15";
      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-ARC-002", program);

      expect(result.warnings.some(w => w.includes("QF_NRA"))).toBe(true);
    });
  });

  describe("SMT-LIB2 Output", () => {
    it("generates valid SMT-LIB2 preamble", () => {
      const program = "G0 X10";
      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-SMT-001", program);

      expect(result.proof_input!.smt_lib2_preamble).toContain("(set-logic");
      expect(result.proof_input!.smt_lib2_preamble).toContain("(declare-const x_0 Real)");
      expect(result.proof_input!.smt_lib2_preamble).toContain("(declare-const z_0 Real)");
    });

    it("generates valid SMT-LIB2 body", () => {
      const program = "G0 X10";
      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-SMT-002", program);

      expect(result.proof_input!.smt_lib2_body).toContain("(assert");
      expect(result.proof_input!.smt_lib2_body).toContain("(check-sat)");
      expect(result.proof_input!.smt_lib2_body).toContain("(get-model)");
    });

    it("generates full SMT-LIB2 output", () => {
      const program = "G0 X10";
      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-SMT-003", program);

      const full = latheProgramSMTEncoderEngine.getFullSMTLIB2(result.proof_input!);

      expect(full).toContain("(set-logic");
      expect(full).toContain("(assert");
      expect(full).toContain("(check-sat)");
    });
  });

  describe("Assertions", () => {
    it("generates assertions for all constraints", () => {
      const program = "G0 X50 Z10";
      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-ASSERT-001", program);

      expect(result.proof_input!.assertions.length).toBe(result.proof_input!.constraints.length);
    });

    it("infers property types correctly", () => {
      const program = `
        G0 X50 Z10
        G1 Z-30 F200 S1500
        T0202
        M30
      `;
      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-ASSERT-002", program);

      const types = result.proof_input!.assertions.map(a => a.property_type);

      expect(types).toContain("envelope_x");
      expect(types).toContain("envelope_z");
      expect(types).toContain("feedrate_limit");
      expect(types).toContain("spindle_limit");
      expect(types).toContain("transition");
    });
  });

  describe("Configuration", () => {
    it("applies custom envelope config", () => {
      latheProgramSMTEncoderEngine.setConfig({
        x_min: 0,
        x_max: 500,
        z_min: -600,
        z_max: 100,
      });

      const program = "G0 X100";
      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-CFG-001", program);

      const xMaxConstraint = result.proof_input!.constraints.find(c => c.id.includes("x_max"));

      expect(xMaxConstraint!.constant).toBe(500);
    });

    it("returns current config", () => {
      const config = latheProgramSMTEncoderEngine.getConfig();

      expect(config.f_max).toBe(10000);
      expect(config.s_max).toBe(6000);
    });

    it("can disable arc constraints", () => {
      latheProgramSMTEncoderEngine.setConfig({ include_arc_constraints: false });

      const program = "G2 X50 Z-20 I10 K-15";
      const result = latheProgramSMTEncoderEngine.encodeFromString("TEST-CFG-002", program);

      const arcConstraints = result.proof_input!.constraints.filter(c => c.id.startsWith("arc_"));

      expect(arcConstraints.length).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("returns error for empty program", () => {
      const result = latheProgramSMTEncoderEngine.encodeFromString("EMPTY", "");

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Empty program");
    });

    it("handles program with only comments", () => {
      const result = latheProgramSMTEncoderEngine.encodeFromString("COMMENTS", "(COMMENT ONLY)");

      expect(result.success).toBe(false);
    });
  });

  describe("Performance", () => {
    it("encodes 500-block program in under 100ms", () => {
      const lines: string[] = ["G21 G90"];
      for (let i = 0; i < 498; i++) {
        lines.push(`G1 X${i % 100} Z${-(i % 200)} F${100 + (i % 50)}`);
      }
      lines.push("M30");

      const program = lines.join("\n");
      const result = latheProgramSMTEncoderEngine.encodeFromString("PERF-500", program);

      expect(result.success).toBe(true);
      expect(result.stats.blocks_encoded).toBe(500);
      expect(result.stats.encoding_time_ms).toBeLessThan(100);
    });

    it("generates expected constraint count", () => {
      const program = `
        G21 G90
        G0 X50 Z10
        G1 Z-30 F200
        G1 X30
        M30
      `;
      const result = latheProgramSMTEncoderEngine.encodeFromString("COUNT-001", program);

      // Per block: ~5 transition + 4 envelope + 1 feed + 1 spindle = ~11 constraints
      // Plus initial (5), plus M30 home (1)
      expect(result.stats.constraints_generated).toBeGreaterThanOrEqual(50);
    });
  });

  describe("Modal State Tracking", () => {
    it("tracks positioning mode changes", () => {
      const program = `
        G90
        G0 X100
        G91
        G0 X10
      `;
      const result = latheProgramSMTEncoderEngine.encodeFromString("MODAL-001", program);

      // First move is absolute (100), second is incremental (+10)
      const trans1 = result.proof_input!.constraints.find(c => c.id === "trans_x_2");
      const trans2 = result.proof_input!.constraints.find(c => c.id === "trans_x_4");

      expect(trans1!.variables.length).toBe(1); // absolute
      expect(trans2!.variables.length).toBe(2); // incremental (references prev)
    });

    it("tracks feed mode changes", () => {
      const program = `
        G94
        G1 X10 F200
        G95
        G1 X20 F0.2
      `;
      const result = latheProgramSMTEncoderEngine.encodeFromString("MODAL-002", program);

      expect(result.success).toBe(true);
    });

    it("tracks spindle mode changes", () => {
      const program = `
        G97 S1500
        G96 S200
      `;
      const result = latheProgramSMTEncoderEngine.encodeFromString("MODAL-003", program);

      expect(result.success).toBe(true);
    });
  });
});
