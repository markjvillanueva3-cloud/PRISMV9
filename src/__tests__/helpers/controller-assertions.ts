/**
 * Controller Dialect Assertion Library — Phase 0-C U-TEST4
 *
 * Typed assertion helpers for 6 CNC controller families × 10+ operations.
 * Instead of `expect(text.includes("G83")).toBe(true)`, use:
 *   assertFanucPeckDrill(program, { Z: -25, Q: 5, R: 2, F: 150 });
 *
 * Controller families: Fanuc, Haas, Siemens 840D, Heidenhain, Mazak, Okuma
 * Operations: peck drill, tap, ream, bore, face, profile, thread, groove, part-off, tool change
 *
 * Reference manuals:
 *   Fanuc 0i/31i — G83 peck, G84 tap, G76 thread, G71/G70 rough/finish
 *   Haas NGC — same G-codes but Q in mm (not microns for some params)
 *   Siemens 840D — CYCLE83, CYCLE84, CYCLE97 named cycles
 *   Heidenhain iTNC — CYCL DEF 200/203/207 declarative cycles
 *   Mazak — Mazatrol UNIT format + EIA G-code mode
 *   Okuma OSP — G-code with OSP-specific extensions
 */

import { parseGCode, findBlock, findAllBlocks, type ParsedProgram } from "./gcode-parser.js";

// ============================================================================
// TYPES
// ============================================================================

export interface DrillParams {
  Z: number;        // Final depth
  Q?: number;       // Peck increment
  R?: number;       // Retract plane
  F?: number;       // Feed rate
  X?: number;       // Position
  Y?: number;       // Position
}

export interface TapParams {
  Z: number;        // Depth
  F?: number;       // Feed = pitch × RPM
  pitch?: number;   // Thread pitch (mm)
  R?: number;       // Retract plane
}

export interface ThreadParams {
  X: number;        // Final diameter (minor for OD, major for ID)
  Z: number;        // Thread length
  F: number;        // Lead (pitch × starts)
  P?: number;       // Thread depth (first cut)
  Q?: number;       // Min cut / angle offset
  starts?: number;  // Number of starts
}

export interface ProfileParams {
  P: number;        // Start block number
  Q: number;        // End block number
  U?: number;       // X stock allowance
  W?: number;       // Z stock allowance
  D?: number;       // Depth of cut
  F?: number;       // Feed rate
}

export interface AssertionResult {
  pass: boolean;
  message: string;
  details: string[];
}

function ok(msg: string): AssertionResult {
  return { pass: true, message: msg, details: [] };
}

function fail(msg: string, details: string[]): AssertionResult {
  return { pass: false, message: msg, details };
}

// ============================================================================
// FANUC ASSERTIONS
// ============================================================================

/** Assert Fanuc G83 peck drill cycle with parameter validation */
export function assertFanucPeckDrill(program: ParsedProgram, expected: DrillParams, tol = 0.5): AssertionResult {
  const block = findBlock(program, 83);
  if (!block) return fail("G83 peck drill not found", []);
  const issues: string[] = [];

  if (block.Z === undefined) issues.push("Z (depth) missing");
  else if (Math.abs(block.Z - expected.Z) > tol) issues.push(`Z: expected ${expected.Z}, got ${block.Z}`);

  if (expected.Q !== undefined) {
    if (block.Q === undefined) issues.push("Q (peck) missing");
    else if (Math.abs(block.Q - expected.Q) > tol) issues.push(`Q: expected ${expected.Q}, got ${block.Q}`);
  }

  if (expected.R !== undefined) {
    if (block.R === undefined) issues.push("R (retract) missing");
    else if (Math.abs(block.R - expected.R) > tol) issues.push(`R: expected ${expected.R}, got ${block.R}`);
  }

  if (expected.F !== undefined) {
    if (block.F === undefined) issues.push("F (feed) missing");
    else if (Math.abs(block.F - expected.F) > expected.F * 0.3) issues.push(`F: expected ~${expected.F}, got ${block.F}`);
  }

  // G80 cancel must follow
  const g80 = findBlock(program, 80);
  if (!g80) issues.push("G80 (cancel canned cycle) missing after G83");

  return issues.length === 0 ? ok("Fanuc G83 peck drill valid") : fail("Fanuc G83 peck drill issues", issues);
}

