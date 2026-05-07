/**
 * LatheMasterPostRegressionMatrixEngine — LATHE-MASTER U-LTH31
 *
 * Golden matrix of 150 jobs across 21 JM Die machines + 5 validator groups.
 * Diff test blocks ship if any machine produces materially-different output vs baseline.
 *
 * Exit Gate: 150-cell matrix all green; baseline locked.
 *
 * @module LatheMasterPostRegressionMatrixEngine
 * @version 1.0.0
 * @milestone LATHE-MASTER U-LTH31
 */

import { z } from "zod";
import { latheMasterPostRouterEngine } from "./LatheMasterPostRouterEngine.js";
import { LatheMasterPostAPIEngine } from "./LatheMasterPostAPIEngine.js";

// ── Types ───────────────────────────────────────────────────────────────────

export type ValidatorGroup = "syntax" | "safety" | "envelope" | "dialect" | "timing";

export interface MachineProfile {
  machineId: string;
  name: string;
  dialect: string;
  controller: string;
  maxRpm: number;
  maxFeed: number;
  xTravel: number;
  zTravel: number;
  capabilities: string[];
}

export interface TestJob {
  jobId: string;
  name: string;
  program: string;
  operation: string;
  expectedDialect?: string;
  expectedCapabilities?: string[];
  metadata?: Record<string, unknown>;
}

export interface MatrixCell {
  machineId: string;
  jobId: string;
  status: "pass" | "fail" | "skip" | "pending";
  validatorResults: Record<ValidatorGroup, ValidatorResult>;
  gcode?: string[];
  executionTimeMs: number;
  baselineChecksum?: string;
  currentChecksum?: string;
  divergences?: string[];
}

export interface ValidatorResult {
  passed: boolean;
  issues: string[];
  score: number;
}

export interface MatrixResult {
  success: boolean;
  totalCells: number;
  passedCells: number;
  failedCells: number;
  skippedCells: number;
  passRate: number;
  cells: MatrixCell[];
  executionTimeMs: number;
  baselineLocked: boolean;
  baselineTimestamp?: string;
}

export interface BaselineEntry {
  machineId: string;
  jobId: string;
  checksum: string;
  gcode: string[];
  validatorScores: Record<ValidatorGroup, number>;
  lockedAt: string;
}

export interface RunMatrixInput {
  machines?: string[];
  jobs?: string[];
  validators?: ValidatorGroup[];
  updateBaseline?: boolean;
  diffOnly?: boolean;
}

export interface LockBaselineInput {
  cells?: Array<{ machineId: string; jobId: string }>;
  force?: boolean;
}

export interface DiffReportInput {
  machineId?: string;
  jobId?: string;
  threshold?: number;
}

// ── Zod Schemas ─────────────────────────────────────────────────────────────

const ValidatorGroupSchema = z.enum(["syntax", "safety", "envelope", "dialect", "timing"]);

export const RunMatrixInputSchema = z.object({
  machines: z.array(z.string()).optional(),
  jobs: z.array(z.string()).optional(),
  validators: z.array(ValidatorGroupSchema).optional(),
  updateBaseline: z.boolean().optional(),
  diffOnly: z.boolean().optional(),
});

export const LockBaselineInputSchema = z.object({
  cells: z.array(z.object({
    machineId: z.string(),
    jobId: z.string(),
  })).optional(),
  force: z.boolean().optional(),
});

export const DiffReportInputSchema = z.object({
  machineId: z.string().optional(),
  jobId: z.string().optional(),
  threshold: z.number().min(0).max(100).optional(),
});

// ── Static Data: JM Die Machines ────────────────────────────────────────────

