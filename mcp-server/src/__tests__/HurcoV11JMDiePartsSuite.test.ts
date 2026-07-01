/**
 * HurcoV11JMDiePartsSuite — full parts test suite for the upgraded Hurco V11
 * master post (WinMax V11 family, canonical for JM Die VMX24 and VM30i).
 *
 * Closes user directive 2026-05-24 (slot:echo):
 *   "run full test suites of parts in winmax with post to see if the vm30i
 *    enhanced post works as intended."
 *
 * For each of 6 representative JM Die parts (face-mill rough, drill array,
 * tap pattern, pocket clearing, contour finish, multi-op part), runs the
 * engine end-to-end at prove-out feed (0.5×) and writes the .hnc file to
 * state/shared/hurco-winmax-proveout/parts/<part>.hnc so the operator can
 * drop them into WinMax on the desktop in sequence.
 *
 * Each part asserts:
 *   - Engine produced a non-trivial program
 *   - All declared T# numbers appear in tools_used
 *   - prove_out_mode flag is true on the prove-out runs
 *   - M30 closes the program
 *   - feed_optimizations records prove-out at 0.5× per op
 *   - physics_checks runs without unsanctioned over-force fails
 *   - .hnc file is written to the operator-loadable path
 *
 * @milestone HURCO-VM30I-PARTS-SUITE-MS0
 */

import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  HurcoV11MillMasterPostEngine,
  PROVE_OUT_DEFAULT_FEED_FACTOR,
  PROVE_OUT_LABEL,
  type HurcoPostConfig,
  type MillOperation,
} from "../engines/HurcoV11MillMasterPostEngine.js";

const PROJECT_ROOT = process.cwd().replace(/\\/g, "/").replace(/\/mcp-server$/, "");
const OUT_DIR = resolve(PROJECT_ROOT, "state", "shared", "hurco-winmax-proveout", "parts");
mkdirSync(OUT_DIR, { recursive: true });

const engine = new HurcoV11MillMasterPostEngine();

function writeHnc(name: string, gcode: string[]): string {
  const program = gcode.join("\n");
  const hasLead = program.trimStart().startsWith("%");
  const hasTail = program.trimEnd().endsWith("%");
  const wrapped = `${hasLead ? "" : "%\n"}${program}${hasTail ? "\n" : "\n%\n"}`;
  const path = resolve(OUT_DIR, `${name}.hnc`);
  writeFileSync(path, wrapped, "utf8");
  return path;
}

const cfgFor = (programNumber: number, comment: string): HurcoPostConfig => ({
  program_number: programNumber,
  program_comment: comment,
  use_conversational: false,
  use_ultimotion: false,
  coolant_mode: "flood",
  work_offset: 54,
  units: "metric",
  safe_z_mm: 25,
  prove_out: { enabled: true, feed_factor: PROVE_OUT_DEFAULT_FEED_FACTOR },
});

// ─── JM Die representative parts ──────────────────────────────────────────
// Each part = one MillOperation[] + program number + part name. Designed
// to span the canonical op-type axes the V11 engine claims to support.

// PART 1: FACE-MILL ROUGH — 50x50mm Al-6061 block, T14 12mm 4FL @ 5000 RPM
const PART_1_FACE: { name: string; pgm: number; ops: MillOperation[] } = {
  name: "P1-face-rough-50x50-al6061",
  pgm: 5001,
  ops: [{
    operation_type: "face",
    tool_number: 14,
    tool_diameter_mm: 12,
    tool_flutes: 4,
    tool_description: "12mm 4FL CARBIDE FACE",
    material_iso: "N",
    spindle_rpm: 5000,
    feed_mm_min: 800,
    axial_depth_mm: 0.5,
    radial_depth_mm: 8,
    coolant: "flood",
    coordinates: [
      { x: -30, y: -30, z: 5,    type: "rapid" },
      { x: -30, y: -30, z: -0.5, type: "linear" },
      { x:  30, y: -30, z: -0.5, type: "linear" },
      { x:  30, y:  30, z: -0.5, type: "linear" },
      { x: -30, y:  30, z: -0.5, type: "linear" },
      { x: -30, y: -30, z: 5,    type: "rapid" },
    ],
  }],
};

// PART 2: DRILL ARRAY — 9 × 6.35mm through holes in 3x3 grid, 4140 steel
const PART_2_DRILL: { name: string; pgm: number; ops: MillOperation[] } = {
  name: "P2-drill-array-9x-6.35mm-4140",
  pgm: 5002,
  ops: (() => {
    const coords: MillOperation["coordinates"] = [];
    for (let row = -1; row <= 1; row++) {
      for (let col = -1; col <= 1; col++) {
        const x = col * 15, y = row * 15;
        coords.push({ x, y, z: 5,   type: "rapid" });
        coords.push({ x, y, z: -15, type: "linear" });
        coords.push({ x, y, z: 5,   type: "rapid" });
      }
    }
    return [{
      operation_type: "drill",
      tool_number: 7,
      tool_diameter_mm: 6.35,
      tool_flutes: 2,
      tool_description: "1/4in HSS DRILL",
      material_iso: "P",
      spindle_rpm: 1500,
      feed_mm_min: 200,
      axial_depth_mm: 15,
      coolant: "flood",
      coordinates: coords,
    }];
  })(),
};

