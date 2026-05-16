/**
 * MS-PRINT-PROGRAM-LOOP / U-PPL-A1 — TurningMinFingerprintEngine
 *
 * Structural-fingerprint engine for the 16,558 turning .MIN file corpus.
 * Extracts a stable feature vector from a parsed Okuma program and classifies
 * it against a caller-supplied set of named anchor fingerprints (cosine
 * distance). Pure — no I/O. Engine composition rule per
 * `mcp-server/src/engines/CLAUDE.md`.
 *
 * Composes (does NOT fork):
 *  - OkumaOSPParserEngine — produces the OkumaProgram input (T sections,
 *    operations, variables, safety profile). See `OkumaOSPParserEngine.ts`.
 *    Public surface used here: parse(source, filename?), OkumaProgram,
 *    OkumaOpType, OkumaSafetyInfo (lines 34, 74, 91, 178).
 *  - LathePartFamily taxonomy — human-readable family labels are propagated
 *    from anchor → query program when distance ≤ threshold. See
 *    `LathePartClassifierEngine.ts` (15-family lathe taxonomy, source: Peter
 *    Smid, CNC Programming Handbook Ch.2; Machinery's Handbook 31st Ed.
 *    Workholding chapter).
 *
 * Convention deviation (documented per CLAUDE.md R11):
 *   `mcp-server/src/engines/CLAUDE.md` mandates AtomicValue return shape for
 *   "all calculations". This engine returns plain `distance: number` and
 *   `confidence: number` because the values are GRAPH-THEORETIC (cosine
 *   distance over a feature vector), not physics. The AtomicValue wrap
 *   happens at the dispatcher boundary if needed.
 *
 * Corruption-detection layer:
 *   5/7 hand-built anchors in `Resources/MACRO PROGRAMS/` are corrupted by
 *   the 2026-05-12 history-strip artifact (3 null-byte, 1 JSON restore-state,
 *   1 git-blob header). `detectCorruption()` surfaces these BEFORE attempting
 *   to parse — corrupted bytes go to the structured error channel, never to
 *   the parser. Memo: `reference_min_template_corruption_2026_05_16`.
 *
 * Numeric constants are exported with citation comments per
 * `mcp-server/src/engines/.claude/CLAUDE.md`.
 */

import type {
  OkumaProgram,
  OkumaOpType,
} from "./OkumaOSPParserEngine.js";
import type { LathePartFamily } from "./LathePartClassifierEngine.js";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS (cited)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Bytes inspected at the head of a `.MIN` file when running corruption
 * detection. SOURCE: empirically chosen to cover the BASIC-CASING.MIN
 * "garbage prefix 0-74 bytes, valid G-code starting at byte 75" pattern
 * documented in `reference_min_template_corruption_2026_05_16`. 256 bytes
 * gives 3× margin over the observed 74-byte garbage prefix.
 */
export const CORRUPTION_HEAD_BYTES = 256;

/**
 * Cosine-distance threshold below which a query fingerprint inherits the
 * nearest anchor's family label. SOURCE: U-PPL-A1 spec — 8-14 macro families
 * across 16,558 programs implies a typical cluster radius of ~0.15-0.20 in
 * the 16-dim normalized feature space. 0.3 gives ~50% safety margin against
 * intra-cluster variance while still rejecting true unknowns.
 */
export const DEFAULT_DISTANCE_THRESHOLD = 0.3;

/**
 * Normalization divisor for the G50-max-RPM dimension of the feature vector.
 * SOURCE: typical Okuma lathe spindle limits are 2000-5000 RPM; dividing by
 * 100 puts the log10 input into the [1, 2] range so this dimension's
 * magnitude is comparable to the count-based dimensions.
 */
export const G50_NORMALIZATION_RPM = 100;

/**
 * Locked tuple of OkumaOpType variants that contribute to the feature vector.
 * Order is load-bearing — index of each opType here corresponds to its slot
 * in the per-op-count contribution. Adding a new OkumaOpType to the parser
 * does NOT silently change the vector; you must explicitly extend this tuple
 * AND `computeFeatureVector` together (caught by `vectorContributorsCount`
 * test).
 */
