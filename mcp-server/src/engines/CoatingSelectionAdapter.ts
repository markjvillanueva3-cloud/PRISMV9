/**
 * CoatingSelectionAdapter — CAMX-MS0.3 / U-CAMX04
 *
 * Replaces HARDCODED `if (material === "steel") coating = "TiAlN"` logic
 * scattered through PrintToProgram, Turning, and EDM pipelines with a
 * physics-backed, ISO-group-aware candidate ranker that routes the final
 * pick through PipelineDecisionOrchestratorEngine so the decision is logged,
 * safety-veto'd, and justified alongside every other pipeline decision.
 *
 * Knowledge sources (cited in each candidate):
 *   - Sandvik Coromant Metal Cutting Guide (2020) — coating/material pairings
 *   - Kennametal Master Catalog — wear modes vs coating
 *   - Walter Tools Guide — finishing vs roughing coating selection
 *   - ISCAR Line-Up — coating + geometry interaction
 *
 * ISO-Group → Preferred Coatings (preference-ordered, physics-justified):
 *   P (steel, low-alloy):  TiAlN > AlCrN > TiCN > TiN
 *   M (stainless):         AlTiN > TiCN > TiAlSiN (anti-BUE)
 *   K (cast iron):         uncoated > TiN > CVD-Al2O3 (abrasive)
 *   N (non-ferrous):       DLC > uncoated-polished > PCD (anti-BUE, low-CoF)
 *   S (superalloy):        AlTiN > TiAlSiN > CVD-Al2O3 (thermal)
 *   H (hardened >50HRC):   CBN > nanocomposite > AlCrN (oxidation)
 *
 * Call sites
 *   PrintToProgram.selectCoating()   → decision_point "p2p.coating_select"
 *   Turning.selectInsertCoating()    → decision_point "turn.coating_insert"
 *   EDM.selectWireCoating()          → decision_point "edm.wire_coating"
 */

import { pipelineDecisionOrchestratorEngine } from "./PipelineDecisionOrchestratorEngine.js";

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

export type IsoGroup = "P" | "M" | "K" | "N" | "S" | "H";

export interface CoatingCandidate {
  id: string;
  name: string;
  coating_family: "PVD" | "CVD" | "none" | "superhard";
  max_temp_c: number;
  hardness_hv: number;
  cof_steel: number; // dimensionless (approx)
  preferred_iso: IsoGroup[];
  wear_modes_resisted: string[];
  cost_index: number; // 1..5 (1 cheap, 5 super expensive)
  source: string;
}

export interface OrchestratedCoatingRequest {
  /** Stable decision_point id (e.g. "p2p.coating_select"). */
  decision_point: string;
  /** ISO group P/M/K/N/S/H. */
  material_iso_group: IsoGroup;
  /** Optional material name for audit context. */
  material_name?: string;
  /** Workpiece hardness (HRC) — drives H-group + oxidation resistance. */
  hardness_hrc?: number;
  /** Operation type — finishing often prefers DLC / polished surfaces. */
  operation_type?: "rough" | "finish" | "drill" | "thread" | "edm" | "turn";
  /** Cutting temperature prediction (°C) — for thermal coating screen. */
  cutting_temp_c?: number;
  /** Pipeline stage (for audit). */
  pipeline_stage?: string;
  /** Caller identity (for audit). */
  caller?: string;
  /** Objective modifier for the orchestrator scorer. */
  objective?: "speed" | "quality" | "cost" | "balanced" | "tool_life";
  /** Produce XAI importance. */
  explain?: boolean;
}

export interface OrchestratedCoatingDecision {
  /** The winning coating candidate. */
  coating: CoatingCandidate;
  /** Full orchestrator decision record. */
  decision: any;
  /** True when no candidate survived the physics/constraint filter. */
  no_candidates: boolean;
}

// ────────────────────────────────────────────────────────────────────────
// Catalog — curated from Sandvik / Kennametal / Walter / ISCAR guides.
// Values are representative; all are dimensionally consistent.
// ────────────────────────────────────────────────────────────────────────

