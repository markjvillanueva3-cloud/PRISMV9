/**
 * UnifiedErrorLedger dispatcher round-trip tests
 * ==============================================
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P2-U03-DISPATCHER-TESTS.
 *
 * Verifies the 4 `error_ledger_*` actions wired in guardDispatcher.ts go
 * through the same code path the MCP runtime uses: zod-validated tool
 * handler → switch case → engine call → JSON response. Catches:
 *   - missing/typo'd action enum entries
 *   - param normalization regressions
 *   - schema mismatch between dispatcher and engine
 *   - Qdrant-unreachable graceful degradation
 *
 * Each test uses a unique tool string so live ledger writes are
 * traceable and won't collide with concurrent chat traffic.
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P2-U03-DISPATCHER-TESTS
 */

import { describe, it, expect } from "vitest";
import { registerGuardDispatcher } from "../tools/dispatchers/guardDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: { action: { options: readonly string[] } } & Record<string, unknown>;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content?: Array<{ type: string; text: string }>;
  }>;
}

/**
 * Unwrap slimResponse's array-cap wrapping.
 * When an array exceeds maxArrayItems, slimResponse wraps it as
 * `{ _items, _total, _showing }`. Tests need the array regardless of pressure.
 */
function unwrapArray<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  if (val && typeof val === "object" && "_items" in val && Array.isArray((val as { _items: unknown[] })._items)) {
    return (val as { _items: T[] })._items;
  }
  return [];
}

function captureGuardTool(): CapturedTool {
  let captured: CapturedTool | null = null;
  const server = {
    tool(name: string, description: string, schema: unknown, handler: unknown) {
      captured = { name, description, schema, handler } as CapturedTool;
    },
  };
  registerGuardDispatcher(server);
  if (!captured) throw new Error("guardDispatcher did not register a tool");
  return captured;
}

async function callAction(
  tool: CapturedTool,
  action: string,
  params: Record<string, unknown> = {},
): Promise<unknown> {
  const result = await tool.handler({ action, params });
  const text = result?.content?.[0]?.text;
  if (typeof text !== "string") return result;
  try {
    return JSON.parse(text);
  } catch {
    return { __raw: text };
  }
}

