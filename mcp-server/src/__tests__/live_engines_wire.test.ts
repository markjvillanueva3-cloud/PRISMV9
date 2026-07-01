/**
 * U-BRIDGE-WIRE-LIVE — real dispatcher round-trip tests
 * =======================================================
 * Verifies the 3 newly-wired prism_session actions for the 3
 * unwired Live engines (LiveToolingIntelligence + LiveToolingSyntax
 * + LiveTurretCAxis). Real dispatcher invocation via captured
 * server.tool handler; no SUT mocks. Concrete value assertions
 * against documented engine contracts (controller capability table,
 * kinematics validation rules, driven-tool SFM math).
 *
 * Generated as part of oscar /loop drain iter 3 (2026-05-23).
 *
 * @module __tests__/live_engines_wire
 */
import { describe, it, expect, beforeAll } from "vitest";
import { z } from "zod";

import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

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

describe("prism_session::live_tooling_analyze_driven (LiveToolingIntelligenceEngine)", () => {
  it("returns analysis with RPM/power/torque/margins for a real driven-tool op (aluminum end-mill)", async () => {
    const r = await invoke("live_tooling_analyze_driven", {
      operation: {
        material: "aluminum",
        type: "end_mill",
        diameter_mm: 10,
        depth_mm: 2,
        width_mm: 5,
      },
      config: {
        maxDrivenRpm: 6000,
        drivenPower_kW: 5,
        drivenTorque_Nm: 30,
      },
    });
    expect(r.success).toBe(true);
    // Engine wraps result in EngineResult<DrivenToolAnalysis> = {success,data}.
    // Dispatcher spreads it, so r.data carries the DrivenToolAnalysis fields.
    const data = r.data as {
      isCapable: boolean;
      rpmRecommended: number;
      powerRequired_kW: number;
      torqueRequired_Nm: number;
      powerMargin_percent: number;
      torqueMargin_percent: number;
      limitingFactor: string;
      recommendations: string[];
    };
    expect(typeof data.isCapable).toBe("boolean");
    expect(data.rpmRecommended).toBeGreaterThan(0);
    // For aluminum @ 10mm endmill: SFM = 350*3.0 = 1050; RPM = 1050*3.82/(10/25.4) ≈ 10185 → capped at 6000
    expect(data.rpmRecommended).toBe(6000);
    expect(data.powerRequired_kW).toBeGreaterThan(0);
    expect(data.torqueRequired_Nm).toBeGreaterThan(0);
    expect(["none", "power", "torque", "rpm"]).toContain(data.limitingFactor);
  });

  it("rejects missing operation/config with error envelope (no Zod gate — engine guards)", async () => {
    const r1 = await invoke("live_tooling_analyze_driven", { config: { maxDrivenRpm: 6000 } });
    expect(typeof r1.error).toBe("string");
    expect((r1.error as string).toLowerCase()).toMatch(/invalid|operation|required/);

    const r2 = await invoke("live_tooling_analyze_driven", { operation: { material: "steel" } });
    expect(typeof r2.error).toBe("string");
  });
});

describe("prism_session::live_tooling_controller_capabilities (LiveToolingSyntaxEngine)", () => {
  it("returns documented capabilities for okuma (c_axis, y_axis, polar all true)", async () => {
    const r = await invoke("live_tooling_controller_capabilities", { controller: "okuma" });
    expect(r.success).toBe(true);
    expect(r.controller).toBe("okuma");
    const caps = r.capabilities as { c_axis: boolean; y_axis: boolean; polar_interpolation: boolean; canned_cycles: boolean; coordinate_rotation: boolean };
    expect(caps.c_axis).toBe(true);
    expect(caps.y_axis).toBe(true);
    expect(caps.polar_interpolation).toBe(true);
    expect(caps.canned_cycles).toBe(true);
    expect(caps.coordinate_rotation).toBe(true);
  });

  it("returns documented capabilities for haas (y_axis FALSE, coord_rotation FALSE per engine table)", async () => {
    const r = await invoke("live_tooling_controller_capabilities", { controller: "haas" });
    expect(r.success).toBe(true);
    const caps = r.capabilities as { c_axis: boolean; y_axis: boolean; coordinate_rotation: boolean };
    expect(caps.c_axis).toBe(true);
    expect(caps.y_axis).toBe(false);
    expect(caps.coordinate_rotation).toBe(false);
  });

  it("rejects empty controller via Zod gate", async () => {
    const r = await invoke("live_tooling_controller_capabilities", { controller: "" });
    expect(typeof r.error).toBe("string");
    expect((r.error as string).toLowerCase()).toMatch(/invalid|controller/);
  });

  it("rejects unknown controller (Zod enum gate)", async () => {
    const r = await invoke("live_tooling_controller_capabilities", { controller: "made_up_machine" });
    expect(typeof r.error).toBe("string");
  });
});

describe("prism_session::live_turret_validate_kinematics (LiveTurretCAxisEngine)", () => {
  it("returns valid:true + empty issues[] for full-spec kinematics", async () => {
    const r = await invoke("live_turret_validate_kinematics", {
      kinematics: {
        hasCAxis: true,
        maxLiveToolRpm: 6000,
        cAxisRange_deg: 360,
      },
    });
    expect(r.success).toBe(true);
    expect(r.valid).toBe(true);
    // issues[] empty → slimResponse strips it; if present must be empty
    if ("issues" in r) {
      expect(Array.isArray(r.issues)).toBe(true);
      expect((r.issues as unknown[]).length).toBe(0);
    }
  });

  it("returns valid:false + specific issue when hasCAxis=false (documented engine rule)", async () => {
    const r = await invoke("live_turret_validate_kinematics", {
      kinematics: {
        hasCAxis: false,
        maxLiveToolRpm: 6000,
        cAxisRange_deg: 360,
      },
    });
    expect(r.success).toBe(true);
    expect(r.valid).toBe(false);
    const issues = r.issues as string[];
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some((m) => m.toLowerCase().includes("c-axis"))).toBe(true);
  });

  it("returns valid:false when maxLiveToolRpm <= 0 (documented engine rule)", async () => {
    const r = await invoke("live_turret_validate_kinematics", {
      kinematics: {
        hasCAxis: true,
        maxLiveToolRpm: 0,
        cAxisRange_deg: 360,
      },
    });
    expect(r.valid).toBe(false);
    const issues = r.issues as string[];
    expect(issues.some((m) => m.toLowerCase().includes("live tool"))).toBe(true);
  });

  it("accumulates multiple issues when both hasCAxis=false AND maxLiveToolRpm=0", async () => {
    const r = await invoke("live_turret_validate_kinematics", {
      kinematics: {
        hasCAxis: false,
        maxLiveToolRpm: 0,
        cAxisRange_deg: 90,
      },
    });
    expect(r.valid).toBe(false);
    const issues = r.issues as string[];
    expect(issues.length).toBeGreaterThanOrEqual(3);
  });
});
