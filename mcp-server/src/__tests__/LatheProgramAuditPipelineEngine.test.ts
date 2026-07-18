/**
 * LatheProgramAuditPipelineEngine tests — 3-stage lathe audit contract
 * =====================================================================
 *
 * Verifies the 3-stage pipeline (gcSafetyAnalyzer + parseLatheProgram +
 * screenCollisionsLathe) wired via LatheProgramAuditPipelineEngine.auditOne.
 *
 * Uses real reference values (no toBeDefined() stubs) — per CLAUDE.md
 * §SCRUTINY GATE R9 ("tests verify intent, not behavior").
 *
 * @milestone JM-DIE-LATHE-UPGRADE-MS0/U-AUDIT-PIPELINE
 */

import { describe, it, expect } from "vitest";

import {
  LatheProgramAuditPipelineEngine,
  parseLatheProgram,
  screenCollisionsLathe,
  type LatheEnvelope,
  type LatheMove,
} from "../engines/LatheProgramAuditPipelineEngine.js";

// Representative JM Die Okuma LB-3000EX BigBore envelope.
const BIGBORE_ENV: LatheEnvelope = {
  machineId: "LTH-06",
  x_min_mm: 0,
  x_max_mm: 460,   // 460mm max swing diameter
  z_min_mm: -10,   // mm of overrun past chuck face
  z_max_mm: 1250,  // 1250mm bed length
  chuck_z_mm: 0,
  tail_z_mm: 1200,
  clearance_warning_mm: 5,
};

const GENOS_ENV: LatheEnvelope = {
  machineId: "LTH-02",
  x_min_mm: 0,
  x_max_mm: 250,
  z_min_mm: -10,
  z_max_mm: 600,
  chuck_z_mm: 0,
  clearance_warning_mm: 3,
};

describe("parseLatheProgram", () => {
  it("returns empty array on empty/comment-only input", () => {
    expect(parseLatheProgram("")).toHaveLength(0);
    expect(parseLatheProgram("(comment-only program)\n; another comment")).toHaveLength(0);
  });

  it("parses a single G0 rapid X Z move with correct line + coordinates", () => {
    const moves = parseLatheProgram("G0 X100. Z50.\n", { default_units: "mm" });
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({ line: 1, type: "rapid", x: 100, z: 50, x_is_diameter: true });
  });

  it("respects sticky modal: G0 then bare X/Z stays rapid", () => {
    const program = ["G0 X100. Z50.", "X150.", "Z25."].join("\n");
    const moves = parseLatheProgram(program, { default_units: "mm" });
    expect(moves).toHaveLength(3);
    expect(moves.every((m) => m.type === "rapid")).toBe(true);
    expect(moves[1].x).toBe(150);
    expect(moves[2].z).toBe(25);
  });

  it("switches mode on G1 and tracks feed-rate moves separately", () => {
    const program = ["G0 X100. Z10.", "G1 Z-5. F0.1", "X50."].join("\n");
    const moves = parseLatheProgram(program, { default_units: "mm" });
    expect(moves).toHaveLength(3);
    expect(moves[0].type).toBe("rapid");
    expect(moves[1].type).toBe("feed");
    expect(moves[2].type).toBe("feed");
  });

  it("recognizes G2 (arc_cw) and G3 (arc_ccw)", () => {
    const moves = parseLatheProgram("G2 X20. Z-5.\nG3 X10. Z-15.", { default_units: "mm" });
    expect(moves[0].type).toBe("arc_cw");
    expect(moves[1].type).toBe("arc_ccw");
  });

  it("strips ( ... ) block comments + ;... line comments before parsing", () => {
    const program = "(SETUP) G0 X100. Z10. (start position) ; tool 1";
    const moves = parseLatheProgram(program, { default_units: "mm" });
    expect(moves).toHaveLength(1);
    expect(moves[0].x).toBe(100);
    expect(moves[0].z).toBe(10);
  });

  it("supports radius-mode override via opts.x_is_diameter=false", () => {
    const moves = parseLatheProgram("G0 X50. Z10.", { x_is_diameter: false, default_units: "mm" });
    expect(moves[0].x_is_diameter).toBe(false);
  });

  it("ignores leading O-number / N-number lines without motion", () => {
    const moves = parseLatheProgram("O1234\nN10\nG0 X100. Z10.", { default_units: "mm" });
    expect(moves).toHaveLength(1);
    expect(moves[0].line).toBe(3);
  });

  it("does not emit a move when G-mode is unseen (no implicit motion)", () => {
    const moves = parseLatheProgram("X100. Z10.\nM6 T01");
    expect(moves).toHaveLength(0);
  });

  it("default Okuma OSP units = inch; values scaled to mm at parse time", () => {
    const moves = parseLatheProgram("G0 X2.\n");
    expect(moves[0].x).toBeCloseTo(50.8, 3); // 2 inches → 50.8 mm
    expect(moves[0].units).toBe("inch");
  });

  it("G21 switches modal units to mm mid-program", () => {
    const moves = parseLatheProgram("G0 X2.\nG21\nG0 X100.\n");
    expect(moves[0].units).toBe("inch");
    expect(moves[0].x).toBeCloseTo(50.8, 3);
    expect(moves[1].units).toBe("mm");
    expect(moves[1].x).toBe(100);
  });

  it("G20 forces inch even when default is mm", () => {
    const moves = parseLatheProgram("G20\nG0 X2.\n", { default_units: "mm" });
    expect(moves[0].units).toBe("inch");
    expect(moves[0].x).toBeCloseTo(50.8, 3);
  });
});