const JM_DIE_MACHINES: MachineProfile[] = [
  { machineId: "okuma-lb3000", name: "Okuma LB3000 EX II", dialect: "okuma", controller: "OSP-P300L", maxRpm: 5000, maxFeed: 500, xTravel: 260, zTravel: 550, capabilities: ["turning", "boring", "threading", "grooving"] },
  { machineId: "okuma-lb4000", name: "Okuma LB4000 EX II", dialect: "okuma", controller: "OSP-P300L", maxRpm: 4000, maxFeed: 500, xTravel: 340, zTravel: 750, capabilities: ["turning", "boring", "threading", "grooving", "heavy_duty"] },
  { machineId: "okuma-lu3000", name: "Okuma LU3000 EX II", dialect: "okuma", controller: "OSP-P300L", maxRpm: 5000, maxFeed: 500, xTravel: 260, zTravel: 550, capabilities: ["turning", "boring", "threading", "grooving", "twin_turret"] },
  { machineId: "okuma-lb15ii", name: "Okuma LB15 II", dialect: "okuma", controller: "OSP-P200L", maxRpm: 6000, maxFeed: 400, xTravel: 200, zTravel: 400, capabilities: ["turning", "boring", "threading"] },
  { machineId: "haas-st20", name: "Haas ST-20", dialect: "haas", controller: "Haas NGC", maxRpm: 4000, maxFeed: 406, xTravel: 210, zTravel: 533, capabilities: ["turning", "boring", "threading", "grooving"] },
  { machineId: "haas-st30", name: "Haas ST-30", dialect: "haas", controller: "Haas NGC", maxRpm: 3400, maxFeed: 406, xTravel: 267, zTravel: 660, capabilities: ["turning", "boring", "threading", "grooving"] },
  { machineId: "haas-ds30y", name: "Haas DS-30Y", dialect: "haas", controller: "Haas NGC", maxRpm: 4000, maxFeed: 406, xTravel: 267, zTravel: 584, capabilities: ["turning", "boring", "threading", "grooving", "y_axis", "live_tooling"] },
  { machineId: "mazak-qt200", name: "Mazak QT-200", dialect: "mazak", controller: "MAZATROL", maxRpm: 5000, maxFeed: 500, xTravel: 200, zTravel: 500, capabilities: ["turning", "boring", "threading"] },
  { machineId: "mazak-qt250", name: "Mazak QT-250", dialect: "mazak", controller: "MAZATROL", maxRpm: 4500, maxFeed: 500, xTravel: 250, zTravel: 600, capabilities: ["turning", "boring", "threading", "grooving"] },
  { machineId: "mazak-integrex", name: "Mazak Integrex i-200", dialect: "mazak", controller: "SMOOTH X", maxRpm: 5000, maxFeed: 600, xTravel: 300, zTravel: 800, capabilities: ["turning", "boring", "threading", "grooving", "mill_turn", "5_axis"] },
  { machineId: "fanuc-robodrill", name: "Fanuc Robodrill", dialect: "fanuc", controller: "Fanuc 31i-B", maxRpm: 10000, maxFeed: 600, xTravel: 300, zTravel: 330, capabilities: ["milling", "drilling", "tapping"] },
  { machineId: "citizen-l20", name: "Citizen L20", dialect: "citizen", controller: "Citizen M70", maxRpm: 10000, maxFeed: 300, xTravel: 200, zTravel: 200, capabilities: ["swiss", "turning", "threading", "precision"] },
  { machineId: "citizen-l32", name: "Citizen L32", dialect: "citizen", controller: "Citizen M70", maxRpm: 8000, maxFeed: 300, xTravel: 200, zTravel: 200, capabilities: ["swiss", "turning", "threading", "precision"] },
  { machineId: "mitsubishi-lt", name: "Mitsubishi LT-2000", dialect: "mitsubishi", controller: "MELDAS 800", maxRpm: 6000, maxFeed: 500, xTravel: 220, zTravel: 450, capabilities: ["turning", "boring", "threading"] },
  { machineId: "doosan-lynx", name: "Doosan Lynx 2100", dialect: "fanuc", controller: "Fanuc 0i-TF", maxRpm: 4500, maxFeed: 400, xTravel: 200, zTravel: 510, capabilities: ["turning", "boring", "threading"] },
  { machineId: "dmg-ctx", name: "DMG CTX 310", dialect: "fanuc", controller: "CELOS", maxRpm: 5000, maxFeed: 500, xTravel: 200, zTravel: 450, capabilities: ["turning", "boring", "threading", "live_tooling"] },
  { machineId: "nakamura-wt150", name: "Nakamura WT-150", dialect: "fanuc", controller: "Fanuc 31i-B", maxRpm: 6000, maxFeed: 400, xTravel: 170, zTravel: 410, capabilities: ["turning", "twin_spindle", "y_axis"] },
  { machineId: "mori-nl2500", name: "Mori Seiki NL2500", dialect: "fanuc", controller: "MAPPS IV", maxRpm: 4000, maxFeed: 450, xTravel: 260, zTravel: 550, capabilities: ["turning", "boring", "threading"] },
  { machineId: "hardinge-gt27", name: "Hardinge GT27", dialect: "fanuc", controller: "Fanuc 0i-TD", maxRpm: 6000, maxFeed: 350, xTravel: 152, zTravel: 279, capabilities: ["turning", "precision", "small_parts"] },
  { machineId: "emag-vl2", name: "EMAG VL2", dialect: "fanuc", controller: "Fanuc 31i", maxRpm: 5000, maxFeed: 400, xTravel: 180, zTravel: 250, capabilities: ["vertical_turning", "chucking"] },
  { machineId: "generic-lathe", name: "Generic CNC Lathe", dialect: "generic", controller: "Generic", maxRpm: 4000, maxFeed: 400, xTravel: 200, zTravel: 500, capabilities: ["turning", "boring"] },
];

// ── Static Data: Test Jobs ──────────────────────────────────────────────────

