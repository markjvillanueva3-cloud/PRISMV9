/** HzpDashAuditEngine tests — HZD-03 (HZP-DASH-MS0). */
import { describe, it, expect } from "vitest";
import { HzpDashAuditEngine, type AuditEnvelopeRequest } from "../engines/HzpDashAuditEngine.js";

const req = (over: Partial<AuditEnvelopeRequest> = {}): AuditEnvelopeRequest => ({
  operation: "assign",
  actor: "operator",
  authorized: true,
  authority_reason: "domain-match:mill",
  ts_iso: "2026-05-24T00:00:00.000Z",
  ...over,
});

describe("HzpDashAuditEngine.build — envelope shape + validation", () => {
  it("happy path produces all required fields + schema_version", () => {
    const env = HzpDashAuditEngine.build(req(), "abc123");
    expect(env.schema_version).toBe("hzp-dash-audit-1.0.0");
    expect(env.operation).toBe("assign");
    expect(env.actor).toBe("operator");
    expect(env.authorized).toBe(true);
    expect(env.authority_reason).toBe("domain-match:mill");
    expect(env.ts).toBe("2026-05-24T00:00:00.000Z");
    expect(env.audit_id).toMatch(/^hzpd-[0-9a-z]+-abc123$/);
  });

  it("optional fields default to null (target_slot, task_id, task_text, payload)", () => {
    const env = HzpDashAuditEngine.build(req());
    expect(env.target_slot).toBeNull();
    expect(env.task_id).toBeNull();
    expect(env.task_text).toBeNull();
    expect(env.payload).toBeNull();
  });

  it("populated optional fields pass through unchanged", () => {
    const env = HzpDashAuditEngine.build(req({
      target_slot: "bravo", task_id: "t-42", task_text: "compute kienzle",
      payload: { extra: 1 },
    }));
    expect(env.target_slot).toBe("bravo");
    expect(env.task_id).toBe("t-42");
    expect(env.task_text).toBe("compute kienzle");
    expect(env.payload).toEqual({ extra: 1 });
  });

  it("audit_id is deterministic given ts + randHex", () => {
    const a = HzpDashAuditEngine.build(req(), "deadbe");
    const b = HzpDashAuditEngine.build(req(), "deadbe");
    expect(a.audit_id).toBe(b.audit_id);
  });

  it("audit_id randomized when randHex omitted (probabilistic — 2 calls differ)", () => {
    const a = HzpDashAuditEngine.build(req());
    const b = HzpDashAuditEngine.build(req());
    // Same ts, different random suffix → IDs differ (~1 in 16M collision odds, fine for test)
    expect(a.audit_id).not.toBe(b.audit_id);
  });

  it("invalid operation enum → zod throws", () => {
    expect(() => HzpDashAuditEngine.build({ ...req(), operation: "nope" as never })).toThrow();
  });

  it("missing actor → zod throws", () => {
    expect(() => HzpDashAuditEngine.build({ ...req(), actor: "" })).toThrow();
  });

  it("invalid ts_iso → throws with descriptive message", () => {
    expect(() => HzpDashAuditEngine.build({ ...req(), ts_iso: "not-a-date" })).toThrow(/invalid ts_iso/);
  });
});

describe("HzpDashAuditEngine — serialization + render", () => {
  it("toJsonl produces single-line JSON parseable back to envelope", () => {
    const env = HzpDashAuditEngine.build(req({ target_slot: "alpha" }), "f00f00");
    const line = HzpDashAuditEngine.toJsonl(env);
    expect(line.includes("\n")).toBe(false);
    const parsed = JSON.parse(line);
    expect(parsed.audit_id).toBe(env.audit_id);
    expect(parsed.target_slot).toBe("alpha");
  });

  it("renderLine for authorized op shows ✓ + arrow + slot", () => {
    const env = HzpDashAuditEngine.build(req({ target_slot: "bravo" }), "111111");
    const out = HzpDashAuditEngine.renderLine(env);
    expect(out).toContain("[assign]");
    expect(out).toContain("operator");
    expect(out).toContain("→bravo");
    expect(out).toContain("[✓]");
  });

  it("renderLine for rejected op shows ✗", () => {
    const env = HzpDashAuditEngine.build(req({ authorized: false, authority_reason: "refuse-rule-veto:x" }), "222222");
    const out = HzpDashAuditEngine.renderLine(env);
    expect(out).toContain("[✗]");
    expect(out).toContain("refuse-rule-veto:x");
  });
});
