/**
 * AutomatedTaskDelegatorEngine — proposal building, scoring (load + same-rank
 * + same-dept), 4 triggers, no-viable-target, capacity-full filter, G5
 * round-trip submission, R12 fail-loud.
 *
 * Variability ≥14 cases · ≥5 R12 modes · ≥2 adversarial inputs.
 *
 * @milestone HOTEL/U-AUTO-TASK-DELEGATOR (2026-05-26, slot:hotel iter7 /goal Phase 2)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  automatedTaskDelegatorEngine,
  type ActiveTask,
  type WorkerLoad,
} from "../engines/AutomatedTaskDelegatorEngine.js";
import { aiProposalApprovalQueueEngine } from "../engines/AIProposalApprovalQueueEngine.js";
import { managerRegistryEngine } from "../engines/ManagerRegistryEngine.js";

function basicWorkers(): WorkerLoad[] {
  return [
    {
      employee_id: "EMP-001",
      rank: "operator",
      qualified_machine_serials: ["HAAS-VF5-001", "OKUMA-LB3000-001"],
      department_code: "mill",
      current_load_minutes: 200,
      capacity_minutes: 480,
      clocked_in: true,
    },
    {
      employee_id: "EMP-002",
      rank: "operator",
      qualified_machine_serials: ["HAAS-VF5-001"],
      department_code: "mill",
      current_load_minutes: 100,
      capacity_minutes: 480,
      clocked_in: true,
    },
    {
      employee_id: "EMP-003",
      rank: "lead",
      qualified_machine_serials: ["HAAS-VF5-001"],
      department_code: "mill",
      current_load_minutes: 50,
      capacity_minutes: 480,
      clocked_in: true,
    },
    {
      employee_id: "EMP-004",
      rank: "operator",
      qualified_machine_serials: ["OKUMA-LB3000-001"],
      department_code: "lathe",
      current_load_minutes: 100,
      capacity_minutes: 480,
      clocked_in: false, // not on clock
    },
  ];
}

describe("AutomatedTaskDelegatorEngine — proposal building", () => {
  beforeEach(() => {
    automatedTaskDelegatorEngine.reset();
    aiProposalApprovalQueueEngine.reset();
    managerRegistryEngine.reset();
  });

  it("proposes a re-delegation when current owner is overloaded", () => {
    // EMP-002 is overloaded: load=500 > cap=400
    const workers = basicWorkers();
    workers[1] = { ...workers[1]!, current_load_minutes: 500, capacity_minutes: 400 };
    const proposal = automatedTaskDelegatorEngine.buildProposal({
      trigger: "nightly",
      tasks: [{
        task_id: "T-001",
        task_kind: "timeclock",
        current_employee_id: "EMP-002",
        machine_serial: "HAAS-VF5-001",
        department_code: "mill",
        remaining_minutes: 60,
        assigned_at: "2026-05-26T08:00:00.000Z",
      }],
      workers,
    });
    expect(proposal.entries).toHaveLength(1);
    expect(proposal.entries[0]?.from_employee_id).toBe("EMP-002");
    // Picks EMP-001 (same-rank operator) over EMP-003 (lead) due to +0.5 same-rank bonus
    expect(proposal.entries[0]?.to_employee_id).toBe("EMP-001");
    expect(proposal.entries[0]?.same_rank).toBe(true);
  });

  it("ASSIGNS unassigned task to highest-scored qualified worker", () => {
    const proposal = automatedTaskDelegatorEngine.buildProposal({
      trigger: "on_demand",
      tasks: [{
        task_id: "T-OPEN",
        task_kind: "work_order",
        current_employee_id: null,
        machine_serial: "HAAS-VF5-001",
        department_code: "mill",
        remaining_minutes: 60,
        assigned_at: "2026-05-26T08:00:00.000Z",
      }],
      workers: basicWorkers(),
    });
    expect(proposal.entries).toHaveLength(1);
    expect(proposal.entries[0]?.from_employee_id).toBe(null);
    // Best score: EMP-003 (lead, lowest load 50/480) — no same-rank bonus on unassigned
    expect(proposal.entries[0]?.to_employee_id).toBe("EMP-003");
    expect(proposal.entries[0]?.same_rank).toBe(false);
  });

  it("SAME-RANK + SAME-DEPT bonuses prefer peer in same dept over higher-ranked outsider", () => {
    const workers: WorkerLoad[] = [
      {
        employee_id: "EMP-IN-DEPT", rank: "operator",
        qualified_machine_serials: ["HAAS-VF5-001"],
        department_code: "mill", current_load_minutes: 200, capacity_minutes: 480,
        clocked_in: true,
      },
      {
        employee_id: "EMP-OUTSIDER", rank: "lead",
        qualified_machine_serials: ["HAAS-VF5-001"],
        department_code: "polishing", current_load_minutes: 100, capacity_minutes: 480,
        clocked_in: true,
      },
    ];
    const proposal = automatedTaskDelegatorEngine.buildProposal({
      trigger: "stalled_handoff",
      tasks: [{
        task_id: "T-X",
        task_kind: "timeclock",
        current_employee_id: "EMP-OWNER",
        machine_serial: "HAAS-VF5-001",
        department_code: "mill",
        remaining_minutes: 60,
        assigned_at: "2026-05-26T08:00:00.000Z",
      }],
      workers: [
        ...workers,
        {
          employee_id: "EMP-OWNER", rank: "operator",
          qualified_machine_serials: ["HAAS-VF5-001"],
          department_code: "mill", current_load_minutes: 400, capacity_minutes: 480,
          clocked_in: true,
        },
      ],
    });
    // EMP-IN-DEPT scores higher (same-rank +0.5 + same-dept +0.2)
    // EMP-OUTSIDER scores lower (no rank bonus, no dept bonus)
    expect(proposal.entries[0]?.to_employee_id).toBe("EMP-IN-DEPT");
  });

  it("NO VIABLE TARGET: skill-gap leaves task in no_viable_target_task_ids", () => {
    const proposal = automatedTaskDelegatorEngine.buildProposal({
      trigger: "on_demand",
      tasks: [{
        task_id: "T-WEDM",
        task_kind: "work_order",
        current_employee_id: null,
        machine_serial: "SODICK-AQ535L-001", // no one qualified
        department_code: "wedm",
        remaining_minutes: 60,
        assigned_at: "2026-05-26T08:00:00.000Z",
      }],
      workers: basicWorkers(),
    });
    expect(proposal.entries).toHaveLength(0);
    expect(proposal.no_viable_target_task_ids).toEqual(["T-WEDM"]);
    expect(proposal.affected_departments).toContain("wedm");
  });

  it("CAPACITY-FULL: worker at capacity is filtered (insufficient free minutes)", () => {
    const workers: WorkerLoad[] = [
      {
        employee_id: "EMP-FULL", rank: "operator",
        qualified_machine_serials: ["HAAS-VF5-001"],
        department_code: "mill", current_load_minutes: 470, capacity_minutes: 480, // 10 min free
        clocked_in: true,
      },
    ];
    const proposal = automatedTaskDelegatorEngine.buildProposal({
      trigger: "on_demand",
      tasks: [{
        task_id: "T-BIG",
        task_kind: "work_order",
        current_employee_id: null,
        machine_serial: "HAAS-VF5-001",
        department_code: "mill",
        remaining_minutes: 60, // needs 60 min but only 10 free
        assigned_at: "2026-05-26T08:00:00.000Z",
      }],
      workers,
    });
    expect(proposal.no_viable_target_task_ids).toEqual(["T-BIG"]);
  });

  it("SHIFT-GAP trigger: re-delegates task whose owner shift ends before completion", () => {
    const proposal = automatedTaskDelegatorEngine.buildProposal({
      trigger: "shift_gap",
      tasks: [{
        task_id: "T-GAP",
        task_kind: "timeclock",
        current_employee_id: "EMP-002",
        machine_serial: "HAAS-VF5-001",
        department_code: "mill",
        remaining_minutes: 90,
        assigned_at: "2026-05-26T15:00:00.000Z",
        shift_gap_predicted: true,
      }],
      workers: basicWorkers(),
    });
    expect(proposal.entries).toHaveLength(1);
    expect(proposal.entries[0]?.task_id).toBe("T-GAP");
  });

  it("EXCLUDES off-clock workers (EMP-004) from candidate pool", () => {
    // Only EMP-004 is qualified for OKUMA but is off-clock
    const proposal = automatedTaskDelegatorEngine.buildProposal({
      trigger: "on_demand",
      tasks: [{
        task_id: "T-LATHE",
        task_kind: "work_order",
        current_employee_id: null,
        machine_serial: "OKUMA-LB3000-001",
        department_code: "lathe",
        remaining_minutes: 60,
        assigned_at: "2026-05-26T08:00:00.000Z",
      }],
      workers: basicWorkers(),
    });
    // EMP-001 IS qualified for both machines and is clocked-in → picked
    expect(proposal.entries[0]?.to_employee_id).toBe("EMP-001");
  });

  it("aggregates total_load_shift_minutes + affected_departments across entries", () => {
    const proposal = automatedTaskDelegatorEngine.buildProposal({
      trigger: "nightly",
      tasks: [
        {
          task_id: "T-A", task_kind: "timeclock", current_employee_id: null,
          machine_serial: "HAAS-VF5-001", department_code: "mill",
          remaining_minutes: 60, assigned_at: "2026-05-26T08:00:00.000Z",
        },
        {
          task_id: "T-B", task_kind: "timeclock", current_employee_id: null,
          machine_serial: "HAAS-VF5-001", department_code: "mill",
          remaining_minutes: 30, assigned_at: "2026-05-26T08:00:00.000Z",
        },
      ],
      workers: basicWorkers(),
    });
    expect(proposal.total_load_shift_minutes).toBe(90);
    expect(proposal.affected_departments).toContain("mill");
  });

  it("accepts ALL 5 triggers", () => {
    const triggers: Array<"nightly" | "shift_gap" | "stalled_handoff" | "sick_day_callin" | "on_demand"> = [
      "nightly", "shift_gap", "stalled_handoff", "sick_day_callin", "on_demand",
    ];
    for (const t of triggers) {
      const p = automatedTaskDelegatorEngine.buildProposal({
        trigger: t, tasks: [], workers: [],
      });
      expect(p.trigger).toBe(t);
    }
  });
});

describe("AutomatedTaskDelegatorEngine — R12 fail-loud", () => {
  beforeEach(() => automatedTaskDelegatorEngine.reset());

  it("REJECTS invalid trigger", () => {
    expect(() =>
      automatedTaskDelegatorEngine.buildProposal({
        trigger: "bogus" as unknown as "nightly",
        tasks: [], workers: [],
      }),
    ).toThrow(/invalid trigger/);
  });

  it("REJECTS invalid task_kind + missing machine_serial", () => {
    expect(() =>
      automatedTaskDelegatorEngine.buildProposal({
        trigger: "nightly",
        tasks: [{ task_id: "T-X", task_kind: "junk" as unknown as "timeclock", current_employee_id: null, machine_serial: "M", department_code: "mill", remaining_minutes: 10, assigned_at: "2026-05-26T08:00:00.000Z" }],
        workers: [],
      }),
    ).toThrow(/invalid task_kind/);
    expect(() =>
      automatedTaskDelegatorEngine.buildProposal({
        trigger: "nightly",
        tasks: [{ task_id: "T-X", task_kind: "timeclock", current_employee_id: null, machine_serial: "", department_code: "mill", remaining_minutes: 10, assigned_at: "2026-05-26T08:00:00.000Z" }],
        workers: [],
      }),
    ).toThrow(/missing machine_serial/);
  });

  it("REJECTS adversarial inputs (NaN remaining_minutes, negative capacity)", () => {
    expect(() =>
      automatedTaskDelegatorEngine.buildProposal({
        trigger: "nightly",
        tasks: [{ task_id: "T-X", task_kind: "timeclock", current_employee_id: null, machine_serial: "M", department_code: "mill", remaining_minutes: NaN, assigned_at: "2026-05-26T08:00:00.000Z" }],
        workers: [],
      }),
    ).toThrow(/remaining_minutes/);
    expect(() =>
      automatedTaskDelegatorEngine.buildProposal({
        trigger: "nightly",
        tasks: [],
        workers: [{ employee_id: "E-1", rank: "operator", qualified_machine_serials: [], department_code: "mill", current_load_minutes: 0, capacity_minutes: -5, clocked_in: true }],
      }),
    ).toThrow(/capacity_minutes/);
  });

  it("REJECTS worker without rank (R12)", () => {
    expect(() =>
      automatedTaskDelegatorEngine.buildProposal({
        trigger: "nightly",
        tasks: [],
        workers: [{ employee_id: "E-1", rank: "", qualified_machine_serials: [], department_code: "mill", current_load_minutes: 0, capacity_minutes: 480, clocked_in: true }],
      }),
    ).toThrow(/missing rank/);
  });
});

describe("AutomatedTaskDelegatorEngine — G5 round-trip", () => {
  beforeEach(() => {
    automatedTaskDelegatorEngine.reset();
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

  it("buildAndSubmit → admin approves via G5", () => {
    const { proposal, proposal_id } = automatedTaskDelegatorEngine.buildAndSubmit({
      trigger: "on_demand",
      tasks: [{
        task_id: "T-001",
        task_kind: "timeclock",
        current_employee_id: null,
        machine_serial: "HAAS-VF5-001",
        department_code: "mill",
        remaining_minutes: 60,
        assigned_at: "2026-05-26T08:00:00.000Z",
      }],
      workers: basicWorkers(),
      explanation_ref: "EXPL-DELEG-001",
    });
    expect(proposal_id).toMatch(/^AIPROP-/);
    expect(proposal.entries.length).toBeGreaterThan(0);
    aiProposalApprovalQueueEngine.beginReview({
      proposal_id, reviewer_employee_id: "ADMIN-001",
    });
    const approved = aiProposalApprovalQueueEngine.approve({
      proposal_id, reviewer_employee_id: "ADMIN-001",
      rationale: "load-balance looks correct",
    });
    expect(approved.status).toBe("approved");
    expect(approved.kind).toBe("auto_delegation");
  });

  it("REJECTS buildAndSubmit with 0 entries (avoid G5 noise)", () => {
    expect(() =>
      automatedTaskDelegatorEngine.buildAndSubmit({
        trigger: "on_demand",
        tasks: [],
        workers: basicWorkers(),
        explanation_ref: "EXPL-EMPTY",
      }),
    ).toThrow(/proposal has 0 entries/);
  });

  it("REJECTS submitProposal with missing explanation_ref", () => {
    const proposal = automatedTaskDelegatorEngine.buildProposal({
      trigger: "on_demand", tasks: [], workers: [],
    });
    expect(() =>
      automatedTaskDelegatorEngine.submitProposal({
        proposal, explanation_ref: "",
      }),
    ).toThrow(/explanation_ref required/);
  });
});

describe("AutomatedTaskDelegatorEngine — PSN/system-viz synergy", () => {
  it("emits roost manifest with PSN leg refs + edges", () => {
    const roost = automatedTaskDelegatorEngine.systemVizRoost();
    expect(roost.engine_name).toBe("AutomatedTaskDelegatorEngine");
    expect(roost.layer).toBe(7);
    expect(roost.node_type).toBe("hub");
    expect(roost.psn_legs).toEqual([7, 8, 11]);
    expect(roost.edges_out).toContain("AIProposalApprovalQueueEngine");
    expect(roost.edges_out).toContain("EmployeeTaskHandoffEngine");
  });
});
