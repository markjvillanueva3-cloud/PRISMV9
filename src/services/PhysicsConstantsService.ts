/**
 * PhysicsConstantsService — Concrete implementation of IPhysicsConstantsService.
 * Wraps src/physics/constants.ts so engines access canonical values via service layer.
 *
 * All returns use {value, unit, source} tuples for dimensional consistency.
 */

import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
  type ISOGroup,
} from "../physics/constants.js";
import type {
  IPhysicsConstantsService,
  PhysicsConstant,
  KienzleData,
} from "./interfaces/IPhysicsConstantsService.js";

/**
 * Thermal constants — sourced from standard machining references.
 * These were previously inlined in AdvancedCalculations.ts and other engines.
 *
 * Sources:
 * - CHIP_HEAT_FRACTION: Komanduri & Hou (2001), "Thermal modeling of the metal cutting process"
 *   Part III — 70-80% of heat goes to chip in typical steel cutting
 * - TOOL_HEAT_FRACTION: Shaw (2005), "Metal Cutting Principles" 2nd ed., Ch. 12
 *   10-20% of heat conducted into tool body
 * - WORKPIECE_HEAT_FRACTION: Balance of chip + tool + workpiece = 1.0
 * - STEEL_THERMAL_EXPANSION: ASM Metals Handbook Vol.1, typical carbon steel 11-13 µm/(m·K)
 * - ALUMINUM_THERMAL_EXPANSION: ASM Metals Handbook Vol.2, 6061-T6
 */
const THERMAL_CONSTANTS: Record<string, PhysicsConstant> = {
  CHIP_HEAT_FRACTION: { value: 0.75, unit: "dimensionless", source: "Komanduri & Hou (2001)" },
  TOOL_HEAT_FRACTION: { value: 0.15, unit: "dimensionless", source: "Shaw (2005) Metal Cutting Principles" },
  WORKPIECE_HEAT_FRACTION: { value: 0.10, unit: "dimensionless", source: "Balance: 1 - chip - tool" },
  STEEL_THERMAL_EXPANSION: { value: 12e-6, unit: "1/K", source: "ASM Metals Handbook Vol.1, carbon steel" },
  ALUMINUM_THERMAL_EXPANSION: { value: 23.6e-6, unit: "1/K", source: "ASM Metals Handbook Vol.2, 6061-T6" },
  TITANIUM_THERMAL_EXPANSION: { value: 8.6e-6, unit: "1/K", source: "ASM Metals Handbook Vol.2, Ti-6Al-4V" },
};

/**
 * Stability constants for chatter analysis.
 * Sources:
 * - DAMPING_RATIO_TYPICAL: Altintas (2012) "Manufacturing Automation" Table 3.1
 * - OVERLAP_FACTOR: Tlusty & Polacek (1963), standard milling overlap
 */
const STABILITY_CONSTANTS: Record<string, PhysicsConstant> = {
  DAMPING_RATIO_TYPICAL: { value: 0.03, unit: "dimensionless", source: "Altintas (2012) Manufacturing Automation" },
  OVERLAP_FACTOR_MILLING: { value: 1.0, unit: "dimensionless", source: "Tlusty & Polacek (1963)" },
  OVERLAP_FACTOR_TURNING: { value: 1.0, unit: "dimensionless", source: "Merritt (1965)" },
};

const ISO_GROUPS: ISOGroup[] = ["P", "M", "K", "N", "S", "H"];

export class PhysicsConstantsService implements IPhysicsConstantsService {
  getKienzleData(isoGroup: string): KienzleData | undefined {
    const group = isoGroup.toUpperCase() as ISOGroup;
    const data = CANONICAL_KIENZLE[group];
    if (!data) return undefined;

    return {
      kc1_1: { value: data.kc1_1, unit: "N/mm²", source: "Sandvik Coromant General Turning (2024)" },
      mc: { value: data.mc, unit: "dimensionless", source: "Sandvik Coromant General Turning (2024)" },
    };
  }

  getThermalConstant(name: string): PhysicsConstant | undefined {
    return THERMAL_CONSTANTS[name.toUpperCase()];
  }

  getStabilityConstant(name: string): PhysicsConstant | undefined {
    return STABILITY_CONSTANTS[name.toUpperCase()];
  }

  getThermalExpansion(materialGroup: string): PhysicsConstant | undefined {
    const group = materialGroup.toUpperCase();
    // Map ISO groups to thermal expansion
    const groupMap: Record<string, string> = {
      P: "STEEL_THERMAL_EXPANSION",
      M: "STEEL_THERMAL_EXPANSION",  // Stainless has similar CTE
      K: "STEEL_THERMAL_EXPANSION",  // Cast iron is close
      N: "ALUMINUM_THERMAL_EXPANSION",
      S: "TITANIUM_THERMAL_EXPANSION",
      H: "STEEL_THERMAL_EXPANSION",
    };
    const constName = groupMap[group];
    if (!constName) return undefined;
    return THERMAL_CONSTANTS[constName];
  }

  getTaylorExponent(materialGroup: string): PhysicsConstant | undefined {
    const group = materialGroup.toUpperCase() as ISOGroup;
    const data = CANONICAL_TAYLOR[group];
    if (!data) return undefined;

    return {
      value: data.n,
      unit: "dimensionless",
      source: "ISO 3685, Kronenberg, Kennametal Grade Selection Guide",
    };
  }

  listConstants(category: "kienzle" | "thermal" | "stability" | "taylor"): string[] {
    switch (category) {
      case "kienzle":
        return ISO_GROUPS;
      case "thermal":
        return Object.keys(THERMAL_CONSTANTS);
      case "stability":
        return Object.keys(STABILITY_CONSTANTS);
      case "taylor":
        return ISO_GROUPS;
    }
  }
}

/** Singleton instance */
export const physicsConstantsService = new PhysicsConstantsService();
