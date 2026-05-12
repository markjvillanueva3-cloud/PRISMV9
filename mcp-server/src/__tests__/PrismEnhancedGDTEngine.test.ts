import { describe, it, expect } from "vitest";
import {
  prismEnhancedGdtEngine,
  type CAMRecommendation,
  type ExtendedModifierCode,
} from "../engines/PrismEnhancedGDTEngine.js";
import { gdtCalloutParserEngine, type FCF, type GDTSymbol } from "../engines/GDTCalloutParserEngine.js";

describe("PrismEnhancedGDTEngine — symbol metadata (specific reference values)", () => {
  it("listSymbols returns 14 GD&T symbols in alphabetical order", () => {
    const list = prismEnhancedGdtEngine.listSymbols();
    expect(list).toHaveLength(14);
    expect(list.map((s) => s.symbol)).toEqual([
      "angularity", "circular_runout", "concentricity", "cylindricity",
      "flatness", "parallelism", "perpendicularity", "position",
      "profile_of_line", "profile_of_surface", "roundness",
      "straightness", "symmetry", "total_runout",
    ]);
  });

  it("flatness metadata matches ASME Y14.5-2018 reference content (full equality)", () => {
    const md = prismEnhancedGdtEngine.getSymbolMetadata("flatness");
    expect(md).toEqual({
      symbol: "flatness",
      glyph: "⏥",
      unicode: "U+23E5",
      category: "form",
      requires_datum: false,
      description: "All surface points within tolerance zone between two parallel planes",
      application: "Mating surfaces, sealing surfaces, reference planes",
      measurement: "Surface plate with indicator, CMM plane fit",
    });
  });

  it("position metadata is a location-family symbol requiring datum, with CMM measurement", () => {
    const md = prismEnhancedGdtEngine.getSymbolMetadata("position");
    expect(md?.glyph).toBe("⌖");
    expect(md?.unicode).toBe("U+2316");
    expect(md?.category).toBe("location");
    expect(md?.requires_datum).toBe(true);
    expect(md?.description).toBe("True position within cylindrical/spherical tolerance zone");
    expect(md?.application).toBe("Hole patterns, pin locations, fastener clearance");
    expect(md?.measurement).toBe("CMM, functional gauge");
  });

  it("circular_runout is a runout-family symbol with FIM cross-section description", () => {
    const md = prismEnhancedGdtEngine.getSymbolMetadata("circular_runout");
    expect(md?.category).toBe("runout");
    expect(md?.requires_datum).toBe(true);
    expect(md?.description).toBe(
      "FIM at any single cross-section when rotated about the datum axis"
    );
    expect(md?.application).toBe("Shaft surfaces, rotating seals");
  });

  it("profile_of_line and profile_of_surface both carry requires_datum='optional'", () => {
    expect(prismEnhancedGdtEngine.getSymbolMetadata("profile_of_line")?.requires_datum).toBe(
      "optional"
    );
    expect(prismEnhancedGdtEngine.getSymbolMetadata("profile_of_surface")?.requires_datum).toBe(
      "optional"
    );
  });

  it("concentricity is marked deprecated in Y14.5-2018 in description", () => {
    expect(prismEnhancedGdtEngine.getSymbolMetadata("concentricity")?.description).toBe(
      "All median points within cylindrical tolerance zone (deprecated in Y14.5-2018; prefer position or runout)"
    );
  });

  it("symmetry is marked deprecated in Y14.5-2018 in description", () => {
    expect(prismEnhancedGdtEngine.getSymbolMetadata("symmetry")?.description).toBe(
      "Median points equidistant from datum center plane (deprecated in Y14.5-2018)"
    );
  });

  it("form category contains exactly: cylindricity, flatness, roundness, straightness", () => {
    const forms = prismEnhancedGdtEngine
      .listSymbols()
      .filter((m) => m.category === "form")
      .map((m) => m.symbol)
      .sort();
    expect(forms).toEqual(["cylindricity", "flatness", "roundness", "straightness"]);
  });

  it("orientation category contains exactly: angularity, parallelism, perpendicularity", () => {
    const ori = prismEnhancedGdtEngine
      .listSymbols()
      .filter((m) => m.category === "orientation")
      .map((m) => m.symbol)
      .sort();
    expect(ori).toEqual(["angularity", "parallelism", "perpendicularity"]);
  });

  it("location category contains exactly: concentricity, position, symmetry", () => {
    const loc = prismEnhancedGdtEngine
      .listSymbols()
      .filter((m) => m.category === "location")
      .map((m) => m.symbol)
      .sort();
    expect(loc).toEqual(["concentricity", "position", "symmetry"]);
  });

  it("profile category contains exactly: profile_of_line, profile_of_surface", () => {
    const prof = prismEnhancedGdtEngine
      .listSymbols()
      .filter((m) => m.category === "profile")
      .map((m) => m.symbol)
      .sort();
    expect(prof).toEqual(["profile_of_line", "profile_of_surface"]);
  });

  it("runout category contains exactly: circular_runout, total_runout", () => {
    const runout = prismEnhancedGdtEngine
      .listSymbols()
      .filter((m) => m.category === "runout")
      .map((m) => m.symbol)
      .sort();
    expect(runout).toEqual(["circular_runout", "total_runout"]);
  });

  it("getSymbolMetadata returns null for an unknown symbol cast", () => {
    const result = prismEnhancedGdtEngine.getSymbolMetadata("not_a_real_symbol" as GDTSymbol);
    expect(result).toBe(null);
  });
});

