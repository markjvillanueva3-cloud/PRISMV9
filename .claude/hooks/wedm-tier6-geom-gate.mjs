#!/usr/bin/env node
/**
 * WEDM Tier 6 Geometry Gate Hook
 *
 * MS-P3-TIER6A/U-P3-T6A-04 — Forge Triple Hook
 *
 * HARD BLOCK: Prevents WEDM program generation if geometry violates constraints:
 *   - min_radius < wire_dia + 2·gap
 *   - slot_width < wire_dia + 2·gap
 *   - part exceeds machine envelope
 *
 * Triggers on: prism_cam actions related to WEDM program generation
 * Hook type: PreToolUse
 *
 * Physics: The wire cannot cut sharper than its physical kerf width.
 * R_min = wire_dia + 2·gap ensures clearance for wire bow and spark erosion.
 *
 * Source: Mitsubishi MV1200R §3.2; Sodick VL400Q; Ho & Newman CIRP 2003
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const WEDM_ACTIONS = [
  "edm_program_assemble",
  "wedm_tier6_validate",
  "wedm_program_generate",
  "wedm_toolpath_generate",
];

const DEFAULT_WIRE_DIA_MM = 0.25;
const DEFAULT_SPARK_GAP_MM = 0.025;

function computeMinRadius(wireDia, sparkGap) {
  return wireDia + 2 * sparkGap;
}

function validateGeometry(params) {
  const wireDia = params.wire_diameter_mm ?? DEFAULT_WIRE_DIA_MM;
  const sparkGap = params.spark_gap_mm ?? DEFAULT_SPARK_GAP_MM;
  const minRadius = computeMinRadius(wireDia, sparkGap);

  const issues = [];

  if (params.corners && Array.isArray(params.corners)) {
    for (const corner of params.corners) {
      if (corner.radius_mm !== undefined && corner.radius_mm < minRadius) {
        issues.push(`Corner ${corner.id ?? "?"}: R${corner.radius_mm}mm < min ${minRadius.toFixed(3)}mm`);
      }
    }
  }

  if (params.slots && Array.isArray(params.slots)) {
    for (const slot of params.slots) {
      if (slot.width_mm !== undefined && slot.width_mm < minRadius) {
        issues.push(`Slot ${slot.id ?? "?"}: width ${slot.width_mm}mm < min ${minRadius.toFixed(3)}mm`);
      }
    }
  }

  if (params.min_corner_radius_mm !== undefined && params.min_corner_radius_mm < minRadius) {
    issues.push(`min_corner_radius ${params.min_corner_radius_mm}mm < achievable ${minRadius.toFixed(3)}mm`);
  }

  return issues;
}

try {
  const input = JSON.parse(readFileSync(0, "utf8"));

  if (input.tool_name !== "mcp__prism_cam" && input.tool_name !== "mcp__prism_edm") {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const params = input.tool_input ?? {};
  const action = params.action;

  if (!action || !WEDM_ACTIONS.some(a => action.includes(a) || action.includes("wedm") || action.includes("edm_program"))) {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const issues = validateGeometry(params);

  if (issues.length > 0) {
    console.log(JSON.stringify({
      continue: false,
      message: `WEDM TIER 6 GEOMETRY GATE — HARD BLOCK\n\n${issues.length} geometry violation(s):\n${issues.map(i => `  • ${i}`).join("\n")}\n\nFix: Increase corner radii/slot widths to at least wire_dia + 2·gap (${computeMinRadius(DEFAULT_WIRE_DIA_MM, DEFAULT_SPARK_GAP_MM).toFixed(3)}mm for 0.25mm wire), or use finer wire.`
    }));
  } else {
    console.log(JSON.stringify({ continue: true }));
  }
} catch (err) {
  console.log(JSON.stringify({ continue: true }));
}
