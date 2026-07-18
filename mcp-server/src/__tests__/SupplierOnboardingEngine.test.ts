/**
 * SupplierOnboardingEngine.test.ts — real-value behavioral spec for the supply-side acquisition flow.
 *
 * Every assertion checks INTENT, not shape (R9): the happy path asserts that an APPROVED application
 * registers a LIVE profile in SupplierCapabilityProfileEngine (getProfile returns the exact draft AND
 * canSatisfy answers a real RFQ on it — so a regression that approves without registering, or
 * registers a wrong draft, FAILS); the gate asserts EXACT gap criteria for incomplete drafts; the PII
 * guard JSON.stringifies the public record and asserts the raw email + phone are ABSENT and the masked
 * forms are exact strings; every illegal transition is asserted to THROW. No toBeDefined / truthy /
 * bare-presence stubs.
 *
 * Determinism: all business timestamps are CALLER-SUPPLIED ISO strings and asserted to EXACT values —
 * no asserted value reads the system clock. Both engines are reset between tests.
 *
 * Spanning supplier classes (>=3): a 5-axis aerospace shop (5axis + S superalloy + AS9100/NADCAP), a
 * turning shop (turn + P steel), and a wire-EDM shop (wedm + H hardened, sodick controller).
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  SupplierOnboardingEngine,
  type SubmitApplicationInput,
} from "../engines/SupplierOnboardingEngine.js";
import { SupplierCapabilityProfileEngine } from "../engines/SupplierCapabilityProfileEngine.js";
import {
  ONBOARDING_STATUSES,
  TERMINAL_ONBOARDING_STATUSES,
  isLegalTransition,
  isValidOnboardingStatus,
  evaluateCompleteness,
} from "../data/supplier-onboarding-policy.js";

beforeEach(() => {
  SupplierOnboardingEngine.__resetForTests();
  SupplierCapabilityProfileEngine.__resetForTests();
});

const ISO_SUBMIT = "2026-05-30T10:00:00.000Z";
const ISO_VERIFY = "2026-05-30T10:05:00.000Z";
const ISO_APPROVE = "2026-05-30T10:10:00.000Z";
const ISO_DECISION = "2026-05-30T10:15:00.000Z";

// --- supplier-class fixtures (3 spanning classes) ---------------------------

/** 5-axis aerospace shop: 5axis + S superalloy + AS9100/NADCAP, large DMG MORI envelope. */
function aeroApp(overrides: Partial<SubmitApplicationInput> = {}): SubmitApplicationInput {
  return {
    applicationId: "app-aero-1",
    supplierId: "sup-aero-1",
    companyName: "Aero Precision LLC",
    contactEmail: "alice@aeroprecision.com",
    contactPhone: "+1 (860) 555-0142",
    submittedAt: ISO_SUBMIT,
    profileDraft: {
      geography: { region: "northeast", state: "CT" },
      processes: ["5axis"],
      machines: [
        {
          machineId: "DMU-50",
          process: "5axis",
          axes: 5,
          envelopeMm: { x: 500, y: 450, z: 400 },
          maxRpm: 18000,
          controller: "dmg_mori",
        },
      ],
      materialGroups: ["S"],
      bestToleranceMm: 0.005,
      certifications: ["AS9100", "NADCAP"],
    },
    ...overrides,
  };
}

/** Turning shop: turn + P steel, Okuma lathe. */
function turnApp(overrides: Partial<SubmitApplicationInput> = {}): SubmitApplicationInput {
  return {
    applicationId: "app-turn-1",
    supplierId: "sup-turn-1",
    companyName: "Midwest Turning Co",
    contactEmail: "bob@midwestturning.com",
    submittedAt: ISO_SUBMIT,
    profileDraft: {
      geography: { region: "midwest", state: "OH" },
      processes: ["turn"],
      machines: [
        {
          machineId: "LB3000",
          process: "turn",
          axes: 2,
          envelopeMm: { x: 300, y: 300, z: 600 },
          maxRpm: 4000,
          controller: "okuma",
        },
      ],
      materialGroups: ["P"],
      bestToleranceMm: 0.0254,
    },
    ...overrides,
  };
}