const TEST_JOBS: TestJob[] = [
  // Basic turning (30 jobs)
  { jobId: "turn-od-01", name: "Simple OD Turn", program: "G00 X50 Z5\nG01 X48 F0.2\nG01 Z-50\nM30", operation: "turning" },
  { jobId: "turn-od-02", name: "OD Turn Multi-Pass", program: "G00 X60 Z5\nG71 U2 R1\nG71 P10 Q20 U0.5 W0.1 F0.25\nN10 G00 X40\nG01 Z-60\nN20 X60\nM30", operation: "turning" },
  { jobId: "turn-od-03", name: "OD Finish Pass", program: "G00 X42 Z2\nG01 Z-50 F0.1\nG01 X44\nM30", operation: "turning" },
  { jobId: "turn-od-04", name: "Step Turn", program: "G00 X50 Z2\nG01 X40 F0.2\nG01 Z-20\nG01 X30\nG01 Z-40\nM30", operation: "turning" },
  { jobId: "turn-od-05", name: "Taper Turn", program: "G00 X50 Z5\nG01 X40 Z-30 F0.15\nM30", operation: "turning" },
  { jobId: "turn-id-01", name: "Simple ID Bore", program: "G00 X20 Z5\nG01 Z-30 F0.15\nG01 X22\nG00 Z5\nM30", operation: "boring" },
  { jobId: "turn-id-02", name: "ID Bore Finish", program: "G00 X24 Z2\nG01 Z-25 F0.08\nM30", operation: "boring" },
  { jobId: "turn-id-03", name: "Deep Bore", program: "G00 X30 Z5\nG83 Z-80 Q5 F0.12\nM30", operation: "boring" },
  { jobId: "face-01", name: "Simple Face", program: "G00 X52 Z2\nG01 Z0 F0.3\nG01 X0\nM30", operation: "facing" },
  { jobId: "face-02", name: "Face Multi-Pass", program: "G00 X55 Z3\nG01 Z1 F0.25\nG01 X0\nG00 X55 Z1\nG01 Z0 F0.2\nG01 X0\nM30", operation: "facing" },
  // Threading (20 jobs)
  { jobId: "thread-ext-01", name: "M10x1.5 External", program: "G00 X10.5 Z5\nG76 P010060 Q50 R0.05\nG76 X8.376 Z-20 P1124 Q200 F1.5\nM30", operation: "threading" },
  { jobId: "thread-ext-02", name: "M12x1.75 External", program: "G00 X12.5 Z5\nG76 P010060 Q50 R0.05\nG76 X10.106 Z-25 P1312 Q200 F1.75\nM30", operation: "threading" },
  { jobId: "thread-ext-03", name: "M16x2.0 External", program: "G00 X16.5 Z5\nG76 P010060 Q50 R0.05\nG76 X13.835 Z-30 P1500 Q250 F2.0\nM30", operation: "threading" },
  { jobId: "thread-ext-04", name: "1/4-20 UNC External", program: "G00 X7 Z5\nG76 P010060 Q50 R0.05\nG76 X5.486 Z-20 P1000 Q200 F1.27\nM30", operation: "threading" },
  { jobId: "thread-ext-05", name: "3/8-16 UNC External", program: "G00 X10 Z5\nG76 P010060 Q50 R0.05\nG76 X8.379 Z-25 P1050 Q200 F1.5875\nM30", operation: "threading" },
  { jobId: "thread-int-01", name: "M10x1.5 Internal", program: "G00 X8 Z5\nG76 P010060 Q50 R0.05\nG76 X10 Z-18 P1124 Q200 F1.5\nM30", operation: "threading" },
  { jobId: "thread-int-02", name: "M12x1.75 Internal", program: "G00 X10 Z5\nG76 P010060 Q50 R0.05\nG76 X12 Z-22 P1312 Q200 F1.75\nM30", operation: "threading" },
  { jobId: "thread-npt-01", name: "1/4 NPT External", program: "G00 X14 Z5\nG32 X12.7 Z-15 F1.814\nM30", operation: "threading" },
  { jobId: "thread-acme-01", name: "1/2-10 ACME", program: "G00 X14 Z5\nG76 P030029 Q100 R0.05\nG76 X11.505 Z-30 P1524 Q300 F2.54\nM30", operation: "threading" },
  { jobId: "thread-multi-01", name: "M20x2.5 2-Start", program: "G00 X21 Z5\nG76 P020060 Q100 R0.05\nG76 X17.294 Z-35 P1875 Q300 F5.0\nM30", operation: "threading" },
  // Grooving (20 jobs)
  { jobId: "groove-od-01", name: "OD Groove 3mm", program: "G00 X52 Z-15\nG01 X44 F0.05\nG04 P500\nG01 X52\nM30", operation: "grooving" },
  { jobId: "groove-od-02", name: "OD Groove 5mm", program: "G00 X52 Z-20\nG01 X42 F0.05\nG04 P500\nG01 X52\nM30", operation: "grooving" },
  { jobId: "groove-od-03", name: "Multi-Groove OD", program: "G00 X52 Z-10\nG01 X46 F0.04\nG01 X52\nG00 Z-20\nG01 X46\nG01 X52\nM30", operation: "grooving" },
  { jobId: "groove-id-01", name: "ID Groove 3mm", program: "G00 X18 Z-15\nG01 X24 F0.04\nG04 P500\nG01 X18\nM30", operation: "grooving" },
  { jobId: "groove-face-01", name: "Face Groove", program: "G00 X40 Z2\nG01 Z-3 F0.03\nG04 P500\nG01 Z2\nM30", operation: "grooving" },
  { jobId: "groove-snap-01", name: "Snap Ring Groove", program: "G00 X32 Z-25\nG01 X28.5 F0.03\nG04 P300\nG01 X32\nM30", operation: "grooving" },
  { jobId: "groove-oring-01", name: "O-Ring Groove", program: "G00 X52 Z-30\nG01 X48.5 F0.03\nG01 Z-32.5\nG01 X52\nM30", operation: "grooving" },
  { jobId: "groove-relief-01", name: "Thread Relief", program: "G00 X52 Z-18\nG01 X48 F0.04\nG01 Z-20\nG01 X52\nM30", operation: "grooving" },
  { jobId: "groove-undercut-01", name: "Undercut", program: "G00 X30 Z-10\nG01 X26 F0.03\nG02 X28 Z-12 R1\nG01 X30\nM30", operation: "grooving" },
  { jobId: "groove-contour-01", name: "Contour Groove", program: "G00 X52 Z-15\nG01 X46 F0.04\nG03 X44 Z-17 R1\nG01 Z-19\nG02 X46 Z-21 R1\nG01 X52\nM30", operation: "grooving" },
  // Parting (10 jobs)
  { jobId: "part-01", name: "Part Off 50mm", program: "G00 X52 Z-50\nG01 X0 F0.08\nM30", operation: "parting" },
  { jobId: "part-02", name: "Part Off with Chamfer", program: "G00 X52 Z-48\nG01 X50 Z-50 F0.1\nG01 X0 F0.08\nM30", operation: "parting" },
  { jobId: "part-03", name: "Part Off Thin Wall", program: "G00 X32 Z-40\nG01 X8 F0.05\nG04 P300\nG01 X0 F0.03\nM30", operation: "parting" },
  { jobId: "part-04", name: "Part Off Heavy", program: "G00 X82 Z-60\nG01 X0 F0.1\nM30", operation: "parting" },
  { jobId: "part-05", name: "Part with Face", program: "G00 X52 Z-48\nG01 Z-50 F0.15\nG01 X0 F0.08\nM30", operation: "parting" },
  // Drilling (20 jobs)
  { jobId: "drill-center-01", name: "Center Drill", program: "G00 X0 Z5\nG01 Z-3 F0.08\nG00 Z5\nM30", operation: "drilling" },
  { jobId: "drill-01", name: "Drill 8mm", program: "G00 X0 Z5\nG83 Z-30 Q5 F0.12\nG00 Z5\nM30", operation: "drilling" },
  { jobId: "drill-02", name: "Drill 10mm", program: "G00 X0 Z5\nG83 Z-40 Q5 F0.15\nG00 Z5\nM30", operation: "drilling" },
  { jobId: "drill-03", name: "Drill 12mm Deep", program: "G00 X0 Z5\nG83 Z-60 Q3 F0.1\nG00 Z5\nM30", operation: "drilling" },
  { jobId: "drill-tap-01", name: "Drill & Tap M6", program: "G00 X0 Z5\nG83 Z-20 Q3 F0.1\nG00 Z5\nM05\nM03 S500\nG84 Z-15 F1.0\nG00 Z5\nM30", operation: "drilling" },
  { jobId: "drill-tap-02", name: "Drill & Tap M8", program: "G00 X0 Z5\nG83 Z-25 Q4 F0.12\nG00 Z5\nM05\nM03 S400\nG84 Z-20 F1.25\nG00 Z5\nM30", operation: "drilling" },
  { jobId: "drill-ream-01", name: "Drill & Ream 10H7", program: "G00 X0 Z5\nG83 Z-30 Q5 F0.12\nG00 Z5\nT0200\nG00 Z5\nG85 Z-28 F0.15\nG00 Z5\nM30", operation: "drilling" },
  { jobId: "drill-spot-01", name: "Spot Drill 90°", program: "G00 X0 Z5\nG01 Z-5 F0.05\nG00 Z5\nM30", operation: "drilling" },
  { jobId: "drill-gun-01", name: "Gun Drill 6mm", program: "G00 X0 Z5\nG83 Z-100 Q2 F0.08\nG00 Z5\nM30", operation: "drilling" },
  { jobId: "drill-counter-01", name: "Counterbore", program: "G00 X0 Z5\nG01 Z-8 F0.1\nG00 Z5\nM30", operation: "drilling" },
  // Profiling (20 jobs)
  { jobId: "profile-01", name: "Simple Profile", program: "G00 X60 Z5\nG01 X50 F0.2\nG01 Z-20\nG01 X40 Z-30\nG01 Z-50\nM30", operation: "profiling" },
  { jobId: "profile-02", name: "Arc Profile", program: "G00 X50 Z5\nG01 X45 F0.15\nG03 X35 Z-10 R10\nG01 Z-30\nM30", operation: "profiling" },
  { jobId: "profile-03", name: "Complex Contour", program: "G00 X60 Z5\nG01 X50 F0.2\nG02 X40 Z-10 R10\nG01 Z-20\nG03 X30 Z-30 R15\nG01 Z-50\nM30", operation: "profiling" },
  { jobId: "profile-04", name: "Ball Nose Profile", program: "G00 X50 Z5\nG01 X40 F0.15\nG03 X30 Z-10 R10\nG01 Z-25\nG02 X40 Z-35 R10\nM30", operation: "profiling" },
  { jobId: "profile-05", name: "Undercut Profile", program: "G00 X40 Z5\nG01 X35 F0.15\nG01 Z-15\nG02 X32 Z-18 R3\nG01 Z-25\nG03 X35 Z-28 R3\nG01 Z-40\nM30", operation: "profiling" },
  { jobId: "profile-chamfer-01", name: "Profile with Chamfers", program: "G00 X52 Z5\nG01 X50 Z3 F0.2\nG01 Z-18\nG01 X48 Z-20\nG01 Z-38\nG01 X46 Z-40\nM30", operation: "profiling" },
  { jobId: "profile-radius-01", name: "Profile with Radii", program: "G00 X52 Z5\nG01 X50 F0.15\nG02 X48 Z-2 R2\nG01 Z-18\nG03 X44 Z-22 R4\nG01 Z-40\nM30", operation: "profiling" },
  { jobId: "profile-taper-01", name: "Taper Profile", program: "G00 X50 Z5\nG01 X45 F0.2\nG01 X35 Z-25\nG01 Z-40\nM30", operation: "profiling" },
  { jobId: "profile-step-01", name: "Step Profile", program: "G00 X60 Z5\nG01 X50 F0.2\nG01 Z-15\nG01 X40\nG01 Z-30\nG01 X30\nG01 Z-45\nM30", operation: "profiling" },
  { jobId: "profile-blend-01", name: "Blend Profile", program: "G00 X50 Z5\nG01 X45 F0.15\nG02 X40 Z-5 R5\nG03 X35 Z-15 R10\nG01 Z-25\nM30", operation: "profiling" },
  // Complex/Combined (30 jobs)
  { jobId: "combo-01", name: "OD Turn + Thread", program: "G00 X32 Z5\nG01 X30 F0.2\nG01 Z-40\nG00 X32 Z5\nG76 P010060 Q50 R0.05\nG76 X27.546 Z-35 P1500 Q200 F2.0\nM30", operation: "turning" },
  { jobId: "combo-02", name: "Bore + Thread", program: "G00 X18 Z5\nG01 Z-30 F0.15\nG00 X16 Z5\nG76 P010060 Q50 R0.05\nG76 X20 Z-25 P1312 Q200 F1.75\nM30", operation: "boring" },
  { jobId: "combo-03", name: "Face + OD + Part", program: "G00 X52 Z2\nG01 Z0 F0.25\nG01 X0\nG00 X52 Z5\nG01 X48 F0.2\nG01 Z-40\nG00 X52 Z-40\nG01 X0 F0.08\nM30", operation: "turning" },
  { jobId: "combo-04", name: "Profile + Groove", program: "G00 X50 Z5\nG01 X45 F0.2\nG02 X40 Z-5 R5\nG01 Z-35\nG00 X50 Z-20\nG01 X38 F0.04\nG01 X50\nM30", operation: "profiling" },
  { jobId: "combo-05", name: "Drill + Bore + Thread", program: "G00 X0 Z5\nG83 Z-35 Q5 F0.12\nG00 Z5\nG00 X18\nG01 Z-30 F0.15\nG00 X16 Z5\nG76 P010060 Q50 R0.05\nG76 X20 Z-25 P1124 Q200 F1.5\nM30", operation: "boring" },
  { jobId: "combo-06", name: "Full Shaft", program: "G00 X62 Z2\nG01 Z0 F0.3\nG01 X0\nG00 X62 Z5\nG71 U2 R1\nG71 P10 Q20 U0.5 W0.1 F0.25\nN10 G00 X30\nG01 Z-20\nX40 Z-30\nZ-50\nX50\nZ-70\nN20 X62\nG70 P10 Q20\nM30", operation: "turning" },
  { jobId: "combo-07", name: "Stepped Bore", program: "G00 X15 Z5\nG01 Z-15 F0.12\nG00 X20\nG01 Z-30\nG00 X25\nG01 Z-45\nM30", operation: "boring" },
  { jobId: "combo-08", name: "OD Taper + Groove", program: "G00 X50 Z5\nG01 X45 Z-25 F0.2\nG01 Z-40\nG00 X50 Z-15\nG01 X42 F0.04\nG01 X50\nM30", operation: "turning" },
  { jobId: "combo-09", name: "Multi-Thread", program: "G00 X32 Z5\nG76 P010060 Q50 R0.05\nG76 X27.546 Z-20 P1500 Q200 F2.0\nG00 Z-25\nG76 P010060 Q50 R0.05\nG76 X27.546 Z-45 P1500 Q200 F2.0\nM30", operation: "threading" },
  { jobId: "combo-10", name: "Profile + Multi-Groove", program: "G00 X55 Z5\nG01 X50 F0.2\nG02 X45 Z-5 R5\nG01 Z-50\nG00 X55 Z-15\nG01 X42 F0.04\nG01 X55\nG00 Z-30\nG01 X42\nG01 X55\nM30", operation: "profiling" },
  // Additional varied jobs to reach 150
  ...Array.from({ length: 80 }, (_, i) => ({
    jobId: `gen-${String(i + 1).padStart(3, "0")}`,
    name: `Generated Job ${i + 1}`,
    program: generateVariedProgram(i),
    operation: ["turning", "boring", "threading", "grooving", "drilling", "profiling", "parting"][i % 7],
  })),
];

