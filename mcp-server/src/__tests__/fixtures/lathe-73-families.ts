/**
 * LATHE-PRO-MS0.5, Session 18, U-LPTEST01
 * 73 Part Family Test Fixtures
 *
 * Every lathe part maps to one of these families. Each fixture defines:
 * - features[], material, workpiece_type, controller
 * - Named after the dominant geometry/operation
 *
 * Taxonomy: F=Fundamental, A=Axes/Threading, D=Drilling, M=Material,
 *           V=grooVing, H=Holding, O=One-setup, E=Edge, G=General, X=eXotic
 */

import type { LatheOrchestrationInput } from "../../engines/LatheOrchestrationEngine.js";

type PartFamily = {
  id: string;
  name: string;
  tier: string;
  input: LatheOrchestrationInput;
};

const P = "P" as const; const M = "M" as const; const K = "K" as const;
const N = "N" as const; const S = "S" as const; const H = "H" as const;

// ── TIER 1: Fundamental Geometry (F1-F18) ────────────────────────────

const F: PartFamily[] = [
  { id: "F1", name: "Simple shaft — OD straight", tier: "fundamental", input: {
    part_number: "F1-SHAFT", bar_stock_od_mm: 50, part_length_mm: 100,
    material: { material_name: "AISI 1045", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_straight", od_mm: 45, length_mm: 80 },
    ],
  }},
  { id: "F2", name: "Stepped shaft — 3 diameters", tier: "fundamental", input: {
    part_number: "F2-STEP", bar_stock_od_mm: 50, part_length_mm: 120,
    material: { material_name: "AISI 4140", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_straight", od_mm: 45, length_mm: 40 },
      { id: "f3", type: "od_straight", od_mm: 35, length_mm: 40 },
      { id: "f4", type: "od_straight", od_mm: 25, length_mm: 30 },
    ],
  }},
  { id: "F3", name: "Taper — 5 degree OD", tier: "fundamental", input: {
    part_number: "F3-TAPER", bar_stock_od_mm: 40, part_length_mm: 60,
    material: { material_name: "AISI 1045", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_taper", od_mm: 38, length_mm: 50, taper_angle_deg: 5 },
    ],
  }},
  { id: "F4", name: "Contour — OD profile", tier: "fundamental", input: {
    part_number: "F4-CONTOUR", bar_stock_od_mm: 60, part_length_mm: 80,
    material: { material_name: "AISI 4140", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_contour", od_mm: 55, length_mm: 70, profile_points: [
        { X: 55, Z: 0, type: "linear" as any },
        { X: 55, Z: -20, type: "linear" as any },
        { X: 45, Z: -40, type: "arc_cw" as any, R: 15 },
        { X: 50, Z: -70, type: "linear" as any },
        { X: 60, Z: -70, type: "linear" as any },
      ]},
    ],
  }},
  { id: "F5", name: "Face only — disc", tier: "fundamental", input: {
    part_number: "F5-DISC", bar_stock_od_mm: 80, part_length_mm: 15,
    material: { material_name: "AISI 1018", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_straight", od_mm: 78, length_mm: 10 },
    ],
  }},
  { id: "F6", name: "Bore — through bore", tier: "fundamental", input: {
    part_number: "F6-BORE", bar_stock_od_mm: 50, part_length_mm: 40,
    material: { material_name: "AISI 4140", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "id_bore", id_mm: 25, length_mm: 40 },
    ],
  }},
  { id: "F7", name: "Shoulder — OD step with tight tolerance", tier: "fundamental", input: {
    part_number: "F7-SHOULDER", bar_stock_od_mm: 40, part_length_mm: 50,
    material: { material_name: "AISI 4140", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_shoulder", od_mm: 35, length_mm: 25, tolerance_mm: 0.01 },
      { id: "f3", type: "od_straight", od_mm: 25, length_mm: 20, tolerance_mm: 0.025 },
    ],
  }},
  { id: "F8", name: "Long shaft — 6:1 L/D", tier: "fundamental", input: {
    part_number: "F8-LONG", bar_stock_od_mm: 25, part_length_mm: 150,
    material: { material_name: "AISI 1045", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_straight", od_mm: 22, length_mm: 140 },
    ],
  }},
  { id: "F9", name: "Thin wall tube", tier: "fundamental", input: {
    part_number: "F9-TUBE", bar_stock_od_mm: 30, part_length_mm: 50,
    material: { material_name: "AISI 4140", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_straight", od_mm: 28, length_mm: 45 },
      { id: "f3", type: "id_bore", id_mm: 24, length_mm: 45 },
    ],
  }},
  { id: "F10", name: "ID contour — stepped bore", tier: "fundamental", input: {
    part_number: "F10-IDBORE", bar_stock_od_mm: 60, part_length_mm: 40,
    material: { material_name: "AISI 1045", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "id_bore", id_mm: 25, length_mm: 20 },
      { id: "f3", type: "id_contour", id_mm: 30, length_mm: 15 },
    ],
  }},
  { id: "F11", name: "Casting rough — near-net-shape", tier: "fundamental", input: {
    part_number: "F11-CAST", bar_stock_od_mm: 65, part_length_mm: 50,
    material: { material_name: "Cast Iron GG25", iso_group: K },
    workpiece_type: "casting",
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_contour", od_mm: 60, length_mm: 40, profile_points: [
        { X: 60, Z: 0, type: "linear" as any },
        { X: 58, Z: -15, type: "arc_cw" as any, R: 20 },
        { X: 55, Z: -40, type: "linear" as any },
        { X: 65, Z: -40, type: "linear" as any },
      ]},
    ],
  }},
  { id: "F12", name: "Hex mill — whistle notch", tier: "fundamental", input: {
    part_number: "F12-HEX", bar_stock_od_mm: 25, part_length_mm: 30,
    material: { material_name: "AISI 12L14", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_straight", od_mm: 22, length_mm: 15 },
      { id: "f3", type: "hex_mill", od_mm: 22, length_mm: 10, width_mm: 19 },
    ],
  }},
  { id: "F13", name: "Flat mill — single flat", tier: "fundamental", input: {
    part_number: "F13-FLAT", bar_stock_od_mm: 30, part_length_mm: 40,
    material: { material_name: "AISI 1045", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_straight", od_mm: 28, length_mm: 30 },
      { id: "f3", type: "flat_mill", od_mm: 28, length_mm: 15, depth_mm: 3 },
    ],
  }},
  { id: "F14", name: "Cross drill", tier: "fundamental", input: {
    part_number: "F14-XDRILL", bar_stock_od_mm: 30, part_length_mm: 50,
    material: { material_name: "AISI 4140", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_straight", od_mm: 28, length_mm: 40 },
      { id: "f3", type: "cross_drill", od_mm: 28, length_mm: 5, cross_hole_diameter_mm: 6 },
    ],
  }},
  { id: "F15", name: "Keyway", tier: "fundamental", input: {
    part_number: "F15-KEY", bar_stock_od_mm: 40, part_length_mm: 60,
    material: { material_name: "AISI 4140", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_straight", od_mm: 35, length_mm: 50 },
      { id: "f3", type: "keyway", od_mm: 35, length_mm: 25, width_mm: 8, depth_mm: 4 },
    ],
  }},
  { id: "F16", name: "OD pocket mill", tier: "fundamental", input: {
    part_number: "F16-POCKET", bar_stock_od_mm: 40, part_length_mm: 50,
    material: { material_name: "6061 Aluminum", iso_group: N },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_straight", od_mm: 38, length_mm: 40 },
      { id: "f3", type: "od_pocket_mill", od_mm: 38, length_mm: 15, pocket_width_mm: 10, pocket_depth_mm: 3, pocket_length_mm: 20 },
    ],
  }},
  { id: "F17", name: "Face groove", tier: "fundamental", input: {
    part_number: "F17-FGROOVE", bar_stock_od_mm: 60, part_length_mm: 20,
    material: { material_name: "AISI 1045", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "face_groove", od_mm: 55, length_mm: 5, groove_width_mm: 3, groove_depth_mm: 2 },
    ],
  }},
  { id: "F18", name: "Part-off — cutoff stub", tier: "fundamental", input: {
    part_number: "F18-PARTOFF", bar_stock_od_mm: 25, part_length_mm: 15,
    material: { material_name: "AISI 12L14", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_straight", od_mm: 22, length_mm: 10 },
      { id: "f3", type: "groove_cutoff", od_mm: 22, length_mm: 3, position_z_mm: -12 },
    ],
  }},
];