/** Wire-EDM shop: wedm + H hardened, Sodick controller. */
function wedmApp(overrides: Partial<SubmitApplicationInput> = {}): SubmitApplicationInput {
  return {
    applicationId: "app-wedm-1",
    supplierId: "sup-wedm-1",
    companyName: "Holo-Krome EDM",
    contactEmail: "carol@holokrome-edm.com",
    contactPhone: "8605559999",
    submittedAt: ISO_SUBMIT,
    profileDraft: {
      geography: { region: "northeast", state: "CT" },
      processes: ["wedm"],
      machines: [
        {
          machineId: "AQ537L",
          process: "wedm",
          axes: 4,
          envelopeMm: { x: 350, y: 250, z: 220 },
          maxRpm: 0,
          controller: "sodick",
        },
      ],
      materialGroups: ["H"],
      bestToleranceMm: 0.002,
    },
    ...overrides,
  };
}

// ============================================================================
// HAPPY PATH — submit → verify → approve → live profile is registered + queryable
// ============================================================================

describe("SupplierOnboardingEngine — happy path (submit → verify → approve)", () => {
  it("verifies a complete 5-axis aero application, then approval registers a live, query-able profile", () => {
    const submitted = SupplierOnboardingEngine.submitApplication(aeroApp());
    expect(submitted.status).toBe("applied");
    expect(submitted.submittedAt).toBe(ISO_SUBMIT);
    expect(submitted.updatedAt).toBe(ISO_SUBMIT);
    expect(submitted.lastVerdict).toBe(null);

    const verdict = SupplierOnboardingEngine.verifyCapability("app-aero-1", ISO_VERIFY);
    expect(verdict.verified).toBe(true);
    expect(verdict.gaps).toEqual([]);
    expect(verdict.status).toBe("capability_verified");
    // every criterion passed (7 completeness + 4 consistency = 11 checks, all ok)
    expect(verdict.checkedCriteria.length).toBe(11);
    expect(verdict.checkedCriteria.filter((c) => !c.ok)).toEqual([]);
    expect(SupplierOnboardingEngine.getOnboardingStatus("app-aero-1")).toBe("capability_verified");

    // approval registers the LIVE profile in the capability registry.
    const result = SupplierOnboardingEngine.approveOnboarding("app-aero-1", ISO_APPROVE);
    expect(result.supplierId).toBe("sup-aero-1");
    expect(result.profile.active).toBe(true);
    expect(result.profile.name).toBe("Aero Precision LLC");
    expect(result.profile.processes).toEqual(["5axis"]);
    expect(result.profile.materialGroups).toEqual(["S"]);
    expect(result.profile.certifications).toEqual(["AS9100", "NADCAP"]);
    expect(SupplierOnboardingEngine.getOnboardingStatus("app-aero-1")).toBe("active");

    // the profile is actually IN the capability registry (assert by exact field, not presence).
    const live = SupplierCapabilityProfileEngine.getProfile("sup-aero-1");
    expect(live?.bestToleranceMm).toBe(0.005);
    expect(live?.machines[0].machineId).toBe("DMU-50");
    expect(live?.geography.state).toBe("CT");

    // and canSatisfy answers a real RFQ on it (intent: onboarding produced bookable supply).
    const can = SupplierCapabilityProfileEngine.canSatisfy("sup-aero-1", {
      process: "5axis",
      materialGroup: "S",
      toleranceMm: 0.01, // looser than the shop's 0.005 → capable
      partEnvelopeMm: { x: 200, y: 200, z: 100 },
      requiredCerts: ["AS9100"],
    });
    expect(can.capable).toBe(true);
    expect(can.gaps).toEqual([]);
    expect(can.margins.toleranceMarginMm).toBeCloseTo(0.005, 10);
  });

  it("registers a turning-shop profile that canSatisfy correctly REJECTS an out-of-class RFQ", () => {
    SupplierOnboardingEngine.submitApplication(turnApp());
    SupplierOnboardingEngine.verifyCapability("app-turn-1", ISO_VERIFY);
    const approved = SupplierOnboardingEngine.approveOnboarding("app-turn-1", ISO_APPROVE);
    expect(approved.profile.processes).toEqual(["turn"]);

    // a turning shop cannot do a 5axis job — verifies the registered profile is real, not a stub.
    const can = SupplierCapabilityProfileEngine.canSatisfy("sup-turn-1", {
      process: "5axis",
      materialGroup: "P",
      toleranceMm: 0.1,
      partEnvelopeMm: { x: 10, y: 10, z: 10 },
      requiredCerts: [],
    });
    expect(can.capable).toBe(false);
    expect(can.margins.processMatch).toBe(false);
  });

  it("onboards a wire-EDM shop (maxRpm 0 allowed) and masks a phone with no formatting", () => {
    const submitted = SupplierOnboardingEngine.submitApplication(wedmApp());
    // wedm machine declares maxRpm: 0 (nonnegative allowed) — must NOT fail the gate.
    const verdict = SupplierOnboardingEngine.verifyCapability("app-wedm-1", ISO_VERIFY);
    expect(verdict.verified).toBe(true);
    const result = SupplierOnboardingEngine.approveOnboarding("app-wedm-1", ISO_APPROVE);
    expect(result.profile.machines[0].maxRpm).toBe(0);
    expect(result.profile.machines[0].controller).toBe("sodick");
    // bare-digit phone "8605559999" masks to last-4.
    expect(submitted.contactPhoneMasked).toBe("***9999");
  });
});