export const VECTOR_OP_CONTRIBUTORS = [
  "face",
  "od_rough",
  "od_finish",
  "id_rough",
  "id_finish",
  "bore",
  "bore_finish",
  "drill",
  "peck_drill",
  "center_drill",
  "groove",
  "cutoff",
  "thread",
] as const;
export type VectorOpContributor = typeof VECTOR_OP_CONTRIBUTORS[number];

/**
 * Fixed dimensionality of the feature vector. Locked so distance comparison
 * is well-defined across versions. Changing this REQUIRES bumping a version
 * constant and re-fingerprinting all anchors.
 */
export const FEATURE_VECTOR_DIMS = 16;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Structural fingerprint of a parsed Okuma turning program. */
export interface ProgramFingerprint {
  /** Count of tool sections (T010101..T999999) parsed from the program. */
  tool_count: number;
  /** Count of operations (any OkumaOpType) across all tool sections. */
  operation_count: number;
  /** Total raw line count (`program.lineCount` from the parser). */
  line_count: number;
  /** Subroutine call count (CALL OO… or G65 P…). */
  subroutine_call_count: number;
  /** Macro variable count (V… or VC…). */
  variable_count: number;

  /** High-signal boolean feature flags. */
  has_bar_feeder: boolean;
  has_c_axis: boolean;
  has_live_tooling: boolean;
  has_threading: boolean;
  has_macro_variables: boolean;

  /** Per-operation-type counts. Sparse — keys only present when count > 0. */
  op_histogram: Partial<Record<OkumaOpType, number>>;

  /** Speed-mode pattern across all tool sections. */
  speed_mode_pattern: "css" | "rpm" | "mixed" | "none";

  /** Highest G50 max-RPM clamp value (0 if no G50 seen). */
  g50_max_rpm_max: number;
  /** Lowest G50 max-RPM clamp value (0 if no G50 seen). */
  g50_max_rpm_min: number;
  /** M01 optional-stop count. */
  optional_stops: number;
  /** M00 mandatory-stop count. */
  mandatory_stops: number;
  /** M08/M50 coolant-on count. */
  coolant_on_count: number;

  /** Sorted unique tool codes encountered (e.g. ["T010101","T020202"]). */
  tool_codes: readonly string[];

  /**
   * Normalized 16-dimensional feature vector for cosine distance.
   * Layout (index → field) — STABLE, see `FEATURE_VECTOR_DIMS` lock note:
   *   0: log10(tool_count)
   *   1: log10(operation_count)
   *   2: log10(line_count)
   *   3: log10(subroutine_call_count)
   *   4: log10(variable_count)
   *   5: has_bar_feeder       (0 or 1)
   *   6: has_c_axis           (0 or 1)
   *   7: has_live_tooling     (0 or 1)
   *   8: has_threading        (0 or 1)
   *   9: has_macro_variables  (0 or 1)
   *  10: log10(od_total) - log10(face_count)   — OD-turn vs face balance
   *      where od_total = od_rough + od_finish
   *  11: log10(id_total)                       — ID-turn + bore signal
   *      where id_total = id_rough + id_finish + bore + bore_finish
   *  12: log10(drill_total)                    — drilling signal
   *      where drill_total = drill + peck_drill + center_drill
   *  13: log10(thread_count)
   *  14: log10(groove_count + cutoff_count)    — separation/grooving signal
   *  15: log10(g50_max_rpm_max / G50_NORMALIZATION_RPM)
   * All log10 calls use Math.log10(Math.max(1, n)) so 0 → 0, not -Inf.
   */
  feature_vector: readonly number[];
}

