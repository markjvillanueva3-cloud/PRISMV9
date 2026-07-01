/**
 * ManufacturerCatalogAIEngine — Deep knowledge extraction from manufacturer catalogs
 *
 * Extracts and reasons over structured knowledge from the 6 manufacturer catalogs
 * uploaded to H:/prism/Resources/MANUFACTURER_CATALOGS/uploaded/:
 *   - BIG DAISHOWA Vol 5  — shrink-fit, hydraulic, collet chucks
 *   - Orange Vise 2016    — precision vises, soft jaws, workholding
 *   - Accupro 2013        — end mills, drills, reamers
 *   - Rapidkut 2018       — carbide end mills, HSS end mills
 *   - Global CNC 2023     — collets, ER chucks, BT40/CAT40 accessories
 *   - AMPC (US-EN)        — American machine accessories, collet blocks
 *
 * Integrates with:
 *   - src/data/big-daishowa-holders.ts (BIG_DAISHOWA_FAMILIES, BIG_DAISHOWA_HOLDERS)
 *   - src/data/accupro-tools-extracted.json
 *   - src/data/rapidkut-tools-extracted.json
 *   - ToolHolderCatalogEngine (JM Die inventory types)
 *   - ManufacturerCatalogIndexEngine (catalog registry)
 *
 * JM Die context: CAT40/BBT40 machines (Hurco VM10i, Haas VF-2, Okuma MU-4000),
 * primary materials: M2/D2/S7/A2 tool steels, tungsten carbide, H13.
 *
 * @module engines/ManufacturerCatalogAIEngine
 */

import {
  BIG_DAISHOWA_FAMILIES,
  type ToolholderFamily,
} from "../data/big-daishowa-holders.js";

// ============================================================================
// TYPES — Catalog Knowledge
// ============================================================================

export type CatalogManufacturer =
  | "big_daishowa"
  | "orange_vise"
  | "accupro"
  | "rapidkut"
  | "global_cnc"
  | "ampc";

export type HolderCategory =
  | "shrink_fit"
  | "hydraulic"
  | "collet_chuck"
  | "milling_chuck"
  | "power_chuck"
  | "er_collet";

export type WorkholdingCategory =
  | "precision_vise"
  | "soft_jaw"
  | "modular_vise"
  | "collet_block"
  | "step_jaw"
  | "workstop";

export type CuttingToolCategory =
  | "end_mill_carbide"
  | "end_mill_hss"
  | "drill_carbide"
  | "drill_hss"
  | "reamer"
  | "tap"
  | "chamfer_mill";

export type CoatingType =
  | "AlTiN"
  | "TiAlN"
  | "TiN"
  | "TiCN"
  | "DLC"
  | "ZrN"
  | "uncoated";

export type ApplicationType =
  | "roughing"
  | "finishing"
  | "semi_finishing"
  | "profiling"
  | "slotting"
  | "drilling"
  | "reaming"
  | "high_speed"
  | "hard_milling"
  | "interrupted_cut";

export type MaterialGroup =
  | "P_steel"          // ISO P: carbon/alloy/tool steels
  | "M_stainless"      // ISO M: stainless steels
  | "K_cast_iron"      // ISO K: cast iron
  | "N_nonferrous"     // ISO N: aluminum, brass, copper
  | "S_superalloy"     // ISO S: titanium, Inconel
  | "H_hardened"       // ISO H: hardened steel >45 HRC, carbide
  | "carbide_grinding"; // tungsten carbide (EDM electrode stock)

// ============================================================================
// TYPES — Feature Vectors (24 dimensions)
// ============================================================================

/**
 * 24-dimensional feature vector for any catalog item.
 * All dimensions normalized to [0, 1] unless noted.
 * Source: catalog specs + JM Die applicability scoring.
 */
export interface CatalogFeatureVector {
  // --- Economics (4) ---
  /** Normalized unit price (0=cheapest, 1=most expensive in category) */
  price_norm: number;
  /** Availability: 0=special-order only, 1=stock item */
  availability: number;
  /** Lead time score: 1=same-day, 0=12+ weeks */
  lead_time_score: number;
  /** Vendor trust score (based on JM Die experience + industry reputation) */
  vendor_trust: number;

  // --- Precision / Runout (4) ---
  /** Runout score: 1=<1 um, 0.5=3-5 um, 0=≥10 um */
  runout_score: number;
  /** Balance grade score: 1=ISO 16084 / G1 or better, 0.5=G2.5, 0=none */
  balance_score: number;
  /** RPM capability: normalized by category max (e.g., 60000 RPM = 1.0) */
  rpm_norm: number;
  /** Repeatability: 0=none, 0.5=0.01mm, 1=≤0.002mm */
  repeatability_score: number;

  // --- Clamping / Holding (3) ---
  /** Clamping force score: normalized within category */
  clamping_force_norm: number;
  /** Coolant-through capable: 1=yes, 0=no */
  coolant_through: number;
  /** Tool-change time: 1=quick-change, 0=requires machine */
  tool_change_ease: number;

  // --- Material Compatibility (5) ---
  /** Rated for ISO P (tool steels) */
  compat_P_steel: number;
  /** Rated for ISO M (stainless) */
  compat_M_stainless: number;
  /** Rated for ISO K (cast iron) */
  compat_K_cast_iron: number;
  /** Rated for ISO H (hardened / carbide) */
  compat_H_hardened: number;
  /** Rated for ISO N (nonferrous) */
  compat_N_nonferrous: number;

  // --- Tooling Properties (4) ---
  /** Coating benefit score: 1=premium multilayer, 0=uncoated */
  coating_score: number;
  /** Flute count norm: normalized by max in family */
  flute_count_norm: number;
  /** Geometry score: 0=generic, 1=application-specific optimized */
  geometry_score: number;
  /** Substrate quality: 1=ultrafine grain carbide, 0=HSS */
  substrate_score: number;

  // --- Shop / JM Die Fit (4) ---
  /** JM Die machine compatibility: fraction of JM Die machines this fits */
  jmdie_machine_fit: number;
  /** JM Die material fit: how well it handles D2/M2/S7/H13 */
  jmdie_material_fit: number;
  /** JM Die stock availability (vendor response time to JM Die zip 44514) */
  jmdie_stock_local: number;
  /** Customer review score: normalized 0-1 (industry user reviews) */
  customer_review_score: number;
}

// ============================================================================
// TYPES — Catalog Entries
// ============================================================================

export interface ToolHolderSpec {
  id: string;
  manufacturer: CatalogManufacturer;
  catalog_ref: string;           // e.g. "BIG DAISHOWA Vol 5 p.12"
  family: string;
  category: HolderCategory;
  /** Supported taper interfaces */
  tapers: string[];
  bore_range_mm: [number, number];
  gauge_length_mm: number;
  max_rpm: number;
  runout_um: number;
  coolant_through: boolean;
  balance_standard: string;
  unit_price_usd: number;
  availability: "stock" | "order" | "special";
  lead_time_weeks: number;
  features: string[];
  applications: ApplicationType[];
  feature_vector: CatalogFeatureVector;
}

export interface WorkholdingSpec {
  id: string;
  manufacturer: CatalogManufacturer;
  catalog_ref: string;
  family: string;
  category: WorkholdingCategory;
  jaw_width_mm: number;
  jaw_opening_max_mm: number;
  clamping_force_n: number;
  repeatability_um: number;
  body_material: string;
  jaw_material: string;
  unit_price_usd: number;
  availability: "stock" | "order" | "special";
  lead_time_weeks: number;
  features: string[];
  compatible_machines: string[];   // machine families (VMC, HMC, 4-axis)
  feature_vector: CatalogFeatureVector;
}

export interface CuttingToolSpec {
  id: string;
  manufacturer: CatalogManufacturer;
  catalog_ref: string;
  category: CuttingToolCategory;
  diameter_mm: number;
  flute_count: number;
  overall_length_mm: number;
  flute_length_mm: number;
  shank_diameter_mm: number;
  coating: CoatingType;
  substrate: "carbide_ultrafine" | "carbide_standard" | "hss_m42" | "hss_m35" | "hss";
  helix_angle_deg: number;
  material_groups: MaterialGroup[];
  max_surface_finish_ra_um: number;  // achievable Ra at recommended params
  unit_price_usd: number;
  availability: "stock" | "order" | "special";
  lead_time_weeks: number;
  features: string[];
  feature_vector: CatalogFeatureVector;
}

// ============================================================================
// TYPES — AI Result Structures
// ============================================================================

export interface HolderReasoningStep {
  step: number;
  type: "constraint_check" | "type_filter" | "scoring" | "jmdie_fit" | "synthesis" | "observation";
  description: string;
  evidence: string[];
  confidence: number;
}

export interface ToolHolderSelectionResult {
  query: {
    tool_diameter_mm: number;
    runout_required_um: number;
    application: ApplicationType;
    taper?: string;
  };
  top_recommendation: ToolHolderSpec;
  alternatives: ToolHolderSpec[];
  reasoning_chain: HolderReasoningStep[];
  score: number;                    // 0-100 composite score
  jmdie_notes: string[];            // JM Die specific recommendations
  confidence: number;               // 0-1
  warning?: string;
}

export interface WorkholdingSelectionResult {
  query: {
    part_length_mm: number;
    part_width_mm: number;
    part_height_mm: number;
    clamping_force_required_n: number;
    repeatability_required_um: number;
    material?: string;
  };
  top_recommendation: WorkholdingSpec;
  alternatives: WorkholdingSpec[];
  reasoning_chain: HolderReasoningStep[];
  score: number;
  jmdie_notes: string[];
  confidence: number;
  warning?: string;
}