// ============================================================================
// VERIFICATION GATE — incomplete / inconsistent drafts FAIL with explicit gaps
// ============================================================================

describe("SupplierOnboardingEngine — verification gate failures", () => {
  it("fails an unknown material group with a gap and leaves status at 'applied'; approve then throws", () => {
    SupplierOnboardingEngine.submitApplication(
      turnApp({ profileDraft: { ...turnApp().profileDraft, materialGroups: ["Z"] } }),
    );
    const verdict = SupplierOnboardingEngine.verifyCapability("app-turn-1", ISO_VERIFY);
    expect(verdict.verified).toBe(false);
    expect(verdict.status).toBe("applied"); // unchanged
    expect(verdict.gaps.some((g) => g.includes("consistency.materialGroups"))).toBe(true);
    expect(verdict.gaps.some((g) => g.includes("Z"))).toBe(true);
    // never silently verified → approve refuses.
    expect(() => SupplierOnboardingEngine.approveOnboarding("app-turn-1", ISO_APPROVE)).toThrow(
      /only a 'capability_verified' application can be approved/,
    );
    // and no profile leaked into the capability registry.
    expect(SupplierCapabilityProfileEngine.getProfile("sup-turn-1")).toBe(null);
  });

  it("fails a non-positive tolerance with a completeness gap", () => {
    SupplierOnboardingEngine.submitApplication(
      aeroApp({ profileDraft: { ...aeroApp().profileDraft, bestToleranceMm: 0 } }),
    );
    const verdict = SupplierOnboardingEngine.verifyCapability("app-aero-1", ISO_VERIFY);
    expect(verdict.verified).toBe(false);
    expect(verdict.gaps.some((g) => g.includes("completeness.bestToleranceMm"))).toBe(true);
  });

  it("fails a machine running an UNDECLARED process (consistency.machines)", () => {
    // declares 'turn' process but the machine runs 'mill' — un-bookable capability.
    SupplierOnboardingEngine.submitApplication(
      turnApp({
        profileDraft: {
          ...turnApp().profileDraft,
          machines: [
            {
              machineId: "VF2",
              process: "mill",
              axes: 3,
              envelopeMm: { x: 760, y: 400, z: 500 },
              maxRpm: 8000,
              controller: "haas",
            },
          ],
        },
      }),
    );
    const verdict = SupplierOnboardingEngine.verifyCapability("app-turn-1", ISO_VERIFY);
    expect(verdict.verified).toBe(false);
    const machineGap = verdict.gaps.find((g) => g.includes("consistency.machines")) ?? "";
    expect(machineGap).toContain("not in declared processes");
  });

  it("re-verify of a still-valid verified app stays verified (idempotent re-verify)", () => {
    SupplierOnboardingEngine.submitApplication(turnApp());
    expect(SupplierOnboardingEngine.verifyCapability("app-turn-1", ISO_VERIFY).status).toBe(
      "capability_verified",
    );
    const again = SupplierOnboardingEngine.verifyCapability("app-turn-1", ISO_VERIFY);
    expect(again.verified).toBe(true);
    expect(again.status).toBe("capability_verified");
  });
});

