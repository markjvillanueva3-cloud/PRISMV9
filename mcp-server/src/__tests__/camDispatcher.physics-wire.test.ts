/**
 * camDispatcher — CAM physics/score engine wiring suite (U-CAM-WIRE-PHYS)
 * =======================================================================
 *
 * slot:kilo 2026-05-29 — wires 6 validator-confirmed TRULY-UNWIRED CAM physics/score
 * engines (real, tested, referenced nowhere in src) into prism_cam, each with one action:
 *   cam_kienzle_force     → CAMKienzleForceEngine.compute       (Fc = kc·h·b, kc = kc1.1·h^-mc)
 *   cam_taylor_tool_life  → CAMTaylorToolLifeEngine.predict      (T = (C/Vc)^(1/n))
 *   cam_feedrate_chipload → CAMFeedrateChiploadEngine.compute    (rpm = Vc·1000/(π·D))
 *   cam_tool_deflection   → CAMToolStickoutDeflectionEngine.compute (δ = FL³/3EI, I = πd⁴/64)
 *   cam_coolant_strategy  → CAMCoolantStrategyEngine.select       (op/material → strategy)
 *   cam_omega_score       → CAMOmegaScoreEngine.score             (Ω = S(x)+tolerance blend)
 *
 * Fixtures reuse each engine's OWN test values (concrete input→output), so the round-trip
 * asserts the real physics flows through the dispatcher — not a shape stub. Includes the
 * z.enum-membership guard for the false-green class (MockMCPServer bypasses the SDK z.enum).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCamDispatcher, ACTIONS } from "../tools/dispatchers/camDispatcher.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, handler });
  }
}

async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<{ ok: boolean; data: any }> {
  const tool = server.tools.find(t => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw };
  }
  const text = (raw as { content: { type: string; text: string }[] }).content[0]!.text;
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>)) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerCamDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

describe("CAM physics wire — enum registration", () => {
  it("all 6 actions are in the prism_cam z.enum ACTIONS list", () => {
    for (const a of ["cam_kienzle_force", "cam_taylor_tool_life", "cam_feedrate_chipload", "cam_tool_deflection", "cam_coolant_strategy", "cam_omega_score"]) {
      expect(ACTIONS).toContain(a);
    }
  });
  it("no duplicate ACTIONS keys (anti-regression)", () => {
    expect(new Set(ACTIONS).size).toBe(ACTIONS.length);
  });
});

describe("cam_kienzle_force — Kienzle specific cutting force", () => {
  it("steel @ h=0.2 b=5 → kc≈2691.5, kc1.1=1800, Fc≈2691.5", async () => {
    const r = await call(server, "cam_kienzle_force", { material: "steel", hMm: 0.2, bMm: 5, toolDiameterMm: 10, spindleRpm: 3000 });
    expect(r.ok).toBe(true);
    expect(r.data.kcNMm2).toBeCloseTo(2691.5, 0);
    expect(r.data.kc11NMm2).toBe(1800);
    expect(r.data.fcN).toBeCloseTo(2691.5 * 0.2 * 5, 0);
  });
});

describe("cam_taylor_tool_life — Taylor T=(C/Vc)^(1/n)", () => {
  it("steel life decreases with cutting speed (monotonic, proves real Taylor compute)", async () => {
    const slow = await call(server, "cam_taylor_tool_life", { material: "steel", cuttingSpeedMmin: 100 });
    const fast = await call(server, "cam_taylor_tool_life", { material: "steel", cuttingSpeedMmin: 200 });
    expect(slow.ok).toBe(true);
    expect(fast.ok).toBe(true);
    expect(slow.data.toolLifeMin).toBeGreaterThan(fast.data.toolLifeMin);
    expect(slow.data.toolLifeMin).toBeGreaterThan(0);
    expect(slow.data.constants.C).toBeGreaterThan(0);
  });
});

describe("cam_feedrate_chipload — rpm = Vc·1000/(π·D)", () => {
  it("Vc=100 D=10 z=4 fz=0.05 → rpm≈3183.1, feed=fz·z·rpm", async () => {
    const r = await call(server, "cam_feedrate_chipload", { cuttingSpeedMmin: 100, toolDiameterMm: 10, fluteCount: 4, chiploadMmTooth: 0.05 });
    expect(r.ok).toBe(true);
    expect(r.data.spindleRpm).toBeCloseTo(3183.1, 0);
    expect(r.data.feedrateMmMin).toBeCloseTo(0.05 * 4 * r.data.spindleRpm, 1);
  });
});

describe("cam_tool_deflection — δ = FL³/3EI, I = πd⁴/64", () => {
  it("d=10 carbide → I≈πd⁴/64, E=580GPa", async () => {
    const r = await call(server, "cam_tool_deflection", { stickoutMm: 50, toolDiameterMm: 10, forceN: 100, toolMaterial: "carbide" });
    expect(r.ok).toBe(true);
    expect(r.data.iMm4).toBeCloseTo(Math.PI * Math.pow(10, 4) / 64, 2);
    expect(r.data.modulusGPa).toBe(580);
    expect(r.data.deflectionMm).toBeGreaterThan(0);
  });
});

describe("cam_coolant_strategy — op/material → strategy", () => {
  it("laser_cut → air_blast @ 12 bar; wedm_2axis → submerged", async () => {
    const laser = await call(server, "cam_coolant_strategy", { op: "laser_cut" });
    expect(laser.ok).toBe(true);
    expect(laser.data.strategy).toBe("air_blast");
    expect(laser.data.pressureBar).toBe(12);
    const wedm = await call(server, "cam_coolant_strategy", { op: "wedm_2axis" });
    expect(wedm.data.strategy).toBe("submerged");
  });
});

describe("cam_omega_score — Ω safety + tolerance blend", () => {
  it("S(x)=1.0, within tolerance → Ω≈1.0, ok=true", async () => {
    const r = await call(server, "cam_omega_score", { sx: 1.0, cumulativeMm: 0.025, printToleranceMm: 0.05 });
    expect(r.ok).toBe(true);
    expect(r.data.omega).toBeCloseTo(1.0, 6);
    expect(r.data.ok).toBe(true);
  });
  it("tolerance exceeded → compliance drops (Ω penalized)", async () => {
    const r = await call(server, "cam_omega_score", { sx: 1.0, cumulativeMm: 0.15, printToleranceMm: 0.10 });
    expect(r.ok).toBe(true);
    expect(r.data.toleranceCompliance).toBeCloseTo(0.5, 6);
  });
});