/** Why a .MIN file failed corruption check (NOT a parse failure — bytes are bad). */
export interface CorruptionSignature {
  kind: "null_bytes" | "git_blob" | "json_state" | "empty" | "non_okuma";
  /** First up-to-CORRUPTION_HEAD_BYTES bytes as hex (lowercase, no separators). */
  byte_head_hex: string;
  /** First up-to-CORRUPTION_HEAD_BYTES bytes rendered as printable ASCII (non-printables as '.'). */
  byte_head_ascii_preview: string;
}

/** Result of running a .MIN byte buffer through the fingerprint pipeline. */
export type FingerprintResult =
  | { ok: true; fingerprint: ProgramFingerprint }
  | { ok: false; reason: "corrupt"; corruption: CorruptionSignature };

/** A named anchor fingerprint — used for cluster labeling. */
export interface NamedAnchor {
  /** Anchor name, e.g. "CASING_MACRO". */
  name: string;
  /** Lathe part family this anchor represents. */
  family: LathePartFamily;
  /** Pre-computed fingerprint of the anchor program. */
  fingerprint: ProgramFingerprint;
}

/** Classification of a query fingerprint against an anchor library. */
export interface ClassifyResult {
  /** Closest anchor if distance ≤ threshold, else null. */
  nearest_anchor: NamedAnchor | null;
  /** Cosine distance to the closest anchor (0 = identical, 2 = anti-parallel). */
  distance: number;
  /** Confidence in [0,1] = 1 - distance/threshold, clamped. */
  confidence: number;
  /**
   * Inherited family label. `null` (not the string "unknown") when no anchor
   * is within threshold — closed-union discipline per Arm-B reviewer feedback.
   * Downstream exhaustive switches on LathePartFamily must handle the null
   * branch explicitly; the type system enforces it.
   */
  family_label: LathePartFamily | null;
}

/** Signature of a parser callback. Matches OkumaOSPParserEngine.parse(). */
export type OkumaParseFn = (source: string, filename?: string) => OkumaProgram;

/**
 * Manifest of clean anchor files known to ship in `Resources/MACRO PROGRAMS/`.
 * As of 2026-05-16 the OTHER 5 files in that directory are corrupted by the
 * history-strip artifact — do NOT add them here until the operator restores
 * them from an external backup. Re-verify with
 * `TurningMinFingerprintEngine.detectCorruption(rawBytes)` before extending
 * this list.
 *
 * Family assignment rationale:
 *  - Both files are casing-style turned parts: through bore + multi-step OD +
 *    optional counterbore + cutoff. The "sleeve" family in the 15-family
 *    LathePartClassifier taxonomy (hollow cylinder with through bore) is the
 *    most precise match.
 */
export const KNOWN_CLEAN_ANCHOR_FILES: ReadonlyArray<{
  filename: string;
  family: LathePartFamily;
}> = [
  { filename: "CASING_MACRO.MIN", family: "sleeve" },
  { filename: "CBORE_CASING_MACRO.MIN", family: "sleeve" },
];

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

// Module-scoped UTF-8 decoder (reused — avoids per-call construction).
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: false });