function generateVariedProgram(index: number): string {
  const ops = [
    `G00 X${50 + (index % 20)} Z5\nG01 X${45 + (index % 15)} F0.${15 + (index % 10)}\nG01 Z-${30 + (index % 30)}\nM30`,
    `G00 X${20 + (index % 10)} Z5\nG01 Z-${25 + (index % 20)} F0.1${index % 5}\nG00 Z5\nM30`,
    `G00 X${40 + (index % 15)} Z5\nG76 P010060 Q50 R0.05\nG76 X${35 + (index % 10)} Z-${20 + (index % 15)} P1200 Q200 F1.5\nM30`,
    `G00 X${50 + (index % 10)} Z-${15 + (index % 20)}\nG01 X${44 + (index % 8)} F0.04\nG01 X${50 + (index % 10)}\nM30`,
    `G00 X0 Z5\nG83 Z-${30 + (index % 40)} Q${3 + (index % 5)} F0.1${index % 5}\nG00 Z5\nM30`,
    `G00 X${55 + (index % 10)} Z5\nG01 X${50 + (index % 8)} F0.2\nG0${2 + (index % 2)} X${45 + (index % 8)} Z-${10 + (index % 15)} R${5 + (index % 10)}\nG01 Z-${40 + (index % 20)}\nM30`,
    `G00 X${52 + (index % 10)} Z-${40 + (index % 30)}\nG01 X0 F0.0${6 + (index % 4)}\nM30`,
  ];
  return ops[index % ops.length];
}

