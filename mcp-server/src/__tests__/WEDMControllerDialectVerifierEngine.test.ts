/**
 * WEDMControllerDialectVerifierEngine tests — MS-P2.5-SAFETY/U-P2.5-SAFE-06
 *
 * Exit criteria covered:
 *   1. Dialect verifier cross-checks emitted program against controller grammar
 *   2. E-code / C-code / M-code lookup per controller
 *   3. Mismatch → HARD BLOCK with diff report
 *   4. Contributes 0.10 to S(x)
 *   5. ROUNDTRIP: Mitsubishi plan emitted as Sodick → verifier catches it
 */

import { describe, it, expect } from "vitest";
import {
  wedmControllerDialectVerifierEngine,
  type DialectVerifierInput,
} from "../engines/WEDMControllerDialectVerifierEngine.js";
import { wedmProgramSafetyGateEngine } from "../engines/WEDMProgramSafetyGateEngine.js";

// ──────────────────────────────────────────────────────────────────────────────
// Fixture programs — each is a real-shape WEDM snippet carrying the canonical
// signatures of its dialect. Short enough to keep tests focused, long enough to
// fire the required fingerprint hits.
// ──────────────────────────────────────────────────────────────────────────────

const MITSUBISHI_PROGRAM = `
%
O0001
G21 G90
M20
G92 X0.0 Y0.0
E1221
G41 H1
G01 X10.0 Y0.0 F2.5
M28
G01 X20.0 Y0.0
M29
M21
G40
M02
%
`;

// Real Sodick ALC/SLC/ALN post uses M60 for thread, M61 for cut (M50/M51 are
// actually Agie/Fanuc codes). Per-pass condition codes are C####.
const SODICK_PROGRAM = `
%
O0001
G21 G90
M60
G92 X0.0 Y0.0
C101
G41 D1
G01 X10.0 Y0.0 F2.5
M78
G01 X20.0 Y0.0
M79
M61
G40
M02
%
`;

// Real Makino Hyper-i / U-Series post: M60 thread, M61 cut, G61 exact corner
// (bare — not G61.1), E-pack per pass, M30 end.
const MAKINO_PROGRAM = `
%
O0001
G21 G90
M60
G92 X0.0 Y0.0
E1221
G41 D1
G61
G01 X10.0 Y0.0 F2.5
G64
M61
G40
M30
%
`;

const FANUC_PROGRAM = `
%
O0001
G21 G90
M50
G92 X0.0 Y0.0
E1221
G41 D1
G61.1
G01 X10.0 Y0.0 F2.5
G64
M60
G40
M30
%
`;

const AGIE_PROGRAM = `
%
O0001
G71 G90
M50
G92 X0.0 Y0.0
G41 D1
G01 X10.0 Y0.0 F2.5
M24
G01 X20.0 Y0.0
M25
M51
G40
M17
%
`;

// ──────────────────────────────────────────────────────────────────────────────
// 1. Controller resolver
// ──────────────────────────────────────────────────────────────────────────────

