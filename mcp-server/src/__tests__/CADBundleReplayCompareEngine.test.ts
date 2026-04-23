/**
 * CADBundleReplayCompareEngine.test.ts — U-FS-15 (PHASE-47)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADBundleReplayCompareEngine,
  type ReplayClock,
  type OperationExecutor,
  type ReplayExecutionResult,
} from "../engines/CADBundleReplayCompareEngine.js";
import type {
  CADBundle,
  CADOperation,
} from "../schemas/cadBundleReplaySchema.js";

const H = (c: string) => c.repeat(64);

function makeClock(start = 1_000_000): ReplayClock & {
  tickMs(ms: number): void;
} {
  let mono = start;
  let iso = new Date("2026-04-20T00:00:00Z").getTime();
  return {
    now: () => new Date(iso).toISOString(),
    monotonicMs: () => mono,
    tickMs: (ms) => {
      mono += ms;
      iso += ms;
    },
  };
}

function op(
  seq: number,
  kind: CADOperation["kind"],
  inSha: string,
  outSha: string,
  params: Record<string, string | number | boolean | null> = {},
): CADOperation {
  return {
    opId: `op-${seq}`,
    sequence: seq,
    kind,
    params,
    inputStateSha256: inSha,
    outputStateSha256: outSha,
    durationMs: 10,
  };
}

function bundle(id: string, ops: CADOperation[], version = "1.0.0"): CADBundle {
  return {
    bundleId: id,
    version,
    capturedAt: "2026-04-20T00:00:00Z",
    operations: ops,
    bundleDigestSha256: H("1"),
  };
}

function makeHappyExecutor(): OperationExecutor {
  return {
    execute: (op) =>
      ({
        ok: true,
        outputStateSha256: op.outputStateSha256,
        durationMs: 5,
      }) as ReplayExecutionResult,
  };
}

describe("CADBundleReplayCompareEngine (U-FS-15)", () => {
  let eng: CADBundleReplayCompareEngine;
  let clock: ReturnType<typeof makeClock>;

  beforeEach(() => {
    clock = makeClock();
    eng = new CADBundleReplayCompareEngine({ clock });
  });

  describe("replay happy path", () => {
    it("replays full bundle successfully", () => {
      const b = bundle("B1", [
        op(0, "sketch", H("0"), H("a")),
        op(1, "extrude", H("a"), H("b"), { depth_mm: 10 }),
        op(2, "fillet", H("b"), H("c"), { radius_mm: 1 }),
      ]);
      eng.registerBundle(b);
      const run = eng.replay("B1", H("0"), makeHappyExecutor());
      expect(run.overallSuccess).toBe(true);
      expect(run.outcomes.length).toBe(3);
      expect(run.outcomes.every((o) => o.success)).toBe(true);
    });

    it("halts on first failure by default", () => {
      const b = bundle("B2", [
        op(0, "sketch", H("0"), H("a")),
        op(1, "extrude", H("a"), H("b")),
        op(2, "fillet", H("b"), H("c")),
      ]);
      eng.registerBundle(b);
      const executor: OperationExecutor = {
        execute: (o) =>
          o.sequence === 1
            ? {
                ok: false,
                failureClass: "geometry_check_failed",
                reason: "non-manifold",
                durationMs: 2,
              }
            : {
                ok: true,
                outputStateSha256: o.outputStateSha256,
                durationMs: 5,
              },
      };
      const run = eng.replay("B2", H("0"), executor);
      expect(run.overallSuccess).toBe(false);
      expect(run.firstFailureOpId).toBe("op-1");
      expect(run.outcomes.length).toBe(2);
      expect(eng.retrainEntries().length).toBe(1);
      expect(eng.retrainEntries()[0].failureClass).toBe("geometry_check_failed");
    });
  });

  describe("replay failure classes", () => {
    it("detects input_state_mismatch", () => {
      const b = bundle("B3", [op(0, "sketch", H("a"), H("b"))]);
      eng.registerBundle(b);
      const run = eng.replay("B3", H("c"), makeHappyExecutor());
      expect(run.outcomes[0].failureClass).toBe("input_state_mismatch");
    });

    it("detects output_state_mismatch", () => {
      const b = bundle("B4", [op(0, "sketch", H("0"), H("a"))]);
      eng.registerBundle(b);
      const executor: OperationExecutor = {
        execute: () =>
          ({
            ok: true,
            outputStateSha256: H("z"), // wrong SHA
            durationMs: 1,
          }) as ReplayExecutionResult,
      };
      // Need a valid hex hash for H("z") — retry with H("f"):
      const executor2: OperationExecutor = {
        execute: () =>
          ({
            ok: true,
            outputStateSha256: H("f"),
            durationMs: 1,
          }) as ReplayExecutionResult,
      };
      const run = eng.replay("B4", H("0"), executor2);
      expect(run.outcomes[0].failureClass).toBe("output_state_mismatch");
      void executor;
    });

    it("timeout flag fires when executor exceeds limit", () => {
      const b = bundle("B5", [op(0, "sketch", H("0"), H("a"))]);
      eng.registerBundle(b);
      const executor: OperationExecutor = {
        execute: () => {
          clock.tickMs(500); // simulate long op
          return {
            ok: true,
            outputStateSha256: H("a"),
            durationMs: 500,
          } as ReplayExecutionResult;
        },
      };
      const run = eng.replay("B5", H("0"), executor, { timeoutMsPerOp: 100 });
      expect(run.outcomes[0].failureClass).toBe("timeout");
    });

    it("op_threw classification gets priority 9", () => {
      const b = bundle("B6", [op(0, "sketch", H("0"), H("a"))]);
      eng.registerBundle(b);
      const executor: OperationExecutor = {
        execute: () =>
          ({
            ok: false,
            failureClass: "op_threw",
            reason: "crash",
            durationMs: 0,
          }) as ReplayExecutionResult,
      };
      eng.replay("B6", H("0"), executor);
      expect(eng.retrainEntries()[0].priority).toBe(9);
    });

    it("continueOnFailure yields outcome per op", () => {
      const b = bundle("B7", [
        op(0, "sketch", H("0"), H("a")),
        op(1, "extrude", H("a"), H("b")),
      ]);
      eng.registerBundle(b);
      const executor: OperationExecutor = {
        execute: () =>
          ({
            ok: false,
            failureClass: "tolerance_violation",
            reason: "out of spec",
            durationMs: 1,
          }) as ReplayExecutionResult,
      };
      const run = eng.replay("B7", H("0"), executor, { continueOnFailure: true });
      expect(run.outcomes.length).toBe(2);
      expect(run.outcomes.every((o) => !o.success)).toBe(true);
    });
  });

  describe("diff", () => {
    it("detects added/removed/modified ops", () => {
      const a = bundle("A", [
        op(0, "sketch", H("0"), H("a")),
        op(1, "extrude", H("a"), H("b"), { depth_mm: 10 }),
      ]);
      const b = bundle("B", [
        op(0, "sketch", H("0"), H("a")),
        op(1, "extrude", H("a"), H("c"), { depth_mm: 20 }),
        op(2, "fillet", H("c"), H("d"), { radius_mm: 2 }),
      ]);
      eng.registerBundle(a);
      eng.registerBundle(b);
      const d = eng.diff("A", "B");
      expect(d.summary.added).toBe(1);
      expect(d.summary.modified).toBe(1);
      expect(d.summary.unchanged).toBe(1);
      expect(d.summary.removed).toBe(0);
      const modifyRow = d.diffs.find((x) => x.diff === "modified")!;
      expect(modifyRow.changedFields).toContain("outputStateSha256");
      expect(modifyRow.changedFields).toContain("params");
    });

    it("detects removed ops", () => {
      const a = bundle("A2", [
        op(0, "sketch", H("0"), H("a")),
        op(1, "extrude", H("a"), H("b")),
      ]);
      const b = bundle("B2", [op(0, "sketch", H("0"), H("a"))]);
      eng.registerBundle(a);
      eng.registerBundle(b);
      const d = eng.diff("A2", "B2");
      expect(d.summary.removed).toBe(1);
    });
  });

  describe("cross-bundle search", () => {
    beforeEach(() => {
      eng.registerBundle(
        bundle("X1", [
          op(0, "sketch", H("0"), H("a")),
          op(1, "extrude", H("a"), H("b"), { depth_mm: 10, direction: "up" }),
          op(2, "fillet", H("b"), H("c"), { radius_mm: 1 }),
        ]),
      );
      eng.registerBundle(
        bundle("X2", [
          op(0, "sketch", H("0"), H("a")),
          op(1, "extrude", H("a"), H("b"), { depth_mm: 20, direction: "up" }),
        ]),
      );
    });

    it("filters by kind", () => {
      const hits = eng.search({ kinds: ["extrude"] });
      expect(hits.length).toBe(2);
      expect(hits.every((h) => /op-1/.test(h.opId))).toBe(true);
    });

    it("filters by param exact match", () => {
      const hits = eng.search({
        kinds: ["extrude"],
        paramEquals: { depth_mm: 10 },
      });
      expect(hits.length).toBe(1);
      expect(hits[0].bundleId).toBe("X1");
    });

    it("scores partial matches", () => {
      const hits = eng.search({
        kinds: ["extrude"],
        paramEquals: { depth_mm: 10, direction: "up" },
      });
      // One has both, one has direction only
      expect(hits[0].score).toBe(1);
      expect(hits[1].score).toBe(0.5);
    });
  });

  describe("retrain queue", () => {
    it("drainRetrainQueue returns and clears", () => {
      const b = bundle("D1", [op(0, "sketch", H("0"), H("a"))]);
      eng.registerBundle(b);
      const executor: OperationExecutor = {
        execute: () =>
          ({
            ok: false,
            failureClass: "geometry_check_failed",
            reason: "bad geom",
            durationMs: 1,
          }) as ReplayExecutionResult,
      };
      eng.replay("D1", H("0"), executor);
      const drained = eng.drainRetrainQueue();
      expect(drained.length).toBe(1);
      expect(eng.retrainEntries().length).toBe(0);
    });
  });
});