describe("screenCollisionsLathe", () => {
  const env = BIGBORE_ENV;

  it("returns clean result on empty move list", () => {
    const r = screenCollisionsLathe([], env);
    expect(r.has_collision).toBe(false);
    expect(r.has_near_miss).toBe(false);
    expect(r.collision_count).toBe(0);
    expect(r.near_miss_count).toBe(0);
    expect(r.min_clearance_mm).toBe(-1);
  });

  it("flags negative-diameter move deeper than facing tolerance as COLLISION", () => {
    const moves: LatheMove[] = [{ line: 1, type: "rapid", x: -5, x_is_diameter: true, units: "mm" as const, raw: "G0 X-5." }];
    const r = screenCollisionsLathe(moves, env);
    expect(r.has_collision).toBe(true);
    expect(r.details.some((d) => d.rule === "negative_diameter")).toBe(true);
  });

  it("flags X beyond x_max_mm + rapid_retract_tolerance as envelope_x COLLISION", () => {
    // env.x_max=460 + default rapid retract tolerance 50mm → strict limit 510 for rapids
    const moves: LatheMove[] = [{ line: 1, type: "rapid", x: 520, x_is_diameter: true, units: "mm" as const, raw: "G0 X520." }];
    const r = screenCollisionsLathe(moves, env);
    expect(r.has_collision).toBe(true);
    expect(r.details.find((d) => d.rule === "envelope_x")?.severity).toBe("collision");
    expect(r.details.find((d) => d.rule === "envelope_x")?.limit).toBe(env.x_max_mm + 50);
  });

  it("permits rapid X up to x_max + rapid_retract_tolerance (tool-change clearance)", () => {
    // x=500 on env.x_max=460, rapid → 500 < 460+50=510 → no collision (legit retract)
    const moves: LatheMove[] = [{ line: 1, type: "rapid", x: 500, x_is_diameter: true, units: "mm" as const, raw: "G0 X500." }];
    const r = screenCollisionsLathe(moves, env);
    expect(r.has_collision).toBe(false);
  });

  it("strictly enforces x_max for FEED moves (no retract tolerance)", () => {
    // x=500 with FEED move → 500 > 460 → collision even though retract-tol would allow it
    const moves: LatheMove[] = [{ line: 1, type: "feed", x: 500, x_is_diameter: true, units: "mm" as const, raw: "G1 X500." }];
    const r = screenCollisionsLathe(moves, env);
    expect(r.has_collision).toBe(true);
    expect(r.details.find((d) => d.rule === "envelope_x")?.limit).toBe(env.x_max_mm);
  });

  it("permits through-center face-cut X up to -facing_x_tolerance (legit lathe op)", () => {
    // Face cuts to X=-1mm (within default 2mm tolerance) → no negative_diameter
    const moves: LatheMove[] = [{ line: 1, type: "feed", x: -1, x_is_diameter: true, units: "mm" as const, raw: "G1 X-1." }];
    const r = screenCollisionsLathe(moves, env);
    expect(r.details.every((d) => d.rule !== "negative_diameter")).toBe(true);
  });

  it("flags through-center cut deeper than facing tolerance as negative_diameter COLLISION", () => {
    // X=-5mm exceeds 2mm tolerance → flagged
    const moves: LatheMove[] = [{ line: 1, type: "feed", x: -5, x_is_diameter: true, units: "mm" as const, raw: "G1 X-5." }];
    const r = screenCollisionsLathe(moves, env);
    expect(r.details.find((d) => d.rule === "negative_diameter")?.severity).toBe("collision");
  });

  it("flags Z below chuck_z_mm as chuck_clearance COLLISION", () => {
    const moves: LatheMove[] = [{ line: 1, type: "feed", z: -15, x_is_diameter: true, units: "mm" as const, raw: "G1 Z-15." }];
    const r = screenCollisionsLathe(moves, env);
    expect(r.has_collision).toBe(true);
    // Z=-15 is below both chuck_z_mm=0 AND z_min_mm=-10 — both rules fire
    const chuck = r.details.find((d) => d.rule === "chuck_clearance");
    expect(chuck?.severity).toBe("collision");
    expect(chuck?.actual).toBe(-15);
  });

  it("flags Z beyond tail_z_mm as tail_clearance COLLISION (when mounted)", () => {
    const moves: LatheMove[] = [{ line: 1, type: "rapid", z: 1210, x_is_diameter: true, units: "mm" as const, raw: "G0 Z1210." }];
    const r = screenCollisionsLathe(moves, env);
    expect(r.has_collision).toBe(true);
    expect(r.details.find((d) => d.rule === "tail_clearance")?.severity).toBe("collision");
  });

  it("skips tail_clearance check when env.tail_z_mm is undefined", () => {
    const moves: LatheMove[] = [{ line: 1, type: "rapid", z: 590, x_is_diameter: true, units: "mm" as const, raw: "G0 Z590." }];
    const r = screenCollisionsLathe(moves, GENOS_ENV); // no tail_z_mm
    expect(r.details.every((d) => d.rule !== "tail_clearance")).toBe(true);
  });

  it("flags X near x_max as NEAR_MISS within clearance_warning_mm", () => {
    const moves: LatheMove[] = [{ line: 1, type: "rapid", x: 458, x_is_diameter: true, units: "mm" as const, raw: "G0 X458." }];
    const r = screenCollisionsLathe(moves, env); // x_max=460, warn=5 → 2mm clearance triggers
    expect(r.has_near_miss).toBe(true);
    expect(r.near_miss_count).toBeGreaterThan(0);
    expect(r.min_clearance_mm).toBe(2);
  });

  it("clean program inside envelope reports no findings", () => {
    const moves: LatheMove[] = [
      { line: 1, type: "rapid", x: 200, z: 100, x_is_diameter: true, units: "mm" as const, raw: "G0 X200. Z100." },
      { line: 2, type: "feed", x: 195, z: 90, x_is_diameter: true, units: "mm" as const, raw: "G1 X195. Z90." },
    ];
    const r = screenCollisionsLathe(moves, env);
    expect(r.has_collision).toBe(false);
    expect(r.has_near_miss).toBe(false);
  });
});

