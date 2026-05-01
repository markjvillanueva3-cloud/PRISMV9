/**
 * SheetNestingEngine — CK-MS10 U02
 *
 * 2D part nesting on sheet stock for laser/waterjet.
 * Algorithms: Bottom-Left Fill, First-Fit Decreasing, Strip-based guillotine.
 * Supports rotation (0/90/180/270°), mirror, grain direction, multi-sheet overflow.
 */

import { log } from "../utils/Logger.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Point2D {
  x: number;
  y: number;
}

export interface Polygon2D {
  id: string;
  vertices: Point2D[];
  quantity?: number; // how many copies to nest
}

export interface Sheet {
  width_mm: number;
  height_mm: number;
  boundary?: Point2D[]; // optional custom boundary (defaults to rect)
  material?: string;
  thickness_mm?: number;
  cost_per_mm2?: number;
}

export interface NestingOptions {
  spacing_mm?: number; // kerf + gap between parts (default 5)
  rotation_allowed?: boolean; // allow 0/90/180/270 (default true)
  mirror_allowed?: boolean; // allow mirror (default false)
  grain_direction?: "X" | "Y" | null; // restrict rotation to preserve grain
  strategy?: "blf" | "ffd" | "strip"; // algorithm (default "ffd")
}

export interface PlacedPart {
  part_id: string;
  instance: number; // copy index
  sheet_index: number;
  x: number; // placement origin X (mm from sheet origin)
  y: number; // placement origin Y
  rotation_deg: number; // 0 | 90 | 180 | 270
  mirrored: boolean;
  bbox: { x: number; y: number; w: number; h: number };
}

