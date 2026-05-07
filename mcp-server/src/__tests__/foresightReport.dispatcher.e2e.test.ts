import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

/**
 * True dispatcher-invocation E2E for prism_dev.foresight_report — mocks
 * McpServer.tool() to capture the registered handler, then invokes it with
 * real {action, params} so the switch/case, schema validation, and lazy
 * engine import all run through production code paths.
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
  if (!Array.isArray(content)) {
    // Schema-validation failure: dispatcherError returns a plain object
    return result as Record<string, unknown>;
  }
  return JSON.parse(content[0]?.text ?? "{}");
}

describe("prism_dev.foresight_report — dispatcher round-trip", () => {
  let handler: McpHandler;
  let schemaActions: readonly string[];

  beforeAll(() => {
    const captured = captureHandler();
    handler = captured.handler;
    schemaActions = captured.schemaActions;
  });

  it("wiring: foresight_report appears in the prism_dev ACTIONS enum", () => {
    expect(schemaActions).toContain("foresight_report");
  });

  it("happy path: returns report.verdict, severity, summary through the handler", async () => {
    const data = await invoke(handler, "foresight_report", {
      description: "Add a new test helper to existing module",
      unitClass: "generic",
    });
    expect(data.success).toBe(true);
    const report = data.report as { verdict: string; severity: string; summary: string };
    expect(["go", "caution", "no_go"]).toContain(report.verdict);
    expect(["ok", "warn", "block"]).toContain(report.severity);
    expect(report.summary.startsWith("verdict=")).toBe(true);
  });

  it("FAIL: schema rejects missing description with an Invalid params envelope", async () => {
    const data = await invoke(handler, "foresight_report", {});
    // devDispatcher returns { error, details } (no success field) on validation failure
    expect(String(data.error ?? "")).toMatch(/Invalid params for foresight_report/);
    expect("report" in data).toBe(false);
  });

  it("FAIL: schema rejects non-string description with an Invalid params envelope", async () => {
    const data = await invoke(handler, "foresight_report", { description: 42 });
    expect(String(data.error ?? "")).toMatch(/Invalid params for foresight_report/);
    expect("report" in data).toBe(false);
  });

  it("ADV: severity→verdict bidirectional invariant holds through the handler", async () => {
    const data = await invoke(handler, "foresight_report", {
      description: "Risky change near context limit",
      contextTokensUsed: 999_000,
      contextTokensLimit: 1_000_000,
      modelName: "opus_4_7_1m",
    });
    const report = data.report as { verdict: string; severity: string };
    const expectedVerdict = report.severity === "block" ? "no_go" : report.severity === "warn" ? "caution" : "go";
    expect(report.verdict).toBe(expectedVerdict);
  });

  it("ADV: three disjoint inputs all produce well-shaped reports through the handler", async () => {
    const inputs = [
      { description: "Doc update" },
      { description: "Physics constant audit", unitClass: "physics" },
      { description: "Dispatcher action wire-up", unitClass: "wiring" },
    ];
    const responses = await Promise.all(inputs.map(p => invoke(handler, "foresight_report", p)));
    for (const data of responses) {
      expect(data.success).toBe(true);
      const report = data.report as { verdict: string; severity: string; summary: string; sections: Record<string, unknown> };
      expect(["go", "caution", "no_go"]).toContain(report.verdict);
      expect(report.summary).toContain(`verdict=${report.verdict}`);
      // sections hold at least the three required keys
      expect(Object.keys(report.sections)).toEqual(expect.arrayContaining(["risk", "knowledgeGap", "contextBudget"]));
    }
  });
});
