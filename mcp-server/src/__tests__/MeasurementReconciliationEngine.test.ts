import { describe, it, expect } from "vitest";
import { measurementReconciliationEngine } from "../engines/MeasurementReconciliationEngine.js";
import { cadReverseTemplateEngine } from "../engines/CADReverseTemplateEngine.js";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";

/**
 * Real-behavior tests — no mocks. The reconciliation engine is pure
 * deterministic, so we exercise actual numeric conversion, alias resolution,
 * geometric-contradiction detection, and round-trip ops re-emission.
 */
describe("MeasurementReconciliationEngine", () => {
  function buildCylinderTemplate() {
    const ops: CADOperation[] = [
      { kind: "feature_revolve", args: { radius: 12.5, length: 50 } } as CADOperation,
      { kind: "feature_hole", args: { diameter: 6.35, depth: 10 } } as CADOperation,
    ];
    return cadReverseTemplateEngine.reverseEngineer(ops);
  }

  describe("toMm unit conversion", () => {
    const e = measurementReconciliationEngine;
    it("mm passes through unchanged", () => {
      expect(e.toMm(25.4, "mm")).toBe(25.4);
    });
    it("in → mm uses canonical 25.4 factor", () => {
      expect(e.toMm(1, "in")).toBe(25.4);
      expect(e.toMm(0.5, "in")).toBe(12.7);
    });
    it("thou → mm uses 0.0254 factor", () => {
      expect(e.toMm(1000, "thou")).toBeCloseTo(25.4, 6);
    });
    it("um → mm uses 0.001 factor", () => {
      expect(e.toMm(1000, "um")).toBe(1);
    });
    it("throws on unsupported unit", () => {
      expect(() => e.toMm(1, "furlong" as any)).toThrow(/unsupported unit/);
    });
  });

  describe("reconcile — happy path", () => {
    it("applies exact-name override + preserves untouched params", () => {
      const template = buildCylinderTemplate();
      const radiusParam = template.params.find((p) => p.argKey === "radius");
      expect(radiusParam?.value).toBe(12.5);
      expect(radiusParam?.argKey).toBe("radius");
      const radiusParamName = radiusParam!.name;

      const result = measurementReconciliationEngine.reconcile({
        template,
        measurements: [
          { paramName: radiusParamName, value: 12.7, unit: "mm", instrument: "caliper", note: "measured at midspan" },
        ],
      });

      expect(result.meta.applied).toBe(1);
      expect(result.meta.unresolved).toBe(0);
      expect(result.overrides[0].oldValue).toBe(12.5);
      expect(result.overrides[0].newValue).toBe(12.7);
      expect(result.overrides[0].delta_mm).toBeCloseTo(0.2, 6);
      expect(result.overrides[0].source).toContain("caliper");
      expect(result.overrides[0].source).toContain("measured at midspan");

      // Op args reflect the override
      const cylOp = result.cad_ops.find((o) => o.kind === "feature_revolve");
      expect((cylOp?.args as any).radius).toBe(12.7);

      // Result template is a deep clone (original passed-in template is not the same object)
      expect(result.template).not.toBe(template);
      expect(result.template.params.find((p) => p.argKey === "radius")?.value).toBe(12.7);
    });

    it("inch → mm conversion applies on override", () => {
      const template = buildCylinderTemplate();
      const radiusParamName = template.params.find((p) => p.argKey === "radius")!.name;

      const result = measurementReconciliationEngine.reconcile({
        template,
        measurements: [{ paramName: radiusParamName, value: 0.5, unit: "in" }],
      });

      expect(result.overrides[0].newValue).toBe(12.7); // 0.5 in = 12.7 mm
    });

    it("friendly alias 'od' resolves to the only diameter param (hole) when no body-diameter exists", () => {
      // Cylinder primary uses radius (not diameter), so the only diameter
      // param is on the hole. Alias 'od' → ['diameter','outer_diameter']
      // picks the largest-value match, which here is the hole's diameter=6.35.
      const template = buildCylinderTemplate();
      const result = measurementReconciliationEngine.reconcile({
        template,
        measurements: [{ paramName: "od", value: 25.4, unit: "mm" }],
      });
      expect(result.meta.applied).toBe(1);
      expect(result.overrides[0].oldValue).toBe(6.35);
      expect(result.overrides[0].newValue).toBe(25.4);
      // The hole-exceeds-body contradiction fires here because 25.4 > body radius*2-ish in
      // the synthetic primitive. We surface that contradiction to the operator.
    });

    it("friendly alias 'length' resolves to length param when present", () => {
      const template = buildCylinderTemplate();
      const result = measurementReconciliationEngine.reconcile({
        template,
        measurements: [{ paramName: "length", value: 75 }],
      });
      expect(result.meta.applied).toBe(1);
      expect(result.overrides[0].newValue).toBe(75);
    });

    it("friendly alias 'depth' resolves to hole depth", () => {
      const template = buildCylinderTemplate();
      const result = measurementReconciliationEngine.reconcile({
        template,
        measurements: [{ paramName: "depth", value: 15 }],
      });
      expect(result.meta.applied).toBe(1);
      expect(result.overrides[0].newValue).toBe(15);
    });
  });

  describe("reconcile — unresolved", () => {
    it("returns unresolved list for non-matching paramName", () => {
      const template = buildCylinderTemplate();
      const result = measurementReconciliationEngine.reconcile({
        template,
        measurements: [{ paramName: "completely_unknown_xyz", value: 99 }],
      });
      expect(result.meta.applied).toBe(0);
      expect(result.meta.unresolved).toBe(1);
      expect(result.unresolved[0].paramName).toBe("completely_unknown_xyz");
    });
  });

  describe("reconcile — contradictions", () => {
    it("flags non-positive dimension", () => {
      const template = buildCylinderTemplate();
      const radiusParamName = template.params.find((p) => p.argKey === "radius")!.name;
      const result = measurementReconciliationEngine.reconcile({
        template,
        measurements: [{ paramName: radiusParamName, value: -5, unit: "mm" }],
      });
      expect(result.contradictions.length).toBeGreaterThanOrEqual(1);
      const nonPos = result.contradictions.find((c) => c.rule === "non-positive-dimension");
      expect(nonPos?.affected_params).toContain(radiusParamName);
    });

    it("flags hole-exceeds-body when hole diameter ≥ enclosing body", () => {
      // Box body 100mm wide + hole 6.35mm — operator measures hole as 200mm (impossible)
      const ops: CADOperation[] = [
        { kind: "feature_extrude", args: { width: 100, length: 100, height: 25 } } as CADOperation,
        { kind: "feature_hole", args: { diameter: 6.35, depth: 10 } } as CADOperation,
      ];
      const template = cadReverseTemplateEngine.reverseEngineer(ops);
      const holeDiamParam = template.params.find((p) => p.argKey === "diameter")!.name;
      const result = measurementReconciliationEngine.reconcile({
        template,
        measurements: [{ paramName: holeDiamParam, value: 200 }],
      });
      const hole = result.contradictions.find((c) => c.rule === "hole-exceeds-body");
      expect(hole?.message).toMatch(/hole/i);
    });

    it("flags hole-depth-exceeds-body when depth exceeds enclosing length", () => {
      const ops: CADOperation[] = [
        { kind: "feature_extrude", args: { width: 50, length: 50, height: 25 } } as CADOperation,
        { kind: "feature_hole", args: { diameter: 5, depth: 10 } } as CADOperation,
      ];
      const template = cadReverseTemplateEngine.reverseEngineer(ops);
      const holeDepthParam = template.params.find((p) => p.argKey === "depth")!.name;
      const result = measurementReconciliationEngine.reconcile({
        template,
        measurements: [{ paramName: holeDepthParam, value: 100 }],
      });
      const depth = result.contradictions.find((c) => c.rule === "hole-depth-exceeds-body");
      expect(depth?.message).toMatch(/depth/i);
    });

    it("no contradictions on a sane override", () => {
      const template = buildCylinderTemplate();
      const radiusParamName = template.params.find((p) => p.argKey === "radius")!.name;
      const result = measurementReconciliationEngine.reconcile({
        template,
        measurements: [{ paramName: radiusParamName, value: 13.0 }],
      });
      expect(result.contradictions.length).toBe(0);
    });
  });

  describe("emitCADOps idempotence", () => {
    it("re-emit reflects current param values without recursive change", () => {
      const template = buildCylinderTemplate();
      // Mutate a param directly (simulating an external UI edit)
      const p = template.params.find((p) => p.argKey === "radius")!;
      p.value = 20;
      const ops1 = measurementReconciliationEngine.emitCADOps(template);
      const ops2 = measurementReconciliationEngine.emitCADOps(template);
      expect((ops1.find((o) => o.kind === "feature_revolve")!.args as any).radius).toBe(20);
      expect(JSON.stringify(ops1)).toBe(JSON.stringify(ops2));
    });
  });

  describe("strict mode", () => {
    it("returns unresolved without throwing even in strict mode", () => {
      const template = buildCylinderTemplate();
      const result = measurementReconciliationEngine.reconcile({
        template,
        measurements: [{ paramName: "totally_unknown", value: 99 }],
        strict: true,
      });
      expect(result.meta.unresolved).toBe(1);
    });
  });

  describe("uncertainty propagation", () => {
    it("converts uncertainty through unit conversion", () => {
      const template = buildCylinderTemplate();
      const radiusParamName = template.params.find((p) => p.argKey === "radius")!.name;
      const result = measurementReconciliationEngine.reconcile({
        template,
        measurements: [{ paramName: radiusParamName, value: 0.5, unit: "in", uncertainty: 0.001 }],
      });
      // 0.001 in = 0.0254 mm
      expect(result.overrides[0].uncertainty_mm).toBeCloseTo(0.0254, 6);
    });
  });
});
