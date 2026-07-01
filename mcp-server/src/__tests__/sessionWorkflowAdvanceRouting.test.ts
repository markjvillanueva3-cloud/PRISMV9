/**
 * sessionWorkflowAdvanceRouting.test.ts -- dispatcher round-trip + regression lock
 * for the duplicate-case fix (slot:alpha 2026-06-22, dispatcher-duplicate-case audit).
 *
 * THE BUG: `workflow_advance` was declared TWICE -- once for the W6.1 python Workflow
 * Tracker (wins the switch first-match) and once for the U-HAGI01 DurableWorkflowEngine
 * (line ~3203, DEAD/shadowed). So the durable advance was unreachable via the dispatcher
 * even though its siblings (workflow_initial/pause/resume/cancel/render) were reachable.
 * THE FIX: rename the durable case + its ACTIONS enum entry -> `workflow_durable_advance`,
 * un-shadowing the dead feature (also clears the duplicate-case + duplicate-enum entry).
 *
 * This test invokes the REAL registered prism_session handler so the ACTIONS enum, the
 * switch/case, and the lazy `await import("../engines/DurableWorkflowEngine.js")` all run
 * through production paths -- proving the durable advance now routes to DurableWorkflowEngine
 * (durable WorkflowState shape), distinct from the still-present python `workflow_advance`.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

type McpHandler = (args: { action: string; params?: Record<string, unknown> }) => Promise<
  { content?: Array<{ type: "text"; text: string }>; isError?: boolean } | Record<string, unknown>
>;

function captureHandler(): { handler: McpHandler; schemaActions: readonly string[] } {
  let handler: McpHandler | null = null;
  let enumValues: readonly string[] = [];
  const server = {
    tool(_name: string, _description: string, schema: Record<string, unknown>, cb: McpHandler) {
      handler = cb;
      const action = (schema as { action?: { _def?: { values?: readonly string[]; entries?: Record<string, string> } } }).action;
      if (action?._def?.values) enumValues = action._def.values;
      else if (action?._def?.entries) enumValues = Object.keys(action._def.entries);
    },
  };
  registerSessionDispatcher(server as unknown as Parameters<typeof registerSessionDispatcher>[0]);
  if (!handler) throw new Error("registerSessionDispatcher did not register a handler");
  return { handler, schemaActions: enumValues };
}

async function invoke(handler: McpHandler, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await handler({ action, params });
  const content = (result as { content?: Array<{ text: string }> }).content;
  if (!Array.isArray(content)) return result as Record<string, unknown>; // schema-validation failure path
  return JSON.parse(content[0]?.text ?? "{}");
}

// A minimal DurableWorkflowEngine spec: initial() reads only step_id; advance() is
// reconstituted by the dispatcher with identity runners (output === step_id).
const durableSpec = {
  workflow_id: "wf-routing-test",
  kind: "routing_test",
  input: null,
  steps: [{ step_id: "alpha" }, { step_id: "bravo" }],
};

describe("prism_session workflow_durable_advance -- un-shadowed durable routing", () => {
  let handler: McpHandler;
  let schemaActions: readonly string[];

  beforeAll(() => {
    const captured = captureHandler();
    handler = captured.handler;
    schemaActions = captured.schemaActions;
  });

  // ── REGRESSION LOCK: the duplicate is gone, the durable action is registered ──
  it("ACTIONS enum: workflow_durable_advance is registered and workflow_advance appears exactly once", () => {
    expect(schemaActions).toContain("workflow_durable_advance");
    expect(schemaActions).toContain("workflow_advance");
    const advanceCount = schemaActions.filter((a) => a === "workflow_advance").length;
    expect(advanceCount).toBe(1);                       // the duplicate enum entry is removed
    const durableCount = schemaActions.filter((a) => a === "workflow_durable_advance").length;
    expect(durableCount).toBe(1);
  });

  it("the durable cluster siblings remain registered (fix did not disturb them)", () => {
    for (const a of ["workflow_initial", "workflow_pause", "workflow_resume", "workflow_cancel", "workflow_render"]) {
      expect(schemaActions, a).toContain(a);
    }
  });

  // ── HAPPY: full durable round-trip through the dispatcher (was impossible pre-fix) ──
  it("workflow_initial -> workflow_durable_advance runs the DurableWorkflowEngine to completion", async () => {
    const init = await invoke(handler, "workflow_initial", { spec: durableSpec });
    expect(init.success).toBe(true);
    const state0 = init.state as { status: string; steps: Array<{ step_id: string; status: string }> };
    expect(state0.status).toBe("pending");
    expect(state0.steps.map((s) => s.step_id)).toEqual(["alpha", "bravo"]);

    const adv = await invoke(handler, "workflow_durable_advance", { prior: state0, step_ids: ["alpha", "bravo"] });
    expect(adv.success).toBe(true);
    const state1 = adv.state as { status: string; steps: Array<{ status: string; output?: unknown }> };
    // DurableWorkflowEngine ran each identity step (output === step_id) to completion.
    expect(state1.status).toBe("completed");
    expect(state1.steps.every((s) => s.status === "completed")).toBe(true);
    expect(state1.steps.map((s) => s.output)).toEqual(["alpha", "bravo"]);
  });

  it("the durable result carries the DurableWorkflowEngine WorkflowState shape (NOT the python tracker shape) -- proves routing", async () => {
    const init = await invoke(handler, "workflow_initial", { spec: durableSpec });
    const adv = await invoke(handler, "workflow_durable_advance", { prior: init.state, step_ids: ["alpha", "bravo"] });
    const state = adv.state as Record<string, unknown>;
    // WorkflowState fields are unique to DurableWorkflowEngine (the python tracker returns a different shape).
    expect(state.workflow_id).toBe("wf-routing-test");
    expect(state.kind).toBe("routing_test");
    expect(typeof state.created_at).toBe("string");
    expect(typeof state.updated_at).toBe("string");
  });

  // ── FAILURE: the engine's divergence guard surfaces as a structured failure (no silent pass) ──
  it("failure: step-count drift between prior.steps and step_ids is rejected, not silently completed", async () => {
    const init = await invoke(handler, "workflow_initial", { spec: durableSpec });
    // prior has 2 steps; pass only 1 step_id -> spec.steps.length (1) != prior.steps.length (2).
    const adv = await invoke(handler, "workflow_durable_advance", { prior: init.state, step_ids: ["alpha"] });
    const ok = (adv as { success?: boolean }).success;
    const err = String((adv as { error?: string }).error ?? "");
    const isError = (adv as { isError?: boolean }).isError === true;
    expect(ok === false || isError || /drift|mismatch/i.test(err)).toBe(true);
    // Crucially: it must NOT have silently produced a completed 2-step state.
    const state = (adv as { state?: { status?: string } }).state;
    expect(state?.status).not.toBe("completed");
  });

  // ── ADVERSARIAL: advancing an already-completed state is a terminal no-op (idempotent) ──
  it("adversarial: re-advancing an already-completed state is a terminal no-op (idempotent)", async () => {
    const init = await invoke(handler, "workflow_initial", { spec: durableSpec });
    const done = await invoke(handler, "workflow_durable_advance", { prior: init.state, step_ids: ["alpha", "bravo"] });
    expect((done.state as { status: string }).status).toBe("completed");
    const again = await invoke(handler, "workflow_durable_advance", { prior: done.state, step_ids: ["alpha", "bravo"] });
    expect((again.state as { status: string }).status).toBe("completed");
    expect((again.state as { steps: Array<{ output: unknown }> }).steps.map((s) => s.output)).toEqual(["alpha", "bravo"]);
  });
});
