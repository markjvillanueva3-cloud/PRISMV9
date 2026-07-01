/**
 * cadDispatcher U-WIRE-CATIA-ADDIN round-trip tests — CATIAAddinPluginEngine.
 *
 * Validates 10 new prism_cad actions (catia_get_spec / catia_all_commands /
 * catia_find_command / catia_workbench_layout / catia_commands_for_workbench /
 * catia_toolbars_for_workbench / catia_resolve / catia_event_subscriptions /
 * catia_tips_for_feature / catia_tip_count) wiring the declarative CATIA CAA-V5 add-in engine.
 *
 * Pattern: LIVE dispatcher round-trip via registerCadDispatcher(shim). prism_cad wraps a
 * successful result as content[0].text = JSON.stringify(slimResponse(result)) (TOP-LEVEL,
 * NOT .data-nested); raw { success:false } on a dispatcherError (schema fail). The engine is a
 * stateless singleton returning its deterministic default add-in spec; the clock-throttled
 * dispatchEvent + mutating ops (setSpec/registerTip/resetThrottles) are NOT wired (read surface).
 * Command/workbench ids are read from the spec at runtime (self-referential) so no default-spec
 * value is hard-coded. slimResponse strips null/empty (assert via ?? null / ?? []) but keeps 0.
 *
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED-PAPA autonomous loop iteration 12.
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-CATIA-ADDIN
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

describe("U-WIRE-CATIA-ADDIN — CATIAAddinPluginEngine via prism_cad", () => {
  it("registers the prism_cad tool", () => {
    const tool = newServer().tools.find((t) => t.name === "prism_cad");
    expect(tool?.name).toBe("prism_cad");
  });

  it("catia_get_spec returns a spec with commands + workbenches", async () => {
    const s = newServer();
    const r = await call(s, "catia_get_spec");
    expect(r.ok).toBe(true);
    expect((r.data.commands as unknown[]).length).toBeGreaterThan(0);
    expect(Array.isArray(r.data.workbenches ?? [])).toBe(true);
  });

  it("catia_all_commands returns the flat command list", async () => {
    const s = newServer();
    const r = await call(s, "catia_all_commands");
    expect(r.ok).toBe(true);
    expect((r.data.commands as unknown[]).length).toBeGreaterThan(0);
  });

  it("catia_find_command round-trips a real command id (self-referential)", async () => {
    const s = newServer();
    const all = await call(s, "catia_all_commands");
    const id = (all.data.commands as Array<{ commandId: string }>)[0]!.commandId;
    const r = await call(s, "catia_find_command", { commandId: id });
    expect(r.ok).toBe(true);
    expect((r.data.command as { commandId: string }).commandId).toBe(id);
  });

  it("catia_find_command unknown -> null (?? null)", async () => {
    const s = newServer();
    const r = await call(s, "catia_find_command", { commandId: "no-such-command" });
    expect(r.ok).toBe(true);
    expect(r.data.command ?? null).toBe(null);
  });

  it("catia_find_command missing commandId -> error (schema, failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "catia_find_command", {});
    expect(r.ok).toBe(false);
  });

  it("catia_workbench_layout round-trips a real workbench (self-referential)", async () => {
    const s = newServer();
    const spec = await call(s, "catia_get_spec");
    const wbs = spec.data.workbenches as Array<{ workbenchId: string }>;
    expect(wbs.length).toBeGreaterThan(0); // default spec ships workbenches; fail loud if it ever stops
    const wb = wbs[0]!.workbenchId;
    const r = await call(s, "catia_workbench_layout", { workbench: wb });
    expect(r.ok).toBe(true);
    expect((r.data.layout as { workbenchId: string }).workbenchId).toBe(wb);
  });

  it("catia_commands_for_workbench + catia_toolbars_for_workbench return arrays", async () => {
    const s = newServer();
    const spec = await call(s, "catia_get_spec");
    const wbs = spec.data.workbenches as Array<{ workbenchId: string }>;
    const wb = wbs[0]?.workbenchId ?? "unknown-wb";
    const cmds = await call(s, "catia_commands_for_workbench", { workbench: wb });
    expect(cmds.ok).toBe(true);
    expect(Array.isArray(cmds.data.commands ?? [])).toBe(true);
    const tbs = await call(s, "catia_toolbars_for_workbench", { workbench: wb });
    expect(tbs.ok).toBe(true);
    expect(Array.isArray(tbs.data.toolbars ?? [])).toBe(true);
  });

  it("catia_resolve in a modal dialog -> every command disabled", async () => {
    const s = newServer();
    const all = await call(s, "catia_all_commands");
    const commandCount = (all.data.commands as unknown[]).length;
    const r = await call(s, "catia_resolve", { ctx: { isModalDialog: true } });
    expect(r.ok).toBe(true);
    const states = r.data.states as Array<{ state: string }>;
    expect(states.length).toBe(commandCount);
    expect(states.every((st) => st.state === "disabled")).toBe(true);
  });

  it("catia_resolve missing ctx -> error (schema, failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "catia_resolve", {});
    expect(r.ok).toBe(false);
  });

  it("catia_event_subscriptions returns an array", async () => {
    const s = newServer();
    const r = await call(s, "catia_event_subscriptions");
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data.subscriptions ?? [])).toBe(true);
  });

  it("catia_tips_for_feature [] + catia_tip_count 0 on the tip-less singleton", async () => {
    const s = newServer();
    const tips = await call(s, "catia_tips_for_feature", { kind: "Hole" });
    expect(tips.ok).toBe(true);
    expect((tips.data.tips ?? []) as unknown[]).toHaveLength(0);
    const count = await call(s, "catia_tip_count");
    expect(count.ok).toBe(true);
    expect(count.data.count).toBe(0);
  });
});
