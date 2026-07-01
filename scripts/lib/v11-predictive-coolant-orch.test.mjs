/**
 * v11-predictive-coolant-orch.test.mjs — concrete-value tests for the
 * predictive per-op coolant mode orchestrator.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-NOVEL-PREDICTIVE-COOLANT-ORCH
 * @slot echo · @iter 30 · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  COOLANT_SCHEMA_VERSION,
  CANONICAL_MODES,
  MODE_MCODES,
  DEFAULT_FLOW_PCT,
  DEFAULT_PRESSURE_BAR,
  MATERIAL_FAMILIES,
  HIGH_LD_RATIO_THRESHOLD,
  DEEP_DOC_MM_THRESHOLD,
  HIGH_RPM_THRESHOLD,
  classifyMaterial,
  predictCoolantMode,
  emitCoolantTransition,
  predictProgramCoolant,
  summarizeProgramCoolant,
  renderCoolantPlanAdvisory,
} from "./v11-predictive-coolant-orch.mjs";

describe("constants", () => {
  it("COOLANT_SCHEMA_VERSION = 1", () => {
    assert.equal(COOLANT_SCHEMA_VERSION, 1);
  });
  it("CANONICAL_MODES has 5 entries in canonical aggressiveness order", () => {
    assert.deepEqual(CANONICAL_MODES, ["dry", "mql", "mist", "flood", "through_spindle"]);
  });
  it("MODE_MCODES.flood = M8 (Fanuc-canonical flood)", () => {
    assert.equal(MODE_MCODES.flood, "M8");
  });
  it("MODE_MCODES.through_spindle = M88 (Hurco TSC canonical)", () => {
    assert.equal(MODE_MCODES.through_spindle, "M88");
  });
  it("MODE_MCODES.dry = M9 (coolant off)", () => {
    assert.equal(MODE_MCODES.dry, "M9");
  });
  it("DEFAULT_FLOW_PCT.dry = 0", () => {
    assert.equal(DEFAULT_FLOW_PCT.dry, 0);
  });
  it("DEFAULT_FLOW_PCT.flood = 100", () => {
    assert.equal(DEFAULT_FLOW_PCT.flood, 100);
  });
  it("DEFAULT_PRESSURE_BAR.through_spindle = 70 (high-pressure TSC)", () => {
    assert.equal(DEFAULT_PRESSURE_BAR.through_spindle, 70);
  });
  it("HIGH_LD_RATIO_THRESHOLD = 4 (deep-hole TSC trigger)", () => {
    assert.equal(HIGH_LD_RATIO_THRESHOLD, 4);
  });
  it("DEEP_DOC_MM_THRESHOLD = 20mm (drill-depth TSC trigger)", () => {
    assert.equal(DEEP_DOC_MM_THRESHOLD, 20);
  });
  it("HIGH_RPM_THRESHOLD = 8000 (steel HSM mist trigger)", () => {
    assert.equal(HIGH_RPM_THRESHOLD, 8000);
  });
  it("MATERIAL_FAMILIES exposes 6 named families", () => {
    assert.equal(Object.keys(MATERIAL_FAMILIES).length, 6);
  });
});

describe("classifyMaterial", () => {
  it("'6061-T6' → aluminum", () => {
    assert.equal(classifyMaterial("6061-T6"), "aluminum");
  });
  it("'7075' → aluminum", () => {
    assert.equal(classifyMaterial("7075"), "aluminum");
  });
  it("'4140' → steel", () => {
    assert.equal(classifyMaterial("4140"), "steel");
  });
  it("'1018-CRS' → steel", () => {
    assert.equal(classifyMaterial("1018-CRS"), "steel");
  });
  it("'304-SS' → stainless", () => {
    assert.equal(classifyMaterial("304-SS"), "stainless");
  });
  it("'17-4 PH' → stainless", () => {
    assert.equal(classifyMaterial("17-4 PH"), "stainless");
  });
  it("'Ti-6Al-4V' → titanium", () => {
    assert.equal(classifyMaterial("Ti-6Al-4V"), "titanium");
  });
  it("'Inconel 718' → inconel", () => {
    assert.equal(classifyMaterial("Inconel 718"), "inconel");
  });
  it("'Gray Iron' → cast_iron", () => {
    assert.equal(classifyMaterial("Gray Iron"), "cast_iron");
  });
  it("case-insensitive: 'aluminum' → aluminum", () => {
    assert.equal(classifyMaterial("aluminum"), "aluminum");
  });
  it("null → unknown", () => {
    assert.equal(classifyMaterial(null), "unknown");
  });
  it("'' → unknown", () => {
    assert.equal(classifyMaterial(""), "unknown");
  });
  it("'Unobtanium' → unknown", () => {
    assert.equal(classifyMaterial("Unobtanium"), "unknown");
  });
  it("number 6061 (non-string) → unknown", () => {
    assert.equal(classifyMaterial(6061), "unknown");
  });
});

describe("predictCoolantMode: aluminum rules", () => {
  it("Al + drill → mist", () => {
    const r = predictCoolantMode({ material: "6061", opType: "drill" });
    assert.equal(r.mode, "mist");
  });
  it("Al + finish → dry (no thermal shock)", () => {
    const r = predictCoolantMode({ material: "6061", opType: "finish" });
    assert.equal(r.mode, "dry");
  });
  it("Al + rough → mist", () => {
    const r = predictCoolantMode({ material: "6061", opType: "rough" });
    assert.equal(r.mode, "mist");
  });
  it("Al + tap → mist", () => {
    const r = predictCoolantMode({ material: "6061", opType: "tap" });
    assert.equal(r.mode, "mist");
  });
  it("Al + finish → mcode M9 (dry)", () => {
    const r = predictCoolantMode({ material: "6061", opType: "finish" });
    assert.equal(r.mcode, "M9");
  });
});

describe("predictCoolantMode: titanium + inconel rules", () => {
  it("Ti + drill DOC=25mm → through_spindle (deep-hole TSC)", () => {
    const r = predictCoolantMode({ material: "Ti-6Al-4V", opType: "drill", depthOfCutMm: 25 });
    assert.equal(r.mode, "through_spindle");
  });
  it("Ti + general → flood", () => {
    const r = predictCoolantMode({ material: "Ti-6Al-4V", opType: "rough", depthOfCutMm: 5 });
    assert.equal(r.mode, "flood");
  });
  it("Ti + L/D=5 (toolDia=10, toolLen=50) → through_spindle (high L/D)", () => {
    const r = predictCoolantMode({
      material: "Ti-6Al-4V", opType: "rough",
      toolDiameterMm: 10, toolLengthMm: 50,
    });
    assert.equal(r.mode, "through_spindle");
  });
  it("Inconel + drill DOC=30mm → through_spindle", () => {
    const r = predictCoolantMode({ material: "Inconel 718", opType: "drill", depthOfCutMm: 30 });
    assert.equal(r.mode, "through_spindle");
  });
  it("Inconel + general → flood", () => {
    const r = predictCoolantMode({ material: "Inconel 718", opType: "mill", depthOfCutMm: 2 });
    assert.equal(r.mode, "flood");
  });
  it("Ti + TSC → mcode M88 + pressure 70bar", () => {
    const r = predictCoolantMode({ material: "Ti-6Al-4V", opType: "drill", depthOfCutMm: 30 });
    assert.equal(r.mcode, "M88");
    assert.equal(r.pressureBar, 70);
  });
});

describe("predictCoolantMode: stainless rules", () => {
  it("SS + any op → flood", () => {
    const r = predictCoolantMode({ material: "316-SS", opType: "mill" });
    assert.equal(r.mode, "flood");
  });
  it("SS + tap → flood (mandatory)", () => {
    const r = predictCoolantMode({ material: "17-4", opType: "tap" });
    assert.equal(r.mode, "flood");
  });
});

describe("predictCoolantMode: cast iron rules", () => {
  it("CI + finish → dry (no flood mud)", () => {
    const r = predictCoolantMode({ material: "Gray Iron", opType: "finish" });
    assert.equal(r.mode, "dry");
  });
  it("CI + rough → mist (dust mgmt)", () => {
    const r = predictCoolantMode({ material: "Gray Iron", opType: "rough" });
    assert.equal(r.mode, "mist");
  });
});

describe("predictCoolantMode: steel rules", () => {
  it("Steel + tap → flood (mandatory cutting fluid)", () => {
    const r = predictCoolantMode({ material: "4140", opType: "tap" });
    assert.equal(r.mode, "flood");
  });
  it("Steel + ream → flood", () => {
    const r = predictCoolantMode({ material: "1018", opType: "ream" });
    assert.equal(r.mode, "flood");
  });
  it("Steel + thread → flood", () => {
    const r = predictCoolantMode({ material: "4140", opType: "thread" });
    assert.equal(r.mode, "flood");
  });
  it("Steel + drill DOC=25mm → through_spindle (deep)", () => {
    const r = predictCoolantMode({ material: "4140", opType: "drill", depthOfCutMm: 25 });
    assert.equal(r.mode, "through_spindle");
  });
  it("Steel + drill DOC=10mm (shallow) → flood", () => {
    const r = predictCoolantMode({ material: "4140", opType: "drill", depthOfCutMm: 10 });
    assert.equal(r.mode, "flood");
  });
  it("Steel + RPM=10000 (HSM) → mist", () => {
    const r = predictCoolantMode({ material: "4140", opType: "mill", spindleRpm: 10000 });
    assert.equal(r.mode, "mist");
  });
  it("Steel + RPM=3000 (normal) → flood", () => {
    const r = predictCoolantMode({ material: "4140", opType: "mill", spindleRpm: 3000 });
    assert.equal(r.mode, "flood");
  });
});

describe("predictCoolantMode: unknown + null guards", () => {
  it("unknown material → flood fallback (safe default)", () => {
    const r = predictCoolantMode({ material: "Unobtanium", opType: "mill" });
    assert.equal(r.mode, "flood");
  });
  it("null op → flood fallback + rationale captures it", () => {
    const r = predictCoolantMode(null);
    assert.equal(r.mode, "flood");
    assert.equal(r.rationale[0].includes("null"), true);
  });
  it("rationale is non-empty array", () => {
    const r = predictCoolantMode({ material: "4140", opType: "mill" });
    assert.equal(r.rationale.length >= 1, true);
  });
});

describe("emitCoolantTransition", () => {
  it("flood → flood → no transition", () => {
    const t = emitCoolantTransition("flood", "flood");
    assert.equal(t.needsTransition, false);
  });
  it("flood → through_spindle → ['M9','M88']", () => {
    const t = emitCoolantTransition("flood", "through_spindle");
    assert.deepEqual(t.mcodes, ["M9", "M88"]);
  });
  it("dry → flood → ['M8'] (no M9 needed, dry was already off)", () => {
    const t = emitCoolantTransition("dry", "flood");
    assert.deepEqual(t.mcodes, ["M8"]);
  });
  it("flood → dry → ['M9'] (turn off, nothing to turn on)", () => {
    const t = emitCoolantTransition("flood", "dry");
    assert.deepEqual(t.mcodes, ["M9"]);
  });
  it("mist → flood → ['M9','M8']", () => {
    const t = emitCoolantTransition("mist", "flood");
    assert.deepEqual(t.mcodes, ["M9", "M8"]);
  });
});

describe("predictProgramCoolant: full ops array", () => {
  const ops = [
    { opType: "drill", material: "4140", depthOfCutMm: 25 },         // → through_spindle
    { opType: "mill",  material: "4140", spindleRpm: 3000 },          // → flood
    { opType: "finish", material: "6061" },                            // → dry
  ];
  it("returns array length matches input length", () => {
    assert.equal(predictProgramCoolant(ops).length, 3);
  });
  it("op[0] → through_spindle (steel deep drill)", () => {
    assert.equal(predictProgramCoolant(ops)[0].coolant.mode, "through_spindle");
  });
  it("op[1] → flood (steel general)", () => {
    assert.equal(predictProgramCoolant(ops)[1].coolant.mode, "flood");
  });
  it("op[2] → dry (Al finishing)", () => {
    assert.equal(predictProgramCoolant(ops)[2].coolant.mode, "dry");
  });
  it("preserves original op fields (immutability spread)", () => {
    assert.equal(predictProgramCoolant(ops)[0].material, "4140");
    assert.equal(predictProgramCoolant(ops)[0].opType, "drill");
  });
  it("non-array → empty array", () => {
    assert.deepEqual(predictProgramCoolant(null), []);
  });
  it("empty array → empty array", () => {
    assert.deepEqual(predictProgramCoolant([]), []);
  });
});

describe("summarizeProgramCoolant", () => {
  const ops = [
    { opType: "drill", material: "4140", depthOfCutMm: 25 },          // → through_spindle
    { opType: "mill",  material: "4140", spindleRpm: 3000 },           // → flood
    { opType: "mill",  material: "4140", spindleRpm: 3000 },           // → flood
    { opType: "finish", material: "6061" },                             // → dry
  ];
  const withCoolant = predictProgramCoolant(ops);

  it("totalOps = 4", () => {
    assert.equal(summarizeProgramCoolant(withCoolant).totalOps, 4);
  });
  it("flood count = 2 (two mill ops)", () => {
    assert.equal(summarizeProgramCoolant(withCoolant).modeCount.flood, 2);
  });
  it("through_spindle count = 1", () => {
    assert.equal(summarizeProgramCoolant(withCoolant).modeCount.through_spindle, 1);
  });
  it("dry count = 1", () => {
    assert.equal(summarizeProgramCoolant(withCoolant).modeCount.dry, 1);
  });
  it("transitionCount = 3 (TSC→flood, flood→flood SAME no count, flood→dry)", () => {
    // ops are [TSC, flood, flood, dry] → transitions at index 1 (TSC→flood) and 3 (flood→dry) = 2
    assert.equal(summarizeProgramCoolant(withCoolant).transitionCount, 2);
  });
  it("dominantMode = flood (2 of 4)", () => {
    assert.equal(summarizeProgramCoolant(withCoolant).dominantMode, "flood");
  });
  it("empty ops → totalOps=0", () => {
    assert.equal(summarizeProgramCoolant([]).totalOps, 0);
  });
  it("schemaVersion = 1", () => {
    assert.equal(summarizeProgramCoolant(withCoolant).schemaVersion, 1);
  });
});

describe("renderCoolantPlanAdvisory", () => {
  const ops = [
    { opType: "drill", material: "4140", depthOfCutMm: 25 },
    { opType: "mill",  material: "4140", spindleRpm: 3000 },
    { opType: "finish", material: "6061" },
  ];
  const withCoolant = predictProgramCoolant(ops);

  it("includes header 'PRISM PREDICTIVE COOLANT PLAN'", () => {
    assert.equal(renderCoolantPlanAdvisory(withCoolant).includes("PRISM PREDICTIVE COOLANT PLAN"), true);
  });
  it("includes total ops line", () => {
    assert.equal(renderCoolantPlanAdvisory(withCoolant).includes("total ops: 3"), true);
  });
  it("includes 'through_spindle: 1'", () => {
    assert.equal(renderCoolantPlanAdvisory(withCoolant).includes("through_spindle: 1"), true);
  });
  it("includes 'M88' (TSC mcode)", () => {
    assert.equal(renderCoolantPlanAdvisory(withCoolant).includes("M88"), true);
  });
  it("empty ops → 'no operations'", () => {
    assert.equal(renderCoolantPlanAdvisory([]).includes("no operations"), true);
  });
});