describe("PrismEnhancedGDTEngine — modifier metadata (specific reference values)", () => {
  it("listModifiers returns the 9 ASME Y14.5-2018 modifiers in declared order", () => {
    expect(prismEnhancedGdtEngine.listModifiers().map((m) => m.code)).toEqual([
      "M", "L", "RFS", "P", "F", "T", "ST", "CF", "UZ",
    ]);
  });

  it("M modifier: full equality check for MMC entry", () => {
    expect(prismEnhancedGdtEngine.getModifierMetadata("M")).toEqual({
      code: "M",
      glyph: "Ⓜ",
      unicode: "U+24C2",
      name: "Maximum Material Condition",
      description:
        "Tolerance applies at maximum material (shaft largest, hole smallest); bonus tolerance as feature departs from MMC.",
      application: "Clearance holes, assembly fits",
      parser_recognized: true,
    });
  });

  it("L modifier: name = 'Least Material Condition', parser-recognized", () => {
    const m = prismEnhancedGdtEngine.getModifierMetadata("L");
    expect(m?.name).toBe("Least Material Condition");
    expect(m?.glyph).toBe("Ⓛ");
    expect(m?.parser_recognized).toBe(true);
    expect(m?.application).toBe("Thin walls, minimum edge distances");
  });

  it("RFS modifier is the Y14.5-2018 default and parser-recognized", () => {
    const m = prismEnhancedGdtEngine.getModifierMetadata("RFS");
    expect(m?.name).toBe("Regardless of Feature Size");
    expect(m?.description).toBe(
      "Tolerance applies regardless of actual size — default condition in Y14.5-2018."
    );
    expect(m?.parser_recognized).toBe(true);
  });

  it("F modifier: name = 'Free State', parser-recognized", () => {
    const m = prismEnhancedGdtEngine.getModifierMetadata("F");
    expect(m?.name).toBe("Free State");
    expect(m?.glyph).toBe("Ⓕ");
    expect(m?.parser_recognized).toBe(true);
    expect(m?.application).toBe("Flexible parts, sheet metal");
  });

  it("P (Projected Tolerance Zone) is metadata-only", () => {
    const m = prismEnhancedGdtEngine.getModifierMetadata("P");
    expect(m?.name).toBe("Projected Tolerance Zone");
    expect(m?.parser_recognized).toBe(false);
    expect(m?.application).toBe("Press-fit pins, threaded holes for studs");
  });

  it("T (Tangent Plane) is metadata-only", () => {
    const m = prismEnhancedGdtEngine.getModifierMetadata("T");
    expect(m?.name).toBe("Tangent Plane");
    expect(m?.parser_recognized).toBe(false);
  });

  it("ST (Statistical Tolerance) is metadata-only", () => {
    const m = prismEnhancedGdtEngine.getModifierMetadata("ST");
    expect(m?.name).toBe("Statistical Tolerance");
    expect(m?.parser_recognized).toBe(false);
  });

  it("CF (Continuous Feature) is metadata-only", () => {
    const m = prismEnhancedGdtEngine.getModifierMetadata("CF");
    expect(m?.name).toBe("Continuous Feature");
    expect(m?.parser_recognized).toBe(false);
  });

  it("UZ (Unequal Bilateral) is metadata-only", () => {
    const m = prismEnhancedGdtEngine.getModifierMetadata("UZ");
    expect(m?.name).toBe("Unequal Bilateral");
    expect(m?.parser_recognized).toBe(false);
  });

  it("exactly 4 of 9 modifiers are parser_recognized — M, L, F, RFS", () => {
    const recognized = prismEnhancedGdtEngine
      .listModifiers()
      .filter((m) => m.parser_recognized)
      .map((m) => m.code)
      .sort();
    expect(recognized).toEqual(["F", "L", "M", "RFS"]);
    expect(recognized).toHaveLength(4);
  });

  it("getModifierMetadata returns null for an unknown code", () => {
    const result = prismEnhancedGdtEngine.getModifierMetadata("X" as ExtendedModifierCode);
    expect(result).toBe(null);
  });
});

