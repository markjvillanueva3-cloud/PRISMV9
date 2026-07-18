/**
 * BatchDeliverableEngine tests — U-HAGI05.  Asserts real behavior:
 * deterministic arithmetic on roll-up totals, exact per-customer/per-kind
 * aggregation, fail-soft on per-deliverable runner failures.
 */
import { describe, it, expect } from "vitest";
import {
  BatchDeliverableEngine,
  type BatchRequest,
  type BatchDeliverable,
} from "../engines/BatchDeliverableEngine.js";

const ISO = "2026-05-24T13:00:00.000Z";
const DONE_ISO = "2026-05-24T13:00:05.000Z";

const deliv = (
  id: string, customer: string, kind: BatchDeliverable["kind"], payload: unknown,
): BatchDeliverable => ({ deliverable_id: id, customer_id: customer, kind, payload });

const req = (over: Partial<BatchRequest> = {}): BatchRequest => ({
  batch_id: "b_1",
  requested_by: "ops",
  requested_at: ISO,
  max_concurrency: 4,
  deliverables: [
    deliv("d1", "ACME", "quote", { value: 10 }),
    deliv("d2", "ACME", "quote", { value: 20 }),
    deliv("d3", "GLOBEX", "program", { value: 5 }),
  ],
  ...over,
});

describe("BatchDeliverableEngine.run — happy path arithmetic", () => {
  it("returns one outcome per deliverable, ok=true when runner succeeds", async () => {
    const r = await BatchDeliverableEngine.run(
      req(),
      (d) => ({ doubled: ((d.payload as { value: number }).value) * 2 }),
      DONE_ISO,
    );
    expect(r.total).toBe(3);
    expect(r.succeeded).toBe(3);
    expect(r.failed).toBe(0);
    expect(r.outcomes).toHaveLength(3);
    expect(r.outcomes[0].output).toEqual({ doubled: 20 });
    expect(r.outcomes[1].output).toEqual({ doubled: 40 });
    expect(r.outcomes[2].output).toEqual({ doubled: 10 });
  });

  it("aggregates byKind: 2 quotes + 1 program, all ok", async () => {
    const r = await BatchDeliverableEngine.run(req(), () => "ok", DONE_ISO);
    expect(r.byKind.quote).toEqual({ total: 2, succeeded: 2, failed: 0 });
    expect(r.byKind.program).toEqual({ total: 1, succeeded: 1, failed: 0 });
  });

  it("aggregates byCustomer: 2 ACME + 1 GLOBEX, all ok", async () => {
    const r = await BatchDeliverableEngine.run(req(), () => "ok", DONE_ISO);
    expect(r.byCustomer.ACME).toEqual({ total: 2, succeeded: 2, failed: 0 });
    expect(r.byCustomer.GLOBEX).toEqual({ total: 1, succeeded: 1, failed: 0 });
  });

  it("propagates completed_at into the rollup", async () => {
    const r = await BatchDeliverableEngine.run(req(), () => 1, DONE_ISO);
    expect(r.completed_at).toBe(DONE_ISO);
    expect(r.requested_at).toBe(ISO);
    expect(r.requested_by).toBe("ops");
    expect(r.batch_id).toBe("b_1");
  });
});

describe("BatchDeliverableEngine.run — partial-failure (R12)", () => {
  it("fails 1 of 3 deliverables when runner throws on one; aggregates exactly", async () => {
    const r = await BatchDeliverableEngine.run(req(), (d) => {
      if (d.deliverable_id === "d2") throw new Error("estimator timeout");
      return { ok: 1 };
    }, DONE_ISO);
    expect(r.total).toBe(3);
    expect(r.succeeded).toBe(2);
    expect(r.failed).toBe(1);
    expect(r.failures).toHaveLength(1);
    expect(r.failures[0].deliverable_id).toBe("d2");
    expect(r.failures[0].error).toBe("estimator timeout");
    expect(r.byCustomer.ACME).toEqual({ total: 2, succeeded: 1, failed: 1 });
    expect(r.byKind.quote).toEqual({ total: 2, succeeded: 1, failed: 1 });
  });

  it("survives all-fail: returns 3 failures, summary.succeeded=0", async () => {
    const r = await BatchDeliverableEngine.run(req(), () => { throw new Error("boom"); }, DONE_ISO);
    expect(r.succeeded).toBe(0);
    expect(r.failed).toBe(3);
    expect(r.failures).toHaveLength(3);
    for (const f of r.failures) expect(f.error).toBe("boom");
  });

  it("non-Error throw is coerced to string in error field", async () => {
    const r = await BatchDeliverableEngine.run(req({
      deliverables: [deliv("d1", "ACME", "quote", { v: 1 })],
    }), () => { throw 42 as never; }, DONE_ISO);
    expect(r.failures[0].error).toBe("42");
  });
});

