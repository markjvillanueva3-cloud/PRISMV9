/**
 * Tests for OutcomeTraceEngine (U-LEARN-09).
 *
 * Verifies the "one-call" API: recording an outcome produces BOTH
 *   (a) an experience tuple in PolicyExperienceLedger, and
 *   (b) MLLineage edges linking prediction ↔ outcome ↔ model_checkpoint.
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PolicyExperienceLedgerEngine } from "../engines/PolicyExperienceLedgerEngine.js";
import { MLLineageEngine } from "../engines/MLLineageEngine.js";
import { OutcomeTraceEngine } from "../engines/OutcomeTraceEngine.js";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-otrace-"));
}

describe("OutcomeTraceEngine — U-LEARN-09", () => {
  let rootPolicy: string;
  let rootLineage: string;
  let ledger: PolicyExperienceLedgerEngine;
  let lineage: MLLineageEngine;
  let trace: OutcomeTraceEngine;
  const cleanups: string[] = [];

  beforeEach(() => {
    rootPolicy = tmpRoot();
    rootLineage = tmpRoot();
    ledger = new PolicyExperienceLedgerEngine(rootPolicy);
    lineage = new MLLineageEngine(rootLineage);
    trace = new OutcomeTraceEngine(ledger, lineage);
    cleanups.push(rootPolicy, rootLineage);
  });

  afterAll(() => {
    for (const r of cleanups) {
      try { fs.rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  const baseInput = () => ({
    lineage_id: "LNG-1",
    domain: "mill" as const,
    prediction_id: "P-123",
    outcome_event_id: "OE-456",
    model_checkpoint_id: "MC-v7",
    state: {
      context: { material: "D2", operation: "roughing", machine: "M1" },
      inline: { sfm: 120 },
    },
    action_record: {
      engine_name: "SpeedFeed",
      baseline: { sfm: 120 },
      adapted: { sfm: 100 },
      adapter_used: "mill-D2-v3",
    },
    reward_components: [
      { objective: "cycle_time" as const, raw_value: 14.2, normalized_z_score: 0.5, weight: 1, sign_convention: "minimize" as const },
    ],
    terminal: false,
  });

  it("record: creates tuple + validated_by edge + produced_by edge", () => {
    const res = trace.record(baseInput());
    expect(res.ok).toBe(true);
    expect(res.experience_id).toBeTruthy();
    expect(res.edges_created.length).toBe(2);           // validated_by + produced_by
    expect(res.warnings).toEqual([]);
  });

  it("record: experience appears in ledger with prediction_id in metadata", () => {
    trace.record(baseInput());
    const { tuples } = ledger.query({ lineage_id: "LNG-1", limit: 10 });
    expect(tuples.length).toBe(1);
    expect((tuples[0].metadata as any).prediction_id).toBe("P-123");
    expect((tuples[0].metadata as any).outcome_event_id).toBe("OE-456");
  });

  it("record: prediction → outcome edge reachable via trace()", () => {
    trace.record(baseInput());
    const t = lineage.trace({
      node: { kind: "prediction", id: "P-123" },
      direction: "forward",
      max_depth: 2,
    });
    const kinds = t.nodes.map((n) => n.kind);
    expect(kinds).toContain("outcome_event");
    expect(kinds).toContain("model_checkpoint");
  });

  it("record: omits produced_by edge when model_checkpoint_id absent", () => {
    const input = baseInput();
    delete (input as any).model_checkpoint_id;
    const res = trace.record(input as any);
    expect(res.ok).toBe(true);
    expect(res.edges_created.length).toBe(1);           // only validated_by
    const t = lineage.trace({
      node: { kind: "prediction", id: "P-123" },
      direction: "forward",
      max_depth: 2,
    });
    expect(t.nodes.map((n) => n.kind)).not.toContain("model_checkpoint");
  });

  it("record: rejects invalid input without throwing", () => {
    const res = trace.record({
      ...baseInput(),
      prediction_id: "",            // min(1) violation
    } as any);
    expect(res.ok).toBe(false);
    expect(res.warnings[0]).toContain("schema validation failed");
  });

  it("record: reward_total computed from components", () => {
    const res = trace.record({
      ...baseInput(),
      reward_components: [
        { objective: "cycle_time", raw_value: 14.2, normalized_z_score: 1.0, weight: 1, sign_convention: "minimize" },
        { objective: "tool_life", raw_value: 60, normalized_z_score: 0.5, weight: 2, sign_convention: "maximize" },
      ],
    });
    expect(res.reward_total).toBeCloseTo(0.0, 5);       // -1 + 1 = 0
  });

  it("record: terminal flag propagates to tuple", () => {
    trace.record({ ...baseInput(), terminal: true });
    const { tuples } = ledger.query({ limit: 10 });
    expect(tuples[0].terminal).toBe(true);
  });

  it("record: multiple outcomes for same prediction ok", () => {
    trace.record(baseInput());
    trace.record({ ...baseInput(), outcome_event_id: "OE-457" });
    const s = lineage.stats();
    expect(s.total_edges).toBeGreaterThanOrEqual(3);
  });

  it("self-awareness metadata", () => {
    const meta = OutcomeTraceEngine.getSelfAwareness();
    expect(meta.name).toBe("OutcomeTraceEngine");
    expect(meta.dependencies).toContain("PolicyExperienceLedgerEngine");
    expect(meta.dependencies).toContain("MLLineageEngine");
  });

  it("never throws on bad reward component", () => {
    expect(() =>
      trace.record({
        ...baseInput(),
        reward_components: [] as any,        // empty → rejected
      } as any),
    ).not.toThrow();
  });
});
