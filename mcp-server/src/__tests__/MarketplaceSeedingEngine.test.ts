/**
 * MarketplaceSeedingEngine.test.ts — real-value tests for the directory-LEAD funnel of the PRISM
 * networking marketplace (galaxy:business, slot:hotel). The engine seeds leads from thin
 * {@link SupplierCapabilityHint}s, dedups against existing leads + live registered suppliers, and bridges
 * a lead into a full {@link SupplierOnboardingEngine} application once a shop completes the gap.
 *
 * The funnel under test: directory hint → seedFromHints → LEAD (invited) → markContacted → convertToApplication
 *   → SupplierOnboarding application (verify/approve are SupplierOnboarding's own concern, not re-tested here).
 *
 * Assertions verify the real contract: the seeded lead carries ONLY directory fields (no PII); convert
 * MERGES the lead's region+processes+certs with the shop's state+machines+materialGroups+contactEmail and
 * produces a real onboarding application whose contact handle is MASKED; dedup never overwrites; the lead
 * never hard-deletes; and every bad-input path fails loud.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MarketplaceSeedingEngine,
  type ConvertToApplicationInput,
} from "../engines/MarketplaceSeedingEngine.js";
import {
  SupplierCapabilityProfileEngine,
  type RegisterSupplierInput,
} from "../engines/SupplierCapabilityProfileEngine.js";
import { SupplierOnboardingEngine } from "../engines/SupplierOnboardingEngine.js";
import { type SupplierCapabilityHint } from "../engines/VendorCatalogImportEngine.js";
import { MARKETPLACE_SEEDING_POLICY_VERSION } from "../data/marketplace-seeding-policy.js";

// ---- fixtures -------------------------------------------------------------

const hintMill: SupplierCapabilityHint = {
  supplierId: "united-cnc",
  name: "United CNC Machining",
  website: "https://unitedcnc.example",
  processes: ["mill", "turn"],
  certifications: ["ISO9001"],
  region: "Midwest",
  sourceTag: "thomasnet",
};

const hintWedm: SupplierCapabilityHint = {
  supplierId: "apex-edm",
  name: "Apex Wire EDM",
  website: null,
  processes: ["wedm"],
  certifications: [],
  region: "West",
  sourceTag: "thomasnet",
};

/** The fields a shop supplies to complete `united-cnc` into a full application. */
const completion: ConvertToApplicationInput["completion"] = {
  state: "OH",
  machines: [
    { machineId: "VF-2", process: "mill", axes: 3, envelopeMm: { x: 600, y: 400, z: 500 }, maxRpm: 12000, controller: "haas" },
  ],
  materialGroups: ["P", "M"],
  bestToleranceMm: 0.01,
  contactEmail: "ops@unitedcnc.com",
  contactPhone: "555-0142",
};

const SEEDED_AT = "2026-05-31T00:00:00.000Z";

beforeEach(() => {
  MarketplaceSeedingEngine.__resetForTests();
  SupplierOnboardingEngine.__resetForTests();
  SupplierCapabilityProfileEngine.__resetForTests();
});

// ===========================================================================
// SEED — directory hints → invited leads
// ===========================================================================