describe("PrismEnhancedGDTEngine — CAM interpretation (location family: drilling tiers)", () => {
  it("position 0.025 < 0.05 → PRECISION_BORE", () => {
    const r = prismEnhancedGdtEngine.parseEnhanced("POS Ø0.025 A B C");
    expect(r.parse_failed).toBe(false);
    expect(r.metadata?.category).toBe("location");
    expect(r.cam_recommendations).toHaveLength(1);
    const rec = r.cam_recommendations[0]!;
    expect(rec.strategy).toBe("PRECISION_BORE");
    expect(rec.operation).toBe("drilling");
    expect(rec.symbol).toBe("position");
    expect(rec.tolerance_mm).toBeCloseTo(0.025, 10);
    expect(rec.requirement).toBe(
      "Use precision boring or reaming for tight position tolerance"
    );
  });

  it("position 0.05 hits REAM (strict less-than at PRECISION_BORE boundary)", () => {
    const fcf: FCF = gdtCalloutParserEngine.parse("POS 0.05 A");
    const recs: CAMRecommendation[] = prismEnhancedGdtEngine.interpretForCAM(fcf);
    expect(recs).toHaveLength(1);
    expect(recs[0]!.strategy).toBe("REAM");
    expect(recs[0]!.symbol).toBe("position");
  });

  it("position 0.20 → DRILL (above REAM threshold)", () => {
    const recs = prismEnhancedGdtEngine.interpretForCAM("POS 0.2 A");
    expect(recs[0]!.strategy).toBe("DRILL");
    expect(recs[0]!.tolerance_mm).toBeCloseTo(0.2, 10);
  });
});

describe("PrismEnhancedGDTEngine — CAM interpretation (form family: facing tiers)", () => {
  it("flatness 0.01 → GRINDING (tightest tier)", () => {
    const g = prismEnhancedGdtEngine.parseEnhanced("FLAT 0.01");
    expect(g.metadata?.category).toBe("form");
    expect(g.cam_recommendations[0]!.strategy).toBe("GRINDING");
    expect(g.cam_recommendations[0]!.operation).toBe("facing");
  });

  it("flatness 0.04 → PRECISION_FACE (between 0.025 and 0.05)", () => {
    const p = prismEnhancedGdtEngine.parseEnhanced("FLAT 0.04");
    expect(p.cam_recommendations[0]!.strategy).toBe("PRECISION_FACE");
    expect(p.cam_recommendations[0]!.tolerance_mm).toBeCloseTo(0.04, 10);
  });

  it("flatness 0.10 → STANDARD_FACE (above PRECISION threshold)", () => {
    const s = prismEnhancedGdtEngine.parseEnhanced("FLAT 0.10");
    expect(s.cam_recommendations[0]!.strategy).toBe("STANDARD_FACE");
  });
});

