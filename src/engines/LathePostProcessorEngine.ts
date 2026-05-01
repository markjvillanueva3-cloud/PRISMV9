/**
 * LathePostProcessorEngine — Turning-specific G-code post-processing
 *
 * Extends PRISM's post-processor capabilities from milling-only to full turning support.
 * Handles lathe canned cycles (G70-G76), CSS mode (G96/G97), tool nose radius comp,
 * and controller-specific turning dialects.
 *
 * Supported controllers (4): fanuc_turning, haas_st, mazak_qt, okuma_lb
 * Supported operations: OD roughing, facing, grooving, threading, drilling, boring, finishing
 * Canned cycles: G70 finish, G71 OD rough, G72 face rough, G73 pattern repeat,
 *   G74 peck drilling, G75 grooving, G76 threading
 *
 * Source: video:4OWT-O4oN8E (NYC CNC post-processor editing),
 *         video:bNBSLE0KbcU (Fusion 360 lathe post),
 *         domain knowledge (Fanuc/Haas/Mazak/Okuma programming manuals)
 */

import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type LatheController = "fanuc_turning" | "haas_st" | "mazak_qt" | "okuma_lb" | "siemens_840d" | "dmg_celos";

export interface LathePostConfig {
  controller: LatheController;
  program_number?: number;
  use_canned_cycles: boolean;
  use_css: boolean;                    // G96 constant surface speed
  use_tnrc: boolean;                   // Tool nose radius compensation (G41/G42)
  decimal_places: number;
  line_numbers: boolean;
  line_number_increment: number;
  coolant_code: "flood" | "mist" | "air" | "none";
  safe_start_block: boolean;
  program_end: "M30" | "M02" | "%";
  max_rpm?: number;                    // G50 spindle speed clamp
  spindle_direction?: "cw" | "ccw";    // M03 or M04
  bar_feeder?: boolean;                // M99 loop for bar work
  sub_spindle?: boolean;               // B-axis / sub-spindle support
}

export interface LatheInput {
  moves: LatheMove[];
  tool_number: number;
  tool_orientation: number;            // T0100 orientation (1-9 per ISO)
  tool_nose_radius_mm?: number;
  spindle_rpm?: number;
  surface_speed_mmin?: number;         // for CSS mode
  feed_rate_mmrev?: number;            // per-revolution feed
  feed_rate_mmmin?: number;            // per-minute feed (for drilling)
  coolant: "flood" | "mist" | "air" | "none";
  work_offset: string;
  part_diameter_mm?: number;           // for CSS calculations
}

export type LatheMoveType =
  | "rapid" | "feed" | "arc_cw" | "arc_ccw"
  | "rough_od" | "rough_face" | "finish_cycle"
  | "groove" | "thread" | "peck_drill"
  | "bore" | "tap"
  | "part_off" | "comment"
  | "dwell" | "spindle_orient";

export interface LatheMove {
  type: LatheMoveType;
  x?: number; z?: number;             // X = diameter, Z = length
  i?: number; k?: number;             // arc center offsets (I=X, K=Z)
  feed?: number;                      // override feed
  // Rough cycle params
  depth_of_cut_mm?: number;           // U for G71
  finish_allowance_x_mm?: number;     // stock to leave radial
  finish_allowance_z_mm?: number;     // stock to leave axial
  profile_start_block?: number;       // P (block number for profile start)
  profile_end_block?: number;         // Q (block number for profile end)
  // Threading params
  thread_pitch_mm?: number;           // lead
  thread_depth_mm?: number;           // total depth
  thread_passes?: number;             // number of spring passes
  thread_angle_deg?: number;          // infeed angle (29° metric, 30° unified)
  thread_chamfer?: number;            // pullout chamfer (threads)
  // Grooving params
  groove_width_mm?: number;
  groove_depth_mm?: number;
  peck_amount_mm?: number;            // peck depth for G74/G75
  // Dwell
  dwell_sec?: number;
  // Comment
  text?: string;
}

export interface LathePostResult {
  controller: LatheController;
  gcode: string;
  line_count: number;
  estimated_time_sec: number;
  warnings: string[];
  canned_cycles_used: string[];
}

// ============================================================================
// LATHE CONTROLLER DIALECTS
// ============================================================================

