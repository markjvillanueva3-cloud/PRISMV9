/**
 * CAMX-MS4 U03 Action Schemas — Zod v4
 *
 * 6 dispatcher actions (SolidCAMiMachiningEngine E1103):
 *   imachining_compute    — full iMachining computation (all algorithms)
 *   imachining_wizard     — Technology Wizard level-to-params mapping
 *   imachining_spiral     — morphing spiral toolpath generation
 *   imachining_engagement — constant engagement feed adjustment
 *   imachining_moat       — moat zone calculation for wide pockets
 *   imachining_chipload   — chip load maintenance feed profile
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const isoGroupZ = z.enum(["H", "K", "M", "N", "P", "S"]).describe(
  "ISO material group: P=steel, M=stainless, K=cast iron, N=aluminum, S=superalloy, H=hardened"
);

const machineClassZ = z.enum([
  "heavy", "hobby", "light", "medium", "ultra_rigid",
]).describe("Machine rigidity class");

const featureZ = z.object({
  type: z.enum([
    "cavity", "contour", "face", "open_pocket", "pocket", "slot",
  ]).describe("Feature type"),
  volume_cm3: z.number().positive().describe("Volume to remove, cm^3"),
  width_mm: z.number().positive().describe("Feature width, mm"),
  depth_mm: z.number().positive().describe("Feature depth, mm"),
  boundary: z.array(z.tuple([z.number(), z.number()])).optional().describe(
    "Boundary polygon vertices [[x,y], ...] for spiral generation"
  ),
  corner_radii_mm: z.array(z.number().nonnegative()).optional().describe(
    "Corner radii, mm — for engagement spike assessment"
  ),
}).passthrough();

const materialZ = z.object({
  iso_group: isoGroupZ,
  material_key: z.string().optional().describe(
    "Material key from CANONICAL_MATERIAL_DB, e.g. 'steel', 'aluminum_6061', 'stainless_304'"
  ),
  kc1_1: z.number().positive().optional().describe("Override: specific cutting force kc1_1 (N/mm^2)"),
  mc: z.number().positive().optional().describe("Override: Kienzle exponent mc"),
  vc_base: z.number().positive().optional().describe("Override: base cutting speed roughing (m/min)"),
}).passthrough();

const toolZ = z.object({
  diameter_mm: z.number().positive().describe("Tool diameter, mm"),
  flutes: z.number().int().positive().describe("Number of flutes"),
  corner_radius_mm: z.number().nonnegative().optional().default(0).describe("Corner radius, mm (0=sharp)"),
  helix_angle_deg: z.number().optional().default(30).describe("Helix angle, deg"),
  flute_length_mm: z.number().positive().optional().describe("Maximum flute length, mm"),
}).passthrough();

const machineZ = z.object({
  class: machineClassZ,
  max_rpm: z.number().positive().describe("Max spindle speed, RPM"),
  power_kw: z.number().positive().describe("Spindle power, kW"),
  max_feed_mm_min: z.number().positive().optional().describe("Max feed rate, mm/min"),
}).passthrough();

// ── Action Schemas ────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS4_U03_SCHEMAS: ActionSchemaMap = {
  imachining_compute: z.object({
    feature: featureZ.describe("Feature geometry and dimensions"),
    material: materialZ.describe("Material specification"),
    tool: toolZ.describe("Tool specification"),
    machine: machineZ.describe("Machine specification"),
    level: z.number().int().min(1).max(8).optional().default(4).describe(
      "Technology Wizard level 1-8: 1=conservative, 4=balanced, 8=aggressive"
    ),
  }),

  imachining_wizard: z.object({
    material_iso: isoGroupZ.describe("ISO material group"),
    machine_class: machineClassZ.describe("Machine rigidity class"),
    level: z.number().int().min(1).max(8).describe("Wizard level 1-8"),
    tool_diameter_mm: z.number().positive().optional().describe(
      "Tool diameter for absolute ae/ap values (default 10mm)"
    ),
  }),

  imachining_spiral: z.object({
    boundary: z.array(z.tuple([z.number(), z.number()])).min(3).describe(
      "Pocket boundary polygon vertices [[x,y], ...]"
    ),
    tool_diameter: z.number().positive().describe("Tool diameter, mm"),
    target_engagement: z.number().min(5).max(90).optional().default(40).describe(
      "Target engagement angle, deg (default 40)"
    ),
  }),

  imachining_engagement: z.object({
    toolpath: z.array(z.object({
      engagement_deg: z.number().min(0).max(180).describe("Engagement angle, deg"),
      feed_mm_min: z.number().positive().describe("Feed rate, mm/min"),
    })).min(1).describe("Toolpath segments with engagement and feed data"),
    target_angle: z.number().min(5).max(90).optional().default(40).describe(
      "Target engagement angle, deg (default 40)"
    ),
  }),

  imachining_moat: z.object({
    boundary: z.array(z.tuple([z.number(), z.number()])).min(3).describe(
      "Pocket boundary polygon vertices [[x,y], ...]"
    ),
    tool_diameter: z.number().positive().describe("Tool diameter, mm"),
    stepover_mm: z.number().positive().optional().describe(
      "Override stepover for moat width calculation (default from 40 deg engagement)"
    ),
  }),

  imachining_chipload: z.object({
    engagement_profile: z.array(z.object({
      position: z.number().min(0).max(1).describe("Position along path (0..1)"),
      engagement_deg: z.number().min(0).max(180).describe("Engagement angle, deg"),
    })).min(1).describe("Engagement profile along the toolpath"),
    base_fz: z.number().positive().describe("Base feed per tooth, mm"),
    spindle_rpm: z.number().positive().optional().default(5000).describe("Spindle RPM"),
    flutes: z.number().int().positive().optional().default(4).describe("Number of flutes"),
    target_engagement: z.number().min(5).max(90).optional().default(40).describe(
      "Target engagement angle, deg (default 40)"
    ),
  }),
};