describe("PrismEnhancedGDTEngine — CAM interpretation (runout/roundness family: turning tiers)", () => {
  it("circular_runout 0.005 → PRECISION_TURN", () => {
    const tight = prismEnhancedGdtEngine.parseEnhanced("CR 0.005 A");
    expect(tight.metadata?.category).toBe("runout");
    expect(tight.cam_recommendations[0]!.strategy).toBe("PRECISION_TURN");
    expect(tight.cam_recommendations[0]!.operation).toBe("turning/boring");
    expect(tight.cam_recommendations[0]!.requirement).toBe(
      "Single setup, minimal tool pressure"
    );
  });

  it("circular_runout 0.05 → STANDARD_TURN", () => {
    const loose = prismEnhancedGdtEngine.parseEnhanced("CR 0.05 A");
    expect(loose.cam_recommendations[0]!.strategy).toBe("STANDARD_TURN");
  });

  it("roundness 0.008 → PRECISION_TURN, operation turning/boring", () => {
    const round = prismEnhancedGdtEngine.parseEnhanced("ROUND 0.008");
    expect(round.cam_recommendations[0]!.operation).toBe("turning/boring");
    expect(round.cam_recommendations[0]!.strategy).toBe("PRECISION_TURN");
    expect(round.cam_recommendations[0]!.symbol).toBe("roundness");
  });

  it("cylindricity 0.02 → STANDARD_TURN, operation turning/boring", () => {
    const cyl = prismEnhancedGdtEngine.parseEnhanced("CYL 0.02");
    expect(cyl.cam_recommendations[0]!.operation).toBe("turning/boring");
    expect(cyl.cam_recommendations[0]!.strategy).toBe("STANDARD_TURN");
    expect(cyl.cam_recommendations[0]!.symbol).toBe("cylindricity");
  });

  it("concentricity 0.005 → PRECISION_TURN (deprecated symbol still routed for legacy)", () => {
    const conc = prismEnhancedGdtEngine.parseEnhanced("CONC 0.005 A");
    expect(conc.cam_recommendations[0]!.operation).toBe("turning/boring");
    expect(conc.cam_recommendations[0]!.strategy).toBe("PRECISION_TURN");
    expect(conc.cam_recommendations[0]!.symbol).toBe("concentricity");
  });
});

describe("PrismEnhancedGDTEngine — CAM interpretation (orientation/profile families: REVIEW)", () => {
  it("perpendicularity 0.02 → REVIEW (process-planning)", () => {
    const r = prismEnhancedGdtEngine.parseEnhanced("⟂ 0.02 A");
    const rec = r.cam_recommendations[0]!;
    expect(rec.strategy).toBe("REVIEW");
    expect(rec.operation).toBe("process-planning");
    expect(rec.symbol).toBe("perpendicularity");
    expect(rec.requirement).toBe(
      "perpendicularity requires explicit toolpath + fixturing review (no automated mapping)"
    );
  });

  it("parallelism 0.03 → REVIEW", () => {
    const r = prismEnhancedGdtEngine.parseEnhanced("PAR 0.03 A");
    expect(r.cam_recommendations[0]!.strategy).toBe("REVIEW");
    expect(r.cam_recommendations[0]!.symbol).toBe("parallelism");
  });

  it("angularity 0.02 → REVIEW", () => {
    const r = prismEnhancedGdtEngine.parseEnhanced("ANG 0.02 A");
    expect(r.cam_recommendations[0]!.strategy).toBe("REVIEW");
    expect(r.cam_recommendations[0]!.symbol).toBe("angularity");
  });

  it("straightness 0.01 → REVIEW (form symbol but no CAM-tier mapping)", () => {
    const r = prismEnhancedGdtEngine.parseEnhanced("STR 0.01");
    expect(r.cam_recommendations[0]!.strategy).toBe("REVIEW");
    expect(r.cam_recommendations[0]!.symbol).toBe("straightness");
  });

  it("symmetry 0.02 → REVIEW (deprecated symbol, no auto mapping)", () => {
    const r = prismEnhancedGdtEngine.parseEnhanced("SYM 0.02 A");
    expect(r.cam_recommendations[0]!.strategy).toBe("REVIEW");
    expect(r.cam_recommendations[0]!.symbol).toBe("symmetry");
  });

  it("profile_of_line 0.03 → REVIEW", () => {
    const r = prismEnhancedGdtEngine.parseEnhanced("PL 0.03 A");
    expect(r.cam_recommendations[0]!.strategy).toBe("REVIEW");
    expect(r.cam_recommendations[0]!.symbol).toBe("profile_of_line");
  });

  it("profile_of_surface 0.05 → REVIEW", () => {
    const r = prismEnhancedGdtEngine.parseEnhanced("PROF 0.05 A B");
    expect(r.cam_recommendations[0]!.strategy).toBe("REVIEW");
    expect(r.cam_recommendations[0]!.symbol).toBe("profile_of_surface");
  });
});

