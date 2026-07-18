/**
 * CriticalPathSchedulingFormula.test.ts — hotel iter16.
 * Validates Kelley-Walker 1959 CPM forward/backward pass, slack
 * computation, critical-path reconstruction, cycle detection (hotel-soul),
 * R12 fail-loud across invalid inputs.
 */

import { describe, it, expect } from "vitest";
import { scheduleCriticalPath, type TaskInput } from "../algorithms/CriticalPathSchedulingFormula.js";

// ── Reference network: textbook example (Moder/Phillips/Davis Fig 4-1) ────
// A(2) → B(4) → D(3) → F(1)
//      \           ↗
//       C(7) → E(2)
const TEXTBOOK_NETWORK: TaskInput[] = [
  { id: "A", duration: 2 },
  { id: "B", duration: 4, predecessor_ids: ["A"] },
  { id: "C", duration: 7, predecessor_ids: ["A"] },
  { id: "D", duration: 3, predecessor_ids: ["B"] },
  { id: "E", duration: 2, predecessor_ids: ["C"] },
  { id: "F", duration: 1, predecessor_ids: ["D", "E"] },
];

describe("scheduleCriticalPath — textbook network (Moder/Phillips/Davis)", () => {
  it("computes project duration = 2 + 7 + 2 + 1 = 12 (longest path A→C→E→F)", () => {
    const r = scheduleCriticalPath(TEXTBOOK_NETWORK);
    expect(r.project_duration).toBe(12);
  });

  it("identifies critical path correctly: A → C → E → F", () => {
    const r = scheduleCriticalPath(TEXTBOOK_NETWORK);
    expect(r.critical_path).toEqual(["A", "C", "E", "F"]);
  });

  it("forward pass ES/EF for path A→C→E→F is correct", () => {
    const r = scheduleCriticalPath(TEXTBOOK_NETWORK);
    const byId = new Map(r.tasks.map(t => [t.id, t]));
    expect(byId.get("A")!.earliest_start).toBe(0);
    expect(byId.get("A")!.earliest_finish).toBe(2);
    expect(byId.get("C")!.earliest_start).toBe(2);
    expect(byId.get("C")!.earliest_finish).toBe(9);
    expect(byId.get("E")!.earliest_start).toBe(9);
    expect(byId.get("E")!.earliest_finish).toBe(11);
    expect(byId.get("F")!.earliest_start).toBe(11);
    expect(byId.get("F")!.earliest_finish).toBe(12);
  });

  it("backward pass LS/LF for non-critical B,D shows slack", () => {
    const r = scheduleCriticalPath(TEXTBOOK_NETWORK);
    const byId = new Map(r.tasks.map(t => [t.id, t]));
    // B (dur=4) feeds D; D (dur=3) feeds F. F LS = 11. So D LF = 11, D LS = 8.
    // B LF = 8, B LS = 4. B ES = 2 → slack = 4 - 2 = 2.
    expect(byId.get("B")!.total_slack).toBe(2);
    expect(byId.get("B")!.is_critical).toBe(false);
    expect(byId.get("D")!.total_slack).toBe(2);
    expect(byId.get("D")!.is_critical).toBe(false);
  });

  it("critical tasks have slack ≈ 0", () => {
    const r = scheduleCriticalPath(TEXTBOOK_NETWORK);
    for (const t of r.tasks) {
      if (t.is_critical) {
        expect(Math.abs(t.total_slack)).toBeLessThan(1e-6);
      }
    }
  });

  it("project_duration equals max EF across all tasks", () => {
    const r = scheduleCriticalPath(TEXTBOOK_NETWORK);
    const maxEf = Math.max(...r.tasks.map(t => t.earliest_finish));
    expect(r.project_duration).toBe(maxEf);
  });
});

