/**
 * LatheTransformerEngine — real reference-value tests
 * ====================================================
 * Target: mcp-server/src/engines/LatheTransformerEngine.ts (LATHE-TRANSFORMER-MS0)
 * Previously UNTESTED (0 references in src/__tests__/).
 *
 * The engine is a transformer for G-code understanding. Its weight-init paths use
 * Math.random and are NOT deterministic — so these tests exercise ONLY the
 * DETERMINISTIC building blocks, asserting values derived INDEPENDENTLY from the
 * documented formulas (not from engine output):
 *
 *   - Sinusoidal positional encoding  PE(pos,2i)=sin(pos/10000^(2i/d)), PE(pos,2i+1)=cos(...)
 *     (Vaswani et al. 2017, "Attention Is All You Need")
 *   - Layer normalization             LN(x)=gamma*(x-mean)/sqrt(var+eps)+beta   (population var)
 *   - GELU activation (tanh approx)    0.5x(1+tanh(sqrt(2/pi)(x+0.044715 x^3)))  via feedForward
 *   - Causal / padding attention masks
 *   - Deterministic G-code tokenizer / detokenizer round-trips
 *   - Vocabulary cardinality + parameter-count formula (getModelStats)
 *   - Rule-based program error detection (detectErrors)
 *
 * Reference literals were computed offline from the formulas above (see the
 * standalone derivation), never by reading back the engine's own results.
 */

import { describe, it, expect } from "vitest";
import {
  latheTransformerEngine,
  LatheTransformerEngine,
  SPECIAL_TOKENS,
} from "../engines/LatheTransformerEngine.js";

// Independent formula re-implementations used ONLY to generate expected values.
const geluRef = (x: number): number =>
  0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * Math.pow(x, 3))));

// A small, cheap engine for exact positional-encoding (d_model=4) and for the
// heavy encode path inside detectErrors (tiny seq/dims → fast).
const small = new LatheTransformerEngine({
  d_model: 4,
  n_heads: 2,
  n_encoder_layers: 1,
  n_decoder_layers: 1,
  d_ff: 8,
  max_seq_length: 24,
});

const eng = latheTransformerEngine; // default config: d_model=256, n_heads=8, max_seq=512

describe("LatheTransformerEngine — configuration & cardinality", () => {
  it("exposes canonical default hyperparameters", () => {
    const c = eng.getConfig();
    expect(c.d_model).toBe(256);
    expect(c.n_heads).toBe(8);
    expect(c.n_encoder_layers).toBe(6);
    expect(c.n_decoder_layers).toBe(6);
    expect(c.d_ff).toBe(1024);
    expect(c.vocab_size).toBe(512);
    expect(c.layer_norm_eps).toBe(1e-6);
    expect(c.activation).toBe("gelu");
  });

  it("builds a vocabulary of exactly 140 tokens (76 base + 52 numeric bins + 12 tools)", () => {
    // 76 unique predefined LATHE_GCODE_VOCAB tokens + S(15)+F(15)+X(12)+Z(10)=52
    // numeric-bin tokens + T01..T12 (12) tool tokens = 140 (verified vs vocabulary.size).
    expect(eng.getVocabSize()).toBe(140);
    // getVocabSize() and getModelStats().vocab_size both read vocabulary.size.
    expect(eng.getModelStats().vocab_size).toBe(eng.getVocabSize());
  });

  it("reports parameter count matching the closed-form formula", () => {
    // emb=512*256=131072; attn=4*256^2=262144; ffn=2*256*1024=524288; ln=4*256=1024
    // encL=787456; decL=2*attn+ffn+3*256*2=1050112
    // total=131072 + 6*787456 + 6*1050112 + 3*256*20 = 11171840
    expect(eng.getModelStats().total_parameters).toBe(11171840);
  });
});

describe("LatheTransformerEngine — sinusoidal positional encoding", () => {
  it("produces exact PE values for d_model=4 (independently derived)", () => {
    const pe = small.computePositionalEncoding(3);
    expect(pe).toHaveLength(3);
    expect(pe[0]).toHaveLength(4);

    // pos=0 → sin(0)=0 at even indices, cos(0)=1 at odd indices
    expect(pe[0][0]).toBeCloseTo(0, 12);
    expect(pe[0][1]).toBeCloseTo(1, 12);
    expect(pe[0][2]).toBeCloseTo(0, 12);
    expect(pe[0][3]).toBeCloseTo(1, 12);

    // pos=1, d_model=4: [sin(1), cos(1), sin(0.01), cos(0.01)]
    expect(pe[1][0]).toBeCloseTo(0.8414709848078965, 12);
    expect(pe[1][1]).toBeCloseTo(0.5403023058681398, 12);
    expect(pe[1][2]).toBeCloseTo(0.009999833334166664, 12);
    expect(pe[1][3]).toBeCloseTo(0.9999500004166653, 12);

    // pos=2: [sin(2), cos(2), sin(0.02), cos(0.02)]
    expect(pe[2][0]).toBeCloseTo(0.9092974268256817, 12);
    expect(pe[2][1]).toBeCloseTo(-0.4161468365471424, 12);
    expect(pe[2][2]).toBeCloseTo(0.01999866669333308, 12);
    expect(pe[2][3]).toBeCloseTo(0.9998000066665778, 12);
  });

  it("keeps dim-0/dim-1 = sin(pos)/cos(pos) at full default d_model=256", () => {
    const pe = eng.computePositionalEncoding(5);
    expect(pe[0]).toHaveLength(256);
    for (let pos = 0; pos < 5; pos++) {
      expect(pe[pos][0]).toBeCloseTo(Math.sin(pos), 12);
      expect(pe[pos][1]).toBeCloseTo(Math.cos(pos), 12);
    }
  });

  it("adversarial: seqLength=0 yields an empty encoding", () => {
    expect(eng.computePositionalEncoding(0)).toEqual([]);
  });
});

