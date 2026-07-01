/**
 * G-Code Comparator — PPG Test Infrastructure (Part A1)
 *
 * Canonical normalization and comparison utilities for PPG tests.
 * Builds on gcode-parser.ts (structural parsing) with string-level
 * normalization and property-based validation.
 *
 * Used by ALL PPG test files for consistent G-code comparison.
 */

import { expect } from "vitest";
import { parseGCode, type ParsedProgram, type GCodeBlock } from "./gcode-parser.js";

// ============================================================================
// NORMALIZATION
// ============================================================================

/**
 * Normalize G-code for structural comparison.
 * Strips comments, N-numbers, whitespace, blank lines, EOL chars.
 * Preserves: G/M codes, coordinates, S/F values, tool numbers.
 */
export function normalizeGcode(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(line => line
      .replace(/\(.*?\)/g, "")        // strip () comments (Fanuc/Haas)
      .replace(/;.*$/g, "")           // strip ; comments (Siemens/Heidenhain)
      .replace(/^\s*N\d+\s*/g, "")    // strip N-line numbers
      .replace(/\s+/g, " ")           // collapse whitespace
      .trim()
      .toUpperCase())
    .filter(line => line.length > 0 && line !== "%")
    .join("\n");
}

// ============================================================================
// COMPARISON ASSERTIONS
// ============================================================================

/**
 * Structural G-code comparison — ignores comments, N-numbers, whitespace, EOL.
 * Throws vitest assertion on mismatch with diff context.
 */
export function assertGcodeEqual(actual: string, expected: string): void {
  const normActual = normalizeGcode(actual);
  const normExpected = normalizeGcode(expected);
  if (normActual !== normExpected) {
    const actualLines = normActual.split("\n");
    const expectedLines = normExpected.split("\n");
    const diffs: string[] = [];
    const maxLen = Math.max(actualLines.length, expectedLines.length);
    for (let i = 0; i < maxLen && diffs.length < 10; i++) {
      const a = actualLines[i] ?? "(missing)";
      const e = expectedLines[i] ?? "(missing)";
      if (a !== e) diffs.push(`  line ${i + 1}: actual="${a}" expected="${e}"`);
    }
    throw new Error(
      `G-code mismatch (${diffs.length} differences):\n${diffs.join("\n")}`,
    );
  }
}

// ============================================================================
// PROPERTY-BASED VALIDATION
// ============================================================================

/** Every numeric field on every block must be finite (no NaN, no Infinity). */
export function assertNoNaN(blocks: GCodeBlock[]): void {
  for (const block of blocks) {
    if (block.S !== undefined) expect(Number.isFinite(block.S)).toBe(true);
    if (block.F !== undefined) expect(Number.isFinite(block.F)).toBe(true);
    if (block.X !== undefined) expect(Number.isFinite(block.X)).toBe(true);
    if (block.Y !== undefined) expect(Number.isFinite(block.Y)).toBe(true);
    if (block.Z !== undefined) expect(Number.isFinite(block.Z)).toBe(true);
    if (block.A !== undefined) expect(Number.isFinite(block.A)).toBe(true);
    if (block.B !== undefined) expect(Number.isFinite(block.B)).toBe(true);
    if (block.C !== undefined) expect(Number.isFinite(block.C)).toBe(true);
    if (block.I !== undefined) expect(Number.isFinite(block.I)).toBe(true);
    if (block.J !== undefined) expect(Number.isFinite(block.J)).toBe(true);
    if (block.K !== undefined) expect(Number.isFinite(block.K)).toBe(true);
    if (block.R !== undefined) expect(Number.isFinite(block.R)).toBe(true);
  }
}

/** Machine limit validation — S and F within machine envelope. */
export interface MachineConfig {
  max_rpm: number;
  max_feed: number;
  max_power_kw?: number;
  travel?: [number, number, number]; // X, Y, Z
}

export function assertWithinLimits(blocks: GCodeBlock[], machine: MachineConfig): void {
  for (const block of blocks) {
    if (block.S !== undefined && block.S > 0) {
      expect(block.S).toBeLessThanOrEqual(machine.max_rpm);
    }
    if (block.F !== undefined && block.F > 0) {
      // Only check cutting feeds (skip rapid, inverse time, and per-rev modes)
      const isRapid = block.gCodes.includes(0);
      const isInverseTime = block.gCodes.includes(93);
      const isFeedPerRev = block.gCodes.includes(95) || block.gCodes.includes(99);
      if (!isRapid && !isInverseTime && !isFeedPerRev) {
        expect(block.F).toBeLessThanOrEqual(machine.max_feed);
      }
    }
    // Travel limits
    if (machine.travel) {
      if (block.X !== undefined) expect(Math.abs(block.X)).toBeLessThanOrEqual(machine.travel[0]);
      if (block.Y !== undefined) expect(Math.abs(block.Y)).toBeLessThanOrEqual(machine.travel[1]);
      if (block.Z !== undefined) expect(Math.abs(block.Z)).toBeLessThanOrEqual(machine.travel[2]);
    }
  }
}