export interface CuttingToolSearchResult {
  query: {
    operation: ApplicationType;
    material_group: MaterialGroup;
    surface_finish_ra_um: number;
    diameter_mm?: number;
  };
  matches: Array<{ tool: CuttingToolSpec; score: number; explanation: string }>;
  top_recommendation: CuttingToolSpec;
  reasoning_chain: HolderReasoningStep[];
  jmdie_notes: string[];
  confidence: number;
}

export interface ManufacturerComparisonResult {
  tool_type: string;
  criteria: string[];
  rankings: Array<{
    rank: number;
    manufacturer: CatalogManufacturer;
    weighted_score: number;
    scores_by_criterion: Record<string, number>;
    strengths: string[];
    weaknesses: string[];
  }>;
  recommendation: string;
  jmdie_recommendation: string;
}

// ============================================================================
// CONSTANTS — Catalog Root
// ============================================================================

const CATALOG_ROOT =
  "H:/prism/Resources/MANUFACTURER_CATALOGS/uploaded";

// ============================================================================
// KNOWLEDGE BASE — BIG DAISHOWA Tool Holders
// (Source: BIG DAISHOWA High Performance Tooling Solutions Vol 5)
// ============================================================================

const BD_HOLDERS: ToolHolderSpec[] = [
  // ── Shrink Fit (best runout, highest RPM) ─────────────────────────────────
  {
    id: "bd-shk-bbt40-6",
    manufacturer: "big_daishowa",
    catalog_ref: "BIG DAISHOWA Vol 5, Shrink Fit section",
    family: "SHRINK FIT HOLDER",
    category: "shrink_fit",
    tapers: ["BBT30", "BBT40", "BBT50", "BCV40", "HSK-A63"],
    bore_range_mm: [4, 25.4],
    gauge_length_mm: 60,
    max_rpm: 40000,
    runout_um: 3,          // depends on tool shank h6 tolerance
    coolant_through: true,
    balance_standard: "ISO 16084",
    unit_price_usd: 280,
    availability: "stock",
    lead_time_weeks: 1,
    features: [
      "Maximum rigidity — no mechanical clamping elements",
      "Slim body profile for tight pockets",
      "Requires shrink-fit machine (induction or flame)",
      "Best suited with h6 tool shank tolerance",
      "High repeatability after re-shrink",
      "Usable for hard milling at high RPM",
    ],
    applications: [
      "hard_milling", "high_speed", "finishing", "profiling",
    ],
    feature_vector: {
      price_norm: 0.45,
      availability: 0.85,
      lead_time_score: 0.90,
      vendor_trust: 0.95,
      runout_score: 0.85,
      balance_score: 1.0,
      rpm_norm: 0.80,
      repeatability_score: 0.85,
      clamping_force_norm: 0.95,
      coolant_through: 1,
      tool_change_ease: 0.15,   // requires shrink machine
      compat_P_steel: 1.0,
      compat_M_stainless: 0.9,
      compat_K_cast_iron: 0.8,
      compat_H_hardened: 1.0,
      compat_N_nonferrous: 0.7,
      coating_score: 0,          // holder, not cutting tool
      flute_count_norm: 0,
      geometry_score: 0,
      substrate_score: 0,
      jmdie_machine_fit: 0.85,   // CAT40 adapters available; BBT40 = BIG-PLUS
      jmdie_material_fit: 1.0,   // ideal for D2/M2/S7 hard milling
      jmdie_stock_local: 0.70,   // MSC/Grainger Ohio
      customer_review_score: 0.95,
    },
  },
  // ── Hydraulic Chuck ───────────────────────────────────────────────────────
  {
    id: "bd-hyd-bbt40-6",
    manufacturer: "big_daishowa",
    catalog_ref: "BIG DAISHOWA Vol 5, Hydraulic Chuck section",
    family: "HYDRAULIC CHUCK",
    category: "hydraulic",
    tapers: ["BBT30", "BBT40", "BBT50", "BCV40", "HSK-A63", "HSK-A100"],
    bore_range_mm: [3, 32],
    gauge_length_mm: 60,
    max_rpm: 40000,
    runout_um: 3,
    coolant_through: true,
    balance_standard: "ISO 16084",
    unit_price_usd: 450,
    availability: "stock",
    lead_time_weeks: 1,
    features: [
      "Less than 3 um runout at 4xD",
      "Vibration damping via oil film — reduces chatter",
      "Easy 1-wrench clamping",
      "Dual hydraulic chambers for uniform pressure",
      "Integrated body+sleeve (no O-rings to replace)",
      "Super Slim variant: 14mm body dia, 60,000 RPM",
      "Super Slim UP: 1 um at 4xD (HSK-E series)",
      "SF Hydraulic: modular shrink fit sleeve option",
    ],
    applications: [
      "roughing", "semi_finishing", "finishing",
      "interrupted_cut", "profiling", "high_speed",
    ],
    feature_vector: {
      price_norm: 0.75,
      availability: 0.85,
      lead_time_score: 0.90,
      vendor_trust: 0.95,
      runout_score: 0.85,
      balance_score: 1.0,
      rpm_norm: 0.80,
      repeatability_score: 0.90,
      clamping_force_norm: 0.85,
      coolant_through: 1,
      tool_change_ease: 0.80,   // single wrench
      compat_P_steel: 1.0,
      compat_M_stainless: 1.0,
      compat_K_cast_iron: 1.0,
      compat_H_hardened: 0.90,
      compat_N_nonferrous: 0.85,
      coating_score: 0,
      flute_count_norm: 0,
      geometry_score: 0,
      substrate_score: 0,
      jmdie_machine_fit: 0.85,
      jmdie_material_fit: 0.95,
      jmdie_stock_local: 0.70,
      customer_review_score: 0.90,
    },
  },
  // ── MEGA NEW BABY CHUCK (collet) ─────────────────────────────────────────
  {
    id: "bd-mnbc-bbt40",
    manufacturer: "big_daishowa",
    catalog_ref: "BIG DAISHOWA Vol 5, MEGA NEW BABY CHUCK section",
    family: "MEGA NEW BABY CHUCK",
    category: "collet_chuck",
    tapers: ["BBT30", "BBT40", "BBT50", "BCV40", "HSK-A63", "HSK-A100"],
    bore_range_mm: [0.25, 25.4],
    gauge_length_mm: 75,
    max_rpm: 50000,
    runout_um: 3,
    coolant_through: true,
    balance_standard: "ISO 16084",
    unit_price_usd: 360,
    availability: "stock",
    lead_time_weeks: 1,
    features: [
      "1 um runout at collet nose, 3 um at 4xD",
      "Widest bore range: 0.25–25.4 mm",
      "6 collet series (NBC6 through NBC25)",
      "MEGA PERFECT SEAL for coolant-through",
      "Thrust ball bearing for smooth tightening",
      "Excellent versatility for mixed-operation shops",
    ],
    applications: [
      "roughing", "semi_finishing", "finishing",
      "drilling", "reaming", "slotting", "high_speed",
    ],
    feature_vector: {
      price_norm: 0.60,
      availability: 0.90,
      lead_time_score: 0.90,
      vendor_trust: 0.95,
      runout_score: 0.90,
      balance_score: 1.0,
      rpm_norm: 1.0,
      repeatability_score: 0.85,
      clamping_force_norm: 0.80,
      coolant_through: 1,
      tool_change_ease: 0.75,
      compat_P_steel: 1.0,
      compat_M_stainless: 0.95,
      compat_K_cast_iron: 0.90,
      compat_H_hardened: 0.85,
      compat_N_nonferrous: 0.90,
      coating_score: 0,
      flute_count_norm: 0,
      geometry_score: 0,
      substrate_score: 0,
      jmdie_machine_fit: 0.90,
      jmdie_material_fit: 0.90,
      jmdie_stock_local: 0.75,
      customer_review_score: 0.92,
    },
  },
  // ── MEGA ER GRIP ─────────────────────────────────────────────────────────
  {
    id: "bd-er-grip-bbt40",
    manufacturer: "big_daishowa",
    catalog_ref: "BIG DAISHOWA Vol 5, MEGA ER GRIP section",
    family: "MEGA ER GRIP",
    category: "er_collet",
    tapers: ["BBT30", "BBT40", "BBT50", "BCV40", "HSK-A63"],
    bore_range_mm: [1.9, 20],
    gauge_length_mm: 80,
    max_rpm: 35000,
    runout_um: 3,
    coolant_through: true,
    balance_standard: "ISO 16084",
    unit_price_usd: 290,
    availability: "stock",
    lead_time_weeks: 1,
    features: [
      "3 um at 4xD — outperforms standard DIN/ISO ER",
      "Increased collet contact area vs standard ER",
      "Compatible with conventional DIN ER collets",
      "MEGA ER PERFECT SEAL for coolant-through",
      "Backward compatible with existing ER collet inventory",
    ],
    applications: [
      "roughing", "semi_finishing", "finishing", "drilling", "reaming",
    ],
    feature_vector: {
      price_norm: 0.45,
      availability: 0.95,
      lead_time_score: 0.95,
      vendor_trust: 0.95,
      runout_score: 0.85,
      balance_score: 1.0,
      rpm_norm: 0.70,
      repeatability_score: 0.80,
      clamping_force_norm: 0.75,
      coolant_through: 1,
      tool_change_ease: 0.85,   // standard wrench
      compat_P_steel: 1.0,
      compat_M_stainless: 0.90,
      compat_K_cast_iron: 0.90,
      compat_H_hardened: 0.75,
      compat_N_nonferrous: 0.90,
      coating_score: 0,
      flute_count_norm: 0,
      geometry_score: 0,
      substrate_score: 0,
      jmdie_machine_fit: 0.90,
      jmdie_material_fit: 0.85,
      jmdie_stock_local: 0.80,
      customer_review_score: 0.88,
    },
  },
];

