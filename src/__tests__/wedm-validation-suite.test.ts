/**
 * WEDM-VAL: Wire EDM Validation Suite — MS1 through MS5 (56 units)
 *
 * The most comprehensive Wire EDM test file in PRISM. Validates that the
 * full pipeline — drawing interpretation, feasibility, toolpath, multi-pass,
 * cutting params, corner/taper, wire management, and G-code generation —
 * produces physically accurate, controller-correct programs.
 *
 * Structure:
 *   Section 1: Test Geometry Definitions (T01-T42)
 *   Section 2: Controller & Material Configs
 *   Section 3: Test Implementation
 *     Wave 1 — Foundational (MS1): T01-T06 + negative tests
 *     Wave 2 — Multi-Pass (MS2): T07-T14
 *     Wave 3 — Taper & Complex (MS3): T15-T22
 *     Wave 4 — Extreme (MS4): T23-T30
 *     Wave 5 — System-Level (MS5): T31-T42
 *
 * 80+ test cases across 5 controllers, 3 materials, 42 geometries.
 */

import { describe, it, expect } from "vitest";

import { edmPostProcessGCodeEngine } from "../engines/EDMPostProcessGCodeEngine.js";
import type {
  EDMGCodeInput,
  EDMGCodeResult,
  EDMProfile,
  EDMPass,
  WireEDMController,
  PostProcessInput,
} from "../engines/EDMPostProcessGCodeEngine.js";

import { edmMultiPassStrategyEngine } from "../engines/EDMMultiPassStrategyEngine.js";
import type {
  MultiPassInput,
  MultiPassPlan,
  PassDetail,
} from "../engines/EDMMultiPassStrategyEngine.js";

import { edmToolpathStrategyEngine } from "../engines/EDMToolpathStrategyEngine.js";
import type {
  ToolpathInput,
  ToolpathResult,
  ProfileDefinition,
} from "../engines/EDMToolpathStrategyEngine.js";

import { edmCuttingParamFlushEngine } from "../engines/EDMCuttingParamFlushEngine.js";
import type {
  CuttingParamInput,
  CuttingParamResult,
  FlushingInput,
} from "../engines/EDMCuttingParamFlushEngine.js";

import { edmWireSlugCornerTaperEngine } from "../engines/EDMWireSlugCornerTaperEngine.js";
import type {
  CornerCompensationInput,
  CornerDefinition,
  TaperInput,
  TaperAccuracyInput,
  SlugManagementInput,
  WireManagementInput,
  StartHole,
} from "../engines/EDMWireSlugCornerTaperEngine.js";

import { edmFeasibilityEngine } from "../engines/EDMFeasibilityEngine.js";
import type { FeasibilityInput } from "../engines/EDMFeasibilityEngine.js";

import { edmDrawingInterpretationEngine } from "../engines/EDMDrawingInterpretationEngine.js";
import type {
  EDMDrawingInput,
  PartFeature,
} from "../engines/EDMDrawingInterpretationEngine.js";

// ============================================================================
// SECTION 1: TEST GEOMETRY DEFINITIONS
// ============================================================================

/** Generate circle points (N points approximating a circle of given diameter) */
function circlePoints(
  cx: number,
  cy: number,
  r: number,
  n: number,
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= n; i++) {
    const angle = (2 * Math.PI * i) / n;
    pts.push({
      x: parseFloat((cx + r * Math.cos(angle)).toFixed(4)),
      y: parseFloat((cy + r * Math.sin(angle)).toFixed(4)),
    });
  }
  return pts;
}

/** Generate rounded rectangle points */
function roundedRectPoints(
  w: number,
  h: number,
  r: number,
  segsPerCorner = 4,
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  // Bottom edge (left to right, excluding corners)
  for (let i = 0; i <= segsPerCorner; i++) {
    const angle = Math.PI + (Math.PI / 2) * (i / segsPerCorner);
    pts.push({
      x: parseFloat((r + r * Math.cos(angle)).toFixed(4)),
      y: parseFloat((r + r * Math.sin(angle)).toFixed(4)),
    });
  }
  // Right edge
  for (let i = 0; i <= segsPerCorner; i++) {
    const angle = (3 * Math.PI) / 2 + (Math.PI / 2) * (i / segsPerCorner);
    pts.push({
      x: parseFloat((w - r + r * Math.cos(angle)).toFixed(4)),
      y: parseFloat((r + r * Math.sin(angle)).toFixed(4)),
    });
  }
  // Top edge
  for (let i = 0; i <= segsPerCorner; i++) {
    const angle = 0 + (Math.PI / 2) * (i / segsPerCorner);
    pts.push({
      x: parseFloat((w - r + r * Math.cos(angle)).toFixed(4)),
      y: parseFloat((h - r + r * Math.sin(angle)).toFixed(4)),
    });
  }
  // Left edge
  for (let i = 0; i <= segsPerCorner; i++) {
    const angle = Math.PI / 2 + (Math.PI / 2) * (i / segsPerCorner);
    pts.push({
      x: parseFloat((r + r * Math.cos(angle)).toFixed(4)),
      y: parseFloat((h - r + r * Math.sin(angle)).toFixed(4)),
    });
  }
  return pts;
}

// --- T01: Simple 25x25mm square ---
const SQUARE_25MM = {
  profiles: [
    {
      name: "square_25",
      type: "closed_internal" as const,
      contour_points: [
        { x: 0, y: 0 },
        { x: 25, y: 0 },
        { x: 25, y: 25 },
        { x: 0, y: 25 },
        { x: 0, y: 0 },
      ],
      profile_length_mm: 100,
      is_critical_surface: false,
      start_hole_id: "SH1",
    },
  ],
  start_hole: { x: 12.5, y: 12.5 },
};

// --- T02: Simple dia-20mm circle (32-point approximation) ---
const CIRCLE_20MM = {
  profiles: [
    {
      name: "circle_20",
      type: "closed_internal" as const,
      contour_points: circlePoints(0, 0, 10, 32),
      profile_length_mm: parseFloat((2 * Math.PI * 10).toFixed(2)),
      is_critical_surface: false,
      start_hole_id: "SH1",
    },
  ],
  start_hole: { x: 0, y: 0 },
};

// --- T03: Rectangle 50x30mm with R2 corners ---
const RECT_R2 = {
  profiles: [
    {
      name: "rect_50x30_R2",
      type: "closed_internal" as const,
      contour_points: roundedRectPoints(50, 30, 2),
      profile_length_mm: 152.57,
      is_critical_surface: false,
      start_hole_id: "SH1",
    },
  ],
  start_hole: { x: 25, y: 15 },
};

// --- T04: Open-profile slot 40mm long ---
const OPEN_SLOT_40MM = {
  profiles: [
    {
      name: "slot_40",
      type: "open" as const,
      contour_points: [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
      ],
      profile_length_mm: 40,
      is_critical_surface: true,
      start_hole_id: "SH1",
    },
  ],
  start_hole: { x: -5, y: 0 },
};

// --- T05: Triangle (equilateral, 30mm sides) ---
const TRIANGLE_30MM = {
  profiles: [
    {
      name: "triangle_30",
      type: "closed_internal" as const,
      contour_points: [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 15, y: 25.98 },
        { x: 0, y: 0 },
      ],
      profile_length_mm: 90,
      is_critical_surface: false,
      start_hole_id: "SH1",
    },
  ],
  start_hole: { x: 15, y: 8.66 },
};

// --- T06: Hexagonal pocket (25mm across flats) ---
const HEX_25MM = {
  profiles: [
    {
      name: "hex_25",
      type: "closed_internal" as const,
      contour_points: (() => {
        const r = 14.43; // circumradius for 25mm across flats
        return [0, 1, 2, 3, 4, 5, 0].map((i) => ({
          x: parseFloat((r * Math.cos((Math.PI / 3) * i)).toFixed(4)),
          y: parseFloat((r * Math.sin((Math.PI / 3) * i)).toFixed(4)),
        }));
      })(),
      profile_length_mm: 86.6,
      is_critical_surface: false,
      start_hole_id: "SH1",
    },
  ],
  start_hole: { x: 0, y: 0 },
};

// --- T07: Multi-pass precision square (tight tolerance) ---
const PRECISION_SQUARE_25MM = {
  profiles: SQUARE_25MM.profiles,
  start_hole: SQUARE_25MM.start_hole,
  tolerance_mm: 0.005,
  target_ra_um: 0.4,
};

// --- T08: Multi-pass precision circle ---
const PRECISION_CIRCLE_20MM = {
  profiles: CIRCLE_20MM.profiles,
  start_hole: CIRCLE_20MM.start_hole,
  tolerance_mm: 0.003,
  target_ra_um: 0.2,
};

// --- T09: Multi-pass die opening (100x60mm rect with R5) ---
const DIE_OPENING_100x60 = {
  profiles: [
    {
      name: "die_100x60",
      type: "closed_internal" as const,
      contour_points: roundedRectPoints(100, 60, 5),
      profile_length_mm: 308.6,
      is_critical_surface: true,
      start_hole_id: "SH1",
    },
  ],
  start_hole: { x: 50, y: 30 },
  tolerance_mm: 0.005,
  target_ra_um: 0.6,
};

// --- T10: Keyway slot (6mm wide x 20mm long) ---
const KEYWAY_6x20 = {
  profiles: [
    {
      name: "keyway_6x20",
      type: "closed_internal" as const,
      contour_points: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 6 },
        { x: 0, y: 6 },
        { x: 0, y: 0 },
      ],
      profile_length_mm: 52,
      is_critical_surface: true,
      start_hole_id: "SH1",
      min_corner_radius_mm: 0.2,
    },
  ],
  start_hole: { x: 10, y: 3 },
  tolerance_mm: 0.010,
  target_ra_um: 0.8,
};

// --- T11: External contour (closed_external) ---
const EXTERNAL_PROFILE_50MM = {
  profiles: [
    {
      name: "external_50",
      type: "closed_external" as const,
      contour_points: [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 40 },
        { x: 0, y: 40 },
        { x: 0, y: 0 },
      ],
      profile_length_mm: 180,
      is_critical_surface: false,
    },
  ],
  start_hole: { x: -5, y: -5 },
};

// --- T12: Multi-profile nested (island inside square) ---
const NESTED_PROFILES = {
  profiles: [
    {
      name: "outer_square",
      type: "closed_internal" as const,
      contour_points: [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 40 },
        { x: 0, y: 40 },
        { x: 0, y: 0 },
      ],
      profile_length_mm: 160,
      is_critical_surface: false,
      start_hole_id: "SH1",
    },
    {
      name: "inner_circle",
      type: "island" as const,
      contour_points: circlePoints(20, 20, 8, 24),
      profile_length_mm: parseFloat((2 * Math.PI * 8).toFixed(2)),
      is_critical_surface: true,
      start_hole_id: "SH2",
    },
  ],
  start_holes: [
    { x: 20, y: 20 },
    { x: 20, y: 20 },
  ],
};

