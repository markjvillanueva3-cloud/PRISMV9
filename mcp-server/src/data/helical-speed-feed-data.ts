/**
 * Helical Solutions Speed/Feed Data — extracted from the 2023 Master Product Catalog (308 pp).
 *
 * Source: Helical-2023-Master-Product-Catalog-Interactive.pdf
 * Extracted from 46 speed/feed pages covering all major tool series.
 *
 * All vc values converted to m/min (SFM x 0.3048).
 * All fz values converted to mm/tooth (IPT x 25.4).
 * fz ranges span the min/max across all diameter columns (1/8" to 1") and
 * milling processes (Slot/Rgh/HEM/Fin) to give the broadest usable envelope.
 *
 * ISO material groups: P=Steel, M=Stainless, K=Cast Iron, N=Non-ferrous,
 *                      S=Superalloys/Ti, H=Hardened Steel.
 */

import { ManufacturerSpeedFeed } from './manufacturer-speed-feed-data';

// ---------------------------------------------------------------------------
// Aluminum / Non-Ferrous Series (pages 11-74)
// ---------------------------------------------------------------------------
// Series: H35ALV-C-3, H35ALV-C-RN-3, H45AL-C-3, H45AL-C-RN-3,
//         HVAL-C-5, HMG-RN-2, H45AL-2, H45AL-RN-2, HMGC-RN-3,
//         H35AL-3, H35AL-RN-3, H40ALV-3, H40ALV-RN-3, H45AL-3, H45AL-RN-3,
//         HVAL-5
//
// Materials: Wrought Aluminum (SFM 2100), Cast Aluminum (SFM 1400), Copper (SFM 770)
// IPT ranges across 1/8"-1" diameters and Slot/Rgh/HEM/Fin processes.

const ALUMINUM_3FL_CHIPBREAKER: ManufacturerSpeedFeed[] = [
  // H35ALV-C-3 / H35ALV-C-RN-3 — 3F chipbreaker rougher 35deg (pg 15)
  { series: 'H35ALV-C-3', isoGroup: 'N', vc_min: 640.08, vc_max: 640.08,
    fz_min: 0.0178, fz_max: 0.2388, dc_min: 3.175, dc_max: 25.4 },
    // Wrought Al: SFM 2100 = 640.08 m/min, IPT .0007-.0094 = 0.0178-0.2388 mm
  { series: 'H35ALV-C-3', isoGroup: 'N', vc_min: 426.72, vc_max: 426.72,
    fz_min: 0.0279, fz_max: 0.3683, dc_min: 3.175, dc_max: 25.4 },
    // Cast Al: SFM 1400 = 426.72 m/min
  { series: 'H35ALV-C-3', isoGroup: 'N', vc_min: 234.70, vc_max: 234.70,
    fz_min: 0.0203, fz_max: 0.2464, dc_min: 3.175, dc_max: 25.4 },
    // Copper: SFM 770 = 234.70 m/min

  // H45AL-C-3 / H45AL-C-RN-3 — 3F chipbreaker rougher 45deg (pg 19)
  { series: 'H45AL-C-3', isoGroup: 'N', vc_min: 640.08, vc_max: 640.08,
    fz_min: 0.0178, fz_max: 0.2616, dc_min: 3.175, dc_max: 25.4 },
  { series: 'H45AL-C-3', isoGroup: 'N', vc_min: 426.72, vc_max: 426.72,
    fz_min: 0.0279, fz_max: 0.4064, dc_min: 3.175, dc_max: 25.4 },
  { series: 'H45AL-C-3', isoGroup: 'N', vc_min: 234.70, vc_max: 234.70,
    fz_min: 0.0203, fz_max: 0.2718, dc_min: 3.175, dc_max: 25.4 },
];

const ALUMINUM_5FL_HEM: ManufacturerSpeedFeed[] = [
  // HVAL-C-5 — 5F chipbreaker HEM rougher (pg 21)
  { series: 'HVAL-C-5', isoGroup: 'N', vc_min: 640.08, vc_max: 640.08,
    fz_min: 0.0330, fz_max: 0.2718, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HVAL-C-5', isoGroup: 'N', vc_min: 426.72, vc_max: 426.72,
    fz_min: 0.0533, fz_max: 0.4242, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HVAL-C-5', isoGroup: 'N', vc_min: 234.70, vc_max: 234.70,
    fz_min: 0.0356, fz_max: 0.2845, dc_min: 3.175, dc_max: 25.4 },
];

const ALUMINUM_2FL: ManufacturerSpeedFeed[] = [
  // HMG-RN-2 — 2F high balance reduced neck (pg 24)
  { series: 'HMG-RN-2', isoGroup: 'N', vc_min: 640.08, vc_max: 640.08,
    fz_min: 0.0178, fz_max: 0.2616, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HMG-RN-2', isoGroup: 'N', vc_min: 426.72, vc_max: 426.72,
    fz_min: 0.0279, fz_max: 0.4064, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HMG-RN-2', isoGroup: 'N', vc_min: 234.70, vc_max: 234.70,
    fz_min: 0.0203, fz_max: 0.2718, dc_min: 3.175, dc_max: 25.4 },

  // H45AL-2 / H45AL-RN-2 — 2F 45deg helix (pg 31)
  { series: 'H45AL-2', isoGroup: 'N', vc_min: 640.08, vc_max: 640.08,
    fz_min: 0.0178, fz_max: 0.2540, dc_min: 3.175, dc_max: 25.4 },
  { series: 'H45AL-2', isoGroup: 'N', vc_min: 426.72, vc_max: 426.72,
    fz_min: 0.0279, fz_max: 0.3988, dc_min: 3.175, dc_max: 25.4 },
  { series: 'H45AL-2', isoGroup: 'N', vc_min: 234.70, vc_max: 234.70,
    fz_min: 0.0178, fz_max: 0.2642, dc_min: 3.175, dc_max: 25.4 },
];

