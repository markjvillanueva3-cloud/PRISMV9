/**
 * PRISM MCP Server - Recommendation Engine (split from IntelligenceEngine R3)
 *
 * Contains material, tool, and machine recommendation intelligence actions.
 * These actions search registries, score candidates, and return ranked
 * recommendations for manufacturing decisions.
 *
 * Functions:
 *   materialRecommend() - Material recommendation
 *   toolRecommend()     - Tool recommendation
 *   machineRecommend()  - Machine recommendation
 */

import { registryManager } from "../registries/manager.js";
import { log } from "../utils/Logger.js";

import { validateRequiredFields } from "./IntelligenceShared.js";

// ============================================================================
// MATERIAL RECOMMENDATION
// ============================================================================

/**
 * Recommend materials for a given application and constraints.
 *
 * Searches the MaterialRegistry, then ranks candidates by a composite score
 * based on machinability, available physics data (Kienzle/Taylor), cost ranking,
 * and hardness fit.
 *
 * @param params.application - Application description (used as search query)
 * @param params.iso_group - Optional ISO group filter (P, M, K, N, S, H)
 * @param params.hardness_range - Optional { min, max } Brinell hardness range
 * @param params.priorities - Optional ranking priority order (default: ["machinability", "cost"])
 * @param params.limit - Max candidates to return (default: 5)
 */
export async function materialRecommend(params: Record<string, any>): Promise<any> {
  validateRequiredFields("material_recommend", params, ["application"]);

  const limit = params.limit ?? 5;
  const priorities = params.priorities ?? ["machinability", "cost"];

  // Search registry
  const searchResult = await registryManager.materials.search({
    query: params.application as string,
    iso_group: params.iso_group,
    hardness_min: params.hardness_range?.min,
    hardness_max: params.hardness_range?.max,
    limit: Math.max(limit * 3, 20), // fetch extra for scoring
  });

  // If text query returned nothing, broaden to ISO group or all
  let materials = searchResult.materials;
  if (materials.length === 0 && params.iso_group) {
    const broader = await registryManager.materials.search({
      iso_group: params.iso_group,
      hardness_min: params.hardness_range?.min,
      hardness_max: params.hardness_range?.max,
      limit: Math.max(limit * 3, 20),
    });
    materials = broader.materials;
  }
  if (materials.length === 0) {
    const all = await registryManager.materials.search({ query: "*", limit: 30 });
    materials = all.materials;
  }

  // Score each material
  const scored = materials.map((m: any) => {
    let score = 0;
    const reasons: string[] = [];

    // Machinability rating (0-100 → 0-0.4)
    const machinability = m.machining?.machinability_rating ?? 50;
    const machinabilityScore = (machinability / 100) * 0.4;
    score += machinabilityScore;
    if (machinability > 70) reasons.push("High machinability");

    // Physics data availability (Kienzle + Taylor → 0-0.3)
    const hasKienzle = m.kienzle?.kc1_1 && m.kienzle?.mc;
    const hasTaylor = m.taylor?.C && m.taylor?.n;
    if (hasKienzle) { score += 0.15; reasons.push("Kienzle calibrated"); }
    if (hasTaylor) { score += 0.15; reasons.push("Taylor calibrated"); }

    // Hardness fit (if range specified → 0-0.15)
    if (params.hardness_range) {
      const hb = m.mechanical?.hardness_hb ?? m.mechanical?.hardness?.brinell ?? 200;
      const { min, max } = params.hardness_range;
      if (hb >= (min ?? 0) && hb <= (max ?? 9999)) {
        score += 0.15;
        reasons.push(`Hardness ${hb} HB within range`);
      }
    } else {
      score += 0.10; // No constraint = partial credit
    }

    // Verified status bonus (0-0.15)
    if (m.metadata?.validation_status === "verified") {
      score += 0.15;
      reasons.push("Verified data");
    } else {
      score += 0.05;
    }

    return {
      id: m.material_id || m.id,
      name: m.name,
      iso_group: m.classification?.iso_group || (m as any).iso_group || "?",
      hardness_hb: m.mechanical?.hardness_hb ?? m.mechanical?.hardness?.brinell,
      machinability_rating: machinability,
      has_kienzle: !!hasKienzle,
      has_taylor: !!hasTaylor,
      score: Math.round(score * 100) / 100,
      reasons,
    };
  });

  // Sort by score descending
  scored.sort((a: any, b: any) => b.score - a.score);

  // Take top N
  const candidates = scored.slice(0, limit);

  log.info(
    `[IntelligenceEngine] material_recommend: ${materials.length} searched, ` +
    `${candidates.length} returned, top=${candidates[0]?.name}`
  );

  return {
    application: params.application,
    constraints: {
      iso_group: params.iso_group,
      hardness_range: params.hardness_range,
      priorities,
    },
    candidates,
    total_searched: materials.length,
  };
}

