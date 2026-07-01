/**
 * devDispatcher × SessionTokenLedgerEngine.mostExpensive wire
 * ([TOKEN-TELEMETRY-WIRE]/U-TOKENLEDGER-MOSTEXP, slot:alpha).
 *
 * SessionTokenLedgerEngine.mostExpensive() (returns the single highest-cost LedgerEntry,
 * or undefined on an empty ledger) was BUILT but UNWIRED — the engine exposed record/
 * summary/project/reset through prism_dev but NOT mostExpensive. This wires
 * `token_ledger_most_expensive` into prism_dev as a zero-arg diagnostic.
 *
 * Round-trip THROUGH the registered dispatcher: every fixture is seeded via the existing
 * `token_ledger_record` action and cleared via `token_ledger_reset`, then read via the new
 * action — so the test exercises the real wiring, not a direct engine import.
 *
 * EMPTY-LEDGER CONTRACT: mostExpensive() returns undefined; the case returns
 * { found:false, entry:null, totalTokens:0 } and slimResponse strips the null `entry`,
 * yielding { found:false, totalTokens:0 } — a stable shape, never a bare undefined.
 *
 * RANKING INTENT (R9): the multi-entry test would FAIL if the reduce picked the first/last
 * entry instead of the max-by-(input+output); the tie test pins the first-max-wins semantics
 * of `e.total > max.total ? e : max`.
 *
 * @milestone TOKEN-TELEMETRY-WIRE
 * @unit U-TOKENLEDGER-MOSTEXP
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, _d: unknown, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as { content?: { type: string; text: string }[] };
  if (!raw.content) return { ok: false, data: raw as unknown as Record<string, unknown> };
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(raw.content[0]!.text); } catch { return { ok: false, data: { rawText: raw.content[0]!.text } }; }
  // An error envelope carries an `error` field; a successful response does not.
  if (parsed.error) return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

interface MaxEntry { tool: string; inputTokens: number; outputTokens: number; timestamp: number; label?: string }

let server: MockMCPServer;
beforeEach(async () => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
  // The ledger is a module-level singleton shared across the lazy import — clear it per test.
  await call(server, "token_ledger_reset");
});

describe("devDispatcher × token_ledger_most_expensive wire (U-TOKENLEDGER-MOSTEXP)", () => {
  it("empty ledger → { found:false, totalTokens:0 } (slimResponse strips the null entry; never bare undefined)", async () => {
    const r = await call(server, "token_ledger_most_expensive");
    expect(r.ok).toBe(true);
    expect(r.data.found).toBe(false);            // false survives slimResponse
    expect(r.data.totalTokens).toBe(0);          // 0 survives slimResponse
    expect(r.data.entry).toBeUndefined();        // null entry is stripped from the envelope
  });

  it("single recorded call → that call is the most expensive (happy path, reference values)", async () => {
    await call(server, "token_ledger_record", { tool: "Read", inputTokens: 1000, outputTokens: 2000, label: "big-read" });
    const r = await call(server, "token_ledger_most_expensive");
    expect(r.ok).toBe(true);
    expect(r.data.found).toBe(true);
    expect(r.data.totalTokens).toBe(3000);       // 1000 + 2000
    const entry = r.data.entry as MaxEntry;
    expect(entry.tool).toBe("Read");
    expect(entry.inputTokens).toBe(1000);
    expect(entry.outputTokens).toBe(2000);
    expect(entry.label).toBe("big-read");
  });

  it("multiple calls → the max-by-(input+output) is selected, NOT first/last (R9 ranking intent)", async () => {
    await call(server, "token_ledger_record", { tool: "Glob", inputTokens: 100, outputTokens: 400 });   // 500  (first)
    await call(server, "token_ledger_record", { tool: "Agent", inputTokens: 3000, outputTokens: 6000 }); // 9000 (max, middle)
    await call(server, "token_ledger_record", { tool: "Grep", inputTokens: 500, outputTokens: 1000 });   // 1500 (last)
    const r = await call(server, "token_ledger_most_expensive");
    expect(r.ok).toBe(true);
    expect(r.data.found).toBe(true);
    expect(r.data.totalTokens).toBe(9000);
    expect((r.data.entry as MaxEntry).tool).toBe("Agent");   // not Glob (first), not Grep (last)
  });

  it("tie on total cost → first-recorded max wins (pins `>` reduce semantics, adversarial)", async () => {
    await call(server, "token_ledger_record", { tool: "FirstMax", inputTokens: 2000, outputTokens: 2000 }); // 4000
    await call(server, "token_ledger_record", { tool: "Small", inputTokens: 10, outputTokens: 10 });        // 20
    await call(server, "token_ledger_record", { tool: "SecondMax", inputTokens: 1500, outputTokens: 2500 });// 4000 (tie)
    const r = await call(server, "token_ledger_most_expensive");
    expect(r.data.totalTokens).toBe(4000);
    // reduce uses `e.total > max.total ? e : max` → strict >, so the EARLIER equal-max is kept.
    expect((r.data.entry as MaxEntry).tool).toBe("FirstMax");
  });

  it("zero-cost entries never displace a real max (adversarial)", async () => {
    await call(server, "token_ledger_record", { tool: "ZeroA", inputTokens: 0, outputTokens: 0 });   // 0
    await call(server, "token_ledger_record", { tool: "Real", inputTokens: 1200, outputTokens: 800 }); // 2000
    await call(server, "token_ledger_record", { tool: "ZeroB", inputTokens: 0, outputTokens: 0 });   // 0
    const r = await call(server, "token_ledger_most_expensive");
    expect(r.data.found).toBe(true);
    expect((r.data.entry as MaxEntry).tool).toBe("Real");
    expect(r.data.totalTokens).toBe(2000);
  });

  it("totalTokens === entry.inputTokens + entry.outputTokens (algebraic invariant)", async () => {
    await call(server, "token_ledger_record", { tool: "Write", inputTokens: 777, outputTokens: 333 });
    const r = await call(server, "token_ledger_most_expensive");
    const entry = r.data.entry as MaxEntry;
    expect(r.data.totalTokens).toBe(entry.inputTokens + entry.outputTokens);
    expect(r.data.totalTokens).toBe(1110);
  });

  it("token_ledger_most_expensive is accepted by the registered dispatcher (in z.enum + has a case)", async () => {
    const r = await call(server, "token_ledger_most_expensive");
    expect(JSON.stringify(r.data).toLowerCase()).not.toMatch(/unknown action|no such action|invalid action/);
  });
});
