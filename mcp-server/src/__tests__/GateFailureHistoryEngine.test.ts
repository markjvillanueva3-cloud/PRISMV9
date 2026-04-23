/**
 * GateFailureHistoryEngine — dedicated per-engine test file (U-FORE-06 helper).
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  GateFailureHistoryEngine,
  gateFailureHistoryEngine,
} from "../engines/GateFailureHistoryEngine.js";

function fresh(): GateFailureHistoryEngine {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gfh-"));
  return new GateFailureHistoryEngine(path.join(tmp, "GATE_HISTORY.jsonl"));
}

describe("GateFailureHistoryEngine — append-only history", () => {
  it("exports a singleton with correct name", () => {
    expect(gateFailureHistoryEngine).toBeInstanceOf(GateFailureHistoryEngine);
    expect(gateFailureHistoryEngine.name).toBe("GateFailureHistoryEngine");
  });

  it("record + all round-trips one event", () => {
    const h = fresh();
    h.record({ unitId: "U1", unitClass: "engine", gate: "sx_gate", outcome: "fail" });
    const all = h.all();
    expect(all).toHaveLength(1);
    expect(all[0].unitId).toBe("U1");
  });

  it("aggregates counts failures and total per (class, gate)", () => {
    const h = fresh();
    for (let i = 0; i < 10; i++) {
      h.record({
        unitId: `U${i}`,
        unitClass: "engine",
        gate: "sx_gate",
        outcome: i < 4 ? "fail" : "pass",
      });
    }
    const aggs = h.aggregates();
    const eng = aggs.find((a) => a.unitClass === "engine" && a.gate === "sx_gate");
    expect(eng!.total).toBe(10);
    expect(eng!.failures).toBe(4);
    expect(eng!.failureRate).toBeCloseTo(0.4, 2);
  });

  it("summary totals across classes+gates", () => {
    const h = fresh();
    h.record({ unitId: "A", unitClass: "engine", gate: "sx_gate", outcome: "pass" });
    h.record({ unitId: "B", unitClass: "dispatcher", gate: "test_legitimacy", outcome: "fail" });
    const s = h.summary();
    expect(s.total).toBe(2);
    expect(s.failures).toBe(1);
    expect(s.classes).toBe(2);
    expect(s.gates).toBe(2);
  });

  it("calibration: Brier 0 for perfect predictions", () => {
    const h = fresh();
    for (let i = 0; i < 10; i++) {
      h.record({
        unitId: `U${i}`,
        unitClass: "engine",
        gate: "sx_gate",
        outcome: i % 2 === 0 ? "fail" : "pass",
        predicted: i % 2 === 0 ? 1 : 0,
      });
    }
    expect(h.calibration().brier).toBeCloseTo(0, 3);
  });

  it("calibration: Brier 0.25 for random predictions on 50/50 outcomes", () => {
    const h = fresh();
    for (let i = 0; i < 20; i++) {
      h.record({
        unitId: `U${i}`,
        unitClass: "engine",
        gate: "sx_gate",
        outcome: i % 2 === 0 ? "fail" : "pass",
        predicted: 0.5,
      });
    }
    expect(h.calibration().brier).toBeCloseTo(0.25, 2);
  });

  it("reset() clears the log", () => {
    const h = fresh();
    h.record({ unitId: "X", unitClass: "engine", gate: "sx_gate", outcome: "fail" });
    h.reset();
    expect(h.all()).toEqual([]);
  });

  it("all() tolerates malformed JSONL rows", () => {
    const h = fresh();
    h.record({ unitId: "X", unitClass: "engine", gate: "sx_gate", outcome: "pass" });
    const logPath = (h as any).logPath as string;
    fs.appendFileSync(logPath, "\nnot-json\n{broken\n", "utf-8");
    expect(h.all().length).toBe(1);
  });

  it("FAIL: missing unitClass throws", () => {
    const h = fresh();
    expect(() =>
      h.record({ unitId: "U", gate: "sx_gate", outcome: "pass" } as any)
    ).toThrow(/unitClass required/);
  });

  it("FAIL: invalid outcome throws", () => {
    const h = fresh();
    expect(() =>
      h.record({ unitId: "U", unitClass: "engine", gate: "sx_gate", outcome: "maybe" as any })
    ).toThrow(/pass or fail/);
  });

  it("FAIL: missing gate throws", () => {
    const h = fresh();
    expect(() =>
      h.record({ unitId: "U", unitClass: "engine", outcome: "pass" } as any)
    ).toThrow(/gate required/);
  });

  it("ADV: empty log → aggregates returns []", () => {
    const h = fresh();
    expect(h.aggregates()).toEqual([]);
    expect(h.calibration().count).toBe(0);
  });
});