describe("scheduleCriticalPath — graph integrity (hotel-soul cycle gate)", () => {
  it("detects 2-cycle: A→B, B→A", () => {
    expect(() => scheduleCriticalPath([
      { id: "A", duration: 1, predecessor_ids: ["B"] },
      { id: "B", duration: 1, predecessor_ids: ["A"] },
    ])).toThrow(/cycle detected/);
  });

  it("detects 3-cycle: A→B→C→A", () => {
    expect(() => scheduleCriticalPath([
      { id: "A", duration: 1, predecessor_ids: ["C"] },
      { id: "B", duration: 1, predecessor_ids: ["A"] },
      { id: "C", duration: 1, predecessor_ids: ["B"] },
    ])).toThrow(/cycle detected/);
  });

  it("rejects self-loop: A predecessor includes A", () => {
    expect(() => scheduleCriticalPath([
      { id: "A", duration: 1, predecessor_ids: ["A"] },
    ])).toThrow(/self-loop/);
  });
});

describe("scheduleCriticalPath — edge cases", () => {
  it("single task: project_duration = task duration; task is critical", () => {
    const r = scheduleCriticalPath([{ id: "SOLO", duration: 5 }]);
    expect(r.project_duration).toBe(5);
    expect(r.critical_path).toEqual(["SOLO"]);
    expect(r.tasks[0].is_critical).toBe(true);
  });

  it("two parallel chains: project_duration = max(chain durations)", () => {
    // Chain 1: A(3) → B(4)   = 7
    // Chain 2: C(2) → D(8)   = 10  ← critical
    const r = scheduleCriticalPath([
      { id: "A", duration: 3 },
      { id: "B", duration: 4, predecessor_ids: ["A"] },
      { id: "C", duration: 2 },
      { id: "D", duration: 8, predecessor_ids: ["C"] },
    ]);
    expect(r.project_duration).toBe(10);
    expect(r.critical_path).toEqual(["C", "D"]);
  });

  it("zero-duration task: schedulable, contributes 0 to path length", () => {
    const r = scheduleCriticalPath([
      { id: "A", duration: 5 },
      { id: "M", duration: 0, predecessor_ids: ["A"] },  // milestone
      { id: "B", duration: 3, predecessor_ids: ["M"] },
    ]);
    expect(r.project_duration).toBe(8);
  });

  it("topological_order respects precedence (predecessor always before successor)", () => {
    const r = scheduleCriticalPath(TEXTBOOK_NETWORK);
    const pos = new Map(r.topological_order.map((id, i) => [id, i]));
    for (const t of r.tasks) {
      for (const pid of t.predecessor_ids) {
        expect(pos.get(pid)!).toBeLessThan(pos.get(t.id)!);
      }
    }
  });

  it("successor_ids correctly populated (reverse edge index)", () => {
    const r = scheduleCriticalPath(TEXTBOOK_NETWORK);
    const byId = new Map(r.tasks.map(t => [t.id, t]));
    expect(byId.get("A")!.successor_ids).toEqual(["B", "C"]);  // A feeds B + C
    expect(byId.get("F")!.successor_ids).toEqual([]);          // F is terminal
  });
});

describe("scheduleCriticalPath — R12 fail-loud", () => {
  it("rejects empty task list", () => {
    expect(() => scheduleCriticalPath([])).toThrow(/empty/);
  });

  it("rejects unknown predecessor id", () => {
    expect(() => scheduleCriticalPath([
      { id: "A", duration: 1, predecessor_ids: ["GHOST"] },
    ])).toThrow(/unknown task 'GHOST'/);
  });

  it("rejects duplicate task id", () => {
    expect(() => scheduleCriticalPath([
      { id: "DUP", duration: 1 },
      { id: "DUP", duration: 2 },
    ])).toThrow(/duplicate id 'DUP'/);
  });

  it("rejects negative duration", () => {
    expect(() => scheduleCriticalPath([{ id: "A", duration: -1 }])).toThrow(/>= 0/);
  });

  it("rejects NaN duration", () => {
    expect(() => scheduleCriticalPath([{ id: "A", duration: NaN }])).toThrow(/finite/);
  });

  it("rejects empty id", () => {
    expect(() => scheduleCriticalPath([{ id: "", duration: 1 }])).toThrow(/non-empty/);
  });
});
