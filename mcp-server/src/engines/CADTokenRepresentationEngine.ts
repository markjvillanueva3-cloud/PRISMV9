/**
 * CADTokenRepresentationEngine — CAD as Learnable Language
 *
 * Foundational vocabulary that treats CAD operations as discrete tokens
 * suitable for transformer-based neural CAD generation (U-DAGI04/U-DAGI07).
 * Produces fixed-ID token sequences from structured operation descriptors
 * and reverses them back into format-flavored operation arrays.
 *
 * Unit: CADCAM-DAGI-MS0 U-DAGI01
 * Vocabulary: src/data/cad-token-vocabulary.json (256 tokens, 20 categories)
 *
 * References:
 *  - Vaswani et al. "Attention is All You Need" (sinusoidal positional encoding)
 *  - DeepCAD (Wu et al. 2021) — CAD command language for generative modeling
 *  - SkexGen (Xu et al. 2022) — sketch-and-extrude token sequences
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { BaseEngine } from "./BaseEngine.js";
import type { EngineCapability } from "./IEngine.js";

// ── Token types ────────────────────────────────────────────────────

export type CADTokenCategory =
  | "special"
  | "sketch"
  | "constraint"
  | "feature_add"
  | "feature_cut"
  | "feature_mod"
  | "feature_advanced"
  | "pattern"
  | "boolean"
  | "reference"
  | "sheet_metal"
  | "surface"
  | "weldment"
  | "assembly"
  | "configuration"
  | "value_numeric"
  | "value_unit"
  | "value_bool"
  | "drawing"
  | "cam_bridge";

export interface CADTokenDef {
  id: number;
  name: string;
  category: CADTokenCategory;
  arity: number;
  description: string;
}

export interface CADTokenVocabulary {
  schemaVersion: number;
  version: string;
  generated_at: string;
  authority: string;
  purpose: string;
  special_token_range: [number, number];
  operation_token_range_start: number;
  vocabulary: CADTokenDef[];
  categories: CADTokenCategory[];
  supported_cad_formats: string[];
  coverage_target: { jm_die_operations_pct: number; round_trip_geometric_fidelity_pct: number };
}

export type CADFormat =
  | "cadquery"
  | "freecad"
  | "fusion360"
  | "mastercam"
  | "inventor"
  | "hypermill"
  | "solidcam";

/** Structured CAD operation descriptor (format-agnostic intermediate). */
export interface CADOperation {
  /** Token name, e.g., "SKETCH_CIRCLE", "FEAT_EXTRUDE_BLIND" */
  op: string;
  /** Positional numeric parameters in the operation's natural order */
  params?: number[];
  /** Named key-value parameters (units, flags, selectors) */
  attrs?: Record<string, number | string | boolean>;
  /** Optional source format hint */
  sourceFormat?: CADFormat;
  /** Optional operation id (for dependency graphs / U-DAGI02) */
  id?: string;
}

export type CADProgram = CADOperation[];

/** Discrete token emitted by tokenize(). */
export interface CADToken {
  id: number;
  name: string;
  /** Category of the token (useful for type-aware embedding) */
  category: CADTokenCategory;
  /** Numeric value this token carries (for value_numeric tokens) — raw, pre-bucket */
  numericValue?: number;
  /** Position in the emitting sequence (0-indexed) */
  position: number;
}

export interface TokenSequence {
  tokens: CADToken[];
  /** Number of operations encoded */
  opsEncoded: number;
  /** Number of operations with unknown tokens (fell back to <UNK>) */
  unknownOps: number;
  /** Vocabulary version used */
  vocabVersion: string;
  /** Optional format hint preserved for round-trip */
  sourceFormat?: CADFormat;
}

// ── Zod schemas (input validation) ──────────────────────────────────

const OperationSchema = z.object({
  op: z.string().min(1),
  params: z.array(z.number().finite()).optional(),
  attrs: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).optional(),
  sourceFormat: z
    .enum(["cadquery", "freecad", "fusion360", "mastercam", "inventor", "hypermill", "solidcam"])
    .optional(),
  id: z.string().optional(),
});

