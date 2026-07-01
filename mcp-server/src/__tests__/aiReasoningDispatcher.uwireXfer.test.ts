/**
 * aiReasoningDispatcher U-WIRE-XFER round-trip tests — TransferLearningAdapterEngine.
 *
 * Validates the 10 new actions (xfer_register_domain / xfer_create_task /
 * xfer_domain_similarity / xfer_feature_alignment / xfer_instance_weights /
 * xfer_adapt / xfer_get_tasks / xfer_get_result / xfer_statistics /
 * xfer_get_config) wire through prism_ai (aiReasoningDispatcher) and that the
 * domain-adaptation surface behaves per contract: register domains, create a
 * transfer task (throws on a missing domain), score domain similarity, align
 * features, compute importance weights, run a (simulated) adaptation.
 *
 * Pattern: LIVE dispatcher round-trip. prism_ai wraps every result as
 * JSON.stringify({success, data: slimResponse(result)}) -- so the engine payload
 * is nested under `.data` and slimResponse drops null/empty (assert via ?? null).
 * The engine is a module singleton; reset() clears tasks/results but NOT domains,
 * so each test uses UNIQUE domain ids and resets tasks in beforeEach.
 * xfer_adapt is intentionally Math.random-driven -> structural assertions only.
 *
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED-PAPA autonomous loop iteration 5.
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-XFER
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerAIReasoningDispatcher } from "../tools/dispatchers/aiReasoningDispatcher.js";
import { transferLearningAdapterEngine } from "../engines/TransferLearningAdapterEngine.js";

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

// prism_ai returns content[0].text = JSON.stringify({success, data}); unwrap `.data`.
async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as { content: { type: string; text: string }[] };
  const text = raw.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && "success" in parsed) {
    if ((parsed as { success: boolean }).success === false) return { ok: false, data: parsed };
    return { ok: true, data: ((parsed as { data?: Record<string, unknown> }).data ?? {}) };
  }
  return { ok: false, data: parsed };
}
function newServer(): MockMCPServer {
  const s = new MockMCPServer();
  registerAIReasoningDispatcher(s as unknown as { tool: Function });
  return s;
}
function domainArgs(id: string, over: Record<string, unknown> = {}) {
  return {
    id, name: `domain ${id}`, type: "material",
    properties: { hardness: 200, modulus: 210, density: 7.8 }, sample_count: 120, ...over,
  };
}

describe("U-WIRE-XFER — TransferLearningAdapterEngine via prism_ai", () => {
  // reset() clears tasks/results so list/stats see only this test's data.
  beforeEach(() => { transferLearningAdapterEngine.reset(); });

  it("registers exactly one prism_ai tool", () => {
    expect(newServer().tools).toHaveLength(1);
    expect(newServer().tools[0]!.name).toBe("prism_ai");
  });

  it("xfer_register_domain -> registered, returns domain_id", async () => {
    const s = newServer();
    const r = await call(s, "xfer_register_domain", { domain: domainArgs("XF-REG-A") });
    expect(r.ok).toBe(true);
    expect(r.data.registered).toBe(true);
    expect(r.data.domain_id).toBe("XF-REG-A");
  });

  it("xfer_register_domain invalid type enum -> error (failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "xfer_register_domain", { domain: domainArgs("XF-BADTYPE", { type: "not-a-type" }) });
    expect(r.ok).toBe(false);
  });

  it("xfer_create_task with two registered domains -> pending task", async () => {
    const s = newServer();
    await call(s, "xfer_register_domain", { domain: domainArgs("XF-SRC-1") });
    await call(s, "xfer_register_domain", { domain: domainArgs("XF-TGT-1") });
    const r = await call(s, "xfer_create_task", {
      source_id: "XF-SRC-1", target_id: "XF-TGT-1", task_type: "force", method: "ewc",
    });
    expect(r.ok).toBe(true);
    const task = r.data.task as Record<string, unknown>;
    expect(task.status).toBe("pending");
    expect(typeof task.id).toBe("string");
    expect(task.adaptation_method).toBe("ewc");
  });

  it("xfer_create_task with a missing domain -> error (engine throws, failure mode)", async () => {
    const s = newServer();
    await call(s, "xfer_register_domain", { domain: domainArgs("XF-ONLY-SRC") });
    const r = await call(s, "xfer_create_task", {
      source_id: "XF-ONLY-SRC", target_id: "XF-DOES-NOT-EXIST", task_type: "thermal",
    });
    expect(r.ok).toBe(false);
  });

  it("xfer_create_task missing required task_type -> error (schema, failure mode)", async () => {
    const s = newServer();
    await call(s, "xfer_register_domain", { domain: domainArgs("XF-MS-S") });
    await call(s, "xfer_register_domain", { domain: domainArgs("XF-MS-T") });
    const r = await call(s, "xfer_create_task", { source_id: "XF-MS-S", target_id: "XF-MS-T" });
    expect(r.ok).toBe(false);
  });

  it("xfer_domain_similarity for near-identical domains -> high feasibility", async () => {
    const s = newServer();
    await call(s, "xfer_register_domain", { domain: domainArgs("XF-SIM-A") });
    await call(s, "xfer_register_domain", { domain: domainArgs("XF-SIM-B") }); // identical props
    const r = await call(s, "xfer_domain_similarity", { source_id: "XF-SIM-A", target_id: "XF-SIM-B" });
    expect(r.ok).toBe(true);
    expect(r.data.similarity).toBe(1);
    expect(r.data.feasibility).toBe("high");
    expect((r.data.shared_properties as string[]).length).toBeGreaterThan(0);
  });

  it("xfer_domain_similarity with a missing domain -> infeasible, similarity 0 (no throw)", async () => {
    const s = newServer();
    await call(s, "xfer_register_domain", { domain: domainArgs("XF-SIM-ONLY") });
    const r = await call(s, "xfer_domain_similarity", { source_id: "XF-SIM-ONLY", target_id: "XF-ABSENT" });
    expect(r.ok).toBe(true);
    expect(r.data.feasibility).toBe("infeasible");
    expect(r.data.similarity ?? 0).toBe(0);
  });

  it("xfer_feature_alignment maps matching features (Map serialized to object)", async () => {
    const s = newServer();
    const r = await call(s, "xfer_feature_alignment", {
      source_features: ["cutting_force", "spindle_speed"],
      target_features: ["cuttingforce", "spindle-speed"],
    });
    expect(r.ok).toBe(true);
    const mapping = r.data.mapping as Record<string, string>;
    expect(mapping.cutting_force).toBe("cuttingforce");
    expect(typeof r.data.alignment_score).toBe("number");
  });

  it("xfer_instance_weights returns one weight per source sample", async () => {
    const s = newServer();
    const r = await call(s, "xfer_instance_weights", {
      source_data: [{ features: [1, 2] }, { features: [3, 4] }, { features: [5, 6] }],
      target_data: [{ features: [1.1, 2.1] }, { features: [3.1, 4.1] }],
    });
    expect(r.ok).toBe(true);
    expect((r.data.weights as number[]).length).toBe(3);
  });

  it("xfer_adapt after create_task -> shaped AdaptationResult (numbers non-deterministic)", async () => {
    const s = newServer();
    await call(s, "xfer_register_domain", { domain: domainArgs("XF-AD-S") });
    await call(s, "xfer_register_domain", { domain: domainArgs("XF-AD-T") });
    const t = await call(s, "xfer_create_task", { source_id: "XF-AD-S", target_id: "XF-AD-T", task_type: "tool_life", method: "fine_tune" });
    const taskId = (t.data.task as Record<string, unknown>).id as string;
    const r = await call(s, "xfer_adapt", {
      task_id: taskId,
      source_data: [{ features: [1, 2, 3], label: 1 }, { features: [4, 5, 6], label: 0 }],
      target_data: [{ features: [1.1, 2.1, 3.1], label: 1 }],
    });
    expect(r.ok).toBe(true);
    expect(r.data.task_id).toBe(taskId);
    expect(typeof r.data.transfer_gain).toBe("number");
    expect(typeof r.data.target_accuracy_after).toBe("number");
  });

  it("xfer_adapt for an unknown task -> error (engine throws, failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "xfer_adapt", { task_id: "NO-SUCH-TASK", source_data: [{ features: [1], label: 1 }], target_data: [{ features: [1] }] });
    expect(r.ok).toBe(false);
  });

  it("xfer_get_result returns null for an un-adapted task (slimmed -> ?? null)", async () => {
    const s = newServer();
    const r = await call(s, "xfer_get_result", { task_id: "XF-NEVER-ADAPTED" });
    expect(r.ok).toBe(true);
    expect(r.data.result ?? null).toBe(null);
  });

  it("xfer_get_tasks lists a created task", async () => {
    const s = newServer();
    await call(s, "xfer_register_domain", { domain: domainArgs("XF-LT-S") });
    await call(s, "xfer_register_domain", { domain: domainArgs("XF-LT-T") });
    const t = await call(s, "xfer_create_task", { source_id: "XF-LT-S", target_id: "XF-LT-T", task_type: "surface" });
    const taskId = (t.data.task as Record<string, unknown>).id as string;
    const r = await call(s, "xfer_get_tasks");
    expect(r.ok).toBe(true);
    expect((r.data.tasks as Array<{ id: string }>).some((x) => x.id === taskId)).toBe(true);
  });

  it("xfer_statistics reports total_tasks", async () => {
    const s = newServer();
    await call(s, "xfer_register_domain", { domain: domainArgs("XF-ST-S") });
    await call(s, "xfer_register_domain", { domain: domainArgs("XF-ST-T") });
    await call(s, "xfer_create_task", { source_id: "XF-ST-S", target_id: "XF-ST-T", task_type: "chatter" });
    const r = await call(s, "xfer_statistics");
    expect(r.ok).toBe(true);
    expect(r.data.total_tasks).toBe(1);
  });

  it("xfer_get_config returns the adapter config", async () => {
    const s = newServer();
    const r = await call(s, "xfer_get_config");
    expect(r.ok).toBe(true);
    expect(typeof r.data.adaptation_method).toBe("string");
    expect(typeof r.data.max_epochs).toBe("number");
  });
});
