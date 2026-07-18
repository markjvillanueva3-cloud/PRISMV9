/**
 * Workholding Catalog Data — Extracted from Manufacturer PDFs
 *
 * Sources:
 *   - Orange Vise 2016 Catalog (543f80b8_2016_orange_vise_catalog.pdf) — 10 pages, full text
 *   - REGO-FIX Catalogue 2026 (REGO-FIX Catalogue 2026 ENGLISH.pdf) — 448 pages, IMAGE-ONLY (no extractable text)
 *   - Metalmorphosis 2021 (IMCO end mills, NOT workholding — excluded)
 *   - CAMFIX Catalog (ISCAR modular turning tooling, NOT fixture workholding — excluded)
 *
 * Used by: WorkholdingEngine, FixtureDesignEngine, SoftJawProfileEngine,
 *          ModularFixtureLayoutEngine, ClampingSimEngine, WorkholdingIntelligenceEngine
 *
 * @version 1.0.0
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface ViseSpec {
  brand: string;
  model: string;
  sku: string;
  jaw_width_mm: number;
  max_opening_mm: number;          // single station, with jaw plates
  max_opening_no_plates_mm: number; // single station, without jaw plates
  clamping_force_kn: number;
  clamping_force_ratio: string;    // force per torque (e.g. "825 lbs per 10 lbs-ft")
  repeatability_mm: number;
  weight_kg: number;
  type: "standard" | "self_centering" | "double_station" | "5axis" | "single_station";
  body_material: string;
  jaw_interface: string;           // jaw system type
  features: string[];
  dual_station_opening_mm?: number; // max opening per station (with jaw plates)
}

export interface ZeroPointSpec {
  brand: string;
  model: string;
  holding_force_kn: number;
  repeatability_mm: number;
  actuation: string[];             // "manual" | "pneumatic_above" | "pneumatic_below"
  description: string;
}

export interface TombstoneSpec {
  brand: string;
  model: string;
  sku: string;
  stations: number;
  cross_section_mm: string;        // e.g. "152.4 x 152.4" (6x6 in)
  height_mm: number;
  base_options_mm: string[];       // base plate sizes
  body_material: string;
  integrated_receivers: number;
  receiver_spacing_mm: number;
  type: "integrated_vise" | "ball_coupler";
}

export interface SoftJawSpec {
  brand: string;
  type: "machinable" | "stepped" | "serrated" | "vee" | "extra_wide";
  material: string;
  size_mm: { length: number; width: number; height: number };
  fits_vise_width_mm: number;
  reversible: boolean;
}

export interface JawPlateSpec {
  brand: string;
  model: string;
  sku: string;
  material: string;
  profile: string;                 // cross-section profile description
  size_mm: { length: number; width: number; height: number };
}

export interface SubplateSpec {
  brand: string;
  sku: string;
  material: string;
  size_mm: { length: number; width: number; height: number };
  fits_vise_width_mm: number;
  integrated_receivers: number;
  receiver_spacing_mm: number;
}

export interface VisepalletSpec {
  brand: string;
  sku: string;
  material: string;
  size_mm: { length: number; width: number; height: number };
  fits_vise_series: string;
  locating_method: string;
}

// ============================================================================
// UNIT CONVERSION HELPERS
// ============================================================================

/** Convert inches to mm */
const inToMm = (inches: number): number => Math.round(inches * 25.4 * 100) / 100;

/** Convert lbs to kN */
const lbsToKn = (lbs: number): number => Math.round(lbs * 0.00444822 * 1000) / 1000;

/** Convert lbs to kg */
const lbsToKg = (lbs: number): number => Math.round(lbs * 0.453592 * 100) / 100;

// ============================================================================
// ORANGE VISE — VISE SPECIFICATIONS
// Source: Orange Vise 2016 Catalog, Pages 7-8
// ============================================================================