// ============================================================================
// TOOL RECOMMENDATION
// ============================================================================

/**
 * Recommend cutting tools for a given material and feature.
 *
 * Searches the ToolRegistry by material group and optional filters,
 * then ranks candidates by suitability score.
 *
 * @param params.material - Material name (used to determine ISO group)
 * @param params.feature - Feature type (pocket, slot, face, contour, hole, thread)
 * @param params.iso_group - Optional ISO group override (P, M, K, N, S, H)
 * @param params.diameter_range - Optional { min, max } diameter in mm
 * @param params.type - Optional tool type filter (endmill, drill, etc.)
 * @param params.limit - Max candidates to return (default: 5)
 */
export async function toolRecommend(params: Record<string, any>): Promise<any> {
  validateRequiredFields("tool_recommend", params, ["material", "feature"]);

  const limit = params.limit ?? 5;
  const feature = params.feature as string;

  // Determine ISO group from material
  let isoGroup = params.iso_group;
  if (!isoGroup) {
    try {
      const mat = await registryManager.materials.getByIdOrName(params.material);
      isoGroup = mat?.classification?.iso_group || (mat as any)?.iso_group || "P";
    } catch {
      isoGroup = "P";
    }
  }

  // Map feature to preferred tool type
  const featureToType: Record<string, string> = {
    pocket: "endmill",
    slot: "endmill",
    face: "facemill",
    contour: "endmill",
    hole: "drill",
    thread: "tap",
  };
  const preferredType = params.type || featureToType[feature] || "endmill";

  // Search tools
  const searchResult = registryManager.tools.search({
    material_group: isoGroup,
    type: preferredType,
    diameter_min: params.diameter_range?.min,
    diameter_max: params.diameter_range?.max,
    limit: Math.max(limit * 4, 20),
  });

  let tools = searchResult.tools;

  // If no results with type filter, broaden search
  if (tools.length === 0) {
    const broader = registryManager.tools.search({
      material_group: isoGroup,
      diameter_min: params.diameter_range?.min,
      diameter_max: params.diameter_range?.max,
      limit: Math.max(limit * 4, 20),
    });
    tools = broader.tools;
  }
  if (tools.length === 0) {
    const all = registryManager.tools.search({ query: "*", limit: 30 });
    tools = all.tools;
  }

  // Score each tool
  const scored = tools.map((t: any) => {
    let score = 0;
    const reasons: string[] = [];

    // Material group match (0-0.3)
    const materialGroups = t.material_groups || [];
    const cpMaterials = t.cutting_params?.materials ? Object.keys(t.cutting_params.materials) : [];
    const hasGroupMatch = materialGroups.includes(isoGroup) ||
      cpMaterials.some((k: string) => k.startsWith(isoGroup));
    if (hasGroupMatch) {
      score += 0.30;
      reasons.push(`Rated for ISO ${isoGroup}`);
    }

    // Type match (0-0.25)
    const toolType = (t.type || t.category || "").toLowerCase();
    if (toolType.includes(preferredType)) {
      score += 0.25;
      reasons.push(`Type match: ${preferredType}`);
    }

    // Diameter fit (0-0.15)
    const diam = t.cutting_diameter_mm || t.geometry?.diameter;
    if (diam && params.diameter_range) {
      const { min, max } = params.diameter_range;
      if (diam >= (min ?? 0) && diam <= (max ?? 999)) {
        score += 0.15;
        reasons.push(`Diameter ${diam}mm in range`);
      }
    } else if (diam) {
      score += 0.10;
    }

    // Coating bonus (0-0.15)
    const coating = t.coating || t.coating_type;
    if (coating) {
      score += 0.10;
      reasons.push(`Coated: ${coating}`);
      // Premium coatings get extra
      if (/AlTiN|TiAlN|nACo/i.test(String(coating))) {
        score += 0.05;
        reasons.push("Premium coating");
      }
    }

    // Flute count appropriateness (0-0.15)
    const flutes = t.flutes || t.geometry?.flutes;
    if (flutes) {
      // General heuristic: aluminum=2-3 flutes, steel=4+, titanium=4-5
      const idealFlutes: Record<string, number> = { P: 4, M: 4, K: 4, N: 3, S: 5, H: 4 };
      const ideal = idealFlutes[isoGroup] || 4;
      const delta = Math.abs(flutes - ideal);
      score += Math.max(0, 0.15 - delta * 0.05);
    }

    return {
      id: t.tool_id || t.id,
      name: t.name || `${t.type} D${diam}mm`,
      type: t.type || t.category,
      diameter_mm: diam,
      flutes,
      coating,
      manufacturer: t.manufacturer || t.vendor,
      material_groups: materialGroups,
      score: Math.round(score * 100) / 100,
      reasons,
    };
  });

  scored.sort((a: any, b: any) => b.score - a.score);
  const candidates = scored.slice(0, limit);

  log.info(
    `[IntelligenceEngine] tool_recommend: ${tools.length} searched, ` +
    `${candidates.length} returned, iso=${isoGroup}, feature=${feature}`
  );

  return {
    material: params.material,
    feature,
    iso_group: isoGroup,
    constraints: {
      type: preferredType,
      diameter_range: params.diameter_range,
    },
    candidates,
    total_searched: tools.length,
  };
}

