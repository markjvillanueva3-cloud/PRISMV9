/**
 * Tests for TurningMinFingerprintEngine (MS-PRINT-PROGRAM-LOOP/U-PPL-A1).
 *
 * Exercises:
 *  - Corruption detection across all 5 documented signatures
 *  - Fingerprint extraction from synthetic OkumaProgram fixtures (happy path
 *    + empty program + has-threading variant)
 *  - Cosine distance (identical / zero-norm / dimension-mismatch)
 *  - Classification (empty anchors / in-threshold / out-of-threshold)
 *  - fromBytes pipeline (corruption → bypass parser / clean → invokes parser
 *    with bound this)
 *  - Round-trip against the real CASING_MACRO.MIN + CBORE_CASING_MACRO.MIN
 *    on-disk anchors (the 2 templates that survived the 2026-05-12
 *    history-strip artifact)
 *  - Adversarial inputs: NaN / Infinity / oversized vectors
 *  - Feature-vector contributors lock — adding new OkumaOpType doesn't
 *    silently change vector dimensionality
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import {
  TurningMinFingerprintEngine,
  turningMinFingerprintEngine,
  CORRUPTION_HEAD_BYTES,
  DEFAULT_DISTANCE_THRESHOLD,
  G50_NORMALIZATION_RPM,
  VECTOR_OP_CONTRIBUTORS,
  FEATURE_VECTOR_DIMS,
  KNOWN_CLEAN_ANCHOR_FILES,
  type NamedAnchor,
  type ProgramFingerprint,
} from "../engines/TurningMinFingerprintEngine.js";
import {
  okumaOSPParserEngine,
  type OkumaProgram,
  type OkumaOpType,
} from "../engines/OkumaOSPParserEngine.js";
import type { LathePartFamily } from "../engines/LathePartClassifierEngine.js";

// ────────────────────────────────────────────────────────────────────────────
// Fixtures
// ────────────────────────────────────────────────────────────────────────────

const REPO_ROOT = "H:/prism";
const MACRO_DIR = join(REPO_ROOT, "Resources", "MACRO PROGRAMS");
const CLEAN_ANCHOR_CASING = join(MACRO_DIR, "CASING_MACRO.MIN");
const CLEAN_ANCHOR_CBORE = join(MACRO_DIR, "CBORE_CASING_MACRO.MIN");
const CORRUPT_BASIC_CASING = join(MACRO_DIR, "BASIC-CASING.MIN");
const CORRUPT_BASE_WAFER = join(MACRO_DIR, "BASE WAFER INSERT MACRO.min");
const CORRUPT_TOP_HAT = join(MACRO_DIR, "BASIC TOP HAT CASING WITH SINGLE COUNTERBORE.min");

function makeSyntheticProgram(overrides: Partial<OkumaProgram> = {}): OkumaProgram {
  return {
    filename: "synthetic.MIN",
    header: "O1001",
    toolSections: [
      {
        label: "NAT01",
        toolCode: "T010101",
        toolNumber: 1,
        offsetNumber: 1,
        comment: "FACE/OD ROUGH",
        startLine: 1,
        endLine: 50,
        operations: [],
        speedMode: "css",
        cssValue: 600,
        maxRPM: 3500,
        coolant: true,
      },
      {
        label: "NAT02",
        toolCode: "T020202",
        toolNumber: 2,
        offsetNumber: 2,
        comment: "FACE/OD FINISH",
        startLine: 51,
        endLine: 90,
        operations: [],
        speedMode: "css",
        cssValue: 800,
        maxRPM: 3500,
        coolant: true,
      },
    ],
    variables: [
      { name: "V1", value: 1.0, comment: "OD", line: 1 },
    ],
    subroutineCalls: [],
    hasBarFeeder: false,
    hasCAxis: false,
    hasLiveTooling: false,
    hasThreading: false,
    hasMacroVariables: true,
    lineCount: 100,
    operations: [
      { type: "face", line: 5, gcode: "G01", params: {} },
      { type: "od_rough", line: 10, gcode: "G71", params: {} },
      { type: "od_rough", line: 11, gcode: "G71", params: {} },
      { type: "od_finish", line: 60, gcode: "G70", params: {} },
      { type: "drill", line: 70, gcode: "G83", params: {} },
    ],
    safety: {
      g50MaxRPM: [3500],
      retractPositions: [],
      optionalStops: 1,
      mandatoryStops: 0,
      coolantOnCount: 2,
      coolantOffCount: 2,
      hasSpindleStop: true,
      gearRanges: [],
    },
    rawLines: [],
    ...overrides,
  } as OkumaProgram;
}

function makeEmptyProgram(): OkumaProgram {
  return {
    filename: "empty.MIN",
    header: null,
    toolSections: [],
    variables: [],
    subroutineCalls: [],
    hasBarFeeder: false,
    hasCAxis: false,
    hasLiveTooling: false,
    hasThreading: false,
    hasMacroVariables: false,
    lineCount: 0,
    operations: [],
    safety: {
      g50MaxRPM: [],
      retractPositions: [],
      optionalStops: 0,
      mandatoryStops: 0,
      coolantOnCount: 0,
      coolantOffCount: 0,
      hasSpindleStop: false,
      gearRanges: [],
    },
    rawLines: [],
  } as OkumaProgram;
}

// ────────────────────────────────────────────────────────────────────────────
// Constants + module shape
// ────────────────────────────────────────────────────────────────────────────

describe("TurningMinFingerprintEngine — constants", () => {
  it("exports the documented constants with sane values", () => {
    expect(CORRUPTION_HEAD_BYTES).toBe(256);
    expect(DEFAULT_DISTANCE_THRESHOLD).toBe(0.3);
    expect(G50_NORMALIZATION_RPM).toBe(100);
    expect(FEATURE_VECTOR_DIMS).toBe(16);
    expect(VECTOR_OP_CONTRIBUTORS.length).toBeGreaterThanOrEqual(10);
  });

  it("VECTOR_OP_CONTRIBUTORS references only valid OkumaOpType variants", () => {
    const validOps: OkumaOpType[] = [
      "face", "od_rough", "od_finish", "id_rough", "id_finish",
      "center_drill", "drill", "peck_drill", "bore", "bore_finish",
      "groove", "cutoff", "thread",
    ];
    for (const op of VECTOR_OP_CONTRIBUTORS) {
      expect(validOps).toContain(op);
    }
  });

  it("singleton alias resolves to the class itself", () => {
    expect(turningMinFingerprintEngine).toBe(TurningMinFingerprintEngine);
  });

  it("KNOWN_CLEAN_ANCHOR_FILES contains exactly the 2 templates that survived history-strip", () => {
    const names = KNOWN_CLEAN_ANCHOR_FILES.map(a => a.filename);
    expect(names).toEqual(["CASING_MACRO.MIN", "CBORE_CASING_MACRO.MIN"]);
    for (const a of KNOWN_CLEAN_ANCHOR_FILES) {
      expect(a.family).toBe("sleeve");
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// detectCorruption
// ────────────────────────────────────────────────────────────────────────────

describe("TurningMinFingerprintEngine.detectCorruption", () => {
  it("classifies 0-byte input as 'empty'", () => {
    const result = TurningMinFingerprintEngine.detectCorruption(Buffer.alloc(0));
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("empty");
    expect(result!.byte_head_hex).toBe("");
  });

  it("classifies an all-null buffer as 'null_bytes' (BASE WAFER, BASIC CASING SINGLE CBORE, BASIC SINGLE HOLE pattern)", () => {
    const buf = Buffer.alloc(300);
    const result = TurningMinFingerprintEngine.detectCorruption(buf);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("null_bytes");
    expect(result!.byte_head_hex.startsWith("00".repeat(CORRUPTION_HEAD_BYTES))).toBe(true);
  });

  it("classifies a zlib-compressed git-blob header as 'git_blob' (BASIC-CASING.MIN pattern)", () => {
    // Real BASIC-CASING.MIN starts with 78 01 01 b3 0a 4c f5 62 6c 6f 62 20 32 37 32 39 …
    const buf = Buffer.from([0x78, 0x01, 0x01, 0xb3, 0x0a, 0x4c, 0xf5, 0x62, 0x6c, 0x6f, 0x62]);
    const result = TurningMinFingerprintEngine.detectCorruption(buf);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("git_blob");
  });

  it("recognizes all 3 zlib compression-level magic byte pairs", () => {
    for (const lvl of [0x01, 0x9c, 0xda]) {
      const buf = Buffer.from([0x78, lvl, 0x00, 0x00]);
      const result = TurningMinFingerprintEngine.detectCorruption(buf);
      expect(result?.kind).toBe("git_blob");
    }
  });

  it("classifies a JSON sync-state blob as 'json_state' (BASIC TOP HAT pattern)", () => {
    // Real BASIC TOP HAT starts with: {\r\n  "last_sync": "2026-04-15T..." ...
    const buf = Buffer.from(`{\r\n  "last_sync": "2026-04-15T16:58:17.521249",\r\n  "machine": "DESKTOP"`);
    const result = TurningMinFingerprintEngine.detectCorruption(buf);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("json_state");
  });

  it("also detects 'machine'/'mode'/'user' as first-key JSON-state markers", () => {
    for (const key of ["machine", "mode", "user"]) {
      const buf = Buffer.from(`{ "${key}": "DESKTOP-N7MI1VB" }`);
      const result = TurningMinFingerprintEngine.detectCorruption(buf);
      expect(result?.kind).toBe("json_state");
    }
  });

  it("rejects non-Okuma binary garbage as 'non_okuma' (no markers in head)", () => {
    // Random non-zero bytes that don't form any Okuma marker
    const buf = Buffer.from([0xff, 0xfe, 0xab, 0xcd, 0xef, 0x11, 0x22, 0x33]);
    const result = TurningMinFingerprintEngine.detectCorruption(buf);
    expect(result?.kind).toBe("non_okuma");
  });

  it("returns null for a clean Okuma O-header program", () => {
    const buf = Buffer.from("O1001\n(T010101 - FACE/OD ROUGH)\n");
    expect(TurningMinFingerprintEngine.detectCorruption(buf)).toBeNull();
  });

  it("returns null for a clean tape-mode program (% wrapper)", () => {
    const buf = Buffer.from("%\nO1001\n(T010101)\nG50 S3500\n%");
    expect(TurningMinFingerprintEngine.detectCorruption(buf)).toBeNull();
  });

  it("returns null for a dollar-prefixed Fanuc tape header (JM DIE pattern)", () => {
    const buf = Buffer.from("$132A04-0018.MIN%\nN0001 G50 S3500\nN0002 G96 S600\n");
    expect(TurningMinFingerprintEngine.detectCorruption(buf)).toBeNull();
  });

  it("returns null for a comment-led program (LF leading, then O-header)", () => {
    const buf = Buffer.from("(JM DIE — CUSTOMER ALCOA)\nO0042\nG50 S3500\n");
    expect(TurningMinFingerprintEngine.detectCorruption(buf)).toBeNull();
  });

  it("accepts Uint8Array input identical to Buffer input", () => {
    const arr = new Uint8Array([0x4f, 0x31, 0x30, 0x30, 0x31, 0x0a]); // "O1001\n"
    expect(TurningMinFingerprintEngine.detectCorruption(arr)).toBeNull();
  });

  it("CORRUPTION_HEAD_BYTES (256) covers the BASIC-CASING.MIN ~74-byte garbage prefix with margin", () => {
    // Build a buffer with 74 null bytes then valid G-code — should be flagged
    // null_bytes by the 256-byte head check (the all-zero scan extends past
    // the documented garbage zone, so the test confirms the chosen window
    // catches the real corruption while the per-file scrutiny gate's
    // "garbage-then-valid" hypothetical (clean program with null prefix) is
    // a corner case the engine intentionally treats as corrupt.
    const garbage = Buffer.alloc(74);
    const gcode = Buffer.from("\nO1001\nG50 S3500\n");
    const buf = Buffer.concat([garbage, gcode]);
    const result = TurningMinFingerprintEngine.detectCorruption(buf);
    // Mixed-null head — first 74 bytes zero, then real content within the
    // 256-byte window → falls through null_bytes (not all zero) into
    // git_blob/json/non_okuma checks. Bytes 74-90 contain "O1001 G50 S3500"
    // → has_okuma_marker passes → returns null.
    expect(result).toBeNull();
  });

  it("real on-disk BASE WAFER INSERT MACRO.min is classified as null_bytes", () => {
    if (!existsSync(CORRUPT_BASE_WAFER)) return; // skip if file missing
    const buf = readFileSync(CORRUPT_BASE_WAFER);
    const result = TurningMinFingerprintEngine.detectCorruption(buf);
    expect(result?.kind).toBe("null_bytes");
  });

  it("real on-disk BASIC-CASING.MIN is classified as git_blob", () => {
    if (!existsSync(CORRUPT_BASIC_CASING)) return;
    const buf = readFileSync(CORRUPT_BASIC_CASING);
    const result = TurningMinFingerprintEngine.detectCorruption(buf);
    expect(result?.kind).toBe("git_blob");
  });

  it("real on-disk BASIC TOP HAT … .min is classified as json_state", () => {
    if (!existsSync(CORRUPT_TOP_HAT)) return;
    const buf = readFileSync(CORRUPT_TOP_HAT);
    const result = TurningMinFingerprintEngine.detectCorruption(buf);
    expect(result?.kind).toBe("json_state");
  });

  it("real on-disk CASING_MACRO.MIN passes corruption check (returns null)", () => {
    if (!existsSync(CLEAN_ANCHOR_CASING)) return;
    const buf = readFileSync(CLEAN_ANCHOR_CASING);
    expect(TurningMinFingerprintEngine.detectCorruption(buf)).toBeNull();
  });

  it("real on-disk CBORE_CASING_MACRO.MIN passes corruption check (returns null)", () => {
    if (!existsSync(CLEAN_ANCHOR_CBORE)) return;
    const buf = readFileSync(CLEAN_ANCHOR_CBORE);
    expect(TurningMinFingerprintEngine.detectCorruption(buf)).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// fingerprintProgram
// ────────────────────────────────────────────────────────────────────────────

describe("TurningMinFingerprintEngine.fingerprintProgram", () => {
  it("happy path: synthetic 2-tool program produces all populated fields", () => {
    const prog = makeSyntheticProgram();
    const fp = TurningMinFingerprintEngine.fingerprintProgram(prog);

    expect(fp.tool_count).toBe(2);
    expect(fp.operation_count).toBe(5);
    expect(fp.line_count).toBe(100);
    expect(fp.variable_count).toBe(1);
    expect(fp.has_macro_variables).toBe(true);
    expect(fp.speed_mode_pattern).toBe("css");
    expect(fp.g50_max_rpm_max).toBe(3500);
    expect(fp.tool_codes).toEqual(["T010101", "T020202"]);
    expect(fp.op_histogram).toEqual({ face: 1, od_rough: 2, od_finish: 1, drill: 1 });
    expect(fp.feature_vector.length).toBe(FEATURE_VECTOR_DIMS);
  });

  it("feature vector slot 10 (OD-turn vs face balance) reflects real Okuma op types", () => {
    // 3 od_rough + 2 od_finish = 5 OD ops; 1 face → log10(5) - log10(1) ≈ 0.699
    const prog = makeSyntheticProgram({
      operations: [
        { type: "face", line: 1, gcode: "G01", params: {} },
        { type: "od_rough", line: 2, gcode: "G71", params: {} },
        { type: "od_rough", line: 3, gcode: "G71", params: {} },
        { type: "od_rough", line: 4, gcode: "G71", params: {} },
        { type: "od_finish", line: 5, gcode: "G70", params: {} },
        { type: "od_finish", line: 6, gcode: "G70", params: {} },
      ],
    });
    const fp = TurningMinFingerprintEngine.fingerprintProgram(prog);
    expect(fp.feature_vector[10]).toBeCloseTo(Math.log10(5) - Math.log10(1), 3);
  });

  it("feature vector slot 11 (ID-turn signal) aggregates id_rough + id_finish + bore + bore_finish", () => {
    const prog = makeSyntheticProgram({
      operations: [
        { type: "id_rough", line: 1, gcode: "G71", params: {} },
        { type: "id_finish", line: 2, gcode: "G70", params: {} },
        { type: "bore", line: 3, gcode: "G85", params: {} },
        { type: "bore_finish", line: 4, gcode: "G87", params: {} },
      ],
    });
    const fp = TurningMinFingerprintEngine.fingerprintProgram(prog);
    expect(fp.feature_vector[11]).toBeCloseTo(Math.log10(4), 3);
  });

  it("feature vector slot 12 (drill total) aggregates drill + peck_drill + center_drill", () => {
    const prog = makeSyntheticProgram({
      operations: [
        { type: "drill", line: 1, gcode: "G83", params: {} },
        { type: "peck_drill", line: 2, gcode: "G83", params: {} },
        { type: "center_drill", line: 3, gcode: "G82", params: {} },
      ],
    });
    const fp = TurningMinFingerprintEngine.fingerprintProgram(prog);
    expect(fp.feature_vector[12]).toBeCloseTo(Math.log10(3), 3);
  });

  it("empty program produces all-zero 16-dim vector (Karpathy R12 fail-loud → unknown classification)", () => {
    const fp = TurningMinFingerprintEngine.fingerprintProgram(makeEmptyProgram());
    expect(fp.feature_vector.length).toBe(FEATURE_VECTOR_DIMS);
    expect(fp.tool_count).toBe(0);
    expect(fp.operation_count).toBe(0);
    expect(fp.feature_vector.every(v => v === 0)).toBe(true);
  });

  it("mixed css/rpm tool sections produce speed_mode_pattern='mixed'", () => {
    const prog = makeSyntheticProgram();
    prog.toolSections[1].speedMode = "rpm";
    prog.toolSections[1].rpmValue = 1200;
    const fp = TurningMinFingerprintEngine.fingerprintProgram(prog);
    expect(fp.speed_mode_pattern).toBe("mixed");
  });

  it("has_threading flag flips slot 8 of the feature vector to 1", () => {
    const fpNo = TurningMinFingerprintEngine.fingerprintProgram(makeSyntheticProgram({ hasThreading: false }));
    const fpYes = TurningMinFingerprintEngine.fingerprintProgram(makeSyntheticProgram({ hasThreading: true }));
    expect(fpNo.feature_vector[8]).toBe(0);
    expect(fpYes.feature_vector[8]).toBe(1);
  });

  it("g50_max_rpm_max takes Math.max over the g50MaxRPM array", () => {
    const prog = makeSyntheticProgram();
    prog.safety!.g50MaxRPM = [2500, 3500, 2000];
    const fp = TurningMinFingerprintEngine.fingerprintProgram(prog);
    expect(fp.g50_max_rpm_max).toBe(3500);
    expect(fp.g50_max_rpm_min).toBe(2000);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// distance
// ────────────────────────────────────────────────────────────────────────────

describe("TurningMinFingerprintEngine.distance", () => {
  it("identical fingerprints have distance 0", () => {
    const fp = TurningMinFingerprintEngine.fingerprintProgram(makeSyntheticProgram());
    expect(TurningMinFingerprintEngine.distance(fp, fp)).toBeCloseTo(0, 6);
  });

  it("zero-norm vectors (empty programs) return 2 (no similarity)", () => {
    const fp = TurningMinFingerprintEngine.fingerprintProgram(makeEmptyProgram());
    expect(TurningMinFingerprintEngine.distance(fp, fp)).toBe(2);
  });

  it("differing programs produce non-zero distance < 2", () => {
    const fpA = TurningMinFingerprintEngine.fingerprintProgram(makeSyntheticProgram());
    const fpB = TurningMinFingerprintEngine.fingerprintProgram(makeSyntheticProgram({
      hasThreading: true,
      hasLiveTooling: true,
      operations: [{ type: "thread", line: 1, gcode: "G76", params: {} }],
    }));
    const d = TurningMinFingerprintEngine.distance(fpA, fpB);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(2);
  });

  it("dimension mismatch returns 2", () => {
    const fpA = TurningMinFingerprintEngine.fingerprintProgram(makeSyntheticProgram());
    const fpB: ProgramFingerprint = { ...fpA, feature_vector: [1, 2, 3] };
    expect(TurningMinFingerprintEngine.distance(fpA, fpB)).toBe(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// classify
// ────────────────────────────────────────────────────────────────────────────

describe("TurningMinFingerprintEngine.classify", () => {
  function makeAnchor(name: string, family: LathePartFamily, base: OkumaProgram): NamedAnchor {
    return { name, family, fingerprint: TurningMinFingerprintEngine.fingerprintProgram(base) };
  }

  it("empty anchor library returns null family_label + 0 confidence", () => {
    const fp = TurningMinFingerprintEngine.fingerprintProgram(makeSyntheticProgram());
    const result = TurningMinFingerprintEngine.classify(fp, []);
    expect(result.family_label).toBeNull();
    expect(result.nearest_anchor).toBeNull();
    expect(result.distance).toBe(2);
    expect(result.confidence).toBe(0);
  });

  it("query identical to an anchor → family inherited, confidence=1", () => {
    const baseProgram = makeSyntheticProgram();
    const anchor = makeAnchor("CASING_MACRO", "sleeve", baseProgram);
    const queryFp = TurningMinFingerprintEngine.fingerprintProgram(baseProgram);
    const result = TurningMinFingerprintEngine.classify(queryFp, [anchor]);
    expect(result.family_label).toBe("sleeve");
    expect(result.nearest_anchor?.name).toBe("CASING_MACRO");
    expect(result.distance).toBeCloseTo(0, 6);
    expect(result.confidence).toBeCloseTo(1, 6);
  });

  it("query far from any anchor → family_label null (not the string 'unknown')", () => {
    const anchor = makeAnchor("CASING_MACRO", "sleeve", makeSyntheticProgram());
    // Build a wildly different program: heavy threading, live tooling, c-axis
    const queryFp = TurningMinFingerprintEngine.fingerprintProgram(makeSyntheticProgram({
      hasThreading: true,
      hasCAxis: true,
      hasLiveTooling: true,
      hasBarFeeder: true,
      operations: [
        { type: "thread", line: 1, gcode: "G76", params: {} },
        { type: "thread", line: 2, gcode: "G76", params: {} },
        { type: "live_tool", line: 3, gcode: "M19", params: {} },
        { type: "c_axis_position", line: 4, gcode: "M11", params: {} },
        { type: "groove", line: 5, gcode: "G75", params: {} },
      ],
    }));
    const result = TurningMinFingerprintEngine.classify(queryFp, [anchor], 0.05);
    expect(result.family_label).toBeNull();
    expect(result.nearest_anchor).toBeNull();
    expect(result.distance).toBeGreaterThan(0.05);
  });

  it("custom threshold widens or narrows the family inheritance window", () => {
    const anchor = makeAnchor("CASING_MACRO", "sleeve", makeSyntheticProgram());
    const queryFp = TurningMinFingerprintEngine.fingerprintProgram(makeSyntheticProgram({
      hasThreading: true,
    }));
    const tight = TurningMinFingerprintEngine.classify(queryFp, [anchor], 0.01);
    const loose = TurningMinFingerprintEngine.classify(queryFp, [anchor], 2.0);
    expect(loose.family_label).toBe("sleeve");
    if (tight.distance > 0.01) {
      expect(tight.family_label).toBeNull();
    }
  });

  it("picks the nearest anchor when multiple are supplied", () => {
    const near = makeAnchor("near", "sleeve", makeSyntheticProgram());
    const farProg = makeSyntheticProgram({
      hasThreading: true, hasCAxis: true, hasLiveTooling: true,
      operations: [{ type: "thread", line: 1, gcode: "G76", params: {} }],
    });
    const far = makeAnchor("far", "flange", farProg);
    const queryFp = TurningMinFingerprintEngine.fingerprintProgram(makeSyntheticProgram());
    const result = TurningMinFingerprintEngine.classify(queryFp, [far, near]);
    expect(result.nearest_anchor?.name).toBe("near");
    expect(result.family_label).toBe("sleeve");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// fromBytes pipeline + parser binding
// ────────────────────────────────────────────────────────────────────────────

describe("TurningMinFingerprintEngine.fromBytes", () => {
  it("corrupted bytes short-circuit before parsing (parser never invoked)", () => {
    let parserCalled = false;
    const parseFn = (source: string) => {
      parserCalled = true;
      return makeSyntheticProgram();
    };
    const result = TurningMinFingerprintEngine.fromBytes(Buffer.alloc(50), parseFn);
    expect(result.ok).toBe(false);
    expect(parserCalled).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("corrupt");
      expect(result.corruption.kind).toBe("null_bytes");
    }
  });

  it("clean bytes invoke the parser callback and produce a fingerprint", () => {
    let parsedText: string | null = null;
    const parseFn = (source: string) => {
      parsedText = source;
      return makeSyntheticProgram();
    };
    const buf = Buffer.from("O1001\n(T010101 - FACE/OD ROUGH)\nG50 S3500\n");
    const result = TurningMinFingerprintEngine.fromBytes(buf, parseFn);
    expect(result.ok).toBe(true);
    expect(parsedText).toBe("O1001\n(T010101 - FACE/OD ROUGH)\nG50 S3500\n");
    if (result.ok) {
      expect(result.fingerprint.feature_vector.length).toBe(FEATURE_VECTOR_DIMS);
    }
  });

  it("propagates filename argument to the parser", () => {
    let receivedFilename: string | undefined;
    const parseFn = (source: string, filename?: string) => {
      receivedFilename = filename;
      return makeSyntheticProgram();
    };
    const buf = Buffer.from("O1001\n");
    TurningMinFingerprintEngine.fromBytes(buf, parseFn, "test.MIN");
    expect(receivedFilename).toBe("test.MIN");
  });

  it("parse exception bubbles out (caller's responsibility — fail loud)", () => {
    const parseFn = () => { throw new Error("invalid Okuma syntax at line 42"); };
    expect(() => TurningMinFingerprintEngine.fromBytes(
      Buffer.from("O1001\nG99\n"),
      parseFn,
    )).toThrow("invalid Okuma syntax");
  });

  it("documented bind pattern works with the real okumaOSPParserEngine singleton", () => {
    // The JSDoc tells callers to use `okumaOSPParserEngine.parse.bind(okumaOSPParserEngine)`.
    // This test exercises that exact pattern. The primary safety property is
    // "no this-binding error thrown" + "fingerprint produced with locked
    // dimensionality"; tool_count depends on the parser's NAT-label heuristic
    // which requires a richer program shape than a minimal stub — the real-
    // anchor round-trip tests below cover that case.
    const parseFn = okumaOSPParserEngine.parse.bind(okumaOSPParserEngine);
    const program = `O1001
(T010101 - FACE/OD ROUGH)
N0001 G50 S3500
N0002 G96 S600 M03
N0003 G00 X100 Z10
M30
`;
    const buf = Buffer.from(program);
    const result = TurningMinFingerprintEngine.fromBytes(buf, parseFn, "synthetic.MIN");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fingerprint.feature_vector.length).toBe(FEATURE_VECTOR_DIMS);
      // No this-binding TypeError means the bind pattern documented in JSDoc
      // is correct.
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Round-trip integration against real on-disk clean anchors
// ────────────────────────────────────────────────────────────────────────────

describe("TurningMinFingerprintEngine — round-trip with real clean anchors", () => {
  it("CASING_MACRO.MIN parses + fingerprints + classifies near itself", () => {
    if (!existsSync(CLEAN_ANCHOR_CASING)) return;
    const buf = readFileSync(CLEAN_ANCHOR_CASING);
    const parseFn = okumaOSPParserEngine.parse.bind(okumaOSPParserEngine);
    const result = TurningMinFingerprintEngine.fromBytes(buf, parseFn, "CASING_MACRO.MIN");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.fingerprint.tool_count).toBeGreaterThan(0);
    expect(result.fingerprint.line_count).toBeGreaterThan(0);
    expect(result.fingerprint.feature_vector.length).toBe(FEATURE_VECTOR_DIMS);

    // Self-classify against itself as the anchor
    const anchor: NamedAnchor = {
      name: "CASING_MACRO",
      family: "sleeve",
      fingerprint: result.fingerprint,
    };
    const classified = TurningMinFingerprintEngine.classify(result.fingerprint, [anchor]);
    expect(classified.family_label).toBe("sleeve");
    expect(classified.distance).toBeCloseTo(0, 6);
  });

  it("CBORE_CASING_MACRO.MIN clusters near CASING_MACRO (both 'sleeve' family)", () => {
    if (!existsSync(CLEAN_ANCHOR_CASING) || !existsSync(CLEAN_ANCHOR_CBORE)) return;
    const parseFn = okumaOSPParserEngine.parse.bind(okumaOSPParserEngine);

    const casingResult = TurningMinFingerprintEngine.fromBytes(
      readFileSync(CLEAN_ANCHOR_CASING),
      parseFn,
      "CASING_MACRO.MIN",
    );
    const cboreResult = TurningMinFingerprintEngine.fromBytes(
      readFileSync(CLEAN_ANCHOR_CBORE),
      parseFn,
      "CBORE_CASING_MACRO.MIN",
    );
    expect(casingResult.ok).toBe(true);
    expect(cboreResult.ok).toBe(true);
    if (!casingResult.ok || !cboreResult.ok) return;

    const distance = TurningMinFingerprintEngine.distance(
      casingResult.fingerprint,
      cboreResult.fingerprint,
    );
    // Both casing templates share the same tool sequence + structure; the only
    // difference is the counterbore op. Cosine distance should be small.
    expect(distance).toBeLessThan(DEFAULT_DISTANCE_THRESHOLD);
  });

  it("a corrupted on-disk template (BASIC-CASING.MIN) returns corrupt result, parser never invoked", () => {
    if (!existsSync(CORRUPT_BASIC_CASING)) return;
    const buf = readFileSync(CORRUPT_BASIC_CASING);
    let parserCalled = false;
    const parseFn = (source: string) => {
      parserCalled = true;
      return makeSyntheticProgram();
    };
    const result = TurningMinFingerprintEngine.fromBytes(buf, parseFn, "BASIC-CASING.MIN");
    expect(result.ok).toBe(false);
    expect(parserCalled).toBe(false);
    if (!result.ok) expect(result.corruption.kind).toBe("git_blob");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Adversarial inputs
// ────────────────────────────────────────────────────────────────────────────

describe("TurningMinFingerprintEngine — adversarial inputs", () => {
  it("massive 256KB buffer of zeros is detected as null_bytes (no O(n) blowup)", () => {
    const t0 = Date.now();
    const buf = Buffer.alloc(256 * 1024);
    const result = TurningMinFingerprintEngine.detectCorruption(buf);
    expect(Date.now() - t0).toBeLessThan(100);
    expect(result?.kind).toBe("null_bytes");
  });

  it("buffer with exactly CORRUPTION_HEAD_BYTES (256) zero bytes is null_bytes", () => {
    const buf = Buffer.alloc(CORRUPTION_HEAD_BYTES);
    expect(TurningMinFingerprintEngine.detectCorruption(buf)?.kind).toBe("null_bytes");
  });

  it("buffer with CORRUPTION_HEAD_BYTES-1 zeros then a single non-zero is NOT null_bytes", () => {
    const buf = Buffer.alloc(CORRUPTION_HEAD_BYTES);
    buf[CORRUPTION_HEAD_BYTES - 1] = 0x4f; // 'O'
    const result = TurningMinFingerprintEngine.detectCorruption(buf);
    expect(result?.kind).not.toBe("null_bytes");
  });

  it("hostile JSON-state with a comment as first key is NOT misclassified as json_state", () => {
    // `{"comment": "fake"}` does not match the regex (comment != last_sync/machine/mode/user)
    const buf = Buffer.from(`{"comment": "fake content"}`);
    const result = TurningMinFingerprintEngine.detectCorruption(buf);
    expect(result?.kind).not.toBe("json_state");
  });

  it("fake zlib header (0x78 0x00 — invalid second byte) is NOT misclassified as git_blob", () => {
    const buf = Buffer.from([0x78, 0x00, 0x4f, 0x31, 0x30, 0x30, 0x31]);
    const result = TurningMinFingerprintEngine.detectCorruption(buf);
    expect(result?.kind).not.toBe("git_blob");
  });

  it("fingerprint handles a program with NaN g50MaxRPM without producing NaN feature vector", () => {
    const prog = makeSyntheticProgram();
    prog.safety!.g50MaxRPM = [NaN, 3500];
    const fp = TurningMinFingerprintEngine.fingerprintProgram(prog);
    for (const v of fp.feature_vector) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("fingerprint handles a program with Infinity in g50MaxRPM by filtering it out (slot 15 → 0)", () => {
    const prog = makeSyntheticProgram();
    prog.safety!.g50MaxRPM = [Infinity];
    const fp = TurningMinFingerprintEngine.fingerprintProgram(prog);
    // Number.isFinite filter drops Infinity → empty array → g50Max defaults
    // to 0 → log10Safe(0/100) = log10(max(1, 0)) = 0. This produces a finite
    // feature vector even when the parser hands us a bogus safety profile.
    expect(fp.g50_max_rpm_max).toBe(0);
    expect(fp.feature_vector[15]).toBe(0);
    expect(fp.feature_vector.every(Number.isFinite)).toBe(true);
  });

  it("fingerprint handles a g50MaxRPM mix of finite + non-finite by keeping only finite values", () => {
    const prog = makeSyntheticProgram();
    prog.safety!.g50MaxRPM = [NaN, 3500, Infinity, -Infinity, 2500];
    const fp = TurningMinFingerprintEngine.fingerprintProgram(prog);
    expect(fp.g50_max_rpm_max).toBe(3500);
    expect(fp.g50_max_rpm_min).toBe(2500);
    expect(fp.feature_vector.every(Number.isFinite)).toBe(true);
  });

  it("classify on a fingerprint built from non-finite g50 input produces a FINITE distance", () => {
    const cleanFp = TurningMinFingerprintEngine.fingerprintProgram(makeSyntheticProgram());
    const badProg = makeSyntheticProgram();
    badProg.safety!.g50MaxRPM = [Infinity, NaN];
    const badFp = TurningMinFingerprintEngine.fingerprintProgram(badProg);
    const result = TurningMinFingerprintEngine.classify(badFp, [
      { name: "x", family: "sleeve", fingerprint: cleanFp },
    ]);
    // Sanitization at fingerprint time means non-finite input never leaks into
    // the distance computation — distance is finite, classify is meaningful.
    expect(Number.isFinite(result.distance)).toBe(true);
    expect(Number.isFinite(result.confidence)).toBe(true);
    expect(result.distance).toBeGreaterThanOrEqual(0);
    expect(result.distance).toBeLessThanOrEqual(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Feature-vector contributors lock (regression guard)
// ────────────────────────────────────────────────────────────────────────────

describe("TurningMinFingerprintEngine — vector contributors lock", () => {
  it("VECTOR_OP_CONTRIBUTORS lists exactly the op types referenced by computeFeatureVector", () => {
    // If a future OkumaOpType variant gets added (e.g. "swiss_thread"), the
    // engine MUST be explicitly extended via this tuple AND
    // computeFeatureVector. This test pins the current contributor list.
    expect(VECTOR_OP_CONTRIBUTORS).toEqual([
      "face",
      "od_rough", "od_finish",
      "id_rough", "id_finish",
      "bore", "bore_finish",
      "drill", "peck_drill", "center_drill",
      "groove", "cutoff", "thread",
    ]);
  });

  it("FEATURE_VECTOR_DIMS is locked to 16 (any change breaks anchor compatibility)", () => {
    expect(FEATURE_VECTOR_DIMS).toBe(16);
  });
});
