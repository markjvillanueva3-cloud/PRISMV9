/**
 * SheetMetalNestingEngine — Rectangular part nesting on sheet stock
 *
 * Models: First-fit-decreasing-height (FFDH) bin packing, strip nesting,
 *         material utilization optimization, rotation consideration
 * References: Hopper & Turton (2001) 2D packing survey, industry standard cut widths
 * Safety: Minimum web width between parts to prevent distortion
 */

// ─── Types ─────────────────────────────────────────────────────────

export interface NestingPart {
  id: string;
  length_mm: number;
  width_mm: number;
  quantity: number;
  allow_rotation?: boolean; // default true
}

export interface SheetMetalNestingInput {
  parts: NestingPart[];
  sheet_length_mm: number;
  sheet_width_mm: number;
  sheet_thickness_mm: number;
  material_cost_per_kg?: number;        // default 5 $/kg
  material_density_kg_m3?: number;      // default 7850 (steel)
  kerf_width_mm?: number;               // default 2.5mm (laser)
  min_web_mm?: number;                  // default 5mm
  edge_margin_mm?: number;              // default 10mm
}

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

export interface SheetMetalNestingResult {
  sheets_required: AtomicValue;
  material_utilization_pct: AtomicValue;
  scrap_pct: AtomicValue;
  total_part_area_mm2: AtomicValue;
  total_sheet_area_mm2: AtomicValue;
  material_cost: AtomicValue;
  scrap_weight_kg: AtomicValue;
  parts_per_sheet: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Engine ────────────────────────────────────────────────────────

function mkAv(value: number, unit: string, unc: number, source: string, warning?: string): AtomicValue {
  return { value, unit, uncertainty: unc, source, warning };
}

export class SheetMetalNestingEngine {
  calculate(input: SheetMetalNestingInput): SheetMetalNestingResult {
    const {
      parts,
      sheet_length_mm: sheetL,
      sheet_width_mm: sheetW,
      sheet_thickness_mm: thick,
      material_cost_per_kg: costPerKg = 5,
      material_density_kg_m3: density = 7850,
      kerf_width_mm: kerf = 2.5,
      min_web_mm: web = 5,
      edge_margin_mm: margin = 10,
    } = input;

    const recs: string[] = [];
    const gap = kerf + web; // total spacing between parts

    // Usable sheet area (minus edge margins)
    const usableL = sheetL - 2 * margin;
    const usableW = sheetW - 2 * margin;

    // Total part area needed
    let totalPartArea = 0;
    let totalQty = 0;
    for (const p of parts) {
      totalPartArea += p.length_mm * p.width_mm * p.quantity;
      totalQty += p.quantity;
    }

    // Expand parts list with rotations, sorted by height descending (FFDH)
    interface Rect { l: number; w: number; id: string }
    const rects: Rect[] = [];
    for (const p of parts) {
      for (let i = 0; i < p.quantity; i++) {
        const rot = p.allow_rotation !== false;
        // Choose orientation: wider side along strip
        if (rot && p.width_mm > p.length_mm) {
          rects.push({ l: p.width_mm, w: p.length_mm, id: p.id });
        } else {
          rects.push({ l: p.length_mm, w: p.width_mm, id: p.id });
        }
      }
    }
    // Sort by width (height in strip) descending
    rects.sort((a, b) => b.w - a.w);

    // FFDH strip packing on one sheet
    let stripY = 0;
    let stripH = 0;
    let stripX = 0;
    let partsOnSheet = 0;

    for (const r of rects) {
      if (stripX + r.l <= usableL && (stripY + (stripH === 0 ? r.w : stripH)) <= usableW) {
        // Fits in current strip
        if (stripH === 0) stripH = r.w;
        stripX += r.l + gap;
        partsOnSheet++;
      } else if (stripY + stripH + gap + r.w <= usableW) {
        // New strip
        stripY += stripH + gap;
        stripX = r.l + gap;
        stripH = r.w;
        partsOnSheet++;
      }
      // else: doesn't fit this sheet (simplified — count later)
    }

    // Estimate sheets required
    const pps = Math.max(partsOnSheet, 1);
    const sheetsNeeded = Math.ceil(totalQty / pps);

    // Areas
    const totalSheetArea = sheetsNeeded * sheetL * sheetW;
    const utilization = (totalPartArea / totalSheetArea) * 100;
    const scrapPct = 100 - utilization;

    // Material weight & cost
    const sheetVolume_m3 = totalSheetArea * thick / 1e9;
    const totalWeight = sheetVolume_m3 * density;
    const partWeight = (totalPartArea * thick / 1e9) * density;
    const scrapWeight = totalWeight - partWeight;
    const materialCost = totalWeight * costPerKg;

    // Safety: check if any part exceeds usable area
    let oversized = false;
    for (const p of parts) {
      const minDim = Math.min(p.length_mm, p.width_mm);
      const maxDim = Math.max(p.length_mm, p.width_mm);
      if (minDim > usableW || maxDim > usableL) {
        if (maxDim > usableW || minDim > usableL) {
          oversized = true;
          recs.push(`Part ${p.id} (${p.length_mm}×${p.width_mm}mm) exceeds usable sheet area ${usableL}×${usableW}mm`);
        }
      }
    }

    const isSafe = !oversized && utilization > 30;

    if (utilization < 50) {
      recs.push(`Low material utilization ${utilization.toFixed(1)}% — consider larger sheets or grouping with other jobs`);
    }
    if (utilization >= 80) {
      recs.push(`Good nesting efficiency ${utilization.toFixed(1)}% — optimal material usage`);
    }
    if (scrapWeight > 50) {
      recs.push(`Significant scrap ${scrapWeight.toFixed(1)}kg — verify recycling plan`);
    }
    if (recs.length === 0) {
      recs.push(`Nesting nominal — ${sheetsNeeded} sheet(s), ${utilization.toFixed(1)}% utilization`);
    }

    return {
      sheets_required: mkAv(sheetsNeeded, "sheets", 1, "ffdh_bin_packing"),
      material_utilization_pct: mkAv(Math.round(utilization * 10) / 10, "%", utilization * 0.05, "area_ratio"),
      scrap_pct: mkAv(Math.round(scrapPct * 10) / 10, "%", scrapPct * 0.05, "area_ratio"),
      total_part_area_mm2: mkAv(Math.round(totalPartArea), "mm²", 0, "geometry"),
      total_sheet_area_mm2: mkAv(Math.round(totalSheetArea), "mm²", 0, "geometry"),
      material_cost: mkAv(Math.round(materialCost * 100) / 100, "$", materialCost * 0.10, "weight_cost"),
      scrap_weight_kg: mkAv(Math.round(scrapWeight * 100) / 100, "kg", scrapWeight * 0.05, "density_volume"),
      parts_per_sheet: mkAv(pps, "parts", 1, "ffdh_bin_packing"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const sheetMetalNestingEngine = new SheetMetalNestingEngine();