// ============================================================================
// MACHINE RECOMMENDATION
// ============================================================================

/**
 * Recommend machines capable of producing a given part.
 *
 * Searches the MachineRegistry by travel envelope, spindle specs, and
 * machine type, then ranks by utilization efficiency.
 *
 * @param params.part_envelope - { x, y, z } in mm (required travel)
 * @param params.type - Machine type filter (VMC, HMC, etc.)
 * @param params.min_spindle_rpm - Minimum spindle speed
 * @param params.min_spindle_power - Minimum spindle power in kW
 * @param params.simultaneous_axes - Required axes (3, 4, 5)
 * @param params.manufacturer - Optional manufacturer filter
 * @param params.limit - Max candidates (default: 5)
 */
export async function machineRecommend(params: Record<string, any>): Promise<any> {
  validateRequiredFields("machine_recommend", params, ["part_envelope"]);

  const limit = params.limit ?? 5;
  const envelope = params.part_envelope as { x: number; y: number; z: number };

  // Add safety margin (20%) to required travel
  const reqX = envelope.x * 1.2;
  const reqY = envelope.y * 1.2;
  const reqZ = envelope.z * 1.2;

  // Search machines
  const searchResult = registryManager.machines.search({
    type: params.type,
    manufacturer: params.manufacturer,
    min_x_travel: reqX,
    min_y_travel: reqY,
    min_z_travel: reqZ,
    min_spindle_rpm: params.min_spindle_rpm,
    min_spindle_power: params.min_spindle_power,
    simultaneous_axes: params.simultaneous_axes,
    limit: Math.max(limit * 4, 20),
  });

  let machines = searchResult.machines;

  // If too few results, relax travel constraints
  if (machines.length < limit) {
    const relaxed = registryManager.machines.search({
      type: params.type,
      min_spindle_rpm: params.min_spindle_rpm,
      limit: Math.max(limit * 4, 30),
    });
    // Merge, dedup by ID
    const seen = new Set(machines.map((m: any) => m.id));
    for (const m of relaxed.machines) {
      if (!seen.has(m.id)) {
        machines.push(m);
        seen.add(m.id);
      }
    }
  }

  // Score each machine
  const scored = machines.map((m: any) => {
    let score = 0;
    const reasons: string[] = [];

    // Travel envelope fit (0-0.30)
    const xTravel = m.envelope?.x_travel ?? 0;
    const yTravel = m.envelope?.y_travel ?? 0;
    const zTravel = m.envelope?.z_travel ?? 0;

    const xFits = xTravel >= reqX;
    const yFits = yTravel >= reqY;
    const zFits = zTravel >= reqZ;

    if (xFits && yFits && zFits) {
      score += 0.30;
      reasons.push("Full envelope fit");
    } else {
      // Partial credit for partial fit
      if (xFits) score += 0.10;
      if (yFits) score += 0.10;
      if (zFits) score += 0.10;
      if (!xFits) reasons.push(`X travel ${xTravel}mm < ${Math.round(reqX)}mm needed`);
      if (!yFits) reasons.push(`Y travel ${yTravel}mm < ${Math.round(reqY)}mm needed`);
      if (!zFits) reasons.push(`Z travel ${zTravel}mm < ${Math.round(reqZ)}mm needed`);
    }

    // Utilization efficiency — penalize oversized machines (0-0.20)
    if (xFits && yFits && zFits) {
      const utilX = envelope.x / xTravel;
      const utilY = envelope.y / yTravel;
      const utilZ = envelope.z / zTravel;
      const avgUtil = (utilX + utilY + utilZ) / 3;
      // Sweet spot: 40-80% utilization
      if (avgUtil >= 0.3 && avgUtil <= 0.85) {
        score += 0.20;
        reasons.push(`Good utilization: ${Math.round(avgUtil * 100)}%`);
      } else if (avgUtil > 0.85) {
        score += 0.10;
        reasons.push(`Tight fit: ${Math.round(avgUtil * 100)}% utilization`);
      } else {
        score += 0.05;
        reasons.push(`Oversized: ${Math.round(avgUtil * 100)}% utilization`);
      }
    }

    // Spindle RPM match (0-0.15)
    const maxRpm = m.spindle?.max_rpm ?? 0;
    if (params.min_spindle_rpm && maxRpm >= params.min_spindle_rpm) {
      score += 0.15;
      reasons.push(`Spindle ${maxRpm} rpm`);
    } else if (maxRpm > 0) {
      score += 0.05;
    }

    // Spindle power (0-0.15)
    const power = m.spindle?.power_continuous ?? m.spindle?.power_30min ?? 0;
    if (params.min_spindle_power && power >= params.min_spindle_power) {
      score += 0.15;
      reasons.push(`Power ${power} kW`);
    } else if (power > 0) {
      score += 0.05;
    }

    // Type match (0-0.10)
    if (params.type && m.type?.toLowerCase().includes(params.type.toLowerCase())) {
      score += 0.10;
      reasons.push(`Type match: ${m.type}`);
    }

    // Tool changer capacity bonus (0-0.10)
    const toolCap = m.tool_changer?.capacity ?? 0;
    if (toolCap >= 30) {
      score += 0.10;
      reasons.push(`${toolCap} tool capacity`);
    } else if (toolCap >= 20) {
      score += 0.05;
    }

    const utilPct = (xFits && yFits && zFits)
      ? Math.round(((envelope.x / xTravel + envelope.y / yTravel + envelope.z / zTravel) / 3) * 100)
      : 0;

    return {
      id: m.id,
      name: m.name || `${m.manufacturer} ${m.model}`,
      manufacturer: m.manufacturer,
      model: m.model,
      type: m.type,
      envelope: { x: xTravel, y: yTravel, z: zTravel },
      spindle_rpm: maxRpm,
      spindle_power_kw: power,
      tool_capacity: toolCap,
      utilization_pct: utilPct,
      score: Math.round(score * 100) / 100,
      reasons,
    };
  });

  scored.sort((a: any, b: any) => b.score - a.score);
  const candidates = scored.slice(0, limit);

  log.info(
    `[IntelligenceEngine] machine_recommend: ${machines.length} searched, ` +
    `${candidates.length} returned, envelope=${envelope.x}x${envelope.y}x${envelope.z}`
  );

  return {
    part_envelope: envelope,
    constraints: {
      type: params.type,
      min_spindle_rpm: params.min_spindle_rpm,
      min_spindle_power: params.min_spindle_power,
      simultaneous_axes: params.simultaneous_axes,
    },
    candidates,
    total_searched: machines.length,
  };
}
