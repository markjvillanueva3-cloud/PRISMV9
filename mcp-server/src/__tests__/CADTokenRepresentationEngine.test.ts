/**
 * CADTokenRepresentationEngine tests — U-DAGI01
 *
 * Exit gate:
 *  - 25+ unit tests covering all 7 CAD formats
 *  - Round-trip: CAD operations → tokens → operations preserves op identity
 *  - Vocabulary size >= 250; special tokens present
 *  - Coverage > 95% on a synthetic JM-Die-like corpus
 */
import { describe, it, expect } from "vitest";
import {
  cadTokenRepresentationEngine,
  CADTokenRepresentationEngine,
  type CADOperation,
  type CADFormat,
} from "../engines/CADTokenRepresentationEngine.js";

const engine = cadTokenRepresentationEngine;

// ── 1. Vocabulary basics ───────────────────────────────────────────

describe("CADTokenRepresentationEngine — vocabulary", () => {
  it("loads vocabulary with >= 250 tokens", () => {
    expect(engine.vocabularySize()).toBeGreaterThanOrEqual(250);
  });

  it("exposes all 6 required special tokens", () => {
    for (const name of ["<PAD>", "<START>", "<END>", "<UNK>", "<SEP>", "<MASK>"]) {
      expect(engine.getTokenDef(name)).not.toBeNull();
    }
  });

  it("id/name round-trip is bijective for all vocabulary entries", () => {
    for (const name of engine.listTokenNames()) {
      const id = engine.getTokenId(name);
      expect(engine.getTokenName(id)).toBe(name);
    }
  });

  it("unknown token name returns <UNK> id", () => {
    const unkId = engine.getTokenId("<UNK>");
    expect(engine.getTokenId("THIS_TOKEN_DOES_NOT_EXIST")).toBe(unkId);
  });

  it("lists 7 supported CAD formats", () => {
    expect(engine.supportedFormats()).toEqual([
      "cadquery",
      "freecad",
      "fusion360",
      "mastercam",
      "inventor",
      "hypermill",
      "solidcam",
    ]);
  });

  it("healthCheck reports healthy", async () => {
    const h = await engine.healthCheck();
    expect(h.healthy).toBe(true);
  });
});

// ── 2. Tokenization core ───────────────────────────────────────────

describe("CADTokenRepresentationEngine — tokenization core", () => {
  const program: CADOperation[] = [
    { op: "SKETCH_CREATE", attrs: { plane: "XY" } },
    { op: "SKETCH_CIRCLE", params: [0, 0, 25.4], attrs: { unit: "mm" } },
    { op: "FEAT_EXTRUDE_BLIND", params: [10], attrs: { unit: "mm" } },
  ];

  it("emits <START> and <END> markers", () => {
    const seq = engine.tokenize(program);
    expect(seq.tokens[0].name).toBe("<START>");
    expect(seq.tokens[seq.tokens.length - 1].name).toBe("<END>");
  });

  it("encodes opsEncoded equal to program length", () => {
    const seq = engine.tokenize(program);
    expect(seq.opsEncoded).toBe(3);
  });

  it("inserts <SEP> between operations", () => {
    const seq = engine.tokenize(program);
    const sepCount = seq.tokens.filter((t) => t.name === "<SEP>").length;
    expect(sepCount).toBe(2); // between 3 ops -> 2 separators
  });

  it("emits value_numeric tokens for parametric values", () => {
    const seq = engine.tokenize(program);
    const numCount = seq.tokens.filter((t) => t.category === "value_numeric").length;
    // SKETCH_CIRCLE (3 params) + FEAT_EXTRUDE_BLIND (1 param) = 4 numeric tokens
    expect(numCount).toBe(4);
  });

  it("preserves numericValue on value tokens for lossless round-trip", () => {
    const seq = engine.tokenize(program);
    const nums = seq.tokens.filter((t) => t.category === "value_numeric");
    // The 25.4 mm radius should be preserved as numericValue
    expect(nums.some((t) => t.numericValue === 25.4)).toBe(true);
    expect(nums.some((t) => t.numericValue === 10)).toBe(true);
  });

  it("emits VAL_UNIT_MM for unit:mm attr", () => {
    const seq = engine.tokenize(program);
    const mm = seq.tokens.filter((t) => t.name === "VAL_UNIT_MM");
    expect(mm.length).toBeGreaterThanOrEqual(2);
  });

  it("falls back to <UNK> for unknown ops and counts them", () => {
    const prog: CADOperation[] = [{ op: "COMPLETELY_BOGUS_OP" }];
    const seq = engine.tokenize(prog);
    expect(seq.unknownOps).toBe(1);
    expect(seq.tokens.some((t) => t.name === "<UNK>")).toBe(true);
  });
});