const TokenizeInputSchema = z.object({
  program: z.array(OperationSchema).min(0),
  sourceFormat: z
    .enum(["cadquery", "freecad", "fusion360", "mastercam", "inventor", "hypermill", "solidcam"])
    .optional(),
});

const DetokenizeInputSchema = z.object({
  tokens: z.array(
    z.object({
      id: z.number().int().nonnegative(),
      name: z.string(),
      category: z.string(),
      numericValue: z.number().finite().optional(),
      position: z.number().int().nonnegative(),
    })
  ),
  format: z.enum([
    "cadquery",
    "freecad",
    "fusion360",
    "mastercam",
    "inventor",
    "hypermill",
    "solidcam",
  ]),
});

export type TokenizeInput = z.infer<typeof TokenizeInputSchema>;
export type DetokenizeInput = z.infer<typeof DetokenizeInputSchema>;

// ── Engine ──────────────────────────────────────────────────────────

export class CADTokenRepresentationEngine extends BaseEngine {
  private vocab!: CADTokenVocabulary;
  private byName: Map<string, CADTokenDef> = new Map();
  private byId: Map<number, CADTokenDef> = new Map();
  private numericBucketIds: Map<string, number> = new Map();

  constructor() {
    super({
      name: "CADTokenRepresentationEngine",
      version: "1.0.0",
      domain: "cad_neural",
      description:
        "Foundational CAD operation tokenization and detokenization for transformer-based neural CAD synthesis. Supports 7 CAD formats and 256 operation tokens.",
    });
    this.loadVocabulary();
  }

  // ── Vocabulary I/O ────────────────────────────────────────────────

  private loadVocabulary(): void {
    const here = dirname(fileURLToPath(import.meta.url));
    const path = resolve(here, "../data/cad-token-vocabulary.json");
    const raw = JSON.parse(readFileSync(path, "utf8")) as CADTokenVocabulary;
    this.vocab = raw;
    this.byName.clear();
    this.byId.clear();
    for (const tok of raw.vocabulary) {
      this.byName.set(tok.name, tok);
      this.byId.set(tok.id, tok);
    }
    // Cache numeric bucket name → id for fast bucketize
    for (const tok of raw.vocabulary) {
      if (tok.category === "value_numeric") {
        this.numericBucketIds.set(tok.name, tok.id);
      }
    }
  }

  vocabularySize(): number {
    return this.vocab.vocabulary.length;
  }

  vocabularyVersion(): string {
    return this.vocab.version;
  }

  getTokenId(name: string): number {
    const tok = this.byName.get(name);
    return tok ? tok.id : this.byName.get("<UNK>")!.id;
  }

  getTokenName(id: number): string | null {
    return this.byId.get(id)?.name ?? null;
  }

  getTokenDef(nameOrId: string | number): CADTokenDef | null {
    if (typeof nameOrId === "number") return this.byId.get(nameOrId) ?? null;
    return this.byName.get(nameOrId) ?? null;
  }

  /** All known token names (for introspection / schema generation). */
  listTokenNames(): string[] {
    return this.vocab.vocabulary.map((t) => t.name);
  }

  /** Supported CAD source formats. */
  supportedFormats(): CADFormat[] {
    return this.vocab.supported_cad_formats as CADFormat[];
  }

  // ── Numeric bucketization (log-scale) ─────────────────────────────

