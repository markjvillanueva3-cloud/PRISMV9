/**
 * G-Code Parser — Test Infrastructure for Phase 0-C
 *
 * Structured parsing of G-code programs for parametric test assertions.
 * Instead of `expect(text.includes("G83")).toBe(true)`, use:
 *   const block = parser.findBlock("G83");
 *   expect(block.Z).toBeCloseTo(-25.0, 1);
 *   expect(block.Q).toBeCloseTo(5.0, 1);
 *   expect(block.F).toBeGreaterThan(50);
 *
 * Supports: Fanuc, Haas, Siemens (840D), Heidenhain, Mazak, Okuma dialects.
 *
 * Phase 0-C U-TEST1 deliverable.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface GCodeBlock {
  lineNumber: number;
  rawLine: string;
  /** N-number if present */
  N?: number;
  /** All G-codes on this line */
  gCodes: number[];
  /** All M-codes on this line */
  mCodes: number[];
  /** Axis words: X, Y, Z, A, B, C, U, V, W */
  X?: number; Y?: number; Z?: number;
  A?: number; B?: number; C?: number;
  U?: number; V?: number; W?: number;
  /** Feed and speed */
  F?: number; S?: number;
  /** Tool number */
  T?: number;
  /** Arc params */
  I?: number; J?: number; K?: number; R?: number;
  /** Canned cycle params */
  P?: number; Q?: number; D?: number; H?: number; L?: number;
  /** Comment text */
  comment?: string;
  /** Whether this is a comment-only line */
  isComment: boolean;
  /** Whether this line is blank */
  isBlank: boolean;
}

export interface ParsedProgram {
  blocks: GCodeBlock[];
  programNumber?: string;
  totalLines: number;
  /** All unique G-codes used */
  gCodesUsed: Set<number>;
  /** All unique M-codes used */
  mCodesUsed: Set<number>;
  /** All unique tool numbers */
  toolsUsed: Set<number>;
  /** Comment lines */
  comments: string[];
}

// ============================================================================
// PARSER
// ============================================================================

const WORD_REGEX = /([A-Z])([+-]?\d+\.?\d*)/gi;
const COMMENT_PARENS = /\(([^)]*)\)/g;
const COMMENT_SEMI = /;(.*)$/;
const N_NUMBER_REGEX = /^N(\d+)/i;

function parseBlock(rawLine: string, lineIndex: number): GCodeBlock {
  const trimmed = rawLine.trim();
  const block: GCodeBlock = {
    lineNumber: lineIndex + 1,
    rawLine: trimmed,
    gCodes: [],
    mCodes: [],
    isComment: false,
    isBlank: trimmed.length === 0,
  };

  if (block.isBlank) return block;

  // Full-line comment
  if (trimmed.startsWith("(") || trimmed.startsWith(";") || trimmed.startsWith("%")) {
    block.isComment = true;
    block.comment = trimmed.replace(/^\(|\)$/g, "").replace(/^;/, "").trim();
    return block;
  }

  // Extract inline comments
  let codePart = trimmed;
  const parenComments: string[] = [];
  codePart = codePart.replace(COMMENT_PARENS, (_, c) => { parenComments.push(c); return ""; });
  const semiMatch = codePart.match(COMMENT_SEMI);
  if (semiMatch) {
    parenComments.push(semiMatch[1].trim());
    codePart = codePart.replace(COMMENT_SEMI, "");
  }
  if (parenComments.length) block.comment = parenComments.join("; ");

  // Extract N number
  const nMatch = codePart.match(N_NUMBER_REGEX);
  if (nMatch) {
    block.N = parseInt(nMatch[1], 10);
    codePart = codePart.replace(N_NUMBER_REGEX, "");
  }

  // Extract all word-address pairs
  let match: RegExpExecArray | null;
  const wordRegex = new RegExp(WORD_REGEX.source, "gi");
  while ((match = wordRegex.exec(codePart)) !== null) {
    const letter = match[1].toUpperCase();
    const value = parseFloat(match[2]);

    switch (letter) {
      case "G": block.gCodes.push(value); break;
      case "M": block.mCodes.push(value); break;
      case "X": block.X = value; break;
      case "Y": block.Y = value; break;
      case "Z": block.Z = value; break;
      case "A": block.A = value; break;
      case "B": block.B = value; break;
      case "C": block.C = value; break;
      case "U": block.U = value; break;
      case "V": block.V = value; break;
      case "W": block.W = value; break;
      case "F": block.F = value; break;
      case "S": block.S = value; break;
      case "T": block.T = value; break;
      case "I": block.I = value; break;
      case "J": block.J = value; break;
      case "K": block.K = value; break;
      case "R": block.R = value; break;
      case "P": block.P = value; break;
      case "Q": block.Q = value; break;
      case "D": block.D = value; break;
      case "H": block.H = value; break;
      case "L": block.L = value; break;
      case "N": block.N = value; break;
    }
  }

  return block;
}

