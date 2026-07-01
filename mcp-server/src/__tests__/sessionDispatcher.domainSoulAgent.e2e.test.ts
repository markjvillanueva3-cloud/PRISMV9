import { describe, it, expect } from "vitest";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

/**
 * Dispatcher round-trip E2E for prism_session:domain_soul_agent_route
 * (DOMAIN-SOUL-AGENTS/U4). Routes a task to its domain-soul agent (<slot>-<domain>)
 * + the hybrid Claude/Hermes/Ollama lane, by matching the 26 slot souls'
 * domain_filter regexes against the task text. Tests THROUGH the real switch/case +
 * schema + ok() normalizer (R15), against the LIVE on-disk slot souls (PRISM_ROOT).
 */
type McpHandler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}>;

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
  if (!result || !Array.isArray((result as { content?: unknown[] }).content)) {
    return result as unknown as Record<string, unknown>;
  }
  const raw = (result as { content: Array<{ text: string }> }).content[0]?.text ?? "";
  return JSON.parse(raw);
}

describe("prism_session:domain_soul_agent_route -- dispatcher round-trip", () => {
  const { handler, schemaActions } = captureHandler();

  it("wiring: domain_soul_agent_route appears in the ACTIONS enum", () => {
    expect(schemaActions).toContain("domain_soul_agent_route");
  });

  it("a quoting task routes to charlie-quoting", async () => {
    const data = await invoke(handler, "domain_soul_agent_route", {
      task_text: "review the margin and cost estimate for this quote",
      task_kind: "review",
      hermes_healthy: false,
      ollama_healthy: true,
      parallelism: 4,
    });
    expect(data.success).toBe(true);
    expect(data.matched).toBe(true);
    expect(data.agent).toBe("charlie-quoting");
    // dark proxy + ollama up + fan-out review -> ollama free lane
    const lane = data.lane as { lane: string; fallback_chain: string[] };
    expect(lane.lane).toBe("ollama");
    expect(lane.fallback_chain).toEqual(["ollama", "claude"]);
  });

  it("an ERP/business task routes to hotel-business", async () => {
    const data = await invoke(handler, "domain_soul_agent_route", {
      task_text: "wire the ERP work order and payroll accounting routes",
      task_kind: "build",
    });
    expect(data.matched).toBe(true);
    // hotel's domain_filter should win for ERP/payroll/accounting language
    const all = data.all_matches as Array<{ agent: string }>;
    expect(all.some((m) => m.agent === "hotel-business")).toBe(true);
  });

  it("a CAD task routes to delta-cad", async () => {
    const data = await invoke(handler, "domain_soul_agent_route", {
      task_text: "extract features from this STEP CAD geometry model",
    });
    const all = data.all_matches as Array<{ agent: string }>;
    expect(all.some((m) => m.agent === "delta-cad")).toBe(true);
  });

  it("SAFETY: a safety_write task is forced to the claude lane regardless of proxy health", async () => {
    const data = await invoke(handler, "domain_soul_agent_route", {
      task_text: "review the margin on this quote", // matches charlie
      task_kind: "safety_write",
      hermes_healthy: true,
      parallelism: 8,
    });
    expect(data.agent).toBe("charlie-quoting");
    const lane = data.lane as { lane: string; reason: string };
    expect(lane.lane).toBe("claude");
    expect(lane.reason).toMatch(/safety-critical/i);
  });

  it("healthy proxy + fan-out review -> hermes free lane", async () => {
    const data = await invoke(handler, "domain_soul_agent_route", {
      task_text: "audit the quote pricing margin",
      task_kind: "audit",
      hermes_healthy: true,
      ollama_healthy: true,
      parallelism: 5,
    });
    const lane = data.lane as { lane: string; free_lane: boolean };
    expect(lane.lane).toBe("hermes");
    expect(lane.free_lane).toBe(true);
  });

  it("a no-domain prompt returns matched:false + no agent + no lane (no false route)", async () => {
    const data = await invoke(handler, "domain_soul_agent_route", {
      task_text: "hello there how is the weather today",
    });
    // slimResponse strips null/undefined + empty arrays, so agent/lane/all_matches arrive
    // ABSENT (not literal null). The load-bearing contract is "no false route".
    expect(data.matched).toBe(false);
    expect(data.agent ?? null).toBe(null);
    expect(data.lane ?? null).toBe(null);
    expect((data.all_matches as unknown[]) ?? []).toEqual([]);
  });

  it("ADVERSARIAL: empty task_text -> matched:false, never throws", async () => {
    const data = await invoke(handler, "domain_soul_agent_route", { task_text: "" });
    expect(data.success).toBe(true);
    expect(data.matched).toBe(false);
  });

  it("ADVERSARIAL: missing task_text -> matched:false, never throws", async () => {
    const data = await invoke(handler, "domain_soul_agent_route", {});
    expect(data.success).toBe(true);
    expect(data.matched).toBe(false);
  });

  it("ADVERSARIAL: invalid task_kind falls back to 'review' (no crash) when a domain matches", async () => {
    const data = await invoke(handler, "domain_soul_agent_route", {
      task_text: "review the quote margin",
      task_kind: "nonsense-kind",
      hermes_healthy: true,
      parallelism: 4,
    });
    expect(data.matched).toBe(true);
    // review @ fan-out + healthy proxy -> hermes
    const lane = data.lane as { lane: string };
    expect(lane.lane).toBe("hermes");
  });
});
