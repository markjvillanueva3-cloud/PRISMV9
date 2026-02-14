/**
 * PRISM MCP Server - Material Sanity Checks
 * Cross-parameter validation per material class.
 * Catches data swaps where material name doesn't match physical parameters.
 * 
 * Example: A "4140 steel" entry with density 2.7 g/cm³ is actually aluminum data
 * that was mislabeled. Without sanity checks, safety calcs use wrong Kienzle
 * coefficients → wrong cutting forces → operator injury.
 * 
 * @module validation/materialSanity
 * @safety HIGH — Detects data corruption that silently invalidates calcs.
 */

import { DataError } from '../errors/PrismError.js';

/** Material class physical property ranges */
interface MaterialClassRange {
  density_min: number;  // g/cm³
  density_max: number;
  hardness_min: number; // HB (Brinell)
  hardness_max: number;
}

/** Known material class property ranges from metallurgical references */
const MATERIAL_CLASS_RANGES: Record<string, MaterialClassRange> = {
  steel: {
    density_min: 7.5, density_max: 8.1,
    hardness_min: 120, hardness_max: 700,
  },
  alloy_steel: {
    density_min: 7.5, density_max: 8.1,
    hardness_min: 120, hardness_max: 700,
  },
  carbon_steel: {
    density_min: 7.5, density_max: 8.1,
    hardness_min: 100, hardness_max: 400,
  },
  tool_steel: {
    density_min: 7.5, density_max: 8.2,
    hardness_min: 200, hardness_max: 750,
  },
  stainless_steel: {
    density_min: 7.5, density_max: 8.1,
    hardness_min: 130, hardness_max: 400,
  },
  aluminum: {
    density_min: 2.5, density_max: 2.9,
    hardness_min: 20, hardness_max: 200,
  },
  titanium: {
    density_min: 4.3, density_max: 4.8,
    hardness_min: 200, hardness_max: 450,
  },
  copper: {
    density_min: 8.0, density_max: 9.0,
    hardness_min: 30, hardness_max: 300,
  },
  nickel_superalloy: {
    density_min: 7.8, density_max: 8.5,
    hardness_min: 250, hardness_max: 500,
  },
  cast_iron: {
    density_min: 6.8, density_max: 7.4,
    hardness_min: 150, hardness_max: 500,
  },
};

/** Map material names to their expected class */
function inferMaterialClass(materialName: string): string | null {
  const m = materialName.toLowerCase();
  if (/inconel|waspaloy|hastelloy|nimonic|monel/.test(m)) return 'nickel_superalloy';
  if (/ti-|titanium/.test(m)) return 'titanium';
  if (/6061|7075|2024|alum/.test(m)) return 'aluminum';
  if (/copper|brass|bronze|cu-/.test(m)) return 'copper';
  if (/d2|m2|h13|a2|s7|tool.?steel/.test(m)) return 'tool_steel';
  if (/316|304|stainless/.test(m)) return 'stainless_steel';
  if (/4140|4340|8620|alloy/.test(m)) return 'alloy_steel';
  if (/1045|1020|1018|carbon/.test(m)) return 'carbon_steel';
  if (/a36|structural/.test(m)) return 'carbon_steel';
  if (/fc300|gg-?30|cast.?iron/.test(m)) return 'cast_iron';
  return null;
}

/**
 * Validate that a material's physical parameters are consistent with its class.
 * 
 * @param materialName - Material identifier (e.g., "4140", "Ti-6Al-4V")
 * @param density - Material density in g/cm³ (may be undefined if not in dataset)
 * @param hardness - Material hardness in HB (may be undefined if not in dataset)
 * @throws {DataError} severity='block' if parameters conflict with material class — DATA SWAP detected
 */
export function validateMaterialSanity(
  materialName: string,
  density?: number,
  hardness?: number,
): void {
  const materialClass = inferMaterialClass(materialName);
  if (materialClass === null) return; // Unknown material class — can't validate

  const range = MATERIAL_CLASS_RANGES[materialClass];
  if (!range) return; // No range defined for this class

  const violations: string[] = [];

  if (density !== undefined && (density < range.density_min || density > range.density_max)) {
    violations.push(
      `Density ${density} g/cm³ outside ${materialClass} range ` +
      `[${range.density_min}-${range.density_max}] for "${materialName}"`
    );
  }

  if (hardness !== undefined && (hardness < range.hardness_min || hardness > range.hardness_max)) {
    violations.push(
      `Hardness ${hardness} HB outside ${materialClass} range ` +
      `[${range.hardness_min}-${range.hardness_max}] for "${materialName}"`
    );
  }

  if (violations.length > 0) {
    throw new DataError(
      `MATERIAL DATA SWAP DETECTED:\n${violations.join('\n')}\n` +
      `This material's parameters do not match its declared class. ` +
      `Quarantine this material and verify data source.`,
      'block',
    );
  }
}