const ALUMINUM_3FL: ManufacturerSpeedFeed[] = [
  // HMGC-RN-3 — 3F coolant through high balance (pg 34)
  { series: 'HMGC-RN-3', isoGroup: 'N', vc_min: 640.08, vc_max: 640.08,
    fz_min: 0.0178, fz_max: 0.2591, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HMGC-RN-3', isoGroup: 'N', vc_min: 426.72, vc_max: 426.72,
    fz_min: 0.0279, fz_max: 0.4013, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HMGC-RN-3', isoGroup: 'N', vc_min: 234.70, vc_max: 234.70,
    fz_min: 0.0203, fz_max: 0.2692, dc_min: 3.175, dc_max: 25.4 },

  // H35AL-3 / H35AL-RN-3 — 3F 35deg helix (pg 43)
  { series: 'H35AL-3', isoGroup: 'N', vc_min: 640.08, vc_max: 640.08,
    fz_min: 0.0178, fz_max: 0.2311, dc_min: 3.175, dc_max: 25.4 },
  { series: 'H35AL-3', isoGroup: 'N', vc_min: 426.72, vc_max: 426.72,
    fz_min: 0.0279, fz_max: 0.3607, dc_min: 3.175, dc_max: 25.4 },
  { series: 'H35AL-3', isoGroup: 'N', vc_min: 234.70, vc_max: 234.70,
    fz_min: 0.0203, fz_max: 0.2413, dc_min: 3.175, dc_max: 25.4 },

  // H40ALV-3 / H40ALV-RN-3 — 3F 40deg variable pitch (pg 62)
  { series: 'H40ALV-3', isoGroup: 'N', vc_min: 640.08, vc_max: 640.08,
    fz_min: 0.0203, fz_max: 0.2489, dc_min: 3.175, dc_max: 25.4 },
  { series: 'H40ALV-3', isoGroup: 'N', vc_min: 426.72, vc_max: 426.72,
    fz_min: 0.0305, fz_max: 0.3886, dc_min: 3.175, dc_max: 25.4 },
  { series: 'H40ALV-3', isoGroup: 'N', vc_min: 234.70, vc_max: 234.70,
    fz_min: 0.0203, fz_max: 0.2616, dc_min: 3.175, dc_max: 25.4 },

  // H45AL-3 / H45AL-RN-3 — 3F 45deg helix (pg 69)
  { series: 'H45AL-3', isoGroup: 'N', vc_min: 640.08, vc_max: 640.08,
    fz_min: 0.0203, fz_max: 0.2743, dc_min: 3.175, dc_max: 25.4 },
  { series: 'H45AL-3', isoGroup: 'N', vc_min: 426.72, vc_max: 426.72,
    fz_min: 0.0330, fz_max: 0.4293, dc_min: 3.175, dc_max: 25.4 },
  { series: 'H45AL-3', isoGroup: 'N', vc_min: 234.70, vc_max: 234.70,
    fz_min: 0.0229, fz_max: 0.2870, dc_min: 3.175, dc_max: 25.4 },
];

// ---------------------------------------------------------------------------
// Steel Series (pages 75-170) — HSVR-C-4, HEV-C-5/6/7, HSV, HEV, etc.
// ---------------------------------------------------------------------------
// Comprehensive data from HSVR-C-4 (pg 78) and HEV-C-5 (pg 83) — both have
// identical material coverage. We use HEV-C-5 as the "steel general" reference
// since it has slightly higher chipload capacity. Additional series share
// identical SFM values with proportional IPT scaling.

