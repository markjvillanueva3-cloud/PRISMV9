// npx vitest run src/data/tool-material-categorization.test.ts
// Real-value assertions on the canonical CAM-agnostic tool/holder material categorization.
import { describe, it, expect } from "vitest";
import {
  ISO_513_GROUP_ORDER,
  ISO_513_GROUPS,
  MATERIAL_ISO_PATTERNS,
  normalizeMaterialToISO,
  normalizeMaterialsToISOGroups,
  categorizeToolMaterials,
  ToolMaterialCategorySchema,
} from "./tool-material-categorization.js";

describe("ISO_513_GROUPS taxonomy", () => {
  it("defines all 6 ISO 513 main groups with name/color/description/subgroups", () => {
    expect(ISO_513_GROUP_ORDER).toEqual(["P", "M", "K", "N", "S", "H"]);
    for (const g of ISO_513_GROUP_ORDER) {
      const def = ISO_513_GROUPS[g];
      expect(def.group).toBe(g);
      expect(def.name.length).toBeGreaterThan(0);
      expect(def.color.length).toBeGreaterThan(0);
      expect(def.subgroups.length).toBeGreaterThanOrEqual(3);
    }
  });
  it("uses the standard ISO 513 colour code (P=blue, M=yellow, K=red, N=green, S=brown, H=grey)", () => {
    expect(ISO_513_GROUPS.P.color).toBe("blue");
    expect(ISO_513_GROUPS.M.color).toBe("yellow");
    expect(ISO_513_GROUPS.K.color).toBe("red");
    expect(ISO_513_GROUPS.N.color).toBe("green");
    expect(ISO_513_GROUPS.S.color).toBe("brown");
    expect(ISO_513_GROUPS.H.color).toBe("grey");
  });
});

describe("normalizeMaterialToISO — free-text → ISO group (the cross-CAM key)", () => {
  it("maps steel families to P", () => {
    for (const m of ["1018", "AISI 1018", "4140", "4340 alloy steel", "carbon steel", "mild steel", "P20"]) {
      expect(normalizeMaterialToISO(m)?.group).toBe("P");
    }
  });
  it("maps stainless to M, NOT P (specificity: stainless before steel)", () => {
    for (const m of ["304", "316 stainless", "17-4PH", "2205 duplex", "austenitic stainless steel"]) {
      expect(normalizeMaterialToISO(m)?.group).toBe("M");
    }
  });
  it("maps cast iron to K", () => {
    for (const m of ["gray cast iron", "ductile iron", "GGG-50", "nodular iron", "CGI"]) {
      expect(normalizeMaterialToISO(m)?.group).toBe("K");
    }
  });
  it("maps non-ferrous to N", () => {
    for (const m of ["6061", "7075-T6", "aluminum", "brass", "C360 copper", "magnesium", "Delrin"]) {
      expect(normalizeMaterialToISO(m)?.group).toBe("N");
    }
  });
  it("maps superalloys + titanium to S (before steel)", () => {
    for (const m of ["Inconel 718", "Ti-6Al-4V", "titanium grade 5", "Waspaloy", "Hastelloy", "Stellite"]) {
      expect(normalizeMaterialToISO(m)?.group).toBe("S");
    }
  });
  it("maps hardened materials to H", () => {
    for (const m of ["hardened 52 HRC", "D2 hardened", "H13 tool steel hardened", "chilled cast iron"]) {
      expect(normalizeMaterialToISO(m)?.group).toBe("H");
    }
  });
  // failure modes
  it("returns null for unknown/empty/non-string (no silent coercion to P)", () => {
    expect(normalizeMaterialToISO("")).toBeNull();
    expect(normalizeMaterialToISO("   ")).toBeNull();
    expect(normalizeMaterialToISO("unobtainium")).toBeNull();
    // @ts-expect-error adversarial non-string
    expect(normalizeMaterialToISO(null)).toBeNull();
    // @ts-expect-error adversarial non-string
    expect(normalizeMaterialToISO(42)).toBeNull();
  });
});

