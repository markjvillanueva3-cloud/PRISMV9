/**
 * QTValidationSuiteEngine — Golden-Standard Pipeline Validation from QT3-QT12
 *
 * Uses 10 matched print→model→program test cases (QT3-QT12) from
 * H:/PRISM/JM DIE/QUEUE/ as golden standards to validate PRISM's
 * print-to-program pipeline output.
 *
 * Each QT case has:
 *   - .pdf  (engineering print with dimensions)
 *   - .ipt  (Inventor 3D model)
 *   - .idw  (Inventor drawing)
 *   - .hnc  (proven CNC program — Hurco VMX30i G-code)
 *
 * Additional test cases (Q1-Q3) include parametric macro variants.
 *
 * Pipeline: print → dimension extraction → operation planning → toolpath →
 *           G-code generation → POST-COMPARISON against golden .hnc
 *
 * @module engines/QTValidationSuiteEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** File asset references for a single QT test case */
export interface QTAssets {
  pdf: string;
  ipt: string | null;
  idw: string | null;
  hnc: string | null;
  nc: string | null;
  subProgram: string | null;
}

/** A single tool extracted from a golden-standard program */
export interface GoldenTool {
  toolNumber: number;
  diameter: number | null;
  cornerRadius: number | null;
  description: string;
  fluteCount: number | null;
  type: "face_mill" | "end_mill" | "flat_end_mill" | "ball_mill" | "chamfer_mill" | "drill" | "unknown";
}

/** A single operation extracted from a golden-standard program */
export interface GoldenOperation {
  sequence: number;
  type: "contour_rough" | "face" | "pocket" | "drill" | "profile" | "unknown";
  toolNumber: number;
  spindleRpm: number;
  feedRate: number;
  depthOfCut: number | null;
  totalDepth: number | null;
  passCount: number;
  coolantMode: "mist" | "flood" | "off";
  gCodes: string[];
}

/** Extents (bounding box) of the toolpath */
export interface GoldenExtents {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
}

/** Complete golden standard extracted from a proven CNC program */
export interface GoldenStandard {
  caseId: string;
  machine: string;
  controller: string;
  format: string;
  tools: GoldenTool[];
  operations: GoldenOperation[];
  extents: GoldenExtents;
  workOffset: string;
  lineCount: number;
  hasParametricMacros: boolean;
  hasCutterComp: boolean;
  hasToolLengthComp: boolean;
  safetyBlockPresent: boolean;
  programEndPresent: boolean;
}

/** A single QT test case definition */
export interface QTTestCase {
  id: string;
  description: string;
  complexity: "simple" | "moderate" | "complex";
  partType: string;
  assets: QTAssets;
  golden: GoldenStandard | null;
}

/** Comparison result for a single field */
export interface FieldComparison {
  field: string;
  expected: string | number;
  actual: string | number | null;
  match: boolean;
  tolerance: number;
  score: number;
}

/** Comparison result for one test case */
export interface CaseComparisonResult {
  caseId: string;
  overallScore: number;
  toolScore: number;
  operationScore: number;
  extentsScore: number;
  safetyScore: number;
  fieldResults: FieldComparison[];
  missingTools: number[];
  extraTools: number[];
  missingOperations: string[];
  warnings: string[];
}

/** Summary across all test cases */
export interface SuiteResult {
  totalCases: number;
  casesWithGolden: number;
  caseResults: CaseComparisonResult[];
  averageScore: number;
  worstCase: string;
  bestCase: string;
  timestamp: string;
}

// ============================================================================
// CONSTANTS — QT Test Case Definitions
// ============================================================================

const QT_ROOT = "H:/PRISM/JM DIE/QUEUE";
const QT_PRINTS = `${QT_ROOT}/CLAUDE - PDF PRINTS`;
const QT_MODELS = `${QT_ROOT}/CLAUDE -  3D MODELS`;
const QT_PROGRAMS = `${QT_ROOT}/CLAUDE-G CODE PROGRAMS`;

