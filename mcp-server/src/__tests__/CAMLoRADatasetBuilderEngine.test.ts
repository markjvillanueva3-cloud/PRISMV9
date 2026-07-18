/**
 * CAMLoRADatasetBuilderEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-LORA
 * Per [[feedback_engine_tests_in_tests_dir]], lives in src/__tests__/.
 */
import { describe, it, expect } from "vitest";
import { CAMLoRADatasetBuilderEngine } from "../engines/CAMLoRADatasetBuilderEngine.js";
import { camTemplateGeneratorEngine } from "../engines/CAMTemplateGeneratorEngine.js";
import type { CamTemplate } from "../engines/CAMTemplateGeneratorEngine.js";

const engine = new CAMLoRADatasetBuilderEngine();

describe("CAMLoRADatasetBuilderEngine", () => {

  it("buildTuple from a Fusion 360 face template carries the documented facts in prompt + completion", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face") as CamTemplate;
    const t = engine.buildTuple(tpl);
    expect(t.id).toBe("face__fusion360__face");
    expect(t.prompt).toMatch(/fusion360/);
    expect(t.prompt).toMatch(/Face \(canonical: face\)/);
    expect(t.prompt).toMatch(/Feature class: face/);
    expect(t.prompt).toMatch(/Machine family: milling_2d/);
    expect(t.prompt).toMatch(/Axis count: 3/);
    expect(t.source.op).toBe("face");
    expect(t.source.system).toBe("fusion360");
    expect(t.source.nativeName).toBe("Face");
  });

  it("completion is valid JSON parseable into a parameter bag", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face") as CamTemplate;
    const t = engine.buildTuple(tpl);
    const parsed = JSON.parse(t.completion) as Record<string, unknown>;
    expect(parsed.spindle_rpm).toBe(8000);
    expect(parsed.coolant).toBe("flood");
    expect(parsed.feed_xy).toBe(1200);
  });

  it("buildTuple for swarf_5axis carries 5-axis source facts", () => {
    const tpl = camTemplateGeneratorEngine.generate("swarf_5axis", "hypermill", "ruled_surface") as CamTemplate;
    const t = engine.buildTuple(tpl);
    expect(t.source.family).toBe("milling_5axis");
    expect(t.source.axisCount).toBe("5");
    expect(t.prompt).toMatch(/5-Axis Tangent Plane/);
  });

  it("buildDataset returns one tuple per input template, preserves order", () => {
    const tpls = [
      camTemplateGeneratorEngine.generate("face", "fusion360", "face") as CamTemplate,
      camTemplateGeneratorEngine.generate("drill", "mastercam", "hole") as CamTemplate,
      camTemplateGeneratorEngine.generate("turn_rough", "fusion360", "external_profile") as CamTemplate,
    ];
    const set = engine.buildDataset(tpls);
    expect(set.length).toBe(3);
    expect(set[0].id).toBe("face__fusion360__face");
    expect(set[1].id).toBe("drill__mastercam__hole");
    expect(set[2].id).toBe("turn_rough__fusion360__external_profile");
  });

  it("toJSONL emits one tuple per line, trailing newline when non-empty", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face") as CamTemplate;
    const jsonl = engine.toJSONL([engine.buildTuple(tpl)]);
    expect(jsonl.endsWith("\n")).toBe(true);
    expect(jsonl.split("\n").filter(Boolean).length).toBe(1);
    const parsed = JSON.parse(jsonl.trim()) as { id: string };
    expect(parsed.id).toBe("face__fusion360__face");
  });

  it("toJSONL on empty array returns empty string (no trailing newline)", () => {
    expect(engine.toJSONL([])).toBe("");
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes build_tuple, build_dataset, to_jsonl", () => {
    const caps = engine.getCapabilities();
    const names = caps.map((c) => c.name);
    expect(names).toContain("build_tuple");
    expect(names).toContain("build_dataset");
    expect(names).toContain("to_jsonl");
  });
});