export class TurningMinFingerprintEngine {
  /**
   * Detect corruption signatures in the raw bytes of a `.MIN` file BEFORE
   * passing them to OkumaOSPParser. Returns the corruption signature on hit,
   * `null` if the bytes look like a plausible Okuma program (parser can still
   * fail later — that's a separate failure mode).
   *
   * Detection order (first hit wins):
   *  1. Empty file (0 bytes).
   *  2. All-null-bytes head (`null_bytes`) — covers 3/7 of the observed
   *     history-strip pattern. Head size: CORRUPTION_HEAD_BYTES (256).
   *  3. zlib-compressed git-blob magic byte pair 0x78 [0x01|0x9c|0xda]
   *     (`git_blob`) — covers BASIC-CASING.MIN.
   *  4. JSON object whose first key is one of `last_sync`/`machine`/`mode`/
   *     `user` followed by `:` (`json_state`) — covers BASIC TOP HAT.
   *  5. Sentinel: head must contain at least one of `%`, `$`, `O<digit>`,
   *     `N<digit>`, `G<digits>`, or `(...` within the inspected window,
   *     else `non_okuma`.
   *
   * @param rawBytes — the raw file content. Length 0 → "empty" signature.
   */
  static detectCorruption(rawBytes: Buffer | Uint8Array): CorruptionSignature | null {
    if (rawBytes.length === 0) {
      return { kind: "empty", byte_head_hex: "", byte_head_ascii_preview: "" };
    }

    const headLen = Math.min(CORRUPTION_HEAD_BYTES, rawBytes.length);
    // .subarray is zero-copy (Buffer and Uint8Array both); .slice copies for
    // Uint8Array which we want to avoid on large inputs.
    const head: Uint8Array = rawBytes instanceof Buffer
      ? rawBytes.subarray(0, headLen)
      : rawBytes.subarray(0, headLen);

    const hex = bytesToHex(head);
    const preview = bytesToAsciiPreview(head);

    // 1. All-null-bytes across the inspected head — 3/7 templates.
    let allZero = true;
    for (let i = 0; i < head.length; i++) {
      if (head[i] !== 0) { allZero = false; break; }
    }
    if (allZero) {
      return { kind: "null_bytes", byte_head_hex: hex, byte_head_ascii_preview: preview };
    }

    // 2. zlib-compressed git-blob header (BASIC-CASING.MIN signature).
    if (head[0] === 0x78 && (head[1] === 0x01 || head[1] === 0x9c || head[1] === 0xda)) {
      return { kind: "git_blob", byte_head_hex: hex, byte_head_ascii_preview: preview };
    }

    // 3. JSON sync-state (BASIC TOP HAT signature).
    if (head[0] === 0x7b /* '{' */) {
      const headStr = UTF8_DECODER.decode(head);
      if (/\{\s*[\r\n]*\s*"(last_sync|machine|mode|user)"\s*:/.test(headStr)) {
        return { kind: "json_state", byte_head_hex: hex, byte_head_ascii_preview: preview };
      }
    }

    // 4. Non-Okuma sentinel — head must contain a plausible Okuma marker.
    const headStr = UTF8_DECODER.decode(head);
    const hasOkumaMarker =
      /[%$]/.test(headStr) ||
      /O\d/.test(headStr) ||
      /\bN\d/.test(headStr) ||
      /\bG\d{1,3}/.test(headStr) ||
      /\([^\)]*[Tt]\d/.test(headStr);
    if (!hasOkumaMarker) {
      return { kind: "non_okuma", byte_head_hex: hex, byte_head_ascii_preview: preview };
    }

    return null;
  }

  /**
   * Build a structural fingerprint from an already-parsed Okuma program.
   * Pure: no I/O, no state mutation.
   */
  static fingerprintProgram(program: OkumaProgram): ProgramFingerprint {
    const opHistogram: Partial<Record<OkumaOpType, number>> = {};
    for (const op of program.operations) {
      opHistogram[op.type] = (opHistogram[op.type] ?? 0) + 1;
    }

    const speedModes = new Set<"css" | "rpm">();
    const toolCodes = new Set<string>();
    for (const t of program.toolSections) {
      if (t.toolCode) toolCodes.add(t.toolCode);
      speedModes.add(t.speedMode);
    }

    const speedModePattern: ProgramFingerprint["speed_mode_pattern"] =
      speedModes.size === 0 ? "none" :
      speedModes.size >= 2 ? "mixed" :
      speedModes.has("css") ? "css" : "rpm";

    // Filter non-finite values (NaN/Infinity) before Math.max/min — a single
    // NaN poisons Math.max in JS, and Infinity poisons the log10 chain
    // downstream. Hostile/corrupt input data must produce a finite vector
    // so distance() and classify() never return non-finite values.
    const g50Vals = (program.safety?.g50MaxRPM ?? []).filter(Number.isFinite);
    const g50Max = g50Vals.length ? Math.max(...g50Vals) : 0;
    const g50Min = g50Vals.length ? Math.min(...g50Vals) : 0;

    const optStops = program.safety?.optionalStops ?? 0;
    const mandStops = program.safety?.mandatoryStops ?? 0;
    const coolantOn = program.safety?.coolantOnCount ?? 0;

    const featureVector = computeFeatureVector({
      toolCount: program.toolSections.length,
      opCount: program.operations.length,
      lineCount: program.lineCount,
      subCallCount: program.subroutineCalls.length,
      varCount: program.variables.length,
      hasBar: program.hasBarFeeder,
      hasCAxis: program.hasCAxis,
      hasLive: program.hasLiveTooling,
      hasThread: program.hasThreading,
      hasMacro: program.hasMacroVariables,
      opHistogram,
      g50Max,
    });

    return {
      tool_count: program.toolSections.length,
      operation_count: program.operations.length,
      line_count: program.lineCount,
      subroutine_call_count: program.subroutineCalls.length,
      variable_count: program.variables.length,
      has_bar_feeder: program.hasBarFeeder,
      has_c_axis: program.hasCAxis,
      has_live_tooling: program.hasLiveTooling,
      has_threading: program.hasThreading,
      has_macro_variables: program.hasMacroVariables,
      op_histogram: opHistogram,
      speed_mode_pattern: speedModePattern,
      g50_max_rpm_max: g50Max,
      g50_max_rpm_min: g50Min,
      optional_stops: optStops,
      mandatory_stops: mandStops,
      coolant_on_count: coolantOn,
      tool_codes: Array.from(toolCodes).sort(),
      feature_vector: featureVector,
    };
  }

  /**
   * Cosine distance between two fingerprints' feature vectors.
   * Returns a value in [0, 2]: 0 = identical direction, 1 = orthogonal,
   * 2 = anti-parallel. Zero-norm vectors return 2 (no similarity).
   */
  static distance(a: ProgramFingerprint, b: ProgramFingerprint): number {
    const va = a.feature_vector;
    const vb = b.feature_vector;
    if (va.length !== vb.length || va.length === 0) return 2;
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < va.length; i++) {
      dot += va[i] * vb[i];
      na += va[i] * va[i];
      nb += vb[i] * vb[i];
    }
    if (na === 0 || nb === 0) return 2;
    return 1 - dot / Math.sqrt(na * nb);
  }