describe("PrismEnhancedGDTEngine — hard parse failure gate (P0-2 verification)", () => {
  it("hasParseFailure TRUE for 'Unrecognized GD&T symbol' error", () => {
    const fcf = gdtCalloutParserEngine.parse("XYZ 0.1 A");
    expect(prismEnhancedGdtEngine.hasParseFailure(fcf)).toBe(true);
  });

  it("hasParseFailure TRUE for empty callout", () => {
    const fcf = gdtCalloutParserEngine.parse("");
    expect(fcf.errors).toEqual(["empty callout"]);
    expect(prismEnhancedGdtEngine.hasParseFailure(fcf)).toBe(true);
  });

  it("hasParseFailure FALSE for form-with-datum validation error", () => {
    const fcf = gdtCalloutParserEngine.parse("FLAT 0.01 A");
    expect(fcf.symbol).toBe("flatness");
    expect(fcf.tolerance_mm).toBeCloseTo(0.01, 10);
    expect(prismEnhancedGdtEngine.hasParseFailure(fcf)).toBe(false);
  });

  it("hasParseFailure FALSE for invalid-Ø-prefix validation error", () => {
    const fcf = gdtCalloutParserEngine.parse("FLAT Ø0.01");
    expect(fcf.symbol).toBe("flatness");
    expect(fcf.tolerance_mm).toBeCloseTo(0.01, 10);
    expect(prismEnhancedGdtEngine.hasParseFailure(fcf)).toBe(false);
  });

  it("hasParseFailure FALSE for position-no-datum validation error", () => {
    const fcf = gdtCalloutParserEngine.parse("POS 0.02");
    expect(fcf.symbol).toBe("position");
    expect(fcf.tolerance_mm).toBeCloseTo(0.02, 10);
    expect(prismEnhancedGdtEngine.hasParseFailure(fcf)).toBe(false);
  });

  it("'Unrecognized datum or modifier' (not 'symbol') does NOT match the anchored hard-failure pattern", () => {
    const fcf = gdtCalloutParserEngine.parse("POS 0.02 A @@@");
    expect(fcf.symbol).toBe("position");
    expect(prismEnhancedGdtEngine.hasParseFailure(fcf)).toBe(false);
  });

  it("parseEnhanced on hard failure: parse_failed=true, metadata=null, recommendations empty", () => {
    const r = prismEnhancedGdtEngine.parseEnhanced("XYZ 0.1 A");
    expect(r.parse_failed).toBe(true);
    expect(r.metadata).toBe(null);
    expect(r.cam_recommendations).toEqual([]);
  });

  it("parseEnhanced on validation error: parse_failed=false, metadata populated, GRINDING recommendation", () => {
    const r = prismEnhancedGdtEngine.parseEnhanced("FLAT 0.01 A");
    expect(r.parse_failed).toBe(false);
    expect(r.metadata?.symbol).toBe("flatness");
    expect(r.metadata?.category).toBe("form");
    expect(r.cam_recommendations).toHaveLength(1);
    expect(r.cam_recommendations[0]!.strategy).toBe("GRINDING");
  });

  it("interpretForCAM on hard-parse-failed input emits PARSE_FAILED recommendation (audit trail)", () => {
    const recs = prismEnhancedGdtEngine.interpretForCAM("XYZ 0.1 A");
    expect(recs).toHaveLength(1);
    expect(recs[0]!.strategy).toBe("PARSE_FAILED");
    expect(recs[0]!.operation).toBe("process-planning");
    expect(recs[0]!.requirement.startsWith("Callout could not be parsed:")).toBe(true);
  });
});