const COATINGS: CoatingCandidate[] = [
  {
    id: "PVD-TiAlN",
    name: "TiAlN (Titanium Aluminum Nitride)",
    coating_family: "PVD",
    max_temp_c: 800,
    hardness_hv: 3300,
    cof_steel: 0.4,
    preferred_iso: ["P", "M", "S"],
    wear_modes_resisted: ["flank", "crater", "oxidation"],
    cost_index: 2,
    source: "Sandvik Coromant Metal Cutting Guide 2020",
  },
  {
    id: "PVD-AlCrN",
    name: "AlCrN (Aluminum Chromium Nitride)",
    coating_family: "PVD",
    max_temp_c: 1100,
    hardness_hv: 3200,
    cof_steel: 0.35,
    preferred_iso: ["P", "H"],
    wear_modes_resisted: ["oxidation", "flank", "thermal_cracking"],
    cost_index: 3,
    source: "Kennametal Master Catalog",
  },
  {
    id: "PVD-TiCN",
    name: "TiCN (Titanium Carbonitride)",
    coating_family: "PVD",
    max_temp_c: 400,
    hardness_hv: 3500,
    cof_steel: 0.3,
    preferred_iso: ["P", "M"],
    wear_modes_resisted: ["abrasive", "flank"],
    cost_index: 2,
    source: "Walter Tools Guide",
  },
  {
    id: "PVD-TiN",
    name: "TiN (Titanium Nitride)",
    coating_family: "PVD",
    max_temp_c: 600,
    hardness_hv: 2400,
    cof_steel: 0.5,
    preferred_iso: ["P", "K"],
    wear_modes_resisted: ["flank"],
    cost_index: 1,
    source: "ISCAR Line-Up",
  },
  {
    id: "PVD-AlTiN",
    name: "AlTiN (Aluminum Titanium Nitride)",
    coating_family: "PVD",
    max_temp_c: 900,
    hardness_hv: 3400,
    cof_steel: 0.4,
    preferred_iso: ["M", "S"],
    wear_modes_resisted: ["oxidation", "flank", "BUE"],
    cost_index: 3,
    source: "Sandvik Coromant Metal Cutting Guide 2020",
  },
  {
    id: "PVD-TiAlSiN",
    name: "TiAlSiN (Si-doped nanocomposite)",
    coating_family: "PVD",
    max_temp_c: 1100,
    hardness_hv: 3800,
    cof_steel: 0.35,
    preferred_iso: ["S", "H"],
    wear_modes_resisted: ["thermal_cracking", "abrasive", "oxidation"],
    cost_index: 4,
    source: "Walter Tools Guide — superalloy section",
  },
  {
    id: "DLC",
    name: "DLC (Diamond-Like Carbon)",
    coating_family: "PVD",
    max_temp_c: 400,
    hardness_hv: 3000,
    cof_steel: 0.1,
    preferred_iso: ["N"],
    wear_modes_resisted: ["BUE", "adhesive"],
    cost_index: 3,
    source: "Sandvik — aluminium / non-ferrous",
  },
  {
    id: "NONE-polished",
    name: "Uncoated polished (for Al / non-ferrous)",
    coating_family: "none",
    max_temp_c: 600,
    hardness_hv: 1700,
    cof_steel: 0.6,
    preferred_iso: ["K", "N"],
    wear_modes_resisted: ["BUE_on_alum"],
    cost_index: 1,
    source: "ISCAR — aluminium milling",
  },
  {
    id: "CVD-Al2O3",
    name: "CVD Al2O3 (alumina multilayer)",
    coating_family: "CVD",
    max_temp_c: 1200,
    hardness_hv: 2800,
    cof_steel: 0.45,
    preferred_iso: ["K", "S"],
    wear_modes_resisted: ["crater", "abrasive", "oxidation"],
    cost_index: 3,
    source: "Kennametal — cast iron + heat-resistant alloys",
  },
  {
    id: "SUPERHARD-CBN",
    name: "CBN (Cubic Boron Nitride)",
    coating_family: "superhard",
    max_temp_c: 1400,
    hardness_hv: 4700,
    cof_steel: 0.35,
    preferred_iso: ["H"],
    wear_modes_resisted: ["abrasive", "flank", "oxidation"],
    cost_index: 5,
    source: "Sandvik — hardened steel turning",
  },
  {
    id: "SUPERHARD-PCD",
    name: "PCD (Polycrystalline Diamond)",
    coating_family: "superhard",
    max_temp_c: 700,
    hardness_hv: 8000,
    cof_steel: 0.1,
    preferred_iso: ["N"],
    wear_modes_resisted: ["abrasive", "BUE"],
    cost_index: 5,
    source: "Sandvik — non-ferrous finishing",
  },
  {
    id: "PVD-nanocomposite",
    name: "nanocomposite (nc-AlCrN / TiSiN blend)",
    coating_family: "PVD",
    max_temp_c: 1200,
    hardness_hv: 4000,
    cof_steel: 0.3,
    preferred_iso: ["H", "S"],
    wear_modes_resisted: ["thermal_cracking", "abrasive", "oxidation"],
    cost_index: 4,
    source: "Kennametal — hardened-steel milling",
  },
];

