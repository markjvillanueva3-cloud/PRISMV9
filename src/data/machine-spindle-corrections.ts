/**
 * Machine Spindle Data Corrections — Verified from Manufacturer Sources
 *
 * These corrections override incorrect spindle data in the machine profile catalogs.
 * Each entry documents the source of the correction and what was wrong in the original data.
 *
 * Generated: 2026-03-26 as part of 0-D-TORQUE session (U-TQ3)
 *
 * Sources:
 * - Kern: kern-microtechnik.com/maschinen/kern-pyramid-nano
 * - DATRON: datron.com/cnc-machines/ + datron-neo.com/technical-data/
 * - Makino: makino.com/D200Z (partial — power estimated from class)
 * - Mazak: mazak.com/us-en/products/integrex-e-ramtec/ (turning spindle, power estimated)
 */

export interface SpindleCorrection {
  brand: string;
  model: string;
  original_issue: string;
  source: string;
  corrected_spindle: {
    max_rpm: number;
    power_kw: number;
    torque_nm: number;
    taper: string;
    base_rpm?: number;
  };
  confidence: number; // 0-1
}

export const SPINDLE_CORRECTIONS: SpindleCorrection[] = [
  {
    brand: "Kern",
    model: "Pyramid Nano",
    original_issue: "Catalog had torque_nm=0.5, power_kw=1.9 — partial/corrupted data. Machine has HSK40 spindle option with 20 kW.",
    source: "kern-microtechnik.com brochure: HSK40 option: 42,000 RPM, 5.9 Nm (S1), 20 kW",
    corrected_spindle: {
      max_rpm: 42000,
      power_kw: 20,
      torque_nm: 5.9, // S1 continuous
      taper: "HSK-A40",
      base_rpm: 32364, // 20 * 9549 / 5.9 = 32,363
    },
    confidence: 0.90,
  },
  {
    brand: "DATRON",
    model: "DATRON M8Cube 3 axis",
    original_issue: "Catalog had CAT40/10,000 RPM — machine actually uses HSK-E25 at 60,000 RPM",
    source: "datron.com: 3 kW HF spindle, 60,000 RPM, nominal torque 1.4 Nm, HSK-E25",
    corrected_spindle: {
      max_rpm: 60000,
      power_kw: 3,
      torque_nm: 1.4, // nominal
      taper: "HSK-E25",
      base_rpm: 20463, // 3 * 9549 / 1.4 = 20,464
    },
    confidence: 0.85,
  },
  {
    brand: "DATRON",
    model: "DATRON M8Cube 4 axis",
    original_issue: "Same spindle as M8Cube 3 axis — catalog had wrong taper and RPM",
    source: "datron.com: same 3 kW HF spindle across M8Cube variants",
    corrected_spindle: {
      max_rpm: 60000,
      power_kw: 3,
      torque_nm: 1.4,
      taper: "HSK-E25",
      base_rpm: 20463,
    },
    confidence: 0.85,
  },
  {
    brand: "DATRON",
    model: "DATRON M8Cube 5 axis",
    original_issue: "Same spindle as M8Cube 3 axis — catalog had wrong taper and RPM",
    source: "datron.com: same 3 kW HF spindle across M8Cube variants",
    corrected_spindle: {
      max_rpm: 60000,
      power_kw: 3,
      torque_nm: 1.4,
      taper: "HSK-E25",
      base_rpm: 20463,
    },
    confidence: 0.85,
  },
  {
    brand: "DATRON",
    model: "DATRON neo",
    original_issue: "Catalog had CAT40/10,000 RPM — machine uses direct shank at 40,000 RPM",
    source: "datron-neo.com: 2 kW HF spindle, 4,000-40,000 RPM, direct shank clamping",
    corrected_spindle: {
      max_rpm: 40000,
      power_kw: 2,
      torque_nm: 0.96, // 2 * 9549 / 20000 ≈ 0.95 Nm (estimated peak)
      taper: "DATRON-direct",
      base_rpm: 19894, // 2 * 9549 / 0.96 ≈ 19,894
    },
    confidence: 0.75, // torque estimated from power/speed
  },
  {
    brand: "Makino",
    model: "Makino D200Z",
    original_issue: "Catalog had max_rpm=10,000 — machine actually has 30,000 RPM HSK-E50 spindle",
    source: "makino.com/D200Z: 30,000 RPM, HSK-E50; power estimated from Makino D-series class (~18 kW)",
    corrected_spindle: {
      max_rpm: 30000,
      power_kw: 18,
      torque_nm: 8.6, // estimated: 18 * 9549 / 20000 ≈ 8.6 Nm (typical HSK-E50 at this RPM)
      taper: "HSK-E50",
      base_rpm: 19974, // 18 * 9549 / 8.6 ≈ 19,974
    },
    confidence: 0.60, // power and torque estimated from machine class — not manufacturer-verified
  },
  {
    brand: "Mazak",
    model: "INTEGREX e-RAMTEC",
    original_issue: "Catalog max_rpm=1,000 is the TURNING spindle (VTL). This is correct for the turning capability, but the low max_rpm caused computed base_rpm to exceed max_rpm.",
    source: "mazak.com: VTL turning spindle, 1,000 RPM typical. Milling spindle separate (10,000/5,000/15,000 options). Power estimated from VTL class.",
    corrected_spindle: {
      max_rpm: 1000, // Correct — this is a VTL
      power_kw: 45, // Estimated for VTL class
      torque_nm: 3000, // Estimated: 45 * 9549 / 143 ≈ high (VTLs have enormous torque)
      taper: "N/A", // VTL turning spindle — no tool taper
      base_rpm: 143, // 45 * 9549 / 3000 = 143 RPM
    },
    confidence: 0.50, // all values estimated — needs manual verification
  },
];

/**
 * Apply corrections to catalog data.
 * Returns corrected spindle if a match exists, else null.
 */
export function getSpindleCorrection(brand: string, model: string): SpindleCorrection | null {
  const brandL = brand.toLowerCase();
  const modelL = model.toLowerCase();
  return SPINDLE_CORRECTIONS.find(c =>
    c.brand.toLowerCase() === brandL && c.model.toLowerCase() === modelL
  ) ?? null;
}
