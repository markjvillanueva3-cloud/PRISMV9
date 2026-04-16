/**
 * PRISM MCP Server — G-Code Validation Engine
 *
 * Full G-code validation with modal state tracking, arc geometry validation,
 * machine envelope checking, G/M-code support per controller (FANUC/HAAS/MAZAK),
 * motion optimization, and G-code compression.
 *
 * Ported from POST_PROCESSOR_100_PERCENT.js + PRISM_POST_OPTIMIZER.js (monolith R2.3.1).
 *
 * @module GCodeValidationEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ModalState {
  motionMode: number;
  plane: number;
  units: number;
  positioning: number;
  feedRateMode: number;
  workOffset: number;
  lengthComp: number | null;
  cutterComp: number;
  cycleMode: number;
  spindleOn: boolean;
  spindleDir: "CW" | "CCW" | null;
  spindleSpeed: number;
  coolantOn: boolean;
  feedRate: number;
  currentTool: number;
  toolLengthOffset: number;
}

export interface ValidationIssue {
  line: number;
  code: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  statistics: {
    totalLines: number;
    codeLines: number;
    comments: number;
    gCodes: Record<string, number>;
    mCodes: Record<string, number>;
    toolChanges: number;
    movements: { rapid: number; linear: number; arcCW: number; arcCCW: number };
  };
  modalState: ModalState;
}

export interface EnvelopeResult {
  valid: boolean;
  violations: Array<{
    line: number;
    axis: string;
    value: number;
    message: string;
  }>;
  maxExtents: { x: number; y: number; z: number };
  minExtents: { x: number; y: number; z: number };
}

export interface MachineEnvelope {
  xMin: number; xMax: number;
  yMin: number; yMax: number;
  zMin: number; zMax: number;
  aMin?: number; aMax?: number;
  cMin?: number; cMax?: number;
  cContinuous?: boolean;
}

export interface OptimizeResult {
  gcode: string;
  stats: { originalLines: number; removedRedundant: number; rapidsOptimized: number };
  reduction: string;
}

export interface CompressResult {
  gcode: string;
  originalSize: number;
  compressedSize: number;
  compression: string;
}

export type Controller = "FANUC" | "HAAS" | "MAZAK";

// ============================================================================
// PARSED LINE
// ============================================================================

interface ParsedLine {
  lineNum: number;
  raw: string;
  gCodes: number[];
  mCodes: number[];
  X: number | null; Y: number | null; Z: number | null;
  A: number | null; B: number | null; C: number | null;
  I: number | null; J: number | null; K: number | null;
  R: number | null; F: number | null; S: number | null;
  T: number | null; H: number | null;
}

// ============================================================================
// CONTROLLER CODE TABLES
// ============================================================================

const VALID_G: Record<Controller, number[]> = {
  FANUC: [0,1,2,3,4,10,17,18,19,20,21,22,23,27,28,29,30,31,32,40,41,42,43,43.4,44,49,50,51,52,53,54,55,56,57,58,59,65,68,68.2,73,74,76,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99],
  HAAS: [0,1,2,3,4,10,12,13,17,18,19,20,21,28,29,31,32,35,40,41,42,43,43.4,44,47,49,50,51,52,53,54,55,56,57,58,59,60,61,65,68,73,74,76,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,98,99,100,103,107,110,111,112,113,114,129,136,141,143,150,154,184,187,234],
  MAZAK: [0,1,2,3,4,5,10,17,18,19,20,21,22,23,27,28,29,30,31,40,41,42,43,43.4,44,49,50,51,52,53,54,55,56,57,58,59,61,64,65,68,73,74,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99],
};

const VALID_M: Record<Controller, number[]> = {
  FANUC: [0,1,2,3,4,5,6,7,8,9,19,29,30,48,49,98,99],
  HAAS: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,19,21,22,23,24,25,26,29,30,31,34,36,39,41,42,50,51,52,53,59,75,76,77,78,79,80,82,83,84,85,86,88,89,95,96,97,98,99],
  MAZAK: [0,1,2,3,4,5,6,7,8,9,19,29,30,48,49,50,51,98,99],
};

// ============================================================================
// PARSER
// ============================================================================

function parseLine(line: string, lineNum: number): ParsedLine {
  const clean = line.replace(/\([^)]*\)/g, "").replace(/;.*/g, "").trim();
  const result: ParsedLine = {
    lineNum, raw: line,
    gCodes: [], mCodes: [],
    X: null, Y: null, Z: null,
    A: null, B: null, C: null,
    I: null, J: null, K: null,
    R: null, F: null, S: null,
    T: null, H: null,
  };

  const gMatches = clean.match(/G(\d+\.?\d*)/g);
  if (gMatches) result.gCodes = gMatches.map(g => parseFloat(g.substring(1)));

  const mMatches = clean.match(/M(\d+)/g);
  if (mMatches) result.mCodes = mMatches.map(m => parseInt(m.substring(1)));

  for (const c of ["X","Y","Z","A","B","C","I","J","K","R","F","S","T","H"] as const) {
    const m = clean.match(new RegExp(c + "([+-]?\\d*\\.?\\d+)"));
    if (m) result[c] = parseFloat(m[1]);
  }
  return result;
}