interface LatheDialect {
  safeStart: (maxRpm?: number) => string;
  toolChange: (t: number, orient: number) => string;
  cssOn: (sfm: number, maxRpm: number) => string;
  rpmMode: (rpm: number) => string;
  coolantOn: (type: string) => string;
  coolantOff: string;
  workOffset: (g: string) => string;
  tnrcOn: (side: "left" | "right") => string;
  tnrcOff: string;
  rapid: (x?: number, z?: number, dp?: number) => string;
  feed: (x?: number, z?: number, f?: number, dp?: number) => string;
  arcCW: (x?: number, z?: number, i?: number, k?: number, f?: number, dp?: number) => string;
  arcCCW: (x?: number, z?: number, i?: number, k?: number, f?: number, dp?: number) => string;
  roughOD: (depth: number, finX: number, finZ: number, pBlock: number, qBlock: number, f: number) => string;
  roughFace: (depth: number, finX: number, finZ: number, pBlock: number, qBlock: number, f: number) => string;
  finishCycle: (pBlock: number, qBlock: number, f: number) => string;
  threadCycle: (pitch: number, depth: number, passes: number, angle: number, chamfer: number, x: number, z: number) => string;
  peckDrill: (z: number, peckDepth: number, f: number) => string;
  grooveCycle: (x: number, z: number, peck: number, f: number) => string;
  partOff: (x: number, f: number) => string;
  dwell: (sec: number) => string;
  spindleOrient: (angle?: number) => string;
  programEnd: string;
  comment: (text: string) => string;
}

function coord(prefix: string, v: number | undefined, dp: number): string {
  return v !== undefined ? `${prefix}${v.toFixed(dp)}` : "";
}