const STEEL_ROUGHER_4FL: ManufacturerSpeedFeed[] = [
  // HSVR-C-4 — 4F chipbreaker rougher (pg 78)
  // Carbon Steel <75 HRB: SFM 455
  { series: 'HSVR-C-4', isoGroup: 'P', vc_min: 138.68, vc_max: 138.68,
    fz_min: 0.0203, fz_max: 0.2236, dc_min: 3.175, dc_max: 25.4 },
  // Carbon Steel 75-98 HRB: SFM 445
  { series: 'HSVR-C-4', isoGroup: 'P', vc_min: 135.64, vc_max: 135.64,
    fz_min: 0.0152, fz_max: 0.1651, dc_min: 3.175, dc_max: 25.4 },
  // Carbon Steel 21-36 HRC: SFM 400
  { series: 'HSVR-C-4', isoGroup: 'P', vc_min: 121.92, vc_max: 121.92,
    fz_min: 0.0102, fz_max: 0.1067, dc_min: 3.175, dc_max: 25.4 },
  // Low Alloy Steel 75-98 HRB: SFM 390
  { series: 'HSVR-C-4', isoGroup: 'P', vc_min: 118.87, vc_max: 118.87,
    fz_min: 0.0127, fz_max: 0.1422, dc_min: 3.175, dc_max: 25.4 },
  // Low Alloy Steel 21-36 HRC: SFM 340
  { series: 'HSVR-C-4', isoGroup: 'P', vc_min: 103.63, vc_max: 103.63,
    fz_min: 0.0102, fz_max: 0.1067, dc_min: 3.175, dc_max: 25.4 },
  // Low Alloy Steel 36-50 HRC: SFM 260
  { series: 'HSVR-C-4', isoGroup: 'H', vc_min: 79.25, vc_max: 79.25,
    fz_min: 0.0076, fz_max: 0.0914, dc_min: 3.175, dc_max: 25.4 },
  // Low Alloy Steel >50 HRC: SFM 155
  { series: 'HSVR-C-4', isoGroup: 'H', vc_min: 47.24, vc_max: 47.24,
    fz_min: 0.0076, fz_max: 0.0737, dc_min: 3.175, dc_max: 25.4 },
  // Tool Steel 75-98 HRB: SFM 340
  { series: 'HSVR-C-4', isoGroup: 'P', vc_min: 103.63, vc_max: 103.63,
    fz_min: 0.0127, fz_max: 0.1422, dc_min: 3.175, dc_max: 25.4 },
  // Tool Steel 21-36 HRC: SFM 250
  { series: 'HSVR-C-4', isoGroup: 'P', vc_min: 76.20, vc_max: 76.20,
    fz_min: 0.0102, fz_max: 0.1143, dc_min: 3.175, dc_max: 25.4 },
  // Tool Steel 36-50 HRC: SFM 145
  { series: 'HSVR-C-4', isoGroup: 'H', vc_min: 44.20, vc_max: 44.20,
    fz_min: 0.0076, fz_max: 0.0889, dc_min: 3.175, dc_max: 25.4 },
  // Tool Steel >50 HRC: SFM 85
  { series: 'HSVR-C-4', isoGroup: 'H', vc_min: 25.91, vc_max: 25.91,
    fz_min: 0.0076, fz_max: 0.0711, dc_min: 3.175, dc_max: 25.4 },
  // Specialty Steel <75 HRB: SFM 290
  { series: 'HSVR-C-4', isoGroup: 'P', vc_min: 88.39, vc_max: 88.39,
    fz_min: 0.0152, fz_max: 0.1854, dc_min: 3.175, dc_max: 25.4 },
  // Specialty Steel 75-98 HRB: SFM 255
  { series: 'HSVR-C-4', isoGroup: 'P', vc_min: 77.72, vc_max: 77.72,
    fz_min: 0.0127, fz_max: 0.1270, dc_min: 3.175, dc_max: 25.4 },
  // Austenitic SS 75-98 HRB: SFM 265
  { series: 'HSVR-C-4', isoGroup: 'M', vc_min: 80.77, vc_max: 80.77,
    fz_min: 0.0127, fz_max: 0.1372, dc_min: 3.175, dc_max: 25.4 },
  // Austenitic SS 21-36 HRC: SFM 225
  { series: 'HSVR-C-4', isoGroup: 'M', vc_min: 68.58, vc_max: 68.58,
    fz_min: 0.0102, fz_max: 0.1245, dc_min: 3.175, dc_max: 25.4 },
  // Austenitic SS 36-50 HRC: SFM 180
  { series: 'HSVR-C-4', isoGroup: 'M', vc_min: 54.86, vc_max: 54.86,
    fz_min: 0.0076, fz_max: 0.0991, dc_min: 3.175, dc_max: 25.4 },
  // Martensitic/Ferritic SS 75-98 HRB: SFM 300
  { series: 'HSVR-C-4', isoGroup: 'M', vc_min: 91.44, vc_max: 91.44,
    fz_min: 0.0127, fz_max: 0.1422, dc_min: 3.175, dc_max: 25.4 },
  // Martensitic/Ferritic SS 21-36 HRC: SFM 280
  { series: 'HSVR-C-4', isoGroup: 'M', vc_min: 85.34, vc_max: 85.34,
    fz_min: 0.0102, fz_max: 0.1245, dc_min: 3.175, dc_max: 25.4 },
  // PH SS 21-36 HRC: SFM 200
  { series: 'HSVR-C-4', isoGroup: 'M', vc_min: 60.96, vc_max: 60.96,
    fz_min: 0.0102, fz_max: 0.1041, dc_min: 3.175, dc_max: 25.4 },
  // PH SS 36-50 HRC: SFM 145
  { series: 'HSVR-C-4', isoGroup: 'M', vc_min: 44.20, vc_max: 44.20,
    fz_min: 0.0076, fz_max: 0.0914, dc_min: 3.175, dc_max: 25.4 },
  // Gray Cast Iron 75-98 HRB: SFM 410
  { series: 'HSVR-C-4', isoGroup: 'K', vc_min: 124.97, vc_max: 124.97,
    fz_min: 0.0203, fz_max: 0.2311, dc_min: 3.175, dc_max: 25.4 },
  // Gray Cast Iron 21-36 HRC: SFM 370
  { series: 'HSVR-C-4', isoGroup: 'K', vc_min: 112.78, vc_max: 112.78,
    fz_min: 0.0102, fz_max: 0.1245, dc_min: 3.175, dc_max: 25.4 },
  // Malleable Cast Iron 75-98 HRB: SFM 345
  { series: 'HSVR-C-4', isoGroup: 'K', vc_min: 105.16, vc_max: 105.16,
    fz_min: 0.0127, fz_max: 0.1473, dc_min: 3.175, dc_max: 25.4 },
  // Nodular Cast Iron 75-98 HRB: SFM 310
  { series: 'HSVR-C-4', isoGroup: 'K', vc_min: 94.49, vc_max: 94.49,
    fz_min: 0.0127, fz_max: 0.1524, dc_min: 3.175, dc_max: 25.4 },
  // Nodular Cast Iron 36-50 HRC: SFM 135
  { series: 'HSVR-C-4', isoGroup: 'K', vc_min: 41.15, vc_max: 41.15,
    fz_min: 0.0051, fz_max: 0.0635, dc_min: 3.175, dc_max: 25.4 },
  // Pure Nickel <75 HRB: SFM 285
  { series: 'HSVR-C-4', isoGroup: 'S', vc_min: 86.87, vc_max: 86.87,
    fz_min: 0.0178, fz_max: 0.1956, dc_min: 3.175, dc_max: 25.4 },
  // Nickel Alloy 75-98 HRB: SFM 80
  { series: 'HSVR-C-4', isoGroup: 'S', vc_min: 24.38, vc_max: 24.38,
    fz_min: 0.0076, fz_max: 0.0991, dc_min: 3.175, dc_max: 25.4 },
  // Nickel Alloy 21-36 HRC: SFM 75
  { series: 'HSVR-C-4', isoGroup: 'S', vc_min: 22.86, vc_max: 22.86,
    fz_min: 0.0076, fz_max: 0.0940, dc_min: 3.175, dc_max: 25.4 },
  // Nickel Alloy 36-50 HRC: SFM 70
  { series: 'HSVR-C-4', isoGroup: 'S', vc_min: 21.34, vc_max: 21.34,
    fz_min: 0.0076, fz_max: 0.0813, dc_min: 3.175, dc_max: 25.4 },
  // Pure Titanium <75 HRB: SFM 300
  { series: 'HSVR-C-4', isoGroup: 'S', vc_min: 91.44, vc_max: 91.44,
    fz_min: 0.0229, fz_max: 0.2692, dc_min: 3.175, dc_max: 25.4 },
  // Pure Titanium 75-98 HRB: SFM 275
  { series: 'HSVR-C-4', isoGroup: 'S', vc_min: 83.82, vc_max: 83.82,
    fz_min: 0.0203, fz_max: 0.2261, dc_min: 3.175, dc_max: 25.4 },
  // Titanium Alloy 21-36 HRC: SFM 180
  { series: 'HSVR-C-4', isoGroup: 'S', vc_min: 54.86, vc_max: 54.86,
    fz_min: 0.0127, fz_max: 0.1346, dc_min: 3.175, dc_max: 25.4 },
  // Titanium Alloy 36-50 HRC: SFM 160
  { series: 'HSVR-C-4', isoGroup: 'S', vc_min: 48.77, vc_max: 48.77,
    fz_min: 0.0102, fz_max: 0.1219, dc_min: 3.175, dc_max: 25.4 },
  // Cobalt Alloy 75-98 HRB: SFM 210
  { series: 'HSVR-C-4', isoGroup: 'S', vc_min: 64.01, vc_max: 64.01,
    fz_min: 0.0102, fz_max: 0.1143, dc_min: 3.175, dc_max: 25.4 },
  // Cobalt Alloy 36-50 HRC: SFM 65
  { series: 'HSVR-C-4', isoGroup: 'S', vc_min: 19.81, vc_max: 19.81,
    fz_min: 0.0076, fz_max: 0.0737, dc_min: 3.175, dc_max: 25.4 },
];

