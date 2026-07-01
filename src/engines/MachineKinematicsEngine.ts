/**
 * MachineKinematicsEngine — Kinematic Chain & Collision Zone Generator
 *
 * Infers kinematic chains, transformation matrices, and collision envelopes
 * for CNC machines based on their type, topology, and specifications.
 * Uses known LEVEL5 data when available, generates from rules otherwise.
 *
 * @engine MachineKinematicsEngine
 * @dispatcher calcDispatcher
 * @actions machine_kinematics_get, machine_kinematics_generate, machine_collision_check
 */

import type { ExtendedMachineProfile } from "../data/machine-profiles-catalog.js";
import type { CadEnrichment } from "../data/machine-enrichment-catalog.js";
import { CAD_ENRICHMENTS } from "../data/machine-enrichment-catalog.js";
import { MACHINE_KINEMATICS_CATALOG } from "../data/machine-kinematics-catalog.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type KinematicType =
  | "serial_XYZ"        // 3-axis VMC: base→column→table_X→saddle_Y→head_Z→spindle
  | "table_table"       // 5-axis trunnion: AC on table side
  | "table_head"        // 5-axis head/head: AC on spindle side (Hermle, DMG eVo)
  | "head_table"        // 5-axis mixed: A on head, C on table
  | "T_configuration"   // HMC: horizontal spindle with B-axis pallet
  | "gantry"            // Gantry/bridge: overhead X, Y table
  | "lathe_CZ"          // 2-axis lathe: C(spindle)→X→Z
  | "lathe_CYZ"         // Y-axis lathe: C(spindle)→X→Y→Z
  | "mill_turn_BCXYZ"   // Mill-turn: main spindle + B-axis milling head
  ;

export type FiveAxisTopology = "table-table" | "head-head" | "head-table" | "table-head";

export interface TransformationMatrix {
  type: "translation" | "rotation";
  axis: [number, number, number];  // unit vector
  variable: string;                // axis name (X, Y, Z, A, B, C)
}

export interface CollisionZone {
  name: string;
  type: "box" | "cylinder" | "composite";
  dimensions: {
    x?: number; y?: number; z?: number;  // box dims (mm)
    diameter?: number; height?: number;   // cylinder dims
  };
  offset: [number, number, number];       // from machine origin (mm)
  critical: boolean;                       // true = hard stop, false = soft warning
}

export interface KinematicModel {
  machine_id: string;
  model: string;
  kinematic_type: KinematicType;
  five_axis_topology?: FiveAxisTopology;
  structure: string;
  chain: string[];
  transformations: TransformationMatrix[];
  collision_zones: CollisionZone[];
  work_envelope: {
    x_range: [number, number];
    y_range: [number, number];
    z_range: [number, number];
    a_range?: [number, number];
    b_range?: [number, number];
    c_range?: [number, number];
  };
  tcpc_supported: boolean;
  source: "level5" | "inferred";
}

// ── Inference Rules ──────────────────────────────────────────────────────────

function inferKinematicType(profile: ExtendedMachineProfile): KinematicType {
  const t = profile.type;
  const hasRotary = profile.rotary_axes && profile.rotary_axes.length > 0;
  const rotaryNames = (profile.rotary_axes || []).map(a => a.name);

  if (t === "lathe") {
    const hasY = profile.linear_axes.some(a => a.name === "Y");
    return hasY ? "lathe_CYZ" : "lathe_CZ";
  }
  if (t === "mill_turn") return "mill_turn_BCXYZ";
  if (t === "HMC") return "T_configuration";
  if (t === "router" || t === "bridge") return "gantry";

  if (t === "5axis" && hasRotary) {
    // Hermle/DMG eVo = head-table or table-head depending on brand
    const brand = profile.brand.toLowerCase();
    if (brand.includes("hermle")) return "table_table";
    if (rotaryNames.includes("B") && rotaryNames.includes("C")) return "head_table";
    return "table_table"; // Most common: trunnion (A/C on table)
  }

  return "serial_XYZ";
}

