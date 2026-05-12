import { describe, it, expect } from "vitest";
import { prismGdtFcfParserEngine } from "../engines/PrismGDTFCFParserEngine.js";
import { gdtCalloutParserEngine, type FCF, type GDTSymbol } from "../engines/GDTCalloutParserEngine.js";

describe("PrismGDTFCFParserEngine — parseComposite (2-tier with structured output)", () => {
  it("parses a valid 2-tier position composite (refinement tighter than primary)", () => {
    const r = prismGdtFcfParserEngine.parseComposite("|⌖|⌀0.5|A|B|C|\n|⌖|⌀0.1|A|");
    expect(r.primary?.symbol).toBe("position");
    expect(r.primary?.tolerance_mm).toBeCloseTo(0.5, 10);
    expect(r.primary?.diameter).toBe(true);
    expect(r.primary?.datums.map((d) => d.label)).toEqual(["A", "B", "C"]);
    expect(r.refinement?.symbol).toBe("position");
    expect(r.refinement?.tolerance_mm).toBeCloseTo(0.1, 10);
    expect(r.refinement?.datums.map((d) => d.label)).toEqual(["A"]);
    expect(r.errors).toEqual([]);
  });

  it("accepts explicit {primary, refinement} object form", () => {
    const r = prismGdtFcfParserEngine.parseComposite({
      primary: "|⌖|⌀0.5|A|B|C|",
      refinement: "|⌖|⌀0.1|A|",
    });
    expect(r.primary?.symbol).toBe("position");
    expect(r.refinement?.tolerance_mm).toBeCloseTo(0.1, 10);
    expect(r.errors).toEqual([]);
  });

  it("flags COMPOSITE_REFINEMENT_LOOSER when refinement tolerance > primary tolerance", () => {
    const r = prismGdtFcfParserEngine.parseComposite("|⌖|⌀0.1|A|\n|⌖|⌀0.5|A|");
    expect(r.errors.some((e) => e.startsWith("COMPOSITE_REFINEMENT_LOOSER"))).toBe(true);
    expect(r.primary?.tolerance_mm).toBeCloseTo(0.1, 10);
    expect(r.refinement?.tolerance_mm).toBeCloseTo(0.5, 10);
  });

  it("flags COMPOSITE_SYMBOL_MISMATCH when refinement symbol differs from primary", () => {
    const r = prismGdtFcfParserEngine.parseComposite("|⌖|⌀0.5|A|B|C|\n|⏥|0.1|");
    expect(r.errors.some((e) => e.startsWith("COMPOSITE_SYMBOL_MISMATCH"))).toBe(true);
    expect(r.primary?.symbol).toBe("position");
    expect(r.refinement?.symbol).toBe("flatness");
  });

  it("primary-only callout (no newline) leaves refinement null with no errors", () => {
    const r = prismGdtFcfParserEngine.parseComposite("|⏥|0.05|");
    expect(r.primary?.symbol).toBe("flatness");
    expect(r.primary?.tolerance_mm).toBeCloseTo(0.05, 10);
    expect(r.refinement).toBe(null);
    expect(r.errors).toEqual([]);
  });

  it("hard parse failure on primary suppresses §10 composite-validity checks (no spurious mismatch)", () => {
    // Primary fails parse → refinement is fine. The symbol-mismatch / refinement-looser
    // checks must NOT fire against the placeholder flatness symbol of the failed primary.
    const r = prismGdtFcfParserEngine.parseComposite("XYZ 0.5 A B C\n|⌖|⌀0.1|A|");
    expect(r.errors.some((e) => /Unrecognized GD&T symbol/i.test(e))).toBe(true);
    expect(r.errors.some((e) => e.startsWith("COMPOSITE_SYMBOL_MISMATCH"))).toBe(false);
    expect(r.errors.some((e) => e.startsWith("COMPOSITE_REFINEMENT_LOOSER"))).toBe(false);
  });
});