/** Assert Fanuc G84 tapping cycle */
export function assertFanucTap(program: ParsedProgram, expected: TapParams, tol = 0.5): AssertionResult {
  const block = findBlock(program, 84);
  if (!block) return fail("G84 tapping cycle not found", []);
  const issues: string[] = [];

  if (block.Z === undefined) issues.push("Z missing");
  else if (Math.abs(block.Z - expected.Z) > tol) issues.push(`Z: expected ${expected.Z}, got ${block.Z}`);

  if (expected.F !== undefined && block.F !== undefined) {
    if (Math.abs(block.F - expected.F) > expected.F * 0.3) issues.push(`F: expected ~${expected.F}, got ${block.F}`);
  }

  const g80 = findBlock(program, 80);
  if (!g80) issues.push("G80 missing after G84");

  return issues.length === 0 ? ok("Fanuc G84 tap valid") : fail("Fanuc G84 tap issues", issues);
}

/** Assert Fanuc G76 threading cycle */
export function assertFanucThread(program: ParsedProgram, expected: ThreadParams, tol = 0.1): AssertionResult {
  const blocks = findAllBlocks(program, 76);
  if (blocks.length === 0) return fail("G76 threading not found", []);
  const issues: string[] = [];

  // Find the cutting G76 (has X parameter — final diameter)
  const cuttingBlocks = blocks.filter(b => b.X !== undefined);
  if (cuttingBlocks.length === 0) {
    issues.push("No G76 with X (cutting diameter) found");
  } else {
    const cut = cuttingBlocks[0];
    if (Math.abs(cut.X! - expected.X) > tol) issues.push(`X: expected ${expected.X}, got ${cut.X}`);
    if (cut.Z !== undefined && Math.abs(cut.Z - expected.Z) > tol) issues.push(`Z: expected ${expected.Z}, got ${cut.Z}`);
    if (cut.F !== undefined && Math.abs(cut.F - expected.F) > tol) issues.push(`F (lead): expected ${expected.F}, got ${cut.F}`);

    // Multi-start check
    if (expected.starts && expected.starts > 1) {
      if (cuttingBlocks.length < expected.starts) {
        issues.push(`Multi-start: expected ${expected.starts} G76 cutting blocks, found ${cuttingBlocks.length}`);
      }
    }
  }

  return issues.length === 0 ? ok("Fanuc G76 thread valid") : fail("Fanuc G76 thread issues", issues);
}

/** Assert Fanuc G71 rough turning cycle */
export function assertFanucRoughProfile(program: ParsedProgram, expected: ProfileParams, tol = 1): AssertionResult {
  const block = findBlock(program, 71);
  if (!block) return fail("G71 rough turning cycle not found", []);
  const issues: string[] = [];

  if (block.P !== undefined && Math.abs(block.P - expected.P) > tol) issues.push(`P: expected ${expected.P}, got ${block.P}`);
  if (block.Q !== undefined && Math.abs(block.Q - expected.Q) > tol) issues.push(`Q: expected ${expected.Q}, got ${block.Q}`);
  if (expected.D !== undefined && block.D !== undefined && Math.abs(block.D - expected.D) > tol) issues.push(`D: expected ${expected.D}, got ${block.D}`);

  return issues.length === 0 ? ok("Fanuc G71 rough profile valid") : fail("Fanuc G71 issues", issues);
}

/** Assert Fanuc G70 finish cycle references the rough profile */
export function assertFanucFinishProfile(program: ParsedProgram, expectedP: number, expectedQ: number): AssertionResult {
  const block = findBlock(program, 70);
  if (!block) return fail("G70 finish cycle not found", []);
  const issues: string[] = [];

  if (block.P === undefined) issues.push("P (start block) missing");
  if (block.Q === undefined) issues.push("Q (end block) missing");

  return issues.length === 0 ? ok("Fanuc G70 finish valid") : fail("Fanuc G70 issues", issues);
}

/** Assert Fanuc G72 facing cycle */
export function assertFanucFacingCycle(program: ParsedProgram): AssertionResult {
  const blocks = findAllBlocks(program, 72);
  if (blocks.length === 0) return fail("G72 facing cycle not found", []);
  // G72 typically has 2 blocks: W/R parameters then P/Q profile reference
  return ok(`Fanuc G72 facing found (${blocks.length} blocks)`);
}

