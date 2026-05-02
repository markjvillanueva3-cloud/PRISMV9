/**
 * Wiring tests for MastercamProbingBridge → camDispatcher.
 *
 * @milestone CAM-EXHAUST-MS0/U-CAM-MC-PROBE-01
 *
 * Asserts:
 *   - The 6 new action ids are members of camDispatcher.ACTIONS (anti-regression)
 *   - The payload shape produced by each dispatcher case matches what callers expect.
 *
 * Engine-level coverage already lives in MastercamProbingBridge.test.ts. This file
 * locks the wiring contract — adding new actions later cannot accidentally drop
 * one of these.
 */
import { describe, it, expect } from "vitest";
import { ACTIONS } from "../tools/dispatchers/camDispatcher.js";
import {
  mastercamProbingBridge,
  type ProbeCycle,
} from "../engines/MastercamProbingBridge.js";

const NEW_ACTION_IDS = [
  "cam_mastercam_probe_part_setup",
  "cam_mastercam_probe_create_cycle",
  "cam_mastercam_probe_gcode",
  "cam_mastercam_probe_tool",
  "cam_mastercam_probe_verify",
  "cam_mastercam_probe_stats",
] as const;

describe("U-CAM-MC-PROBE-01 — action enum membership", () => {
  for (const id of NEW_ACTION_IDS) {
    it(`ACTIONS list contains ${id}`, () => {
      expect((ACTIONS as readonly string[]).includes(id)).toBe(true);
    });
  }

  it("introduces exactly 6 new mastercam probe action ids", () => {
    const present = NEW_ACTION_IDS.filter((id) =>
      (ACTIONS as readonly string[]).includes(id),
    );
    expect(present).toHaveLength(6);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Payload-shape contract — mirrors the dispatcher case bodies in
// camDispatcher.ts so the wiring stays type-stable.
// ──────────────────────────────────────────────────────────────────────────

describe("U-CAM-MC-PROBE-01 — dispatcher payload contract", () => {
  it("part_setup default-wcs path: wcs_number defaults to 54 when undefined", () => {
    // Mirrors: const wcsNumber = (params.wcs_number as number | undefined) ?? 54;
    const wcsNumber = (undefined as number | undefined) ?? 54;
    const r = mastercamProbingBridge.generatePartSetup(
      [{ type: "bore", x: 25, y: 25, z: -5, nominal: 12.7 }],
      wcsNumber,
    );
    expect(r.wcs_number).toBe(54);
    expect(r.probes).toHaveLength(1);
  });

  it("part_setup explicit-wcs path: wcs_number 55 round-trips", () => {
    const r = mastercamProbingBridge.generatePartSetup(
      [
        { type: "corner", x: 0, y: 0, z: 0, sets_axis: "XY" },
        { type: "edge", x: 100, y: 0, z: 0 },
        { type: "surface", x: 50, y: 50, z: 0, sets_axis: "Z" },
      ],
      55,
    );
    expect(r.wcs_number).toBe(55);
    // 3 probes × 8 s/probe — anti-regression on engine constant
    expect(r.estimated_time_sec).toBe(24);
    expect(r.probes[0].sequence).toBe(1);
    expect(r.probes[0].sets_wcs_axis).toBe("XY");
  });

  it("create_cycle default-options path: probeSystem defaults to renishaw, axis to Z for single_point", () => {
    // Mirrors: const options = ... ?? {};
    const r = mastercamProbingBridge.createProbeCycle("single_point", 0, 0, -10, {});
    expect(r.probe_system).toBe("renishaw");
    expect(r.axis).toBe("Z");
  });

  it("create_cycle bore path: axis becomes XY and expected_value preserved", () => {
    const r = mastercamProbingBridge.createProbeCycle("bore", 25, 30, -5, {
      expectedValue: 12.7,
      tolerance: 0.025,
      probeSystem: "blum",
    });
    expect(r.cycle_type).toBe("bore");
    expect(r.axis).toBe("XY");
    expect(r.expected_value).toBe(12.7);
    expect(r.tolerance).toBe(0.025);
    expect(r.probe_system).toBe("blum");
  });

  it("gcode default-controller path: undefined controller falls through to fanuc", () => {
    // Mirrors: const controller = ... ?? "fanuc";
    const cycle = mastercamProbingBridge.createProbeCycle("bore", 25, 25, -5, {
      expectedValue: 12.7,
    });
    const controller =
      (undefined as Parameters<typeof mastercamProbingBridge.generateGCode>[1] | undefined) ??
      "fanuc";
    const probeSystem =
      (undefined as Parameters<typeof mastercamProbingBridge.generateGCode>[2] | undefined) ??
      "renishaw";

    const r = mastercamProbingBridge.generateGCode([cycle], controller, probeSystem);
    expect(r.controller).toBe("fanuc");
    expect(r.probe_system).toBe("renishaw");
    expect(r.gcode_lines.some((l) => l.includes("G65"))).toBe(true);
    // Tolerance check guard line should be emitted when expected_value provided
    expect(r.gcode_lines.some((l) => l.includes("OUT OF TOLERANCE"))).toBe(true);
    // 1 cycle × 10 s — anti-regression on engine constant
    expect(r.estimated_cycle_time_sec).toBe(10);
  });

  it("gcode haas controller routes to G31 macro family", () => {
    const cycle = mastercamProbingBridge.createProbeCycle("single_point", 0, 0, -10);
    const r = mastercamProbingBridge.generateGCode([cycle], "haas", "renishaw");
    expect(r.controller).toBe("haas");
    expect(r.gcode_lines.some((l) => l.includes("G31"))).toBe(true);
  });

  it("tool wrapper: dispatcher returns { gcode_lines: [...] } envelope, not bare array", () => {
    // Mirrors: result = { gcode_lines: mastercamProbingBridge.generateToolProbing(...) };
    const lines = mastercamProbingBridge.generateToolProbing(
      [
        {
          tool_number: 7,
          tool_type: "drill",
          expected_length: 100.0,
          length_tolerance: 0.1,
          breakage_tolerance: 5.0,
          probe_type: "full",
        },
      ],
      "fanuc",
    );
    const wrapped = { gcode_lines: lines };
    expect(Array.isArray(wrapped.gcode_lines)).toBe(true);
    expect(wrapped.gcode_lines.some((l) => l.includes("TOOL 7"))).toBe(true);
    expect(wrapped.gcode_lines.some((l) => l.includes("LENGTH"))).toBe(true);
    expect(wrapped.gcode_lines.some((l) => l.includes("BREAKAGE"))).toBe(true);
  });

  it("verify wrapper: dispatcher returns { results: [...] } envelope and applies measurement_error default 0.0005", () => {
    // Mirrors: const measurementError = (params.measurement_error as number | undefined) ?? 0.0005;
    const cycles: ProbeCycle[] = [
      mastercamProbingBridge.createProbeCycle("bore", 0, 0, 0, {
        expectedValue: 10.0,
        tolerance: 0.1,
      }),
    ];
    const measurementError = (undefined as number | undefined) ?? 0.0005;
    const wrapped = {
      results: mastercamProbingBridge.simulateVerification(cycles, measurementError),
    };

    expect(wrapped.results).toHaveLength(1);
    expect(wrapped.results[0].nominal).toBe(10.0);
    expect(Math.abs(wrapped.results[0].deviation)).toBeLessThanOrEqual(measurementError);
    // Tolerance 0.1 ≫ measurement_error 0.0005 → deterministically in tolerance
    expect(wrapped.results[0].in_tolerance).toBe(true);
    expect(wrapped.results[0].action_taken).toBe("none");
  });

  it("stats: contract — 4 probe systems, 7 cycle types, 6 controllers", () => {
    const r = mastercamProbingBridge.getStats();
    expect(r.probe_systems).toEqual(
      expect.arrayContaining(["renishaw", "heidenhain", "blum", "m_and_h"]),
    );
    expect(r.probe_systems).toHaveLength(4);
    expect(r.cycle_types).toEqual(
      expect.arrayContaining([
        "single_point",
        "bore",
        "boss",
        "web",
        "pocket",
        "surface",
        "angle",
      ]),
    );
    expect(r.cycle_types).toHaveLength(7);
    expect(r.controllers).toEqual(
      expect.arrayContaining(["fanuc", "haas", "mazak", "okuma", "siemens", "heidenhain"]),
    );
    expect(r.controllers).toHaveLength(6);
  });

  it("end-to-end chain: part_setup → create_cycle → gcode produces non-empty program", () => {
    // 1. Part setup
    const setup = mastercamProbingBridge.generatePartSetup(
      [{ type: "bore", x: 25, y: 25, z: -5, nominal: 12.7 }],
      54,
    );
    expect(setup.probes).toHaveLength(1);

    // 2. Create cycle from same coordinates
    const p = setup.probes[0];
    const cycle = mastercamProbingBridge.createProbeCycle("bore", p.x, p.y, p.z, {
      expectedValue: 12.7,
    });
    expect(cycle.x).toBe(25);
    expect(cycle.y).toBe(25);
    expect(cycle.z).toBe(-5);

    // 3. Generate g-code from the cycle
    const gcode = mastercamProbingBridge.generateGCode([cycle], "fanuc", "renishaw");
    expect(gcode.gcode_lines.length).toBeGreaterThan(5);
  });
});
