/**
 * wedm-toolpath-types.ts — JM Die wire-EDM TOOLPATH-TYPE REGISTRY.
 *
 * The single queryable taxonomy of every wire-EDM toolpath/cut type the
 * print->program pipeline must cover (per WEDM-PRINT-TO-PROGRAM-PIPELINE-2026-05-31.md
 * §2). Today the cut types are scattered across WEDMPassType (rough/semi/finish/
 * precision), ECodePass.type (rough/skim), and EDMToolpathStrategyEngine
 * (open/closed/island). This consolidates them as pipeline-addressable entries so
 * (a) print->program can SELECT a type, (b) each type spawns a training TEMPLATE
 * with a variable-parameter schema + cutting-condition ranges, (c) every type is
 * feasibility-gated against the JM FA-10S envelope.
 *
 * SCHEMA ONLY (param names, valid ranges, owning engine, provenance). The actual
 * per-pass discharge values come from the ORACLE (jm-die-wedm-tech-tables.ts
 * getters / wire-spec-sheets.ts) — NEVER inlined here. Envelope bounds are JM
 * FA-10S machine specs (jm-die-profile.ts / ShopConfigurationEngine), referenced.
 *
 * @module data/wedm-toolpath-types
 */

/** JM FA-10S (WEDM-01) envelope — from ShopConfigurationEngine DEFAULT_MACHINES /
 *  jm-die-profile.ts. Every type's feasibility is gated against these. */
export const JM_FA10S_ENVELOPE = {
  machine_id: "WEDM-01",
  controller: "Mitsubishi FA10S W31MV-2",
  max_workpiece_height_mm: 215,
  max_taper_deg: 30,
  uv_travel_mm: 80,
  wire_diameters_on_hand_mm: [0.25, 0.20] as const, // MD+ Pro II 0.25, MV1200S 0.20
  submerged: true,
  auto_threading: true,
} as const;

export type ParamType = "number" | "enum" | "boolean";

export interface ToolpathParam {
  name: string;
  type: ParamType;
  unit?: string;
  min?: number;
  max?: number;
  enum?: readonly string[];
  /** Where the actual value/range is grounded (oracle table, machine spec, tribal id). */
  source: string;
}

export interface ToolpathType {
  id: string;
  label: string;
  /** Geometry signature that classifies a print feature into this type. */
  geometry: string;
  /** Engine that owns generation for this type. */
  owning_engine: string;
  /** JM E-code family when applicable ("" if not a multipass cascade). */
  e_code_family: string;
  /** Variable parameters the template sweeps. */
  params: ToolpathParam[];
  /** Feasibility constraints vs the FA-10S envelope (human-readable; checked by validateAgainstEnvelope). */
  feasibility: string;
  /** Build/coverage status. */
  status: "wired" | "partial" | "build";
  /** Provenance — engine/data/tribal that grounds this type. */
  provenance: string;
}

const WIRE_PARAM: ToolpathParam = { name: "wire_diameter_mm", type: "enum", unit: "mm", enum: ["0.25", "0.20", "0.10"], source: "ShopConfigurationEngine.wedm_wire_inventory + wire-spec-sheets.ts" };
const THK_PARAM: ToolpathParam = { name: "thickness_mm", type: "number", unit: "mm", min: 1, max: JM_FA10S_ENVELOPE.max_workpiece_height_mm, source: "JM_FA10S_ENVELOPE.max_workpiece_height_mm" };
const TOL_PARAM: ToolpathParam = { name: "tolerance_in", type: "number", unit: "in", min: 0.0001, max: 0.005, source: "wedm-knowledge-tips.ts + tech-tables" };
const RA_PARAM: ToolpathParam = { name: "target_ra_um", type: "number", unit: "um", min: 0.1, max: 3.2, source: "wedm-published-conditions.ts" };