describe("BatchDeliverableEngine.run — concurrency + ceiling", () => {
  it("respects max_concurrency by batching in chunks (no parallel overlap >maxC)", async () => {
    let inFlight = 0;
    let peak = 0;
    const deliverables: BatchDeliverable[] = Array.from({ length: 20 }, (_, i) =>
      deliv(`d${i}`, "C", "quote", i));
    const r = await BatchDeliverableEngine.run(
      { ...req({ deliverables }), max_concurrency: 5 },
      async () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((res) => setTimeout(res, 5));
        inFlight -= 1;
        return 1;
      },
      DONE_ISO,
    );
    expect(r.total).toBe(20);
    expect(r.succeeded).toBe(20);
    expect(peak).toBeLessThanOrEqual(5);
  });

  it("throws when batch exceeds Kimi ceiling of 300", async () => {
    const big = Array.from({ length: 301 }, (_, i) => deliv(`d${i}`, "C", "quote", i));
    await expect(BatchDeliverableEngine.run(
      req({ deliverables: big }), () => 1, DONE_ISO,
    )).rejects.toThrow();
  });
});

describe("BatchDeliverableEngine.run — failure modes", () => {
  it("throws on duplicate deliverable_id (adversarial)", async () => {
    await expect(BatchDeliverableEngine.run(req({
      deliverables: [
        deliv("dup", "A", "quote", 1),
        deliv("dup", "B", "quote", 2),
      ],
    }), () => 1, DONE_ISO)).rejects.toThrow(/duplicate/i);
  });

  it("throws on empty deliverables list (zod boundary)", async () => {
    await expect(BatchDeliverableEngine.run(req({ deliverables: [] }), () => 1, DONE_ISO)).rejects.toThrow();
  });

  it("throws on non-function runner", async () => {
    await expect(BatchDeliverableEngine.run(req(), null as never, DONE_ISO)).rejects.toThrow(/runner/);
  });

  it("throws on missing batch_id", async () => {
    await expect(BatchDeliverableEngine.run(req({ batch_id: "" }), () => 1, DONE_ISO)).rejects.toThrow();
  });

  it("throws on unknown kind value (zod enum)", async () => {
    const bad = { ...req(), deliverables: [{ ...deliv("d1", "A", "quote", 1), kind: "yolo" }] } as never;
    await expect(BatchDeliverableEngine.run(bad, () => 1, DONE_ISO)).rejects.toThrow();
  });
});

describe("BatchDeliverableEngine.renderRollup", () => {
  it("includes batch id, totals, and per-kind/per-customer lines", async () => {
    const r = await BatchDeliverableEngine.run(req(), () => 1, DONE_ISO);
    const md = BatchDeliverableEngine.renderRollup(r);
    expect(md).toContain("b_1");
    expect(md).toContain("total=3 ok=3 failed=0");
    expect(md).toContain("quote: 2/2 ok");
    expect(md).toContain("program: 1/1 ok");
    expect(md).toContain("ACME: 2/2 ok");
    expect(md).toContain("GLOBEX: 1/1 ok");
    expect(md).toContain("(no failures)");
  });

  it("renders failures in punch-list section", async () => {
    const r = await BatchDeliverableEngine.run(req(), (d) =>
      d.deliverable_id === "d2" ? (() => { throw new Error("X"); })() : 1, DONE_ISO);
    const md = BatchDeliverableEngine.renderRollup(r);
    expect(md).toContain("d2 (ACME, quote): X");
    expect(md).not.toContain("(no failures)");
  });
});