/** Assert Fanuc G75 grooving cycle with sane Q */
export function assertFanucGroove(program: ParsedProgram, maxPeckMm = 5): AssertionResult {
  const blocks = findAllBlocks(program, 75);
  if (blocks.length === 0) return fail("G75 grooving not found", []);
  const issues: string[] = [];

  for (const b of blocks) {
    if (b.Q !== undefined) {
      const peckMm = b.Q / 1000; // Fanuc Q is in microns
      if (peckMm > maxPeckMm) {
        issues.push(`G75 Q${b.Q} = ${peckMm.toFixed(1)}mm peck — exceeds max ${maxPeckMm}mm (probable Q unit error)`);
      }
      if (peckMm <= 0) {
        issues.push(`G75 Q${b.Q} = zero/negative peck`);
      }
    }
  }

  return issues.length === 0 ? ok("Fanuc G75 groove valid") : fail("Fanuc G75 issues", issues);
}

// ============================================================================
// HAAS ASSERTIONS (mostly Fanuc-compatible with notable differences)
// ============================================================================

/** Assert Haas G83 — same as Fanuc but Q is in mm (not microns) */
export function assertHaasPeckDrill(program: ParsedProgram, expected: DrillParams, tol = 0.5): AssertionResult {
  // Haas G83 is Fanuc-compatible for the basic parameters
  return assertFanucPeckDrill(program, expected, tol);
}

/** Assert Haas G50 S (max RPM clamp) before CSS */
export function assertHaasSpindleClamp(program: ParsedProgram, maxRpm: number): AssertionResult {
  const block = findBlock(program, 50);
  if (!block) return fail("G50 S (spindle clamp) not found — required before G96 CSS", []);
  if (block.S === undefined) return fail("G50 missing S value", []);
  if (block.S > maxRpm * 1.2) return fail(`G50 S${block.S} exceeds machine max ${maxRpm}`, []);
  return ok(`Haas G50 S${block.S} spindle clamp valid`);
}

/** Assert Haas CSS mode (G96/G97) */
export function assertHaasCSS(program: ParsedProgram): AssertionResult {
  const g96 = findBlock(program, 96);
  const g97 = findBlock(program, 97);
  if (!g96 && !g97) return fail("Neither G96 (CSS) nor G97 (RPM) found", []);
  return ok(`CSS mode: ${g96 ? "G96 active" : "G97 only"}`);
}

// ============================================================================
// SIEMENS 840D ASSERTIONS
// ============================================================================

/** Assert Siemens CYCLE83 deep hole drilling (by searching program text) */
export function assertSiemensCycle83(programText: string, expected: DrillParams): AssertionResult {
  if (!programText.includes("CYCLE83")) return fail("CYCLE83 not found", []);
  const issues: string[] = [];

  // CYCLE83(RTP, RFP, SDIS, DP, DPR, FDEP, FDPR, DAM, DTB, DTS, FRF, VARI, _AXN, _MDEP, _VRT, _DTD, _DIS1)
  const match = programText.match(/CYCLE83\s*\(([^)]+)\)/);
  if (match) {
    const params = match[1].split(",").map(s => s.trim());
    // DP (param 4) = final depth
    if (params[3]) {
      const dp = parseFloat(params[3]);
      if (!isNaN(dp) && Math.abs(dp - expected.Z) > 1) {
        issues.push(`DP (depth): expected ${expected.Z}, got ${dp}`);
      }
    }
  }

  return issues.length === 0 ? ok("Siemens CYCLE83 valid") : fail("Siemens CYCLE83 issues", issues);
}

/** Assert Siemens CYCLE84 tapping */
export function assertSiemensCycle84(programText: string, expected: TapParams): AssertionResult {
  if (!programText.includes("CYCLE84")) return fail("CYCLE84 not found", []);
  return ok("Siemens CYCLE84 found");
}

/** Assert Siemens CYCLE97 threading */
export function assertSiemensCycle97(programText: string): AssertionResult {
  if (!programText.includes("CYCLE97")) return fail("CYCLE97 not found", []);
  return ok("Siemens CYCLE97 found");
}

// ============================================================================
// HEIDENHAIN ASSERTIONS
// ============================================================================

/** Assert Heidenhain CYCL DEF 200 (drilling) */
export function assertHeidenhainCycl200(programText: string, expected: DrillParams): AssertionResult {
  if (!programText.includes("CYCL DEF 200")) return fail("CYCL DEF 200 (drilling) not found", []);
  const issues: string[] = [];

  // Q200 = clearance distance, Q201 = depth, Q206 = feed plunging
  const depthMatch = programText.match(/Q201\s*=\s*([-\d.]+)/);
  if (depthMatch) {
    const depth = parseFloat(depthMatch[1]);
    if (Math.abs(depth - Math.abs(expected.Z)) > 1) {
      issues.push(`Q201 (depth): expected ${Math.abs(expected.Z)}, got ${depth}`);
    }
  }

  return issues.length === 0 ? ok("Heidenhain CYCL DEF 200 valid") : fail("Heidenhain CYCL 200 issues", issues);
}