export const ORANGE_VISE_SPECS: ViseSpec[] = [
  // 6" Dual Station Series (Cast Iron)
  {
    brand: "Orange Vise",
    model: "OV6-200DS3",
    sku: "100-101",
    jaw_width_mm: inToMm(6),        // 152.4
    max_opening_mm: inToMm(10.5),    // 266.7 — single station with jaw plates
    max_opening_no_plates_mm: inToMm(12.0), // 304.8
    clamping_force_kn: lbsToKn(10000), // 44.482
    clamping_force_ratio: "825 lbs per 10 lbs-ft",
    repeatability_mm: inToMm(0.0005), // 0.0127 (via Ball Couplers)
    weight_kg: lbsToKg(112),         // 50.8
    type: "double_station",
    body_material: "cast_iron",
    jaw_interface: "CarveSmart IJS",
    features: [
      "dual_station", "single_station_convertible", "ball_coupler_ready",
      "sealed_screw", "hardened_wear_surfaces", "no_thrust_bearings"
    ],
    dual_station_opening_mm: inToMm(4.25), // per station with jaw plates
  },
  {
    brand: "Orange Vise",
    model: "OV6-175DS3",
    sku: "100-102",
    jaw_width_mm: inToMm(6),
    max_opening_mm: inToMm(8.0),
    max_opening_no_plates_mm: inToMm(9.5),
    clamping_force_kn: lbsToKn(10000),
    clamping_force_ratio: "825 lbs per 10 lbs-ft",
    repeatability_mm: inToMm(0.0005),
    weight_kg: lbsToKg(106),
    type: "double_station",
    body_material: "cast_iron",
    jaw_interface: "CarveSmart IJS",
    features: [
      "dual_station", "single_station_convertible", "ball_coupler_ready",
      "sealed_screw", "hardened_wear_surfaces", "no_thrust_bearings"
    ],
    dual_station_opening_mm: inToMm(3.0),
  },
  {
    brand: "Orange Vise",
    model: "OV6-160DS3",
    sku: "100-103",
    jaw_width_mm: inToMm(6),
    max_opening_mm: inToMm(6.5),
    max_opening_no_plates_mm: inToMm(8.0),
    clamping_force_kn: lbsToKn(10000),
    clamping_force_ratio: "825 lbs per 10 lbs-ft",
    repeatability_mm: inToMm(0.0005),
    weight_kg: lbsToKg(88),
    type: "double_station",
    body_material: "cast_iron",
    jaw_interface: "CarveSmart IJS",
    features: [
      "dual_station", "single_station_convertible", "ball_coupler_ready",
      "sealed_screw", "hardened_wear_surfaces", "no_thrust_bearings"
    ],
    dual_station_opening_mm: inToMm(1.5),
  },
  // 4.5" Dual Station Series (17-4 Stainless Steel)
  {
    brand: "Orange Vise",
    model: "OV45-200DS3",
    sku: "100-201",
    jaw_width_mm: inToMm(4.5),      // 114.3
    max_opening_mm: inToMm(10.5),    // same capacity as 6" in single station
    max_opening_no_plates_mm: inToMm(12.0),
    clamping_force_kn: lbsToKn(10000),
    clamping_force_ratio: "825 lbs per 10 lbs-ft",
    repeatability_mm: inToMm(0.0005),
    weight_kg: lbsToKg(84),
    type: "double_station",
    body_material: "17-4_stainless_steel",
    jaw_interface: "CarveSmart IJS",
    features: [
      "dual_station", "single_station_convertible", "ball_coupler_ready",
      "sealed_screw", "hardened_wear_surfaces", "no_thrust_bearings",
      "compact_width"
    ],
    dual_station_opening_mm: inToMm(4.25),
  },
  {
    brand: "Orange Vise",
    model: "OV45-175DS3",
    sku: "100-202",
    jaw_width_mm: inToMm(4.5),
    max_opening_mm: inToMm(8.0),
    max_opening_no_plates_mm: inToMm(9.5),
    clamping_force_kn: lbsToKn(10000),
    clamping_force_ratio: "825 lbs per 10 lbs-ft",
    repeatability_mm: inToMm(0.0005),
    weight_kg: lbsToKg(80),
    type: "double_station",
    body_material: "17-4_stainless_steel",
    jaw_interface: "CarveSmart IJS",
    features: [
      "dual_station", "single_station_convertible", "ball_coupler_ready",
      "sealed_screw", "hardened_wear_surfaces", "no_thrust_bearings",
      "compact_width"
    ],
    dual_station_opening_mm: inToMm(3.0),
  },
  {
    brand: "Orange Vise",
    model: "OV45-160DS3",
    sku: "100-203",
    jaw_width_mm: inToMm(4.5),
    max_opening_mm: inToMm(6.5),
    max_opening_no_plates_mm: inToMm(8.0),
    clamping_force_kn: lbsToKn(10000),
    clamping_force_ratio: "825 lbs per 10 lbs-ft",
    repeatability_mm: inToMm(0.0005),
    weight_kg: lbsToKg(66),
    type: "double_station",
    body_material: "17-4_stainless_steel",
    jaw_interface: "CarveSmart IJS",
    features: [
      "dual_station", "single_station_convertible", "ball_coupler_ready",
      "sealed_screw", "hardened_wear_surfaces", "no_thrust_bearings",
      "compact_width"
    ],
    dual_station_opening_mm: inToMm(1.5),
  },
  // 4.5" Single Station (17-4 Stainless Steel)
  {
    brand: "Orange Vise",
    model: "OV45-160SS3",
    sku: "100-207",
    jaw_width_mm: inToMm(4.5),
    max_opening_mm: inToMm(8.0),     // single station only, with jaw plates
    max_opening_no_plates_mm: inToMm(9.5),
    clamping_force_kn: lbsToKn(10000),
    clamping_force_ratio: "825 lbs per 10 lbs-ft",
    repeatability_mm: inToMm(0.0005),
    weight_kg: lbsToKg(66),
    type: "single_station",
    body_material: "17-4_stainless_steel",
    jaw_interface: "CarveSmart IJS",
    features: [
      "single_station_only", "bolted_rear_jaw", "ball_coupler_ready",
      "sealed_screw", "hardened_wear_surfaces", "no_thrust_bearings",
      "compact_width", "affordable"
    ],
  },
];