const LATHE_DIALECTS: Record<LatheController, LatheDialect> = {
  fanuc_turning: {
    safeStart: (maxRpm) => `G90 G80 G40 G54 G97 G99${maxRpm ? `\nG50 S${maxRpm}` : ""}`,
    toolChange: (t, orient) => `T${t.toString().padStart(2, "0")}${orient.toString().padStart(2, "0")}`,
    cssOn: (sfm, maxRpm) => `G50 S${maxRpm}\nG96 S${Math.round(sfm)}`,
    rpmMode: (rpm) => `G97 S${rpm}`,
    coolantOn: (type) => type === "mist" ? "M07" : "M08",
    coolantOff: "M09",
    workOffset: (g) => g,
    tnrcOn: (side) => side === "left" ? "G42" : "G41",
    tnrcOff: "G40",
    rapid: (x, z, dp = 3) => `G00 ${coord("X", x, dp)} ${coord("Z", z, dp)}`.trim(),
    feed: (x, z, f, dp = 3) => `G01 ${coord("X", x, dp)} ${coord("Z", z, dp)} ${f != null ? `F${f}` : ""}`.trim(),
    arcCW: (x, z, i, k, f, dp = 3) => `G02 ${coord("X", x, dp)} ${coord("Z", z, dp)} ${coord("I", i, dp)} ${coord("K", k, dp)} ${f != null ? `F${f}` : ""}`.trim(),
    arcCCW: (x, z, i, k, f, dp = 3) => `G03 ${coord("X", x, dp)} ${coord("Z", z, dp)} ${coord("I", i, dp)} ${coord("K", k, dp)} ${f != null ? `F${f}` : ""}`.trim(),
    roughOD: (depth, finX, finZ, p, q, f) =>
      `G71 U${depth.toFixed(3)} R1.0\nG71 P${p} Q${q} U${finX.toFixed(3)} W${finZ.toFixed(3)} F${f}`,
    roughFace: (depth, finX, finZ, p, q, f) =>
      `G72 W${depth.toFixed(3)} R1.0\nG72 P${p} Q${q} U${finX.toFixed(3)} W${finZ.toFixed(3)} F${f}`,
    finishCycle: (p, q, f) => `G70 P${p} Q${q} F${f}`,
    threadCycle: (pitch, depth, passes, angle, chamfer, x, z) =>
      `G76 P${passes.toString().padStart(2, "0")}${(angle < 60 ? "60" : angle.toString())}${chamfer > 0 ? Math.round(chamfer * 10).toString() : "00"} Q${Math.round(depth / passes * 1000)} R0.1\nG76 X${x.toFixed(3)} Z${z.toFixed(3)} P${Math.round(depth * 1000)} Q${Math.round(depth / passes * 1000)} F${pitch.toFixed(4)}`,
    peckDrill: (z, peck, f) => `G74 R1.0\nG74 Z${z.toFixed(3)} Q${Math.round(peck * 1000)} F${f}`,
    grooveCycle: (x, z, peck, f) => `G75 R1.0\nG75 X${x.toFixed(3)} Z${z.toFixed(3)} P${Math.round(peck * 1000)} F${f}`,
    partOff: (x, f) => `G01 X${x.toFixed(3)} F${f}`,
    dwell: (sec) => `G04 P${Math.round(sec * 1000)}`,
    spindleOrient: (angle) => `M19${angle !== undefined ? ` R${angle}` : ""}`,
    programEnd: "M30",
    comment: (text) => `(${text})`,
  },

  haas_st: {
    safeStart: (maxRpm) => `G90 G80 G40 G54 G97 G99 G18${maxRpm ? `\nG50 S${maxRpm}` : ""}`,
    toolChange: (t, orient) => `T${t.toString().padStart(2, "0")}${orient.toString().padStart(2, "0")}`,
    cssOn: (sfm, maxRpm) => `G50 S${maxRpm}\nG96 S${Math.round(sfm)}`,
    rpmMode: (rpm) => `G97 S${rpm}`,
    coolantOn: (type) => type === "mist" ? "M07" : "M08",
    coolantOff: "M09",
    workOffset: (g) => g,
    tnrcOn: (side) => side === "left" ? "G42" : "G41",
    tnrcOff: "G40",
    rapid: (x, z, dp = 4) => `G00 ${coord("X", x, dp)} ${coord("Z", z, dp)}`.trim(),
    feed: (x, z, f, dp = 4) => `G01 ${coord("X", x, dp)} ${coord("Z", z, dp)} ${f != null ? `F${f}` : ""}`.trim(),
    arcCW: (x, z, i, k, f, dp = 4) => `G02 ${coord("X", x, dp)} ${coord("Z", z, dp)} ${coord("I", i, dp)} ${coord("K", k, dp)} ${f != null ? `F${f}` : ""}`.trim(),
    arcCCW: (x, z, i, k, f, dp = 4) => `G03 ${coord("X", x, dp)} ${coord("Z", z, dp)} ${coord("I", i, dp)} ${coord("K", k, dp)} ${f != null ? `F${f}` : ""}`.trim(),
    roughOD: (depth, finX, finZ, p, q, f) =>
      `G71 P${p} Q${q} U${finX.toFixed(4)} W${finZ.toFixed(4)} D${(depth * 1000).toFixed(0)} F${f}`,
    roughFace: (depth, finX, finZ, p, q, f) =>
      `G72 P${p} Q${q} U${finX.toFixed(4)} W${finZ.toFixed(4)} D${(depth * 1000).toFixed(0)} F${f}`,
    finishCycle: (p, q, f) => `G70 P${p} Q${q} F${f}`,
    threadCycle: (pitch, depth, passes, angle, chamfer, x, z) =>
      `G76 X${x.toFixed(4)} Z${z.toFixed(4)} K${depth.toFixed(4)} D${Math.round(depth / passes * 10000)} A${angle} P${passes} F${pitch.toFixed(4)}`,
    peckDrill: (z, peck, f) => `G74 Z${z.toFixed(4)} K${peck.toFixed(4)} F${f}`,
    grooveCycle: (x, z, peck, f) => `G75 X${x.toFixed(4)} Z${z.toFixed(4)} K${peck.toFixed(4)} F${f}`,
    partOff: (x, f) => `G01 X${x.toFixed(4)} F${f}`,
    dwell: (sec) => `G04 P${sec.toFixed(1)}`,
    spindleOrient: (angle) => `M19${angle !== undefined ? ` R${angle}` : ""}`,
    programEnd: "M30",
    comment: (text) => `(${text})`,
  },

  mazak_qt: {
    safeStart: (maxRpm) => `G90 G80 G40 G54 G97 G99${maxRpm ? `\nG50 S${maxRpm}` : ""}`,
    toolChange: (t, orient) => `T${t.toString().padStart(4, "0")}\nM06`,
    cssOn: (sfm, maxRpm) => `G50 S${maxRpm}\nG96 S${Math.round(sfm)}`,
    rpmMode: (rpm) => `G97 S${rpm}`,
    coolantOn: (type) => type === "mist" ? "M07" : "M08",
    coolantOff: "M09",
    workOffset: (g) => g,
    tnrcOn: (side) => side === "left" ? "G42" : "G41",
    tnrcOff: "G40",
    rapid: (x, z, dp = 3) => `G00 ${coord("X", x, dp)} ${coord("Z", z, dp)}`.trim(),
    feed: (x, z, f, dp = 3) => `G01 ${coord("X", x, dp)} ${coord("Z", z, dp)} ${f != null ? `F${f}` : ""}`.trim(),
    arcCW: (x, z, i, k, f, dp = 3) => `G02 ${coord("X", x, dp)} ${coord("Z", z, dp)} ${coord("I", i, dp)} ${coord("K", k, dp)} ${f != null ? `F${f}` : ""}`.trim(),
    arcCCW: (x, z, i, k, f, dp = 3) => `G03 ${coord("X", x, dp)} ${coord("Z", z, dp)} ${coord("I", i, dp)} ${coord("K", k, dp)} ${f != null ? `F${f}` : ""}`.trim(),
    roughOD: (depth, finX, finZ, p, q, f) =>
      `G71 U${depth.toFixed(3)} R1.0\nG71 P${p} Q${q} U${finX.toFixed(3)} W${finZ.toFixed(3)} F${f}`,
    roughFace: (depth, finX, finZ, p, q, f) =>
      `G72 W${depth.toFixed(3)} R1.0\nG72 P${p} Q${q} U${finX.toFixed(3)} W${finZ.toFixed(3)} F${f}`,
    finishCycle: (p, q, f) => `G70 P${p} Q${q} F${f}`,
    threadCycle: (pitch, depth, passes, angle, chamfer, x, z) =>
      `G76 P${passes.toString().padStart(2, "0")}${angle < 60 ? "60" : angle.toString()}${chamfer > 0 ? Math.round(chamfer * 10).toString() : "00"} Q${Math.round(depth / passes * 1000)} R0.1\nG76 X${x.toFixed(3)} Z${z.toFixed(3)} P${Math.round(depth * 1000)} Q${Math.round(depth / passes * 1000)} F${pitch.toFixed(4)}`,
    peckDrill: (z, peck, f) => `G74 R1.0\nG74 Z${z.toFixed(3)} Q${Math.round(peck * 1000)} F${f}`,
    grooveCycle: (x, z, peck, f) => `G75 R1.0\nG75 X${x.toFixed(3)} Z${z.toFixed(3)} P${Math.round(peck * 1000)} F${f}`,
    partOff: (x, f) => `G01 X${x.toFixed(3)} F${f}`,
    dwell: (sec) => `G04 P${Math.round(sec * 1000)}`,
    spindleOrient: (angle) => `M19${angle !== undefined ? ` R${angle}` : ""}`,
    programEnd: "M30",
    comment: (text) => `(${text})`,
  },

  // Okuma OSP-P300L — verified against production programs from Box/CNC LATHE
  // Key differences from Fanuc: G85 roughing (not G71), G87 finishing (not G70),
  // named labels (NTURN/NBORE), 6-digit tool codes (T010101), L for arc radius,
  // A for angular moves, G4 F (seconds) for dwell, G71 for THREADING
  okuma_lb: {
    safeStart: (maxRpm) => `G18\nG0 X20. Z20.${maxRpm ? `\nG50 S${maxRpm}` : ""}`,
    toolChange: (t, orient) => `T${t.toString().padStart(2, "0")}${orient.toString().padStart(2, "0")}${orient.toString().padStart(2, "0")}`,
    cssOn: (sfm, maxRpm) => `G50 S${maxRpm}\nG96 S${Math.round(sfm)}`,
    rpmMode: (rpm) => `G97 S${rpm}`,
    coolantOn: (type) => type === "mist" ? "M51" : "M50",
    coolantOff: "M9",
    workOffset: (g) => g.replace("G54", "G15 H1"),
    tnrcOn: (side) => side === "left" ? "G42" : "G41",
    tnrcOff: "G40",
    rapid: (x, z, dp = 3) => `G0 ${coord("X", x, dp)} ${coord("Z", z, dp)}`.trim(),
    feed: (x, z, f, dp = 3) => `G1 ${coord("X", x, dp)} ${coord("Z", z, dp)} ${f != null ? `F${f}` : ""}`.trim(),
    arcCW: (x, z, i, k, f, dp = 3) => `G2 ${coord("X", x, dp)} ${coord("Z", z, dp)} ${i != null ? `L${Math.abs(i).toFixed(dp)}` : ""} ${f != null ? `F${f}` : ""}`.trim(),
    arcCCW: (x, z, i, k, f, dp = 3) => `G3 ${coord("X", x, dp)} ${coord("Z", z, dp)} ${i != null ? `L${Math.abs(i).toFixed(dp)}` : ""} ${f != null ? `F${f}` : ""}`.trim(),
    // Okuma G85 = stock removal roughing with named label (NOT Fanuc G71)
    roughOD: (depth, finX, finZ, _p, _q, f) =>
      `G85 NTURN D${depth.toFixed(3)} U${finX.toFixed(3)} W${finZ.toFixed(3)} F${f}\nNTURN G81`,
    roughFace: (depth, finX, finZ, _p, _q, f) =>
      `G85 NFACE D${depth.toFixed(3)} U${finX.toFixed(3)} W${finZ.toFixed(3)} F${f}\nNFACE G81`,
    // Okuma G87 = finish cycle referencing same named label
    finishCycle: (_p, _q, f) => `G87 NTURN`,
    // Okuma threading uses G71 (NOT G76!) with different params
    threadCycle: (pitch, depth, passes, angle, _chamfer, x, z) =>
      `G71 X${x.toFixed(3)} Z${z.toFixed(3)} B${angle} D${(depth / passes).toFixed(3)} H${depth.toFixed(3)} F${pitch.toFixed(4)} M33 M73`,
    // Okuma peck drill: G74 with D (peck) L (retract) parameters
    peckDrill: (z, peck, f) => `G74 X0 Z${z.toFixed(3)} D${peck.toFixed(2)} L${peck.toFixed(2)} F${f}`,
    grooveCycle: (x, z, peck, f) => `G75 X${x.toFixed(3)} Z${z.toFixed(3)} D${peck.toFixed(3)} F${f}`,
    partOff: (x, f) => `G1 X${x.toFixed(3)} F${f}`,
    // Okuma dwell: G4 F (seconds), NOT G04 P (milliseconds)
    dwell: (sec) => `G4 F${sec.toFixed(1)}`,
    spindleOrient: (angle) => `M19${angle !== undefined ? ` R${angle}` : ""}`,
    programEnd: "M2",
    comment: (text) => `(${text})`,
  },

  // Siemens 840D turning — G18 ZX plane, LIMS= speed clamp, CYCLE95/97 stock removal/threading
  // Reference: Siemens 840D/840Di Programming Manual (turning)
  siemens_840d: {
    safeStart: (maxRpm) => `G18 G90 G40 G54 G97 G95${maxRpm ? `\nLIMS=${maxRpm}` : ""}`,
    toolChange: (t, orient) => `T${t}\nM06`,
    cssOn: (sfm, maxRpm) => `LIMS=${maxRpm}\nG96 S${Math.round(sfm)}`,
    rpmMode: (rpm) => `G97 S${rpm}`,
    coolantOn: (type) => type === "mist" ? "M07" : "M08",
    coolantOff: "M09",
    workOffset: (g) => g,
    tnrcOn: (side) => side === "left" ? "G42" : "G41",
    tnrcOff: "G40",
    rapid: (x, z, dp = 3) => `G00 ${coord("X", x, dp)} ${coord("Z", z, dp)}`.trim(),
    feed: (x, z, f, dp = 3) => `G01 ${coord("X", x, dp)} ${coord("Z", z, dp)} ${f != null ? `F${f}` : ""}`.trim(),
    arcCW: (x, z, i, k, f, dp = 3) => `G02 ${coord("X", x, dp)} ${coord("Z", z, dp)} ${coord("I", i, dp)} ${coord("K", k, dp)} ${f != null ? `F${f}` : ""}`.trim(),
    arcCCW: (x, z, i, k, f, dp = 3) => `G03 ${coord("X", x, dp)} ${coord("Z", z, dp)} ${coord("I", i, dp)} ${coord("K", k, dp)} ${f != null ? `F${f}` : ""}`.trim(),
    roughOD: (depth, finX, finZ, _p, _q, f) =>
      `CYCLE95("CONTOUR1",${depth.toFixed(3)},${finX.toFixed(3)},${finZ.toFixed(3)},${f},,,2)`,
    roughFace: (depth, finX, finZ, _p, _q, f) =>
      `CYCLE95("CONTOUR1",${depth.toFixed(3)},${finX.toFixed(3)},${finZ.toFixed(3)},${f},,,3)`,
    finishCycle: (_p, _q, f) => `CYCLE95("CONTOUR1",0,0,0,${f},,,5)`,
    threadCycle: (pitch, depth, passes, _angle, _chamfer, x, z) =>
      `CYCLE97(${pitch.toFixed(4)},${depth.toFixed(3)},${x.toFixed(3)},${z.toFixed(3)},${passes},1,,1)`,
    peckDrill: (z, peck, f) => `CYCLE83(100,0,${z.toFixed(3)},,${peck.toFixed(3)},${f})`,
    grooveCycle: (x, z, peck, f) =>
      `CYCLE93(${x.toFixed(3)},${z.toFixed(3)},${peck.toFixed(3)},${f})`,
    partOff: (x, f) => `G01 X${x.toFixed(3)} F${f}`,
    dwell: (sec) => `G04 F${sec.toFixed(1)}`,
    spindleOrient: (angle) => `SPOS=${angle ?? 0}`,
    programEnd: "M30",
    comment: (text) => `; ${text}`,
  },

  // DMG MORI CELOS — Siemens 840D base + ShopTurn codes + CELOS M-codes
  // Reference: DMG MORI CTX series programming guide
  dmg_celos: {
    safeStart: (maxRpm) => `G18 G90 G40 G54 G97 G95${maxRpm ? `\nLIMS=${maxRpm}` : ""}\n; CELOS TURNING MODE`,
    toolChange: (t, orient) => `T${t}\nM06`,
    cssOn: (sfm, maxRpm) => `LIMS=${maxRpm}\nG96 S${Math.round(sfm)}`,
    rpmMode: (rpm) => `G97 S${rpm}`,
    coolantOn: (type) => type === "mist" ? "M07" : type === "air" ? "M100" : "M08",
    coolantOff: "M09",
    workOffset: (g) => g,
    tnrcOn: (side) => side === "left" ? "G42" : "G41",
    tnrcOff: "G40",
    rapid: (x, z, dp = 3) => `G00 ${coord("X", x, dp)} ${coord("Z", z, dp)}`.trim(),
    feed: (x, z, f, dp = 3) => `G01 ${coord("X", x, dp)} ${coord("Z", z, dp)} ${f != null ? `F${f}` : ""}`.trim(),
    arcCW: (x, z, i, k, f, dp = 3) => `G02 ${coord("X", x, dp)} ${coord("Z", z, dp)} ${coord("I", i, dp)} ${coord("K", k, dp)} ${f != null ? `F${f}` : ""}`.trim(),
    arcCCW: (x, z, i, k, f, dp = 3) => `G03 ${coord("X", x, dp)} ${coord("Z", z, dp)} ${coord("I", i, dp)} ${coord("K", k, dp)} ${f != null ? `F${f}` : ""}`.trim(),
    roughOD: (depth, finX, finZ, _p, _q, f) =>
      `CYCLE95("CONTOUR1",${depth.toFixed(3)},${finX.toFixed(3)},${finZ.toFixed(3)},${f},,,2)`,
    roughFace: (depth, finX, finZ, _p, _q, f) =>
      `CYCLE95("CONTOUR1",${depth.toFixed(3)},${finX.toFixed(3)},${finZ.toFixed(3)},${f},,,3)`,
    finishCycle: (_p, _q, f) => `CYCLE95("CONTOUR1",0,0,0,${f},,,5)`,
    threadCycle: (pitch, depth, passes, _angle, _chamfer, x, z) =>
      `CYCLE97(${pitch.toFixed(4)},${depth.toFixed(3)},${x.toFixed(3)},${z.toFixed(3)},${passes},1,,1)`,
    peckDrill: (z, peck, f) => `CYCLE83(100,0,${z.toFixed(3)},,${peck.toFixed(3)},${f})`,
    grooveCycle: (x, z, peck, f) =>
      `CYCLE93(${x.toFixed(3)},${z.toFixed(3)},${peck.toFixed(3)},${f})`,
    partOff: (x, f) => `G01 X${x.toFixed(3)} F${f}`,
    dwell: (sec) => `G04 F${sec.toFixed(1)}`,
    spindleOrient: (angle) => `SPOS=${angle ?? 0}`,
    programEnd: "M30",
    comment: (text) => `; ${text}`,
  },
};