// ── TIER 2: Threading (A1-A7) ────────────────────────────────────────

const A: PartFamily[] = [
  { id: "A1", name: "Metric ISO thread M24×2", tier: "threading", input: {
    part_number: "A1-M24", bar_stock_od_mm: 30, part_length_mm: 50,
    material: { material_name: "AISI 4140", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "thread_od", od_mm: 24, length_mm: 30, thread_pitch_mm: 2.0, thread_class: "6g" },
    ],
  }},
  { id: "A2", name: "UNC 1/2-13 thread", tier: "threading", input: {
    part_number: "A2-UNC", bar_stock_od_mm: 20, part_length_mm: 40,
    material: { material_name: "AISI 1045", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "thread_od", od_mm: 12.7, length_mm: 25, thread_pitch_mm: 1.954 },
    ],
  }},
  { id: "A3", name: "BSP 1/4 pipe thread", tier: "threading", input: {
    part_number: "A3-BSP", bar_stock_od_mm: 20, part_length_mm: 30,
    material: { material_name: "AISI 1045", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "thread_pipe", od_mm: 13.16, length_mm: 15, thread_pitch_mm: 1.337 },
    ],
  }},
  { id: "A4", name: "NPT 1/2 tapered pipe", tier: "threading", input: {
    part_number: "A4-NPT", bar_stock_od_mm: 25, part_length_mm: 30,
    material: { material_name: "AISI 1045", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "thread_od", od_mm: 21.22, length_mm: 20, thread_pitch_mm: 1.814 },
    ],
  }},
  { id: "A5", name: "Acme 1-5 thread", tier: "threading", input: {
    part_number: "A5-ACME", bar_stock_od_mm: 30, part_length_mm: 60,
    material: { material_name: "AISI 4140", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "thread_od", od_mm: 25.4, length_mm: 40, thread_pitch_mm: 5.08 },
    ],
  }},
  { id: "A6", name: "ID thread M30×1.5", tier: "threading", input: {
    part_number: "A6-IDTHREAD", bar_stock_od_mm: 40, part_length_mm: 30,
    material: { material_name: "AISI 4140", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "id_bore", id_mm: 28, length_mm: 25 },
      { id: "f3", type: "thread_id", od_mm: 30, length_mm: 20, thread_pitch_mm: 1.5 },
    ],
  }},
  { id: "A7", name: "Multi-start thread (2-start)", tier: "threading", input: {
    part_number: "A7-MULTI", bar_stock_od_mm: 30, part_length_mm: 40,
    material: { material_name: "AISI 1045", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "thread_od", od_mm: 25, length_mm: 30, thread_pitch_mm: 3.0, thread_starts: 2 },
    ],
  }},
];