describe("PrismGDTFCFParserEngine — parseMultiTier (N-tier PLTZF + FRTZFs)", () => {
  it("parses 3-tier composite (1 PLTZF + 2 FRTZFs, monotonically tightening)", () => {
    const r = prismGdtFcfParserEngine.parseMultiTier([
      "|⌖|⌀0.5|A|B|C|",
      "|⌖|⌀0.2|A|B|",
      "|⌖|⌀0.05|A|",
    ]);
    expect(r.tiers).toHaveLength(3);
    expect(r.tiers[0]!.tolerance_mm).toBeCloseTo(0.5, 10);
    expect(r.tiers[1]!.tolerance_mm).toBeCloseTo(0.2, 10);
    expect(r.tiers[2]!.tolerance_mm).toBeCloseTo(0.05, 10);
    expect(r.errors).toEqual([]);
  });

  it("rejects empty input with MULTI_TIER_EMPTY", () => {
    const r = prismGdtFcfParserEngine.parseMultiTier([]);
    expect(r.tiers).toEqual([]);
    expect(r.errors).toEqual(["MULTI_TIER_EMPTY: no callouts supplied"]);
  });

  it("rejects 5-tier stack with MULTI_TIER_TOO_DEEP (max 4)", () => {
    const r = prismGdtFcfParserEngine.parseMultiTier([
      "|⌖|⌀0.5|A|", "|⌖|⌀0.4|A|", "|⌖|⌀0.3|A|", "|⌖|⌀0.2|A|", "|⌖|⌀0.1|A|",
    ]);
    expect(r.tiers).toEqual([]);
    expect(r.errors[0]).toBe("MULTI_TIER_TOO_DEEP: got 5 tiers, max 4");
  });

  it("flags TIER_N_LOOSER_THAN_PRECEDING on monotonic-tightening violation", () => {
    const r = prismGdtFcfParserEngine.parseMultiTier([
      "|⌖|⌀0.5|A|B|C|",
      "|⌖|⌀0.1|A|B|",
      "|⌖|⌀0.3|A|", // looser than tier 1 — violation
    ]);
    expect(r.errors.some((e) => e.startsWith("TIER_2_LOOSER_THAN_PRECEDING"))).toBe(true);
  });

  it("flags TIER_N_SYMBOL_MISMATCH when a tier's symbol differs from primary", () => {
    const r = prismGdtFcfParserEngine.parseMultiTier([
      "|⌖|⌀0.5|A|B|C|",
      "|⏥|0.2|", // flatness — mismatch with primary's position
    ]);
    expect(r.errors.some((e) => e.startsWith("TIER_1_SYMBOL_MISMATCH"))).toBe(true);
  });
});

