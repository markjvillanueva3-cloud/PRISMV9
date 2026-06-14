/**
 * Real-reference-part regression tests for the STEP geometry extractor
 * (CADGeometryComparisonEngine.extractMetrics), the INGEST stage of the
 * CAD closed-loop replication methodology.
 *
 * Why this exists (R9 — tests verify intent, not behavior): the closed-loop
 * INGEST + COMPARE stages depend on the extractor correctly fingerprinting
 * real, complex aerospace geometry — not the synthetic 4-point STEP fixtures
 * the other suites use. These cases pin the MEASURED geometric fingerprint of
 * the two proven turbine-class reference parts in H:/PRISM/resources/CAD FILES:
 *
 *   - blisk.stp          — 1206.9 mm dia integrally-bladed rotor (48 blades),
 *                          223 faces / 328 B_SPLINE_SURFACE / 48,956 points
 *   - Impeller turbine.stp — 290 mm dia x 763 mm axial impeller rotor,
 *                          485 faces / 405 B_SPLINE_SURFACE / 25,120 points
 *
 * The cross-part DISTINCTNESS assertions are the anti-hardcode guard: a
 * refactor that made extractMetrics return a constant (or read the wrong
 * entity) would pass single-part checks but FAIL the distinctness block.
 *
 * Both parts are characterized identically by the extractor (axisymmetric hub
 * + free-form B-spline blade surfaces), which is the generalization finding:
 * the closed-loop's dimensional/hub regen converges (blisk proved 0.000%),
 * while the free-form blade surfaces carry the same surface-fidelity ceiling
 * for both and require section-fitting to push Hausdorff below ~1%.
 *
 * Tests skip-loud (return early) when a reference file is absent on the host,
 * never silently pass on missing data.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import { cadGeometryComparisonEngine } from "../../engines/CADGeometryComparisonEngine.js";

const BLISK = "H:/PRISM/resources/CAD FILES/blisk.stp";
const IMPELLER = "H:/PRISM/resources/CAD FILES/Impeller turbine.stp";

describe("extractMetrics on real turbine-class reference parts", () => {
  it("blisk.stp: measured geometric fingerprint (48-blade IBR, 1206.9 mm dia)", () => {
    if (!fs.existsSync(BLISK)) return; // skip-loud: reference absent on this host
    const m = cadGeometryComparisonEngine.extractMetrics(BLISK);
    const bb = m.boundingBox;
    // bbox: square in X/Y (rotor diameter 1206.9 mm), 310 mm axial height
    expect(bb.sizeX).toBeCloseTo(1206.900984715104, 3);
    expect(bb.sizeY).toBeCloseTo(1206.900984715104, 3);
    expect(bb.sizeZ).toBeCloseTo(310, 3);
    // mm units: a 1.2 m rotor reads ~1207, NOT ~47.5 (inch) — units-first guard
    expect(bb.sizeX).toBeGreaterThan(1000);
    const t = m.topology;
    expect(t.faceCount).toBe(223);
    expect(t.edgeCount).toBe(1386);
    expect(t.vertexCount).toBe(318);
    expect(t.solidCount).toBe(1);
    expect(t.entityTypes.B_SPLINE_SURFACE).toBe(328);
    expect(t.entityTypes.TOROIDAL_SURFACE).toBe(10);
    expect(t.entityTypes.CARTESIAN_POINT).toBe(48956);
    // free-form-dominated: B-spline surfaces are the blades, the fidelity driver
    expect(t.entityTypes.B_SPLINE_SURFACE).toBeGreaterThan(t.entityTypes.CYLINDRICAL_SURFACE);
  });

  it("Impeller turbine.stp: measured geometric fingerprint (290 mm dia x 763 mm axial)", () => {
    if (!fs.existsSync(IMPELLER)) return; // skip-loud
    const m = cadGeometryComparisonEngine.extractMetrics(IMPELLER);
    const bb = m.boundingBox;
    // axisymmetric about Y (rotor axis): X == Z radius, Y is the long axial extent
    expect(bb.sizeX).toBeCloseTo(290.33791814496, 3);
    expect(bb.sizeZ).toBeCloseTo(290.33791814496, 3);
    expect(bb.sizeY).toBeCloseTo(762.914644792046, 3);
    expect(bb.sizeX).toBeCloseTo(bb.sizeZ, 6); // axisymmetric: radial X == radial Z
    expect(bb.sizeY).toBeGreaterThan(bb.sizeX); // axial > radial
    const t = m.topology;
    expect(t.faceCount).toBe(485);
    expect(t.edgeCount).toBe(3846);
    expect(t.vertexCount).toBe(813);
    expect(t.solidCount).toBe(1);
    expect(t.entityTypes.B_SPLINE_SURFACE).toBe(405);
    expect(t.entityTypes.CYLINDRICAL_SURFACE).toBe(25);
    expect(t.entityTypes.CONICAL_SURFACE).toBe(1);
    expect(t.entityTypes.CARTESIAN_POINT).toBe(25120);
    // same class as blisk: free-form blade surfaces dominate the curved geometry
    expect(t.entityTypes.B_SPLINE_SURFACE).toBeGreaterThan(t.entityTypes.PLANE);
  });

  it("cross-part distinctness: extractor returns part-specific values, not constants (anti-hardcode)", () => {
    if (!fs.existsSync(BLISK) || !fs.existsSync(IMPELLER)) return; // skip-loud
    const b = cadGeometryComparisonEngine.extractMetrics(BLISK);
    const i = cadGeometryComparisonEngine.extractMetrics(IMPELLER);
    // distinct geometry => distinct fingerprints (a hardcoded/constant return fails here)
    expect(b.topology.faceCount).not.toBe(i.topology.faceCount); // 223 vs 485
    expect(b.topology.entityTypes.B_SPLINE_SURFACE).not.toBe(
      i.topology.entityTypes.B_SPLINE_SURFACE,
    ); // 328 vs 405
    expect(b.topology.entityTypes.CARTESIAN_POINT).not.toBe(
      i.topology.entityTypes.CARTESIAN_POINT,
    ); // 48956 vs 25120
    expect(b.fileSize).not.toBe(i.fileSize);
    // distinct overall scale AND distinct axis-of-revolution convention:
    //   blisk:    1206.9 mm dia (X,Y) x 310 mm axial (Z)  -> axisymmetric about Z
    //   impeller:  290.3 mm dia (X,Z) x 762.9 mm axial (Y) -> axisymmetric about Y
    const bMax = Math.max(b.boundingBox.sizeX, b.boundingBox.sizeY, b.boundingBox.sizeZ);
    const iMax = Math.max(i.boundingBox.sizeX, i.boundingBox.sizeY, i.boundingBox.sizeZ);
    expect(bMax).toBeCloseTo(1206.900984715104, 3); // blisk largest extent = its diameter
    expect(iMax).toBeCloseTo(762.914644792046, 3); // impeller largest extent = its axial length
    expect(bMax).toBeGreaterThan(iMax); // blisk is the physically larger rotor
    expect(b.boundingBox.sizeX).toBeCloseTo(b.boundingBox.sizeY, 3); // blisk square in X/Y (axis Z)
    expect(i.boundingBox.sizeX).toBeCloseTo(i.boundingBox.sizeZ, 3); // impeller square in X/Z (axis Y)
    // BUT both are the same closed-loop class: 1 solid, free-form-blade-dominated
    expect(b.topology.solidCount).toBe(1);
    expect(i.topology.solidCount).toBe(1);
  });
});

/**
 * Structurally DIVERSE corpus parts — non-turbine geometry classes. These prove the
 * extractor is correct across the geometry spectrum the closed-loop must INGEST, not
 * only the free-form-blade-dominated turbines: analytic-only (valve body, 0 B-splines)
 * and mixed analytic+free-form (rotor shaft). Both files are INCH-native (JM convention);
 * the SRC extractor NORMALIZES inch->mm (units-first), so bbox is pinned in mm (e.g. the
 * valve body's 8.345 in -> 211.96 mm). Counts are unit-invariant. (NB: a stale dist/ build
 * that lacks the normalization returns the raw inch number instead — see U-CAD-VOLUME-METRIC.)
 */