// ── TIER 3: Drilling (D1-D4) ──────────────────────────────────────

const D: PartFamily[] = [
  { id: "D1", name: "Center drill + through drill", tier: "drilling", input: {
    part_number: "D1-DRILL", bar_stock_od_mm: 30, part_length_mm: 40,
    material: { material_name: "AISI 1045", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "drill_center", diameter_mm: 3.15, length_mm: 5 },
      { id: "f3", type: "drill_through", diameter_mm: 10, length_mm: 40 },
    ],
  }},
  { id: "D2", name: "Blind drill", tier: "drilling", input: {
    part_number: "D2-BLIND", bar_stock_od_mm: 40, part_length_mm: 50,
    material: { material_name: "AISI 4140", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "drill_blind", diameter_mm: 12, length_mm: 25, depth_mm: 25 },
    ],
  }},
  { id: "D3", name: "Deep hole drill (10:1 L/D)", tier: "drilling", input: {
    part_number: "D3-DEEP", bar_stock_od_mm: 30, part_length_mm: 80,
    material: { material_name: "AISI 1045", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "drill_through", diameter_mm: 8, length_mm: 80 },
    ],
  }},
  { id: "D4", name: "Drill + bore + ream", tier: "drilling", input: {
    part_number: "D4-REAM", bar_stock_od_mm: 40, part_length_mm: 30,
    material: { material_name: "AISI 4140", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "drill_through", diameter_mm: 14, length_mm: 30 },
      { id: "f3", type: "id_bore", id_mm: 15, length_mm: 30, tolerance_mm: 0.01 },
    ],
  }},
];