const STEEL_HEM_5FL: ManufacturerSpeedFeed[] = [
  // HEV-C-5 — 5F HEM chipbreaker rougher (pg 83)
  // Carbon Steel <75 HRB: SFM 455
  { series: 'HEV-C-5', isoGroup: 'P', vc_min: 138.68, vc_max: 138.68,
    fz_min: 0.0229, fz_max: 0.2591, dc_min: 3.175, dc_max: 25.4 },
  // Carbon Steel 75-98 HRB: SFM 445
  { series: 'HEV-C-5', isoGroup: 'P', vc_min: 135.64, vc_max: 135.64,
    fz_min: 0.0178, fz_max: 0.1905, dc_min: 3.175, dc_max: 25.4 },
  // Carbon Steel 21-36 HRC: SFM 400
  { series: 'HEV-C-5', isoGroup: 'P', vc_min: 121.92, vc_max: 121.92,
    fz_min: 0.0102, fz_max: 0.1219, dc_min: 3.175, dc_max: 25.4 },
  // Low Alloy Steel 75-98 HRB: SFM 390
  { series: 'HEV-C-5', isoGroup: 'P', vc_min: 118.87, vc_max: 118.87,
    fz_min: 0.0152, fz_max: 0.1651, dc_min: 3.175, dc_max: 25.4 },
  // Low Alloy Steel 21-36 HRC: SFM 340
  { series: 'HEV-C-5', isoGroup: 'P', vc_min: 103.63, vc_max: 103.63,
    fz_min: 0.0102, fz_max: 0.1219, dc_min: 3.175, dc_max: 25.4 },
  // Low Alloy Steel 36-50 HRC: SFM 260
  { series: 'HEV-C-5', isoGroup: 'H', vc_min: 79.25, vc_max: 79.25,
    fz_min: 0.0102, fz_max: 0.1067, dc_min: 3.175, dc_max: 25.4 },
  // Low Alloy Steel >50 HRC: SFM 155
  { series: 'HEV-C-5', isoGroup: 'H', vc_min: 47.24, vc_max: 47.24,
    fz_min: 0.0076, fz_max: 0.0838, dc_min: 3.175, dc_max: 25.4 },
  // Tool Steel 75-98 HRB: SFM 340
  { series: 'HEV-C-5', isoGroup: 'P', vc_min: 103.63, vc_max: 103.63,
    fz_min: 0.0152, fz_max: 0.1651, dc_min: 3.175, dc_max: 25.4 },
  // Tool Steel 21-36 HRC: SFM 250
  { series: 'HEV-C-5', isoGroup: 'P', vc_min: 76.20, vc_max: 76.20,
    fz_min: 0.0127, fz_max: 0.1295, dc_min: 3.175, dc_max: 25.4 },
  // Tool Steel 36-50 HRC: SFM 145
  { series: 'HEV-C-5', isoGroup: 'H', vc_min: 44.20, vc_max: 44.20,
    fz_min: 0.0102, fz_max: 0.1016, dc_min: 3.175, dc_max: 25.4 },
  // Tool Steel >50 HRC: SFM 85
  { series: 'HEV-C-5', isoGroup: 'H', vc_min: 25.91, vc_max: 25.91,
    fz_min: 0.0076, fz_max: 0.0838, dc_min: 3.175, dc_max: 25.4 },
  // Specialty Steel <75 HRB: SFM 290
  { series: 'HEV-C-5', isoGroup: 'P', vc_min: 88.39, vc_max: 88.39,
    fz_min: 0.0203, fz_max: 0.2159, dc_min: 3.175, dc_max: 25.4 },
  // Specialty Steel 75-98 HRB: SFM 255
  { series: 'HEV-C-5', isoGroup: 'P', vc_min: 77.72, vc_max: 77.72,
    fz_min: 0.0127, fz_max: 0.1473, dc_min: 3.175, dc_max: 25.4 },
  // Austenitic SS 75-98 HRB: SFM 265
  { series: 'HEV-C-5', isoGroup: 'M', vc_min: 80.77, vc_max: 80.77,
    fz_min: 0.0152, fz_max: 0.1600, dc_min: 3.175, dc_max: 25.4 },
  // Austenitic SS 21-36 HRC: SFM 225
  { series: 'HEV-C-5', isoGroup: 'M', vc_min: 68.58, vc_max: 68.58,
    fz_min: 0.0127, fz_max: 0.1448, dc_min: 3.175, dc_max: 25.4 },
  // Austenitic SS 36-50 HRC: SFM 180
  { series: 'HEV-C-5', isoGroup: 'M', vc_min: 54.86, vc_max: 54.86,
    fz_min: 0.0102, fz_max: 0.1143, dc_min: 3.175, dc_max: 25.4 },
  // Martensitic/Ferritic SS 75-98 HRB: SFM 300
  { series: 'HEV-C-5', isoGroup: 'M', vc_min: 91.44, vc_max: 91.44,
    fz_min: 0.0152, fz_max: 0.1651, dc_min: 3.175, dc_max: 25.4 },
  // Martensitic/Ferritic SS 21-36 HRC: SFM 280
  { series: 'HEV-C-5', isoGroup: 'M', vc_min: 85.34, vc_max: 85.34,
    fz_min: 0.0127, fz_max: 0.1422, dc_min: 3.175, dc_max: 25.4 },
  // PH SS 21-36 HRC: SFM 200
  { series: 'HEV-C-5', isoGroup: 'M', vc_min: 60.96, vc_max: 60.96,
    fz_min: 0.0102, fz_max: 0.1219, dc_min: 3.175, dc_max: 25.4 },
  // PH SS 36-50 HRC: SFM 145
  { series: 'HEV-C-5', isoGroup: 'M', vc_min: 44.20, vc_max: 44.20,
    fz_min: 0.0102, fz_max: 0.1041, dc_min: 3.175, dc_max: 25.4 },
  // Gray Cast Iron 75-98 HRB: SFM 410
  { series: 'HEV-C-5', isoGroup: 'K', vc_min: 124.97, vc_max: 124.97,
    fz_min: 0.0254, fz_max: 0.2642, dc_min: 3.175, dc_max: 25.4 },
  // Gray Cast Iron 21-36 HRC: SFM 370
  { series: 'HEV-C-5', isoGroup: 'K', vc_min: 112.78, vc_max: 112.78,
    fz_min: 0.0127, fz_max: 0.1448, dc_min: 3.175, dc_max: 25.4 },
  // Malleable Cast Iron 75-98 HRB: SFM 345
  { series: 'HEV-C-5', isoGroup: 'K', vc_min: 105.16, vc_max: 105.16,
    fz_min: 0.0152, fz_max: 0.1676, dc_min: 3.175, dc_max: 25.4 },
  // Nodular Cast Iron 75-98 HRB: SFM 310
  { series: 'HEV-C-5', isoGroup: 'K', vc_min: 94.49, vc_max: 94.49,
    fz_min: 0.0152, fz_max: 0.1753, dc_min: 3.175, dc_max: 25.4 },
  // Nodular Cast Iron 36-50 HRC: SFM 135
  { series: 'HEV-C-5', isoGroup: 'K', vc_min: 41.15, vc_max: 41.15,
    fz_min: 0.0076, fz_max: 0.0737, dc_min: 3.175, dc_max: 25.4 },
  // Pure Nickel <75 HRB: SFM 285
  { series: 'HEV-C-5', isoGroup: 'S', vc_min: 86.87, vc_max: 86.87,
    fz_min: 0.0203, fz_max: 0.2261, dc_min: 3.175, dc_max: 25.4 },
  // Nickel Alloy 75-98 HRB: SFM 80
  { series: 'HEV-C-5', isoGroup: 'S', vc_min: 24.38, vc_max: 24.38,
    fz_min: 0.0102, fz_max: 0.1143, dc_min: 3.175, dc_max: 25.4 },
  // Nickel Alloy 21-36 HRC: SFM 75
  { series: 'HEV-C-5', isoGroup: 'S', vc_min: 22.86, vc_max: 22.86,
    fz_min: 0.0102, fz_max: 0.1092, dc_min: 3.175, dc_max: 25.4 },
  // Nickel Alloy 36-50 HRC: SFM 70
  { series: 'HEV-C-5', isoGroup: 'S', vc_min: 21.34, vc_max: 21.34,
    fz_min: 0.0076, fz_max: 0.0940, dc_min: 3.175, dc_max: 25.4 },
  // Pure Titanium <75 HRB: SFM 300
  { series: 'HEV-C-5', isoGroup: 'S', vc_min: 91.44, vc_max: 91.44,
    fz_min: 0.0279, fz_max: 0.3099, dc_min: 3.175, dc_max: 25.4 },
  // Pure Titanium 75-98 HRB: SFM 275
  { series: 'HEV-C-5', isoGroup: 'S', vc_min: 83.82, vc_max: 83.82,
    fz_min: 0.0229, fz_max: 0.2616, dc_min: 3.175, dc_max: 25.4 },
  // Titanium Alloy 21-36 HRC: SFM 180
  { series: 'HEV-C-5', isoGroup: 'S', vc_min: 54.86, vc_max: 54.86,
    fz_min: 0.0152, fz_max: 0.1549, dc_min: 3.175, dc_max: 25.4 },
  // Titanium Alloy 36-50 HRC: SFM 160
  { series: 'HEV-C-5', isoGroup: 'S', vc_min: 48.77, vc_max: 48.77,
    fz_min: 0.0127, fz_max: 0.1397, dc_min: 3.175, dc_max: 25.4 },
  // Cobalt Alloy 75-98 HRB: SFM 210
  { series: 'HEV-C-5', isoGroup: 'S', vc_min: 64.01, vc_max: 64.01,
    fz_min: 0.0127, fz_max: 0.1295, dc_min: 3.175, dc_max: 25.4 },
  // Cobalt Alloy 36-50 HRC: SFM 65
  { series: 'HEV-C-5', isoGroup: 'S', vc_min: 19.81, vc_max: 19.81,
    fz_min: 0.0076, fz_max: 0.0864, dc_min: 3.175, dc_max: 25.4 },
];