export function parseGCode(programText: string): ParsedProgram {
  const lines = programText.split("\n");
  const blocks = lines.map((line, i) => parseBlock(line, i));

  const gCodesUsed = new Set<number>();
  const mCodesUsed = new Set<number>();
  const toolsUsed = new Set<number>();
  const comments: string[] = [];

  let programNumber: string | undefined;

  for (const b of blocks) {
    for (const g of b.gCodes) gCodesUsed.add(g);
    for (const m of b.mCodes) mCodesUsed.add(m);
    if (b.T !== undefined) toolsUsed.add(b.T);
    if (b.comment) comments.push(b.comment);
    // Detect O-number
    if (!programNumber && b.rawLine.match(/^O\d+/i)) {
      programNumber = b.rawLine.match(/^(O\d+)/i)?.[1];
    }
  }

  return { blocks, programNumber, totalLines: lines.length, gCodesUsed, mCodesUsed, toolsUsed, comments };
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/** Find first block containing a specific G-code */
export function findBlock(program: ParsedProgram, gCode: number): GCodeBlock | undefined {
  return program.blocks.find(b => b.gCodes.includes(gCode));
}

/** Find all blocks containing a specific G-code */
export function findAllBlocks(program: ParsedProgram, gCode: number): GCodeBlock[] {
  return program.blocks.filter(b => b.gCodes.includes(gCode));
}

/** Find all blocks with a specific M-code */
export function findMBlocks(program: ParsedProgram, mCode: number): GCodeBlock[] {
  return program.blocks.filter(b => b.mCodes.includes(mCode));
}

/** Get all unique X coordinates in the program */
export function allXCoords(program: ParsedProgram): number[] {
  return program.blocks.filter(b => b.X !== undefined).map(b => b.X!);
}

/** Get all unique Y coordinates in the program */
export function allYCoords(program: ParsedProgram): number[] {
  return program.blocks.filter(b => b.Y !== undefined).map(b => b.Y!);
}

/** Get all unique Z coordinates in the program */
export function allZCoords(program: ParsedProgram): number[] {
  return program.blocks.filter(b => b.Z !== undefined).map(b => b.Z!);
}

/** Get all feed rates in the program */
export function allFeeds(program: ParsedProgram): number[] {
  return program.blocks.filter(b => b.F !== undefined).map(b => b.F!);
}

/** Get all spindle speeds in the program */
export function allSpeeds(program: ParsedProgram): number[] {
  return program.blocks.filter(b => b.S !== undefined).map(b => b.S!);
}

/** Find tool change blocks (M06/M6) */
export function toolChanges(program: ParsedProgram): GCodeBlock[] {
  return program.blocks.filter(b => b.mCodes.includes(6) || b.mCodes.includes(60));
}

/** Check if program contains a specific G-code */
export function hasGCode(program: ParsedProgram, gCode: number): boolean {
  return program.gCodesUsed.has(gCode);
}

/** Check if program contains a specific M-code */
export function hasMCode(program: ParsedProgram, mCode: number): boolean {
  return program.mCodesUsed.has(mCode);
}

// ============================================================================
// ASSERTION HELPERS (for use in vitest)
// ============================================================================

/**
 * Assert that a G-code block exists with specific parameter values (±tolerance).
 * Usage: assertBlockParams(program, 83, { Z: -25.0, Q: 5.0, F: 150 }, 0.1);
 */
export function assertBlockParams(
  program: ParsedProgram,
  gCode: number,
  expected: Record<string, number>,
  tolerance = 0.1,
): { found: boolean; block?: GCodeBlock; mismatches: string[] } {
  const block = findBlock(program, gCode);
  if (!block) return { found: false, mismatches: [`G${gCode} not found in program`] };

  const mismatches: string[] = [];
  for (const [key, expectedVal] of Object.entries(expected)) {
    const actual = (block as any)[key];
    if (actual === undefined) {
      mismatches.push(`${key} not present on G${gCode} block`);
    } else if (Math.abs(actual - expectedVal) > tolerance) {
      mismatches.push(`${key}: expected ${expectedVal}±${tolerance}, got ${actual}`);
    }
  }

  return { found: true, block, mismatches };
}

/**
 * Assert speed/feed ranges for a specific material ISO group.
 * Source: Sandvik General Turning Catalog + Kennametal NOVO.
 */
export const SF_RANGES: Record<string, { Vc_min: number; Vc_max: number; f_min: number; f_max: number }> = {
  // ISO P (Steel): Vc 100-400 m/min, f 0.1-0.5 mm/rev
  P: { Vc_min: 80, Vc_max: 500, f_min: 0.05, f_max: 0.8 },
  // ISO M (Stainless): Vc 80-250 m/min, f 0.08-0.35 mm/rev
  M: { Vc_min: 50, Vc_max: 350, f_min: 0.04, f_max: 0.5 },
  // ISO K (Cast Iron): Vc 80-400 m/min, f 0.15-0.6 mm/rev
  K: { Vc_min: 60, Vc_max: 500, f_min: 0.08, f_max: 0.8 },
  // ISO N (Aluminum): Vc 200-3000 m/min, f 0.1-0.6 mm/rev
  N: { Vc_min: 100, Vc_max: 5000, f_min: 0.05, f_max: 1.0 },
  // ISO S (Superalloy/Ti): Vc 15-80 m/min, f 0.05-0.25 mm/rev
  S: { Vc_min: 10, Vc_max: 150, f_min: 0.03, f_max: 0.4 },
  // ISO H (Hardened): Vc 50-200 m/min, f 0.04-0.2 mm/rev
  H: { Vc_min: 30, Vc_max: 300, f_min: 0.02, f_max: 0.3 },
};

/**
 * Validate that all S/F values in a program fall within expected ranges.
 */
export function assertSFInRange(
  program: ParsedProgram,
  isoGroup: string,
  maxRpm: number,
  minToolDiameter_mm: number,
): { valid: boolean; violations: string[] } {
  const range = SF_RANGES[isoGroup] || SF_RANGES["P"];
  const violations: string[] = [];

  for (const block of program.blocks) {
    if (block.S !== undefined && block.S > 0) {
      // Convert RPM to Vc: Vc = π × D × n / 1000
      const Vc = (Math.PI * minToolDiameter_mm * block.S) / 1000;
      if (Vc < range.Vc_min * 0.5 || Vc > range.Vc_max * 1.5) {
        violations.push(`Line ${block.lineNumber}: S${block.S} → Vc=${Vc.toFixed(0)} m/min outside ${isoGroup} range [${range.Vc_min}-${range.Vc_max}]`);
      }
    }
  }

  return { valid: violations.length === 0, violations };
}