describe("PrismGDTFCFParserEngine — serialize (round-trip with warnings)", () => {
  it("serializes a valid position FCF with datums + FCF-level MMC; output round-trips", () => {
    const fcf = gdtCalloutParserEngine.parse("|⌖|⌀0.025(M)|A|B(M)|C|");
    const out = prismGdtFcfParserEngine.serialize(fcf);
    expect(out.callout).toBe("|⌖|⌀0.025(M)|A|B(M)|C|");
    expect(out.warnings).toEqual([]);

    // Round-trip equivalence
    const reparsed = gdtCalloutParserEngine.parse(out.callout);
    expect(reparsed.symbol).toBe(fcf.symbol);
    expect(reparsed.tolerance_mm).toBeCloseTo(fcf.tolerance_mm, 10);
    expect(reparsed.diameter).toBe(fcf.diameter);
    expect(reparsed.material_modifier).toBe(fcf.material_modifier);
    expect(reparsed.datums).toEqual(fcf.datums);
  });

  it("serializes flatness (form, no datums, no diameter) cleanly", () => {
    const fcf = gdtCalloutParserEngine.parse("|⏥|0.05|");
    const out = prismGdtFcfParserEngine.serialize(fcf);
    expect(out.callout).toBe("|⏥|0.05|");
    expect(out.warnings).toEqual([]);
    expect(gdtCalloutParserEngine.parse(out.callout).symbol).toBe("flatness");
  });

  it("serializes circular_runout preserving the diameter prefix", () => {
    const fcf = gdtCalloutParserEngine.parse("|↗|⌀0.02|A|B|");
    const out = prismGdtFcfParserEngine.serialize(fcf);
    expect(out.callout).toBe("|↗|⌀0.02|A|B|");
    expect(out.warnings).toEqual([]);
  });

  it("warns SERIALIZE_INVALID_MODIFIER_ON_FORM when synthesized FCF has MMC on flatness", () => {
    const synthetic: FCF = {
      symbol: "flatness",
      tolerance_mm: 0.05,
      diameter: false,
      material_modifier: "M",
      datums: [],
      errors: [],
    };
    const out = prismGdtFcfParserEngine.serialize(synthetic);
    expect(out.callout).toBe("|⏥|0.05(M)|");
    expect(out.warnings).toHaveLength(1);
    expect(out.warnings[0]!.startsWith("SERIALIZE_INVALID_MODIFIER_ON_FORM")).toBe(true);
    expect(out.warnings[0]).toContain("flatness");
  });

  it("warns SERIALIZE_INVALID_MODIFIER_ON_FORM when synthesized FCF has MMC on straightness", () => {
    // straightness IS in FORM_SYMBOLS_REJECTING_MODIFIER (base parser rejects it).
    // Y14.5 actually permits MMC on axial straightness of a FOS, but that nuance
    // is FCFSyntaxValidatorEngine's job — the serializer mirrors the BASE PARSER.
    const synthetic: FCF = {
      symbol: "straightness",
      tolerance_mm: 0.01,
      diameter: false,
      material_modifier: "M",
      datums: [],
      errors: [],
    };
    const out = prismGdtFcfParserEngine.serialize(synthetic);
    expect(out.warnings.some((w) => w.startsWith("SERIALIZE_INVALID_MODIFIER_ON_FORM"))).toBe(true);
  });

  it("does NOT warn when synthesized FCF has MMC on roundness (base parser accepts silently)", () => {
    // roundness is NOT in FORM_SYMBOLS_REJECTING_MODIFIER — the base parser
    // accepts MMC on roundness silently. FCFSyntaxValidatorEngine catches the
    // Y14.5 violation separately. Serializer must NOT warn.
    const synthetic: FCF = {
      symbol: "roundness",
      tolerance_mm: 0.01,
      diameter: false,
      material_modifier: "M",
      datums: [],
      errors: [],
    };
    const out = prismGdtFcfParserEngine.serialize(synthetic);
    expect(out.warnings).toEqual([]);
  });

  it("warns SERIALIZE_INVALID_TOLERANCE when tolerance is non-finite (NaN sentinel emitted)", () => {
    const synthetic: FCF = {
      symbol: "position",
      tolerance_mm: NaN,
      diameter: true,
      material_modifier: "RFS",
      datums: [{ label: "A" }],
      errors: [],
    };
    const out = prismGdtFcfParserEngine.serialize(synthetic);
    expect(out.callout).toBe("|⌖|⌀NaN|A|");
    expect(out.warnings.some((w) => w.startsWith("SERIALIZE_INVALID_TOLERANCE"))).toBe(true);
  });

  it("warns SERIALIZE_UNKNOWN_SYMBOL when fcf.symbol is a type-asserted unknown value", () => {
    const synthetic: FCF = {
      symbol: "unknown_future_symbol" as GDTSymbol,
      tolerance_mm: 0.05,
      diameter: false,
      material_modifier: "RFS",
      datums: [{ label: "A" }],
      errors: [],
    };
    const out = prismGdtFcfParserEngine.serialize(synthetic);
    expect(out.callout).toBe("|[?unknown_future_symbol]|0.05|A|");
    expect(out.warnings.some((w) => w.startsWith("SERIALIZE_UNKNOWN_SYMBOL"))).toBe(true);
  });

  it("warnings accumulate independently (NaN tolerance + flatness MMC → 2 warnings)", () => {
    const synthetic: FCF = {
      symbol: "flatness",
      tolerance_mm: NaN,
      diameter: false,
      material_modifier: "L",
      datums: [],
      errors: [],
    };
    const out = prismGdtFcfParserEngine.serialize(synthetic);
    expect(out.warnings).toHaveLength(2);
    expect(out.warnings.some((w) => w.startsWith("SERIALIZE_INVALID_TOLERANCE"))).toBe(true);
    expect(out.warnings.some((w) => w.startsWith("SERIALIZE_INVALID_MODIFIER_ON_FORM"))).toBe(true);
  });

  it("emits datum modifiers in canonical parens form", () => {
    const fcf = gdtCalloutParserEngine.parse("|⌖|⌀0.02|A|B(M)|C(L)|");
    const out = prismGdtFcfParserEngine.serialize(fcf);
    expect(out.callout).toBe("|⌖|⌀0.02|A|B(M)|C(L)|");
    expect(out.warnings).toEqual([]);
  });
});

