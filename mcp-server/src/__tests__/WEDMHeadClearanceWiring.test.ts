/**
 * Head-clearance pipeline wiring tests — MS-P2.5-SAFETY/U-P2.5-SAFE-03
 *
 * Exit criteria covered:
 *   1. WEDMHeadClearanceEngine imported + invoked from WEDMPrintToProgramEngine
 *   2. Upper head clearance ≥ 3 mm above top clamp OR HARD BLOCK
 *   3. Lower head clearance ≥ 2 mm below bottom clamp OR HARD BLOCK
 *   4. Head clearance component contributes 0.15 to S(x)
 *   5. Integration test: low-clearance fixture blocks, high-clearance passes
 *
 * Comprehensive-build coverage:
 *   - Happy path: default head positions + no fixtures → pass
 *   - 3 failure modes: low upper Z, low lower Z, penetrating fixture
 *   - 2 adversarial: NaN head Z, empty fixtures array
 *   - Variability: 3 thickness bands (thin 5 mm, medium 50 mm, thick 150 mm)
 *   - Backward compat: caller-supplied head_clearance still wins
 */

import { describe, it, expect } from "vitest";
import { wedmPrintToProgramEngine } from "../engines/WEDMPrintToProgramEngine.js";
import { wedmHeadClearanceEngine } from "../engines/WEDMHeadClearanceEngine.js";
import type { WEDMProgramInput } from "../engines/WEDMPrintToProgramEngine.js";
import type { WireEDMContour } from "../engines/DXFGeometryParserEngine.js";

// ──────────────────────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────────────────────

function makeRect(w: number, h: number, id = "rect"): WireEDMContour {
  return {
    id,
    segments: [
      { type: "line", start: { x: 0, y: 0 }, end: { x: w, y: 0 } },
      { type: "line", start: { x: w, y: 0 }, end: { x: w, y: h } },
      { type: "line", start: { x: w, y: h }, end: { x: 0, y: h } },
      { type: "line", start: { x: 0, y: h }, end: { x: 0, y: 0 } },
    ],
    is_closed: true,
    is_exterior: true,
    area_mm2: w * h,
    perimeter_mm: 2 * (w + h),
    bbox: { min_x: 0, min_y: 0, max_x: w, max_y: h },
  };
}

function baseProgramInput(overrides: Partial<WEDMProgramInput> = {}): WEDMProgramInput {
  return {
    contours: [makeRect(20, 10)],
    material: "D2",
    thickness_mm: 25.4,
    target_ra_um: 3.2,
    controller: "mitsubishi",
    ...overrides,
  };
}

