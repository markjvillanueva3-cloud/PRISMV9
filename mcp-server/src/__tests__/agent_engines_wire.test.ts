/**
 * U-BRIDGE-WIRE-AGENT — real dispatcher round-trip tests
 * =======================================================
 * Registers the live prism_session dispatcher against a minimal
 * MCP server harness (captures the handler), then invokes each
 * of the 9 newly-wired actions and asserts the actual response
 * shape produced by the dispatcher + the underlying engine.
 * No mocks of the system-under-test.
 *
 * Generated as part of oscar /loop drain (2026-05-23,
 * claude-e83edc54). Companion to PRISM-CLAUDE.md
 * §"ENGINE WIRING — WIRE TO ALL SOURCES" doctrine.
 *
 * @module __tests__/agent_engines_wire
 */
import { describe, it, expect, beforeAll } from "vitest";
import { z } from "zod";

import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";
import { agentWorkflowEngine } from "../engines/AgentWorkflowEngine.js";

// ---------------------------------------------------------------------------
// Minimal MCP server harness — captures the handler so the test invokes the
// REAL dispatcher pipeline (Zod validation + lazy engine import + ok-wrapper).
// ---------------------------------------------------------------------------
type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
  content: Array<{ type: "text"; text: string }>;
}>;

let invoke: (action: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;

beforeAll(() => {
  let captured: Handler | undefined;
  const fakeServer = {
    tool: (
      _name: string,
      _desc: string,
      _schema: { action: z.ZodEnum; params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>> },
      handler: Handler,
    ) => {
      captured = handler;
    },
  };
  registerSessionDispatcher(fakeServer);
  if (!captured) throw new Error("registerSessionDispatcher did not register the prism_session tool");
  const h = captured;
  invoke = async (action, params = {}) => {
    const res = await h({ action, params });
    return JSON.parse(res.content[0].text) as Record<string, unknown>;
  };
});

// ---------------------------------------------------------------------------
// AgentAutoUpdateEngine surface — 5 actions
// ---------------------------------------------------------------------------
describe("prism_session::agent_knowledge_* (AgentAutoUpdateEngine round-trip)", () => {
  it("agent_knowledge_scan returns success:true + multiple fields from ScanResult", async () => {
    const r = await invoke("agent_knowledge_scan");
    expect(r.success).toBe(true);
    // ScanResult carries scanned_paths/new_assets counters; round-trip must
    // produce at least 3 keys (success + ≥2 ScanResult fields).
    expect(Object.keys(r).length).toBeGreaterThanOrEqual(3);
  });

  it("agent_knowledge_snapshot returns success:true + a non-trivial snapshot", async () => {
    const r = await invoke("agent_knowledge_snapshot");
    expect(r.success).toBe(true);
    // AgentKnowledgeSnapshot carries at least timestamp + several counters.
    expect(Object.keys(r).length).toBeGreaterThanOrEqual(3);
  });

  it("agent_knowledge_recent honors count cap exactly", async () => {
    const r3 = await invoke("agent_knowledge_recent", { count: 3 });
    expect(r3.success).toBe(true);
    expect(Array.isArray(r3.updates)).toBe(true);
    expect((r3.updates as unknown[]).length).toBeLessThanOrEqual(3);
    expect(r3.count).toBe((r3.updates as unknown[]).length);

    const r10 = await invoke("agent_knowledge_recent", { count: 10 });
    expect((r10.updates as unknown[]).length).toBeLessThanOrEqual(10);
    expect((r10.updates as unknown[]).length).toBeGreaterThanOrEqual((r3.updates as unknown[]).length);
  });

  it("agent_knowledge_recent rejects fractional count via dispatcher Zod gate", async () => {
    const r = await invoke("agent_knowledge_recent", { count: 1.5 });
    expect(typeof r.error).toBe("string");
    expect((r.error as string).toLowerCase()).toMatch(/invalid|count/);
  });

  it("agent_knowledge_recent rejects count > 1000 (schema max)", async () => {
    const r = await invoke("agent_knowledge_recent", { count: 1001 });
    expect(typeof r.error).toBe("string");
    expect((r.error as string).toLowerCase()).toMatch(/invalid|count/);
  });

  it("agent_knowledge_context_string returns success:true + a string context payload", async () => {
    const r = await invoke("agent_knowledge_context_string");
    expect(r.success).toBe(true);
    expect(typeof r.context).toBe("string");
    expect((r.context as string).length).toBeGreaterThan(0);
  });

  it("agent_knowledge_rescan returns success:true + ScanResult fields", async () => {
    const r = await invoke("agent_knowledge_rescan");
    expect(r.success).toBe(true);
    expect(Object.keys(r).length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// AgentWorkflowEngine surface — 4 actions
// ---------------------------------------------------------------------------
describe("prism_session::agent_workflow_* (AgentWorkflowEngine round-trip)", () => {
  it("agent_workflow_list returns count + workflows[] with step_count > 0 each", async () => {
    const r = await invoke("agent_workflow_list");
    expect(r.success).toBe(true);
    expect(typeof r.count).toBe("number");
    expect(r.count as number).toBeGreaterThan(0);
    const workflows = r.workflows as Array<{
      workflow_id: string;
      name: string;
      type: string;
      step_count: number;
    }>;
    expect(workflows.length).toBe(r.count);
    for (const w of workflows) {
      expect(w.workflow_id.length).toBeGreaterThan(0);
      expect(w.name.length).toBeGreaterThan(0);
      expect(w.type.length).toBeGreaterThan(0);
      expect(w.step_count).toBeGreaterThan(0);
    }
  });

  it("agent_workflow_status (no instance_id) returns running/completed counters that match arrays", async () => {
    const r = await invoke("agent_workflow_status");
    // The no-instance_id branch always returns the counters envelope. If the
    // dispatcher emitted an error envelope instead, surface the raw response
    // in the assertion message so the actual cause is debuggable.
    expect(typeof r.running_count, JSON.stringify(r)).toBe("number");
    expect(typeof r.completed_count).toBe("number");
    expect(r.success).toBe(true);
    // running[] is only present when non-empty (slimResponse strips empty arrays).
    const runCount = r.running_count as number;
    if (runCount > 0) {
      expect(Array.isArray(r.running)).toBe(true);
      expect((r.running as unknown[]).length).toBe(runCount);
    }
  });

  it("agent_workflow_status returns success:false + 'not found' error for unknown instance_id", async () => {
    const r = await invoke("agent_workflow_status", { instance_id: "wf-not-real-99999" });
    expect(r.success).toBe(false);
    expect((r.error as string).toLowerCase()).toContain("not found");
  });

  it("agent_workflow_start refuses missing workflow_id via Zod gate (error envelope)", async () => {
    const r = await invoke("agent_workflow_start", {});
    expect(typeof r.error).toBe("string");
    expect((r.error as string).toLowerCase()).toMatch(/invalid|workflow_id/);
  });

  it("agent_workflow_start fails soft on unknown workflow_id (engine throws → dispatcher catches)", async () => {
    const r = await invoke("agent_workflow_start", {
      workflow_id: "definitely-not-a-real-workflow-12345",
      context: {},
    });
    expect(r.success).toBe(false);
    expect((r.error as string).toLowerCase()).toContain("not found");
  });

  it("agent_workflow_start with a real template produces an instance findable by the engine", async () => {
    const wfs = agentWorkflowEngine.getWorkflows();
    expect(wfs.length).toBeGreaterThan(0);
    const target = wfs[0];

    const started = await invoke("agent_workflow_start", {
      workflow_id: target.workflow_id,
      context: { sentinel: "U-BRIDGE-WIRE-AGENT-test" },
      options: { timeout_ms: 1000 },
    });
    expect(typeof started.instance_id).toBe("string");
    expect((started.instance_id as string).startsWith(`wf-${target.workflow_id}-`)).toBe(true);
    expect(started.workflow_id).toBe(target.workflow_id);

    // Instance must be reachable through the engine singleton — running or
    // already-completed both qualify (the executor runs asynchronously and
    // may resolve before this assertion).
    const found = agentWorkflowEngine.getInstance(started.instance_id as string);
    expect(found?.instance_id).toBe(started.instance_id);
    expect(found?.workflow_id).toBe(target.workflow_id);

    // Cancel through the dispatcher echoes the same instance_id and a
    // boolean success flag (true if still running, false if already done).
    const cancelled = await invoke("agent_workflow_cancel", {
      instance_id: started.instance_id,
    });
    expect(cancelled.instance_id).toBe(started.instance_id);
    expect(typeof cancelled.success).toBe("boolean");
  });

  it("agent_workflow_cancel refuses missing instance_id via Zod gate", async () => {
    const r = await invoke("agent_workflow_cancel", {});
    expect(typeof r.error).toBe("string");
    expect((r.error as string).toLowerCase()).toMatch(/invalid|instance_id/);
  });

  it("agent_workflow_cancel(unknown) returns success:false + echoes instance_id (no throw)", async () => {
    const r = await invoke("agent_workflow_cancel", {
      instance_id: "wf-definitely-not-real-99999",
    });
    expect(r.success).toBe(false);
    expect(r.instance_id).toBe("wf-definitely-not-real-99999");
  });
});
