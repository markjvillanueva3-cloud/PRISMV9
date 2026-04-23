/**
 * ESPRITWireEDMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM51
 *
 * Catalog: 8 wire-EDM operations / 59 parameters / 7 categories.
 *
 * Categories: cut_2axis (incl corner_strategy), taper_4axis, skim_pass,
 *             auto_routing, punch_die, technology, monitoring.
 *
 * Methods:
 *   getIndex(), getSummary(), listOperations(), getOperation(id),
 *   getOperationsByCategory(cat), findParameter(name, limit),
 *   recommendByFeature(intent),
 *   selectSkimSchedule(target_ra_um): 0/2/3/4 skims by surface target
 *   selectTaperReferencePlane(thickness_mm, taper_angle_deg, guide_uv_max_mm)
 *   computeDieClearance(thickness_mm, material_iso, fineblanking)
 *   estimateCycleTime(area_mm2, thickness_mm, skim_count)
 */

import * as path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let _catalog: any | null = null;

function dataPath(): string {
  const candidates = [
    path.resolve(__dirname, "../../data/cam-functions/esprit/wire-edm.json"),
    path.resolve(__dirname, "../data/cam-functions/esprit/wire-edm.json"),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  throw new Error("ESPRITWireEDMFunctionIndexEngine: wire-edm.json not found");
}

function loadCatalog(): any {
  if (_catalog) return _catalog;
  _catalog = JSON.parse(fs.readFileSync(dataPath(), "utf8"));
  return _catalog;
}

export type ESPRITWireEDMIntent =
  | "cut_2axis_simple"
  | "cut_4axis_taper"
  | "skim_finish"
  | "auto_route_multi_cavity"
  | "punch_die_pair"
  | "technology_select"
  | "wire_break_recover"
  | "corner_strategy";

export interface ESPRITWireEDMRecommendation {
  primary: string;
  reason: string;
  alternatives: string[];
}

export class ESPRITWireEDMFunctionIndexEngine {
  static getIndex(): any {
    return loadCatalog();
  }

  static getSummary(): any {
    const c = loadCatalog();
    let totalParams = 0;
    for (const op of Object.values(c.operations) as any) totalParams += op.parameter_count ?? 0;
    return {
      system_id: c.system_id,
      section_key: c.section_key,
      total_operations: Object.keys(c.operations).length,
      total_parameters: totalParams,
      categories: c.categories,
      training_topics_count: (c.training_topics ?? []).length,
    };
  }

  static listOperations(): Array<{ operation_id: string; category: string; parameter_count: number; display_name: string }> {
    const c = loadCatalog();
    return Object.entries(c.operations).map(([id, op]: [string, any]) => ({
      operation_id: id,
      category: op.category,
      parameter_count: op.parameter_count,
      display_name: op.display_name,
    }));
  }

  static getOperation(operation_id: string): any {
    const c = loadCatalog();
    const op = c.operations[operation_id];
    if (!op) return { error: `Unknown operation_id: ${operation_id}` };
    return { operation_id, ...op };
  }

  static getOperationsByCategory(category: string): Array<{ operation_id: string; parameter_count: number; display_name: string }> {
    const target = String(category).toLowerCase();
    const c = loadCatalog();
    const out: Array<{ operation_id: string; parameter_count: number; display_name: string }> = [];
    for (const [id, op] of Object.entries(c.operations) as any) {
      if ((op.category ?? "").toLowerCase() === target) {
        out.push({ operation_id: id, parameter_count: op.parameter_count, display_name: op.display_name });
      }
    }
    return out;
  }

  static findParameter(
    parameter_name: string,
    limit = 50,
  ): Array<{ operation_id: string; group: string; parameter: string }> {
    const needle = String(parameter_name).toLowerCase();
    const c = loadCatalog();
    const out: Array<{ operation_id: string; group: string; parameter: string }> = [];
    for (const [id, op] of Object.entries(c.operations) as any) {
      for (const [grp, params] of Object.entries(op.parameters || {}) as any) {
        for (const pName of Object.keys(params)) {
          if (pName.toLowerCase().includes(needle)) {
            out.push({ operation_id: id, group: grp, parameter: pName });
            if (out.length >= limit) return out;
          }
        }
      }
    }
    return out;
  }

  static recommendByFeature(intent: ESPRITWireEDMIntent | string): ESPRITWireEDMRecommendation {
    const map: Record<string, { primary: string; reason: string; alts: string[] }> = {
      cut_2axis_simple: { primary: "wire_2axis_cut", reason: "Standard 2-axis XY cut with offset compensation.", alts: [] },
      cut_4axis_taper: { primary: "wire_4axis_taper", reason: "4-axis XY/UV synchronized taper cut.", alts: [] },
      skim_finish: { primary: "wire_skim_pass", reason: "Multi-pass skim schedule for surface finish.", alts: [] },
      auto_route_multi_cavity: { primary: "wire_auto_route", reason: "Auto-sequence multi-cavity with travel optimization.", alts: [] },
      punch_die_pair: { primary: "wire_punch_die", reason: "Auto-generate matched punch + die from one profile.", alts: [] },
      technology_select: { primary: "wire_technology_select", reason: "Machine-specific generator setting selection.", alts: [] },
      wire_break_recover: { primary: "wire_break_recovery", reason: "Define wire-break recovery strategy.", alts: [] },
      corner_strategy: { primary: "wire_corner_strategy", reason: "Inside-corner handling (sharp/radius/slowdown).", alts: [] },
    };
    const hit = map[intent];
    if (hit) return { primary: hit.primary, reason: hit.reason, alternatives: hit.alts };
    return { primary: "wire_2axis_cut", reason: `Unknown intent='${intent}', defaulting to 2-axis cut.`, alternatives: [] };
  }

  /**
   * selectSkimSchedule — pick skim count by surface target.
   *  Ra ≥ 3.2 μm  → 0 skims (rough only)
   *  Ra > 1.6 μm  → 1 skim
   *  Ra ≥ 0.8 μm  → 2 skims (industry default)
   *  Ra ≥ 0.4 μm  → 3 skims
   *  Ra < 0.4 μm  → 4 skims (precision tooling)
   */
  static selectSkimSchedule(target_ra_um: number): {
    skim_count: number;
    rationale: string;
    target_ra_um: number;
  } {
    if (typeof target_ra_um !== "number" || !Number.isFinite(target_ra_um) || target_ra_um <= 0) {
      return { skim_count: 2, rationale: "Invalid target Ra — defaulting to 2 skims.", target_ra_um: 0 };
    }
    if (target_ra_um >= 3.2) {
      return { skim_count: 0, rationale: `Ra=${target_ra_um}μm ≥ 3.2 → no skim, rough only.`, target_ra_um };
    }
    if (target_ra_um > 1.6) {
      return { skim_count: 1, rationale: `Ra=${target_ra_um}μm > 1.6 → 1 skim adequate.`, target_ra_um };
    }
    if (target_ra_um >= 0.8) {
      return { skim_count: 2, rationale: `Ra=${target_ra_um}μm ≥ 0.8 → 2 skims (industry default).`, target_ra_um };
    }
    if (target_ra_um >= 0.4) {
      return { skim_count: 3, rationale: `Ra=${target_ra_um}μm ≥ 0.4 → 3 skims for fine finish.`, target_ra_um };
    }
    return { skim_count: 4, rationale: `Ra=${target_ra_um}μm < 0.4 → 4 skims for precision.`, target_ra_um };
  }

  /**
   * selectTaperReferencePlane — choose lower / upper / midplane.
   * UV deflection at distance from reference plane = thickness × tan(taper).
   * Pick the reference that minimizes max UV excursion vs guide envelope.
   */
  static selectTaperReferencePlane(
    thickness_mm: number,
    taper_angle_deg: number,
    guide_uv_max_mm: number,
  ): {
    reference_plane: "lower" | "upper" | "midplane";
    max_uv_excursion_mm: number;
    within_envelope: boolean;
    rationale: string;
  } {
    if (
      typeof thickness_mm !== "number" || !Number.isFinite(thickness_mm) || thickness_mm <= 0 ||
      typeof taper_angle_deg !== "number" || !Number.isFinite(taper_angle_deg) ||
      typeof guide_uv_max_mm !== "number" || !Number.isFinite(guide_uv_max_mm) || guide_uv_max_mm <= 0
    ) {
      return {
        reference_plane: "lower",
        max_uv_excursion_mm: 0,
        within_envelope: false,
        rationale: "Invalid input — defaulting to lower reference.",
      };
    }
    const tanT = Math.tan((Math.abs(taper_angle_deg) * Math.PI) / 180);
    const fullExcursion = thickness_mm * tanT;
    const halfExcursion = (thickness_mm / 2) * tanT;
    // Midplane gives smallest max excursion (half on each side); lower/upper put full excursion on one side.
    const refMid = halfExcursion;
    const refLower = fullExcursion;
    if (refMid <= guide_uv_max_mm) {
      return {
        reference_plane: "midplane",
        max_uv_excursion_mm: Math.round(refMid * 1000) / 1000,
        within_envelope: true,
        rationale: `Midplane half-excursion ${refMid.toFixed(3)}mm ≤ envelope ${guide_uv_max_mm}mm.`,
      };
    }
    if (refLower <= guide_uv_max_mm) {
      return {
        reference_plane: "lower",
        max_uv_excursion_mm: Math.round(refLower * 1000) / 1000,
        within_envelope: true,
        rationale: `Lower-reference excursion ${refLower.toFixed(3)}mm ≤ envelope ${guide_uv_max_mm}mm.`,
      };
    }
    return {
      reference_plane: "midplane",
      max_uv_excursion_mm: Math.round(refMid * 1000) / 1000,
      within_envelope: false,
      rationale: `Excursion ${refMid.toFixed(3)}mm exceeds envelope ${guide_uv_max_mm}mm even at midplane — reduce taper or thickness.`,
    };
  }

  /**
   * computeDieClearance — pct of stock thickness.
   *  fineblanking            : 1-2% (use 1.5%)
   *  high-strength steel ≥H  : 8-10% (use 9%)
   *  general (carbon steel)  : 5%
   *  soft (Al/Cu/N)          : 4%
   */
  static computeDieClearance(thickness_mm: number, material_iso: "P" | "M" | "K" | "N" | "S" | "H", fineblanking: boolean): {
    clearance_pct: number;
    clearance_per_side_mm: number;
    rationale: string;
  } {
    if (typeof thickness_mm !== "number" || !Number.isFinite(thickness_mm) || thickness_mm <= 0) {
      return { clearance_pct: 5, clearance_per_side_mm: 0, rationale: "Invalid thickness — defaulting to 5% generic." };
    }
    let pct: number;
    let why: string;
    if (fineblanking) {
      pct = 1.5;
      why = "Fineblanking → 1-2% clearance (1.5%).";
    } else if (material_iso === "H") {
      pct = 9;
      why = "High-strength ISO-H → 8-10% clearance (9%).";
    } else if (material_iso === "N") {
      pct = 4;
      why = "Soft ISO-N (Al/Cu) → 4% clearance.";
    } else {
      pct = 5;
      why = `General ISO-${material_iso} → 5% clearance.`;
    }
    const perSide = Math.round(((thickness_mm * pct) / 100) * 1000) / 1000;
    return { clearance_pct: pct, clearance_per_side_mm: perSide, rationale: why };
  }

  /**
   * estimateCycleTime — rough cycle time (minutes) from cut area + thickness + skims.
   * Empirical rate: ~150 mm²/min per pass (rough), 120 mm²/min per skim.
   * Cycle = (perimeter × thickness) for material removal volume.
   * Approximation uses area_mm2 × (1 + skims×0.6).
   */
  static estimateCycleTime(area_mm2: number, thickness_mm: number, skim_count: number): {
    rough_min: number;
    skim_min: number;
    total_min: number;
    rationale: string;
  } {
    if (
      typeof area_mm2 !== "number" || !Number.isFinite(area_mm2) || area_mm2 <= 0 ||
      typeof thickness_mm !== "number" || !Number.isFinite(thickness_mm) || thickness_mm <= 0 ||
      typeof skim_count !== "number" || !Number.isInteger(skim_count) || skim_count < 0 || skim_count > 5
    ) {
      return { rough_min: 0, skim_min: 0, total_min: 0, rationale: "Invalid input — returned zeros." };
    }
    const ROUGH_RATE = 150;
    const SKIM_RATE = 120;
    const rough = (area_mm2 * thickness_mm) / (ROUGH_RATE * thickness_mm); // simplifies to area / rate
    const roughMin = Math.round((area_mm2 / ROUGH_RATE) * 100) / 100;
    const skimMin = Math.round((skim_count * (area_mm2 / SKIM_RATE)) * 100) / 100;
    void rough;
    return {
      rough_min: roughMin,
      skim_min: skimMin,
      total_min: Math.round((roughMin + skimMin) * 100) / 100,
      rationale: `area=${area_mm2}mm² @ rough ${ROUGH_RATE}mm²/min + ${skim_count}×skim @ ${SKIM_RATE}mm²/min`,
    };
  }
}

export const espritWireEDMFunctionIndexEngine = ESPRITWireEDMFunctionIndexEngine;
