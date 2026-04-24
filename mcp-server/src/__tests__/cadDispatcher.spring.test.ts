/**
 * cadDispatcher.spring.test.ts — U-CADC16 dispatcher integration tests
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: {
    action: string;
    params?: Record<string, unknown>;
  }) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (res && res.success === false) return res;
  const content = res.content as Array<{ type: string; text: string }> | undefined;
  const text = content?.[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadDispatcher(server as unknown as Parameters<typeof registerCadDispatcher>[0]);
  const tool = server.tools.find((t) => t.name === "prism_cad");
  if (!tool) throw new Error("prism_cad tool was not registered");
  handler = tool.handler;
});

describe("cadDispatcher HelicalSpring integration (U-CADC16)", () => {
  describe("spring_compute_geometry", () => {
    it("routes a d=2 D=18 Na=10 spring and returns canonical geometry", async () => {
      const res = await invoke("spring_compute_geometry", {
        spec: { wireDiameter: 2, meanCoilDiameter: 18, activeCoils: 10 },
      });
      expect(res.success).toBe(true);
      const g = res.geometry as Record<string, number>;
      expect(g.springIndex).toBeCloseTo(9, 9);
      expect(g.outerDiameter).toBeCloseTo(20, 9);
      expect(g.innerDiameter).toBeCloseTo(16, 9);
      expect(g.totalCoils).toBe(12); // squared_ground default: Na + 2
    });

    it("accepts flat-shape params (no spec wrapper)", async () => {
      const res = await invoke("spring_compute_geometry", {
        wireDiameter: 3,
        meanCoilDiameter: 20,
        activeCoils: 8,
      });
      expect(res.success).toBe(true);
    });

    it("propagates error for unphysical index", async () => {
      const res = await invoke("spring_compute_geometry", {
        spec: { wireDiameter: 5, meanCoilDiameter: 5, activeCoils: 5 },
      });
      expect(res.success).toBe(false);
    });
  });

  describe("spring_compute_mechanics", () => {
    it("returns Shigley-consistent spring rate for music-wire 2/18/10", async () => {
      const res = await invoke("spring_compute_mechanics", {
        spec: { wireDiameter: 2, meanCoilDiameter: 18, activeCoils: 10, material: "music_wire" },
      });
      expect(res.success).toBe(true);
      const mech = res.mechanics as Record<string, number>;
      expect(mech.springRateNPerMm).toBeCloseTo(2.802, 2);
      expect(mech.shearModulusMPa).toBe(81_700);
      expect(mech.wahlFactor).toBeGreaterThan(1);
    });

    it("honors shearModulusMPa override", async () => {
      const res = await invoke("spring_compute_mechanics", {
        spec: {
          wireDiameter: 2,
          meanCoilDiameter: 18,
          activeCoils: 10,
          shearModulusMPa: 70_000,
        },
      });
      const mech = res.mechanics as Record<string, number>;
      expect(mech.shearModulusMPa).toBe(70_000);
    });
  });

  describe("spring_compute_stress_at_force", () => {
    it("applies Wahl correction when useWahl=true", async () => {
      const specParams = { wireDiameter: 2, meanCoilDiameter: 12, activeCoils: 10 };
      const corrected = await invoke("spring_compute_stress_at_force", {
        spec: specParams,
        forceN: 50,
        useWahl: true,
      });
      const uncorrected = await invoke("spring_compute_stress_at_force", {
        spec: specParams,
        forceN: 50,
        useWahl: false,
      });
      const cs = corrected.stress as Record<string, unknown>;
      const us = uncorrected.stress as Record<string, unknown>;
      expect(cs.corrected).toBe(true);
      expect(us.corrected).toBe(false);
      expect(cs.shearStressMPa as number).toBeGreaterThan(us.shearStressMPa as number);
    });
  });

  describe("spring_generate_coil_path", () => {
    it("routes coil-path generation with 12 samplesPerCoil", async () => {
      const res = await invoke("spring_generate_coil_path", {
        spec: {
          wireDiameter: 2,
          meanCoilDiameter: 20,
          activeCoils: 6,
          freeLength: 30,
          endCondition: "plain",
        },
        samplesPerCoil: 12,
      });
      expect(res.success).toBe(true);
      const path = res.path as { centerlinePath: Array<{ x: number; y: number; z: number }> };
      expect(path.centerlinePath.length).toBeGreaterThan(60);
      for (const p of path.centerlinePath) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.z)).toBe(true);
      }
    });
  });
});
