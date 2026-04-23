/**
 * BIG DAISHOWA High Performance Tooling Solutions Vol 5
 * Toolholder specifications extracted from manufacturer catalog.
 *
 * Key notes from the catalog:
 * - BIG DAISHOWA balances per ISO 16084 (not G2.5/G6.3). They specify max RPM
 *   per model instead of a balance grade. All holders comply with ISO 16084.
 * - Runout specs:
 *   - MEGA MICRO CHUCK: 1 um at collet nose, 3 um at 4xD
 *   - MEGA NEW BABY CHUCK: 1 um at collet nose, 3 um at 4xD
 *   - MEGA ER GRIP: 3 um at 4xD (within 0.00012")
 *   - MEGA E CHUCK: 1 um at collet nose, 3 um at 4xD
 *   - HYDRAULIC CHUCK: <3 um at 4xD (standard), 1 um at 4xD (Super Slim UP)
 *   - MEGA DOUBLE POWER CHUCK: <2 um at tool edge (HMC series)
 *   - SHRINK FIT HOLDER: not specified (depends on tool shank h6 tolerance)
 * - BIG-PLUS dual contact system (simultaneous taper + flange fit)
 * - All collets are AA Grade, inspected twice for accuracy
 */

export interface ToolholderSpec {
  /** Catalog model number (representative, shortest gauge length variant) */
  model: string;
  /** Holder type classification */
  type:
    | "shrink_fit"
    | "hydraulic"
    | "milling_chuck"
    | "collet_chuck"
    | "power_chuck"
    | "side_lock";
  /** Taper/interface type */
  taper: string;
  /** Bore clamping range [min, max] in mm */
  bore_range_mm: [number, number];
  /** Representative gauge length in mm (shortest standard variant) */
  gauge_length_mm: number;
  /** Maximum RPM rating from catalog */
  max_rpm: number;
  /** Runout (TIR) at 4xD in micrometers */
  runout_um: number;
  /** Balance standard — BIG DAISHOWA uses ISO 16084, not G-grades */
  balance_grade: string;
  /** Clamping torque in Nm (not specified for most BIG DAISHOWA holders) */
  clamping_torque_nm?: number;
  /** Weight in kg (converted from lbs in catalog) */
  weight_kg?: number;
}

/**
 * Holder family summary for quick lookup by type and taper.
 */
export interface ToolholderFamily {
  /** Family name */
  name: string;
  /** Holder type */
  type: ToolholderSpec["type"];
  /** Available taper interfaces */
  tapers: string[];
  /** Overall bore range across all variants [min, max] mm */
  bore_range_mm: [number, number];
  /** Max RPM across the family (highest-rated variant) */
  max_rpm: number;
  /** Runout at 4xD in micrometers */
  runout_um: number;
  /** Key features from catalog */
  features: string[];
}

// ============================================================================
// HOLDER FAMILIES — Summary of each product line
// ============================================================================