const VALVE = "H:/PRISM/resources/CAD FILES/AEROSPACE VALVE BODY.STP";
const ROTOR = "H:/PRISM/resources/CAD FILES/ROTOR SHAFT.STEP";

describe("extractMetrics across non-turbine geometry classes", () => {
  it("AEROSPACE VALVE BODY.STP: analytic-only class (ZERO B-splines, torus-rich)", () => {
    if (!fs.existsSync(VALVE)) return; // skip-loud
    const m = cadGeometryComparisonEngine.extractMetrics(VALVE);
    const t = m.topology;
    // THE class-defining fact: a prismatic valve body has NO free-form surfaces
    expect(t.entityTypes.B_SPLINE_SURFACE).toBe(0);
    expect(t.entityTypes.TOROIDAL_SURFACE).toBe(27); // fillet/seat tori dominate
    expect(t.entityTypes.CONICAL_SURFACE).toBe(11);
    expect(t.entityTypes.CYLINDRICAL_SURFACE).toBe(12);
    expect(t.faceCount).toBe(60);
    expect(t.solidCount).toBe(1);
    expect(t.entityTypes.CARTESIAN_POINT).toBe(178);
    // inch->mm normalized bbox (8.345 in x 25.4 = 211.96 mm) — proves units-first normalization
    expect(m.boundingBox.sizeX).toBeCloseTo(211.962, 2);
  });

  it("ROTOR SHAFT.STEP: mixed analytic+free-form class (B-spline + cyl + chamfer)", () => {
    if (!fs.existsSync(ROTOR)) return; // skip-loud
    const m = cadGeometryComparisonEngine.extractMetrics(ROTOR);
    const t = m.topology;
    expect(t.faceCount).toBe(613);
    expect(t.solidCount).toBe(1);
    expect(t.entityTypes.B_SPLINE_SURFACE).toBe(140); // mixed: some free-form
    expect(t.entityTypes.CYLINDRICAL_SURFACE).toBe(191); // but cylinder-dominated (a shaft)
    expect(t.entityTypes.CARTESIAN_POINT).toBe(7292);
    // a shaft is cylinder-dominated, NOT free-form-dominated like a turbine blade
    expect(t.entityTypes.CYLINDRICAL_SURFACE).toBeGreaterThan(t.entityTypes.B_SPLINE_SURFACE);
  });

  it("geometry-class distinctness: analytic vs mixed vs free-form are separable", () => {
    if (!fs.existsSync(VALVE) || !fs.existsSync(ROTOR) || !fs.existsSync(IMPELLER)) return; // skip-loud
    const valve = cadGeometryComparisonEngine.extractMetrics(VALVE);
    const rotor = cadGeometryComparisonEngine.extractMetrics(ROTOR);
    const turbine = cadGeometryComparisonEngine.extractMetrics(IMPELLER);
    // analytic (valve, 0) < mixed (rotor, 140) < free-form-dominated (turbine, 405)
    expect(valve.topology.entityTypes.B_SPLINE_SURFACE).toBeLessThan(
      rotor.topology.entityTypes.B_SPLINE_SURFACE,
    );
    expect(rotor.topology.entityTypes.B_SPLINE_SURFACE).toBeLessThan(
      turbine.topology.entityTypes.B_SPLINE_SURFACE,
    );
    // a turbine blade is free-form-dominated; a shaft is cylinder-dominated — the
    // ratio that drives which closed-loop strategy (section-loft vs revolve) applies
    const turbineFreeformRatio =
      turbine.topology.entityTypes.B_SPLINE_SURFACE / turbine.topology.entityTypes.CYLINDRICAL_SURFACE;
    const rotorFreeformRatio =
      rotor.topology.entityTypes.B_SPLINE_SURFACE / rotor.topology.entityTypes.CYLINDRICAL_SURFACE;
    expect(turbineFreeformRatio).toBeGreaterThan(rotorFreeformRatio);
  });
});