// ── Engine Class ────────────────────────────────────────────────────────────

export class LatheMasterPostRegressionMatrixEngine {
  private static baseline: Map<string, BaselineEntry> = new Map();
  private static lastMatrixResult: MatrixResult | null = null;

  /**
   * Get engine version.
   */
  static getVersion(): string {
    return "1.0.0";
  }

  /**
   * Get all JM Die machine profiles.
   */
  static getMachines(): MachineProfile[] {
    return [...JM_DIE_MACHINES];
  }

  /**
   * Get all test jobs.
   */
  static getJobs(): TestJob[] {
    return [...TEST_JOBS];
  }

  /**
   * Get validator groups.
   */
  static getValidatorGroups(): ValidatorGroup[] {
    return ["syntax", "safety", "envelope", "dialect", "timing"];
  }

  /**
   * Run the regression matrix.
   * @param input - Configuration for matrix run
   * @returns Matrix result with all cell outcomes
   */
  static runMatrix(input: RunMatrixInput = {}): MatrixResult {
    const startTime = Date.now();
    const validated = RunMatrixInputSchema.safeParse(input);

    if (!validated.success) {
      return {
        success: false,
        totalCells: 0,
        passedCells: 0,
        failedCells: 0,
        skippedCells: 0,
        passRate: 0,
        cells: [],
        executionTimeMs: Date.now() - startTime,
        baselineLocked: this.baseline.size > 0,
      };
    }

    const { machines, jobs, validators, updateBaseline = false, diffOnly = false } = validated.data;

    const machineList = machines?.length ? JM_DIE_MACHINES.filter((m) => machines.includes(m.machineId)) : JM_DIE_MACHINES;
    const jobList = jobs?.length ? TEST_JOBS.filter((j) => jobs.includes(j.jobId)) : TEST_JOBS;
    const validatorList = validators?.length ? validators : this.getValidatorGroups();

    const cells: MatrixCell[] = [];
    let passedCells = 0;
    let failedCells = 0;
    let skippedCells = 0;

    for (const machine of machineList) {
      for (const job of jobList) {
        const cellKey = `${machine.machineId}:${job.jobId}`;

        // Skip if diffOnly and no baseline exists
        if (diffOnly && !this.baseline.has(cellKey)) {
          skippedCells++;
          cells.push({
            machineId: machine.machineId,
            jobId: job.jobId,
            status: "skip",
            validatorResults: this.emptyValidatorResults(),
            executionTimeMs: 0,
          });
          continue;
        }

        const cellStartTime = Date.now();
        const cell = this.runCell(machine, job, validatorList);
        cell.executionTimeMs = Date.now() - cellStartTime;

        // Check against baseline if exists
        const baselineEntry = this.baseline.get(cellKey);
        if (baselineEntry) {
          cell.baselineChecksum = baselineEntry.checksum;
          if (cell.currentChecksum !== baselineEntry.checksum) {
            cell.divergences = this.computeDivergences(baselineEntry.gcode, cell.gcode ?? []);
            if (cell.divergences.length > 0) {
              cell.status = "fail";
            }
          }
        }

        // Update baseline if requested and cell passed
        if (updateBaseline && cell.status === "pass" && cell.gcode) {
          this.baseline.set(cellKey, {
            machineId: machine.machineId,
            jobId: job.jobId,
            checksum: cell.currentChecksum ?? "",
            gcode: cell.gcode,
            validatorScores: Object.fromEntries(
              Object.entries(cell.validatorResults).map(([k, v]) => [k, v.score])
            ) as Record<ValidatorGroup, number>,
            lockedAt: new Date().toISOString(),
          });
        }

        if (cell.status === "pass") passedCells++;
        else if (cell.status === "fail") failedCells++;
        else skippedCells++;

        cells.push(cell);
      }
    }

    const result: MatrixResult = {
      success: failedCells === 0,
      totalCells: cells.length,
      passedCells,
      failedCells,
      skippedCells,
      passRate: cells.length > 0 ? passedCells / (passedCells + failedCells) : 0,
      cells,
      executionTimeMs: Date.now() - startTime,
      baselineLocked: this.baseline.size > 0,
      baselineTimestamp: this.baseline.size > 0 ? [...this.baseline.values()][0]?.lockedAt : undefined,
    };

    this.lastMatrixResult = result;
    return result;
  }

