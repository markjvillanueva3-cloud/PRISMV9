/**
 * MonolithStockPositionsDatabaseEngine — U-DB-MONOLITH-STOCK-POSITIONS-LOADER
 *
 * TS-typed port of `PRISM_STOCK_POSITIONS_DATABASE.js` from the v8.89
 * monolith extraction (HyperMILL Stock Positions Reference).
 * Source: extracted_modules/databases/PRISM_STOCK_POSITIONS_DATABASE.js
 *
 * Carries 18 normalized stock-corner / face-center positions
 * (9 top + 9 bottom) for hyperMILL stock-relative coordinate lookups.
 * Each position has x/y/z normalized 0..1 within the stock bounding box.
 *
 * Public API mirrors the monolith:
 *   - listPositions() / listTop() / listBottom() — catalog access
 *   - getPosition(name) — single record lookup (top or bottom)
 *   - resolve(name, stockBounds) — normalize→absolute coordinate conversion
 *     (monolith's `getStockPosition`)
 *   - stats() — counts
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-STOCK-POSITIONS-LOADER
 *   (slot juliett, 2026-05-26)
 */

export interface StockPositionSpec {
  id: string;
  /** "top" or "bottom" (Z-face the position lives on). */
  face: "top" | "bottom";
  /** Normalized 0..1 within stock bounds. */
  x: number;
  y: number;
  z: number;
  desc: string;
}

export interface StockBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface AbsolutePosition {
  x: number;
  y: number;
  z: number;
}

// ── Data (hand-ported from monolith v1.0.0) ───────────────────────────────

const TOP_POSITIONS: Record<string, Omit<StockPositionSpec, "id" | "face">> = {
  TOP_CENTER:       { x: 0.5, y: 0.5, z: 1.0, desc: "Top center" },
  TOP_CENTER_FRONT: { x: 0.5, y: 0,   z: 1.0, desc: "Top center front" },
  TOP_CENTER_BACK:  { x: 0.5, y: 1.0, z: 1.0, desc: "Top center back" },
  TOP_CENTER_LEFT:  { x: 0,   y: 0.5, z: 1.0, desc: "Top center left" },
  TOP_CENTER_RIGHT: { x: 1.0, y: 0.5, z: 1.0, desc: "Top center right" },
  TOP_LEFT_FRONT:   { x: 0,   y: 0,   z: 1.0, desc: "Top left front corner" },
  TOP_LEFT_BACK:    { x: 0,   y: 1.0, z: 1.0, desc: "Top left back corner" },
  TOP_RIGHT_FRONT:  { x: 1.0, y: 0,   z: 1.0, desc: "Top right front corner" },
  TOP_RIGHT_BACK:   { x: 1.0, y: 1.0, z: 1.0, desc: "Top right back corner" },
};

const BOTTOM_POSITIONS: Record<string, Omit<StockPositionSpec, "id" | "face">> = {
  BOTTOM_CENTER:       { x: 0.5, y: 0.5, z: 0, desc: "Bottom center" },
  BOTTOM_CENTER_FRONT: { x: 0.5, y: 0,   z: 0, desc: "Bottom center front" },
  BOTTOM_CENTER_BACK:  { x: 0.5, y: 1.0, z: 0, desc: "Bottom center back" },
  BOTTOM_CENTER_LEFT:  { x: 0,   y: 0.5, z: 0, desc: "Bottom center left" },
  BOTTOM_CENTER_RIGHT: { x: 1.0, y: 0.5, z: 0, desc: "Bottom center right" },
  BOTTOM_LEFT_FRONT:   { x: 0,   y: 0,   z: 0, desc: "Bottom left front corner" },
  BOTTOM_LEFT_BACK:    { x: 0,   y: 1.0, z: 0, desc: "Bottom left back corner" },
  BOTTOM_RIGHT_FRONT:  { x: 1.0, y: 0,   z: 0, desc: "Bottom right front corner" },
  BOTTOM_RIGHT_BACK:   { x: 1.0, y: 1.0, z: 0, desc: "Bottom right back corner" },
};

// ── Engine ────────────────────────────────────────────────────────────────

export class MonolithStockPositionsDatabaseEngine {
  /** All 18 positions (9 top + 9 bottom) with face + id materialized. */
  listPositions(): StockPositionSpec[] {
    return [...this.listTop(), ...this.listBottom()];
  }

  listTop(): StockPositionSpec[] {
    return Object.entries(TOP_POSITIONS).map(([id, p]) => ({ id, face: "top", ...p }));
  }

  listBottom(): StockPositionSpec[] {
    return Object.entries(BOTTOM_POSITIONS).map(([id, p]) => ({ id, face: "bottom", ...p }));
  }

  /** Single position by id (searches top + bottom). Null on miss. */
  getPosition(name: string): StockPositionSpec | null {
    if (typeof name !== "string" || name.trim() === "") return null;
    if (TOP_POSITIONS[name]) {
      return { id: name, face: "top", ...TOP_POSITIONS[name] };
    }
    if (BOTTOM_POSITIONS[name]) {
      return { id: name, face: "bottom", ...BOTTOM_POSITIONS[name] };
    }
    return null;
  }

  /**
   * Resolve a normalized position into absolute coordinates given stock
   * bounds. Mirrors the monolith's `getStockPosition()` semantics:
   *   abs.x = minX + (maxX - minX) * normalized.x
   *
   * Returns null if position name or bounds are invalid.
   */
  resolve(name: string, stockBounds: StockBounds | null | undefined): AbsolutePosition | null {
    const pos = this.getPosition(name);
    if (!pos) return null;
    if (!stockBounds || typeof stockBounds !== "object") return null;
    const required = ["minX", "maxX", "minY", "maxY", "minZ", "maxZ"] as const;
    for (const k of required) {
      const v = (stockBounds as Record<string, unknown>)[k];
      if (typeof v !== "number" || !Number.isFinite(v)) return null;
    }
    return {
      x: stockBounds.minX + (stockBounds.maxX - stockBounds.minX) * pos.x,
      y: stockBounds.minY + (stockBounds.maxY - stockBounds.minY) * pos.y,
      z: stockBounds.minZ + (stockBounds.maxZ - stockBounds.minZ) * pos.z,
    };
  }

  stats(): { top: number; bottom: number; total: number } {
    const t = Object.keys(TOP_POSITIONS).length;
    const b = Object.keys(BOTTOM_POSITIONS).length;
    return { top: t, bottom: b, total: t + b };
  }
}

export const monolithStockPositionsDatabaseEngine = new MonolithStockPositionsDatabaseEngine();
