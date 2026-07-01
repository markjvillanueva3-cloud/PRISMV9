/**
 * devDispatcher × ShopOutcomeIngestProcessorEngine wire
 * (BLACKWELL-DB-GEN-MS0 / U-WIRE-SHOP-OUTCOME-INGEST, slot:romeo).
 *
 * ShopOutcomeIngestProcessorEngine was BUILT + tested but UNWIRED — zero dispatcher
 * refs, zero consumers anywhere in src (re-verified by grep this session). It is the
 * HEAD of the self-improving data pipeline: it reads a JSONL outcome ledger, ingests
 * each row through the PSN loop, and GENERATES the outcome DB by appending one
 * LoopIngestResult per processed row. This wires `shop_outcome_ingest` into prism_dev.
 *
 * Test strategy (RGS-TOOL-AUTOINVOKE-MS0 core lesson — "hermetic fakes do not prove
 * production wiring; ship one real-data E2E"):
 *   • The wire is exercised end-to-end through the REGISTERED dispatcher (not a direct
 *     engine import): MockMCPServer → handler({action,params}) → real fs read of a real
 *     temp JSONL fixture → engine → parseLedgerLine.
 *   • ANTI-STUB: the deterministic scan/meta/reject counts come ONLY from the real
 *     disk-parse of the fixture — a no-op case returning {rows_scanned:0,...} passes
 *     every type/shape assertion but FAILS the exact-count assertions.
 *   • DB-GENERATION proof: with sink_path set, the dispatcher must WRITE the outcome DB;
 *     the file's line count must equal rows_processed.
 *   • Param-validation + enum-acceptance + error paths covered.
 *
 * @milestone BLACKWELL-DB-GEN-MS0
 * @unit U-WIRE-SHOP-OUTCOME-INGEST
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

// mcp-server root (this test lives in mcp-server/src/__tests__). Fixtures stay inside the
// action's confinement roots (repoRoot for reads, MCP_ROOT for writes) so the wire's
// path-traversal guard (which mirrors case "file_write") does not reject them.
const MCP_ROOT_TEST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATE_DIR_TEST = path.join(MCP_ROOT_TEST, "data", "state");

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

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  const envelope = raw as { content?: { type: string; text: string }[] };
  if (!envelope.content) return { ok: false, data: raw as unknown as Record<string, unknown> };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && "error" in parsed && !("rows_scanned" in parsed)) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

// A real fixture written to a real temp file, parsed off real disk through the wire.
// 2 valid rows (one custom shop_id, one default jm-die) + 2 rejections (missing category,
// non-JSON) + 1 __meta skip + 1 blank line (not scanned).
const FIXTURE_LINES = [
  JSON.stringify({ __meta: true, source: "test" }),
  JSON.stringify({ observed_at: "2026-06-04T10:00:00Z", category: "cycle_time", domain: "mill", estimated: 10, actual: 11, unit: "min", shop_id: "acme-test" }),
  JSON.stringify({ observed_at: "2026-06-04T10:05:00Z", category: "tool_life", domain: "mill", estimated: 60, actual: 58, unit: "min" }), // no shop_id → jm-die
  JSON.stringify({ observed_at: "2026-06-04T10:10:00Z", domain: "mill", estimated: 5, actual: 5, unit: "min" }), // missing category → reject
  "this is not json at all", // reject
  "", // blank → not scanned
];

let server: MockMCPServer;
let fixturePath: string;
let sinkPath: string;

beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
  fixturePath = path.join(STATE_DIR_TEST, `__test-shop-outcome-fixture-${process.pid}.jsonl`);
  sinkPath = path.join(STATE_DIR_TEST, `__test-shop-outcome-sink-${process.pid}.jsonl`);
  fs.mkdirSync(STATE_DIR_TEST, { recursive: true });
  fs.writeFileSync(fixturePath, FIXTURE_LINES.join("\n"), "utf8");
  if (fs.existsSync(sinkPath)) fs.unlinkSync(sinkPath);
});

afterEach(() => {
  for (const p of [fixturePath, sinkPath]) { try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch { /* ignore */ } }
});

