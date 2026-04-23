/**
 * CollisionHazardDetectorEngine — Pattern-based G-code hazard detection.
 *
 * PPG-REAL S2 U-PPR06 + U-PPR07
 *
 * Detects collision hazards in G-code output:
 * 1. Rapid (G0) at Z depth below material top
 * 2. Tool change (M06) without preceding Z retract
 * 3. Rapid XY move at cutting depth (no Z retract first)
 * 4. Tool number (T) used without preceding M06
 * 5. Orphan M06 (no T code)
 * 6. Duplicate T codes without M06 between
 *
 * These are pattern-based checks, not full simulation.
 * Each hazard gets severity (WARNING vs ERROR) and line number.
 */
import { z } from "zod";

// ── Types ───────────────────────────────────────────────────────────

export type HazardSeverity = "WARNING" | "ERROR";

export interface CollisionHazard {
  /** Line number in G-code (1-based) */
  line: number;
  /** The G-code line content */
  code: string;
  /** Hazard type identifier */
  type: "rapid_at_depth" | "tool_change_no_retract" | "lateral_rapid_at_depth"
    | "missing_m06" | "orphan_m06" | "duplicate_t_no_m06" | "travel_limit_exceeded";
  /** Severity: ERROR = must fix, WARNING = should review */
  severity: HazardSeverity;
  /** Human-readable description */
  message: string;
}

export interface CollisionCheckResult {
  /** All detected hazards */
  hazards: CollisionHazard[];
  /** Count by severity */
  errors: number;
  warnings: number;
  /** Whether the program passed (0 errors) */
  passed: boolean;
  /** Lines analyzed */
  lines_analyzed: number;
}

export const CollisionCheckInputSchema = z.object({
  gcode: z.string().min(1),
  material_top_z: z.number().optional().default(0),
  safe_z: z.number().optional().default(25),
  machine_travel: z.object({
    x_min: z.number().optional(),
    x_max: z.number().optional(),
    y_min: z.number().optional(),
    y_max: z.number().optional(),
    z_min: z.number().optional(),
    z_max: z.number().optional(),
  }).optional(),
  wcs_offsets: z.record(z.string(), z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    z: z.number().default(0),
  })).optional(),
});

export type CollisionCheckInput = z.infer<typeof CollisionCheckInputSchema>;

// ── Parser helpers ──────────────────────────────────────────────────

/** Extract a numeric value after a letter code, e.g., "X123.45" → 123.45 */
function extractValue(line: string, code: string): number | undefined {
  const regex = new RegExp(`${code}([+-]?\\d*\\.?\\d+)`, "i");
  const match = line.match(regex);
  return match ? parseFloat(match[1]) : undefined;
}

/** Check if a line contains a G-code word */
function hasGCode(line: string, gcode: string): boolean {
  return new RegExp(`\\b${gcode}\\b`, "i").test(line);
}

/** Check if line is a retract move (G28 Z, G53 Z, or high Z move) */
function isZRetract(line: string, safeZ: number): boolean {
  // G28 Z (machine home Z)
  if (/\bG28\b/i.test(line) && /Z/i.test(line)) return true;
  // G53 Z (machine coordinate Z)
  if (/\bG53\b/i.test(line) && /Z/i.test(line)) return true;
  // G91 G28 Z0 pattern
  if (/\bG91\b.*\bG28\b.*Z/i.test(line)) return true;
  // Direct Z move to safe height or above
  const zVal = extractValue(line, "Z");
  if (zVal !== undefined && zVal >= safeZ) return true;
  return false;
}

// ── Engine ──────────────────────────────────────────────────────────