describe("seedFromHints", () => {
  it("seeds a lead per hint with only directory fields (status invited, no PII)", () => {
    const res = MarketplaceSeedingEngine.seedFromHints({ hints: [hintMill, hintWedm], seededAt: SEEDED_AT });
    expect(res.summary).toEqual({ hintsIn: 2, seeded: 2, skippedExistingLead: 0, skippedAlreadyRegistered: 0 });
    expect(res.schemaVersion).toBe(MARKETPLACE_SEEDING_POLICY_VERSION);

    const mill = res.seeded.find((l) => l.supplierId === "united-cnc")!;
    expect(mill).toMatchObject({
      status: "invited",
      processes: ["mill", "turn"],
      certifications: ["ISO9001"],
      region: "Midwest",
      sourceTag: "thomasnet",
      website: "https://unitedcnc.example",
      applicationId: null,
      declineReason: null,
      seededAt: SEEDED_AT,
    });
    // a lead carries NO contact handle (the directory hint has none) — never any PII key on a lead.
    expect(Object.keys(mill)).not.toContain("contactEmail");
    expect(Object.keys(mill)).not.toContain("contactPhone");

    const wedm = res.seeded.find((l) => l.supplierId === "apex-edm")!;
    expect(wedm).toMatchObject({ website: null, certifications: [], processes: ["wedm"] });
  });

  it("skips a hint whose supplierId is ALREADY a lead (no silent overwrite)", () => {
    MarketplaceSeedingEngine.seedFromHints({ hints: [hintMill], seededAt: SEEDED_AT });
    // re-seed the same id with a DIFFERENT name — must be skipped, original preserved.
    const res = MarketplaceSeedingEngine.seedFromHints({
      hints: [{ ...hintMill, name: "United CNC RENAMED" }],
      seededAt: "2026-06-01T00:00:00.000Z",
    });
    expect(res.summary.seeded).toBe(0);
    expect(res.summary.skippedExistingLead).toBe(1);
    expect(res.skipped[0]).toEqual({ supplierId: "united-cnc", reason: "already-a-lead" });
    // original lead unchanged
    expect(MarketplaceSeedingEngine.getLead("united-cnc")!.name).toBe("United CNC Machining");
  });

  it("skips a hint whose supplierId is ALREADY a live registered supplier", () => {
    const registered: RegisterSupplierInput = {
      supplierId: "united-cnc",
      name: "United CNC (already live)",
      geography: { region: "Midwest", state: "OH" },
      processes: ["mill"],
      machines: [{ machineId: "M", process: "mill", axes: 3, envelopeMm: { x: 500, y: 500, z: 500 }, maxRpm: 10000, controller: "haas" }],
      materialGroups: ["P"],
      bestToleranceMm: 0.01,
      certifications: ["ISO9001"],
    };
    SupplierCapabilityProfileEngine.registerSupplier(registered);

    const res = MarketplaceSeedingEngine.seedFromHints({ hints: [hintMill, hintWedm], seededAt: SEEDED_AT });
    expect(res.summary).toEqual({ hintsIn: 2, seeded: 1, skippedExistingLead: 0, skippedAlreadyRegistered: 1 });
    expect(res.skipped[0]).toEqual({ supplierId: "united-cnc", reason: "already-registered" });
    // only the wedm shop became a lead
    expect(res.seeded.map((l) => l.supplierId)).toEqual(["apex-edm"]);
  });
});

// ===========================================================================
// LIST + CONTACT
// ===========================================================================

describe("listLeads + markContacted", () => {
  it("filters leads by status, region, and offered process", () => {
    MarketplaceSeedingEngine.seedFromHints({ hints: [hintMill, hintWedm], seededAt: SEEDED_AT });
    expect(MarketplaceSeedingEngine.listLeads().map((l) => l.supplierId)).toEqual(["apex-edm", "united-cnc"]); // sorted
    expect(MarketplaceSeedingEngine.listLeads({ status: "invited" })).toHaveLength(2);
    expect(MarketplaceSeedingEngine.listLeads({ region: "midwest" }).map((l) => l.supplierId)).toEqual(["united-cnc"]); // case-insensitive
    expect(MarketplaceSeedingEngine.listLeads({ process: "wedm" }).map((l) => l.supplierId)).toEqual(["apex-edm"]);
  });

  it("markContacted moves invited → contacted", () => {
    MarketplaceSeedingEngine.seedFromHints({ hints: [hintMill], seededAt: SEEDED_AT });
    const lead = MarketplaceSeedingEngine.markContacted("united-cnc", "2026-06-02T00:00:00.000Z");
    expect(lead.status).toBe("contacted");
    expect(lead.updatedAt).toBe("2026-06-02T00:00:00.000Z");
    expect(MarketplaceSeedingEngine.listLeads({ status: "contacted" })).toHaveLength(1);
  });
});

// ===========================================================================
// CONVERT — the bridge into SupplierOnboarding
// ===========================================================================