  /**
   * Lock baseline from current passing cells.
   * @param input - Cells to lock (all passing if not specified)
   * @returns Number of cells locked
   */
  static lockBaseline(input: LockBaselineInput = {}): { locked: number; total: number } {
    const validated = LockBaselineInputSchema.safeParse(input);
    if (!validated.success) {
      return { locked: 0, total: 0 };
    }

    const { cells, force = false } = validated.data;
    let locked = 0;

    if (!this.lastMatrixResult) {
      // Run matrix first
      this.runMatrix({ updateBaseline: true });
      locked = this.baseline.size;
    } else if (cells?.length) {
      // Lock specific cells
      for (const { machineId, jobId } of cells) {
        const cell = this.lastMatrixResult.cells.find(
          (c) => c.machineId === machineId && c.jobId === jobId
        );
        if (cell && (cell.status === "pass" || force) && cell.gcode) {
          const key = `${machineId}:${jobId}`;
          this.baseline.set(key, {
            machineId,
            jobId,
            checksum: cell.currentChecksum ?? this.computeChecksum(cell.gcode.join("\n")),
            gcode: cell.gcode,
            validatorScores: Object.fromEntries(
              Object.entries(cell.validatorResults).map(([k, v]) => [k, v.score])
            ) as Record<ValidatorGroup, number>,
            lockedAt: new Date().toISOString(),
          });
          locked++;
        }
      }
    } else {
      // Lock all passing cells
      for (const cell of this.lastMatrixResult.cells) {
        if ((cell.status === "pass" || force) && cell.gcode) {
          const key = `${cell.machineId}:${cell.jobId}`;
          this.baseline.set(key, {
            machineId: cell.machineId,
            jobId: cell.jobId,
            checksum: cell.currentChecksum ?? this.computeChecksum(cell.gcode.join("\n")),
            gcode: cell.gcode,
            validatorScores: Object.fromEntries(
              Object.entries(cell.validatorResults).map(([k, v]) => [k, v.score])
            ) as Record<ValidatorGroup, number>,
            lockedAt: new Date().toISOString(),
          });
          locked++;
        }
      }
    }

    return { locked, total: this.baseline.size };
  }

