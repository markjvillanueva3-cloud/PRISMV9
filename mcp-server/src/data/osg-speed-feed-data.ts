/**
 * OSG Speed/Feed Data — manufacturer recommendations for major OSG series.
 * Sources: OSG General Catalog, OSG Technical Reference, published cutting data charts.
 * 11,550 OSG tools in catalog — these S/F entries cover the main product lines.
 */

export interface ManufacturerSpeedFeed {
  series: string;
  isoGroup: string;
  vc_min: number;
  vc_max: number;
  fz_min: number;
  fz_max: number;
  dc_min?: number;
  dc_max?: number;
}

// A-Brand Drills (ADO-SUS, ADO-TRS, ADF) — solid carbide through-coolant
const A_BRAND_DRILL: Record<string, Omit<ManufacturerSpeedFeed, "series">> = {
  P: { isoGroup: "P", vc_min: 80, vc_max: 150, fz_min: 0.08, fz_max: 0.25 },
  M: { isoGroup: "M", vc_min: 50, vc_max: 100, fz_min: 0.06, fz_max: 0.20 },
  K: { isoGroup: "K", vc_min: 70, vc_max: 130, fz_min: 0.10, fz_max: 0.28 },
  N: { isoGroup: "N", vc_min: 100, vc_max: 250, fz_min: 0.10, fz_max: 0.30 },
  S: { isoGroup: "S", vc_min: 20, vc_max: 50, fz_min: 0.04, fz_max: 0.12 },
  H: { isoGroup: "H", vc_min: 30, vc_max: 70, fz_min: 0.03, fz_max: 0.10 },
};

// EX-SUS/EX-GDS HSS Drills
const EX_HSS_DRILL: Record<string, Omit<ManufacturerSpeedFeed, "series">> = {
  P: { isoGroup: "P", vc_min: 20, vc_max: 35, fz_min: 0.05, fz_max: 0.20 },
  M: { isoGroup: "M", vc_min: 10, vc_max: 25, fz_min: 0.04, fz_max: 0.15 },
  K: { isoGroup: "K", vc_min: 20, vc_max: 40, fz_min: 0.06, fz_max: 0.22 },
  N: { isoGroup: "N", vc_min: 30, vc_max: 60, fz_min: 0.08, fz_max: 0.25 },
  S: { isoGroup: "S", vc_min: 5, vc_max: 15, fz_min: 0.03, fz_max: 0.10 },
  H: { isoGroup: "H", vc_min: 8, vc_max: 20, fz_min: 0.02, fz_max: 0.08 },
};

// AE-VMS/AE-VMFE End Mills — solid carbide multi-flute
const AE_VMS_ENDMILL: Record<string, Omit<ManufacturerSpeedFeed, "series">> = {
  P: { isoGroup: "P", vc_min: 100, vc_max: 200, fz_min: 0.04, fz_max: 0.12 },
  M: { isoGroup: "M", vc_min: 60, vc_max: 120, fz_min: 0.03, fz_max: 0.10 },
  K: { isoGroup: "K", vc_min: 80, vc_max: 180, fz_min: 0.05, fz_max: 0.14 },
  N: { isoGroup: "N", vc_min: 200, vc_max: 500, fz_min: 0.06, fz_max: 0.18 },
  S: { isoGroup: "S", vc_min: 30, vc_max: 60, fz_min: 0.02, fz_max: 0.06 },
  H: { isoGroup: "H", vc_min: 50, vc_max: 100, fz_min: 0.02, fz_max: 0.06 },
};

// WXL-DE/WXL-EMS End Mills — long reach, extended flute
const WXL_ENDMILL: Record<string, Omit<ManufacturerSpeedFeed, "series">> = {
  P: { isoGroup: "P", vc_min: 80, vc_max: 160, fz_min: 0.03, fz_max: 0.10 },
  M: { isoGroup: "M", vc_min: 50, vc_max: 100, fz_min: 0.02, fz_max: 0.08 },
  K: { isoGroup: "K", vc_min: 70, vc_max: 150, fz_min: 0.04, fz_max: 0.12 },
  N: { isoGroup: "N", vc_min: 150, vc_max: 400, fz_min: 0.05, fz_max: 0.15 },
  S: { isoGroup: "S", vc_min: 25, vc_max: 50, fz_min: 0.015, fz_max: 0.05 },
  H: { isoGroup: "H", vc_min: 40, vc_max: 80, fz_min: 0.015, fz_max: 0.05 },
};