// EDM wire has its own short catalog (coated ≠ ceramic coating on a tool)
const EDM_WIRE_COATINGS: CoatingCandidate[] = [
  {
    id: "WIRE-brass",
    name: "Brass CuZn37",
    coating_family: "none",
    max_temp_c: 900,
    hardness_hv: 110,
    cof_steel: 0,
    preferred_iso: ["P", "M", "K"],
    wear_modes_resisted: ["standard_discharge"],
    cost_index: 1,
    source: "GF AgieCharmilles wire catalog",
  },
  {
    id: "WIRE-zinc-coated",
    name: "Zinc-coated brass (diffusion annealed)",
    coating_family: "PVD",
    max_temp_c: 900,
    hardness_hv: 120,
    cof_steel: 0,
    preferred_iso: ["P", "H", "S"],
    wear_modes_resisted: ["flushing_limited_discharge", "heat_input"],
    cost_index: 3,
    source: "Mitsubishi Electric EDM wire guide",
  },
  {
    id: "WIRE-coated-hardened",
    name: "Coated hardened wire (CuZn + Cu core)",
    coating_family: "PVD",
    max_temp_c: 900,
    hardness_hv: 140,
    cof_steel: 0,
    preferred_iso: ["H", "S"],
    wear_modes_resisted: ["fine_finish", "taper_accuracy"],
    cost_index: 4,
    source: "Sodick EDM reference",
  },
];

// ────────────────────────────────────────────────────────────────────────
// Scoring
// ────────────────────────────────────────────────────────────────────────

function scoreCoating(c: CoatingCandidate, req: OrchestratedCoatingRequest): Record<string, number> {
  const iso = req.material_iso_group;
  const hrc = req.hardness_hrc ?? 0;
  const cutT = req.cutting_temp_c ?? 0;
  const op = req.operation_type ?? "rough";

  // optimal_performance — iso_group match + temperature margin
  let perf = c.preferred_iso.includes(iso) ? 0.9 : 0.35;
  // temperature margin normalized: (max_temp - predicted) / max_temp → clamp
  if (cutT > 0 && c.max_temp_c > 0) {
    const margin = Math.max(-0.5, Math.min(0.5, (c.max_temp_c - cutT) / c.max_temp_c));
    perf += margin * 0.2;
  }
  perf = Math.max(0, Math.min(1, perf));

  // logical_consistency — coating vs operation
  let logical = 0.6;
  if (op === "finish" && c.cof_steel <= 0.35) logical += 0.3;
  if (op === "rough" && c.hardness_hv >= 3200) logical += 0.2;
  if (op === "edm" && c.coating_family === "none" && c.id === "WIRE-brass") logical += 0.2;
  logical = Math.max(0, Math.min(1, logical));

  // safety — oxidation resistance for hot cutting, hardness for H-group
  let safety = 0.7;
  if (iso === "H" && (c.hardness_hv >= 3800 || c.id === "SUPERHARD-CBN")) safety += 0.25;
  if (iso === "S" && c.max_temp_c >= 1000) safety += 0.2;
  if (hrc > 50 && c.coating_family === "superhard") safety += 0.2;
  if (cutT > c.max_temp_c) safety -= 0.4; // HARD safety penalty for thermal overload
  safety = Math.max(0, Math.min(1, safety));

  // cost_efficiency — inverse of cost_index with floor
  const cost = 1 - (c.cost_index - 1) / 5;

  // robustness — number of wear modes resisted + family diversity
  const robustness = Math.min(1, 0.4 + 0.15 * c.wear_modes_resisted.length);

  return {
    optimal_performance: perf,
    logical_consistency: logical,
    safety,
    cost_efficiency: cost,
    robustness,
  };
}