// ============================================================================
// FEED FORMAT VALIDATION
// ============================================================================

/**
 * Assert milling feeds are integers (no decimal point).
 * Skips tapping (G84), feed-per-rev (G95/G99), and inverse time (G93) lines.
 * Milling convention: F80 not F80.000 — cleaner, avoids confusion.
 */
export function assertMillingFeedInteger(output: string): void {
  const lines = output.split("\n");
  const violations: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim().toUpperCase();
    // Skip non-motion, tapping, and special feed modes
    if (!/F\d/.test(trimmed)) continue;
    if (/G84|G95|G93|G99/.test(trimmed)) continue;
    // Check: F followed by digits, NO decimal
    const fMatch = trimmed.match(/F(\d+\.\d+)/);
    if (fMatch) {
      violations.push(`${trimmed} — F${fMatch[1]} has decimal (expected integer)`);
    }
  }
  if (violations.length > 0) {
    throw new Error(
      `Milling feed format violations (${violations.length}):\n${violations.slice(0, 5).join("\n")}`,
    );
  }
}

/**
 * Assert tapping feeds have correct decimal precision.
 * Inch: 4 decimals (F0.0500). Metric: 3 decimals (F1.000).
 * This is critical — wrong tapping feed = broken tap.
 */
export function assertTappingFeedPrecise(output: string, unit: "inch" | "mm"): void {
  const lines = output.split("\n");
  const tapLines = lines.filter(l => /G84/i.test(l) && /F/i.test(l));
  const decimals = unit === "inch" ? 4 : 3;
  for (const line of tapLines) {
    const fMatch = line.match(/F(\d+\.\d+)/i);
    if (!fMatch) {
      throw new Error(`Tapping line missing precise F: ${line.trim()}`);
    }
    const parts = fMatch[1].split(".");
    if (parts[1].length < decimals) {
      throw new Error(
        `Tapping F${fMatch[1]} needs ${decimals} decimals, has ${parts[1].length}: ${line.trim()}`,
      );
    }
  }
}

// ============================================================================
// STRUCTURAL VALIDATION
// ============================================================================

/** Controller-specific safe start block patterns */
const SAFE_START_PATTERNS: Record<string, RegExp> = {
  haas_ngc:     /G90.*G(21|20).*G17.*G40.*G80.*G49/,
  fanuc_31i:    /G90.*G(21|20).*G17.*G40.*G80.*G49/,
  fanuc_0i:     /G90.*G(21|20).*G17.*G40.*G80.*G49/,
  siemens_840d: /G90.*G(71|70).*G17.*G40/,
  heidenhain_tnc: /BEGIN PGM/i,
  mazak_smooth: /G90.*G(21|20).*G17.*G40.*G80/,
  okuma_osp:    /G90.*G(21|20).*G17.*G40.*G80/,
};

/** Assert safe start block is present and matches controller dialect. */
export function assertSafeStartPresent(output: string, controllerId?: string): void {
  const normalized = normalizeGcode(output);
  const lines = normalized.split("\n").slice(0, 10); // check first 10 lines
  const header = lines.join(" ");

  if (controllerId && SAFE_START_PATTERNS[controllerId]) {
    expect(SAFE_START_PATTERNS[controllerId].test(header)).toBe(true);
    return;
  }
  // Generic: must have G90 in first 10 lines
  expect(/G90/.test(header)).toBe(true);
}

/** Assert program has a proper ending (M30, M02, or END PGM). */
export function assertProgramEndPresent(output: string, controllerId?: string): void {
  const trimmed = output.trimEnd();
  const lastLines = trimmed.split("\n").slice(-5).join("\n").toUpperCase();

  if (controllerId?.startsWith("heidenhain")) {
    expect(/END PGM/.test(lastLines)).toBe(true);
    return;
  }
  expect(/M30|M02/.test(lastLines)).toBe(true);
}

// ============================================================================
// CONVENIENCE: PARSE + VALIDATE
// ============================================================================

/** Parse and run all standard PPG validations at once. */
export function validatePPGOutput(
  output: string,
  machine: MachineConfig,
  controllerId?: string,
): { program: ParsedProgram; violations: string[] } {
  const program = parseGCode(output);
  const violations: string[] = [];

  // NaN check
  for (const block of program.blocks) {
    for (const field of ["S", "F", "X", "Y", "Z", "A", "B", "C"] as const) {
      const val = block[field];
      if (val !== undefined && !Number.isFinite(val)) {
        violations.push(`Line ${block.lineNumber}: ${field}=${val} is NaN/Infinity`);
      }
    }
  }

  // Machine limits
  for (const block of program.blocks) {
    if (block.S !== undefined && block.S > machine.max_rpm) {
      violations.push(`Line ${block.lineNumber}: S${block.S} exceeds max RPM ${machine.max_rpm}`);
    }
    if (block.F !== undefined && block.F > machine.max_feed && !block.gCodes.includes(0)) {
      violations.push(`Line ${block.lineNumber}: F${block.F} exceeds max feed ${machine.max_feed}`);
    }
  }

  return { program, violations };
}