function inferFiveAxisTopology(
  type: KinematicType,
  profile: ExtendedMachineProfile,
): FiveAxisTopology | undefined {
  if (type === "table_table") return "table-table";
  if (type === "table_head") return "table-head";
  if (type === "head_table") return "head-table";
  return undefined;
}

function inferStructure(profile: ExtendedMachineProfile, kinType: KinematicType): string {
  const brand = profile.brand;
  const model = profile.model;

  if (kinType === "T_configuration") return "HMC_pallet";
  if (kinType === "gantry") return "gantry";
  if (kinType === "lathe_CZ") return "slant_bed";
  if (kinType === "lathe_CYZ") return "slant_bed_Y";
  if (kinType === "mill_turn_BCXYZ") return "mill_turn_B";

  if (kinType === "table_table") {
    if (model.includes("UMC")) return "AC_trunnion";
    if (model.includes("TR") || model.includes("TRT")) return "TRT_trunnion";
    return "AC_trunnion";
  }

  // 3-axis VMC variants
  const xTravel = profile.linear_axes.find(a => a.name === "X")?.travel_mm || 0;
  if (xTravel > 2000) return "C_frame_XXL";
  if (xTravel > 1500) return "C_frame_XL";
  if (xTravel > 1000) return "C_frame_large";
  return "C_frame";
}

function buildChain(kinType: KinematicType, profile: ExtendedMachineProfile): string[] {
  switch (kinType) {
    case "serial_XYZ":
      return ["base", "column", "table_X", "saddle_Y", "head_Z", "spindle"];
    case "table_table":
      return ["base", "column", "saddle_Y", "head_Z", "spindle", "table_X", "a_tilt", "c_rotary"];
    case "table_head":
      return ["base", "column", "table_X", "saddle_Y", "head_Z", "a_swivel", "c_rotary", "spindle"];
    case "head_table":
      return ["base", "column", "table_X", "c_rotary", "saddle_Y", "head_Z", "b_swivel", "spindle"];
    case "T_configuration":
      return ["base", "column", "spindle_X", "spindle_Y", "spindle_Z", "spindle", "pallet", "b_rotary"];
    case "gantry":
      return ["base", "bridge", "gantry_X", "cross_Y", "ram_Z", "spindle"];
    case "lathe_CZ":
      return ["base", "headstock", "spindle_C", "cross_X", "carriage_Z", "turret"];
    case "lathe_CYZ":
      return ["base", "headstock", "spindle_C", "cross_X", "y_slide", "carriage_Z", "turret"];
    case "mill_turn_BCXYZ":
      return ["base", "headstock", "spindle_C", "cross_X", "y_slide", "carriage_Z", "b_head", "milling_spindle"];
    default:
      return ["base", "column", "table_X", "saddle_Y", "head_Z", "spindle"];
  }
}

function buildTransformations(kinType: KinematicType, profile: ExtendedMachineProfile): TransformationMatrix[] {
  const txs: TransformationMatrix[] = [];

  // Linear axes — always present
  const axisMap: Record<string, [number, number, number]> = {
    X: [1, 0, 0],
    Y: [0, 1, 0],
    Z: [0, 0, kinType === "lathe_CZ" || kinType === "lathe_CYZ" ? 1 : -1],
  };

  for (const ax of profile.linear_axes) {
    const vec = axisMap[ax.name] || [1, 0, 0];
    txs.push({ type: "translation", axis: vec, variable: ax.name });
  }

  // Rotary axes
  const rotaryAxisMap: Record<string, [number, number, number]> = {
    A: [1, 0, 0],
    B: [0, 1, 0],
    C: [0, 0, 1],
  };

  for (const rax of profile.rotary_axes || []) {
    const vec = rotaryAxisMap[rax.name] || [0, 0, 1];
    txs.push({ type: "rotation", axis: vec, variable: rax.name });
  }

  // Lathe spindle C-axis (implicit)
  if (kinType.startsWith("lathe_") || kinType === "mill_turn_BCXYZ") {
    if (!txs.some(t => t.variable === "C")) {
      txs.push({ type: "rotation", axis: [0, 0, 1], variable: "C" });
    }
  }

  return txs;
}

