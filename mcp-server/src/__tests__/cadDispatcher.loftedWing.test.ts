/**
 * cadDispatcher.loftedWing.test.ts — U-CADC14 dispatcher integration tests
 *
 * Validates prism_cad routes three wing-loft actions to LoftedWingEngine with
 * correct parameter handling and airfoil-profile resolution:
 *   - wing_loft_single_profile (via naca4 shortcut)
 *   - wing_loft_between_profiles (via naca4 + uiucDat shortcut mix)
 *   - wing_compute_properties (hand-built sections)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

// ── Stub MCP server ──────────────────────────────────────────────────────────

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

async function invoke(
  action: string,
  params: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("cadDispatcher LoftedWing integration (U-CADC14)", () => {
  describe("wing_loft_single_profile", () => {
    it("routes rectangular wing built from a naca4 shortcut", async () => {
      const res = await invoke("wing_loft_single_profile", {
        profile: { naca4: "0012", options: { numPoints: 21 } },
        options: {
          halfSpan: 5,
          rootChord: 1,
          tipChord: 1,
          numStations: 7,
          cosineSpanwise: false,
        },
      });
      expect(res.success).toBe(true);
      const wing = res.wing as Record<string, unknown>;
      // Rectangular: area = 10, AR = 10, MAC = 1
      expect(wing.planformArea).toBeCloseTo(10, 5);
      expect(wing.aspectRatio).toBeCloseTo(10, 5);
      expect(wing.meanAerodynamicChord).toBeCloseTo(1, 5);
      expect(wing.taperRatio).toBe(1);
      const sections = wing.sections as unknown[];
      expect(sections.length).toBe(7);
    });

    it("routes tapered swept wing with correct MAC per Raymer formula", async () => {
      const res = await invoke("wing_loft_single_profile", {
        profile: { naca4: "2412" },
        options: {
          halfSpan: 5,
          rootChord: 1.5,
          tipChord: 1.0,
          quarterChordSweepDeg: 20,
          numStations: 9,
        },
      });
      expect(res.success).toBe(true);
      const wing = res.wing as Record<string, number>;
      const expectedMAC = (2 / 3) * 1.5 * (1 + 2 / 3 + 4 / 9) / (1 + 2 / 3);
      expect(wing.meanAerodynamicChord).toBeCloseTo(expectedMAC, 5);
      expect(wing.quarterChordSweepDeg).toBeCloseTo(20, 3);
      expect(wing.taperRatio).toBeCloseTo(2 / 3, 6);
    });

    it("returns ribs3D with a point per selig sample", async () => {
      const res = await invoke("wing_loft_single_profile", {
        profile: { naca4: "0012", options: { numPoints: 11 } },
        options: { halfSpan: 2, rootChord: 1, tipChord: 0.5, numStations: 5 },
      });
      const wing = res.wing as { ribs3D: Array<Array<unknown>> };
      expect(wing.ribs3D.length).toBe(5);
      // 11-point NACA 0012 ⇒ selig length = 21 (2·11 − 1)
      for (const rib of wing.ribs3D) {
        expect(rib.length).toBe(21);
      }
    });

    it("propagates engine validation error for non-positive halfSpan", async () => {
      const res = await invoke("wing_loft_single_profile", {
        profile: { naca4: "0012" },
        options: { halfSpan: 0, rootChord: 1, tipChord: 1 },
      });
      expect(res.success).toBe(false);
      const err = (res.error ?? "") as string;
      expect(err).toMatch(/halfSpan/);
    });
  });

  describe("wing_loft_between_profiles", () => {
    it("blends NACA 2412 root with NACA 0012 tip", async () => {
      const res = await invoke("wing_loft_between_profiles", {
        rootProfile: { naca4: "2412", options: { numPoints: 31 } },
        tipProfile: { naca4: "0012", options: { numPoints: 31 } },
        options: {
          halfSpan: 4,
          rootChord: 1.2,
          tipChord: 0.8,
          numStations: 5,
        },
      });
      expect(res.success).toBe(true);
      const wing = res.wing as {
        sections: Array<{ profile: { maxCamber: number; maxThickness: number } }>;
      };
      // Root section ⇒ maxCamber close to 0.02
      expect(wing.sections[0]!.profile.maxCamber).toBeGreaterThan(0.015);
      // Tip section ⇒ maxCamber close to 0
      expect(wing.sections[wing.sections.length - 1]!.profile.maxCamber).toBeCloseTo(0, 3);
    });

    it("accepts uiucDat shortcut for the tip profile", async () => {
      const dat = [
        "SCALED TIP",
        "1.0  0.0",
        "0.5  0.05",
        "0.0  0.0",
        "0.5  -0.05",
        "1.0  0.0",
      ].join("\n");
      const res = await invoke("wing_loft_between_profiles", {
        rootProfile: { naca4: "0012" },
        tipProfile: { uiucDat: dat },
        options: { halfSpan: 2, rootChord: 1, tipChord: 1, numStations: 3 },
      });
      expect(res.success).toBe(true);
      const wing = res.wing as Record<string, number>;
      expect(wing.planformArea).toBeCloseTo(4, 5);
    });
  });

  describe("wing_compute_properties", () => {
    it("computes metrics for hand-built sections", async () => {
      const sections = [
        { station: 0, chord: 2, twistRad: 0, sweepOffset: 0, dihedralOffset: 0, profile: {} },
        { station: 5, chord: 1, twistRad: 0, sweepOffset: 0, dihedralOffset: 0, profile: {} },
      ];
      const res = await invoke("wing_compute_properties", { sections });
      expect(res.success).toBe(true);
      const props = res.properties as Record<string, number>;
      // Trapezoidal half-area = 0.5·(2+1)·5 = 7.5 ⇒ full area = 15
      expect(props.planformArea).toBeCloseTo(15, 5);
      expect(props.halfSpan).toBe(5);
      expect(props.taperRatio).toBeCloseTo(0.5, 9);
      // AR = (2·5)²/15 = 100/15 ≈ 6.667
      expect(props.aspectRatio).toBeCloseTo(100 / 15, 5);
      // MAC per Raymer: λ=0.5 ⇒ MAC = (2/3)·2·(1+0.5+0.25)/(1+0.5) = (2/3)·2·(1.75/1.5) = 1.5556
      const expectedMAC = (2 / 3) * 2 * (1 + 0.5 + 0.25) / (1 + 0.5);
      expect(props.meanAerodynamicChord).toBeCloseTo(expectedMAC, 6);
    });

    it("rejects single-section input", async () => {
      const res = await invoke("wing_compute_properties", {
        sections: [{ station: 0, chord: 1 }],
      });
      expect(res.success).toBe(false);
      const err = (res.error ?? "") as string;
      expect(err).toMatch(/≥2/);
    });
  });

  describe("profile-resolution helper", () => {
    it("rejects missing airfoil shortcut", async () => {
      const res = await invoke("wing_loft_single_profile", {
        profile: { someOtherField: "foo" },
        options: { halfSpan: 5, rootChord: 1, tipChord: 1 },
      });
      expect(res.success).toBe(false);
      const err = (res.error ?? "") as string;
      expect(err).toMatch(/airfoil profile|shortcut/i);
    });

    it("accepts a full AirfoilProfile object as passthrough", async () => {
      const profile = {
        name: "TEST",
        maxCamber: 0,
        maxCamberPosition: 0,
        maxThickness: 0.1,
        upper: [
          { x: 0, y: 0 },
          { x: 0.5, y: 0.05 },
          { x: 1, y: 0 },
        ],
        lower: [
          { x: 0, y: 0 },
          { x: 0.5, y: -0.05 },
          { x: 1, y: 0 },
        ],
        selig: [
          { x: 1, y: 0 },
          { x: 0.5, y: 0.05 },
          { x: 0, y: 0 },
          { x: 0.5, y: -0.05 },
          { x: 1, y: 0 },
        ],
        chord: 1,
      };
      const res = await invoke("wing_loft_single_profile", {
        profile,
        options: { halfSpan: 2, rootChord: 1, tipChord: 1, numStations: 3 },
      });
      expect(res.success).toBe(true);
    });
  });
});