describe("regression — scrutiny P0/P1 (wrong-tool-to-material misroutes)", () => {
  it("P0: 3-digit non-ferrous designations map to N, NOT stainless-M (the \\b3\\d\\d\\b bug)", () => {
    for (const m of ["356 aluminum", "380 aluminum", "319 aluminum", "360 brass", "377 brass", "A356", "356"]) {
      expect(normalizeMaterialToISO(m)?.group).toBe("N");
    }
  });
  it("P1: a BARE tool-steel grade (annealed blank) maps to P, not H", () => {
    for (const m of ["A2", "A2 tool steel", "D2", "D2 plate", "H13", "O1", "S7"]) {
      expect(normalizeMaterialToISO(m)?.group).toBe("P");
    }
  });
  it("P1: a tool-steel grade WITH a hardness cue maps to H", () => {
    for (const m of ["D2 hardened", "A2 @ 60 HRC", "hardened H13", "M2 62 HRC"]) {
      expect(normalizeMaterialToISO(m)?.group).toBe("H");
    }
  });
  it("coverage: 3xx/4xx stainless still resolve to M (incl. L grades)", () => {
    for (const m of ["304", "316L", "321", "347", "410", "440C", "303"]) {
      expect(normalizeMaterialToISO(m)?.group).toBe("M");
    }
  });
  it("coverage: 4-digit alloy steels are NOT swallowed by the 4xx stainless pattern", () => {
    for (const m of ["4140", "4340", "1045", "8620"]) {
      expect(normalizeMaterialToISO(m)?.group).toBe("P");
    }
  });
  it("coverage: GG/GGG German cast-iron grades with attached digits map to K", () => {
    for (const m of ["GG25", "GGG40", "GGG-50"]) {
      expect(normalizeMaterialToISO(m)?.group).toBe("K");
    }
  });
});

describe("normalizeMaterialsToISOGroups — dedupe to canonical group set", () => {
  it("dedupes a multi-material tool to distinct groups in canonical order", () => {
    const r = normalizeMaterialsToISOGroups(["1018", "4140", "304 stainless", "6061"]);
    expect(r.groups).toEqual(["P", "M", "N"]); // canonical order, deduped
    expect(r.unmatched).toEqual([]);
  });
  it("surfaces unmatched material names (R12 — no silent drop)", () => {
    const r = normalizeMaterialsToISOGroups(["304", "unobtainium", ""]);
    expect(r.groups).toEqual(["M"]);
    expect(r.unmatched).toEqual(["unobtainium"]);
  });
  it("empty input → empty result, no throw", () => {
    expect(normalizeMaterialsToISOGroups([])).toEqual({ groups: [], unmatched: [] });
    // @ts-expect-error adversarial
    expect(normalizeMaterialsToISOGroups(null)).toEqual({ groups: [], unmatched: [] });
  });
});

describe("categorizeToolMaterials — canonical per-tool material record", () => {
  it("builds a schema-valid record with isoGroups + primaryGroup + provenance", () => {
    const cat = categorizeToolMaterials(["4140 steel", "stainless 316"]);
    expect(cat).not.toBeNull();
    expect(cat!.isoGroups).toEqual(["P", "M"]);
    expect(cat!.primaryGroup).toBe("P"); // first in canonical order
    expect(cat!.sourceMaterials).toContain("4140 steel");
    expect(() => ToolMaterialCategorySchema.parse(cat)).not.toThrow();
  });
  it("honors an explicit primaryGroup when it is among the resolved groups", () => {
    const cat = categorizeToolMaterials(["6061 aluminum", "inconel"], { primaryGroup: "S" });
    expect(cat!.isoGroups).toEqual(["N", "S"]);
    expect(cat!.primaryGroup).toBe("S");
  });
  it("ignores an explicit primaryGroup not among resolved groups (falls back to first)", () => {
    const cat = categorizeToolMaterials(["6061 aluminum"], { primaryGroup: "S" });
    expect(cat!.primaryGroup).toBe("N");
  });
  it("returns null when NO material maps (caller decides — never fabricates a group)", () => {
    expect(categorizeToolMaterials(["unobtainium", "mystery"])).toBeNull();
    expect(categorizeToolMaterials([])).toBeNull();
  });
  it("records unmatched materials on the category for follow-up", () => {
    const cat = categorizeToolMaterials(["304", "weirdalloy"]);
    expect(cat!.unmatchedMaterials).toEqual(["weirdalloy"]);
  });
});

describe("ToolMaterialCategorySchema — invariants", () => {
  it("requires ≥1 isoGroup", () => {
    expect(() => ToolMaterialCategorySchema.parse({ isoGroups: [] })).toThrow();
  });
  it("rejects a non-ISO group letter", () => {
    expect(() => ToolMaterialCategorySchema.parse({ isoGroups: ["X"] })).toThrow();
  });
  it("accepts a full record with hardnessHRC + subgroups", () => {
    const rec = { isoGroups: ["H"], primaryGroup: "H", subgroups: ["H-hardened-58-65"], hardnessHRC: { min: 58, max: 65 } };
    expect(() => ToolMaterialCategorySchema.parse(rec)).not.toThrow();
  });
});

describe("MATERIAL_ISO_PATTERNS — ordering invariant (specificity-first)", () => {
  it("places superalloy/stainless patterns before the generic steel pattern", () => {
    const steelIdx = MATERIAL_ISO_PATTERNS.findIndex((p) => p.group === "P");
    const mIdx = MATERIAL_ISO_PATTERNS.findIndex((p) => p.group === "M");
    const sIdx = MATERIAL_ISO_PATTERNS.findIndex((p) => p.group === "S");
    expect(sIdx).toBeLessThan(steelIdx);
    expect(mIdx).toBeLessThan(steelIdx);
  });
});
