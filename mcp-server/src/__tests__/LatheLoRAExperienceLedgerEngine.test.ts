/**
 * LATHE-LORA-MS0/U-LLR-LEDGER — real-behavior tests for the lathe experience
 * ledger (thin facade over the shared crossProcessOutcomeStore, process:"lathe").
 *
 * Store-state isolation: the store is a shared singleton accumulating across tests
 * in this worker — each test scopes its query/stats by a UNIQUE material token, so
 * assertions never see another test's rows. (No reset() dependency.)
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import {
  latheLoRAExperienceLedgerEngine as ledger,
  LatheLoRAExperienceLedgerEngine,
} from "../engines/LatheLoRAExperienceLedgerEngine.js";
import { crossProcessOutcomeStore } from "../engines/CrossProcessOutcomeStore.js";

let _n = 0;
const uniqMat = () => `LATHE_LEDGER_TEST_${++_n}`;

describe("LatheLoRAExperienceLedgerEngine — computeReward (pure deterministic domain logic)", () => {
  const e = new LatheLoRAExperienceLedgerEngine();
  it("success + Ra on target → 1.0", () => {
    expect(e.computeReward("success", { targetRaUm: 0.8, actualRaUm: 0.8 })).toBe(1);
  });
  it("success but actual Ra 2× target → 0.5 (proportional finish-miss penalty, capped 0.5)", () => {
    expect(e.computeReward("success", { targetRaUm: 0.8, actualRaUm: 1.6 })).toBeCloseTo(0.5, 6);
  });
  it("success + actual Ra slightly over (10%) → 0.95", () => {
    expect(e.computeReward("success", { targetRaUm: 1.0, actualRaUm: 1.1 })).toBeCloseTo(0.95, 6);
  });
  it("operator_override → 0.5; failure → 0; pending → 0", () => {
    expect(e.computeReward("operator_override")).toBe(0.5);
    expect(e.computeReward("failure")).toBe(0);
    expect(e.computeReward("pending", { targetRaUm: 0.8, actualRaUm: 0.8 })).toBe(0);
  });
  it("tool breakage / alarm hard-zero a successful kind", () => {
    expect(e.computeReward("success", { toolBreakage: true })).toBe(0);
    expect(e.computeReward("success", { alarm: true, targetRaUm: 0.8, actualRaUm: 0.8 })).toBe(0);
  });
  it("NaN/Infinity Ra inputs are guarded (no finish penalty applied) → stays 1.0", () => {
    expect(e.computeReward("success", { targetRaUm: NaN, actualRaUm: 0.8 })).toBe(1);
    expect(e.computeReward("success", { targetRaUm: 0.8, actualRaUm: Infinity })).toBe(1);
    expect(e.computeReward("success", { targetRaUm: -1, actualRaUm: 5 })).toBe(1);
  });
  it("reward is always within [0,1] even for a huge finish miss on a failure", () => {
    const r = e.computeReward("failure", { targetRaUm: 0.1, actualRaUm: 100 });
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(1);
  });
});

describe("LatheLoRAExperienceLedgerEngine — record / recordOutcome round-trip via shared store", () => {
  it("record() returns an id and the row is queryable as a lathe/ai pending event", () => {
    const mat = uniqMat();
    const id = ledger.record({ operation: "od_rough", material: mat, vc: 200, ap: 2.5 });
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
    const rows = ledger.query({ material: mat });
    expect(rows.length).toBe(1);
    expect(rows[0].process).toBe("lathe");
    expect(rows[0].bridge).toBe("ai");
    expect(rows[0].request_summary.operation).toBe("od_rough");
    expect(rows[0].request_summary.controller).toBe("okuma"); // default applied
    // no outcome supplied → pending
    expect(rows[0].outcome?.kind ?? "pending").toBe("pending");
  });

  it("recordOutcome() closes the event, stores the computed reward, and reports updated=true", () => {
    const mat = uniqMat();
    const id = ledger.record({ operation: "id_bore", material: mat, targetRaUm: 0.8 });
    const res = ledger.recordOutcome(id, { kind: "success", targetRaUm: 0.8, actualRaUm: 0.8 });
    expect(res.updated).toBe(true);
    expect(res.reward).toBe(1);
    const rows = ledger.query({ material: mat });
    expect(rows[0].outcome?.kind).toBe("success");
    expect(rows[0].outcome?.actual_metrics?.reward).toBe(1);
  });

  it("recordOutcome() on an unknown id returns updated=false (not a throw)", () => {
    const res = ledger.recordOutcome("nonexistent-id-zzz", { kind: "failure" });
    expect(res.updated).toBe(false);
    expect(res.reward).toBe(0);
  });

  it("recordOutcome recovers the STORED target Ra when omitted on close (finish-miss penalty not silently dropped)", () => {
    const mat = uniqMat();
    const id = ledger.record({ operation: "od_finish", material: mat, targetRaUm: 0.8 });
    // close with actual Ra = 2× target but NO targetRaUm — engine must recover 0.8 from the stored row
    const res = ledger.recordOutcome(id, { kind: "success", actualRaUm: 1.6 });
    expect(res.reward).toBeCloseTo(0.5, 6); // finish-miss penalty applied via recovered target (not 1.0)
  });
});

describe("LatheLoRAExperienceLedgerEngine — query / replaySample / stats (lathe-scoped)", () => {
  it("replaySample excludes pending rows; stats reports labeled/successRate scoped by material", () => {
    const mat = uniqMat();
    const idA = ledger.record({ operation: "od_finish", material: mat, targetRaUm: 0.8 });
    ledger.record({ operation: "part_off", material: mat }); // stays pending
    ledger.recordOutcome(idA, { kind: "success", targetRaUm: 0.8, actualRaUm: 0.8 });

    const replay = ledger.replaySample(64, { material: mat });
    expect(replay.length).toBe(1); // only the labeled one
    expect(replay[0].outcome?.kind).toBe("success");

    const s = ledger.stats({ material: mat });
    expect(s.total).toBe(2);
    expect(s.labeled).toBe(1);
    expect(s.pending).toBe(1);
    expect(s.successRate).toBe(1); // 1 of 1 labeled succeeded
  });

  it("stats successRate reflects mixed outcomes (1 success + 1 failure → 0.5)", () => {
    const mat = uniqMat();
    const idA = ledger.record({ operation: "thread", material: mat });
    const idB = ledger.record({ operation: "thread", material: mat });
    ledger.recordOutcome(idA, { kind: "success" });
    ledger.recordOutcome(idB, { kind: "failure", failureMode: "insert_chipped" });
    const s = ledger.stats({ material: mat });
    expect(s.labeled).toBe(2);
    expect(s.successRate).toBeCloseTo(0.5, 6);
  });

  it("query is lathe-scoped — a same-material MILL row recorded directly is EXCLUDED", () => {
    const mat = uniqMat();
    ledger.record({ operation: "face", material: mat }); // lathe row via the facade
    // foreign-process row with the SAME material, recorded straight into the shared store:
    crossProcessOutcomeStore.record({ bridge: "ai", process: "mill", request_summary: { material: mat } });
    const rows = ledger.query({ material: mat });
    expect(rows.length).toBe(1); // the mill row must NOT leak in (a no-op wrapper would return 2)
    expect(rows.every((r) => r.process === "lathe")).toBe(true);
  });
});

describe("LatheLoRAExperienceLedgerEngine — input validation (fail-loud, R12)", () => {
  it("record() throws on missing/empty operation", () => {
    expect(() => ledger.record({} as never)).toThrow(/operation/);
    expect(() => ledger.record({ operation: "" })).toThrow(/operation/);
  });
  it("recordOutcome() throws on empty id or invalid kind", () => {
    expect(() => ledger.recordOutcome("", { kind: "success" })).toThrow(/id/);
    expect(() => ledger.recordOutcome("x", { kind: "bogus" as never })).toThrow(/kind/);
  });
});

describe("LATHE-LORA-MS0/U-LLR-LEDGER — dispatcher + schema wiring", () => {
  const NEW_ACTIONS = [
    "lathe_lora_experience_record",
    "lathe_lora_experience_outcome",
    "lathe_lora_experience_query",
    "lathe_lora_experience_stats",
  ] as const;

  it("turningDispatcher source has an ACTIONS entry + case-block for each action", async () => {
    const src = await fsp.readFile(
      path.resolve(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"),
      "utf8",
    );
    for (const a of NEW_ACTIONS) {
      expect(src.includes(`case "${a}":`)).toBe(true);
      expect(src.includes(`"${a}",`)).toBe(true);
    }
  });

  it("each action has a schema with safeParse in TURNING_ACTION_SCHEMAS", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse?: unknown }>;
    for (const a of NEW_ACTIONS) expect(typeof m[a]?.safeParse).toBe("function");
  });

  it("record schema requires operation; outcome schema requires id + valid kind", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    expect(m.lathe_lora_experience_record!.safeParse({ operation: "od_rough" }).success).toBe(true);
    expect(m.lathe_lora_experience_record!.safeParse({}).success).toBe(false);
    expect(m.lathe_lora_experience_outcome!.safeParse({ id: "x", kind: "success" }).success).toBe(true);
    expect(m.lathe_lora_experience_outcome!.safeParse({ id: "x", kind: "bogus" }).success).toBe(false);
    expect(m.lathe_lora_experience_outcome!.safeParse({ kind: "success" }).success).toBe(false); // missing id
  });

  it("query/stats schemas accept {} but reject null", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    expect(m.lathe_lora_experience_query!.safeParse({}).success).toBe(true);
    expect(m.lathe_lora_experience_stats!.safeParse({}).success).toBe(true);
    expect(m.lathe_lora_experience_query!.safeParse(null).success).toBe(false);
  });
});