// ── TIER 4: Material Extremes (M1-M8) ─────────────────────────────

const MAT: PartFamily[] = [
  { id: "M1", name: "Aluminum 6061", tier: "material", input: {
    part_number: "M1-ALU", bar_stock_od_mm: 50, part_length_mm: 60,
    material: { material_name: "6061-T6 Aluminum", iso_group: N },
    features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 45, length_mm: 50 }],
  }},
  { id: "M2", name: "Stainless 304", tier: "material", input: {
    part_number: "M2-SS304", bar_stock_od_mm: 40, part_length_mm: 50,
    material: { material_name: "304 Stainless", iso_group: M },
    features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 35, length_mm: 40 }],
  }},
  { id: "M3", name: "Titanium Ti-6Al-4V", tier: "material", input: {
    part_number: "M3-TI64", bar_stock_od_mm: 30, part_length_mm: 40,
    material: { material_name: "Ti-6Al-4V", iso_group: S },
    features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 25, length_mm: 30 }],
  }},
  { id: "M4", name: "Inconel 718", tier: "material", input: {
    part_number: "M4-IN718", bar_stock_od_mm: 30, part_length_mm: 30,
    material: { material_name: "Inconel 718", iso_group: S },
    features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 25, length_mm: 20 }],
  }},
  { id: "M5", name: "Hardened steel HRC 58", tier: "material", input: {
    part_number: "M5-HARD", bar_stock_od_mm: 30, part_length_mm: 20,
    material: { material_name: "D2 Tool Steel", iso_group: H, hardness_hrc: 58 },
    features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 28, length_mm: 15 }],
  }},
  { id: "M6", name: "Free machining brass", tier: "material", input: {
    part_number: "M6-BRASS", bar_stock_od_mm: 25, part_length_mm: 30,
    material: { material_name: "C360 Brass", iso_group: N },
    features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 22, length_mm: 25 }],
  }},
  { id: "M7", name: "Cast iron GG30", tier: "material", input: {
    part_number: "M7-CI", bar_stock_od_mm: 60, part_length_mm: 30,
    material: { material_name: "GG30 Cast Iron", iso_group: K },
    features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 55, length_mm: 25 }],
  }},
  { id: "M8", name: "Free machining 12L14", tier: "material", input: {
    part_number: "M8-12L14", bar_stock_od_mm: 20, part_length_mm: 25,
    material: { material_name: "AISI 12L14", iso_group: P },
    features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 18, length_mm: 20 }],
  }},
];

// ── TIER 5: Grooving (V1-V9) ──────────────────────────────────────