function selectCatalog(req: OrchestratedCoatingRequest): CoatingCandidate[] {
  if (req.decision_point === "edm.wire_coating" || req.operation_type === "edm") {
    return EDM_WIRE_COATINGS;
  }
  return COATINGS;
}

// ────────────────────────────────────────────────────────────────────────
// Engine / adapter
// ────────────────────────────────────────────────────────────────────────

export class CoatingSelectionAdapter {
  /**
   * Score every relevant coating against the request, filter by thermal
   * hard-limit, route survivors through the orchestrator. Returns
   * no_candidates=true only when zero coatings survive the filter.
   */
  selectCoatingOrchestrated(req: OrchestratedCoatingRequest): OrchestratedCoatingDecision {
    const catalog = selectCatalog(req);
    const cutT = req.cutting_temp_c ?? 0;

    // Hard filter: reject coatings whose max_temp is clearly below predicted
    // cutting temperature by >20%. Leaves orchestrator safety axis to handle
    // marginal cases.
    const viable = catalog.filter((c) => cutT === 0 || c.max_temp_c >= cutT * 0.8);

    if (viable.length === 0) {
      return { coating: null as any, decision: null, no_candidates: true };
    }

    const candidates = viable.map((c) => ({
      id: c.id,
      label: c.name,
      data: {
        coating_family: c.coating_family,
        max_temp_c: c.max_temp_c,
        hardness_hv: c.hardness_hv,
        cof_steel: c.cof_steel,
        preferred_iso: c.preferred_iso,
        wear_modes: c.wear_modes_resisted,
        cost_index: c.cost_index,
        iso_groups: c.preferred_iso,
      },
      pre_scores: scoreCoating(c, req),
    }));

    const decision = (pipelineDecisionOrchestratorEngine as any).decide({
      category: "coating_select",
      context: {
        material: {
          iso_group: req.material_iso_group,
          name: req.material_name,
          hardness_hrc: req.hardness_hrc,
        },
        operation: req.operation_type,
        thermal: { cutting_temp_c: cutT },
      },
      candidates,
      objective: req.objective ?? "balanced",
      explain: req.explain ?? false,
      pipeline_stage: req.pipeline_stage,
      caller: req.caller,
      constraints: {
        // Soft cap — orchestrator uses this as a safety hint
        max_cost_index: 5,
      },
    });

    const winnerId = decision?.choice?.id;
    const winner = viable.find((c) => c.id === winnerId) ?? viable[0];

    return {
      coating: winner,
      decision,
      no_candidates: false,
    };
  }

  /** Inspection helper: list preferred coatings for an ISO group (no decision). */
  preferredForIsoGroup(iso: IsoGroup): CoatingCandidate[] {
    return COATINGS.filter((c) => c.preferred_iso.includes(iso));
  }