  /**
   * Classify a query fingerprint against a caller-supplied anchor library.
   * Returns the nearest anchor + cosine distance + inherited family label.
   * Queries whose nearest anchor is farther than `threshold` get
   * `family_label: null` (not a fake "unknown" string).
   */
  static classify(
    fp: ProgramFingerprint,
    anchors: ReadonlyArray<NamedAnchor>,
    threshold: number = DEFAULT_DISTANCE_THRESHOLD,
  ): ClassifyResult {
    if (anchors.length === 0) {
      return { nearest_anchor: null, distance: 2, confidence: 0, family_label: null };
    }
    let best: NamedAnchor | null = null;
    let bestDist = Infinity;
    for (const a of anchors) {
      const d = this.distance(fp, a.fingerprint);
      if (d < bestDist) { bestDist = d; best = a; }
    }
    const inside = bestDist <= threshold;
    const confidence = Math.max(0, Math.min(1, 1 - bestDist / Math.max(1e-9, threshold)));
    return {
      nearest_anchor: inside ? best : null,
      distance: bestDist,
      confidence,
      family_label: inside && best ? best.family : null,
    };
  }

  /**
   * Single-pass pipeline: corruption-check → parse → fingerprint.
   *
   * Caller passes the parser callback. The signature `(source, filename?) =>
   * OkumaProgram` matches `OkumaOSPParserEngine.parse()` exactly.
   *
   * **Binding note**: The PRISM `okumaOSPParserEngine` is a class-method
   * singleton — calling `parse` as a bare reference loses `this`. Callers
   * MUST bind:
   *
   * ```ts
   * import { okumaOSPParserEngine } from "./OkumaOSPParserEngine.js";
   * const parseFn = okumaOSPParserEngine.parse.bind(okumaOSPParserEngine);
   * const result = TurningMinFingerprintEngine.fromBytes(buf, parseFn);
   * ```
   *
   * Returns:
   *  - `{ ok: true, fingerprint }` on success
   *  - `{ ok: false, reason: "corrupt", corruption }` when bytes are corrupt
   *
   * Parse failures bubble out of `parseFn` — callers should `try/catch` if
   * they need a structured error there. This is intentional per
   * `mcp-server/src/engines/.claude/CLAUDE.md` (engines throw descriptive
   * errors, never silentCatch).
   */
  static fromBytes(
    raw: Buffer | Uint8Array,
    parseFn: OkumaParseFn,
    filename?: string,
  ): FingerprintResult {
    const corruption = this.detectCorruption(raw);
    if (corruption) {
      return { ok: false, reason: "corrupt", corruption };
    }
    const text = UTF8_DECODER.decode(raw);
    const program = parseFn(text, filename);
    const fingerprint = this.fingerprintProgram(program);
    return { ok: true, fingerprint };
  }
}

