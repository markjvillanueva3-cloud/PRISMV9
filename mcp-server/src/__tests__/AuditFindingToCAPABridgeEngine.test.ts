/**
 * AuditFindingToCAPABridgeEngine — covers create + idempotency + reverse
 * lookup + list filtering + 4 severities + SoD + R12 fail-loud.
 *
 * @milestone HOTEL/U-AUDIT-CAPA-BRIDGE (2026-05-26, slot:hotel iter8 /goal Phase 3)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { auditFindingToCAPABridgeEngine } from "../engines/AuditFindingToCAPABridgeEngine.js";
import { kaizenLeanSigmaEngine } from "../engines/KaizenLeanSigmaEngine.js";

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const baseInput = {
  finding_id: "F-001",
  department_code: "mill",
  severity: "high" as const,
  title: "Coolant concentration below spec on op 3",
  description: "Refractometer read 6.2%, spec 8-10%. Tool life dropped 20%.",
  raised_by_employee_id: "INSP-001",
  champion_employee_id: "EMP-001",
  sponsor_employee_id: "MGR-001",
};

describe("AuditFindingToCAPABridgeEngine", () => {
  beforeEach(() => {
    auditFindingToCAPABridgeEngine.reset();
    kaizenLeanSigmaEngine.reset();
  });

  it("HAPPY PATH: spawns a DMAIC kaizen event from a finding", () => {
    const bridge = auditFindingToCAPABridgeEngine.createCapaFromFinding(baseInput);
    expect(bridge.finding_id).toBe("F-001");
    expect(bridge.kaizen_event_id).toMatch(/^KAIZEN-\d{6}$/);
    expect(bridge.department_code).toBe("mill");
    expect(bridge.severity).toBe("high");
    expect(bridge.bridged_at).toMatch(ISO_RE);
    expect(bridge.bridged_by_employee_id).toBe("MGR-001");
    // Verify kaizen event was actually opened with severity prefix
    const events = kaizenLeanSigmaEngine.listEvents({});
    expect(events.length).toBe(1);
    expect(events[0]?.title).toContain("[HIGH]");
    expect(events[0]?.title).toContain("F-001");
    expect(events[0]?.champion_employee_id).toBe("EMP-001");
    expect(events[0]?.sponsor_employee_id).toBe("MGR-001");
  });

  it("IDEMPOTENCY: re-bridging same finding returns existing record, no duplicate event", () => {
    const a = auditFindingToCAPABridgeEngine.createCapaFromFinding(baseInput);
    const b = auditFindingToCAPABridgeEngine.createCapaFromFinding(baseInput);
    expect(a.kaizen_event_id).toBe(b.kaizen_event_id);
    expect(kaizenLeanSigmaEngine.listEvents({}).length).toBe(1);
  });

  it("REVERSE LOOKUP: getKaizenEventForFinding + getFindingForKaizenEvent", () => {
    const bridge = auditFindingToCAPABridgeEngine.createCapaFromFinding(baseInput);
    expect(auditFindingToCAPABridgeEngine.getKaizenEventForFinding("F-001")).toBe(bridge.kaizen_event_id);
    expect(auditFindingToCAPABridgeEngine.getFindingForKaizenEvent(bridge.kaizen_event_id)).toBe("F-001");
    expect(auditFindingToCAPABridgeEngine.getKaizenEventForFinding("F-999")).toBe(null);
  });

  it("ALL 4 SEVERITIES with prefix in title", () => {
    for (const sev of ["low", "medium", "high", "critical"] as const) {
      auditFindingToCAPABridgeEngine.reset();
      kaizenLeanSigmaEngine.reset();
      const bridge = auditFindingToCAPABridgeEngine.createCapaFromFinding({ ...baseInput, severity: sev });
      expect(bridge.severity).toBe(sev);
      const ev = kaizenLeanSigmaEngine.listEvents({})[0];
      expect(ev?.title).toContain(`[${sev.toUpperCase()}]`);
    }
  });

  it("REJECTS raised_by == sponsor (SoD: finder cannot self-sponsor)", () => {
    expect(() =>
      auditFindingToCAPABridgeEngine.createCapaFromFinding({
        ...baseInput, sponsor_employee_id: "INSP-001", // same as raised_by
      }),
    ).toThrow(/finder cannot self-sponsor/);
  });

  it("REJECTS missing required fields (R12)", () => {
    for (const field of ["finding_id", "department_code", "title", "description", "raised_by_employee_id", "champion_employee_id", "sponsor_employee_id"] as const) {
      expect(() =>
        auditFindingToCAPABridgeEngine.createCapaFromFinding({ ...baseInput, [field]: "" }),
      ).toThrow();
    }
  });

  it("REJECTS invalid severity (R12 adversarial)", () => {
    expect(() =>
      auditFindingToCAPABridgeEngine.createCapaFromFinding({
        ...baseInput, severity: "bogus" as unknown as "high",
      }),
    ).toThrow(/invalid severity/);
  });

  it("listBridges filters by dept + severity", () => {
    auditFindingToCAPABridgeEngine.createCapaFromFinding({ ...baseInput, finding_id: "F-1", department_code: "mill", severity: "high" });
    auditFindingToCAPABridgeEngine.createCapaFromFinding({ ...baseInput, finding_id: "F-2", department_code: "lathe", severity: "high" });
    auditFindingToCAPABridgeEngine.createCapaFromFinding({ ...baseInput, finding_id: "F-3", department_code: "mill", severity: "critical" });
    expect(auditFindingToCAPABridgeEngine.listBridges({ department_code: "mill" }).length).toBe(2);
    expect(auditFindingToCAPABridgeEngine.listBridges({ severity: "critical" }).length).toBe(1);
    expect(auditFindingToCAPABridgeEngine.listBridges({}).length).toBe(3);
  });

  it("REJECTS reverse-lookup with empty argument (R12)", () => {
    expect(() => auditFindingToCAPABridgeEngine.getKaizenEventForFinding("")).toThrow();
    expect(() => auditFindingToCAPABridgeEngine.getFindingForKaizenEvent("")).toThrow();
  });

  it("PSN roost: 4 edges_in into KaizenLeanSigma", () => {
    const r = auditFindingToCAPABridgeEngine.systemVizRoost();
    expect(r.layer).toBe(7);
    expect(r.node_type).toBe("hub");
    expect(r.psn_legs).toEqual([7, 11]);
    expect(r.edges_out).toContain("KaizenLeanSigmaEngine");
    expect(r.edges_in.length).toBeGreaterThanOrEqual(4);
  });
});