describe("PrismEnhancedGDTEngine — default switch branch (P0-1 verification)", () => {
  it("REVIEW fallback fires when an unhandled symbol is forged via type cast", () => {
    const fcf: FCF = {
      symbol: "unknown_future_symbol" as GDTSymbol,
      tolerance_mm: 0.05,
      diameter: false,
      material_modifier: "RFS",
      datums: [{ label: "A" }],
      errors: [],
    };
    const recs = prismEnhancedGdtEngine.interpretForCAM(fcf);
    expect(recs).toHaveLength(1);
    expect(recs[0]!.strategy).toBe("REVIEW");
    expect(recs[0]!.requirement).toBe(
      "No CAM mapping for symbol unknown_future_symbol — operator review required"
    );
    expect(recs[0]!.symbol).toBe("unknown_future_symbol" as GDTSymbol);
    expect(recs[0]!.tolerance_mm).toBe(0.05);
    expect(recs[0]!.operation).toBe("process-planning");
  });
});

describe("PrismEnhancedGDTEngine — bonus tolerance (errors-in-result, P1-2 verification)", () => {
  it("MMC happy path: actual=10.05, mmc=10.0, base=0.1 → bonus=0.05, effective=0.15", () => {
    const r = prismEnhancedGdtEngine.calculateBonusTolerance({
      condition: "MMC",
      mmc_size: 10.0,
      actual_size: 10.05,
      base_tolerance: 0.1,
    });
    expect(r.bonus).toBeCloseTo(0.05, 10);
    expect(r.effective_tolerance).toBeCloseTo(0.15, 10);
    expect(r.error).toBe(undefined);
  });

  it("LMC happy path: actual=10.4, lmc=10.5, base=0.1 → bonus=0.1, effective=0.2", () => {
    const r = prismEnhancedGdtEngine.calculateBonusTolerance({
      condition: "LMC",
      lmc_size: 10.5,
      actual_size: 10.4,
      base_tolerance: 0.1,
    });
    expect(r.bonus).toBeCloseTo(0.1, 10);
    expect(r.effective_tolerance).toBeCloseTo(0.2, 10);
    expect(r.error).toBe(undefined);
  });

  it("RFS path: bonus=0, effective=base, no error field set", () => {
    const r = prismEnhancedGdtEngine.calculateBonusTolerance({
      condition: "RFS",
      actual_size: 10.0,
      base_tolerance: 0.1,
    });
    expect(r.bonus).toBe(0);
    expect(r.effective_tolerance).toBe(0.1);
    expect(r.error).toBe(undefined);
  });

  it("MMC missing mmc_size returns specific error string (no throw)", () => {
    const r = prismEnhancedGdtEngine.calculateBonusTolerance({
      condition: "MMC",
      actual_size: 10.0,
      base_tolerance: 0.1,
    });
    expect(r.bonus).toBe(0);
    expect(r.effective_tolerance).toBe(0.1);
    expect(r.error).toBe('calculateBonusTolerance: condition "MMC" requires mmc_size');
  });

  it("LMC missing lmc_size returns specific error string (no throw)", () => {
    const r = prismEnhancedGdtEngine.calculateBonusTolerance({
      condition: "LMC",
      actual_size: 10.0,
      base_tolerance: 0.1,
    });
    expect(r.bonus).toBe(0);
    expect(r.effective_tolerance).toBe(0.1);
    expect(r.error).toBe('calculateBonusTolerance: condition "LMC" requires lmc_size');
  });
});