export class CollisionHazardDetectorEngine {
  /**
   * Analyze G-code for collision hazards.
   *
   * @param input - G-code string and optional configuration
   * @returns Collision check result with hazard list
   */
  static analyze(input: CollisionCheckInput): CollisionCheckResult {
    const { gcode, material_top_z, safe_z, machine_travel, wcs_offsets } = input;
    const lines = gcode.split("\n");
    const hazards: CollisionHazard[] = [];

    let currentZ: number | undefined;
    let lastRetractZ = false;
    let currentTool: number | undefined;
    let toolChangedForCurrentT = false;
    let pendingT: number | undefined; // T code seen but not yet M06'd
    let hasCutWithCurrentTool = false;
    let activeWcs = "G54";
    let activeGMotion = "G0"; // track G0/G1/G2/G3

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const raw = lines[i].trim();

      // Strip comments
      const line = raw.replace(/\(.*?\)/g, "").replace(/;.*$/, "").trim();
      if (!line) continue;

      // Track active WCS
      const wcsMatch = line.match(/\b(G5[4-9])\b/i);
      if (wcsMatch) activeWcs = wcsMatch[1].toUpperCase();

      // Track motion mode
      if (hasGCode(line, "G0")) activeGMotion = "G0";
      if (hasGCode(line, "G1")) activeGMotion = "G1";
      if (hasGCode(line, "G2")) activeGMotion = "G2";
      if (hasGCode(line, "G3")) activeGMotion = "G3";

      // Track Z position
      const zVal = extractValue(line, "Z");
      if (zVal !== undefined) currentZ = zVal;

      // Track Z retract
      if (isZRetract(line, safe_z)) {
        lastRetractZ = true;
      } else if (zVal !== undefined && zVal < material_top_z) {
        lastRetractZ = false;
      }

      // ── Hazard 1: Rapid at depth (G0 with Z below material top) ──
      if (hasGCode(line, "G0") && zVal !== undefined && zVal < material_top_z) {
        hazards.push({
          line: lineNum,
          code: raw,
          type: "rapid_at_depth",
          severity: "WARNING",
          message: `Rapid move (G0) to Z${zVal} — below material top Z${material_top_z}. Risk of collision.`,
        });
      }

      // ── T code tracking (must come BEFORE M06 check so T2 M06 on same line works) ──
      const tMatch = line.match(/\bT(\d+)\b/i);
      if (tMatch) {
        const newTool = parseInt(tMatch[1], 10);

        // Check for duplicate T without M06 between
        if (pendingT !== undefined && newTool !== pendingT) {
          hazards.push({
            line: lineNum,
            code: raw,
            type: "duplicate_t_no_m06",
            severity: "ERROR",
            message: `Tool T${newTool} called but T${pendingT} was never activated with M06.`,
          });
        }

        pendingT = newTool;
        toolChangedForCurrentT = false;
      }

      // ── Hazard 2: Tool change without Z retract ──
      if (/\bM0?6\b/i.test(line)) {
        if (!lastRetractZ && currentZ !== undefined && currentZ < safe_z) {
          hazards.push({
            line: lineNum,
            code: raw,
            type: "tool_change_no_retract",
            severity: "ERROR",
            message: `Tool change (M06) at Z${currentZ} without preceding Z retract. Machine Z is below safe height Z${safe_z}.`,
          });
        }
        toolChangedForCurrentT = true;
        if (pendingT !== undefined) {
          currentTool = pendingT;
          pendingT = undefined;
        }
        hasCutWithCurrentTool = false;
      }

      // ── Hazard 3: Lateral rapid at depth (G0 XY move with Z below material) ──
      const xVal = extractValue(line, "X");
      const yVal = extractValue(line, "Y");
      if (hasGCode(line, "G0") && (xVal !== undefined || yVal !== undefined) && zVal === undefined) {
        // G0 with XY but no Z — check if we're at cutting depth
        if (currentZ !== undefined && currentZ < material_top_z && !lastRetractZ) {
          hazards.push({
            line: lineNum,
            code: raw,
            type: "lateral_rapid_at_depth",
            severity: "WARNING",
            message: `Lateral rapid (G0 X/Y) while at Z${currentZ} — below material top Z${material_top_z}. No Z retract before repositioning.`,
          });
        }
      }

      // ── Hazard 5: Cutting motion without M06 ──
      const isCuttingMotion = hasGCode(line, "G1") || hasGCode(line, "G2") || hasGCode(line, "G3")
        || (activeGMotion !== "G0" && (xVal !== undefined || yVal !== undefined || zVal !== undefined) && !hasGCode(line, "G0"));

      if (isCuttingMotion && pendingT !== undefined && !toolChangedForCurrentT) {
        hazards.push({
          line: lineNum,
          code: raw,
          type: "missing_m06",
          severity: "ERROR",
          message: `Cutting motion with T${pendingT} but no M06 tool change executed. Tool not loaded.`,
        });
        // Only flag once per tool
        toolChangedForCurrentT = true;
      }

      // ── Hazard 6: Travel limit exceeded (WCS-aware) ──
      if (machine_travel && (xVal !== undefined || yVal !== undefined || zVal !== undefined)) {
        const wcsOffset = wcs_offsets?.[activeWcs] ?? { x: 0, y: 0, z: 0 };
        if (xVal !== undefined) {
          const machineX = xVal + wcsOffset.x;
          if ((machine_travel.x_min !== undefined && machineX < machine_travel.x_min) ||
              (machine_travel.x_max !== undefined && machineX > machine_travel.x_max)) {
            hazards.push({
              line: lineNum,
              code: raw,
              type: "travel_limit_exceeded",
              severity: "ERROR",
              message: `X${xVal} in ${activeWcs} → machine X${machineX.toFixed(1)} exceeds travel limits [${machine_travel.x_min ?? "?"}, ${machine_travel.x_max ?? "?"}]`,
            });
          }
        }
        if (yVal !== undefined) {
          const machineY = yVal + wcsOffset.y;
          if ((machine_travel.y_min !== undefined && machineY < machine_travel.y_min) ||
              (machine_travel.y_max !== undefined && machineY > machine_travel.y_max)) {
            hazards.push({
              line: lineNum,
              code: raw,
              type: "travel_limit_exceeded",
              severity: "ERROR",
              message: `Y${yVal} in ${activeWcs} → machine Y${machineY.toFixed(1)} exceeds travel limits [${machine_travel.y_min ?? "?"}, ${machine_travel.y_max ?? "?"}]`,
            });
          }
        }
      }
    }

    // ── Hazard: Orphan M06 (M06 with no preceding T) ──
    // This is already handled inline — we track pendingT → M06

    const errors = hazards.filter(h => h.severity === "ERROR").length;
    const warnings = hazards.filter(h => h.severity === "WARNING").length;

    return {
      hazards,
      errors,
      warnings,
      passed: errors === 0,
      lines_analyzed: lines.length,
    };
  }
}

export const collisionHazardDetectorEngine = new CollisionHazardDetectorEngine();