// ============================================================================
// ENGINE
// ============================================================================

class GCodeValidationEngineImpl {

  validate(gcode: string, controller: Controller = "FANUC"): ValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const stats = {
      totalLines: 0, codeLines: 0, comments: 0,
      gCodes: {} as Record<string, number>,
      mCodes: {} as Record<string, number>,
      toolChanges: 0,
      movements: { rapid: 0, linear: 0, arcCW: 0, arcCCW: 0 },
    };
    const modal = this._initModal();
    let lastX = 0, lastY = 0, lastZ = 0;

    for (const line of gcode.split("\n")) {
      stats.totalLines++;
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("(") || trimmed.startsWith(";")) {
        stats.comments++;
        continue;
      }
      stats.codeLines++;

      const parsed = parseLine(trimmed, stats.totalLines);
      this._updateModal(modal, parsed);
      this._validateGCodes(parsed, controller, errors, warnings);
      this._validateMCodes(parsed, controller, warnings);
      this._validateCoords(parsed, modal, errors, lastX, lastY, lastZ);

      if (parsed.gCodes.includes(2) || parsed.gCodes.includes(3)) {
        this._validateArc(parsed, errors, warnings, lastX, lastY);
      }
      this._validateFeed(parsed, modal, errors, warnings);
      this._validateSpindle(parsed, modal, warnings);
      this._updateStats(parsed, stats);