// ---------------------------------------------------------------------------
// Stainless & High Temp Series — coolant through variants
// ---------------------------------------------------------------------------

const STAINLESS_COOLANT_THROUGH: ManufacturerSpeedFeed[] = [
  // HEVC-C-4 — 4F coolant-through chipbreaker (pg 172) — same SFM as HSVR-C-4
  // Key entries (not duplicating full steel list — same materials, slightly lower IPT)
  { series: 'HEVC-C-4', isoGroup: 'P', vc_min: 135.64, vc_max: 138.68,
    fz_min: 0.0127, fz_max: 0.2261, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HEVC-C-4', isoGroup: 'M', vc_min: 44.20, vc_max: 91.44,
    fz_min: 0.0076, fz_max: 0.1448, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HEVC-C-4', isoGroup: 'K', vc_min: 41.15, vc_max: 124.97,
    fz_min: 0.0051, fz_max: 0.2311, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HEVC-C-4', isoGroup: 'H', vc_min: 25.91, vc_max: 79.25,
    fz_min: 0.0051, fz_max: 0.0914, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HEVC-C-4', isoGroup: 'S', vc_min: 19.81, vc_max: 91.44,
    fz_min: 0.0051, fz_max: 0.2718, dc_min: 3.175, dc_max: 25.4 },

  // HEVC-4 — 4F coolant-through variable pitch (pg 193) — includes finishing
  { series: 'HEVC-4', isoGroup: 'P', vc_min: 121.92, vc_max: 138.68,
    fz_min: 0.0127, fz_max: 0.2261, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HEVC-4', isoGroup: 'M', vc_min: 44.20, vc_max: 91.44,
    fz_min: 0.0076, fz_max: 0.1448, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HEVC-4', isoGroup: 'K', vc_min: 41.15, vc_max: 124.97,
    fz_min: 0.0051, fz_max: 0.2311, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HEVC-4', isoGroup: 'H', vc_min: 25.91, vc_max: 79.25,
    fz_min: 0.0051, fz_max: 0.0914, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HEVC-4', isoGroup: 'S', vc_min: 19.81, vc_max: 91.44,
    fz_min: 0.0051, fz_max: 0.2718, dc_min: 3.175, dc_max: 25.4 },
];