describe("WEDMControllerDialectVerifierEngine — resolver", () => {
  const cases: Array<[string, string]> = [
    ["mitsubishi", "mitsubishi"],
    ["mitsubishi_fa", "mitsubishi"],
    ["Mitsubishi FA10S", "mitsubishi"],
    ["sodick", "sodick"],
    ["Sodick AL400", "sodick"],
    ["makino", "makino"],
    ["Makino U6 H.E.A.T.", "makino"],
    ["fanuc", "fanuc"],
    ["fanuc_robocut", "fanuc"],
    ["agiecharmilles", "agiecharmilles"],
    ["agie", "agiecharmilles"],
    ["charmilles", "agiecharmilles"],
    ["agie_cut", "agiecharmilles"],
  ];
  for (const [input, expected] of cases) {
    it(`resolves "${input}" → ${expected}`, () => {
      expect(wedmControllerDialectVerifierEngine.resolveController(input)).toBe(expected);
    });
  }

  it("returns null for unknown controller (no silent fallback)", () => {
    expect(wedmControllerDialectVerifierEngine.resolveController("haas")).toBeNull();
    expect(wedmControllerDialectVerifierEngine.resolveController("siemens")).toBeNull();
    expect(wedmControllerDialectVerifierEngine.resolveController("generic")).toBeNull();
    expect(wedmControllerDialectVerifierEngine.resolveController("")).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. Happy path — every dialect recognizes its own program
// ──────────────────────────────────────────────────────────────────────────────

describe("WEDMControllerDialectVerifierEngine — self-consistent dialects", () => {
  const pairs: Array<[string, string]> = [
    ["mitsubishi", MITSUBISHI_PROGRAM],
    ["sodick", SODICK_PROGRAM],
    ["makino", MAKINO_PROGRAM],
    ["fanuc", FANUC_PROGRAM],
    ["agiecharmilles", AGIE_PROGRAM],
  ];
  for (const [ctrl, prog] of pairs) {
    it(`${ctrl} program is accepted when declared as ${ctrl}`, () => {
      const r = wedmControllerDialectVerifierEngine.verify({
        program_text: prog,
        expected_controller: ctrl,
      });
      if (!r.pass) {
        throw new Error(
          `Expected ${ctrl} program to PASS when declared ${ctrl} — got ${r.verdict}:\n${r.diff_report}`,
        );
      }
      expect(r.pass).toBe(true);
      expect(r.verdict).toBe("pass");
      expect(r.hard_block).toBe(false);
      expect(r.safety_score_contribution).toBeCloseTo(0.1, 6);
      expect(r.detected_controller).toBe(ctrl);
    });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. Roundtrip cross-dialect detection — the milestone's key exit criterion
// ──────────────────────────────────────────────────────────────────────────────

describe("WEDMControllerDialectVerifierEngine — roundtrip cross-dialect", () => {
  it("CRITICAL: Sodick program declared as Mitsubishi → mismatch caught", () => {
    // Sodick-dialect program declared as mitsubishi → must HARD BLOCK because
    // the Sodick C-code condition blocks do NOT belong to Mitsubishi vocabulary.
    const r = wedmControllerDialectVerifierEngine.verify({
      program_text: SODICK_PROGRAM,
      expected_controller: "mitsubishi",
    });
    expect(r.pass).toBe(false);
    expect(r.verdict).toBe("fail_mismatch");
    expect(r.hard_block).toBe(true);
    expect(r.detected_controller).toBe("sodick");
    expect(r.mismatched_codes).toEqual(expect.arrayContaining(["C-code"]));
    expect(r.safety_score_contribution).toBe(0);
    expect(r.diff_report).toContain("Expected dialect: mitsubishi");
    expect(r.diff_report).toContain("Detected dialect: sodick");
  });

  it("Mitsubishi plan declared Sodick → mismatch caught (mirror direction)", () => {
    // The mitsubishi program carries M20 (thread) and H-register offsets —
    // neither belongs to Sodick. The verifier must surface these exclusives.
    const r = wedmControllerDialectVerifierEngine.verify({
      program_text: MITSUBISHI_PROGRAM,
      expected_controller: "sodick",
    });
    expect(r.pass).toBe(false);
    expect(r.verdict).toBe("fail_mismatch");
    expect(r.mismatched_codes).toEqual(expect.arrayContaining(["M20"]));
    expect(r.mismatched_codes).toEqual(expect.arrayContaining(["H-offset"]));
    expect(r.detected_controller).toBe("mitsubishi");
  });

  it("Agie program declared Fanuc → flagged by M17 + G71 exclusives", () => {
    const r = wedmControllerDialectVerifierEngine.verify({
      program_text: AGIE_PROGRAM,
      expected_controller: "fanuc",
    });
    expect(r.pass).toBe(false);
    expect(r.verdict).toBe("fail_mismatch");
    expect(r.mismatched_codes).toEqual(expect.arrayContaining(["M17"]));
    expect(r.mismatched_codes).toEqual(expect.arrayContaining(["G71"]));
  });

  it("Fanuc program declared Mitsubishi → mismatch caught (G61.1 is Fanuc-exclusive)", () => {
    const r = wedmControllerDialectVerifierEngine.verify({
      program_text: FANUC_PROGRAM,
      expected_controller: "mitsubishi",
    });
    expect(r.pass).toBe(false);
    expect(r.verdict).toBe("fail_mismatch");
    expect(r.mismatched_codes).toEqual(expect.arrayContaining(["G61.1"]));
    expect(r.detected_controller).toBe("fanuc");
  });

  it("Makino program declared Agie → caught (no M17, no G71/G70)", () => {
    const r = wedmControllerDialectVerifierEngine.verify({
      program_text: MAKINO_PROGRAM,
      expected_controller: "agiecharmilles",
    });
    expect(r.pass).toBe(false);
    expect(r.verdict).toBe("fail_mismatch");
    // Makino's top rank beats Agie's because Makino has M30+M60+M61+E-pack
    expect(r.detected_controller).toBe("makino");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. Scoring — ranking orders controllers sensibly
// ──────────────────────────────────────────────────────────────────────────────

describe("WEDMControllerDialectVerifierEngine — scoring", () => {
  it("ranks the correct controller first for each canonical program", () => {
    expect(
      wedmControllerDialectVerifierEngine.scoreAllControllers(MITSUBISHI_PROGRAM)[0].controller,
    ).toBe("mitsubishi");
    expect(
      wedmControllerDialectVerifierEngine.scoreAllControllers(SODICK_PROGRAM)[0].controller,
    ).toBe("sodick");
    expect(wedmControllerDialectVerifierEngine.scoreAllControllers(MAKINO_PROGRAM)[0].controller).toBe(
      "makino",
    );
    expect(wedmControllerDialectVerifierEngine.scoreAllControllers(FANUC_PROGRAM)[0].controller).toBe(
      "fanuc",
    );
    expect(
      wedmControllerDialectVerifierEngine.scoreAllControllers(AGIE_PROGRAM)[0].controller,
    ).toBe("agiecharmilles");
  });

  it("empty program scores all zero", () => {
    const ranking = wedmControllerDialectVerifierEngine.scoreAllControllers("");
    for (const r of ranking) expect(r.score).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 5. Edge cases — unknown controller, empty program, ambiguous vs mismatch
// ──────────────────────────────────────────────────────────────────────────────

describe("WEDMControllerDialectVerifierEngine — edge cases", () => {
  it("fails closed on unknown controller", () => {
    const r = wedmControllerDialectVerifierEngine.verify({
      program_text: MITSUBISHI_PROGRAM,
      expected_controller: "haas",
    });
    expect(r.pass).toBe(false);
    expect(r.verdict).toBe("fail_unknown_controller");
    expect(r.hard_block).toBe(true);
  });

  it("fails closed on empty program", () => {
    const r = wedmControllerDialectVerifierEngine.verify({
      program_text: "",
      expected_controller: "mitsubishi",
    });
    expect(r.pass).toBe(false);
    expect(r.verdict).toBe("fail_empty_program");
    expect(r.hard_block).toBe(true);
  });

  it("fails closed on program with no dialect signatures at all", () => {
    const r = wedmControllerDialectVerifierEngine.verify({
      program_text: "%\n(just a comment)\n%",
      expected_controller: "mitsubishi",
    });
    expect(r.pass).toBe(false);
    expect(r.hard_block).toBe(true);
  });

  it("generic is explicitly rejected as an ambiguous declaration", () => {
    const r = wedmControllerDialectVerifierEngine.verify({
      program_text: MITSUBISHI_PROGRAM,
      expected_controller: "generic",
    });
    expect(r.pass).toBe(false);
    expect(r.verdict).toBe("fail_unknown_controller");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 6. Safety-gate composition — 0.10 contribution
// ──────────────────────────────────────────────────────────────────────────────

describe("WEDMControllerDialectVerifierEngine — S(x) composition", () => {
  it("feeds shape into WEDMProgramSafetyGateEngine.dialect without reshaping", () => {
    const pass = wedmControllerDialectVerifierEngine.verify({
      program_text: MITSUBISHI_PROGRAM,
      expected_controller: "mitsubishi",
    });
    const composite = wedmProgramSafetyGateEngine.evaluate({
      collision: { pass: true, min_distance_mm: 10, safe_distance_mm: 5 },
      head_clearance: {
        pass: true,
        upper_clearance_mm: 5,
        lower_clearance_mm: 4,
        min_required_mm: 3,
      },
      flushing: {
        pass: true,
        velocity_m_s: 1.0,
        required_velocity_m_s: 0.8,
        mode: "submerged",
      },
      thermal: { pass: true, heat_release_J: 10, cooling_capacity_J: 100, recast_depth_um: 2, max_recast_um: 10 },
      dialect: pass.safety_gate_input,
      unit_tag: {
        pass: true,
        declared_unit: "metric",
        code_unit: "G21",
        coordinate_scale_consistent: true,
      },
      deflection: { pass: true, max_deflection_mm: 0.01, tolerance_mm: 0.05, deflection_ratio: 0.2 },
    });
    expect(composite.pass).toBe(true);
    const dialectComp = composite.components.find((c) => c.component === "dialect");
    expect(dialectComp?.pass).toBe(true);
    expect(dialectComp?.weight).toBeCloseTo(0.1, 6);
    expect(dialectComp?.weighted_score).toBeCloseTo(0.1, 6);
  });

  it("a cross-dialect mismatch drops dialect component to 0 weighted score", () => {
    const fail = wedmControllerDialectVerifierEngine.verify({
      program_text: SODICK_PROGRAM,
      expected_controller: "mitsubishi",
    });
    expect(fail.safety_gate_input.pass).toBe(false);
    expect(fail.safety_gate_input.mismatched_codes?.length).toBeGreaterThan(0);

    const common = {
      collision: { pass: true, min_distance_mm: 10, safe_distance_mm: 5 },
      head_clearance: {
        pass: true,
        upper_clearance_mm: 5,
        lower_clearance_mm: 4,
        min_required_mm: 3,
      },
      flushing: {
        pass: true,
        velocity_m_s: 1.0,
        required_velocity_m_s: 0.8,
        mode: "submerged" as const,
      },
      thermal: { pass: true, heat_release_J: 10, cooling_capacity_J: 100, recast_depth_um: 2, max_recast_um: 10 },
      unit_tag: {
        pass: true,
        declared_unit: "metric" as const,
        code_unit: "G21" as const,
        coordinate_scale_consistent: true,
      },
      deflection: { pass: true, max_deflection_mm: 0.01, tolerance_mm: 0.05, deflection_ratio: 0.2 },
    };

    const composite = wedmProgramSafetyGateEngine.evaluate({
      ...common,
      dialect: fail.safety_gate_input,
    });
    const dialectComp = composite.components.find((c) => c.component === "dialect");
    expect(dialectComp?.pass).toBe(false);
    expect(dialectComp?.weighted_score).toBe(0);
    expect(composite.failure_reasons.some((r) => r.toLowerCase().includes("dialect"))).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 7. gate() wrapper
// ──────────────────────────────────────────────────────────────────────────────

describe("WEDMControllerDialectVerifierEngine — gate() wrapper", () => {
  it("allow=true for a matched dialect", () => {
    const g = wedmControllerDialectVerifierEngine.gate({
      program_text: SODICK_PROGRAM,
      expected_controller: "sodick",
    });
    expect(g.allow).toBe(true);
    expect(g.reason).toContain("DIALECT OK");
  });

  it("allow=false for a cross-dialect emit", () => {
    const g = wedmControllerDialectVerifierEngine.gate({
      program_text: SODICK_PROGRAM,
      expected_controller: "fanuc",
    });
    expect(g.allow).toBe(false);
    expect(g.reason).toContain("DIALECT BLOCK");
  });
});
