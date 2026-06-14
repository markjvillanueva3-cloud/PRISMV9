/**
 * SmartToolSelectorEngine — CK-MS0/U02
 * Physics-scored tool selection from 46,590-tool catalog.
 * Chains: ToolCatalog → Kienzle forces → Machine validation →
 *         Deflection analysis → Playbook rules → Weighted scoring.
 *
 * Input:  operation + material + machine + geometry constraints
 * Output: ranked tools with physics validation and rationale
 */

import { toolCatalogEngine } from "./ToolCatalogEngine.js";
import { toolSelectionEngine } from "./ToolSelectionEngine.js";
import { machineProfileEngine } from "./MachineProfileEngine.js";
import { kienzleForceModelEngine } from "./KienzleForceModelEngine.js";
import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";
import { insertGradeSelectionEngine } from "./InsertGradeSelectionEngine.js";
import { tribalKnowledgeEngine, type KnowledgeTip } from "./TribalKnowledgeEngine.js";
import { CANONICAL_KIENZLE, type ISOGroup } from "../physics/constants.js";

function getToolCatalog(): any {
  return toolCatalogEngine as any;
}
function getToolSelection(): any {
  return toolSelectionEngine as any;
}
function getMachineProfile(): any {
  return machineProfileEngine as any;
}
function getKienzleForce(): any {
  return kienzleForceModelEngine as any;
}
function getPlaybook(): any {
  return machiningPlaybookEngine as any;
}
function getInsertGrade(): any {
  return insertGradeSelectionEngine as any;
}

// Kienzle coefficients now imported from canonical physics/constants.ts (see CANONICAL_KIENZLE).

// ── Scoring weights by optimization goal ───────────────────────
const WEIGHT_PROFILES: Record<string, number[]> = {
  // [geometric, material, physics, machine, playbook, holder, cost]
  balanced:       [0.20, 0.15, 0.20, 0.15, 0.10, 0.10, 0.10],
  tool_life:      [0.15, 0.20, 0.25, 0.10, 0.10, 0.10, 0.10],
  speed:          [0.15, 0.10, 0.25, 0.20, 0.05, 0.10, 0.15],
  cost:           [0.15, 0.10, 0.10, 0.10, 0.05, 0.10, 0.40],
  surface_finish: [0.20, 0.15, 0.15, 0.10, 0.15, 0.15, 0.10],
};

// ── Interfaces ─────────────────────────────────────────────────
export interface SmartToolRequest {
  operation_type: string;
  material_iso_group: string;
  material_name?: string;
  material_hardness_hrc?: number;
  machine_name?: string;
  machine_id?: string;
  machine_spindle_taper?: string;
  max_rpm?: number;
  max_power_kw?: number;
  coolant_type?: string;
  feature_diameter_mm?: number;
  feature_depth_mm?: number;
  feature_width_mm?: number;
  wall_thickness_mm?: number;
  tolerance_mm?: number;
  surface_finish_Ra?: number;
  corner_radius_mm?: number;
  batch_size?: number;
  allow_indexable?: boolean;
  max_tool_cost_usd?: number;
  optimize_for?: "tool_life" | "speed" | "cost" | "surface_finish" | "balanced";
  max_results?: number;
}

export interface SmartToolResult {
  tool_id: string;
  manufacturer: string;
  designation: string;
  type: string;
  diameter_mm: number;
  flute_length_mm: number;
  flute_count: number;
  coating: string;
  score: number;
  score_breakdown: {
    geometric_fit: number;
    material_match: number;
    physics_performance: number;
    machine_fit: number;
    playbook_compliance: number;
    holder_availability: number;
    cost_efficiency: number;
  };
  physics: {
    cutting_force_N: number;
    cutting_power_kW: number;
    torque_Nm: number;
    deflection_mm: number;
    max_deflection_mm: number;
    deflection_ok: boolean;
    tool_life_estimate_min: number;
    specific_energy_J_mm3: number;
  };
  recommended_params: {
    speed_mpm: number;
    rpm: number;
    feed_mmpt: number;
    feed_mmmin: number;
    ap_mm: number;
    ae_mm: number;
  };
  machine_validation: {
    rpm_ok: boolean;
    power_ok: boolean;
    torque_ok: boolean;
    tool_fits: boolean;
  };
  playbook_rules: Array<{ id: string; title: string; severity: string }>;
  warnings: string[];
  rationale: string[];
}