// ============================================================================
// ORANGE VISE — ZERO-POINT CLAMPING (BALL COUPLERS)
// Source: Orange Vise 2016 Catalog, Page 4
// ============================================================================

export const ZERO_POINT_SPECS: ZeroPointSpec[] = [
  {
    brand: "Orange Vise",
    model: "Ball Coupler",
    holding_force_kn: lbsToKn(10000), // >10,000 lbs per coupler
    repeatability_mm: inToMm(0.0005), // +/-0.0005" in all 3 axes
    actuation: ["manual", "pneumatic_above", "pneumatic_below"],
    description:
      "Zero-point quick-change system for vises, fixture plates, and workholding devices. " +
      "Each coupler delivers >10,000 lbs holding force with +/-0.0005\" repeatability. " +
      "Actuated manually or pneumatically from above or below the fixture.",
  },
];

// ============================================================================
// ORANGE VISE — TOMBSTONE SPECIFICATIONS
// Source: Orange Vise 2016 Catalog, Pages 6, 8
// ============================================================================

export const TOMBSTONE_SPECS: TombstoneSpec[] = [
  // Integrated vise tombstones
  {
    brand: "Orange Vise",
    model: "OV45-200-8SSQ",
    sku: "100-301",
    stations: 8,
    cross_section_mm: `${inToMm(6)} x ${inToMm(6)}`, // 6"x6"
    height_mm: inToMm(22),
    base_options_mm: [],
    body_material: "cast_iron_steel_base",
    integrated_receivers: 0,
    receiver_spacing_mm: 0,
    type: "integrated_vise",
  },
  {
    brand: "Orange Vise",
    model: "OV6-200-8SSQ",
    sku: "100-311",
    stations: 8,
    cross_section_mm: `${inToMm(9)} x ${inToMm(9)}`, // 9"x9"
    height_mm: inToMm(22),
    base_options_mm: [],
    body_material: "cast_iron_steel_base",
    integrated_receivers: 0,
    receiver_spacing_mm: 0,
    type: "integrated_vise",
  },
  // Ball Coupler tombstones
  {
    brand: "Orange Vise",
    model: "Ball Coupler Column 6in",
    sku: "100-302",
    stations: 4,                     // separate vises mounted via ball couplers
    cross_section_mm: `${inToMm(6)} x ${inToMm(6)}`,
    height_mm: inToMm(22),
    base_options_mm: ["400", "500"],
    body_material: "cast_iron_steel_base",
    integrated_receivers: 8,
    receiver_spacing_mm: inToMm(10), // 10.000" centers
    type: "ball_coupler",
  },
  {
    brand: "Orange Vise",
    model: "Ball Coupler Column 8in",
    sku: "100-312",
    stations: 4,
    cross_section_mm: `${inToMm(8)} x ${inToMm(8)}`,
    height_mm: inToMm(22),
    base_options_mm: ["400", "500"],
    body_material: "cast_iron_steel_base",
    integrated_receivers: 8,
    receiver_spacing_mm: inToMm(10),
    type: "ball_coupler",
  },
];

