/**
 * cadDispatcher.naca.test.ts — U-CADC13 dispatcher integration tests
 *
 * Validates the prism_cad dispatcher routes three NACA airfoil actions to
 * NACAAirfoilEngine with correct parameter handling and response shape:
 *   - naca_generate_4digit
 *   - naca_generate_5digit
 *   - naca_parse_uiuc_dat
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
    tool(
      name: string,
      description: string,
      schema: unknown,
      handler: CapturedTool["handler"]
    ) {
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
  // dispatcherError returns a flat { success:false, error, action, dispatcher }
  // shape directly (not wrapped in content:[]). Detect and pass through.
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

describe("cadDispatcher NACA integration (U-CADC13)", () => {
  describe("naca_generate_4digit", () => {
    it("routes symmetric NACA 0012 and returns canonical metadata", async () => {
      const res = await invoke("naca_generate_4digit", { designation: "0012" });
      expect(res.success).toBe(true);
      const profile = res.profile as Record<string, unknown>;
      expect(profile.name).toBe("NACA 0012");
      expect(profile.maxCamber).toBe(0);
      expect(profile.maxThickness).toBeCloseTo(0.12, 6);
      expect(Array.isArray(profile.upper)).toBe(true);
      expect(Array.isArray(profile.lower)).toBe(true);
      expect(Array.isArray(profile.selig)).toBe(true);
    });

    it("routes cambered NACA 2412 with honored chord parameter", async () => {
      const res = await invoke("naca_generate_4digit", {
        designation: "2412",
        chord: 0.5,
      });
      expect(res.success).toBe(true);
      const profile = res.profile as Record<string, unknown> & {
        upper: Array<{ x: number; y: number }>;
      };
      expect(profile.chord).toBe(0.5);
      expect(profile.maxCamber).toBeCloseTo(0.02, 6);
      // Last upper-surface x ≈ chord
      const lastX = profile.upper[profile.upper.length - 1]!.x;
      expect(lastX).toBeCloseTo(0.5, 6);
    });

    it("honors numPoints override", async () => {
      const res = await invoke("naca_generate_4digit", {
        designation: "0012",
        numPoints: 21,
      });
      const profile = res.profile as { upper: unknown[]; lower: unknown[] };
      expect(profile.upper.length).toBe(21);
      expect(profile.lower.length).toBe(21);
    });

    it("propagates engine errors for invalid designation", async () => {
      const res = await invoke("naca_generate_4digit", { designation: "241" });
      expect(res.success).toBe(false);
      const err = (res.error ?? "") as string;
      expect(err).toMatch(/4 digits/);
    });

    it("validates schema: missing designation should fail validation", async () => {
      const res = await invoke("naca_generate_4digit", {});
      expect(res.success).toBe(false);
      const err = (res.error ?? "") as string;
      expect(err).toMatch(/designation|Invalid params/i);
    });
  });

  describe("naca_generate_5digit", () => {
    it("routes NACA 23012 with t=0.12 and camber position P=0.15", async () => {
      const res = await invoke("naca_generate_5digit", {
        designation: "23012",
      });
      expect(res.success).toBe(true);
      const profile = res.profile as Record<string, unknown>;
      expect(profile.name).toBe("NACA 23012");
      expect(profile.maxThickness).toBeCloseTo(0.12, 6);
      expect(profile.maxCamberPosition).toBeCloseTo(0.15, 6);
    });

    it("routes reflexed NACA 23112 without producing NaN coordinates", async () => {
      const res = await invoke("naca_generate_5digit", {
        designation: "23112",
      });
      expect(res.success).toBe(true);
      const profile = res.profile as {
        upper: Array<{ x: number; y: number }>;
        lower: Array<{ x: number; y: number }>;
      };
      for (const p of profile.upper) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      }
      for (const p of profile.lower) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      }
    });

    it("rejects unknown 5-digit camber tag", async () => {
      const res = await invoke("naca_generate_5digit", {
        designation: "26012",
      });
      expect(res.success).toBe(false);
      const err = (res.error ?? "") as string;
      expect(err).toMatch(/camber tag/);
    });
  });

  describe("naca_parse_uiuc_dat", () => {
    it("parses a valid Selig-format file and returns upper/lower split", async () => {
      const dat = [
        "RAE2822",
        "1.000000  0.000000",
        "0.500000  0.050000",
        "0.100000  0.030000",
        "0.000000  0.000000",
        "0.100000  -0.030000",
        "0.500000  -0.050000",
        "1.000000  0.000000",
      ].join("\n");
      const res = await invoke("naca_parse_uiuc_dat", { content: dat });
      expect(res.success).toBe(true);
      const profile = res.profile as {
        name: string;
        upper: unknown[];
        lower: unknown[];
        selig: unknown[];
      };
      expect(profile.name).toBe("RAE2822");
      expect(profile.upper.length).toBe(4);
      expect(profile.lower.length).toBe(4);
      expect(profile.selig.length).toBe(7);
    });

    it("applies chord parameter when scaling parsed coordinates", async () => {
      const dat = [
        "SCALED",
        "1.0  0.0",
        "0.5  0.05",
        "0.0  0.0",
        "0.5  -0.05",
        "1.0  0.0",
      ].join("\n");
      const res = await invoke("naca_parse_uiuc_dat", {
        content: dat,
        chord: 3,
      });
      expect(res.success).toBe(true);
      const profile = res.profile as {
        chord: number;
        selig: Array<{ x: number; y: number }>;
      };
      expect(profile.chord).toBe(3);
      const maxX = Math.max(...profile.selig.map((p) => p.x));
      expect(maxX).toBeCloseTo(3, 6);
    });

    it("rejects empty content", async () => {
      const res = await invoke("naca_parse_uiuc_dat", { content: "" });
      expect(res.success).toBe(false);
      const err = (res.error ?? "") as string;
      expect(err).toMatch(/coordinate rows/);
    });

    it("validates schema: missing content should fail validation", async () => {
      const res = await invoke("naca_parse_uiuc_dat", {});
      expect(res.success).toBe(false);
      const err = (res.error ?? "") as string;
      expect(err).toMatch(/content|Invalid params/i);
    });
  });

  describe("action enum parity", () => {
    it("rejects unknown NACA-like actions not in the enum", async () => {
      // Stub server bypasses the outer z.enum validation, so the handler's
      // default: case fires and produces `{error: "Unknown action: ..."}`.
      const res = await invoke("naca_generate_6digit", { designation: "63412" });
      const err = (res.error ?? "") as string;
      expect(err).toMatch(/Unknown action/i);
    });

    it("accepts all three NACA actions as known routes (not 'unknown action')", async () => {
      // Happy-path shapes exercised above; here we prove the switch cases
      // route into the engine (failure is from the engine, not the dispatcher
      // emitting 'Unknown action: ...').
      const invalid1 = await invoke("naca_generate_4digit", {
        designation: "XYZ0",
      });
      const invalid2 = await invoke("naca_generate_5digit", {
        designation: "XYZ00",
      });
      const invalid3 = await invoke("naca_parse_uiuc_dat", {
        content: "one line only",
      });
      // Each produces a domain-specific error, not an 'Unknown action' one.
      const bodies = [invalid1, invalid2, invalid3].map(
        (r) => ((r.error ?? "") as string).toLowerCase()
      );
      for (const body of bodies) {
        expect(body).not.toMatch(/unknown action/);
      }
    });
  });
});
