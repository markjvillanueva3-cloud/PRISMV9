/**
 * AIProposalApprovalQueueEngine — covers submit + beginReview + approve +
 * reject + editAndApprove + withdraw + expireOverdue + stats + 7 proposal
 * kinds + adminMinRank gate + fail-CLOSED auth + SoD.
 *
 * Variability ≥18 cases · ≥8 R12 fail-loud modes · ≥3 adversarial inputs.
 *
 * @milestone HOTEL/U-AI-PROPOSAL-APPROVAL-QUEUE (2026-05-26, slot:hotel iter6 /goal Phase 1 P0)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { aiProposalApprovalQueueEngine } from "../engines/AIProposalApprovalQueueEngine.js";
import { managerRegistryEngine } from "../engines/ManagerRegistryEngine.js";

function seedAuth() {
  managerRegistryEngine.reset();
  managerRegistryEngine.register({
    employee_id: "ADMIN-001",
    rank: "admin",
    department_code: "office",
    reports_to_employee_id: null,
    by_employee_id: "ADMIN-001",
  });
  managerRegistryEngine.register({
    employee_id: "OWNER-001",
    rank: "owner",
    department_code: "office",
    reports_to_employee_id: "ADMIN-001",
    by_employee_id: "ADMIN-001",
  });
  managerRegistryEngine.register({
    employee_id: "MGR-001",
    rank: "manager",
    department_code: "mill",
    reports_to_employee_id: "OWNER-001",
    by_employee_id: "OWNER-001",
  });
}

function submitDefault(kind: "ai_summary" | "auto_schedule" | "auto_delegation" | "auto_quote" | "auto_remediation" | "auto_extraction" | "auto_recommendation" = "ai_summary") {
  return aiProposalApprovalQueueEngine.submit({
    kind,
    submitter_subsystem: "AISummaryWriterEngine",
    payload: { text: "Today, the mill cell ran 23 setups with 91% OEE." },
    explanation_ref: "EXPL-12345",
    affected_departments: ["mill"],
    ttl_minutes: 60,
  });
}

describe("AIProposalApprovalQueueEngine — submit + queue mechanics", () => {
  beforeEach(() => {
    aiProposalApprovalQueueEngine.reset();
    seedAuth();
  });

  it("submits a proposal with full audit + computed expires_at", () => {
    const p = submitDefault();
    expect(p.id).toMatch(/^AIPROP-\d{6}$/);
    expect(p.kind).toBe("ai_summary");
    expect(p.status).toBe("submitted");
    expect(p.submitter_subsystem).toBe("AISummaryWriterEngine");
    expect(p.explanation_ref).toBe("EXPL-12345");
    expect(p.audit_trail).toHaveLength(1);
    expect(p.audit_trail[0]?.operation).toBe("submit");
    expect(Date.parse(p.expires_at)).toBeGreaterThan(Date.parse(p.submitted_at));
  });

  it("accepts all 7 ProposalKinds", () => {
    const kinds = ["ai_summary", "auto_schedule", "auto_delegation", "auto_quote", "auto_remediation", "auto_extraction", "auto_recommendation"] as const;
    for (const k of kinds) {
      const p = submitDefault(k);
      expect(p.kind).toBe(k);
    }
    expect(aiProposalApprovalQueueEngine.listQueue().length).toBe(7);
  });

  it("REJECTS submit with empty payload (R12)", () => {
    expect(() =>
      aiProposalApprovalQueueEngine.submit({
        kind: "ai_summary",
        submitter_subsystem: "X",
        payload: null as unknown as Record<string, unknown>,
        explanation_ref: "E",
        affected_departments: ["mill"],
        ttl_minutes: 60,
      }),
    ).toThrow(/payload must be a non-null object/);
  });

  it("REJECTS submit with no explanation_ref (R12 explainability invariant)", () => {
    expect(() =>
      aiProposalApprovalQueueEngine.submit({
        kind: "ai_summary",
        submitter_subsystem: "X",
        payload: { x: 1 },
        explanation_ref: "",
        affected_departments: ["mill"],
        ttl_minutes: 60,
      }),
    ).toThrow(/explanation_ref required/);
  });

  it("REJECTS submit with empty affected_departments (R12)", () => {
    expect(() =>
      aiProposalApprovalQueueEngine.submit({
        kind: "ai_summary",
        submitter_subsystem: "X",
        payload: { x: 1 },
        explanation_ref: "E",
        affected_departments: [],
        ttl_minutes: 60,
      }),
    ).toThrow(/non-empty array/);
  });

  it("REJECTS invalid TTL (R12 boundary + adversarial)", () => {
    for (const bad of [0, -1, NaN, Infinity, 10081, 999999]) {
      expect(() =>
        aiProposalApprovalQueueEngine.submit({
          kind: "ai_summary",
          submitter_subsystem: "X",
          payload: { x: 1 },
          explanation_ref: "E",
          affected_departments: ["mill"],
          ttl_minutes: bad,
        }),
      ).toThrow(/ttl_minutes/);
    }
  });

  it("REJECTS invalid kind (R12)", () => {
    expect(() =>
      aiProposalApprovalQueueEngine.submit({
        kind: "bogus_kind" as unknown as "ai_summary",
        submitter_subsystem: "X",
        payload: { x: 1 },
        explanation_ref: "E",
        affected_departments: ["mill"],
        ttl_minutes: 60,
      }),
    ).toThrow(/invalid kind/);
  });
});

describe("AIProposalApprovalQueueEngine — review lifecycle + admin gate", () => {
  beforeEach(() => {
    aiProposalApprovalQueueEngine.reset();
    seedAuth();
  });

  it("HAPPY PATH: submit → beginReview → approve with rationale", () => {
    const p = submitDefault();
    const inReview = aiProposalApprovalQueueEngine.beginReview({
      proposal_id: p.id,
      reviewer_employee_id: "ADMIN-001",
    });
    expect(inReview.status).toBe("under_review");
    const approved = aiProposalApprovalQueueEngine.approve({
      proposal_id: p.id,
      reviewer_employee_id: "ADMIN-001",
      rationale: "summary is accurate, publish",
    });
    expect(approved.status).toBe("approved");
    expect(approved.reviewer_employee_id).toBe("ADMIN-001");
    expect(approved.decision_rationale).toContain("publish");
    expect(approved.audit_trail).toHaveLength(3);
  });

  it("FAIL-CLOSED: non-admin (manager rank) cannot approve (R12 auth gate)", () => {
    const p = submitDefault();
    aiProposalApprovalQueueEngine.beginReview({
      proposal_id: p.id,
      reviewer_employee_id: "ADMIN-001",
    });
    expect(() =>
      aiProposalApprovalQueueEngine.approve({
        proposal_id: p.id,
        reviewer_employee_id: "MGR-001", // manager rank — below admin
        rationale: "ok",
      }),
    ).toThrow(/below adminMinRank/);
  });

  it("FAIL-CLOSED: owner (rank below admin) cannot approve when minRank=admin (R12)", () => {
    const p = submitDefault();
    aiProposalApprovalQueueEngine.beginReview({
      proposal_id: p.id,
      reviewer_employee_id: "ADMIN-001",
    });
    expect(() =>
      aiProposalApprovalQueueEngine.approve({
        proposal_id: p.id,
        reviewer_employee_id: "OWNER-001",
        rationale: "x",
      }),
    ).toThrow(/below adminMinRank/);
  });

  it("FAIL-CLOSED: unknown reviewer is rejected (R12)", () => {
    const p = submitDefault();
    expect(() =>
      aiProposalApprovalQueueEngine.beginReview({
        proposal_id: p.id,
        reviewer_employee_id: "GHOST",
      }),
    ).toThrow(/unknown employee/);
  });

  it("REJECTS approve without rationale (R12 — no silent admin approval)", () => {
    const p = submitDefault();
    aiProposalApprovalQueueEngine.beginReview({
      proposal_id: p.id,
      reviewer_employee_id: "ADMIN-001",
    });
    expect(() =>
      aiProposalApprovalQueueEngine.approve({
        proposal_id: p.id,
        reviewer_employee_id: "ADMIN-001",
        rationale: "  ",
      }),
    ).toThrow(/non-empty rationale required/);
  });

  it("REJECTS approve before beginReview (lifecycle R12)", () => {
    const p = submitDefault();
    expect(() =>
      aiProposalApprovalQueueEngine.approve({
        proposal_id: p.id,
        reviewer_employee_id: "ADMIN-001",
        rationale: "x",
      }),
    ).toThrow(/must be 'under_review'/);
  });

  it("editAndApprove preserves AI payload + records edited_payload diff", () => {
    const p = submitDefault();
    aiProposalApprovalQueueEngine.beginReview({
      proposal_id: p.id,
      reviewer_employee_id: "ADMIN-001",
    });
    const edited = aiProposalApprovalQueueEngine.editAndApprove({
      proposal_id: p.id,
      reviewer_employee_id: "ADMIN-001",
      edited_payload: { text: "Mill cell — 23 setups, 91% OEE. Tighten setup-3 cycle." },
      rationale: "added action item",
    });
    expect(edited.status).toBe("edited_and_approved");
    expect(edited.payload).toEqual(p.payload); // original preserved
    expect(edited.edited_payload).toBeTruthy();
    expect((edited.edited_payload as { text: string }).text).toContain("Tighten");
  });

  it("reject closes proposal with rationale", () => {
    const p = submitDefault();
    aiProposalApprovalQueueEngine.beginReview({
      proposal_id: p.id,
      reviewer_employee_id: "ADMIN-001",
    });
    const rejected = aiProposalApprovalQueueEngine.reject({
      proposal_id: p.id,
      reviewer_employee_id: "ADMIN-001",
      rationale: "OEE figure looks inflated, request re-derivation",
    });
    expect(rejected.status).toBe("rejected");
    expect(rejected.decision_rationale).toContain("inflated");
  });
});

describe("AIProposalApprovalQueueEngine — withdraw + expire + queue ops", () => {
  beforeEach(() => {
    aiProposalApprovalQueueEngine.reset();
    seedAuth();
  });

  it("submitter can withdraw before review", () => {
    const p = submitDefault();
    const withdrawn = aiProposalApprovalQueueEngine.withdraw({
      proposal_id: p.id,
      by_subsystem: "AISummaryWriterEngine",
      reason: "needs more context",
    });
    expect(withdrawn.status).toBe("withdrawn");
  });

  it("REJECTS withdraw by non-submitter (R12)", () => {
    const p = submitDefault();
    expect(() =>
      aiProposalApprovalQueueEngine.withdraw({
        proposal_id: p.id,
        by_subsystem: "WrongEngine",
      }),
    ).toThrow(/only the original submitter/);
  });

  it("REJECTS withdraw after review begins (R12)", () => {
    const p = submitDefault();
    aiProposalApprovalQueueEngine.beginReview({
      proposal_id: p.id,
      reviewer_employee_id: "ADMIN-001",
    });
    expect(() =>
      aiProposalApprovalQueueEngine.withdraw({
        proposal_id: p.id,
        by_subsystem: "AISummaryWriterEngine",
      }),
    ).toThrow(/cannot withdraw after review begins/);
  });

  it("expireOverdue sweeps proposals past TTL", () => {
    const p = aiProposalApprovalQueueEngine.submit({
      kind: "ai_summary",
      submitter_subsystem: "X",
      payload: { x: 1 },
      explanation_ref: "E",
      affected_departments: ["mill"],
      ttl_minutes: 30,
    });
    const future = new Date(Date.parse(p.submitted_at) + 31 * 60_000).toISOString();
    const expired = aiProposalApprovalQueueEngine.expireOverdue({ now_iso: future });
    expect(expired).toEqual([p.id]);
    expect(aiProposalApprovalQueueEngine.getProposal(p.id).status).toBe("expired");
  });

  it("expireOverdue REJECTS invalid now_iso (R12)", () => {
    expect(() => aiProposalApprovalQueueEngine.expireOverdue({ now_iso: "not-a-date" })).toThrow(/invalid now_iso/);
  });

  it("listQueue filters by status + kind + dept + only_pending; sorted FIFO", () => {
    submitDefault("ai_summary");
    submitDefault("auto_schedule");
    const p3 = submitDefault("auto_delegation");
    aiProposalApprovalQueueEngine.beginReview({
      proposal_id: p3.id,
      reviewer_employee_id: "ADMIN-001",
    });
    aiProposalApprovalQueueEngine.approve({
      proposal_id: p3.id,
      reviewer_employee_id: "ADMIN-001",
      rationale: "approved",
    });
    const pending = aiProposalApprovalQueueEngine.listQueue({ only_pending: true });
    expect(pending.length).toBe(2);
    expect(aiProposalApprovalQueueEngine.listQueue({ status: "approved" }).length).toBe(1);
    expect(aiProposalApprovalQueueEngine.listQueue({ kind: "auto_schedule" }).length).toBe(1);
    expect(aiProposalApprovalQueueEngine.listQueue({ department_code: "mill" }).length).toBe(3);
    expect(aiProposalApprovalQueueEngine.listQueue({ department_code: "lathe" }).length).toBe(0);
  });

  it("stats computes by_status, by_kind, oldest_pending, approval_rate", () => {
    const p1 = submitDefault("ai_summary");
    submitDefault("auto_schedule");
    aiProposalApprovalQueueEngine.beginReview({
      proposal_id: p1.id,
      reviewer_employee_id: "ADMIN-001",
    });
    aiProposalApprovalQueueEngine.approve({
      proposal_id: p1.id,
      reviewer_employee_id: "ADMIN-001",
      rationale: "ok",
    });
    const p3 = submitDefault("auto_quote");
    aiProposalApprovalQueueEngine.beginReview({
      proposal_id: p3.id,
      reviewer_employee_id: "ADMIN-001",
    });
    aiProposalApprovalQueueEngine.reject({
      proposal_id: p3.id,
      reviewer_employee_id: "ADMIN-001",
      rationale: "bad quote",
    });
    const stats = aiProposalApprovalQueueEngine.stats();
    expect(stats.total).toBe(3);
    expect(stats.by_status.approved).toBe(1);
    expect(stats.by_status.rejected).toBe(1);
    expect(stats.by_status.submitted).toBe(1);
    expect(stats.by_kind.ai_summary).toBe(1);
    expect(stats.approval_rate_pct).toBe(50); // 1 approved out of 2 decided
  });
});

describe("AIProposalApprovalQueueEngine — adminMinRank override", () => {
  beforeEach(() => {
    aiProposalApprovalQueueEngine.reset();
    seedAuth();
  });

  it("lowering minRank to owner allows OWNER-001 to approve", () => {
    aiProposalApprovalQueueEngine.setAdminMinRank("owner");
    expect(aiProposalApprovalQueueEngine.getAdminMinRank()).toBe("owner");
    const p = submitDefault();
    aiProposalApprovalQueueEngine.beginReview({
      proposal_id: p.id,
      reviewer_employee_id: "OWNER-001",
    });
    const approved = aiProposalApprovalQueueEngine.approve({
      proposal_id: p.id,
      reviewer_employee_id: "OWNER-001",
      rationale: "ok",
    });
    expect(approved.status).toBe("approved");
  });

  it("REJECTS approve when reviewer rank STILL below adjusted minRank (R12)", () => {
    aiProposalApprovalQueueEngine.setAdminMinRank("director");
    const p = submitDefault();
    expect(() =>
      aiProposalApprovalQueueEngine.beginReview({
        proposal_id: p.id,
        reviewer_employee_id: "MGR-001", // manager below director
      }),
    ).toThrow(/below adminMinRank/);
  });
});