/** All 13 test cases: QT3-QT12 + Q1-Q3 */
const QT_CASES: QTTestCase[] = [
  // === Q-series (early tests, some with macros) ===
  {
    id: "Q1",
    description: "Simple rectangular pocket with parametric macros (#1-#13)",
    complexity: "simple",
    partType: "rectangular_pocket",
    assets: {
      pdf: `${QT_ROOT}/Q1.pdf`,
      ipt: `${QT_ROOT}/Q1.ipt`,
      idw: `${QT_ROOT}/Q1.idw`,
      hnc: null,
      nc: `${QT_ROOT}/Q1.nc`,
      subProgram: null,
    },
    golden: null, // populated by parseGoldenStandard
  },
  {
    id: "Q2",
    description: "Rectangular pocket, slight size variation from Q1",
    complexity: "simple",
    partType: "rectangular_pocket",
    assets: {
      pdf: `${QT_ROOT}/Q2.pdf`,
      ipt: `${QT_ROOT}/Q2.ipt`,
      idw: `${QT_ROOT}/Q2.idw`,
      hnc: null,
      nc: `${QT_ROOT}/Q2.nc`,
      subProgram: null,
    },
    golden: null,
  },
  {
    id: "Q3",
    description: "Contour with sub-program call, most complex Q-series",
    complexity: "moderate",
    partType: "contour_with_sub",
    assets: {
      pdf: `${QT_ROOT}/Q3.pdf`,
      ipt: `${QT_ROOT}/Q3.ipt`,
      idw: `${QT_ROOT}/Q3.idw`,
      hnc: null,
      nc: `${QT_ROOT}/Q3.nc`,
      subProgram: `${QT_ROOT}/Q3 SUB PROGRAM.nc`,
    },
    golden: null,
  },
  // === QT-series (10 matched golden-standard test cases) ===
  {
    id: "QT3",
    description: "Rectangular die cavity — contour rough + face finish, 2 tools",
    complexity: "moderate",
    partType: "rectangular_die_cavity",
    assets: {
      pdf: `${QT_PRINTS}/QT3.pdf`,
      ipt: `${QT_MODELS}/QT3.ipt`,
      idw: `${QT_ROOT}/QT3.idw`,
      hnc: `${QT_PROGRAMS}/QT3.hnc`,
      nc: null,
      subProgram: null,
    },
    golden: null,
  },
  {
    id: "QT4",
    description: "Rectangular die cavity — similar to QT3 with different dimensions",
    complexity: "moderate",
    partType: "rectangular_die_cavity",
    assets: {
      pdf: `${QT_PRINTS}/QT4.pdf`,
      ipt: `${QT_MODELS}/QT4.ipt`,
      idw: `${QT_ROOT}/QT4.idw`,
      hnc: `${QT_PROGRAMS}/QT4.hnc`,
      nc: null,
      subProgram: null,
    },
    golden: null,
  },
  {
    id: "QT5",
    description: "Rectangular die cavity — dimensional variation on QT3/4 family",
    complexity: "moderate",
    partType: "rectangular_die_cavity",
    assets: {
      pdf: `${QT_PRINTS}/QT5.pdf`,
      ipt: `${QT_MODELS}/QT5.ipt`,
      idw: `${QT_ROOT}/QT5.idw`,
      hnc: `${QT_PROGRAMS}/QT5.hnc`,
      nc: null,
      subProgram: null,
    },
    golden: null,
  },
  {
    id: "QT6",
    description: "Rectangular die cavity — larger footprint variation",
    complexity: "moderate",
    partType: "rectangular_die_cavity",
    assets: {
      pdf: `${QT_PRINTS}/QT6.pdf`,
      ipt: `${QT_MODELS}/QT6.ipt`,
      idw: `${QT_ROOT}/QT6.idw`,
      hnc: `${QT_PROGRAMS}/QT6.hnc`,
      nc: null,
      subProgram: null,
    },
    golden: null,
  },
  {
    id: "QT7",
    description: "Rectangular die cavity — deeper cavity variant",
    complexity: "moderate",
    partType: "rectangular_die_cavity",
    assets: {
      pdf: `${QT_PRINTS}/QT7.pdf`,
      ipt: `${QT_MODELS}/QT7.ipt`,
      idw: `${QT_ROOT}/QT7.idw`,
      hnc: `${QT_PROGRAMS}/QT7.hnc`,
      nc: null,
      subProgram: null,
    },
    golden: null,
  },
  {
    id: "QT8",
    description: "Rectangular die cavity — deepest of the QT3-8 family",
    complexity: "moderate",
    partType: "rectangular_die_cavity",
    assets: {
      pdf: `${QT_PRINTS}/QT8.pdf`,
      ipt: `${QT_MODELS}/QT8.ipt`,
      idw: `${QT_ROOT}/QT8.idw`,
      hnc: `${QT_PROGRAMS}/QT8.hnc`,
      nc: null,
      subProgram: null,
    },
    golden: null,
  },
  {
    id: "QT9",
    description: "Smaller rectangular cavity — reduced-dimension variant",
    complexity: "simple",
    partType: "rectangular_die_cavity",
    assets: {
      pdf: `${QT_PRINTS}/QT9.pdf`,
      ipt: `${QT_MODELS}/QT9.ipt`,
      idw: `${QT_ROOT}/QT9.idw`,
      hnc: `${QT_PROGRAMS}/QT9.hnc`,
      nc: null,
      subProgram: null,
    },
    golden: null,
  },
  {
    id: "QT10",
    description: "Compact rectangular cavity — simplest QT10-12 family member",
    complexity: "simple",
    partType: "rectangular_die_cavity",
    assets: {
      pdf: `${QT_PRINTS}/QT10.pdf`,
      ipt: `${QT_MODELS}/QT10.ipt`,
      idw: `${QT_ROOT}/QT10.idw`,
      hnc: `${QT_PROGRAMS}/QT10.hnc`,
      nc: null,
      subProgram: null,
    },
    golden: null,
  },
  {
    id: "QT11",
    description: "Compact rectangular cavity — similar to QT10",
    complexity: "simple",
    partType: "rectangular_die_cavity",
    assets: {
      pdf: `${QT_PRINTS}/QT11.pdf`,
      ipt: `${QT_MODELS}/QT11.ipt`,
      idw: `${QT_ROOT}/QT11.idw`,
      hnc: `${QT_PROGRAMS}/QT11.hnc`,
      nc: null,
      subProgram: null,
    },
    golden: null,
  },
  {
    id: "QT12",
    description: "Compact rectangular cavity — largest QT10-12 family member",
    complexity: "simple",
    partType: "rectangular_die_cavity",
    assets: {
      pdf: `${QT_PRINTS}/QT12.pdf`,
      ipt: `${QT_MODELS}/QT12.ipt`,
      idw: `${QT_ROOT}/QT12.idw`,
      hnc: `${QT_PROGRAMS}/QT12.hnc`,
      nc: null,
      subProgram: null,
    },
    golden: null,
  },
];

