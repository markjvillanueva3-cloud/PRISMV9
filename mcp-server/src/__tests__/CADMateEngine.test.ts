import { describe, it, expect } from "vitest";
import { CADMateEngine, cadMateEngine } from "../engines/CADMateEngine.js";

const eng = new CADMateEngine();

describe("CADMateEngine — assembly mate constraints (coincident/concentric/distance/angle/parallel)", () => {
  // ---- happy path: exact resolved values + CadQuery constraint op (R9) ----
  it("coincident: zero offset/angle, Plane constraint", () => {
    const r = eng.coincident();
    expect(r.success).toBe(true);
    expect(r.offset_mm).toBe(0);
    expect(r.angle_deg).toBe(0);
    expect(r.constraint).toBe("Plane");
    expect(r.cadquery_op).toBe('.constrain(solidA, solidB, "Plane")');
  });

  it("concentric: zero offset/angle, Axis constraint", () => {
    const r = eng.concentric();
    expect(r.constraint).toBe("Axis");
    expect(r.cadquery_op).toBe('.constrain(solidA, solidB, "Axis")');
  });

  it("distance: offset = distance_mm, Plane constraint with param", () => {
    const r = eng.distance(10);
    expect(r.success).toBe(true);
    expect(r.offset_mm).toBe(10);
    expect(r.constraint).toBe("Plane");
    expect(r.cadquery_op).toBe('.constrain(solidA, solidB, "Plane", param=10)');
  });

  it("angle: angle = angle_deg, Axis constraint with param", () => {
    const r = eng.angle(30);
    expect(r.success).toBe(true);
    expect(r.angle_deg).toBe(30);
    expect(r.constraint).toBe("Axis");
    expect(r.cadquery_op).toBe('.constrain(solidA, solidB, "Axis", param=30)');
  });

  it("parallel: angle 0, Plane constraint", () => {
    const r = eng.parallel();
    expect(r.success).toBe(true);
    expect(r.angle_deg).toBe(0);
    expect(r.constraint).toBe("Plane");
  });

  it("distance: zero distance accepted (flush = a 0-offset Plane mate)", () => {
    expect(eng.distance(0).success).toBe(true);
    expect(eng.distance(0).offset_mm).toBe(0);
  });

  // ---- failure modes (>=3) ----
  it("distance: negative -> structured failure", () => {
    const r = eng.distance(-5);
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/non-negative/);
  });

  it("angle: out of (0,180) -> structured failure", () => {
    expect(eng.angle(0).success).toBe(false);
    expect(eng.angle(180).success).toBe(false);
    expect(eng.angle(200).success).toBe(false);
    expect(eng.angle(95).success).toBe(true); // in-range boundary check
  });

  it("apply: unknown mate -> structured failure naming valid mates", () => {
    const r = eng.apply({ mate_type: "weld" });
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/coincident\|concentric\|distance\|angle\|parallel/);
  });

  // ---- adversarial (>=2): NaN / Infinity ----
  it("NaN / Infinity -> structured failure, never throws", () => {
    expect(eng.distance(NaN).success).toBe(false);
    expect(eng.angle(Infinity).success).toBe(false);
    expect(eng.apply({ mate_type: "distance", distance_mm: NaN }).success).toBe(false);
    expect(eng.apply({ mate_type: "angle", angle_deg: -Infinity }).success).toBe(false);
  });

  it("apply(): substitutes solid_a/solid_b component names into the constrain op (scrutiny MEDIUM fix)", () => {
    const r = cadMateEngine.apply({ mate_type: "distance", distance_mm: 8, solid_a: "base", solid_b: "lid" });
    expect(r.cadquery_op).toBe('.constrain(base, lid, "Plane", param=8)');
    // absent names -> the clearly-marked template placeholders
    expect(cadMateEngine.apply({ mate_type: "coincident" }).cadquery_op).toBe('.constrain(solidA, solidB, "Plane")');
  });

  // ---- dispatcher entrypoint round-trip (R15) ----
  it("apply(): routes by mate_type / mate / type alias (the exact dispatcher call)", () => {
    expect(cadMateEngine.apply({ mate_type: "distance", distance_mm: 12 }).offset_mm).toBe(12);
    expect(cadMateEngine.apply({ mate: "angle", angle_deg: 45 }).angle_deg).toBe(45);
    expect(cadMateEngine.apply({ type: "concentric" }).constraint).toBe("Axis");
    expect(cadMateEngine.apply({ mate_type: "coincident" }).success).toBe(true);
  });
});