export const BIG_DAISHOWA_FAMILIES: ToolholderFamily[] = [
  {
    name: "MEGA MICRO CHUCK",
    type: "collet_chuck",
    tapers: ["BBT30", "BBT40", "BBT50", "BCV40", "BCV50", "HSK-A40", "HSK-A50", "HSK-A63", "C3", "C4", "C5", "C6"],
    bore_range_mm: [0.45, 8.05],
    max_rpm: 50000,
    runout_um: 3,
    features: [
      "1 um runout at collet nose, 3 um at 4xD",
      "Slim body design for confined areas",
      "NBC collets (3S/4S/6S/8S) in 0.1mm steps",
      "Sealed nut for through-tool coolant available (6S/8S)",
    ],
  },
  {
    name: "MEGA NEW BABY CHUCK",
    type: "collet_chuck",
    tapers: ["BBT30", "BBT40", "BBT50", "BCV40", "BCV50", "HSK-A40", "HSK-A50", "HSK-A63", "HSK-A100", "C3", "C4", "C5", "C6", "C8"],
    bore_range_mm: [0.25, 25.4],
    max_rpm: 50000,
    runout_um: 3,
    features: [
      "1 um runout at collet nose, 3 um at 4xD",
      "6 collet series (NBC6 through NBC25)",
      "MEGA PERFECT SEAL for coolant-through",
      "Thrust ball bearing for smooth tightening",
      "Wide range of standard gauge lengths",
    ],
  },
  {
    name: "MEGA ER GRIP",
    type: "collet_chuck",
    tapers: ["BBT30", "BBT40", "BBT50", "BCV40", "HSK-A63"],
    bore_range_mm: [1.9, 20],
    max_rpm: 35000,
    runout_um: 3,
    features: [
      "3 um at 4xD (outperforms DIN/ISO ER standard)",
      "Increased collet contact area vs standard ER",
      "Compatible with conventional DIN ER collets",
      "MEGA ER PERFECT SEAL available",
    ],
  },
  {
    name: "MEGA E CHUCK",
    type: "collet_chuck",
    tapers: ["BBT30", "BBT40", "BBT50", "BCV40", "BCV50", "HSK-A40", "HSK-A63", "HSK-A100", "C4", "C5", "C6", "C8"],
    bore_range_mm: [3, 12],
    max_rpm: 40000,
    runout_um: 3,
    features: [
      "Designed exclusively for end milling",
      "1 um at collet nose, 3 um at 4xD",
      "Extended gripping length for high clamping force",
      "Shallow taper collet design improves concentricity",
      "Max coolant pressure 1000 PSI",
    ],
  },
  {
    name: "MEGA DOUBLE POWER CHUCK",
    type: "power_chuck",
    tapers: ["BBT30", "BBT40", "BBT50", "BCV40", "BCV50", "HSK-A63", "HSK-A100", "HSK-A125", "C4", "C5", "C6", "C8"],
    bore_range_mm: [12, 50],
    max_rpm: 30000,
    runout_um: 3,
    features: [
      "Flange-contacting nut for maximum rigidity",
      "Dual contact (nut-to-body flange + taper-to-spindle)",
      "Heavy duty end milling capability",
      "Through-tool and jet-through coolant",
    ],
  },
  {
    name: "MEGA PERFECT GRIP",
    type: "milling_chuck",
    tapers: ["BBT40", "BBT50", "HSK-A63", "HSK-A100", "HSK-A125"],
    bore_range_mm: [16, 32],
    max_rpm: 30000,
    runout_um: 3,
    features: [
      "Key Grip anti-pullout mechanism",
      "100% security against tool slip under any torque",
      "Uses standard Weldon flat shanks",
      "Flood jet-through coolant via Key Grip grooves",
    ],
  },
  {
    name: "NEW Hi-POWER MILLING CHUCK",
    type: "milling_chuck",
    tapers: ["BBT30", "BBT40", "BBT50", "BCV40", "BCV50", "HSK-A40", "HSK-A50", "HSK-A63", "HSK-A100", "HSK-A125"],
    bore_range_mm: [12, 50],
    max_rpm: 30000,
    runout_um: 5,
    features: [
      "Slit design for oil film removal and elastic deformation",
      "Heavy duty gripping force",
      "Tandem roller unit",
      "Also usable as basic holder for boring bars/arbors",
      "HMC12J slim variant with 32mm nut diameter",
    ],
  },
  {
    name: "HYDRAULIC CHUCK",
    type: "hydraulic",
    tapers: ["BBT30", "BBT40", "BBT50", "BCV40", "BCV50", "HSK-A40", "HSK-A50", "HSK-A63", "HSK-A100", "C4", "C5", "C6", "C8"],
    bore_range_mm: [3, 32],
    max_rpm: 40000,
    runout_um: 3,
    features: [
      "Less than 3 um runout at 4xD",
      "Easy 1-wrench clamping",
      "Dual hydraulic chambers",
      "Integrated body+sleeve construction (no O-rings)",
      "Super Slim type: min body dia 14mm, up to 60,000 RPM",
      "Super Slim UP: 1 um at 4xD (HSK-E series)",
      "SF Hydraulic: modular shrink fit sleeve option",
      "Tool shank tolerance requirement: h6",
    ],
  },
  {
    name: "SHRINK FIT HOLDER",
    type: "shrink_fit",
    tapers: ["BBT30", "BBT40", "BBT50", "BCV40", "BCV50", "HSK-A63", "HSK-A100"],
    bore_range_mm: [4, 25.4],
    max_rpm: 40000,
    runout_um: 3,
    features: [
      "Jet coolant and center-through coolant types available",
      "Slim type available (3-degree taper body)",
      "Standard type (4.5-degree taper body)",
      "Requires h6 shank tolerance (h5 for 4mm bore)",
      "Requires heating/cooling equipment for tool changes",
    ],
  },
  {
    name: "NEW BABY CHUCK",
    type: "collet_chuck",
    tapers: ["BBT30", "BBT40", "BBT50", "BCV40"],
    bore_range_mm: [0.25, 20],
    max_rpm: 40000,
    runout_um: 3,
    features: [
      "1 um at collet nose",
      "Thrust ball bearing mechanism",
      "BABY PERFECT SEAL coolant-through",
      "Max coolant pressure 1000 PSI",
    ],
  },
];

// ============================================================================
// REPRESENTATIVE HOLDER SPECS — One entry per taper/type/bore combination
// ============================================================================