// ============================================================================
// ORANGE VISE — SOFT JAW SPECIFICATIONS
// Source: Orange Vise 2016 Catalog, Pages 8-9
// ============================================================================

export const SOFT_JAW_SPECS: SoftJawSpec[] = [
  // 6" vise standard machinable jaws
  {
    brand: "Orange Vise",
    type: "machinable",
    material: "1018_steel",
    size_mm: { length: inToMm(6), width: inToMm(4.63), height: inToMm(2.0) },
    fits_vise_width_mm: inToMm(6),
    reversible: true,
  },
  {
    brand: "Orange Vise",
    type: "machinable",
    material: "6061_aluminum",
    size_mm: { length: inToMm(6), width: inToMm(4.63), height: inToMm(2.0) },
    fits_vise_width_mm: inToMm(6),
    reversible: true,
  },
  {
    brand: "Orange Vise",
    type: "machinable",
    material: "7075_aluminum",
    size_mm: { length: inToMm(6), width: inToMm(4.63), height: inToMm(2.0) },
    fits_vise_width_mm: inToMm(6),
    reversible: true,
  },
  // 8" extra-wide machinable jaws
  {
    brand: "Orange Vise",
    type: "extra_wide",
    material: "1018_steel",
    size_mm: { length: inToMm(8), width: inToMm(6), height: inToMm(2.0) },
    fits_vise_width_mm: inToMm(6),
    reversible: false,
  },
  {
    brand: "Orange Vise",
    type: "extra_wide",
    material: "6061_aluminum",
    size_mm: { length: inToMm(8), width: inToMm(6), height: inToMm(2.0) },
    fits_vise_width_mm: inToMm(6),
    reversible: false,
  },
  // 12" extra-wide machinable jaws
  {
    brand: "Orange Vise",
    type: "extra_wide",
    material: "1018_steel",
    size_mm: { length: inToMm(12), width: inToMm(6), height: inToMm(2.0) },
    fits_vise_width_mm: inToMm(6),
    reversible: false,
  },
  {
    brand: "Orange Vise",
    type: "extra_wide",
    material: "6061_aluminum",
    size_mm: { length: inToMm(12), width: inToMm(6), height: inToMm(2.0) },
    fits_vise_width_mm: inToMm(6),
    reversible: false,
  },
];

// ============================================================================
// ORANGE VISE — JAW PLATE SPECIFICATIONS (CarveSmart IJS)
// Source: Orange Vise 2016 Catalog, Page 8
// ============================================================================

