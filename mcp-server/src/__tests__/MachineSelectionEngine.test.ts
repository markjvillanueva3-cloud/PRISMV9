/**
 * MachineSelectionEngine.test.ts (slot:oscar 2026-06-27)
 *
 * Real-behavior coverage for the machine recommend/compare/validate surface. Tests are written as INVARIANTS
 * (sorted-by-score, score-clamped-[0,100], candidate-shape, validate flag semantics) rather than hard-coded
 * fallback machine ids, because getMachines() returns the service-loaded set when available and the inline
 * FALLBACK_MACHINES otherwise -- so a real machine id is derived from recommend() at runtime and reused. These
 * encode WHY the engine matters: recommend must rank, validate must flag each capability axis (travel / spindle
 * / accuracy / axes) independently, and an unknown machine must fail closed.
 */
import { describe, it, expect } from "vitest";
import { machineSelectionEngine } from "../engines/MachineSelectionEngine.js";

const baseReq = { part_envelope_mm: { x: 100, y: 100, z: 100 } };
const candidates = machineSelectionEngine.recommend(baseReq);
const realId = candidates[0].machine_id;

describe("MachineSelectionEngine.recommend -- ranking invariants", () => {
  it("returns a non-empty candidate list (the machine set is never empty)", () => {
    expect(Array.isArray(candidates)).toBe(true);
    expect(candidates.length).toBeGreaterThan(0);
  });

  it("returns at most 5 candidates (top-N slice)", () => {
    expect(candidates.length).toBeLessThanOrEqual(5);
  });

  it("sorts candidates by score descending", () => {
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i - 1].score).toBeGreaterThanOrEqual(candidates[i].score);
    }
  });

  it("clamps every score to [0,100]", () => {
    for (const c of candidates) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
    }
  });

  it("populates the full candidate shape (string id, spindle.power_kW, rationale array)", () => {
    const c = candidates[0];
    expect(typeof c.machine_id).toBe("string");
    expect(c.spindle).toHaveProperty("power_kW");
    expect(Array.isArray(c.rationale)).toBe(true);
  });

  it("claims 5-axis rationale ONLY for candidates that truly validate as 5-axis-capable", () => {
    const fiveAxisReq = { part_envelope_mm: { x: 100, y: 100, z: 100 }, needs_5th_axis: true };
    const recs = machineSelectionEngine.recommend(fiveAxisReq);
    for (const c of recs) {
      if (c.rationale.some((r: string) => /5-axis/i.test(r))) {
        expect(machineSelectionEngine.validate(c.machine_id, fiveAxisReq).axes_ok).toBe(true);
      }
    }
  });
});

describe("MachineSelectionEngine.validate -- per-axis suitability flags", () => {
  it("fails closed for an unknown machine id (suitable=false, 'Machine not found', flags false)", () => {
    const v = machineSelectionEngine.validate("__definitely_not_a_machine__", baseReq);
    expect(v.suitable).toBe(false);
    expect(v.issues).toContain("Machine not found");
    expect(v.travel_ok).toBe(false);
    expect(v.axes_ok).toBe(false);
  });

  it("flags travel_ok=false when the part envelope exceeds every machine's travel", () => {
    const v = machineSelectionEngine.validate(realId, { part_envelope_mm: { x: 99999, y: 99999, z: 99999 } });
    expect(v.travel_ok).toBe(false);
    expect(v.issues).toContain("Travel envelope insufficient");
  });

  it("flags spindle_ok=false when required rpm exceeds the machine max", () => {
    const v = machineSelectionEngine.validate(realId, { ...baseReq, part_envelope_mm: { x: 0, y: 0, z: 0 }, min_spindle_rpm: 999999 });
    expect(v.spindle_ok).toBe(false);
  });

  it("flags accuracy_ok=false when a tighter accuracy than any machine offers is required", () => {
    const v = machineSelectionEngine.validate(realId, { ...baseReq, part_envelope_mm: { x: 0, y: 0, z: 0 }, required_accuracy_mm: 0.0001 });
    expect(v.accuracy_ok).toBe(false);
  });

  it("leaves spindle/accuracy flags true when the requirement is absent", () => {
    const v = machineSelectionEngine.validate(realId, { part_envelope_mm: { x: 0, y: 0, z: 0 } });
    expect(v.spindle_ok).toBe(true);
    expect(v.accuracy_ok).toBe(true);
  });
});

describe("MachineSelectionEngine.compare -- side-by-side", () => {
  it("returns machines + best_match + the canonical comparison_factors", () => {
    const res = machineSelectionEngine.compare([realId]);
    expect(res.machines).toHaveLength(1);
    expect(typeof res.best_match).toBe("string");
    expect(res.comparison_factors).toContain("travel");
  });

  it("falls back to the first machine for an unknown id (no crash) -- matches the lone-unknown fallback", () => {
    const fallbackId = machineSelectionEngine.compare(["__none__"]).machines[0].machine_id;
    const res = machineSelectionEngine.compare([realId, "__none__"]);
    expect(res.machines).toHaveLength(2);
    expect(res.machines[1].machine_id).toBe(fallbackId);
  });
});