export const BIG_DAISHOWA_HOLDERS: ToolholderSpec[] = [
  // -------------------------------------------------------------------------
  // MEGA MICRO CHUCK (collet_chuck) — BBT30/40/50, HSK-A40/A63, BCV40, Capto
  // -------------------------------------------------------------------------
  { model: "BBT30-MEGA3S-45T", type: "collet_chuck", taper: "BBT30", bore_range_mm: [0.45, 3.25], gauge_length_mm: 45, max_rpm: 40000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.36 },
  { model: "BBT30-MEGA6S-60T", type: "collet_chuck", taper: "BBT30", bore_range_mm: [0.45, 6.05], gauge_length_mm: 60, max_rpm: 40000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.41 },
  { model: "BBT30-MEGA8S-75T", type: "collet_chuck", taper: "BBT30", bore_range_mm: [2.95, 8.05], gauge_length_mm: 75, max_rpm: 40000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.50 },
  { model: "BBT40-MEGA3S-60T", type: "collet_chuck", taper: "BBT40", bore_range_mm: [0.45, 3.25], gauge_length_mm: 60, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.00 },
  { model: "BBT40-MEGA6S-60T", type: "collet_chuck", taper: "BBT40", bore_range_mm: [0.45, 6.05], gauge_length_mm: 60, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.00 },
  { model: "BBT40-MEGA8S-90T", type: "collet_chuck", taper: "BBT40", bore_range_mm: [2.95, 8.05], gauge_length_mm: 90, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.13 },
  { model: "HSK-A40-MEGA3S-75T", type: "collet_chuck", taper: "HSK-A40", bore_range_mm: [0.45, 3.25], gauge_length_mm: 75, max_rpm: 32000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.27 },
  { model: "HSK-A40-MEGA6S-60T", type: "collet_chuck", taper: "HSK-A40", bore_range_mm: [0.45, 6.05], gauge_length_mm: 60, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.27 },
  { model: "HSK-A63-MEGA3S-75T", type: "collet_chuck", taper: "HSK-A63", bore_range_mm: [0.45, 3.25], gauge_length_mm: 75, max_rpm: 32000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.82 },
  { model: "HSK-A63-MEGA6S-60T", type: "collet_chuck", taper: "HSK-A63", bore_range_mm: [0.45, 6.05], gauge_length_mm: 60, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.82 },
  { model: "HSK-A63-MEGA8S-90T", type: "collet_chuck", taper: "HSK-A63", bore_range_mm: [2.95, 8.05], gauge_length_mm: 90, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.91 },
  { model: "C4-MEGA3S-60T", type: "collet_chuck", taper: "Capto-C4", bore_range_mm: [0.45, 3.25], gauge_length_mm: 60, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.32 },
  { model: "C4-MEGA6S-60T", type: "collet_chuck", taper: "Capto-C4", bore_range_mm: [0.45, 6.05], gauge_length_mm: 60, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.32 },
  { model: "C6-MEGA6S-120T", type: "collet_chuck", taper: "Capto-C6", bore_range_mm: [0.45, 6.05], gauge_length_mm: 120, max_rpm: 22000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.32 },

  // -------------------------------------------------------------------------
  // MEGA NEW BABY CHUCK (collet_chuck)
  // -------------------------------------------------------------------------
  { model: "BBT30-MEGA6N-60", type: "collet_chuck", taper: "BBT30", bore_range_mm: [0.25, 6.0], gauge_length_mm: 60, max_rpm: 40000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.45 },
  { model: "BBT30-MEGA10N-60", type: "collet_chuck", taper: "BBT30", bore_range_mm: [1.5, 10.0], gauge_length_mm: 60, max_rpm: 40000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.54 },
  { model: "BBT30-MEGA16N-60", type: "collet_chuck", taper: "BBT30", bore_range_mm: [2.5, 16.0], gauge_length_mm: 60, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.68 },
  { model: "BBT30-MEGA20N-60", type: "collet_chuck", taper: "BBT30", bore_range_mm: [2.5, 20.0], gauge_length_mm: 60, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.73 },
  { model: "BBT40-MEGA6N-60", type: "collet_chuck", taper: "BBT40", bore_range_mm: [0.25, 6.0], gauge_length_mm: 60, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.00 },
  { model: "BBT40-MEGA10N-60", type: "collet_chuck", taper: "BBT40", bore_range_mm: [1.5, 10.0], gauge_length_mm: 60, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.09 },
  { model: "BBT40-MEGA16N-60", type: "collet_chuck", taper: "BBT40", bore_range_mm: [2.5, 16.0], gauge_length_mm: 60, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.27 },
  { model: "BBT40-MEGA20N-60", type: "collet_chuck", taper: "BBT40", bore_range_mm: [2.5, 20.0], gauge_length_mm: 60, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.36 },
  { model: "BBT40-MEGA25N-75", type: "collet_chuck", taper: "BBT40", bore_range_mm: [15.5, 25.4], gauge_length_mm: 75, max_rpm: 20000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.68 },
  { model: "BBT50-MEGA6N-90", type: "collet_chuck", taper: "BBT50", bore_range_mm: [0.25, 6.0], gauge_length_mm: 90, max_rpm: 20000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 4.08 },
  { model: "C4-MEGA6N-75", type: "collet_chuck", taper: "Capto-C4", bore_range_mm: [0.25, 6.0], gauge_length_mm: 75, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.41 },
  { model: "C5-MEGA6N-60", type: "collet_chuck", taper: "Capto-C5", bore_range_mm: [0.25, 6.0], gauge_length_mm: 60, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.50 },
  { model: "C6-MEGA10N-60", type: "collet_chuck", taper: "Capto-C6", bore_range_mm: [1.5, 10.0], gauge_length_mm: 60, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.18 },
  { model: "C8-MEGA13N-90", type: "collet_chuck", taper: "Capto-C8", bore_range_mm: [2.5, 13.0], gauge_length_mm: 90, max_rpm: 20000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 2.72 },

  // -------------------------------------------------------------------------
  // MEGA E CHUCK (collet_chuck — end milling specialist)
  // -------------------------------------------------------------------------
  { model: "BBT30-MEGA6E-60", type: "collet_chuck", taper: "BBT30", bore_range_mm: [3, 6], gauge_length_mm: 60, max_rpm: 40000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.41 },
  { model: "BBT30-MEGA13E-60", type: "collet_chuck", taper: "BBT30", bore_range_mm: [3, 12], gauge_length_mm: 60, max_rpm: 40000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.59 },
  { model: "BBT40-MEGA6E-60", type: "collet_chuck", taper: "BBT40", bore_range_mm: [3, 6], gauge_length_mm: 60, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.00 },
  { model: "BBT40-MEGA13E-60", type: "collet_chuck", taper: "BBT40", bore_range_mm: [3, 12], gauge_length_mm: 60, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.36 },
  { model: "HSK-A63-MEGA6E-75", type: "collet_chuck", taper: "HSK-A63", bore_range_mm: [3, 6], gauge_length_mm: 75, max_rpm: 32000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.82 },
  { model: "HSK-A63-MEGA13E-75", type: "collet_chuck", taper: "HSK-A63", bore_range_mm: [3, 12], gauge_length_mm: 75, max_rpm: 28000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.27 },
  { model: "C5-MEGA8E-55", type: "collet_chuck", taper: "Capto-C5", bore_range_mm: [3, 8], gauge_length_mm: 55, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.59 },
  { model: "C6-MEGA13E-65", type: "collet_chuck", taper: "Capto-C6", bore_range_mm: [3, 12], gauge_length_mm: 65, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.50 },

  // -------------------------------------------------------------------------
  // MEGA ER GRIP (collet_chuck)
  // -------------------------------------------------------------------------
  { model: "BBT30-MEGAER16-60", type: "collet_chuck", taper: "BBT30", bore_range_mm: [1.9, 10], gauge_length_mm: 60, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.50 },
  { model: "BBT40-MEGAER16-60", type: "collet_chuck", taper: "BBT40", bore_range_mm: [1.9, 10], gauge_length_mm: 60, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.13 },
  { model: "BBT40-MEGAER32-75", type: "collet_chuck", taper: "BBT40", bore_range_mm: [3, 20], gauge_length_mm: 75, max_rpm: 25000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.59 },
  { model: "HSK-A63-MEGAER32-90", type: "collet_chuck", taper: "HSK-A63", bore_range_mm: [3, 20], gauge_length_mm: 90, max_rpm: 25000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.36 },

  // -------------------------------------------------------------------------
  // MEGA DOUBLE POWER CHUCK (power_chuck)
  // -------------------------------------------------------------------------
  { model: "BBT30-MEGA12DS-58", type: "power_chuck", taper: "BBT30", bore_range_mm: [12, 12], gauge_length_mm: 58, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.64 },
  { model: "BBT30-MEGA20DS-65", type: "power_chuck", taper: "BBT30", bore_range_mm: [20, 20], gauge_length_mm: 65, max_rpm: 25000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.82 },
  { model: "BBT40-MEGA16DS-75A", type: "power_chuck", taper: "BBT40", bore_range_mm: [16, 16], gauge_length_mm: 75, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.50 },
  { model: "BBT40-MEGA20DS-75A", type: "power_chuck", taper: "BBT40", bore_range_mm: [20, 20], gauge_length_mm: 75, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.59 },
  { model: "BBT40-MEGA25DS-75A", type: "power_chuck", taper: "BBT40", bore_range_mm: [25, 25], gauge_length_mm: 75, max_rpm: 27000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 2.00 },
  { model: "BBT40-MEGA32DS-90A", type: "power_chuck", taper: "BBT40", bore_range_mm: [32, 32], gauge_length_mm: 90, max_rpm: 26000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 2.09 },
  { model: "BBT50-MEGA20DS-105", type: "power_chuck", taper: "BBT50", bore_range_mm: [20, 20], gauge_length_mm: 105, max_rpm: 20000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 5.08 },
  { model: "BBT50-MEGA32DS-105", type: "power_chuck", taper: "BBT50", bore_range_mm: [32, 32], gauge_length_mm: 105, max_rpm: 20000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 5.40 },
  { model: "BBT50-MEGA42DS-105", type: "power_chuck", taper: "BBT50", bore_range_mm: [42, 42], gauge_length_mm: 105, max_rpm: 15000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 5.99 },
  { model: "BBT50-MEGA50DS-120", type: "power_chuck", taper: "BBT50", bore_range_mm: [50, 50], gauge_length_mm: 120, max_rpm: 13000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 7.30 },
  { model: "HSK-A63-MEGA16DS-75", type: "power_chuck", taper: "HSK-A63", bore_range_mm: [16, 16], gauge_length_mm: 75, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.27 },
  { model: "HSK-A63-MEGA20DS-75", type: "power_chuck", taper: "HSK-A63", bore_range_mm: [20, 20], gauge_length_mm: 75, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.50 },
  { model: "HSK-A100-MEGA20DS-105", type: "power_chuck", taper: "HSK-A100", bore_range_mm: [20, 20], gauge_length_mm: 105, max_rpm: 20000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 4.08 },
  { model: "HSK-A100-MEGA32DS-105", type: "power_chuck", taper: "HSK-A100", bore_range_mm: [32, 32], gauge_length_mm: 105, max_rpm: 20000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 4.54 },
  { model: "C5-MEGA16DS-65A", type: "power_chuck", taper: "Capto-C5", bore_range_mm: [16, 16], gauge_length_mm: 65, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.91 },
  { model: "C6-MEGA20DS-75A", type: "power_chuck", taper: "Capto-C6", bore_range_mm: [20, 20], gauge_length_mm: 75, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.59 },

  // -------------------------------------------------------------------------
  // MEGA PERFECT GRIP (milling_chuck — anti-pullout)
  // -------------------------------------------------------------------------
  { model: "BBT40-MEGA16DPG-75", type: "milling_chuck", taper: "BBT40", bore_range_mm: [16, 16], gauge_length_mm: 75, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.68 },
  { model: "BBT40-MEGA20DPG-100", type: "milling_chuck", taper: "BBT40", bore_range_mm: [20, 20], gauge_length_mm: 100, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 2.59 },
  { model: "BBT50-MEGA25DPG-105", type: "milling_chuck", taper: "BBT50", bore_range_mm: [25, 25], gauge_length_mm: 105, max_rpm: 20000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 5.40 },
  { model: "BBT50-MEGA32DPG-105", type: "milling_chuck", taper: "BBT50", bore_range_mm: [32, 32], gauge_length_mm: 105, max_rpm: 20000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 5.58 },
  { model: "HSK-A63-MEGA16DPG-90", type: "milling_chuck", taper: "HSK-A63", bore_range_mm: [16, 16], gauge_length_mm: 90, max_rpm: 28000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.59 },
  { model: "HSK-A63-MEGA20DPG-100", type: "milling_chuck", taper: "HSK-A63", bore_range_mm: [20, 20], gauge_length_mm: 100, max_rpm: 25000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 2.00 },
  { model: "HSK-A100-MEGA25DPG-105", type: "milling_chuck", taper: "HSK-A100", bore_range_mm: [25, 25], gauge_length_mm: 105, max_rpm: 20000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 4.49 },
  { model: "HSK-A100-MEGA32DPG-115", type: "milling_chuck", taper: "HSK-A100", bore_range_mm: [32, 32], gauge_length_mm: 115, max_rpm: 18000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 4.99 },

  // -------------------------------------------------------------------------
  // NEW Hi-POWER MILLING CHUCK (milling_chuck)
  // -------------------------------------------------------------------------
  { model: "BBT30-HMC16S-70", type: "milling_chuck", taper: "BBT30", bore_range_mm: [16, 16], gauge_length_mm: 70, max_rpm: 30000, runout_um: 5, balance_grade: "ISO 16084", weight_kg: 0.68 },
  { model: "BBT30-HMC25S-90", type: "milling_chuck", taper: "BBT30", bore_range_mm: [25, 25], gauge_length_mm: 90, max_rpm: 25000, runout_um: 5, balance_grade: "ISO 16084", weight_kg: 1.18 },
  { model: "BBT40-HMC20S-75", type: "milling_chuck", taper: "BBT40", bore_range_mm: [20, 20], gauge_length_mm: 75, max_rpm: 30000, runout_um: 5, balance_grade: "ISO 16084", weight_kg: 1.41 },
  { model: "BBT40-HMC25S-75", type: "milling_chuck", taper: "BBT40", bore_range_mm: [25, 25], gauge_length_mm: 75, max_rpm: 28000, runout_um: 5, balance_grade: "ISO 16084", weight_kg: 1.50 },
  { model: "BBT40-HMC32S-90", type: "milling_chuck", taper: "BBT40", bore_range_mm: [32, 32], gauge_length_mm: 90, max_rpm: 26000, runout_um: 5, balance_grade: "ISO 16084", weight_kg: 2.00 },
  { model: "BBT50-HMC20S-105", type: "milling_chuck", taper: "BBT50", bore_range_mm: [20, 20], gauge_length_mm: 105, max_rpm: 20000, runout_um: 5, balance_grade: "ISO 16084", weight_kg: 4.31 },
  { model: "BBT50-HMC32S-105", type: "milling_chuck", taper: "BBT50", bore_range_mm: [32, 32], gauge_length_mm: 105, max_rpm: 20000, runout_um: 5, balance_grade: "ISO 16084", weight_kg: 5.40 },
  { model: "HSK-A63-HMC20S-90", type: "milling_chuck", taper: "HSK-A63", bore_range_mm: [20, 20], gauge_length_mm: 90, max_rpm: 30000, runout_um: 5, balance_grade: "ISO 16084", weight_kg: 1.50 },
  { model: "HSK-A63-HMC25S-100", type: "milling_chuck", taper: "HSK-A63", bore_range_mm: [25, 25], gauge_length_mm: 100, max_rpm: 28000, runout_um: 5, balance_grade: "ISO 16084", weight_kg: 1.91 },
  { model: "HSK-A63-HMC32S-110", type: "milling_chuck", taper: "HSK-A63", bore_range_mm: [32, 32], gauge_length_mm: 110, max_rpm: 25000, runout_um: 5, balance_grade: "ISO 16084", weight_kg: 2.31 },
  { model: "HSK-A100-HMC20S-105", type: "milling_chuck", taper: "HSK-A100", bore_range_mm: [20, 20], gauge_length_mm: 105, max_rpm: 20000, runout_um: 5, balance_grade: "ISO 16084", weight_kg: 2.99 },
  { model: "HSK-A100-HMC32S-115", type: "milling_chuck", taper: "HSK-A100", bore_range_mm: [32, 32], gauge_length_mm: 115, max_rpm: 20000, runout_um: 5, balance_grade: "ISO 16084", weight_kg: 3.90 },
  { model: "HSK-A100-HMC42S-115", type: "milling_chuck", taper: "HSK-A100", bore_range_mm: [42, 42], gauge_length_mm: 115, max_rpm: 18000, runout_um: 5, balance_grade: "ISO 16084", weight_kg: 4.90 },

  // -------------------------------------------------------------------------
  // HYDRAULIC CHUCK — Super Slim Type
  // -------------------------------------------------------------------------
  { model: "BBT30-HDC3S-60", type: "hydraulic", taper: "BBT30", bore_range_mm: [3, 3], gauge_length_mm: 60, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.59 },
  { model: "BBT30-HDC6S-60", type: "hydraulic", taper: "BBT30", bore_range_mm: [6, 6], gauge_length_mm: 60, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.59 },
  { model: "BBT30-HDC12S-90", type: "hydraulic", taper: "BBT30", bore_range_mm: [12, 12], gauge_length_mm: 90, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.82 },
  { model: "BBT40-HDC6S-110", type: "hydraulic", taper: "BBT40", bore_range_mm: [6, 6], gauge_length_mm: 110, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.32 },
  { model: "BBT40-HDC10S-110", type: "hydraulic", taper: "BBT40", bore_range_mm: [10, 10], gauge_length_mm: 110, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.41 },
  { model: "BBT40-HDC12S-110", type: "hydraulic", taper: "BBT40", bore_range_mm: [12, 12], gauge_length_mm: 110, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.41 },
  { model: "BBT50-HDC6S-150", type: "hydraulic", taper: "BBT50", bore_range_mm: [6, 6], gauge_length_mm: 150, max_rpm: 20000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 4.22 },
  { model: "BBT50-HDC12S-150", type: "hydraulic", taper: "BBT50", bore_range_mm: [12, 12], gauge_length_mm: 150, max_rpm: 20000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 4.40 },
  { model: "HSK-A40-HDC6S-75", type: "hydraulic", taper: "HSK-A40", bore_range_mm: [6, 6], gauge_length_mm: 75, max_rpm: 40000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.34 },
  { model: "HSK-A40-HDC12S-80", type: "hydraulic", taper: "HSK-A40", bore_range_mm: [12, 12], gauge_length_mm: 80, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.40 },
  { model: "HSK-A63-HDC6S-120", type: "hydraulic", taper: "HSK-A63", bore_range_mm: [6, 6], gauge_length_mm: 120, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.09 },
  { model: "HSK-A63-HDC12S-120", type: "hydraulic", taper: "HSK-A63", bore_range_mm: [12, 12], gauge_length_mm: 120, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.23 },
  { model: "HSK-A100-HDC6S-150", type: "hydraulic", taper: "HSK-A100", bore_range_mm: [6, 6], gauge_length_mm: 150, max_rpm: 20000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 2.54 },
  { model: "HSK-A100-HDC12S-150", type: "hydraulic", taper: "HSK-A100", bore_range_mm: [12, 12], gauge_length_mm: 150, max_rpm: 20000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 2.90 },

  // -------------------------------------------------------------------------
  // HYDRAULIC CHUCK — Standard/Jet Coolant Type
  // -------------------------------------------------------------------------
  { model: "BBT40-HDC.250-2.5", type: "hydraulic", taper: "BBT40", bore_range_mm: [6.35, 6.35], gauge_length_mm: 63.5, max_rpm: 40000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.23 },
  { model: "BBT40-HDC.500-2.5", type: "hydraulic", taper: "BBT40", bore_range_mm: [12.7, 12.7], gauge_length_mm: 63.5, max_rpm: 40000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.32 },
  { model: "BBT40-HDC.750-3", type: "hydraulic", taper: "BBT40", bore_range_mm: [19.05, 19.05], gauge_length_mm: 76.2, max_rpm: 40000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.50 },
  { model: "BBT40-HDC1.000-3", type: "hydraulic", taper: "BBT40", bore_range_mm: [25.4, 25.4], gauge_length_mm: 76.2, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.91 },
  { model: "BBT40-HDC1.250-3.5", type: "hydraulic", taper: "BBT40", bore_range_mm: [31.75, 31.75], gauge_length_mm: 88.9, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 2.31 },
  { model: "HSK-A63-HDC6J-90", type: "hydraulic", taper: "HSK-A63", bore_range_mm: [6, 6], gauge_length_mm: 90, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.00 },
  { model: "HSK-A63-HDC12J-90", type: "hydraulic", taper: "HSK-A63", bore_range_mm: [12, 12], gauge_length_mm: 90, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.09 },
  { model: "HSK-A63-HDC20J-120", type: "hydraulic", taper: "HSK-A63", bore_range_mm: [20, 20], gauge_length_mm: 120, max_rpm: 25000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.50 },
  { model: "HSK-A63-HDC32J-120", type: "hydraulic", taper: "HSK-A63", bore_range_mm: [32, 32], gauge_length_mm: 120, max_rpm: 20000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 2.31 },

  // -------------------------------------------------------------------------
  // SHRINK FIT HOLDER — BCV (CAT)
  // -------------------------------------------------------------------------
  { model: "BCV40-SFC.250-3.5", type: "shrink_fit", taper: "CAT40", bore_range_mm: [6.35, 6.35], gauge_length_mm: 88.9, max_rpm: 40000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.18 },
  { model: "BCV40-SFC.500-3.5", type: "shrink_fit", taper: "CAT40", bore_range_mm: [12.7, 12.7], gauge_length_mm: 88.9, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.23 },
  { model: "BCV40-SFC.750-4", type: "shrink_fit", taper: "CAT40", bore_range_mm: [19.05, 19.05], gauge_length_mm: 101.6, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.41 },
  { model: "BCV40-SFC1.000-4", type: "shrink_fit", taper: "CAT40", bore_range_mm: [25.4, 25.4], gauge_length_mm: 101.6, max_rpm: 25000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.72 },
  { model: "BCV50-SFC.500-4", type: "shrink_fit", taper: "CAT50", bore_range_mm: [12.7, 12.7], gauge_length_mm: 101.6, max_rpm: 20000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 3.27 },
  { model: "BCV50-SFC1.000-4", type: "shrink_fit", taper: "CAT50", bore_range_mm: [25.4, 25.4], gauge_length_mm: 101.6, max_rpm: 15000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 3.81 },
  { model: "BCV50-SFC1.250-4", type: "shrink_fit", taper: "CAT50", bore_range_mm: [31.75, 31.75], gauge_length_mm: 101.6, max_rpm: 12000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 3.67 },

  // -------------------------------------------------------------------------
  // SHRINK FIT HOLDER — BBT (MAS 403)
  // -------------------------------------------------------------------------
  { model: "BBT30-SRC6-75", type: "shrink_fit", taper: "BBT30", bore_range_mm: [6, 6], gauge_length_mm: 75, max_rpm: 40000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.45 },
  { model: "BBT30-SRC10-75", type: "shrink_fit", taper: "BBT30", bore_range_mm: [10, 10], gauge_length_mm: 75, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.54 },
  { model: "BBT30-SRC12-75", type: "shrink_fit", taper: "BBT30", bore_range_mm: [12, 12], gauge_length_mm: 75, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.59 },
  { model: "BBT40-SRC6-90", type: "shrink_fit", taper: "BBT40", bore_range_mm: [6, 6], gauge_length_mm: 90, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.09 },
  { model: "BBT40-SRC10-90", type: "shrink_fit", taper: "BBT40", bore_range_mm: [10, 10], gauge_length_mm: 90, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.18 },
  { model: "BBT40-SRC12-90", type: "shrink_fit", taper: "BBT40", bore_range_mm: [12, 12], gauge_length_mm: 90, max_rpm: 28000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.18 },
  { model: "BBT40-SRC16-90", type: "shrink_fit", taper: "BBT40", bore_range_mm: [16, 16], gauge_length_mm: 90, max_rpm: 25000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.27 },
  { model: "BBT40-SRC20-90", type: "shrink_fit", taper: "BBT40", bore_range_mm: [20, 20], gauge_length_mm: 90, max_rpm: 22000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.36 },
  { model: "BBT30-SFC.250-3", type: "shrink_fit", taper: "BBT30", bore_range_mm: [6.35, 6.35], gauge_length_mm: 76.2, max_rpm: 40000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.54 },
  { model: "BBT30-SFC.500-3", type: "shrink_fit", taper: "BBT30", bore_range_mm: [12.7, 12.7], gauge_length_mm: 76.2, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.59 },
  { model: "BBT40-SFC.500-3.5", type: "shrink_fit", taper: "BBT40", bore_range_mm: [12.7, 12.7], gauge_length_mm: 88.9, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.23 },
  { model: "BBT40-SFC.750-4", type: "shrink_fit", taper: "BBT40", bore_range_mm: [19.05, 19.05], gauge_length_mm: 101.6, max_rpm: 25000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.45 },
  { model: "BBT40-SFC1.000-4", type: "shrink_fit", taper: "BBT40", bore_range_mm: [25.4, 25.4], gauge_length_mm: 101.6, max_rpm: 20000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.81 },

  // -------------------------------------------------------------------------
  // SHRINK FIT HOLDER — BBT Slim Type
  // -------------------------------------------------------------------------
  { model: "BBT30-SRC6S-105", type: "shrink_fit", taper: "BBT30", bore_range_mm: [6, 6], gauge_length_mm: 105, max_rpm: 35000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.50 },
  { model: "BBT30-SRC12S-105", type: "shrink_fit", taper: "BBT30", bore_range_mm: [12, 12], gauge_length_mm: 105, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.59 },
  { model: "BBT40-SRC6S-120", type: "shrink_fit", taper: "BBT40", bore_range_mm: [6, 6], gauge_length_mm: 120, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.09 },
  { model: "BBT40-SRC12S-120", type: "shrink_fit", taper: "BBT40", bore_range_mm: [12, 12], gauge_length_mm: 120, max_rpm: 25000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.23 },

  // -------------------------------------------------------------------------
  // SHRINK FIT HOLDER — HSK
  // -------------------------------------------------------------------------
  { model: "HSK-A63-SRC6-90", type: "shrink_fit", taper: "HSK-A63", bore_range_mm: [6, 6], gauge_length_mm: 90, max_rpm: 30000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.91 },
  { model: "HSK-A63-SRC10-90", type: "shrink_fit", taper: "HSK-A63", bore_range_mm: [10, 10], gauge_length_mm: 90, max_rpm: 28000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.00 },
  { model: "HSK-A63-SRC12-90", type: "shrink_fit", taper: "HSK-A63", bore_range_mm: [12, 12], gauge_length_mm: 90, max_rpm: 25000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.00 },
  { model: "HSK-A63-SRC16-90", type: "shrink_fit", taper: "HSK-A63", bore_range_mm: [16, 16], gauge_length_mm: 90, max_rpm: 22000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.00 },
  { model: "HSK-A63-SRC20-90", type: "shrink_fit", taper: "HSK-A63", bore_range_mm: [20, 20], gauge_length_mm: 90, max_rpm: 20000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.09 },
  { model: "HSK-A63-SRC6S-120", type: "shrink_fit", taper: "HSK-A63", bore_range_mm: [6, 6], gauge_length_mm: 120, max_rpm: 28000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 0.91 },
  { model: "HSK-A63-SRC12S-120", type: "shrink_fit", taper: "HSK-A63", bore_range_mm: [12, 12], gauge_length_mm: 120, max_rpm: 22000, runout_um: 3, balance_grade: "ISO 16084", weight_kg: 1.00 },
];