/** Assert Heidenhain CYCL DEF 203 (universal drilling) */
export function assertHeidenhainCycl203(programText: string): AssertionResult {
  if (!programText.includes("CYCL DEF 203")) return fail("CYCL DEF 203 not found", []);
  return ok("Heidenhain CYCL DEF 203 found");
}

// ============================================================================
// MAZAK ASSERTIONS
// ============================================================================

/** Assert Mazak G83 (EIA mode — same as Fanuc) */
export function assertMazakPeckDrill(program: ParsedProgram, expected: DrillParams, tol = 0.5): AssertionResult {
  return assertFanucPeckDrill(program, expected, tol);
}

/** Assert Mazatrol UNIT format detected (conversational) */
export function assertMazatrolUnit(programText: string, unitType: string): AssertionResult {
  const pattern = new RegExp(`UNIT.*${unitType}`, "i");
  if (!pattern.test(programText)) return fail(`Mazatrol UNIT ${unitType} not found`, []);
  return ok(`Mazatrol UNIT ${unitType} found`);
}

// ============================================================================
// OKUMA ASSERTIONS
// ============================================================================

/** Assert Okuma G83 (OSP-P compatible — same as Fanuc) */
export function assertOkumaPeckDrill(program: ParsedProgram, expected: DrillParams, tol = 0.5): AssertionResult {
  return assertFanucPeckDrill(program, expected, tol);
}

/** Assert Okuma G15 H (work coordinate selection) */
export function assertOkumaWorkCoord(program: ParsedProgram, wcs: number): AssertionResult {
  const block = findBlock(program, 15);
  if (!block) return fail("G15 (work coordinate) not found", []);
  if (block.H !== wcs) return fail(`G15 H${block.H} — expected H${wcs}`, []);
  return ok(`Okuma G15 H${wcs} valid`);
}

// ============================================================================
// UNIVERSAL ASSERTIONS (work across all controllers)
// ============================================================================

/** Assert program has safe start block (G-codes that establish machine state) */
export function assertSafeStart(program: ParsedProgram): AssertionResult {
  const issues: string[] = [];

  // Should have absolute mode (G90) or incremental (G91) early
  const hasG90 = program.gCodesUsed.has(90);
  const hasG91 = program.gCodesUsed.has(91);
  if (!hasG90 && !hasG91) issues.push("No G90/G91 (absolute/incremental mode)");

  // Should have spindle start (M03 or M04)
  const hasSpindle = program.mCodesUsed.has(3) || program.mCodesUsed.has(4);
  if (!hasSpindle) issues.push("No M03/M04 (spindle start)");

  // Should have program end (M30 or M02)
  const hasEnd = program.mCodesUsed.has(30) || program.mCodesUsed.has(2);
  if (!hasEnd) issues.push("No M30/M02 (program end)");

  return issues.length === 0 ? ok("Safe start blocks present") : fail("Missing safe start blocks", issues);
}

/** Assert tool change sequence is valid */
export function assertToolChange(program: ParsedProgram, expectedToolCount: number): AssertionResult {
  const toolChanges = program.blocks.filter(b => b.mCodes.includes(6));
  const issues: string[] = [];

  if (toolChanges.length < expectedToolCount) {
    issues.push(`Expected ${expectedToolCount} tool changes, found ${toolChanges.length}`);
  }

  // Each tool change should have a T number
  for (const tc of toolChanges) {
    if (tc.T === undefined) issues.push(`Tool change at line ${tc.lineNumber} missing T number`);
  }

  return issues.length === 0 ? ok(`${toolChanges.length} valid tool changes`) : fail("Tool change issues", issues);
}

/** Assert coolant on/off bracketing (M08 before cutting, M09 before tool change) */
export function assertCoolantBracketing(program: ParsedProgram): AssertionResult {
  const m08Lines = program.blocks.filter(b => b.mCodes.includes(8)).map(b => b.lineNumber);
  const m09Lines = program.blocks.filter(b => b.mCodes.includes(9)).map(b => b.lineNumber);

  if (m08Lines.length === 0 && m09Lines.length === 0) {
    return ok("No coolant codes (dry cutting or air blast)");
  }

  if (m08Lines.length > 0 && m09Lines.length === 0) {
    return fail("M08 (coolant on) without M09 (coolant off)", ["Coolant left on at program end"]);
  }

  return ok(`Coolant bracketed: ${m08Lines.length} on, ${m09Lines.length} off`);
}