const V: PartFamily[] = [
  { id: "V1", name: "OD groove — single", tier: "grooving", input: {
    part_number: "V1-ODGRV", bar_stock_od_mm: 40, part_length_mm: 50,
    material: { material_name: "AISI 4140", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 35, length_mm: 40 },
      { id: "f3", type: "groove_od", od_mm: 35, length_mm: 4, groove_width_mm: 3, groove_depth_mm: 4, position_z_mm: -20 },
    ],
  }},
  { id: "V2", name: "OD groove — multiple (3)", tier: "grooving", input: {
    part_number: "V2-MULTI", bar_stock_od_mm: 40, part_length_mm: 60,
    material: { material_name: "AISI 1045", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 35, length_mm: 50 },
      { id: "f3", type: "groove_od", od_mm: 35, length_mm: 3, groove_width_mm: 2, groove_depth_mm: 3, position_z_mm: -10 },
      { id: "f4", type: "groove_od", od_mm: 35, length_mm: 3, groove_width_mm: 2, groove_depth_mm: 3, position_z_mm: -25 },
      { id: "f5", type: "groove_od", od_mm: 35, length_mm: 3, groove_width_mm: 2, groove_depth_mm: 3, position_z_mm: -40 },
    ],
  }},
  { id: "V3", name: "ID groove", tier: "grooving", input: {
    part_number: "V3-IDGRV", bar_stock_od_mm: 50, part_length_mm: 30,
    material: { material_name: "AISI 4140", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "id_bore", id_mm: 30, length_mm: 25 },
      { id: "f3", type: "groove_id", od_mm: 30, length_mm: 3, groove_width_mm: 2, groove_depth_mm: 2 },
    ],
  }},
  { id: "V4", name: "Face groove + OD groove", tier: "grooving", input: {
    part_number: "V4-COMBO", bar_stock_od_mm: 50, part_length_mm: 30,
    material: { material_name: "AISI 1045", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 45, length_mm: 25 },
      { id: "f3", type: "face_groove", od_mm: 45, length_mm: 3, groove_width_mm: 3, groove_depth_mm: 2 },
      { id: "f4", type: "groove_od", od_mm: 45, length_mm: 3, groove_width_mm: 2, groove_depth_mm: 3, position_z_mm: -15 },
    ],
  }},
  { id: "V5", name: "O-ring groove (tight tolerance)", tier: "grooving", input: {
    part_number: "V5-ORING", bar_stock_od_mm: 30, part_length_mm: 30,
    material: { material_name: "AISI 4140", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 25, length_mm: 25 },
      { id: "f3", type: "groove_od", od_mm: 25, length_mm: 3, groove_width_mm: 2.62, groove_depth_mm: 1.78, position_z_mm: -10, tolerance_mm: 0.05 },
    ],
  }},
  { id: "V6", name: "Snap ring groove", tier: "grooving", input: {
    part_number: "V6-SNAP", bar_stock_od_mm: 30, part_length_mm: 40,
    material: { material_name: "AISI 1045", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 25, length_mm: 35 },
      { id: "f3", type: "groove_od", od_mm: 25, length_mm: 2, groove_width_mm: 1.6, groove_depth_mm: 1.2, position_z_mm: -5 },
    ],
  }},
  { id: "V7", name: "Wide groove (15mm)", tier: "grooving", input: {
    part_number: "V7-WIDE", bar_stock_od_mm: 60, part_length_mm: 60,
    material: { material_name: "AISI 1045", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 55, length_mm: 50 },
      { id: "f3", type: "groove_od", od_mm: 55, length_mm: 15, groove_width_mm: 15, groove_depth_mm: 5, position_z_mm: -20 },
    ],
  }},
  { id: "V8", name: "Thread undercut groove", tier: "grooving", input: {
    part_number: "V8-UCUT", bar_stock_od_mm: 30, part_length_mm: 50,
    material: { material_name: "AISI 4140", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "groove_od", od_mm: 25, length_mm: 3, groove_width_mm: 2, groove_depth_mm: 1, position_z_mm: -28 },
      { id: "f3", type: "thread_od", od_mm: 24, length_mm: 25, thread_pitch_mm: 2.0 },
    ],
  }},
  { id: "V9", name: "Part-off with groove finish", tier: "grooving", input: {
    part_number: "V9-PARTGRV", bar_stock_od_mm: 25, part_length_mm: 20,
    material: { material_name: "AISI 12L14", iso_group: P },
    features: [
      { id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 22, length_mm: 15 },
      { id: "f3", type: "groove_cutoff", od_mm: 22, length_mm: 3, position_z_mm: -17 },
    ],
  }},
];

// ── Remaining tiers (compact) ──────────────────────────────────────