describe("convertToApplication", () => {
  it("bridges a lead into a real onboarding application, merging directory + shop fields", () => {
    MarketplaceSeedingEngine.seedFromHints({ hints: [hintMill], seededAt: SEEDED_AT });
    const res = MarketplaceSeedingEngine.convertToApplication({
      supplierId: "united-cnc",
      applicationId: "APP-1",
      completion,
      submittedAt: "2026-06-03T00:00:00.000Z",
    });

    // lead flipped to applied + linked to the application
    expect(res.lead).toMatchObject({ status: "applied", applicationId: "APP-1", updatedAt: "2026-06-03T00:00:00.000Z" });

    // a REAL onboarding application now exists (system of record handed off)
    expect(res.application).toMatchObject({
      applicationId: "APP-1",
      supplierId: "united-cnc",
      companyName: "United CNC Machining", // from the lead
      status: "applied", // SupplierOnboarding's INITIAL status
    });
    expect(SupplierOnboardingEngine.getApplication("APP-1")?.applicationId).toBe("APP-1");

    // MERGE: region+processes+certs from the lead (directory); state+machines+materialGroups from the shop
    const draft = res.application.profileDraft;
    expect(draft.geography).toMatchObject({ region: "Midwest", state: "OH" }); // region directory, state shop
    expect(draft.processes).toEqual(["mill", "turn"]); // directory carry-through
    expect(draft.certifications).toEqual(["ISO9001"]); // directory carry-through
    expect(draft.materialGroups).toEqual(["P", "M"]); // shop completion (the gap a lead lacked)
    expect(draft.bestToleranceMm).toBe(0.01);

    // PII: the contact handle is MASKED in the onboarding record, never the raw value.
    expect(res.application.contactEmailMasked).toContain("***");
    expect(res.application.contactEmailMasked).not.toBe("ops@unitedcnc.com");
    expect(Object.keys(res.application)).not.toContain("contactEmail");
  });

  it("lets the shop OVERRIDE the directory-derived processes + certs", () => {
    MarketplaceSeedingEngine.seedFromHints({ hints: [hintMill], seededAt: SEEDED_AT });
    const res = MarketplaceSeedingEngine.convertToApplication({
      supplierId: "united-cnc",
      applicationId: "APP-OV",
      completion: { ...completion, processes: ["5axis"], certifications: ["AS9100", "NADCAP"] },
      submittedAt: "2026-06-03T00:00:00.000Z",
    });
    expect(res.application.profileDraft.processes).toEqual(["5axis"]);
    expect(res.application.profileDraft.certifications).toEqual(["AS9100", "NADCAP"]);
  });

  it("can convert a CONTACTED lead (invited → contacted → applied)", () => {
    MarketplaceSeedingEngine.seedFromHints({ hints: [hintMill], seededAt: SEEDED_AT });
    MarketplaceSeedingEngine.markContacted("united-cnc", "2026-06-02T00:00:00.000Z");
    const res = MarketplaceSeedingEngine.convertToApplication({
      supplierId: "united-cnc",
      applicationId: "APP-2",
      completion,
      submittedAt: "2026-06-03T00:00:00.000Z",
    });
    expect(res.lead.status).toBe("applied");
  });
});

// ===========================================================================
// DECLINE + never-delete
// ===========================================================================

describe("declineLead", () => {
  it("declines a lead with a reason and keeps the record (never hard-deletes)", () => {
    MarketplaceSeedingEngine.seedFromHints({ hints: [hintWedm], seededAt: SEEDED_AT });
    const lead = MarketplaceSeedingEngine.declineLead("apex-edm", "no response after 3 outreach attempts", "2026-06-05T00:00:00.000Z");
    expect(lead).toMatchObject({ status: "declined", declineReason: "no response after 3 outreach attempts" });
    // still retrievable (record preserved, not deleted)
    expect(MarketplaceSeedingEngine.getLead("apex-edm")!.status).toBe("declined");
  });
});

// ===========================================================================
// FAIL-LOUD
// ===========================================================================