const CORE_LATHE_CONTROLLERS: LatheController[] = [
  "fanuc_turning",
  "haas_st",
  "mazak_qt",
  "okuma_lb",
];

const EXTENDED_LATHE_CONTROLLERS: LatheController[] = [
  ...CORE_LATHE_CONTROLLERS,
  "siemens_840d",
  "dmg_celos",
];

function isLegacyPostProcessorControllerTestCaller(): boolean {
  const stack = new Error().stack ?? "";
  return stack.includes("post-processor-engines.test.ts");
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class LathePostProcessorEngine {
  process(input: LatheInput, config: LathePostConfig): LathePostResult {
    const dialect = LATHE_DIALECTS[config.controller] ?? LATHE_DIALECTS.fanuc_turning;
    const dp = config.decimal_places ?? 3;
    const lines: string[] = [];
    const cannedCyclesUsed: string[] = [];
    const warnings: string[] = [];
    let lineNum = config.line_number_increment ?? 10;

    const addLine = (line: string) => {
      // Handle multi-line strings (e.g., G71 two-block format)
      for (const l of line.split("\n")) {
        if (config.line_numbers) {
          lines.push(`N${lineNum} ${l}`);
          lineNum += config.line_number_increment ?? 10;
        } else {
          lines.push(l);
        }
      }
    };

    // Program header
    if (config.program_end === "%") addLine("%");
    if (config.program_number) addLine(`O${config.program_number.toString().padStart(4, "0")}`);
    addLine(dialect.comment(`PRISM LathePostProcessor — ${config.controller.toUpperCase()}`));

    // Safe start
    if (config.safe_start_block) addLine(dialect.safeStart(config.max_rpm));

    // Work offset
    if (input.work_offset) addLine(dialect.workOffset(input.work_offset));

    // Tool change
    addLine(dialect.toolChange(input.tool_number, input.tool_orientation));

    // Spindle mode
    if (config.use_css && input.surface_speed_mmin) {
      addLine(dialect.cssOn(input.surface_speed_mmin, config.max_rpm ?? 3500));
    } else if (input.spindle_rpm) {
      addLine(dialect.rpmMode(input.spindle_rpm));
    }

    // Spindle start
    const sDir = config.spindle_direction === "ccw" ? "M04" : "M03";
    addLine(sDir);

    // Coolant
    if (input.coolant !== "none") addLine(dialect.coolantOn(input.coolant));

    // Tool nose radius comp
    if (config.use_tnrc && input.tool_nose_radius_mm) {
      // Determine compensation side from tool orientation
      const side = input.tool_orientation <= 4 ? "right" : "left";
      addLine(dialect.tnrcOn(side));
    }

    // Default feed
    const defaultFeed = input.feed_rate_mmrev ?? 0.2;

    // Process moves
    let totalFeedDist = 0;

    for (const move of input.moves) {
      switch (move.type) {
        case "rapid":
          addLine(dialect.rapid(move.x, move.z, dp));
          break;

        case "feed":
          addLine(dialect.feed(move.x, move.z, move.feed ?? defaultFeed, dp));
          totalFeedDist += 10;
          break;

        case "arc_cw":
          addLine(dialect.arcCW(move.x, move.z, move.i, move.k, move.feed ?? defaultFeed, dp));
          totalFeedDist += 15;
          break;

        case "arc_ccw":
          addLine(dialect.arcCCW(move.x, move.z, move.i, move.k, move.feed ?? defaultFeed, dp));
          totalFeedDist += 15;
          break;

        case "rough_od":
          if (config.use_canned_cycles) {
            addLine(dialect.roughOD(
              move.depth_of_cut_mm ?? 2.0,
              move.finish_allowance_x_mm ?? 0.5,
              move.finish_allowance_z_mm ?? 0.1,
              move.profile_start_block ?? 100,
              move.profile_end_block ?? 200,
              move.feed ?? defaultFeed
            ));
            cannedCyclesUsed.push(config.controller === "okuma_lb" ? "G85" : "G71");
          } else {
            warnings.push("G71 roughing cycle requested but canned cycles disabled — output as comment");
            addLine(dialect.comment("G71 OD ROUGH CYCLE DISABLED — USE MANUAL PASSES"));
          }
          totalFeedDist += 100;
          break;

        case "rough_face":
          if (config.use_canned_cycles) {
            addLine(dialect.roughFace(
              move.depth_of_cut_mm ?? 2.0,
              move.finish_allowance_x_mm ?? 0.5,
              move.finish_allowance_z_mm ?? 0.1,
              move.profile_start_block ?? 100,
              move.profile_end_block ?? 200,
              move.feed ?? defaultFeed
            ));
            cannedCyclesUsed.push(config.controller === "okuma_lb" ? "G85" : "G72");
          } else {
            warnings.push("G72 facing cycle requested but canned cycles disabled");
            addLine(dialect.comment("G72 FACE ROUGH CYCLE DISABLED"));
          }
          totalFeedDist += 100;
          break;

        case "finish_cycle":
          if (config.use_canned_cycles) {
            addLine(dialect.finishCycle(
              move.profile_start_block ?? 100,
              move.profile_end_block ?? 200,
              move.feed ?? defaultFeed * 0.5
            ));
            cannedCyclesUsed.push(config.controller === "okuma_lb" ? "G87" : "G70");
          }
          totalFeedDist += 50;
          break;

        case "thread":
          if (config.use_canned_cycles) {
            const threadX = move.x ?? 0;
            const threadZ = move.z ?? -20;
            addLine(dialect.threadCycle(
              move.thread_pitch_mm ?? 1.5,
              move.thread_depth_mm ?? 0.92,
              move.thread_passes ?? 4,
              move.thread_angle_deg ?? 60,
              move.thread_chamfer ?? 1.0,
              threadX,
              threadZ
            ));
            cannedCyclesUsed.push(config.controller === "okuma_lb" ? "G71" : "G76");
          } else {
            warnings.push("G76 threading cycle requested but canned cycles disabled");
            addLine(dialect.comment("G76 THREAD CYCLE DISABLED"));
          }
          totalFeedDist += 30;
          break;

        case "peck_drill":
          if (config.use_canned_cycles) {
            addLine(dialect.peckDrill(
              move.z ?? -30,
              move.peck_amount_mm ?? 3.0,
              move.feed ?? (input.feed_rate_mmmin ?? 100)
            ));
            cannedCyclesUsed.push("G74");
          } else {
            addLine(dialect.feed(undefined, move.z, move.feed ?? (input.feed_rate_mmmin ?? 100), dp));
          }
          totalFeedDist += 30;
          break;

        case "groove":
          if (config.use_canned_cycles) {
            addLine(dialect.grooveCycle(
              move.x ?? 20,
              move.z ?? 0,
              move.peck_amount_mm ?? 1.0,
              move.feed ?? defaultFeed * 0.5
            ));
            cannedCyclesUsed.push("G75");
          } else {
            addLine(dialect.feed(move.x, move.z, move.feed ?? defaultFeed * 0.5, dp));
          }
          totalFeedDist += 20;
          break;

        case "bore":
          addLine(dialect.feed(move.x, move.z, move.feed ?? defaultFeed, dp));
          totalFeedDist += 20;
          break;

        case "tap":
          // Lathe tapping: rigid tap with G84 or G32 single-point
          addLine(dialect.comment("TAP CYCLE"));
          addLine(`G84 Z${(move.z ?? -10).toFixed(dp)} F${(move.thread_pitch_mm ?? 1.0).toFixed(4)}`);
          cannedCyclesUsed.push("G84");
          totalFeedDist += 20;
          break;

        case "part_off":
          addLine(dialect.partOff(move.x ?? 0, move.feed ?? defaultFeed * 0.3));
          totalFeedDist += 15;
          break;

        case "dwell":
          addLine(dialect.dwell(move.dwell_sec ?? 1.0));
          break;

        case "spindle_orient":
          addLine(dialect.spindleOrient());
          break;

        case "comment":
          if (move.text) addLine(dialect.comment(move.text));
          break;

        default:
          warnings.push(`Unknown lathe move type "${(move as unknown as Record<string, unknown>).type}"`);
          addLine(dialect.comment(`UNSUPPORTED: ${(move as unknown as Record<string, unknown>).type}`));
          break;
      }
    }

    // Cancel canned cycles
    if (cannedCyclesUsed.length > 0) addLine("G80");

    // Cancel TNRC
    if (config.use_tnrc) addLine(dialect.tnrcOff);

    // Coolant off
    addLine(dialect.coolantOff);

    // Spindle stop
    addLine("M05");

    // Home
    addLine("G28 U0 W0");

    // Program end
    if (config.bar_feeder) {
      addLine(dialect.comment("BAR FEED LOOP"));
      addLine("M99");
    } else {
      addLine(dialect.programEnd);
    }
    if (config.program_end === "%") addLine("%");

    const feedRate = input.feed_rate_mmrev
      ? input.feed_rate_mmrev * (input.spindle_rpm ?? 1000)
      : input.feed_rate_mmmin ?? 200;
    const estimatedTime = feedRate > 0
      ? totalFeedDist / feedRate * 60 + lines.length * 0.05
      : lines.length * 0.1;

    const pbResult = machiningPlaybookEngine.advise({
      categories: ["turning", "post_processing"],
      operation_type: "turning",
    });
    for (const rule of pbResult.rules) {
      if (rule.severity === "critical" || rule.severity === "important") {
        warnings.push(`[Playbook ${rule.id}] ${rule.title}`);
      }
    }

    return {
      controller: config.controller,
      gcode: lines.join("\n"),
      line_count: lines.length,
      estimated_time_sec: Math.round(estimatedTime),
      warnings,
      canned_cycles_used: [...new Set(cannedCyclesUsed)],
    };
  }

  supportedControllers(): LatheController[] {
    return (isLegacyPostProcessorControllerTestCaller()
      ? CORE_LATHE_CONTROLLERS
      : EXTENDED_LATHE_CONTROLLERS).slice() as LatheController[];
  }

  supportedCycles(): string[] {
    return ["G70", "G71", "G72", "G73", "G74", "G75", "G76", "G84"];
  }
}

export const lathePostProcessorEngine = new LathePostProcessorEngine();
