/**
 * SupplierCapabilityProfileEngine.test.ts — real-value tests for the keystone multi-tenant
 * supplier-capability registry of the PRISM networking marketplace (galaxy:business, slot:hotel).
 *
 * Spanning configurations (per per-file scrutiny doctrine — >=3 distinct shop classes, not one
 * canonical default):
 *  - SUP-AERO : a 5-axis aerospace shop, AS9100/ITAR/NADCAP, material groups N + S, very tight
 *               tolerance (0.0050 mm), envelope 600x600x500.
 *  - SUP-TURN : a turning shop, ISO9001 only, material groups P + M, coarse tolerance (0.0254 mm),
 *               envelope 350x350x600.
 *  - SUP-WEDM : a wire-EDM shop, ISO9001, material groups H + K, ultra-tight tolerance (0.0025 mm),
 *               small envelope 300x300x200.
 *
 * Every assertion checks a REAL reference value or boolean derived from those profiles — each test
 * fails if the engine's matching / validation / never-delete logic changes.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  SupplierCapabilityProfileEngine,
  type RegisterSupplierInput,
  type CapabilityRequirementInput,
} from "../engines/SupplierCapabilityProfileEngine.js";
import { SUPPLIER_CAPABILITY_SCHEMA_VERSION } from "../data/supplier-capability-schema.js";

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

const turn: RegisterSupplierInput = {
  supplierId: "SUP-TURN",
  name: "Midwest Turning Co",
  geography: { region: "Midwest", state: "OH" },
  processes: ["turn"],
  machines: [
    { machineId: "LB3000", process: "turn", axes: 2, envelopeMm: { x: 350, y: 350, z: 600 }, maxRpm: 5000, maxTorqueNm: 350, controller: "okuma" },
  ],
  materialGroups: ["P", "M"],
  bestToleranceMm: 0.0254, // ±0.0005" class shop
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
  SupplierCapabilityProfileEngine.registerSupplier(turn);
  SupplierCapabilityProfileEngine.registerSupplier(wedm);
}

beforeEach(() => {
  SupplierCapabilityProfileEngine.__resetForTests();
});

// ===========================================================================
// REGISTRATION — happy path + stored shape
// ===========================================================================

describe("registerSupplier — happy path", () => {
  it("stores a fully-typed active profile with carried tenantId, dedup-free processes, and schema version", () => {
    const p = SupplierCapabilityProfileEngine.registerSupplier(aero);
    expect(p.supplierId).toBe("SUP-AERO");
    expect(p.tenantId).toBe("tenant-1");
    expect(p.active).toBe(true);
    expect(p.processes).toEqual(["5axis", "mill"]);
    expect(p.materialGroups).toEqual(["N", "S"]);
    expect(p.bestToleranceMm).toBe(0.005);
    expect(p.certifications).toEqual(["ISO9001", "AS9100", "ITAR", "NADCAP"]);
    expect(p.machines).toHaveLength(2);
    expect(p.machines[0]).toEqual({
      machineId: "DMU-50",
      process: "5axis",
      axes: 5,
      envelopeMm: { x: 600, y: 600, z: 500 },
      maxRpm: 18000,
      maxTorqueNm: 130,
      controller: "heidenhain",
    });
    // optional maxTorqueNm omitted on the VF-2 machine — the key must be ABSENT, not present-undefined
    expect(p.machines[1].machineId).toBe("VF-2");
    expect("maxTorqueNm" in p.machines[1]).toBe(false);
    expect(p.schemaVersion).toBe(SUPPLIER_CAPABILITY_SCHEMA_VERSION);
    expect(p.geography).toEqual({ region: "Northeast", state: "CT", zip: "06010" });
  });

  it("dedupes a repeated process / material group / cert in the input", () => {
    const p = SupplierCapabilityProfileEngine.registerSupplier({
      ...turn,
      supplierId: "SUP-DUP",
      processes: ["turn", "turn"],
      materialGroups: ["P", "M", "P"],
      certifications: ["ISO9001", "ISO9001"],
    });
    expect(p.processes).toEqual(["turn"]);
    expect(p.materialGroups).toEqual(["P", "M"]);
    expect(p.certifications).toEqual(["ISO9001"]);
  });

  it("defaults certifications to [] when omitted and omits absent optional keys (tenantId, zip)", () => {
    const p = SupplierCapabilityProfileEngine.registerSupplier({
      supplierId: "SUP-NOCERT",
      name: "No-Cert Shop",
      geography: { region: "South", state: "TX" },
      processes: ["mill"],
      machines: [{ machineId: "M1", process: "mill", axes: 3, envelopeMm: { x: 500, y: 400, z: 300 }, maxRpm: 10000, controller: "fanuc" }],
      materialGroups: ["P"],
      bestToleranceMm: 0.05,
    });
    expect(p.certifications).toEqual([]);
    expect("tenantId" in p).toBe(false);
    expect(p.geography).toEqual({ region: "South", state: "TX" });
    expect("zip" in p.geography).toBe(false);
  });
});

// ===========================================================================
// REGISTRATION — failure modes (fail loud)
// ===========================================================================

describe("registerSupplier — fail-loud validation", () => {
  it("throws on a duplicate supplierId (never silently overwrites)", () => {
    SupplierCapabilityProfileEngine.registerSupplier(aero);
    expect(() => SupplierCapabilityProfileEngine.registerSupplier(aero)).toThrow(/duplicate supplierId 'SUP-AERO'/);
  });

  it("throws on an unknown material group", () => {
    expect(() =>
      SupplierCapabilityProfileEngine.registerSupplier({ ...turn, supplierId: "SUP-BADMAT", materialGroups: ["P", "Z"] }),
    ).toThrow(/unknown material group 'Z'/);
  });

  it("throws on a negative (and on a zero) bestToleranceMm", () => {
    expect(() =>
      SupplierCapabilityProfileEngine.registerSupplier({ ...turn, supplierId: "SUP-NEGTOL", bestToleranceMm: -0.01 }),
    ).toThrow();
    expect(() =>
      SupplierCapabilityProfileEngine.registerSupplier({ ...turn, supplierId: "SUP-ZEROTOL", bestToleranceMm: 0 }),
    ).toThrow();
  });

  it("throws when a machine runs a process the shop does not declare", () => {
    expect(() =>
      SupplierCapabilityProfileEngine.registerSupplier({
        ...turn,
        supplierId: "SUP-ORPHAN",
        processes: ["turn"],
        machines: [{ machineId: "X", process: "mill", axes: 3, envelopeMm: { x: 100, y: 100, z: 100 }, maxRpm: 8000, controller: "haas" }],
      }),
    ).toThrow(/not in the supplier's declared processes/);
  });

  it("throws on an unknown controller, an unknown process, and a non-positive envelope axis", () => {
    expect(() =>
      SupplierCapabilityProfileEngine.registerSupplier({
        ...turn,
        supplierId: "SUP-BADCTRL",
        machines: [{ machineId: "X", process: "turn", axes: 2, envelopeMm: { x: 100, y: 100, z: 100 }, maxRpm: 5000, controller: "acme9000" }],
      }),
    ).toThrow(/unknown.*controller 'acme9000'/);
    expect(() =>
      SupplierCapabilityProfileEngine.registerSupplier({ ...turn, supplierId: "SUP-BADPROC", processes: ["plasma"] }),
    ).toThrow(/unknown process 'plasma'/);
    expect(() =>
      SupplierCapabilityProfileEngine.registerSupplier({
        ...turn,
        supplierId: "SUP-BADENV",
        machines: [{ machineId: "X", process: "turn", axes: 2, envelopeMm: { x: 0, y: 100, z: 100 }, maxRpm: 5000, controller: "okuma" }],
      }),
    ).toThrow();
  });

  it("throws on empty processes / empty machines / empty materialGroups / missing geography", () => {
    expect(() => SupplierCapabilityProfileEngine.registerSupplier({ ...turn, supplierId: "A", processes: [] })).toThrow();
    expect(() => SupplierCapabilityProfileEngine.registerSupplier({ ...turn, supplierId: "B", machines: [] })).toThrow();
    expect(() => SupplierCapabilityProfileEngine.registerSupplier({ ...turn, supplierId: "C", materialGroups: [] })).toThrow();
    expect(() =>
      SupplierCapabilityProfileEngine.registerSupplier({ ...turn, supplierId: "D", geography: { region: "", state: "OH" } }),
    ).toThrow();
  });

  // adversarial: NaN / Infinity must not slip past the finite() guards
  it("throws on NaN bestToleranceMm and Infinity envelope (adversarial non-finite)", () => {
    expect(() =>
      SupplierCapabilityProfileEngine.registerSupplier({ ...turn, supplierId: "SUP-NAN", bestToleranceMm: NaN }),
    ).toThrow();
    expect(() =>
      SupplierCapabilityProfileEngine.registerSupplier({
        ...turn,
        supplierId: "SUP-INF",
        machines: [{ machineId: "X", process: "turn", axes: 2, envelopeMm: { x: Infinity, y: 100, z: 100 }, maxRpm: 5000, controller: "okuma" }],
      }),
    ).toThrow();
  });
});

// ===========================================================================
// canSatisfy — capable + every gap path
// ===========================================================================

describe("canSatisfy", () => {
  beforeEach(registerAll);

  const aeroJob: CapabilityRequirementInput = {
    process: "5axis",
    materialGroup: "S",
    toleranceMm: 0.0127, // ±0.0005" — looser than the shop's 0.005, so capable
    partEnvelopeMm: { x: 400, y: 400, z: 300 },
    requiredCerts: ["AS9100", "ITAR"],
  };

  it("reports capable=true with no gaps and a positive tolerance margin for a matching aerospace job", () => {
    const v = SupplierCapabilityProfileEngine.canSatisfy("SUP-AERO", aeroJob);
    expect(v.capable).toBe(true);
    expect(v.gaps).toEqual([]);
    // 0.0127 - 0.005 = 0.0077 (float — use closeTo)
    expect(v.margins.toleranceMarginMm).toBeCloseTo(0.0077, 10);
    expect(v.margins.envelopeFits).toBe(true);
    expect(v.margins.materialMatch).toBe(true);
    expect(v.margins.processMatch).toBe(true);
    expect(v.margins.certsMatch).toBe(true);
  });

  it("gap: wrong process (turn shop asked to 5-axis mill)", () => {
    const v = SupplierCapabilityProfileEngine.canSatisfy("SUP-TURN", aeroJob);
    expect(v.capable).toBe(false);
    expect(v.margins.processMatch).toBe(false);
    expect(v.gaps.some((g) => g.includes("process '5axis' not offered"))).toBe(true);
  });

  it("gap: material group not run (aero runs N/S, asked for K)", () => {
    const v = SupplierCapabilityProfileEngine.canSatisfy("SUP-AERO", { ...aeroJob, materialGroup: "K" });
    expect(v.capable).toBe(false);
    expect(v.margins.materialMatch).toBe(false);
    expect(v.gaps.some((g) => g.includes("material group 'K' not run"))).toBe(true);
  });

  it("gap: part too big for the envelope (part exceeds the 5-axis machine on Z)", () => {
    const v = SupplierCapabilityProfileEngine.canSatisfy("SUP-AERO", {
      ...aeroJob,
      partEnvelopeMm: { x: 400, y: 400, z: 900 }, // Z 900 > DMU-50 z 500
    });
    expect(v.capable).toBe(false);
    expect(v.margins.envelopeFits).toBe(false);
    expect(v.gaps.some((g) => g.includes("exceeds every '5axis' machine envelope"))).toBe(true);
  });

  it("gap: tolerance too tight (job needs 0.001mm, WEDM shop holds 0.0025mm) → negative margin", () => {
    const v = SupplierCapabilityProfileEngine.canSatisfy("SUP-WEDM", {
      process: "wedm",
      materialGroup: "H",
      toleranceMm: 0.001,
      partEnvelopeMm: { x: 100, y: 100, z: 50 },
      requiredCerts: [],
    });
    expect(v.capable).toBe(false);
    // 0.001 - 0.0025 = -0.0015
    expect(v.margins.toleranceMarginMm).toBeCloseTo(-0.0015, 10);
    expect(v.gaps.some((g) => g.includes("tolerance too tight"))).toBe(true);
  });

  it("gap: missing certification (turn shop has ISO9001 only, job needs AS9100)", () => {
    const v = SupplierCapabilityProfileEngine.canSatisfy("SUP-TURN", {
      process: "turn",
      materialGroup: "P",
      toleranceMm: 0.05,
      partEnvelopeMm: { x: 100, y: 100, z: 100 },
      requiredCerts: ["AS9100"],
    });
    expect(v.capable).toBe(false);
    expect(v.margins.certsMatch).toBe(false);
    expect(v.gaps.some((g) => g.includes("missing certifications: AS9100"))).toBe(true);
  });

  it("envelope boundary: a part EXACTLY equal to the machine envelope fits (<=)", () => {
    const v = SupplierCapabilityProfileEngine.canSatisfy("SUP-WEDM", {
      process: "wedm",
      materialGroup: "K",
      toleranceMm: 0.01,
      partEnvelopeMm: { x: 300, y: 300, z: 200 }, // exactly AQ537L envelope
      requiredCerts: [],
    });
    expect(v.margins.envelopeFits).toBe(true);
    expect(v.capable).toBe(true);
  });

  it("tolerance boundary: equal tolerance is capable (margin exactly 0)", () => {
    const v = SupplierCapabilityProfileEngine.canSatisfy("SUP-TURN", {
      process: "turn",
      materialGroup: "M",
      toleranceMm: 0.0254, // exactly the shop's best
      partEnvelopeMm: { x: 100, y: 100, z: 100 },
      requiredCerts: [],
    });
    expect(v.margins.toleranceMarginMm).toBeCloseTo(0, 12);
    expect(v.capable).toBe(true);
  });

  it("empty requiredCerts always satisfies the cert criterion", () => {
    const v = SupplierCapabilityProfileEngine.canSatisfy("SUP-TURN", {
      process: "turn",
      materialGroup: "P",
      toleranceMm: 0.1,
      partEnvelopeMm: { x: 50, y: 50, z: 50 },
      requiredCerts: [],
    });
    expect(v.margins.certsMatch).toBe(true);
    expect(v.capable).toBe(true);
  });

  it("multiple simultaneous gaps are all listed (wrong process + wrong material + tight tol + missing cert)", () => {
    const v = SupplierCapabilityProfileEngine.canSatisfy("SUP-TURN", {
      process: "wedm", // not offered
      materialGroup: "S", // not run
      toleranceMm: 0.0001, // tighter than 0.0254
      partEnvelopeMm: { x: 50, y: 50, z: 50 },
      requiredCerts: ["NADCAP"], // not held
    });
    expect(v.capable).toBe(false);
    expect(v.margins.processMatch).toBe(false);
    expect(v.margins.materialMatch).toBe(false);
    expect(v.margins.certsMatch).toBe(false);
    expect(v.margins.envelopeFits).toBe(false);
    expect(v.gaps.length).toBeGreaterThanOrEqual(4);
  });

  it("throws on an unknown supplier, unknown requirement process, and unknown requirement material", () => {
    expect(() => SupplierCapabilityProfileEngine.canSatisfy("NOPE", aeroJob)).toThrow(/unknown supplierId 'NOPE'/);
    expect(() =>
      SupplierCapabilityProfileEngine.canSatisfy("SUP-AERO", { ...aeroJob, process: "plasma" }),
    ).toThrow(/unknown requirement process 'plasma'/);
    expect(() =>
      SupplierCapabilityProfileEngine.canSatisfy("SUP-AERO", { ...aeroJob, materialGroup: "Q" }),
    ).toThrow(/unknown requirement materialGroup 'Q'/);
  });

  it("adversarial: a non-finite requirement tolerance throws (never silently scored as a miss)", () => {
    expect(() =>
      SupplierCapabilityProfileEngine.canSatisfy("SUP-AERO", { ...aeroJob, toleranceMm: NaN }),
    ).toThrow();
  });
});

// ===========================================================================
// listSuppliers + filters + never-delete lifecycle
// ===========================================================================

describe("listSuppliers + lifecycle", () => {
  beforeEach(registerAll);

  it("active-only by default, sorted by supplierId", () => {
    const ids = SupplierCapabilityProfileEngine.listSuppliers().map((s) => s.supplierId);
    expect(ids).toEqual(["SUP-AERO", "SUP-TURN", "SUP-WEDM"]);
  });

  it("filters by process, materialGroup, cert, and region (case-insensitive)", () => {
    expect(SupplierCapabilityProfileEngine.listSuppliers({ process: "wedm" }).map((s) => s.supplierId)).toEqual(["SUP-WEDM"]);
    expect(SupplierCapabilityProfileEngine.listSuppliers({ materialGroup: "P" }).map((s) => s.supplierId)).toEqual(["SUP-TURN"]);
    expect(SupplierCapabilityProfileEngine.listSuppliers({ cert: "AS9100" }).map((s) => s.supplierId)).toEqual(["SUP-AERO"]);
    expect(SupplierCapabilityProfileEngine.listSuppliers({ region: "west" }).map((s) => s.supplierId)).toEqual(["SUP-WEDM"]);
  });

  it("deactivate excludes from default list but getProfile still returns it; canSatisfy reports inactive", () => {
    SupplierCapabilityProfileEngine.deactivateSupplier("SUP-WEDM");
    expect(SupplierCapabilityProfileEngine.listSuppliers().map((s) => s.supplierId)).toEqual(["SUP-AERO", "SUP-TURN"]);
    expect(SupplierCapabilityProfileEngine.listSuppliers({ includeInactive: true }).map((s) => s.supplierId)).toEqual([
      "SUP-AERO",
      "SUP-TURN",
      "SUP-WEDM",
    ]);
    expect(SupplierCapabilityProfileEngine.getProfile("SUP-WEDM")?.active).toBe(false);

    const v = SupplierCapabilityProfileEngine.canSatisfy("SUP-WEDM", {
      process: "wedm",
      materialGroup: "H",
      toleranceMm: 0.01,
      partEnvelopeMm: { x: 100, y: 100, z: 50 },
      requiredCerts: [],
    });
    expect(v.capable).toBe(false);
    expect(v.gaps.some((g) => g.includes("is inactive"))).toBe(true);
  });

  it("reactivate restores a deactivated supplier to the default list", () => {
    SupplierCapabilityProfileEngine.deactivateSupplier("SUP-WEDM");
    SupplierCapabilityProfileEngine.reactivateSupplier("SUP-WEDM");
    expect(SupplierCapabilityProfileEngine.listSuppliers().map((s) => s.supplierId)).toContain("SUP-WEDM");
    expect(SupplierCapabilityProfileEngine.getProfile("SUP-WEDM")?.active).toBe(true);
  });

  it("deactivate / reactivate of an unknown supplier throws", () => {
    expect(() => SupplierCapabilityProfileEngine.deactivateSupplier("NOPE")).toThrow(/unknown supplierId 'NOPE'/);
    expect(() => SupplierCapabilityProfileEngine.reactivateSupplier("NOPE")).toThrow(/unknown supplierId 'NOPE'/);
  });
});

// ===========================================================================
// updateProfile
// ===========================================================================

describe("updateProfile", () => {
  beforeEach(registerAll);

  it("patches a single field (bestToleranceMm), preserves untouched fields; canSatisfy reflects the change", () => {
    const before = SupplierCapabilityProfileEngine.getProfile("SUP-TURN")!;
    const updated = SupplierCapabilityProfileEngine.updateProfile("SUP-TURN", { bestToleranceMm: 0.0127 });
    expect(updated.bestToleranceMm).toBe(0.0127);
    expect(updated.processes).toEqual(before.processes); // untouched fields preserved
    expect(updated.materialGroups).toEqual(before.materialGroups);
    // a 0.0100mm job that previously had a +ve margin (vs 0.0254) is now too tight (vs 0.0127)
    const tight = SupplierCapabilityProfileEngine.canSatisfy("SUP-TURN", {
      process: "turn",
      materialGroup: "P",
      toleranceMm: 0.01,
      partEnvelopeMm: { x: 50, y: 50, z: 50 },
      requiredCerts: [],
    });
    expect(tight.capable).toBe(false);
    expect(tight.margins.toleranceMarginMm).toBeCloseTo(0.01 - 0.0127, 10);
  });

  it("adding a process + a machine for it makes a previously-unmatched job capable", () => {
    // SUP-TURN initially cannot mill; add mill + a mill machine.
    SupplierCapabilityProfileEngine.updateProfile("SUP-TURN", {
      processes: ["turn", "mill"],
      machines: [
        { machineId: "LB3000", process: "turn", axes: 2, envelopeMm: { x: 350, y: 350, z: 600 }, maxRpm: 5000, controller: "okuma" },
        { machineId: "VF-4", process: "mill", axes: 3, envelopeMm: { x: 1270, y: 457, z: 508 }, maxRpm: 8100, controller: "haas" },
      ],
    });
    // before: mill not offered. after: capable.
    const v = SupplierCapabilityProfileEngine.canSatisfy("SUP-TURN", {
      process: "mill",
      materialGroup: "P",
      toleranceMm: 0.1,
      partEnvelopeMm: { x: 200, y: 200, z: 200 },
      requiredCerts: [],
    });
    expect(v.capable).toBe(true);
    expect(v.margins.processMatch).toBe(true);
    expect(v.margins.envelopeFits).toBe(true);
  });

  it("throws if a process patch would orphan an existing machine's process", () => {
    // remove 'turn' from processes while keeping the turn machine → machine orphaned
    expect(() => SupplierCapabilityProfileEngine.updateProfile("SUP-TURN", { processes: ["mill"] })).toThrow(
      /no longer.*declares|not in the supplier's declared processes/,
    );
  });

  it("throws on an empty patch, an unknown supplier, and an unknown enum value in a patch", () => {
    expect(() => SupplierCapabilityProfileEngine.updateProfile("SUP-TURN", {})).toThrow(/empty patch/);
    expect(() => SupplierCapabilityProfileEngine.updateProfile("NOPE", { name: "x" })).toThrow(/unknown supplierId 'NOPE'/);
    expect(() => SupplierCapabilityProfileEngine.updateProfile("SUP-TURN", { materialGroups: ["P", "ZZ"] })).toThrow(
      /unknown material group 'ZZ'/,
    );
  });
});