export interface SmartToolSelectionOutput {
  candidates: SmartToolResult[];
  best_tool: SmartToolResult;
  machine_used: string;
  material: string;
  operation: string;
  optimization_goal: string;
  total_candidates_evaluated: number;
  selection_time_ms: number;
  tribal_tips?: KnowledgeTip[];
}

// ── Engine ─────────────────────────────────────────────────────
export class SmartToolSelectorEngine {
  /**
   * Select optimal tool from 46K catalog with physics scoring.
   */
  select(req: SmartToolRequest): SmartToolSelectionOutput {
    const t0 = Date.now();
    const iso = (req.material_iso_group || "P").toUpperCase();
    const kienzle = CANONICAL_KIENZLE[iso as ISOGroup] || CANONICAL_KIENZLE.P;
    const goal = req.optimize_for || "balanced";
    const weights = WEIGHT_PROFILES[goal] || WEIGHT_PROFILES.balanced;
    const maxResults = req.max_results || 5;

    // ── 1. Resolve machine ────────────────────────────────────
    let machine: any = null;
    try {
      const mpe = getMachineProfile();
      if (req.machine_id) {
        machine = mpe.get(req.machine_id);
      } else if (req.machine_name) {
        // Search by name substring
        const all = mpe.list?.() || [];
        machine = all.find((m: any) =>
          m.name?.toLowerCase().includes(req.machine_name!.toLowerCase()) ||
          m.id?.toLowerCase().includes(req.machine_name!.toLowerCase())
        );
        if (machine && machine.id && !machine.spindle) {
          machine = mpe.get(machine.id);
        }
      }
    } catch { /* machine lookup optional */ }

    const maxRpm = machine?.spindle?.max_rpm || req.max_rpm || 12000;
    const maxPower = machine?.spindle?.rated_power_kw || req.max_power_kw || 15;
    const maxTorque = machine?.spindle?.max_torque_nm || 120;
    const taper = machine?.spindle?.taper || req.machine_spindle_taper || "BT40";

    // ── 2. Query tool catalog ─────────────────────────────────
    let candidates: any[] = [];
    try {
      const tc = getToolCatalog();
      // Try recommend first
      const recommended = tc.recommend?.({
        operation: req.operation_type,
        iso_group: iso,
        diameter_mm: req.feature_diameter_mm
          ? this._idealToolDiameter(req.operation_type, req.feature_diameter_mm, req.feature_width_mm)
          : undefined,
        depth_mm: req.feature_depth_mm,
        finish_required: (req.surface_finish_Ra || 99) < 1.6,
        max_results: 30,
      });
      if (recommended?.length) candidates = recommended;

      // Fallback to search
      if (!candidates.length) {
        const toolType = this._opToToolType(req.operation_type);
        candidates = tc.search?.({
          type: toolType,
          iso_group: iso,
          diameter_range: req.feature_diameter_mm
            ? [req.feature_diameter_mm * 0.3, req.feature_diameter_mm * 0.9]
            : undefined,
          max_results: 30,
        }) || [];
      }
    } catch { /* catalog query optional */ }

    // Fallback: generate synthetic candidates if catalog empty
    if (!candidates.length) {
      candidates = this._syntheticCandidates(req, iso);
    }

    // ── 3. Score each candidate ───────────────────────────────
    const scored: SmartToolResult[] = [];
    for (const tool of candidates) {
      const result = this._scoreTool(tool, req, kienzle, machine, weights, maxRpm, maxPower, maxTorque, taper, iso);
      if (result) scored.push(result);
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, maxResults);

    // ── 4. Enrich best tool with playbook ─────────────────────
    if (top.length > 0) {
      try {
        const pb = getPlaybook();
        const advice = pb.advise?.({
          material_iso: iso,
          features: [req.operation_type],
          operation_type: req.operation_type,
          tolerance_mm: req.tolerance_mm,
          surface_finish_Ra: req.surface_finish_Ra,
          wall_thickness_mm: req.wall_thickness_mm,
          hardness_hrc: req.material_hardness_hrc,
        });
        if (advice?.rules?.length) {
          for (const t of top) {
            t.playbook_rules = advice.rules.slice(0, 5).map((r: any) => ({
              id: r.id, title: r.title, severity: r.severity,
            }));
          }
        }
      } catch { /* playbook optional */ }
    }

    const best = top[0] || this._fallbackResult(req, iso);

    // ── TK-2: Tribal knowledge consumer wiring ──
    let tribal_tips: KnowledgeTip[] | undefined;
    try {
      tribal_tips = tribalKnowledgeEngine.search({
        category: "tooling",
        material_iso_group: iso,
        operation_type: req.operation_type,
        min_confidence: 70,
        limit: 5,
      });
    } catch { /* tribal tips are advisory — never block selection */ }

    return {
      candidates: top,
      best_tool: best,
      machine_used: machine?.name || req.machine_name || "generic",
      material: req.material_name || iso,
      operation: req.operation_type,
      optimization_goal: goal,
      total_candidates_evaluated: candidates.length,
      selection_time_ms: Date.now() - t0,
      tribal_tips,
    };
  }

