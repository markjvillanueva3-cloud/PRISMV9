/**
 * camDispatcher — CAMPrintToProgramOrchestratorEngine wiring suite
 * ================================================================
 *
 * U-CAM-WIRE-P2P (slot:kilo 2026-05-29) — wires the validator-confirmed TRULY-UNWIRED
 * CAMPrintToProgramOrchestratorEngine (kilo's blueprint-text → CAM click-recipe pipeline,
 * a real 138-line engine, NOT a stub) into prism_cam with the 2 actions the engine
 * declares in getCapabilities():
 *   - orchestrate(desc, {system, overrides}) → cam_p2p_orchestrate
 *   - (full stage trace)                     → cam_p2p_explain
 *
 * Pipeline: classify → select op → generate template → build click sequence.
 * The dispatcher uses the singleton (loader=null): stages 1-3 run loader-free and produce
 * concrete results; stage 4 (click sequence) soft-fails (ok:false) without a catalog loader
 * — the honest contract, which these tests pin.
 *
 * Concrete fixtures (verified against engine sources):
 *   classify("drill thru hole 0.500 dia").feature === "thru_hole"   (CAMFeatureClassClassifierEngine)
 *   select("thru_hole").best === "drill"                            (CAMOperationSelectorEngine FEATURE_OP)
 *   template for (drill, fusion360) → op="drill", system="fusion360" (CAMTemplateGeneratorEngine PER_SOFTWARE)
 *
 * Includes the z.enum-membership guard for the RGS-TOOL-AUTOINVOKE-MS1 false-green class
 * (MockMCPServer bypasses the SDK z.enum, so a missing-from-ACTIONS action would pass here
 * while production is 100% broken).
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

describe("p2p orchestrate — enum registration", () => {
  it("both actions are in the prism_cam z.enum ACTIONS list", () => {
    expect(ACTIONS).toContain("cam_p2p_orchestrate");
    expect(ACTIONS).toContain("cam_p2p_explain");
  });
  it("no duplicate ACTIONS keys introduced (anti-regression)", () => {
    expect(new Set(ACTIONS).size).toBe(ACTIONS.length);
  });
});

describe("cam_p2p_orchestrate — real round-trip through the dispatcher", () => {
  it("resolves a thru-hole callout through stages 1-3 with the exact canonical op + template", async () => {
    const r = await call(server, "cam_p2p_orchestrate", {
      description: "drill thru hole 0.500 dia",
      system: "fusion360",
    });
    expect(r.ok).toBe(true); // transport ok (no top-level error)
    const d = r.data as Record<string, any>;
    // Stage 1 — classify (loader-free): exact feature class.
    expect(d.classification.feature).toBe("thru_hole");
    // Stage 2 — select op (loader-free): thru_hole → drill (FEATURE_OP table).
    expect(d.selection.best).toBe("drill");
    // Stage 3 — template (loader-free, PER_SOFTWARE table): op+system echoed exactly.
    expect(d.template.op).toBe("drill");
    expect(d.template.system).toBe("fusion360");
  });

  it("soft-fails at the click stage with the singleton's null loader (honest contract, not a throw)", async () => {
    const r = await call(server, "cam_p2p_orchestrate", {
      description: "drill thru hole 0.500 dia",
      system: "fusion360",
    });
    const d = r.data as Record<string, any>;
    // Stages 1-3 succeed; stage 4 cannot complete without a catalog loader → ok:false.
    expect(d.ok).toBe(false);
    expect(d.reason).toMatch(/click_failed|no catalog loader/);
  });

  it("soft-fails on an unclassifiable callout, surfacing the reason (kilo refuses silent-fallback)", async () => {
    const r = await call(server, "cam_p2p_orchestrate", {
      description: "xyzzy abc 123 not a feature",
      system: "fusion360",
    });
    const d = r.data as Record<string, any>;
    expect(d.ok).toBe(false);
    expect(d.reason).toMatch(/classification_failed/);
  });

  it("rejects with a descriptive error when required params are missing", async () => {
    const r = await call(server, "cam_p2p_orchestrate", { description: "drill thru hole" });
    expect(r.ok).toBe(false);
    expect((r.data as Record<string, any>).error).toMatch(/require.*description.*system/i);
  });
});

describe("cam_p2p_explain — full stage trace", () => {
  it("returns the same traced P2PResult carrying the classification + selection (audit surface)", async () => {
    const r = await call(server, "cam_p2p_explain", {
      description: "drill thru hole 0.500 dia",
      system: "fusion360",
    });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, any>;
    expect(d.classification.feature).toBe("thru_hole");
    expect(d.selection.best).toBe("drill");
  });
});