describe("PrismEnhancedGDTEngine — position deviation formula", () => {
  it("3-4-5 triangle: dx=0.03, dy=0.04 → 2*sqrt(0.0025) = 0.1", () => {
    expect(prismEnhancedGdtEngine.calculatePositionDeviation(0.03, 0.04)).toBeCloseTo(0.1, 10);
  });

  it("3D Pythagorean: dx=dy=dz=0.01 → 2*sqrt(0.0003)", () => {
    const r = prismEnhancedGdtEngine.calculatePositionDeviation(0.01, 0.01, 0.01);
    expect(r).toBeCloseTo(2 * Math.sqrt(0.0003), 12);
    expect(r).toBeCloseTo(0.034641, 5);
  });

  it("degenerate (0,0,0) → 0", () => {
    expect(prismEnhancedGdtEngine.calculatePositionDeviation(0, 0, 0)).toBe(0);
  });

  it("dz defaults to 0 — 2D and 3D-with-dz=0 yield identical results", () => {
    const a = prismEnhancedGdtEngine.calculatePositionDeviation(0.03, 0.04);
    const b = prismEnhancedGdtEngine.calculatePositionDeviation(0.03, 0.04, 0);
    expect(a).toBe(b);
    expect(a).toBeCloseTo(0.1, 10);
  });

  it("pure-x radial offset 0.05 → 2*0.05 = 0.10 (diametral zone conversion)", () => {
    expect(prismEnhancedGdtEngine.calculatePositionDeviation(0.05, 0)).toBeCloseTo(0.1, 10);
  });
});