// ============================================================================
// DUPLICATES + UNKNOWN IDS + ILLEGAL TRANSITIONS (fail loud)
// ============================================================================

describe("SupplierOnboardingEngine — fail-loud invariants", () => {
  it("throws on a duplicate applicationId", () => {
    SupplierOnboardingEngine.submitApplication(aeroApp());
    expect(() => SupplierOnboardingEngine.submitApplication(aeroApp())).toThrow(/duplicate applicationId/);
  });

  it("throws on a malformed contactEmail at submit", () => {
    expect(() => SupplierOnboardingEngine.submitApplication(aeroApp({ contactEmail: "no-at-sign" }))).toThrow(
      /malformed contactEmail/,
    );
  });

  it("throws on verify/approve/status/reject/withdraw of an unknown applicationId", () => {
    expect(() => SupplierOnboardingEngine.verifyCapability("ghost")).toThrow(/unknown applicationId 'ghost'/);
    expect(() => SupplierOnboardingEngine.approveOnboarding("ghost", ISO_APPROVE)).toThrow(/unknown applicationId/);
    expect(() => SupplierOnboardingEngine.getOnboardingStatus("ghost")).toThrow(/unknown applicationId/);
    expect(() => SupplierOnboardingEngine.rejectOnboarding("ghost", "x", ISO_DECISION)).toThrow(/unknown applicationId/);
    expect(() => SupplierOnboardingEngine.withdrawApplication("ghost", ISO_DECISION)).toThrow(/unknown applicationId/);
  });

  it("throws when approving before verification (applied → active is illegal)", () => {
    SupplierOnboardingEngine.submitApplication(aeroApp());
    expect(() => SupplierOnboardingEngine.approveOnboarding("app-aero-1", ISO_APPROVE)).toThrow(
      /only a 'capability_verified' application can be approved/,
    );
    // no profile registered on the failed approve.
    expect(SupplierCapabilityProfileEngine.getProfile("sup-aero-1")).toBe(null);
  });

  it("throws when re-approving / re-verifying a REJECTED app (terminal)", () => {
    SupplierOnboardingEngine.submitApplication(aeroApp());
    const rejected = SupplierOnboardingEngine.rejectOnboarding("app-aero-1", "insufficient capacity", ISO_DECISION);
    expect(rejected.status).toBe("rejected");
    expect(rejected.rejectionReason).toBe("insufficient capacity");
    expect(SupplierOnboardingEngine.getOnboardingStatus("app-aero-1")).toBe("rejected");
    expect(() => SupplierOnboardingEngine.verifyCapability("app-aero-1", ISO_VERIFY)).toThrow(
      /only an 'applied' or 'capability_verified'/,
    );
    expect(() => SupplierOnboardingEngine.approveOnboarding("app-aero-1", ISO_APPROVE)).toThrow(
      /only a 'capability_verified' application/,
    );
    // re-rejecting is also illegal (no outbound edge from rejected)
    expect(() => SupplierOnboardingEngine.rejectOnboarding("app-aero-1", "again", ISO_DECISION)).toThrow(
      /illegal transition 'rejected' → 'rejected'/,
    );
  });

  it("throws on reject with an empty reason", () => {
    SupplierOnboardingEngine.submitApplication(aeroApp());
    expect(() => SupplierOnboardingEngine.rejectOnboarding("app-aero-1", "   ", ISO_DECISION)).toThrow(
      /non-empty reason is required/,
    );
  });

  it("throws on a non-ISO (empty) timestamp for reject", () => {
    SupplierOnboardingEngine.submitApplication(aeroApp());
    expect(() => SupplierOnboardingEngine.rejectOnboarding("app-aero-1", "reason", "")).toThrow(
      /non-empty ISO timestamp is required/,
    );
  });
});