function generateCollisionZones(
  profile: ExtendedMachineProfile,
  kinType: KinematicType,
): CollisionZone[] {
  const zones: CollisionZone[] = [];
  const xTravel = profile.linear_axes.find(a => a.name === "X")?.travel_mm || 500;
  const yTravel = profile.linear_axes.find(a => a.name === "Y")?.travel_mm || 400;
  const zTravel = profile.linear_axes.find(a => a.name === "Z")?.travel_mm || 400;

  if (kinType.startsWith("lathe_") || kinType === "mill_turn_BCXYZ") {
    // Lathe collision zones
    zones.push({
      name: "chuck",
      type: "cylinder",
      dimensions: { diameter: 250, height: 150 },
      offset: [0, 0, 0],
      critical: true,
    });
    zones.push({
      name: "tailstock",
      type: "cylinder",
      dimensions: { diameter: 80, height: 200 },
      offset: [0, 0, zTravel],
      critical: true,
    });
    zones.push({
      name: "turret",
      type: "box",
      dimensions: { x: 300, y: 300, z: 200 },
      offset: [xTravel / 2, 0, zTravel / 2],
      critical: true,
    });
  } else {
    // Mill collision zones
    // Spindle head
    const spindleDia = profile.spindle.taper.includes("50") || profile.spindle.taper.includes("100")
      ? 350 : profile.spindle.taper.includes("30") ? 200 : 280;
    zones.push({
      name: "spindle_head",
      type: "box",
      dimensions: { x: spindleDia, y: spindleDia + 40, z: 450 },
      offset: [xTravel / 2, yTravel / 2, 0],
      critical: true,
    });

    // Table
    const tableLen = profile.table?.length_mm || xTravel + 100;
    const tableWid = profile.table?.width_mm || yTravel - 50;
    zones.push({
      name: "table",
      type: "box",
      dimensions: { x: tableLen, y: tableWid, z: 100 },
      offset: [xTravel / 2, yTravel / 2, -zTravel],
      critical: false,
    });

    // Column (rear)
    zones.push({
      name: "column",
      type: "box",
      dimensions: { x: xTravel + 200, y: 300, z: zTravel + 500 },
      offset: [xTravel / 2, -150, -zTravel / 2],
      critical: true,
    });

    // 5-axis trunnion
    if (kinType === "table_table") {
      const trunnionDia = profile.rotary_table?.diameter_mm || 300;
      zones.push({
        name: "trunnion",
        type: "cylinder",
        dimensions: { diameter: trunnionDia + 100, height: trunnionDia * 0.8 },
        offset: [xTravel / 2, yTravel / 2, -zTravel + 50],
        critical: true,
      });
    }

    // Tool changer zone
    if (profile.tool_changer.type === "side_mount") {
      zones.push({
        name: "tool_changer",
        type: "box",
        dimensions: { x: 400, y: 600, z: 500 },
        offset: [xTravel + 300, yTravel / 2, -200],
        critical: false,
      });
    } else if (profile.tool_changer.type === "umbrella") {
      zones.push({
        name: "tool_changer",
        type: "cylinder",
        dimensions: { diameter: 600, height: 200 },
        offset: [xTravel / 2, yTravel / 2, 200],
        critical: false,
      });
    }
  }

  return zones;
}