// ── 3. Numeric bucketization ───────────────────────────────────────

describe("CADTokenRepresentationEngine — numeric bucketization", () => {
  it("zero maps to VAL_NUM_ZERO", () => {
    expect(engine.getTokenName(engine.bucketizeNumeric(0))).toBe("VAL_NUM_ZERO");
  });

  it("classic 25.4 mm lands in B5 (10,100]", () => {
    expect(engine.getTokenName(engine.bucketizeNumeric(25.4))).toBe("VAL_NUM_B5");
  });

  it("micron value lands in B0 (<=1e-3)", () => {
    expect(engine.getTokenName(engine.bucketizeNumeric(5e-4))).toBe("VAL_NUM_B0");
  });

  it("negative values use dedicated buckets", () => {
    expect(engine.getTokenName(engine.bucketizeNumeric(-5))).toBe("VAL_NUM_BN1");
    expect(engine.getTokenName(engine.bucketizeNumeric(-0.05))).toBe("VAL_NUM_BN2");
  });

  it("infinite / NaN return <UNK>", () => {
    expect(engine.getTokenName(engine.bucketizeNumeric(Infinity))).toBe("<UNK>");
    expect(engine.getTokenName(engine.bucketizeNumeric(NaN))).toBe("<UNK>");
  });
});

// ── 4. Round-trip tokenize ↔ detokenize per format ─────────────────

describe("CADTokenRepresentationEngine — round-trip (all 7 formats)", () => {
  const baseProgram: CADOperation[] = [
    { op: "SKETCH_CREATE" },
    { op: "SKETCH_CIRCLE", params: [0, 0, 12.7], attrs: { unit: "mm" } },
    { op: "FEAT_EXTRUDE_BLIND", params: [25], attrs: { unit: "mm" } },
    { op: "FEAT_FILLET_CONST", params: [2] },
    { op: "FEAT_HOLE_SIMPLE", params: [0, 6.35, 20] },
  ];

  const formats: CADFormat[] = [
    "cadquery",
    "freecad",
    "fusion360",
    "mastercam",
    "inventor",
    "hypermill",
    "solidcam",
  ];

  for (const fmt of formats) {
    it(`preserves op identity end-to-end for ${fmt}`, () => {
      const r = engine.roundTrip(baseProgram, fmt);
      expect(r.opsEqual).toBe(true);
      expect(r.opsMatched).toBe(r.opsTotal);
      expect(r.namesOut).toEqual(r.namesIn);
    });
  }

  it("preserves numeric parameter values on round-trip", () => {
    const seq = engine.tokenize(baseProgram, "cadquery");
    const back = engine.detokenize(seq, "cadquery");
    // FEAT_EXTRUDE_BLIND was 25 mm — should survive the token round-trip via numericValue carrier
    const extrude = back.find((o) => o.op === "FEAT_EXTRUDE_BLIND");
    expect(extrude).toBeDefined();
    expect(extrude!.params![0]).toBeCloseTo(25, 6);
  });
});

// ── 5. Format adapters (CadQuery + FreeCAD deep parse) ─────────────