  /**
   * Map a raw numeric parameter to a value-numeric token id.
   * Uses log10(abs) bucket bands: zero, (1e-3,1e-2], (1e-2,1e-1], ..., (1e3,1e4].
   * Negative values use dedicated BN1/BN2 buckets.
   */
  bucketizeNumeric(value: number): number {
    if (!Number.isFinite(value)) return this.getTokenId("<UNK>");
    if (value === 0) return this.numericBucketIds.get("VAL_NUM_ZERO")!;
    if (value < 0) {
      const mag = Math.abs(value);
      return mag < 1
        ? this.numericBucketIds.get("VAL_NUM_BN2")!
        : this.numericBucketIds.get("VAL_NUM_BN1")!;
    }
    const mag = Math.abs(value);
    if (mag <= 1e-3) return this.numericBucketIds.get("VAL_NUM_B0")!;
    if (mag <= 1e-2) return this.numericBucketIds.get("VAL_NUM_B1")!;
    if (mag <= 1e-1) return this.numericBucketIds.get("VAL_NUM_B2")!;
    if (mag <= 1) return this.numericBucketIds.get("VAL_NUM_B3")!;
    if (mag <= 10) return this.numericBucketIds.get("VAL_NUM_B4")!;
    if (mag <= 100) return this.numericBucketIds.get("VAL_NUM_B5")!;
    if (mag <= 1000) return this.numericBucketIds.get("VAL_NUM_B6")!;
    return this.numericBucketIds.get("VAL_NUM_B7")!;
  }

  // ── Tokenize / Detokenize ─────────────────────────────────────────

  /**
   * Encode a sequence of CAD operations as a token stream.
   * Emits: <START> op1 params... <SEP> op2 params... <SEP> ... <END>
   */
  tokenize(program: CADProgram, sourceFormat?: CADFormat): TokenSequence {
    const tokens: CADToken[] = [];
    let unknown = 0;

    const push = (id: number, numericValue?: number) => {
      const def = this.byId.get(id)!;
      tokens.push({
        id: def.id,
        name: def.name,
        category: def.category,
        numericValue,
        position: tokens.length,
      });
    };

    push(this.getTokenId("<START>"));

    for (let i = 0; i < program.length; i++) {
      const op = program[i];
      const def = this.byName.get(op.op);
      if (!def) {
        push(this.getTokenId("<UNK>"));
        unknown++;
      } else {
        push(def.id);
        // Emit parameter tokens (bucketized)
        for (const v of op.params ?? []) {
          push(this.bucketizeNumeric(v), v);
        }
        // Emit unit hints when present
        const unit = op.attrs?.unit;
        if (typeof unit === "string") {
          const unitTokenName = this.unitTokenFromString(unit);
          if (unitTokenName) push(this.getTokenId(unitTokenName));
        }
        // Emit boolean attr marker for common flags
        if (op.attrs && typeof op.attrs.symmetric === "boolean") {
          push(this.getTokenId(op.attrs.symmetric ? "VAL_BOOL_T" : "VAL_BOOL_F"));
        }
      }
      if (i < program.length - 1) push(this.getTokenId("<SEP>"));
    }

    push(this.getTokenId("<END>"));

    return {
      tokens,
      opsEncoded: program.length,
      unknownOps: unknown,
      vocabVersion: this.vocab.version,
      sourceFormat: sourceFormat ?? program[0]?.sourceFormat,
    };
  }

  private unitTokenFromString(unit: string): string | null {
    const u = unit.toLowerCase().trim();
    if (u === "mm" || u === "millimeter" || u === "millimeters") return "VAL_UNIT_MM";
    if (u === "in" || u === "inch" || u === "inches") return "VAL_UNIT_IN";
    if (u === "deg" || u === "degree" || u === "degrees") return "VAL_UNIT_DEG";
    if (u === "rad" || u === "radian" || u === "radians") return "VAL_UNIT_RAD";
    return null;
  }

