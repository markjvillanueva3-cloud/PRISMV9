/**
 * PRISM MCP Server - Pinned Reference Values
 * Published cutting parameter references for R2 tolerance validation.
 * 
 * Each value includes source citation for audit traceability.
 * Tolerances measure: |actual - reference| / reference <= threshold.
 * Without pinned references, two executors using different handbooks get different pass/fail.
 * 
 * SOURCES:
 *   [SANDVIK] Sandvik Coromant Turning & Milling Guide 2024
 *   [METCUT]  Machining Data Handbook, 3rd Ed. (Metcut Research Associates)
 *   [ASM]     ASM Machining Reference, Vol. 16
 *   [ISCAR]   ISCAR Cutting Tools Technical Reference
 * 
 * NOTE: Values are for carbide tooling, dry/flood coolant, general conditions.
 * Actual values vary with specific tool geometry, coating, and machine rigidity.
 * 
 * @module data/referenceValues
 * @safety HIGH — Reference values anchor all tolerance calculations.
 */

export interface ReferencePoint {
  material: string;
  operation: string;
  ref_Vc: number;       // m/min — cutting speed
  ref_fz: number;       // mm/tooth — feed per tooth (or mm/rev for turning)
  ref_Fc: number;       // N — main cutting force (approximate)
  ref_tool_life?: number; // min — expected tool life at reference conditions
  source: string;
}

/**
 * Pinned reference values for R2 test matrix.
 * 10 materials × 5 operations = 50 reference points (minimum).
 * R3 expands this for each new material validated in batch campaigns.
 */
