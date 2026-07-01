/**
 * U-BRIDGE-WIRE-CROSS — real dispatcher round-trip tests
 * =======================================================
 * Verifies the 6 newly-wired prism_session actions for
 * CrossCAMComparisonLedgerEngine + CrossToolCouplingEngine.
 * No mocks of system-under-test — invokes the live dispatcher
 * via a captured server.tool handler and asserts actual returned
 * fields against engine contract (Wilson lower-bound ordering,
 * matrix size, stability enum, confidence range).
 *
 * Generated as part of oscar /loop drain iter 2 (2026-05-23).
 *
 * @module __tests__/cross_engines_wire
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { z } from "zod";

import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";
import { crossCAMComparisonLedgerEngine } from "../engines/CrossCAMComparisonLedgerEngine.js";

type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
  content: Array<{ type: "text"; text: string }>;
}>;

let invoke: (action: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;

beforeAll(() => {
  let captured: Handler | undefined;
  const fakeServer = {
    tool: (
      _name: string,
      _desc: string,
      _schema: { action: z.ZodEnum; params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>> },
      handler: Handler,
    ) => {
      captured = handler;
    },
  };
  registerSessionDispatcher(fakeServer);
  if (!captured) throw new Error("registerSessionDispatcher did not register prism_session");
  const h = captured;
  invoke = async (action, params = {}) => {
    const res = await h({ action, params });
    return JSON.parse(res.content[0].text) as Record<string, unknown>;
  };
});

describe("prism_session::cross_cam_ledger_* (CrossCAMComparisonLedgerEngine)", () => {
  beforeEach(() => {
    crossCAMComparisonLedgerEngine.reset();
  });

  it("record returns accumulator with n=1, successes=1, pointEstimate=1 after one success observation", async () => {
    const r = await invoke("cross_cam_ledger_record", {
      cam_system: "mastercam",
      feature_class: "pocket",
      material_class: "aluminum",
      machine_class: "3axis_mill",
      success: 1,
    });
    expect(r.success).toBe(true);
    const acc = r.accumulator as { n: number; successes: number; pointEstimate: number; wilsonLower: number; wilsonUpper: number };
    expect(acc.n).toBe(1);
    expect(acc.successes).toBe(1);
    expect(acc.pointEstimate).toBe(1);
    // Wilson(1, 1, 1.96) ≈ 0.2065 lower, 1.0 upper — strict bounds, not just truthiness
    expect(acc.wilsonLower).toBeCloseTo(0.2065, 3);
    expect(acc.wilsonUpper).toBe(1);
  });

  it("record accepts boolean success and normalizes to 0/1 (2 calls: false then true ⇒ n=2 successes=1)", async () => {
    const promises = [false, true].map((s) =>
      invoke("cross_cam_ledger_record", {
        cam_system: "fusion360",
        feature_class: "contour",
        material_class: "steel",
        machine_class: "lathe",
        success: s,
      }),
    );
    const results = await Promise.all(promises);
    const last = results[1].accumulator as { n: number; successes: number; pointEstimate: number };
    expect(last.n).toBe(2);
    expect(last.successes).toBe(1);
    expect(last.pointEstimate).toBe(0.5);
  });

  it("record rejects missing required feature_class/material_class/machine_class via Zod gate", async () => {
    const r = await invoke("cross_cam_ledger_record", { cam_system: "mastercam", success: 1 });
    expect(typeof r.error).toBe("string");
    expect((r.error as string).toLowerCase()).toMatch(/invalid|feature_class|material_class|machine_class/);
  });

  it("leaderboard ranks high-n CAM ABOVE small-n perfect CAM per Wilson (statistical correctness)", async () => {
    const cell = { feature_class: "pocket", material_class: "titanium", machine_class: "5axis" };
    // mastercam: 5/5 (perfect but small n)
    const mc = Array.from({ length: 5 }, () =>
      invoke("cross_cam_ledger_record", { ...cell, cam_system: "mastercam", success: 1 }),
    );
    // hyperMILL: 18/20 (90% with bigger n)
    const hm = Array.from({ length: 20 }, (_, i) =>
      invoke("cross_cam_ledger_record", { ...cell, cam_system: "hyperMILL", success: i < 18 ? 1 : 0 }),
    );
    await Promise.all([...mc, ...hm]);

    const r = await invoke("cross_cam_ledger_leaderboard", cell);
    expect(r.success).toBe(true);
    const entries = r.entries as Array<{ camSystem: string; wilsonLower: number; n: number; successes: number }>;
    expect(entries.length).toBe(2);
    // Wilson correction must rank hyperMILL FIRST despite mastercam's higher point estimate
    expect(entries[0].camSystem).toBe("hyperMILL");
    expect(entries[0].n).toBe(20);
    expect(entries[0].successes).toBe(18);
    expect(entries[1].camSystem).toBe("mastercam");
    expect(entries[1].n).toBe(5);
    expect(entries[0].wilsonLower).toBeGreaterThan(entries[1].wilsonLower);
    expect(r.topCam).toBe("hyperMILL");
  });

  it("by_cam returns exactly the cells observed for that CAM (count + camSystem assertion)", async () => {
    await Promise.all([
      invoke("cross_cam_ledger_record", {
        cam_system: "mastercam", feature_class: "pocket",
        material_class: "aluminum", machine_class: "3axis", success: 1,
      }),
      invoke("cross_cam_ledger_record", {
        cam_system: "mastercam", feature_class: "drill",
        material_class: "steel", machine_class: "3axis", success: 0,
      }),
      invoke("cross_cam_ledger_record", {
        cam_system: "hyperMILL", feature_class: "contour",
        material_class: "steel", machine_class: "lathe", success: 1,
      }),
    ]);
    const r = await invoke("cross_cam_ledger_by_cam", { cam_system: "mastercam" });
    expect(r.success).toBe(true);
    expect(r.cam_system).toBe("mastercam");
    expect(r.count).toBe(2);
    const entries = r.entries as Array<{ camSystem: string; featureClass: string }>;
    expect(entries.length).toBe(2);
    expect(entries.every((e) => e.camSystem === "mastercam")).toBe(true);
    const features = entries.map((e) => e.featureClass).sort();
    expect(features).toEqual(["drill", "pocket"]);
  });

  it("by_cam rejects empty cam_system via Zod gate", async () => {
    const r = await invoke("cross_cam_ledger_by_cam", { cam_system: "" });
    expect(typeof r.error).toBe("string");
    expect((r.error as string).toLowerCase()).toMatch(/invalid|cam_system/);
  });

  it("stats reports exactly N distinct cells + M total observations", async () => {
    await Promise.all([
      invoke("cross_cam_ledger_record", {
        cam_system: "mastercam", feature_class: "pocket",
        material_class: "aluminum", machine_class: "3axis", success: 1,
      }),
      invoke("cross_cam_ledger_record", {
        cam_system: "hyperMILL", feature_class: "drill",
        material_class: "steel", machine_class: "lathe", success: 0,
      }),
      invoke("cross_cam_ledger_record", {
        cam_system: "hyperMILL", feature_class: "drill",
        material_class: "steel", machine_class: "lathe", success: 1,
      }),
    ]);
    const r = await invoke("cross_cam_ledger_stats");
    expect(r.success).toBe(true);
    expect(r.total_cells).toBe(2);
    expect(r.total_observations).toBe(3);
  });

  it("reset zeroes total_cells AND total_observations", async () => {
    await invoke("cross_cam_ledger_record", {
      cam_system: "mastercam", feature_class: "pocket",
      material_class: "aluminum", machine_class: "3axis", success: 1,
    });
    const r1 = await invoke("cross_cam_ledger_stats");
    expect(r1.total_observations).toBe(1);
    expect(r1.total_cells).toBe(1);

    const reset = await invoke("cross_cam_ledger_reset");
    expect(reset.success).toBe(true);

    const r2 = await invoke("cross_cam_ledger_stats");
    expect(r2.total_observations).toBe(0);
    expect(r2.total_cells).toBe(0);
  });
});

describe("prism_session::cross_tool_coupling_analyze (CrossToolCouplingEngine)", () => {
  const realInput = {
    tools: [
      {
        id: "T1",
        position_mm: { x: 0, y: 0, z: 0 },
        modal_frequency_hz: 1200,
        modal_damping: 0.04,
        modal_stiffness_n_per_um: 80,
        spindle_rpm: 8000,
        flute_count: 4,
        cutting_force_n: 350,
        active: true,
      },
      {
        id: "T2",
        position_mm: { x: 150, y: 0, z: 0 },
        modal_frequency_hz: 1100,
        modal_damping: 0.05,
        modal_stiffness_n_per_um: 70,
        spindle_rpm: 7500,
        flute_count: 4,
        cutting_force_n: 300,
        active: true,
      },
    ],
    workpiece: {
      material: "aluminum_6061",
      elastic_modulus_gpa: 69,
      density_kg_m3: 2700,
      geometry: "plate",
      length_mm: 300,
      width_mm: 200,
      thickness_mm: 25,
    },
    fixture: {
      type: "vise",
      stiffness_n_per_um: 500,
      damping_ratio: 0.08,
      support_points: 4,
    },
  };

  it("analyze returns coupling_matrix of size 2 with diagonal stiffness matching each tool's modal_stiffness", async () => {
    const r = await invoke("cross_tool_coupling_analyze", { input: realInput });
    expect(r.success).toBe(true);
    const cm = r.coupling_matrix as { size: number; stiffness_coupling: number[][] };
    expect(cm.size).toBe(2);
    expect(cm.stiffness_coupling.length).toBe(2);
    expect(cm.stiffness_coupling[0].length).toBe(2);
    expect(cm.stiffness_coupling[1].length).toBe(2);
    // Diagonal must match input stiffness exactly (engine documented K[i][i] = tools[i].modal_stiffness_n_per_um)
    expect(cm.stiffness_coupling[0][0]).toBe(80);
    expect(cm.stiffness_coupling[1][1]).toBe(70);
    // Off-diagonal must be symmetric
    expect(cm.stiffness_coupling[0][1]).toBe(cm.stiffness_coupling[1][0]);
  });

  it("analyze returns stability with overall_stable boolean + synchronization_risk in enum", async () => {
    const r = await invoke("cross_tool_coupling_analyze", { input: realInput });
    const stab = r.stability as { overall_stable: boolean; synchronization_risk: string; limiting_tool_id: string };
    expect(typeof stab.overall_stable).toBe("boolean");
    expect(["none", "low", "moderate", "high"]).toContain(stab.synchronization_risk);
    expect(["T1", "T2"]).toContain(stab.limiting_tool_id);
  });

  it("analyze returns confidence in [0.5, 0.95] per engine contract", async () => {
    const r = await invoke("cross_tool_coupling_analyze", { input: realInput });
    const c = r.confidence as number;
    expect(c).toBeGreaterThanOrEqual(0.5);
    expect(c).toBeLessThanOrEqual(0.95);
  });

  it("analyze accepts root-level tools/workpiece/fixture (alt input shape)", async () => {
    const r = await invoke("cross_tool_coupling_analyze", realInput);
    expect(r.success).toBe(true);
    const cm = r.coupling_matrix as { size: number; stiffness_coupling: number[][] };
    expect(cm.size).toBe(2);
    expect(cm.stiffness_coupling[0][0]).toBe(80);
  });

  it("analyze with only 1 active tool falls back to single-tool branch (matrix size <= 2)", async () => {
    const oneTool = {
      ...realInput,
      tools: [{ ...realInput.tools[0] }, { ...realInput.tools[1], active: false }],
    };
    const r = await invoke("cross_tool_coupling_analyze", { input: oneTool });
    expect(r.success).toBe(true);
    const cm = r.coupling_matrix as { size: number };
    expect(cm.size).toBeGreaterThanOrEqual(1);
    expect(cm.size).toBeLessThanOrEqual(2);
  });
});
