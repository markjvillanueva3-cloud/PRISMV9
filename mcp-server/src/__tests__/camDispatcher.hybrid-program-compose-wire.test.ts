/**
 * camDispatcher — HybridProgramComposerEngine wiring suite
 * =========================================================
 *
 * WIRE-UNWIRED (foxtrot 2026-05-17) — wires the validator-confirmed
 * TRULY-UNWIRED HybridProgramComposerEngine (460-line real engine; a
 * deterministic rule-based AI router, NOT a stub; surfaced as a persistent
 * orphan across 3 independent validator seeds) into prism_cam with 1 action
 * `hybrid_program_compose` → compose(ComposerInput): ComposerResult.
 *
 * The composer is a pure rule-based router (no external I/O), so a crafted
 * ComposerInput yields a deterministic ComposerResult. Includes the
 * z.enum-membership guard (RGS-TOOL-AUTOINVOKE-MS1 false-green class —
 * MockMCPServer bypasses the SDK z.enum).
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

const FANUC = {
  controller_type: "fanuc" as const,
  has_macro_b: true,
  has_conversational: false,
  has_canned_cycles: true,
  max_macro_variables: 200,
  custom_cycles: [] as string[],
};

describe("hybrid_program_compose — enum registration", () => {
  it("the action is in the prism_cam z.enum ACTIONS list", () => {
    expect(ACTIONS).toContain("hybrid_program_compose");
  });
  it("no duplicate ACTIONS keys introduced (anti-regression)", () => {
    expect(new Set(ACTIONS).size).toBe(ACTIONS.length);
  });
});

describe("hybrid_program_compose — per-feature mode selection + merge", () => {
  it("returns one ModeSelection per feature with a merged program + cost comparison", async () => {
    const r = await call(server, "hybrid_program_compose", {
      features: [
        { id: "f1", type: "drilled_hole", complexity: "simple", dimensions: { diameter: 8, depth: 20 }, is_repeated: true, quantity: 12 },
        { id: "f2", type: "contour_3d", complexity: "complex", dimensions: { length: 120, width: 60 } },
      ],
      controller: FANUC,
      lot_size: 50,
      family_potential: true,
      optimize_for: "balanced",
    });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;

    const selections = d.selections as Array<Record<string, unknown>>;
    expect(selections.length).toBe(2);
    // every feature gets a mode + bounded confidence + a feature_id that maps back
    const ids = selections.map(s => s.feature_id).sort();
    expect(ids).toEqual(["f1", "f2"]);
    for (const s of selections) {
      expect(["cam", "conversational", "hardcode", "macro"]).toContain(s.selected_mode);
      expect(typeof s.confidence).toBe("number");
      expect((s.confidence as number) >= 0 && (s.confidence as number) <= 1).toBe(true);
    }
    // the complex 3D contour must NOT be routed to a simple conversational/hardcode mode
    const f2 = selections.find(s => s.feature_id === "f2")!;
    expect(f2.selected_mode).toBe("cam");

    expect(typeof d.merged_program).toBe("string");
    expect((d.merged_program as string).length).toBeGreaterThan(0);
    expect(typeof d.total_lines).toBe("number");
    expect(d.total_lines as number).toBeGreaterThan(0);

    const cost = d.cost_comparison as Record<string, unknown>;
    expect(typeof cost.all_cam_cost).toBe("number");
    expect(typeof cost.hybrid_cost).toBe("number");
    expect(typeof cost.savings_pct).toBe("number");
    expect(typeof cost.recommendation).toBe("string");

    expect(Array.isArray(d.ai_reasoning)).toBe(true);
    expect((d.ai_reasoning as unknown[]).length).toBeGreaterThan(0);
  });

  it("high lot size + family potential biases a repeated simple feature toward macro/conversational", async () => {
    const r = await call(server, "hybrid_program_compose", {
      features: [
        { id: "p1", type: "bolt_circle", complexity: "simple", dimensions: { bcd: 100, holes: 6 }, is_repeated: true, quantity: 500 },
      ],
      controller: FANUC,
      lot_size: 500,
      family_potential: true,
      optimize_for: "flexibility",
    });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    const sel = (d.selections as Array<Record<string, unknown>>)[0]!;
    expect(sel.feature_id).toBe("p1");
    // a simple repeated high-volume feature should NEVER be routed to full CAM
    expect(sel.selected_mode).not.toBe("cam");
    expect(Array.isArray(sel.rationale)).toBe(true);
    expect((sel.rationale as unknown[]).length).toBeGreaterThan(0);
  });
});