      if (parsed.X !== null) lastX = parsed.X;
      if (parsed.Y !== null) lastY = parsed.Y;
      if (parsed.Z !== null) lastZ = parsed.Z;
    }

    this._finalChecks(modal, stats.totalLines, warnings);

    return {
      valid: errors.length === 0,
      errors, warnings, statistics: stats, modalState: modal,
    };
  }

  validateEnvelope(
    gcode: string,
    envelope?: MachineEnvelope,
  ): EnvelopeResult {
    const env = envelope ?? {
      xMin: 0, xMax: 762, yMin: 0, yMax: 406, zMin: -508, zMax: 0,
    };
    const violations: EnvelopeResult["violations"] = [];
    const maxE = { x: -Infinity, y: -Infinity, z: -Infinity };
    const minE = { x: Infinity, y: Infinity, z: Infinity };
    let x = 0, y = 0, z = 0, incremental = false, lineNum = 0;

    for (const line of gcode.split("\n")) {
      lineNum++;
      const t = line.trim();
      if (!t || t.startsWith("(") || t.startsWith(";")) continue;
      if (t.includes("G91")) incremental = true;
      if (t.includes("G90")) incremental = false;

      const xM = t.match(/X([+-]?\d*\.?\d+)/);
      const yM = t.match(/Y([+-]?\d*\.?\d+)/);
      const zM = t.match(/Z([+-]?\d*\.?\d+)/);

      if (xM) x = incremental ? x + parseFloat(xM[1]) : parseFloat(xM[1]);
      if (yM) y = incremental ? y + parseFloat(yM[1]) : parseFloat(yM[1]);
      if (zM) z = incremental ? z + parseFloat(zM[1]) : parseFloat(zM[1]);

      maxE.x = Math.max(maxE.x, x); maxE.y = Math.max(maxE.y, y); maxE.z = Math.max(maxE.z, z);
      minE.x = Math.min(minE.x, x); minE.y = Math.min(minE.y, y); minE.z = Math.min(minE.z, z);

      for (const [axis, val, min, max] of [
        ["X", x, env.xMin, env.xMax],
        ["Y", y, env.yMin, env.yMax],
        ["Z", z, env.zMin, env.zMax],
      ] as [string, number, number, number][]) {
        if (val < min || val > max) {
          violations.push({
            line: lineNum, axis, value: val,
            message: `${axis}=${val} exceeds travel (${min} to ${max})`,
          });
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations,
      maxExtents: maxE,
      minExtents: minE,
    };
  }

  optimizeMotion(gcode: string): OptimizeResult {
    let lines = gcode.split("\n");
    const originalLines = lines.length;

    // Remove redundant moves
    const filtered: string[] = [];
    let lastCoord = "";
    let removedRedundant = 0;
    for (const line of lines) {
      const u = line.toUpperCase().trim();
      const gMatch = u.match(/G0[01]/);
      const coords = u.replace(/G0[01]\s*/, "").trim();
      if (gMatch && coords === lastCoord && coords !== "") {
        removedRedundant++;
        continue;
      }
      if (gMatch) lastCoord = coords;
      filtered.push(line);
    }
    lines = filtered;

    // Combine consecutive rapids
    const result: string[] = [];
    let rapidBuf: string[] = [];
    let rapidsOptimized = 0;

    const flushRapids = () => {
      if (rapidBuf.length > 1) {
        let fX: string | null = null;
        let fY: string | null = null;
        let fZ: string | null = null;
        for (const r of rapidBuf) {
          const u = r.toUpperCase();
          const xM = u.match(/X(-?\d+\.?\d*)/);
          const yM = u.match(/Y(-?\d+\.?\d*)/);
          const zM = u.match(/Z(-?\d+\.?\d*)/);
          if (xM) fX = xM[1]; if (yM) fY = yM[1]; if (zM) fZ = zM[1];
        }
        let combined = "G00";
        if (fX !== null) combined += " X" + fX;
        if (fY !== null) combined += " Y" + fY;
        if (fZ !== null) combined += " Z" + fZ;
        result.push(combined);
        rapidsOptimized += rapidBuf.length - 1;
      } else if (rapidBuf.length === 1) {
        result.push(rapidBuf[0]);
      }
      rapidBuf = [];
    };

    for (const line of lines) {
      const u = line.toUpperCase().trim();
      if (u.startsWith("G00") || u.startsWith("G0 ")) {
        rapidBuf.push(line);
      } else {
        flushRapids();
        result.push(line);
      }
    }
    flushRapids();

    const finalLines = result.length;
    const reduction = originalLines > 0
      ? ((originalLines - finalLines) / originalLines * 100).toFixed(1) + "%" : "0.0%";

    return {
      gcode: result.join("\n"),
      stats: { originalLines, removedRedundant, rapidsOptimized },
      reduction,
    };
  }

  compress(
    gcode: string,
    options: {
      removeComments?: boolean;
      removeWhitespace?: boolean;
      removeBlockNumbers?: boolean;
      precision?: number;
    } = {},
  ): CompressResult {
    const {
      removeComments = false,
      removeWhitespace = true,
      removeBlockNumbers = false,
      precision = 4,
    } = options;

    const compressed: string[] = [];
    for (let line of gcode.split("\n")) {
      if (removeComments) line = line.replace(/\(.*?\)/g, "").replace(/;.*$/, "");
      if (removeWhitespace) line = line.trim().replace(/\s+/g, " ");
      if (removeBlockNumbers) line = line.replace(/^N\d+\s*/i, "");
      line = line.replace(
        /([XYZABC])(-?\d+\.\d{5,})/gi,
        (_m, a, n) => a + parseFloat(n).toFixed(precision),
      );
      if (line.trim()) compressed.push(line);
    }

    const result = compressed.join("\n");
    const comp = gcode.length > 0
      ? ((1 - result.length / gcode.length) * 100).toFixed(1) + "%" : "0.0%";

    return {
      gcode: result,
      originalSize: gcode.length,
      compressedSize: result.length,
      compression: comp,
    };
  }

  analyzeProgram(gcode: string): {
    metrics: Record<string, number>;
    suggestions: Array<{ type: string; message: string; impact: string }>;
    score: number;
  } {
    const lines = gcode.split("\n");
    const m = {
      totalLines: lines.length, rapidMoves: 0, linearMoves: 0,
      arcMoves: 0, comments: 0, consecutiveRapids: 0,
    };
    let lastRapid = false;

    for (const line of lines) {
      const u = line.toUpperCase().trim();
      if (u.startsWith("G00") || u.startsWith("G0 ")) {
        m.rapidMoves++;
        if (lastRapid) m.consecutiveRapids++;
        lastRapid = true;
      } else {
        lastRapid = false;
      }
      if (u.startsWith("G01") || u.startsWith("G1 ")) m.linearMoves++;
      if (/^G0?[23]\b/.test(u)) m.arcMoves++;
      if (u.includes("(") || u.startsWith(";")) m.comments++;
    }

    const suggestions: Array<{ type: string; message: string; impact: string }> = [];
    if (m.consecutiveRapids > 10) {
      suggestions.push({
        type: "rapid_opt",
        message: `${m.consecutiveRapids} consecutive rapids could be combined`,
        impact: "medium",
      });
    }
    if (m.arcMoves < m.linearMoves * 0.05 && m.linearMoves > 100) {
      suggestions.push({
        type: "arc_fitting",
        message: "Many linear moves could be replaced with arcs",
        impact: "high",
      });
    }

    const score = Math.max(0,
      100
      - (m.consecutiveRapids > 10 ? 5 : 0)
      - (m.arcMoves < m.linearMoves * 0.05 && m.linearMoves > 100 ? 10 : 0),
    );

    return { metrics: m, suggestions, score };
  }

  // ── Private helpers ──

  private _initModal(): ModalState {
    return {
      motionMode: 0, plane: 17, units: 21, positioning: 90,
      feedRateMode: 94, workOffset: 54, lengthComp: null,
      cutterComp: 40, cycleMode: 80, spindleOn: false,
      spindleDir: null, spindleSpeed: 0, coolantOn: false,
      feedRate: 0, currentTool: 0, toolLengthOffset: 0,
    };
  }

  private _updateModal(modal: ModalState, p: ParsedLine): void {
    for (const g of p.gCodes) {
      if ([0,1,2,3].includes(g)) modal.motionMode = g;
      else if ([17,18,19].includes(g)) modal.plane = g;
      else if ([20,21].includes(g)) modal.units = g;
      else if ([90,91].includes(g)) modal.positioning = g;
      else if ([94,95].includes(g)) modal.feedRateMode = g;
      else if (g >= 54 && g <= 59) modal.workOffset = g;
      else if ([43,44,49].includes(g)) modal.lengthComp = g === 49 ? null : g;
      else if ([40,41,42].includes(g)) modal.cutterComp = g;
      else if (g >= 80 && g <= 89) modal.cycleMode = g;
    }
    for (const m of p.mCodes) {
      if (m === 3) { modal.spindleOn = true; modal.spindleDir = "CW"; }
      else if (m === 4) { modal.spindleOn = true; modal.spindleDir = "CCW"; }
      else if (m === 5) { modal.spindleOn = false; modal.spindleDir = null; }
      else if ([7,8,50,51,88].includes(m)) modal.coolantOn = true;
      else if (m === 9) modal.coolantOn = false;
      else if (m === 6 && p.T !== null) modal.currentTool = p.T;
    }
    if (p.F !== null) modal.feedRate = p.F;
    if (p.S !== null) modal.spindleSpeed = p.S;
    if (p.H !== null) modal.toolLengthOffset = p.H;
  }

  private _validateGCodes(
    p: ParsedLine, ctrl: Controller,
    errors: ValidationIssue[], warnings: ValidationIssue[],
  ): void {
    const valid = VALID_G[ctrl] ?? VALID_G.FANUC;
    for (const g of p.gCodes) {
      if (!valid.includes(g)) {
        warnings.push({
          line: p.lineNum, code: "UNSUPPORTED_GCODE",
          message: `G${g} may not be supported on ${ctrl}`,
          severity: "warning",
        });
      }
    }
  }

  private _validateMCodes(
    p: ParsedLine, ctrl: Controller, warnings: ValidationIssue[],
  ): void {
    const valid = VALID_M[ctrl] ?? VALID_M.FANUC;
    for (const m of p.mCodes) {
      if (!valid.includes(m)) {
        warnings.push({
          line: p.lineNum, code: "UNSUPPORTED_MCODE",
          message: `M${m} may not be supported on ${ctrl}`,
          severity: "warning",
        });
      }
    }
  }

  private _validateCoords(
    p: ParsedLine, modal: ModalState,
    errors: ValidationIssue[],
    _lastX: number, _lastY: number, lastZ: number,
  ): void {
    if (p.Z !== null && p.Z < lastZ
      && modal.motionMode === 1 && modal.feedRate <= 0) {
      errors.push({
        line: p.lineNum, code: "PLUNGE_NO_FEED",
        message: "Z plunge (G01) without feed rate set",
        severity: "error",
      });
    }
  }

  private _validateArc(
    p: ParsedLine, errors: ValidationIssue[],
    warnings: ValidationIssue[],
    lastX: number, lastY: number,
  ): void {
    const isG02 = p.gCodes.includes(2);
    const hasIJ = p.I !== null || p.J !== null;
    const hasR = p.R !== null;
    const hasEndpoint = p.X !== null || p.Y !== null;

    if (!hasIJ && !hasR) {
      errors.push({
        line: p.lineNum, code: "ARC_NO_CENTER",
        message: `${isG02 ? "G02" : "G03"} arc without center (I/J) or radius (R)`,
        severity: "error",
      });
      return;
    }

    if (!hasEndpoint) {
      warnings.push({
        line: p.lineNum, code: "ARC_NO_ENDPOINT",
        message: "Arc without explicit endpoint (full circle assumed)",
        severity: "warning",
      });
    }

    if (hasIJ && hasEndpoint) {
      const endX = p.X ?? lastX;
      const endY = p.Y ?? lastY;
      const cx = lastX + (p.I ?? 0);
      const cy = lastY + (p.J ?? 0);
      const startR = Math.sqrt((lastX - cx) ** 2 + (lastY - cy) ** 2);
      const endR = Math.sqrt((endX - cx) ** 2 + (endY - cy) ** 2);

      if (Math.abs(startR - endR) > 0.001) {
        errors.push({
          line: p.lineNum, code: "ARC_RADIUS_MISMATCH",
          message: `Arc start radius (${startR.toFixed(4)}) != end radius (${endR.toFixed(4)})`,
          severity: "error",
        });
      }
      if (startR < 0.0001) {
        errors.push({
          line: p.lineNum, code: "ARC_ZERO_RADIUS",
          message: "Arc has zero or near-zero radius",
          severity: "error",
        });
      }
    }

    if (hasR) {
      if (p.R === 0) {
        errors.push({
          line: p.lineNum, code: "ARC_ZERO_R",
          message: "Arc with R=0 is invalid",
          severity: "error",
        });
      }
      if (hasEndpoint) {
        const endX = p.X ?? lastX;
        const endY = p.Y ?? lastY;
        const chord = Math.sqrt((endX - lastX) ** 2 + (endY - lastY) ** 2);
        if (Math.abs(p.R!) < chord / 2) {
          errors.push({
            line: p.lineNum, code: "ARC_R_TOO_SMALL",
            message: `Arc radius R=${p.R} too small for chord ${chord.toFixed(3)}`,
            severity: "error",
          });
        }
      }
    }
  }

  private _validateFeed(
    p: ParsedLine, modal: ModalState,
    errors: ValidationIssue[], warnings: ValidationIssue[],
  ): void {
    if ([1,2,3].includes(modal.motionMode)) {
      if (modal.feedRate <= 0 && (p.X !== null || p.Y !== null || p.Z !== null)) {
        errors.push({
          line: p.lineNum, code: "NO_FEED_RATE",
          message: `Cutting motion (G0${modal.motionMode}) without feed rate`,
          severity: "error",
        });
      }
      if (modal.feedRate > 50000) {
        warnings.push({
          line: p.lineNum, code: "HIGH_FEED_RATE",
          message: `Very high feed rate: F${modal.feedRate}`,
          severity: "warning",
        });
      }
    }
  }

  private _validateSpindle(
    p: ParsedLine, modal: ModalState, warnings: ValidationIssue[],
  ): void {
    if ([1,2,3].includes(modal.motionMode) && !modal.spindleOn
      && (p.X !== null || p.Y !== null)) {
      warnings.push({
        line: p.lineNum, code: "CUTTING_NO_SPINDLE",
        message: "XY cutting motion without spindle running",
        severity: "warning",
      });
    }
    if (modal.spindleSpeed > 40000) {
      warnings.push({
        line: p.lineNum, code: "HIGH_SPINDLE_SPEED",
        message: `Very high spindle speed: S${modal.spindleSpeed}`,
        severity: "warning",
      });
    }
    if (modal.spindleSpeed > 0 && modal.spindleSpeed < 100 && modal.spindleOn) {
      warnings.push({
        line: p.lineNum, code: "LOW_SPINDLE_SPEED",
        message: `Very low spindle speed: S${modal.spindleSpeed}`,
        severity: "warning",
      });
    }
  }

  private _updateStats(
    p: ParsedLine,
    stats: ValidationResult["statistics"],
  ): void {
    for (const g of p.gCodes) {
      const key = "G" + g;
      stats.gCodes[key] = (stats.gCodes[key] ?? 0) + 1;
      if (g === 0) stats.movements.rapid++;
      else if (g === 1) stats.movements.linear++;
      else if (g === 2) stats.movements.arcCW++;
      else if (g === 3) stats.movements.arcCCW++;
    }
    for (const m of p.mCodes) {
      const key = "M" + m;
      stats.mCodes[key] = (stats.mCodes[key] ?? 0) + 1;
      if (m === 6) stats.toolChanges++;
    }
  }

  private _finalChecks(
    modal: ModalState, totalLines: number, warnings: ValidationIssue[],
  ): void {
    if (modal.spindleOn) {
      warnings.push({
        line: totalLines, code: "SPINDLE_LEFT_ON",
        message: "Program ended with spindle still running",
        severity: "warning",
      });
    }
    if (modal.coolantOn) {
      warnings.push({
        line: totalLines, code: "COOLANT_LEFT_ON",
        message: "Program ended with coolant still on",
        severity: "warning",
      });
    }
    if (modal.cutterComp !== 40) {
      warnings.push({
        line: totalLines, code: "CUTTER_COMP_ACTIVE",
        message: "Program ended with cutter compensation still active",
        severity: "warning",
      });
    }
  }
}

export const gcodeValidationEngine = new GCodeValidationEngineImpl();