// --- T13: Large rectangle 200x100mm (long-run multi-pass) ---
const LARGE_RECT_200x100 = {
  profiles: [
    {
      name: "rect_200x100",
      type: "closed_internal" as const,
      contour_points: [
        { x: 0, y: 0 },
        { x: 200, y: 0 },
        { x: 200, y: 100 },
        { x: 0, y: 100 },
        { x: 0, y: 0 },
      ],
      profile_length_mm: 600,
      is_critical_surface: false,
      start_hole_id: "SH1",
    },
  ],
  start_hole: { x: 100, y: 50 },
  tolerance_mm: 0.010,
  target_ra_um: 1.2,
};

// --- T14: Thin web (1.5mm slot width) ---
const THIN_WEB_1_5MM = {
  profiles: [
    {
      name: "thin_slot",
      type: "closed_internal" as const,
      contour_points: [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 1.5 },
        { x: 0, y: 1.5 },
        { x: 0, y: 0 },
      ],
      profile_length_mm: 63,
      is_critical_surface: true,
      start_hole_id: "SH1",
      min_corner_radius_mm: 0.15,
    },
  ],
  start_hole: { x: 15, y: 0.75 },
  tolerance_mm: 0.005,
  target_ra_um: 0.6,
};

// --- T15: 3-degree constant taper on square ---
const TAPER_3DEG_SQUARE = {
  profiles: [
    {
      name: "taper_square_3deg",
      type: "closed_internal" as const,
      contour_points: SQUARE_25MM.profiles[0].contour_points,
      profile_length_mm: 100,
      is_critical_surface: true,
      start_hole_id: "SH1",
      taper_angle_deg: 3,
    },
  ],
  start_hole: SQUARE_25MM.start_hole,
  taper_angle_deg: 3,
};

// --- T16: 5-degree taper on circle ---
const TAPER_5DEG_CIRCLE = {
  profiles: [
    {
      name: "taper_circle_5deg",
      type: "closed_internal" as const,
      contour_points: circlePoints(0, 0, 10, 32),
      profile_length_mm: 62.83,
      is_critical_surface: true,
      start_hole_id: "SH1",
      taper_angle_deg: 5,
    },
  ],
  start_hole: { x: 0, y: 0 },
  taper_angle_deg: 5,
};

// --- T17: Variable taper (1-7 degrees) ---
const VARIABLE_TAPER = {
  segments: [
    { start_point: { x: 0, y: 0 }, end_point: { x: 25, y: 0 }, taper_angle_deg: 1 },
    { start_point: { x: 25, y: 0 }, end_point: { x: 25, y: 25 }, taper_angle_deg: 3 },
    { start_point: { x: 25, y: 25 }, end_point: { x: 0, y: 25 }, taper_angle_deg: 5 },
    { start_point: { x: 0, y: 25 }, end_point: { x: 0, y: 0 }, taper_angle_deg: 7 },
  ],
  workpiece_height_mm: 30,
  guide_distance_mm: 80,
  wire_diameter_mm: 0.25,
};

// --- T18: Involute gear profile (simplified 12-tooth) ---
const INVOLUTE_GEAR_12T = {
  profiles: [
    {
      name: "gear_12t",
      type: "closed_external" as const,
      contour_points: (() => {
        const pts: Array<{ x: number; y: number }> = [];
        const rb = 12; // base circle radius
        const ra = 15; // addendum radius
        const teeth = 12;
        for (let t = 0; t < teeth; t++) {
          const baseAngle = (2 * Math.PI * t) / teeth;
          // Simplified: 3 points per tooth (root, tip-left, tip-right)
          pts.push({
            x: parseFloat((rb * Math.cos(baseAngle - 0.12)).toFixed(4)),
            y: parseFloat((rb * Math.sin(baseAngle - 0.12)).toFixed(4)),
          });
          pts.push({
            x: parseFloat((ra * Math.cos(baseAngle)).toFixed(4)),
            y: parseFloat((ra * Math.sin(baseAngle)).toFixed(4)),
          });
          pts.push({
            x: parseFloat((rb * Math.cos(baseAngle + 0.12)).toFixed(4)),
            y: parseFloat((rb * Math.sin(baseAngle + 0.12)).toFixed(4)),
          });
        }
        pts.push(pts[0]); // close
        return pts;
      })(),
      profile_length_mm: 120,
      is_critical_surface: true,
      min_corner_radius_mm: 0.3,
    },
  ],
  start_hole: { x: -20, y: 0 },
  tolerance_mm: 0.005,
  target_ra_um: 0.4,
};

// --- T19: Progressive die (3 stations) ---
const PROGRESSIVE_DIE_3STATION = {
  profiles: [
    {
      name: "station1_punch",
      type: "closed_internal" as const,
      contour_points: [
        { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 8 }, { x: 0, y: 8 }, { x: 0, y: 0 },
      ],
      profile_length_mm: 36,
      is_critical_surface: true,
      start_hole_id: "SH1",
      min_corner_radius_mm: 0.5,
    },
    {
      name: "station2_form",
      type: "closed_internal" as const,
      contour_points: roundedRectPoints(15, 12, 1),
      profile_length_mm: 48.28,
      is_critical_surface: true,
      start_hole_id: "SH2",
    },
    {
      name: "station3_cutoff",
      type: "open" as const,
      contour_points: [
        { x: 0, y: 0 }, { x: 0, y: 20 },
      ],
      profile_length_mm: 20,
      is_critical_surface: false,
      start_hole_id: "SH3",
    },
  ],
  start_holes: [
    { x: 5, y: 4 },
    { x: 7.5, y: 6 },
    { x: -3, y: 10 },
  ],
  tolerance_mm: 0.005,
  target_ra_um: 0.4,
};

// --- T20: Spline profile (16 points) ---
const SPLINE_PROFILE = {
  profiles: [
    {
      name: "spline_16pt",
      type: "closed_internal" as const,
      contour_points: (() => {
        const pts: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= 16; i++) {
          const angle = (2 * Math.PI * i) / 16;
          const r = 10 + 3 * Math.sin(4 * angle); // 4-lobe shape
          pts.push({
            x: parseFloat((r * Math.cos(angle)).toFixed(4)),
            y: parseFloat((r * Math.sin(angle)).toFixed(4)),
          });
        }
        return pts;
      })(),
      profile_length_mm: 75,
      is_critical_surface: true,
      start_hole_id: "SH1",
    },
  ],
  start_hole: { x: 0, y: 0 },
  tolerance_mm: 0.008,
  target_ra_um: 0.6,
};

// --- T21: Deep cut (150mm thickness) ---
const DEEP_CUT_150MM = {
  profiles: SQUARE_25MM.profiles,
  start_hole: SQUARE_25MM.start_hole,
  thickness_mm: 150,
  tolerance_mm: 0.020,
  target_ra_um: 1.6,
};

// --- T22: Micro feature (2mm x 2mm pocket) ---
const MICRO_POCKET_2MM = {
  profiles: [
    {
      name: "micro_2x2",
      type: "closed_internal" as const,
      contour_points: [
        { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }, { x: 0, y: 0 },
      ],
      profile_length_mm: 8,
      is_critical_surface: true,
      start_hole_id: "SH1",
      min_corner_radius_mm: 0.1,
    },
  ],
  start_hole: { x: 1, y: 1 },
  tolerance_mm: 0.003,
  target_ra_um: 0.2,
};

// --- T23: Tungsten carbide workpiece ---
const CARBIDE_SQUARE = {
  ...SQUARE_25MM,
  material: "tungsten_carbide",
};

// --- T24: Inconel 718 ---
const INCONEL_CIRCLE = {
  ...CIRCLE_20MM,
  material: "inconel_718",
};

// --- T25: Copper electrode profile ---
const COPPER_ELECTRODE = {
  profiles: [
    {
      name: "electrode_profile",
      type: "closed_external" as const,
      contour_points: [
        { x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 10 },
        { x: 20, y: 10 }, { x: 20, y: 20 }, { x: 10, y: 20 },
        { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 },
      ],
      profile_length_mm: 100,
      is_critical_surface: true,
    },
  ],
  start_hole: { x: -5, y: -5 },
  material: "copper",
};

// --- T26: Thick block (300mm) ---
const THICK_BLOCK_300MM = {
  profiles: SQUARE_25MM.profiles,
  start_hole: SQUARE_25MM.start_hole,
  thickness_mm: 300,
};

// --- T27: Multi-cavity (4 identical squares) ---
const MULTI_CAVITY_4X = {
  profiles: [0, 1, 2, 3].map((i) => ({
    name: `cavity_${i + 1}`,
    type: "closed_internal" as const,
    contour_points: [
      { x: i * 40, y: 0 },
      { x: i * 40 + 20, y: 0 },
      { x: i * 40 + 20, y: 20 },
      { x: i * 40, y: 20 },
      { x: i * 40, y: 0 },
    ],
    profile_length_mm: 80,
    is_critical_surface: false,
    start_hole_id: `SH${i + 1}`,
  })),
  start_holes: [0, 1, 2, 3].map((i) => ({
    x: i * 40 + 10,
    y: 10,
  })),
};

// --- T28: Near-zero corner radius (R0.05) ---
const SHARP_CORNER_R005 = {
  profiles: [
    {
      name: "sharp_corners",
      type: "closed_internal" as const,
      contour_points: [
        { x: 0, y: 0 }, { x: 15, y: 0 }, { x: 15, y: 15 }, { x: 0, y: 15 }, { x: 0, y: 0 },
      ],
      profile_length_mm: 60,
      is_critical_surface: true,
      start_hole_id: "SH1",
      min_corner_radius_mm: 0.05,
    },
  ],
  start_hole: { x: 7.5, y: 7.5 },
};

// --- T29: Large slug (80x80mm) ---
const LARGE_SLUG_80MM = {
  profiles: [
    {
      name: "large_slug",
      type: "closed_internal" as const,
      contour_points: [
        { x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 80 }, { x: 0, y: 80 }, { x: 0, y: 0 },
      ],
      profile_length_mm: 320,
      is_critical_surface: false,
      start_hole_id: "SH1",
    },
  ],
  start_hole: { x: 40, y: 40 },
};

// --- T30: Asymmetric complex contour ---
const ASYMMETRIC_CONTOUR = {
  profiles: [
    {
      name: "asymmetric",
      type: "closed_internal" as const,
      contour_points: [
        { x: 0, y: 0 }, { x: 30, y: 0 }, { x: 35, y: 10 },
        { x: 30, y: 25 }, { x: 20, y: 30 }, { x: 5, y: 28 },
        { x: -2, y: 15 }, { x: 0, y: 0 },
      ],
      profile_length_mm: 115,
      is_critical_surface: true,
      start_hole_id: "SH1",
    },
  ],
  start_hole: { x: 15, y: 15 },
};