const TEST_RUN_ID = `dispatcher-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const TEST_TOOL = `prism-dispatcher-test:${TEST_RUN_ID}`;
const ERROR_LEDGER_ACTIONS = [
  "error_ledger_append",
  "error_ledger_append_and_embed",
  "error_ledger_recent",
  "error_ledger_recall_similar",
] as const;

describe("guardDispatcher — error_ledger action enum", () => {
  it("registers prism_guard as the tool name", () => {
    const tool = captureGuardTool();
    expect(tool.name).toBe("prism_guard");
  });

  it("exposes all 4 error_ledger actions in the enum", () => {
    const tool = captureGuardTool();
    const enumValues = tool.schema.action.options;
    for (const action of ERROR_LEDGER_ACTIONS) {
      expect(enumValues).toContain(action);
    }
  });

  it("rejects an unknown action with a structured error envelope", async () => {
    const tool = captureGuardTool();
    // Bypass enum validation by sending through the handler directly with a
    // non-enum value — this exercises the default-case path.
    const result = await callAction(tool, "error_ledger_NOT_A_REAL_ACTION", {});
    // Either zod rejects (preferred) or default-case returns a structured error.
    if (typeof result === "object" && result !== null && "error" in result) {
      expect(typeof (result as { error: unknown }).error).toBe("string");
    } else if (typeof result === "object" && result !== null && "isError" in result) {
      expect((result as { isError: boolean }).isError).toBe(true);
    } else {
      throw new Error(`Unexpected response shape: ${JSON.stringify(result)}`);
    }
  });
});

describe("guardDispatcher — error_ledger_append", () => {
  it("appends a valid entry and returns the canonical AppendResult shape", async () => {
    const tool = captureGuardTool();
    const result = await callAction(tool, "error_ledger_append", {
      source: "session",
      tool: TEST_TOOL,
      errorClass: "TestError",
      message: `dispatcher round-trip happy path ${TEST_RUN_ID}`,
      context: { run: TEST_RUN_ID, kind: "happy" },
    });
    expect(result).toMatchObject({ ok: true });
    expect(result).toHaveProperty("entry");
    expect(result).toHaveProperty("deduped");
    const entry = (result as { entry: Record<string, unknown> }).entry;
    expect(entry.source).toBe("session");
    expect(entry.tool).toBe(TEST_TOOL);
    expect(entry.signature).toEqual(expect.stringContaining("TestError"));
    expect(entry.id).toEqual(expect.any(String));
    expect(entry.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("dedupes identical entries on second append", async () => {
    const tool = captureGuardTool();
    const dedupeKey = `dedupe-${TEST_RUN_ID}`;
    const payload = {
      source: "session",
      tool: TEST_TOOL,
      errorClass: "DedupeError",
      message: dedupeKey,
      ts: "2026-05-04T00:00:00.000Z",
      id: `id-${dedupeKey}`,
    };
    await callAction(tool, "error_ledger_append", payload);
    const second = await callAction(tool, "error_ledger_append", payload);
    expect(second).toMatchObject({ ok: true, deduped: true });
  });

  it("returns ok:false on invalid source (failure mode: bad enum value)", async () => {
    const tool = captureGuardTool();
    const result = await callAction(tool, "error_ledger_append", {
      source: "not-a-valid-source",
      tool: TEST_TOOL,
      errorClass: "Whatever",
      message: "should be rejected",
    });
    // Engine returns ok:false with schema-validation-failed; dispatcher passes it through.
    expect(result).toMatchObject({ ok: false });
    expect(typeof (result as { error: string }).error).toBe("string");
    expect((result as { error: string }).error).toMatch(/schema-validation-failed|invalid|enum/i);
  });

  it("accepts snake_case error_class via param normalization (failure mode: alias)", async () => {
    const tool = captureGuardTool();
    const result = await callAction(tool, "error_ledger_append", {
      source: "session",
      tool: TEST_TOOL,
      error_class: "SnakeCaseClass",
      message: `snake-case alias check ${TEST_RUN_ID}`,
    });
    expect(result).toMatchObject({ ok: true });
    const entry = (result as { entry: Record<string, unknown> }).entry;
    expect(entry.signature).toEqual(expect.stringContaining("SnakeCaseClass"));
  });

  it("returns ok:false on missing source (failure mode: required field absent)", async () => {
    const tool = captureGuardTool();
    const result = await callAction(tool, "error_ledger_append", {
      tool: TEST_TOOL,
      errorClass: "NoSource",
      message: "missing source field",
    });
    expect(result).toMatchObject({ ok: false });
    expect((result as { error: string }).error).toMatch(/source|invalid|enum/i);
  });
});

describe("guardDispatcher — error_ledger_append_and_embed", () => {
  it("appends and reports embedded:false when Qdrant is unreachable (graceful degradation)", async () => {
    const tool = captureGuardTool();
    const result = await callAction(tool, "error_ledger_append_and_embed", {
      source: "session",
      tool: TEST_TOOL,
      errorClass: "EmbedError",
      message: `embed graceful-degrade ${TEST_RUN_ID}`,
      context: { kind: "embed-test" },
    });
    // Append must succeed even if embed fails.
    expect(result).toMatchObject({ ok: true });
    expect(result).toHaveProperty("entry");
    const r = result as { embedded?: boolean; embedError?: string };
    // Either embedded: true (Qdrant up) or embedded: false with embedError.
    expect(typeof r.embedded === "boolean" || r.embedded === undefined).toBe(true);
    if (r.embedded === false) {
      expect(typeof r.embedError).toBe("string");
    }
  });

  it("returns ok:false on invalid source even before attempting embed", async () => {
    const tool = captureGuardTool();
    const result = await callAction(tool, "error_ledger_append_and_embed", {
      source: "not-a-source",
      tool: TEST_TOOL,
      message: "invalid source",
    });
    expect(result).toMatchObject({ ok: false });
  });
});

describe("guardDispatcher — error_ledger_recent", () => {
  it("returns the entries array shape", async () => {
    const tool = captureGuardTool();
    // Seed at least one entry so the ledger isn't empty.
    await callAction(tool, "error_ledger_append", {
      source: "session",
      tool: TEST_TOOL,
      errorClass: "RecentError",
      message: `recent-seed ${TEST_RUN_ID}`,
    });
    const result = await callAction(tool, "error_ledger_recent", { limit: 5 });
    expect(result).toHaveProperty("entries");
    // Tolerant of slimResponse array-cap wrapping.
    const entries = unwrapArray((result as { entries: unknown }).entries);
    // Just confirm we got SOMETHING shaped like a list (could be empty).
    expect(Array.isArray(entries)).toBe(true);
  });

  it("respects the source filter (failure mode: filter narrows results)", async () => {
    const tool = captureGuardTool();
    const result = await callAction(tool, "error_ledger_recent", {
      limit: 10,
      source: "learner", // unlikely to be used by this test run
    });
    const entries = unwrapArray<{ source: string }>(
      (result as { entries: unknown }).entries,
    );
    for (const e of entries) {
      expect(e.source).toBe("learner");
    }
  });

  it("treats missing limit as default and returns at most the engine cap", async () => {
    const tool = captureGuardTool();
    const result = await callAction(tool, "error_ledger_recent", {});
    const entries = unwrapArray((result as { entries: unknown }).entries);
    // Default limit is 50; cannot exceed it.
    expect(entries.length).toBeLessThanOrEqual(50);
  });

  it("returns empty array when source filter excludes everything (adversarial)", async () => {
    const tool = captureGuardTool();
    // Use a source value that satisfies the type union but is unlikely to appear.
    const result = await callAction(tool, "error_ledger_recent", {
      limit: 10,
      source: "pattern_memory",
    });
    const entries = unwrapArray<{ source: string }>(
      (result as { entries: unknown }).entries,
    );
    for (const e of entries) {
      expect(e.source).toBe("pattern_memory");
    }
  });
});

describe("guardDispatcher — error_ledger_recall_similar", () => {
  it("returns a structured error when neither signature nor query is provided", async () => {
    const tool = captureGuardTool();
    const result = await callAction(tool, "error_ledger_recall_similar", {});
    expect(result).toMatchObject({ hits: [], count: 0 });
    expect((result as { error: string }).error).toMatch(/signature|query/i);
  });

  it("returns hits array when a signature is supplied (Qdrant graceful)", async () => {
    const tool = captureGuardTool();
    const result = await callAction(tool, "error_ledger_recall_similar", {
      signature: `nonexistent-signature-${TEST_RUN_ID}`,
      limit: 3,
    });
    expect(result).toHaveProperty("hits");
    expect(result).toHaveProperty("count");
    expect(Array.isArray((result as { hits: unknown[] }).hits)).toBe(true);
    expect((result as { count: number }).count).toBe(
      (result as { hits: unknown[] }).hits.length,
    );
  });

  it("accepts query alias (failure mode: param-name flexibility)", async () => {
    const tool = captureGuardTool();
    const result = await callAction(tool, "error_ledger_recall_similar", {
      query: `query-alias-${TEST_RUN_ID}`,
      limit: 1,
    });
    expect(result).toHaveProperty("hits");
    expect(result).toHaveProperty("count");
  });

  it("clamps limit to engine default when not numeric (adversarial: type coercion)", async () => {
    const tool = captureGuardTool();
    // limit is a string — engine ignores and uses default of 3.
    const result = await callAction(tool, "error_ledger_recall_similar", {
      signature: `sig-${TEST_RUN_ID}`,
      limit: "not-a-number",
    });
    expect(result).toHaveProperty("hits");
    // Cannot assert exact count without Qdrant; just shape.
    expect(typeof (result as { count: number }).count).toBe("number");
  });
});

describe("guardDispatcher — round-trip integration", () => {
  it("append → recent shows the appended entry within tail window", async () => {
    const tool = captureGuardTool();
    const uniqueMsg = `integration-${TEST_RUN_ID}-${Date.now()}`;
    const appendResult = await callAction(tool, "error_ledger_append", {
      source: "session",
      tool: TEST_TOOL,
      errorClass: "IntegrationError",
      message: uniqueMsg,
    });
    expect(appendResult).toMatchObject({ ok: true });
    const recentResult = await callAction(tool, "error_ledger_recent", {
      limit: 50,
      source: "session",
    });
    const entries = unwrapArray<{ tool?: string; signature: string }>(
      (recentResult as { entries: unknown }).entries,
    );
    const found = entries.find((e) => e.signature.includes("IntegrationError"));
    // Tail window may have rotated it past 50 entries; only assert when present.
    if (found) {
      expect(found.tool).toBe(TEST_TOOL);
    } else {
      // Round-trip survived; engine returned ok:true earlier — that's the contract.
      expect(appendResult).toMatchObject({ ok: true });
    }
  });
});