  /**
   * Reverse a token stream back into operation descriptors.
   * Round-trip preserves op names and numeric parameter values (when the
   * tokens carry numericValue). Bucket-only tokens without original values
   * round-trip as bucket midpoints.
   */
  detokenize(seq: TokenSequence, format: CADFormat): CADProgram {
    const ops: CADOperation[] = [];
    const toks = seq.tokens;
    let i = 0;
    // Skip <START>
    if (toks[i]?.name === "<START>") i++;

    while (i < toks.length) {
      const t = toks[i];
      if (t.name === "<END>" || t.name === "<PAD>") break;
      if (t.name === "<SEP>") {
        i++;
        continue;
      }
      if (t.name === "<UNK>") {
        ops.push({ op: "<UNK>", sourceFormat: format });
        i++;
        continue;
      }
      const def = this.byId.get(t.id);
      if (!def) {
        i++;
        continue;
      }
      // Skip special / value tokens here — they attach to preceding op
      if (
        def.category === "special" ||
        def.category === "value_numeric" ||
        def.category === "value_unit" ||
        def.category === "value_bool"
      ) {
        i++;
        continue;
      }
      // Collect following value tokens until next op/sep
      const params: number[] = [];
      const attrs: Record<string, number | string | boolean> = {};
      i++;
      while (i < toks.length) {
        const n = toks[i];
        if (n.name === "<SEP>" || n.name === "<END>") break;
        const nd = this.byId.get(n.id);
        if (!nd) {
          i++;
          continue;
        }
        if (nd.category === "value_numeric") {
          params.push(n.numericValue ?? this.bucketMidpoint(nd.name));
          i++;
          continue;
        }
        if (nd.category === "value_unit") {
          attrs.unit = this.unitStringFromToken(nd.name);
          i++;
          continue;
        }
        if (nd.category === "value_bool") {
          attrs.symmetric = nd.name === "VAL_BOOL_T";
          i++;
          continue;
        }
        // Next real op — stop collecting
        break;
      }
      ops.push({
        op: def.name,
        params: params.length ? params : undefined,
        attrs: Object.keys(attrs).length ? attrs : undefined,
        sourceFormat: format,
      });
    }
    return ops;
  }

  private bucketMidpoint(name: string): number {
    switch (name) {
      case "VAL_NUM_ZERO":
        return 0;
      case "VAL_NUM_B0":
        return 5e-4;
      case "VAL_NUM_B1":
        return 5e-3;
      case "VAL_NUM_B2":
        return 5e-2;
      case "VAL_NUM_B3":
        return 0.5;
      case "VAL_NUM_B4":
        return 5;
      case "VAL_NUM_B5":
        return 50;
      case "VAL_NUM_B6":
        return 500;
      case "VAL_NUM_B7":
        return 5000;
      case "VAL_NUM_BN1":
        return -5;
      case "VAL_NUM_BN2":
        return -5e-2;
      default:
        return Number.NaN;
    }
  }

  private unitStringFromToken(name: string): string {
    switch (name) {
      case "VAL_UNIT_MM":
        return "mm";
      case "VAL_UNIT_IN":
        return "in";
      case "VAL_UNIT_DEG":
        return "deg";
      case "VAL_UNIT_RAD":
        return "rad";
      default:
        return "";
    }
  }

  // ── Format adapters (superficial parsers) ─────────────────────────

