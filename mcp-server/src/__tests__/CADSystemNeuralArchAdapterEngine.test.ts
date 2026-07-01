/**
 * CADSystemNeuralArchAdapterEngine — CAD-COMPLETE-MS0/PHASE-31 NN04+NN05+NN06 tests.
 */

import { describe, it, expect } from "vitest";
import {
  CADSystem,
  FUSION_RULES,
  INVENTOR_RULES,
  SOLIDWORKS_RULES,
  SYSTEM_RULES,
  CADSystemNeuralArchAdapterEngine,
  canonicalize,
  cadSystemNeuralArchAdapterEngine,
  getRules,
  isSupportedSystem,
  nativize,
} from "../engines/CADSystemNeuralArchAdapterEngine.js";

describe("CADSystem const (priority order from user directive)", () => {
  it("lists fusion360 → solidworks → inventor in priority order", () => {
    expect(CADSystem).toEqual(["fusion360", "solidworks", "inventor"]);
  });
});

describe("isSupportedSystem", () => {
  it("returns true for each supported system", () => {
    for (const s of CADSystem) expect(isSupportedSystem(s)).toBe(true);
  });
  it("returns false for unknown system (Esprit / FreeCAD on hold per user)", () => {
    expect(isSupportedSystem("esprit")).toBe(false);
    expect(isSupportedSystem("freecad")).toBe(false);
  });
  it("returns false for empty string", () => {
    expect(isSupportedSystem("")).toBe(false);
  });
});

describe("getRules", () => {
  it("returns FUSION_RULES for fusion360 with mm default", () => {
    const r = getRules("fusion360");
    expect(r.system).toBe("fusion360");
    expect(r.defaultUnit).toBe("mm");
    expect(r.entityIdPrefix).toBe("fusion:");
  });
  it("returns SOLIDWORKS_RULES for solidworks with inch default (JM Die NA workflow)", () => {
    expect(getRules("solidworks").defaultUnit).toBe("inch");
  });
  it("returns INVENTOR_RULES for inventor", () => {
    expect(getRules("inventor").entityIdPrefix).toBe("iv:");
  });
  it("throws on unsupported system (R12 fail-loud, not silent passthrough)", () => {
    expect(() => getRules("nx" as never)).toThrow(/unsupported/);
  });
});

describe("canonicalize — per-system feature name → canonical", () => {
  it("Fusion ExtrudeFeature → feature_extrude", () => {
    const out = canonicalize("fusion360", [{ type: "ExtrudeFeature" } as never]);
    expect(out[0].type).toBe("feature_extrude");
  });
  it("SolidWorks Boss-Extrude → feature_extrude (different native verb, same canonical)", () => {
    const out = canonicalize("solidworks", [{ type: "Boss-Extrude" } as never]);
    expect(out[0].type).toBe("feature_extrude");
  });
  it("Inventor Extrusion → feature_extrude", () => {
    const out = canonicalize("inventor", [{ type: "Extrusion" } as never]);
    expect(out[0].type).toBe("feature_extrude");
  });

  it("all 3 CAD systems map their extrude variant to the same canonical token (training-set unification)", () => {
    const a = canonicalize("fusion360",  [{ type: "ExtrudeFeature" } as never])[0].type;
    const b = canonicalize("solidworks", [{ type: "Boss-Extrude" }   as never])[0].type;
    const c = canonicalize("inventor",   [{ type: "Extrusion" }      as never])[0].type;
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(a).toBe("feature_extrude");
  });

  it("throws (R12 fail-loud) on unknown feature name — never silently passes garbage tokens to the neural backbone", () => {
    expect(() => canonicalize("fusion360", [{ type: "GenuinelyUnknownThing" } as never])).toThrow(/unknown/);
  });

  it("preserves non-type fields when canonicalizing (e.g. parameters/dimensions)", () => {
    const out = canonicalize("fusion360", [{ type: "HoleFeature", parameters: { diameter: 6.5 } } as never]);
    expect((out[0] as never as { parameters: { diameter: number } }).parameters.diameter).toBe(6.5);
  });
});

describe("nativize — canonical → per-system feature name (round-trip)", () => {
  it("Fusion round-trip: ExtrudeFeature → feature_extrude → ExtrudeFeature", () => {
    const c = canonicalize("fusion360", [{ type: "ExtrudeFeature" } as never]);
    const n = nativize("fusion360", c);
    expect(n[0].type).toBe("ExtrudeFeature");
  });

  it("SolidWorks round-trip: Hole-Wizard → feature_hole → Hole-Wizard", () => {
    const c = canonicalize("solidworks", [{ type: "Hole-Wizard" } as never]);
    const n = nativize("solidworks", c);
    expect(n[0].type).toBe("Hole-Wizard");
  });

  it("Inventor round-trip: Pocket → feature_pocket → Pocket", () => {
    const c = canonicalize("inventor", [{ type: "Pocket" } as never]);
    const n = nativize("inventor", c);
    expect(n[0].type).toBe("Pocket");
  });

  it("throws on canonical token with no native mapping (defensive against backbone hallucination)", () => {
    expect(() => nativize("fusion360", [{ type: "feature_nonexistent_op" } as never])).toThrow(/no fusion360 native mapping/);
  });
});

describe("Variability floor — all 3 CAD systems × 3 representative ops (build-enforce R3)", () => {
  const ops = ["ExtrudeFeature", "FilletFeature", "ChamferFeature"];
  const nativeMap: Record<string, [string, string, string]> = {
    fusion360:  ["ExtrudeFeature", "FilletFeature", "ChamferFeature"],
    solidworks: ["Boss-Extrude",   "Fillet",        "Chamfer"],
    inventor:   ["Extrusion",      "Fillet",        "Chamfer"],
  };
  for (const sys of CADSystem) {
    it(`${sys} canonicalizes extrude/fillet/chamfer to canonical tokens`, () => {
      const native = nativeMap[sys];
      const out = canonicalize(sys, native.map(t => ({ type: t } as never)));
      expect(out.map(o => o.type)).toEqual(["feature_extrude", "feature_fillet", "feature_chamfer"]);
    });
  }
});

describe("CADSystemNeuralArchAdapterEngine class wrapper", () => {
  it("singleton lists 3 systems and rule-count matches registry", () => {
    expect(cadSystemNeuralArchAdapterEngine.systems().length).toBe(3);
    const s = cadSystemNeuralArchAdapterEngine.summary();
    expect(s.schemaVersion).toBe(1);
    expect(s.ruleCount).toBe(3);
    expect(s.perSystemFeatureCount.get("fusion360")).toBe(FUSION_RULES.featureNameMap.size);
    expect(s.perSystemFeatureCount.get("solidworks")).toBe(SOLIDWORKS_RULES.featureNameMap.size);
    expect(s.perSystemFeatureCount.get("inventor")).toBe(INVENTOR_RULES.featureNameMap.size);
  });

  it("class instance and singleton agree on canonicalization", () => {
    const eng = new CADSystemNeuralArchAdapterEngine();
    const direct  = canonicalize("fusion360", [{ type: "RevolveFeature" } as never]);
    const wrapped = eng.canonicalize("fusion360", [{ type: "RevolveFeature" } as never]);
    expect(wrapped).toEqual(direct);
  });

  it("every system rule has at least 6 feature mappings (coverage floor for core ops)", () => {
    for (const sys of CADSystem) {
      expect(SYSTEM_RULES.get(sys)!.featureNameMap.size).toBeGreaterThanOrEqual(6);
    }
  });
});
