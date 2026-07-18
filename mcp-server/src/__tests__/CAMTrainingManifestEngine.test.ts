/**
 * CAMTrainingManifestEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-MANIFEST
 */
import { describe, it, expect } from "vitest";
import { CAMTrainingManifestEngine } from "../engines/CAMTrainingManifestEngine.js";

const engine = new CAMTrainingManifestEngine();

describe("CAMTrainingManifestEngine", () => {

  it("build() with all inputs empty returns zeros + provenance", () => {
    const m = engine.build({});
    expect(m.counts.templates).toBe(0);
    expect(m.counts.clickSequences).toBe(0);
    expect(m.provenance.realDataOnly).toBe(true);
    expect(m.provenance.sourceSlot).toBe("kilo");
    expect(m.provenance.sourceMilestone).toBe("CAM-AI-TRAINING-MS0");
  });

  it("build() counts artifacts and produces hashes for non-empty arrays", () => {
    const m = engine.build({
      templates: [{ system: "fusion360" }, { system: "mastercam" }, { system: "fusion360" }],
      tribalTips: [1, 2, 3, 4],
    });
    expect(m.counts.templates).toBe(3);
    expect(m.counts.tribalTips).toBe(4);
    expect(m.hashes.templates).toMatch(/^[0-9a-f]{8}$/);
    expect(m.hashes.tribalTips).toMatch(/^[0-9a-f]{8}$/);
    // ragEntries empty → hash key omitted from output
    expect(typeof m.hashes.ragEntries === "undefined").toBe(true);
  });

  it("perSystem aggregates per-CAM-system counts across templates+clicks+wiki", () => {
    const m = engine.build({
      templates: [{ system: "fusion360" }, { system: "fusion360" }, { system: "mastercam" }],
      clickSequences: [{ system: "fusion360" }, { system: "hypermill" }],
      wikiEntries: [{ system: "fusion360" }, { system: "mastercam" }, { system: "hypermill" }],
    });
    expect(m.perSystem.fusion360.templates).toBe(2);
    expect(m.perSystem.fusion360.clickSequences).toBe(1);
    expect(m.perSystem.fusion360.wikiEntries).toBe(1);
    expect(m.perSystem.mastercam.templates).toBe(1);
    expect(m.perSystem.hypermill.clickSequences).toBe(1);
  });

  it("provenance.operatorConstraint quotes the 2026-05-25 hard rule", () => {
    const m = engine.build({});
    expect(m.provenance.operatorConstraint).toMatch(/no synthetic parts/);
    expect(m.provenance.operatorConstraint).toMatch(/2026-05-25/);
  });

  it("hashes are deterministic for the same input", () => {
    const a = engine.build({ templates: [{ system: "fusion360" }] }).hashes.templates;
    const b = engine.build({ templates: [{ system: "fusion360" }] }).hashes.templates;
    expect(a).toBe(b);
  });

  it("hashes differ when input changes", () => {
    const a = engine.build({ templates: [{ system: "fusion360" }] }).hashes.templates;
    const b = engine.build({ templates: [{ system: "mastercam" }] }).hashes.templates;
    expect(a).not.toBe(b);
  });

  it("diff reports zero deltas for identical manifests", () => {
    const m1 = engine.build({ templates: [{ system: "fusion360" }] });
    const m2 = engine.build({ templates: [{ system: "fusion360" }] });
    const d = engine.diff(m1, m2);
    expect(d.anyChange).toBe(false);
  });

  it("diff reports template delta when corpus grows", () => {
    const m1 = engine.build({ templates: [{ system: "fusion360" }] });
    const m2 = engine.build({ templates: [{ system: "fusion360" }, { system: "mastercam" }] });
    const d = engine.diff(m1, m2);
    expect(d.countDeltas.templates).toBe(1);
    expect(d.anyChange).toBe(true);
  });

  it("diff reports hash change when content changes but count is same", () => {
    const m1 = engine.build({ templates: [{ system: "fusion360" }] });
    const m2 = engine.build({ templates: [{ system: "mastercam" }] });
    const d = engine.diff(m1, m2);
    expect(d.countDeltas.templates).toBe(0);
    expect(d.hashChanged.templates).toBe(true);
    expect(d.anyChange).toBe(true);
  });

  it("schemaVersion is 1.0.0 (frozen)", () => {
    expect(engine.build({}).schemaVersion).toBe("1.0.0");
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes build + diff", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("build");
    expect(names).toContain("diff");
  });
});
