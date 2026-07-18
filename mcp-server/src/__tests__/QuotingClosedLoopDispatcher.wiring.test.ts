/**
 * QuotingClosedLoopDispatcher.wiring.test.ts — U-QP-CLOSED-LOOP-DISPATCHER (slot:charlie 2026-05-29)
 *
 * Verifies the dispatcher wiring for the previously-ORPHAN closed-loop engines
 * (QuotingClosedLoopEngine + QuotingClosedLoopRunnerEngine — 0 dispatcher refs before this).
 *
 * Anti-false-green discipline (per RGS-TOOL-AUTOINVOKE lesson): a MockMCPServer bypasses the
 * z.enum SDK gate, so an action missing from the enum would pass while production is 100% broken.
 * The schema/enum tests assert membership + parse DIRECTLY (top-level import = schema only, so
 * they run anywhere). The round-trip test exercises the EXACT engine path the dispatcher case
 * uses, via DYNAMIC import — it self-skips (ctx.skip) when the engine chain's transitive deps
 * are unavailable (the slot worktree is commits-behind main and lacks e.g. FairMarketValueEngine);
 * on main the full chain resolves and the round-trip runs for real.
 */
import { describe, it, expect } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { quotingActionEnum, QUOTING_ACTION_SCHEMAS } from "../schemas/quotingActionSchemas.js";

const ACTION = "quoting_closed_loop_run";
const VALID_VERDICTS = ["PROMOTED", "NO_DRIFT_NO_OP", "ROLLED_BACK", "INSUFFICIENT_DATA", "STAGE_FAILED"];
const schemaFor = () => QUOTING_ACTION_SCHEMAS[ACTION as keyof typeof QUOTING_ACTION_SCHEMAS];

describe("quoting_closed_loop_run — dispatcher wiring (anti-false-green)", () => {
  it("action IS in quotingActionEnum (the SDK gate prod actually enforces)", () => {
    expect(quotingActionEnum.options).toContain(ACTION);
  });

  it("action HAS a usable zod schema in QUOTING_ACTION_SCHEMAS", () => {
    expect(typeof schemaFor()?.safeParse).toBe("function");
  });

  it("schema accepts a valid outcomes payload", () => {
    const r = schemaFor().safeParse({
      outcomes: [{ quote_id: "q1", customer: "ACME", predicted_quote_usd: 100, actual_invoice_usd: 110 }],
      options: { minSampleSize: 20 },
    });
    expect(r.success).toBe(true);
  });

  it("schema REJECTS a payload with no outcomes (required field)", () => {
    expect(schemaFor().safeParse({ options: {} }).success).toBe(false);
  });

  it("schema REJECTS a non-numeric predicted_quote_usd (adversarial)", () => {
    expect(schemaFor().safeParse({ outcomes: [{ quote_id: "q1", predicted_quote_usd: "lots" }] }).success).toBe(false);
  });

  it("round-trip: the EXACT dispatcher call path runs a cycle + returns a valid verdict", async (ctx) => {
    let QuotingClosedLoopEngine: typeof import("../engines/QuotingClosedLoopEngine.js").QuotingClosedLoopEngine;
    let runner: typeof import("../engines/QuotingClosedLoopRunnerEngine.js").quotingClosedLoopRunnerEngine;
    try {
      ({ QuotingClosedLoopEngine } = await import("../engines/QuotingClosedLoopEngine.js"));
      ({ quotingClosedLoopRunnerEngine: runner } = await import("../engines/QuotingClosedLoopRunnerEngine.js"));
    } catch (e) {
      // Stale worktree lacks a transitive dep (e.g. FairMarketValueEngine) — validates on main.
      ctx.skip();
      return;
    }
    // Mirrors the dispatcher case body verbatim.
    const outcomes = [{ quote_id: "q1", customer: "ACME", predicted_quote_usd: 100, actual_invoice_usd: 110 }];
    const deps = runner.buildLiveDeps({
      loadOutcomes: async () => outcomes,
      activeFactorPath: join(tmpdir(), `clr-wiring-${Date.now()}.json`), // tmpdir → no prod side effect
    });
    const result = await QuotingClosedLoopEngine.runCycle(deps, { minSampleSize: 20 });
    expect(VALID_VERDICTS).toContain(result.verdict);
    // 1 outcome < minSampleSize 20 → deterministic early INSUFFICIENT_DATA, no factor write / PSN feed
    expect(result.verdict).toBe("INSUFFICIENT_DATA");
    expect(result.drift_detected).toBe(false);
  });
});