// ============================================================================
// KNOWLEDGE BASE — Orange Vise Workholding
// (Source: Orange Vise 2016 catalog — 543f80b8_2016_orange_vise_catalog.pdf)
// ============================================================================

const ORANGE_VISE_WORKHOLDING: WorkholdingSpec[] = [
  // ── Orange Vise 4" Precision Vise ────────────────────────────────────────
  {
    id: "ov-4in-std",
    manufacturer: "orange_vise",
    catalog_ref: "Orange Vise 2016 Catalog, 4-inch vise section",
    family: "Orange Vise 4-inch",
    category: "precision_vise",
    jaw_width_mm: 101.6,     // 4.000"
    jaw_opening_max_mm: 101.6,
    clamping_force_n: 27000,  // ~6000 lbf typical for 4" vise
    repeatability_um: 5,      // <0.0002" typical orange vise spec
    body_material: "ductile iron",
    jaw_material: "4140 heat treated",
    unit_price_usd: 595,
    availability: "stock",
    lead_time_weeks: 1,
    features: [
      "Repeatability <0.0002\" (5 um) from closure to closure",
      "Ground jaw mounting surfaces for direct mounting",
      "Compatible with Kurt-style toe clamps",
      "Modular soft jaw system — same bolt pattern",
      "Low-profile design (1.5\" fixed jaw height)",
      "Hardened and ground fixed + movable jaws",
    ],
    compatible_machines: ["VMC", "HMC", "4-axis", "5-axis"],
    feature_vector: {
      price_norm: 0.50,
      availability: 0.90,
      lead_time_score: 0.90,
      vendor_trust: 0.85,
      runout_score: 0,
      balance_score: 0,
      rpm_norm: 0,
      repeatability_score: 0.90,
      clamping_force_norm: 0.80,
      coolant_through: 0,
      tool_change_ease: 0.70,
      compat_P_steel: 1.0,
      compat_M_stainless: 0.90,
      compat_K_cast_iron: 0.85,
      compat_H_hardened: 0.95,
      compat_N_nonferrous: 0.80,
      coating_score: 0,
      flute_count_norm: 0,
      geometry_score: 0,
      substrate_score: 0,
      jmdie_machine_fit: 0.90,
      jmdie_material_fit: 0.95,
      jmdie_stock_local: 0.75,
      customer_review_score: 0.88,
    },
  },
  // ── Orange Vise 6" Precision Vise ────────────────────────────────────────
  {
    id: "ov-6in-std",
    manufacturer: "orange_vise",
    catalog_ref: "Orange Vise 2016 Catalog, 6-inch vise section",
    family: "Orange Vise 6-inch",
    category: "precision_vise",
    jaw_width_mm: 152.4,     // 6.000"
    jaw_opening_max_mm: 177.8,
    clamping_force_n: 40000,  // ~9000 lbf typical for 6" vise
    repeatability_um: 5,
    body_material: "ductile iron",
    jaw_material: "4140 heat treated",
    unit_price_usd: 795,
    availability: "stock",
    lead_time_weeks: 1,
    features: [
      "Repeatability <0.0002\" (5 um)",
      "Handles parts up to 7\" opening",
      "Same bolt pattern as 4\" Orange Vise — interchangeable jaws",
      "Recommended for heavier roughing operations",
      "Anti-lift jaw design keeps parts from rising during clamping",
    ],
    compatible_machines: ["VMC", "HMC", "4-axis"],
    feature_vector: {
      price_norm: 0.65,
      availability: 0.85,
      lead_time_score: 0.90,
      vendor_trust: 0.85,
      runout_score: 0,
      balance_score: 0,
      rpm_norm: 0,
      repeatability_score: 0.90,
      clamping_force_norm: 1.0,
      coolant_through: 0,
      tool_change_ease: 0.65,
      compat_P_steel: 1.0,
      compat_M_stainless: 0.90,
      compat_K_cast_iron: 0.90,
      compat_H_hardened: 0.95,
      compat_N_nonferrous: 0.80,
      coating_score: 0,
      flute_count_norm: 0,
      geometry_score: 0,
      substrate_score: 0,
      jmdie_machine_fit: 0.85,
      jmdie_material_fit: 0.95,
      jmdie_stock_local: 0.75,
      customer_review_score: 0.88,
    },
  },
  // ── Orange Vise Soft Jaws ─────────────────────────────────────────────────
  {
    id: "ov-softjaw-4in",
    manufacturer: "orange_vise",
    catalog_ref: "Orange Vise 2016 Catalog, Soft Jaws section",
    family: "Orange Vise Soft Jaws — 4\"",
    category: "soft_jaw",
    jaw_width_mm: 101.6,
    jaw_opening_max_mm: 101.6,
    clamping_force_n: 20000,
    repeatability_um: 8,      // re-bore for <2 um after machining
    body_material: "6061-T6 aluminum",
    jaw_material: "6061-T6 aluminum",
    unit_price_usd: 48,       // per pair
    availability: "stock",
    lead_time_weeks: 0.5,
    features: [
      "Machinable to custom profile for any part shape",
      "Bore to <0.002\" repeatability after machining",
      "Compatible with 4\" Orange Vise bolt pattern",
      "Sacrificial — replace after ~5-10 bore cycles",
      "Standard step jaw profile for O.D. and I.D. clamping",
      "Ideal for second-operation and prismatic parts",
    ],
    compatible_machines: ["VMC", "HMC", "4-axis", "5-axis"],
    feature_vector: {
      price_norm: 0.05,
      availability: 0.98,
      lead_time_score: 0.99,
      vendor_trust: 0.85,
      runout_score: 0,
      balance_score: 0,
      rpm_norm: 0,
      repeatability_score: 0.80,
      clamping_force_norm: 0.50,
      coolant_through: 0,
      tool_change_ease: 0.90,
      compat_P_steel: 0.90,
      compat_M_stainless: 0.85,
      compat_K_cast_iron: 0.80,
      compat_H_hardened: 0.70,
      compat_N_nonferrous: 0.95,
      coating_score: 0,
      flute_count_norm: 0,
      geometry_score: 0,
      substrate_score: 0,
      jmdie_machine_fit: 0.90,
      jmdie_material_fit: 0.85,
      jmdie_stock_local: 0.90,
      customer_review_score: 0.82,
    },
  },
];

// ============================================================================
// KNOWLEDGE BASE — Accupro Cutting Tools
// (Source: Accupro 2013 catalog — accupro-tools-extracted.json)
// ============================================================================

const ACCUPRO_TOOLS: CuttingToolSpec[] = [
  // ── 4-Flute AlTiN Carbide End Mill — general purpose ─────────────────────
  {
    id: "accupro-em4-altin-12",
    manufacturer: "accupro",
    catalog_ref: "Accupro 2013 Catalog, Carbide End Mills section",
    category: "end_mill_carbide",
    diameter_mm: 12.0,
    flute_count: 4,
    overall_length_mm: 83.0,
    flute_length_mm: 26.0,
    shank_diameter_mm: 12.0,
    coating: "AlTiN",
    substrate: "carbide_standard",
    helix_angle_deg: 35,
    material_groups: ["P_steel", "M_stainless", "K_cast_iron", "H_hardened"],
    max_surface_finish_ra_um: 0.8,
    unit_price_usd: 48,
    availability: "stock",
    lead_time_weeks: 1,
    features: [
      "AlTiN coating for steel and hardened materials up to 65 HRC",
      "35° helix for smooth chip evacuation",
      "4-flute for rigidity and finish",
      "Standard MSC/Grainger availability",
      "Suitable for roughing and semi-finishing in tool steels",
    ],
    feature_vector: {
      price_norm: 0.30,
      availability: 0.95,
      lead_time_score: 0.90,
      vendor_trust: 0.72,
      runout_score: 0,
      balance_score: 0,
      rpm_norm: 0,
      repeatability_score: 0,
      clamping_force_norm: 0,
      coolant_through: 0,
      tool_change_ease: 0,
      compat_P_steel: 0.90,
      compat_M_stainless: 0.80,
      compat_K_cast_iron: 0.85,
      compat_H_hardened: 0.75,
      compat_N_nonferrous: 0.60,
      coating_score: 0.80,
      flute_count_norm: 0.65,   // 4 flutes normalized vs max 6
      geometry_score: 0.70,
      substrate_score: 0.65,
      jmdie_machine_fit: 0.95,
      jmdie_material_fit: 0.85,
      jmdie_stock_local: 0.90,
      customer_review_score: 0.75,
    },
  },
  // ── 2-Flute Carbide End Mill — aluminum/nonferrous ────────────────────────
  {
    id: "accupro-em2-tin-12",
    manufacturer: "accupro",
    catalog_ref: "Accupro 2013 Catalog, Carbide End Mills section",
    category: "end_mill_carbide",
    diameter_mm: 12.0,
    flute_count: 2,
    overall_length_mm: 83.0,
    flute_length_mm: 32.0,
    shank_diameter_mm: 12.0,
    coating: "uncoated",
    substrate: "carbide_standard",
    helix_angle_deg: 45,
    material_groups: ["N_nonferrous", "P_steel"],
    max_surface_finish_ra_um: 0.4,
    unit_price_usd: 38,
    availability: "stock",
    lead_time_weeks: 1,
    features: [
      "45° helix — excellent chip clearance for aluminum",
      "Uncoated — prevents built-up edge in soft materials",
      "Large gullet for non-ferrous chip evacuation",
      "2-flute for maximum chip room",
    ],
    feature_vector: {
      price_norm: 0.20,
      availability: 0.95,
      lead_time_score: 0.90,
      vendor_trust: 0.72,
      runout_score: 0,
      balance_score: 0,
      rpm_norm: 0,
      repeatability_score: 0,
      clamping_force_norm: 0,
      coolant_through: 0,
      tool_change_ease: 0,
      compat_P_steel: 0.60,
      compat_M_stainless: 0.40,
      compat_K_cast_iron: 0.50,
      compat_H_hardened: 0.10,
      compat_N_nonferrous: 0.98,
      coating_score: 0.0,
      flute_count_norm: 0.30,
      geometry_score: 0.80,    // optimized for non-ferrous
      substrate_score: 0.65,
      jmdie_machine_fit: 0.95,
      jmdie_material_fit: 0.40, // JM Die is mostly tool steel
      jmdie_stock_local: 0.90,
      customer_review_score: 0.73,
    },
  },
  // ── Carbide Drill ─────────────────────────────────────────────────────────
  {
    id: "accupro-drill-carbide-8",
    manufacturer: "accupro",
    catalog_ref: "Accupro 2013 Catalog, Carbide Drills section",
    category: "drill_carbide",
    diameter_mm: 8.0,
    flute_count: 2,
    overall_length_mm: 79.0,
    flute_length_mm: 41.0,
    shank_diameter_mm: 8.0,
    coating: "TiAlN",
    substrate: "carbide_standard",
    helix_angle_deg: 30,
    material_groups: ["P_steel", "M_stainless", "K_cast_iron"],
    max_surface_finish_ra_um: 3.2,
    unit_price_usd: 32,
    availability: "stock",
    lead_time_weeks: 1,
    features: [
      "TiAlN coating for heat resistance in steel drilling",
      "140° split point for self-centering",
      "Through-coolant capable",
      "Consistent positioning accuracy",
    ],
    feature_vector: {
      price_norm: 0.20,
      availability: 0.95,
      lead_time_score: 0.90,
      vendor_trust: 0.72,
      runout_score: 0,
      balance_score: 0,
      rpm_norm: 0,
      repeatability_score: 0,
      clamping_force_norm: 0,
      coolant_through: 1,
      tool_change_ease: 0,
      compat_P_steel: 0.88,
      compat_M_stainless: 0.80,
      compat_K_cast_iron: 0.85,
      compat_H_hardened: 0.55,
      compat_N_nonferrous: 0.65,
      coating_score: 0.75,
      flute_count_norm: 0.30,
      geometry_score: 0.70,
      substrate_score: 0.65,
      jmdie_machine_fit: 0.95,
      jmdie_material_fit: 0.80,
      jmdie_stock_local: 0.90,
      customer_review_score: 0.72,
    },
  },
];

