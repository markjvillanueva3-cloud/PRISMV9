/**
 * ORPHAN-RESCUE — prism_dev:stop_condition_* dispatcher wiring tests
 *
 * Round-trips StopConditionEngine through the `prism_dev` MCP tool's handler.
 * Uses a fake MCP server that captures the registered handler closure so the
 * full chain (z.enum gate → validateActionParams → switch case → engine →
 * slimResponse) is exercised without standing up a transport — same pattern
 * as devDispatcher.wiringPotential.test.ts / devDispatcher.modelTelemetry.test.ts.
 *
 * Every assertion uses concrete expected values derived from the engine's
 * documented rule thresholds (95%/85% budget, recentFiles membership, etc.).
 * Also asserts source-level presence of the enum entries + switch cases +
 * schema-map registration so a half-wire (enum without case, or vice versa)
 * fails loudly.
 *
 * @milestone OBSIDIAN-PRISM-OS-MS0 / orphan-rescue (StopConditionEngine)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

type RegisteredTool = {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }> }>;
};

function makeFakeServer(): { server: { tool: (...args: unknown[]) => void }; tools: RegisteredTool[] } {
  const tools: RegisteredTool[] = [];
  const server = {
    tool: (...args: unknown[]) => {
      tools.push({
        name: args[0] as string,
        description: args[1] as string,
        schema: args[2] as Record<string, unknown>,
        handler: args[3] as RegisteredTool["handler"],
      });
    },
  };
  return { server, tools };
}

async function buildPrismDevHandler(): Promise<RegisteredTool["handler"]> {
  const { server, tools } = makeFakeServer();
  const { registerDevDispatcher } = await import("../tools/dispatchers/devDispatcher.js");
  registerDevDispatcher(server as never);
  const dev = tools.find((t) => t.name === "prism_dev");
  if (!dev) throw new Error("registerDevDispatcher did not register a tool named 'prism_dev'");
  return dev.handler;
}

function parsePayload(response: { content: Array<{ type: string; text: string }> }): Record<string, unknown> {
  const text = response.content?.[0]?.text ?? "";
  return JSON.parse(text);
}

const ACTIONS = [
  "stop_condition_evaluate",
  "stop_condition_should_block",
  "stop_condition_evaluate_all",
  "stop_condition_rules",
] as const;

// ── source-level presence: enum + case + schema-map all wired ────────────

describe("prism_dev:stop_condition_* — source wiring", () => {
  const dispatcherSrc = readFileSync(
    new URL("../tools/dispatchers/devDispatcher.ts", import.meta.url),
    "utf-8",
  );
  const schemaSrc = readFileSync(
    new URL("../schemas/devActionSchemas.ts", import.meta.url),
    "utf-8",
  );

  for (const action of ACTIONS) {
    it(`'${action}' appears in the ACTIONS enum`, () => {
      expect(dispatcherSrc).toContain(`"${action}"`);
    });
    it(`'${action}' has a switch case`, () => {
      expect(dispatcherSrc).toContain(`case "${action}":`);
    });
    it(`'${action}' is registered in ACTION_DEV_SCHEMAS`, () => {
      expect(schemaSrc).toContain(`${action}:`);
    });
  }

  it("the dispatcher lazy-imports StopConditionEngine inside the case bodies", () => {
    expect(dispatcherSrc).toContain('await import("../../engines/StopConditionEngine.js")');
  });

  it("the buildStopCtx helper is defined", () => {
    expect(dispatcherSrc).toContain("function buildStopCtx(");
  });
});

// ── stop_condition_rules ─────────────────────────────────────────────────

describe("prism_dev:stop_condition_rules", () => {
  it("returns exactly the 6 known rule names", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({ action: "stop_condition_rules" });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    expect(body.ruleCount).toBe(6);
    expect(body.rules).toEqual([
      "budget-critical",
      "redundant-read",
      "redundant-grep",
      "large-unbounded-read",
      "high-frequency-calls",
      "wasteful-tools",
    ]);
  });
});

// ── stop_condition_evaluate ──────────────────────────────────────────────

describe("prism_dev:stop_condition_evaluate", () => {
  it("returns decision 'allow' for a fresh Read under a quiet budget", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "stop_condition_evaluate",
      params: {
        tool: "Read",
        params: { file_path: "/src/engines/Fresh.ts" },
        ctx: { totalTokensUsed: 1000, maxBudget: 200000, recentFiles: [], recentGreps: [], toolCallCount: 5, sessionAgeMinutes: 30 },
      },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    const evaluation = body.evaluation as { decision: string; reason: string; saving: number };
    expect(evaluation.decision).toBe("allow");
    expect(evaluation.reason).toBe("No stop conditions triggered");
  });

  it("blocks when the budget is at 98% — reason carries the rounded pct", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "stop_condition_evaluate",
      params: {
        tool: "Bash",
        params: {},
        ctx: { totalTokensUsed: 196000, maxBudget: 200000 },
      },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    const evaluation = body.evaluation as { decision: string; reason: string; saving: number };
    expect(evaluation.decision).toBe("block");
    expect(evaluation.reason).toContain("98%");
    expect(evaluation.saving).toBe(2000);
  });

  it("blocks a redundant Read of a file already in recentFiles", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "stop_condition_evaluate",
      params: {
        tool: "Read",
        params: { file_path: "/src/engines/Already.ts" },
        ctx: { totalTokensUsed: 1000, maxBudget: 200000, recentFiles: ["/src/engines/Already.ts"] },
      },
    });
    const body = parsePayload(r);
    const evaluation = body.evaluation as { decision: string; reason: string };
    expect(evaluation.decision).toBe("block");
    expect(evaluation.reason).toContain("Already.ts");
  });

  it("nested tool params survive un-normalized — snake_case file_path reaches the redundant-read rule", async () => {
    // normalizeParams runs on the dispatcher's top-level params only; the nested
    // `params` object passed to the engine keeps its raw Read/Grep key names.
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "stop_condition_evaluate",
      params: {
        tool: "Read",
        params: { file_path: "/src/big/index.ts" }, // raw snake_case Read param
        ctx: { totalTokensUsed: 1000, maxBudget: 200000 },
      },
    });
    const body = parsePayload(r);
    const evaluation = body.evaluation as { decision: string; saving: number };
    // large-unbounded-read fires because file_path was read intact (ends with index.ts, no limit)
    expect(evaluation.decision).toBe("warn");
    expect(evaluation.saving).toBe(3000);
  });

  it("accepts snake_case ctx keys via the buildStopCtx fallback", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "stop_condition_evaluate",
      params: {
        tool: "Bash",
        params: {},
        ctx: { total_tokens_used: 196000, max_budget: 200000 }, // snake_case
      },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    const evaluation = body.evaluation as { decision: string };
    expect(evaluation.decision).toBe("block");
  });

  it("defaults maxBudget to 200000 when ctx is omitted entirely — no divide-by-zero, decision 'allow'", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "stop_condition_evaluate",
      params: { tool: "Bash", params: {} },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    const evaluation = body.evaluation as { decision: string };
    expect(evaluation.decision).toBe("allow");
    // the echoed ctx reflects the coerced default
    const ctx = body.ctx as { maxBudget: number };
    expect(ctx.maxBudget).toBe(200000);
  });

  it("Zod gate rejects a camelCase maxBudget of 0 (.positive() — a 0 budget is invalid input)", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "stop_condition_evaluate",
      params: {
        tool: "Bash",
        params: {},
        ctx: { totalTokensUsed: 50000, maxBudget: 0 },
      },
    });
    const body = parsePayload(r);
    // .positive() on _scContextState.maxBudget catches the bad budget at the gate,
    // before buildStopCtx is reached.
    expect(body.error).toBe("Invalid params for stop_condition_evaluate");
  });

  it("buildStopCtx coerces a snake_case max_budget of 0 to the 200000 default (guards the budget-rule division)", async () => {
    // snake_case `max_budget` is an unknown key under _scContextState's .passthrough()
    // — .positive() never applies to it, so it slips past the gate and buildStopCtx's
    // `Number(...) || 200000` fallback is what guards the engine's totalTokensUsed/maxBudget division.
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "stop_condition_evaluate",
      params: {
        tool: "Bash",
        params: {},
        ctx: { total_tokens_used: 50000, max_budget: 0 },
      },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    const ctx = body.ctx as { maxBudget: number };
    expect(ctx.maxBudget).toBe(200000);
    // 50000/200000 = 25% → well under the 85% warn floor
    const evaluation = body.evaluation as { decision: string };
    expect(evaluation.decision).toBe("allow");
  });

  it("Zod gate rejects a missing 'tool' — returns 'Invalid params for stop_condition_evaluate'", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "stop_condition_evaluate",
      params: { params: {}, ctx: { totalTokensUsed: 1, maxBudget: 100 } },
    });
    const body = parsePayload(r);
    expect(body.error).toBe("Invalid params for stop_condition_evaluate");
  });
});

// ── stop_condition_should_block ──────────────────────────────────────────

describe("prism_dev:stop_condition_should_block", () => {
  it("returns blocked=true when a block-level rule fires", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "stop_condition_should_block",
      params: {
        tool: "Bash",
        params: {},
        ctx: { totalTokensUsed: 196000, maxBudget: 200000 },
      },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    expect(body.blocked).toBe(true);
    const evaluation = body.evaluation as { decision: string };
    expect(evaluation.decision).toBe("block");
  });

  it("returns blocked=false when only a warn-level rule fires", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "stop_condition_should_block",
      params: {
        tool: "Read",
        params: { file_path: "/src/index.ts" }, // large-unbounded-read → warn
        ctx: { totalTokensUsed: 1000, maxBudget: 200000 },
      },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    expect(body.blocked).toBe(false);
    const evaluation = body.evaluation as { decision: string };
    expect(evaluation.decision).toBe("warn");
  });

  it("returns blocked=false when nothing triggers", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "stop_condition_should_block",
      params: {
        tool: "Read",
        params: { file_path: "/src/fresh.ts" },
        ctx: { totalTokensUsed: 1000, maxBudget: 200000 },
      },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    expect(body.blocked).toBe(false);
  });
});

// ── stop_condition_evaluate_all ──────────────────────────────────────────

describe("prism_dev:stop_condition_evaluate_all", () => {
  it("returns every triggered rule with triggeredCount + totalSavings", async () => {
    const handler = await buildPrismDevHandler();
    // budget block (saving 2000) + wasteful-tools warn (short Agent prompt, saving 1000)
    const r = await handler({
      action: "stop_condition_evaluate_all",
      params: {
        tool: "Agent",
        params: { prompt: "do it" },
        ctx: { totalTokensUsed: 196000, maxBudget: 200000 },
      },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    expect(body.triggeredCount).toBe(2);
    expect(body.totalSavings).toBe(3000);
    const evaluations = body.evaluations as Array<{ decision: string }>;
    expect(evaluations.map((e) => e.decision).sort()).toEqual(["block", "warn"]);
  });

  it("reports triggeredCount 0 and totalSavings 0 when no rule fires", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "stop_condition_evaluate_all",
      params: {
        tool: "Read",
        params: { file_path: "/src/fresh.ts" },
        ctx: { totalTokensUsed: 1000, maxBudget: 200000 },
      },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    // slimResponse (responseSlimmer.ts:23-24) strips only null/undefined and
    // empty arrays — numeric 0 survives. So triggeredCount/totalSavings come
    // through as real 0s; these two assertions intentionally pin that contract.
    expect(body.triggeredCount).toBe(0);
    expect(body.totalSavings).toBe(0);
    // ...while the empty `evaluations: []` array IS stripped off the wire.
    const evaluations = (body.evaluations as unknown[] | undefined) ?? [];
    expect(evaluations.length).toBe(0);
  });
});