// ---------------------------------------------------------------------------
// Nickel Alloy HEM Series (pages 228-234)
// ---------------------------------------------------------------------------

const NICKEL_HEM: ManufacturerSpeedFeed[] = [
  // HVNI-8 — 8F HEM for nickel (pg 234)
  { series: 'HVNI-8', isoGroup: 'S', vc_min: 21.34, vc_max: 86.87,
    fz_min: 0.0330, fz_max: 0.4750, dc_min: 6.35, dc_max: 25.4 },
    // Nickel alloy 70-285 SFM, IPT .0013-.0187

  // HVNI-6 — 6F for nickel alloys (same SFM range as HVNI-8)
  { series: 'HVNI-6', isoGroup: 'S', vc_min: 21.34, vc_max: 86.87,
    fz_min: 0.0254, fz_max: 0.3810, dc_min: 6.35, dc_max: 25.4 },
];

// ---------------------------------------------------------------------------
// Titanium HEM Series (pages 235-270)
// ---------------------------------------------------------------------------

const TITANIUM_HEM: ManufacturerSpeedFeed[] = [
  // HVTI-C-6 / HVTIC-C-6 — 6F HEM chipbreaker for Ti (pg 240)
  { series: 'HVTI-C-6', isoGroup: 'S', vc_min: 19.81, vc_max: 91.44,
    fz_min: 0.0356, fz_max: 0.5588, dc_min: 6.35, dc_max: 25.4 },
    // Ti alloy: SFM 160-300, IPT .0014-.0220

  // HVTI-6 — 6F for titanium (same materials)
  { series: 'HVTI-6', isoGroup: 'S', vc_min: 19.81, vc_max: 91.44,
    fz_min: 0.0305, fz_max: 0.4826, dc_min: 6.35, dc_max: 25.4 },

  // HEV-5 for Titanium section (pg 245-251)
  { series: 'HEV-5-Ti', isoGroup: 'S', vc_min: 19.81, vc_max: 91.44,
    fz_min: 0.0254, fz_max: 0.3099, dc_min: 3.175, dc_max: 25.4 },
];

// ---------------------------------------------------------------------------
// High Feed End Mills (pages 271-285)
// ---------------------------------------------------------------------------

const HIGH_FEED_ALUMINUM: ManufacturerSpeedFeed[] = [
  // HFAL-2 / MHFAL-2 — 2F high feed for aluminum (pg 273)
  { series: 'HFAL-2', isoGroup: 'N', vc_min: 640.08, vc_max: 640.08,
    fz_min: 0.5842, fz_max: 5.7912, dc_min: 3.175, dc_max: 25.4 },
    // Wrought Al SFM 2100, IPT .0023-.0228
  { series: 'HFAL-2', isoGroup: 'N', vc_min: 426.72, vc_max: 426.72,
    fz_min: 1.0414, fz_max: 10.414, dc_min: 3.175, dc_max: 25.4 },
    // Cast Al SFM 1400, IPT .0041-.0410
  { series: 'HFAL-2', isoGroup: 'N', vc_min: 234.70, vc_max: 234.70,
    fz_min: 0.6858, fz_max: 6.9596, dc_min: 3.175, dc_max: 25.4 },
    // Copper SFM 770, IPT .0027-.0274
];