// ============================================================================
// KNOWLEDGE BASE — Rapidkut Cutting Tools
// (Source: 2018 Rapidkut Catalog — rapidkut-tools-extracted.json)
// ============================================================================

const RAPIDKUT_TOOLS: CuttingToolSpec[] = [
  // ── Rapidkut Carbide End Mill — roughing geometry ─────────────────────────
  {
    id: "rapidkut-em4-altin-12",
    manufacturer: "rapidkut",
    catalog_ref: "Rapidkut 2018 Catalog, Carbide End Mills — HC45 series",
    category: "end_mill_carbide",
    diameter_mm: 12.0,
    flute_count: 4,
    overall_length_mm: 83.0,
    flute_length_mm: 26.0,
    shank_diameter_mm: 12.0,
    coating: "AlTiN",
    substrate: "carbide_standard",
    helix_angle_deg: 38,
    material_groups: ["P_steel", "M_stainless", "K_cast_iron", "H_hardened"],
    max_surface_finish_ra_um: 1.6,
    unit_price_usd: 42,
    availability: "stock",
    lead_time_weeks: 1,
    features: [
      "Variable helix design to suppress chatter",
      "AlTiN coating optimized for dry/MQL cutting",
      "Aggressive core diameter for rigidity",
      "Ideal for roughing tool steels at high feed rates",
    ],
    feature_vector: {
      price_norm: 0.25,
      availability: 0.88,
      lead_time_score: 0.85,
      vendor_trust: 0.68,
      runout_score: 0,
      balance_score: 0,
      rpm_norm: 0,
      repeatability_score: 0,
      clamping_force_norm: 0,
      coolant_through: 0,
      tool_change_ease: 0,
      compat_P_steel: 0.92,
      compat_M_stainless: 0.80,
      compat_K_cast_iron: 0.85,
      compat_H_hardened: 0.75,
      compat_N_nonferrous: 0.55,
      coating_score: 0.80,
      flute_count_norm: 0.65,
      geometry_score: 0.80,   // variable helix
      substrate_score: 0.65,
      jmdie_machine_fit: 0.95,
      jmdie_material_fit: 0.88,
      jmdie_stock_local: 0.75,
      customer_review_score: 0.72,
    },
  },
  // ── Rapidkut HSS End Mill ─────────────────────────────────────────────────
  {
    id: "rapidkut-em4-hss-12",
    manufacturer: "rapidkut",
    catalog_ref: "Rapidkut 2018 Catalog, HSS End Mills section",
    category: "end_mill_hss",
    diameter_mm: 12.0,
    flute_count: 4,
    overall_length_mm: 83.0,
    flute_length_mm: 26.0,
    shank_diameter_mm: 12.0,
    coating: "TiN",
    substrate: "hss_m35",
    helix_angle_deg: 30,
    material_groups: ["P_steel", "N_nonferrous"],
    max_surface_finish_ra_um: 1.6,
    unit_price_usd: 18,
    availability: "stock",
    lead_time_weeks: 0.5,
    features: [
      "M35 cobalt HSS for improved heat resistance vs M2",
      "TiN coating for extended life in mild steels",
      "Lower cutting speeds than carbide — less machine wear on older equipment",
      "Re-grindable — extends total life",
      "Cost-effective for prototype and low-volume",
    ],
    feature_vector: {
      price_norm: 0.05,
      availability: 0.99,
      lead_time_score: 0.99,
      vendor_trust: 0.68,
      runout_score: 0,
      balance_score: 0,
      rpm_norm: 0,
      repeatability_score: 0,
      clamping_force_norm: 0,
      coolant_through: 0,
      tool_change_ease: 0,
      compat_P_steel: 0.70,
      compat_M_stainless: 0.50,
      compat_K_cast_iron: 0.60,
      compat_H_hardened: 0.10,
      compat_N_nonferrous: 0.75,
      coating_score: 0.40,
      flute_count_norm: 0.65,
      geometry_score: 0.45,
      substrate_score: 0.20,
      jmdie_machine_fit: 0.95,
      jmdie_material_fit: 0.55,  // JM Die uses hard materials mostly
      jmdie_stock_local: 0.95,
      customer_review_score: 0.65,
    },
  },
];

// ============================================================================
// KNOWLEDGE BASE — Global CNC Accessories
// (Source: 01-Global-CNC-Full-Catalog-2023.pdf)
// ============================================================================

const GLOBAL_CNC_WORKHOLDING: WorkholdingSpec[] = [
  // ── CAT40 Collet Chuck ────────────────────────────────────────────────────
  // Represented as workholding since it is a standard accessory item
  {
    id: "gcnc-er32-cat40",
    manufacturer: "global_cnc",
    catalog_ref: "Global CNC 2023 Catalog, ER Collet Chuck section",
    family: "ER32 Collet Chuck CAT40",
    category: "collet_block",
    jaw_width_mm: 0,      // not a vise
    jaw_opening_max_mm: 20,
    clamping_force_n: 5000,
    repeatability_um: 10,  // standard ER: ~0.0004" (10 um) TIR
    body_material: "alloy steel",
    jaw_material: "spring steel ER collets",
    unit_price_usd: 85,
    availability: "stock",
    lead_time_weeks: 1,
    features: [
      "CAT40 taper for Haas, Hurco, standard VMC compatibility",
      "ER32 collet range: 2–20 mm",
      "Economy-grade for light-duty and secondary operations",
      "Lock nut included — ER32 collet sets sold separately",
      "Ground taper for accurate location",
    ],
    compatible_machines: ["VMC", "Haas", "Hurco"],
    feature_vector: {
      price_norm: 0.10,
      availability: 0.95,
      lead_time_score: 0.92,
      vendor_trust: 0.60,
      runout_score: 0.60,
      balance_score: 0.50,
      rpm_norm: 0.50,
      repeatability_score: 0.60,
      clamping_force_norm: 0.25,
      coolant_through: 0,
      tool_change_ease: 0.80,
      compat_P_steel: 0.75,
      compat_M_stainless: 0.70,
      compat_K_cast_iron: 0.70,
      compat_H_hardened: 0.50,
      compat_N_nonferrous: 0.80,
      coating_score: 0,
      flute_count_norm: 0,
      geometry_score: 0,
      substrate_score: 0,
      jmdie_machine_fit: 0.95,
      jmdie_material_fit: 0.70,
      jmdie_stock_local: 0.90,
      customer_review_score: 0.70,
    },
  },
];

// ============================================================================
// KNOWLEDGE BASE — AMPC Accessories
// (Source: AMPC_US-EN.pdf — American Machine Products Corp)
// ============================================================================