  /**
   * Compatible (usable) ISO workpiece groups for a tool given its coating
   * chemistry + substrate. BROADER than the per-coating `preferred_iso`
   * (which is the recommended best-fit subset) — this is the "what can this
   * tool legitimately cut" set used to GATE per-material-group cutting-preset
   * emission, so a tool is only populated for material domains it is
   * metallurgically suited to (the operator's "only populate compatible
   * material types" constraint).
   *
   * Rationale (ASM Metals Handbook Vol.16 Machining; Sandvik/Kennametal
   * coating-application guidance):
   *  - Al-bearing high-temp PVD (TiAlN/AlTiN/AlCrN/TiAlSiN/nanocomposite, and
   *    generic "Ti-coated"): ferrous + superalloy + hardened [P,M,K,S,H].
   *    EXCLUDES aluminum N — Al affinity causes built-up edge / galling.
   *  - TiN (low-temp PVD): general purpose incl. light aluminum [P,M,K,N], not S/H.
   *  - TiCN (harder carbonitride): ferrous [P,M,K] — not aluminum (Ti affinity → BUE).
   *  - Unknown/unidentified coating → conservative [P,M,K] (never S/H without a verified film).
   *  - Uncoated / polished carbide: non-ferrous + cast iron [N,K] (sharp edge, no BUE).
   *  - DLC: non-ferrous / abrasive non-metal [N] only.
   *  - PCD: non-ferrous / composite / graphite [N] only — NEVER ferrous (carbon graphitizes).
   *  - CBN: hardened steel + cast iron [H,K] — not soft steel / aluminum.
   *  - CVD-alumina / ceramic: cast iron + superalloy high-speed [K,S].
   *  - HSS substrate: [P,M,K,N] — cuts cast iron but lacks the hot-hardness for S/H.
   *
   * @param coating free-text coating/material descriptor (e.g. "TiAlN", "ti coated", "uncoated", "PCD")
   * @param substrate optional substrate ("carbide" | "hss" | "cermet" | "ceramic" | "cbn" | "pcd")
   * @returns compatible ISO groups (non-empty subset of P/M/K/N/S/H)
   */
  compatibleIsoGroups(coating?: string, substrate?: string): IsoGroup[] {
    const c = (coating || "").toLowerCase();
    const s = (substrate || "").toLowerCase();

    // HSS lacks hot-hardness → never S/H, but DOES cut cast iron (K): HSS taps,
    // reamers and form tools run gray/ductile iron daily (K is abrasion-limited,
    // not hot-hardness-limited). Overrides coating.
    if (/hss|high[ -]?speed steel/.test(s) || /\bhss\b/.test(c)) return ["P", "M", "K", "N"];

    // Superhard / specialty coatings (most specific first).
    if (/\bpcd\b|polycrystalline diamond/.test(c) || /\bpcd\b/.test(s)) return ["N"];
    if (/\bcbn\b|cubic boron/.test(c) || /\bcbn\b/.test(s)) return ["H", "K"];
    if (/ceramic|al2o3|alumina|\bcvd\b/.test(c) || /ceramic/.test(s)) return ["K", "S"];
    if (/dlc|diamond[ -]?like/.test(c)) return ["N"];
    // Al-bearing high-temp PVD (incl. generic "Ti coated"): ferrous family, NOT aluminum.
    if (/tialn|altin|alcrn|tialsin|altisin|nanocomposite|tisin|ti[ -]?coat/.test(c)) return ["P", "M", "K", "S", "H"];
    // TiN (low-temp PVD): general purpose incl. light aluminum, not high-temp S/H.
    if (/\btin\b|titanium nitride/.test(c)) return ["P", "M", "K", "N"];
    // TiCN (harder carbonitride): ferrous general — NOT aluminum (Ti affinity → BUE).
    if (/ticn|carbonitride/.test(c)) return ["P", "M", "K"];
    // Explicitly uncoated / polished: non-ferrous + cast iron (sharp edge, no BUE).
    if (/uncoated|polished|bright/.test(c)) return ["N", "K"];
    // Explicit non-ferrous intent.
    if (/alum|non[ -]?ferrous|brass|copper|graphite|plastic/.test(c)) return ["N"];
    // Unknown coating → CONSERVATIVE default: only the low-consequence ferrous-soft
    // set [P,M,K]. NEVER grant S (superalloy) or H (hardened) to an UNIDENTIFIED
    // coating — those domains demand a verified high-temp/superhard film and a wrong
    // coating there fails catastrophically (thermal runaway / edge fracture), not
    // recoverably. An identified Al-bearing/CBN/etc. coating reaches its own branch above.
    return ["P", "M", "K"];
  }
}

// ────────────────────────────────────────────────────────────────────────
// Singleton
// ────────────────────────────────────────────────────────────────────────
export const coatingSelectionAdapter = new CoatingSelectionAdapter();