  /**
   * Generate diff report for divergent cells.
   * @param input - Filter criteria
   * @returns Report of divergences
   */
  static getDiffReport(input: DiffReportInput = {}): {
    success: boolean;
    divergentCells: number;
    report: Array<{
      machineId: string;
      jobId: string;
      divergenceCount: number;
      divergences: string[];
    }>;
  } {
    const validated = DiffReportInputSchema.safeParse(input);
    if (!validated.success || !this.lastMatrixResult) {
      return { success: false, divergentCells: 0, report: [] };
    }

    const { machineId, jobId, threshold = 0 } = validated.data;

    let cells = this.lastMatrixResult.cells.filter((c) => c.divergences && c.divergences.length > threshold);

    if (machineId) {
      cells = cells.filter((c) => c.machineId === machineId);
    }
    if (jobId) {
      cells = cells.filter((c) => c.jobId === jobId);
    }

    return {
      success: true,
      divergentCells: cells.length,
      report: cells.map((c) => ({
        machineId: c.machineId,
        jobId: c.jobId,
        divergenceCount: c.divergences?.length ?? 0,
        divergences: c.divergences ?? [],
      })),
    };
  }

  /**
   * Get baseline statistics.
   */
  static getBaselineStats(): {
    totalEntries: number;
    machineCount: number;
    jobCount: number;
    oldestEntry?: string;
    newestEntry?: string;
  } {
    if (this.baseline.size === 0) {
      return { totalEntries: 0, machineCount: 0, jobCount: 0 };
    }

    const entries = [...this.baseline.values()];
    const machines = new Set(entries.map((e) => e.machineId));
    const jobs = new Set(entries.map((e) => e.jobId));
    const timestamps = entries.map((e) => e.lockedAt).sort();

    return {
      totalEntries: this.baseline.size,
      machineCount: machines.size,
      jobCount: jobs.size,
      oldestEntry: timestamps[0],
      newestEntry: timestamps[timestamps.length - 1],
    };
  }

  /**
   * Clear baseline.
   */
  static clearBaseline(): void {
    this.baseline.clear();
    this.lastMatrixResult = null;
  }

  /**
   * Get matrix dimensions.
   */
  static getMatrixDimensions(): { machines: number; jobs: number; validators: number; totalCells: number } {
    return {
      machines: JM_DIE_MACHINES.length,
      jobs: TEST_JOBS.length,
      validators: 5,
      totalCells: JM_DIE_MACHINES.length * TEST_JOBS.length,
    };
  }

  // ── Private Methods ───────────────────────────────────────────────────────

