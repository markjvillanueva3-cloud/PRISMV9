/**
 * ModelRouter dispatcher round-trip tests
 * =======================================
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P20-U03.
 *
 * Verifies `prism_ai:model_route` and `prism_ai:model_route_thresholds`
 * actions wired in aiReasoningDispatcher.ts go through the same path the
 * MCP runtime uses: zod-validated tool handler → switch case → engine call →
 * JSON response. Catches:
 *   - missing/typo'd action enum entries
 *   - param normalization regressions
 *   - schema mismatch between dispatcher and engine
 *   - threshold mutation leaking across tests (singleton hygiene)
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P20-U03
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { registerAIReasoningDispatcher } from "../tools/dispatchers/aiReasoningDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: { action: { options: readonly string[] } } & Record<string, unknown>;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content?: Array<{ type: string; text: string }>;
  }>;
}

function captureAITool(): CapturedTool {
  let captured: CapturedTool | null = null;
  const server = {
    tool(name: string, description: string, schema: unknown, handler: unknown) {
      captured = { name, description, schema, handler } as CapturedTool;
    },
  };
  registerAIReasoningDispatcher(server);
  if (!captured) throw new Error("aiReasoningDispatcher did not register a tool");
  return captured;
}

async function callAction(
  tool: CapturedTool,
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const result = await tool.handler({ action, params });
  const text = result?.content?.[0]?.text;
  if (typeof text !== "string") throw new Error("dispatcher did not return text content");
  return JSON.parse(text) as Record<string, unknown>;
}

describe("aiReasoningDispatcher / model_route enum wiring", () => {
  it("registers prism_ai with both model_route actions in the action enum", () => {
    const tool = captureAITool();
    expect(tool.name).toBe("prism_ai");
    expect(tool.schema.action.options).toContain("model_route");
    expect(tool.schema.action.options).toContain("model_route_thresholds");
  });
});

describe("aiReasoningDispatcher / model_route round-trip", () => {
  let tool: CapturedTool;

  beforeEach(() => {
    tool = captureAITool();
  });

  afterEach(async () => {
    // Restore default thresholds after each test — singleton state leaks otherwise
    await callAction(tool, "model_route_thresholds", { op: "reset" });
  });

  it("rejects missing kind", async () => {
    const r = await callAction(tool, "model_route", {});
    expect(r.error).toMatch(/kind/);
  });

  it("rejects unknown kind via engine validation", async () => {
    const r = await callAction(tool, "model_route", { kind: "nonsense" });
    expect(r.error).toMatch(/invalid kind/);
  });

  it("routes embed kind to tier 0 (nomic-embed-text)", async () => {
    const r = await callAction(tool, "model_route", { kind: "embed" });
    expect(r).toEqual({
      tier: 0,
      model: "nomic-embed-text",
      kind: "embed",
      reason: "kind=embed",
      fallback: null,
    });
  });

  it("routes general code task to tier 1 (qwen-7b)", async () => {
    const r = await callAction(tool, "model_route", { kind: "code" });
    expect(r.tier).toBe(1);
    expect(r.model).toBe("qwen2.5-coder:7b");
    expect(r.fallback).toBe("qwen2.5-coder:14b");
  });

  it("routes hasImage=true to tier 4 (vision)", async () => {
    const r = await callAction(tool, "model_route", { kind: "code", hasImage: true });
    expect(r.tier).toBe(4);
    expect(r.model).toBe("llama3.2-vision:11b");
    expect(r.kind).toBe("vision");
  });

  it("escalates safety domain to tier 5 (claude)", async () => {
    const r = await callAction(tool, "model_route", { kind: "reason", domain: "physics" });
    expect(r.tier).toBe(5);
    expect(r.model).toBe("claude");
    expect(r.kind).toBe("escalate");
  });

  it("routes needsChainOfThought=true to tier 3 (deepseek-r1)", async () => {
    const r = await callAction(tool, "model_route", { kind: "reason", needsChainOfThought: true });
    expect(r.tier).toBe(3);
    expect(r.model).toBe("deepseek-r1:14b");
  });

  it("routes promptTokens > 6000 to tier 3 by default", async () => {
    const r = await callAction(tool, "model_route", { kind: "code", promptTokens: 7000 });
    expect(r.tier).toBe(3);
  });

  it("respects forceTier override", async () => {
    const r = await callAction(tool, "model_route", { kind: "code", forceTier: 0 });
    expect(r.tier).toBe(0);
    expect(r.reason).toBe("forceTier=0");
  });

  it("rejects forceTier out of range with engine error message", async () => {
    const r = await callAction(tool, "model_route", { kind: "code", forceTier: 99 });
    expect(r.error).toMatch(/forceTier/);
  });
});

describe("aiReasoningDispatcher / model_route_thresholds round-trip", () => {
  let tool: CapturedTool;

  beforeEach(async () => {
    tool = captureAITool();
    await callAction(tool, "model_route_thresholds", { op: "reset" });
  });

  afterEach(async () => {
    await callAction(tool, "model_route_thresholds", { op: "reset" });
  });

  it("op=get returns default thresholds", async () => {
    const r = await callAction(tool, "model_route_thresholds", { op: "get" });
    expect(r).toEqual({ largeContextTokens: 3000, complexContextTokens: 6000 });
  });

  it("op defaults to get when omitted", async () => {
    const r = await callAction(tool, "model_route_thresholds", {});
    expect(r).toEqual({ largeContextTokens: 3000, complexContextTokens: 6000 });
  });

  it("op=set updates thresholds and returns new state", async () => {
    const r = await callAction(tool, "model_route_thresholds", {
      op: "set",
      largeContextTokens: 1000,
      complexContextTokens: 2000,
    });
    expect(r).toEqual({ largeContextTokens: 1000, complexContextTokens: 2000 });
  });

  it("op=set with invalid pair returns engine error", async () => {
    const r = await callAction(tool, "model_route_thresholds", {
      op: "set",
      largeContextTokens: 5000,
      complexContextTokens: 5000,
    });
    expect(r.error).toMatch(/complexContextTokens must exceed/);
  });

  it("op=reset restores defaults after a custom set", async () => {
    await callAction(tool, "model_route_thresholds", {
      op: "set",
      largeContextTokens: 100,
      complexContextTokens: 200,
    });
    const r = await callAction(tool, "model_route_thresholds", { op: "reset" });
    expect(r).toEqual({ largeContextTokens: 3000, complexContextTokens: 6000 });
  });

  it("op=invalid returns error", async () => {
    const r = await callAction(tool, "model_route_thresholds", { op: "delete" });
    expect(r.error).toMatch(/invalid op/);
  });

  it("set thresholds change subsequent model_route classification", async () => {
    await callAction(tool, "model_route_thresholds", {
      op: "set",
      largeContextTokens: 500,
      complexContextTokens: 1000,
    });
    const below = await callAction(tool, "model_route", { kind: "code", promptTokens: 400 });
    const above = await callAction(tool, "model_route", { kind: "code", promptTokens: 800 });
    const way = await callAction(tool, "model_route", { kind: "code", promptTokens: 2000 });
    expect(below.tier).toBe(1);
    expect(above.tier).toBe(2);
    expect(way.tier).toBe(3);
  });
});