function getHeadComponent(safetyGate: any) {
  return safetyGate?.components?.find((c: any) => c.component === "head_clearance");
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. Happy path — default head Z + no fixtures
// ──────────────────────────────────────────────────────────────────────────────

describe("U-P2.5-SAFE-03 — head-clearance wiring (happy path)", () => {
  it("default head positions produce ≥3 mm upper and ≥2 mm lower clearance", async () => {
    const result = await wedmPrintToProgramEngine.generate(baseProgramInput());
    expect(result.safety_gate).toBeDefined();
    const head = getHeadComponent(result.safety_gate);
    expect(head).toBeDefined();
    expect(head.pass).toBe(true);
    expect(head.weight).toBeCloseTo(0.15, 6);
    expect(head.weighted_score).toBeCloseTo(0.15, 6);
    // Defaults: upper_head = thickness+10 = 35.4 → clearance 10; lower = -5
    expect(head.details).toContain("Upper: 10.0mm");
    expect(head.details).toContain("Lower: 5.0mm");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. Failure modes — upper low, lower low, fixture penetration
// ──────────────────────────────────────────────────────────────────────────────

describe("U-P2.5-SAFE-03 — head-clearance wiring (failure modes)", () => {
  it("upper_head_z below thickness+3 → HARD BLOCK", async () => {
    const result = await wedmPrintToProgramEngine.generate(
      baseProgramInput({
        upper_head_z_mm: 27, // only 1.6 mm above 25.4 mm stock → < 3 mm
      }),
    );
    const head = getHeadComponent(result.safety_gate);
    expect(head.pass).toBe(false);
    expect(head.weighted_score).toBe(0);
    expect(result.warnings?.some((w) => w.includes("Head clearance"))).toBe(true);
  });

  it("lower_head_z above −2 → HARD BLOCK (needs ≥2 mm below stock bottom)", async () => {
    const result = await wedmPrintToProgramEngine.generate(
      baseProgramInput({ lower_head_z_mm: -1 }),
    );
    const head = getHeadComponent(result.safety_gate);
    expect(head.pass).toBe(false);
    expect(head.weighted_score).toBe(0);
  });

  it("fixture in wire path → critical pose event → HARD BLOCK", async () => {
    // Rect contour occupies (0,0)–(20,10). Place a clamp AABB intersecting
    // the wire at the centre of the part (x=10, y=5), spanning the full
    // stock thickness so the wire segment cannot pass it.
    const result = await wedmPrintToProgramEngine.generate(
      baseProgramInput({
        fixtures: [
          {
            id: "clamp-center",
            role: "clamp",
            min: { x: 9.5, y: 4.5, z: -5 },
            max: { x: 10.5, y: 5.5, z: 30 },
          },
        ],
      }),
    );
    const head = getHeadComponent(result.safety_gate);
    expect(head.pass).toBe(false);
    expect(head.weighted_score).toBe(0);
    expect(
      result.warnings?.some((w) => w.toLowerCase().includes("clamp-center")),
    ).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. Adversarial inputs — NaN head Z, empty fixtures array
// ──────────────────────────────────────────────────────────────────────────────

describe("U-P2.5-SAFE-03 — head-clearance wiring (adversarial)", () => {
  it("NaN upper_head_z falls back to default and still passes", async () => {
    const result = await wedmPrintToProgramEngine.generate(
      baseProgramInput({ upper_head_z_mm: Number.NaN }),
    );
    const head = getHeadComponent(result.safety_gate);
    expect(head.pass).toBe(true);
    expect(head.details).toContain("Upper: 10.0mm");
  });

  it("empty fixtures array does not invoke the pose engine", async () => {
    const result = await wedmPrintToProgramEngine.generate(
      baseProgramInput({ fixtures: [] }),
    );
    const head = getHeadComponent(result.safety_gate);
    expect(head.pass).toBe(true);
    // No "Head clearance:" warning should appear
    expect(result.warnings?.some((w) => w.startsWith("Head clearance:"))).toBe(false);
  });

  it("Infinity upper_head_z is accepted (physically impossible but still ≥3 mm)", async () => {
    const result = await wedmPrintToProgramEngine.generate(
      baseProgramInput({ upper_head_z_mm: Number.POSITIVE_INFINITY }),
    );
    const head = getHeadComponent(result.safety_gate);
    expect(head.pass).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. Variability — 3 thickness bands with scaled head positions
// ──────────────────────────────────────────────────────────────────────────────

describe("U-P2.5-SAFE-03 — head-clearance wiring (thickness variability)", () => {
  const bands: Array<{ name: string; thickness: number }> = [
    { name: "thin (5 mm)", thickness: 5 },
    { name: "medium (50 mm)", thickness: 50 },
    { name: "thick (150 mm)", thickness: 150 },
  ];
  for (const { name, thickness } of bands) {
    it(`${name} stock passes with default head stand-off`, async () => {
      const result = await wedmPrintToProgramEngine.generate(
        baseProgramInput({ thickness_mm: thickness }),
      );
      const head = getHeadComponent(result.safety_gate);
      expect(head.pass).toBe(true);
      // Default upper_head = thickness + 10 → clearance = 10 mm for every band
      expect(head.details).toContain("Upper: 10.0mm");
    });
  }

  it("thick stock with undersized upper stand-off fails", async () => {
    const result = await wedmPrintToProgramEngine.generate(
      baseProgramInput({ thickness_mm: 150, upper_head_z_mm: 151 }), // 1 mm only
    );
    const head = getHeadComponent(result.safety_gate);
    expect(head.pass).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 5. Backward compat — caller-supplied head_clearance wins
// ──────────────────────────────────────────────────────────────────────────────

describe("U-P2.5-SAFE-03 — head-clearance wiring (backward compat)", () => {
  it("caller-supplied head_clearance overrides computed value", async () => {
    const result = await wedmPrintToProgramEngine.generate(
      baseProgramInput({
        // deliberately dangerous head positions
        upper_head_z_mm: 26,
        lower_head_z_mm: -0.5,
        // but caller asserts the clearance is fine — override should win
        // (legacy callers may already supply this directly to the gate)
        ...({
          head_clearance: {
            pass: true,
            upper_clearance_mm: 5.0,
            lower_clearance_mm: 4.0,
            min_required_mm: 3.0,
          },
        } as any),
      }),
    );
    const head = getHeadComponent(result.safety_gate);
    expect(head.pass).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 6. Engine round-trip — direct pose check still returns expected shape
// ──────────────────────────────────────────────────────────────────────────────

describe("U-P2.5-SAFE-03 — engine direct round-trip", () => {
  it("wedmHeadClearanceEngine.check() detects a clamp penetration", () => {
    const pose = { X: 10, Y: 5, Z_upper: 35, Z_lower: -5 };
    const report = wedmHeadClearanceEngine.check(
      pose,
      [
        {
          id: "clamp",
          role: "clamp",
          min: { x: 9.5, y: 4.5, z: -5 },
          max: { x: 10.5, y: 5.5, z: 30 },
        },
      ],
      { safetyMargin_mm: 2 },
    );
    expect(report.pass).toBe(false);
    expect(report.events.some((e) => e.severity === "critical")).toBe(true);
  });

  it("wedmHeadClearanceEngine.check() passes with a remote clamp", () => {
    const pose = { X: 10, Y: 5, Z_upper: 35, Z_lower: -5 };
    const report = wedmHeadClearanceEngine.check(
      pose,
      [
        {
          id: "clamp-far",
          role: "clamp",
          min: { x: 100, y: 100, z: -5 },
          max: { x: 110, y: 110, z: 30 },
        },
      ],
      { safetyMargin_mm: 2 },
    );
    expect(report.pass).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 7. S(x) delta check — a head-clearance failure drops exactly 0.15
// ──────────────────────────────────────────────────────────────────────────────

describe("U-P2.5-SAFE-03 — S(x) delta", () => {
  it("head-clearance failure drops S(x) by 0.15 (matching its weight)", async () => {
    const good = await wedmPrintToProgramEngine.generate(baseProgramInput());
    const bad = await wedmPrintToProgramEngine.generate(
      baseProgramInput({ upper_head_z_mm: 26 /* clearance 0.6 mm */ }),
    );
    const goodSx = good.safety_gate!.s_of_x;
    const badSx = bad.safety_gate!.s_of_x;
    expect(goodSx - badSx).toBeCloseTo(0.15, 2);
  });
});
