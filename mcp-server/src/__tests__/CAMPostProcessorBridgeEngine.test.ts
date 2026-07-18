/**
 * CAMPostProcessorBridgeEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-PP-BRIDGE
 */
import { describe, it, expect } from "vitest";
import { CAMPostProcessorBridgeEngine } from "../engines/CAMPostProcessorBridgeEngine.js";
import { camTemplateGeneratorEngine } from "../engines/CAMTemplateGeneratorEngine.js";
import type { CamTemplate } from "../engines/CAMTemplateGeneratorEngine.js";

const engine = new CAMPostProcessorBridgeEngine();

describe("CAMPostProcessorBridgeEngine", () => {

  it("toEnvelope from a Fusion 360 face template populates the documented fields", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face") as CamTemplate;
    const env = engine.toEnvelope(tpl);
    expect(env.templateId).toBe("face__fusion360__face");
    expect(env.op).toBe("face");
    expect(env.system).toBe("fusion360");
    expect(env.controllerDialect).toBe("fanuc"); // default
    expect(env.spindleRpm).toBe(8000);
    expect(env.cuttingFeed).toBe(1200);
    expect(env.plungeFeed).toBe(400);
    expect(env.coolant).toBe("flood");
    expect(env.wcs).toBe("G54");
    expect(env.axisCount).toBe("3");
  });

  it("toEnvelope passes explicit dialect through", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face") as CamTemplate;
    expect(engine.toEnvelope(tpl, "siemens").controllerDialect).toBe("siemens");
    expect(engine.toEnvelope(tpl, "haas").controllerDialect).toBe("haas");
    expect(engine.toEnvelope(tpl, "okuma").controllerDialect).toBe("okuma");
  });

  it("toEnvelope omits null-valued parameters from the parameters bag", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face") as CamTemplate;
    const env = engine.toEnvelope(tpl);
    // 'tool' has no default → value=null → must NOT appear in parameters
    expect("tool" in env.parameters).toBe(false);
  });

  it("toEnvelope provenance carries full audit context", () => {
    const tpl = camTemplateGeneratorEngine.generate("swarf_5axis", "hypermill", "ruled_surface") as CamTemplate;
    const env = engine.toEnvelope(tpl);
    expect(env.provenance.family).toBe("milling_5axis");
    expect(env.provenance.strategy).toBe("finishing");
    expect(env.provenance.nativeName).toBe("5-Axis Tangent Plane");
    expect(env.provenance.featureClass).toBe("ruled_surface");
  });

  it("toEnvelope reflects 5-axis count for milling_5axis ops", () => {
    const tpl = camTemplateGeneratorEngine.generate("swarf_5axis", "hypermill", "ruled_surface") as CamTemplate;
    expect(engine.toEnvelope(tpl).axisCount).toBe("5");
  });

  it("toEnvelope reflects 2-axis count for turning ops", () => {
    const tpl = camTemplateGeneratorEngine.generate("turn_rough", "mastercam", "external_profile") as CamTemplate;
    expect(engine.toEnvelope(tpl).axisCount).toBe("2");
  });

  it("toEnvelope spindleRpm = null when not in params (no fabrication)", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face", {
      overrides: { spindle_rpm: 5000 },
    }) as CamTemplate;
    expect(engine.toEnvelope(tpl).spindleRpm).toBe(5000);
  });

  it("dialects() returns the 7 supported controller families", () => {
    const d = engine.dialects();
    expect(d.length).toBe(7);
    expect(d).toContain("fanuc");
    expect(d).toContain("siemens");
    expect(d).toContain("haas");
    expect(d).toContain("okuma");
    expect(d).toContain("heidenhain");
    expect(d).toContain("mazak");
    expect(d).toContain("mitsubishi");
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes to_envelope + dialects", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("to_envelope");
    expect(names).toContain("dialects");
  });
});
