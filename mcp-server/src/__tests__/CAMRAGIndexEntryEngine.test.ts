/**
 * CAMRAGIndexEntryEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-RAG
 * Per [[feedback_engine_tests_in_tests_dir]], lives in src/__tests__/.
 */
import { describe, it, expect } from "vitest";
import { CAMRAGIndexEntryEngine } from "../engines/CAMRAGIndexEntryEngine.js";
import { camTemplateGeneratorEngine } from "../engines/CAMTemplateGeneratorEngine.js";
import type { CamTemplate } from "../engines/CAMTemplateGeneratorEngine.js";

const engine = new CAMRAGIndexEntryEngine();

describe("CAMRAGIndexEntryEngine", () => {

  it("toEntry serializes a Fusion 360 face template into embedding-ready text", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face") as CamTemplate;
    const r = engine.toEntry(tpl);
    expect(r.id).toBe("face__fusion360__face");
    expect(r.text).toMatch(/Face \(fusion360, canonical op face\)/);
    expect(r.text).toMatch(/spindle_rpm=8000rpm/);
    expect(r.text).toMatch(/coolant=flood/);
    expect(r.metadata.family).toBe("milling_2d");
    expect(r.metadata.axisCount).toBe("3");
    expect(r.metadata.strategy).toBe("roughing");
  });

  it("toEntry includes canonical op description from B01 taxonomy", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face") as CamTemplate;
    const r = engine.toEntry(tpl);
    expect(r.text).toMatch(/Face milling/);
  });

  it("toEntry for swarf_5axis carries 5-axis metadata", () => {
    const tpl = camTemplateGeneratorEngine.generate("swarf_5axis", "hypermill", "ruled_surface") as CamTemplate;
    const r = engine.toEntry(tpl);
    expect(r.metadata.family).toBe("milling_5axis");
    expect(r.metadata.axisCount).toBe("5");
    expect(r.text).toMatch(/5-Axis Tangent Plane/);
  });

  it("toEntry omits null-valued parameters from the embedding text", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face") as CamTemplate;
    const r = engine.toEntry(tpl);
    // The 'tool' param has no default (null) — must not appear in summary
    expect(r.text).not.toMatch(/tool=null/);
  });

  it("toEntries returns one entry per template, order preserved", () => {
    const tpls = [
      camTemplateGeneratorEngine.generate("face", "fusion360", "face") as CamTemplate,
      camTemplateGeneratorEngine.generate("contour_2d", "mastercam", "external_profile") as CamTemplate,
    ];
    const rs = engine.toEntries(tpls);
    expect(rs.length).toBe(2);
    expect(rs[0].id).toBe("face__fusion360__face");
    expect(rs[1].id).toBe("contour_2d__mastercam__external_profile");
  });

  it("metadata.parameterCount matches template parameter count", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face") as CamTemplate;
    const r = engine.toEntry(tpl);
    expect(r.metadata.parameterCount).toBe(tpl.parameters.length);
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes to_entry, to_entries", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("to_entry");
    expect(names).toContain("to_entries");
  });
});
