import { describe, it, expect } from "vitest";
import { processValidationIQOQPQEngine } from "../engines/ProcessValidationIQOQPQEngine.js";

describe("ProcessValidationIQOQPQEngine", () => {
  it("validates fully when IQ OQ PQ all pass", () => {
    const r = processValidationIQOQPQEngine.validate({
      process_name: "Lathe OP10",
      iq_items: [
        { id: "IQ1", description: "install", status: "pass" },
        { id: "IQ2", description: "utilities", status: "pass" },
      ],
      oq_runs: [
        { run_id: "O1", condition: "nominal", pass: true },
        { run_id: "O2", condition: "nominal", pass: true },
        { run_id: "O3", condition: "nominal", pass: true },
      ],
      pq_runs: [
        { run_id: "P1", nominal: true, ctq: { D: 10.000 }, spec: { D: [9.98, 10.02] } },
        { run_id: "P2", nominal: true, ctq: { D: 10.001 }, spec: { D: [9.98, 10.02] } },
        { run_id: "P3", nominal: true, ctq: { D: 9.999 }, spec: { D: [9.98, 10.02] } },
        { run_id: "P4", nominal: true, ctq: { D: 10.000 }, spec: { D: [9.98, 10.02] } },
        { run_id: "P5", nominal: true, ctq: { D: 10.001 }, spec: { D: [9.98, 10.02] } },
      ],
    });
    expect(r.iq.pass).toBe(true);
    expect(r.oq.pass).toBe(true);
    expect(r.pq.pass).toBe(true);
    expect(r.overall_validated).toBe(true);
  });

  it("IQ fails when any item is fail", () => {
    const r = processValidationIQOQPQEngine.validate({
      process_name: "X",
      iq_items: [
        { id: "IQ1", description: "x", status: "pass" },
        { id: "IQ2", description: "y", status: "fail" },
      ],
      oq_runs: [],
      pq_runs: [],
    });
    expect(r.iq.pass).toBe(false);
    expect(r.iq.failed_items).toContain("IQ2");
  });

  it("OQ fails with insufficient replicates", () => {
    const r = processValidationIQOQPQEngine.validate({
      process_name: "X",
      iq_items: [{ id: "IQ1", description: "x", status: "pass" }],
      oq_runs: [
        { run_id: "O1", condition: "nominal", pass: true },
        // only 1 run at this condition, need 3
      ],
      pq_runs: [],
    });
    expect(r.oq.pass).toBe(false);
    expect(r.oq.insufficient_replicates).toContain("nominal");
  });

  it("OQ fails when any condition has a failed run", () => {
    const r = processValidationIQOQPQEngine.validate({
      process_name: "X",
      iq_items: [{ id: "IQ1", description: "x", status: "pass" }],
      oq_runs: [
        { run_id: "O1", condition: "high", pass: true },
        { run_id: "O2", condition: "high", pass: true },
        { run_id: "O3", condition: "high", pass: false },
      ],
      pq_runs: [],
    });
    expect(r.oq.pass).toBe(false);
    expect(r.oq.conditions_passed).toBe(0);
  });

  it("PQ fails without 3 consecutive passes", () => {
    const r = processValidationIQOQPQEngine.validate({
      process_name: "X",
      iq_items: [{ id: "IQ1", description: "x", status: "pass" }],
      oq_runs: [
        { run_id: "O1", condition: "n", pass: true },
        { run_id: "O2", condition: "n", pass: true },
        { run_id: "O3", condition: "n", pass: true },
      ],
      pq_runs: [
        { run_id: "P1", nominal: true, ctq: { D: 10 }, spec: { D: [9.98, 10.02] } },
        { run_id: "P2", nominal: true, ctq: { D: 11 }, spec: { D: [9.98, 10.02] } }, // fail
        { run_id: "P3", nominal: true, ctq: { D: 10 }, spec: { D: [9.98, 10.02] } },
      ],
    });
    expect(r.pq.pass).toBe(false);
    expect(r.pq.consecutive_pass_count).toBeLessThan(3);
  });

  it("Cpk below target flags CTQ failure", () => {
    const r = processValidationIQOQPQEngine.validate({
      process_name: "X",
      iq_items: [{ id: "IQ1", description: "x", status: "pass" }],
      oq_runs: [
        { run_id: "O1", condition: "n", pass: true },
        { run_id: "O2", condition: "n", pass: true },
        { run_id: "O3", condition: "n", pass: true },
      ],
      pq_runs: Array.from({ length: 5 }, (_, i) => ({
        run_id: `P${i}`,
        nominal: true,
        ctq: { D: 10 + (i % 2) * 0.05 }, // high sigma
        spec: { D: [9.95, 10.10] as [number, number] },
      })),
      target_cpk: 1.33,
    });
    expect(r.pq.cpk_estimates["D"]).toBeDefined();
  });

  it("not_applicable IQ items excluded from denominator", () => {
    const r = processValidationIQOQPQEngine.validate({
      process_name: "X",
      iq_items: [
        { id: "IQ1", description: "x", status: "pass" },
        { id: "IQ2", description: "y", status: "not_applicable" },
      ],
      oq_runs: [],
      pq_runs: [],
    });
    expect(r.iq.pass).toBe(true);
    expect(r.iq.na_items).toContain("IQ2");
  });

  it("next_step guides IQ remediation first", () => {
    const r = processValidationIQOQPQEngine.validate({
      process_name: "X",
      iq_items: [{ id: "IQ1", description: "x", status: "fail" }],
      oq_runs: [],
      pq_runs: [],
    });
    expect(r.next_step).toMatch(/IQ/);
  });

  it("next_step guides OQ when IQ passes", () => {
    const r = processValidationIQOQPQEngine.validate({
      process_name: "X",
      iq_items: [{ id: "IQ1", description: "x", status: "pass" }],
      oq_runs: [], // zero conditions tested
      pq_runs: [],
    });
    expect(r.next_step).toMatch(/OQ/);
  });

  it("PQ min runs configurable", () => {
    const r = processValidationIQOQPQEngine.validate({
      process_name: "X",
      iq_items: [{ id: "IQ1", description: "x", status: "pass" }],
      oq_runs: [
        { run_id: "O1", condition: "n", pass: true },
      ],
      min_oq_replicates: 1,
      pq_runs: [
        { run_id: "P1", nominal: true, ctq: { D: 10 }, spec: { D: [9.9, 10.1] } },
        { run_id: "P2", nominal: true, ctq: { D: 10.05 }, spec: { D: [9.9, 10.1] } },
      ],
      min_pq_runs: 2,
    });
    expect(r.pq.consecutive_pass_count).toBeGreaterThanOrEqual(2);
  });

  it("getStats returns 4 stages", () => {
    const s = processValidationIQOQPQEngine.getStats();
    expect(s.stages.length).toBe(4);
    expect(s.reference).toMatch(/FDA/);
  });
});