function buildWorkEnvelope(profile: ExtendedMachineProfile): KinematicModel["work_envelope"] {
  const env: KinematicModel["work_envelope"] = {
    x_range: [0, profile.linear_axes.find(a => a.name === "X")?.travel_mm || 0],
    y_range: [0, profile.linear_axes.find(a => a.name === "Y")?.travel_mm || 0],
    z_range: [0, profile.linear_axes.find(a => a.name === "Z")?.travel_mm || 0],
  };

  for (const rax of profile.rotary_axes || []) {
    if (rax.name === "A") env.a_range = [rax.min_deg, rax.max_deg];
    if (rax.name === "B") env.b_range = [rax.min_deg, rax.max_deg];
    if (rax.name === "C") env.c_range = [rax.min_deg, rax.max_deg];
  }

  return env;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get or generate a kinematic model for a machine.
 * Uses LEVEL5 CAD data when available, infers from specs otherwise.
 */
export function getKinematicModel(profile: ExtendedMachineProfile): KinematicModel {
  // Check for existing LEVEL5 data
  const cadMatch = CAD_ENRICHMENTS.find(
    e => e.model === profile.model ||
         e.model === profile.model.replace(/ /g, "") ||
         e.id?.includes(profile.model.replace(/[- ]/g, "_").toUpperCase()),
  );

  if (cadMatch?.kinematic_chain) {
    // Use real LEVEL5 data, supplement with generated collision zones
    const kinType = inferKinematicType(profile);
    const existingCollisions = cadMatch.collision_zones
      ? Object.entries(cadMatch.collision_zones).map(([name, z]: [string, any]) => ({
          name,
          type: z.type || "box" as const,
          dimensions: z.dim
            ? { x: z.dim[0], y: z.dim[1], z: z.dim[2] }
            : z.dia
              ? { diameter: z.dia, height: z.height }
              : {},
          offset: [0, 0, 0] as [number, number, number],
          critical: true,
        }))
      : generateCollisionZones(profile, kinType);

    return {
      machine_id: cadMatch.id,
      model: profile.model,
      kinematic_type: (cadMatch.kinematic_chain.type || kinType) as KinematicType,
      five_axis_topology: (cadMatch.kinematic_chain.fiveAxisType as FiveAxisTopology | undefined)
        || inferFiveAxisTopology(kinType, profile),
      structure: cadMatch.kinematic_chain.structure || inferStructure(profile, kinType),
      chain: cadMatch.kinematic_chain.chain || buildChain(kinType, profile),
      transformations: buildTransformations(kinType, profile),
      collision_zones: existingCollisions,
      work_envelope: buildWorkEnvelope(profile),
      tcpc_supported: !!cadMatch.kinematic_chain.tcpcSupported || profile.type === "5axis",
      source: "level5",
    };
  }

  // Check ENHANCED v2 archive data (250 machines from 33 manufacturers)
  const archiveMatch = MACHINE_KINEMATICS_CATALOG.find(
    e => e.model === profile.model ||
         e.model.toLowerCase() === profile.model.toLowerCase() ||
         e.id?.toUpperCase().includes(profile.model.replace(/[- ]/g, "_").toUpperCase()),
  );

  if (archiveMatch?.kinematic_chain) {
    const kinType = inferKinematicType(profile);
    const archiveCollisions = archiveMatch.collision_zones
      ? Object.entries(archiveMatch.collision_zones).map(([name, z]: [string, any]) => ({
          name,
          type: (z.type || "box") as "box" | "cylinder" | "composite",
          dimensions: z.dimensions
            ? { x: z.dimensions.x, y: z.dimensions.y, z: z.dimensions.z }
            : z.diameter_mm
              ? { diameter: z.diameter_mm, height: z.length_mm }
              : {},
          offset: z.offset
            ? (Array.isArray(z.offset) ? z.offset : [z.offset.x || 0, z.offset.y || 0, z.offset.z || 0])
            : [0, 0, 0] as [number, number, number],
          critical: true,
        }))
      : generateCollisionZones(profile, kinType);

    return {
      machine_id: archiveMatch.id,
      model: profile.model,
      kinematic_type: (archiveMatch.kinematic_chain.type || kinType) as KinematicType,
      five_axis_topology: inferFiveAxisTopology(kinType, profile),
      structure: archiveMatch.kinematic_chain.structure || inferStructure(profile, kinType),
      chain: archiveMatch.kinematic_chain.chain || buildChain(kinType, profile),
      transformations: buildTransformations(kinType, profile),
      collision_zones: archiveCollisions,
      work_envelope: buildWorkEnvelope(profile),
      tcpc_supported: profile.type === "5axis",
      source: "level5" as const,
    };
  }

  // Fully inferred model
  const kinType = inferKinematicType(profile);
  const id = `${profile.brand}_${profile.model}`.replace(/[- /]/g, "_").toUpperCase();

  return {
    machine_id: id,
    model: profile.model,
    kinematic_type: kinType,
    five_axis_topology: inferFiveAxisTopology(kinType, profile),
    structure: inferStructure(profile, kinType),
    chain: buildChain(kinType, profile),
    transformations: buildTransformations(kinType, profile),
    collision_zones: generateCollisionZones(profile, kinType),
    work_envelope: buildWorkEnvelope(profile),
    tcpc_supported: profile.type === "5axis" || profile.type === "mill_turn",
    source: "inferred",
  };
}

/**
 * Check if a tool position would collide with any machine zone.
 * Returns list of violated zones, empty = safe.
 */
export function checkCollision(
  model: KinematicModel,
  toolPosition: { x: number; y: number; z: number },
  toolDiameter: number,
  toolLength: number,
): { safe: boolean; violations: string[]; warnings: string[] } {
  const violations: string[] = [];
  const warnings: string[] = [];
  const toolRadius = toolDiameter / 2;

  // Check work envelope
  const { x_range, y_range, z_range } = model.work_envelope;
  if (toolPosition.x < x_range[0] || toolPosition.x > x_range[1]) {
    violations.push(`X=${toolPosition.x}mm outside range [${x_range[0]}, ${x_range[1]}]`);
  }
  if (toolPosition.y < y_range[0] || toolPosition.y > y_range[1]) {
    violations.push(`Y=${toolPosition.y}mm outside range [${y_range[0]}, ${y_range[1]}]`);
  }
  if (toolPosition.z < z_range[0] || toolPosition.z > z_range[1]) {
    violations.push(`Z=${toolPosition.z}mm outside range [${z_range[0]}, ${z_range[1]}]`);
  }

  // Check collision zones (simplified AABB check)
  for (const zone of model.collision_zones) {
    if (zone.type === "box" && zone.dimensions.x && zone.dimensions.y && zone.dimensions.z) {
      const halfX = zone.dimensions.x / 2;
      const halfY = zone.dimensions.y / 2;
      const zoneMinX = zone.offset[0] - halfX;
      const zoneMaxX = zone.offset[0] + halfX;
      const zoneMinY = zone.offset[1] - halfY;
      const zoneMaxY = zone.offset[1] + halfY;

      const toolMinX = toolPosition.x - toolRadius;
      const toolMaxX = toolPosition.x + toolRadius;
      const toolMinY = toolPosition.y - toolRadius;
      const toolMaxY = toolPosition.y + toolRadius;

      if (toolMaxX > zoneMinX && toolMinX < zoneMaxX &&
          toolMaxY > zoneMinY && toolMinY < zoneMaxY) {
        if (zone.critical) {
          violations.push(`Tool collides with ${zone.name} zone`);
        } else {
          warnings.push(`Tool near ${zone.name} zone — verify clearance`);
        }
      }
    }

    if (zone.type === "cylinder" && zone.dimensions.diameter) {
      const zoneRadius = zone.dimensions.diameter / 2;
      const dx = toolPosition.x - zone.offset[0];
      const dy = toolPosition.y - zone.offset[1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < zoneRadius + toolRadius) {
        if (zone.critical) {
          violations.push(`Tool collides with ${zone.name} zone (distance: ${Math.round(dist)}mm)`);
        } else {
          warnings.push(`Tool near ${zone.name} zone (distance: ${Math.round(dist)}mm)`);
        }
      }
    }
  }

  return {
    safe: violations.length === 0,
    violations,
    warnings,
  };
}

/**
 * Get summary statistics for kinematic coverage.
 */
export function getKinematicCoverage(): {
  level5_models: number;
  with_collision_data: number;
  with_kinematic_chain: number;
  inferrable_types: string[];
} {
  const withKin = CAD_ENRICHMENTS.filter(e => e.kinematic_chain).length;
  const withCol = CAD_ENRICHMENTS.filter(
    e => e.collision_zones && Object.keys(e.collision_zones).length > 0,
  ).length;

  return {
    level5_models: CAD_ENRICHMENTS.length + MACHINE_KINEMATICS_CATALOG.length,
    with_collision_data: withCol,
    with_kinematic_chain: withKin,
    inferrable_types: [
      "serial_XYZ", "table_table", "table_head", "head_table",
      "T_configuration", "gantry", "lathe_CZ", "lathe_CYZ", "mill_turn_BCXYZ",
    ],
  };
}