// ============================================================================
// LOOKUP HELPERS
// ============================================================================

/** Find holders matching a given taper and tool diameter */
export function findHolders(
  taper: string,
  toolDiameterMm: number,
  type?: ToolholderSpec["type"],
): ToolholderSpec[] {
  return BIG_DAISHOWA_HOLDERS.filter((h) => {
    if (h.taper !== taper) return false;
    if (type && h.type !== type) return false;
    return toolDiameterMm >= h.bore_range_mm[0] && toolDiameterMm <= h.bore_range_mm[1];
  });
}

/** Find the best holder for a given application (lowest runout, then highest RPM) */
export function recommendHolder(
  taper: string,
  toolDiameterMm: number,
  requiredRpm: number,
  type?: ToolholderSpec["type"],
): ToolholderSpec | null {
  const candidates = findHolders(taper, toolDiameterMm, type).filter(
    (h) => h.max_rpm >= requiredRpm,
  );
  if (candidates.length === 0) return null;
  // Sort by runout (ascending), then max_rpm (descending)
  candidates.sort((a, b) => a.runout_um - b.runout_um || b.max_rpm - a.max_rpm);
  return candidates[0];
}

/** Get all available tapers in the catalog */
export function getAvailableTapers(): string[] {
  const tapers = new Set(BIG_DAISHOWA_HOLDERS.map((h) => h.taper));
  return [...tapers].sort();
}

/** Get all holder types available for a given taper */
export function getHolderTypesForTaper(taper: string): ToolholderSpec["type"][] {
  const types = new Set(
    BIG_DAISHOWA_HOLDERS.filter((h) => h.taper === taper).map((h) => h.type),
  );
  return [...types].sort() as ToolholderSpec["type"][];
}
