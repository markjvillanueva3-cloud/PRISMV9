import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

/**
 * True dispatcher-invocation E2E for prism_dev.distributed_critical_path.
 * Captures the handler via a mock McpServer.tool() and invokes with real
 * {action, params} so Zod validation + lazy import of
 * DistributedCriticalPathEngine run through production paths.
 */

type McpHandler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
  content?: Array<{ type: "text"; text: string }>;
  isError?: boolean;
} | Record<string, unknown>>;

function captureHandler(): { handler: McpHandler; schemaActions: readonly string[] } {
  let handler: McpHandler | null = null;
  let enumValues: readonly string[] = [];
  const server = {
    tool(
      _name: string,
      _description: string,
      schema: Record<string, unknown>,
      cb: McpHandler,
    ) {
      handler = cb;
      const action = (schema as { action?: { _def?: { values?: readonly string[]; entries?: Record<string, string> } } }).action;
      if (action?._def?.values) enumValues = action._def.values;
      else if (action?._def?.entries) enumValues = Object.keys(action._def.entries);
    },
  };
  registerDevDispatcher(server as unknown as Parameters<typeof registerDevDispatcher>[0]);
  if (!handler) throw new Error("registerDevDispatcher did not register a handler");
  return { handler, schemaActions: enumValues };
}

async function invoke(
  handler: McpHandler,
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const result = await handler({ action, params });
  const content = (result as { content?: Array<{ text: string }> }).content;
  if (!Array.isArray(content)) return result as Record<string, unknown>;
  return JSON.parse(content[0]?.text ?? "{}");
}

type Schedule = {
  id: string; owner: string; ES: number; EF: number;
  LS: number; LF: number; slack: number; critical: boolean;
};
type Analysis = {
  schedule: Record<string, Schedule>;
  criticalPath: string[];
  makespan: number;
  agentLoad: Record<string, number>;
  handoffEdges: Array<{ from: string; to: string; across: boolean }>;
};