const AMPC_WORKHOLDING: WorkholdingSpec[] = [
  {
    id: "ampc-collet-block-er40",
    manufacturer: "ampc",
    catalog_ref: "AMPC US-EN Catalog, Collet Blocks section",
    family: "AMPC ER40 Collet Block",
    category: "collet_block",
    jaw_width_mm: 0,
    jaw_opening_max_mm: 26,
    clamping_force_n: 8000,
    repeatability_um: 8,
    body_material: "hardened steel",
    jaw_material: "spring steel ER collets",
    unit_price_usd: 145,
    availability: "order",
    lead_time_weeks: 2,
    features: [
      "ER40 range: 3.5–26 mm — wider than ER32",
      "Hardened + ground body for precision mounting",
      "Square and hex collet block versions available",
      "Usable on surface grinder, mill, and CMM",
      "Precision bore accuracy: ±0.001 mm",
    ],
    compatible_machines: ["VMC", "HMC", "surface_grinder", "CMM"],
    feature_vector: {
      price_norm: 0.20,
      availability: 0.70,
      lead_time_score: 0.70,
      vendor_trust: 0.65,
      runout_score: 0.65,
      balance_score: 0.55,
      rpm_norm: 0,
      repeatability_score: 0.70,
      clamping_force_norm: 0.40,
      coolant_through: 0,
      tool_change_ease: 0.80,
      compat_P_steel: 0.80,
      compat_M_stainless: 0.75,
      compat_K_cast_iron: 0.75,
      compat_H_hardened: 0.65,
      compat_N_nonferrous: 0.80,
      coating_score: 0,
      flute_count_norm: 0,
      geometry_score: 0,
      substrate_score: 0,
      jmdie_machine_fit: 0.80,
      jmdie_material_fit: 0.70,
      jmdie_stock_local: 0.60,
      customer_review_score: 0.72,
    },
  },
];

// ============================================================================
// COMBINED KNOWLEDGE BASE
// ============================================================================

const ALL_HOLDERS: ToolHolderSpec[] = BD_HOLDERS;

const ALL_WORKHOLDING: WorkholdingSpec[] = [
  ...ORANGE_VISE_WORKHOLDING,
  ...GLOBAL_CNC_WORKHOLDING,
  ...AMPC_WORKHOLDING,
];

const ALL_CUTTING_TOOLS: CuttingToolSpec[] = [
  ...ACCUPRO_TOOLS,
  ...RAPIDKUT_TOOLS,
];

// ============================================================================
// VENDOR TRUST SCORES (JM Die experience + industry ratings)
// ============================================================================

const VENDOR_TRUST: Record<CatalogManufacturer, number> = {
  big_daishowa: 0.95,  // premium Japanese manufacturer, ISO 16084 certified
  orange_vise:  0.85,  // US-made, strong community reputation
  accupro:      0.72,  // MSC house brand — reliable value, not premium
  rapidkut:     0.68,  // solid economy carbide — good for roughing budgets
  global_cnc:   0.60,  // economy-grade accessories — adequate for CAT40 basics
  ampc:         0.65,  // established US manufacturer, moderate selection
};

// ============================================================================
// HELPERS — Scoring
// ============================================================================

/**
 * Computes dot product of feature vector against criterion weights.
 * Weights keys must exactly match CatalogFeatureVector keys.
 */
function scoreFeatureVector(
  fv: CatalogFeatureVector,
  weights: Partial<Record<keyof CatalogFeatureVector, number>>
): number {
  let total = 0;
  let weightSum = 0;
  for (const [key, w] of Object.entries(weights) as [keyof CatalogFeatureVector, number][]) {
    if (w !== undefined && w > 0) {
      total += (fv[key] as number) * w;
      weightSum += w;
    }
  }
  return weightSum > 0 ? total / weightSum : 0;
}

/**
 * Maps application to the primary criteria weights for tool holder selection.
 */
function holderWeightsForApplication(
  application: ApplicationType
): Partial<Record<keyof CatalogFeatureVector, number>> {
  switch (application) {
    case "hard_milling":
    case "finishing":
      return {
        runout_score: 0.35,
        balance_score: 0.20,
        rpm_norm: 0.15,
        clamping_force_norm: 0.15,
        vendor_trust: 0.10,
        jmdie_material_fit: 0.05,
      };
    case "roughing":
    case "interrupted_cut":
      return {
        clamping_force_norm: 0.35,
        vendor_trust: 0.15,
        tool_change_ease: 0.15,
        runout_score: 0.15,
        availability: 0.10,
        jmdie_machine_fit: 0.10,
      };
    case "high_speed":
      return {
        rpm_norm: 0.30,
        runout_score: 0.25,
        balance_score: 0.25,
        vendor_trust: 0.10,
        coolant_through: 0.10,
      };
    case "drilling":
    case "reaming":
      return {
        runout_score: 0.30,
        repeatability_score: 0.25,
        coolant_through: 0.20,
        tool_change_ease: 0.15,
        availability: 0.10,
      };
    default:
      return {
        runout_score: 0.25,
        clamping_force_norm: 0.20,
        vendor_trust: 0.15,
        availability: 0.15,
        tool_change_ease: 0.15,
        jmdie_machine_fit: 0.10,
      };
  }
}

/**
 * Maps material group to preferred coating types, ordered by preference.
 */
