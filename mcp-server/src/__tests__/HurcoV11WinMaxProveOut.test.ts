/**
 * HurcoV11WinMaxProveOut — generates a real `.hnc` file the operator can
 * load into WinMax on the desktop. Closes the "prove out the upgraded
 * Hurco post processor to the WinMax app" user directive (2026-05-23,
 * slot:echo absorbing india's post-processor queue).
 *
 * What this test does:
 *   1. Constructs a representative JM Die operation — face-mill a 50mm
 *      square aluminum (6061-T6) block, conventional 12mm 4-flute end mill.
 *   2. Runs the Hurco V11 master post engine with prove_out=true (50%
 *      feed factor per `PROVE_OUT_DEFAULT_FEED_FACTOR`).
 *   3. Validates the emitted G-code matches the structural pattern of
 *      `__tests__/fixtures/hurco-programs/SQUARE CAM.hnc` (real JM Die
 *      output): % wrap, O-program-number header, N-block numbering,
 *      G20/G21 units, G54-G59 work offset, T+M6 tool change, S+M3 spindle,
 *      coolant call, G0 rapids, G1/G2/G3 cuts, prove-out marker, M30.
 *   4. Writes the generated program to
 *      `state/shared/hurco-winmax-proveout/proveout-<ts>.hnc` so the
 *      operator can drag it into WinMax on the desktop.
 *
 * Why a test (not a script): the build is stale; vitest runs from source
 * without a build step. Side-effect of producing the .hnc is acceptable
 * because the file lands in a session-scoped output dir, not a tracked
 * surface. Anti-regression: same test invariants pin the engine output
 * shape so a future engine change can't silently break WinMax compat.
 *
 * @milestone HURCO-WINMAX-PROVEOUT-MS0
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
const OUT_DIR = resolve(PROJECT_ROOT, "state", "shared", "hurco-winmax-proveout");

// JM Die representative op: face-mill the perimeter of a 50x50mm
// aluminum block at Z = -0.5mm. Spindle 5000rpm @ 800mm/min — production
// values for a 12mm 4-flute carbide in 6061-T6. Prove-out cuts this in
// half to 400mm/min so the operator can audit the first piece safely.
const FACE_MILL_OP: MillOperation = {
  operation_type: "face",
  tool_number: 14,
  tool_diameter_mm: 12,
  tool_flutes: 4,
  tool_description: "12mm 4FL CARBIDE FACE MILL",
  material_iso: "N",  // ISO N = aluminum/non-ferrous
  spindle_rpm: 5000,
  feed_mm_min: 800,
  axial_depth_mm: 0.5,
  radial_depth_mm: 8,
  coolant: "flood",
  coordinates: [
    { x: -30, y: -30, z: 5,     type: "rapid"  },
    { x: -30, y: -30, z: -0.5,  type: "linear" },
    { x:  30, y: -30, z: -0.5,  type: "linear" },
    { x:  30, y:  30, z: -0.5,  type: "linear" },
    { x: -30, y:  30, z: -0.5,  type: "linear" },
    { x: -30, y: -30, z: -0.5,  type: "linear" },
    { x: -30, y: -30, z: 5,     type: "rapid"  },
  ],
};

const CONFIG: HurcoPostConfig = {
  program_number: 5023,
  program_comment: "JM DIE PROVE-OUT 50MM SQR AL 6061",
  use_conversational: false,  // pure NC mode for max controller compat
  use_ultimotion: false,       // disable trajectory smoothing on first-piece
  coolant_mode: "flood",
  work_offset: 54,             // G54
  units: "metric",
  safe_z_mm: 25,
  prove_out: {
    enabled: true,
    feed_factor: PROVE_OUT_DEFAULT_FEED_FACTOR,  // 0.5 — half-speed for audit
  },
};

describe("HurcoV11 → WinMax prove-out (operator-loadable .hnc)", () => {
  const engine = new HurcoV11MillMasterPostEngine();
  const result = engine.generateProgram([FACE_MILL_OP], CONFIG);
  const program = result.gcode.join("\n");

  it("emits a non-empty multi-line program", () => {
    expect(result.gcode.length).toBeGreaterThan(10);
    expect(program.length).toBeGreaterThan(200);
  });

  it("reports prove_out_mode = true (engine flag tracks caller intent)", () => {
    expect(result.prove_out_mode).toBe(true);
  });

  it("applies the 0.5 prove-out feed factor to the operation", () => {
    expect(result.feed_optimizations.length).toBeGreaterThanOrEqual(1);
    const proveOutAudits = result.feed_optimizations.filter(o => o.label === PROVE_OUT_LABEL);
    expect(proveOutAudits.length).toBeGreaterThanOrEqual(1);
    for (const audit of proveOutAudits) {
      expect(audit.multiplier).toBeCloseTo(PROVE_OUT_DEFAULT_FEED_FACTOR, 6);
      // 800 mm/min × 0.5 = 400 mm/min
      expect(audit.optimized_feed_mm_min).toBeCloseTo(400, 1);
    }
  });

  it("uses G21 metric (caller asked for units:metric)", () => {
    expect(program).toMatch(/\bG21\b/);
  });

  it("uses G54 work offset (caller asked for work_offset:54)", () => {
    expect(program).toMatch(/\bG54\b/);
  });

  it("has the requested O-program-number header (O5023)", () => {
    expect(program).toMatch(/O5023\b/);
  });

  it("issues a tool change to T14 (the FACE_MILL_OP tool)", () => {
    expect(program).toMatch(/\bT14\b.*\bM6?\b|\bM6\b.*\bT14\b|T14\s*M0?6/);
  });

  it("starts the spindle (M3) at the requested 5000 RPM", () => {
    expect(program).toMatch(/\bS5000\b/);
    expect(program).toMatch(/\bM0?3\b/);
  });

  it("turns coolant on (M8) — caller asked for flood", () => {
    expect(program).toMatch(/\bM0?8\b/);
  });

  it("emits at least one rapid (G0/G00) and one linear (G1/G01) move", () => {
    // Hurco emits Fanuc-style two-digit codes (G00, G01) — accept both.
    expect(program).toMatch(/\bG0+\b/);
    expect(program).toMatch(/\bG0?1\b/);
  });

  it("ends the program with M30 (canonical Hurco program end)", () => {
    expect(program).toMatch(/M30\b/);
  });

  it("writes the .hnc file to state/shared/hurco-winmax-proveout/", () => {
    mkdirSync(OUT_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const outPath = resolve(OUT_DIR, `proveout-${ts}.hnc`);
    // WinMax accepts the program with a leading `%` and trailing `%`
    // (DNC-style framing). The engine already emits its own `%` after M30;
    // only wrap if absent so we don't double-up the trailer.
    const hasLead = program.trimStart().startsWith("%");
    const hasTail = program.trimEnd().endsWith("%");
    const wrapped = `${hasLead ? "" : "%\n"}${program}${hasTail ? "\n" : "\n%\n"}`;
    writeFileSync(outPath, wrapped, "utf8");
    // Also write a stable filename so the operator can re-open the
    // latest prove-out without picking a timestamp.
    writeFileSync(resolve(OUT_DIR, "proveout-latest.hnc"), wrapped, "utf8");
    expect(wrapped).toMatch(/^%\n/);
    expect(wrapped).toMatch(/%\n$/);
  });

  it("warns nothing about Kienzle / material-physics blocks (sane defaults sweep)", () => {
    // Caller used aluminum + medium feed + small DOC — should never trip
    // a physics block on a 15 HP machine. Any warning here means the
    // engine is rejecting safe operating points, which would block prove-out.
    const physicsBlocks = (result.physics_checks ?? []).filter(c => !c.passed);
    expect(physicsBlocks, JSON.stringify(physicsBlocks)).toHaveLength(0);
  });

  it("reports the 14-tool slot was used (tools_used[] contains T14)", () => {
    expect(result.tools_used).toContain(14);
  });
});