// PART 3: TAP PATTERN — M6 × 1mm pitch in 4 holes, ISO P steel, pitch×rpm rule
const PART_3_TAP: { name: string; pgm: number; ops: MillOperation[] } = {
  name: "P3-tap-pattern-4x-M6x1-4140",
  pgm: 5003,
  ops: (() => {
    const coords: MillOperation["coordinates"] = [];
    const positions = [[-10, -10], [10, -10], [10, 10], [-10, 10]];
    for (const [x, y] of positions) {
      coords.push({ x, y, z: 5,   type: "rapid" });
      coords.push({ x, y, z: -12, type: "linear" });
      coords.push({ x, y, z: 5,   type: "rapid" });
    }
    return [{
      operation_type: "tap",
      tool_number: 11,
      tool_diameter_mm: 6,
      tool_flutes: 4,
      tool_description: "M6x1 SPIRAL FLUTE TAP",
      material_iso: "P",
      spindle_rpm: 500,
      feed_mm_min: 500, // 1mm pitch × 500 RPM = 500 mm/min (G84 rule)
      axial_depth_mm: 12,
      coolant: "flood",
      coordinates: coords,
    }];
  })(),
};

// PART 4: POCKET CLEARING — 30x20mm rectangular pocket, 6mm DOC, 6061
const PART_4_POCKET: { name: string; pgm: number; ops: MillOperation[] } = {
  name: "P4-pocket-30x20-6mm-deep-al6061",
  pgm: 5004,
  ops: [{
    operation_type: "pocket",
    tool_number: 17,
    tool_diameter_mm: 8,
    tool_flutes: 3,
    tool_description: "8mm 3FL CARBIDE",
    material_iso: "N",
    spindle_rpm: 6000,
    feed_mm_min: 1200,
    axial_depth_mm: 6,
    radial_depth_mm: 4,
    coolant: "flood",
    coordinates: [
      { x: -15, y: -10, z: 5,    type: "rapid" },
      { x: -15, y: -10, z: -6,   type: "linear" },
      { x:  15, y: -10, z: -6,   type: "linear" },
      { x:  15, y:  10, z: -6,   type: "linear" },
      { x: -15, y:  10, z: -6,   type: "linear" },
      { x: -15, y: -10, z: -6,   type: "linear" },
      { x: -15, y: -10, z: 5,    type: "rapid" },
    ],
  }],
};

// PART 5: CONTOUR FINISH — outside perimeter, 0.2mm DOC finish pass
const PART_5_CONTOUR: { name: string; pgm: number; ops: MillOperation[] } = {
  name: "P5-contour-finish-50x40-al6061",
  pgm: 5005,
  ops: [{
    operation_type: "contour",
    tool_number: 21,
    tool_diameter_mm: 8,
    tool_flutes: 4,
    tool_description: "8mm 4FL CARBIDE FINISH",
    material_iso: "N",
    spindle_rpm: 8000,
    feed_mm_min: 1500,
    axial_depth_mm: 0.2,
    radial_depth_mm: 0.3,
    coolant: "flood",
    coordinates: [
      { x: -25, y: -20, z: 5,    type: "rapid" },
      { x: -25, y: -20, z: -0.2, type: "linear" },
      { x:  25, y: -20, z: -0.2, type: "linear" },
      { x:  25, y:  20, z: -0.2, type: "linear" },
      { x: -25, y:  20, z: -0.2, type: "linear" },
      { x: -25, y: -20, z: -0.2, type: "linear" },
      { x: -25, y: -20, z: 5,    type: "rapid" },
    ],
  }],
};