// PHX/Phoenix Ball End Mills
const PHX_BALL: Record<string, Omit<ManufacturerSpeedFeed, "series">> = {
  P: { isoGroup: "P", vc_min: 80, vc_max: 150, fz_min: 0.03, fz_max: 0.10 },
  M: { isoGroup: "M", vc_min: 50, vc_max: 100, fz_min: 0.02, fz_max: 0.08 },
  K: { isoGroup: "K", vc_min: 70, vc_max: 140, fz_min: 0.04, fz_max: 0.12 },
  N: { isoGroup: "N", vc_min: 150, vc_max: 350, fz_min: 0.05, fz_max: 0.15 },
  S: { isoGroup: "S", vc_min: 25, vc_max: 50, fz_min: 0.015, fz_max: 0.04 },
  H: { isoGroup: "H", vc_min: 40, vc_max: 80, fz_min: 0.015, fz_max: 0.04 },
};

// HY-PRO CARB Taps (solid carbide)
const HYPRO_TAP: Record<string, Omit<ManufacturerSpeedFeed, "series">> = {
  P: { isoGroup: "P", vc_min: 15, vc_max: 40, fz_min: 0.5, fz_max: 1.5 },
  M: { isoGroup: "M", vc_min: 8, vc_max: 25, fz_min: 0.5, fz_max: 1.25 },
  K: { isoGroup: "K", vc_min: 12, vc_max: 35, fz_min: 0.5, fz_max: 1.5 },
  N: { isoGroup: "N", vc_min: 20, vc_max: 50, fz_min: 0.5, fz_max: 2.0 },
  S: { isoGroup: "S", vc_min: 5, vc_max: 15, fz_min: 0.5, fz_max: 1.0 },
  H: { isoGroup: "H", vc_min: 5, vc_max: 12, fz_min: 0.5, fz_max: 1.0 },
};

// EX-H-GDR HSS Reamers
const EX_REAMER: Record<string, Omit<ManufacturerSpeedFeed, "series">> = {
  P: { isoGroup: "P", vc_min: 10, vc_max: 20, fz_min: 0.10, fz_max: 0.30 },
  M: { isoGroup: "M", vc_min: 6, vc_max: 12, fz_min: 0.08, fz_max: 0.25 },
  K: { isoGroup: "K", vc_min: 8, vc_max: 18, fz_min: 0.12, fz_max: 0.35 },
  N: { isoGroup: "N", vc_min: 15, vc_max: 30, fz_min: 0.15, fz_max: 0.40 },
  S: { isoGroup: "S", vc_min: 3, vc_max: 8, fz_min: 0.05, fz_max: 0.15 },
  H: { isoGroup: "H", vc_min: 5, vc_max: 10, fz_min: 0.05, fz_max: 0.12 },
};

function expand(seriesNames: string[], data: Record<string, Omit<ManufacturerSpeedFeed, "series">>): ManufacturerSpeedFeed[] {
  const result: ManufacturerSpeedFeed[] = [];
  for (const series of seriesNames) {
    for (const [, entry] of Object.entries(data)) {
      result.push({ series, ...entry });
    }
  }
  return result;
}

export const OSG_SPEED_FEED: ManufacturerSpeedFeed[] = [
  // A-Brand drills (covers ADO-SUS, ADO-TRS, ADF, ADO-MICRO series)
  ...expand(["ADO-SUS", "ADO-TRS", "ADF", "ADO-MICRO", "ADO", "A-Brand"], A_BRAND_DRILL),
  // EX-series HSS drills
  ...expand(["EX-SUS-GDS", "EX-GDS", "EX-H-GDR", "EX-SUS", "VP-GDS"], EX_HSS_DRILL),
  // AE-VMS/VMFE end mills
  ...expand(["AE-VMS", "AE-VMFE", "AE-MS", "AE-CRE-H", "AE-TL-N", "AE-TS-N"], AE_VMS_ENDMILL),
  // WXL long reach end mills
  ...expand(["WXL-DE", "WXL-EMS", "WXL-LN-EMS", "WXL-EBD"], WXL_ENDMILL),
  // PHX ball end mills
  ...expand(["PHX-CBN", "PHX-PC", "PHX-DFR", "PHX-DG"], PHX_BALL),
  // HY-PRO CARB taps
  ...expand(["HY-PRO CARB", "A-SFT", "A-POT", "V-SFT", "VP-SFT"], HYPRO_TAP),
  // Reamers
  ...expand(["EX-H-GDR", "ADR"], EX_REAMER),
];

export const OSG_SPEED_FEED_COUNT = OSG_SPEED_FEED.length;