const HIGH_FEED_STEEL: ManufacturerSpeedFeed[] = [
  // HFV / HFVC — high feed for steels (pg 279)
  // Carbon Steel <75 HRB: SFM 800
  { series: 'HFV', isoGroup: 'P', vc_min: 243.84, vc_max: 243.84,
    fz_min: 0.6858, fz_max: 4.7498, dc_min: 3.175, dc_max: 12.7 },
  // Carbon Steel 75-98 HRB: SFM 750
  { series: 'HFV', isoGroup: 'P', vc_min: 228.60, vc_max: 228.60,
    fz_min: 0.5080, fz_max: 3.7338, dc_min: 3.175, dc_max: 12.7 },
  // Carbon Steel 21-36 HRC: SFM 700
  { series: 'HFV', isoGroup: 'P', vc_min: 213.36, vc_max: 213.36,
    fz_min: 0.3302, fz_max: 2.5400, dc_min: 3.175, dc_max: 12.7 },
  // Low Alloy 75-98 HRB: SFM 600
  { series: 'HFV', isoGroup: 'P', vc_min: 182.88, vc_max: 182.88,
    fz_min: 0.6858, fz_max: 4.7498, dc_min: 3.175, dc_max: 12.7 },
  // Low Alloy 36-50 HRC: SFM 400
  { series: 'HFV', isoGroup: 'H', vc_min: 121.92, vc_max: 121.92,
    fz_min: 0.5080, fz_max: 3.3782, dc_min: 3.175, dc_max: 12.7 },
  // Low Alloy >50 HRC: SFM 350
  { series: 'HFV', isoGroup: 'H', vc_min: 106.68, vc_max: 106.68,
    fz_min: 0.3302, fz_max: 2.0320, dc_min: 3.175, dc_max: 12.7 },
  // Tool Steel 75-98 HRB: SFM 550
  { series: 'HFV', isoGroup: 'P', vc_min: 167.64, vc_max: 167.64,
    fz_min: 0.6858, fz_max: 4.7498, dc_min: 3.175, dc_max: 12.7 },
  // Tool Steel 36-50 HRC: SFM 450
  { series: 'HFV', isoGroup: 'H', vc_min: 137.16, vc_max: 137.16,
    fz_min: 0.5080, fz_max: 3.3782, dc_min: 3.175, dc_max: 12.7 },
  // Tool Steel >50 HRC: SFM 400
  { series: 'HFV', isoGroup: 'H', vc_min: 121.92, vc_max: 121.92,
    fz_min: 0.3302, fz_max: 2.0320, dc_min: 3.175, dc_max: 12.7 },
  // Austenitic SS 75-98 HRB: SFM 500
  { series: 'HFV', isoGroup: 'M', vc_min: 152.40, vc_max: 152.40,
    fz_min: 0.6858, fz_max: 4.7498, dc_min: 3.175, dc_max: 12.7 },
  // Austenitic SS 36-50 HRC: SFM 400
  { series: 'HFV', isoGroup: 'M', vc_min: 121.92, vc_max: 121.92,
    fz_min: 0.5588, fz_max: 4.0640, dc_min: 3.175, dc_max: 12.7 },
  // Martensitic SS 75-98 HRB: SFM 750
  { series: 'HFV', isoGroup: 'M', vc_min: 228.60, vc_max: 228.60,
    fz_min: 0.6350, fz_max: 3.7338, dc_min: 3.175, dc_max: 12.7 },
  // PH SS 21-36 HRC: SFM 450
  { series: 'HFV', isoGroup: 'M', vc_min: 137.16, vc_max: 137.16,
    fz_min: 0.6350, fz_max: 3.7338, dc_min: 3.175, dc_max: 12.7 },
  // PH SS 36-50 HRC: SFM 400
  { series: 'HFV', isoGroup: 'M', vc_min: 121.92, vc_max: 121.92,
    fz_min: 0.5080, fz_max: 3.3782, dc_min: 3.175, dc_max: 12.7 },
  // Gray Cast Iron 75-98 HRB: SFM 600
  { series: 'HFV', isoGroup: 'K', vc_min: 182.88, vc_max: 182.88,
    fz_min: 0.6858, fz_max: 4.7498, dc_min: 3.175, dc_max: 12.7 },
  // Nodular Cast Iron 36-50 HRC: SFM 400
  { series: 'HFV', isoGroup: 'K', vc_min: 121.92, vc_max: 121.92,
    fz_min: 0.3302, fz_max: 2.0320, dc_min: 3.175, dc_max: 12.7 },
  // Pure Nickel <75 HRB: SFM 600
  { series: 'HFV', isoGroup: 'S', vc_min: 182.88, vc_max: 182.88,
    fz_min: 0.6858, fz_max: 4.7498, dc_min: 3.175, dc_max: 12.7 },
  // Nickel Alloy 75-98 HRB: SFM 200
  { series: 'HFV', isoGroup: 'S', vc_min: 60.96, vc_max: 60.96,
    fz_min: 0.3302, fz_max: 2.6670, dc_min: 3.175, dc_max: 12.7 },
  // Pure Titanium <75 HRB: SFM 350
  { series: 'HFV', isoGroup: 'S', vc_min: 106.68, vc_max: 106.68,
    fz_min: 0.6858, fz_max: 4.7498, dc_min: 3.175, dc_max: 12.7 },
  // Titanium Alloy 21-36 HRC: SFM 300
  { series: 'HFV', isoGroup: 'S', vc_min: 91.44, vc_max: 91.44,
    fz_min: 0.6858, fz_max: 3.3020, dc_min: 3.175, dc_max: 12.7 },
  // Titanium Alloy 36-50 HRC: SFM 250
  { series: 'HFV', isoGroup: 'S', vc_min: 76.20, vc_max: 76.20,
    fz_min: 0.5842, fz_max: 2.5400, dc_min: 3.175, dc_max: 12.7 },
  // Cobalt Alloy 75-98 HRB: SFM 225
  { series: 'HFV', isoGroup: 'S', vc_min: 68.58, vc_max: 68.58,
    fz_min: 0.5080, fz_max: 2.3622, dc_min: 3.175, dc_max: 12.7 },
  // Cobalt Alloy 36-50 HRC: SFM 90
  { series: 'HFV', isoGroup: 'S', vc_min: 27.43, vc_max: 27.43,
    fz_min: 0.5080, fz_max: 2.3622, dc_min: 3.175, dc_max: 12.7 },
];

// ---------------------------------------------------------------------------
// Combination Feed & HEM (pages 280-285)
// ---------------------------------------------------------------------------

const COMBINATION_FEED_HEM: ManufacturerSpeedFeed[] = [
  // HEVF-C-4 / HEVF-C-5 / HEVFC-C-4/5 — combo feed+HEM (pg 282/285)
  // These share material data with HEV-C-5 but optimized for high feed + HEM combo
  { series: 'HEVF-C-5', isoGroup: 'P', vc_min: 103.63, vc_max: 138.68,
    fz_min: 0.0127, fz_max: 0.2591, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HEVF-C-5', isoGroup: 'M', vc_min: 44.20, vc_max: 91.44,
    fz_min: 0.0076, fz_max: 0.1651, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HEVF-C-5', isoGroup: 'K', vc_min: 41.15, vc_max: 124.97,
    fz_min: 0.0076, fz_max: 0.2642, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HEVF-C-5', isoGroup: 'H', vc_min: 25.91, vc_max: 79.25,
    fz_min: 0.0076, fz_max: 0.1067, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HEVF-C-5', isoGroup: 'S', vc_min: 19.81, vc_max: 91.44,
    fz_min: 0.0076, fz_max: 0.3099, dc_min: 3.175, dc_max: 25.4 },
];

// ---------------------------------------------------------------------------
// Specialty Profiles — Tapered, Chamfer, Corner Rounding (pages 286-300)
// ---------------------------------------------------------------------------

const TAPERED_ENDMILLS: ManufacturerSpeedFeed[] = [
  // HTPR-5 — 5F tapered end mill (pg 289)
  { series: 'HTPR-5', isoGroup: 'P', vc_min: 103.63, vc_max: 138.68,
    fz_min: 0.0102, fz_max: 0.2591, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HTPR-5', isoGroup: 'M', vc_min: 44.20, vc_max: 91.44,
    fz_min: 0.0076, fz_max: 0.1651, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HTPR-5', isoGroup: 'K', vc_min: 41.15, vc_max: 124.97,
    fz_min: 0.0076, fz_max: 0.2642, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HTPR-5', isoGroup: 'H', vc_min: 25.91, vc_max: 79.25,
    fz_min: 0.0051, fz_max: 0.1067, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HTPR-5', isoGroup: 'S', vc_min: 19.81, vc_max: 91.44,
    fz_min: 0.0051, fz_max: 0.3099, dc_min: 3.175, dc_max: 25.4 },
];

