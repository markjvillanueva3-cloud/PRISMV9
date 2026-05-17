/**
 * camDispatcher — PrintToAIBridgeEngine wiring suite
 * ===================================================
 *
 * WIRE-UNWIRED (foxtrot 2026-05-17) — wires the validator-confirmed
 * TRULY-UNWIRED PrintToAIBridgeEngine (509-line real engine, NOT a stub)
 * into prism_cam with 3 actions covering the engine's PURE in-process
 * resolvers (no external I/O — `async` by signature only):
 *   - resolveMaterial(callout, trace)        → print_ai_resolve_material
 *   - resolveFeatures(features, trace)       → print_ai_resolve_features
 *   - recommendMachine(feat, mat, trace)     → print_ai_recommend_machine
 *
 * resolveMaterial is regex + fuzzy match over CANONICAL_MATERIAL_DB;
 * resolveFeatures is heuristic disambiguation; recommendMachine is pure
 * branch logic — all deterministic for a crafted input. processFromPrint()
 * is NOT wired (it routes through MachiningIntelligenceOrchestratorEngine —
 * out of this deterministic set). Includes the z.enum-membership guard for
 * the RGS-TOOL-AUTOINVOKE-MS1 false-green class (MockMCPServer bypasses
 * z.enum) and is slimmer-aware (empty arrays stripped at MCP transport).
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
): Promise<{ ok: boolean; data: unknown }> {
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

// ─────────────────────────────────────────────────────────────────────
// 1. z.enum gate membership (RGS-TOOL-AUTOINVOKE-MS1 false-green guard)
// ─────────────────────────────────────────────────────────────────────
describe("print-ai bridge — enum registration", () => {
  const expected = [
    "print_ai_resolve_material", "print_ai_resolve_features",
    "print_ai_recommend_machine",
  ];
  it("all 3 actions are in the prism_cam z.enum ACTIONS list", () => {
    for (const a of expected) expect(ACTIONS).toContain(a);
  });
  it("no duplicate ACTIONS keys introduced (anti-regression)", () => {
    expect(new Set(ACTIONS).size).toBe(ACTIONS.length);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. print_ai_resolve_material — regex pattern table + default fallback
// ─────────────────────────────────────────────────────────────────────
describe("print_ai_resolve_material — material callout resolution", () => {
  it("a '4140' callout matches the P-group steel pattern at 0.92 confidence", async () => {
    const r = await call(server, "print_ai_resolve_material", { callout: "4140 STEEL" });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    const m = d.resolution as Record<string, unknown>;
    // Engine pattern table pins these EXACT literals for a 4140 match.
    expect(m.material_name).toBe("Steel_4140");
    expect(m.iso_group).toBe("P");
    expect(m.confidence).toBe(0.92);
    // resolveMaterial mutates the passed trace[] — non-empty, survives slimmer.
    expect(Array.isArray(d.reasoning_trace)).toBe(true);
    expect((d.reasoning_trace as string[]).length).toBeGreaterThan(0);
  });

  it("a '6061' callout resolves to the N-group aluminum entry", async () => {
    const r = await call(server, "print_ai_resolve_material", { callout: "6061-T6 ALUMINUM" });
    expect(r.ok).toBe(true);
    const m = (r.data as Record<string, unknown>).resolution as Record<string, unknown>;
    expect(m.material_name).toBe("Aluminum_6061");
    expect(m.iso_group).toBe("N");
    expect(m.confidence).toBe(0.92);
  });

  it("an absent callout returns the documented Steel_4140 default at 0.5 confidence", async () => {
    const r = await call(server, "print_ai_resolve_material", {});
    expect(r.ok).toBe(true);
    const m = (r.data as Record<string, unknown>).resolution as Record<string, unknown>;
    // Engine default-material branch pins exactly this.
    expect(m.material_name).toBe("Steel_4140");
    expect(m.iso_group).toBe("P");
    expect(m.confidence).toBe(0.5);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. print_ai_resolve_features — heuristic feature resolution
// ─────────────────────────────────────────────────────────────────────
describe("print_ai_resolve_features — feature disambiguation", () => {
  it("an empty feature list returns zeroed counts (resolved_features[] stripped by slimmer)", async () => {
    const r = await call(server, "print_ai_resolve_features", { features: [] });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    const res = d.resolution as Record<string, unknown>;
    expect(res.ambiguities_found).toBe(0);
    expect(res.ambiguities_resolved).toBe(0);
    // resolved_features:[] is empty → responseSlimmer strips the key, so it
    // must be ABSENT from the round-tripped resolution.
    expect("resolved_features" in res).toBe(false);
    expect((res.reasoning as string[])).toContain("No features provided");
  });

  it("a high-confidence prismatic pocket resolves to one feature with a valid operation type", async () => {
    const r = await call(server, "print_ai_resolve_features", {
      features: [
        { id: "p1", type: "pocket", dimensions: { length: 40, width: 25, depth: 12 }, confidence: 0.95 },
      ],
    });
    expect(r.ok).toBe(true);
    const res = (r.data as Record<string, unknown>).resolution as Record<string, unknown>;
    const resolved = res.resolved_features as Array<Record<string, unknown>>;
    expect(resolved.length).toBe(1);
    expect(resolved[0]!.id).toBe("p1");
    expect(resolved[0]!.type).toBe("pocket");
    // operation_type + tolerance_class are fully deterministic for this input:
    // a 'pocket' is not a determineOperationType switch case → default branch
    // → "roughing"; dimensions carry no tolerance-keyed entry → "standard".
    // Pin the exact heuristic output (R9) so a silent classifier change fails.
    expect(resolved[0]!.operation_type).toBe("roughing");
    expect(resolved[0]!.tolerance_class).toBe("standard");
    // a 0.95-confidence feature is NOT ambiguous (engine threshold < 0.7).
    expect(res.ambiguities_found).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. print_ai_recommend_machine — machine-type branch logic
// ─────────────────────────────────────────────────────────────────────
describe("print_ai_recommend_machine — machine recommendation", () => {
  it("a prismatic-only feature set recommends a 3-Axis Mill with the pinned match factors", async () => {
    const r = await call(server, "print_ai_recommend_machine", {
      feature_resolution: {
        resolved_features: [
          { id: "p1", type: "pocket", operation_type: "roughing", priority: 1, dimensions: {}, tolerance_class: "standard" },
          { id: "s1", type: "slot", operation_type: "roughing", priority: 2, dimensions: {}, tolerance_class: "standard" },
        ],
        ambiguities_found: 0,
        ambiguities_resolved: 0,
        reasoning: [],
      },
      material_resolution: {
        material_name: "Aluminum_6061", iso_group: "N", confidence: 0.92,
        alternatives: [], reasoning: [],
      },
    });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    const rec = d.recommendation as Record<string, unknown>;
    // pocket+slot = prismatic-only → engine's "3-Axis Mill" branch.
    expect(rec.primary).toBe("3-Axis Mill");
    expect(Array.isArray(rec.alternatives)).toBe(true);
    expect((rec.alternatives as string[])).toContain("VMC");
    // Engine hard-codes these exact match factors.
    expect(rec.capability_match).toBe(0.88);
    expect(rec.cost_factor).toBe(1.0);
  });
});
