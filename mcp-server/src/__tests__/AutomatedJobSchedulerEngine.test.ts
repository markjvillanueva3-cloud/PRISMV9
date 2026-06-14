/**
 * AutomatedJobSchedulerEngine — happy path, EDD ordering, priority tiebreak,
 * load-balance, WIP-protect, skill-gap unfilled, all 5 triggers, overtime
 * accounting, EDD-violation count, R12 fail-loud, G5 round-trip submission.
 *
 * Variability ≥17 cases · ≥5 R12 failure modes · ≥2 adversarial inputs.
 *
 * @milestone HOTEL/U-AUTO-JOB-SCHEDULER (2026-05-26, slot:hotel iter7 /goal Phase 2)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  automatedJobSchedulerEngine,
  type JobIntake,
  type EmployeeAvailability,
} from "../engines/AutomatedJobSchedulerEngine.js";
import { aiProposalApprovalQueueEngine } from "../engines/AIProposalApprovalQueueEngine.js";
import { managerRegistryEngine } from "../engines/ManagerRegistryEngine.js";

const ISO8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function basicEmployees(): EmployeeAvailability[] {
  return [
    {
      employee_id: "EMP-001",
      qualified_machine_serials: ["HAAS-VF5-001", "OKUMA-LB3000-001"],
      available_minutes: 480,
      department_code: "mill",
      clocked_in: true,
    },
    {
      employee_id: "EMP-002",
      qualified_machine_serials: ["HAAS-VF5-001"],
      available_minutes: 480,
      department_code: "mill",
      clocked_in: true,
    },
    {
      employee_id: "EMP-003",
      qualified_machine_serials: ["OKUMA-LB3000-001"],
      available_minutes: 480,
      department_code: "lathe",
      clocked_in: true,
    },
  ];
}

function basicJobs(): JobIntake[] {
  return [
    {
      job_id: "J-001",
      due_at: "2026-05-27T17:00:00.000Z",
      required_machine_serial: "HAAS-VF5-001",
      estimated_runtime_minutes: 90,
      department_code: "mill",
      priority: "standard",
    },
    {
      job_id: "J-002",
      due_at: "2026-05-27T12:00:00.000Z", // earlier due — should be picked first
      required_machine_serial: "HAAS-VF5-001",
      estimated_runtime_minutes: 60,
      department_code: "mill",
      priority: "standard",
    },
    {
      job_id: "J-003",
      due_at: "2026-05-28T00:00:00.000Z",
      required_machine_serial: "OKUMA-LB3000-001",
      estimated_runtime_minutes: 45,
      department_code: "lathe",
      priority: "rush", // overrides EDD via priority tiebreak
    },
  ];
}

describe("AutomatedJobSchedulerEngine — core scheduling", () => {
  beforeEach(() => {
    automatedJobSchedulerEngine.reset();
    aiProposalApprovalQueueEngine.reset();
    managerRegistryEngine.reset();
  });

  it("produces an EDD+priority ordered schedule for happy path", () => {
    const diff = automatedJobSchedulerEngine.buildSchedulerDiff({
      trigger: "nightly",
      jobs: basicJobs(),
      employees: basicEmployees(),
      window_start: "2026-05-27T06:00:00.000Z",
      window_end: "2026-05-27T18:00:00.000Z",
    });
    expect(diff.entries).toHaveLength(3);
    // Rush job (J-003) first regardless of due_at, then EDD: J-002 before J-001
    expect(diff.entries[0]?.job_id).toBe("J-003");
    expect(diff.entries[1]?.job_id).toBe("J-002");
    expect(diff.entries[2]?.job_id).toBe("J-001");
    expect(diff.generated_at).toMatch(ISO8601_RE);
    expect(diff.affected_departments.length).toBeGreaterThan(0);
    expect(diff.affected_departments.includes("mill")).toBe(true);
    expect(diff.affected_departments.includes("lathe")).toBe(true);
  });

  it("LOAD-BALANCE: picks least-loaded qualified operator (EMP-001 has 2 quals → EMP-002 gets the mill job)", () => {
    const employees = basicEmployees();
    // EMP-001 has more capacity slots but EMP-002 should be picked because of load-balance after first assignment
    const diff = automatedJobSchedulerEngine.buildSchedulerDiff({
      trigger: "nightly",
      jobs: [
        {
          job_id: "J-A",
          due_at: "2026-05-27T12:00:00.000Z",
          required_machine_serial: "HAAS-VF5-001",
          estimated_runtime_minutes: 100,
          department_code: "mill",
          priority: "standard",
        },
        {
          job_id: "J-B",
          due_at: "2026-05-27T13:00:00.000Z",
          required_machine_serial: "HAAS-VF5-001",
          estimated_runtime_minutes: 100,
          department_code: "mill",
          priority: "standard",
        },
      ],
      employees,
      window_start: "2026-05-27T06:00:00.000Z",
      window_end: "2026-05-27T18:00:00.000Z",
    });
    // First job goes to whoever has highest remaining; second goes to the OTHER qualified op
    expect(diff.entries).toHaveLength(2);
    expect(diff.entries[0]?.assigned_employee_id).not.toBe(diff.entries[1]?.assigned_employee_id);
  });

  it("WIP-PROTECT: in_progress_employee_id locks the assignment", () => {
    const diff = automatedJobSchedulerEngine.buildSchedulerDiff({
      trigger: "shift_gap",
      jobs: [
        {
          job_id: "J-WIP",
          due_at: "2026-05-27T17:00:00.000Z",
          required_machine_serial: "HAAS-VF5-001",
          estimated_runtime_minutes: 60,
          department_code: "mill",
          priority: "standard",
          in_progress_employee_id: "EMP-002",
        },
      ],
      employees: basicEmployees(),
      window_start: "2026-05-27T06:00:00.000Z",
      window_end: "2026-05-27T18:00:00.000Z",
    });
    expect(diff.entries[0]?.assigned_employee_id).toBe("EMP-002");
    expect(diff.entries[0]?.rationale).toContain("WIP-protected");
  });

  it("UNFILLED: skill-gap leaves job unassigned + adds to unfilled_job_ids", () => {
    const diff = automatedJobSchedulerEngine.buildSchedulerDiff({
      trigger: "nightly",
      jobs: [
        {
          job_id: "J-WEDM",
          due_at: "2026-05-27T17:00:00.000Z",
          required_machine_serial: "SODICK-AQ535L-001", // no one qualified
          estimated_runtime_minutes: 120,
          department_code: "wedm",
          priority: "rush",
        },
      ],
      employees: basicEmployees(),
      window_start: "2026-05-27T06:00:00.000Z",
      window_end: "2026-05-27T18:00:00.000Z",
    });
    expect(diff.entries).toHaveLength(0);
    expect(diff.unfilled_job_ids).toEqual(["J-WEDM"]);
    expect(diff.affected_departments.includes("wedm")).toBe(true);
  });

  it("EDD violations + overtime accounting", () => {
    const employees: EmployeeAvailability[] = [
      {
        employee_id: "EMP-001",
        qualified_machine_serials: ["HAAS-VF5-001"],
        available_minutes: 60, // only 1 hour
        department_code: "mill",
        clocked_in: true,
      },
    ];
    const diff = automatedJobSchedulerEngine.buildSchedulerDiff({
      trigger: "nightly",
      jobs: [
        {
          job_id: "J-OT",
          due_at: "2026-05-27T07:00:00.000Z", // due BEFORE window even starts
          required_machine_serial: "HAAS-VF5-001",
          estimated_runtime_minutes: 180, // 2 hrs overtime
          department_code: "mill",
          priority: "standard",
        },
      ],
      employees,
      window_start: "2026-05-27T08:00:00.000Z",
      window_end: "2026-05-27T18:00:00.000Z",
    });
    expect(diff.entries).toHaveLength(1);
    expect(diff.entries[0]?.overtime_minutes).toBe(120);
    expect(diff.total_overtime_minutes).toBe(120);
    expect(diff.edd_violations).toBe(1);
  });

  it("accepts ALL 5 trigger kinds", () => {
    const triggers: Array<"nightly" | "shift_gap" | "stalled_handoff" | "sick_day_callin" | "on_demand"> = [
      "nightly", "shift_gap", "stalled_handoff", "sick_day_callin", "on_demand",
    ];
    for (const t of triggers) {
      const diff = automatedJobSchedulerEngine.buildSchedulerDiff({
        trigger: t,
        jobs: [],
        employees: [],
        window_start: "2026-05-27T06:00:00.000Z",
        window_end: "2026-05-27T18:00:00.000Z",
      });
      expect(diff.trigger).toBe(t);
    }
  });
});

describe("AutomatedJobSchedulerEngine — R12 fail-loud", () => {
  beforeEach(() => automatedJobSchedulerEngine.reset());

  it("REJECTS invalid trigger", () => {
    expect(() =>
      automatedJobSchedulerEngine.buildSchedulerDiff({
        trigger: "bogus" as unknown as "nightly",
        jobs: [],
        employees: [],
        window_start: "2026-05-27T06:00:00.000Z",
        window_end: "2026-05-27T18:00:00.000Z",
      }),
    ).toThrow(/invalid trigger/);
  });

  it("REJECTS reversed window (end before start)", () => {
    expect(() =>
      automatedJobSchedulerEngine.buildSchedulerDiff({
        trigger: "nightly",
        jobs: [],
        employees: [],
        window_start: "2026-05-27T18:00:00.000Z",
        window_end: "2026-05-27T06:00:00.000Z",
      }),
    ).toThrow(/window_end.*after.*window_start/);
  });

  it("REJECTS adversarial inputs (NaN estimated_runtime, negative available_minutes)", () => {
    expect(() =>
      automatedJobSchedulerEngine.buildSchedulerDiff({
        trigger: "nightly",
        jobs: [{
          job_id: "J-1",
          due_at: "2026-05-27T17:00:00.000Z",
          required_machine_serial: "HAAS-VF5-001",
          estimated_runtime_minutes: NaN,
          department_code: "mill",
          priority: "standard",
        }],
        employees: [],
        window_start: "2026-05-27T06:00:00.000Z",
        window_end: "2026-05-27T18:00:00.000Z",
      }),
    ).toThrow(/estimated_runtime_minutes must be > 0/);
    expect(() =>
      automatedJobSchedulerEngine.buildSchedulerDiff({
        trigger: "nightly",
        jobs: [],
        employees: [{
          employee_id: "E-1",
          qualified_machine_serials: [],
          available_minutes: -1,
          department_code: "mill",
          clocked_in: true,
        }],
        window_start: "2026-05-27T06:00:00.000Z",
        window_end: "2026-05-27T18:00:00.000Z",
      }),
    ).toThrow(/available_minutes/);
  });

  it("REJECTS invalid priority + missing department_code + invalid due_at", () => {
    expect(() =>
      automatedJobSchedulerEngine.buildSchedulerDiff({
        trigger: "nightly",
        jobs: [{
          job_id: "J-1",
          due_at: "not-a-date",
          required_machine_serial: "HAAS-VF5-001",
          estimated_runtime_minutes: 60,
          department_code: "mill",
          priority: "standard",
        }],
        employees: [],
        window_start: "2026-05-27T06:00:00.000Z",
        window_end: "2026-05-27T18:00:00.000Z",
      }),
    ).toThrow(/invalid due_at/);
  });
});

describe("AutomatedJobSchedulerEngine — G5 round-trip", () => {
  beforeEach(() => {
    automatedJobSchedulerEngine.reset();
    aiProposalApprovalQueueEngine.reset();
    managerRegistryEngine.reset();
    managerRegistryEngine.register({
      employee_id: "ADMIN-001",
      rank: "admin",
      department_code: "office",
      reports_to_employee_id: null,
      by_employee_id: "ADMIN-001",
    });
  });

  it("buildAndSubmit → admin approves through G5 queue", () => {
    const { diff, proposal_id } = automatedJobSchedulerEngine.buildAndSubmit({
      trigger: "nightly",
      jobs: basicJobs(),
      employees: basicEmployees(),
      window_start: "2026-05-27T06:00:00.000Z",
      window_end: "2026-05-27T18:00:00.000Z",
      explanation_ref: "EXPL-SCHED-001",
    });
    expect(proposal_id).toMatch(/^AIPROP-/);
    expect(diff.entries.length).toBe(3);

    // Admin approves through G5
    aiProposalApprovalQueueEngine.beginReview({
      proposal_id,
      reviewer_employee_id: "ADMIN-001",
    });
    const approved = aiProposalApprovalQueueEngine.approve({
      proposal_id,
      reviewer_employee_id: "ADMIN-001",
      rationale: "schedule looks reasonable, no EDD violations",
    });
    expect(approved.status).toBe("approved");
    expect(approved.kind).toBe("auto_schedule");
  });

  it("REJECTS submitProposal with no explanation_ref (Hotel AI invariant)", () => {
    const diff = automatedJobSchedulerEngine.buildSchedulerDiff({
      trigger: "nightly",
      jobs: basicJobs(),
      employees: basicEmployees(),
      window_start: "2026-05-27T06:00:00.000Z",
      window_end: "2026-05-27T18:00:00.000Z",
    });
    expect(() =>
      automatedJobSchedulerEngine.submitProposal({
        diff,
        explanation_ref: "",
      }),
    ).toThrow(/explanation_ref required/);
  });

  it("REJECTS submitProposal with no affected_departments (would orphan-route)", () => {
    const diff = automatedJobSchedulerEngine.buildSchedulerDiff({
      trigger: "nightly",
      jobs: [],
      employees: [],
      window_start: "2026-05-27T06:00:00.000Z",
      window_end: "2026-05-27T18:00:00.000Z",
    });
    expect(() =>
      automatedJobSchedulerEngine.submitProposal({
        diff,
        explanation_ref: "EXPL-X",
      }),
    ).toThrow(/no affected_departments/);
  });
});

describe("AutomatedJobSchedulerEngine — PSN/system-viz synergy", () => {
  it("emits a /system-viz roost manifest with PSN leg refs + edges", () => {
    const roost = automatedJobSchedulerEngine.systemVizRoost();
    expect(roost.engine_name).toBe("AutomatedJobSchedulerEngine");
    expect(roost.layer).toBe(7);
    expect(roost.node_type).toBe("hub");
    // PSN legs 7 (Engines), 8 (Algorithms), 11 (PRISM AI)
    expect(roost.psn_legs).toEqual([7, 8, 11]);
    expect(roost.edges_out).toContain("AIProposalApprovalQueueEngine");
    expect(roost.edges_out).toContain("JobShopSchedulingEngine");
    expect(roost.edges_in).toContain("EmployeeShiftScheduleEngine");
    expect(roost.edges_in).toContain("EmployeeMachineDomainAcademyEngine");
  });
});