const HOLDING: PartFamily[] = [
  { id: "H1", name: "Bar stock — standard 3-jaw", tier: "workholding", input: { part_number: "H1-3JAW", bar_stock_od_mm: 25, part_length_mm: 40, material: { material_name: "AISI 1045", iso_group: P }, chuck_type: "3_jaw" as any, features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 22, length_mm: 30 }] }},
  { id: "H2", name: "Collet — precision", tier: "workholding", input: { part_number: "H2-COLLET", bar_stock_od_mm: 20, part_length_mm: 30, material: { material_name: "AISI 4140", iso_group: P }, chuck_type: "collet" as any, features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 18, length_mm: 25, tolerance_mm: 0.005 }] }},
  { id: "H3", name: "4-jaw — irregular shape", tier: "workholding", input: { part_number: "H3-4JAW", bar_stock_od_mm: 80, part_length_mm: 30, material: { material_name: "AISI 1045", iso_group: P }, chuck_type: "4_jaw" as any, features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 75, length_mm: 25 }] }},
  { id: "H4", name: "Between centers", tier: "workholding", input: { part_number: "H4-CENTERS", bar_stock_od_mm: 30, part_length_mm: 150, material: { material_name: "AISI 4140", iso_group: P }, tailstock: true, features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 25, length_mm: 140 }] }},
  { id: "H5", name: "Short stub — no tailstock", tier: "workholding", input: { part_number: "H5-STUB", bar_stock_od_mm: 50, part_length_mm: 10, material: { material_name: "AISI 1045", iso_group: P }, features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 48, length_mm: 8 }] }},
  { id: "H6", name: "Large diameter (200mm)", tier: "workholding", input: { part_number: "H6-LARGE", bar_stock_od_mm: 200, part_length_mm: 50, material: { material_name: "AISI 1045", iso_group: P }, features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 190, length_mm: 40 }] }},
  { id: "H7", name: "Small diameter (6mm)", tier: "workholding", input: { part_number: "H7-SMALL", bar_stock_od_mm: 6, part_length_mm: 15, material: { material_name: "AISI 12L14", iso_group: P }, features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 5, length_mm: 12 }] }},
  { id: "H8", name: "Sub-spindle handoff", tier: "workholding", input: { part_number: "H8-SUB", bar_stock_od_mm: 20, part_length_mm: 30, material: { material_name: "AISI 12L14", iso_group: P }, controller: "citizen", features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 18, length_mm: 25 }] }},
  { id: "H9", name: "Guide bushing (Swiss)", tier: "workholding", input: { part_number: "H9-SWISS", bar_stock_od_mm: 16, part_length_mm: 50, material: { material_name: "AISI 12L14", iso_group: P }, controller: "star", features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 14, length_mm: 40 }] }},
  { id: "H10", name: "Forging — near net", tier: "workholding", input: { part_number: "H10-FORGE", bar_stock_od_mm: 60, part_length_mm: 40, material: { material_name: "AISI 4340", iso_group: P }, workpiece_type: "forging", features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 55, length_mm: 35 }] }},
];

const ONEOP: PartFamily[] = [
  { id: "O1", name: "Shaft + thread + groove", tier: "done-in-one", input: { part_number: "O1-FULL", bar_stock_od_mm: 30, part_length_mm: 60, material: { material_name: "AISI 4140", iso_group: P }, features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 25, length_mm: 30 }, { id: "f3", type: "groove_od", od_mm: 25, length_mm: 3, groove_width_mm: 2, groove_depth_mm: 1, position_z_mm: -28 }, { id: "f4", type: "thread_od", od_mm: 24, length_mm: 25, thread_pitch_mm: 2.0 }] }},
  { id: "O2", name: "Bore + OD + thread + part-off", tier: "done-in-one", input: { part_number: "O2-COMBO", bar_stock_od_mm: 40, part_length_mm: 50, material: { material_name: "AISI 1045", iso_group: P }, features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 35, length_mm: 40 }, { id: "f3", type: "id_bore", id_mm: 20, length_mm: 30 }, { id: "f4", type: "thread_od", od_mm: 34, length_mm: 15, thread_pitch_mm: 1.5 }, { id: "f5", type: "groove_cutoff", od_mm: 35, length_mm: 3, position_z_mm: -45 }] }},
  { id: "O3", name: "Drill + bore + face + OD", tier: "done-in-one", input: { part_number: "O3-BUSHING", bar_stock_od_mm: 50, part_length_mm: 30, material: { material_name: "AISI 4140", iso_group: P }, features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 45, length_mm: 25 }, { id: "f3", type: "drill_through", diameter_mm: 15, length_mm: 30 }, { id: "f4", type: "id_bore", id_mm: 20, length_mm: 25, tolerance_mm: 0.01 }] }},
  { id: "O4", name: "Step shaft + keyway + groove", tier: "done-in-one", input: { part_number: "O4-MOTOR", bar_stock_od_mm: 40, part_length_mm: 80, material: { material_name: "AISI 4140", iso_group: P }, features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 35, length_mm: 40 }, { id: "f3", type: "od_straight", od_mm: 25, length_mm: 30 }, { id: "f4", type: "keyway", od_mm: 25, length_mm: 20, width_mm: 6, depth_mm: 3 }, { id: "f5", type: "groove_od", od_mm: 35, length_mm: 3, groove_width_mm: 2, groove_depth_mm: 2, position_z_mm: -35 }] }},
  { id: "O5", name: "Swiss screw — complete", tier: "done-in-one", input: { part_number: "O5-SWISS", bar_stock_od_mm: 12, part_length_mm: 25, material: { material_name: "AISI 12L14", iso_group: P }, controller: "star", features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 10, length_mm: 15 }, { id: "f3", type: "thread_od", od_mm: 8, length_mm: 8, thread_pitch_mm: 1.0 }, { id: "f4", type: "groove_cutoff", od_mm: 10, length_mm: 2, position_z_mm: -22 }] }},
  { id: "O6", name: "Adapter — OD + ID + thread both ends", tier: "done-in-one", input: { part_number: "O6-ADAPT", bar_stock_od_mm: 50, part_length_mm: 60, material: { material_name: "AISI 4140", iso_group: P }, features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 45, length_mm: 50 }, { id: "f3", type: "id_bore", id_mm: 30, length_mm: 30 }, { id: "f4", type: "thread_od", od_mm: 44, length_mm: 15, thread_pitch_mm: 2.0 }] }},
];

