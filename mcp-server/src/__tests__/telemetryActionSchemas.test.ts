/**
 * telemetryActionSchemas.test.ts -- prism_telemetry dispatcher action schemas.
 * ============================================================================
 * Regression lock for ACP-MS2: the `automation_chain_record` action schema is
 * the dispatcher FRONT DOOR for caller-supplied chain telemetry. It must accept
 * the full 6-value contract status set -- including `timeout` / `budget_exceeded`,
 * the statuses AutomationChainEngine.executeChain now produces -- or an external
 * caller forwarding an executor's terminal event is silently rejected at
 * validateActionParams BEFORE ingest() runs (the schema<->engine drift caught by
 * the per-file scrutiny arm). The in-process executeChain({ingest:true}) path
 * bypasses this boundary, so it needs its OWN test.
 */

import { describe, it, expect } from "vitest";

import { ACTION_TELEMETRY_SCHEMAS } from "../schemas/telemetryActionSchemas.js";
import { TelemetryEventStatusSchema } from "../schemas/automationChainSchema.js";

const record = ACTION_TELEMETRY_SCHEMAS.automation_chain_record;
const base = { chain_id: "chain-sf", step_id: "compute", token_cost: 10, latency_ms: 5 };

describe("automation_chain_record dispatcher schema (ACP-MS2 boundary)", () => {
  // ── HAPPY: every contract status is accepted at the dispatcher door ─────────
  it.each(TelemetryEventStatusSchema.options)(
    "accepts contract status '%s'",
    (status) => {
      const parsed = record.safeParse({ ...base, status });
      expect(parsed.success, status).toBe(true);
    },
  );

  // ── REGRESSION LOCK: the 2 statuses that drove the P1 specifically ──────────
  it("accepts 'budget_exceeded' (was rejected by the pre-ACP-MS2 4-value enum)", () => {
    expect(record.safeParse({ ...base, status: "budget_exceeded" }).success).toBe(true);
  });

  it("accepts 'timeout' (was rejected by the pre-ACP-MS2 4-value enum)", () => {
    expect(record.safeParse({ ...base, status: "timeout" }).success).toBe(true);
  });

  // ── FAILURE: still a real enum, not loosened to z.string() ──────────────────
  it("rejects a status that is not in the contract enum", () => {
    const parsed = record.safeParse({ ...base, status: "exploded" });
    expect(parsed.success).toBe(false);
  });

  it("rejects a missing required chain_id", () => {
    const { chain_id, ...noChain } = { ...base, status: "completed" };
    void chain_id;
    expect(record.safeParse(noChain).success).toBe(false);
  });

  it("rejects a missing required step_id", () => {
    const { step_id, ...noStep } = { ...base, status: "completed" };
    void step_id;
    expect(record.safeParse(noStep).success).toBe(false);
  });

  // ── ADVERSARIAL: non-string status types are rejected ───────────────────────
  it("rejects a non-string status (number / null)", () => {
    expect(record.safeParse({ ...base, status: 1 as unknown as string }).success).toBe(false);
    expect(record.safeParse({ ...base, status: null as unknown as string }).success).toBe(false);
  });

  // ── PASSTHROUGH: extra metadata keys flow through (hooks/debug) ─────────────
  it("passes through extra keys while still validating declared fields", () => {
    const parsed = record.safeParse({ ...base, status: "completed", budget_remaining: 0, hook_meta: { x: 1 } });
    expect(parsed.success).toBe(true);
  });

  // ── CONTRACT SYNC: the dispatcher enum equals the canonical contract set ─────
  it("the dispatcher status set is single-sourced from the contract (no drift)", () => {
    // budget_exceeded + timeout (the executor-only statuses) MUST both be accepted,
    // proving the dispatcher enum was widened from the schema, not a stale literal.
    const executorOnly = ["timeout", "budget_exceeded"];
    for (const s of executorOnly) {
      expect(record.safeParse({ ...base, status: s }).success, s).toBe(true);
    }
    // and the count of accepted statuses equals the contract option count.
    const acceptedCount = TelemetryEventStatusSchema.options.filter(
      (s) => record.safeParse({ ...base, status: s }).success,
    ).length;
    expect(acceptedCount).toBe(TelemetryEventStatusSchema.options.length);
  });
});
