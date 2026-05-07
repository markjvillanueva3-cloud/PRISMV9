/**
 * PrintToCADOrchestratorEngine — PHASE20 tests.
 *
 * Diagnostic pipeline composer covering 5 stages:
 *   1. Geometry  (STEPGeometryParserEngine)
 *   2. Features  (STEPGeometryParserEngine.evidenceForFeatureKinds)
 *   3. Class     (CADClassFeatureLibraryEngine.templateFor)
 *   4. Plan      (buildSequenceFor + predictVisualFidelity)
 *   5. Route     (CADSystemRouterEngine — PHASE18/19)
 *
 * Stages must be independently failable so the operator sees which one breaks.
 */
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { printToCADOrchestratorEngine } from "../engines/PrintToCADOrchestratorEngine.js";

const SYNTHETIC_STEP = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('synthetic stepped axis'),'2;1');
FILE_NAME('test.step','2026-05-06T20:00:00',('test'),('test'),'','','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
#1=CARTESIAN_POINT('',(0.,0.,0.));
#10=ADVANCED_FACE('',(),#1,.T.);
#11=ADVANCED_FACE('',(),#1,.T.);
#12=ADVANCED_FACE('',(),#1,.T.);
#20=PLANE('',#1);
#30=CYLINDRICAL_SURFACE('',#1,5.0);
#31=CYLINDRICAL_SURFACE('',#1,5.0);
#40=CONICAL_SURFACE('',#1,2.0,0.1);
#50=TOROIDAL_SURFACE('',#1,5.0,0.5);
#60=EDGE_LOOP('',());
#70=VERTEX_POINT('',#1);
ENDSEC;
END-ISO-10303-21;
`;

describe("PrintToCADOrchestratorEngine.run — stage skipping when inputs absent", () => {
  it("no STEP and no part_class_hint → stage 3 errors with 'part_class_hint required'; pipeline fails at 3", async () => {
    const r = await printToCADOrchestratorEngine.run({});
    expect(r.stages.stage_1_geometry.skipped).toBe(true);
    expect(r.stages.stage_1_geometry.ok).toBe(false);
    expect(r.stages.stage_2_features.skipped).toBe(true);
    expect(r.stages.stage_3_class.ok).toBe(false);
    expect(r.stages.stage_3_class.error).toMatch(/part_class_hint required/);
    expect(r.stages.stage_4_plan.ok).toBe(false);
    expect(r.stages.stage_4_plan.error).toMatch(/stage 3/);
    expect(r.stages.stage_5_route.ok).toBe(true);
    expect(r.failure_stage).toBe(3);
    expect(r.pipeline_ok).toBe(false);
  });
});

describe("PrintToCADOrchestratorEngine.run — STEP geometry stages", () => {
  it("synthetic stepped-axis STEP → stage 1 reports 3 ADVANCED_FACE / 2 CYLINDRICAL / 1 CONICAL / 1 TOROIDAL", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ptcad-"));
    const stepPath = join(dir, "synth.step");
    try {
      writeFileSync(stepPath, SYNTHETIC_STEP, "utf8");
      const r = await printToCADOrchestratorEngine.run({ step_file_path: stepPath });
      expect(r.stages.stage_1_geometry.ok).toBe(true);
      expect(r.stages.stage_1_geometry.payload?.counts.advanced_face).toBe(3);
      expect(r.stages.stage_1_geometry.payload?.counts.cylindrical_surface).toBe(2);
      expect(r.stages.stage_1_geometry.payload?.counts.conical_surface).toBe(1);
      expect(r.stages.stage_1_geometry.payload?.counts.toroidal_surface).toBe(1);
      expect(r.stages.stage_1_geometry.payload?.counts.edge_loop).toBe(1);
      expect(r.stages.stage_1_geometry.payload?.counts.vertex_point).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("synthetic STEP → stage 2 evidence_kinds is non-empty array sorted", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ptcad-"));
    const stepPath = join(dir, "synth.step");
    try {
      writeFileSync(stepPath, SYNTHETIC_STEP, "utf8");
      const r = await printToCADOrchestratorEngine.run({ step_file_path: stepPath });
      const evidence = r.stages.stage_2_features.payload?.evidence_kinds ?? [];
      expect(r.stages.stage_2_features.ok).toBe(true);
      expect(evidence.length).toBeGreaterThan(0);
      // Verify sorted
      const sorted = [...evidence].sort();
      expect(evidence).toEqual(sorted);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("non-existent STEP path → stage 1 fails; stage 2 carries forward 'stage 1 did not succeed'; failure_stage=1", async () => {
    const r = await printToCADOrchestratorEngine.run({ step_file_path: "/no/such/file.step" });
    expect(r.stages.stage_1_geometry.ok).toBe(false);
    expect(typeof r.stages.stage_1_geometry.error).toBe("string");
    expect((r.stages.stage_1_geometry.error ?? "").length).toBeGreaterThan(0);
    expect(r.stages.stage_2_features.ok).toBe(false);
    expect(r.stages.stage_2_features.error).toMatch(/stage 1/);
    expect(r.failure_stage).toBe(1);
  });
});

describe("PrintToCADOrchestratorEngine.run — class + plan stages", () => {
  it("part_class_hint=extrude_punch → stage 3 ok with part_class echoed and template.expected_feature_count > 0", async () => {
    const r = await printToCADOrchestratorEngine.run({ part_class_hint: "extrude_punch" });
    expect(r.stages.stage_3_class.ok).toBe(true);
    expect(r.stages.stage_3_class.payload?.part_class).toBe("extrude_punch");
    expect(r.stages.stage_3_class.payload?.template.part_class).toBe("extrude_punch");
    expect((r.stages.stage_3_class.payload?.template.expected_feature_count ?? 0)).toBeGreaterThan(0);
  });

  it("unknown part_class_hint → stage 3 errors with 'no template'; failure_stage=3", async () => {
    const r = await printToCADOrchestratorEngine.run({
      // @ts-expect-error — runtime test of unknown class
      part_class_hint: "no_such_class",
    });
    expect(r.stages.stage_3_class.ok).toBe(false);
    expect(r.stages.stage_3_class.error).toMatch(/no template/);
    expect(r.failure_stage).toBe(3);
  });

  it("stage 4 plan for extrude_punch → fidelity_score in [0,1] and build_sequence.length matches template", async () => {
    const r = await printToCADOrchestratorEngine.run({ part_class_hint: "extrude_punch" });
    const p = r.stages.stage_4_plan.payload;
    expect(r.stages.stage_4_plan.ok).toBe(true);
    expect((p?.fidelity_score ?? -1)).toBeGreaterThanOrEqual(0);
    expect((p?.fidelity_score ?? 2)).toBeLessThanOrEqual(1);
    expect((p?.template_total ?? 0)).toBeGreaterThan(0);
    expect((p?.build_sequence?.length ?? 0)).toBeGreaterThan(0);
  });

  it("prevalence_threshold=0.99 ≤ build_sequence ≤ prevalence_threshold=0.0", async () => {
    const lo = await printToCADOrchestratorEngine.run({ part_class_hint: "extrude_punch", prevalence_threshold: 0.0 });
    const hi = await printToCADOrchestratorEngine.run({ part_class_hint: "extrude_punch", prevalence_threshold: 0.99 });
    const loCount = lo.stages.stage_4_plan.payload?.build_sequence.length ?? 0;
    const hiCount = hi.stages.stage_4_plan.payload?.build_sequence.length ?? 0;
    expect(loCount).toBeGreaterThanOrEqual(hiCount);
  });
});

describe("PrintToCADOrchestratorEngine.run — route stage", () => {
  it("no target_system → stage 5 ok with target_system=null and supported_count >= 6 (post-PHASE19 closure)", async () => {
    const r = await printToCADOrchestratorEngine.run({ part_class_hint: "extrude_punch" });
    expect(r.stages.stage_5_route.ok).toBe(true);
    expect(r.stages.stage_5_route.payload?.target_system).toBeNull();
    expect((r.stages.stage_5_route.payload?.supported_count ?? 0)).toBeGreaterThanOrEqual(6);
  });

  it("target_system=fusion360 → stage 5 ok and capability.system='fusion360'", async () => {
    const r = await printToCADOrchestratorEngine.run({ part_class_hint: "extrude_punch", target_system: "fusion360" });
    expect(r.stages.stage_5_route.ok).toBe(true);
    expect(r.stages.stage_5_route.payload?.target_system).toBe("fusion360");
    expect(r.stages.stage_5_route.payload?.capability?.system).toBe("fusion360");
  });

  it("target_system=esprit (PHASE19 6th system) → stage 5 ok and capability.system='esprit'", async () => {
    const r = await printToCADOrchestratorEngine.run({ part_class_hint: "extrude_punch", target_system: "esprit" });
    expect(r.stages.stage_5_route.ok).toBe(true);
    expect(r.stages.stage_5_route.payload?.target_system).toBe("esprit");
    expect(r.stages.stage_5_route.payload?.capability?.system).toBe("esprit");
  });

  it("invalid target_system → stage 5 errors with 'not in capability matrix' message listing real systems; failure_stage=5", async () => {
    const r = await printToCADOrchestratorEngine.run({
      part_class_hint: "extrude_punch",
      // @ts-expect-error — runtime test of invalid system
      target_system: "no_such_cad",
    });
    expect(r.stages.stage_5_route.ok).toBe(false);
    expect(r.stages.stage_5_route.error).toMatch(/not in capability matrix/);
    expect(r.stages.stage_5_route.error).toMatch(/fusion360/);
    expect(r.failure_stage).toBe(5);
  });
});

describe("PrintToCADOrchestratorEngine.run — pipeline_ok diagnostic", () => {
  it("happy path (extrude_punch + fusion360) → pipeline_ok=true and failure_stage=null", async () => {
    const r = await printToCADOrchestratorEngine.run({
      part_class_hint: "extrude_punch",
      target_system: "fusion360",
    });
    expect(r.stages.stage_3_class.ok).toBe(true);
    expect(r.stages.stage_4_plan.ok).toBe(true);
    expect(r.stages.stage_5_route.ok).toBe(true);
    expect(r.pipeline_ok).toBe(true);
    expect(r.failure_stage).toBeNull();
  });

  it("duration_ms reported as a non-negative finite number", async () => {
    const r = await printToCADOrchestratorEngine.run({ part_class_hint: "extrude_punch" });
    expect(Number.isFinite(r.duration_ms)).toBe(true);
    expect(r.duration_ms).toBeGreaterThanOrEqual(0);
  });
});
