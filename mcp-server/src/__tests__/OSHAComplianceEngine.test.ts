/**
 * OSHAComplianceEngine.test.ts -- U-HOTEL-OSHA-DASHBOARD (gap #5 of HOTEL-ERP-FRONTEND-WIRING-SPEC)
 *
 * The OSHACompliancePage lists ALL incidents + ALL PPE assignments and submits near-miss reports, but
 * the OSHAComplianceEngine (the incident STORE, distinct from the OSHA300LogEngine recordability CALC
 * engine) was wired to NO dispatcher. This unit wires it + adds the unfiltered listAllPPE() the
 * dashboard's PPE panel needs. These tests pin the store behaviour with real reference values:
 * createIncident (incl. the near-miss path), listIncidents filters, generateOSHA300Log recordable/year
 * filtering, and listAllPPE decoration + sort.
 *
 * The engine's incident/PPE Maps are process-global and have no reset() -- cleared before each test
 * (mirrors the sibling credit-review test's private-Map clear).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { oshaComplianceEngine } from "../engines/OSHAComplianceEngine.js";
import type { OSHAIncident, PPEAssignment } from "../engines/OSHAComplianceEngine.js";

function reset(): void {
  (oshaComplianceEngine as any).incidents.clear();
  (oshaComplianceEngine as any).ppeAssignments.clear();
}

type IncidentInput = Omit<OSHAIncident, "id" | "created_at" | "recordable">;
function incidentDefaults(over: Partial<IncidentInput> = {}): IncidentInput {
  return {
    incident_date: "2026-06-24",
    employee_id: "EMP-1",
    employee_name: "Jane Doe",
    location: "Cell 3",
    description: "Caught finger in fixture",
    injury_type: "injury",
    body_part_affected: "finger",
    days_away: 0,
    days_restricted: 0,
    medical_treatment: "first_aid",
    osha_case_number: undefined,
    reported_by: "Supervisor",
    anonymous: false,
    witnesses: [],
    corrective_actions: [],
    ...over,
  };
}

function ppeDefaults(over: Partial<Omit<PPEAssignment, "id">> = {}): Omit<PPEAssignment, "id"> {
  return {
    employee_id: "EMP-1",
    ppe_type: "Safety glasses",
    size: "M",
    issued_date: "2026-06-01",
    issued_by: "Crib",
    condition: "good",
    ...over,
  };
}

describe("OSHAComplianceEngine -- incident store (U-HOTEL-OSHA-DASHBOARD gap #5)", () => {
  beforeEach(() => reset());

  it("createIncident computes recordable=true for medical-beyond-first-aid", () => {
    const inc = oshaComplianceEngine.createIncident(incidentDefaults({ medical_treatment: "hospitalization" }));
    expect(inc.recordable).toBe(true);
    expect(inc.injury_type).toBe("injury");
    expect(inc.id).toMatch(/^OSHA-/);
  });

  it("createIncident with injury_type 'near_miss' + first_aid + 0 days is NOT recordable (the near-miss path)", () => {
    const nm = oshaComplianceEngine.createIncident(incidentDefaults({
      injury_type: "near_miss", medical_treatment: "first_aid", days_away: 0, days_restricted: 0,
    }));
    expect(nm.injury_type).toBe("near_miss");
    expect(nm.recordable).toBe(false); // a near miss is not a recordable injury
    // and it is listable via the store (the dashboard's incidents feed includes near misses)
    expect(oshaComplianceEngine.listIncidents().some((i) => i.id === nm.id)).toBe(true);
  });

  it("createIncident recordable=true when days_away > 0 even with first_aid", () => {
    const inc = oshaComplianceEngine.createIncident(incidentDefaults({ medical_treatment: "first_aid", days_away: 3 }));
    expect(inc.recordable).toBe(true);
  });

  it("listIncidents returns all incidents newest-first, with year + recordable filters", () => {
    // recordable = medical_treatment !== "first_aid" || days_away>0 || days_restricted>0
    oshaComplianceEngine.createIncident(incidentDefaults({ incident_date: "2025-01-10", medical_treatment: "hospitalization" })); // 2025, recordable
    oshaComplianceEngine.createIncident(incidentDefaults({ incident_date: "2026-03-15", medical_treatment: "first_aid" }));       // 2026, NOT recordable
    oshaComplianceEngine.createIncident(incidentDefaults({ incident_date: "2026-08-20", medical_treatment: "hospitalization" })); // 2026, recordable
    expect(oshaComplianceEngine.listIncidents()).toHaveLength(3);
    // newest-first by incident_date
    expect(oshaComplianceEngine.listIncidents()[0].incident_date).toBe("2026-08-20");
    expect(oshaComplianceEngine.listIncidents({ year: 2026 })).toHaveLength(2);
    expect(oshaComplianceEngine.listIncidents({ recordable_only: true })).toHaveLength(2); // the 2025 + the 2026 hospitalization
  });

  it("generateOSHA300Log includes ONLY recordable incidents of the requested year", () => {
    oshaComplianceEngine.createIncident(incidentDefaults({ incident_date: "2026-02-01", medical_treatment: "hospitalization" })); // recordable 2026
    oshaComplianceEngine.createIncident(incidentDefaults({ incident_date: "2026-05-01", medical_treatment: "first_aid" }));       // NOT recordable
    oshaComplianceEngine.createIncident(incidentDefaults({ incident_date: "2025-09-01", medical_treatment: "hospitalization" })); // recordable 2025
    const log = oshaComplianceEngine.generateOSHA300Log(2026);
    expect(log).toHaveLength(1);
    expect(log[0].date_of_injury).toBe("2026-02-01");
    expect(log[0].employee_name).toBe("Jane Doe");
  });

  it("ADVERSARIAL: generateOSHA300Log for a year with no recordable incidents -> []", () => {
    oshaComplianceEngine.createIncident(incidentDefaults({ incident_date: "2026-01-01", medical_treatment: "first_aid" }));
    expect(oshaComplianceEngine.generateOSHA300Log(2026)).toEqual([]);
    expect(oshaComplianceEngine.generateOSHA300Log(1999)).toEqual([]);
  });
});

describe("OSHAComplianceEngine.listAllPPE() -- unfiltered PPE list (U-HOTEL-OSHA-DASHBOARD gap #5)", () => {
  beforeEach(() => reset());

  it("returns EVERY PPE assignment (across employees) decorated with needs_replacement", () => {
    oshaComplianceEngine.assignPPE(ppeDefaults({ employee_id: "EMP-1", ppe_type: "Glasses", condition: "good" }));
    oshaComplianceEngine.assignPPE(ppeDefaults({ employee_id: "EMP-2", ppe_type: "Gloves", condition: "replace" }));
    const all = oshaComplianceEngine.listAllPPE();
    expect(all).toHaveLength(2);
    const glasses = all.find((p) => p.ppe_type === "Glasses")!;
    const gloves = all.find((p) => p.ppe_type === "Gloves")!;
    expect(glasses.needs_replacement).toBe(false); // condition "good"
    expect(gloves.needs_replacement).toBe(true);   // condition "replace"
  });

  it("needs_replacement is true ONLY for condition 'replace' (good/worn -> false)", () => {
    oshaComplianceEngine.assignPPE(ppeDefaults({ ppe_type: "A", condition: "good" }));
    oshaComplianceEngine.assignPPE(ppeDefaults({ ppe_type: "B", condition: "worn" }));
    oshaComplianceEngine.assignPPE(ppeDefaults({ ppe_type: "C", condition: "replace" }));
    const byType = Object.fromEntries(oshaComplianceEngine.listAllPPE().map((p) => [p.ppe_type, p.needs_replacement]));
    expect(byType).toEqual({ A: false, B: false, C: true });
  });

  it("ADVERSARIAL: empty PPE store -> [] (no throw)", () => {
    expect(oshaComplianceEngine.listAllPPE()).toEqual([]);
  });

  it("listPPEByEmployee returns ONLY the requested employee's PPE, decorated with needs_replacement", () => {
    // The per-employee filter (distinct contract from listAllPPE) -- the OSHACompliancePage drill-down reads it.
    oshaComplianceEngine.assignPPE(ppeDefaults({ employee_id: "EMP-1", ppe_type: "Glasses", condition: "good" }));
    oshaComplianceEngine.assignPPE(ppeDefaults({ employee_id: "EMP-1", ppe_type: "Boots", condition: "replace" }));
    oshaComplianceEngine.assignPPE(ppeDefaults({ employee_id: "EMP-2", ppe_type: "Gloves", condition: "good" }));
    const emp1 = oshaComplianceEngine.listPPEByEmployee("EMP-1");
    expect(emp1).toHaveLength(2); // EMP-2's Gloves are excluded -- a broken filter would return 3
    expect(emp1.every((p) => p.employee_id === "EMP-1")).toBe(true);
    expect(emp1.find((p) => p.ppe_type === "Boots")!.needs_replacement).toBe(true);   // condition "replace"
    expect(emp1.find((p) => p.ppe_type === "Glasses")!.needs_replacement).toBe(false); // condition "good"
    // An employee with no PPE assignments -> [] (no throw, no cross-employee leak).
    expect(oshaComplianceEngine.listPPEByEmployee("EMP-NONE")).toEqual([]);
  });
});
