/**
 * sessionDispatcher — ranked-hybrid wiring round-trip (SIERRA-LEVERAGE/U-N1-RANKED-HYBRID).
 *
 * Verifies `master_index_ranked_hybrid` is wired into prism_session: it is a member of
 * the z.enum(ACTIONS) gate AND round-trips through the dispatcher to a well-formed
 * RankedHybridResult envelope.
 *
 * Closes the documented MockMCPServer false-green: a mock that ignores the schema lets a
 * missing-from-enum action pass. This harness CAPTURES the schema the dispatcher registers
 * and applies `schema.action.parse(action)` — the same z.enum gate production runs — so an
 * action that is NOT in ACTIONS genuinely throws.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

interface CapturedTool {
  schema: { action: { parse: (a: string) => string } };
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class GatedMockServer {
  tools: CapturedTool[] = [];
  tool(_n: string, _d: string, schema: CapturedTool["schema"], handler: CapturedTool["handler"]) {
    this.tools.push({ schema, handler });
  }
}

interface DispatchResult { ok: boolean; data: Record<string, unknown> }

async function call(server: GatedMockServer, action: string, params: Record<string, unknown> = {}): Promise<DispatchResult> {
  const tool = server.tools[0]!;
  // Faithful production enum gate — throws for an action not in z.enum(ACTIONS).
  tool.schema.action.parse(action);
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const parsed = JSON.parse((raw as { content: { text: string }[] }).content[0]!.text) as Record<string, unknown>;
  if ("error" in parsed) return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

let server: GatedMockServer;
beforeEach(() => {
  server = new GatedMockServer();
  registerSessionDispatcher(server as unknown as Parameters<typeof registerSessionDispatcher>[0]);
});

describe("U-N1-RANKED-HYBRID / master_index_ranked_hybrid wiring", () => {
  it("is a member of the z.enum(ACTIONS) gate (not a false-green bypass)", () => {
    expect(() => server.tools[0]!.schema.action.parse("master_index_ranked_hybrid")).not.toThrow();
    // a near-miss action string must be REJECTED by the same gate — proves the gate is live
    expect(() => server.tools[0]!.schema.action.parse("master_index_ranked_hybrid_NOPE")).toThrow();
  });

  // Wiring proof goes through the empty-query SHORT-CIRCUIT path on purpose: a non-empty
  // query makes the live MasterIndexEngine build its index from the 576MB graph, which is
  // far too heavy for the test env (times out / OOMs — the fleet-search-substrate weight).
  // The populated fusion behaviour is exhaustively covered by the engine unit test with
  // injected hits (RankedHybridGraphSearchEngine.test.ts). Here we only need to prove the
  // enum→case→engine→envelope wiring + the result SHAPE, which the empty path establishes.
  it("round-trips enum→case→engine→envelope to a well-formed RankedHybridResult (empty-query path)", async () => {
    const r = await call(server, "master_index_ranked_hybrid", { query: "   ", rrf_k: 60 });
    expect(r.ok).toBe(true);
    // ok(data) serializes `data` directly (NOT wrapped in `.result`), so r.data IS the
    // RankedHybridResult. (slimResponse may trim verbose fields but keeps these.)
    const res = r.data as { query: string; totalHits: number; hits?: unknown[]; rrfK: number; warnings: string[]; generatedAt: string };
    expect(typeof res.query).toBe("string");
    expect(res.totalHits).toBe(0);
    expect(Array.isArray(res.hits ?? [])).toBe(true);
    expect(res.rrfK).toBe(60); // the rrf_k param threaded through the case → engine
    expect(Array.isArray(res.warnings)).toBe(true);
    expect(res.warnings).toContain("empty query");
    expect(typeof res.generatedAt).toBe("string");
  });
});