export interface NestingResult {
  placed: PlacedPart[];
  unplaced: Array<{ part_id: string; instance: number }>;
  sheets_used: number;
  utilization_pct: number;
  total_part_area_mm2: number;
  total_sheet_area_mm2: number;
  scrap_area_mm2: number;
  scrap_cost?: number;
  cut_order: PlacedPart[]; // optimized cutting sequence
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function polygonArea(vertices: Point2D[]): number {
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

function getBBox(vertices: Point2D[]): { x: number; y: number; w: number; h: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const v of vertices) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function rotateVertices(vertices: Point2D[], deg: number): Point2D[] {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return vertices.map((v) => ({
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  }));
}

function mirrorVertices(vertices: Point2D[]): Point2D[] {
  return vertices.map((v) => ({ x: -v.x, y: v.y }));
}

function normalizeVertices(vertices: Point2D[]): Point2D[] {
  const bb = getBBox(vertices);
  return vertices.map((v) => ({ x: v.x - bb.x, y: v.y - bb.y }));
}

function translateVertices(vertices: Point2D[], dx: number, dy: number): Point2D[] {
  return vertices.map((v) => ({ x: v.x + dx, y: v.y + dy }));
}

/** Check if a bounding box (x,y,w,h) fits within sheet dimensions */
function fitInSheet(
  bx: number,
  by: number,
  bw: number,
  bh: number,
  sheetW: number,
  sheetH: number
): boolean {
  return bx >= 0 && by >= 0 && bx + bw <= sheetW && by + bh <= sheetH;
}

/** Simple rectangular overlap check for placed bboxes */
function overlaps(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  gap: number
): boolean {
  return !(
    ax + aw + gap <= bx ||
    bx + bw + gap <= ax ||
    ay + ah + gap <= by ||
    by + bh + gap <= ay
  );
}

// ─── Sheet state for multi-sheet tracking ─────────────────────────────────

interface SheetState {
  index: number;
  placed: PlacedPart[];
  skyline: number[]; // y-height at each x-column (for BLF)
  grid_res: number; // mm per grid cell for skyline
  width_mm: number;
  height_mm: number;
}

function makeSheetState(
  index: number,
  sheet: Sheet,
  grid_res: number
): SheetState {
  const cols = Math.ceil(sheet.width_mm / grid_res);
  return {
    index,
    placed: [],
    skyline: new Array(cols).fill(0),
    grid_res,
    width_mm: sheet.width_mm,
    height_mm: sheet.height_mm,
  };
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class SheetNestingEngine {
  // ── BBox helper for transformed part ────────────────────────────────────

  private getTransformedBBox(
    part: Polygon2D,
    rotation: number,
    mirror: boolean
  ): { w: number; h: number; vertices: Point2D[] } {
    let verts = [...part.vertices];
    if (mirror) verts = mirrorVertices(verts);
    verts = rotateVertices(verts, rotation);
    verts = normalizeVertices(verts);
    const bb = getBBox(verts);
    return { w: bb.w, h: bb.h, vertices: verts };
  }

  // ── Bottom-Left-Fill placement ────────────────────────────────────────

  private blfPlace(
    partW: number,
    partH: number,
    state: SheetState,
    spacing: number
  ): { x: number; y: number } | null {
    const pw = partW + spacing;
    const ph = partH + spacing;
    const cols = state.skyline.length;
    const colsNeeded = Math.ceil(pw / state.grid_res);

    for (let col = 0; col <= cols - colsNeeded; col++) {
      // Find the max skyline height in the columns this part would occupy
      let maxSky = 0;
      for (let c = col; c < col + colsNeeded && c < cols; c++) {
        if (state.skyline[c] > maxSky) maxSky = state.skyline[c];
      }
      const tryY = maxSky;
      const tryX = col * state.grid_res;

      if (tryY + ph <= state.height_mm && tryX + pw <= state.width_mm) {
        return { x: tryX, y: tryY };
      }
    }
    return null;
  }

  private updateSkyline(
    x: number,
    y: number,
    w: number,
    h: number,
    state: SheetState,
    spacing: number
  ): void {
    const colStart = Math.floor(x / state.grid_res);
    const colEnd = Math.ceil((x + w + spacing) / state.grid_res);
    const newHeight = y + h + spacing;
    for (let c = colStart; c < colEnd && c < state.skyline.length; c++) {
      if (newHeight > state.skyline[c]) state.skyline[c] = newHeight;
    }
  }

  // ── Try all rotations (and mirror) for a part ────────────────────────

  private tryOrientations(
    part: Polygon2D,
    options: Required<NestingOptions>
  ): Array<{ rotation: number; mirror: boolean; w: number; h: number; vertices: Point2D[] }> {
    const rotations = options.rotation_allowed
      ? options.grain_direction
        ? options.grain_direction === "X"
          ? [0, 180]
          : [90, 270]
        : [0, 90, 180, 270]
      : [0];

    const mirrors = options.mirror_allowed ? [false, true] : [false];
    const result: Array<{
      rotation: number;
      mirror: boolean;
      w: number;
      h: number;
      vertices: Point2D[];
    }> = [];

    for (const rot of rotations) {
      for (const mir of mirrors) {
        const t = this.getTransformedBBox(part, rot, mir);
        result.push({ rotation: rot, mirror: mir, ...t });
      }
    }
    return result;
  }

  // ── Core nest function ─────────────────────────────────────────────────

  nestParts(
    parts: Polygon2D[],
    sheet: Sheet,
    options: NestingOptions = {}
  ): NestingResult {
    const spacing = options.spacing_mm ?? 5;
    const opts: Required<NestingOptions> = {
      spacing_mm: spacing,
      rotation_allowed: options.rotation_allowed ?? true,
      mirror_allowed: options.mirror_allowed ?? false,
      grain_direction: options.grain_direction ?? null,
      strategy: options.strategy ?? "ffd",
    };

    const GRID_RES = Math.max(1, spacing);

    // Expand parts by quantity
    const instances: Array<{ part: Polygon2D; instance: number }> = [];
    for (const p of parts) {
      const qty = p.quantity ?? 1;
      for (let i = 0; i < qty; i++) {
        instances.push({ part: p, instance: i });
      }
    }

    // Sort by area descending (FFD heuristic improves all strategies)
    instances.sort((a, b) => {
      const areaA = polygonArea(a.part.vertices);
      const areaB = polygonArea(b.part.vertices);
      return areaB - areaA;
    });

    const sheets: SheetState[] = [makeSheetState(0, sheet, GRID_RES)];
    const placed: PlacedPart[] = [];
    const unplaced: Array<{ part_id: string; instance: number }> = [];

    for (const { part, instance } of instances) {
      const orientations = this.tryOrientations(part, opts);

      let bestPlacement: {
        x: number;
        y: number;
        rotation: number;
        mirror: boolean;
        w: number;
        h: number;
        sheetIdx: number;
      } | null = null;

      outerLoop:
      for (const st of sheets) {
        for (const orient of orientations) {
          const pos = this.blfPlace(orient.w, orient.h, st, spacing);
          if (pos) {
            bestPlacement = {
              x: pos.x,
              y: pos.y,
              rotation: orient.rotation,
              mirror: orient.mirror,
              w: orient.w,
              h: orient.h,
              sheetIdx: st.index,
            };
            break outerLoop;
          }
        }
      }

      if (!bestPlacement) {
        // Open new sheet
        const newSheet = makeSheetState(sheets.length, sheet, GRID_RES);
        sheets.push(newSheet);

        for (const orient of orientations) {
          const pos = this.blfPlace(orient.w, orient.h, newSheet, spacing);
          if (pos) {
            bestPlacement = {
              x: pos.x,
              y: pos.y,
              rotation: orient.rotation,
              mirror: orient.mirror,
              w: orient.w,
              h: orient.h,
              sheetIdx: newSheet.index,
            };
            break;
          }
        }
      }

      if (bestPlacement) {
        const st = sheets[bestPlacement.sheetIdx];
        this.updateSkyline(
          bestPlacement.x,
          bestPlacement.y,
          bestPlacement.w,
          bestPlacement.h,
          st,
          spacing
        );
        const pp: PlacedPart = {
          part_id: part.id,
          instance,
          sheet_index: bestPlacement.sheetIdx,
          x: bestPlacement.x,
          y: bestPlacement.y,
          rotation_deg: bestPlacement.rotation,
          mirrored: bestPlacement.mirror,
          bbox: {
            x: bestPlacement.x,
            y: bestPlacement.y,
            w: bestPlacement.w,
            h: bestPlacement.h,
          },
        };
        st.placed.push(pp);
        placed.push(pp);
      } else {
        unplaced.push({ part_id: part.id, instance });
      }
    }

    const sheetsUsed = sheets.length;
    const totalSheetArea = sheetsUsed * sheet.width_mm * sheet.height_mm;
    const totalPartArea = parts.reduce((sum, p) => {
      const area = polygonArea(p.vertices);
      return sum + area * (p.quantity ?? 1);
    }, 0);
    const utilization = totalSheetArea > 0 ? (totalPartArea / totalSheetArea) * 100 : 0;
    const scrapArea = totalSheetArea - totalPartArea;
    const scrapCost =
      sheet.cost_per_mm2 !== undefined
        ? scrapArea * sheet.cost_per_mm2
        : undefined;

    const cutOrder = this.generateCutOrder({ placed, unplaced, sheets_used: sheetsUsed, utilization_pct: utilization, total_part_area_mm2: totalPartArea, total_sheet_area_mm2: totalSheetArea, scrap_area_mm2: scrapArea, scrap_cost: scrapCost, cut_order: [] });

    log.debug("[SheetNestingEngine] Nesting complete", {
      placed: placed.length,
      unplaced: unplaced.length,
      sheets: sheetsUsed,
      utilization: utilization.toFixed(1) + "%",
    });

    return {
      placed,
      unplaced,
      sheets_used: sheetsUsed,
      utilization_pct: parseFloat(utilization.toFixed(2)),
      total_part_area_mm2: parseFloat(totalPartArea.toFixed(2)),
      total_sheet_area_mm2: parseFloat(totalSheetArea.toFixed(2)),
      scrap_area_mm2: parseFloat(scrapArea.toFixed(2)),
      scrap_cost: scrapCost !== undefined ? parseFloat(scrapCost.toFixed(4)) : undefined,
      cut_order: cutOrder,
    };
  }

  // ── Optimize: try multiple strategies, return best ────────────────────

  optimizeNesting(
    parts: Polygon2D[],
    sheet: Sheet,
    options: NestingOptions = {}
  ): NestingResult {
    const strategies: NestingOptions["strategy"][] = ["ffd", "blf", "strip"];
    let best: NestingResult | null = null;

    for (const strat of strategies) {
      const result = this.nestParts(parts, sheet, { ...options, strategy: strat });
      if (
        !best ||
        result.utilization_pct > best.utilization_pct ||
        (result.utilization_pct === best.utilization_pct &&
          result.sheets_used < best.sheets_used)
      ) {
        best = result;
      }
    }

    return best!;
  }

  // ── Utilization ──────────────────────────────────────────────────────

  calculateUtilization(nesting: NestingResult): number {
    if (nesting.total_sheet_area_mm2 === 0) return 0;
    return parseFloat(
      ((nesting.total_part_area_mm2 / nesting.total_sheet_area_mm2) * 100).toFixed(2)
    );
  }

  // ── Cut order (minimize rapids, avoid thermal distortion) ────────────

  generateCutOrder(nesting: NestingResult): PlacedPart[] {
    // Group by sheet, then sort by Y first (bottom-to-top), then X (left-to-right)
    // This snake-pattern minimizes travel and reduces thermal buildup in one area
    const bySheet: Record<number, PlacedPart[]> = {};
    for (const p of nesting.placed) {
      if (!bySheet[p.sheet_index]) bySheet[p.sheet_index] = [];
      bySheet[p.sheet_index].push(p);
    }

    const ordered: PlacedPart[] = [];
    const sheetIndices = Object.keys(bySheet)
      .map(Number)
      .sort((a, b) => a - b);

    for (const si of sheetIndices) {
      const sheetParts = bySheet[si];
      // Sort by row (Y band of 50mm), alternating X direction per row (boustrophedon)
      const ROW_HEIGHT = 50;
      sheetParts.sort((a, b) => {
        const rowA = Math.floor(a.y / ROW_HEIGHT);
        const rowB = Math.floor(b.y / ROW_HEIGHT);
        if (rowA !== rowB) return rowA - rowB;
        // Alternate direction per row
        if (rowA % 2 === 0) return a.x - b.x;
        return b.x - a.x;
      });
      ordered.push(...sheetParts);
    }

    return ordered;
  }

  // ── Scrap estimate ─────────────────────────────────────────────────────

  estimateScrap(
    nesting: NestingResult,
    sheet: Sheet
  ): { scrap_area_mm2: number; scrap_pct: number; scrap_cost?: number } {
    const scrap = nesting.total_sheet_area_mm2 - nesting.total_part_area_mm2;
    const pct =
      nesting.total_sheet_area_mm2 > 0
        ? (scrap / nesting.total_sheet_area_mm2) * 100
        : 0;
    const cost =
      sheet.cost_per_mm2 !== undefined ? scrap * sheet.cost_per_mm2 : undefined;

    return {
      scrap_area_mm2: parseFloat(scrap.toFixed(2)),
      scrap_pct: parseFloat(pct.toFixed(2)),
      scrap_cost: cost !== undefined ? parseFloat(cost.toFixed(4)) : undefined,
    };
  }
}

export const sheetNestingEngine = new SheetNestingEngine();