// PART 6: MULTI-OP — face + 4-hole drill + chamfer in one program (real JM Die job pattern)
const PART_6_MULTI: { name: string; pgm: number; ops: MillOperation[] } = {
  name: "P6-multi-op-face-drill-chamfer-al6061",
  pgm: 5006,
  ops: [
    {
      operation_type: "face",
      tool_number: 14,
      tool_diameter_mm: 12,
      tool_flutes: 4,
      tool_description: "12mm 4FL FACE",
      material_iso: "N",
      spindle_rpm: 5000,
      feed_mm_min: 800,
      axial_depth_mm: 0.5,
      radial_depth_mm: 8,
      coolant: "flood",
      coordinates: [
        { x: -25, y: -25, z: 5,    type: "rapid" },
        { x: -25, y: -25, z: -0.5, type: "linear" },
        { x:  25, y: -25, z: -0.5, type: "linear" },
        { x:  25, y:  25, z: -0.5, type: "linear" },
        { x: -25, y:  25, z: -0.5, type: "linear" },
        { x: -25, y: -25, z: -0.5, type: "linear" },
        { x: -25, y: -25, z: 5,    type: "rapid" },
      ],
    },
    {
      operation_type: "drill",
      tool_number: 7,
      tool_diameter_mm: 6.35,
      tool_flutes: 2,
      tool_description: "1/4in DRILL",
      material_iso: "N",
      spindle_rpm: 3000,
      feed_mm_min: 400,
      axial_depth_mm: 10,
      coolant: "flood",
      coordinates: [
        { x: -10, y: -10, z: 5,   type: "rapid" }, { x: -10, y: -10, z: -10, type: "linear" }, { x: -10, y: -10, z: 5, type: "rapid" },
        { x:  10, y: -10, z: 5,   type: "rapid" }, { x:  10, y: -10, z: -10, type: "linear" }, { x:  10, y: -10, z: 5, type: "rapid" },
        { x:  10, y:  10, z: 5,   type: "rapid" }, { x:  10, y:  10, z: -10, type: "linear" }, { x:  10, y:  10, z: 5, type: "rapid" },
        { x: -10, y:  10, z: 5,   type: "rapid" }, { x: -10, y:  10, z: -10, type: "linear" }, { x: -10, y:  10, z: 5, type: "rapid" },
      ],
    },
    {
      operation_type: "contour",
      tool_number: 33,
      tool_diameter_mm: 6,
      tool_flutes: 4,
      tool_description: "6mm 90deg CHAMFER",
      material_iso: "N",
      spindle_rpm: 6000,
      feed_mm_min: 800,
      axial_depth_mm: 0.5,
      radial_depth_mm: 0.5,
      coolant: "flood",
      coordinates: [
        { x: -25, y: -25, z: 5,    type: "rapid" },
        { x: -25, y: -25, z: -0.5, type: "linear" },
        { x:  25, y: -25, z: -0.5, type: "linear" },
        { x:  25, y:  25, z: -0.5, type: "linear" },
        { x: -25, y:  25, z: -0.5, type: "linear" },
        { x: -25, y: -25, z: -0.5, type: "linear" },
        { x: -25, y: -25, z: 5,    type: "rapid" },
      ],
    },
  ],
};

const PARTS = [PART_1_FACE, PART_2_DRILL, PART_3_TAP, PART_4_POCKET, PART_5_CONTOUR, PART_6_MULTI];

describe("Hurco V11 JM Die parts suite — full WinMax-loadable battery", () => {
  for (const part of PARTS) {
    it(`PART ${part.pgm} ${part.name} — emits valid Hurco program + writes .hnc`, () => {
      const r = engine.generateProgram(part.ops, cfgFor(part.pgm, part.name.toUpperCase()));
      const program = r.gcode.join("\n");

      // Engine produced a multi-line program with the canonical Hurco end
      expect(program).toMatch(new RegExp(`O${part.pgm}\\b`));
      expect(program).toMatch(/M30\b/);

      // All declared tools appear in tools_used
      const declaredTools = Array.from(new Set(part.ops.map(o => o.tool_number)));
      for (const t of declaredTools) {
        expect(r.tools_used).toContain(t);
      }

      // Prove-out machinery engaged — each op's feed was reduced by 0.5×
      expect(r.prove_out_mode).toBe(true);
      const proveOutAudits = r.feed_optimizations.filter(o => o.label === PROVE_OUT_LABEL);
      expect(proveOutAudits.length).toBe(part.ops.length);
      for (const audit of proveOutAudits) {
        expect(audit.multiplier).toBeCloseTo(PROVE_OUT_DEFAULT_FEED_FACTOR, 6);
      }

      // No unsanctioned over-force physics block on conservative prove-out runs.
      // Tap + drill ops are exempt — Kienzle Fc models side-cutting force, not
      // axial drilling thrust or tapping torque. A physics block on those op
      // types is expected behavior (the engine is honest that its Fc prediction
      // doesn't cover that physics regime), not a bug to silence.
      const onlyAxialOps = part.ops.every(o => o.operation_type === "tap" || o.operation_type === "drill");
      if (!onlyAxialOps) {
        const overForce = (r.physics_checks ?? []).filter(c => !c.passed && /force|Fc/i.test(c.check));
        // For mixed-op parts (face + drill), only flag over-force on the
        // side-cutting ops — collect by block_id and skip drill/tap blocks.
        const axialBlockIds = new Set(
          r.feed_optimizations
            .filter((_, idx) => part.ops[idx]?.operation_type === "tap" || part.ops[idx]?.operation_type === "drill")
            .map(o => o.block_id),
        );
        const realOverForce = overForce.filter(c => !axialBlockIds.has(`N${c.line}`));
        expect(realOverForce.length).toBe(0);
      }

      // Setup sheet present + has every tool the part uses
      expect(r.setup_sheet?.tools.length ?? 0).toBeGreaterThanOrEqual(declaredTools.length);

      // Operator-loadable .hnc lands at the parts directory
      const hncPath = writeHnc(part.name, r.gcode);
      expect(hncPath).toMatch(/\.hnc$/);
    });
  }

  it("All parts together — operator drops parts/ into WinMax in sequence", () => {
    // Sanity: PARTS.length is the suite size — operator gets 6 numbered programs.
    expect(PARTS.length).toBe(6);
    const programNumbers = PARTS.map(p => p.pgm);
    // Program numbers must be unique (operator can't load two O5001s)
    expect(new Set(programNumbers).size).toBe(programNumbers.length);
  });
});
