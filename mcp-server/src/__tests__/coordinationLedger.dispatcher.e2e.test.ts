import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

/**
 * True dispatcher-invocation E2E — captures the prism_session handler by
 * mocking McpServer.tool(), then invokes the handler with real {action, params}
 * arguments so the switch/case, schema validation, param normalizer, and lazy
 * engine import all execute through the real code path. This is the round-trip
 * assertion required by the COMPREHENSIVE-BUILD enforcement for U-FORE-18-WIRE.
 */

type McpHandler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}>;

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
      // Extract the ACTIONS enum from the zod schema for an independent check
      const action = (schema as { action?: { _def?: { values?: readonly string[]; entries?: Record<string, string> } } }).action;
      if (action?._def?.values) enumValues = action._def.values;
      else if (action?._def?.entries) enumValues = Object.keys(action._def.entries);
    },
  };

  registerSessionDispatcher(server as unknown as Parameters<typeof registerSessionDispatcher>[0]);

  if (!handler) throw new Error("registerSessionDispatcher did not register a handler");
  return { handler, schemaActions: enumValues };
}

async function invoke(
  handler: McpHandler,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ raw: string; data: Record<string, unknown> }> {
  const result = await handler({ action, params });
  // Schema-validation failures return dispatcherError() directly (no content wrapper);
  // successful paths return { content: [{ type, text }] } with JSON payload.
  if (!result || !Array.isArray((result as { content?: unknown[] }).content)) {
    return { raw: JSON.stringify(result), data: result as unknown as Record<string, unknown> };
  }
  const raw = (result as { content: Array<{ text: string }> }).content[0]?.text ?? "";
  return { raw, data: JSON.parse(raw) };
}

// slimResponse strips empty arrays — normalize to [] for assertions on
// conflicts/events fields.
function getArray(data: Record<string, unknown>, key: string): unknown[] {
  const v = data[key];
  return Array.isArray(v) ? v : [];
}