const CHAMFER_MILLS: ManufacturerSpeedFeed[] = [
  // HPCM — helical flute chamfer mills (pg 295)
  { series: 'HPCM', isoGroup: 'P', vc_min: 103.63, vc_max: 138.68,
    fz_min: 0.0102, fz_max: 0.1524, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HPCM', isoGroup: 'M', vc_min: 44.20, vc_max: 91.44,
    fz_min: 0.0076, fz_max: 0.1143, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HPCM', isoGroup: 'K', vc_min: 41.15, vc_max: 124.97,
    fz_min: 0.0076, fz_max: 0.1524, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HPCM', isoGroup: 'N', vc_min: 234.70, vc_max: 640.08,
    fz_min: 0.0178, fz_max: 0.2540, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HPCM', isoGroup: 'S', vc_min: 19.81, vc_max: 91.44,
    fz_min: 0.0051, fz_max: 0.1270, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HPCM', isoGroup: 'H', vc_min: 25.91, vc_max: 79.25,
    fz_min: 0.0051, fz_max: 0.0889, dc_min: 3.175, dc_max: 25.4 },
];

const CORNER_ROUNDING: ManufacturerSpeedFeed[] = [
  // HPCR — corner rounding end mills (pg 300)
  { series: 'HPCR', isoGroup: 'P', vc_min: 103.63, vc_max: 138.68,
    fz_min: 0.0102, fz_max: 0.1524, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HPCR', isoGroup: 'M', vc_min: 44.20, vc_max: 91.44,
    fz_min: 0.0076, fz_max: 0.1143, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HPCR', isoGroup: 'K', vc_min: 41.15, vc_max: 124.97,
    fz_min: 0.0076, fz_max: 0.1524, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HPCR', isoGroup: 'N', vc_min: 234.70, vc_max: 640.08,
    fz_min: 0.0178, fz_max: 0.2540, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HPCR', isoGroup: 'S', vc_min: 19.81, vc_max: 91.44,
    fz_min: 0.0051, fz_max: 0.1270, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HPCR', isoGroup: 'H', vc_min: 25.91, vc_max: 79.25,
    fz_min: 0.0051, fz_max: 0.0889, dc_min: 3.175, dc_max: 25.4 },
];

// ---------------------------------------------------------------------------
// Contour Finishers & Multi-Axis Finishers (pages 218-227)
// ---------------------------------------------------------------------------

const CONTOUR_FINISHERS: ManufacturerSpeedFeed[] = [
  // HCF-TN-4 — 4F ball contour finisher tapered neck (pg 219)
  { series: 'HCF-TN-4', isoGroup: 'P', vc_min: 76.20, vc_max: 138.68,
    fz_min: 0.0102, fz_max: 0.1524, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HCF-TN-4', isoGroup: 'M', vc_min: 44.20, vc_max: 91.44,
    fz_min: 0.0076, fz_max: 0.1143, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HCF-TN-4', isoGroup: 'S', vc_min: 19.81, vc_max: 91.44,
    fz_min: 0.0051, fz_max: 0.1016, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HCF-TN-4', isoGroup: 'H', vc_min: 25.91, vc_max: 79.25,
    fz_min: 0.0051, fz_max: 0.0762, dc_min: 3.175, dc_max: 25.4 },

  // HMAF-FE-6 — 6F multi-axis finisher (pg 226)
  { series: 'HMAF-FE-6', isoGroup: 'P', vc_min: 76.20, vc_max: 138.68,
    fz_min: 0.0076, fz_max: 0.1270, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HMAF-FE-6', isoGroup: 'M', vc_min: 44.20, vc_max: 91.44,
    fz_min: 0.0051, fz_max: 0.0889, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HMAF-FE-6', isoGroup: 'S', vc_min: 19.81, vc_max: 91.44,
    fz_min: 0.0051, fz_max: 0.0762, dc_min: 3.175, dc_max: 25.4 },
  { series: 'HMAF-FE-6', isoGroup: 'H', vc_min: 25.91, vc_max: 79.25,
    fz_min: 0.0051, fz_max: 0.0635, dc_min: 3.175, dc_max: 25.4 },
];

// ---------------------------------------------------------------------------
// Consolidated series aliases — many Helical series share identical S/F
// tables. Map them to the reference series above.
// ---------------------------------------------------------------------------
// Steel general-purpose (same S/F as HEV-C-5):
//   HEV-C-6, HEV-C-7, HEV-C-RN-5, HEV-C-RN-7, HXVR, HXVR-RN
//   HSV-3, HSV-4, HSV-RN-4, HST-3, HST-RN-3
//   HEV-5, HEV-6, HEV-7, HEV-RN-5, HEV-RN-6, HEV-RN-7
//   HEF-5, HSF-7, HXF (finishers — same SFM, lower IPT end)
//   MHSV-4, MHEV-5, MHEV-6, MHEV-7 (metric variants)
//
// Stainless/HTA (same material S/F as HSVR-C-4 steel table):
//   HSV-4/HSM-4, HEV-5/HSM-5, HEV-6, HEV-7 (stainless section)
//   HEVC-6 (coolant through)
//
// These aliases are applied by the tool catalog lookup engine which
// normalizes the series prefix before matching.

// ---------------------------------------------------------------------------
// Export consolidated array
// ---------------------------------------------------------------------------

export const HELICAL_SPEED_FEED: ManufacturerSpeedFeed[] = [
  ...ALUMINUM_3FL_CHIPBREAKER,
  ...ALUMINUM_5FL_HEM,
  ...ALUMINUM_2FL,
  ...ALUMINUM_3FL,
  ...STEEL_ROUGHER_4FL,
  ...STEEL_HEM_5FL,
  ...STAINLESS_COOLANT_THROUGH,
  ...NICKEL_HEM,
  ...TITANIUM_HEM,
  ...HIGH_FEED_ALUMINUM,
  ...HIGH_FEED_STEEL,
  ...COMBINATION_FEED_HEM,
  ...TAPERED_ENDMILLS,
  ...CHAMFER_MILLS,
  ...CORNER_ROUNDING,
  ...CONTOUR_FINISHERS,
];