describe("LatheTransformerEngine — layer normalization", () => {
  it("normalizes a row to unit population variance (gamma=1, beta=0)", () => {
    // row [1,2,3,4]: mean=2.5, popvar=1.25, std=sqrt(1.25+1e-6)=1.118034435963401
    const out = eng.layerNorm([[1, 2, 3, 4]], { gamma: [1, 1, 1, 1], beta: [0, 0, 0, 0] });
    expect(out[0][0]).toBeCloseTo(-1.3416402498438813, 9);
    expect(out[0][1]).toBeCloseTo(-0.44721341661462705, 9);
    expect(out[0][2]).toBeCloseTo(0.44721341661462705, 9);
    expect(out[0][3]).toBeCloseTo(1.3416402498438813, 9);
    // Normalized output has ~zero mean.
    const mean = out[0].reduce((a, b) => a + b, 0) / out[0].length;
    expect(mean).toBeCloseTo(0, 9);
  });

  it("applies affine gamma/beta after normalization", () => {
    // Same row, gamma=2, beta=1 → 2*z+1. First element: 2*(-1.3416402498) + 1
    const out = eng.layerNorm([[1, 2, 3, 4]], { gamma: [2, 2, 2, 2], beta: [1, 1, 1, 1] });
    expect(out[0][0]).toBeCloseTo(2 * -1.3416402498438813 + 1, 9);
    expect(out[0][3]).toBeCloseTo(2 * 1.3416402498438813 + 1, 9);
  });

  it("adversarial: constant row (zero variance) collapses to beta via eps guard", () => {
    // var=0 → std=sqrt(1e-6)=0.001 → (x-mean)=0 → all outputs = beta (0), no NaN/Inf.
    const out = eng.layerNorm([[5, 5, 5, 5]], { gamma: [1, 1, 1, 1], beta: [0, 0, 0, 0] });
    for (const v of out[0]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeCloseTo(0, 9);
    }
  });
});

describe("LatheTransformerEngine — feed-forward GELU (via identity weights)", () => {
  it("applies GELU element-wise when W1=W2=I, b=0", () => {
    // FFN(x) = activation(x*I + 0)*I + 0 = gelu(x), default activation=gelu.
    const I3 = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    const zero3 = [0, 0, 0];
    const out = eng.feedForward([[0, 1, -2], [0.5, 3, -0.25]], {
      W1: I3,
      W2: I3,
      b1: zero3,
      b2: zero3,
    });
    expect(out[0][0]).toBeCloseTo(geluRef(0), 12); // 0
    expect(out[0][1]).toBeCloseTo(0.8411919906082768, 12); // gelu(1)
    expect(out[0][2]).toBeCloseTo(-0.04540230591222494, 12); // gelu(-2)
    expect(out[1][0]).toBeCloseTo(0.34571400982514394, 12); // gelu(0.5)
    expect(out[1][1]).toBeCloseTo(geluRef(3), 12);
    expect(out[1][2]).toBeCloseTo(geluRef(-0.25), 12);
  });
});

describe("LatheTransformerEngine — attention masks", () => {
  it("causal mask is lower-triangular (attend to current + past only)", () => {
    expect(eng.createCausalMask(3)).toEqual([
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ]);
  });

  it("padding mask replicates the attention vector across every query row", () => {
    expect(eng.createPaddingMask([1, 1, 0])).toEqual([
      [1, 1, 0],
      [1, 1, 0],
      [1, 1, 0],
    ]);
  });

  it("adversarial: degenerate single-position masks", () => {
    expect(eng.createCausalMask(1)).toEqual([[1]]);
    expect(eng.createPaddingMask([0])).toEqual([[0]]);
  });
});

