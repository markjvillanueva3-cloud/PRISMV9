/**
 * dispatcher.latheLoRASelectorLoop.test.ts -- round-trip coverage for
 * U-LATHE-LORA-SELECTOR-LOOP (slot:india 2026-06-22, prism_turning).
 *
 * Closes the LatheLoRAModelSelectorEngine loop at the dispatcher boundary. Before this,
 * ONLY getStats was MCP-reachable -- registerModel / select / recordOutcome / release /
 * getModels were ALL unwired, so the selector was unusable via MCP: you could not register
 * a LoRA model, could not select one for a context, and (the open-loop) could not feed the
 * observed outcome back to update its accuracy. This wires the whole usable loop
 * (register -> select -> record + release/unregister/models), parity with mill_lora_sel_*.
 *
 * INTENT PROOF: register a model, select it (produce side), feed 2 successes + 1 failure
 * (actuals side), and assert getStats().avg_accuracy reflects 2/3 -- a frozen no-op would
 * leave accuracy unchanged. Round-tripped through the real dispatcher + live singleton.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { latheLoRAModelSelectorEngine } from "../engines/LatheLoRAModelSelectorEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): { tools: CapturedTool[]; tool: (n: string, d: string, s: unknown, h: CapturedTool["handler"]) => void } {
  const tools: CapturedTool[] = [];
  return { tools, tool(name, _d, _s, handler) { tools.push({ name, handler }); } };
}

function getTurningHandler(): CapturedTool["handler"] {
  const server = makeStubServer();
  registerTurningDispatcher(server as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  return server.tools[0].handler;
}

function unwrap(res: unknown): Record<string, any> {
  const r = res as { content?: Array<{ text?: string }> };
  if (r?.content?.[0]?.text) {
    try { return JSON.parse(r.content[0].text as string); } catch { return res as Record<string, any>; }
  }
  return res as Record<string, any>;
}

function latheModel(id: string, accuracy = 1.0) {
  return { id, name: id, specializations: [], avg_accuracy: accuracy, avg_latency_ms: 50, max_concurrent: 4, enabled: true };
}

describe("prism_turning -- lathe LoRA-selector loop (round-trip)", () => {
  let handler: CapturedTool["handler"];

  beforeEach(() => {
    handler = getTurningHandler();
    latheLoRAModelSelectorEngine.reset();
  });

  it("registers a model (was unwired) and lists it via the dispatcher", async () => {
    const reg = unwrap(await handler({ action: "lathe_lora_model_selector_register", params: { model: latheModel("m1") } }));
    expect(reg.id).toBe("m1");
    expect(reg.success_count).toBe(0);
    const models = unwrap(await handler({ action: "lathe_lora_model_selector_models", params: {} }));
    expect(models.models.length).toBe(1);
    expect(models.models[0].id).toBe("m1");
  });

  it("selects a registered model for a context (the produce side, was unwired)", async () => {
    await handler({ action: "lathe_lora_model_selector_register", params: { model: latheModel("m1") } });
    const sel = unwrap(await handler({ action: "lathe_lora_model_selector_select", params: { operation: "turning", priority: "balanced" } }));
    expect(sel.selection).not.toBeNull();
    expect(sel.selection.selected_model.id).toBe("m1");
  });

  it("CLOSES THE LOOP: recorded outcomes update the model's accuracy (visible via stats)", async () => {
    await handler({ action: "lathe_lora_model_selector_register", params: { model: latheModel("m1") } });

    const r1 = unwrap(await handler({ action: "lathe_lora_model_selector_record", params: { model_id: "m1", success: true } }));
    expect(r1.ok).toBe(true);
    await handler({ action: "lathe_lora_model_selector_record", params: { model_id: "m1", success: true } });
    await handler({ action: "lathe_lora_model_selector_record", params: { model_id: "m1", success: false } });

    // 2 success + 1 failure -> avg_accuracy 2/3. A frozen no-op would leave it at 1.0.
    const stats = unwrap(await handler({ action: "lathe_lora_model_selector_stats", params: {} }));
    expect(stats.avg_accuracy).toBeCloseTo(2 / 3, 5);
  });

  it("recordOutcome on an UNKNOWN model returns ok:false (real engine contract, not a stub true)", async () => {
    const out = unwrap(await handler({ action: "lathe_lora_model_selector_record", params: { model_id: "not_registered", success: true } }));
    expect(out.ok).toBe(false);
  });

  it("release + unregister round-trip", async () => {
    await handler({ action: "lathe_lora_model_selector_register", params: { model: latheModel("m1") } });
    const rel = unwrap(await handler({ action: "lathe_lora_model_selector_release", params: { model_id: "m1" } }));
    expect(typeof rel.ok).toBe("boolean");
    const unreg = unwrap(await handler({ action: "lathe_lora_model_selector_unregister", params: { model_id: "m1" } }));
    expect(unreg.ok).toBe(true);
    const models = unwrap(await handler({ action: "lathe_lora_model_selector_models", params: {} }));
    // slimResponse strips an empty array, so post-unregister "no models" surfaces as absent or [].
    expect((models.models ?? []).length).toBe(0);
  });

  it("rejects register with no model object (structured error)", async () => {
    const out = unwrap(await handler({ action: "lathe_lora_model_selector_register", params: {} }));
    expect(out.success === false || typeof out.error === "string").toBe(true);
  });

  it("rejects record with missing model_id / non-boolean success (structured error)", async () => {
    const a = unwrap(await handler({ action: "lathe_lora_model_selector_record", params: { success: true } }));
    expect(a.success === false || typeof a.error === "string").toBe(true);
    await handler({ action: "lathe_lora_model_selector_register", params: { model: latheModel("m1") } });
    const b = unwrap(await handler({ action: "lathe_lora_model_selector_record", params: { model_id: "m1", success: "yes" } }));
    expect(b.success === false || typeof b.error === "string").toBe(true);
  });
});