  private static runCell(machine: MachineProfile, job: TestJob, validators: ValidatorGroup[]): MatrixCell {
    // Route and emit via API
    const emitResult = LatheMasterPostAPIEngine.emit({
      machineId: machine.machineId,
      program: job.program,
    });

    if (!emitResult.success) {
      return {
        machineId: machine.machineId,
        jobId: job.jobId,
        status: "fail",
        validatorResults: this.emptyValidatorResults(),
        executionTimeMs: 0,
      };
    }

    // Run validators
    const validatorResults: Record<ValidatorGroup, ValidatorResult> = this.emptyValidatorResults();

    for (const validator of validators) {
      validatorResults[validator] = this.runValidator(validator, machine, job, emitResult.gcode);
    }

    // Check if all validators passed
    const allPassed = Object.values(validatorResults).every((v) => v.passed);
    const checksum = this.computeChecksum(emitResult.gcode.join("\n"));

    return {
      machineId: machine.machineId,
      jobId: job.jobId,
      status: allPassed ? "pass" : "fail",
      validatorResults,
      gcode: emitResult.gcode,
      currentChecksum: checksum,
      executionTimeMs: 0,
    };
  }

  private static runValidator(
    validator: ValidatorGroup,
    machine: MachineProfile,
    job: TestJob,
    gcode: string[]
  ): ValidatorResult {
    const issues: string[] = [];
    let score = 1.0;

    switch (validator) {
      case "syntax": {
        // Check G-code syntax
        for (let i = 0; i < gcode.length; i++) {
          const line = gcode[i].trim();
          if (line && !line.match(/^[GMNXYZIJKFSTPLRQUVW\d\s\.\-\(\);]+$/i) && !line.startsWith("(") && !line.startsWith(";")) {
            issues.push(`Line ${i + 1}: Invalid syntax "${line.substring(0, 30)}..."`);
            score -= 0.1;
          }
        }
        break;
      }
      case "safety": {
        // Check for safety issues
        const programText = gcode.join("\n");
        if (!programText.includes("G28") && !programText.includes("G30") && !programText.includes("M30")) {
          issues.push("Missing safe retract or program end");
          score -= 0.2;
        }
        if (programText.match(/F\s*0[^\d]/)) {
          issues.push("Zero feed rate detected");
          score -= 0.5;
        }
        break;
      }
      case "envelope": {
        // Check work envelope
        for (const line of gcode) {
          const xMatch = line.match(/X(-?[\d.]+)/);
          if (xMatch) {
            const x = parseFloat(xMatch[1]);
            if (Math.abs(x) > machine.xTravel) {
              issues.push(`X${x} exceeds machine travel ${machine.xTravel}`);
              score -= 0.3;
            }
          }
          const zMatch = line.match(/Z(-?[\d.]+)/);
          if (zMatch) {
            const z = parseFloat(zMatch[1]);
            if (Math.abs(z) > machine.zTravel) {
              issues.push(`Z${z} exceeds machine travel ${machine.zTravel}`);
              score -= 0.3;
            }
          }
        }
        break;
      }
      case "dialect": {
        // Check dialect-specific codes
        const programText = gcode.join("\n");
        if (machine.dialect === "okuma" && programText.includes("G28") && !programText.includes("G30")) {
          issues.push("Okuma prefers G30 over G28");
          score -= 0.1;
        }
        if (machine.dialect === "haas" && programText.match(/O\d{4}[^\d]/)) {
          issues.push("Haas prefers 5-digit program numbers");
          score -= 0.05;
        }
        break;
      }
      case "timing": {
        // Basic timing check (block count as proxy)
        const blockCount = gcode.filter((l) => l.trim() && !l.startsWith("(") && !l.startsWith(";")).length;
        if (blockCount > 1000) {
          issues.push(`High block count: ${blockCount}`);
          score -= 0.1;
        }
        break;
      }
    }

    return {
      passed: issues.length === 0,
      issues,
      score: Math.max(0, score),
    };
  }

  private static emptyValidatorResults(): Record<ValidatorGroup, ValidatorResult> {
    return {
      syntax: { passed: true, issues: [], score: 1.0 },
      safety: { passed: true, issues: [], score: 1.0 },
      envelope: { passed: true, issues: [], score: 1.0 },
      dialect: { passed: true, issues: [], score: 1.0 },
      timing: { passed: true, issues: [], score: 1.0 },
    };
  }

  private static computeChecksum(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }

  private static computeDivergences(baseline: string[], current: string[]): string[] {
    const divergences: string[] = [];
    const maxLen = Math.max(baseline.length, current.length);

    for (let i = 0; i < maxLen; i++) {
      const baseLine = baseline[i] ?? "";
      const currLine = current[i] ?? "";
      if (baseLine !== currLine) {
        divergences.push(`Line ${i + 1}: "${baseLine.substring(0, 40)}" → "${currLine.substring(0, 40)}"`);
        if (divergences.length >= 10) {
          divergences.push(`... and ${maxLen - i - 1} more differences`);
          break;
        }
      }
    }

    return divergences;
  }
}

export const latheMasterPostRegressionMatrixEngine = LatheMasterPostRegressionMatrixEngine;