const EDGE: PartFamily[] = [
  { id: "E1", name: "Minimum length (3mm disc)", tier: "edge", input: { part_number: "E1-MINI", bar_stock_od_mm: 30, part_length_mm: 3, material: { material_name: "AISI 1045", iso_group: P }, features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 28, length_mm: 2 }] }},
  { id: "E2", name: "Maximum L/D ratio (10:1)", tier: "edge", input: { part_number: "E2-WHIP", bar_stock_od_mm: 10, part_length_mm: 100, material: { material_name: "AISI 1045", iso_group: P }, tailstock: true, features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 8, length_mm: 90 }] }},
];

const GEN: PartFamily[] = [
  { id: "G1", name: "Generic shaft — Fanuc", tier: "general", input: { part_number: "G1-FANUC", bar_stock_od_mm: 40, part_length_mm: 60, material: { material_name: "AISI 1045", iso_group: P }, controller: "fanuc", features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 35, length_mm: 50 }] }},
  { id: "G2", name: "Generic shaft — Haas", tier: "general", input: { part_number: "G2-HAAS", bar_stock_od_mm: 40, part_length_mm: 60, material: { material_name: "AISI 1045", iso_group: P }, controller: "haas", features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 35, length_mm: 50 }] }},
  { id: "G3", name: "Generic shaft — Okuma", tier: "general", input: { part_number: "G3-OKUMA", bar_stock_od_mm: 40, part_length_mm: 60, material: { material_name: "AISI 1045", iso_group: P }, controller: "okuma", features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 35, length_mm: 50 }] }},
  { id: "G4", name: "Generic shaft — Mazak", tier: "general", input: { part_number: "G4-MAZAK", bar_stock_od_mm: 40, part_length_mm: 60, material: { material_name: "AISI 1045", iso_group: P }, controller: "mazak", features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 35, length_mm: 50 }] }},
  { id: "G5", name: "Generic shaft — Siemens", tier: "general", input: { part_number: "G5-SIEMENS", bar_stock_od_mm: 40, part_length_mm: 60, material: { material_name: "AISI 1045", iso_group: P }, controller: "siemens", features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 35, length_mm: 50 }] }},
  { id: "G6", name: "Generic shaft — DMG MORI", tier: "general", input: { part_number: "G6-DMG", bar_stock_od_mm: 40, part_length_mm: 60, material: { material_name: "AISI 1045", iso_group: P }, controller: "dmg_mori", features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 35, length_mm: 50 }] }},
  { id: "G7", name: "Generic shaft — Citizen", tier: "general", input: { part_number: "G7-CITIZEN", bar_stock_od_mm: 20, part_length_mm: 30, material: { material_name: "AISI 12L14", iso_group: P }, controller: "citizen", features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 18, length_mm: 25 }] }},
  { id: "G8", name: "Generic shaft — Star", tier: "general", input: { part_number: "G8-STAR", bar_stock_od_mm: 16, part_length_mm: 25, material: { material_name: "AISI 12L14", iso_group: P }, controller: "star", features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 14, length_mm: 20 }] }},
  { id: "G9", name: "Tight tolerance shaft — ±0.005mm", tier: "general", input: { part_number: "G9-TIGHT", bar_stock_od_mm: 30, part_length_mm: 40, material: { material_name: "AISI 4140", iso_group: P }, features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 25, length_mm: 30, tolerance_mm: 0.005, surface_finish_Ra_um: 0.8 }] }},
  { id: "G10", name: "Mirror finish — Ra 0.4µm", tier: "general", input: { part_number: "G10-MIRROR", bar_stock_od_mm: 30, part_length_mm: 30, material: { material_name: "AISI 4140", iso_group: P }, features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 25, length_mm: 25, surface_finish_Ra_um: 0.4 }] }},
];