export const JAW_PLATE_SPECS: JawPlateSpec[] = [
  {
    brand: "Orange Vise",
    model: "6in IJS Master Sliding Jaw",
    sku: "700-101",
    material: "hardened_steel",
    profile: "CarveSmart IJS dovetail",
    size_mm: { length: inToMm(6), width: inToMm(4.0), height: inToMm(1.69) },
  },
  {
    brand: "Orange Vise",
    model: "6in IJS Master Center Jaw",
    sku: "700-102",
    material: "hardened_steel",
    profile: "CarveSmart IJS dovetail",
    size_mm: { length: inToMm(6), width: inToMm(3.12), height: inToMm(1.69) },
  },
  {
    brand: "Orange Vise",
    model: "6in IJS Laydown Center Jaw",
    sku: "700-103",
    material: "hardened_steel",
    profile: "CarveSmart IJS dovetail",
    size_mm: { length: inToMm(6), width: inToMm(2.0), height: inToMm(1.69) },
  },
  {
    brand: "Orange Vise",
    model: "6in Hardened Jawplates (qty 2)",
    sku: "700-104",
    material: "hardened_steel",
    profile: "CarveSmart flippable",
    size_mm: { length: inToMm(6), width: inToMm(1.71), height: inToMm(0.75) },
  },
];

// ============================================================================
// ORANGE VISE — SUBPLATE SPECIFICATIONS
// Source: Orange Vise 2016 Catalog, Page 8
// ============================================================================

export const SUBPLATE_SPECS: SubplateSpec[] = [
  // Steel subplates for 6" vises
  {
    brand: "Orange Vise",
    sku: "100-401",
    material: "steel",
    size_mm: { length: inToMm(20), width: inToMm(6), height: inToMm(1.38) },
    fits_vise_width_mm: inToMm(6),
    integrated_receivers: 2,
    receiver_spacing_mm: inToMm(10),
  },
  {
    brand: "Orange Vise",
    sku: "100-402",
    material: "steel",
    size_mm: { length: inToMm(17.5), width: inToMm(6), height: inToMm(1.38) },
    fits_vise_width_mm: inToMm(6),
    integrated_receivers: 2,
    receiver_spacing_mm: inToMm(10),
  },
  {
    brand: "Orange Vise",
    sku: "100-403",
    material: "steel",
    size_mm: { length: inToMm(16), width: inToMm(6), height: inToMm(1.38) },
    fits_vise_width_mm: inToMm(6),
    integrated_receivers: 2,
    receiver_spacing_mm: inToMm(10),
  },
  // Steel subplates for 4.5" vises
  {
    brand: "Orange Vise",
    sku: "100-411",
    material: "steel",
    size_mm: { length: inToMm(20), width: inToMm(4.5), height: inToMm(1.38) },
    fits_vise_width_mm: inToMm(4.5),
    integrated_receivers: 2,
    receiver_spacing_mm: inToMm(10),
  },
  {
    brand: "Orange Vise",
    sku: "100-412",
    material: "steel",
    size_mm: { length: inToMm(17.5), width: inToMm(4.5), height: inToMm(1.38) },
    fits_vise_width_mm: inToMm(4.5),
    integrated_receivers: 2,
    receiver_spacing_mm: inToMm(10),
  },
  {
    brand: "Orange Vise",
    sku: "100-413",
    material: "steel",
    size_mm: { length: inToMm(16), width: inToMm(4.5), height: inToMm(1.38) },
    fits_vise_width_mm: inToMm(4.5),
    integrated_receivers: 2,
    receiver_spacing_mm: inToMm(10),
  },
];

// ============================================================================
// ORANGE VISE — VISE PALLET (FIXTURE PLATE) SPECIFICATIONS
// Source: Orange Vise 2016 Catalog, Page 9
// ============================================================================