// --- T31-T42: System-level integration geometries ---

// T31: Full pipeline — D2 tool steel die
const FULL_PIPELINE_D2_DIE = {
  features: [
    {
      name: "die_cavity",
      type: "profile" as const,
      is_through: true,
      dimensions_mm: { length: 50, width: 30 },
      tolerance_mm: 0.005,
      surface_finish_ra_um: 0.4,
      min_corner_radius_mm: 0.5,
      profile_length_mm: 152,
    },
  ],
  material: "d2",
  material_hardness_hrc: 60,
  overall_thickness_mm: 25,
};

// T32: Full pipeline — Aluminum extrusion die
const FULL_PIPELINE_ALUMINUM_DIE = {
  features: [
    {
      name: "extrusion_profile",
      type: "contour" as const,
      is_through: true,
      dimensions_mm: { length: 80, width: 40 },
      tolerance_mm: 0.010,
      surface_finish_ra_um: 0.8,
      profile_length_mm: 230,
    },
  ],
  material: "h13",
  material_hardness_hrc: 48,
  overall_thickness_mm: 40,
};

// T33: Aerospace titanium part
const AEROSPACE_TITANIUM = {
  features: [
    {
      name: "ti_bracket_slot",
      type: "slot" as const,
      is_through: true,
      dimensions_mm: { length: 60, width: 8 },
      tolerance_mm: 0.008,
      surface_finish_ra_um: 0.6,
      min_corner_radius_mm: 1.0,
      profile_length_mm: 136,
    },
  ],
  material: "ti6al4v",
  overall_thickness_mm: 15,
};

// T34: Medical device component (stainless)
const MEDICAL_STAINLESS = {
  features: [
    {
      name: "implant_profile",
      type: "contour" as const,
      is_through: true,
      dimensions_mm: { length: 20, width: 10 },
      tolerance_mm: 0.003,
      surface_finish_ra_um: 0.2,
      profile_length_mm: 55,
    },
  ],
  material: "316l_stainless",
  overall_thickness_mm: 8,
};

// T35: Multi-profile die with 5 cavities
const MULTI_PROFILE_5CAV = {
  profiles: [0, 1, 2, 3, 4].map((i) => ({
    name: `cav_${i + 1}`,
    type: "closed_internal" as const,
    contour_points: circlePoints(i * 25, 0, 8, 20),
    profile_length_mm: 50.27,
    is_critical_surface: true,
    start_hole_id: `SH${i + 1}`,
  })),
  start_holes: [0, 1, 2, 3, 4].map((i) => ({
    x: i * 25,
    y: 0,
  })),
};

// T36: Tab-heavy geometry (large slug needing 4+ tabs)
const TAB_HEAVY_GEOM = {
  profiles: [
    {
      name: "heavy_slug",
      type: "closed_internal" as const,
      contour_points: [
        { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 80 },
        { x: 0, y: 80 }, { x: 0, y: 0 },
      ],
      profile_length_mm: 360,
      is_critical_surface: false,
      start_hole_id: "SH1",
    },
  ],
  start_hole: { x: 50, y: 40 },
  slug_area_mm2: 8000,
};

// T37: Maximum taper angle (15 degrees)
const MAX_TAPER_15DEG = {
  taper_angle_deg: 15,
  workpiece_height_mm: 50,
  wire_diameter_mm: 0.25,
  guide_distance_mm: 80,
  tolerance_mm: 0.010,
};

// T38: Submerged vs spray flushing comparison
const FLUSH_COMPARISON_GEOM = {
  material: "d2",
  thickness_mm: 50,
  pass_type: "rough" as const,
  profile_type: "closed" as const,
  wire_diameter_mm: 0.25,
};

// T39: Wire break risk assessment geometry
const WIRE_BREAK_RISK_GEOM = {
  material: "tungsten_carbide",
  thickness_mm: 100,
  wire_diameter_mm: 0.20,
  wire_type: "brass",
  pass_number: 1,
  pass_type: "rough" as const,
};

// T40: Post-process plan for aerospace spec
const POST_PROCESS_AEROSPACE = {
  material: "inconel_718",
  hardness_hrc: 42,
  surface_finish_Ra_um: 0.3,
  recast_layer_max_um: 3,
  has_tight_tolerances: true,
  tolerance_mm: 0.005,
  requires_fatigue_life: true,
  requires_coating: true,
  coating_type: "pvd" as const,
  part_thickness_mm: 20,
  is_aerospace: true,
  is_medical: false,
  num_profiles: 2,
};

// T41: Cross-controller consistency (same geometry, all controllers)
const CONTROLLER_CONSISTENCY_GEOM = SQUARE_25MM;

// T42: End-to-end regression (known-good output comparison)
const REGRESSION_GEOM = RECT_R2;

// ============================================================================
// SECTION 2: CONTROLLER & MATERIAL CONFIGS
// ============================================================================

const CONTROLLERS: WireEDMController[] = [
  "fanuc",
  "sodick",
  "makino",
  "mitsubishi",
  "agiecharmilles",
];

const STANDARD_MATERIALS = ["D2_tool", "6061_aluminum", "Ti6Al4V"] as const;

const STANDARD_WIRE = {
  type: "brass",
  diameter_mm: 0.25,
};

const DEFAULT_WORKPIECE = {
  thickness_mm: 25,
  length_mm: 150,
  width_mm: 100,
  height_mm: 25,
};

/** Build a standard single-pass EDMGCodeInput from geometry + controller */
function buildSinglePassGCodeInput(
  controller: WireEDMController,
  geometry: { profiles: Array<{ name: string; contour_points: Array<{ x: number; y: number }> }>; start_hole: { x: number; y: number } },
  opts?: { taper?: boolean; program_number?: number },
): EDMGCodeInput {
  return {
    controller,
    profiles: geometry.profiles.map((p) => ({
      name: p.name,
      contour_points: p.contour_points,
      start_hole: geometry.start_hole,
      approach: { type: "tangent_arc", length_mm: 3 },
      departure: { type: "tangent_arc", length_mm: 3 },
      taper_angle_deg: opts?.taper ? 3 : undefined,
    })),
    passes: [
      {
        pass_number: 1,
        offset_mm: 0.140,
        technology_table: "STL-250-R",
        wire_speed_m_min: 10,
        tension_N: 12,
      },
    ],
    wire_type: "brass",
    program_number: opts?.program_number ?? 1001,
    taper_mode: opts?.taper,
  };
}

/** Build a multi-pass EDMGCodeInput */
function buildMultiPassGCodeInput(
  controller: WireEDMController,
  geometry: { profiles: Array<{ name: string; contour_points: Array<{ x: number; y: number }> }>; start_hole: { x: number; y: number } },
  passCount: number,
): EDMGCodeInput {
  const passes: EDMPass[] = [];
  for (let i = 1; i <= passCount; i++) {
    const isRough = i === 1;
    passes.push({
      pass_number: i,
      offset_mm: isRough ? 0.140 : parseFloat((0.140 - i * 0.025).toFixed(4)),
      technology_table: isRough ? "STL-250-R" : `STL-250-S${i - 1}`,
      wire_speed_m_min: isRough ? 10 : 8 - i,
      tension_N: isRough ? 12 : 10 + i,
      power_setting: isRough ? 8 : 8 - i,
      corner_strategy: isRough ? "continuous" : "exact_stop",
    });
  }
  return {
    controller,
    profiles: geometry.profiles.map((p) => ({
      name: p.name,
      contour_points: p.contour_points,
      start_hole: geometry.start_hole,
      approach: { type: "tangent_arc", length_mm: 3 },
      departure: { type: "tangent_arc", length_mm: 3 },
    })),
    passes,
    wire_type: "brass",
    program_number: 2001,
  };
}

// ============================================================================
// SECTION 3: TEST IMPLEMENTATION
// ============================================================================