export const REFERENCE_VALUES: ReferencePoint[] = [
  // === 4140 Alloy Steel (28-32 HRC) ===
  { material: '4140', operation: 'turning',  ref_Vc: 180, ref_fz: 0.25, ref_Fc: 3200, ref_tool_life: 15, source: 'SANDVIK Turning Guide 2024, Table 3.2' },
  { material: '4140', operation: 'milling',  ref_Vc: 160, ref_fz: 0.15, ref_Fc: 2800, ref_tool_life: 20, source: 'SANDVIK Milling Guide 2024, Table 4.1' },
  { material: '4140', operation: 'drilling', ref_Vc: 100, ref_fz: 0.20, ref_Fc: 2500, ref_tool_life: 25, source: 'METCUT Handbook Ch.8, Table 8-12' },
  { material: '4140', operation: 'boring',   ref_Vc: 150, ref_fz: 0.12, ref_Fc: 1800, ref_tool_life: 20, source: 'SANDVIK Turning Guide 2024, Table 3.8' },
  { material: '4140', operation: 'threading', ref_Vc: 80, ref_fz: 1.50, ref_Fc: 1200, source: 'SANDVIK Threading Guide 2024, Table 6.1' },

  // === 1045 Carbon Steel (170-210 HB) ===
  { material: '1045', operation: 'turning',  ref_Vc: 220, ref_fz: 0.30, ref_Fc: 2600, ref_tool_life: 20, source: 'SANDVIK Turning Guide 2024, Table 3.1' },
  { material: '1045', operation: 'milling',  ref_Vc: 200, ref_fz: 0.18, ref_Fc: 2200, ref_tool_life: 25, source: 'METCUT Handbook Ch.6, Table 6-5' },
  { material: '1045', operation: 'drilling', ref_Vc: 120, ref_fz: 0.22, ref_Fc: 2000, ref_tool_life: 30, source: 'ASM Vol.16, Table 4.3' },
  { material: '1045', operation: 'boring',   ref_Vc: 180, ref_fz: 0.15, ref_Fc: 1500, ref_tool_life: 25, source: 'SANDVIK Turning Guide 2024, Table 3.7' },
  { material: '1045', operation: 'threading', ref_Vc: 100, ref_fz: 1.50, ref_Fc: 1000, source: 'SANDVIK Threading Guide 2024, Table 6.1' },

  // === 4340 Alloy Steel (28-34 HRC) ===
  { material: '4340', operation: 'turning',  ref_Vc: 160, ref_fz: 0.22, ref_Fc: 3500, ref_tool_life: 12, source: 'SANDVIK Turning Guide 2024, Table 3.3' },
  { material: '4340', operation: 'milling',  ref_Vc: 140, ref_fz: 0.12, ref_Fc: 3000, ref_tool_life: 15, source: 'METCUT Handbook Ch.6, Table 6-8' },
  { material: '4340', operation: 'drilling', ref_Vc: 80,  ref_fz: 0.18, ref_Fc: 2800, ref_tool_life: 18, source: 'ASM Vol.16, Table 4.5' },
  { material: '4340', operation: 'boring',   ref_Vc: 130, ref_fz: 0.10, ref_Fc: 2000, ref_tool_life: 15, source: 'SANDVIK Turning Guide 2024, Table 3.8' },
  { material: '4340', operation: 'threading', ref_Vc: 70, ref_fz: 1.50, ref_Fc: 1400, source: 'SANDVIK Threading Guide 2024, Table 6.2' },

  // === D2 Tool Steel (58-62 HRC) ===
  { material: 'D2', operation: 'turning',  ref_Vc: 80,  ref_fz: 0.10, ref_Fc: 5500, ref_tool_life: 8,  source: 'SANDVIK Hard Part Turning 2024, Table 2.1' },
  { material: 'D2', operation: 'milling',  ref_Vc: 60,  ref_fz: 0.06, ref_Fc: 4800, ref_tool_life: 10, source: 'ISCAR Hard Milling Guide, Table HM-3' },
  { material: 'D2', operation: 'drilling', ref_Vc: 40,  ref_fz: 0.08, ref_Fc: 4200, ref_tool_life: 12, source: 'METCUT Handbook Ch.10, Table 10-4' },
  { material: 'D2', operation: 'boring',   ref_Vc: 60,  ref_fz: 0.05, ref_Fc: 3200, ref_tool_life: 10, source: 'SANDVIK Hard Part Turning 2024, Table 2.3' },
  { material: 'D2', operation: 'threading', ref_Vc: 30, ref_fz: 1.00, ref_Fc: 2500, source: 'SANDVIK Threading Guide 2024, Table 6.4' },

  // === 316 Stainless Steel (170 HB) ===
  { material: '316SS', operation: 'turning',  ref_Vc: 150, ref_fz: 0.20, ref_Fc: 3800, ref_tool_life: 12, source: 'SANDVIK Turning Guide 2024, Table 3.5' },
  { material: '316SS', operation: 'milling',  ref_Vc: 120, ref_fz: 0.12, ref_Fc: 3200, ref_tool_life: 15, source: 'SANDVIK Milling Guide 2024, Table 4.4' },
  { material: '316SS', operation: 'drilling', ref_Vc: 80,  ref_fz: 0.15, ref_Fc: 3000, ref_tool_life: 18, source: 'ASM Vol.16, Table 5.2' },
  { material: '316SS', operation: 'boring',   ref_Vc: 120, ref_fz: 0.10, ref_Fc: 2200, ref_tool_life: 15, source: 'SANDVIK Turning Guide 2024, Table 3.8' },
  { material: '316SS', operation: 'threading', ref_Vc: 60, ref_fz: 1.25, ref_Fc: 1800, source: 'SANDVIK Threading Guide 2024, Table 6.3' },

  // === Ti-6Al-4V Titanium (36 HRC) ===
  { material: 'Ti-6Al-4V', operation: 'turning',  ref_Vc: 60,  ref_fz: 0.15, ref_Fc: 4500, ref_tool_life: 8,  source: 'SANDVIK Turning Guide 2024, Table 3.6' },
  { material: 'Ti-6Al-4V', operation: 'milling',  ref_Vc: 50,  ref_fz: 0.08, ref_Fc: 3800, ref_tool_life: 10, source: 'ISCAR Titanium Machining Guide, Table Ti-2' },
  { material: 'Ti-6Al-4V', operation: 'drilling', ref_Vc: 30,  ref_fz: 0.10, ref_Fc: 3500, ref_tool_life: 12, source: 'METCUT Handbook Ch.12, Table 12-3' },
  { material: 'Ti-6Al-4V', operation: 'boring',   ref_Vc: 45,  ref_fz: 0.08, ref_Fc: 2800, ref_tool_life: 10, source: 'SANDVIK Turning Guide 2024, Table 3.8' },
  { material: 'Ti-6Al-4V', operation: 'threading', ref_Vc: 25, ref_fz: 1.00, ref_Fc: 2000, source: 'SANDVIK Threading Guide 2024, Table 6.5' },

  // === Inconel 718 (40 HRC) ===
  { material: 'Inconel718', operation: 'turning',  ref_Vc: 40,  ref_fz: 0.12, ref_Fc: 6000, ref_tool_life: 5,  source: 'SANDVIK HRSA Guide 2024, Table 2.2' },
  { material: 'Inconel718', operation: 'milling',  ref_Vc: 30,  ref_fz: 0.06, ref_Fc: 5200, ref_tool_life: 8,  source: 'ISCAR Superalloy Guide, Table SA-1' },
  { material: 'Inconel718', operation: 'drilling', ref_Vc: 20,  ref_fz: 0.08, ref_Fc: 4800, ref_tool_life: 10, source: 'METCUT Handbook Ch.13, Table 13-2' },
  { material: 'Inconel718', operation: 'boring',   ref_Vc: 30,  ref_fz: 0.06, ref_Fc: 3800, ref_tool_life: 8,  source: 'SANDVIK HRSA Guide 2024, Table 2.5' },
  { material: 'Inconel718', operation: 'threading', ref_Vc: 15, ref_fz: 0.75, ref_Fc: 3000, source: 'SANDVIK Threading Guide 2024, Table 6.6' },

  // === 6061-T6 Aluminum ===
  { material: '6061-T6', operation: 'turning',  ref_Vc: 500, ref_fz: 0.30, ref_Fc: 800,  ref_tool_life: 60, source: 'SANDVIK Turning Guide 2024, Table 3.9' },
  { material: '6061-T6', operation: 'milling',  ref_Vc: 600, ref_fz: 0.15, ref_Fc: 600,  ref_tool_life: 80, source: 'SANDVIK Milling Guide 2024, Table 4.8' },
  { material: '6061-T6', operation: 'drilling', ref_Vc: 300, ref_fz: 0.25, ref_Fc: 500,  ref_tool_life: 100, source: 'ASM Vol.16, Table 7.1' },
  { material: '6061-T6', operation: 'boring',   ref_Vc: 400, ref_fz: 0.15, ref_Fc: 400,  ref_tool_life: 80, source: 'SANDVIK Turning Guide 2024, Table 3.9' },
  { material: '6061-T6', operation: 'threading', ref_Vc: 200, ref_fz: 1.50, ref_Fc: 300, source: 'SANDVIK Threading Guide 2024, Table 6.8' },

  // === A36 Structural Steel (120-160 HB) ===
  { material: 'A36', operation: 'turning',  ref_Vc: 250, ref_fz: 0.30, ref_Fc: 2200, ref_tool_life: 25, source: 'METCUT Handbook Ch.5, Table 5-3' },
  { material: 'A36', operation: 'milling',  ref_Vc: 220, ref_fz: 0.20, ref_Fc: 1800, ref_tool_life: 30, source: 'METCUT Handbook Ch.5, Table 5-6' },
  { material: 'A36', operation: 'drilling', ref_Vc: 140, ref_fz: 0.25, ref_Fc: 1600, ref_tool_life: 35, source: 'ASM Vol.16, Table 4.1' },
  { material: 'A36', operation: 'boring',   ref_Vc: 200, ref_fz: 0.15, ref_Fc: 1200, ref_tool_life: 30, source: 'METCUT Handbook Ch.5, Table 5-8' },
  { material: 'A36', operation: 'threading', ref_Vc: 120, ref_fz: 1.50, ref_Fc: 900, source: 'SANDVIK Threading Guide 2024, Table 6.1' },

  // === Cast Iron FC-300 / GG-30 (200-260 HB) ===
  { material: 'FC300', operation: 'turning',  ref_Vc: 200, ref_fz: 0.25, ref_Fc: 2000, ref_tool_life: 20, source: 'SANDVIK Turning Guide 2024, Table 3.4' },
  { material: 'FC300', operation: 'milling',  ref_Vc: 180, ref_fz: 0.15, ref_Fc: 1800, ref_tool_life: 25, source: 'SANDVIK Milling Guide 2024, Table 4.3' },
  { material: 'FC300', operation: 'drilling', ref_Vc: 110, ref_fz: 0.20, ref_Fc: 1500, ref_tool_life: 30, source: 'METCUT Handbook Ch.9, Table 9-4' },
  { material: 'FC300', operation: 'boring',   ref_Vc: 160, ref_fz: 0.12, ref_Fc: 1200, ref_tool_life: 25, source: 'SANDVIK Turning Guide 2024, Table 3.8' },
  { material: 'FC300', operation: 'threading', ref_Vc: 90, ref_fz: 1.50, ref_Fc: 800, source: 'SANDVIK Threading Guide 2024, Table 6.2' },
];

/**
 * Look up reference values for a material/operation combination.
 * Returns undefined if no reference exists (material not yet validated).
 */
export function getReference(material: string, operation: string): ReferencePoint | undefined {
  return REFERENCE_VALUES.find(
    (r) => r.material === material && r.operation === operation,
  );
}

/**
 * Get all reference materials (unique material names).
 */
export function getReferenceMaterials(): string[] {
  return [...new Set(REFERENCE_VALUES.map((r) => r.material))];
}