/** The canonical registry — one entry per wire-EDM toolpath type. */
export const WEDM_TOOLPATH_TYPES: ToolpathType[] = [
  {
    id: "straight_profile_multipass",
    label: "Straight profile multipass (closed contour)",
    geometry: "closed planar contour, 2-axis, vertical wall",
    owning_engine: "EDMMultiPassStrategyEngine",
    e_code_family: "E12XX_STANDARD_4PASS",
    params: [THK_PARAM, TOL_PARAM, RA_PARAM, WIRE_PARAM, { name: "pass_count", type: "number", min: 2, max: 5, source: "selectECodeFamily" }],
    feasibility: "thickness <= 215mm; wire-Ø on-hand",
    status: "wired",
    provenance: "EDMMultiPassStrategyEngine + jm-die-wedm-tech-tables E12XX_STANDARD_4PASS",
  },
  {
    id: "heavy_thick_multipass",
    label: "Heavy/thick multipass (5-pass)",
    geometry: "closed contour, thickness > 50mm or cannelure-grade",
    owning_engine: "EDMMultiPassStrategyEngine",
    e_code_family: "E12XX_HEAVY_5PASS",
    params: [{ ...THK_PARAM, min: 50 }, TOL_PARAM, RA_PARAM, WIRE_PARAM],
    feasibility: "50 < thickness <= 215mm",
    status: "wired",
    provenance: "jm-die-wedm-tech-tables E12XX_HEAVY_5PASS",
  },
  {
    id: "taper_uv",
    label: "Taper / UV (4-axis)",
    geometry: "tapered wall, 4-axis UV, H-offsets = 0",
    owning_engine: "EDMToolpathStrategyEngine (U05 TaperToolpathGenerator)",
    e_code_family: "E28XX_TAPER_5PASS",
    params: [THK_PARAM, { name: "taper_angle_deg", type: "number", unit: "deg", min: 0.1, max: JM_FA10S_ENVELOPE.max_taper_deg, source: "JM_FA10S_ENVELOPE.max_taper_deg" }, WIRE_PARAM],
    feasibility: "taper <= 30deg; UV travel <= 80mm; H-registers all 0",
    status: "wired",
    provenance: "EDMToolpathStrategyEngine U05 + tech-tables E28XX_TAPER_5PASS + WEDMTaperErrorBudgetEngine",
  },
  {
    id: "open_profile",
    label: "Open profile (edge start, no start-hole)",
    geometry: "open contour entering from stock edge",
    owning_engine: "EDMToolpathStrategyEngine",
    e_code_family: "E12XX_STANDARD_4PASS",
    params: [THK_PARAM, { name: "lead_in_mm", type: "number", unit: "mm", min: 0.5, max: 10, source: "EDMToolpathStrategyEngine" }, WIRE_PARAM],
    feasibility: "entry edge accessible; no start-hole required",
    status: "partial",
    provenance: "EDMToolpathStrategyEngine (open/closed classification)",
  },
  {
    id: "island_multibody",
    label: "Island / multi-body (slug + tabs)",
    geometry: "contour with internal islands / multiple drops",
    owning_engine: "EDMToolpathStrategyEngine (island) + EDMWireSlugCornerTaperEngine",
    e_code_family: "E12XX_STANDARD_4PASS",
    params: [THK_PARAM, { name: "slug_count", type: "number", min: 1, max: 50, source: "feature recognition" }, { name: "tab_count", type: "number", min: 0, max: 8, source: "EDMWireSlugCornerTaperEngine" }, WIRE_PARAM],
    feasibility: "tab plan prevents uncontrolled drop",
    status: "partial",
    provenance: "EDMToolpathStrategyEngine island + EDMWireSlugCornerTaperEngine",
  },
  {
    id: "no_core_slug_retention",
    label: "No-core / slug-retention (tab before drop)",
    geometry: "closed contour where slug must be retained then released",
    owning_engine: "EDMWireSlugCornerTaperEngine",
    e_code_family: "E12XX_STANDARD_4PASS",
    params: [THK_PARAM, { name: "tab_width_mm", type: "number", unit: "mm", min: 0.2, max: 3, source: "EDMWireSlugCornerTaperEngine" }, { name: "tab_position", type: "enum", enum: ["corner", "mid-edge", "operator"], source: "tribal" }, WIRE_PARAM],
    feasibility: "tab holds slug through final skim, releasable",
    status: "partial",
    provenance: "EDMWireSlugCornerTaperEngine",
  },
  {
    id: "closely_spaced_cannelure",
    label: "Closely-spaced / cannelure (halve-feed)",
    geometry: "features pitch < 3x wire-Ø (e.g. 30-TPI cannelure)",
    owning_engine: "EDMMultiPassStrategyEngine (cannelure mode — BUILD)",
    e_code_family: "E12XX_HEAVY_5PASS",
    params: [{ name: "feature_pitch_mm", type: "number", unit: "mm", min: 0.1, max: 5, source: "jm-die-wedm-program-patterns" }, { name: "feed_derate", type: "number", min: 0.5, max: 1.0, source: "wedm-jmd-008 tribal (halve feed)" }, THK_PARAM, WIRE_PARAM],
    feasibility: "halve rough feed when pitch < 3x wire-Ø; debris-short guard",
    status: "partial",
    provenance: "wedm-build-strategies.ts cannelureFeedStrategy (A3) + wedm-jmd-008 + jm-die-003 program patterns (Choctaw/Fiocchi .38 cannelure); owning engine EDMMultiPassStrategyEngine not yet dispatcher-wired for cannelure mode",
  },
  {
    id: "corner_strategy",
    label: "Corner treatment (sharp / blend / over-travel)",
    geometry: "inside corner R < 2x wire-Ø",
    owning_engine: "EDMToolpathStrategyEngine (U03 CornerStrategyAssigner)",
    e_code_family: "",
    params: [{ name: "corner_radius_mm", type: "number", unit: "mm", min: 0, max: 5, source: "feature recognition" }, { name: "corner_feed_factor", type: "number", min: 0.6, max: 1.0, source: "wedm-kb-002 (60% feed)" }, { name: "strategy", type: "enum", enum: ["sharp_pause", "over_travel", "tangent_blend"], source: "EDMToolpathStrategyEngine U03" }],
    feasibility: "R < 2x wire-Ø => reduce feed 60% + Toff bump",
    status: "wired",
    provenance: "EDMToolpathStrategyEngine U03 + wedm-kb-002 + Mitsubishi corner-control",
  },
  {
    id: "start_hole_placement",
    label: "Start-hole placement",
    geometry: "closed contour requiring threaded start hole",
    owning_engine: "EDMStartHoleSetupEngine",
    e_code_family: "",
    params: [{ name: "hole_diameter_mm", type: "number", unit: "mm", min: 0.3, max: 3, source: "EDMStartHoleSetupEngine" }, { name: "position", type: "enum", enum: ["centroid", "corner", "operator"], source: "EDMStartHoleSetupEngine" }, THK_PARAM],
    feasibility: "hole threadable by AWT; clears final contour",
    status: "wired",
    provenance: "EDMStartHoleSetupEngine",
  },
  {
    id: "micro_fine_wire",
    label: "Micro / fine-wire (0.10mm)",
    geometry: "micro-features, fine-wire 0.10mm",
    owning_engine: "WEDMThinWireDerateEngine (MicroEDM path — BUILD)",
    e_code_family: "",
    params: [{ ...WIRE_PARAM, enum: ["0.10"] }, { name: "power_derate", type: "number", min: 0.3, max: 0.8, source: "WEDMThinWireDerateEngine" }, { name: "standoff_mm", type: "number", unit: "mm", min: 0.1, max: 0.25, source: "wedm-sp-005 fine-wire standoff" }, THK_PARAM],
    feasibility: "fine-wire derate; nozzle standoff <= 0.25mm",
    status: "partial",
    provenance: "wedm-build-strategies.ts microFineWireStrategy (A3) + wedm-sp tribal (Makino fine-wire); owning engine WEDMThinWireDerateEngine not yet built/wired (strategy math is the single source of truth)",
  },
  {
    id: "bimaterial",
    label: "Bi-material (e.g. WC insert in steel holder)",
    geometry: "two materials in the cut path",
    owning_engine: "EDMBiMaterialCompensationEngine",
    e_code_family: "E12XX_STANDARD_4PASS",
    params: [{ name: "material_a", type: "enum", enum: ["carbide", "D2", "A2", "S7"], source: "edm-material-db" }, { name: "material_b", type: "enum", enum: ["D2", "A2", "S7", "4140"], source: "edm-material-db" }, THK_PARAM, WIRE_PARAM],
    feasibility: "per-zone params; coated wire for WC zone",
    status: "wired",
    provenance: "EDMBiMaterialCompensationEngine + edm-material-db",
  },
];