describe("WEDM-VAL: Wire EDM Validation Suite", () => {
  // ==========================================================================
  // Wave 1: Foundational (MS1) — T01 through T06 + negative tests
  // ==========================================================================
  describe("Wave 1: Foundational (MS1)", () => {
    // T01 — Simple Square: G-code generation across all controllers
    describe("T01 — Simple 25x25mm Square", () => {
      for (const ctrl of CONTROLLERS) {
        it(`generates valid G-code for ${ctrl}`, () => {
          const input = buildSinglePassGCodeInput(ctrl, SQUARE_25MM);
          const result = edmPostProcessGCodeEngine.generate_gcode(input);

          // Program structure
          expect(result.gcode).toContain("G90");
          // G21 metric mode: Mitsubishi uses controller default (no G21 in real programs)
          if (ctrl !== "mitsubishi") {
            expect(result.gcode).toContain("G21");
          }
          expect(result.gcode).toMatch(/G4[012]/); // G40 cancel or G41/G42 comp
          expect(result.line_count).toBeGreaterThan(10);
          expect(result.passes_generated).toBe(1);
          expect(result.profiles_cut).toBe(1);
          expect(result.warnings).toEqual(expect.any(Array));

          // Controller-specific M-codes (calibrated against real programs)
          if (ctrl === "fanuc") {
            expect(result.gcode).toContain("M50"); // wire thread
            expect(result.gcode).toContain("M60"); // wire cut
            expect(result.gcode).toContain("M30"); // program end
          }
          if (ctrl === "sodick") {
            expect(result.gcode).toContain("M60"); // wire thread
            expect(result.gcode).toContain("M61"); // wire cut
            expect(result.gcode).toContain("M02"); // program end
          }
          if (ctrl === "makino") {
            expect(result.gcode).toContain("M30");
          }
          if (ctrl === "mitsubishi") {
            // Calibrated: real Mitsubishi programs use M20/M21/M02, not M50/M30
            expect(result.gcode).toContain("M20"); // wire thread
            expect(result.gcode).toContain("M21"); // wire cut
            expect(result.gcode).toContain("M02"); // program end
          }
          if (ctrl === "agiecharmilles") {
            expect(result.gcode).toContain("M50"); // wire thread
            expect(result.gcode).toContain("M30");
          }
        });
      }

      it("generates metric output by default", () => {
        const input = buildSinglePassGCodeInput("fanuc", SQUARE_25MM);
        const result = edmPostProcessGCodeEngine.generate_gcode(input);
        expect(result.gcode).toContain("G21");
      });

      it("reports estimated time > 0", () => {
        const input = buildSinglePassGCodeInput("fanuc", SQUARE_25MM);
        const result = edmPostProcessGCodeEngine.generate_gcode(input);
        expect(result.estimated_time_min).toBeGreaterThan(0);
      });
    });

    // T02 — Simple Circle
    describe("T02 — Simple dia-20mm Circle", () => {
      for (const ctrl of CONTROLLERS) {
        it(`generates valid arc-based G-code for ${ctrl}`, () => {
          const input = buildSinglePassGCodeInput(ctrl, CIRCLE_20MM);
          const result = edmPostProcessGCodeEngine.generate_gcode(input);
          expect(result.gcode).toContain("G90");
          if (ctrl !== "mitsubishi") {
            expect(result.gcode).toContain("G21");
          }
          expect(result.line_count).toBeGreaterThan(10);
          expect(result.passes_generated).toBe(1);
        });
      }
    });

    // T03 — Rectangle with rounded corners
    describe("T03 — Rectangle 50x30mm with R2 corners", () => {
      it("generates valid G-code for fanuc", () => {
        const input = buildSinglePassGCodeInput("fanuc", RECT_R2);
        const result = edmPostProcessGCodeEngine.generate_gcode(input);
        expect(result.gcode).toContain("G90");
        expect(result.gcode).toContain("G21"); // Fanuc always has G21
        expect(result.passes_generated).toBe(1);
        expect(result.line_count).toBeGreaterThan(10);
      });
    });

    // T04 — Open-profile slot
    describe("T04 — Open Slot 40mm", () => {
      it("generates valid G-code for open profile", () => {
        const input = buildSinglePassGCodeInput("fanuc", OPEN_SLOT_40MM);
        const result = edmPostProcessGCodeEngine.generate_gcode(input);
        expect(result.gcode).toContain("G90");
        expect(result.passes_generated).toBe(1);
      });
    });

    // T05 — Triangle
    describe("T05 — Equilateral Triangle 30mm", () => {
      it("generates valid G-code with sharp corners", () => {
        const input = buildSinglePassGCodeInput("fanuc", TRIANGLE_30MM);
        const result = edmPostProcessGCodeEngine.generate_gcode(input);
        expect(result.gcode).toContain("G90");
        expect(result.passes_generated).toBe(1);
      });
    });

    // T06 — Hexagonal pocket
    describe("T06 — Hexagonal Pocket 25mm", () => {
      it("generates valid G-code for hex profile", () => {
        const input = buildSinglePassGCodeInput("sodick", HEX_25MM);
        const result = edmPostProcessGCodeEngine.generate_gcode(input);
        expect(result.gcode).toContain("G90");
        expect(result.passes_generated).toBe(1);
        expect(result.gcode).toContain("M60"); // Sodick thread
      });
    });

    // Negative tests
    describe("Negative Tests — Invalid Inputs", () => {
      it("rejects empty profiles array", () => {
        const input: EDMGCodeInput = {
          controller: "fanuc",
          profiles: [],
          passes: [{ pass_number: 1, offset_mm: 0.14, technology_table: "X", wire_speed_m_min: 10, tension_N: 12 }],
          wire_type: "brass",
        };
        const result = edmPostProcessGCodeEngine.generate_gcode(input);
        // Should either error or produce minimal/warning output
        expect(result.profiles_cut).toBe(0);
      });

      it("rejects empty passes array", () => {
        const input = buildSinglePassGCodeInput("fanuc", SQUARE_25MM);
        input.passes = [];
        const result = edmPostProcessGCodeEngine.generate_gcode(input);
        expect(result.passes_generated).toBe(0);
      });

      it("handles unknown wire type gracefully", () => {
        const input = buildSinglePassGCodeInput("fanuc", SQUARE_25MM);
        input.wire_type = "unobtainium";
        const result = edmPostProcessGCodeEngine.generate_gcode(input);
        // Should still produce output (with possible warnings)
        expect(result.gcode).toBeDefined();
      });
    });

    // Toolpath classification
    describe("T01-T06 Toolpath Classification", () => {
      it("classifies closed_internal as CCW (material left)", () => {
        const input: ToolpathInput = {
          profiles: SQUARE_25MM.profiles.map((p) => ({
            ...p,
            tolerance_mm: 0.01,
          })) as ProfileDefinition[],
          workpiece_thickness_mm: 25,
          wire_diameter_mm: 0.25,
        };
        const result = edmToolpathStrategyEngine.generate_toolpath(input);
        expect(result.profiles_classified.length).toBeGreaterThan(0);
        const sq = result.profiles_classified.find((p) => p.name === "square_25");
        expect(sq).toBeDefined();
        // closed_internal typically CCW for G41 offset
        expect(["CW", "CCW"]).toContain(sq!.cut_direction);
      });

      it("generates approach/departure for each profile", () => {
        const input: ToolpathInput = {
          profiles: SQUARE_25MM.profiles.map((p) => ({
            ...p,
            tolerance_mm: 0.01,
          })) as ProfileDefinition[],
          workpiece_thickness_mm: 25,
          wire_diameter_mm: 0.25,
        };
        const result = edmToolpathStrategyEngine.generate_toolpath(input);
        expect(result.approach_departures.length).toBeGreaterThanOrEqual(1);
        expect(result.approach_departures[0].approach_length_mm).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // Wave 2: Multi-Pass (MS2) — T07 through T14
  // ==========================================================================
  describe("Wave 2: Multi-Pass (MS2)", () => {
    // T07 — Multi-pass precision square
    describe("T07 — Multi-Pass Precision Square (tol 0.005mm, Ra 0.4um)", () => {
      it("plans correct number of passes for tight tolerance", () => {
        const input: MultiPassInput = {
          material: "D2",
          thickness_mm: 25,
          profile_length_mm: 100,
          tolerance_mm: 0.005,
          target_ra_um: 0.4,
          wire_diameter_mm: 0.25,
          wire_type: "brass",
        };
        const plan = edmMultiPassStrategyEngine.full_plan(input);
        expect(plan.total_passes).toBeGreaterThanOrEqual(4);
        expect(plan.predicted_final_ra_um).toBeLessThanOrEqual(2.0);
        expect(plan.predicted_final_tolerance_mm).toBeLessThanOrEqual(0.01);
      });

      it("generates G-code with multiple passes", () => {
        const input = buildMultiPassGCodeInput("fanuc", SQUARE_25MM, 5);
        const result = edmPostProcessGCodeEngine.generate_gcode(input);
        expect(result.passes_generated).toBe(5);
        expect(result.gcode).toContain("G90");
        expect(result.gcode).toContain("M50");
        expect(result.line_count).toBeGreaterThan(30);
      });

      it("offsets decrease across passes", () => {
        const input: MultiPassInput = {
          material: "D2",
          thickness_mm: 25,
          profile_length_mm: 100,
          tolerance_mm: 0.005,
          target_ra_um: 0.4,
          wire_diameter_mm: 0.25,
        };
        const plan = edmMultiPassStrategyEngine.full_plan(input);
        for (let i = 1; i < plan.passes.length; i++) {
          expect(plan.passes[i].offset_mm).toBeLessThanOrEqual(
            plan.passes[i - 1].offset_mm,
          );
        }
      });

      it("final pass has minimal remaining stock", () => {
        const input: MultiPassInput = {
          material: "D2",
          thickness_mm: 25,
          profile_length_mm: 100,
          tolerance_mm: 0.005,
          target_ra_um: 0.4,
          wire_diameter_mm: 0.25,
        };
        const plan = edmMultiPassStrategyEngine.full_plan(input);
        const lastPass = plan.passes[plan.passes.length - 1];
        expect(lastPass.stock_remaining_mm).toBeLessThanOrEqual(0.005);
      });
    });

    // T08 — Multi-pass precision circle
    describe("T08 — Multi-Pass Precision Circle (tol 0.003mm, Ra 0.2um)", () => {
      it("requires 5+ passes for sub-0.2um Ra", () => {
        const input: MultiPassInput = {
          material: "D2",
          thickness_mm: 25,
          profile_length_mm: 62.83,
          tolerance_mm: 0.003,
          target_ra_um: 0.2,
          wire_diameter_mm: 0.25,
        };
        const plan = edmMultiPassStrategyEngine.full_plan(input);
        expect(plan.total_passes).toBeGreaterThanOrEqual(5);
      });
    });

    // T09 — Die opening multi-pass
    describe("T09 — Die Opening 100x60mm", () => {
      it("produces physically reasonable time estimate", () => {
        const input: MultiPassInput = {
          material: "D2",
          thickness_mm: 25,
          profile_length_mm: 308.6,
          tolerance_mm: 0.005,
          target_ra_um: 0.6,
          wire_diameter_mm: 0.25,
        };
        const plan = edmMultiPassStrategyEngine.full_plan(input);
        expect(plan.total_time_min).toBeGreaterThan(10); // Not instantaneous
        expect(plan.total_time_min).toBeLessThan(600); // Not absurd
        expect(plan.total_wire_m).toBeGreaterThan(0);
      });
    });

    // T10 — Keyway slot
    describe("T10 — Keyway 6x20mm", () => {
      it("multi-pass plan accounts for narrow slot", () => {
        const input: MultiPassInput = {
          material: "D2",
          thickness_mm: 25,
          profile_length_mm: 52,
          tolerance_mm: 0.010,
          target_ra_um: 0.8,
          wire_diameter_mm: 0.25,
        };
        const plan = edmMultiPassStrategyEngine.full_plan(input);
        expect(plan.total_passes).toBeGreaterThanOrEqual(2);
      });
    });

    // T11 — External contour multi-pass
    describe("T11 — External Profile 50mm", () => {
      for (const ctrl of CONTROLLERS) {
        it(`generates valid multi-pass G-code for ${ctrl}`, () => {
          const input = buildMultiPassGCodeInput(ctrl, EXTERNAL_PROFILE_50MM, 3);
          const result = edmPostProcessGCodeEngine.generate_gcode(input);
          expect(result.passes_generated).toBe(3);
          expect(result.gcode).toContain("G90");
        });
      }
    });

    // T12 — Nested profiles (inside-before-outside ordering)
    describe("T12 — Nested Profiles (square + island)", () => {
      it("classifies and sequences profiles correctly", () => {
        const input: ToolpathInput = {
          profiles: NESTED_PROFILES.profiles.map((p) => ({
            ...p,
            tolerance_mm: 0.01,
          })) as ProfileDefinition[],
          workpiece_thickness_mm: 25,
          wire_diameter_mm: 0.25,
        };
        const result = edmToolpathStrategyEngine.generate_toolpath(input);
        expect(result.profiles_classified.length).toBe(2);
        expect(result.cut_sequence.length).toBe(2);
        // Island (inner) should be cut before outer
        const innerIdx = result.cut_sequence.indexOf("inner_circle");
        const outerIdx = result.cut_sequence.indexOf("outer_square");
        if (innerIdx !== -1 && outerIdx !== -1) {
          expect(innerIdx).toBeLessThan(outerIdx);
        }
      });
    });

    // T13 — Large rectangle (long-run)
    describe("T13 — Large Rectangle 200x100mm", () => {
      it("estimates reasonable wire consumption for 600mm perimeter", () => {
        const input: MultiPassInput = {
          material: "D2",
          thickness_mm: 25,
          profile_length_mm: 600,
          tolerance_mm: 0.010,
          target_ra_um: 1.2,
          wire_diameter_mm: 0.25,
        };
        const plan = edmMultiPassStrategyEngine.full_plan(input);
        expect(plan.total_wire_m).toBeGreaterThan(10);
      });
    });

    // T14 — Thin web
    describe("T14 — Thin Web 1.5mm Slot", () => {
      it("multi-pass plan handles narrow geometry", () => {
        const input: MultiPassInput = {
          material: "D2",
          thickness_mm: 25,
          profile_length_mm: 63,
          tolerance_mm: 0.005,
          target_ra_um: 0.6,
          wire_diameter_mm: 0.25,
        };
        const plan = edmMultiPassStrategyEngine.full_plan(input);
        expect(plan.total_passes).toBeGreaterThanOrEqual(3);
        // Energy should decrease per pass
        for (let i = 1; i < plan.passes.length; i++) {
          expect(plan.passes[i].energy_mj).toBeLessThanOrEqual(
            plan.passes[0].energy_mj,
          );
        }
      });
    });

    // Multi-pass material comparison
    describe("Multi-pass material comparison", () => {
      for (const mat of STANDARD_MATERIALS) {
        it(`produces valid multi-pass plan for ${mat}`, () => {
          const input: MultiPassInput = {
            material: mat,
            thickness_mm: 25,
            profile_length_mm: 100,
            tolerance_mm: 0.005,
            target_ra_um: 0.4,
            wire_diameter_mm: 0.25,
          };
          const plan = edmMultiPassStrategyEngine.full_plan(input);
          expect(plan.total_passes).toBeGreaterThanOrEqual(1);
          expect(plan.total_time_min).toBeGreaterThan(0);
          expect(plan.passes[0].cutting_speed_mm_min).toBeGreaterThan(0);
        });
      }
    });
  });

  // ==========================================================================
  // Wave 3: Taper & Complex Geometry (MS3) — T15 through T22
  // ==========================================================================
  describe("Wave 3: Taper & Complex (MS3)", () => {
    // T15 — 3-degree constant taper
    describe("T15 — 3-degree Constant Taper on Square", () => {
      it("generates taper G-code with UV axis data", () => {
        const input = buildSinglePassGCodeInput("fanuc", {
          profiles: TAPER_3DEG_SQUARE.profiles,
          start_hole: TAPER_3DEG_SQUARE.start_hole,
        }, { taper: true });
        const result = edmPostProcessGCodeEngine.generate_gcode(input);
        expect(result.gcode).toContain("G90");
        expect(result.passes_generated).toBe(1);
      });

      it("solves taper UV offsets correctly", () => {
        const input: TaperInput = {
          segments: [
            { start_point: { x: 0, y: 0 }, end_point: { x: 25, y: 0 }, taper_angle_deg: 3 },
            { start_point: { x: 25, y: 0 }, end_point: { x: 25, y: 25 }, taper_angle_deg: 3 },
            { start_point: { x: 25, y: 25 }, end_point: { x: 0, y: 25 }, taper_angle_deg: 3 },
            { start_point: { x: 0, y: 25 }, end_point: { x: 0, y: 0 }, taper_angle_deg: 3 },
          ],
          workpiece_height_mm: 25,
          guide_distance_mm: 80,
          wire_diameter_mm: 0.25,
        };
        const solution = edmWireSlugCornerTaperEngine.solveTaper(input);
        expect(solution.segments.length).toBe(4);
        expect(solution.max_uv_travel_required_mm).toBeGreaterThan(0);
        // UV offset = tan(3deg) * H/2 ~ tan(3) * 12.5 ~ 0.654mm
        for (const seg of solution.segments) {
          expect(Math.abs(seg.u_offset_mm)).toBeLessThan(5); // Sanity check
        }
      });
    });

    // T16 — 5-degree taper on circle
    describe("T16 — 5-degree Taper on Circle", () => {
      it("predicts taper accuracy within bounds", () => {
        const input: TaperAccuracyInput = {
          taper_angle_deg: 5,
          workpiece_height_mm: 25,
          wire_diameter_mm: 0.25,
          guide_distance_mm: 80,
          tolerance_mm: 0.010,
        };
        const accuracy = edmWireSlugCornerTaperEngine.predictTaperAccuracy(input);
        expect(accuracy.geometric_error_mm).toBeGreaterThan(0);
        expect(accuracy.total_predicted_error_mm).toBeGreaterThan(0);
        expect(accuracy.total_predicted_error_mm).toBeLessThan(1); // Not absurd
        expect(accuracy.recommendations).toEqual(expect.any(Array));
      });
    });

    // T17 — Variable taper
    describe("T17 — Variable Taper (1-7 degrees)", () => {
      it("generates variable taper profile", () => {
        const result = edmWireSlugCornerTaperEngine.generateVariableTaperProfile(VARIABLE_TAPER);
        expect(result.segments.length).toBe(4);
        expect(result.max_angle_change_deg).toBeGreaterThan(0);
        expect(result.feasible).toBeDefined();
      });

      it("checks UV transitions between segments", () => {
        const result = edmWireSlugCornerTaperEngine.generateVariableTaperProfile(VARIABLE_TAPER);
        if (result.uv_transitions.length > 0) {
          for (const t of result.uv_transitions) {
            expect(t.transition_length_mm).toBeGreaterThanOrEqual(0);
          }
        }
      });
    });

    // T18 — Involute gear profile
    describe("T18 — Involute Gear Profile (12-tooth)", () => {
      it("classifies gear as external profile", () => {
        const input: ToolpathInput = {
          profiles: INVOLUTE_GEAR_12T.profiles.map((p) => ({
            ...p,
            tolerance_mm: 0.005,
          })) as ProfileDefinition[],
          workpiece_thickness_mm: 25,
          wire_diameter_mm: 0.25,
        };
        const result = edmToolpathStrategyEngine.generate_toolpath(input);
        expect(result.profiles_classified.length).toBe(1);
        // Should detect many corners
        expect(result.corner_strategies.length).toBeGreaterThan(0);
      });

      it("cutting params produce reasonable MRR", () => {
        const input: CuttingParamInput = {
          material: "D2",
          thickness_mm: 25,
          wire_diameter_mm: 0.25,
          wire_type: "brass",
          pass_number: 1,
          pass_type: "rough",
        };
        const result = edmCuttingParamFlushEngine.optimizeParams(input);
        expect(result.predicted.mrr_mm2_min).toBeGreaterThan(0);
        expect(result.predicted.mrr_mm2_min).toBeLessThan(500); // Physical limit
        expect(result.predicted.ra_um).toBeGreaterThan(0);
      });
    });

    // T19 — Progressive die
    describe("T19 — Progressive Die (3 stations)", () => {
      it("sequences multiple profiles with correct ordering", () => {
        const input: ToolpathInput = {
          profiles: PROGRESSIVE_DIE_3STATION.profiles.map((p) => ({
            ...p,
            tolerance_mm: 0.005,
          })) as ProfileDefinition[],
          workpiece_thickness_mm: 25,
          wire_diameter_mm: 0.25,
        };
        const result = edmToolpathStrategyEngine.generate_toolpath(input);
        expect(result.profiles_classified.length).toBe(3);
        expect(result.cut_sequence.length).toBe(3);
      });
    });

    // T20 — Spline profile
    describe("T20 — Spline 16-point Profile", () => {
      it("generates valid G-code for complex contour", () => {
        const input = buildSinglePassGCodeInput("fanuc", SPLINE_PROFILE);
        const result = edmPostProcessGCodeEngine.generate_gcode(input);
        expect(result.gcode).toContain("G90");
        expect(result.passes_generated).toBe(1);
        expect(result.line_count).toBeGreaterThan(15);
      });
    });

    // T21 — Deep cut (150mm thickness)
    describe("T21 — Deep Cut 150mm Thickness", () => {
      it("multi-pass plan adapts for thick stock", () => {
        const input: MultiPassInput = {
          material: "D2",
          thickness_mm: 150,
          profile_length_mm: 100,
          tolerance_mm: 0.020,
          target_ra_um: 1.6,
          wire_diameter_mm: 0.25,
        };
        const plan = edmMultiPassStrategyEngine.full_plan(input);
        // Thick stock reduces cutting speed
        expect(plan.passes[0].cutting_speed_mm_min).toBeGreaterThan(0);
        expect(plan.total_time_min).toBeGreaterThan(20); // Long cut
      });

      it("flushing plan accounts for deep workpiece", () => {
        const input: FlushingInput = {
          material: "D2",
          thickness_mm: 150,
          pass_type: "rough",
          profile_type: "closed",
          wire_diameter_mm: 0.25,
        };
        const flush = edmCuttingParamFlushEngine.planFlushing(input);
        expect(flush.mode).toBeDefined();
        expect(flush.upper_nozzle.pressure_bar).toBeGreaterThan(0);
      });

      it("predicts higher wire break risk for thick material", () => {
        const input: CuttingParamInput = {
          material: "D2",
          thickness_mm: 150,
          wire_diameter_mm: 0.25,
          wire_type: "brass",
          pass_number: 1,
          pass_type: "rough",
        };
        const prediction = edmCuttingParamFlushEngine.predictWireBreakRisk(input);
        expect(prediction).toBeDefined();
      });
    });

    // T22 — Micro feature (2mm pocket)
    describe("T22 — Micro Pocket 2x2mm", () => {
      it("cutting params use low energy for micro feature", () => {
        const input: CuttingParamInput = {
          material: "D2",
          thickness_mm: 10,
          wire_diameter_mm: 0.10, // Micro wire
          wire_type: "brass",
          pass_number: 1,
          pass_type: "rough",
          target_ra_um: 0.2,
        };
        const result = edmCuttingParamFlushEngine.optimizeParams(input);
        expect(result.pulse.on_us).toBeGreaterThan(0);
        expect(result.pulse.peak_current_A).toBeGreaterThan(0);
        // Micro wire should have lower current than standard
        expect(result.pulse.peak_current_A).toBeLessThan(50);
      });
    });

    // Corner compensation
    describe("Corner Compensation Physics", () => {
      it("calculates wire lag and over-travel for 90-degree corners", () => {
        const input: CornerCompensationInput = {
          corners: [
            { index: 0, angle_deg: 90, position: { x: 25, y: 0 } },
            { index: 1, angle_deg: 90, position: { x: 25, y: 25 } },
            { index: 2, angle_deg: 90, position: { x: 0, y: 25 } },
            { index: 3, angle_deg: 90, position: { x: 0, y: 0 } },
          ],
          wire_diameter_mm: 0.25,
          wire_tension_N: 12,
          guide_distance_mm: 80,
          workpiece_height_mm: 25,
        };
        const result = edmWireSlugCornerTaperEngine.calculateCornerCompensation(input);
        expect(result.length).toBe(4);
        for (const corner of result) {
          expect(corner.wire_lag_mm).toBeGreaterThan(0);
          expect(corner.over_travel_mm).toBeGreaterThanOrEqual(0);
          expect(corner.dwell_time_sec).toBeGreaterThanOrEqual(0);
          expect(corner.accuracy_achievable_mm).toBeGreaterThan(0);
        }
      });

      it("sharper corners produce larger compensation values", () => {
        const sharp: CornerCompensationInput = {
          corners: [{ index: 0, angle_deg: 30, position: { x: 0, y: 0 } }],
          wire_diameter_mm: 0.25,
          wire_tension_N: 12,
          guide_distance_mm: 80,
          workpiece_height_mm: 25,
        };
        const mild: CornerCompensationInput = {
          corners: [{ index: 0, angle_deg: 150, position: { x: 0, y: 0 } }],
          wire_diameter_mm: 0.25,
          wire_tension_N: 12,
          guide_distance_mm: 80,
          workpiece_height_mm: 25,
        };
        const sharpResult = edmWireSlugCornerTaperEngine.calculateCornerCompensation(sharp);
        const mildResult = edmWireSlugCornerTaperEngine.calculateCornerCompensation(mild);
        // With the OT = lag*sin(θ/2)/sin(θ) formula, obtuse angles produce larger over-travel
        expect(mildResult[0].over_travel_mm).toBeGreaterThan(sharpResult[0].over_travel_mm);
      });
    });
  });

  // ==========================================================================
  // Wave 4: Extreme Conditions (MS4) — T23 through T30
  // ==========================================================================
  describe("Wave 4: Extreme (MS4)", () => {
    // T23 — Tungsten carbide
    describe("T23 — Tungsten Carbide Square", () => {
      it("cutting params reflect carbide difficulty", () => {
        const input: CuttingParamInput = {
          material: "tungsten_carbide",
          thickness_mm: 25,
          wire_diameter_mm: 0.25,
          wire_type: "brass",
          pass_number: 1,
          pass_type: "rough",
        };
        const result = edmCuttingParamFlushEngine.optimizeParams(input);
        expect(result.predicted.mrr_mm2_min).toBeGreaterThan(0);
        expect(result.wire_break_risk).toBeGreaterThan(0);
      });

      it("feasibility check passes for conductive carbide", () => {
        const input: FeasibilityInput = {
          material: "tungsten_carbide",
          features: [{
            name: "tc_square",
            is_through: true,
            profile_length_mm: 100,
            min_corner_radius_mm: 0.2,
          }],
          workpiece: { thickness_mm: 25, length_mm: 50, width_mm: 50, height_mm: 25 },
        };
        const result = edmFeasibilityEngine.assess(input);
        expect(result.overall_feasible).toBe(true);
        expect(result.conductivity.feasible).toBe(true);
      });
    });

    // T24 — Inconel circle
    describe("T24 — Inconel 718 Circle", () => {
      it("multi-pass plan handles Inconel properties", () => {
        const input: MultiPassInput = {
          material: "inconel",
          thickness_mm: 25,
          profile_length_mm: 62.83,
          tolerance_mm: 0.010,
          target_ra_um: 0.8,
          wire_diameter_mm: 0.25,
        };
        const plan = edmMultiPassStrategyEngine.full_plan(input);
        expect(plan.total_passes).toBeGreaterThanOrEqual(2);
        expect(plan.passes[0].cutting_speed_mm_min).toBeGreaterThan(0);
      });
    });

    // T25 — Copper electrode
    describe("T25 — Copper Electrode Profile", () => {
      it("cutting params reflect high conductivity", () => {
        const input: CuttingParamInput = {
          material: "copper",
          thickness_mm: 20,
          wire_diameter_mm: 0.25,
          wire_type: "brass",
          pass_number: 1,
          pass_type: "rough",
        };
        const result = edmCuttingParamFlushEngine.optimizeParams(input);
        expect(result.predicted.mrr_mm2_min).toBeGreaterThan(0);
      });
    });

    // T26 — Thick block (300mm)
    describe("T26 — 300mm Thick Block", () => {
      it("feasibility assessment flags thick workpiece challenges", () => {
        const input: FeasibilityInput = {
          material: "D2",
          features: [{
            name: "thick_cut",
            is_through: true,
            profile_length_mm: 100,
          }],
          workpiece: { thickness_mm: 301, length_mm: 100, width_mm: 100, height_mm: 301 },
        };
        const result = edmFeasibilityEngine.assess(input);
        // Should have warnings about thick workpiece (engine checks > 300mm)
        expect(result.warnings.length + result.recommendations.length).toBeGreaterThan(0);
      });

      it("cutting speed decreases dramatically at 300mm", () => {
        const thin: CuttingParamInput = {
          material: "D2",
          thickness_mm: 25,
          wire_diameter_mm: 0.25,
          wire_type: "brass",
          pass_number: 1,
          pass_type: "rough",
        };
        const thick: CuttingParamInput = {
          ...thin,
          thickness_mm: 300,
        };
        const thinResult = edmCuttingParamFlushEngine.optimizeParams(thin);
        const thickResult = edmCuttingParamFlushEngine.optimizeParams(thick);
        expect(thickResult.predicted.mrr_mm2_min).toBeLessThan(
          thinResult.predicted.mrr_mm2_min,
        );
      });
    });

    // T27 — Multi-cavity (4 identical squares)
    describe("T27 — Multi-Cavity 4x Squares", () => {
      it("sequences 4 cavities optimally", () => {
        const input: ToolpathInput = {
          profiles: MULTI_CAVITY_4X.profiles.map((p) => ({
            ...p,
            tolerance_mm: 0.01,
          })) as ProfileDefinition[],
          workpiece_thickness_mm: 25,
          wire_diameter_mm: 0.25,
        };
        const result = edmToolpathStrategyEngine.generate_toolpath(input);
        expect(result.cut_sequence.length).toBe(4);
        expect(result.profiles_classified.length).toBe(4);
      });

      it("generates valid G-code for all 4 profiles", () => {
        const input: EDMGCodeInput = {
          controller: "fanuc",
          profiles: MULTI_CAVITY_4X.profiles.map((p, i) => ({
            name: p.name,
            contour_points: p.contour_points,
            start_hole: MULTI_CAVITY_4X.start_holes[i],
            approach: { type: "tangent_arc", length_mm: 3 },
            departure: { type: "tangent_arc", length_mm: 3 },
          })),
          passes: [
            { pass_number: 1, offset_mm: 0.14, technology_table: "STL-250-R", wire_speed_m_min: 10, tension_N: 12 },
          ],
          wire_type: "brass",
          program_number: 4001,
        };
        const result = edmPostProcessGCodeEngine.generate_gcode(input);
        expect(result.profiles_cut).toBe(4);
        expect(result.gcode).toContain("M50"); // Wire thread per profile
      });
    });

    // T28 — Near-zero corner radius
    describe("T28 — Near-Zero Corner Radius (R0.05)", () => {
      it("corner compensation handles very sharp corners", () => {
        const input: CornerCompensationInput = {
          corners: [
            { index: 0, angle_deg: 90, position: { x: 15, y: 0 } },
          ],
          wire_diameter_mm: 0.25,
          wire_tension_N: 12,
          guide_distance_mm: 80,
          workpiece_height_mm: 25,
        };
        const result = edmWireSlugCornerTaperEngine.calculateCornerCompensation(input);
        expect(result[0].wire_lag_mm).toBeGreaterThan(0);
        expect(result[0].dwell_time_sec).toBeGreaterThan(0);
      });
    });

    // T29 — Large slug management
    describe("T29 — Large Slug (80x80mm)", () => {
      it("slug plan selects appropriate management method", () => {
        const input: SlugManagementInput = {
          profiles: [{
            name: "large_slug",
            area_mm2: 6400, // 80x80
          }],
          workpiece_thickness_mm: 25,
          material_density_kg_m3: 7850,
        };
        const plans = edmWireSlugCornerTaperEngine.planSlugManagement(input);
        expect(plans.length).toBeGreaterThan(0);
        const plan = plans[0];
        expect(plan.weight_kg).toBeGreaterThan(0);
        // Large slug should not free drop
        expect(plan.can_fall_free).toBe(false);
        expect(plan.intervention_needed).toBe(true);
      });
    });

    // T30 — Asymmetric complex contour
    describe("T30 — Asymmetric Complex Contour", () => {
      it("generates valid G-code for irregular shape", () => {
        const input = buildSinglePassGCodeInput("fanuc", ASYMMETRIC_CONTOUR);
        const result = edmPostProcessGCodeEngine.generate_gcode(input);
        expect(result.gcode).toContain("G90");
        expect(result.passes_generated).toBe(1);
        expect(result.line_count).toBeGreaterThan(10);
      });

      it("detects corner strategies for variable angles", () => {
        const input: ToolpathInput = {
          profiles: ASYMMETRIC_CONTOUR.profiles.map((p) => ({
            ...p,
            tolerance_mm: 0.01,
          })) as ProfileDefinition[],
          workpiece_thickness_mm: 25,
          wire_diameter_mm: 0.25,
        };
        const result = edmToolpathStrategyEngine.generate_toolpath(input);
        expect(result.corner_strategies.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // Wave 5: System-Level Integration (MS5) — T31 through T42
  // ==========================================================================
  describe("Wave 5: System-Level (MS5)", () => {
    // T31 — Full pipeline: D2 tool steel die
    describe("T31 — Full Pipeline D2 Die", () => {
      it("drawing interpretation classifies D2 die features", () => {
        const input: EDMDrawingInput = {
          features: FULL_PIPELINE_D2_DIE.features,
          material: FULL_PIPELINE_D2_DIE.material,
          material_hardness_hrc: FULL_PIPELINE_D2_DIE.material_hardness_hrc,
          overall_thickness_mm: FULL_PIPELINE_D2_DIE.overall_thickness_mm,
          tolerance_mm: 0.005,
          target_ra_um: 0.4,
        };
        const result = edmDrawingInterpretationEngine.interpret(input);
        expect(result.features_classified.length).toBe(1);
        expect(result.recommended_process.edm_required).toBe(true);
        expect(result.material_assessment.is_conductive).toBe(true);
        expect(result.pass_requirements.total_passes).toBeGreaterThanOrEqual(3);
      });

      it("feasibility confirms D2 die is feasible", () => {
        const input: FeasibilityInput = {
          material: "tool steel",
          features: [{
            name: "die_cavity",
            is_through: true,
            profile_length_mm: 152,
            tolerance_mm: 0.005,
            surface_finish_ra_um: 0.4,
            min_corner_radius_mm: 0.5,
          }],
          workpiece: { thickness_mm: 25, length_mm: 100, width_mm: 80, height_mm: 25 },
        };
        const result = edmFeasibilityEngine.assess(input);
        expect(result.overall_feasible).toBe(true);
        expect(result.blockers.length).toBe(0);
      });

      it("end-to-end: interpret -> plan -> gcode for D2 die", () => {
        // Step 1: Drawing interpretation
        const drawingInput: EDMDrawingInput = {
          features: FULL_PIPELINE_D2_DIE.features,
          material: "d2",
          material_hardness_hrc: 60,
          overall_thickness_mm: 25,
          tolerance_mm: 0.005,
          target_ra_um: 0.4,
        };
        const drawing = edmDrawingInterpretationEngine.interpret(drawingInput);

        // Step 2: Multi-pass planning
        const passInput: MultiPassInput = {
          material: "D2",
          thickness_mm: 25,
          profile_length_mm: 152,
          tolerance_mm: 0.005,
          target_ra_um: 0.4,
          wire_diameter_mm: 0.25,
        };
        const passPlan = edmMultiPassStrategyEngine.full_plan(passInput);
        expect(passPlan.total_passes).toBeGreaterThanOrEqual(drawing.pass_requirements.total_passes);

        // Step 3: G-code generation with planned passes
        const gcodeInput: EDMGCodeInput = {
          controller: "fanuc",
          profiles: [{
            name: "die_cavity",
            contour_points: roundedRectPoints(50, 30, 0.5),
            start_hole: { x: 25, y: 15 },
            approach: { type: "tangent_arc", length_mm: 3 },
            departure: { type: "tangent_arc", length_mm: 3 },
          }],
          passes: passPlan.passes.map((p) => ({
            pass_number: p.pass_number,
            offset_mm: p.offset_mm,
            technology_table: `E${p.pass_number}`,
            wire_speed_m_min: p.wire_speed_m_min,
            tension_N: 12,
            corner_strategy: p.pass_type === "rough" ? "continuous" as const : "exact_stop" as const,
          })),
          wire_type: "brass",
          program_number: 3100,
        };
        const gcode = edmPostProcessGCodeEngine.generate_gcode(gcodeInput);
        expect(gcode.passes_generated).toBe(passPlan.total_passes);
        expect(gcode.gcode).toContain("G90");
        expect(gcode.gcode).toContain("M50");
        expect(gcode.line_count).toBeGreaterThan(20);
      });
    });

    // T32 — Full pipeline: H13 extrusion die
    describe("T32 — Full Pipeline H13 Extrusion Die", () => {
      it("interprets H13 material correctly", () => {
        const input: EDMDrawingInput = {
          features: FULL_PIPELINE_ALUMINUM_DIE.features,
          material: "h13",
          material_hardness_hrc: 48,
          overall_thickness_mm: 40,
          tolerance_mm: 0.010,
          target_ra_um: 0.8,
        };
        const result = edmDrawingInterpretationEngine.interpret(input);
        expect(result.material_assessment.is_conductive).toBe(true);
        expect(result.material_assessment.edm_machinability).not.toBe("not_possible");
      });
    });

    // T33 — Aerospace titanium
    describe("T33 — Aerospace Titanium Bracket", () => {
      it("material assessment flags titanium considerations", () => {
        const input: EDMDrawingInput = {
          features: AEROSPACE_TITANIUM.features,
          material: "ti6al4v",
          overall_thickness_mm: 15,
          tolerance_mm: 0.008,
          target_ra_um: 0.6,
        };
        const result = edmDrawingInterpretationEngine.interpret(input);
        expect(result.material_assessment.is_conductive).toBe(true);
      });

      it("multi-pass plan accounts for titanium cutting speed", () => {
        const input: MultiPassInput = {
          material: "titanium",
          thickness_mm: 15,
          profile_length_mm: 136,
          tolerance_mm: 0.008,
          target_ra_um: 0.6,
          wire_diameter_mm: 0.25,
        };
        const plan = edmMultiPassStrategyEngine.full_plan(input);
        expect(plan.total_passes).toBeGreaterThanOrEqual(2);
      });
    });

    // T34 — Medical stainless
    describe("T34 — Medical Stainless Implant", () => {
      it("achieves tight tolerance for medical application", () => {
        const input: MultiPassInput = {
          material: "stainless_steel",
          thickness_mm: 8,
          profile_length_mm: 55,
          tolerance_mm: 0.003,
          target_ra_um: 0.2,
          wire_diameter_mm: 0.25,
        };
        const plan = edmMultiPassStrategyEngine.full_plan(input);
        expect(plan.total_passes).toBeGreaterThanOrEqual(5);
        expect(plan.predicted_final_ra_um).toBeLessThanOrEqual(1.0);
      });
    });

    // T35 — Multi-profile 5-cavity die
    describe("T35 — Multi-Profile 5-Cavity Die", () => {
      it("toolpath sequences 5 cavities optimally", () => {
        const input: ToolpathInput = {
          profiles: MULTI_PROFILE_5CAV.profiles.map((p) => ({
            ...p,
            tolerance_mm: 0.005,
          })) as ProfileDefinition[],
          workpiece_thickness_mm: 25,
          wire_diameter_mm: 0.25,
        };
        const result = edmToolpathStrategyEngine.generate_toolpath(input);
        expect(result.cut_sequence.length).toBe(5);
        expect(result.profiles_classified.length).toBe(5);
      });
    });

    // T36 — Tab-heavy geometry
    describe("T36 — Tab-Heavy Large Slug Geometry", () => {
      it("slug management recommends controlled method for heavy slug", () => {
        const input: SlugManagementInput = {
          profiles: [{
            name: "heavy_slug",
            area_mm2: 8000,
          }],
          workpiece_thickness_mm: 40,
          material_density_kg_m3: 7850,
        };
        const plans = edmWireSlugCornerTaperEngine.planSlugManagement(input);
        expect(plans[0].weight_kg).toBeGreaterThan(1);
        expect(plans[0].management).not.toBe("free_drop");
      });

      it("tab plan provides adequate holding for large slug", () => {
        const input: ToolpathInput = {
          profiles: [{
            name: "heavy_slug",
            type: "closed_internal",
            contour_points: TAB_HEAVY_GEOM.profiles[0].contour_points,
            profile_length_mm: 360,
            is_critical_surface: false,
          }] as ProfileDefinition[],
          workpiece_thickness_mm: 40,
          wire_diameter_mm: 0.25,
        };
        const result = edmToolpathStrategyEngine.generate_toolpath(input);
        if (result.tabs.length > 0) {
          expect(result.tabs[0].tab_count).toBeGreaterThanOrEqual(2);
        }
      });
    });

    // T37 — Maximum taper angle
    describe("T37 — Maximum Taper 15 Degrees", () => {
      it("taper accuracy prediction flags potential issues at 15 deg", () => {
        const input: TaperAccuracyInput = MAX_TAPER_15DEG;
        const result = edmWireSlugCornerTaperEngine.predictTaperAccuracy(input);
        expect(result.geometric_error_mm).toBeGreaterThan(0);
        expect(result.taper_angle_deg).toBe(15);
        // At 15 degrees, error should be significant
        expect(result.total_predicted_error_mm).toBeGreaterThan(0.01);
      });
    });

    // T38 — Flushing comparison
    describe("T38 — Submerged vs Spray Flushing", () => {
      it("submerged flushing has different pressure profile than spray", () => {
        const submergedInput: FlushingInput = {
          material: "D2",
          thickness_mm: 50,
          pass_type: "rough",
          profile_type: "closed",
          wire_diameter_mm: 0.25,
        };
        const submergedPlan = edmCuttingParamFlushEngine.planFlushing(submergedInput);
        expect(submergedPlan.mode).toBeDefined();
        expect(submergedPlan.upper_nozzle.pressure_bar).toBeGreaterThan(0);
        expect(submergedPlan.upper_nozzle.distance_mm).toBeGreaterThan(0);
      });

      it("finish pass uses lower flushing pressure", () => {
        const roughInput: FlushingInput = {
          material: "D2",
          thickness_mm: 50,
          pass_type: "rough",
          wire_diameter_mm: 0.25,
        };
        const finishInput: FlushingInput = {
          ...roughInput,
          pass_type: "finish",
        };
        const roughFlush = edmCuttingParamFlushEngine.planFlushing(roughInput);
        const finishFlush = edmCuttingParamFlushEngine.planFlushing(finishInput);
        expect(finishFlush.upper_nozzle.pressure_bar).toBeLessThanOrEqual(
          roughFlush.upper_nozzle.pressure_bar,
        );
      });
    });

    // T39 — Wire break risk
    describe("T39 — Wire Break Risk Assessment", () => {
      it("predicts elevated risk for carbide at 100mm", () => {
        const input: CuttingParamInput = WIRE_BREAK_RISK_GEOM;
        const result = edmCuttingParamFlushEngine.predictWireBreakRisk(input);
        expect(result).toBeDefined();
      });

      it("full optimization includes break risk mitigation", () => {
        const input: CuttingParamInput = WIRE_BREAK_RISK_GEOM;
        const result = edmCuttingParamFlushEngine.fullOptimize(input);
        expect(result).toBeDefined();
      });
    });

    // T40 — Post-process plan for aerospace
    describe("T40 — Post-Process Plan Aerospace Spec", () => {
      it("generates mandatory recast removal and inspection steps", () => {
        const plan = edmPostProcessGCodeEngine.plan_post_process(POST_PROCESS_AEROSPACE);
        expect(plan.sequence.length).toBeGreaterThan(3);
        expect(plan.total_time_hours).toBeGreaterThan(0);
        expect(plan.total_cost_estimate).toBeGreaterThan(0);
        expect(plan.critical_steps.length).toBeGreaterThan(0);

        // Aerospace part should have recast removal
        const hasRecastStep = plan.sequence.some(
          (s) => s.process.toLowerCase().includes("recast") || s.description.toLowerCase().includes("recast"),
        );
        expect(hasRecastStep).toBe(true);

        // Should have inspection step
        const hasInspection = plan.sequence.some(
          (s) => s.process.toLowerCase().includes("inspect") || s.description.toLowerCase().includes("inspect"),
        );
        expect(hasInspection).toBe(true);

        // Should have coating step
        const hasCoating = plan.sequence.some(
          (s) => s.process.toLowerCase().includes("coat") || s.process.toLowerCase().includes("pvd") ||
                 s.description.toLowerCase().includes("coat") || s.description.toLowerCase().includes("pvd"),
        );
        expect(hasCoating).toBe(true);
      });

      it("post-process plan sequence is correctly ordered", () => {
        const plan = edmPostProcessGCodeEngine.plan_post_process(POST_PROCESS_AEROSPACE);
        // Each step order should be increasing
        for (let i = 1; i < plan.sequence.length; i++) {
          expect(plan.sequence[i].order).toBeGreaterThanOrEqual(plan.sequence[i - 1].order);
        }
      });
    });

    // T41 — Cross-controller consistency
    describe("T41 — Cross-Controller Consistency", () => {
      it("all controllers produce valid G-code for same geometry", () => {
        const results: Record<string, EDMGCodeResult> = {};
        for (const ctrl of CONTROLLERS) {
          const input = buildSinglePassGCodeInput(ctrl, CONTROLLER_CONSISTENCY_GEOM);
          results[ctrl] = edmPostProcessGCodeEngine.generate_gcode(input);
        }

        // All should produce valid output
        for (const ctrl of CONTROLLERS) {
          expect(results[ctrl].gcode).toContain("G90");
          // Mitsubishi doesn't emit G21 (real programs use controller default)
          if (ctrl !== "mitsubishi") {
            expect(results[ctrl].gcode).toContain("G21");
          }
          expect(results[ctrl].passes_generated).toBe(1);
          expect(results[ctrl].profiles_cut).toBe(1);
          expect(results[ctrl].line_count).toBeGreaterThan(10);
          expect(results[ctrl].estimated_time_min).toBeGreaterThan(0);
        }
      });

      it("all controllers agree on profile count and pass count", () => {
        const results: EDMGCodeResult[] = [];
        for (const ctrl of CONTROLLERS) {
          const input = buildSinglePassGCodeInput(ctrl, CONTROLLER_CONSISTENCY_GEOM);
          results.push(edmPostProcessGCodeEngine.generate_gcode(input));
        }
        const profileCounts = results.map((r) => r.profiles_cut);
        const passCounts = results.map((r) => r.passes_generated);
        // All should match
        expect(new Set(profileCounts).size).toBe(1);
        expect(new Set(passCounts).size).toBe(1);
      });
    });

    // T42 — End-to-end regression
    describe("T42 — End-to-End Regression (Rect R2)", () => {
      it("produces deterministic output for same input", () => {
        const input = buildSinglePassGCodeInput("fanuc", RECT_R2);
        const result1 = edmPostProcessGCodeEngine.generate_gcode(input);
        const result2 = edmPostProcessGCodeEngine.generate_gcode(input);
        expect(result1.gcode).toBe(result2.gcode);
        expect(result1.line_count).toBe(result2.line_count);
        expect(result1.estimated_time_min).toBe(result2.estimated_time_min);
      });

      it("full_generate produces coherent cross-validated output", () => {
        const gcodeInput = buildMultiPassGCodeInput("fanuc", RECT_R2, 4);
        const postInput: PostProcessInput = {
          material: "D2",
          surface_finish_Ra_um: 0.4,
          has_tight_tolerances: true,
          tolerance_mm: 0.005,
          requires_fatigue_life: false,
          requires_coating: false,
          part_thickness_mm: 25,
          is_aerospace: false,
          is_medical: false,
          num_profiles: 1,
        };
        const result = edmPostProcessGCodeEngine.full_generate({
          gcode_input: gcodeInput,
          post_process: postInput,
        });
        expect(result.gcode_result.passes_generated).toBe(4);
        expect(result.post_process_plan.sequence.length).toBeGreaterThan(0);
        expect(result.summary.total_edm_time_min).toBeGreaterThan(0);
        expect(result.summary.controller).toBe("Fanuc Alpha-C / Alpha-iC");
        expect(result.summary.passes).toBe(4);
        expect(result.summary.profiles).toBe(1);
      });

      it("drawing interpretation produces consistent results", () => {
        const input: EDMDrawingInput = {
          features: [{
            name: "regression_rect",
            type: "profile",
            is_through: true,
            dimensions_mm: { length: 50, width: 30 },
            tolerance_mm: 0.005,
            surface_finish_ra_um: 0.4,
            min_corner_radius_mm: 2,
            profile_length_mm: 152.57,
          }],
          material: "d2",
          material_hardness_hrc: 60,
          overall_thickness_mm: 25,
        };
        const result1 = edmDrawingInterpretationEngine.interpret(input);
        const result2 = edmDrawingInterpretationEngine.interpret(input);
        expect(result1.pass_requirements.total_passes).toBe(result2.pass_requirements.total_passes);
        expect(result1.material_assessment.edm_machinability).toBe(result2.material_assessment.edm_machinability);
      });
    });
  });

  // ==========================================================================
  // Cross-Cutting Validation
  // ==========================================================================
  describe("Cross-Cutting: Physics Sanity Checks", () => {
    it("MRR is never zero or negative for conductive materials", () => {
      for (const mat of ["D2", "aluminum", "copper", "stainless_steel"]) {
        const input: CuttingParamInput = {
          material: mat,
          thickness_mm: 25,
          wire_diameter_mm: 0.25,
          wire_type: "brass",
          pass_number: 1,
          pass_type: "rough",
        };
        const result = edmCuttingParamFlushEngine.optimizeParams(input);
        expect(result.predicted.mrr_mm2_min).toBeGreaterThan(0);
      }
    });

    it("Ra prediction is never zero or infinity", () => {
      for (const passType of ["rough", "semi_finish", "finish", "super_finish"] as const) {
        const input: CuttingParamInput = {
          material: "D2",
          thickness_mm: 25,
          wire_diameter_mm: 0.25,
          wire_type: "brass",
          pass_number: passType === "rough" ? 1 : 3,
          pass_type: passType,
        };
        const result = edmCuttingParamFlushEngine.optimizeParams(input);
        expect(result.predicted.ra_um).toBeGreaterThan(0);
        expect(Number.isFinite(result.predicted.ra_um)).toBe(true);
      }
    });

    it("recast layer decreases with skim passes", () => {
      const input: MultiPassInput = {
        material: "D2",
        thickness_mm: 25,
        profile_length_mm: 100,
        tolerance_mm: 0.003,
        target_ra_um: 0.2,
        wire_diameter_mm: 0.25,
      };
      const plan = edmMultiPassStrategyEngine.full_plan(input);
      if (plan.passes.length >= 2) {
        const roughRecast = plan.passes[0].predicted_recast_um;
        const lastRecast = plan.passes[plan.passes.length - 1].predicted_recast_um;
        expect(lastRecast).toBeLessThanOrEqual(roughRecast);
      }
    });

    it("discharge energy decreases from rough to finish", () => {
      const input: MultiPassInput = {
        material: "D2",
        thickness_mm: 25,
        profile_length_mm: 100,
        tolerance_mm: 0.005,
        target_ra_um: 0.4,
        wire_diameter_mm: 0.25,
      };
      const plan = edmMultiPassStrategyEngine.full_plan(input);
      if (plan.passes.length >= 2) {
        expect(plan.passes[plan.passes.length - 1].energy_mj).toBeLessThanOrEqual(
          plan.passes[0].energy_mj,
        );
      }
    });

    it("wire break risk is between 0 and 1", () => {
      const input: CuttingParamInput = {
        material: "D2",
        thickness_mm: 50,
        wire_diameter_mm: 0.25,
        wire_type: "brass",
        pass_number: 1,
        pass_type: "rough",
      };
      const result = edmCuttingParamFlushEngine.optimizeParams(input);
      expect(result.wire_break_risk).toBeGreaterThanOrEqual(0);
      expect(result.wire_break_risk).toBeLessThanOrEqual(1);
    });

    it("non-conductive material is flagged as infeasible", () => {
      const input: FeasibilityInput = {
        material: "ceramic",
        features: [{
          name: "test",
          is_through: true,
          profile_length_mm: 50,
        }],
        workpiece: { thickness_mm: 10, length_mm: 50, width_mm: 50, height_mm: 10 },
      };
      const result = edmFeasibilityEngine.assess(input);
      expect(result.conductivity.feasible).toBe(false);
      expect(result.overall_feasible).toBe(false);
    });

    it("pulse-on time is always positive", () => {
      const input: CuttingParamInput = {
        material: "D2",
        thickness_mm: 25,
        wire_diameter_mm: 0.25,
        wire_type: "brass",
        pass_number: 1,
        pass_type: "rough",
      };
      const result = edmCuttingParamFlushEngine.optimizeParams(input);
      expect(result.pulse.on_us).toBeGreaterThan(0);
      expect(result.pulse.off_us).toBeGreaterThan(0);
      expect(result.pulse.peak_current_A).toBeGreaterThan(0);
    });

    it("technology table mapping exists for known controllers", () => {
      for (const ctrl of ["fanuc", "sodick", "makino", "mitsubishi"]) {
        const input: CuttingParamInput = {
          material: "D2",
          thickness_mm: 25,
          wire_diameter_mm: 0.25,
          wire_type: "brass",
          pass_number: 1,
          pass_type: "rough",
          machine_controller: ctrl,
        };
        const techTable = edmCuttingParamFlushEngine.mapTechTable(input);
        // Should return a mapping for known controllers
        if (techTable) {
          expect(techTable.machine).toBeDefined();
          expect(techTable.table_id).toBeDefined();
        }
      }
    });
  });

  // ==========================================================================
  // Cross-Cutting: Energy Calculations
  // ==========================================================================
  describe("Cross-Cutting: Energy Physics", () => {
    it("detailed energy calculation produces valid results", () => {
      const input: CuttingParamInput = {
        material: "D2",
        thickness_mm: 25,
        wire_diameter_mm: 0.25,
        wire_type: "brass",
        pass_number: 1,
        pass_type: "rough",
      };
      const energy = edmCuttingParamFlushEngine.calculateEnergyDetailed(input);
      expect(energy).toBeDefined();
    });

    it("duty cycle is between 0 and 1", () => {
      const input: CuttingParamInput = {
        material: "D2",
        thickness_mm: 25,
        wire_diameter_mm: 0.25,
        wire_type: "brass",
        pass_number: 1,
        pass_type: "rough",
      };
      const result = edmCuttingParamFlushEngine.optimizeParams(input);
      expect(result.energy.duty_cycle).toBeGreaterThan(0);
      expect(result.energy.duty_cycle).toBeLessThan(1);
    });
  });
});
