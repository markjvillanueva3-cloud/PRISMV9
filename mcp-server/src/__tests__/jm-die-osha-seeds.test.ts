/**
 * jm-die-osha-seeds.test.ts -- HOTEL-ERP-SEED/U-ERP-OSHA-SEED (R9)
 * ===============================================================
 *
 * Encodes INTENT, not shape: the canonical OSHA seeds must (a) load into the
 * live engine singleton, (b) satisfy the exact OSHA recordability rule the
 * engine derives, and (c) flow correctly through the 300-log / 300A summary /
 * PPE derivations the OSHACompliancePage reads. A drift in any seed's
 * `recordable` flag, a broken employee reference, or a regression in the
 * derivation logic fails a concrete assertion below.
 */
import { describe, it, expect } from "vitest";
import { oshaComplianceEngine } from "../engines/OSHAComplianceEngine.js";
import { JM_DIE_OSHA_INCIDENT_SEEDS, JM_DIE_PPE_SEEDS } from "../data/jm-die-osha-seeds.js";
import { JM_DIE_EMPLOYEE_SEEDS } from "../data/jm-die-employees.js";
import { oshaStandardForPPE, OSHA_PPE_STANDARDS } from "../data/osha-ppe-standards.js";

// The exact rule OSHAComplianceEngine.createIncident applies.
const isRecordable = (i: { medical_treatment: string; days_away: number; days_restricted: number }) =>
  i.medical_treatment !== "first_aid" || i.days_away > 0 || i.days_restricted > 0;

const seedIncidents = () =>
  oshaComplianceEngine.listIncidents().filter((i) => i.id.startsWith("OSHA-SEED-"));

describe("JM Die OSHA seed catalog -- recordability invariant", () => {
  it("every seed's `recordable` flag equals the engine's derivation rule (no drift)", () => {
    for (const inc of JM_DIE_OSHA_INCIDENT_SEEDS) {
      expect(inc.recordable).toBe(isRecordable(inc));
    }
  });

  it("holds 12 incidents with unique, stable, SEED-prefixed ids", () => {
    expect(JM_DIE_OSHA_INCIDENT_SEEDS.length).toBe(12);
    const ids = JM_DIE_OSHA_INCIDENT_SEEDS.map((i) => i.id);
    expect(new Set(ids).size).toBe(12);
    expect(ids.every((id) => id.startsWith("OSHA-SEED-"))).toBe(true);
  });

  it("recordable cases total 5 (4 in 2025, 1 in 2026) -- a realistic well-run-shop profile", () => {
    const recordable = JM_DIE_OSHA_INCIDENT_SEEDS.filter(isRecordable);
    expect(recordable.length).toBe(5);
    const by2025 = recordable.filter((i) => i.incident_date.startsWith("2025"));
    const by2026 = recordable.filter((i) => i.incident_date.startsWith("2026"));
    expect(by2025.length).toBe(4);
    expect(by2026.length).toBe(1);
  });

  it("every non-anonymous incident references a real JM Die employee id", () => {
    const roster = new Set(JM_DIE_EMPLOYEE_SEEDS.map((e) => e.id));
    for (const inc of JM_DIE_OSHA_INCIDENT_SEEDS) {
      if (inc.anonymous) continue;
      expect(typeof inc.employee_id).toBe("string");
      expect(roster.has(inc.employee_id as string)).toBe(true);
    }
  });

  it("recordable incidents carry an OSHA case number; non-recordable do not", () => {
    for (const inc of JM_DIE_OSHA_INCIDENT_SEEDS) {
      if (inc.recordable) {
        expect(typeof inc.osha_case_number).toBe("string");
        expect((inc.osha_case_number as string).length).toBeGreaterThan(0);
      } else {
        expect(inc.osha_case_number).toBeUndefined();
      }
    }
  });
});