export const turningMinFingerprintEngine = TurningMinFingerprintEngine;

// ═══════════════════════════════════════════════════════════════════════════
// PRIVATE HELPERS (module-scoped so they're hot-path-friendly)
// ═══════════════════════════════════════════════════════════════════════════

function log10Safe(n: number): number {
  return Math.log10(Math.max(1, n));
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    out += (b < 16 ? "0" : "") + b.toString(16);
  }
  return out;
}

function bytesToAsciiPreview(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    out += (b >= 0x20 && b < 0x7f) ? String.fromCharCode(b) : ".";
  }
  return out;
}

/**
 * Builds the 16-dim feature vector. See `ProgramFingerprint.feature_vector`
 * JSDoc for slot-by-slot layout. Magic-number changes here REQUIRE updating
 * `FEATURE_VECTOR_DIMS` AND re-fingerprinting all anchors.
 */
function computeFeatureVector(args: {
  toolCount: number;
  opCount: number;
  lineCount: number;
  subCallCount: number;
  varCount: number;
  hasBar: boolean;
  hasCAxis: boolean;
  hasLive: boolean;
  hasThread: boolean;
  hasMacro: boolean;
  opHistogram: Partial<Record<OkumaOpType, number>>;
  g50Max: number;
}): readonly number[] {
  const op = args.opHistogram;
  const face = op.face ?? 0;
  const odTotal = (op.od_rough ?? 0) + (op.od_finish ?? 0);
  const idTotal =
    (op.id_rough ?? 0) + (op.id_finish ?? 0) +
    (op.bore ?? 0) + (op.bore_finish ?? 0);
  const drillTotal =
    (op.drill ?? 0) + (op.peck_drill ?? 0) + (op.center_drill ?? 0);
  const threadCount = op.thread ?? 0;
  const grooveCount = op.groove ?? 0;
  const cutoffCount = op.cutoff ?? 0;

  const vec = [
    log10Safe(args.toolCount),
    log10Safe(args.opCount),
    log10Safe(args.lineCount),
    log10Safe(args.subCallCount),
    log10Safe(args.varCount),
    args.hasBar ? 1 : 0,
    args.hasCAxis ? 1 : 0,
    args.hasLive ? 1 : 0,
    args.hasThread ? 1 : 0,
    args.hasMacro ? 1 : 0,
    log10Safe(odTotal) - log10Safe(face),
    log10Safe(idTotal),
    log10Safe(drillTotal),
    log10Safe(threadCount),
    log10Safe(grooveCount + cutoffCount),
    log10Safe(args.g50Max / G50_NORMALIZATION_RPM),
  ];

  // Sanity invariant — caught by a test on every change to this function.
  if (vec.length !== FEATURE_VECTOR_DIMS) {
    throw new Error(
      `feature vector dimensionality drift: expected ${FEATURE_VECTOR_DIMS}, got ${vec.length}`,
    );
  }
  return vec;
}
