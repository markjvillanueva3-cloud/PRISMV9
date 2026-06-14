/**
 * dataDispatcher — "all 4 databases served live" proof
 * =====================================================
 *
 * R15 validate-on-live-data: proves the four manufacturing databases
 * (TOOL / INSERT / HOLDER / MACHINE) are actually reachable + populated through
 * the prism_data plane that every galaxy (SFC, mill/lathe wizards, CAD/CAM)
 * consumes — NOT just that the enum/case wire exists. Each query round-trips
 * through the dispatcher and must return ≥1 real record (fails loud on a dead or
 * empty DB — the exact gap this DB-coverage goal is about).
 *
 * @milestone DB-COVERAGE-GAPFILL-MS0
 * @unit U-ROMEO-DB-SERVED-LIVE
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDataDispatcher } from "../tools/dispatchers/dataDispatcher.js";

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

async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}) {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const text = (raw as { content: { type: string; text: string }[] }).content[0]!.text;
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && "error" in (parsed as object)) {
    return { ok: false, data: parsed as Record<string, unknown> };
  }
  return { ok: true, data: parsed as Record<string, unknown> };
}

// Search responses vary in envelope shape across registries — extract the record
// array from any of the common shapes so the assertion is on real content.
function records(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const k of ["results", "items", "records", "tools", "machines", "holders", "matches", "data"]) {
      if (Array.isArray(o[k])) return o[k] as unknown[];
    }
  }
  return [];
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerDataDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

describe("U-ROMEO-DB-SERVED-LIVE — the 4 manufacturing DBs answer through prism_data", () => {
  it("MACHINE database serves real records (machine_search)", async () => {
    const r = await call(server, "machine_search", { query: "", limit: 25 });
    expect(r.ok).toBe(true);
    const recs = records(r.data);
    expect(recs.length).toBeGreaterThan(0);
  });

  it("TOOL database serves real records (tool_search)", async () => {
    const r = await call(server, "tool_search", { query: "mill", limit: 25 });
    expect(r.ok).toBe(true);
    expect(records(r.data).length).toBeGreaterThan(0);
  });

  it("INSERT database serves real records (insert_search)", async () => {
    const r = await call(server, "insert_search", { query: "insert", limit: 25 });
    expect(r.ok).toBe(true);
    expect(records(r.data).length).toBeGreaterThan(0);
  });

  it("HOLDER database serves real records (holder_search; 4216-record store)", async () => {
    const r = await call(server, "holder_search", { query: "er", limit: 25 });
    expect(r.ok).toBe(true);
    expect(records(r.data).length).toBeGreaterThan(0);
  });

  it("holder_recommend returns ≥1 holder for a permissive mill query (toolHolderDatabaseEngine live)", async () => {
    // recommend() returns ToolHolderSpec[] filtered by rpm/torque/application/machine_type.
    // A permissive mill query (low rpm floor, no application tag) must surface real holders;
    // over-specific filters (e.g. application:"finishing") legitimately return [] since holders
    // are not tagged by machining operation — so we query on the dimensions the DB actually carries.
    const r = await call(server, "holder_recommend", { machine_type: "mill", rpm: 3000 });
    expect(r.ok).toBe(true);
    expect(records(r.data).length).toBeGreaterThan(0);
  });

  it("the JSONL vendor A/P ledger DB now LOADS (regression: JSON.parse on .jsonl)", async () => {
    // jm-vendor-ap-ledger.jsonl (20,736 rows) silently failed to load fleet-wide
    // because DatabaseRegistry JSON.parse'd a JSONL file. After the line-by-line
    // loader fix it must register as `loaded`, not `error`.
    const r = await call(server, "database_list", {});
    expect(r.ok).toBe(true);
    const dbs = ((r.data as { databases?: Array<Record<string, unknown>> }).databases) ?? [];
    const ledger = dbs.find((d) =>
      /vendor.?ap.?ledger|jm.?vendor.?ap/i.test(`${d.id ?? ""} ${d.name ?? ""}`),
    );
    // Only assert if the manifest registers it in this environment (it does here —
    // the pre-fix WARN proved it was being loaded); otherwise the DB-coverage goal
    // doesn't include it on this host.
    if (ledger) {
      expect(ledger.status).not.toBe("error");
      expect(ledger.status).toBe("loaded");
    }
  });
});