describe("JM Die OSHA seed catalog -- loads into the live engine singleton", () => {
  it("the engine constructor hydrated all 12 seed incidents", () => {
    expect(seedIncidents().length).toBe(12);
  });

  it("listIncidents returns newest-first (incident_date descending)", () => {
    const seeded = seedIncidents();
    for (let n = 1; n < seeded.length; n++) {
      expect(seeded[n - 1].incident_date >= seeded[n].incident_date).toBe(true);
    }
  });

  it("recordable_only filter returns only recordable seed incidents", () => {
    const recordableSeeded = oshaComplianceEngine
      .listIncidents({ recordable_only: true })
      .filter((i) => i.id.startsWith("OSHA-SEED-"));
    expect(recordableSeeded.length).toBe(5);
    expect(recordableSeeded.every((i) => i.recordable)).toBe(true);
  });
});

describe("JM Die OSHA seed catalog -- 300 log / 300A summary derivation", () => {
  it("the 2025 OSHA 300 log lists exactly the 4 recordable 2025 cases", () => {
    const log2025 = oshaComplianceEngine.generateOSHA300Log(2025).filter((r) =>
      String(r.case_number).startsWith("JMD-2025"),
    );
    expect(log2025.length).toBe(4);
    // sorted ascending by date of injury
    for (let n = 1; n < log2025.length; n++) {
      expect(log2025[n - 1].date_of_injury <= log2025[n].date_of_injury).toBe(true);
    }
  });

  it("the 2026 OSHA 300 log lists exactly the 1 recordable 2026 case", () => {
    const log2026 = oshaComplianceEngine.generateOSHA300Log(2026).filter((r) =>
      String(r.case_number).startsWith("JMD-2026"),
    );
    expect(log2026.length).toBe(1);
  });

  it("the 2025 300A summary counts the 4 recordable cases and sums their lost days exactly", () => {
    // vitest isolate:true gives this file a fresh engine singleton and this file
    // never calls createIncident, so the seed-derived values are deterministic.
    const summary = oshaComplianceEngine.generateOSHA300ASummary(2025);
    expect(summary.total_recordable_cases).toBe(4);
    // days_away: 1 (002) + 2 (003) = 3
    expect(summary.total_days_away).toBe(3);
    // days_restricted: 3 (001) + 5 (003) + 1 (008) = 9
    expect(summary.total_days_restricted).toBe(9);
  });

  it("adversarial: a year with no incidents yields an empty 300 log and zeroed summary", () => {
    expect(oshaComplianceEngine.generateOSHA300Log(2099)).toEqual([]);
    const empty = oshaComplianceEngine.generateOSHA300ASummary(2099);
    expect(empty.total_recordable_cases).toBe(0);
    expect(empty.total_days_away).toBe(0);
  });
});

describe("JM Die OSHA seed catalog -- PPE assignments", () => {
  it("holds 12 PPE assignments with unique stable ids referencing real employees", () => {
    expect(JM_DIE_PPE_SEEDS.length).toBe(12);
    expect(new Set(JM_DIE_PPE_SEEDS.map((p) => p.id)).size).toBe(12);
    const roster = new Set(JM_DIE_EMPLOYEE_SEEDS.map((e) => e.id));
    for (const ppe of JM_DIE_PPE_SEEDS) {
      expect(roster.has(ppe.employee_id)).toBe(true);
      expect(["good", "worn", "replace"]).toContain(ppe.condition);
    }
  });

  it("listAllPPE decorates needs_replacement === (condition === 'replace') for the 2 flagged seeds", () => {
    const all = oshaComplianceEngine.listAllPPE().filter((p) => p.id.startsWith("PPE-SEED-"));
    expect(all.length).toBe(12);
    for (const p of all) {
      expect(p.needs_replacement).toBe(p.condition === "replace");
    }
    expect(all.filter((p) => p.needs_replacement).length).toBe(2);
  });
});