describe("prism_session coordination_* actions — dispatcher round-trip", () => {
  let tmpDir: string;
  let ledgerPath: string;
  let handler: McpHandler;
  let schemaActions: readonly string[];

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "coord-disp-e2e-"));
    ledgerPath = path.join(tmpDir, "ledger.jsonl");
    const captured = captureHandler();
    handler = captured.handler;
    schemaActions = captured.schemaActions;
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it("wiring: all 4 coordination_* actions appear in the ACTIONS enum", () => {
    expect(schemaActions).toContain("coordination_record");
    expect(schemaActions).toContain("coordination_detect_conflicts");
    expect(schemaActions).toContain("coordination_recent");
    expect(schemaActions).toContain("coordination_count");
  });

  it("coordination_record → persists event to the ledger file via the dispatcher", async () => {
    const { data } = await invoke(handler, "coordination_record", {
      agent: "Claude-A",
      kind: "claim",
      target: "src/foo.ts",
      at: 1_000_000,
      ledger_path: ledgerPath,
    });
    expect(data.success).toBe(true);
    expect((data.event as { agent: string }).agent).toBe("Claude-A");
    expect((data.event as { kind: string }).kind).toBe("claim");
    expect((data.event as { target: string }).target).toBe("src/foo.ts");

    // File was actually written
    expect(fs.existsSync(ledgerPath)).toBe(true);
    const firstLine = fs.readFileSync(ledgerPath, "utf8").trim();
    const parsed = JSON.parse(firstLine);
    expect(parsed.agent).toBe("Claude-A");
    expect(parsed.target).toBe("src/foo.ts");
  });

  it("coordination_detect_conflicts → round-trips record + detect through real handler", async () => {
    await invoke(handler, "coordination_record", {
      agent: "Claude-A", kind: "claim", target: "src/contested.ts", at: 1_000_000, ledger_path: ledgerPath,
    });
    await invoke(handler, "coordination_record", {
      agent: "Codex-B", kind: "claim", target: "src/contested.ts", at: 1_000_500, ledger_path: ledgerPath,
    });

    const { data } = await invoke(handler, "coordination_detect_conflicts", {
      window_ms: 30_000,
      ledger_path: ledgerPath,
    });
    expect(data.success).toBe(true);
    const conflicts = getArray(data, "conflicts") as Array<{ target: string; agents: string[] }>;
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].target).toBe("src/contested.ts");
    expect(conflicts[0].agents.sort()).toEqual(["Claude-A", "Codex-B"]);
  });

  it("coordination_recent → filters hydrated events by since/agent/target", async () => {
    await invoke(handler, "coordination_record", { agent: "A", kind: "note",  target: "chat",     at: 1000, ledger_path: ledgerPath });
    await invoke(handler, "coordination_record", { agent: "B", kind: "note",  target: "chat",     at: 2000, ledger_path: ledgerPath });
    await invoke(handler, "coordination_record", { agent: "A", kind: "claim", target: "x.ts",     at: 3000, ledger_path: ledgerPath });

    const sinceOnly = await invoke(handler, "coordination_recent", { since: 2000, ledger_path: ledgerPath });
    expect(getArray(sinceOnly.data, "events").length).toBe(2);

    const byAgent = await invoke(handler, "coordination_recent", { since: 0, agent: "A", ledger_path: ledgerPath });
    const byAgentEvents = getArray(byAgent.data, "events") as Array<{ agent: string }>;
    expect(byAgentEvents.every(e => e.agent === "A")).toBe(true);
    expect(byAgentEvents.length).toBe(2);

    const byTarget = await invoke(handler, "coordination_recent", { since: 0, target: "x.ts", ledger_path: ledgerPath });
    const byTargetEvents = getArray(byTarget.data, "events") as Array<{ target: string }>;
    expect(byTargetEvents.every(e => e.target === "x.ts")).toBe(true);
    expect(byTargetEvents.length).toBe(1);
  });

  it("coordination_count → reflects hydrated event count", async () => {
    const empty = await invoke(handler, "coordination_count", { ledger_path: ledgerPath });
    expect(empty.data.success).toBe(true);
    expect(empty.data.count).toBe(0);

    await invoke(handler, "coordination_record", { agent: "A", kind: "note", target: "x", at: 1000, ledger_path: ledgerPath });
    await invoke(handler, "coordination_record", { agent: "B", kind: "note", target: "y", at: 2000, ledger_path: ledgerPath });

    const filled = await invoke(handler, "coordination_count", { ledger_path: ledgerPath });
    expect(filled.data.count).toBe(2);
  });

  it("FAIL: coordination_record rejects missing agent via schema validation", async () => {
    const { data } = await invoke(handler, "coordination_record", {
      kind: "claim", target: "x.ts", ledger_path: ledgerPath,
    });
    // Zod catches this before reaching the case handler
    expect(data.success).toBe(false);
    expect(String(data.error ?? "")).toMatch(/agent|Invalid params/i);
  });

  it("FAIL: coordination_record rejects unknown kind via schema validation", async () => {
    const { data } = await invoke(handler, "coordination_record", {
      agent: "A", kind: "not_a_real_kind", target: "x.ts", ledger_path: ledgerPath,
    });
    expect(data.success).toBe(false);
    expect(String(data.error ?? "")).toMatch(/kind|Invalid params/i);
  });

  it("FAIL: coordination_detect_conflicts on missing file is a benign empty result", async () => {
    const missing = path.join(tmpDir, "does-not-exist.jsonl");
    const { data } = await invoke(handler, "coordination_detect_conflicts", {
      ledger_path: missing,
    });
    expect(data.success).toBe(true);
    expect(getArray(data, "conflicts").length).toBe(0);
    // slimResponse strips count=0 too
    expect((data.count as number | undefined) ?? 0).toBe(0);
  });

  it("ADV: window_ms narrows conflict detection — events outside window are NOT flagged", async () => {
    await invoke(handler, "coordination_record", {
      agent: "A", kind: "claim", target: "src/narrow.ts", at: 1_000_000, ledger_path: ledgerPath,
    });
    await invoke(handler, "coordination_record", {
      agent: "B", kind: "claim", target: "src/narrow.ts", at: 1_100_000, ledger_path: ledgerPath, // 100s later
    });

    // 30s window — should NOT flag (100s > 30s)
    const narrow = await invoke(handler, "coordination_detect_conflicts", { window_ms: 30_000, ledger_path: ledgerPath });
    expect(getArray(narrow.data, "conflicts").length).toBe(0);

    // 200s window — should flag
    const wide = await invoke(handler, "coordination_detect_conflicts", { window_ms: 200_000, ledger_path: ledgerPath });
    expect(getArray(wide.data, "conflicts").length).toBe(1);
  });

  it("ADV: release between claims clears the conflict (full round-trip)", async () => {
    await invoke(handler, "coordination_record", { agent: "A", kind: "claim",   target: "src/released.ts", at: 1000, ledger_path: ledgerPath });
    await invoke(handler, "coordination_record", { agent: "A", kind: "release", target: "src/released.ts", at: 2000, ledger_path: ledgerPath });
    await invoke(handler, "coordination_record", { agent: "B", kind: "claim",   target: "src/released.ts", at: 3000, ledger_path: ledgerPath });

    const { data } = await invoke(handler, "coordination_detect_conflicts", { window_ms: 30_000, ledger_path: ledgerPath });
    expect(getArray(data, "conflicts").length).toBe(0);
  });

  it("wiring: coordination_count on empty ledger returns count=0 (slimResponse may strip)", async () => {
    // Reusable to prove the slimResponse-vs-zero invariant: if slimmer trims, we treat as 0.
    const { data } = await invoke(handler, "coordination_count", { ledger_path: ledgerPath });
    expect(data.success).toBe(true);
    expect((data.count as number | undefined) ?? 0).toBe(0);
  });
});
