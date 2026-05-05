/**
 * camDispatcher — LatheLoRAMasterOrchestratorEngine round-trip suite
 * ====================================================================
 *
 * LATHE-LORA-MS0 / U-LLR-MASTER-WIRE — wires the 5 high-level orchestrator
 * methods of LatheLoRAMasterOrchestratorEngine into prism_cam:
 *
 *   - initialize()                    → lathe_lora_master_initialize
 *   - registerSubsystem(name, phase)  → lathe_lora_master_register_subsystem
 *   - transition(phase)               → lathe_lora_master_transition
 *   - healthCheck() + getStats()      → lathe_lora_master_health
 *   - getSummary()                    → lathe_lora_master_summary
 *
 * Closes the WIRE-TO-ALL-SOURCES gap surfaced by the 2026-05-05 lathe audit.
 * Engine has been on disk since LATHE-LORA-MS0 U-LLR50 but had zero
 * dispatcher exposure; these actions are the front door for orchestrator
 * lifecycle ops.
 *
 * @milestone LATHE-LORA-MS0
 * @unit U-LLR-MASTER-WIRE
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";
import { latheLoRAMasterOrchestratorEngine } from "../engines/LatheLoRAMasterOrchestratorEngine.js";

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

interface CallResult {
  ok: boolean;
  data: unknown;
  error?: string;
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<CallResult> {
  const tool = server.tools.find(t => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw, error: (raw as { error: string }).error };
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
    return {
      ok: false,
      data: parsed,
      error: String((parsed as Record<string, unknown>).error ?? ""),
    };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  // Engine is a process-singleton — reset every test so prior state doesn't leak across cases.
  // Adversarial test below relies on this baseline.
  latheLoRAMasterOrchestratorEngine.reset();
  server = new MockMCPServer();
  registerCamDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

// ─────────────────────────────────────────────────────────────────────
// 1. Happy paths — exercise each of the 5 actions
// ─────────────────────────────────────────────────────────────────────
describe("LatheLoRA master orchestrator dispatcher — happy paths", () => {
  it("lathe_lora_master_initialize returns a fresh state with id, phase, and initial health", async () => {
    const r = await call(server, "lathe_lora_master_initialize");
    expect(r.ok).toBe(true);
    const data = r.data as { id: string; current_phase: string; overall_health: string; initialized_at: number };
    expect(data.id).toMatch(/^master-\d+-[a-z0-9]+$/);
    expect(data.current_phase).toBe("data_collection");
    expect(data.overall_health).toBe("initializing");
    expect(data.initialized_at).toBeGreaterThan(0);
  });

  it("lathe_lora_master_register_subsystem succeeds after initialize and reports the registration", async () => {
    await call(server, "lathe_lora_master_initialize");
    const r = await call(server, "lathe_lora_master_register_subsystem", {
      name: "training",
      initial_phase: "data_collection",
    });
    expect(r.ok).toBe(true);
    expect(r.data).toMatchObject({ registered: true, name: "training", initial_phase: "data_collection" });
    // Verify against engine state directly — proves dispatcher actually mutated the singleton, not just echoed.
    const stats = latheLoRAMasterOrchestratorEngine.getStats();
    expect(stats.total_subsystems).toBe(1);
  });

  it("lathe_lora_master_transition advances the phase forward", async () => {
    await call(server, "lathe_lora_master_initialize");
    const r = await call(server, "lathe_lora_master_transition", { phase: "training" });
    expect(r.ok).toBe(true);
    expect(r.data).toMatchObject({ transitioned: true, phase: "training" });
    expect(latheLoRAMasterOrchestratorEngine.getStats().current_phase).toBe("training");
  });

  it("lathe_lora_master_health returns engine health plus full stats payload", async () => {
    await call(server, "lathe_lora_master_initialize");
    await call(server, "lathe_lora_master_register_subsystem", { name: "training" });
    const r = await call(server, "lathe_lora_master_health");
    expect(r.ok).toBe(true);
    const data = r.data as { health: string; stats: { initialized: boolean; total_subsystems: number; uptime_ms: number } };
    expect(["healthy", "degraded", "unhealthy", "initializing"]).toContain(data.health);
    expect(data.stats.initialized).toBe(true);
    expect(data.stats.total_subsystems).toBe(1);
    expect(data.stats.uptime_ms).toBeGreaterThanOrEqual(0);
  });

  it("lathe_lora_master_summary returns a multi-line summary block when initialized", async () => {
    await call(server, "lathe_lora_master_initialize");
    const r = await call(server, "lathe_lora_master_summary");
    expect(r.ok).toBe(true);
    const summary = (r.data as { summary: string }).summary;
    expect(summary).toContain("LatheLoRA Master Orchestrator");
    expect(summary).toContain("Phase:");
    expect(summary).toContain("Health:");
    expect(summary).toContain("Subsystems:");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Failure modes — bad input, missing prerequisites, invalid args
// ─────────────────────────────────────────────────────────────────────
describe("LatheLoRA master orchestrator dispatcher — failure modes", () => {
  it("register_subsystem before initialize fails with explicit guidance to call initialize first", async () => {
    const r = await call(server, "lathe_lora_master_register_subsystem", { name: "training" });
    expect(r.ok).toBe(false);
    expect(r.error ?? "").toMatch(/orchestrator not initialized.*lathe_lora_master_initialize/i);
  });

  it("register_subsystem rejects missing name with explicit error", async () => {
    await call(server, "lathe_lora_master_initialize");
    const r = await call(server, "lathe_lora_master_register_subsystem", {});
    expect(r.ok).toBe(false);
    expect(r.error ?? "").toMatch(/'name' \(string\) is required/);
  });

  it("transition rejects missing phase with explicit error", async () => {
    await call(server, "lathe_lora_master_initialize");
    const r = await call(server, "lathe_lora_master_transition", {});
    expect(r.ok).toBe(false);
    expect(r.error ?? "").toMatch(/'phase' \(string\) is required/);
  });

  it("transition backwards (production → data_collection) is rejected", async () => {
    await call(server, "lathe_lora_master_initialize");
    await call(server, "lathe_lora_master_transition", { phase: "training" });
    await call(server, "lathe_lora_master_transition", { phase: "evaluation" });
    await call(server, "lathe_lora_master_transition", { phase: "deployment" });
    await call(server, "lathe_lora_master_transition", { phase: "production" });
    const r = await call(server, "lathe_lora_master_transition", { phase: "data_collection" });
    expect(r.ok).toBe(false);
    expect(r.error ?? "").toMatch(/rejected.*backwards transition not allowed/);
    // engine state should still reflect the latest valid phase
    expect(latheLoRAMasterOrchestratorEngine.getStats().current_phase).toBe("production");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. Edge cases — boundary, repeated ops, multi-subsystem aggregation
// ─────────────────────────────────────────────────────────────────────
describe("LatheLoRA master orchestrator dispatcher — edge cases", () => {
  it("initialize called twice replaces prior state with a new id", async () => {
    const first = (await call(server, "lathe_lora_master_initialize")).data as { id: string };
    // Force a measurable delay so the embedded Date.now() in the id differs.
    await new Promise(resolve => setTimeout(resolve, 5));
    const second = (await call(server, "lathe_lora_master_initialize")).data as { id: string };
    expect(second.id).not.toBe(first.id);
  });

  it("registering N subsystems updates total_subsystems to N", async () => {
    await call(server, "lathe_lora_master_initialize");
    const subsystems = ["data_pipeline", "training", "evaluation", "deployment", "monitoring"];
    for (const name of subsystems) {
      await call(server, "lathe_lora_master_register_subsystem", { name });
    }
    const r = await call(server, "lathe_lora_master_health");
    const stats = (r.data as { stats: { total_subsystems: number } }).stats;
    expect(stats.total_subsystems).toBe(subsystems.length);
  });

  it("maintenance phase can be entered from any forward state (special-cased)", async () => {
    await call(server, "lathe_lora_master_initialize");
    await call(server, "lathe_lora_master_transition", { phase: "training" });
    // maintenance can be reached even though it's index 5 — but jumping FROM training (idx 1)
    // is still a forward transition. The harder case is jumping back to maintenance after production.
    await call(server, "lathe_lora_master_transition", { phase: "production" });
    const r = await call(server, "lathe_lora_master_transition", { phase: "maintenance" });
    expect(r.ok).toBe(true);
    expect(latheLoRAMasterOrchestratorEngine.getStats().current_phase).toBe("maintenance");
  });

  it("summary on uninitialized orchestrator returns the 'Not initialized' marker", async () => {
    // No initialize call this test — relies on beforeEach reset()
    const r = await call(server, "lathe_lora_master_summary");
    expect(r.ok).toBe(true);
    expect((r.data as { summary: string }).summary).toBe("Master Orchestrator: Not initialized");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Adversarial inputs — invalid phase, unknown ops
// ─────────────────────────────────────────────────────────────────────
describe("LatheLoRA master orchestrator dispatcher — adversarial inputs", () => {
  it("transition with a non-enum phase string is rejected (not silently coerced)", async () => {
    await call(server, "lathe_lora_master_initialize");
    const r = await call(server, "lathe_lora_master_transition", { phase: "ASCEND_TO_GODHOOD" });
    expect(r.ok).toBe(false);
    expect(r.error ?? "").toMatch(/invalid phase 'ASCEND_TO_GODHOOD'/);
    // state should be unchanged
    expect(latheLoRAMasterOrchestratorEngine.getStats().current_phase).toBe("data_collection");
  });

  it("register_subsystem with a non-string name (number coerced) is rejected", async () => {
    await call(server, "lathe_lora_master_initialize");
    const r = await call(server, "lathe_lora_master_register_subsystem", { name: 12345 });
    expect(r.ok).toBe(false);
    expect(r.error ?? "").toMatch(/'name' \(string\) is required/);
  });
});