describe("OSHA PPE governing-standard classifier (29 CFR 1910 Subpart I + 1910.95)", () => {
  it("maps each hazard category to its canonical standard code", () => {
    expect(oshaStandardForPPE("Safety glasses (side-shield)").code).toBe("29 CFR 1910.133"); // eye/face
    expect(oshaStandardForPPE("Face shield (grinding)").code).toBe("29 CFR 1910.133");
    expect(oshaStandardForPPE("Steel-toe boots").code).toBe("29 CFR 1910.136"); // foot
    expect(oshaStandardForPPE("Cut-resistant gloves (A4)").code).toBe("29 CFR 1910.138"); // hand
    expect(oshaStandardForPPE("Hearing protection (28 dB muffs)").code).toBe("29 CFR 1910.95"); // hearing
    expect(oshaStandardForPPE("Hard hat").code).toBe("29 CFR 1910.135"); // head
    expect(oshaStandardForPPE("N95 respirator").code).toBe("29 CFR 1910.134"); // respiratory
  });
  it("falls back to 1910.132 general for non-Subpart-I items (back belt, hi-vis)", () => {
    expect(oshaStandardForPPE("Back-support belt").code).toBe("29 CFR 1910.132");
    expect(oshaStandardForPPE("High-visibility vest").code).toBe("29 CFR 1910.132");
  });
  it("is case-insensitive and returns a title with each code", () => {
    expect(oshaStandardForPPE("SAFETY GLASSES").code).toBe("29 CFR 1910.133");
    expect(oshaStandardForPPE("steel-toe BOOTS")).toEqual(OSHA_PPE_STANDARDS.foot);
    expect(oshaStandardForPPE("Cut-resistant gloves (A4)").title).toBe("Hand protection");
  });
  it("adversarial: empty / null / undefined / non-string -> general, never throws", () => {
    expect(() => {
      expect(oshaStandardForPPE("").code).toBe("29 CFR 1910.132");
      // @ts-expect-error runtime robustness for a free-text field
      expect(oshaStandardForPPE(null).code).toBe("29 CFR 1910.132");
      // @ts-expect-error runtime robustness for a free-text field
      expect(oshaStandardForPPE(undefined).code).toBe("29 CFR 1910.132");
    }).not.toThrow();
  });
});

describe("PPE seeds carry their governing 29 CFR standard (single-sourced from the classifier)", () => {
  it("every seed has a 1910 governing_standard equal to oshaStandardForPPE(ppe_type)", () => {
    for (const ppe of JM_DIE_PPE_SEEDS) {
      expect(ppe.governing_standard).toBeTruthy();
      expect(ppe.governing_standard!.code.startsWith("29 CFR 1910.")).toBe(true);
      expect(ppe.governing_standard).toEqual(oshaStandardForPPE(ppe.ppe_type));
    }
  });
  it("specific known seed cites are correct", () => {
    const by = (id: string) => JM_DIE_PPE_SEEDS.find((p) => p.id === id)!.governing_standard!.code;
    expect(by("PPE-SEED-001")).toBe("29 CFR 1910.133"); // safety glasses
    expect(by("PPE-SEED-002")).toBe("29 CFR 1910.136"); // steel-toe boots
    expect(by("PPE-SEED-003")).toBe("29 CFR 1910.138"); // cut-resistant gloves
    expect(by("PPE-SEED-005")).toBe("29 CFR 1910.95");  // hearing muffs
    expect(by("PPE-SEED-010")).toBe("29 CFR 1910.132"); // back-support belt -> general
    expect(by("PPE-SEED-012")).toBe("29 CFR 1910.132"); // hi-vis vest -> general
  });
});

describe("assignPPE auto-cites the governing standard (live-path wire)", () => {
  it("auto-populates governing_standard from ppe_type when caller omits it", () => {
    const ppe = oshaComplianceEngine.assignPPE({
      employee_id: "EMP-0001", ppe_type: "Cut-resistant gloves", size: "L",
      issued_date: "2026-06-30", issued_by: "EMP-0005", condition: "good",
    });
    expect(ppe.governing_standard?.code).toBe("29 CFR 1910.138");
  });
  it("respects an explicit governing_standard supplied by the caller", () => {
    const ppe = oshaComplianceEngine.assignPPE({
      employee_id: "EMP-0001", ppe_type: "Cut-resistant gloves", size: "L",
      issued_date: "2026-06-30", issued_by: "EMP-0005", condition: "good",
      governing_standard: OSHA_PPE_STANDARDS.head,
    });
    expect(ppe.governing_standard).toEqual(OSHA_PPE_STANDARDS.head);
  });
});