const EXOTIC: PartFamily[] = [
  { id: "X1", name: "Ball screw thread", tier: "exotic", input: { part_number: "X1-BALL", bar_stock_od_mm: 30, part_length_mm: 100, material: { material_name: "AISI 4140", iso_group: P }, features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "thread_od", od_mm: 25, length_mm: 80, thread_pitch_mm: 5.0 }] }},
  { id: "X2", name: "Worm thread (Acme 4-start)", tier: "exotic", input: { part_number: "X2-WORM", bar_stock_od_mm: 40, part_length_mm: 80, material: { material_name: "C360 Brass", iso_group: N }, features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "thread_od", od_mm: 35, length_mm: 60, thread_pitch_mm: 6.35, thread_starts: 4 }] }},
  { id: "X3", name: "Medical screw — small Ti", tier: "exotic", input: { part_number: "X3-MED", bar_stock_od_mm: 6, part_length_mm: 20, material: { material_name: "Ti-6Al-4V Grade 5", iso_group: S }, controller: "citizen", features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 4, length_mm: 12 }, { id: "f3", type: "thread_od", od_mm: 3.5, length_mm: 8, thread_pitch_mm: 0.5 }] }},
  { id: "X4", name: "Aerospace coupling — Inconel", tier: "exotic", input: { part_number: "X4-AERO", bar_stock_od_mm: 50, part_length_mm: 40, material: { material_name: "Inconel 718", iso_group: S }, features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 45, length_mm: 30, tolerance_mm: 0.01 }, { id: "f3", type: "id_bore", id_mm: 30, length_mm: 30, tolerance_mm: 0.01 }] }},
  { id: "X5", name: "Hydraulic fitting — brass", tier: "exotic", input: { part_number: "X5-HYDRA", bar_stock_od_mm: 25, part_length_mm: 30, material: { material_name: "C360 Brass", iso_group: N }, features: [{ id: "f1", type: "face", length_mm: 0 }, { id: "f2", type: "od_straight", od_mm: 22, length_mm: 20 }, { id: "f3", type: "thread_od", od_mm: 20, length_mm: 12, thread_pitch_mm: 1.5 }, { id: "f4", type: "id_bore", id_mm: 10, length_mm: 25 }] }},
];

// ── Export all 73 families ──────────────────────────────────────────

export const ALL_FAMILIES: PartFamily[] = [
  ...F, ...A, ...D, ...MAT, ...V, ...HOLDING, ...ONEOP, ...EDGE, ...GEN, ...EXOTIC,
];

export const FAMILY_BY_ID = new Map(ALL_FAMILIES.map(f => [f.id, f]));

export const FAMILY_TIERS = {
  fundamental: F,
  threading: A,
  drilling: D,
  material: MAT,
  grooving: V,
  workholding: HOLDING,
  "done-in-one": ONEOP,
  edge: EDGE,
  general: GEN,
  exotic: EXOTIC,
};