describe("LatheTransformerEngine — tokenizer / detokenizer", () => {
  it("tokenizes a line and round-trips back to upper-cased canonical tokens", () => {
    // detokenize drops SPECIAL/PAD/EOS; keeps ordinary G-code tokens.
    expect(eng.detokenize(eng.tokenizeLine("g0 x1 s1000 m3"))).toEqual([
      "G0",
      "X1",
      "S1000",
      "M3",
    ]);
  });

  it("wraps a program in BOS/EOS, pads to max_seq_length, and round-trips content", () => {
    const ids = eng.tokenizeProgram(["G0 X1", "M3 S1000", "M30"]);
    expect(ids).toHaveLength(eng.getConfig().max_seq_length); // 512, padded
    expect(eng.detokenize(ids)).toEqual(["G0", "X1", "M3", "S1000", "M30"]);
  });

  it("truncates over-length programs to max_seq_length (small engine)", () => {
    const many = Array.from({ length: 100 }, () => "G0 X1 Z1");
    const ids = small.tokenizeProgram(many);
    expect(ids).toHaveLength(24); // small.max_seq_length
  });

  it("failure mode: comment and empty lines produce no tokens", () => {
    expect(eng.tokenizeLine("(this is a comment)")).toEqual([]);
    expect(eng.tokenizeLine("   ")).toEqual([]);
    expect(eng.tokenizeLine(";inline comment")).toEqual([]);
  });

  it("adversarial: an out-of-bin coordinate falls back to the bare prefix token", () => {
    // X7 is not a predefined bin (bins: 0,0.5,1,1.5,2,2.5,3,4,5,6,8,10) → bare "X".
    expect(eng.detokenize(eng.tokenizeLine("X7"))).toEqual(["X"]);
    // SPECIAL tokens are stripped by detokenize even if injected directly.
    const padId = 0;
    expect(eng.detokenize([padId, padId])).toEqual([]);
    expect(SPECIAL_TOKENS.PAD).toBe("[PAD]");
  });
});

describe("LatheTransformerEngine — rule-based error detection", () => {
  it("happy path: a well-formed program raises none of the deterministic rule errors", () => {
    // NOTE: terminate with M02 (not M30) — see the pinned M30 substring bug below.
    const errs = small.detectErrors(["M3 S1000", "G1 X0.5 F0.01", "M5", "M02"]);
    const types = errs.map((e) => e.error_type);
    for (const t of [
      "missing_program_end",
      "missing_spindle_stop",
      "missing_spindle_speed",
      "rapid_into_work",
    ]) {
      expect(types).not.toContain(t);
    }
  });

  it("FIXED: 'M30' program-end no longer false-matches the 'M3' spindle-speed check", () => {
    // R12 fix (U-whiskey-M30FalsePositive): detectErrors now word-boundary matches the
    // M3 spindle code (/\bM0*3\b/), so "M30" (program end + rewind) does NOT match "M3".
    // A properly M30-terminated program WITH S1000 present raises no missing_spindle_speed.
    const errs = small.detectErrors(["G0 X1 Z1", "M3 S1000", "M5", "M30"]);
    const falsePos = errs.find(
      (e) => e.error_type === "missing_spindle_speed" && e.line_content === "M30",
    );
    expect(falsePos).toBeUndefined();
    // No missing_spindle_speed anywhere — the real M3 line carries S1000, M30 is program-end.
    expect(errs.some((e) => e.error_type === "missing_spindle_speed")).toBe(false);
  });

  it("failure mode: spindle start without speed AND without stop", () => {
    const errs = small.detectErrors(["M3", "G0 X1 Z1", "M30"]);
    const speed = errs.find((e) => e.error_type === "missing_spindle_speed");
    expect(speed).toBeDefined();
    expect(speed!.severity).toBe("critical");
    expect(speed!.confidence).toBeCloseTo(0.95, 10);
    expect(errs.map((e) => e.error_type)).toContain("missing_spindle_stop");
  });

  it("failure mode: program not terminated with M30/M02", () => {
    const errs = small.detectErrors(["G21", "M3 S1000", "G0 X1 Z1", "M5"]);
    const end = errs.find((e) => e.error_type === "missing_program_end");
    expect(end).toBeDefined();
    expect(end!.severity).toBe("warning");
    expect(end!.confidence).toBeCloseTo(0.9, 10);
  });

  it("adversarial: rapid (G0) plunge to negative Z is flagged as crash risk", () => {
    const errs = small.detectErrors(["G0 X1 Z-0.5", "M30"]);
    const rapid = errs.find((e) => e.error_type === "rapid_into_work");
    expect(rapid).toBeDefined();
    expect(rapid!.severity).toBe("warning");
    expect(rapid!.confidence).toBeCloseTo(0.75, 10);
  });

  it("returns errors sorted by descending severity (critical → warning → info)", () => {
    const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    const errs = small.detectErrors(["M3", "G0 X1 Z-0.5", "T01"]);
    for (let i = 1; i < errs.length; i++) {
      expect(order[errs[i].severity]).toBeGreaterThanOrEqual(order[errs[i - 1].severity]);
    }
  });
});
