#!/usr/bin/env node
/**
 * holder-taper.mjs -- parse a brand tool-HOLDER designation to its spindle taper interface and
 * attach standard taper-class body geometry, so the brand holder corpus (big-daishowa/haimer/
 * kennametal/osg, name-only) can be emitted as importable CAM holder libraries.
 *
 * WHY (slot:romeo, 2026-06-19): the work order names "tool holders" explicitly. The corpus holder
 * records carry only a designation (e.g. "BBT50-MEGA32D-105", "ER-32-4NL", "KM40..."). The taper
 * interface is encoded in the designation; this module extracts it + maps to book-value collision
 * geometry (body diameter, gauge length, projection, max rpm). ER collet geometry is REUSED from
 * the existing holder-geometry.mjs ER_COLLET table (R8 -- compose, don't duplicate).
 *
 * UNITS: all geometry mm. Book values per DIN 69871 / JIS B6339 (BT) / ANSI B5.50 (CAT) /
 * ISO 12164 (HSK) / ISO 26623 (Capto); KM (Kennametal) coupling size ~ the number in mm; ER from
 * DIN 6499 (via ER_COLLET). A designation with no recognizable taper -> parseHolderTaper returns
 * null (e.g. a MEGA collet-chuck HEAD that mounts on a separate BBT base -- not a spindle holder).
 */

import { ER_COLLET } from "./holder-geometry.mjs";

// ## Steep-taper / HSK / Capto / KM body geometry (mm). max_rpm is a conservative class default.
const STEEP = {
  BT30: { body_diameter_mm: 46, gauge_length_mm: 48.4, projection_mm: 60, max_rpm: 24000 },
  BT35: { body_diameter_mm: 53, gauge_length_mm: 57, projection_mm: 70, max_rpm: 18000 },
  BT40: { body_diameter_mm: 63, gauge_length_mm: 65.4, projection_mm: 90, max_rpm: 15000 },
  BT45: { body_diameter_mm: 80, gauge_length_mm: 82.8, projection_mm: 110, max_rpm: 12000 },
  BT50: { body_diameter_mm: 100, gauge_length_mm: 101.8, projection_mm: 130, max_rpm: 8000 },
  CAT30: { body_diameter_mm: 46, gauge_length_mm: 48.4, projection_mm: 60, max_rpm: 24000 },
  CAT40: { body_diameter_mm: 63, gauge_length_mm: 65.4, projection_mm: 90, max_rpm: 15000 },
  CAT50: { body_diameter_mm: 100, gauge_length_mm: 101.8, projection_mm: 130, max_rpm: 8000 },
  "HSK-A40": { body_diameter_mm: 40, gauge_length_mm: 35, projection_mm: 55, max_rpm: 30000 },
  "HSK-A50": { body_diameter_mm: 50, gauge_length_mm: 40, projection_mm: 65, max_rpm: 28000 },
  "HSK-A63": { body_diameter_mm: 63, gauge_length_mm: 50, projection_mm: 80, max_rpm: 25000 },
  "HSK-A80": { body_diameter_mm: 80, gauge_length_mm: 65, projection_mm: 95, max_rpm: 18000 },
  "HSK-A100": { body_diameter_mm: 100, gauge_length_mm: 80, projection_mm: 110, max_rpm: 12000 },
  "CAPTO-C4": { body_diameter_mm: 48, gauge_length_mm: 60, projection_mm: 70, max_rpm: 25000 },
  "CAPTO-C5": { body_diameter_mm: 63, gauge_length_mm: 75, projection_mm: 85, max_rpm: 20000 },
  "CAPTO-C6": { body_diameter_mm: 80, gauge_length_mm: 95, projection_mm: 105, max_rpm: 16000 },
  "CAPTO-C8": { body_diameter_mm: 100, gauge_length_mm: 115, projection_mm: 130, max_rpm: 10000 },
};

// Kennametal KM/KM4X quick-change: the size number is ~ the coupling diameter in mm.
function kmGeometry(sizeMm) {
  return {
    body_diameter_mm: sizeMm,
    gauge_length_mm: +(sizeMm * 1.3).toFixed(1),
    projection_mm: +(sizeMm * 1.6).toFixed(1),
    max_rpm: sizeMm <= 40 ? 25000 : sizeMm <= 63 ? 15000 : 10000,
  };
}

/**
 * Parse a holder designation -> canonical taper id (e.g. "BT40", "HSK-A63", "KM40", "ER32",
 * "CAT50", "CAPTO-C5"). Returns null when no spindle taper is recognizable.
 */
export function parseHolderTaper(designation) {
  const s = String(designation || "").toUpperCase();
  let m;
  // Big-Plus BT (BBT50 = Big-Plus BT50)
  if ((m = s.match(/\bBBT\s*-?\s*(\d{2,3})/))) return `BT${m[1]}`;
  if ((m = s.match(/\bBIG-?PLUS\s*-?\s*(\d{2,3})/))) return `BT${m[1]}`;
  if ((m = s.match(/\bHSK\s*-?\s*([A-E])\s*(\d{2,3})/))) return `HSK-${m[1]}${m[2]}`;
  if ((m = s.match(/\bBT\s*-?\s*(\d{2,3})/))) return `BT${m[1]}`;
  if ((m = s.match(/\b(?:CAT|CV|DV)\s*-?\s*(\d{2,3})/))) return `CAT${m[1]}`;
  if ((m = s.match(/\bCAPTO\s*-?\s*C?\s*(\d)/))) return `CAPTO-C${m[1]}`;
  if ((m = s.match(/\bKM\s*-?\s*(\d{2,3})/))) return `KM${m[1]}`;
  if ((m = s.match(/\bER\s*-?\s*(\d{1,2})/))) return `ER${m[1]}`;
  return null;
}

/** Body geometry (mm) for a taper id, or null if unknown. */
export function taperGeometry(taperId) {
  if (!taperId) return null;
  if (STEEP[taperId]) return { ...STEEP[taperId] };
  const km = taperId.match(/^KM(\d{2,3})$/);
  if (km) return kmGeometry(Number(km[1]));
  const er = taperId.match(/^ER(\d{1,2})$/);
  if (er) {
    const spec = ER_COLLET[`ER${er[1]}`];
    if (spec) {
      return {
        body_diameter_mm: spec.bodyDia,
        gauge_length_mm: +(spec.nutLen + spec.bodyLen).toFixed(1),
        projection_mm: +(spec.nutLen + spec.bodyLen + 20).toFixed(1),
        max_rpm: 30000,
      };
    }
  }
  return null;
}

/** Convenience: designation -> {taper, geometry} or null. */
export function resolveHolder(designation) {
  const taper = parseHolderTaper(designation);
  if (!taper) return null;
  const geometry = taperGeometry(taper);
  if (!geometry) return null;
  return { taper, geometry };
}
