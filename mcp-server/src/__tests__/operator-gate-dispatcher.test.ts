/**
 * operator-gate-dispatcher.test.ts — U-BRIDGE-OPERATOR-GATES round-trip.
 *
 * Verifies the 7 operator_gate_* actions go end-to-end through prism_safety:
 * z.enum match → lazy-imported OperatorApprovalGateEngine → result shape.
 * Mirrors the safety-actions.test.ts harness pattern (createMockServer +
 * callAction → JSON.parse of result.content[0].text).
 *
 * @milestone BRIDGE-DEEP/U-BRIDGE-OPERATOR-GATES
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerSafetyDispatcher } from "../tools/dispatchers/safetyDispatcher.js";
import { operatorApprovalGateEngine } from "../engines/OperatorApprovalGateEngine.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: any;
  handler: (args: any) => Promise<any>;
}

function createMockServer(): { server: any; tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  const server = {
    tool(name: string, description: string, schema: any, handler: any) {
      tools.push({ name, description, schema, handler });
    },
  };
  return { server, tools };
}

async function callAction(
  tool: CapturedTool,
  action: string,
  params: Record<string, any> = {},
): Promise<any> {
  const result = await tool.handler({ action, params });
  const text = result?.content?.[0]?.text;
  return text ? JSON.parse(text) : result;
}

let safetyTool: CapturedTool;

beforeAll(() => {
  operatorApprovalGateEngine.reset();
  const { server, tools } = createMockServer();
  registerSafetyDispatcher(server);
  const found = tools.find(t => t.name === "prism_safety");
  if (!found) throw new Error("prism_safety not registered");
  safetyTool = found;
});

const goldenChecklist = [
  { item_id: "wcs_set", category: "setup" as const, severity: "critical" as const, description: "G54 WCS established + verified" },
  { item_id: "tool_load", category: "tooling" as const, severity: "critical" as const, description: "T1 carbide endmill loaded in pocket 1" },
  { item_id: "coolant_on", category: "safety" as const, severity: "critical" as const, description: "Flood coolant primed + flowing" },
  { item_id: "speed_review", category: "parameters" as const, severity: "major" as const, description: "Operator reviewed S/F vs material" },
  { item_id: "first_part_plan", category: "quality" as const, severity: "minor" as const, description: "First-part inspection plan acknowledged" },
];

const baseGateInput = (overrides: Record<string, any> = {}) => ({
  part_number: "JM-DIE-12345",
  revision: "A",
  job_id: "JOB-001",
  assigned_operators: ["operator-alice"],
  checklist: goldenChecklist,
  ...overrides,
});

// ─── Round-trip: open → verify → approve happy path ─────────────────────────

describe("prism_safety:operator_gate_* — happy-path round-trip", () => {
  it("operator_gate_open returns gate_id with PENDING verdict + full summary", async () => {
    const res = await callAction(safetyTool, "operator_gate_open", baseGateInput());
    expect(res.success).toBe(true);
    expect(res.data.gate_id).toMatch(/^APV-\d{5}$/);
    expect(res.data.verdict).toBe("PENDING");
    expect(res.data.summary.total_items).toBe(5);
    expect(res.data.summary.critical_total).toBe(3);
    expect(res.data.production_released).toBe(false);
  });

  it("operator_gate_verify_item ticks the named item + bumps verification_pct", async () => {
    const opened = await callAction(safetyTool, "operator_gate_open", baseGateInput());
    const verified = await callAction(safetyTool, "operator_gate_verify_item", {
      gate_id: opened.data.gate_id,
      item_id: "wcs_set",
      verifier: "operator-alice",
      notes: "Probed corner — within 0.0001in",
    });
    expect(verified.success).toBe(true);
    const wcsItem = verified.data.checklist.find((i: any) => i.item_id === "wcs_set");
    expect(wcsItem.verified).toBe(true);
    expect(wcsItem.verified_by).toBe("operator-alice");
    expect(verified.data.summary.verification_pct).toBeCloseTo(20.0, 1);
  });

  it("operator_gate_request_approval emits APPROVED with SHA-256 signature on all-criticals-verified path", async () => {
    const opened = await callAction(safetyTool, "operator_gate_open", baseGateInput());
    const gateId = opened.data.gate_id;
    // All criticals + ≥90% non-criticals (here 100%) → APPROVED
    for (const it of goldenChecklist) {
      await callAction(safetyTool, "operator_gate_verify_item", {
        gate_id: gateId, item_id: it.item_id, verifier: "operator-alice",
      });
    }
    const approved = await callAction(safetyTool, "operator_gate_request_approval", {
      gate_id: gateId, operator_id: "operator-alice",
    });
    expect(approved.success).toBe(true);
    expect(approved.data.verdict).toBe("APPROVED");
    expect(approved.data.production_released).toBe(true);
    expect(approved.data.signature.operator_id).toBe("operator-alice");
    expect(approved.data.signature.signature_hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ─── Round-trip: failure modes (unverified critical → ESCALATED; <90% → REJECTED) ───

describe("prism_safety:operator_gate_request_approval — failure modes", () => {
  it("ESCALATED when a CRITICAL item is unverified", async () => {
    const opened = await callAction(safetyTool, "operator_gate_open", baseGateInput());
    const gateId = opened.data.gate_id;
    // Verify only non-critical
    await callAction(safetyTool, "operator_gate_verify_item", {
      gate_id: gateId, item_id: "speed_review", verifier: "operator-alice",
    });
    const decided = await callAction(safetyTool, "operator_gate_request_approval", {
      gate_id: gateId, operator_id: "operator-alice",
    });
    expect(decided.data.verdict).toBe("ESCALATED");
    expect(decided.data.production_released).toBe(false);
    expect(decided.data.escalations[0].severity).toBe("critical");
    expect(decided.data.escalations[0].reason).toMatch(/CRITICAL/);
  });

  it("REJECTED when non-critical verification < 90% threshold", async () => {
    const longChecklist = [
      { item_id: "c1", category: "setup" as const, severity: "critical" as const, description: "C1" },
      { item_id: "m1", category: "tooling" as const, severity: "major" as const, description: "M1" },
      { item_id: "m2", category: "tooling" as const, severity: "major" as const, description: "M2" },
      { item_id: "m3", category: "tooling" as const, severity: "major" as const, description: "M3" },
      { item_id: "m4", category: "tooling" as const, severity: "major" as const, description: "M4" },
      { item_id: "m5", category: "tooling" as const, severity: "major" as const, description: "M5" },
      { item_id: "m6", category: "tooling" as const, severity: "major" as const, description: "M6" },
      { item_id: "m7", category: "tooling" as const, severity: "major" as const, description: "M7" },
      { item_id: "m8", category: "tooling" as const, severity: "major" as const, description: "M8" },
      { item_id: "m9", category: "tooling" as const, severity: "major" as const, description: "M9" },
      { item_id: "m10", category: "tooling" as const, severity: "major" as const, description: "M10" },
    ];
    const opened = await callAction(safetyTool, "operator_gate_open", baseGateInput({ checklist: longChecklist }));
    const gateId = opened.data.gate_id;
    // Verify the critical + only 5/10 of the majors → 50% < 90%
    await callAction(safetyTool, "operator_gate_verify_item", { gate_id: gateId, item_id: "c1", verifier: "operator-alice" });
    for (const id of ["m1", "m2", "m3", "m4", "m5"]) {
      await callAction(safetyTool, "operator_gate_verify_item", { gate_id: gateId, item_id: id, verifier: "operator-alice" });
    }
    const decided = await callAction(safetyTool, "operator_gate_request_approval", {
      gate_id: gateId, operator_id: "operator-alice",
    });
    expect(decided.data.verdict).toBe("REJECTED");
    expect(decided.data.escalations[0].reason).toMatch(/below 90%/);
  });

  it("REJECTED when a checklist item is BLOCKED upstream", async () => {
    const blockedChecklist = [
      { item_id: "c1", category: "setup" as const, severity: "critical" as const, description: "C1" },
      {
        item_id: "blocked_one",
        category: "tooling" as const,
        severity: "major" as const,
        description: "Awaiting upstream",
        blocked: true,
        blocking_reason: "Probing not yet calibrated",
      },
    ];
    const opened = await callAction(safetyTool, "operator_gate_open", baseGateInput({ checklist: blockedChecklist }));
    const gateId = opened.data.gate_id;
    await callAction(safetyTool, "operator_gate_verify_item", { gate_id: gateId, item_id: "c1", verifier: "operator-alice" });
    const decided = await callAction(safetyTool, "operator_gate_request_approval", {
      gate_id: gateId, operator_id: "operator-alice",
    });
    expect(decided.data.verdict).toBe("REJECTED");
    expect(decided.data.escalations[0].reason).toMatch(/BLOCKED/);
  });
});

// ─── Unblock + escalation resolution ────────────────────────────────────────

describe("prism_safety:operator_gate_unblock_item + resolve_escalation", () => {
  it("operator_gate_unblock_item flips blocked→unblocked + recomputes summary", async () => {
    const checklist = [
      { item_id: "c1", category: "setup" as const, severity: "critical" as const, description: "C1" },
      {
        item_id: "to_unblock",
        category: "probing" as const,
        severity: "major" as const,
        description: "Probe macro pending",
        blocked: true,
        blocking_reason: "needs probing_id",
      },
    ];
    const opened = await callAction(safetyTool, "operator_gate_open", baseGateInput({ checklist }));
    expect(opened.data.summary.blocked_items).toBe(1);
    const unblocked = await callAction(safetyTool, "operator_gate_unblock_item", {
      gate_id: opened.data.gate_id, item_id: "to_unblock",
    });
    expect(unblocked.data.summary.blocked_items).toBe(0);
    const item = unblocked.data.checklist.find((i: any) => i.item_id === "to_unblock");
    expect(item.blocked).toBe(false);
  });

  it("operator_gate_resolve_escalation marks the escalation resolved with notes", async () => {
    // Force an escalation first (unverified critical)
    const opened = await callAction(safetyTool, "operator_gate_open", baseGateInput());
    const gateId = opened.data.gate_id;
    await callAction(safetyTool, "operator_gate_request_approval", {
      gate_id: gateId, operator_id: "operator-alice",
    });
    const resolved = await callAction(safetyTool, "operator_gate_resolve_escalation", {
      gate_id: gateId, escalation_index: 0,
      resolved_by: "supervisor-bob", notes: "Operator went back, verified all criticals",
    });
    expect(resolved.data.escalations[0].resolved).toBe(true);
    expect(resolved.data.escalations[0].resolved_by).toBe("supervisor-bob");
  });
});

// ─── Adversarial / boundary ─────────────────────────────────────────────────

describe("prism_safety:operator_gate_* — adversarial + boundary", () => {
  it("operator_gate_verify_item throws when item is BLOCKED (no silent tick)", async () => {
    const checklist = [
      {
        item_id: "blocked",
        category: "safety" as const,
        severity: "critical" as const,
        description: "Locked",
        blocked: true,
        blocking_reason: "upstream",
      },
    ];
    const opened = await callAction(safetyTool, "operator_gate_open", baseGateInput({ checklist }));
    const res = await callAction(safetyTool, "operator_gate_verify_item", {
      gate_id: opened.data.gate_id, item_id: "blocked", verifier: "operator-alice",
    });
    expect(res.success).toBe(false);
    expect(String(res.error)).toMatch(/BLOCKED/);
  });

  it("operator_gate_request_approval throws when operator not assigned", async () => {
    const opened = await callAction(safetyTool, "operator_gate_open", baseGateInput());
    const res = await callAction(safetyTool, "operator_gate_request_approval", {
      gate_id: opened.data.gate_id, operator_id: "unauthorized-eve",
    });
    expect(res.success).toBe(false);
    expect(String(res.error)).toMatch(/not assigned/);
  });

  it("operator_gate_get throws on unknown gate_id (never silent-null)", async () => {
    const res = await callAction(safetyTool, "operator_gate_get", { gate_id: "APV-99999" });
    expect(res.success).toBe(false);
    expect(String(res.error)).toMatch(/unknown gate/);
  });

  it("operator_gate_render_markdown emits operator-readable table with verdict + part info", async () => {
    const opened = await callAction(safetyTool, "operator_gate_open", baseGateInput());
    const md = await callAction(safetyTool, "operator_gate_render_markdown", {
      gate_id: opened.data.gate_id,
    });
    expect(md.data.markdown).toMatch(/# Operator Approval Gate APV-/);
    expect(md.data.markdown).toMatch(/JM-DIE-12345/);
    expect(md.data.markdown).toMatch(/Rev A/);
    expect(md.data.markdown.includes("PENDING")).toBe(true);
  });

  it("operator_gate_open throws on empty checklist (R12 fail-loud)", async () => {
    const res = await callAction(safetyTool, "operator_gate_open", baseGateInput({ checklist: [] }));
    expect(res.success).toBe(false);
    expect(String(res.error)).toMatch(/at least one checklist item/);
  });

  it("operator_gate_open throws on empty assigned_operators (R12 fail-loud)", async () => {
    const res = await callAction(safetyTool, "operator_gate_open", baseGateInput({ assigned_operators: [] }));
    expect(res.success).toBe(false);
    expect(String(res.error)).toMatch(/at least one assigned operator/);
  });
});

// ─── Schema enforcement (z.enum catches typos) ──────────────────────────────

describe("prism_safety — z.enum rejects unknown operator_gate_* typos", () => {
  it("rejects 'operator_gate_oepn' (typo) via the action enum", async () => {
    const res = await callAction(safetyTool, "operator_gate_oepn" as any, baseGateInput());
    expect(res.success).toBe(false);
  });
});