describe("PrismEnhancedGDTEngine — stats + end-to-end composition", () => {
  it("getStats reports exact contract: 14 symbols, 9 modifiers, 4 parser-recognized, 10 CAM strategies", () => {
    const s = prismEnhancedGdtEngine.getStats();
    expect(s.symbols_supported).toBe(14);
    expect(s.modifiers_supported).toBe(9);
    expect(s.modifiers_parser_recognized).toBe(4);
    expect(s.cam_strategies).toEqual([
      "PRECISION_BORE", "REAM", "DRILL",
      "GRINDING", "PRECISION_FACE", "STANDARD_FACE",
      "PRECISION_TURN", "STANDARD_TURN",
      "REVIEW", "PARSE_FAILED",
    ]);
    expect(s.reference).toBe("ASME Y14.5-2018, ISO 1101:2017");
  });

  it("end-to-end composition: unicode position callout flows parse → metadata → recommendation", () => {
    const r = prismEnhancedGdtEngine.parseEnhanced("⌖ Ø0.025 A B C");
    expect(r.fcf.symbol).toBe("position");
    expect(r.fcf.tolerance_mm).toBeCloseTo(0.025, 10);
    expect(r.fcf.diameter).toBe(true);
    expect(r.fcf.datums.map((d) => d.label)).toEqual(["A", "B", "C"]);
    expect(r.fcf.errors).toEqual([]);
    expect(r.metadata?.symbol).toBe("position");
    expect(r.metadata?.category).toBe("location");
    expect(r.metadata?.requires_datum).toBe(true);
    expect(r.metadata?.glyph).toBe("⌖");
    expect(r.cam_recommendations).toHaveLength(1);
    expect(r.cam_recommendations[0]!.strategy).toBe("PRECISION_BORE");
    expect(r.cam_recommendations[0]!.symbol).toBe("position");
    expect(r.cam_recommendations[0]!.tolerance_mm).toBeCloseTo(0.025, 10);
    expect(r.parse_failed).toBe(false);
  });

  it("end-to-end composition: pipe-delimited FCF '|⌖|⌀0.08|A|B|C|' → REAM tier", () => {
    const r = prismEnhancedGdtEngine.parseEnhanced("|⌖|⌀0.08|A|B|C|");
    expect(r.fcf.symbol).toBe("position");
    expect(r.fcf.tolerance_mm).toBeCloseTo(0.08, 10);
    expect(r.fcf.diameter).toBe(true);
    expect(r.cam_recommendations[0]!.strategy).toBe("REAM");
    expect(r.parse_failed).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Reviewer-B P1-B follow-ups (in-commit close-out per [[feedback_always_close_out]])
// ─────────────────────────────────────────────────────────────────────────────

describe("PrismEnhancedGDTEngine — interpretForCAM string/FCF path equivalence (P1-B1)", () => {
  it("interpretForCAM(string) and interpretForCAM(FCF) return identical results for the same callout", () => {
    const callout = "POS Ø0.025 A B C";
    const fromString = prismEnhancedGdtEngine.interpretForCAM(callout);
    const fromFCF = prismEnhancedGdtEngine.interpretForCAM(gdtCalloutParserEngine.parse(callout));
    expect(fromFCF).toEqual(fromString);
  });

  it("interpretForCAM(FCF) for a deprecated symbol routes turning/boring (no string re-parse)", () => {
    const fcf: FCF = {
      symbol: "concentricity",
      tolerance_mm: 0.005,
      diameter: false,
      material_modifier: "RFS",
      datums: [{ label: "A" }],
      errors: [],
    };
    const recs = prismEnhancedGdtEngine.interpretForCAM(fcf);
    expect(recs).toHaveLength(1);
    expect(recs[0]!.strategy).toBe("PRECISION_TURN");
    expect(recs[0]!.operation).toBe("turning/boring");
    expect(recs[0]!.symbol).toBe("concentricity");
  });
});

describe("PrismEnhancedGDTEngine — bonus tolerance pathological inputs (P1-B2 pinning)", () => {
  // These document current behavior. The engine does not guard against
  // negative or zero base_tolerance (P2 hardening target — file in handoff).
  it("negative base_tolerance flows through (no implicit guard) — bonus still computed", () => {
    const r = prismEnhancedGdtEngine.calculateBonusTolerance({
      condition: "MMC",
      mmc_size: 10.0,
      actual_size: 10.05,
      base_tolerance: -0.1,
    });
    expect(r.bonus).toBeCloseTo(0.05, 10);
    expect(r.effective_tolerance).toBeCloseTo(-0.05, 10);
    expect(r.error).toBe(undefined);
  });

  it("zero base_tolerance with MMC departure produces effective = bonus alone", () => {
    const r = prismEnhancedGdtEngine.calculateBonusTolerance({
      condition: "RFS",
      actual_size: 10.0,
      base_tolerance: 0,
    });
    expect(r.bonus).toBe(0);
    expect(r.effective_tolerance).toBe(0);
    expect(r.error).toBe(undefined);
  });
});

describe("PrismEnhancedGDTEngine — position deviation pathological inputs (P1-B3, P1-B4)", () => {
  it("NaN input propagates (no implicit clamp) — caller must validate sensor reads upstream", () => {
    expect(Number.isNaN(prismEnhancedGdtEngine.calculatePositionDeviation(NaN, 0.04))).toBe(true);
  });

  it("Infinity input propagates as Infinity", () => {
    expect(prismEnhancedGdtEngine.calculatePositionDeviation(Infinity, 0)).toBe(Infinity);
  });

  it("negative dx/dy/dz yield same result as positive (sign-invariant by squaring)", () => {
    const pos = prismEnhancedGdtEngine.calculatePositionDeviation(0.03, 0.04, 0.02);
    const neg = prismEnhancedGdtEngine.calculatePositionDeviation(-0.03, -0.04, -0.02);
    expect(neg).toBeCloseTo(pos, 12);
  });
});

describe("PrismEnhancedGDTEngine — callout edge cases (P1-B5, P1-B6)", () => {
  it("whitespace-only callout lands in same code path as empty callout (hard parse failure)", () => {
    const fcf = gdtCalloutParserEngine.parse("   ");
    expect(fcf.errors).toEqual(["empty callout"]);
    expect(prismEnhancedGdtEngine.hasParseFailure(fcf)).toBe(true);
  });

  it("hard parse failure wins over validation error (precedence test — 'XYZ Ø0.01 A')", () => {
    // Callout has both an unrecognized symbol (hard failure) AND would have been
    // a form-with-datum + invalid-Ø validation error if symbol had parsed.
    // hasParseFailure must return true (hard wins).
    const fcf = gdtCalloutParserEngine.parse("XYZ Ø0.01 A");
    expect(prismEnhancedGdtEngine.hasParseFailure(fcf)).toBe(true);
    const r = prismEnhancedGdtEngine.parseEnhanced("XYZ Ø0.01 A");
    expect(r.parse_failed).toBe(true);
    expect(r.metadata).toBe(null);
    expect(r.cam_recommendations).toEqual([]);
  });
});
