/**
 * HyperMillSkillsBatchEngine tests — CAM-EXHAUST-MS0 / U-CAM-HM-SKILLBATCH-TESTS-01
 *
 * Coverage:
 *   1. Phase counts: 15+20+25 = 60 total skills
 *   2. resolveSkill(): name lookup + undefined on miss
 *   3. listByPhase(): per-phase filter
 *   4. validateAll(): unique slugs, no incomplete, by_phase counts
 *   5. batchResolve(): found + missing partition + resolution_rate
 *   6. Slug pattern: every skill starts with "hypermill-"
 *   7. Adversarial: empty batch, all-missing, exhaustive resolve
 *
 * Strict legitimacy: concrete assertions, named constants.
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillSkillsBatchEngine,
  hyperMillSkillsBatchEngine,
} from "../engines/HyperMillSkillsBatchEngine.js";

const PHASE_1_COUNT = 15;
const PHASE_2_COUNT = 20;
const PHASE_3_COUNT = 25;
const TOTAL_SKILLS = PHASE_1_COUNT + PHASE_2_COUNT + PHASE_3_COUNT;

describe("HyperMillSkillsBatchEngine — class shape", () => {
  it("exports class + singleton", () => {
    expect(typeof HyperMillSkillsBatchEngine).toBe("function");
    expect(hyperMillSkillsBatchEngine instanceof HyperMillSkillsBatchEngine).toBe(true);
  });

  it("has phase count getters", () => {
    expect(hyperMillSkillsBatchEngine.totalCount).toBe(TOTAL_SKILLS);
    expect(hyperMillSkillsBatchEngine.phase1Count).toBe(PHASE_1_COUNT);
    expect(hyperMillSkillsBatchEngine.phase2Count).toBe(PHASE_2_COUNT);
    expect(hyperMillSkillsBatchEngine.phase3Count).toBe(PHASE_3_COUNT);
  });
});

describe("HyperMillSkillsBatchEngine — resolveSkill()", () => {
  it("finds Phase 1 hypermill-material-lookup", () => {
    const s = hyperMillSkillsBatchEngine.resolveSkill("hypermill-material-lookup");
    expect(s!.title).toBe("Material Lookup");
    expect(s!.phase).toBe(1);
    expect(s!.category).toBe("core");
    expect(s!.primary_engine).toBe("HyperMillMaterialPhysicsBridge");
  });

  it("finds Phase 2 hypermill-pocket", () => {
    const s = hyperMillSkillsBatchEngine.resolveSkill("hypermill-pocket");
    expect(s!.phase).toBe(2);
    expect(s!.category).toBe("operational");
  });

  it("finds Phase 3 hypermill-print-to-program", () => {
    const s = hyperMillSkillsBatchEngine.resolveSkill("hypermill-print-to-program");
    expect(s!.phase).toBe(3);
    expect(s!.category).toBe("advanced");
  });

  it("returns undefined for unknown slug", () => {
    expect(hyperMillSkillsBatchEngine.resolveSkill("nonexistent-skill")).toBe(undefined);
  });

  it("returns undefined for empty string", () => {
    expect(hyperMillSkillsBatchEngine.resolveSkill("")).toBe(undefined);
  });
});

describe("HyperMillSkillsBatchEngine — listByPhase()", () => {
  it("Phase 1 returns 15 skills", () => {
    const list = hyperMillSkillsBatchEngine.listByPhase(1);
    expect(list.length).toBe(PHASE_1_COUNT);
    list.forEach((s) => expect(s.phase).toBe(1));
  });

  it("Phase 2 returns 20 skills", () => {
    const list = hyperMillSkillsBatchEngine.listByPhase(2);
    expect(list.length).toBe(PHASE_2_COUNT);
    list.forEach((s) => expect(s.phase).toBe(2));
  });

  it("Phase 3 returns 25 skills", () => {
    const list = hyperMillSkillsBatchEngine.listByPhase(3);
    expect(list.length).toBe(PHASE_3_COUNT);
    list.forEach((s) => expect(s.phase).toBe(3));
  });

  it("Phase 1 contains canonical core skills (material/speeds/strategy)", () => {
    const list = hyperMillSkillsBatchEngine.listByPhase(1);
    const slugs = list.map((s) => s.slug);
    expect(slugs).toContain("hypermill-material-lookup");
    expect(slugs).toContain("hypermill-speeds-feeds");
    expect(slugs).toContain("hypermill-2d-strategy");
  });

  it("Phase 3 contains canonical advanced skills (FAI/SPC/probe)", () => {
    const list = hyperMillSkillsBatchEngine.listByPhase(3);
    const slugs = list.map((s) => s.slug);
    expect(slugs).toContain("hypermill-fai");
    expect(slugs).toContain("hypermill-spc");
    expect(slugs).toContain("hypermill-probe-setup");
  });
});

describe("HyperMillSkillsBatchEngine — validateAll()", () => {
  it("validates as fully consistent (valid=true, no duplicates, no incomplete)", () => {
    const r = hyperMillSkillsBatchEngine.validateAll();
    expect(r.valid).toBe(true);
    expect(r.total).toBe(TOTAL_SKILLS);
    expect(r.duplicates).toEqual([]);
    expect(r.incomplete).toEqual([]);
  });

  it("by_phase counts: {1: 15, 2: 20, 3: 25}", () => {
    const r = hyperMillSkillsBatchEngine.validateAll();
    expect(r.by_phase[1]).toBe(PHASE_1_COUNT);
    expect(r.by_phase[2]).toBe(PHASE_2_COUNT);
    expect(r.by_phase[3]).toBe(PHASE_3_COUNT);
  });

  it("by_category sums to total (15 core + 35 operational + 25 advanced ≈ 75 — overlapping)", () => {
    const r = hyperMillSkillsBatchEngine.validateAll();
    const sum = r.by_category.core + r.by_category.operational + r.by_category.advanced;
    expect(sum).toBe(TOTAL_SKILLS);
  });

  it("all 60 skills enumerated in by_category", () => {
    const r = hyperMillSkillsBatchEngine.validateAll();
    expect(r.by_category.advanced).toBe(PHASE_3_COUNT); // all phase 3 are advanced
  });
});

describe("HyperMillSkillsBatchEngine — batchResolve()", () => {
  it("resolves all-known slugs (resolution_rate=1.0)", () => {
    const slugs = ["hypermill-material-lookup", "hypermill-pocket", "hypermill-fai"];
    const r = hyperMillSkillsBatchEngine.batchResolve(slugs);
    expect(r.found.length).toBe(3);
    expect(r.missing).toEqual([]);
    expect(r.requested).toBe(3);
    expect(r.resolution_rate).toBe(1);
  });

  it("partitions found vs missing slugs", () => {
    const slugs = ["hypermill-fai", "nonexistent-skill", "hypermill-pocket"];
    const r = hyperMillSkillsBatchEngine.batchResolve(slugs);
    expect(r.found.length).toBe(2);
    expect(r.missing).toEqual(["nonexistent-skill"]);
    expect(r.requested).toBe(3);
    expect(r.resolution_rate).toBeCloseTo(2 / 3, 6);
  });

  it("all-missing batch: resolution_rate=0", () => {
    const slugs = ["a", "b", "c"];
    const r = hyperMillSkillsBatchEngine.batchResolve(slugs);
    expect(r.found).toEqual([]);
    expect(r.missing).toEqual(["a", "b", "c"]);
    expect(r.resolution_rate).toBe(0);
  });

  it("empty batch: resolution_rate=0 (avoids divide-by-zero)", () => {
    const r = hyperMillSkillsBatchEngine.batchResolve([]);
    expect(r.requested).toBe(0);
    expect(r.resolution_rate).toBe(0);
  });

  it("exhaustive batch resolves all 60 skills", () => {
    const validate = hyperMillSkillsBatchEngine.validateAll();
    expect(validate.total).toBe(TOTAL_SKILLS);
    // Get all slugs by listing across phases
    const all = [
      ...hyperMillSkillsBatchEngine.listByPhase(1),
      ...hyperMillSkillsBatchEngine.listByPhase(2),
      ...hyperMillSkillsBatchEngine.listByPhase(3),
    ].map((s) => s.slug);
    expect(all.length).toBe(TOTAL_SKILLS);
    const r = hyperMillSkillsBatchEngine.batchResolve(all);
    expect(r.found.length).toBe(TOTAL_SKILLS);
    expect(r.missing).toEqual([]);
    expect(r.resolution_rate).toBe(1);
  });
});

describe("HyperMillSkillsBatchEngine — slug + field invariants", () => {
  it("every skill slug starts with 'hypermill-'", () => {
    const all = [
      ...hyperMillSkillsBatchEngine.listByPhase(1),
      ...hyperMillSkillsBatchEngine.listByPhase(2),
      ...hyperMillSkillsBatchEngine.listByPhase(3),
    ];
    all.forEach((s) => {
      expect(s.slug.startsWith("hypermill-")).toBe(true);
    });
  });

  it("every skill has primary_action starting with 'cam_'", () => {
    const all = [
      ...hyperMillSkillsBatchEngine.listByPhase(1),
      ...hyperMillSkillsBatchEngine.listByPhase(2),
      ...hyperMillSkillsBatchEngine.listByPhase(3),
    ];
    all.forEach((s) => {
      expect(s.primary_action.startsWith("cam_")).toBe(true);
    });
  });

  it("every skill has non-empty primary_engine name", () => {
    const all = [
      ...hyperMillSkillsBatchEngine.listByPhase(1),
      ...hyperMillSkillsBatchEngine.listByPhase(2),
      ...hyperMillSkillsBatchEngine.listByPhase(3),
    ];
    all.forEach((s) => {
      expect(s.primary_engine.length).toBeGreaterThan(0);
    });
  });

  it("every skill has non-empty description (>10 chars)", () => {
    const all = [
      ...hyperMillSkillsBatchEngine.listByPhase(1),
      ...hyperMillSkillsBatchEngine.listByPhase(2),
      ...hyperMillSkillsBatchEngine.listByPhase(3),
    ];
    all.forEach((s) => {
      expect(s.description.length).toBeGreaterThan(10);
    });
  });
});
