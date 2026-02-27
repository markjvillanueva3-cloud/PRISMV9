/**
 * NestingEngine — Manufacturing Intelligence Layer
 *
 * Optimizes 2D part nesting on sheet/plate stock to maximize material
 * utilization. Uses bottom-left-fill heuristic with rotation.
 *
 * Actions: nest_parts, nest_analyze, nest_compare_stock
 */

// ============================================================================
// TYPES
// ============================================================================

export interface NestPart {
  id: string;
  width_mm: number;
  height_mm: number;
  quantity: number;
  allow_rotation?: boolean;         // default true
  priority?: number;                // 1–5
}

export interface StockSheet {
  width_mm: number;
  height_mm: number;
  thickness_mm: number;
  material: string;
  cost_per_sheet?: number;
}

export interface NestPlacement {
  part_id: string;
  instance: number;
  x_mm: number;
  y_mm: number;
  rotated: boolean;
  width_mm: number;
  height_mm: number;
}

export interface NestResult {
  placements: NestPlacement[];
  sheets_used: number;
  utilization_pct: number;
  waste_pct: number;
  total_parts_placed: number;
  total_parts_requested: number;
  unplaced: { part_id: string; remaining: number }[];
  kerf_allowance_mm: number;
  cost_estimate: number;
}

export interface NestAnalysis {
  part_area_mm2: number;
  stock_area_mm2: number;
  theoretical_max_utilization_pct: number;
  actual_utilization_pct: number;
  efficiency_ratio: number;         // actual / theoretical
}

// ============================================================================
// NESTING ALGORITHM — Bottom-Left-Fill with rotation
// ============================================================================

interface SheetState {
  width: number;
  height: number;
  occupied: NestPlacement[];
}

function fits(sheet: SheetState, x: number, y: number, w: number, h: number, kerf: number): boolean {
  if (x + w + kerf > sheet.width || y + h + kerf > sheet.height) return false;

  // Check overlap with existing placements
  for (const p of sheet.occupied) {
    const px2 = p.x_mm + p.width_mm + kerf;
    const py2 = p.y_mm + p.height_mm + kerf;
    const nx2 = x + w;
    const ny2 = y + h;

    if (x < px2 && nx2 > p.x_mm && y < py2 && ny2 > p.y_mm) {
      return false; // overlap
    }
  }
  return true;
}

function findPosition(sheet: SheetState, w: number, h: number, kerf: number): { x: number; y: number } | null {
  // Try grid positions — bottom-left first
  const step = 1; // 1mm resolution for speed/accuracy tradeoff
  for (let y = 0; y <= sheet.height - h; y += step) {
    for (let x = 0; x <= sheet.width - w; x += step) {
      if (fits(sheet, x, y, w, h, kerf)) return { x, y };
    }
  }
  return null;
}

function nestOnSheet(parts: { id: string; w: number; h: number; qty: number; rotate: boolean }[], sheet: StockSheet, kerf: number): { placements: NestPlacement[]; remaining: { id: string; qty: number }[] } {
  const state: SheetState = { width: sheet.width_mm, height: sheet.height_mm, occupied: [] };
  const placements: NestPlacement[] = [];
  const remaining: { id: string; qty: number }[] = [];

  // Sort parts largest first (area-descending — better packing)
  const sorted = [...parts].sort((a, b) => (b.w * b.h) - (a.w * a.h));

  for (const part of sorted) {
    let placed = 0;
    for (let i = 0; i < part.qty; i++) {
      // Try normal orientation
      let pos = findPosition(state, part.w, part.h, kerf);
      let rotated = false;

      // Try rotated if allowed and normal didn't fit
      if (!pos && part.rotate && part.w !== part.h) {
        pos = findPosition(state, part.h, part.w, kerf);
        rotated = true;
      }

      if (pos) {
        const w = rotated ? part.h : part.w;
        const h = rotated ? part.w : part.h;
        const placement: NestPlacement = {
          part_id: part.id, instance: placed + 1,
          x_mm: pos.x, y_mm: pos.y, rotated,
          width_mm: w, height_mm: h,
        };
        placements.push(placement);
        state.occupied.push(placement);
        placed++;
      }
    }
    if (placed < part.qty) {
      remaining.push({ id: part.id, qty: part.qty - placed });
    }
  }

  return { placements, remaining };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class NestingEngine {
  nest(parts: NestPart[], stock: StockSheet, kerfMm: number = 3): NestResult {
    const totalRequested = parts.reduce((s, p) => s + p.quantity, 0);
    const allPlacements: NestPlacement[] = [];
    let sheetsUsed = 0;

    // Prepare part list
    let partList = parts.map(p => ({
      id: p.id, w: p.width_mm, h: p.height_mm,
      qty: p.quantity, rotate: p.allow_rotation !== false,
    }));

    // Nest across multiple sheets
    while (partList.some(p => p.qty > 0) && sheetsUsed < 100) {
      sheetsUsed++;
      const { placements, remaining } = nestOnSheet(partList, stock, kerfMm);

      if (placements.length === 0) break; // nothing fits, stop

      for (const p of placements) {
        allPlacements.push({ ...p, instance: allPlacements.filter(x => x.part_id === p.part_id).length + 1 });
      }

      // Update remaining quantities
      partList = partList.map(p => {
        const rem = remaining.find(r => r.id === p.id);
        return { ...p, qty: rem ? rem.qty : 0 };
      });
    }

    const totalPlaced = allPlacements.length;
    const partArea = allPlacements.reduce((s, p) => s + p.width_mm * p.height_mm, 0);
    const stockArea = sheetsUsed * stock.width_mm * stock.height_mm;
    const utilization = stockArea > 0 ? (partArea / stockArea) * 100 : 0;

    const unplaced = partList.filter(p => p.qty > 0).map(p => ({ part_id: p.id, remaining: p.qty }));
    const costPerSheet = stock.cost_per_sheet || 50;

    return {
      placements: allPlacements,
      sheets_used: sheetsUsed,
      utilization_pct: Math.round(utilization * 10) / 10,
      waste_pct: Math.round((100 - utilization) * 10) / 10,
      total_parts_placed: totalPlaced,
      total_parts_requested: totalRequested,
      unplaced,
      kerf_allowance_mm: kerfMm,
      cost_estimate: Math.round(sheetsUsed * costPerSheet * 100) / 100,
    };
  }

  analyze(parts: NestPart[], stock: StockSheet): NestAnalysis {
    const partArea = parts.reduce((s, p) => s + p.width_mm * p.height_mm * p.quantity, 0);
    const stockArea = stock.width_mm * stock.height_mm;
    const minSheets = Math.ceil(partArea / stockArea);
    const theoreticalMax = (partArea / (minSheets * stockArea)) * 100;

    const result = this.nest(parts, stock);

    return {
      part_area_mm2: Math.round(partArea),
      stock_area_mm2: Math.round(stockArea),
      theoretical_max_utilization_pct: Math.round(theoreticalMax * 10) / 10,
      actual_utilization_pct: result.utilization_pct,
      efficiency_ratio: theoreticalMax > 0
        ? Math.round((result.utilization_pct / theoreticalMax) * 100) / 100
        : 0,
    };
  }

  compareStock(parts: NestPart[], stocks: StockSheet[]): { stock: StockSheet; result: NestResult }[] {
    return stocks.map(stock => ({ stock, result: this.nest(parts, stock) }));
  }
}

export const nestingEngine = new NestingEngine();