/** Look up a type by id. */
export function getToolpathType(id: string): ToolpathType | undefined {
  return WEDM_TOOLPATH_TYPES.find((t) => t.id === id);
}

/** List all type ids (optionally filtered by status). */
export function listToolpathTypes(status?: ToolpathType["status"]): string[] {
  return WEDM_TOOLPATH_TYPES.filter((t) => (status ? t.status === status : true)).map((t) => t.id);
}

/**
 * Validate a requested job against a type's feasibility + the FA-10S envelope.
 * Returns { feasible, blockers[] }. Pure — checks thickness/taper/wire vs envelope.
 */
export function validateAgainstEnvelope(
  typeId: string,
  job: { thickness_mm?: number; taper_angle_deg?: number; wire_diameter_mm?: number },
): { feasible: boolean; blockers: string[] } {
  const t = getToolpathType(typeId);
  const blockers: string[] = [];
  if (!t) return { feasible: false, blockers: ["unknown toolpath type: " + typeId] };
  const env = JM_FA10S_ENVELOPE;
  if (typeof job.thickness_mm === "number" && job.thickness_mm > env.max_workpiece_height_mm) {
    blockers.push("thickness " + job.thickness_mm + "mm > FA10S max " + env.max_workpiece_height_mm + "mm");
  }
  if (typeof job.taper_angle_deg === "number" && job.taper_angle_deg > env.max_taper_deg) {
    blockers.push("taper " + job.taper_angle_deg + "deg > FA10S max " + env.max_taper_deg + "deg");
  }
  if (typeof job.wire_diameter_mm === "number" && !env.wire_diameters_on_hand_mm.includes(job.wire_diameter_mm as 0.25 | 0.2)) {
    blockers.push("wire " + job.wire_diameter_mm + "mm not in on-hand set [" + env.wire_diameters_on_hand_mm.join(", ") + "]");
  }
  return { feasible: blockers.length === 0, blockers };
}