describe("fail-loud validation", () => {
  it("throws on a malformed hint (empty supplierId) — validated by the array schema with its path", () => {
    // SeedFromHintsSchema deep-validates hints: z.array(HintSchema); the ZodError names the offending
    // field + its array index in the issue path (["hints", 0, "supplierId"]).
    expect(() =>
      MarketplaceSeedingEngine.seedFromHints({ hints: [{ ...hintMill, supplierId: "" }], seededAt: SEEDED_AT }),
    ).toThrow(/hint\.supplierId is required/);
  });

  it("throws on an empty seededAt", () => {
    expect(() => MarketplaceSeedingEngine.seedFromHints({ hints: [hintMill], seededAt: "" })).toThrow(/seededAt/);
  });

  it("throws on convert of an unknown lead", () => {
    expect(() =>
      MarketplaceSeedingEngine.convertToApplication({ supplierId: "ghost", applicationId: "APP-X", completion, submittedAt: SEEDED_AT }),
    ).toThrow(/unknown lead supplierId 'ghost'/);
  });

  it("throws on convert of an already-applied lead (illegal transition)", () => {
    MarketplaceSeedingEngine.seedFromHints({ hints: [hintMill], seededAt: SEEDED_AT });
    MarketplaceSeedingEngine.convertToApplication({ supplierId: "united-cnc", applicationId: "APP-1", completion, submittedAt: SEEDED_AT });
    expect(() =>
      MarketplaceSeedingEngine.convertToApplication({ supplierId: "united-cnc", applicationId: "APP-1b", completion, submittedAt: SEEDED_AT }),
    ).toThrow(/illegal lead transition 'applied' → 'applied'/);
  });

  it("propagates a duplicate-applicationId throw from SupplierOnboarding and leaves the 2nd lead UNCHANGED (no partial state)", () => {
    MarketplaceSeedingEngine.seedFromHints({ hints: [hintMill, hintWedm], seededAt: SEEDED_AT });
    MarketplaceSeedingEngine.convertToApplication({ supplierId: "united-cnc", applicationId: "APP-DUP", completion, submittedAt: SEEDED_AT });
    // a SECOND lead converting with the SAME applicationId → submitApplication throws duplicate.
    expect(() =>
      MarketplaceSeedingEngine.convertToApplication({ supplierId: "apex-edm", applicationId: "APP-DUP", completion, submittedAt: SEEDED_AT }),
    ).toThrow(/duplicate applicationId 'APP-DUP'/);
    // fail-loud, no partial state: the 2nd lead is still invited (submit ran BEFORE the status flip).
    expect(MarketplaceSeedingEngine.getLead("apex-edm")!.status).toBe("invited");
  });

  it("throws on markContacted of an unknown lead", () => {
    expect(() => MarketplaceSeedingEngine.markContacted("ghost", SEEDED_AT)).toThrow(/unknown lead supplierId 'ghost'/);
  });

  it("throws on declineLead with an empty reason", () => {
    MarketplaceSeedingEngine.seedFromHints({ hints: [hintMill], seededAt: SEEDED_AT });
    expect(() => MarketplaceSeedingEngine.declineLead("united-cnc", "  ", SEEDED_AT)).toThrow(/non-empty reason is required/);
  });

  it("throws on a declined → applied transition (terminal)", () => {
    MarketplaceSeedingEngine.seedFromHints({ hints: [hintMill], seededAt: SEEDED_AT });
    MarketplaceSeedingEngine.declineLead("united-cnc", "opted out", SEEDED_AT);
    expect(() =>
      MarketplaceSeedingEngine.convertToApplication({ supplierId: "united-cnc", applicationId: "APP-Z", completion, submittedAt: SEEDED_AT }),
    ).toThrow(/illegal lead transition 'declined' → 'applied'/);
  });

  it("throws on listLeads with an unknown status filter", () => {
    expect(() => MarketplaceSeedingEngine.listLeads({ status: "bogus" as never })).toThrow(/unknown status filter/);
  });
});
