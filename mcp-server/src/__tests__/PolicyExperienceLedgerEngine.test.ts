/**
 * Tests for PolicyExperienceLedgerEngine (U-LEARN-09).
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PolicyExperienceLedgerEngine } from "../engines/PolicyExperienceLedgerEngine.js";
import type { AppendExperienceInput } from "../schemas/policyExperienceSchema.js";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-policy-"));
}

function makeInput(partial: Partial<AppendExperienceInput> = {}): AppendExperienceInput {
  return {
    lineage_id: partial.lineage_id ?? "LNG-TEST-1",
    domain: partial.domain ?? "mill",
    state: partial.state ?? {
      context: { material: "D2", operation: "roughing", machine: "M1" },
      inline: { sfm: 120 },
    },
    action_record: partial.action_record ?? {
      engine_name: "SpeedFeedOrchestrator",
      baseline: { sfm: 120 },
      adapted: { sfm: 100 },
      adapter_used: "mill-D2-roughing-v3",
      confidence: 0.82,
    },
    reward_components: partial.reward_components ?? [
      {
        objective: "cycle_time",
        raw_value: 14.5,
        raw_unit: "min",
        normalized_z_score: 0.6,
        weight: 1,
        sign_convention: "minimize",
      },
    ],
    next_state: partial.next_state,
    terminal: partial.terminal ?? false,
    metadata: partial.metadata,
    timestamp: partial.timestamp,
    experience_id: partial.experience_id,
    group_advantage: partial.group_advantage,
  };
}

describe("PolicyExperienceLedgerEngine — U-LEARN-09", () => {
  let root: string;
  let ledger: PolicyExperienceLedgerEngine;
  const cleanups: string[] = [];

  beforeEach(() => {
    root = tmpRoot();
    ledger = new PolicyExperienceLedgerEngine(root);
    cleanups.push(root);
  });

  afterAll(() => {
    for (const r of cleanups) {
      try { fs.rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  it("append: writes a minimal tuple", () => {
    const res = ledger.append(makeInput());
    expect(res.ok).toBe(true);
    expect(res.experience_id).toBeTruthy();
    expect(fs.existsSync(path.join(root, "experience.jsonl"))).toBe(true);
  });

  it("append: rejects empty lineage_id", () => {
    const res = ledger.append(makeInput({ lineage_id: "" }));
    expect(res.ok).toBe(false);
    expect(res.warning).toContain("schema validation failed");
  });

  it("append: rejects missing reward_components", () => {
    const res = ledger.append(makeInput({ reward_components: [] as any }));
    expect(res.ok).toBe(false);
  });

  it("append: computes reward_total from z-scores when scalar absent", () => {
    const res = ledger.append(makeInput({
      reward_components: [
        { objective: "cycle_time", raw_value: 14, normalized_z_score: 1.0, weight: 1, sign_convention: "minimize" },
        { objective: "tool_life", raw_value: 60, normalized_z_score: 0.8, weight: 2, sign_convention: "maximize" },
      ],
    }));
    // contributions: cycle_time: 1 * 1.0 * -1 = -1 ; tool_life: 2 * 0.8 * +1 = +1.6
    expect(res.reward_total).toBeCloseTo(0.6, 5);
  });

  it("append: respects explicit scalar_contribution", () => {
    const res = ledger.append(makeInput({
      reward_components: [
        { objective: "cost", raw_value: 500, weight: 1, sign_convention: "minimize", scalar_contribution: -3.14 },
      ],
    }));
    expect(res.reward_total).toBeCloseTo(-3.14, 5);
  });

  it("append: persists optional group_advantage (GRPO) through query readback", () => {
    // ULTRACODE-SYNERGY-MS0 Order 3 — the field must round-trip, not be silently dropped.
    const res = ledger.append(makeInput({ lineage_id: "GRPO-1", group_advantage: 1.2345 }));
    expect(res.ok).toBe(true);
    const { tuples } = ledger.query({ lineage_id: "GRPO-1", limit: 10 });
    expect(tuples.length).toBe(1);
    expect((tuples[0] as { group_advantage?: number }).group_advantage).toBe(1.2345);
  });

  it("append: pre-GRPO tuple (no group_advantage) stays clean — field absent, not null", () => {
    const res = ledger.append(makeInput({ lineage_id: "NO-GRPO" }));
    expect(res.ok).toBe(true);
    const { tuples } = ledger.query({ lineage_id: "NO-GRPO", limit: 10 });
    expect("group_advantage" in (tuples[0] as object)).toBe(false);
  });

  it("append: preserves terminal flag", () => {
    const res = ledger.append(makeInput({ terminal: true }));
    expect(res.ok).toBe(true);
    const { tuples } = ledger.query({ limit: 10 });
    expect(tuples[0].terminal).toBe(true);
  });

  it("query: filters by lineage_id", () => {
    ledger.append(makeInput({ lineage_id: "L1" }));
    ledger.append(makeInput({ lineage_id: "L2" }));
    const { tuples } = ledger.query({ lineage_id: "L1", limit: 10 });
    expect(tuples.length).toBe(1);
    expect(tuples[0].lineage_id).toBe("L1");
  });

  it("query: filters by domain", () => {
    ledger.append(makeInput({ domain: "mill" }));
    ledger.append(makeInput({ domain: "lathe" }));
    const { tuples } = ledger.query({ domain: "mill", limit: 10 });
    expect(tuples.every((t) => t.domain === "mill")).toBe(true);
  });

  it("query: filters by adapter_used", () => {
    ledger.append(makeInput({
      action_record: { engine_name: "E", baseline: {}, adapted: {}, adapter_used: "A1" },
    }));
    ledger.append(makeInput({
      action_record: { engine_name: "E", baseline: {}, adapted: {}, adapter_used: "A2" },
    }));
    const { tuples } = ledger.query({ adapter_used: "A1", limit: 10 });
    expect(tuples.length).toBe(1);
    expect(tuples[0].action_record.adapter_used).toBe("A1");
  });

  it("query: terminal_only filter", () => {
    ledger.append(makeInput({ terminal: false }));
    ledger.append(makeInput({ terminal: true }));
    const { tuples } = ledger.query({ terminal_only: true, limit: 10 });
    expect(tuples.every((t) => t.terminal)).toBe(true);
  });

  it("query: since_iso excludes older events", () => {
    ledger.append(makeInput({ timestamp: new Date(Date.now() - 60_000).toISOString() }));
    ledger.append(makeInput({ timestamp: new Date().toISOString() }));
    const { tuples } = ledger.query({
      since_iso: new Date(Date.now() - 30_000).toISOString(),
      limit: 10,
    });
    expect(tuples.length).toBe(1);
  });

  it("query: returns newest-first", () => {
    ledger.append(makeInput({ timestamp: new Date(Date.now() - 5_000).toISOString(), metadata: { tag: "older" } }));
    ledger.append(makeInput({ timestamp: new Date().toISOString(), metadata: { tag: "newer" } }));
    const { tuples } = ledger.query({ limit: 10 });
    expect((tuples[0].metadata as any).tag).toBe("newer");
  });

  it("query: honors limit + truncated flag", () => {
    for (let i = 0; i < 5; i++) ledger.append(makeInput());
    const { tuples, truncated } = ledger.query({ limit: 3 });
    expect(tuples.length).toBe(3);
    expect(truncated).toBe(true);
  });

  it("stats: totals + by_domain + by_adapter + reward_summary", () => {
    ledger.append(makeInput({ domain: "mill" }));
    ledger.append(makeInput({ domain: "lathe", action_record: { engine_name: "E", baseline: {}, adapted: {}, adapter_used: "A1" } }));
    ledger.append(makeInput({ domain: "mill",  action_record: { engine_name: "E", baseline: {}, adapted: {}, adapter_used: null } }));
    const s = ledger.stats();
    expect(s.total).toBe(3);
    expect(s.by_domain.mill).toBe(2);
    expect(s.by_domain.lathe).toBe(1);
    expect(s.by_adapter.__none__).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(s.reward_summary.mean)).toBe(true);
  });

  it("crash-tolerant read: skips torn tail line", () => {
    ledger.append(makeInput());
    fs.appendFileSync(path.join(root, "experience.jsonl"), "{partial-no-close");
    const s = ledger.stats();
    expect(s.total).toBe(1);
  });

  it("self-awareness metadata", () => {
    const meta = PolicyExperienceLedgerEngine.getSelfAwareness();
    expect(meta.name).toBe("PolicyExperienceLedgerEngine");
    expect(meta.milestone).toContain("U-LEARN-09");
  });

  it("never throws on non-JSON-safe metadata", () => {
    const circ: any = {};
    circ.self = circ;
    expect(() => ledger.append(makeInput({ metadata: circ }))).not.toThrow();
  });

  it("rejects oversize tuple (>128KB)", () => {
    const huge = "x".repeat(200 * 1024);
    const res = ledger.append(makeInput({ metadata: { payload: huge } }));
    expect(res.ok).toBe(false);
    expect(res.warning).toContain("exceeds");
  });
});
