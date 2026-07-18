/**
 * CAMWikiEntryGeneratorEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-WIKI
 * Per [[feedback_engine_tests_in_tests_dir]], lives in src/__tests__/.
 */
import { describe, it, expect } from "vitest";
import { CAMWikiEntryGeneratorEngine } from "../engines/CAMWikiEntryGeneratorEngine.js";

const engine = new CAMWikiEntryGeneratorEngine();

describe("CAMWikiEntryGeneratorEngine", () => {

  it("generateEntry('face','fusion360') returns a wiki entry with the documented facts", () => {
    const e = engine.generateEntry("face", "fusion360");
    expect(e?.slug).toBe("fusion360-face");
    expect(e?.title).toBe("Face in fusion360");
    expect(e?.op).toBe("face");
    expect(e?.system).toBe("fusion360");
    expect(e?.nativeName).toBe("Face");
    expect(e?.facts.family).toBe("milling_2d");
    expect(e?.facts.axisCount).toBe("3");
    expect(e?.facts.strategy).toBe("roughing");
    expect(e?.facts.parameterCount).toBe(12);
  });

  it("generateEntry markdown includes YAML frontmatter + parameter table", () => {
    const e = engine.generateEntry("face", "fusion360");
    expect(e?.markdown).toMatch(/^---\ntitle: Face in fusion360/);
    expect(e?.markdown).toMatch(/native_name: Face/);
    expect(e?.markdown).toMatch(/family: milling_2d/);
    expect(e?.markdown).toMatch(/## Input parameters/);
    expect(e?.markdown).toMatch(/\| `spindle_rpm` \| Spindle Speed \|/);
  });

  it("generateEntry('swarf_5axis','hypermill') includes 5-axis extras + impeller native name", () => {
    const e = engine.generateEntry("swarf_5axis", "hypermill");
    expect(e?.nativeName).toBe("5-Axis Tangent Plane");
    expect(e?.facts.family).toBe("milling_5axis");
    expect(e?.facts.axisCount).toBe("5");
    expect(e?.markdown).toMatch(/`tool_axis_mode`/);
  });

  it("generateEntry('face','vericut') returns null (verification-only system)", () => {
    expect(engine.generateEntry("face", "vericut")).toBeNull();
  });

  it("generateEntry slug converts underscores to dashes", () => {
    const e = engine.generateEntry("adaptive_clearing_3d", "fusion360");
    expect(e?.slug).toBe("fusion360-adaptive-clearing-3d");
  });

  it("generateEntry uses inventor_hsm system slug (kebab-case)", () => {
    const e = engine.generateEntry("adaptive_clearing_3d", "inventor_hsm");
    expect(e?.slug).toBe("inventor-hsm-adaptive-clearing-3d");
  });

  it("generateAll returns one entry per supported (op, system) pair", () => {
    const all = engine.generateAll();
    expect(all.length).toBeGreaterThan(50);
    // Every entry has unique slug
    const slugs = new Set(all.map((e) => e.slug));
    expect(slugs.size).toBe(all.length);
  });

  it("generateAll includes face@fusion360 + drill@mastercam + impeller@hypermill", () => {
    const all = engine.generateAll();
    const slugs = new Set(all.map((e) => e.slug));
    expect(slugs.has("fusion360-face")).toBe(true);
    expect(slugs.has("mastercam-drill")).toBe(true);
    expect(slugs.has("hypermill-impeller-blade-5axis")).toBe(true);
  });

  it("generateAll excludes vericut (verification-only, no machining UI)", () => {
    const all = engine.generateAll();
    const vericutEntries = all.filter((e) => e.system === "vericut");
    expect(vericutEntries.length).toBe(0);
  });

  it("every wiki entry carries cross-references to taxonomy + system entities", () => {
    const e = engine.generateEntry("face", "fusion360");
    expect(e?.markdown).toMatch(/\[\[cam-op-face\]\]/);
    expect(e?.markdown).toMatch(/\[\[cam-system-fusion360\]\]/);
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes generate_entry + generate_all", () => {
    const caps = engine.getCapabilities();
    const names = caps.map((c) => c.name);
    expect(names).toContain("generate_entry");
    expect(names).toContain("generate_all");
  });
});
