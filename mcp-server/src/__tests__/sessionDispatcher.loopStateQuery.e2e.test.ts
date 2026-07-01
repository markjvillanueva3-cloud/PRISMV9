import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

/**
 * Dispatcher round-trip E2E for prism_session:loop_state_query (U-LOOP-STATE-QUERY, slot:bravo).
 * Captures the prism_session handler by mocking McpServer.tool(), then invokes {action, params}
 * through the REAL switch/case + schema + normalizer (the round-trip the COMPREHENSIVE-BUILD
 * enforcement requires -- not the engine singleton). Hermetic: loop_state_dir overrides the
 * default dir to a temp fixture (mirrors coordination_record's ledger_path).
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

function writeLoop(dir: string, sid: string, o: Record<string, unknown> = {}): void {
  fs.writeFileSync(path.join(dir, `loop-${sid}.json`), JSON.stringify({
    sessionId: sid, task: o.task ?? "t", iter: o.iter ?? 0, target: o.target ?? 10,
    status: o.status ?? "running",
    lastTickAt: new Date((o.lastTickAt as number) ?? 1_800_000_000_000).toISOString(),
  }));
}

describe("prism_session:loop_state_query -- dispatcher round-trip", () => {
  let tmpDir: string;
  let handler: McpHandler;
  let schemaActions: readonly string[];

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "loopq-e2e-"));
    const c = captureHandler();
    handler = c.handler;
    schemaActions = c.schemaActions;
  });
  afterEach(() => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ } });

  it("wiring: loop_state_query appears in the ACTIONS enum", () => {
    expect(schemaActions).toContain("loop_state_query");
  });

  it("returns all loops sorted freshest-first via the dispatcher", async () => {
    writeLoop(tmpDir, "aaa", { lastTickAt: 1_800_000_000_000 - 60000, task: "old" });
    writeLoop(tmpDir, "bbb", { lastTickAt: 1_800_000_000_000 - 1000, task: "fresh" });
    const data = await invoke(handler, "loop_state_query", { loop_state_dir: tmpDir });
    expect(data.success).toBe(true);
    expect(data.count).toBe(2);
    const loops = data.loops as Array<Record<string, unknown>>;
    expect(loops[0].sessionId).toBe("bbb"); // freshest first
    expect(loops[1].sessionId).toBe("aaa");
    expect(loops[0].task).toBe("fresh");
  });

  it("active_only filters to status === running", async () => {
    writeLoop(tmpDir, "run1", { status: "running" });
    writeLoop(tmpDir, "done1", { status: "done" });
    writeLoop(tmpDir, "stale1", { status: "stale" });
    const data = await invoke(handler, "loop_state_query", { loop_state_dir: tmpDir, active_only: true });
    expect(data.count).toBe(1);
    expect((data.loops as Array<Record<string, unknown>>)[0].sessionId).toBe("run1");
  });

  it("fail-soft: missing dir -> count 0 (never throws)", async () => {
    const data = await invoke(handler, "loop_state_query", { loop_state_dir: path.join(tmpDir, "nope") });
    expect(data.success).toBe(true);
    expect(data.count).toBe(0);
    // the dispatcher ok() wrapper slims empty arrays -> loops may be undefined; normalize (count is the load-bearing assert)
    expect((data.loops as unknown[]) ?? []).toEqual([]);
  });

  it("skips corrupt files, keeps valid ones", async () => {
    writeLoop(tmpDir, "ok1", {});
    fs.writeFileSync(path.join(tmpDir, "loop-bad.json"), "{not json");
    const data = await invoke(handler, "loop_state_query", { loop_state_dir: tmpDir });
    expect(data.count).toBe(1);
    expect((data.loops as Array<Record<string, unknown>>)[0].sessionId).toBe("ok1");
  });

  it("carries iter/target/status fields", async () => {
    writeLoop(tmpDir, "ccc", { iter: 3, target: 8, status: "running" });
    const data = await invoke(handler, "loop_state_query", { loop_state_dir: tmpDir });
    const loop = (data.loops as Array<Record<string, unknown>>)[0];
    expect(loop.iter).toBe(3);
    expect(loop.target).toBe(8);
    expect(loop.status).toBe("running");
  });

  it("guards an unparseable lastTickAt -> staleMs null (deterministic sort, not NaN)", async () => {
    writeLoop(tmpDir, "good", { lastTickAt: 1_800_000_000_000 });
    // raw write: valid JSON but a garbage timestamp -> new Date(...).getTime() is NaN
    fs.writeFileSync(path.join(tmpDir, "loop-badts.json"), JSON.stringify({
      sessionId: "badts", task: "t", iter: 0, target: 10, status: "running", lastTickAt: "not-a-date",
    }));
    const data = await invoke(handler, "loop_state_query", { loop_state_dir: tmpDir });
    expect(data.count).toBe(2);
    const bad = (data.loops as Array<Record<string, unknown>>).find((l) => l.sessionId === "badts");
    // guarded -> staleMs null (slim wrapper strips null -> absent, so == null). On revert (no guard)
    // it would be NaN, which the slimmer keeps -> NaN == null is false -> this assertion FAILS.
    expect(bad?.staleMs == null).toBe(true);
  });
});
