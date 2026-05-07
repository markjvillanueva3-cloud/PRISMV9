/**
 * Tests for businessDispatcher PolicyExperienceLedger + OutcomeTrace actions
 * (PSAU P2.5-LEARN U-LEARN-09).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { businessDispatch } from "../../tools/dispatchers/businessDispatcher.js";

const POLICY_FILE = path.resolve(process.cwd(), "state/policy/experience.jsonl");
const POLICY_BACKUP = POLICY_FILE + ".psau-test-backup";

function backup(): void { if (fs.existsSync(POLICY_FILE)) fs.renameSync(POLICY_FILE, POLICY_BACKUP); }
function restore(): void {
  if (fs.existsSync(POLICY_FILE)) fs.rmSync(POLICY_FILE);
  if (fs.existsSync(POLICY_BACKUP)) fs.renameSync(POLICY_BACKUP, POLICY_FILE);
}

const baseAppend = () => ({
  action: "policy_experience_append" as const,
  lineage_id: "BD-LNG-1",
  domain: "mill",
  state: {
    context: { material: "D2", operation: "roughing", machine: "M1" },
    inline: { sfm: 120 },
  },
  action_record: undefined,
  action_rec: undefined,
});

describe("businessDispatcher — PolicyExperienceLedger + OutcomeTrace (U-LEARN-09)", () => {
  beforeAll(backup);
  afterAll(restore);

  it("policy_experience_append: writes a valid tuple", async () => {
    const r = await businessDispatch({
      action: "policy_experience_append",
      lineage_id: "BD-LNG-1",
      domain: "mill",
      state: { context: { material: "D2" }, inline: { sfm: 120 } },
      action_record: {
        engine_name: "SpeedFeed",
        baseline: { sfm: 120 },
        adapted: { sfm: 100 },
        adapter_used: "bd-test-adapter",
      },
      reward_components: [
        { objective: "cycle_time", raw_value: 14, normalized_z_score: 0.6, weight: 1, sign_convention: "minimize" },
      ],
    });
    expect(r.success).toBe(true);
    const d = r.data as any;
    expect(d.ok).toBe(true);
    expect(d.experience_id).toBeTruthy();
  });

  it("policy_experience_append: rejects empty lineage_id", async () => {
    const r = await businessDispatch({
      action: "policy_experience_append",
      lineage_id: "",
      domain: "mill",
      state: { context: {} },
      action_record: { engine_name: "X", baseline: {}, adapted: {} },
      reward_components: [
        { objective: "cost", raw_value: 100, weight: 1, sign_convention: "minimize" },
      ],
    });
    expect(r.success).toBe(false);
    expect(r.error).toContain("Invalid input");
  });

  it("policy_experience_append: rejects empty reward_components", async () => {
    const r = await businessDispatch({
      action: "policy_experience_append",
      lineage_id: "X",
      domain: "mill",
      state: { context: {} },
      action_record: { engine_name: "X", baseline: {}, adapted: {} },
      reward_components: [],
    });
    expect(r.success).toBe(false);
  });

  it("policy_experience_query: returns tuples", async () => {
    const r = await businessDispatch({
      action: "policy_experience_query",
      domain: "mill",
      limit: 100,
    });
    expect(r.success).toBe(true);
    const d = r.data as any;
    expect(Array.isArray(d.tuples)).toBe(true);
    expect(d.tuples.length).toBeGreaterThan(0);
  });

  it("policy_experience_query: filters by lineage_id", async () => {
    const r = await businessDispatch({
      action: "policy_experience_query",
      lineage_id: "BD-LNG-1",
      limit: 100,
    });
    const d = r.data as any;
    expect(d.tuples.every((t: any) => t.lineage_id === "BD-LNG-1")).toBe(true);
  });

  it("policy_experience_stats: returns totals + reward summary", async () => {
    const r = await businessDispatch({ action: "policy_experience_stats" });
    expect(r.success).toBe(true);
    const d = r.data as any;
    expect(typeof d.total).toBe("number");
    expect(d.total).toBeGreaterThan(0);
    expect(typeof d.reward_summary.mean).toBe("number");
  });

  it("outcome_trace_record: creates tuple + lineage edges in one call", async () => {
    const r = await businessDispatch({
      action: "outcome_trace_record",
      lineage_id: "BD-TRACE-1",
      domain: "mill",
      prediction_id: "BD-P-1",
      outcome_event_id: "BD-OE-1",
      model_checkpoint_id: "BD-MC-1",
      state: { context: { material: "D2" }, inline: { sfm: 120 } },
      action_record: { engine_name: "SpeedFeed", baseline: { sfm: 120 }, adapted: { sfm: 100 } },
      reward_components: [
        { objective: "cycle_time", raw_value: 14, normalized_z_score: 0.5, weight: 1, sign_convention: "minimize" },
      ],
    });
    expect(r.success).toBe(true);
    const d = r.data as any;
    expect(d.ok).toBe(true);
    expect(d.edges_created.length).toBe(2);      // validated_by + produced_by
  });

  it("outcome_trace_record: rejects missing prediction_id", async () => {
    const r = await businessDispatch({
      action: "outcome_trace_record",
      lineage_id: "X",
      domain: "mill",
      prediction_id: "",
      outcome_event_id: "Y",
      state: { context: {} },
      action_record: { engine_name: "X", baseline: {}, adapted: {} },
      reward_components: [
        { objective: "cost", raw_value: 100, weight: 1, sign_convention: "minimize" },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("outcome_trace_record: omits produced_by edge when model_checkpoint_id absent", async () => {
    const r = await businessDispatch({
      action: "outcome_trace_record",
      lineage_id: "BD-TRACE-2",
      domain: "lathe",
      prediction_id: "BD-P-2",
      outcome_event_id: "BD-OE-2",
      state: { context: { material: "M2" }, inline: {} },
      action_record: { engine_name: "SpeedFeed", baseline: {}, adapted: {} },
      reward_components: [
        { objective: "tool_life", raw_value: 45, normalized_z_score: 0.8, weight: 1, sign_convention: "maximize" },
      ],
    });
    expect(r.success).toBe(true);
    const d = r.data as any;
    expect(d.edges_created.length).toBe(1);      // only validated_by
  });

  it("policy_experience_query: honors limit + truncated flag", async () => {
    // Append several more
    for (let i = 0; i < 6; i++) {
      await businessDispatch({
        action: "policy_experience_append",
        lineage_id: "BD-LIMIT",
        domain: "other",
        state: { context: {}, inline: { i } },
        action_record: { engine_name: "X", baseline: {}, adapted: {} },
        reward_components: [
          { objective: "other", raw_value: i, weight: 1, sign_convention: "maximize" },
        ],
      });
    }
    const r = await businessDispatch({
      action: "policy_experience_query",
      lineage_id: "BD-LIMIT",
      limit: 3,
    });
    const d = r.data as any;
    expect(d.tuples.length).toBe(3);
    expect(d.truncated).toBe(true);
  });

  it("anti-regression: unknown action still rejected cleanly", async () => {
    const r = await businessDispatch({ action: "policy_not_a_real_action" as any });
    expect(r.success).toBe(false);
    expect(r.error).toContain("Unknown action");
  });
});
