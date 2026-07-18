/**
 * knowledgeDispatcher -- PlaywrightAutomationEngine wiring round-trip suite
 * =========================================================================
 *
 * WIRING / U-WIRE-PLAYWRIGHT-GUI
 *
 * Wires the previously-unwired PlaywrightAutomationEngine (0 dispatcher refs)
 * into prism_knowledge alongside its video-pipeline siblings
 * (learn_video_extract_actions / _replay / _pipeline_run):
 *   - playwrightAutomationEngine.generateGUIScript -> learn_video_gui_script
 *   - playwrightAutomationEngine.planExecution     -> learn_video_execution_plan
 *
 * Reference values mirror the engine-level proofs in video-execution.test.ts
 * but are asserted THROUGH the dispatcher (z.enum + validateActionParams +
 * switch + ExtractedAction normalization), not against the singleton.
 *
 * @milestone WIRING
 * @unit U-WIRE-PLAYWRIGHT-GUI
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerKnowledgeDispatcher } from "../tools/dispatchers/knowledgeDispatcher.js";

interface CapturedTool {
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(_n: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ handler });
  }
}

interface DispatchResult { ok: boolean; data: Record<string, unknown> }

async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<DispatchResult> {
  const tool = server.tools[0]!;
  const raw = await tool.handler({ action, params });
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const parsed = JSON.parse(envelope.content[0]!.text) as Record<string, unknown>;
  if ("error" in parsed) return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerKnowledgeDispatcher(server as unknown as Parameters<typeof registerKnowledgeDispatcher>[0]);
});

// ── learn_video_gui_script (generateGUIScript) ─────────────────────
describe("U-WIRE-PLAYWRIGHT-GUI / learn_video_gui_script", () => {
  it("extrude on onshape -> click+fill steps, requires_login, count===actions.length", async () => {
    const r = await call(server, "learn_video_gui_script", {
      target_software: "onshape",
      actions: [{ action_type: "extrude", operation: "extrude", parameters: { depth: 25 } }],
    });
    expect(r.ok).toBe(true);
    expect(r.data.target_software).toBe("onshape");
    const actions = r.data.actions as Array<{ action: string }>;
    expect(actions.length).toBeGreaterThan(0);
    expect(r.data.actions_count).toBe(actions.length);
    const kinds = actions.map((a) => a.action);
    // onshape extrude workflow emits a click+fill sequence (mirrors video-execution.test.ts #4)
    expect(kinds).toContain("click");
    expect(kinds).toContain("fill");
    // navigate-first because the onshape profile has a url
    expect(actions[0]!.action).toBe("navigate");
    expect(r.data.requires_login).toBe(true);
    expect(r.data.estimated_duration_s as number).toBeGreaterThan(0);
  });

  it("requires_login is false for the generic target", async () => {
    const r = await call(server, "learn_video_gui_script", {
      target_software: "generic",
      actions: [{ action_type: "extrude", operation: "extrude", parameters: { depth: 5 } }],
    });
    expect(r.ok).toBe(true);
    expect(r.data.requires_login).toBe(false);
    expect(r.data.estimated_duration_s as number).toBeGreaterThan(0);
  });

  it("unknown action_type -> generic fallback (click+wait+screenshot) + a warning", async () => {
    const r = await call(server, "learn_video_gui_script", {
      target_software: "generic",
      actions: [{ action_type: "frobnicate_xyz", operation: "frobnicate", parameters: {}, description: "weird op" }],
    });
    expect(r.ok).toBe(true);
    const kinds = (r.data.actions as Array<{ action: string }>).map((a) => a.action);
    expect(kinds).toContain("click");
    expect(kinds).toContain("wait");
    expect(kinds).toContain("screenshot");
    const warnings = r.data.warnings as string[];
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.join(" ")).toContain("frobnicate");
  });

  it("empty actions array -> empty script, duration 0, no warnings (boundary)", async () => {
    const r = await call(server, "learn_video_gui_script", { target_software: "onshape", actions: [] });
    expect(r.ok).toBe(true);
    // NOTE: slimResponse strips empty arrays from dispatcher envelopes, so an
    // empty actions/warnings array arrives as absent -> treat undefined as [].
    expect(r.data.actions_count).toBe(0);
    expect(((r.data.actions as unknown[] | undefined) ?? []).length).toBe(0);
    expect(r.data.estimated_duration_s).toBe(0);
    expect(((r.data.warnings as unknown[] | undefined) ?? []).length).toBe(0);
  });

  it("adversarial: action missing operation+parameters does NOT crash (dispatcher defaults them)", async () => {
    // generateGUIScript calls mapActionToWorkflow(action_type, operation) -> operation.toLowerCase()
    // and substituteParams(t, parameters) -> Object.entries(parameters); both throw on undefined.
    // The dispatcher normalizes each action with operation:=action_type, parameters:={}.
    const r = await call(server, "learn_video_gui_script", {
      target_software: "tinkercad",
      actions: [{ action_type: "fillet" }],
    });
    expect(r.ok).toBe(true);
    expect((r.data.actions as unknown[]).length).toBeGreaterThan(0);
    expect(r.data.requires_login).toBe(true); // tinkercad requires login
  });

  it("unknown target falls back to generic profile (no login)", async () => {
    const r = await call(server, "learn_video_gui_script", {
      target_software: "no_such_cad_999",
      actions: [{ action_type: "extrude", operation: "extrude", parameters: { depth: 3 } }],
    });
    expect(r.ok).toBe(true);
    expect(r.data.requires_login).toBe(false);
  });
});

// ── learn_video_execution_plan (planExecution) ─────────────────────
describe("U-WIRE-PLAYWRIGHT-GUI / learn_video_execution_plan", () => {
  it("all geometry (sketch+extrude+fillet) -> mode=cadquery, 3 cadquery / 0 playwright", async () => {
    const r = await call(server, "learn_video_execution_plan", {
      actions: [
        { action_type: "sketch_rectangle" },
        { action_type: "extrude" },
        { action_type: "fillet" },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.data.mode).toBe("cadquery");
    expect(((r.data.cadquery_steps as number[] | undefined) ?? []).length).toBe(3);
    expect(((r.data.playwright_steps as number[] | undefined) ?? []).length).toBe(0);
  });

  it("toolpath actions -> mode=playwright (2 playwright steps)", async () => {
    const r = await call(server, "learn_video_execution_plan", {
      actions: [{ action_type: "toolpath_contour" }, { action_type: "toolpath_pocket" }],
    });
    expect(r.ok).toBe(true);
    expect(r.data.mode).toBe("playwright");
    expect((r.data.playwright_steps as number[]).length).toBe(2);
  });

  it("mixed (extrude + toolpath) -> mode=hybrid (1 cad / 1 playwright)", async () => {
    const r = await call(server, "learn_video_execution_plan", {
      actions: [{ action_type: "extrude" }, { action_type: "toolpath_contour" }],
    });
    expect(r.ok).toBe(true);
    expect(r.data.mode).toBe("hybrid");
    expect((r.data.cadquery_steps as number[]).length).toBe(1);
    expect((r.data.playwright_steps as number[]).length).toBe(1);
  });

  it("prefer=playwright flips cadquery-eligible actions to playwright -> mode=playwright", async () => {
    const r = await call(server, "learn_video_execution_plan", {
      actions: [{ action_type: "extrude" }, { action_type: "fillet" }],
      prefer: "playwright",
    });
    expect(r.ok).toBe(true);
    expect(r.data.mode).toBe("playwright");
    expect(((r.data.playwright_steps as number[] | undefined) ?? []).length).toBe(2);
    expect(((r.data.cadquery_steps as number[] | undefined) ?? []).length).toBe(0);
  });

  it("empty actions -> mode=cadquery, reason 'No actions to plan'", async () => {
    const r = await call(server, "learn_video_execution_plan", { actions: [] });
    expect(r.ok).toBe(true);
    expect(r.data.mode).toBe("cadquery");
    expect(r.data.reason).toBe("No actions to plan");
    expect(((r.data.cadquery_steps as number[] | undefined) ?? []).length).toBe(0);
    expect(((r.data.playwright_steps as number[] | undefined) ?? []).length).toBe(0);
  });

  it("all action indices covered + execution_order preserves sequence", async () => {
    const r = await call(server, "learn_video_execution_plan", {
      actions: [
        { action_type: "extrude" },
        { action_type: "assembly_mate" },
        { action_type: "fillet" },
        { action_type: "cam_setup" },
      ],
    });
    expect(r.ok).toBe(true);
    const covered = [
      ...((r.data.cadquery_steps as number[] | undefined) ?? []),
      ...((r.data.playwright_steps as number[] | undefined) ?? []),
    ].sort((a, b) => a - b);
    expect(covered).toEqual([0, 1, 2, 3]);
    const order = r.data.execution_order as Array<{ step: number }>;
    expect(order.length).toBe(4);
    expect(order.map((o) => o.step)).toEqual([0, 1, 2, 3]);
  });

  it("adversarial: unknown action_type routes to playwright (flexible fallback)", async () => {
    const r = await call(server, "learn_video_execution_plan", {
      actions: [{ action_type: "totally_unknown_op" }],
    });
    expect(r.ok).toBe(true);
    expect(r.data.mode).toBe("playwright");
    expect((r.data.playwright_steps as number[]).length).toBe(1);
  });
});

// ── schema rejections ──────────────────────────────────────────────
describe("U-WIRE-PLAYWRIGHT-GUI / schema rejections", () => {
  it("gui_script rejects missing target_software (required)", async () => {
    const r = await call(server, "learn_video_gui_script", { actions: [{ action_type: "extrude" }] });
    expect(r.ok).toBe(false);
  });

  it("gui_script rejects an action missing action_type", async () => {
    const r = await call(server, "learn_video_gui_script", {
      target_software: "onshape",
      actions: [{ step_number: 1 } as Record<string, unknown>],
    });
    expect(r.ok).toBe(false);
  });

  it("execution_plan rejects an out-of-enum prefer value", async () => {
    const r = await call(server, "learn_video_execution_plan", {
      actions: [{ action_type: "extrude" }],
      prefer: "bogus_engine",
    });
    expect(r.ok).toBe(false);
  });
});

// ── regression guards ──────────────────────────────────────────────
describe("U-WIRE-PLAYWRIGHT-GUI / regression guards", () => {
  it("both new actions reachable from prism_knowledge dispatcher", async () => {
    const a = await call(server, "learn_video_gui_script", {
      target_software: "generic",
      actions: [{ action_type: "extrude", operation: "extrude", parameters: {} }],
    });
    const b = await call(server, "learn_video_execution_plan", { actions: [{ action_type: "extrude" }] });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
  });

  it("gui_script is deterministic across two identical calls", async () => {
    const params = {
      target_software: "onshape",
      actions: [{ action_type: "extrude", operation: "extrude", parameters: { depth: 10 } }],
    };
    const a = await call(server, "learn_video_gui_script", params);
    const b = await call(server, "learn_video_gui_script", params);
    expect(a.data.actions_count).toBe(b.data.actions_count);
    expect(a.data.estimated_duration_s).toBe(b.data.estimated_duration_s);
  });
});