describe("CADTokenRepresentationEngine — CadQuery parser", () => {
  it("extracts Workplane + circle + extrude + fillet from real-ish source", () => {
    const code = `
import cadquery as cq
result = cq.Workplane("XY").circle(12.7).extrude(25).fillet(2)
`;
    const seq = engine.tokenizeFromCadQuery(code);
    const names = seq.tokens.filter((t) => t.category !== "special").map((t) => t.name);
    expect(names).toContain("SKETCH_CREATE");
    expect(names).toContain("SKETCH_CIRCLE");
    expect(names).toContain("FEAT_EXTRUDE_BLIND");
    expect(names).toContain("FEAT_FILLET_CONST");
  });

  it("extracts holes with diameter parameter", () => {
    const code = `result = cq.Workplane("XY").hole(6.35, 20)`;
    const seq = engine.tokenizeFromCadQuery(code);
    const hole = seq.tokens.find((t) => t.name === "FEAT_HOLE_SIMPLE");
    expect(hole).toBeDefined();
  });
});

describe("CADTokenRepresentationEngine — FreeCAD parser", () => {
  it("extracts Pad, Pocket, Revolve from Document.xml-like content", () => {
    const xml = `
      <Object name="Sketch001" type="Sketcher::SketchObject"/>
      <Object name="Pad001" type="Part::Pad">
        <Property name="Length" value="25.0"/>
      </Object>
      <Object name="Pocket001" type="Part::Pocket">
        <Property name="Length" value="10.0"/>
      </Object>
      <Object name="Rev001" type="Part::Revolution">
        <Property name="Angle" value="360"/>
      </Object>
    `;
    const seq = engine.tokenizeFromFreeCAD(xml);
    const names = seq.tokens.filter((t) => t.category !== "special").map((t) => t.name);
    expect(names).toContain("SKETCH_CREATE");
    expect(names).toContain("FEAT_EXTRUDE_BLIND");
    expect(names).toContain("FEAT_POCKET");
    expect(names).toContain("FEAT_REVOLVE_ADD");
  });
});

// ── 6. Positional encoding ────────────────────────────────────────

describe("CADTokenRepresentationEngine — positional encoding", () => {
  it("returns a vector of d_model elements", () => {
    const enc = engine.positionEncode(0, 64);
    expect(enc.length).toBe(64);
  });

  it("at position 0 the even indices are sin(0)=0 and odd are cos(0)=1", () => {
    const enc = engine.positionEncode(0, 16);
    for (let i = 0; i < 16; i += 2) {
      expect(enc[i]).toBeCloseTo(0, 10);
      expect(enc[i + 1]).toBeCloseTo(1, 10);
    }
  });

  it("different positions yield different encodings", () => {
    const a = engine.positionEncode(3, 32);
    const b = engine.positionEncode(17, 32);
    const differ = a.some((v, i) => Math.abs(v - b[i]) > 1e-6);
    expect(differ).toBe(true);
  });

  it("rejects odd d_model and negative position", () => {
    expect(() => engine.positionEncode(0, 7)).toThrow();
    expect(() => engine.positionEncode(-1, 8)).toThrow();
  });
});

// ── 7. Type embeddings ────────────────────────────────────────────

describe("CADTokenRepresentationEngine — type embeddings", () => {
  it("returns a vector of d_model elements", () => {
    const e = engine.typeEmbed(42, 32);
    expect(e.length).toBe(32);
  });

  it("is deterministic for the same token id", () => {
    const a = engine.typeEmbed(99, 16);
    const b = engine.typeEmbed(99, 16);
    expect(a).toEqual(b);
  });

  it("differs between token ids", () => {
    const a = engine.typeEmbed(1, 16);
    const b = engine.typeEmbed(200, 16);
    const differ = a.some((v, i) => Math.abs(v - b[i]) > 1e-6);
    expect(differ).toBe(true);
  });

  it("values in [-1, 1)", () => {
    const e = engine.typeEmbed(17, 64);
    for (const v of e) {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThan(1);
    }
  });
});

// ── 8. Coverage metric ───────────────────────────────────────────