// ============================================================================
// G-CODE PARSING UTILITIES
// ============================================================================

interface ParsedLine {
  lineNum: number;
  n: number | null;
  gCodes: number[];
  mCodes: number[];
  x: number | null;
  y: number | null;
  z: number | null;
  f: number | null;
  s: number | null;
  t: number | null;
  h: number | null;
  d: number | null;
  r: number | null;
  i: number | null;
  j: number | null;
  comment: string | null;
}

function parseLine(raw: string, lineIdx: number): ParsedLine | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "%" || trimmed === "E") return null;

  const result: ParsedLine = {
    lineNum: lineIdx,
    n: null,
    gCodes: [],
    mCodes: [],
    x: null, y: null, z: null,
    f: null, s: null, t: null,
    h: null, d: null, r: null,
    i: null, j: null,
    comment: null,
  };

  // Extract comment
  const commentMatch = trimmed.match(/\(([^)]*)\)/);
  if (commentMatch) result.comment = commentMatch[1];

  // If line is ONLY a comment, return it
  if (/^\(.*\)$/.test(trimmed)) return result;

  // Extract N-number
  const nMatch = trimmed.match(/N(\d+)/);
  if (nMatch) result.n = parseInt(nMatch[1], 10);

  // Extract G-codes (multiple per line)
  for (const m of trimmed.matchAll(/G(\d+\.?\d*)/g)) {
    result.gCodes.push(parseFloat(m[1]));
  }

  // Extract M-codes
  for (const m of trimmed.matchAll(/M(\d+)/g)) {
    result.mCodes.push(parseInt(m[1], 10));
  }

  // Extract axis values
  const xm = trimmed.match(/X(-?[\d.]+)/);
  if (xm) result.x = parseFloat(xm[1]);
  const ym = trimmed.match(/Y(-?[\d.]+)/);
  if (ym) result.y = parseFloat(ym[1]);
  const zm = trimmed.match(/Z(-?[\d.]+)/);
  if (zm) result.z = parseFloat(zm[1]);
  const fm = trimmed.match(/F(-?[\d.]+)/);
  if (fm) result.f = parseFloat(fm[1]);
  const sm = trimmed.match(/S(\d+)/);
  if (sm) result.s = parseInt(sm[1], 10);
  const tm = trimmed.match(/T(\d+)/);
  if (tm) result.t = parseInt(tm[1], 10);
  const hm = trimmed.match(/H(\d+)/);
  if (hm) result.h = parseInt(hm[1], 10);
  const dm = trimmed.match(/D(\d+)/);
  if (dm) result.d = parseInt(dm[1], 10);
  const rm = trimmed.match(/R(-?[\d.]+)/);
  if (rm) result.r = parseFloat(rm[1]);
  const im = trimmed.match(/I(-?[\d.]+)/);
  if (im) result.i = parseFloat(im[1]);
  const jm = trimmed.match(/J(-?[\d.]+)/);
  if (jm) result.j = parseFloat(jm[1]);

  return result;
}

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class QTValidationSuiteEngineImpl {

  /**
   * Get all defined QT test cases (without golden standards parsed).
   */
  static getTestCases(): QTTestCase[] {
    return QT_CASES.map(c => ({ ...c }));
  }

  /**
   * Get a single test case by ID.
   */
  static getTestCase(id: string): QTTestCase | null {
    return QT_CASES.find(c => c.id === id) ?? null;
  }

  /**
   * Parse a golden-standard CNC program and extract the reference data.
   * Works with both .hnc (QT3-12) and .nc (Q1-Q3) formats.
   *
   * @param caseId  QT test case ID (e.g., "QT3")
   * @param content Raw G-code program text
   * @returns GoldenStandard with all extracted reference parameters
   */
  static parseGoldenStandard(caseId: string, content: string): GoldenStandard {
    const lines = content.split(/\r?\n/);
    const parsed: (ParsedLine | null)[] = lines.map((l, i) => parseLine(l, i));

    const tools: GoldenTool[] = [];
    const operations: GoldenOperation[] = [];
    const allX: number[] = [];
    const allY: number[] = [];
    const allZ: number[] = [];

    let currentTool: number | null = null;
    let currentRpm = 0;
    let currentFeed = 0;
    let currentOperationType: GoldenOperation["type"] = "unknown";
    let opSequence = 0;
    let hasParametricMacros = false;
    let hasCutterComp = false;
    let hasToolLengthComp = false;
    let safetyBlockPresent = false;
    let programEndPresent = false;
    let workOffset = "G54";

    // Check for parametric macros (#variables)
    if (content.includes("#")) {
      hasParametricMacros = true;
    }

    // Scan for tool definitions in comments
    // Track the last tool-changed number for flute-count assignment
    let lastToolChangedNum: number | null = null;
    for (const line of lines) {
      // Pattern: (T13 D=0.75 CR=0.03 - ZMIN=-1.1875 - face mill)
      const toolComment = line.match(
        /\(T(\d+)\s+D=([\d.]+)\s+CR=([\d.]+)\s*-\s*ZMIN=(-?[\d.]+)\s*-\s*(.+?)\)/
      );
      if (toolComment) {
        const toolNum = parseInt(toolComment[1], 10);
        const diam = parseFloat(toolComment[2]);
        const cr = parseFloat(toolComment[3]);
        const desc = toolComment[5].trim();
        tools.push({
          toolNumber: toolNum,
          diameter: diam,
          cornerRadius: cr,
          description: desc,
          fluteCount: null,
          type: desc.includes("face mill") ? "face_mill"
            : desc.includes("flat end") ? "flat_end_mill"
            : desc.includes("end mill") ? "end_mill"
            : desc.includes("ball") ? "ball_mill"
            : desc.includes("drill") ? "drill"
            : "unknown",
        });
      }
      // Detect tool change lines (T## M6) to track active tool
      const toolChangeMatch = line.match(/T(\d+).*M0?6\b/);
      if (toolChangeMatch) {
        lastToolChangedNum = parseInt(toolChangeMatch[1], 10);
      }
      // Pattern: (3 FLUTE) or (9 FLUTE) — assign to last tool-changed
      const fluteComment = line.match(/\((\d+)\s+FLUTE\)/i);
      if (fluteComment) {
        const fluteCount = parseInt(fluteComment[1], 10);
        const target = lastToolChangedNum !== null
          ? tools.find(t => t.toolNumber === lastToolChangedNum)
          : tools[tools.length - 1];
        if (target) target.fluteCount = fluteCount;
      }
    }

    // Scan parsed lines for operations and extents
    for (const pl of parsed) {
      if (!pl) continue;

      // Safety block detection
      if (pl.gCodes.includes(90) || pl.gCodes.includes(17)) safetyBlockPresent = true;
      if (pl.gCodes.includes(28)) safetyBlockPresent = true;

      // Program end
      if (pl.mCodes.includes(2) || pl.mCodes.includes(30)) programEndPresent = true;

      // Work offset
      for (const g of pl.gCodes) {
        if (g >= 54 && g <= 59) workOffset = `G${g}`;
      }

      // Tool change
      if (pl.t !== null && pl.mCodes.includes(6)) {
        currentTool = pl.t;
        // If we have a pending operation type, create the operation now
        if (currentOperationType !== "unknown") {
          const existing = operations.find(
            o => o.type === currentOperationType && o.toolNumber === currentTool
          );
          if (!existing) {
            opSequence++;
            operations.push({
              sequence: opSequence,
              type: currentOperationType,
              toolNumber: currentTool,
              spindleRpm: currentRpm,
              feedRate: currentFeed,
              depthOfCut: null,
              totalDepth: null,
              passCount: 0,
              coolantMode: "off",
              gCodes: [],
            });
          }
        }
      } else if (pl.t !== null && currentTool === null) {
        currentTool = pl.t;
      }

      // Spindle speed
      if (pl.s !== null) currentRpm = pl.s;

      // Feed rate
      if (pl.f !== null) currentFeed = pl.f;

      // Cutter comp
      if (pl.gCodes.includes(41) || pl.gCodes.includes(42)) hasCutterComp = true;

      // Tool length comp
      if (pl.gCodes.includes(43)) hasToolLengthComp = true;

      // Operation detection from comments (skip tool-definition comments like "(T13 D=0.75 ... face mill)")
      // Only sets currentOperationType — operation creation happens at the next tool change
      if (pl.comment && !pl.comment.match(/^T\d+\s+D=/)) {
        const commentLower = pl.comment.toLowerCase();
        if (commentLower.includes("contour") && commentLower.includes("rough")) {
          currentOperationType = "contour_rough";
        } else if (commentLower.includes("contour")) {
          currentOperationType = "contour_rough";
        } else if (commentLower.includes("face")) {
          currentOperationType = "face";
        } else if (commentLower.includes("pocket")) {
          currentOperationType = "pocket";
        } else if (commentLower.includes("drill")) {
          currentOperationType = "drill";
        } else if (commentLower.includes("profile")) {
          currentOperationType = "profile";
        }
      }

      // Collect axis positions for extents
      if (pl.x !== null) allX.push(pl.x);
      if (pl.y !== null) allY.push(pl.y);
      if (pl.z !== null) allZ.push(pl.z);

      // Coolant tracking
      if (pl.mCodes.includes(7)) {
        const lastOp = operations[operations.length - 1];
        if (lastOp) lastOp.coolantMode = "mist";
      }
      if (pl.mCodes.includes(8)) {
        const lastOp = operations[operations.length - 1];
        if (lastOp) lastOp.coolantMode = "flood";
      }

      // G-code collection per operation
      for (const g of pl.gCodes) {
        const lastOp = operations[operations.length - 1];
        if (lastOp) {
          const gStr = `G${g}`;
          if (!lastOp.gCodes.includes(gStr)) lastOp.gCodes.push(gStr);
        }
      }
    }

    // Compute pass counts and depths from Z movements per operation
    let zPassesPerOp = new Map<number, number[]>();
    let currentOpIdx = -1;
    for (const pl of parsed) {
      if (!pl) continue;
      if (pl.comment && !pl.comment.match(/^T\d+\s+D=/)) {
        const commentLower = pl.comment.toLowerCase();
        if (commentLower.includes("contour") || commentLower.includes("face") ||
            commentLower.includes("pocket") || commentLower.includes("drill") ||
            commentLower.includes("profile")) {
          currentOpIdx++;
        }
      }
      if (currentOpIdx >= 0 && pl.z !== null && pl.z < 0) {
        if (!zPassesPerOp.has(currentOpIdx)) zPassesPerOp.set(currentOpIdx, []);
        zPassesPerOp.get(currentOpIdx)!.push(pl.z);
      }
    }

    for (const [opIdx, zValues] of zPassesPerOp.entries()) {
      if (opIdx < operations.length) {
        const op = operations[opIdx];
        // Count distinct Z depths as passes
        const uniqueZ = [...new Set(zValues.map(z => Math.round(z * 10000) / 10000))];
        op.passCount = uniqueZ.length;
        op.totalDepth = Math.min(...zValues);
        if (uniqueZ.length > 1) {
          // Depth of cut = difference between first two Z levels
          const sorted = uniqueZ.sort((a, b) => b - a);
          op.depthOfCut = Math.abs(sorted[0] - sorted[1]);
        }
      }
    }

    // Update operation feeds/speeds from actual parsed values
    let lastRpm = 0;
    let lastFeed = 0;
    let opTracker = -1;
    for (const pl of parsed) {
      if (!pl) continue;
      // Skip tool-definition comments (e.g., "(T13 D=0.75 ... face mill)")
      if (pl.comment && !pl.comment.match(/^T\d+\s+D=/)) {
        const cl = pl.comment.toLowerCase();
        if (cl.includes("contour") || cl.includes("face") || cl.includes("pocket") ||
            cl.includes("drill") || cl.includes("profile")) {
          opTracker++;
        }
      }
      if (pl.s !== null) lastRpm = pl.s;
      if (pl.f !== null) lastFeed = pl.f;
      if (opTracker >= 0 && opTracker < operations.length) {
        if (pl.s !== null) operations[opTracker].spindleRpm = pl.s;
        if (pl.f !== null) operations[opTracker].feedRate = pl.f;
      }
    }

    const extents: GoldenExtents = {
      xMin: allX.length ? Math.min(...allX) : 0,
      xMax: allX.length ? Math.max(...allX) : 0,
      yMin: allY.length ? Math.min(...allY) : 0,
      yMax: allY.length ? Math.max(...allY) : 0,
      zMin: allZ.length ? Math.min(...allZ) : 0,
      zMax: allZ.length ? Math.max(...allZ) : 0,
    };

    return {
      caseId,
      machine: "Hurco VMX30i",
      controller: "Hurco WinMax (Fanuc-compatible)",
      format: hasParametricMacros ? "fanuc_parametric" : "hurco_gcode",
      tools,
      operations,
      extents,
      workOffset,
      lineCount: lines.length,
      hasParametricMacros,
      hasCutterComp,
      hasToolLengthComp,
      safetyBlockPresent,
      programEndPresent,
    };
  }

  /**
   * Compare PRISM-generated program output against a golden standard.
   *
   * Scoring weights:
   *   - Tools: 25% (correct tools, diameters, types)
   *   - Operations: 35% (correct sequence, types, S/F within tolerance)
   *   - Extents: 20% (bounding box within tolerance)
   *   - Safety: 20% (safety blocks, program end, TLC, work offset)
   *
   * @param golden    Golden standard from parseGoldenStandard()
   * @param candidate PRISM-generated golden standard (same format)
   * @returns Detailed comparison result with per-field scoring
   */
  static comparePrograms(
    golden: GoldenStandard,
    candidate: GoldenStandard
  ): CaseComparisonResult {
    const fieldResults: FieldComparison[] = [];
    const warnings: string[] = [];

    // --- TOOL COMPARISON (25%) ---
    let toolScore = 0;
    const missingTools: number[] = [];
    const extraTools: number[] = [];
    const goldenToolNums = new Set(golden.tools.map(t => t.toolNumber));
    const candToolNums = new Set(candidate.tools.map(t => t.toolNumber));

    for (const gt of golden.tools) {
      const ct = candidate.tools.find(t => t.toolNumber === gt.toolNumber);
      if (!ct) {
        missingTools.push(gt.toolNumber);
        fieldResults.push({
          field: `tool_${gt.toolNumber}_present`,
          expected: gt.toolNumber,
          actual: null,
          match: false,
          tolerance: 0,
          score: 0,
        });
      } else {
        // Tool exists — check diameter and type
        let tScore = 0.5; // base for matching tool number

        if (gt.diameter !== null && ct.diameter !== null) {
          const diamTol = 0.01; // 0.010" tolerance on tool diameter
          const diamMatch = Math.abs(gt.diameter - ct.diameter) <= diamTol;
          tScore += diamMatch ? 0.3 : 0;
          fieldResults.push({
            field: `tool_${gt.toolNumber}_diameter`,
            expected: gt.diameter,
            actual: ct.diameter,
            match: diamMatch,
            tolerance: diamTol,
            score: diamMatch ? 1 : 0,
          });
        } else {
          tScore += 0.15; // partial credit if diameter not specified
        }

        if (gt.type === ct.type) tScore += 0.2;
        fieldResults.push({
          field: `tool_${gt.toolNumber}_type`,
          expected: gt.type,
          actual: ct.type,
          match: gt.type === ct.type,
          tolerance: 0,
          score: gt.type === ct.type ? 1 : 0,
        });

        toolScore += tScore;
      }
    }

    for (const ct of candidate.tools) {
      if (!goldenToolNums.has(ct.toolNumber)) {
        extraTools.push(ct.toolNumber);
        warnings.push(`Extra tool T${ct.toolNumber} not in golden standard`);
      }
    }

    const maxToolScore = golden.tools.length || 1;
    toolScore = toolScore / maxToolScore;

    // --- OPERATION COMPARISON (35%) ---
    let opScore = 0;
    const missingOperations: string[] = [];
    const maxOps = Math.max(golden.operations.length, 1);

    for (const gop of golden.operations) {
      const cop = candidate.operations.find(
        o => o.type === gop.type && o.toolNumber === gop.toolNumber
      );
      if (!cop) {
        missingOperations.push(`${gop.type} with T${gop.toolNumber}`);
        continue;
      }

      let oScore = 0.3; // base for matching operation type + tool

      // Spindle speed within 15% tolerance (equal values always match)
      if (gop.spindleRpm === cop.spindleRpm) {
        oScore += 0.25;
        fieldResults.push({
          field: `op_${gop.type}_rpm`,
          expected: gop.spindleRpm,
          actual: cop.spindleRpm,
          match: true,
          tolerance: 0.15,
          score: 1,
        });
      } else if (gop.spindleRpm > 0 && cop.spindleRpm > 0) {
        const rpmTol = 0.15;
        const rpmRatio = Math.abs(gop.spindleRpm - cop.spindleRpm) / gop.spindleRpm;
        const rpmMatch = rpmRatio <= rpmTol;
        oScore += rpmMatch ? 0.25 : (1 - Math.min(rpmRatio, 1)) * 0.25;
        fieldResults.push({
          field: `op_${gop.type}_rpm`,
          expected: gop.spindleRpm,
          actual: cop.spindleRpm,
          match: rpmMatch,
          tolerance: rpmTol,
          score: rpmMatch ? 1 : Math.max(0, 1 - rpmRatio),
        });
      }

      // Feed rate within 20% tolerance (equal values always match)
      if (gop.feedRate === cop.feedRate) {
        oScore += 0.25;
        fieldResults.push({
          field: `op_${gop.type}_feed`,
          expected: gop.feedRate,
          actual: cop.feedRate,
          match: true,
          tolerance: 0.20,
          score: 1,
        });
      } else if (gop.feedRate > 0 && cop.feedRate > 0) {
        const feedTol = 0.20;
        const feedRatio = Math.abs(gop.feedRate - cop.feedRate) / gop.feedRate;
        const feedMatch = feedRatio <= feedTol;
        oScore += feedMatch ? 0.25 : (1 - Math.min(feedRatio, 1)) * 0.25;
        fieldResults.push({
          field: `op_${gop.type}_feed`,
          expected: gop.feedRate,
          actual: cop.feedRate,
          match: feedMatch,
          tolerance: feedTol,
          score: feedMatch ? 1 : Math.max(0, 1 - feedRatio),
        });
      }

      // Coolant match
      if (gop.coolantMode === cop.coolantMode) oScore += 0.1;

      // Pass count within 2 passes (equal values always match)
      if (gop.passCount === cop.passCount) {
        oScore += 0.1;
      } else if (gop.passCount > 0 && cop.passCount > 0) {
        const passMatch = Math.abs(gop.passCount - cop.passCount) <= 2;
        oScore += passMatch ? 0.1 : 0;
      }

      opScore += oScore;
    }

    opScore = opScore / maxOps;

    // --- EXTENTS COMPARISON (20%) ---
    let extentsScore = 0;
    const extTol = 0.100; // 0.100" tolerance on bounding box

    const extFields: Array<{ field: string; golden: number; cand: number }> = [
      { field: "extent_xMin", golden: golden.extents.xMin, cand: candidate.extents.xMin },
      { field: "extent_xMax", golden: golden.extents.xMax, cand: candidate.extents.xMax },
      { field: "extent_yMin", golden: golden.extents.yMin, cand: candidate.extents.yMin },
      { field: "extent_yMax", golden: golden.extents.yMax, cand: candidate.extents.yMax },
      { field: "extent_zMin", golden: golden.extents.zMin, cand: candidate.extents.zMin },
      { field: "extent_zMax", golden: golden.extents.zMax, cand: candidate.extents.zMax },
    ];

    for (const ef of extFields) {
      const match = Math.abs(ef.golden - ef.cand) <= extTol;
      const diff = Math.abs(ef.golden - ef.cand);
      const score = match ? 1 : Math.max(0, 1 - diff / (extTol * 10));
      extentsScore += score;
      fieldResults.push({
        field: ef.field,
        expected: ef.golden,
        actual: ef.cand,
        match,
        tolerance: extTol,
        score,
      });
    }

    extentsScore = extentsScore / 6;

    // --- SAFETY COMPARISON (20%) ---
    let safetyScore = 0;
    const safetyChecks = [
      { field: "safety_block", golden: golden.safetyBlockPresent, cand: candidate.safetyBlockPresent },
      { field: "program_end", golden: golden.programEndPresent, cand: candidate.programEndPresent },
      { field: "tool_length_comp", golden: golden.hasToolLengthComp, cand: candidate.hasToolLengthComp },
      { field: "cutter_comp", golden: golden.hasCutterComp, cand: candidate.hasCutterComp },
    ];

    for (const sc of safetyChecks) {
      const match = sc.golden === sc.cand;
      safetyScore += match ? 1 : 0;
      fieldResults.push({
        field: sc.field,
        expected: sc.golden ? "present" : "absent",
        actual: sc.cand ? "present" : "absent",
        match,
        tolerance: 0,
        score: match ? 1 : 0,
      });
    }

    // Work offset match
    const woffMatch = golden.workOffset === candidate.workOffset;
    safetyScore += woffMatch ? 1 : 0;
    fieldResults.push({
      field: "work_offset",
      expected: golden.workOffset,
      actual: candidate.workOffset,
      match: woffMatch,
      tolerance: 0,
      score: woffMatch ? 1 : 0,
    });

    safetyScore = safetyScore / 5;

    // --- OVERALL SCORE ---
    const overallScore =
      toolScore * 0.25 +
      opScore * 0.35 +
      extentsScore * 0.20 +
      safetyScore * 0.20;

    return {
      caseId: golden.caseId,
      overallScore: Math.round(overallScore * 1000) / 1000,
      toolScore: Math.round(toolScore * 1000) / 1000,
      operationScore: Math.round(opScore * 1000) / 1000,
      extentsScore: Math.round(extentsScore * 1000) / 1000,
      safetyScore: Math.round(safetyScore * 1000) / 1000,
      fieldResults,
      missingTools,
      extraTools,
      missingOperations,
      warnings,
    };
  }

  /**
   * Run the full validation suite: parse all golden standards and return
   * the complete test case registry with extracted golden data.
   *
   * @param programContents Map of caseId → raw program text
   * @returns Array of QTTestCase objects with golden standards populated
   */
  static buildSuite(
    programContents: Map<string, string>
  ): QTTestCase[] {
    const cases = QT_CASES.map(c => ({ ...c }));

    for (const tc of cases) {
      const content = programContents.get(tc.id);
      if (content) {
        tc.golden = QTValidationSuiteEngineImpl.parseGoldenStandard(tc.id, content);
      }
    }

    return cases;
  }

  /**
   * Run comparison across all test cases that have both golden and candidate data.
   *
   * @param goldenSuite   Array from buildSuite() with golden standards
   * @param candidateSuite Array with candidate golden standards
   * @returns SuiteResult with per-case and aggregate scores
   */
  static runSuite(
    goldenSuite: QTTestCase[],
    candidateSuite: QTTestCase[]
  ): SuiteResult {
    const caseResults: CaseComparisonResult[] = [];

    for (const golden of goldenSuite) {
      if (!golden.golden) continue;
      const candidate = candidateSuite.find(c => c.id === golden.id);
      if (!candidate?.golden) continue;

      caseResults.push(
        QTValidationSuiteEngineImpl.comparePrograms(golden.golden, candidate.golden)
      );
    }

    const scores = caseResults.map(r => r.overallScore);
    const avgScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    const worst = caseResults.reduce(
      (min, r) => r.overallScore < min.overallScore ? r : min,
      caseResults[0] ?? { caseId: "none", overallScore: 0 }
    );
    const best = caseResults.reduce(
      (max, r) => r.overallScore > max.overallScore ? r : max,
      caseResults[0] ?? { caseId: "none", overallScore: 0 }
    );

    return {
      totalCases: goldenSuite.length,
      casesWithGolden: caseResults.length,
      caseResults,
      averageScore: Math.round(avgScore * 1000) / 1000,
      worstCase: worst?.caseId ?? "none",
      bestCase: best?.caseId ?? "none",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Load all QT programs from disk and build the complete golden suite.
   * Reads .hnc files from QT_PROGRAMS and .nc files from QT_ROOT.
   *
   * @returns Object with loaded suite, per-case golden data, and load stats
   */
  static async loadFromDisk(): Promise<{
    suite: QTTestCase[];
    stats: {
      totalCases: number;
      loadedPrograms: number;
      failedLoads: string[];
      goldenParsed: number;
    };
  }> {
    const { readFile } = await import("fs/promises");
    const contents = new Map<string, string>();
    const failedLoads: string[] = [];

    for (const tc of QT_CASES) {
      const programPath = tc.assets.hnc ?? tc.assets.nc;
      if (!programPath) continue;

      try {
        const text = await readFile(programPath, "utf-8");
        if (text.trim().length > 0) {
          contents.set(tc.id, text);
        }
      } catch {
        failedLoads.push(tc.id);
      }
    }

    const suite = QTValidationSuiteEngineImpl.buildSuite(contents);
    const goldenParsed = suite.filter(c => c.golden !== null).length;

    log.info(`QTValidationSuite: loaded ${contents.size}/${QT_CASES.length} programs, ${goldenParsed} golden standards parsed`);

    return {
      suite,
      stats: {
        totalCases: QT_CASES.length,
        loadedPrograms: contents.size,
        failedLoads,
        goldenParsed,
      },
    };
  }

  /**
   * Load a single QT program from disk by case ID.
   *
   * @param caseId QT test case ID (e.g., "QT3", "Q1")
   * @returns Parsed GoldenStandard or null if file not found
   */
  static async loadCase(caseId: string): Promise<GoldenStandard | null> {
    const { readFile } = await import("fs/promises");
    const tc = QT_CASES.find(c => c.id === caseId);
    if (!tc) return null;

    const programPath = tc.assets.hnc ?? tc.assets.nc;
    if (!programPath) return null;

    try {
      const text = await readFile(programPath, "utf-8");
      return QTValidationSuiteEngineImpl.parseGoldenStandard(caseId, text);
    } catch {
      return null;
    }
  }

  /**
   * Run regression check: load all programs from disk, parse golden standards,
   * and compare against a snapshot of expected values. Returns pass/fail per case.
   *
   * @param expectedTools Map of caseId → expected tool count
   * @param expectedDepths Map of caseId → expected ZMIN (deepest cut)
   * @returns Per-case regression results
   */
  static async runRegression(
    expectedTools?: Map<string, number>,
    expectedDepths?: Map<string, number>
  ): Promise<{
    passed: boolean;
    totalCases: number;
    passedCases: number;
    failures: Array<{ caseId: string; reason: string }>;
  }> {
    const { suite } = await QTValidationSuiteEngineImpl.loadFromDisk();
    const failures: Array<{ caseId: string; reason: string }> = [];
    let passedCases = 0;

    for (const tc of suite) {
      if (!tc.golden) continue;

      let casePassed = true;

      // Check tool count if expected
      if (expectedTools?.has(tc.id)) {
        const expected = expectedTools.get(tc.id)!;
        if (tc.golden.tools.length !== expected) {
          failures.push({
            caseId: tc.id,
            reason: `Tool count: expected ${expected}, got ${tc.golden.tools.length}`,
          });
          casePassed = false;
        }
      }

      // Check depth if expected
      if (expectedDepths?.has(tc.id)) {
        const expected = expectedDepths.get(tc.id)!;
        const tolerance = 0.001;
        if (Math.abs(tc.golden.extents.zMin - expected) > tolerance) {
          failures.push({
            caseId: tc.id,
            reason: `ZMIN: expected ${expected}, got ${tc.golden.extents.zMin}`,
          });
          casePassed = false;
        }
      }

      // Structural checks all golden cases must pass
      if (!tc.golden.safetyBlockPresent) {
        failures.push({ caseId: tc.id, reason: "Missing safety block" });
        casePassed = false;
      }
      if (!tc.golden.programEndPresent) {
        failures.push({ caseId: tc.id, reason: "Missing program end" });
        casePassed = false;
      }

      if (casePassed) passedCases++;
    }

    return {
      passed: failures.length === 0,
      totalCases: suite.filter(c => c.golden !== null).length,
      passedCases,
      failures,
    };
  }

  /**
   * Get a summary of what's available in the QT dataset.
   */
  static getSummary(): {
    totalCases: number;
    withPrograms: number;
    withModels: number;
    withPrints: number;
    caseIds: string[];
    machineTarget: string;
    programFormat: string;
  } {
    return {
      totalCases: QT_CASES.length,
      withPrograms: QT_CASES.filter(c => c.assets.hnc || c.assets.nc).length,
      withModels: QT_CASES.filter(c => c.assets.ipt).length,
      withPrints: QT_CASES.filter(c => c.assets.pdf).length,
      caseIds: QT_CASES.map(c => c.id),
      machineTarget: "Hurco VMX30i",
      programFormat: "Fanuc-compatible G-code (.hnc / .nc)",
    };
  }
}

export { QTValidationSuiteEngineImpl as QTValidationSuiteEngine };
export const qtValidationSuiteEngine = new (QTValidationSuiteEngineImpl as any)() as QTValidationSuiteEngineImpl;