export const VISE_PALLET_SPECS: VisepalletSpec[] = [
  // 6" vise pallets — 20" length
  {
    brand: "Orange Vise",
    sku: "703-002",
    material: "6061_aluminum",
    size_mm: { length: inToMm(20), width: inToMm(6), height: inToMm(1.75) },
    fits_vise_series: "OV6",
    locating_method: "dowel_pins_and_carriers",
  },
  {
    brand: "Orange Vise",
    sku: "703-022",
    material: "6061_aluminum",
    size_mm: { length: inToMm(20), width: inToMm(8), height: inToMm(1.75) },
    fits_vise_series: "OV6",
    locating_method: "dowel_pins_and_carriers",
  },
  {
    brand: "Orange Vise",
    sku: "703-062",
    material: "6061_aluminum",
    size_mm: { length: inToMm(20), width: inToMm(12), height: inToMm(1.75) },
    fits_vise_series: "OV6",
    locating_method: "dowel_pins_and_carriers",
  },
  // 6" vise pallets — 17.5" length
  {
    brand: "Orange Vise",
    sku: "703-102",
    material: "6061_aluminum",
    size_mm: { length: inToMm(17.5), width: inToMm(6), height: inToMm(1.75) },
    fits_vise_series: "OV6",
    locating_method: "dowel_pins_and_carriers",
  },
  {
    brand: "Orange Vise",
    sku: "703-122",
    material: "6061_aluminum",
    size_mm: { length: inToMm(17.5), width: inToMm(8), height: inToMm(1.75) },
    fits_vise_series: "OV6",
    locating_method: "dowel_pins_and_carriers",
  },
  {
    brand: "Orange Vise",
    sku: "703-162",
    material: "6061_aluminum",
    size_mm: { length: inToMm(17.5), width: inToMm(12), height: inToMm(1.75) },
    fits_vise_series: "OV6",
    locating_method: "dowel_pins_and_carriers",
  },
  // 6" vise pallets — 16" length
  {
    brand: "Orange Vise",
    sku: "703-202",
    material: "6061_aluminum",
    size_mm: { length: inToMm(16), width: inToMm(6), height: inToMm(1.75) },
    fits_vise_series: "OV6",
    locating_method: "dowel_pins_and_carriers",
  },
  {
    brand: "Orange Vise",
    sku: "703-222",
    material: "6061_aluminum",
    size_mm: { length: inToMm(16), width: inToMm(8), height: inToMm(1.75) },
    fits_vise_series: "OV6",
    locating_method: "dowel_pins_and_carriers",
  },
  {
    brand: "Orange Vise",
    sku: "703-262",
    material: "6061_aluminum",
    size_mm: { length: inToMm(16), width: inToMm(12), height: inToMm(1.75) },
    fits_vise_series: "OV6",
    locating_method: "dowel_pins_and_carriers",
  },
];

// ============================================================================
// CarveSmart JAW STOCK PROFILES (consumable extrusions)
// Source: Orange Vise 2016 Catalog, Page 9
// ============================================================================

export interface JawStockProfile {
  profile_size_in: string;         // e.g. "3/4 x 2"
  material: string;
  width_mm: number;
  height_mm: number;
  available_lengths_mm: number[];  // pre-cut and stock lengths
}

export const JAW_STOCK_PROFILES: JawStockProfile[] = [
  {
    profile_size_in: "3/4 x 2",
    material: "1018_cold_rolled_steel",
    width_mm: inToMm(0.75),
    height_mm: inToMm(2),
    available_lengths_mm: [inToMm(4.5), inToMm(6), inToMm(31)],
  },
  {
    profile_size_in: "1 x 2-1/4",
    material: "6061_aluminum",
    width_mm: inToMm(1),
    height_mm: inToMm(2.25),
    available_lengths_mm: [inToMm(4.5), inToMm(6), inToMm(31), inToMm(94)],
  },
  {
    profile_size_in: "1-1/2 x 2",
    material: "6061_aluminum",
    width_mm: inToMm(1.5),
    height_mm: inToMm(2),
    available_lengths_mm: [inToMm(4.5), inToMm(6), inToMm(31), inToMm(94)],
  },
  {
    profile_size_in: "2 x 3",
    material: "6061_aluminum",
    width_mm: inToMm(2),
    height_mm: inToMm(3),
    available_lengths_mm: [inToMm(4.5), inToMm(6), inToMm(31), inToMm(94)],
  },
];

// ============================================================================
// VISE MOUNTING SPECIFICATIONS
// Source: Orange Vise 2016 Catalog, Page 7
// ============================================================================