describe("PrismGDTFCFParserEngine — serializeComposite", () => {
  it("round-trips a 2-tier composite through parseComposite", () => {
    const result = prismGdtFcfParserEngine.parseComposite("|⌖|⌀0.5|A|B|C|\n|⌖|⌀0.1|A|");
    const out = prismGdtFcfParserEngine.serializeComposite(result);
    expect(out.warnings).toEqual([]);

    const reparsed = prismGdtFcfParserEngine.parseComposite(out.callout);
    expect(reparsed.primary?.symbol).toBe(result.primary?.symbol);
    expect(reparsed.primary?.tolerance_mm).toBeCloseTo(result.primary!.tolerance_mm, 10);
    expect(reparsed.refinement?.tolerance_mm).toBeCloseTo(result.refinement!.tolerance_mm, 10);
    expect(reparsed.errors).toEqual([]);
  });

  it("primary-only composite serializes without trailing newline", () => {
    const result = prismGdtFcfParserEngine.parseComposite("|⏥|0.05|");
    const out = prismGdtFcfParserEngine.serializeComposite(result);
    expect(out.callout).toBe("|⏥|0.05|");
    expect(out.callout.includes("\n")).toBe(false);
    expect(out.warnings).toEqual([]);
  });

  it("null-primary + real refinement emits empty primary line + refinement (lossless, with warning)", () => {
    // Synthesize the degenerate state directly — bypasses normal parseComposite flow.
    const result = {
      primary: null,
      refinement: gdtCalloutParserEngine.parse("|⌖|⌀0.05|A|"),
      errors: [],
    };
    const out = prismGdtFcfParserEngine.serializeComposite(result);
    expect(out.callout).toBe("\n|⌖|⌀0.05|A|");
    expect(out.warnings.some((w) => w.startsWith("SERIALIZE_COMPOSITE_NULL_PRIMARY"))).toBe(true);
  });

  it("both-null composite emits empty string with no warnings", () => {
    const result = { primary: null, refinement: null, errors: [] };
    const out = prismGdtFcfParserEngine.serializeComposite(result);
    expect(out.callout).toBe("");
    expect(out.warnings).toEqual([]);
  });

  it("aggregates refinement warnings with REFINEMENT_ prefix", () => {
    const result = prismGdtFcfParserEngine.parseComposite("|⌖|⌀0.5|A|B|C|\n|⌖|⌀0.1|A|");
    // Force a refinement warning by mutating to NaN tolerance.
    result.refinement!.tolerance_mm = NaN;
    const out = prismGdtFcfParserEngine.serializeComposite(result);
    expect(out.warnings.some((w) => w.startsWith("REFINEMENT_SERIALIZE_INVALID_TOLERANCE"))).toBe(true);
  });
});

describe("PrismGDTFCFParserEngine — roundTrip convenience", () => {
  it("canonicalizes mixed-form input (whitespace + ASCII shorthand) to pipe-canonical Unicode", () => {
    const r = prismGdtFcfParserEngine.roundTrip("POS Ø0.025 A B C");
    expect(r.callout).toBe("|⌖|⌀0.025|A|B|C|");
    expect(r.source.symbol).toBe("position");
    expect(r.source.tolerance_mm).toBeCloseTo(0.025, 10);
    expect(r.warnings).toEqual([]);
  });

  it("threads serialize warnings through to roundTrip output", () => {
    // The input "XYZ 0.1 A" has an unrecognized symbol — parse() returns a
    // placeholder flatness FCF with errors. The serializer then emits flatness
    // glyph for the placeholder (no SERIALIZE_UNKNOWN_SYMBOL warning, because
    // the placeholder IS a valid GDTSymbol in the type system).
    const r = prismGdtFcfParserEngine.roundTrip("XYZ 0.1 A");
    expect(r.source.errors.some((e) => /Unrecognized GD&T symbol/i.test(e))).toBe(true);
    // Serializer is faithful to the parsed FCF — output is the placeholder.
    expect(r.callout.startsWith("|⏥|")).toBe(true);
  });

  it("preserves diameter prefix through roundTrip", () => {
    const r = prismGdtFcfParserEngine.roundTrip("CR Ø0.02 A");
    expect(r.callout).toBe("|↗|⌀0.02|A|");
    expect(r.source.diameter).toBe(true);
  });
});

describe("PrismGDTFCFParserEngine — getStats", () => {
  it("reports max_composite_tiers=4 + 5 capabilities + Y14.5 §10 reference", () => {
    const s = prismGdtFcfParserEngine.getStats();
    expect(s.max_composite_tiers).toBe(4);
    expect(s.capabilities).toHaveLength(5);
    expect(s.capabilities[0]).toMatch(/parseComposite/);
    expect(s.capabilities[1]).toMatch(/parseMultiTier/);
    expect(s.capabilities[2]).toMatch(/serialize/);
    expect(s.capabilities[3]).toMatch(/serializeComposite/);
    expect(s.capabilities[4]).toMatch(/roundTrip/);
    expect(s.reference).toBe("ASME Y14.5-2018 §10, ISO 1101:2017");
  });
});