// ============================================================================
// NEVER-DELETE + TERMINAL STATES (withdraw/reject preserve the record)
// ============================================================================

describe("SupplierOnboardingEngine — never-hard-delete + terminal off-ramps", () => {
  it("withdraw flips to terminal 'withdrawn' but the record is still retrievable + listable", () => {
    SupplierOnboardingEngine.submitApplication(turnApp());
    const w = SupplierOnboardingEngine.withdrawApplication("app-turn-1", ISO_DECISION);
    expect(w.status).toBe("withdrawn");
    expect(w.updatedAt).toBe(ISO_DECISION);
    // record preserved (asserted by exact field, not presence)
    expect(SupplierOnboardingEngine.getApplication("app-turn-1")?.companyName).toBe("Midwest Turning Co");
    expect(SupplierOnboardingEngine.listApplications({ status: "withdrawn" }).map((a) => a.applicationId)).toEqual([
      "app-turn-1",
    ]);
    // no further transitions
    expect(() => SupplierOnboardingEngine.approveOnboarding("app-turn-1", ISO_APPROVE)).toThrow();
  });

  it("a verified app can still be withdrawn (capability_verified → withdrawn is legal)", () => {
    SupplierOnboardingEngine.submitApplication(turnApp());
    SupplierOnboardingEngine.verifyCapability("app-turn-1", ISO_VERIFY);
    const w = SupplierOnboardingEngine.withdrawApplication("app-turn-1", ISO_DECISION);
    expect(w.status).toBe("withdrawn");
  });

  it("an ACTIVE app cannot be withdrawn or rejected (active is terminal in the onboarding machine)", () => {
    SupplierOnboardingEngine.submitApplication(turnApp());
    SupplierOnboardingEngine.verifyCapability("app-turn-1", ISO_VERIFY);
    SupplierOnboardingEngine.approveOnboarding("app-turn-1", ISO_APPROVE);
    expect(() => SupplierOnboardingEngine.withdrawApplication("app-turn-1", ISO_DECISION)).toThrow(
      /illegal transition 'active' → 'withdrawn'/,
    );
    expect(() => SupplierOnboardingEngine.rejectOnboarding("app-turn-1", "r", ISO_DECISION)).toThrow(
      /illegal transition 'active' → 'rejected'/,
    );
  });
});

// ============================================================================
// PII MASKING (raw handle never leaks in a public return)
// ============================================================================

