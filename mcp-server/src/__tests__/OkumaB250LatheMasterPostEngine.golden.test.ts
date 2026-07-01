/**
 * OkumaB250LatheMasterPostEngine -- GOLDEN PROGRAM SNAPSHOT (U-PP-LATHE-GOLDEN-SNAPSHOT)
 *
 * A regression backstop that byte-locks the ENTIRE emitted lathe program against a
 * committed golden snapshot -- catching drift the targeted invariant tests
 * (OkumaB250LatheMasterPostEngine.test.ts) do NOT assert. A change to ANY emit logic
 * (block format, safe-start order, op codes, comments) fails the snapshot; an
 * intentional change is reviewed + re-blessed via `vitest -u`. This is the autonomous
 * arm of the "golden NC" goal -- byte-equiv vs JM's real .cps goldens needs CAM source
 * + is operator/CIMCO-gated (per scripts/cimco-post-proof.mjs).
 *
 * DETERMINISM: the engine emits `(GENERATED: <iso-timestamp>)` (engine line 343), the
 * exact volatile-header class cimco-post-proof flags. It is masked here so the snapshot
 * locks the deterministic body; the test also proves the volatile line appears exactly once.
 */
import { describe, it, expect } from "vitest";
import {
  OkumaB250LatheMasterPostEngine,
  type TurningOperation,
} from "../engines/OkumaB250LatheMasterPostEngine.js";

const engine = new OkumaB250LatheMasterPostEngine();

/** Normalize the single volatile `(GENERATED: <iso>)` line for a stable snapshot. */
function maskVolatile(gcode: string[]): string[] {
  return gcode.map((l) => l.replace(/^\(GENERATED: .*\)$/, "(GENERATED: <NORMALIZED>)"));
}

/** A representative multi-op turning program exercising the common emit paths. */
const PROGRAM: TurningOperation[] = [
  { operation_type: "od_rough",  tool_number: 1, tool_orientation: 3, insert_radius_mm: 0.8, material_iso: "P", css_m_min: 200, feed_mm_rev: 0.25, depth_of_cut_mm: 2.0, start_x: 50, start_z: 0,   end_x: 48,   end_z: -30, coolant: "flood" },
  { operation_type: "od_finish", tool_number: 2, tool_orientation: 3, insert_radius_mm: 0.4, material_iso: "P", css_m_min: 240, feed_mm_rev: 0.12, depth_of_cut_mm: 0.3, start_x: 48, start_z: 0,   end_x: 47.6, end_z: -30, coolant: "flood" },
  { operation_type: "face",      tool_number: 3, tool_orientation: 3, insert_radius_mm: 0.8, material_iso: "P", css_m_min: 200, feed_mm_rev: 0.15, depth_of_cut_mm: 0.5, start_x: 50, start_z: 0.5, end_x: -1,   end_z: 0,   coolant: "flood" },
  { operation_type: "part_off",  tool_number: 4, tool_orientation: 3, insert_radius_mm: 0.2, material_iso: "P", css_m_min: 120, feed_mm_rev: 0.08, depth_of_cut_mm: 3.0, start_x: 50, start_z: -30, end_x: -1,   end_z: -30, coolant: "flood" },
];

const headerOf = (g: string[]) => g.find((l) => l.startsWith("(MACHINE:"));

/** Fresh deep copy per call -- generateProgram may normalize/clamp ops in place,
 *  so a shared array would make sequential calls diverge (test isolation). */
const fresh = (): TurningOperation[] => PROGRAM.map((o) => ({ ...o }));

describe("OkumaB250LatheMasterPostEngine -- golden program snapshot (U-PP-LATHE-GOLDEN-SNAPSHOT)", () => {
  it("emits a deterministic, byte-locked golden program for the LB250II-M baseline", () => {
    const out = engine.generateProgram(fresh(), { program_number: 1, machine_id: "LB250II-M" });
    // Determinism precondition: exactly one volatile GENERATED line (masked below).
    expect(out.gcode.filter((l) => l.startsWith("(GENERATED:")).length).toBe(1);
    // No op dropped -- a drop means a missing/non-finite input field, NOT an emit regression.
    expect(out.skipped_operations).toBe(0);
    expect(maskVolatile(out.gcode).join("\n")).toMatchSnapshot();
  });

  it("machine_id changes ONLY the (MACHINE: ...) header -- no other body line differs", () => {
    const base = maskVolatile(engine.generateProgram(fresh(), { program_number: 1, machine_id: "LB250II-M" }).gcode);
    const genos = maskVolatile(engine.generateProgram(fresh(), { program_number: 1, machine_id: "GENOS-L300-M" }).gcode);
    expect(genos.length).toBe(base.length);
    // Collect every line that differs; identity is a HEADER-only fact, so the ONLY
    // permitted difference is the (MACHINE: ...) line. A non-header diff means
    // machine_id leaked into the toolpath body (or an unmasked volatile line) -- the
    // empty-array assertion surfaces the exact offending lines.
    const nonHeaderDiffs = base
      .map((l, i) => (l !== genos[i] ? { i, base: l, genos: genos[i] } : null))
      .filter((d): d is { i: number; base: string; genos: string } => d !== null && !d.base.startsWith("(MACHINE:"));
    expect(nonHeaderDiffs).toEqual([]);
    // ...and the header DOES differ (proves identity is wired, not a silent no-op).
    expect(headerOf(genos)).toBe("(MACHINE: OKUMA GENOS L300-M OSP-P300L-R)");
    expect(headerOf(base)).toBe("(MACHINE: OKUMA LB250II-M OSP-P300L)");
  });

  it("the emitted program carries no non-finite tokens and terminates the program", () => {
    const out = engine.generateProgram(fresh(), { machine_id: "LB250II-M" });
    const text = out.gcode.join("\n");
    expect(text).not.toMatch(/NaN|Infinity/);
    // Structural sanity: the program is terminated (M30 program end or M02).
    expect(out.gcode.some((l) => /\bM30\b|\bM02\b/.test(l))).toBe(true);
  });
});