export interface ViseMountingSpec {
  model_series: string;
  fixed_jaw_screw: string;
  fixed_jaw_torque_lbft: number;
  sliding_jaw_screw: string;
  sliding_jaw_torque_lbft: number;
  jaw_plate_screw: string;
  jaw_plate_torque_lbft: number;
  jaw_plate_bolt_pattern: string;
  brake_screw: string;
  brake_torque_lbft: number;
  brake_travel_range_mm: [number, number];
  main_screw_thread: string;
}

export const VISE_MOUNTING_SPECS: ViseMountingSpec[] = [
  {
    model_series: "OV6",
    fixed_jaw_screw: "1/2-13 x 2.25 BHCS",
    fixed_jaw_torque_lbft: 30,
    sliding_jaw_screw: "1/2-13 x 1.25 set screw",
    sliding_jaw_torque_lbft: 10,
    jaw_plate_screw: "1/2-13 LHCS",
    jaw_plate_torque_lbft: 20,
    jaw_plate_bolt_pattern: "0.938in from base, 3.875in center to center",
    brake_screw: "1/2-13 x 1.25 brass tipped set screw",
    brake_torque_lbft: 10,
    brake_travel_range_mm: [0, inToMm(0.25)],
    main_screw_thread: "1.25-12 TPI",
  },
  {
    model_series: "OV45",
    fixed_jaw_screw: "1/2-13 x 2.25 BHCS",
    fixed_jaw_torque_lbft: 30,
    sliding_jaw_screw: "1/2-13 x 1.25 set screw",
    sliding_jaw_torque_lbft: 10,
    jaw_plate_screw: "N/A",
    jaw_plate_torque_lbft: 0,
    jaw_plate_bolt_pattern: "N/A (no bolt holes for jaw plates)",
    brake_screw: "N/A",
    brake_torque_lbft: 0,
    brake_travel_range_mm: [0, 0],
    main_screw_thread: "1.25-12 TPI",
  },
];

// ============================================================================
// AGGREGATE LOOKUP HELPERS
// ============================================================================

/**
 * Find a vise spec by model name (partial match).
 */
export function findVise(modelQuery: string): ViseSpec | undefined {
  const q = modelQuery.toLowerCase();
  return ORANGE_VISE_SPECS.find(
    (v) => v.model.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q),
  );
}

/**
 * Find all vises matching a minimum jaw width.
 */
export function findVisesByJawWidth(minWidthMm: number): ViseSpec[] {
  return ORANGE_VISE_SPECS.filter((v) => v.jaw_width_mm >= minWidthMm);
}

/**
 * Find all vises that can accommodate a given part width (single station).
 */
export function findVisesByOpening(partWidthMm: number): ViseSpec[] {
  return ORANGE_VISE_SPECS.filter((v) => v.max_opening_mm >= partWidthMm);
}

/**
 * Find soft jaws for a given vise width and material.
 */
export function findSoftJaws(
  viseWidthMm: number,
  material?: string,
): SoftJawSpec[] {
  return SOFT_JAW_SPECS.filter((j) => {
    const widthMatch = j.fits_vise_width_mm === viseWidthMm;
    const matMatch = !material || j.material.includes(material);
    return widthMatch && matMatch;
  });
}

/**
 * Get all catalog data counts for diagnostics.
 */
export function getCatalogSummary(): Record<string, number> {
  return {
    vises: ORANGE_VISE_SPECS.length,
    zero_point_systems: ZERO_POINT_SPECS.length,
    tombstones: TOMBSTONE_SPECS.length,
    soft_jaws: SOFT_JAW_SPECS.length,
    jaw_plates: JAW_PLATE_SPECS.length,
    subplates: SUBPLATE_SPECS.length,
    vise_pallets: VISE_PALLET_SPECS.length,
    jaw_stock_profiles: JAW_STOCK_PROFILES.length,
    mounting_specs: VISE_MOUNTING_SPECS.length,
  };
}
