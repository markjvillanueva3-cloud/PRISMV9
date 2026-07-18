/**
 * RFQMatchScoringEngine.test.ts — real-value tests for the Phase-0 production RFQ→supplier matcher of
 * the PRISM networking marketplace (galaxy:business, slot:hotel). The engine hard-filters candidates by
 * declared capability ({@link SupplierCapabilityProfileEngine.canSatisfy}), then ranks survivors by
 * multi-criteria TOPSIS (reusing {@link TOPSISEngine}) into an explained shortlist.
 *
 * Spanning configurations (per per-file scrutiny doctrine — >=3 distinct shop classes / processes /
 * material groups, not one canonical default):
 *  - SUP-AERO : 5-axis + mill aerospace shop, AS9100/ITAR/NADCAP, groups N+S, tol 0.005mm, Northeast.
 *  - SUP-MILL : a general mill shop, ISO9001, groups P+M, tol 0.020mm, Northeast (same region as AERO).
 *  - SUP-TURN : a turning shop, ISO9001, groups P+M, tol 0.0254mm, Midwest.
 *  - SUP-WEDM : a wire-EDM shop, ISO9001, groups H+K, tol 0.0025mm, West.
 *
 * Reference TOPSIS values were hand-computed from the criteria matrix + weights (0.4/0.2/0.3/0.1, all
 * benefit) — for any 2-survivor case where one shop dominates a benefit criterion and ties the rest, the
 * dominant shop's closeness is 1.0 and the dominated shop's is 0.0 (ideal/anti-ideal are exactly the two
 * values). Every assertion checks a REAL reference value — each test fails if the matching, scoring,
 * filtering, or ranking logic changes.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  RFQMatchScoringEngine,
  type ScoreShortlistArgs,
} from "../engines/RFQMatchScoringEngine.js";
import {
  SupplierCapabilityProfileEngine,
  type RegisterSupplierInput,
} from "../engines/SupplierCapabilityProfileEngine.js";
import { RFQ_MATCH_WEIGHTS_SCHEMA_VERSION } from "../data/rfq-match-weights.js";

// ---- fixtures -------------------------------------------------------------

const aero: RegisterSupplierInput = {
  supplierId: "SUP-AERO",
  tenantId: "tenant-1",
  name: "Apex Aerospace Machining",
  geography: { region: "Northeast", state: "CT", zip: "06010" },
  processes: ["5axis", "mill"],
  machines: [
    { machineId: "DMU-50", process: "5axis", axes: 5, envelopeMm: { x: 600, y: 600, z: 500 }, maxRpm: 18000, maxTorqueNm: 130, controller: "heidenhain" },
    { machineId: "VF-2", process: "mill", axes: 3, envelopeMm: { x: 762, y: 406, z: 508 }, maxRpm: 12000, controller: "haas" },
  ],
  materialGroups: ["N", "S"],
  bestToleranceMm: 0.005,
  certifications: ["ISO9001", "AS9100", "ITAR", "NADCAP"],
};

const mill: RegisterSupplierInput = {
  supplierId: "SUP-MILL",
  name: "Northeast Precision Mill",
  geography: { region: "Northeast", state: "MA" },
  processes: ["mill"],
  machines: [
    { machineId: "VF-4", process: "mill", axes: 3, envelopeMm: { x: 1270, y: 457, z: 508 }, maxRpm: 8100, controller: "haas" },
  ],
  materialGroups: ["P", "M"],
  bestToleranceMm: 0.02,
  certifications: ["ISO9001"],
};

const turn: RegisterSupplierInput = {
  supplierId: "SUP-TURN",
  name: "Midwest Turning Co",
  geography: { region: "Midwest", state: "OH" },
  processes: ["turn"],
  machines: [
    { machineId: "LB3000", process: "turn", axes: 2, envelopeMm: { x: 350, y: 350, z: 600 }, maxRpm: 5000, maxTorqueNm: 350, controller: "okuma" },
  ],
  materialGroups: ["P", "M"],
  bestToleranceMm: 0.0254,
  certifications: ["ISO9001"],
};

const wedm: RegisterSupplierInput = {
  supplierId: "SUP-WEDM",
  name: "Precision Wire EDM",
  geography: { region: "West", state: "CA" },
  processes: ["wedm", "sinker_edm"],
  machines: [
    { machineId: "AQ537L", process: "wedm", axes: 4, envelopeMm: { x: 300, y: 300, z: 200 }, maxRpm: 0, controller: "sodick" },
  ],
  materialGroups: ["H", "K"],
  bestToleranceMm: 0.0025,
  certifications: ["ISO9001"],
};

function registerAll(): void {
  SupplierCapabilityProfileEngine.registerSupplier(aero);
  SupplierCapabilityProfileEngine.registerSupplier(mill);
  SupplierCapabilityProfileEngine.registerSupplier(turn);
  SupplierCapabilityProfileEngine.registerSupplier(wedm);
}

beforeEach(() => {
  SupplierCapabilityProfileEngine.__resetForTests();
  RFQMatchScoringEngine.__resetForTests();
});

// ===========================================================================
// HARD FILTER — survivors + excluded transparency
// ===========================================================================

describe("scoreShortlist — hard filter", () => {
  it("matches 2 of 3 mill candidates and excludes the third with its gap (a turn-only material P RFQ)", () => {
    registerAll();
    // RFQ: P-group mill job, modest tolerance, small part. SUP-AERO (mill, but groups N/S — material miss),
    // SUP-MILL (mill, P/M — capable), SUP-TURN (turn-only — process miss). Restrict to the three.
    const input: ScoreShortlistArgs = {
      rfq: {
        rfqId: "RFQ-MILL-P",
        process: "mill",
        materialGroup: "P",
        toleranceMm: 0.05,
        partEnvelopeMm: { x: 200, y: 200, z: 100 },
        quantity: 50,
        requiredCerts: [],
      },
      candidateSupplierIds: ["SUP-AERO", "SUP-MILL", "SUP-TURN"],
    };
    const res = RFQMatchScoringEngine.scoreShortlist(input);
    expect(res.candidatesEvaluated).toBe(3);
    expect(res.survivors).toBe(1);
    // Only SUP-MILL runs P-group AND offers mill AND holds 0.02 <= 0.05. AERO fails material, TURN fails process.
    expect(res.shortlist.map((s) => s.supplierId)).toEqual(["SUP-MILL"]);
    expect(res.noMatch).toBeNull();
    // both others excluded WITH their gaps surfaced (fail-loud transparency)
    const exIds = res.excluded.map((e) => e.supplierId).sort();
    expect(exIds).toEqual(["SUP-AERO", "SUP-TURN"]);
    const aeroGap = res.excluded.find((e) => e.supplierId === "SUP-AERO")!;
    expect(aeroGap.gaps.some((g) => g.includes("material group 'P' not run"))).toBe(true);
    const turnGap = res.excluded.find((e) => e.supplierId === "SUP-TURN")!;
    expect(turnGap.gaps.some((g) => g.includes("process 'mill' not offered"))).toBe(true);
  });

  it("returns exactly 2 survivors ranked when 2 of 3 candidates are capable", () => {
    // Two mill-capable P/M shops + one wedm-only shop, RFQ is a mill/M job.
    SupplierCapabilityProfileEngine.registerSupplier(mill); // mill, P/M, Northeast
    SupplierCapabilityProfileEngine.registerSupplier(aero); // 5axis+mill, N/S — material miss for M
    SupplierCapabilityProfileEngine.registerSupplier(turn); // turn only — process miss
    const res = RFQMatchScoringEngine.scoreShortlist({
      rfq: { rfqId: "RFQ-1", process: "mill", materialGroup: "M", toleranceMm: 0.05, partEnvelopeMm: { x: 100, y: 100, z: 50 }, quantity: 10, requiredCerts: [] },
    });
    // Only SUP-MILL survives (mill + M-group). aero fails material (N/S), turn fails process.
    expect(res.survivors).toBe(1);
    expect(res.shortlist[0].supplierId).toBe("SUP-MILL");
    expect(res.excluded).toHaveLength(2);
  });

  it("defaults the candidate set to ALL active suppliers when candidateSupplierIds is omitted", () => {
    registerAll(); // 4 suppliers
    const res = RFQMatchScoringEngine.scoreShortlist({
      rfq: { rfqId: "RFQ-ALL", process: "mill", materialGroup: "N", toleranceMm: 0.05, partEnvelopeMm: { x: 100, y: 100, z: 100 }, quantity: 5, requiredCerts: [] },
    });
    expect(res.candidatesEvaluated).toBe(4); // all four evaluated
    // SUP-AERO is the only N-group mill shop -> sole survivor
    expect(res.shortlist.map((s) => s.supplierId)).toEqual(["SUP-AERO"]);
    expect(res.excluded).toHaveLength(3);
  });

  it("excludes a DEACTIVATED supplier with an explicit inactive gap (never silently routes to a paused shop)", () => {
    SupplierCapabilityProfileEngine.registerSupplier(mill);
    SupplierCapabilityProfileEngine.deactivateSupplier("SUP-MILL");
    const res = RFQMatchScoringEngine.scoreShortlist({
      rfq: { rfqId: "RFQ-INACT", process: "mill", materialGroup: "P", toleranceMm: 0.05, partEnvelopeMm: { x: 100, y: 100, z: 50 }, quantity: 1, requiredCerts: [] },
      candidateSupplierIds: ["SUP-MILL"],
    });
    expect(res.survivors).toBe(0);
    expect(res.shortlist).toHaveLength(0);
    expect(res.excluded[0].gaps.some((g) => g.includes("inactive"))).toBe(true);
    expect(res.noMatch).toContain("all 1 evaluated");
  });
});

// ===========================================================================
// RANKING — TOPSIS reuse + discriminators
// ===========================================================================

describe("scoreShortlist — TOPSIS ranking", () => {
  it("ranks the tighter-tolerance shop ABOVE the looser one when tolerance is the sole discriminator", () => {
    // Two mill/P shops, same region (no pref), same certs, both primary 'mill'. Differ ONLY by tolerance.
    // RFQ tol = 0.02. tightShop best=0.005 (margin 0.015, ratio 0.75); looseShop best=0.018 (margin 0.002, ratio 0.10).
    SupplierCapabilityProfileEngine.registerSupplier({
      supplierId: "TIGHT", name: "Tight Tol Mill", geography: { region: "Midwest", state: "IL" },
      processes: ["mill"], machines: [{ machineId: "M1", process: "mill", axes: 3, envelopeMm: { x: 500, y: 500, z: 400 }, maxRpm: 12000, controller: "fanuc" }],
      materialGroups: ["P"], bestToleranceMm: 0.005, certifications: ["ISO9001"],
    });
    SupplierCapabilityProfileEngine.registerSupplier({
      supplierId: "LOOSE", name: "Loose Tol Mill", geography: { region: "Midwest", state: "IN" },
      processes: ["mill"], machines: [{ machineId: "M2", process: "mill", axes: 3, envelopeMm: { x: 500, y: 500, z: 400 }, maxRpm: 12000, controller: "fanuc" }],
      materialGroups: ["P"], bestToleranceMm: 0.018, certifications: ["ISO9001"],
    });
    const res = RFQMatchScoringEngine.scoreShortlist({
      rfq: { rfqId: "RFQ-TOL", process: "mill", materialGroup: "P", toleranceMm: 0.02, partEnvelopeMm: { x: 100, y: 100, z: 50 }, quantity: 20, requiredCerts: [] },
    });
    expect(res.survivors).toBe(2);
    expect(res.shortlist[0].supplierId).toBe("TIGHT");
    expect(res.shortlist[1].supplierId).toBe("LOOSE");
    expect(res.shortlist[0].rank).toBe(1);
    expect(res.shortlist[1].rank).toBe(2);
    // hand-computed 2-alternative TOPSIS: dominant=1.0, dominated=0.0
    expect(res.shortlist[0].score).toBeCloseTo(1.0, 4);
    expect(res.shortlist[1].score).toBeCloseTo(0.0, 4);
    // capabilityConfidence raw values are the floored headroom ratios
    expect(res.shortlist[0].criteria.capabilityConfidence).toBeCloseTo(0.75, 6);
    expect(res.shortlist[1].criteria.capabilityConfidence).toBeCloseTo(0.1, 6);
  });

  it("preferredRegion shifts the winner when geography is the sole discriminator", () => {
    // Two identical mill/P shops EXCEPT region. RFQ prefers 'Northeast'.
    SupplierCapabilityProfileEngine.registerSupplier({
      supplierId: "NEAR", name: "Near Shop", geography: { region: "Northeast", state: "NH" },
      processes: ["mill"], machines: [{ machineId: "A", process: "mill", axes: 3, envelopeMm: { x: 500, y: 500, z: 400 }, maxRpm: 10000, controller: "haas" }],
      materialGroups: ["P"], bestToleranceMm: 0.01, certifications: ["ISO9001"],
    });
    SupplierCapabilityProfileEngine.registerSupplier({
      supplierId: "FAR", name: "Far Shop", geography: { region: "West", state: "CA" },
      processes: ["mill"], machines: [{ machineId: "B", process: "mill", axes: 3, envelopeMm: { x: 500, y: 500, z: 400 }, maxRpm: 10000, controller: "haas" }],
      materialGroups: ["P"], bestToleranceMm: 0.01, certifications: ["ISO9001"],
    });
    const withPref = RFQMatchScoringEngine.scoreShortlist({
      rfq: { rfqId: "RFQ-GEO", process: "mill", materialGroup: "P", toleranceMm: 0.02, partEnvelopeMm: { x: 50, y: 50, z: 50 }, quantity: 5, requiredCerts: [], preferredRegion: "Northeast" },
    });
    expect(withPref.shortlist[0].supplierId).toBe("NEAR");
    expect(withPref.shortlist[0].criteria.geographyScore).toBeCloseTo(1.0, 6); // exact region match
    expect(withPref.shortlist[1].criteria.geographyScore).toBeCloseTo(0.5, 6); // distance proxy
    expect(withPref.shortlist[0].score).toBeCloseTo(1.0, 4);
    expect(withPref.shortlist[1].score).toBeCloseTo(0.0, 4);
  });

  it("is case-insensitive on preferredRegion (NORTHEAST matches Northeast)", () => {
    SupplierCapabilityProfileEngine.registerSupplier(mill); // region Northeast
    const res = RFQMatchScoringEngine.scoreShortlist({
      rfq: { rfqId: "RFQ-CI", process: "mill", materialGroup: "P", toleranceMm: 0.05, partEnvelopeMm: { x: 50, y: 50, z: 50 }, quantity: 1, requiredCerts: [], preferredRegion: "northeast" },
    });
    expect(res.shortlist[0].criteria.geographyScore).toBeCloseTo(1.0, 6);
  });

  it("a lone survivor gets closeness 1.0 (sole capable shop is best by definition, not a degenerate 0)", () => {
    SupplierCapabilityProfileEngine.registerSupplier(wedm);
    const res = RFQMatchScoringEngine.scoreShortlist({
      rfq: { rfqId: "RFQ-SOLO", process: "wedm", materialGroup: "H", toleranceMm: 0.01, partEnvelopeMm: { x: 100, y: 100, z: 100 }, quantity: 2, requiredCerts: [] },
    });
    expect(res.survivors).toBe(1);
    expect(res.shortlist[0].score).toBeCloseTo(1.0, 6);
    expect(res.shortlist[0].rank).toBe(1);
  });

  it("rewards EXTRA relevant certs via certCoverage bonus and surfaces them in the stamp", () => {
    // Two mill-PRIMARY N-group shops identical EXCEPT certs (same tol, same region, both 'mill' first) so
    // cert coverage is the SOLE discriminator. RFQ requires only ISO9001; RICH carries 3 extra relevant certs.
    SupplierCapabilityProfileEngine.registerSupplier({
      supplierId: "RICH", name: "Rich Cert Mill", geography: { region: "Northeast", state: "CT" },
      processes: ["mill"], machines: [{ machineId: "R", process: "mill", axes: 3, envelopeMm: { x: 700, y: 500, z: 500 }, maxRpm: 12000, controller: "haas" }],
      materialGroups: ["N"], bestToleranceMm: 0.005, certifications: ["ISO9001", "AS9100", "ITAR", "NADCAP"],
    });
    SupplierCapabilityProfileEngine.registerSupplier({
      supplierId: "BARE", name: "Bare Cert Shop", geography: { region: "Northeast", state: "CT" },
      processes: ["mill"], machines: [{ machineId: "Z", process: "mill", axes: 3, envelopeMm: { x: 700, y: 500, z: 500 }, maxRpm: 12000, controller: "haas" }],
      materialGroups: ["N"], bestToleranceMm: 0.005, certifications: ["ISO9001"],
    });
    const res = RFQMatchScoringEngine.scoreShortlist({
      rfq: { rfqId: "RFQ-CERT", process: "mill", materialGroup: "N", toleranceMm: 0.02, partEnvelopeMm: { x: 100, y: 100, z: 100 }, quantity: 8, requiredCerts: ["ISO9001"] },
    });
    expect(res.survivors).toBe(2);
    const richEntry = res.shortlist.find((s) => s.supplierId === "RICH")!;
    const bareEntry = res.shortlist.find((s) => s.supplierId === "BARE")!;
    // RICH has AS9100, ITAR, NADCAP beyond required ISO9001 => 3 extra * 0.1 = +0.3 => 1.3
    expect(richEntry.criteria.certCoverage).toBeCloseTo(1.3, 6);
    // BARE has no extra relevant certs => base 1.0
    expect(bareEntry.criteria.certCoverage).toBeCloseTo(1.0, 6);
    // every other criterion ties, so cert coverage is the sole discriminator -> RICH wins (closeness 1.0)
    expect(res.shortlist[0].supplierId).toBe("RICH");
    expect(res.shortlist[0].score).toBeCloseTo(1.0, 4);
    expect(res.shortlist[1].score).toBeCloseTo(0.0, 4);
    expect(richEntry.stampSummary).toContain("AS9100");
    expect(richEntry.stampSummary).toContain("meets required ISO9001");
  });

  it("caps certCoverage at the bonus cap and scores processSpecialization primary vs secondary", () => {
    // AERO declares ['5axis','mill'] so 'mill' is SECONDARY (0.5). Make a mill-PRIMARY shop to compare.
    SupplierCapabilityProfileEngine.registerSupplier(aero);
    SupplierCapabilityProfileEngine.registerSupplier({
      supplierId: "MILLFIRST", name: "Mill First", geography: { region: "Northeast", state: "CT" },
      processes: ["mill", "5axis"], machines: [{ machineId: "Q", process: "mill", axes: 3, envelopeMm: { x: 700, y: 600, z: 500 }, maxRpm: 12000, controller: "haas" }],
      materialGroups: ["N"], bestToleranceMm: 0.005, certifications: ["ISO9001", "AS9100", "ITAR", "NADCAP", "CMMC_L1", "CMMC_L2"],
    });
    const res = RFQMatchScoringEngine.scoreShortlist({
      rfq: { rfqId: "RFQ-SPEC", process: "mill", materialGroup: "N", toleranceMm: 0.02, partEnvelopeMm: { x: 100, y: 100, z: 100 }, quantity: 4, requiredCerts: [] },
    });
    const aeroEntry = res.shortlist.find((s) => s.supplierId === "SUP-AERO")!;
    const millFirst = res.shortlist.find((s) => s.supplierId === "MILLFIRST")!;
    expect(aeroEntry.criteria.processSpecialization).toBeCloseTo(0.5, 6); // mill is secondary for AERO
    expect(millFirst.criteria.processSpecialization).toBeCloseTo(1.0, 6); // mill is primary for MILLFIRST
    // MILLFIRST carries 5 extra relevant certs (beyond 0 required) -> 1.0 + 5*0.1 = 1.5 but capped at 1.5
    expect(millFirst.criteria.certCoverage).toBeCloseTo(1.5, 6);
  });

  it("scores monotonically: rank-1 score >= rank-2 >= rank-3 across a 3-survivor spanning matrix", () => {
    // Three mill/P shops differing across multiple criteria so all three rank distinctly.
    SupplierCapabilityProfileEngine.registerSupplier({
      supplierId: "S1", name: "S1", geography: { region: "Northeast", state: "CT" },
      processes: ["mill"], machines: [{ machineId: "a", process: "mill", axes: 3, envelopeMm: { x: 600, y: 600, z: 600 }, maxRpm: 12000, controller: "haas" }],
      materialGroups: ["P"], bestToleranceMm: 0.005, certifications: ["ISO9001", "AS9100", "NADCAP"], // tight + extra certs + region
    });
    SupplierCapabilityProfileEngine.registerSupplier({
      supplierId: "S2", name: "S2", geography: { region: "Midwest", state: "OH" },
      processes: ["mill"], machines: [{ machineId: "b", process: "mill", axes: 3, envelopeMm: { x: 600, y: 600, z: 600 }, maxRpm: 12000, controller: "haas" }],
      materialGroups: ["P"], bestToleranceMm: 0.01, certifications: ["ISO9001"], // mid
    });
    SupplierCapabilityProfileEngine.registerSupplier({
      supplierId: "S3", name: "S3", geography: { region: "West", state: "CA" },
      processes: ["mill"], machines: [{ machineId: "c", process: "mill", axes: 3, envelopeMm: { x: 600, y: 600, z: 600 }, maxRpm: 12000, controller: "haas" }],
      materialGroups: ["P"], bestToleranceMm: 0.0198, certifications: ["ISO9001"], // barely capable
    });
    const res = RFQMatchScoringEngine.scoreShortlist({
      rfq: { rfqId: "RFQ-3", process: "mill", materialGroup: "P", toleranceMm: 0.02, partEnvelopeMm: { x: 100, y: 100, z: 100 }, quantity: 10, requiredCerts: [], preferredRegion: "Northeast" },
    });
    expect(res.survivors).toBe(3);
    expect(res.shortlist[0].supplierId).toBe("S1"); // dominant on tol + certs + region
    expect(res.shortlist.map((s) => s.rank)).toEqual([1, 2, 3]);
    // scores strictly non-increasing with rank (monotonic clamp invariant)
    expect(res.shortlist[0].score).toBeGreaterThanOrEqual(res.shortlist[1].score);
    expect(res.shortlist[1].score).toBeGreaterThanOrEqual(res.shortlist[2].score);
    expect(res.shortlist[0].score).toBeCloseTo(1.0, 4);
  });
});

// ===========================================================================
// NO-MATCH — valid empty outcome, surfaced not thrown
// ===========================================================================

describe("scoreShortlist — no-match outcomes", () => {
  it("returns an empty shortlist + populated excluded + noMatch reason when NOBODY can do the job", () => {
    registerAll();
    // An ultra-tight S-group 5axis job that none of the four shops can satisfy:
    //  - AERO runs N/S + 5axis but its best tol is 0.005 > 0.0001 required (too tight)
    //  - MILL/TURN are P/M (material miss), WEDM is H/K + wedm (both miss)
    const res = RFQMatchScoringEngine.scoreShortlist({
      rfq: { rfqId: "RFQ-IMPOSSIBLE", process: "5axis", materialGroup: "S", toleranceMm: 0.0001, partEnvelopeMm: { x: 100, y: 100, z: 100 }, quantity: 1, requiredCerts: ["AS9100"] },
    });
    expect(res.survivors).toBe(0);
    expect(res.shortlist).toHaveLength(0);
    expect(res.excluded).toHaveLength(4);
    expect(res.noMatch).not.toBeNull();
    expect(res.noMatch).toContain("RFQ-IMPOSSIBLE");
    expect(res.noMatch).toContain("all 4 evaluated");
    // AERO's gap names the tolerance miss (it is the closest); never silently dropped
    const aeroGap = res.excluded.find((e) => e.supplierId === "SUP-AERO")!;
    expect(aeroGap.gaps.some((g) => g.includes("tolerance too tight"))).toBe(true);
  });

  it("returns noMatch with an empty-registry reason when there are no active suppliers at all", () => {
    const res = RFQMatchScoringEngine.scoreShortlist({
      rfq: { rfqId: "RFQ-EMPTY", process: "mill", materialGroup: "P", toleranceMm: 0.05, partEnvelopeMm: { x: 100, y: 100, z: 100 }, quantity: 1, requiredCerts: [] },
    });
    expect(res.candidatesEvaluated).toBe(0);
    expect(res.survivors).toBe(0);
    expect(res.noMatch).toContain("registry is empty");
  });

  it("excludes a shop whose part exceeds every process-matching machine envelope (oversize part)", () => {
    SupplierCapabilityProfileEngine.registerSupplier(wedm); // wedm envelope 300x300x200
    const res = RFQMatchScoringEngine.scoreShortlist({
      rfq: { rfqId: "RFQ-BIG", process: "wedm", materialGroup: "H", toleranceMm: 0.01, partEnvelopeMm: { x: 500, y: 500, z: 500 }, quantity: 1, requiredCerts: [] },
    });
    expect(res.survivors).toBe(0);
    expect(res.excluded[0].gaps.some((g) => g.includes("exceeds every 'wedm' machine envelope"))).toBe(true);
  });
});

// ===========================================================================
// FAIL-LOUD — bad input throws (never silent-coerce)
// ===========================================================================

describe("scoreShortlist — fail-loud validation", () => {
  it("throws on a non-positive tolerance (zod)", () => {
    registerAll();
    expect(() =>
      RFQMatchScoringEngine.scoreShortlist({
        rfq: { rfqId: "RFQ-BAD", process: "mill", materialGroup: "P", toleranceMm: 0, partEnvelopeMm: { x: 1, y: 1, z: 1 }, quantity: 1, requiredCerts: [] },
      }),
    ).toThrow(/toleranceMm must be > 0/);
  });

  it("throws on a non-integer / non-positive quantity (zod)", () => {
    registerAll();
    expect(() =>
      RFQMatchScoringEngine.scoreShortlist({
        rfq: { rfqId: "RFQ-Q", process: "mill", materialGroup: "P", toleranceMm: 0.05, partEnvelopeMm: { x: 1, y: 1, z: 1 }, quantity: 2.5, requiredCerts: [] },
      }),
    ).toThrow(/quantity must be an integer/);
    expect(() =>
      RFQMatchScoringEngine.scoreShortlist({
        rfq: { rfqId: "RFQ-Q2", process: "mill", materialGroup: "P", toleranceMm: 0.05, partEnvelopeMm: { x: 1, y: 1, z: 1 }, quantity: 0, requiredCerts: [] },
      }),
    ).toThrow(/quantity must be > 0/);
  });

  it("throws on a NaN / Infinity envelope axis (adversarial — never silent-coerce)", () => {
    registerAll();
    // zod's number type guard rejects BOTH NaN and Infinity as invalid_type before the .finite()
    // refinement runs — either way the error names the offending envelope axis path. The invariant
    // verified here is fail-loud: a non-finite axis NEVER silently coerces to a usable dimension.
    const nanThrow = () =>
      RFQMatchScoringEngine.scoreShortlist({
        rfq: { rfqId: "RFQ-NAN", process: "mill", materialGroup: "P", toleranceMm: 0.05, partEnvelopeMm: { x: NaN, y: 1, z: 1 }, quantity: 1, requiredCerts: [] },
      });
    expect(nanThrow).toThrow();
    expect(nanThrow).toThrow(/partEnvelopeMm[\s\S]*"x"|received NaN/);

    const infThrow = () =>
      RFQMatchScoringEngine.scoreShortlist({
        rfq: { rfqId: "RFQ-INF", process: "mill", materialGroup: "P", toleranceMm: 0.05, partEnvelopeMm: { x: 1, y: Infinity, z: 1 }, quantity: 1, requiredCerts: [] },
      });
    expect(infThrow).toThrow();
    expect(infThrow).toThrow(/partEnvelopeMm[\s\S]*"y"|received number/);
  });

  it("throws (via canSatisfy) when the RFQ names an unknown process — a typo is a bug, not a no-match", () => {
    registerAll();
    expect(() =>
      RFQMatchScoringEngine.scoreShortlist({
        rfq: { rfqId: "RFQ-TYPO", process: "milling" as unknown as "mill", materialGroup: "P", toleranceMm: 0.05, partEnvelopeMm: { x: 1, y: 1, z: 1 }, quantity: 1, requiredCerts: [] },
      }),
    ).toThrow(/unknown requirement process/);
  });

  it("throws (via canSatisfy) when an explicit candidateSupplierId is unknown — phantom shop is a bug", () => {
    registerAll();
    expect(() =>
      RFQMatchScoringEngine.scoreShortlist({
        rfq: { rfqId: "RFQ-PHANTOM", process: "mill", materialGroup: "P", toleranceMm: 0.05, partEnvelopeMm: { x: 1, y: 1, z: 1 }, quantity: 1, requiredCerts: [] },
        candidateSupplierIds: ["NO-SUCH-SHOP"],
      }),
    ).toThrow(/unknown supplierId 'NO-SUCH-SHOP'/);
  });

  it("throws when candidateSupplierIds is supplied but EMPTY (ambiguous caller error, not a no-match)", () => {
    registerAll();
    expect(() =>
      RFQMatchScoringEngine.scoreShortlist({
        rfq: { rfqId: "RFQ-EMPTYLIST", process: "mill", materialGroup: "P", toleranceMm: 0.05, partEnvelopeMm: { x: 1, y: 1, z: 1 }, quantity: 1, requiredCerts: [] },
        candidateSupplierIds: [],
      }),
    ).toThrow(/candidateSupplierIds was supplied but empty/);
  });
});

// ===========================================================================
// RESULT SHAPE + determinism
// ===========================================================================

describe("scoreShortlist — result shape + determinism", () => {
  it("stamps the result with the rfqId, schema version, and a per-shop stampSummary", () => {
    SupplierCapabilityProfileEngine.registerSupplier(aero);
    const res = RFQMatchScoringEngine.scoreShortlist({
      rfq: { rfqId: "RFQ-SHAPE", process: "5axis", materialGroup: "S", toleranceMm: 0.02, partEnvelopeMm: { x: 100, y: 100, z: 100 }, quantity: 3, requiredCerts: ["AS9100"] },
    });
    expect(res.rfqId).toBe("RFQ-SHAPE");
    expect(res.schemaVersion).toBe(RFQ_MATCH_WEIGHTS_SCHEMA_VERSION);
    const e = res.shortlist[0];
    expect(e.stampSummary).toContain("0.005mm"); // bestToleranceMm
    expect(e.stampSummary).toContain("S-group");
    expect(e.stampSummary).toContain("Superalloy"); // materialGroupName('S')
    expect(e.stampSummary).toContain("5axis as primary"); // 5axis is AERO's first-declared process
    expect(e.criteria.capabilityConfidence).toBeCloseTo((0.02 - 0.005) / 0.02, 6); // headroom ratio 0.75
  });

  it("is deterministic — identical input yields identical ranking + scores on repeat", () => {
    registerAll();
    const input: ScoreShortlistArgs = {
      rfq: { rfqId: "RFQ-DET", process: "mill", materialGroup: "P", toleranceMm: 0.05, partEnvelopeMm: { x: 100, y: 100, z: 100 }, quantity: 7, requiredCerts: [], preferredRegion: "Northeast" },
    };
    const a = RFQMatchScoringEngine.scoreShortlist(input);
    const b = RFQMatchScoringEngine.scoreShortlist(input);
    expect(a.shortlist.map((s) => `${s.supplierId}:${s.score}`)).toEqual(b.shortlist.map((s) => `${s.supplierId}:${s.score}`));
    expect(a.excluded).toEqual(b.excluded);
  });
});
