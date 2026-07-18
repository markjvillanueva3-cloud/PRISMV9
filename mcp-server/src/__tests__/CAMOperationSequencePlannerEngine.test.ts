/**
 * CAMOperationSequencePlannerEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-OP-SEQUENCE
 */
import { describe, it, expect } from "vitest";
import { CAMOperationSequencePlannerEngine } from "../engines/CAMOperationSequencePlannerEngine.js";
import type { CamTask } from "../engines/CAMOperationSequencePlannerEngine.js";

const engine = new CAMOperationSequencePlannerEngine();

describe("CAMOperationSequencePlannerEngine", () => {

  it("plan empty list returns empty ordered + no violations", () => {
    const p = engine.plan([]);
    expect(p.ordered.length).toBe(0);
    expect(p.violations.length).toBe(0);
  });

  it("face comes before drill_peck (face is reference surface)", () => {
    const tasks: CamTask[] = [
      { id: "drill", op: "drill_peck" },
      { id: "face",  op: "face" },
    ];
    const p = engine.plan(tasks);
    expect(p.ordered[0].id).toBe("face");
    expect(p.ordered[1].id).toBe("drill");
  });

  it("face comes before turn_rough (milling stages before turning)", () => {
    const tasks: CamTask[] = [
      { id: "turn", op: "turn_rough" },
      { id: "face", op: "face" },
    ];
    const p = engine.plan(tasks);
    expect(p.ordered[0].id).toBe("face");
    expect(p.ordered[1].id).toBe("turn");
  });

  it("drill_peck comes before wedm_2axis (drilling before edm)", () => {
    const tasks: CamTask[] = [
      { id: "wedm",  op: "wedm_2axis" },
      { id: "drill", op: "drill_peck" },
    ];
    const p = engine.plan(tasks);
    expect(p.ordered[0].id).toBe("drill");
    expect(p.ordered[1].id).toBe("wedm");
  });

  it("turning rough before turning finish", () => {
    const tasks: CamTask[] = [
      { id: "finish", op: "turn_finish" },
      { id: "rough",  op: "turn_rough" },
    ];
    const p = engine.plan(tasks);
    expect(p.ordered[0].id).toBe("rough");
    expect(p.ordered[1].id).toBe("finish");
  });

  it("within same stage, larger tool diameter sorts first", () => {
    const tasks: CamTask[] = [
      { id: "small_face", op: "face", toolDiameterMm: 25 },
      { id: "big_face",   op: "face", toolDiameterMm: 100 },
    ];
    const p = engine.plan(tasks);
    expect(p.ordered[0].id).toBe("big_face");
    expect(p.ordered[1].id).toBe("small_face");
  });

  it("ties without diameter preserve original order (stable)", () => {
    const tasks: CamTask[] = [
      { id: "drill_a", op: "drill_peck" },
      { id: "drill_b", op: "drill_peck" },
      { id: "drill_c", op: "drill_peck" },
    ];
    const p = engine.plan(tasks);
    expect(p.ordered.map((t) => t.id)).toEqual(["drill_a", "drill_b", "drill_c"]);
  });

  it("explicit dependsOn — depA must come before B", () => {
    const tasks: CamTask[] = [
      { id: "B", op: "face", dependsOn: ["A"] },
      { id: "A", op: "face" },
    ];
    const p = engine.plan(tasks);
    const idxA = p.ordered.findIndex((t) => t.id === "A");
    const idxB = p.ordered.findIndex((t) => t.id === "B");
    expect(idxA).toBeLessThan(idxB);
  });

  it("unknown dependsOn id reported as violation", () => {
    const tasks: CamTask[] = [
      { id: "B", op: "face", dependsOn: ["NONEXISTENT"] },
    ];
    const p = engine.plan(tasks);
    expect(p.violations.some((v) => v.includes("NONEXISTENT"))).toBe(true);
  });

  it("validate_order PASS when caller order is monotonic by stage", () => {
    const tasks: CamTask[] = [
      { id: "face",  op: "face" },
      { id: "drill", op: "drill_peck" },
      { id: "wedm",  op: "wedm_2axis" },
    ];
    expect(engine.validate_order(tasks).valid).toBe(true);
  });

  it("validate_order FAIL when stage rolls back", () => {
    const tasks: CamTask[] = [
      { id: "drill", op: "drill_peck" },
      { id: "face",  op: "face" }, // face stage < drilling stage
    ];
    const r = engine.validate_order(tasks);
    expect(r.valid).toBe(false);
    expect(r.violations.length).toBeGreaterThan(0);
  });

  it("stages() returns the stage map with expected sentinels", () => {
    const s = engine.stages();
    expect(s.probing).toBe(0);
    expect(s.face_first).toBe(1);
    expect(s.finishing).toBeGreaterThan(s.rough_milling);
    expect(s.edm).toBeGreaterThan(s.finishing);
  });

  it("complex 6-feature part: face → rough → drill → wedm in order", () => {
    const tasks: CamTask[] = [
      { id: "wedm",      op: "wedm_2axis" },
      { id: "drill1",    op: "drill_peck" },
      { id: "face",      op: "face" },
      { id: "finish",    op: "contour_2d", featureClass: "contour_2d" },
      { id: "drill2",    op: "drill_peck" },
      { id: "turn",      op: "turn_rough" },
    ];
    const p = engine.plan(tasks);
    const ids = p.ordered.map((t) => t.id);
    expect(ids.indexOf("face")).toBeLessThan(ids.indexOf("drill1"));
    expect(ids.indexOf("drill1")).toBeLessThan(ids.indexOf("turn"));
    expect(ids.indexOf("turn")).toBeLessThan(ids.indexOf("wedm"));
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes plan + validate_order + stages", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("plan");
    expect(names).toContain("validate_order");
    expect(names).toContain("stages");
  });
});
