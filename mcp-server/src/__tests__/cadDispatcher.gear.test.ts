/**
 * cadDispatcher.gear.test.ts — U-CADC15 dispatcher integration tests
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

describe("cadDispatcher InvoluteGear integration (U-CADC15)", () => {
  describe("gear_compute_geometry", () => {
    it("routes 20-tooth module-2 gear and returns ISO 53 diameters", async () => {
      const res = await invoke("gear_compute_geometry", {
        spec: { teeth: 20, module: 2 },
      });
      expect(res.success).toBe(true);
      const g = res.geometry as Record<string, number>;
      expect(g.pitchDiameter).toBeCloseTo(40, 9);
      expect(g.tipDiameter).toBeCloseTo(44, 6);
      expect(g.rootDiameter).toBeCloseTo(35, 6);
    });

    it("accepts flat params shape (no spec wrapper)", async () => {
      const res = await invoke("gear_compute_geometry", { teeth: 30, module: 1.5 });
      expect(res.success).toBe(true);
      const g = res.geometry as Record<string, number>;
      expect(g.pitchDiameter).toBeCloseTo(45, 9);
    });

    it("propagates validation error for teeth < 5", async () => {
      const res = await invoke("gear_compute_geometry", { spec: { teeth: 3, module: 2 } });
      expect(res.success).toBe(false);
      const err = (res.error ?? "") as string;
      expect(err).toMatch(/≥ 5/);
    });
  });

  describe("gear_generate_tooth_profile", () => {
    it("routes with samplesPerFlank override", async () => {
      const res = await invoke("gear_generate_tooth_profile", {
        spec: { teeth: 12, module: 2 },
        samplesPerFlank: 10,
      });
      expect(res.success).toBe(true);
      const profile = res.profile as {
        toothAngles: number[];
        fullProfile: unknown[];
      };
      expect(profile.toothAngles.length).toBe(12);
      expect(profile.fullProfile.length).toBeGreaterThan(0);
    });

    it("produces finite coordinates for all outline points", async () => {
      const res = await invoke("gear_generate_tooth_profile", {
        spec: { teeth: 24, module: 1 },
      });
      const profile = res.profile as { fullProfile: Array<{ x: number; y: number }> };
      for (const p of profile.fullProfile) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      }
    });
  });

  describe("gear_compute_contact_ratio", () => {
    it("routes a standard 20t × 40t mesh", async () => {
      const res = await invoke("gear_compute_contact_ratio", {
        gear1: { teeth: 20, module: 2 },
        gear2: { teeth: 40, module: 2 },
      });
      expect(res.success).toBe(true);
      const mesh = res.mesh as Record<string, number>;
      expect(mesh.centerDistance).toBeCloseTo(60, 6);
      expect(mesh.contactRatio).toBeGreaterThan(1.5);
      expect(mesh.contactRatio).toBeLessThan(1.8);
    });

    it("rejects mismatched modules", async () => {
      const res = await invoke("gear_compute_contact_ratio", {
        gear1: { teeth: 20, module: 2 },
        gear2: { teeth: 20, module: 3 },
      });
      expect(res.success).toBe(false);
    });
  });
});
