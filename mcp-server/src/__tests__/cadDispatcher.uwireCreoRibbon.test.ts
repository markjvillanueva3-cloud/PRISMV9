/**
 * cadDispatcher U-WIRE-CREO-RIBBON round-trip tests — CreoAddinRibbonEngine.
 *
 * Validates 6 new prism_cad actions (creo_ribbon_get_spec / creo_ribbon_all_buttons /
 * creo_ribbon_find_button / creo_ribbon_resolve / creo_ribbon_tips_for_feature /
 * creo_ribbon_tip_count) wiring the declarative Creo Parametric ribbon engine.
 *
 * Pattern: LIVE dispatcher round-trip via registerCadDispatcher(shim). prism_cad wraps a
 * successful result as content[0].text = JSON.stringify(slimResponse(result)) (TOP-LEVEL,
 * NOT .data-nested) and returns a raw { success:false } on a dispatcherError (schema fail).
 * The engine is a stateless singleton returning its deterministic default ribbon spec
 * (tab "prism.tab" / "PRISM" / 4 groups), so assertions are exact. The singleton has NO
 * registered tips -> tips_for_feature is [] (slimResponse strips empty arrays -> ?? []) and
 * tip_count is 0 (false/0 survive slimming). setSpec/registerTip (mutating) are withheld.
 *
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED-PAPA autonomous loop iteration 11.
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-CREO-RIBBON
 */

import { describe, it, expect } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

interface CapturedTool {
  name: string; description: string; schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}
function newServer(): MockMCPServer {
  const s = new MockMCPServer();
  registerCadDispatcher(s as unknown as { tool: MockMCPServer["tool"] });
  return s;
}
async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools.find((t) => t.name === "prism_cad") ?? server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const text = (raw as { content: { type: string; text: string }[] }).content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

describe("U-WIRE-CREO-RIBBON — CreoAddinRibbonEngine via prism_cad", () => {
  it("registers the prism_cad tool", () => {
    const tool = newServer().tools.find((t) => t.name === "prism_cad");
    expect(tool?.name).toBe("prism_cad");
  });

  it("creo_ribbon_get_spec returns the default PRISM ribbon spec", async () => {
    const s = newServer();
    const r = await call(s, "creo_ribbon_get_spec");
    expect(r.ok).toBe(true);
    expect(r.data.tabId).toBe("prism.tab");
    expect(r.data.label).toBe("PRISM");
    expect((r.data.groups as unknown[]).length).toBe(4);
  });

  it("creo_ribbon_all_buttons flattens groups -> includes sf.calc", async () => {
    const s = newServer();
    const r = await call(s, "creo_ribbon_all_buttons");
    expect(r.ok).toBe(true);
    const buttons = r.data.buttons as Array<{ buttonId: string }>;
    expect(buttons.some((b) => b.buttonId === "sf.calc")).toBe(true);
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it("creo_ribbon_find_button quote -> returns that button", async () => {
    const s = newServer();
    const r = await call(s, "creo_ribbon_find_button", { buttonId: "quote" });
    expect(r.ok).toBe(true);
    expect((r.data.button as { buttonId: string }).buttonId).toBe("quote");
  });

  it("creo_ribbon_find_button unknown -> null (?? null)", async () => {
    const s = newServer();
    const r = await call(s, "creo_ribbon_find_button", { buttonId: "no-such-button" });
    expect(r.ok).toBe(true);
    expect(r.data.button ?? null).toBe(null);
  });

  it("creo_ribbon_find_button missing buttonId -> error (schema, failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "creo_ribbon_find_button", {});
    expect(r.ok).toBe(false);
  });

  it("creo_ribbon_resolve in a modal dialog -> every button disabled", async () => {
    const s = newServer();
    const r = await call(s, "creo_ribbon_resolve", { ctx: { isModalDialog: true } });
    expect(r.ok).toBe(true);
    const states = r.data.states as Array<{ state: string }>;
    expect(states.length).toBeGreaterThanOrEqual(4);
    expect(states.every((st) => st.state === "disabled")).toBe(true);
  });

  it("creo_ribbon_resolve with part+hole -> sf.calc enabled", async () => {
    const s = newServer();
    const r = await call(s, "creo_ribbon_resolve", { ctx: { isModalDialog: false, modelKind: "part", selectionKind: "hole" } });
    expect(r.ok).toBe(true);
    const states = r.data.states as Array<{ buttonId: string; state: string }>;
    const sf = states.find((st) => st.buttonId === "sf.calc");
    expect(sf?.state).toBe("enabled");
  });

  it("creo_ribbon_resolve missing ctx -> error (schema, failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "creo_ribbon_resolve", {});
    expect(r.ok).toBe(false);
  });

  it("creo_ribbon_tips_for_feature on the tip-less singleton -> empty (?? [])", async () => {
    const s = newServer();
    const r = await call(s, "creo_ribbon_tips_for_feature", { kind: "hole" });
    expect(r.ok).toBe(true);
    expect((r.data.tips ?? []) as unknown[]).toHaveLength(0);
  });

  it("creo_ribbon_tip_count -> 0 (no tips registered; 0 survives slimming)", async () => {
    const s = newServer();
    const r = await call(s, "creo_ribbon_tip_count");
    expect(r.ok).toBe(true);
    expect(r.data.count).toBe(0);
  });
});
