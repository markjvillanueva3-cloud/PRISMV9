/**
 * devDispatcher x dispatcherMiddleware schema-coverage wire
 * (U-DEV-SCHEMA-COVERAGE-WIRE, slot:bravo 2026-06-22).
 *
 * Closes the U-DISPATCHER-SCHEMA-FAILLOUD orphan: getSchemaCoverageStats /
 * resetSchemaCoverageStats were exported from dispatcherMiddleware but had NO MCP
 * consumer (referenced only by their own unit test). This wires two prism_dev actions
 * so the runtime schema-coverage signal is queryable on the MCP surface:
 *   dispatcher_schema_coverage_stats  -- read {validated, passthrough, missingActions}
 *   dispatcher_schema_coverage_reset  -- zero the counters, return the post-reset stats
 *
 * DISTINCT from schema_coverage_audit_* (those statically scan schema FILES; these
 * report LIVE per-process validate-vs-passthrough traffic across every dispatcher that
 * shares the dispatcherMiddleware module singleton).
 *
 * Round-trips THROUGH the registered prism_dev handler (R15: not the singleton). The
 * counter MECHANICS (passthrough/dedupe/invalid-parse) are already covered by
 * dispatcherMiddleware-schema-coverage.test.ts -- this proves REACHABILITY + that the
 * reporter actions are themselves schema-covered (dogfood the gap they measure).
 *
 * Deterministic-count note: the counters are a module singleton, and prism_dev's
 * line-801 validateActionParams runs BEFORE the switch -- so a schema-covered action
 * (these two now are) increments `validated` on its own way in. We reset-then-assert
 * to make the within-module counts exact.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

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
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(async () => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
  // Zero the shared module-singleton counters so each test's counts are exact.
  await call(server, "dispatcher_schema_coverage_reset");
});

describe("devDispatcher x schema-coverage wire (U-DEV-SCHEMA-COVERAGE-WIRE)", () => {
  it("stats after reset returns the exact zeroed-plus-own-validation snapshot", async () => {
    // beforeEach reset -> 0/0/[]. This stats call's pre-switch validateActionParams
    // increments validated to 1 BEFORE the case reads it (proves the action has a real
    // schema). The full object shape + values are pinned here, so the default
    // not_implemented branch (no such fields) cannot satisfy it.
    const r = await call(server, "dispatcher_schema_coverage_stats");
    expect(r.ok).toBe(true);
    // slimResponse (dispatcher tail) strips the empty missingActions:[] but keeps the
    // numeric counts (incl. 0). Absent missingActions == none seen this window.
    expect(r.data).toEqual({ validated: 1, passthrough: 0 });
  });

  it("validated count is monotonic across consecutive schema-covered calls (1 -> 2 -> 3)", async () => {
    const r1 = await call(server, "dispatcher_schema_coverage_stats");
    const r2 = await call(server, "dispatcher_schema_coverage_stats");
    const r3 = await call(server, "dispatcher_schema_coverage_stats");
    expect(r1.data.validated).toBe(1);
    expect(r2.data.validated).toBe(2);
    expect(r3.data.validated).toBe(3);
    // passthrough must stay 0 the whole time: every call here is schema-covered.
    expect(r3.data.passthrough).toBe(0);
  });

  it("reset returns reset:true plus an exactly-zeroed snapshot", async () => {
    const r = await call(server, "dispatcher_schema_coverage_reset");
    expect(r.ok).toBe(true);
    // reset clears AFTER its own validation pass, so the returned snapshot is always 0/0/[].
    expect(r.data).toEqual({ reset: true, validated: 0, passthrough: 0 });
  });

  it("reset actually clears prior accumulation (single stats after reset is 1, not 4)", async () => {
    await call(server, "dispatcher_schema_coverage_stats"); // validated -> 1
    await call(server, "dispatcher_schema_coverage_stats"); // validated -> 2
    await call(server, "dispatcher_schema_coverage_stats"); // validated -> 3
    await call(server, "dispatcher_schema_coverage_reset"); // -> 0
    const after = await call(server, "dispatcher_schema_coverage_stats");
    expect(after.data.validated).toBe(1); // would be 4 if reset did not clear the singleton
  });

  it("reset is idempotent: two resets in a row both return the zeroed snapshot", async () => {
    const first = await call(server, "dispatcher_schema_coverage_reset");
    const second = await call(server, "dispatcher_schema_coverage_reset");
    expect(first.data).toEqual({ reset: true, validated: 0, passthrough: 0 });
    expect(second.data).toEqual({ reset: true, validated: 0, passthrough: 0 });
  });

  it("stats tolerates extraneous params (permissive no-arg schema strips unknowns, still a clean validation)", async () => {
    const r = await call(server, "dispatcher_schema_coverage_stats", { junk: 123, more: "x" });
    expect(r.ok).toBe(true);
    // slimResponse (dispatcher tail) strips the empty missingActions:[] but keeps the
    // numeric counts (incl. 0). Absent missingActions == none seen this window.
    expect(r.data).toEqual({ validated: 1, passthrough: 0 });
  });

  it("an UNHANDLED action hits default not_implemented AND surfaces in the next stats snapshot (non-empty missingActions path)", async () => {
    const bogus = "dispatcher_schema_coverage_BOGUS_not_a_real_action";
    const r = await call(server, bogus);
    // Proves the two real actions are genuinely cased (this one is not): it falls through.
    expect(r.ok).toBe(false);
    expect(r.data.error).toBe("not_implemented");
    expect(r.data.action).toBe(bogus);
    // The bogus action had no schema -> passthrough++ and it joins missingActions. Querying
    // stats now exercises the NON-empty missingActions path (slimResponse keeps non-empty arrays).
    const stats = await call(server, "dispatcher_schema_coverage_stats");
    expect(stats.ok).toBe(true);
    expect(stats.data.validated).toBe(1);    // only the schema-covered stats call counts as validated
    expect(stats.data.passthrough).toBe(1);  // the single bogus passthrough
    expect(stats.data.missingActions).toEqual([bogus]);
  });
});