describe("LatheProgramAuditPipelineEngine.auditOne — verdict contract", () => {
  const baseInput = {
    variantPath: "H:/PRISM/JM DIE/CNC LATHE/TEST/PRISM_UPGRADED/Okuma_LB-3000EX_BigBore/TEST-001.nc",
    partNumber: "TEST-001",
    machineId: "LTH-06",
    machineModel: "Okuma_LB-3000EX_BigBore",
    envelope: BIGBORE_ENV,
  };

  it("FAIL on negative-diameter move (Stage-C collision)", () => {
    const r = LatheProgramAuditPipelineEngine.auditOne({
      ...baseInput,
      programText: "G21\nG0 X-10. Z50.\nM30",
    });
    expect(r.verdict).toBe("fail");
    expect(r.score).toBe(0);
    expect(r.stageC.has_collision).toBe(true);
  });

  it("FAIL on Z deep into chuck (Stage-C collision)", () => {
    const r = LatheProgramAuditPipelineEngine.auditOne({
      ...baseInput,
      programText: "G21\nG0 X200. Z-50.\nM30",
    });
    expect(r.verdict).toBe("fail");
    expect(r.score).toBe(0);
  });

  it("WARN on X near envelope edge (Stage-C near_miss + no Stage-A high)", () => {
    const r = LatheProgramAuditPipelineEngine.auditOne({
      ...baseInput,
      programText: "G21\nG28 U0 W0\nG0 X458. Z100.\nG1 X458. Z90. F0.1\nM30",
    });
    // x=458 is 2mm from x_max=460, warn=5 → near_miss expected
    expect(r.stageC.has_near_miss).toBe(true);
    expect(["warn", "fail"]).toContain(r.verdict);
  });

  it("emits no_motion_moves_parsed warning on header-only program", () => {
    const r = LatheProgramAuditPipelineEngine.auditOne({
      ...baseInput,
      programText: "(this is comment-only)\n; nothing here",
    });
    expect(r.warnings).toContain("no_motion_moves_parsed");
    expect(r.stageB.move_count).toBe(0);
  });

  it("default controller is okuma for JM Die lathes", () => {
    const r = LatheProgramAuditPipelineEngine.auditOne({
      ...baseInput,
      programText: "G21\nG0 X100. Z50.\nM30",
    });
    expect(r.controller).toBe("okuma");
  });

  it("schemaVersion is stamped 1.0.0", () => {
    const r = LatheProgramAuditPipelineEngine.auditOne({
      ...baseInput,
      programText: "G21\nG0 X100. Z50.\nM30",
    });
    expect(r.schemaVersion).toBe("1.0.0");
  });

  it("stageB.first_5_moves bounded to 5 even for longer programs", () => {
    const lines: string[] = ["G21"];
    for (let i = 0; i < 50; i++) lines.push(`G0 X100. Z${i * 2}.`);
    const r = LatheProgramAuditPipelineEngine.auditOne({
      ...baseInput,
      programText: lines.join("\n"),
    });
    expect(r.stageB.move_count).toBe(50);
    expect(r.stageB.first_5_moves).toHaveLength(5);
  });
});