describe("prism_dev.distributed_critical_path — dispatcher round-trip", () => {
  let handler: McpHandler;
  let schemaActions: readonly string[];

  beforeAll(() => {
    const captured = captureHandler();
    handler = captured.handler;
    schemaActions = captured.schemaActions;
  });

  it("wiring: distributed_critical_path appears in the prism_dev ACTIONS enum", () => {
    expect(schemaActions).toContain("distributed_critical_path");
  });

  it("single task: makespan = duration, task is critical, no handoffs", async () => {
    const data = await invoke(handler, "distributed_critical_path", {
      tasks: [{ id: "A", duration: 3, owner: "Claude" }],
    });
    const analysis = data.analysis as Analysis;
    expect(data.success).toBe(true);
    expect(analysis.makespan).toBe(3);
    expect(analysis.schedule["A"].critical).toBe(true);
    expect(analysis.schedule["A"].ES).toBe(0);
    expect(analysis.schedule["A"].EF).toBe(3);
    expect(analysis.criticalPath).toEqual(["A"]);
    // slimResponse strips empty arrays — so handoffEdges (empty here) will be absent
    expect(analysis.handoffEdges ?? []).toEqual([]);
  });

  it("chain across 2 agents: serial durations sum; handoff edge marked across=true", async () => {
    const data = await invoke(handler, "distributed_critical_path", {
      tasks: [
        { id: "A", duration: 2, owner: "Claude" },
        { id: "B", duration: 4, owner: "Codex", predecessors: ["A"] },
      ],
    });
    const analysis = data.analysis as Analysis;
    expect(analysis.makespan).toBe(6);
    expect(analysis.criticalPath).toEqual(["A", "B"]);
    expect(analysis.agentLoad).toEqual({ Claude: 2, Codex: 4 });
    expect(analysis.handoffEdges).toEqual([{ from: "A", to: "B", across: true }]);
  });

  it("contested owner: two parallel-looking tasks serialize on same agent", async () => {
    // A and B have NO predecessor relationship, but share owner — must run in series.
    const data = await invoke(handler, "distributed_critical_path", {
      tasks: [
        { id: "A", duration: 3, owner: "Claude" },
        { id: "B", duration: 2, owner: "Claude" },
      ],
    });
    const analysis = data.analysis as Analysis;
    // Topo order puts A first (same indeg=0). Makespan = 3 + 2 = 5.
    expect(analysis.makespan).toBe(5);
    expect(analysis.agentLoad.Claude).toBe(5);
    // slimResponse strips empty — handoffEdges absent because no explicit predecessors
    expect(analysis.handoffEdges ?? []).toEqual([]);
  });

  it("same-agent chain: handoff edge marked across=false", async () => {
    const data = await invoke(handler, "distributed_critical_path", {
      tasks: [
        { id: "A", duration: 2, owner: "Claude" },
        { id: "B", duration: 3, owner: "Claude", predecessors: ["A"] },
      ],
    });
    const analysis = data.analysis as Analysis;
    expect(analysis.makespan).toBe(5);
    expect(analysis.handoffEdges).toEqual([{ from: "A", to: "B", across: false }]);
  });

  it("parallelism across agents: 2 independent tasks run in parallel", async () => {
    const data = await invoke(handler, "distributed_critical_path", {
      tasks: [
        { id: "A", duration: 3, owner: "Claude" },
        { id: "B", duration: 4, owner: "Codex" },
      ],
    });
    const analysis = data.analysis as Analysis;
    expect(analysis.makespan).toBe(4); // max(3, 4) since no deps and different owners
    expect(analysis.schedule["A"].ES).toBe(0);
    expect(analysis.schedule["B"].ES).toBe(0);
  });

  it("FAIL: empty tasks array rejected by schema (min(1))", async () => {
    const data = await invoke(handler, "distributed_critical_path", { tasks: [] });
    expect(String(data.error ?? "")).toMatch(/Invalid params for distributed_critical_path/);
  });

  it("FAIL: task with negative duration rejected by schema", async () => {
    const data = await invoke(handler, "distributed_critical_path", {
      tasks: [{ id: "A", duration: -1, owner: "Claude" }],
    });
    expect(String(data.error ?? "")).toMatch(/Invalid params for distributed_critical_path/);
  });

  it("FAIL: task with empty owner rejected by schema", async () => {
    const data = await invoke(handler, "distributed_critical_path", {
      tasks: [{ id: "A", duration: 1, owner: "" }],
    });
    expect(String(data.error ?? "")).toMatch(/Invalid params for distributed_critical_path/);
  });

  it("FAIL: unknown predecessor surfaces engine error through dispatcher", async () => {
    const data = await invoke(handler, "distributed_critical_path", {
      tasks: [{ id: "A", duration: 1, owner: "Claude", predecessors: ["GHOST"] }],
    });
    // Engine throws, which becomes a dispatcherError — surfaces error message
    expect(String(data.error ?? "")).toMatch(/unknown predecessor/);
  });

  it("FAIL: cyclic predecessors surface engine error through dispatcher", async () => {
    const data = await invoke(handler, "distributed_critical_path", {
      tasks: [
        { id: "A", duration: 1, owner: "Claude", predecessors: ["B"] },
        { id: "B", duration: 1, owner: "Codex", predecessors: ["A"] },
      ],
    });
    expect(String(data.error ?? "")).toMatch(/cycle detected/);
  });

  it("ADV: 3-agent diamond DAG — two parallel middles converge to single successor", async () => {
    // A(2)->B(3), A(2)->C(4), B&C -> D(1). Middle is the max(3,4)=4. Total critical = 2+4+1=7.
    const data = await invoke(handler, "distributed_critical_path", {
      tasks: [
        { id: "A", duration: 2, owner: "Claude" },
        { id: "B", duration: 3, owner: "Codex", predecessors: ["A"] },
        { id: "C", duration: 4, owner: "Sonnet", predecessors: ["A"] },
        { id: "D", duration: 1, owner: "Claude", predecessors: ["B", "C"] },
      ],
    });
    const analysis = data.analysis as Analysis;
    expect(analysis.makespan).toBe(7);
    // C is on the critical path (longer branch), D is critical, A is critical
    expect(analysis.schedule["A"].critical).toBe(true);
    expect(analysis.schedule["C"].critical).toBe(true);
    expect(analysis.schedule["D"].critical).toBe(true);
    expect(analysis.schedule["B"].critical).toBe(false);
    expect(analysis.schedule["B"].slack).toBe(1); // 4-3=1 slack on B
  });

  it("ADV: agent load summed correctly across 6-task workload", async () => {
    const data = await invoke(handler, "distributed_critical_path", {
      tasks: [
        { id: "T1", duration: 2, owner: "Alice" },
        { id: "T2", duration: 3, owner: "Alice" },
        { id: "T3", duration: 4, owner: "Bob" },
        { id: "T4", duration: 1, owner: "Bob" },
        { id: "T5", duration: 5, owner: "Carol" },
        { id: "T6", duration: 2, owner: "Alice" },
      ],
    });
    const analysis = data.analysis as Analysis;
    expect(analysis.agentLoad).toEqual({ Alice: 7, Bob: 5, Carol: 5 });
  });

  it("ADV: zero-duration task (milestone) is still schedulable", async () => {
    const data = await invoke(handler, "distributed_critical_path", {
      tasks: [
        { id: "REAL", duration: 3, owner: "Claude" },
        { id: "GATE", duration: 0, owner: "Claude", predecessors: ["REAL"] },
        { id: "POST", duration: 2, owner: "Codex", predecessors: ["GATE"] },
      ],
    });
    const analysis = data.analysis as Analysis;
    expect(analysis.makespan).toBe(5);
    expect(analysis.schedule["GATE"].ES).toBe(3);
    expect(analysis.schedule["GATE"].EF).toBe(3);
  });
});