describe("CADTokenRepresentationEngine — coverage", () => {
  it("achieves >= 95% coverage on a JM-Die-representative synthetic corpus", () => {
    // Mirrors the operation distribution observed in JM Die: sketch-driven
    // turned/milled/EDM features, heavy on holes / pockets / profiles.
    const corpus: CADOperation[] = [
      { op: "SKETCH_CREATE" },
      { op: "SKETCH_CIRCLE" },
      { op: "SKETCH_RECTANGLE" },
      { op: "SKETCH_LINE" },
      { op: "SKETCH_ARC_CENTER" },
      { op: "CONSTR_COINCIDENT" },
      { op: "CONSTR_DIM_DIST" },
      { op: "CONSTR_DIM_RADIUS" },
      { op: "FEAT_EXTRUDE_BLIND" },
      { op: "FEAT_EXTRUDE_CUT" },
      { op: "FEAT_REVOLVE_ADD" },
      { op: "FEAT_REVOLVE_CUT" },
      { op: "FEAT_HOLE_SIMPLE" },
      { op: "FEAT_HOLE_TAPPED" },
      { op: "FEAT_HOLE_COUNTERBORE" },
      { op: "FEAT_POCKET" },
      { op: "FEAT_FILLET_CONST" },
      { op: "FEAT_CHAMFER_ANGLE" },
      { op: "PATTERN_CIRC" },
      { op: "PATTERN_LIN_1D" },
      { op: "FEAT_MIRROR_FEATURE" },
      { op: "BOOL_UNION" },
      { op: "BOOL_CUT_SUB" },
      { op: "FEAT_THREAD_EXT" },
      { op: "FEAT_THREAD_INT" },
      { op: "CAM_OP_ADAPTIVE" },
      { op: "CAM_OP_DRILL" },
      { op: "CAM_OP_TURN_ROUGH" },
      { op: "CAM_OP_WEDM" },
      { op: "CAM_OP_SINKER_EDM" },
    ];
    const r = engine.coverageOf(corpus);
    expect(r.pct).toBeGreaterThanOrEqual(0.95);
    expect(r.unknown).toBe(0);
  });

  it("reports correct fraction on a mixed corpus with some unknown ops", () => {
    const corpus: CADOperation[] = [
      { op: "SKETCH_CIRCLE" },
      { op: "FEAT_EXTRUDE_BLIND" },
      { op: "DEFINITELY_NOT_A_REAL_OP" },
      { op: "FEAT_FILLET_CONST" },
    ];
    const r = engine.coverageOf(corpus);
    expect(r.total).toBe(4);
    expect(r.recognized).toBe(3);
    expect(r.unknown).toBe(1);
    expect(r.pct).toBeCloseTo(0.75, 6);
  });
});

// ── 9. BaseEngine contract ────────────────────────────────────────

describe("CADTokenRepresentationEngine — BaseEngine contract", () => {
  it("exposes engine info", () => {
    expect(engine.info.name).toBe("CADTokenRepresentationEngine");
    expect(engine.info.domain).toBe("cad_neural");
  });

  it("execute() returns a success EngineResult for valid input", async () => {
    const result = await engine.execute({ program: [{ op: "SKETCH_CIRCLE" }] });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.source).toBe("CADTokenRepresentationEngine");
  });

  it("execute() returns failure EngineResult for invalid input", async () => {
    const result = await engine.execute({ program: "not-an-array" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Validation failed/);
  });

  it("lists >= 3 capabilities via getCapabilities()", () => {
    expect(engine.getCapabilities().length).toBeGreaterThanOrEqual(3);
  });
});

// ── 10. Singleton and determinism ────────────────────────────────

describe("CADTokenRepresentationEngine — singleton and determinism", () => {
  it("singleton instance matches class fingerprint", () => {
    expect(engine).toBeInstanceOf(CADTokenRepresentationEngine);
  });

  it("tokenize() is deterministic: same input → same tokens", () => {
    const program: CADOperation[] = [
      { op: "SKETCH_CREATE" },
      { op: "FEAT_EXTRUDE_BLIND", params: [10] },
    ];
    const a = engine.tokenize(program);
    const b = engine.tokenize(program);
    expect(a.tokens.map((t) => t.id)).toEqual(b.tokens.map((t) => t.id));
  });
});
