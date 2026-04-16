import { describe, it, expect } from "vitest";
import { capaWorkflowEngine } from "../engines/CAPAWorkflowEngine.js";

const NOW = "2026-04-16T00:00:00Z";

function recentDate(daysAgo: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

describe("CAPAWorkflowEngine", () => {
  it("opened state suggests investigating next", () => {
    const r = capaWorkflowEngine.evaluate({
      record: {
        id: "C1",
        opened_date: recentDate(1),
        source: "customer_complaint",
        description: "parts undersized",
        severity: "major",
        state: "opened",
        actions: [],
      },
      now: NOW,
    });
    expect(r.next_state).toBe("investigating");
  });

  it("opened > 7d without RCA → minor finding", () => {
    const r = capaWorkflowEngine.evaluate({
      record: {
        id: "C1",
        opened_date: recentDate(10),
        source: "internal_audit",
        description: "x",
        severity: "minor",
        state: "opened",
        actions: [],
      },
      now: NOW,
    });
    expect(r.findings.some((f) => f.message.includes("7d"))).toBe(true);
  });

  it("investigating with RCA → action_planned", () => {
    const r = capaWorkflowEngine.evaluate({
      record: {
        id: "C1",
        opened_date: recentDate(5),
        source: "customer_complaint",
        description: "x",
        severity: "major",
        state: "investigating",
        rca_technique: "5_why",
        root_cause: "fixture deflection",
        actions: [],
      },
      now: NOW,
    });
    expect(r.next_state).toBe("action_planned");
  });

  it("action_planned without owner flags major", () => {
    const r = capaWorkflowEngine.evaluate({
      record: {
        id: "C1",
        opened_date: recentDate(10),
        source: "customer_complaint",
        description: "x",
        severity: "major",
        state: "action_planned",
        rca_technique: "5_why",
        root_cause: "x",
        actions: [{ id: "A1", type: "corrective", description: "fix", owner: "", due_date: recentDate(-30) }],
      },
      now: NOW,
    });
    expect(r.findings.some((f) => f.message.includes("owner"))).toBe(true);
  });

  it("effectiveness check insufficient dwell", () => {
    const r = capaWorkflowEngine.evaluate({
      record: {
        id: "C1",
        opened_date: recentDate(40),
        source: "customer_complaint",
        description: "x",
        severity: "major",
        state: "effectiveness_check",
        rca_technique: "5_why",
        root_cause: "x",
        actions: [{ id: "A1", type: "corrective", description: "fix", owner: "Bob", completed_date: recentDate(10) }],
        effectiveness: {
          method: "NCR count",
          baseline_metric: 10,
          post_action_metric: 2,
          target_reduction_pct: 50,
          dwell_days: 10,
        },
      },
      now: NOW,
      min_dwell_days: 30,
    });
    expect(r.effectiveness_verdict).toBe("insufficient_dwell");
  });

  it("effective verdict allows close", () => {
    const r = capaWorkflowEngine.evaluate({
      record: {
        id: "C1",
        opened_date: recentDate(60),
        source: "customer_complaint",
        description: "x",
        severity: "major",
        state: "effectiveness_check",
        rca_technique: "5_why",
        root_cause: "x",
        actions: [{ id: "A1", type: "corrective", description: "fix", owner: "Bob", completed_date: recentDate(30), due_date: recentDate(40) }],
        effectiveness: {
          method: "NCR count",
          baseline_metric: 10,
          post_action_metric: 2,
          target_reduction_pct: 50,
          dwell_days: 30,
        },
      },
      now: NOW,
      min_dwell_days: 30,
    });
    expect(r.effectiveness_verdict).toBe("effective");
    expect(r.next_state).toBe("closed");
    expect(r.ready_to_close).toBe(true);
  });

  it("ineffective verdict → escalated", () => {
    const r = capaWorkflowEngine.evaluate({
      record: {
        id: "C1",
        opened_date: recentDate(60),
        source: "customer_complaint",
        description: "x",
        severity: "major",
        state: "effectiveness_check",
        rca_technique: "5_why",
        root_cause: "x",
        actions: [{ id: "A1", type: "corrective", description: "fix", owner: "Bob", completed_date: recentDate(30) }],
        effectiveness: {
          method: "NCR count",
          baseline_metric: 10,
          post_action_metric: 9,
          target_reduction_pct: 50,
          dwell_days: 30,
        },
      },
      now: NOW,
    });
    expect(r.effectiveness_verdict).toBe("ineffective");
    expect(r.next_state).toBe("escalated");
  });

  it("overdue actions listed", () => {
    const r = capaWorkflowEngine.evaluate({
      record: {
        id: "C1",
        opened_date: recentDate(10),
        source: "customer_complaint",
        description: "x",
        severity: "major",
        state: "action_planned",
        rca_technique: "5_why",
        root_cause: "x",
        actions: [{ id: "A1", type: "corrective", description: "fix", owner: "Bob", due_date: recentDate(2) }],
      },
      now: NOW,
    });
    expect(r.overdue_actions).toContain("A1");
  });

  it("regulatory reportable > 30d critical", () => {
    const r = capaWorkflowEngine.evaluate({
      record: {
        id: "C1",
        opened_date: recentDate(35),
        source: "customer_complaint",
        description: "x",
        severity: "critical",
        state: "investigating",
        actions: [],
        regulatory_reportable: true,
      },
      now: NOW,
    });
    expect(r.findings.some((f) => f.severity === "critical" && f.message.includes("MDR"))).toBe(true);
  });

  it("CAPA > 3× overdue_escalate_days flagged critical", () => {
    const r = capaWorkflowEngine.evaluate({
      record: {
        id: "C1",
        opened_date: recentDate(100),
        source: "customer_complaint",
        description: "x",
        severity: "major",
        state: "investigating",
        actions: [],
      },
      now: NOW,
      overdue_escalate_days: 30,
    });
    expect(r.findings.some((f) => f.severity === "critical" && f.message.includes("escalation"))).toBe(true);
  });

  it("effectiveness_check without measurement → not_measured", () => {
    const r = capaWorkflowEngine.evaluate({
      record: {
        id: "C1",
        opened_date: recentDate(60),
        source: "customer_complaint",
        description: "x",
        severity: "major",
        state: "effectiveness_check",
        rca_technique: "5_why",
        root_cause: "x",
        actions: [{ id: "A1", type: "corrective", description: "fix", owner: "Bob", completed_date: recentDate(30) }],
      },
      now: NOW,
    });
    expect(r.effectiveness_verdict).toBe("not_measured");
  });

  it("getStats returns all states", () => {
    const s = capaWorkflowEngine.getStats();
    expect(s.states).toContain("opened");
    expect(s.states).toContain("closed");
    expect(s.reference).toMatch(/820\.100/);
  });
});
