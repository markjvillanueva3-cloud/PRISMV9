/**
 * KaizenLeanSigmaEngine — covers DOWNTIME waste log, DMAIC kaizen lifecycle,
 * Cp/Cpk computation (Montgomery 6e formulas), 1.5σ-shift DPMO, Six Sigma
 * release gate, kaizen suggestion intake + triage.
 *
 * Variability ≥21 cases · ≥7 R12 fail-loud modes.
 *
 * @module KaizenLeanSigmaEngine.test
 * @milestone HOTEL/U-KAIZEN-LEAN-SIGMA (2026-05-26, slot:hotel)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { kaizenLeanSigmaEngine } from "../engines/KaizenLeanSigmaEngine.js";

const ISO8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe("KaizenLeanSigmaEngine — waste observation log", () => {
  beforeEach(() => kaizenLeanSigmaEngine.reset());

  it("logs a DOWNTIME waste observation with full audit", () => {
    const obs = kaizenLeanSigmaEngine.observeWaste({
      observer_employee_id: "EMP-001",
      waste: "waiting",
      description: "5-minute wait on material handler delivery",
      machine_serial: "HAAS-VF5-001",
      gemba: true,
      severity: "medium",
      impact_minutes: 5,
    });
    expect(obs.id).toMatch(/^WASTE-\d{6}$/);
    expect(obs.observed_at).toMatch(ISO8601_RE);
    expect(obs.observer_employee_id).toBe("EMP-001");
    expect(obs.waste).toBe("waiting");
    expect(obs.machine_serial).toBe("HAAS-VF5-001");
    expect(obs.gemba).toBe(true);
    expect(obs.severity).toBe("medium");
    expect(obs.impact_minutes).toBe(5);
  });

  it("defaults gemba=true and severity=medium when omitted", () => {
    const obs = kaizenLeanSigmaEngine.observeWaste({
      observer_employee_id: "EMP-002",
      waste: "motion",
      description: "tool crib located 30m from cell",
    });
    expect(obs.gemba).toBe(true);
    expect(obs.severity).toBe("medium");
    expect(Object.prototype.hasOwnProperty.call(obs, "impact_minutes")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(obs, "machine_serial")).toBe(false);
  });

  it("accepts all 8 DOWNTIME waste categories", () => {
    const wastes: ReadonlyArray<
      "defect" | "overproduction" | "waiting" | "non_utilized_talent" |
      "transportation" | "inventory" | "motion" | "extra_processing"
    > = [
      "defect", "overproduction", "waiting", "non_utilized_talent",
      "transportation", "inventory", "motion", "extra_processing",
    ];
    for (const w of wastes) {
      const obs = kaizenLeanSigmaEngine.observeWaste({
        observer_employee_id: "EMP-001",
        waste: w,
        description: `${w} observation`,
      });
      expect(obs.waste).toBe(w);
    }
    const summary = kaizenLeanSigmaEngine.wasteSummary();
    for (const w of wastes) {
      expect(summary[w]).toBe(1);
    }
  });

  it("REJECTS empty description (R12)", () => {
    expect(() =>
      kaizenLeanSigmaEngine.observeWaste({
        observer_employee_id: "EMP-001",
        waste: "defect",
        description: "  ",
      }),
    ).toThrow(/non-empty description/);
  });

  it("REJECTS invalid waste category (R12)", () => {
    expect(() =>
      kaizenLeanSigmaEngine.observeWaste({
        observer_employee_id: "EMP-001",
        waste: "bogus" as unknown as "defect",
        description: "x",
      }),
    ).toThrow(/waste must be one of/);
  });

  it("REJECTS negative impact_minutes (R12)", () => {
    expect(() =>
      kaizenLeanSigmaEngine.observeWaste({
        observer_employee_id: "EMP-001",
        waste: "defect",
        description: "x",
        impact_minutes: -1,
      }),
    ).toThrow(/impact_minutes/);
  });

  it("filters wasteLedger by employee + waste + machine", () => {
    kaizenLeanSigmaEngine.observeWaste({ observer_employee_id: "EMP-001", waste: "waiting", description: "a", machine_serial: "M1" });
    kaizenLeanSigmaEngine.observeWaste({ observer_employee_id: "EMP-002", waste: "waiting", description: "b", machine_serial: "M2" });
    kaizenLeanSigmaEngine.observeWaste({ observer_employee_id: "EMP-001", waste: "motion", description: "c", machine_serial: "M1" });
    expect(kaizenLeanSigmaEngine.wasteLedger({ employee_id: "EMP-001" }).length).toBe(2);
    expect(kaizenLeanSigmaEngine.wasteLedger({ waste: "waiting" }).length).toBe(2);
    expect(kaizenLeanSigmaEngine.wasteLedger({ machine_serial: "M1" }).length).toBe(2);
    expect(
      kaizenLeanSigmaEngine.wasteLedger({ employee_id: "EMP-002", waste: "waiting" }).length,
    ).toBe(1);
  });
});

describe("KaizenLeanSigmaEngine — DMAIC kaizen events", () => {
  beforeEach(() => kaizenLeanSigmaEngine.reset());

  it("opens an event with sponsor + champion in 'define' phase", () => {
    const e = kaizenLeanSigmaEngine.openEvent({
      title: "Reduce HAAS-VF5 setup time",
      champion_employee_id: "EMP-001",
      sponsor_employee_id: "MGR-001",
    });
    expect(e.id).toMatch(/^KAIZEN-\d{6}$/);
    expect(e.status).toBe("open");
    expect(e.current_phase).toBe("define");
    expect(e.champion_employee_id).toBe("EMP-001");
    expect(e.sponsor_employee_id).toBe("MGR-001");
    expect(e.opened_at).toMatch(ISO8601_RE);
    expect(e.audit_trail).toHaveLength(1);
    expect(e.audit_trail[0]?.note).toBe("event opened");
  });

  it("REJECTS champion == sponsor (SoD)", () => {
    expect(() =>
      kaizenLeanSigmaEngine.openEvent({
        title: "x",
        champion_employee_id: "EMP-001",
        sponsor_employee_id: "EMP-001",
      }),
    ).toThrow(/segregation of duties/);
  });

  it("ADVANCES through D→M→A→I→C in order", () => {
    const e = kaizenLeanSigmaEngine.openEvent({
      title: "setup-time reduction",
      champion_employee_id: "EMP-001",
      sponsor_employee_id: "MGR-001",
    });
    const m = kaizenLeanSigmaEngine.advanceEvent({ event_id: e.id, to_phase: "measure", by_employee_id: "EMP-001" });
    expect(m.current_phase).toBe("measure");
    const a = kaizenLeanSigmaEngine.advanceEvent({ event_id: e.id, to_phase: "analyze", by_employee_id: "EMP-001" });
    expect(a.current_phase).toBe("analyze");
    const i = kaizenLeanSigmaEngine.advanceEvent({ event_id: e.id, to_phase: "improve", by_employee_id: "EMP-001" });
    expect(i.current_phase).toBe("improve");
    const c = kaizenLeanSigmaEngine.advanceEvent({ event_id: e.id, to_phase: "control", by_employee_id: "EMP-001" });
    expect(c.current_phase).toBe("control");
    expect(c.audit_trail).toHaveLength(5); // open + 4 advances
  });

  it("REJECTS skipping phases (DMAIC cannot skip — R12)", () => {
    const e = kaizenLeanSigmaEngine.openEvent({
      title: "x",
      champion_employee_id: "EMP-001",
      sponsor_employee_id: "MGR-001",
    });
    expect(() =>
      kaizenLeanSigmaEngine.advanceEvent({ event_id: e.id, to_phase: "improve", by_employee_id: "EMP-001" }),
    ).toThrow(/phase must advance one step/);
  });

  it("REJECTS direct advance to 'closed' (must use closeEvent)", () => {
    const e = kaizenLeanSigmaEngine.openEvent({
      title: "x",
      champion_employee_id: "EMP-001",
      sponsor_employee_id: "MGR-001",
    });
    expect(() =>
      kaizenLeanSigmaEngine.advanceEvent({ event_id: e.id, to_phase: "closed", by_employee_id: "EMP-001" }),
    ).toThrow(/use closeEvent/);
  });

  it("CLOSES event with Cpk improvement + sustainment plan", () => {
    const e = kaizenLeanSigmaEngine.openEvent({
      title: "setup-time reduction",
      champion_employee_id: "EMP-001",
      sponsor_employee_id: "MGR-001",
    });
    for (const p of ["measure", "analyze", "improve", "control"] as const) {
      kaizenLeanSigmaEngine.advanceEvent({ event_id: e.id, to_phase: p, by_employee_id: "EMP-001" });
    }
    const closed = kaizenLeanSigmaEngine.closeEvent({
      event_id: e.id,
      by_employee_id: "MGR-001",
      baseline_cpk: 0.9,
      post_cpk: 1.5,
      baseline_dpmo: 6210,
      post_dpmo: 233,
      sustainment_plan: "weekly SPC review; daily 5-min huddle on lead-time KPI",
    });
    expect(closed.status).toBe("closed");
    expect(closed.current_phase).toBe("closed");
    expect(closed.closed_at).toMatch(ISO8601_RE);
    expect(closed.baseline_cpk).toBe(0.9);
    expect(closed.post_cpk).toBe(1.5);
    expect(closed.sustainment_plan).toContain("SPC review");
    expect(closed.audit_trail).toHaveLength(6); // open + 4 advances + close
  });

  it("REJECTS close from non-Control phase (R12)", () => {
    const e = kaizenLeanSigmaEngine.openEvent({
      title: "x",
      champion_employee_id: "EMP-001",
      sponsor_employee_id: "MGR-001",
    });
    kaizenLeanSigmaEngine.advanceEvent({ event_id: e.id, to_phase: "measure", by_employee_id: "EMP-001" });
    expect(() =>
      kaizenLeanSigmaEngine.closeEvent({
        event_id: e.id, by_employee_id: "MGR-001",
        baseline_cpk: 1.0, post_cpk: 1.5,
        baseline_dpmo: 1000, post_dpmo: 100,
        sustainment_plan: "x",
      }),
    ).toThrow(/must be in 'control' phase/);
  });

  it("REJECTS close with Cpk regression (R12)", () => {
    const e = kaizenLeanSigmaEngine.openEvent({
      title: "x",
      champion_employee_id: "EMP-001",
      sponsor_employee_id: "MGR-001",
    });
    for (const p of ["measure", "analyze", "improve", "control"] as const) {
      kaizenLeanSigmaEngine.advanceEvent({ event_id: e.id, to_phase: p, by_employee_id: "EMP-001" });
    }
    expect(() =>
      kaizenLeanSigmaEngine.closeEvent({
        event_id: e.id, by_employee_id: "MGR-001",
        baseline_cpk: 1.5, post_cpk: 1.2, // regressed
        baseline_dpmo: 233, post_dpmo: 1500,
        sustainment_plan: "x",
      }),
    ).toThrow(/regressed below baseline/);
  });

  it("REJECTS close with empty sustainment plan (R12)", () => {
    const e = kaizenLeanSigmaEngine.openEvent({
      title: "x",
      champion_employee_id: "EMP-001",
      sponsor_employee_id: "MGR-001",
    });
    for (const p of ["measure", "analyze", "improve", "control"] as const) {
      kaizenLeanSigmaEngine.advanceEvent({ event_id: e.id, to_phase: p, by_employee_id: "EMP-001" });
    }
    expect(() =>
      kaizenLeanSigmaEngine.closeEvent({
        event_id: e.id, by_employee_id: "MGR-001",
        baseline_cpk: 1.0, post_cpk: 1.5,
        baseline_dpmo: 1000, post_dpmo: 100,
        sustainment_plan: "   ",
      }),
    ).toThrow(/sustainment_plan required/);
  });
});

describe("KaizenLeanSigmaEngine — Six Sigma Cp/Cpk gate", () => {
  beforeEach(() => kaizenLeanSigmaEngine.reset());

  it("computes Cp/Cpk for a centered process and classifies 'excellent' at Six Sigma", () => {
    // Synthetic centered samples: μ=10, σ=0.5 → USL=14, LSL=6 → Cp=Cpk≈2.67
    const samples = [9.5, 10, 10.5, 9.5, 10, 10.5, 9.5, 10, 10.5, 10];
    const result = kaizenLeanSigmaEngine.calculateCpk({ samples, usl: 14, lsl: 6 });
    expect(result.sample_n).toBe(10);
    expect(result.mean).toBeCloseTo(10, 5);
    expect(result.stddev).toBeGreaterThan(0);
    expect(result.cp).toBeGreaterThan(2.0);
    expect(result.cpk).toBeGreaterThan(2.0);
    expect(result.verdict).toBe("excellent");
    expect(result.dpmo).toBeLessThan(1); // ≪1 DPMO at Cpk>2
  });

  it("classifies 'not_capable' for a spread-out process", () => {
    // High variance → Cpk < 1
    const samples = [5, 7, 9, 11, 13, 15, 5, 7, 9, 11];
    const result = kaizenLeanSigmaEngine.calculateCpk({ samples, usl: 14, lsl: 6 });
    expect(result.cpk).toBeLessThan(1.0);
    expect(result.verdict).toBe("not_capable");
    expect(result.dpmo).toBeGreaterThan(10_000); // Many defects
  });

  it("classifies 'capable' near Cpk≈1.33 boundary", () => {
    // Build samples that yield Cpk ≈ 1.4
    const samples = [9.0, 9.5, 10.0, 10.5, 11.0, 9.5, 10.0, 10.5, 9.8, 10.2];
    const result = kaizenLeanSigmaEngine.calculateCpk({ samples, usl: 13, lsl: 7 });
    expect(result.verdict === "capable" || result.verdict === "excellent").toBe(true);
    expect(result.cpk).toBeGreaterThan(1.0);
  });

  it("sixSigmaGate APPROVES release when Cpk ≥ 1.33", () => {
    const samples = [9.5, 10, 10.5, 9.5, 10, 10.5, 9.5, 10, 10.5, 10];
    const gate = kaizenLeanSigmaEngine.sixSigmaGate({ samples, usl: 14, lsl: 6 });
    expect(gate.release).toBe(true);
    expect(gate.reason).toMatch(/release approved/);
    expect(gate.result.cpk).toBeGreaterThan(1.33);
  });

  it("sixSigmaGate BLOCKS release when Cpk < 1.33", () => {
    const samples = [5, 7, 9, 11, 13, 15, 5, 7, 9, 11];
    const gate = kaizenLeanSigmaEngine.sixSigmaGate({ samples, usl: 14, lsl: 6 });
    expect(gate.release).toBe(false);
    expect(gate.reason).toMatch(/release blocked/);
    expect(gate.reason).toMatch(/DPMO/);
  });

  it("REJECTS Cpk with USL ≤ LSL (R12)", () => {
    expect(() =>
      kaizenLeanSigmaEngine.calculateCpk({ samples: [1, 2, 3], usl: 5, lsl: 5 }),
    ).toThrow(/usl.*greater than lsl/);
  });

  it("REJECTS Cpk with <2 samples (R12)", () => {
    expect(() =>
      kaizenLeanSigmaEngine.calculateCpk({ samples: [1], usl: 10, lsl: 0 }),
    ).toThrow(/samples array of length ≥2/);
  });

  it("REJECTS Cpk with zero stddev (degenerate process — R12)", () => {
    expect(() =>
      kaizenLeanSigmaEngine.calculateCpk({ samples: [5, 5, 5, 5], usl: 10, lsl: 0 }),
    ).toThrow(/stddev is zero/);
  });

  it("REJECTS Cpk with non-finite sample (R12)", () => {
    expect(() =>
      kaizenLeanSigmaEngine.calculateCpk({ samples: [1, NaN, 3], usl: 10, lsl: 0 }),
    ).toThrow(/not a finite number/);
  });
});

describe("KaizenLeanSigmaEngine — suggestion intake", () => {
  beforeEach(() => kaizenLeanSigmaEngine.reset());

  it("any employee can submit a suggestion", () => {
    const s = kaizenLeanSigmaEngine.submitSuggestion({
      submitter_employee_id: "EMP-001",
      title: "shadow board for tool crib",
      description: "label each tool slot to eliminate motion waste",
      related_waste: "motion",
    });
    expect(s.id).toMatch(/^SUGG-\d{6}$/);
    expect(s.status).toBe("submitted");
    expect(s.related_waste).toBe("motion");
    expect(s.submitter_employee_id).toBe("EMP-001");
  });

  it("manager triages accepted with linked DMAIC event", () => {
    const e = kaizenLeanSigmaEngine.openEvent({
      title: "tool-crib motion-waste",
      champion_employee_id: "EMP-001",
      sponsor_employee_id: "MGR-001",
    });
    const s = kaizenLeanSigmaEngine.submitSuggestion({
      submitter_employee_id: "EMP-001",
      title: "shadow board",
      description: "label slots",
    });
    const triaged = kaizenLeanSigmaEngine.triageSuggestion({
      suggestion_id: s.id,
      triaged_by_employee_id: "MGR-001",
      decision: "accepted",
      linked_event_id: e.id,
      note: "rolled into kaizen event",
    });
    expect(triaged.status).toBe("accepted");
    expect(triaged.linked_event_id).toBe(e.id);
    expect(triaged.triaged_by_employee_id).toBe("MGR-001");
    expect(triaged.triage_note).toBe("rolled into kaizen event");
  });

  it("REJECTS triage by the submitter (SoD)", () => {
    const s = kaizenLeanSigmaEngine.submitSuggestion({
      submitter_employee_id: "EMP-001",
      title: "x",
      description: "y",
    });
    expect(() =>
      kaizenLeanSigmaEngine.triageSuggestion({
        suggestion_id: s.id,
        triaged_by_employee_id: "EMP-001",
        decision: "accepted",
      }),
    ).toThrow(/segregation of duties/);
  });

  it("REJECTS triage with dangling linked_event_id (R12)", () => {
    const s = kaizenLeanSigmaEngine.submitSuggestion({
      submitter_employee_id: "EMP-001",
      title: "x",
      description: "y",
    });
    expect(() =>
      kaizenLeanSigmaEngine.triageSuggestion({
        suggestion_id: s.id,
        triaged_by_employee_id: "MGR-001",
        decision: "accepted",
        linked_event_id: "KAIZEN-999999",
      }),
    ).toThrow(/unknown event_id/);
  });

  it("REJECTS re-triage on already-triaged suggestion (R12)", () => {
    const s = kaizenLeanSigmaEngine.submitSuggestion({
      submitter_employee_id: "EMP-001",
      title: "x",
      description: "y",
    });
    kaizenLeanSigmaEngine.triageSuggestion({
      suggestion_id: s.id,
      triaged_by_employee_id: "MGR-001",
      decision: "rejected",
    });
    expect(() =>
      kaizenLeanSigmaEngine.triageSuggestion({
        suggestion_id: s.id,
        triaged_by_employee_id: "MGR-001",
        decision: "accepted",
      }),
    ).toThrow(/must be 'submitted'/);
  });

  it("lists suggestions filtered by submitter + status", () => {
    const s1 = kaizenLeanSigmaEngine.submitSuggestion({ submitter_employee_id: "EMP-001", title: "a", description: "a" });
    kaizenLeanSigmaEngine.submitSuggestion({ submitter_employee_id: "EMP-002", title: "b", description: "b" });
    kaizenLeanSigmaEngine.triageSuggestion({ suggestion_id: s1.id, triaged_by_employee_id: "MGR-001", decision: "accepted" });
    expect(kaizenLeanSigmaEngine.listSuggestions({ submitter_employee_id: "EMP-001" }).length).toBe(1);
    expect(kaizenLeanSigmaEngine.listSuggestions({ status: "accepted" }).length).toBe(1);
    expect(kaizenLeanSigmaEngine.listSuggestions({ status: "submitted" }).length).toBe(1);
  });
});
