import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { schemaMigrationRollbackEngine } from "../engines/SchemaMigrationRollbackEngine.js";

/**
 * True dispatcher-invocation E2E for the 4 schema_* actions on prism_dev.
 * Mocks McpServer.tool() to capture the handler, invokes with real
 * {action, params} so Zod validation + lazy engine import run through
 * production paths.
 *
 * Only the JSON-serializable subset of SchemaMigrationRollbackEngine is
 * exposed as dispatcher actions: snapshot, restore_snapshot, history,
 * migrations_list. registerMigration/migrate/rollback remain library-only
 * because their up/down callables can't cross JSON-RPC.
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

describe("prism_dev schema_* actions — dispatcher round-trip", () => {
  let handler: McpHandler;
  let schemaActions: readonly string[];

  beforeEach(() => {
    schemaMigrationRollbackEngine.reset();
    const captured = captureHandler();
    handler = captured.handler;
    schemaActions = captured.schemaActions;
  });

  it("wiring: all 4 schema_* actions appear in the prism_dev ACTIONS enum", () => {
    expect(schemaActions).toContain("schema_snapshot");
    expect(schemaActions).toContain("schema_restore_snapshot");
    expect(schemaActions).toContain("schema_history");
    expect(schemaActions).toContain("schema_migrations_list");
  });

  it("snapshot → restore round-trips scalar state unchanged", async () => {
    const snap = await invoke(handler, "schema_snapshot", {
      target: "mill_profile",
      data: { rpm: 12_000, feed: 3800 },
      version: 3,
      label: "pre-upgrade",
    });
    expect(snap.success).toBe(true);
    const snapshotId = snap.snapshotId as string;
    expect(snapshotId).toMatch(/^snap-\d+-\d+$/);

    const restore = await invoke(handler, "schema_restore_snapshot", { snapshotId });
    expect(restore.success).toBe(true);
    expect(restore.data).toEqual({ rpm: 12_000, feed: 3800 });
  });

  it("snapshot → restore round-trips nested state unchanged", async () => {
    const deep = {
      fixture: { id: "F-12", clamps: [{ pos: 1, force: 200 }, { pos: 2, force: 220 }] },
      schema: { version: 5, flags: { legacy: false } },
    };
    const snap = await invoke(handler, "schema_snapshot", { target: "fixtures", data: deep, version: 5 });
    const restored = await invoke(handler, "schema_restore_snapshot", { snapshotId: String(snap.snapshotId) });
    expect(restored.data).toEqual(deep);
  });

  it("restored snapshot is a deep copy — mutating original does not affect retrieved data", async () => {
    const original: { x: number[] } = { x: [1, 2, 3] };
    const snap = await invoke(handler, "schema_snapshot", { target: "state", data: original, version: 1 });
    original.x.push(99); // mutate source after snapshot
    const restored = await invoke(handler, "schema_restore_snapshot", { snapshotId: String(snap.snapshotId) });
    expect((restored.data as { x: number[] }).x).toEqual([1, 2, 3]);
  });

  it("history: multiple snapshots on same target produce ordered HistoryEntry list", async () => {
    await invoke(handler, "schema_snapshot", { target: "svc-a", data: { v: 1 }, version: 1, label: "first" });
    await invoke(handler, "schema_snapshot", { target: "svc-a", data: { v: 2 }, version: 2, label: "second" });
    await invoke(handler, "schema_snapshot", { target: "svc-a", data: { v: 3 }, version: 3, label: "third" });

    const hist = await invoke(handler, "schema_history", { target: "svc-a" });
    const history = hist.history as Array<{ version: number; snapshotId: string; label?: string }>;
    expect(history.length).toBe(3);
    expect(history.map(e => e.version)).toEqual([1, 2, 3]);
    expect(history.map(e => e.label)).toEqual(["first", "second", "third"]);
    expect(history.every(e => e.snapshotId.startsWith("snap-"))).toBe(true);
  });

  it("history of unknown target returns empty (slimmed out)", async () => {
    const hist = await invoke(handler, "schema_history", { target: "never-snapshotted" });
    expect(hist.success).toBe(true);
    // slimResponse strips empty arrays
    expect(hist.history ?? []).toEqual([]);
  });

  it("migrations_list strips up/down callables, returns metadata-only array", async () => {
    // Register migrations directly on the singleton (can't go through JSON-RPC)
    schemaMigrationRollbackEngine.registerMigration({ from: 1, to: 2, up: (d) => d, down: (d) => d });
    schemaMigrationRollbackEngine.registerMigration({ from: 2, to: 3, up: (d) => d, down: (d) => d });

    const data = await invoke(handler, "schema_migrations_list");
    const migrations = data.migrations as Array<Record<string, unknown>>;
    expect(migrations.length).toBe(2);
    expect(migrations[0]).toEqual({ from: 1, to: 2 });
    expect(migrations[1]).toEqual({ from: 2, to: 3 });
    // Callables MUST NOT leak through the dispatcher
    expect("up" in migrations[0]).toBe(false);
    expect("down" in migrations[0]).toBe(false);
  });

  it("migrations_list on empty registry returns an empty array (slimResponse strips it)", async () => {
    const data = await invoke(handler, "schema_migrations_list");
    expect(data.success).toBe(true);
    expect((data.migrations as unknown[] | undefined) ?? []).toEqual([]);
  });

  it("FAIL: snapshot rejects missing target", async () => {
    const data = await invoke(handler, "schema_snapshot", { data: { x: 1 }, version: 1 });
    expect(String(data.error ?? "")).toMatch(/Invalid params for schema_snapshot/);
  });

  it("FAIL: snapshot rejects empty target", async () => {
    const data = await invoke(handler, "schema_snapshot", { target: "", data: { x: 1 }, version: 1 });
    expect(String(data.error ?? "")).toMatch(/Invalid params for schema_snapshot/);
  });

  it("FAIL: snapshot rejects non-integer version", async () => {
    const data = await invoke(handler, "schema_snapshot", { target: "svc", data: { x: 1 }, version: 1.5 });
    // Zod number().int() catches this
    expect(String(data.error ?? "")).toMatch(/Invalid params for schema_snapshot/);
  });

  it("FAIL: restore_snapshot with unknown id surfaces engine error through dispatcherError envelope", async () => {
    const data = await invoke(handler, "schema_restore_snapshot", { snapshotId: "snap-does-not-exist" });
    expect(String(data.error ?? "")).toMatch(/unknown snapshot/);
  });

  it("FAIL: restore_snapshot rejects missing snapshotId via schema", async () => {
    const data = await invoke(handler, "schema_restore_snapshot", {});
    expect(String(data.error ?? "")).toMatch(/Invalid params for schema_restore_snapshot/);
  });

  it("FAIL: history rejects empty target via schema", async () => {
    const data = await invoke(handler, "schema_history", { target: "" });
    expect(String(data.error ?? "")).toMatch(/Invalid params for schema_history/);
  });

  it("ADV: history isolation — snapshots on svc-A do not appear under svc-B", async () => {
    await invoke(handler, "schema_snapshot", { target: "svc-A", data: { x: 1 }, version: 1 });
    await invoke(handler, "schema_snapshot", { target: "svc-B", data: { y: 2 }, version: 1 });

    const histA = await invoke(handler, "schema_history", { target: "svc-A" });
    const histB = await invoke(handler, "schema_history", { target: "svc-B" });
    expect((histA.history as unknown[]).length).toBe(1);
    expect((histB.history as unknown[]).length).toBe(1);
    expect((histA.history as Array<{ snapshotId: string }>)[0].snapshotId)
      .not.toBe((histB.history as Array<{ snapshotId: string }>)[0].snapshotId);
  });

  it("ADV: each snapshot gets a unique id even for rapid same-millisecond writes", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 25; i++) {
      const snap = await invoke(handler, "schema_snapshot", {
        target: "svc-rapid", data: { i }, version: 1,
      });
      ids.push(String(snap.snapshotId));
    }
    expect(new Set(ids).size).toBe(25);
  });

  it("ADV: migrations_list preserves ascending order by `from`", async () => {
    // Register out-of-order; engine must sort by `from` ascending
    schemaMigrationRollbackEngine.registerMigration({ from: 3, to: 4, up: d => d, down: d => d });
    schemaMigrationRollbackEngine.registerMigration({ from: 1, to: 2, up: d => d, down: d => d });
    schemaMigrationRollbackEngine.registerMigration({ from: 2, to: 3, up: d => d, down: d => d });

    const data = await invoke(handler, "schema_migrations_list");
    const migrations = data.migrations as Array<{ from: number; to: number }>;
    expect(migrations.map(m => m.from)).toEqual([1, 2, 3]);
  });
});