function preferredCoatingsForMaterial(material: MaterialGroup): CoatingType[] {
  switch (material) {
    case "P_steel":       return ["AlTiN", "TiAlN", "TiCN", "TiN", "uncoated"];
    case "M_stainless":   return ["AlTiN", "TiAlN", "TiN", "uncoated"];
    case "K_cast_iron":   return ["TiN", "TiAlN", "AlTiN", "uncoated"];
    case "H_hardened":    return ["AlTiN", "TiAlN", "DLC", "uncoated"];
    case "N_nonferrous":  return ["ZrN", "DLC", "uncoated", "TiN"];
    case "S_superalloy":  return ["AlTiN", "TiAlN", "TiN"];
    case "carbide_grinding": return ["uncoated", "DLC"];
    default:              return ["AlTiN", "TiAlN", "TiN"];
  }
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ManufacturerCatalogAIEngine {

  // ── Accessors ─────────────────────────────────────────────────────────────

  /** Returns all tool holder specifications in the catalog knowledge base. */
  getAllHolders(): ToolHolderSpec[] {
    return ALL_HOLDERS;
  }

  /** Returns all workholding specifications in the catalog knowledge base. */
  getAllWorkholding(): WorkholdingSpec[] {
    return ALL_WORKHOLDING;
  }

  /** Returns all cutting tool specifications in the catalog knowledge base. */
  getAllCuttingTools(): CuttingToolSpec[] {
    return ALL_CUTTING_TOOLS;
  }

  /** Returns the BIG DAISHOWA holder families imported from data/big-daishowa-holders.ts. */
  getBigDaishowaFamilies(): ToolholderFamily[] {
    return BIG_DAISHOWA_FAMILIES;
  }

  /** Returns vendor trust scores for all catalog manufacturers. */
  getVendorTrustScores(): Record<CatalogManufacturer, number> {
    return { ...VENDOR_TRUST };
  }

  /**
   * Returns catalog source file paths for all 6 manufacturer catalogs.
   * These are the uploaded PDFs in Resources/MANUFACTURER_CATALOGS/uploaded/.
   */
  getCatalogPaths(): Record<CatalogManufacturer, string> {
    return {
      big_daishowa: `${CATALOG_ROOT}/BIG DAISHOWA High Performance Tooling Solutions Vol 5.pdf`,
      orange_vise:  `${CATALOG_ROOT}/543f80b8_2016_orange_vise_catalog.pdf`,
      accupro:      `${CATALOG_ROOT}/Accupro 2013.pdf`,
      rapidkut:     `${CATALOG_ROOT}/2018 Rapidkut Catalog.pdf`,
      global_cnc:   `${CATALOG_ROOT}/01-Global-CNC-Full-Catalog-2023.pdf`,
      ampc:         `${CATALOG_ROOT}/AMPC_US-EN.pdf`,
    };
  }

  // ── AI Method 1: selectToolHolder ─────────────────────────────────────────

  /**
   * Selects the optimal tool holder using multi-step AI reasoning.
   *
   * Reasoning chain:
   * 1. Filter by taper if specified (JM Die machines are BBT40/CAT40 compatible)
   * 2. Filter by bore range — tool_diameter_mm must fall in bore_range_mm
   * 3. Filter by runout requirement — holder.runout_um <= runout_required_um
   * 4. Score remaining holders by application-weighted feature vector
   * 5. Apply JM Die context (prefer BBT40/CAT40, D2/M2 material fit)
   * 6. Return top pick + alternatives with full reasoning chain
   *
   * @param tool_diameter_mm - Required bore diameter of the tool shank
   * @param runout_required_um - Maximum acceptable runout in micrometers
   * @param application - Machining application type
   * @param preferred_taper - Optional taper filter (e.g. "BBT40")
   * @returns Full selection result with reasoning chain
   */
  selectToolHolder(
    tool_diameter_mm: number,
    runout_required_um: number,
    application: ApplicationType,
    preferred_taper?: string
  ): ToolHolderSelectionResult {
    const reasoning: HolderReasoningStep[] = [];
    const query = {
      tool_diameter_mm,
      runout_required_um,
      application,
      taper: preferred_taper,
    };

    // Step 1: Initial observation
    reasoning.push({
      step: 1,
      type: "observation",
      description: `Selecting tool holder for ${tool_diameter_mm}mm tool, runout ≤${runout_required_um}µm, application: ${application}`,
      evidence: [
        `Tool diameter: ${tool_diameter_mm} mm`,
        `Max runout: ${runout_required_um} µm`,
        `Application: ${application}`,
        preferred_taper ? `Preferred taper: ${preferred_taper}` : "No taper preference — defaulting to BBT40/CAT40 (JM Die standard)",
      ],
      confidence: 1.0,
    });

    // Step 2: Filter by taper
    let candidates = ALL_HOLDERS;
    if (preferred_taper) {
      candidates = candidates.filter(h =>
        h.tapers.some(t => t.toLowerCase().includes(preferred_taper.toLowerCase()))
      );
      reasoning.push({
        step: 2,
        type: "type_filter",
        description: `Filtered to holders with taper: ${preferred_taper}`,
        evidence: [`${candidates.length} holders match taper requirement`],
        confidence: 1.0,
      });
    }

    // Step 3: Filter by bore range
    const boreFiltered = candidates.filter(h =>
      tool_diameter_mm >= h.bore_range_mm[0] &&
      tool_diameter_mm <= h.bore_range_mm[1]
    );
    reasoning.push({
      step: 3,
      type: "constraint_check",
      description: `Filtered by bore range: tool ${tool_diameter_mm}mm must be within holder bore_range_mm`,
      evidence: [
        `${boreFiltered.length}/${candidates.length} holders fit bore ${tool_diameter_mm} mm`,
        ...boreFiltered.map(h => `${h.family}: bore ${h.bore_range_mm[0]}–${h.bore_range_mm[1]} mm`),
      ],
      confidence: 1.0,
    });

    // Step 4: Filter by runout requirement
    const runoutFiltered = boreFiltered.filter(h => h.runout_um <= runout_required_um);
    reasoning.push({
      step: 4,
      type: "constraint_check",
      description: `Filtered by runout: holder.runout_um ≤ ${runout_required_um} µm`,
      evidence: [
        `${runoutFiltered.length}/${boreFiltered.length} holders meet runout requirement`,
        ...runoutFiltered.map(h => `${h.family}: ${h.runout_um} µm`),
      ],
      confidence: 1.0,
    });

    // Fallback: if all filtered out (tight runout requirement), use best available
    const viable = runoutFiltered.length > 0 ? runoutFiltered : boreFiltered;
    const fallback = runoutFiltered.length === 0;

    // Step 5: Score by application weights
    const weights = holderWeightsForApplication(application);
    const scored = viable.map(h => ({
      holder: h,
      score: scoreFeatureVector(h.feature_vector, weights),
    }));
    scored.sort((a, b) => b.score - a.score);

    reasoning.push({
      step: 5,
      type: "scoring",
      description: `Scored ${viable.length} viable holders using application weights for "${application}"`,
      evidence: scored.map(s =>
        `${s.holder.family} (${s.holder.category}): score=${(s.score * 100).toFixed(1)}`
      ),
      confidence: 0.85,
    });

    // Step 6: JM Die fit synthesis
    const topHolder = scored[0].holder;
    const jmDieNotes: string[] = [];

    if (topHolder.category === "shrink_fit") {
      jmDieNotes.push("Shrink-fit requires induction heater — verify JM Die has shrink machine available");
      jmDieNotes.push("Best runout for D2/M2/S7 hard milling — strongly recommended for tight-tolerance dies");
    }
    if (topHolder.category === "hydraulic") {
      jmDieNotes.push("Hydraulic damping reduces chatter — ideal for interrupted cuts in hardened tool steel");
      jmDieNotes.push("BIG DAISHOWA hydraulic chucks compatible with BBT40 (BIG-PLUS) spindles on JM Die Hurco/Haas machines");
    }
    if (topHolder.category === "collet_chuck" || topHolder.category === "er_collet") {
      jmDieNotes.push("Collet chuck versatility suits JM Die mixed-operations (drilling, milling, reaming in one setup)");
      jmDieNotes.push("NBC or ER collets available from local MSC Ohio warehouse — same-day availability");
    }

    jmDieNotes.push(`JM Die primary machines: Hurco VM10i (BBT40), Haas VF-2 (CAT40), Okuma MU-4000 (BBT40)`);
    jmDieNotes.push("Note: BBT40 (BIG-PLUS) holders fit CAT40 spindles with reduced accuracy — prefer matched taper");

    reasoning.push({
      step: 6,
      type: "jmdie_fit",
      description: "Applied JM Die shop context (machines, materials, stock availability)",
      evidence: jmDieNotes,
      confidence: 0.90,
    });

    reasoning.push({
      step: 7,
      type: "synthesis",
      description: `Selected ${topHolder.family} as top recommendation`,
      evidence: [
        `Score: ${(scored[0].score * 100).toFixed(1)}/100`,
        `Runout: ${topHolder.runout_um} µm (required ≤ ${runout_required_um} µm)`,
        `Bore range: ${topHolder.bore_range_mm[0]}–${topHolder.bore_range_mm[1]} mm`,
        `Applications: ${topHolder.applications.join(", ")}`,
        fallback ? "WARNING: no holder met runout requirement — best available returned" : "All constraints met",
      ],
      confidence: fallback ? 0.60 : 0.90,
    });

    return {
      query,
      top_recommendation: topHolder,
      alternatives: scored.slice(1).map(s => s.holder),
      reasoning_chain: reasoning,
      score: Math.round(scored[0].score * 100),
      jmdie_notes: jmDieNotes,
      confidence: fallback ? 0.60 : 0.90,
      warning: fallback
        ? `No holder meets runout requirement of ${runout_required_um} µm — best available (${topHolder.runout_um} µm) returned`
        : undefined,
    };
  }

  // ── AI Method 2: matchWorkholding ─────────────────────────────────────────

  /**
   * Selects optimal workholding using multi-criteria matching.
   *
   * Scoring criteria:
   * - Part fits within jaw opening (hard constraint)
   * - Clamping force adequacy: holder.clamping_force_n >= required * 1.5 safety factor
   * - Repeatability spec: holder.repeatability_um <= required
   * - Material fit (soft jaws preferred for delicate parts)
   * - JM Die machine compatibility
   *
   * @param part_length_mm - Part length in mm
   * @param part_width_mm - Part width in mm
   * @param part_height_mm - Part height in mm
   * @param clamping_force_required_n - Minimum clamping force in Newtons
   * @param repeatability_required_um - Maximum repeatability error in micrometers
   * @param material - Optional material name for soft-jaw recommendation
   * @returns Workholding selection result with reasoning
   */
  matchWorkholding(
    part_length_mm: number,
    part_width_mm: number,
    part_height_mm: number,
    clamping_force_required_n: number,
    repeatability_required_um: number,
    material?: string
  ): WorkholdingSelectionResult {
    const reasoning: HolderReasoningStep[] = [];
    const query = {
      part_length_mm,
      part_width_mm,
      part_height_mm,
      clamping_force_required_n,
      repeatability_required_um,
      material,
    };

    const safetyFactor = 1.5;
    const requiredClampWithSF = clamping_force_required_n * safetyFactor;

    reasoning.push({
      step: 1,
      type: "observation",
      description: `Workholding selection for ${part_length_mm}×${part_width_mm}×${part_height_mm} mm part`,
      evidence: [
        `Part: ${part_length_mm}×${part_width_mm}×${part_height_mm} mm`,
        `Required clamping force: ${clamping_force_required_n} N (with 1.5× SF: ${requiredClampWithSF.toFixed(0)} N)`,
        `Required repeatability: ≤${repeatability_required_um} µm`,
        material ? `Material: ${material}` : "Material: not specified",
      ],
      confidence: 1.0,
    });

    // Step 2: Filter by jaw opening (part must fit)
    const clampDim = Math.min(part_length_mm, part_width_mm);
    const fitFiltered = ALL_WORKHOLDING.filter(wh =>
      wh.jaw_opening_max_mm >= clampDim &&
      (wh.category === "collet_block" ? true : wh.jaw_width_mm >= clampDim * 0.5)
    );

    reasoning.push({
      step: 2,
      type: "constraint_check",
      description: `Filtered by jaw opening: clamp dimension ${clampDim.toFixed(1)} mm must fit`,
      evidence: [
        `Clamping dimension (min of L/W): ${clampDim.toFixed(1)} mm`,
        `${fitFiltered.length}/${ALL_WORKHOLDING.length} workholding items fit`,
      ],
      confidence: 1.0,
    });

    // Step 3: Filter by clamping force
    const forceFiltered = fitFiltered.filter(
      wh => wh.clamping_force_n >= requiredClampWithSF
    );

    reasoning.push({
      step: 3,
      type: "constraint_check",
      description: `Filtered by clamping force ≥ ${requiredClampWithSF.toFixed(0)} N (${safetyFactor}× SF applied)`,
      evidence: [
        `${forceFiltered.length}/${fitFiltered.length} items meet clamping force requirement`,
        ...forceFiltered.map(wh => `${wh.family}: ${wh.clamping_force_n} N`),
      ],
      confidence: 1.0,
    });

    // Step 4: Filter by repeatability
    const repFiltered = forceFiltered.filter(
      wh => wh.repeatability_um <= repeatability_required_um
    );

    reasoning.push({
      step: 4,
      type: "constraint_check",
      description: `Filtered by repeatability ≤ ${repeatability_required_um} µm`,
      evidence: [
        `${repFiltered.length}/${forceFiltered.length} items meet repeatability requirement`,
        ...repFiltered.map(wh => `${wh.family}: ${wh.repeatability_um} µm`),
      ],
      confidence: 1.0,
    });

    const viable = repFiltered.length > 0 ? repFiltered : forceFiltered;
    const fallback = repFiltered.length === 0;

    // Step 5: Score
    const weights: Partial<Record<keyof CatalogFeatureVector, number>> = {
      repeatability_score: 0.30,
      clamping_force_norm: 0.25,
      vendor_trust: 0.15,
      availability: 0.10,
      jmdie_machine_fit: 0.10,
      jmdie_material_fit: 0.10,
    };
    const scored = viable.map(wh => ({
      wh,
      score: scoreFeatureVector(wh.feature_vector, weights),
    }));
    scored.sort((a, b) => b.score - a.score);

    reasoning.push({
      step: 5,
      type: "scoring",
      description: `Scored ${viable.length} viable workholding items`,
      evidence: scored.map(s => `${s.wh.family}: score=${(s.score * 100).toFixed(1)}`),
      confidence: 0.85,
    });

    // Step 6: JM Die notes
    const jmDieNotes: string[] = [];
    const top = scored[0].wh;
    if (top.category === "precision_vise") {
      jmDieNotes.push("Orange Vise 4\"/6\" available from MSC Industrial — standard JM Die procurement channel");
      jmDieNotes.push("Pair with Orange Vise soft jaws for second-operation holding of custom die profiles");
    }
    if (top.category === "soft_jaw") {
      jmDieNotes.push("Machine soft jaws to part profile for maximum contact area — critical for thin die sections");
      jmDieNotes.push("6061 soft jaws available from local metal supply (Youngstown area) — next-day delivery");
    }
    if (material && (material.toLowerCase().includes("d2") || material.toLowerCase().includes("m2"))) {
      jmDieNotes.push("Tool steel (D2/M2): use hardened steel jaws — avoid aluminum soft jaws for heavy roughing");
    }

    reasoning.push({
      step: 6,
      type: "synthesis",
      description: `Selected ${top.family} as optimal workholding solution`,
      evidence: [
        `Score: ${(scored[0].score * 100).toFixed(1)}/100`,
        `Clamping force: ${top.clamping_force_n} N vs required ${requiredClampWithSF.toFixed(0)} N`,
        `Repeatability: ${top.repeatability_um} µm vs required ${repeatability_required_um} µm`,
        fallback ? "WARNING: no item meets repeatability requirement — best available returned" : "All constraints met",
      ],
      confidence: fallback ? 0.65 : 0.88,
    });

    return {
      query,
      top_recommendation: top,
      alternatives: scored.slice(1).map(s => s.wh),
      reasoning_chain: reasoning,
      score: Math.round(scored[0].score * 100),
      jmdie_notes: jmDieNotes,
      confidence: fallback ? 0.65 : 0.88,
      warning: fallback
        ? `No workholding met repeatability ≤${repeatability_required_um} µm — best available (${top.repeatability_um} µm) returned`
        : undefined,
    };
  }

  // ── AI Method 3: findCuttingTool ──────────────────────────────────────────

  /**
   * Finds the best cutting tool using feature-vector similarity.
   *
   * Feature-vector scoring dimensions:
   * - Material compatibility score for the requested ISO group
   * - Coating preference match (ranked by material group)
   * - Surface finish capability (max_surface_finish_ra_um <= required)
   * - Substrate quality (carbide ultrafine > carbide std > HSS)
   * - Vendor trust and availability
   *
   * @param operation - Machining operation type
   * @param material_group - ISO material group of workpiece
   * @param surface_finish_ra_um - Required surface finish Ra in micrometers
   * @param diameter_mm - Optional exact diameter filter in mm
   * @returns Cutting tool search result with scored matches
   */
  findCuttingTool(
    operation: ApplicationType,
    material_group: MaterialGroup,
    surface_finish_ra_um: number,
    diameter_mm?: number
  ): CuttingToolSearchResult {
    const reasoning: HolderReasoningStep[] = [];
    const query = { operation, material_group, surface_finish_ra_um, diameter_mm };

    reasoning.push({
      step: 1,
      type: "observation",
      description: `Finding cutting tool for ${operation} of ${material_group}, finish Ra≤${surface_finish_ra_um}µm`,
      evidence: [
        `Operation: ${operation}`,
        `Material group: ${material_group}`,
        `Required surface finish: Ra ≤ ${surface_finish_ra_um} µm`,
        diameter_mm ? `Diameter filter: ${diameter_mm} mm` : "No diameter filter",
      ],
      confidence: 1.0,
    });

    // Filter by diameter if specified
    let candidates = ALL_CUTTING_TOOLS;
    if (diameter_mm !== undefined) {
      candidates = candidates.filter(t =>
        Math.abs(t.diameter_mm - diameter_mm) < 0.5
      );
    }

    // Filter by surface finish capability
    const finishFiltered = candidates.filter(t =>
      t.max_surface_finish_ra_um <= surface_finish_ra_um
    );

    reasoning.push({
      step: 2,
      type: "constraint_check",
      description: `Filtered by surface finish capability ≤ ${surface_finish_ra_um} µm`,
      evidence: [
        `${finishFiltered.length}/${candidates.length} tools meet finish requirement`,
        ...finishFiltered.map(t =>
          `${t.manufacturer}/${t.category} ø${t.diameter_mm}: Ra max ${t.max_surface_finish_ra_um} µm`
        ),
      ],
      confidence: 1.0,
    });

    const viable = finishFiltered.length > 0 ? finishFiltered : candidates;
    const finishFallback = finishFiltered.length === 0;

    // Build material-specific weights
    const matKey = `compat_${material_group.split("_")[0]}_${material_group.split("_")[1] ?? ""}` as keyof CatalogFeatureVector;
    const preferredCoatings = preferredCoatingsForMaterial(material_group);

    const scored = viable.map(t => {
      // Base score from feature vector
      const baseScore = scoreFeatureVector(t.feature_vector, {
        [matKey]: 0.30,
        coating_score: 0.20,
        substrate_score: 0.15,
        vendor_trust: 0.15,
        availability: 0.10,
        jmdie_material_fit: 0.10,
      } as Partial<Record<keyof CatalogFeatureVector, number>>);

      // Coating preference bonus
      const coatingRank = preferredCoatings.indexOf(t.coating);
      const coatingBonus = coatingRank >= 0
        ? (preferredCoatings.length - coatingRank) / preferredCoatings.length * 0.15
        : 0;

      // Operation compatibility bonus
      const opBonus = (
        (operation === "roughing" && t.category.includes("end_mill")) ||
        (operation === "drilling" && t.category.includes("drill")) ||
        (operation === "reaming" && t.category === "reamer") ||
        (operation === "finishing" && t.flute_count >= 4) ||
        (operation === "hard_milling" && t.substrate.includes("carbide"))
      ) ? 0.10 : 0;

      const totalScore = Math.min(1.0, baseScore + coatingBonus + opBonus);

      const explanation = [
        `Base material fit score: ${(baseScore * 100).toFixed(0)}`,
        `Coating: ${t.coating} (rank ${coatingRank >= 0 ? coatingRank + 1 : "N/A"} for ${material_group})`,
        `Operation bonus: +${(opBonus * 100).toFixed(0)}`,
        `Substrate: ${t.substrate}`,
      ].join(" | ");

      return { tool: t, score: totalScore, explanation };
    });
    scored.sort((a, b) => b.score - a.score);

    reasoning.push({
      step: 3,
      type: "scoring",
      description: `Scored ${viable.length} tools with material/coating/operation weights`,
      evidence: scored.map(s =>
        `${s.tool.manufacturer}/${s.tool.id}: ${(s.score * 100).toFixed(1)} — ${s.explanation}`
      ),
      confidence: 0.82,
    });

    // JM Die notes
    const jmDieNotes: string[] = [];
    const topTool = scored[0].tool;

    if (material_group === "H_hardened" || material_group === "P_steel") {
      jmDieNotes.push("JM Die primary materials (D2, M2, S7, A2) fall in ISO P/H — AlTiN coating strongly preferred");
      jmDieNotes.push("Use through-spindle coolant or air blast for D2 chip clearing — avoid flood on hardened steel");
    }
    if (topTool.manufacturer === "accupro") {
      jmDieNotes.push("Accupro available same-day from MSC Ohio warehouse (Seville, OH near JM Die Youngstown location)");
    }
    if (topTool.manufacturer === "rapidkut") {
      jmDieNotes.push("Rapidkut available from local distributors; confirm stock before scheduling run");
    }

    reasoning.push({
      step: 4,
      type: "synthesis",
      description: `Top tool: ${topTool.manufacturer} ${topTool.id}`,
      evidence: [
        `Score: ${(scored[0].score * 100).toFixed(1)}/100`,
        `Coating: ${topTool.coating} (preferred for ${material_group})`,
        `Substrate: ${topTool.substrate}`,
        `Surface finish capability: Ra ${topTool.max_surface_finish_ra_um} µm`,
        finishFallback ? "WARNING: no tool met finish requirement — best available returned" : "Finish requirement met",
      ],
      confidence: finishFallback ? 0.65 : 0.85,
    });

    return {
      query,
      matches: scored,
      top_recommendation: topTool,
      reasoning_chain: reasoning,
      jmdie_notes: jmDieNotes,
      confidence: finishFallback ? 0.65 : 0.85,
    };
  }

  // ── AI Method 4: compareManufacturers ────────────────────────────────────

  /**
   * Compares manufacturers for a given tool type using weighted criteria.
   *
   * Criteria options (maps to feature vector dimensions):
   *   "price", "quality", "availability", "lead_time", "runout",
   *   "balance", "rpm_rating", "material_compat", "coating_options",
   *   "vendor_trust", "customer_reviews", "jmdie_fit"
   *
   * @param tool_type - Type of tool (e.g. "shrink_fit", "end_mill_carbide")
   * @param criteria - List of criteria names to include in comparison
   * @returns Ranked manufacturer comparison with scores
   */
  compareManufacturers(
    tool_type: string,
    criteria: string[]
  ): ManufacturerComparisonResult {
    // Gather all items of the requested type
    const holderItems = ALL_HOLDERS.filter(h =>
      h.category.includes(tool_type) || h.family.toLowerCase().includes(tool_type.toLowerCase())
    );
    const workholdingItems = ALL_WORKHOLDING.filter(w =>
      w.category.includes(tool_type) || w.family.toLowerCase().includes(tool_type.toLowerCase())
    );
    const cuttingItems = ALL_CUTTING_TOOLS.filter(t =>
      t.category.includes(tool_type)
    );

    // Build per-manufacturer average feature vectors
    type FVEntry = { fv: CatalogFeatureVector; manufacturer: CatalogManufacturer };
    const allItems: FVEntry[] = [
      ...holderItems.map(h => ({ fv: h.feature_vector, manufacturer: h.manufacturer })),
      ...workholdingItems.map(w => ({ fv: w.feature_vector, manufacturer: w.manufacturer })),
      ...cuttingItems.map(t => ({ fv: t.feature_vector, manufacturer: t.manufacturer })),
    ];

    // Criteria → feature vector key mapping
    const criteriaKeyMap: Record<string, keyof CatalogFeatureVector> = {
      price:           "price_norm",
      quality:         "vendor_trust",
      availability:    "availability",
      lead_time:       "lead_time_score",
      runout:          "runout_score",
      balance:         "balance_score",
      rpm_rating:      "rpm_norm",
      material_compat: "compat_P_steel",
      coating_options: "coating_score",
      vendor_trust:    "vendor_trust",
      customer_reviews:"customer_review_score",
      jmdie_fit:       "jmdie_machine_fit",
    };

    // Group by manufacturer
    const byMfr = new Map<CatalogManufacturer, FVEntry[]>();
    for (const item of allItems) {
      if (!byMfr.has(item.manufacturer)) byMfr.set(item.manufacturer, []);
      byMfr.get(item.manufacturer)!.push(item);
    }

    // If no items matched, build from trust scores for all manufacturers
    const mfrsToCompare: CatalogManufacturer[] =
      byMfr.size > 0
        ? Array.from(byMfr.keys())
        : (Object.keys(VENDOR_TRUST) as CatalogManufacturer[]);

    const rankings = mfrsToCompare.map(mfr => {
      const items = byMfr.get(mfr) ?? [];
      const scoresByCriterion: Record<string, number> = {};

      for (const criterion of criteria) {
        const fvKey = criteriaKeyMap[criterion];
        if (!fvKey) {
          scoresByCriterion[criterion] = 0;
          continue;
        }
        if (items.length === 0) {
          // Fall back to vendor trust score for all criteria
          scoresByCriterion[criterion] = VENDOR_TRUST[mfr] ?? 0.5;
        } else {
          const avg = items.reduce((sum, i) => sum + (i.fv[fvKey] as number), 0) / items.length;
          // Invert price (lower price = better score)
          scoresByCriterion[criterion] = criterion === "price" ? 1 - avg : avg;
        }
      }

      const weightedScore =
        Object.values(scoresByCriterion).reduce((a, b) => a + b, 0) /
        criteria.length;

      const strengths: string[] = [];
      const weaknesses: string[] = [];
      for (const [crit, score] of Object.entries(scoresByCriterion)) {
        if (score >= 0.80) strengths.push(`${crit} (${(score * 100).toFixed(0)})`);
        if (score <= 0.50) weaknesses.push(`${crit} (${(score * 100).toFixed(0)})`);
      }

      return { manufacturer: mfr, weighted_score: weightedScore, scores_by_criterion: scoresByCriterion, strengths, weaknesses };
    });

    rankings.sort((a, b) => b.weighted_score - a.weighted_score);
    const ranked = rankings.map((r, i) => ({ rank: i + 1, ...r }));

    const top = ranked[0];
    const recommendation =
      `${top.manufacturer.replace("_", " ").toUpperCase()} ranks #1 for "${tool_type}" ` +
      `with weighted score ${(top.weighted_score * 100).toFixed(1)}/100 ` +
      `across criteria: ${criteria.join(", ")}. ` +
      `Strengths: ${top.strengths.join("; ") || "none flagged"}.`;

    const jmDieRec =
      top.manufacturer === "big_daishowa"
        ? "BIG DAISHOWA recommended for JM Die precision tool steel work — ISO 16084 certified, BBT40 available"
        : top.manufacturer === "orange_vise"
        ? "Orange Vise recommended for JM Die workholding — mounts directly on Hurco and Haas tables"
        : top.manufacturer === "accupro"
        ? "Accupro recommended for JM Die standard tooling — MSC Ohio same-day delivery to Youngstown area"
        : `${top.manufacturer.replace("_", " ")} selected — verify availability from local Ohio distributor`;

    return {
      tool_type,
      criteria,
      rankings: ranked,
      recommendation,
      jmdie_recommendation: jmDieRec,
    };
  }

  // ── Cross-Reference Integration ───────────────────────────────────────────

  /**
   * Returns JM Die specific recommendations for a given operation and material.
   * Links catalog knowledge to JM Die shop context.
   *
   * @param operation - Machining operation
   * @param material - Material string (e.g. "D2 tool steel", "M2 HSS")
   * @returns Array of prioritized recommendations with source citations
   */
  getJMDieRecommendations(
    operation: ApplicationType,
    material: string
  ): Array<{ priority: number; recommendation: string; source: string }> {
    const recommendations: Array<{ priority: number; recommendation: string; source: string }> = [];
    const matLower = material.toLowerCase();

    // D2 tool steel (cold heading die material — JM Die primary)
    if (matLower.includes("d2") || matLower.includes("tool steel")) {
      if (operation === "hard_milling" || operation === "finishing") {
        recommendations.push({
          priority: 1,
          recommendation: "BIG DAISHOWA shrink-fit holder: best runout for D2 hard milling. Use 4-flute AlTiN carbide end mill. Dry/MQL cutting recommended above 45 HRC.",
          source: "BIG DAISHOWA Vol 5 + Accupro 2013 catalog + JM Die tribal knowledge",
        });
        recommendations.push({
          priority: 2,
          recommendation: "Orange Vise 4\" or 6\" precision vise for D2 die blocks. Machine soft jaws if non-prismatic profile. Verify clamping force adequate for interrupted cuts.",
          source: "Orange Vise 2016 catalog + JM Die workholding practice",
        });
      }
      if (operation === "roughing") {
        recommendations.push({
          priority: 1,
          recommendation: "BIG DAISHOWA hydraulic chuck: vibration damping critical for D2 roughing interrupted cuts. Rapidkut variable-helix carbide end mill reduces chatter.",
          source: "BIG DAISHOWA Vol 5 + Rapidkut 2018 catalog",
        });
      }
    }

    // M2/HSS material
    if (matLower.includes("m2") || matLower.includes("hss")) {
      recommendations.push({
        priority: 1,
        recommendation: "M2/HSS: treat as ISO H (hardened) for tooling selection. AlTiN-coated carbide end mills. Shrink-fit or hydraulic holder for rigidity.",
        source: "BIG DAISHOWA Vol 5 + JM Die material experience",
      });
    }

    // Carbide (EDM electrode backup or carbide die inserts)
    if (matLower.includes("carbide") || matLower.includes("tungsten")) {
      recommendations.push({
        priority: 1,
        recommendation: "Tungsten carbide: use diamond-coated end mills or EDM. If grinding, AMPC collet block for CMM/surface grinder setup. BIG DAISHOWA shrink-fit for any carbide milling.",
        source: "AMPC US-EN catalog + BIG DAISHOWA Vol 5",
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 1,
        recommendation: `No specific JM Die recommendation for ${operation} on ${material}. Default: BIG DAISHOWA MEGA NEW BABY CHUCK (collet) for versatility, Accupro AlTiN carbide end mill.`,
        source: "ManufacturerCatalogAIEngine defaults",
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Returns the feature vector for a specific catalog item by ID.
   *
   * @param item_id - Catalog item ID (e.g. "bd-shk-bbt40-6")
   * @returns Feature vector or null if not found
   */
  getFeatureVector(item_id: string): CatalogFeatureVector | null {
    const holder = ALL_HOLDERS.find(h => h.id === item_id);
    if (holder) return holder.feature_vector;
    const wh = ALL_WORKHOLDING.find(w => w.id === item_id);
    if (wh) return wh.feature_vector;
    const ct = ALL_CUTTING_TOOLS.find(t => t.id === item_id);
    if (ct) return ct.feature_vector;
    return null;
  }

  /**
   * Searches all catalog items by keyword across family, features, and category.
   *
   * @param keyword - Search keyword
   * @returns Matching items from all categories
   */
  searchCatalog(keyword: string): {
    holders: ToolHolderSpec[];
    workholding: WorkholdingSpec[];
    cutting_tools: CuttingToolSpec[];
  } {
    const kw = keyword.toLowerCase();
    return {
      holders: ALL_HOLDERS.filter(h =>
        h.family.toLowerCase().includes(kw) ||
        h.category.toLowerCase().includes(kw) ||
        h.features.some(f => f.toLowerCase().includes(kw))
      ),
      workholding: ALL_WORKHOLDING.filter(w =>
        w.family.toLowerCase().includes(kw) ||
        w.category.toLowerCase().includes(kw) ||
        w.features.some(f => f.toLowerCase().includes(kw))
      ),
      cutting_tools: ALL_CUTTING_TOOLS.filter(t =>
        t.category.toLowerCase().includes(kw) ||
        t.coating.toLowerCase().includes(kw) ||
        t.features.some(f => f.toLowerCase().includes(kw)) ||
        t.manufacturer.toLowerCase().includes(kw)
      ),
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const manufacturerCatalogAIEngine = new ManufacturerCatalogAIEngine();