  /**
   * Extract a (best-effort) CADProgram from CadQuery Python source.
   * Regex-based — not a full Python AST parser. Handles the primitives
   * sufficient for U-DAGI01 round-trip tests; deep parsing is delegated
   * to U-DAGI03 CADCorpusIngesterEngine.
   */
  tokenizeFromCadQuery(code: string): TokenSequence {
    const ops: CADOperation[] = [];
    const workplane = /cq\.Workplane\(\s*["']([A-Z]{2})["']\s*\)/.exec(code);
    if (workplane) ops.push({ op: "SKETCH_CREATE", attrs: { plane: workplane[1] } });
    const boxes = [...code.matchAll(/\.box\(\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/g)];
    for (const m of boxes) {
      ops.push({
        op: "FEAT_EXTRUDE_BLIND",
        params: [Number(m[1]) * Number(m[2]), Number(m[3])],
        attrs: { unit: "mm" },
      });
    }
    const circles = [...code.matchAll(/\.circle\(\s*(-?\d+\.?\d*)\s*\)/g)];
    for (const m of circles) {
      ops.push({ op: "SKETCH_CIRCLE", params: [0, 0, Number(m[1])], attrs: { unit: "mm" } });
    }
    const extrudes = [...code.matchAll(/\.extrude\(\s*(-?\d+\.?\d*)\s*\)/g)];
    for (const m of extrudes) {
      ops.push({ op: "FEAT_EXTRUDE_BLIND", params: [Number(m[1])], attrs: { unit: "mm" } });
    }
    const fillets = [...code.matchAll(/\.fillet\(\s*(-?\d+\.?\d*)\s*\)/g)];
    for (const m of fillets) {
      ops.push({ op: "FEAT_FILLET_CONST", params: [Number(m[1])], attrs: { unit: "mm" } });
    }
    const holes = [...code.matchAll(/\.hole\(\s*(-?\d+\.?\d*)\s*(?:,\s*(-?\d+\.?\d*))?\s*\)/g)];
    for (const m of holes) {
      ops.push({
        op: "FEAT_HOLE_SIMPLE",
        params: [0, Number(m[1]), m[2] ? Number(m[2]) : 10],
        attrs: { unit: "mm" },
      });
    }
    return this.tokenize(ops, "cadquery");
  }

  /**
   * Extract a CADProgram from FreeCAD document XML (FCStd Document.xml).
   * Regex-based — matches common Part and Sketcher entries.
   */
  tokenizeFromFreeCAD(xml: string): TokenSequence {
    const ops: CADOperation[] = [];
    if (/<Object\s+name=["']Sketch/.test(xml))
      ops.push({ op: "SKETCH_CREATE", sourceFormat: "freecad" });
    const pads = [...xml.matchAll(/type=["']Part::Pad["'].*?length["']\s+value=["'](-?\d+\.?\d*)/gis)];
    for (const m of pads) {
      ops.push({ op: "FEAT_EXTRUDE_BLIND", params: [Number(m[1])], attrs: { unit: "mm" } });
    }
    const pockets = [...xml.matchAll(/type=["']Part::Pocket["'].*?length["']\s+value=["'](-?\d+\.?\d*)/gis)];
    for (const m of pockets) {
      ops.push({ op: "FEAT_POCKET", params: [Number(m[1])], attrs: { unit: "mm" } });
    }
    const revs = [...xml.matchAll(/type=["']Part::Revolution["'].*?angle["']\s+value=["'](-?\d+\.?\d*)/gis)];
    for (const m of revs) {
      ops.push({ op: "FEAT_REVOLVE_ADD", params: [Number(m[1])], attrs: { unit: "deg" } });
    }
    const fillets = [...xml.matchAll(/type=["']Part::Fillet["'].*?radius["']\s+value=["'](-?\d+\.?\d*)/gis)];
    for (const m of fillets) {
      ops.push({ op: "FEAT_FILLET_CONST", params: [Number(m[1])], attrs: { unit: "mm" } });
    }
    return this.tokenize(ops, "freecad");
  }

  /**
   * Tokenize from a format-specific structured operation array (already parsed
   * by an upstream ingester — e.g., Fusion360 API export, Mastercam .MCX-8
   * metadata, Inventor iLogic, hyperMILL .MFR, SolidCAM .PRZ). For U-DAGI01
   * foundation, adapters preserve op identity and attach sourceFormat.
   */
  tokenizeFromFormat(ops: CADOperation[], format: CADFormat): TokenSequence {
    const tagged: CADOperation[] = ops.map((o) => ({ ...o, sourceFormat: format }));
    return this.tokenize(tagged, format);
  }

  // ── Position / type embeddings (for transformer input) ────────────

  /**
   * Sinusoidal positional encoding (Vaswani et al. 2017):
   *   PE[pos,2i]   = sin(pos / 10000^(2i/d_model))
   *   PE[pos,2i+1] = cos(pos / 10000^(2i/d_model))
   */
  positionEncode(position: number, d_model: number): number[] {
    if (!Number.isFinite(position) || position < 0) {
      throw new Error(`positionEncode: position must be a non-negative finite number`);
    }
    if (!Number.isInteger(d_model) || d_model < 2 || d_model % 2 !== 0) {
      throw new Error(`positionEncode: d_model must be a positive even integer`);
    }
    const out = new Array<number>(d_model);
    for (let i = 0; i < d_model; i += 2) {
      const denom = Math.pow(10000, i / d_model);
      out[i] = Math.sin(position / denom);
      out[i + 1] = Math.cos(position / denom);
    }
    return out;
  }

  /**
   * Deterministic type-aware embedding seeded by token id.
   * Produces a d_model-length vector via a mulberry32 PRNG keyed by id.
   * Values in [-1, 1). Same tokenId → same vector across calls.
   */
  typeEmbed(tokenId: number, d_model: number): number[] {
    if (!Number.isInteger(tokenId) || tokenId < 0) {
      throw new Error(`typeEmbed: tokenId must be a non-negative integer`);
    }
    if (!Number.isInteger(d_model) || d_model < 1) {
      throw new Error(`typeEmbed: d_model must be a positive integer`);
    }
    const rng = mulberry32(0x9e3779b9 ^ (tokenId * 0x85ebca6b));
    const out = new Array<number>(d_model);
    for (let i = 0; i < d_model; i++) out[i] = rng() * 2 - 1;
    return out;
  }

  // ── Coverage / round-trip diagnostics ─────────────────────────────

  /**
   * Report fraction of operations in a program that are recognized in the
   * vocabulary. Used by the 95% JM Die coverage test.
   */
  coverageOf(program: CADProgram): { total: number; recognized: number; unknown: number; pct: number } {
    let recognized = 0;
    let unknown = 0;
    for (const op of program) {
      if (this.byName.has(op.op)) recognized++;
      else unknown++;
    }
    const total = program.length;
    const pct = total === 0 ? 1 : recognized / total;
    return { total, recognized, unknown, pct };
  }

  /**
   * Round-trip check: tokenize → detokenize → compare op names (parametric
   * values are lossy through bucketization; op identity must be preserved).
   */
  roundTrip(program: CADProgram, format: CADFormat): {
    opsEqual: boolean;
    opsTotal: number;
    opsMatched: number;
    namesIn: string[];
    namesOut: string[];
  } {
    const seq = this.tokenize(program, format);
    const back = this.detokenize(seq, format);
    const namesIn = program.map((o) => o.op);
    const namesOut = back.map((o) => o.op);
    let matched = 0;
    for (let i = 0; i < namesIn.length; i++) {
      if (namesIn[i] === namesOut[i]) matched++;
    }
    return {
      opsEqual: namesIn.length === namesOut.length && matched === namesIn.length,
      opsTotal: namesIn.length,
      opsMatched: matched,
      namesIn,
      namesOut,
    };
  }

  // ── BaseEngine hooks ──────────────────────────────────────────────

  getInputSchema() {
    return TokenizeInputSchema;
  }

  validate(input: unknown): string | null {
    const result = TokenizeInputSchema.safeParse(input);
    return result.success ? null : result.error.message;
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    const { program, sourceFormat } = TokenizeInputSchema.parse(input);
    return this.tokenize(program, sourceFormat);
  }

  getCapabilities(): EngineCapability[] {
    return [
      {
        name: "tokenize",
        description: "Encode CAD operation sequence as discrete token stream",
        actions: ["prism_cad:tokenize"],
      },
      {
        name: "detokenize",
        description: "Reverse token stream back to operation sequence",
        actions: ["prism_cad:detokenize"],
      },
      {
        name: "positionEncode",
        description: "Sinusoidal positional encoding for transformer input",
      },
      {
        name: "typeEmbed",
        description: "Deterministic type-aware embedding seeded by token id",
      },
      {
        name: "coverageOf",
        description: "Report vocabulary coverage over a CAD program",
      },
    ];
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    const v = this.vocab;
    if (!v || !Array.isArray(v.vocabulary) || v.vocabulary.length < 256) {
      return { healthy: false, message: "Vocabulary missing or under-sized" };
    }
    const must = ["<START>", "<END>", "<PAD>", "<UNK>", "<SEP>", "<MASK>"];
    for (const name of must) {
      if (!this.byName.has(name)) return { healthy: false, message: `Missing special token ${name}` };
    }
    return { healthy: true };
  }
}

// ── PRNG (mulberry32) ────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Singleton export ────────────────────────────────────────────────

export const cadTokenRepresentationEngine = new CADTokenRepresentationEngine();