describe("SupplierOnboardingEngine — PII masking (§8.2)", () => {
  it("masks email + phone in every public return and the raw handle is ABSENT from JSON", () => {
    const submitted = SupplierOnboardingEngine.submitApplication(aeroApp());
    expect(submitted.contactEmailMasked).toBe("a***@aeroprecision.com");
    expect(submitted.contactPhoneMasked).toBe("***0142"); // +1 (860) 555-0142 → last 4
    // raw handle absent from the serialized public record
    const json = JSON.stringify(submitted);
    expect(json).not.toContain("alice@aeroprecision.com");
    expect(json).not.toContain("8605550142");
    expect((submitted as Record<string, unknown>).contactEmail).toBe(undefined);
    expect((submitted as Record<string, unknown>).contactPhone).toBe(undefined);

    // getApplication + listApplications return the SAME masked shape.
    const fetched = SupplierOnboardingEngine.getApplication("app-aero-1");
    expect(fetched?.contactEmailMasked).toBe("a***@aeroprecision.com");
    expect(JSON.stringify(SupplierOnboardingEngine.listApplications())).not.toContain("alice@aeroprecision.com");
  });

  it("masks a null phone as null (no phone supplied)", () => {
    const submitted = SupplierOnboardingEngine.submitApplication(turnApp()); // no contactPhone
    expect(submitted.contactPhoneMasked).toBe(null);
    expect(submitted.contactEmailMasked).toBe("b***@midwestturning.com");
  });

  it("a returned profileDraft mutation does not corrupt the stored application (defensive copy)", () => {
    const submitted = SupplierOnboardingEngine.submitApplication(aeroApp());
    submitted.profileDraft.processes.push("mill"); // mutate the returned copy
    const refetched = SupplierOnboardingEngine.getApplication("app-aero-1");
    expect(refetched?.profileDraft.processes).toEqual(["5axis"]); // registry untouched
  });
});

// ============================================================================
// LIST FILTER + POLICY MODULE (constants single-sourced)
// ============================================================================

describe("SupplierOnboardingEngine — listing + policy module", () => {
  it("lists by status and throws on an unknown status filter", () => {
    SupplierOnboardingEngine.submitApplication(aeroApp());
    SupplierOnboardingEngine.submitApplication(turnApp());
    SupplierOnboardingEngine.verifyCapability("app-turn-1", ISO_VERIFY);

    expect(SupplierOnboardingEngine.listApplications({ status: "applied" }).map((a) => a.applicationId)).toEqual([
      "app-aero-1",
    ]);
    expect(
      SupplierOnboardingEngine.listApplications({ status: "capability_verified" }).map((a) => a.applicationId),
    ).toEqual(["app-turn-1"]);
    // sorted across all
    expect(SupplierOnboardingEngine.listApplications().map((a) => a.applicationId)).toEqual([
      "app-aero-1",
      "app-turn-1",
    ]);
    expect(() =>
      SupplierOnboardingEngine.listApplications({ status: "bogus" as never }),
    ).toThrow(/unknown status filter/);
  });

  it("policy: transition map + terminal states + completeness helper agree with the engine contract", () => {
    expect([...ONBOARDING_STATUSES]).toEqual([
      "applied",
      "capability_verified",
      "active",
      "rejected",
      "withdrawn",
    ]);
    expect([...TERMINAL_ONBOARDING_STATUSES].sort()).toEqual(["active", "rejected", "withdrawn"]);
    expect(isLegalTransition("applied", "capability_verified")).toBe(true);
    expect(isLegalTransition("capability_verified", "active")).toBe(true);
    expect(isLegalTransition("capability_verified", "applied")).toBe(true); // re-verify back-edge
    expect(isLegalTransition("applied", "active")).toBe(false);
    expect(isLegalTransition("active", "withdrawn")).toBe(false);
    expect(isValidOnboardingStatus("active")).toBe(true);
    expect(isValidOnboardingStatus("nope")).toBe(false);

    // evaluateCompleteness surfaces ALL gaps at once (not just the first).
    const crit = evaluateCompleteness({
      companyName: "",
      geography: { region: "", state: "" },
      processes: [],
      machines: [],
      materialGroups: [],
      bestToleranceMm: -1,
      contactEmail: "",
    });
    expect(crit.length).toBe(7);
    expect(crit.filter((c) => c.ok)).toEqual([]);
    // a fully-valid subject passes all 7
    const ok = evaluateCompleteness({
      companyName: "X",
      geography: { region: "west", state: "CA" },
      processes: ["mill"],
      machines: [{ machineId: "m1" }],
      materialGroups: ["P"],
      bestToleranceMm: 0.01,
      contactEmail: "x@y.com",
    });
    expect(ok.filter((c) => !c.ok)).toEqual([]);
  });
});
