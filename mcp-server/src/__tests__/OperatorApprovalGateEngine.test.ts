/**
 * OperatorApprovalGateEngine tests (U-MIO37)
 *
 * Covers:
 *   - Gate opening preconditions
 *   - Item verification / blocking
 *   - Release rule logic (critical, non-critical %, blocked)
 *   - Signature determinism & tamper-evidence
 *   - Escalation lifecycle
 *   - Markdown rendering, storage
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  OperatorApprovalGateEngine,
  type ApprovalGateInput,
  type ChecklistItemInput,
} from "../engines/OperatorApprovalGateEngine.js";

function mkItem(
  overrides: Partial<ChecklistItemInput> = {},
): ChecklistItemInput {
  return {
    item_id: overrides.item_id ?? "ITM-001",
    category: overrides.category ?? "setup",
    severity: overrides.severity ?? "major",
    description: overrides.description ?? "Verify fixture torque",
    source_ref: overrides.source_ref,
    blocked: overrides.blocked,
    blocking_reason: overrides.blocking_reason,
  };
}

function mkInput(overrides: Partial<ApprovalGateInput> = {}): ApprovalGateInput {
  return {
    part_number: overrides.part_number ?? "P-9001",
    revision: overrides.revision ?? "A",
    job_id: overrides.job_id ?? "JOB-42",
    setup_id: overrides.setup_id,
    control_plan_id: overrides.control_plan_id,
    routing_id: overrides.routing_id,
    probing_id: overrides.probing_id,
    assigned_operators: overrides.assigned_operators ?? ["op.jones"],
    checklist: overrides.checklist ?? [
      mkItem({ item_id: "C1", severity: "critical", description: "LOTO engaged" }),
      mkItem({ item_id: "M1", severity: "major", description: "Tool offsets preset" }),
      mkItem({ item_id: "M2", severity: "major", description: "WCS verified" }),
      mkItem({ item_id: "N1", severity: "minor", description: "Setup sheet printed" }),
    ],
  };
}

describe("OperatorApprovalGateEngine — openGate", () => {
  let engine: OperatorApprovalGateEngine;
  beforeEach(() => {
    engine = new OperatorApprovalGateEngine();
  });

  it("assigns a sequential gate_id with APV- prefix", () => {
    const g1 = engine.openGate(mkInput());
    const g2 = engine.openGate(mkInput());
    expect(g1.gate_id).toBe("APV-00001");
    expect(g2.gate_id).toBe("APV-00002");
  });

  it("throws if checklist is empty", () => {
    expect(() => engine.openGate(mkInput({ checklist: [] }))).toThrow(
      /at least one checklist item/i,
    );
  });

  it("throws if no assigned operators", () => {
    expect(() =>
      engine.openGate(mkInput({ assigned_operators: [] })),
    ).toThrow(/at least one assigned operator/i);
  });

  it("seeds verdict=PENDING, production_released=false", () => {
    const g = engine.openGate(mkInput());
    expect(g.verdict).toBe("PENDING");
    expect(g.production_released).toBe(false);
  });

  it("computes correct summary counts", () => {
    const g = engine.openGate(mkInput());
    expect(g.summary.total_items).toBe(4);
    expect(g.summary.critical_total).toBe(1);
    expect(g.summary.major_total).toBe(2);
    expect(g.summary.minor_total).toBe(1);
    expect(g.summary.blocked_items).toBe(0);
    expect(g.summary.verification_pct).toBe(0);
  });

  it("defaults optional cross-link ids to N/A", () => {
    const g = engine.openGate(mkInput({
      setup_id: undefined,
      control_plan_id: undefined,
      routing_id: undefined,
      probing_id: undefined,
    }));
    expect(g.setup_id).toBe("N/A");
    expect(g.control_plan_id).toBe("N/A");
    expect(g.routing_id).toBe("N/A");
    expect(g.probing_id).toBe("N/A");
  });

  it("propagates cross-link ids when supplied", () => {
    const g = engine.openGate(mkInput({
      setup_id: "SU-77",
      control_plan_id: "CP-77",
      routing_id: "RT-77",
      probing_id: "PR-77",
    }));
    expect(g.setup_id).toBe("SU-77");
    expect(g.control_plan_id).toBe("CP-77");
    expect(g.routing_id).toBe("RT-77");
    expect(g.probing_id).toBe("PR-77");
  });
});

describe("OperatorApprovalGateEngine — verifyItem / unblockItem", () => {
  let engine: OperatorApprovalGateEngine;
  beforeEach(() => {
    engine = new OperatorApprovalGateEngine();
  });

  it("marks an item verified with verifier metadata", () => {
    const g = engine.openGate(mkInput());
    const updated = engine.verifyItem(g.gate_id, "C1", "op.jones", "confirmed LOTO");
    const item = updated.checklist.find(i => i.item_id === "C1")!;
    expect(item.verified).toBe(true);
    expect(item.verified_by).toBe("op.jones");
    expect(item.verified_at).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(item.verifier_notes).toBe("confirmed LOTO");
  });

  it("updates verification_pct", () => {
    const g = engine.openGate(mkInput());
    const updated = engine.verifyItem(g.gate_id, "C1", "op.jones");
    expect(updated.summary.verification_pct).toBe(25);
  });

  it("throws on unknown item", () => {
    const g = engine.openGate(mkInput());
    expect(() =>
      engine.verifyItem(g.gate_id, "NOPE", "op.jones"),
    ).toThrow(/not found/);
  });

  it("throws when verifying a blocked item", () => {
    const input = mkInput({
      checklist: [
        mkItem({
          item_id: "BLK1",
          severity: "major",
          blocked: true,
          blocking_reason: "awaiting probe",
        }),
      ],
    });
    const g = engine.openGate(input);
    expect(() =>
      engine.verifyItem(g.gate_id, "BLK1", "op.jones"),
    ).toThrow(/BLOCKED/);
  });

  it("unblockItem clears the blocked flag", () => {
    const input = mkInput({
      checklist: [
        mkItem({
          item_id: "BLK1",
          severity: "major",
          blocked: true,
          blocking_reason: "awaiting probe",
        }),
      ],
    });
    const g = engine.openGate(input);
    const after = engine.unblockItem(g.gate_id, "BLK1");
    const item = after.checklist.find(i => i.item_id === "BLK1")!;
    expect(item.blocked).toBe(false);
    expect(item.blocking_reason).toBeUndefined();
  });

  it("unblockItem allows subsequent verification", () => {
    const input = mkInput({
      checklist: [
        mkItem({
          item_id: "BLK1",
          severity: "major",
          blocked: true,
        }),
      ],
    });
    const g = engine.openGate(input);
    engine.unblockItem(g.gate_id, "BLK1");
    const after = engine.verifyItem(g.gate_id, "BLK1", "op.jones");
    const item = after.checklist.find(i => i.item_id === "BLK1")!;
    expect(item.verified).toBe(true);
  });
});

describe("OperatorApprovalGateEngine — requestApproval", () => {
  let engine: OperatorApprovalGateEngine;
  beforeEach(() => {
    engine = new OperatorApprovalGateEngine();
  });

  it("throws if operator is not assigned", () => {
    const g = engine.openGate(mkInput());
    expect(() =>
      engine.requestApproval(g.gate_id, "intruder"),
    ).toThrow(/not assigned/);
  });

  it("REJECTS if any item is still blocked", () => {
    const input = mkInput({
      checklist: [
        mkItem({ item_id: "C1", severity: "critical" }),
        mkItem({ item_id: "BLK1", severity: "major", blocked: true, blocking_reason: "upstream" }),
      ],
    });
    const g = engine.openGate(input);
    engine.verifyItem(g.gate_id, "C1", "op.jones");
    const after = engine.requestApproval(g.gate_id, "op.jones");
    expect(after.verdict).toBe("REJECTED");
    expect(after.production_released).toBe(false);
    expect(after.escalations[0].severity).toBe("major");
    expect(after.escalations[0].reason).toMatch(/BLOCKED/);
  });

  it("ESCALATES if any critical item is unverified", () => {
    const g = engine.openGate(mkInput());
    // verify majors + minor but NOT critical
    engine.verifyItem(g.gate_id, "M1", "op.jones");
    engine.verifyItem(g.gate_id, "M2", "op.jones");
    engine.verifyItem(g.gate_id, "N1", "op.jones");
    const after = engine.requestApproval(g.gate_id, "op.jones");
    expect(after.verdict).toBe("ESCALATED");
    expect(after.escalations[0].severity).toBe("critical");
    expect(after.escalations[0].reason).toMatch(/CRITICAL/);
  });

  it("REJECTS if non-critical verification < 90%", () => {
    // 5 non-critical, need 5/5 or 4/5 (80%) rejected
    const items: ChecklistItemInput[] = [
      mkItem({ item_id: "C1", severity: "critical" }),
      mkItem({ item_id: "N1", severity: "minor" }),
      mkItem({ item_id: "N2", severity: "minor" }),
      mkItem({ item_id: "N3", severity: "minor" }),
      mkItem({ item_id: "N4", severity: "minor" }),
      mkItem({ item_id: "N5", severity: "minor" }),
    ];
    const g = engine.openGate(mkInput({ checklist: items }));
    engine.verifyItem(g.gate_id, "C1", "op.jones");
    engine.verifyItem(g.gate_id, "N1", "op.jones");
    engine.verifyItem(g.gate_id, "N2", "op.jones");
    engine.verifyItem(g.gate_id, "N3", "op.jones");
    // 3/5 = 60%
    const after = engine.requestApproval(g.gate_id, "op.jones");
    expect(after.verdict).toBe("REJECTED");
    expect(after.escalations[0].reason).toMatch(/90%/);
  });

  it("APPROVES when all critical verified + ≥90% non-critical + no blocked", () => {
    const g = engine.openGate(mkInput());
    engine.verifyItem(g.gate_id, "C1", "op.jones");
    engine.verifyItem(g.gate_id, "M1", "op.jones");
    engine.verifyItem(g.gate_id, "M2", "op.jones");
    engine.verifyItem(g.gate_id, "N1", "op.jones");
    const after = engine.requestApproval(g.gate_id, "op.jones");
    expect(after.verdict).toBe("APPROVED");
    expect(after.production_released).toBe(true);
    expect(after.signature).toBeDefined();
    expect(after.signature!.operator_id).toBe("op.jones");
    expect(after.signature!.signature_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("treats gate with no non-critical items as 100% verified", () => {
    const input = mkInput({
      checklist: [
        mkItem({ item_id: "C1", severity: "critical" }),
      ],
    });
    const g = engine.openGate(input);
    engine.verifyItem(g.gate_id, "C1", "op.jones");
    const after = engine.requestApproval(g.gate_id, "op.jones");
    expect(after.verdict).toBe("APPROVED");
  });

  it("escalation on second requestApproval appends, never overwrites", () => {
    const g = engine.openGate(mkInput());
    engine.requestApproval(g.gate_id, "op.jones"); // ESCALATED (critical unverified)
    engine.requestApproval(g.gate_id, "op.jones"); // again
    const gate = engine.get(g.gate_id)!;
    expect(gate.escalations.length).toBe(2);
  });
});

describe("OperatorApprovalGateEngine — signature determinism & tamper-evidence", () => {
  let engine: OperatorApprovalGateEngine;
  beforeEach(() => {
    engine = new OperatorApprovalGateEngine();
  });

  it("produces a SHA-256 hex hash", () => {
    const g = engine.openGate(mkInput());
    engine.verifyItem(g.gate_id, "C1", "op.jones");
    engine.verifyItem(g.gate_id, "M1", "op.jones");
    engine.verifyItem(g.gate_id, "M2", "op.jones");
    engine.verifyItem(g.gate_id, "N1", "op.jones");
    const after = engine.requestApproval(g.gate_id, "op.jones");
    expect(after.signature!.signature_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("different verified sets yield different hashes", () => {
    const g1 = engine.openGate(mkInput({
      assigned_operators: ["op.jones"],
      checklist: [
        mkItem({ item_id: "C1", severity: "critical" }),
        mkItem({ item_id: "M1", severity: "major" }),
      ],
    }));
    engine.verifyItem(g1.gate_id, "C1", "op.jones");
    engine.verifyItem(g1.gate_id, "M1", "op.jones");
    const after1 = engine.requestApproval(g1.gate_id, "op.jones");
    const hash1 = after1.signature!.signature_hash;

    const g2 = engine.openGate(mkInput({
      assigned_operators: ["op.jones"],
      checklist: [
        mkItem({ item_id: "C1", severity: "critical" }),
      ],
    }));
    engine.verifyItem(g2.gate_id, "C1", "op.jones");
    const after2 = engine.requestApproval(g2.gate_id, "op.jones");
    const hash2 = after2.signature!.signature_hash;

    expect(hash1).not.toBe(hash2);
  });

  it("different part_number yields different hash", () => {
    const mkApproved = (part: string) => {
      const g = engine.openGate(mkInput({
        part_number: part,
        assigned_operators: ["op.jones"],
        checklist: [mkItem({ item_id: "C1", severity: "critical" })],
      }));
      engine.verifyItem(g.gate_id, "C1", "op.jones");
      return engine.requestApproval(g.gate_id, "op.jones");
    };
    const a = mkApproved("P-1");
    const b = mkApproved("P-2");
    expect(a.signature!.signature_hash).not.toBe(b.signature!.signature_hash);
  });
});

describe("OperatorApprovalGateEngine — resolveEscalation", () => {
  let engine: OperatorApprovalGateEngine;
  beforeEach(() => {
    engine = new OperatorApprovalGateEngine();
  });

  it("marks the escalation resolved with metadata", () => {
    const g = engine.openGate(mkInput());
    engine.requestApproval(g.gate_id, "op.jones"); // ESCALATED
    const resolved = engine.resolveEscalation(
      g.gate_id,
      0,
      "supervisor.smith",
      "critical item deferred — probe-based verification substituted",
    );
    const esc = resolved.escalations[0];
    expect(esc.resolved).toBe(true);
    expect(esc.resolved_by).toBe("supervisor.smith");
    expect(esc.resolved_at).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(esc.resolution_notes).toMatch(/substituted/);
  });

  it("throws on unknown escalation index", () => {
    const g = engine.openGate(mkInput());
    expect(() =>
      engine.resolveEscalation(g.gate_id, 99, "sup", "note"),
    ).toThrow(/not found/);
  });

  it("throws if already resolved", () => {
    const g = engine.openGate(mkInput());
    engine.requestApproval(g.gate_id, "op.jones");
    engine.resolveEscalation(g.gate_id, 0, "sup", "ok");
    expect(() =>
      engine.resolveEscalation(g.gate_id, 0, "sup", "again"),
    ).toThrow(/already resolved/);
  });
});

describe("OperatorApprovalGateEngine — rendering & storage", () => {
  let engine: OperatorApprovalGateEngine;
  beforeEach(() => {
    engine = new OperatorApprovalGateEngine();
  });

  it("get() returns null for unknown gate", () => {
    expect(engine.get("APV-99999")).toBeNull();
  });

  it("get() returns the stored gate", () => {
    const g = engine.openGate(mkInput());
    expect(engine.get(g.gate_id)?.gate_id).toBe(g.gate_id);
  });

  it("renderMarkdown contains verdict, part, checklist rows, signature when approved", () => {
    const g = engine.openGate(mkInput());
    engine.verifyItem(g.gate_id, "C1", "op.jones");
    engine.verifyItem(g.gate_id, "M1", "op.jones");
    engine.verifyItem(g.gate_id, "M2", "op.jones");
    engine.verifyItem(g.gate_id, "N1", "op.jones");
    const after = engine.requestApproval(g.gate_id, "op.jones");
    const md = engine.renderMarkdown(after);
    expect(md).toContain(`# Operator Approval Gate ${g.gate_id}`);
    expect(md).toContain("P-9001");
    expect(md).toContain("APPROVED");
    expect(md).toContain("Signature");
    expect(md).toContain("op.jones");
  });

  it("renderMarkdown shows Escalations section when present", () => {
    const g = engine.openGate(mkInput());
    engine.requestApproval(g.gate_id, "op.jones"); // ESCALATED
    const after = engine.get(g.gate_id)!;
    const md = engine.renderMarkdown(after);
    expect(md).toContain("Escalations");
    expect(md).toContain("critical");
  });

  it("reset() empties the store and resets counter", () => {
    engine.openGate(mkInput());
    engine.openGate(mkInput());
    engine.reset();
    const g = engine.openGate(mkInput());
    expect(g.gate_id).toBe("APV-00001");
  });
});
