/**
 * camDispatcher — MultiControllerCalibrationEngine wiring suite
 * =============================================================
 *
 * INDIA-POST-WIRE U-CTRL-CALIB-WIRE (india /loop 2026-05-22) — wires the
 * cross-dialect controller calibration harness (P2P-FULLSTACK-MS0/U-P2PFS60)
 * into prism_cam. The engine had ZERO dispatcher refs: it consults post-engines
 * through a pluggable ControllerProbe abstraction (a probe carries an
 * emissions() method, not JSON-safe). The StaticControllerProbe class builds
 * a probe from plain emission data, so the dispatcher reconstructs probes
 * from JSON params; canonicalProbes() supplies a 5-controller default.
 *
 * 3 actions:
 *   cam_controller_calibration_required     — the 5 canonical emission categories
 *   cam_controller_calibration_compare_all  — cross-dialect consistency (probes optional)
 *   cam_controller_calibration_compare_one  — single-probe compliance
 *
 * Tests exercise the deterministic aggregation surface end-to-end through the
 * dispatcher (z.enum gate → case → StaticControllerProbe → engine → envelope).
 * Empty arrays (e.g. divergent_dialects on an all-pass run) are stripped by
 * responseSlimmer at transport — assertions account for that.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCamDispatcher, ACTIONS } from "../tools/dispatchers/camDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: any }> {
  const tool = server.tools.find(t => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
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

// Fully-compliant emission set: all 5 canonical categories, required.
const COMPLIANT = [
  { category: "units", code: "G21", required: true },
  { category: "plane_xy", code: "G17", required: true },
  { category: "absolute_mode", code: "G90", required: true },
  { category: "feed_mode", code: "G94", required: true },
  { category: "end_of_program", code: "M30", required: true },
];
// Missing "units" — non-compliant.
const MISSING_UNITS = COMPLIANT.filter(e => e.category !== "units");

const CALIB_ACTIONS = [
  "cam_controller_calibration_required",
  "cam_controller_calibration_compare_all",
  "cam_controller_calibration_compare_one",
] as const;

// ─────────────────────────────────────────────────────────────────────
// 1. z.enum gate membership
// ─────────────────────────────────────────────────────────────────────
describe("U-CTRL-CALIB-WIRE — enum membership", () => {
  it("registers all 3 controller-calibration actions in ACTIONS", () => {
    for (const a of CALIB_ACTIONS) {
      expect(ACTIONS).toContain(a);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. canonical requirement set
// ─────────────────────────────────────────────────────────────────────
describe("U-CTRL-CALIB-WIRE — required categories", () => {
  it("returns the 5 canonical emission categories", async () => {
    const r = await call(server, "cam_controller_calibration_required");
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data.required)).toBe(true);
    expect(r.data.required).toEqual([
      "units", "plane_xy", "absolute_mode", "feed_mode", "end_of_program",
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. compare_all — cross-dialect consistency
// ─────────────────────────────────────────────────────────────────────
describe("U-CTRL-CALIB-WIRE — compare_all", () => {
  it("defaults to the 5 canonical probes (all compliant) when no probes given", async () => {
    const r = await call(server, "cam_controller_calibration_compare_all");
    expect(r.ok).toBe(true);
    expect(r.data.per_dialect.length).toBe(5);
    expect(r.data.all_passed).toBe(true);
    expect(r.data.aggregate_score).toBe(100);
    expect(r.data.universal_hits.length).toBe(5);
    // divergent_dialects is [] on an all-pass run — slimmer drops empty arrays
    expect((r.data.divergent_dialects ?? []).length).toBe(0);
  });

  it("flags a divergent dialect that misses a majority-hit category", async () => {
    const r = await call(server, "cam_controller_calibration_compare_all", {
      probes: [
        { dialect: "fanuc_30i", emissions: COMPLIANT },
        { dialect: "haas_ngc", emissions: COMPLIANT },
        { dialect: "okuma_osp", emissions: COMPLIANT },
        { dialect: "siemens_840d", emissions: COMPLIANT },
        { dialect: "mitsubishi_mv", emissions: MISSING_UNITS },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.data.per_dialect.length).toBe(5);
    expect(r.data.all_passed).toBe(false);
    expect(r.data.divergent_dialects).toContain("mitsubishi_mv");
    expect(r.data.any_miss).toContain("units");
    // 4 dialects @100 + 1 @80 → round((400+80)/5) = 96
    expect(r.data.aggregate_score).toBe(96);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. compare_one — single-probe compliance
// ─────────────────────────────────────────────────────────────────────
describe("U-CTRL-CALIB-WIRE — compare_one", () => {
  it("passes a fully-compliant probe with score 100", async () => {
    const r = await call(server, "cam_controller_calibration_compare_one", {
      probe: { dialect: "haas_ngc", emissions: COMPLIANT },
    });
    expect(r.ok).toBe(true);
    expect(r.data.dialect).toBe("haas_ngc");
    expect(r.data.passed).toBe(true);
    expect(r.data.score).toBe(100);
    expect(r.data.hits.length).toBe(5);
  });

  it("fails a probe missing a required category and lists the miss", async () => {
    const r = await call(server, "cam_controller_calibration_compare_one", {
      probe: { dialect: "fanuc_0i", emissions: MISSING_UNITS },
    });
    expect(r.ok).toBe(true);
    expect(r.data.passed).toBe(false);
    expect(r.data.score).toBe(80);
    expect(r.data.misses).toContain("units");
    expect(r.data.hits.length).toBe(4);
  });

  it("rejects a malformed probe param with a descriptive error", async () => {
    const r = await call(server, "cam_controller_calibration_compare_one", { probe: { dialect: "x" } });
    expect(r.ok).toBe(false);
  });
});