describe("devDispatcher × ShopOutcomeIngestProcessor wire (U-WIRE-SHOP-OUTCOME-INGEST)", () => {
  it("shop_outcome_ingest — REAL disk parse round-trips ProcessLedgerStats with exact counts", async () => {
    const r = await call(server, "shop_outcome_ingest", { input_path: fixturePath });
    expect(r.ok).toBe(true);
    // ProcessLedgerStats contract.
    expect(typeof r.data.rows_scanned).toBe("number");
    expect(typeof r.data.rows_processed).toBe("number");
    expect(typeof r.data.rows_rejected).toBe("number");
    // ANTI-STUB: these counts come ONLY from the real disk-parse of the fixture.
    expect(r.data.rows_scanned).toBe(5);        // 2 valid + 2 bad + 1 meta (blank not scanned)
    expect(r.data.rows_meta_skipped).toBe(1);   // the __meta row
    expect(r.data.rows_rejected as number).toBeGreaterThanOrEqual(2); // missing-category + non-JSON
    // Invariant: every non-meta scanned row is either processed or rejected, never lost.
    expect((r.data.rows_processed as number) + (r.data.rows_rejected as number)).toBe(4);
    // The 2 well-formed rows must actually ingest through the real PSN loop (the wire's payoff).
    expect(r.data.rows_processed).toBe(2);
    // Default-shop attribution (CLAUDE.md TEST SHOP): the row without shop_id → jm-die.
    const byShop = (r.data.by_shop ?? {}) as Record<string, number>;
    expect(byShop["acme-test"]).toBe(1);
    expect(byShop["jm-die"]).toBe(1);
  }, 30_000);

  it("shop_outcome_ingest — GENERATES the outcome DB at sink_path (one line per processed row)", async () => {
    const r = await call(server, "shop_outcome_ingest", { input_path: fixturePath, sink_path: sinkPath });
    expect(r.ok).toBe(true);
    expect(r.data.rows_processed).toBe(2);
    // DB-GENERATION proof: the sink file exists and holds exactly rows_processed JSONL lines.
    expect(fs.existsSync(sinkPath)).toBe(true);
    const lines = fs.readFileSync(sinkPath, "utf8").split("\n").filter((l) => l.trim().length > 0);
    expect(lines.length).toBe(2);
    // Each emitted line is a real JSON LoopIngestResult (not a stub string).
    for (const line of lines) {
      const obj = JSON.parse(line);
      expect(obj).toHaveProperty("loop_outcome");
    }
  }, 30_000);

  it("shop_outcome_ingest — missing input_path is rejected (schema + case guard)", async () => {
    const r = await call(server, "shop_outcome_ingest", {});
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data).toLowerCase()).toMatch(/input.?path|invalid params|required/);
  });

  it("shop_outcome_ingest — unreadable (in-repo) input path fails loud, never throws", async () => {
    // In-repo path → passes the confinement guard, but the file does not exist → the engine
    // returns a structured input_unreadable rejection (NOT a throw, NOT a confinement reject).
    const r = await call(server, "shop_outcome_ingest", { input_path: path.join(STATE_DIR_TEST, `__does-not-exist-${process.pid}.jsonl`) });
    expect(r.ok).toBe(true);
    expect(r.data.rows_processed).toBe(0);
    expect((r.data.rejections as unknown[]).length).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it("shop_outcome_ingest action is accepted by the registered dispatcher (in z.enum + has a case)", async () => {
    const r = await call(server, "shop_outcome_ingest", { input_path: fixturePath });
    expect(JSON.stringify(r.data).toLowerCase()).not.toMatch(/unknown action|no such action/);
  }, 30_000);

  it("shop_outcome_ingest — rejects a sink_path that escapes MCP_ROOT (path-traversal guard)", async () => {
    const r = await call(server, "shop_outcome_ingest", {
      input_path: fixturePath,
      sink_path: "../../../../../../../tmp/prism-escape-attempt.jsonl",
    });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data).toLowerCase()).toMatch(/escapes|denied/);
    // The escape target must NOT have been created.
    expect(fs.existsSync(path.resolve(MCP_ROOT_TEST, "../../../../../../../tmp/prism-escape-attempt.jsonl"))).toBe(false);
  });

  it("shop_outcome_ingest — rejects an input_path that escapes the repo root", async () => {
    const r = await call(server, "shop_outcome_ingest", { input_path: "../../../../../../../etc/passwd" });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data).toLowerCase()).toMatch(/escapes|denied/);
  });
});