  /**
   * Score a single tool candidate against requirements.
   */
  private _scoreTool(
    tool: any, req: SmartToolRequest, kienzle: { kc1_1: number; mc: number },
    machine: any, weights: number[], maxRpm: number, maxPower: number,
    maxTorque: number, taper: string, iso: string,
  ): SmartToolResult | null {
    const d = tool.physical?.cutting_diameter_mm || tool.cutting_diameter_mm || tool.diameter_mm;
    const loc = tool.physical?.flute_length_mm || tool.flute_length_mm || d * 3;
    const oal = tool.physical?.overall_length_mm || tool.overall_length_mm || d * 6;
    const flutes = tool.flute_count || tool.physical?.flute_count || 3;
    const cr = tool.physical?.corner_radius_mm || tool.corner_radius_mm || 0;

    if (!d || d <= 0) return null;

    // ── Geometric fit (0-100) ───────────────────────────────
    let geoScore = 100;
    if (req.feature_depth_mm && loc < req.feature_depth_mm) {
      geoScore -= Math.min(50, ((req.feature_depth_mm - loc) / loc) * 100);
    }
    if (req.feature_diameter_mm) {
      const idealD = this._idealToolDiameter(req.operation_type, req.feature_diameter_mm, req.feature_width_mm);
      const ratio = d / idealD;
      if (ratio < 0.5 || ratio > 1.5) geoScore -= 40;
      else if (ratio < 0.7 || ratio > 1.2) geoScore -= 20;
    }
    if (req.corner_radius_mm !== undefined && cr > req.corner_radius_mm) {
      geoScore -= 30; // tool CR too large for feature
    }
    geoScore = Math.max(0, geoScore);

    // ── Material match (0-100) ──────────────────────────────
    let matScore = 50; // default moderate
    const toolIsoGroups: string[] = tool.iso_groups || [];
    if (toolIsoGroups.includes(iso)) matScore = 100;
    else if (toolIsoGroups.length === 0) matScore = 60; // unknown = assume OK
    const coating = tool.coating || "";
    if (iso === "S" && /AlTiN|TiAlN/i.test(coating)) matScore = Math.min(100, matScore + 15);
    if (iso === "N" && /uncoated|DLC|diamond/i.test(coating)) matScore = Math.min(100, matScore + 15);
    if (iso === "H" && /CBN|nano|AlCrN/i.test(coating)) matScore = Math.min(100, matScore + 15);

    // ── Physics performance (0-100) ─────────────────────────
    // Speed/feed from tool cutting data or defaults
    const cutData = tool.cutting_data?.[iso] || tool.cutting_data?.default;
    const vc = cutData?.vc_max ? (cutData.vc_min + cutData.vc_max) / 2 : this._defaultVc(iso);
    const fz = cutData?.fz_max ? (cutData.fz_min + cutData.fz_max) / 2 : this._defaultFz(iso, d);
    const ap = req.feature_depth_mm
      ? Math.min(req.feature_depth_mm, cutData?.ap_max || d * 1.0)
      : d * 0.5;
    const ae = req.feature_width_mm
      ? Math.min(req.feature_width_mm, cutData?.ae_max || d * 0.5)
      : d * 0.3;

    const rpm = Math.min(maxRpm, Math.round((vc * 1000) / (Math.PI * d)));
    const feedMmMin = Math.round(fz * flutes * rpm);

    // Kienzle force calculation
    const h = fz * Math.sin(Math.acos(1 - (2 * ae) / d)); // effective chip thickness
    const kc = kienzle.kc1_1 * Math.pow(Math.max(0.01, h), -kienzle.mc);
    const Fc = kc * ap * h; // main cutting force [N]
    const torque = (Fc * d) / 2000; // [Nm]
    const power = (Fc * vc) / 60000; // [kW]
    const specificEnergy = (Fc * vc) / (60000 * ap * ae * feedMmMin / 1000); // approx

    // Tool deflection: δ = FL³/(3EI), E=600GPa carbide (canonical), I=πd⁴/64
    const overhang = oal * 0.6; // assume 60% sticks out
    const E = 580e3; // N/mm²
    const I = (Math.PI * Math.pow(d, 4)) / 64;
    const deflection = (Fc * Math.pow(overhang, 3)) / (3 * E * I);
    const maxDeflection = req.tolerance_mm ? req.tolerance_mm * 0.3 : 0.020; // 30% of tolerance

    // Taylor tool life estimate: T = (C/V)^(1/n), simplified
    const n = iso === "N" ? 0.4 : iso === "H" ? 0.15 : 0.25;
    const C = iso === "N" ? 500 : iso === "H" ? 150 : 300;
    const toolLife = Math.pow(C / vc, 1 / n); // minutes

    let physScore = 100;
    if (power > maxPower * 0.9) physScore -= 30;
    if (torque > maxTorque * 0.9) physScore -= 20;
    if (deflection > maxDeflection) physScore -= Math.min(40, (deflection / maxDeflection) * 30);
    if (toolLife < 15) physScore -= 30;
    else if (toolLife < 30) physScore -= 15;
    physScore = Math.max(0, physScore);

    // ── Machine fit (0-100) ─────────────────────────────────
    let machScore = 80;
    const rpmOk = rpm <= maxRpm;
    const powerOk = power <= maxPower;
    const torqueOk = torque <= maxTorque;
    const toolFits = !machine || (
      (!machine.max_tool_diameter_mm || d <= machine.max_tool_diameter_mm) &&
      (!machine.max_tool_length_mm || oal <= machine.max_tool_length_mm)
    );
    if (!rpmOk) machScore -= 40;
    if (!powerOk) machScore -= 30;
    if (!torqueOk) machScore -= 20;
    if (!toolFits) machScore -= 50;
    machScore = Math.max(0, machScore);

    // ── Playbook compliance (0-100) ─────────────────────────
    let pbScore = 80;
    const ldRatio = overhang / d;
    if (ldRatio > 5) pbScore -= 20; // long overhang penalty
    if (ldRatio > 7) pbScore -= 20;
    if (req.wall_thickness_mm && req.wall_thickness_mm < d * 0.5) pbScore -= 15;
    pbScore = Math.max(0, pbScore);

    // ── Holder availability (0-100) ─────────────────────────
    let holderScore = 70;
    const holderIface = tool.holder_interface || "";
    if (/Weldon|ER|HSK|BT/i.test(holderIface)) holderScore = 90;
    if (taper && holderIface.toLowerCase().includes(taper.toLowerCase())) holderScore = 100;

    // ── Cost efficiency (0-100) ─────────────────────────────
    let costScore = 70;
    const price = tool.price_usd || 0;
    if (price > 0) {
      const costPerMin = price / Math.max(1, toolLife);
      if (costPerMin < 0.5) costScore = 100;
      else if (costPerMin < 1.0) costScore = 85;
      else if (costPerMin < 2.0) costScore = 65;
      else costScore = 40;
    }
    if (req.max_tool_cost_usd && price > req.max_tool_cost_usd) costScore = 10;

    // ── Weighted composite score ────────────────────────────
    const scores = [geoScore, matScore, physScore, machScore, pbScore, holderScore, costScore];
    const composite = scores.reduce((sum, s, i) => sum + s * weights[i], 0);

    // ── Warnings ────────────────────────────────────────────
    const warnings: string[] = [];
    if (deflection > maxDeflection) warnings.push(`Deflection ${deflection.toFixed(4)}mm exceeds limit ${maxDeflection.toFixed(4)}mm — use shorter tool or larger diameter`);
    if (!rpmOk) warnings.push(`Required RPM ${rpm} exceeds machine max ${maxRpm}`);
    if (!powerOk) warnings.push(`Required power ${power.toFixed(1)}kW exceeds machine ${maxPower}kW`);
    if (ldRatio > 5) warnings.push(`L/D ratio ${ldRatio.toFixed(1)} exceeds 5:1 — reduce feed 50% or use anti-vibration tool`);
    if (toolLife < 15) warnings.push(`Estimated tool life ${toolLife.toFixed(0)}min is very short — consider reducing speed`);

    // ── Rationale ───────────────────────────────────────────
    const rationale: string[] = [
      `${tool.manufacturer || "Generic"} ${tool.designation || tool.id} — Ø${d}mm ${flutes}FL`,
      `Kienzle Fc=${Fc.toFixed(0)}N, P=${power.toFixed(1)}kW, δ=${deflection.toFixed(4)}mm`,
      `Taylor life ≈ ${toolLife.toFixed(0)}min at Vc=${vc.toFixed(0)}m/min`,
      `Score: ${composite.toFixed(0)}/100 (geo:${geoScore} mat:${matScore} phys:${physScore} mach:${machScore})`,
    ];

    return {
      tool_id: tool.id || `${tool.manufacturer}-${tool.designation}`,
      manufacturer: tool.manufacturer || "Generic",
      designation: tool.designation || tool.series || "",
      type: tool.type || "end_mill",
      diameter_mm: d,
      flute_length_mm: loc,
      flute_count: flutes,
      coating: coating || "unknown",
      score: Math.round(composite),
      score_breakdown: {
        geometric_fit: geoScore,
        material_match: matScore,
        physics_performance: physScore,
        machine_fit: machScore,
        playbook_compliance: pbScore,
        holder_availability: holderScore,
        cost_efficiency: costScore,
      },
      physics: {
        cutting_force_N: Math.round(Fc),
        cutting_power_kW: Math.round(power * 100) / 100,
        torque_Nm: Math.round(torque * 100) / 100,
        deflection_mm: Math.round(deflection * 10000) / 10000,
        max_deflection_mm: maxDeflection,
        deflection_ok: deflection <= maxDeflection,
        tool_life_estimate_min: Math.round(toolLife),
        specific_energy_J_mm3: Math.round((specificEnergy || 0) * 100) / 100,
      },
      recommended_params: {
        speed_mpm: Math.round(vc),
        rpm,
        feed_mmpt: Math.round(fz * 1000) / 1000,
        feed_mmmin: feedMmMin,
        ap_mm: Math.round(ap * 100) / 100,
        ae_mm: Math.round(ae * 100) / 100,
      },
      machine_validation: { rpm_ok: rpmOk, power_ok: powerOk, torque_ok: torqueOk, tool_fits: toolFits },
      playbook_rules: [],
      warnings,
      rationale,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────
  private _idealToolDiameter(op: string, featureDiam: number, featureWidth?: number): number {
    if (/drill|hole|bore|ream|tap/.test(op)) return featureDiam;
    if (/pocket|slot/.test(op)) return (featureWidth || featureDiam) * 0.6;
    if (/contour|profile/.test(op)) return featureDiam * 0.5;
    return featureDiam * 0.7;
  }

  private _opToToolType(op: string): string {
    if (/drill/.test(op)) return "drill";
    if (/tap|thread/.test(op)) return "tap";
    if (/ream/.test(op)) return "reamer";
    if (/bore/.test(op)) return "boring_bar";
    if (/face/.test(op)) return "face_mill";
    if (/ball|freeform|3d/.test(op)) return "ball_mill";
    if (/chamfer/.test(op)) return "chamfer_mill";
    return "end_mill";
  }

  private _defaultVc(iso: string): number {
    return { P: 150, M: 100, K: 200, N: 400, S: 50, H: 120 }[iso] || 150;
  }

  private _defaultFz(iso: string, d: number): number {
    const base = { P: 0.10, M: 0.08, K: 0.12, N: 0.15, S: 0.06, H: 0.05 }[iso] || 0.10;
    return base * Math.sqrt(d / 10); // scale with tool diameter
  }

  private _syntheticCandidates(req: SmartToolRequest, iso: string): any[] {
    const baseDiam = req.feature_diameter_mm
      ? this._idealToolDiameter(req.operation_type, req.feature_diameter_mm, req.feature_width_mm)
      : 10;
    const diams = [baseDiam * 0.6, baseDiam * 0.8, baseDiam, baseDiam * 1.2, baseDiam * 1.5]
      .filter(d => d >= 1 && d <= 50)
      .map(d => Math.round(d * 10) / 10);

    return diams.map((d, i) => ({
      id: `synth-${d}mm-${i}`,
      manufacturer: "Generic",
      designation: `Ø${d}mm ${3 + (i % 2)}FL Carbide`,
      type: this._opToToolType(req.operation_type),
      physical: {
        cutting_diameter_mm: d,
        shank_diameter_mm: d,
        overall_length_mm: d * 6,
        flute_length_mm: d * 3,
        corner_radius_mm: req.corner_radius_mm || 0,
      },
      flute_count: 3 + (i % 2),
      coating: iso === "S" ? "AlTiN" : iso === "N" ? "uncoated" : iso === "H" ? "nACRo" : "TiAlN",
      iso_groups: [iso],
      operations: [req.operation_type],
      holder_interface: "ER",
    }));
  }

  private _fallbackResult(req: SmartToolRequest, iso: string): SmartToolResult {
    const d = req.feature_diameter_mm ? req.feature_diameter_mm * 0.7 : 10;
    return {
      tool_id: "fallback-generic",
      manufacturer: "Generic",
      designation: `Ø${d.toFixed(1)}mm Carbide`,
      type: "end_mill",
      diameter_mm: d,
      flute_length_mm: d * 3,
      flute_count: 3,
      coating: "TiAlN",
      score: 50,
      score_breakdown: { geometric_fit: 50, material_match: 50, physics_performance: 50, machine_fit: 50, playbook_compliance: 50, holder_availability: 50, cost_efficiency: 50 },
      physics: { cutting_force_N: 0, cutting_power_kW: 0, torque_Nm: 0, deflection_mm: 0, max_deflection_mm: 0.02, deflection_ok: true, tool_life_estimate_min: 60, specific_energy_J_mm3: 0 },
      recommended_params: { speed_mpm: this._defaultVc(iso), rpm: 5000, feed_mmpt: 0.1, feed_mmmin: 1500, ap_mm: d * 0.5, ae_mm: d * 0.3 },
      machine_validation: { rpm_ok: true, power_ok: true, torque_ok: true, tool_fits: true },
      playbook_rules: [],
      warnings: ["Using fallback generic tool — no catalog matches found"],
      rationale: ["Fallback selection — verify tool availability before running"],
    };
  }
}

export const smartToolSelectorEngine = new SmartToolSelectorEngine();
