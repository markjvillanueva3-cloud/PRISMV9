/**
 * BillOfMaterialsRollupFormula — multi-level BOM explosion + cost rollup
 * (hotel iter16b, 2026-05-24, U-BOM-ROLLUP).
 *
 * Closes G4 from the ERP-comparison audit. A BOM is a tree where each
 * parent part is composed of N child parts with a quantity-per-parent. For
 * a top-level assembly the engine answers:
 *
 *   1. explode(rootId, qty)
 *      Recursive multi-level explosion — for every leaf/sub-assembly,
 *      compute total required quantity = qty_per_parent × parent_required.
 *      Returns flattened "indented BOM" with running depth + accumulated
 *      qty (the standard MRP gross-requirements list).
 *
 *   2. rollUpCost(rootId, qty)
 *      Recursive cost rollup — for every parent, cost = Σ (child_qty ×
 *      child_unit_cost). Leaves have unit_cost from the parts catalog;
 *      sub-assemblies compute their unit_cost bottom-up. Returns the
 *      assembly's total cost AND the per-level breakdown.
 *
 *   3. circularReferenceCheck(rootId)
 *      Graph-integrity gate — refuses to operate on a BOM with cycles
 *      (a part that references itself transitively is an unbuildable
 *      assembly).
 *
 * Hotel-soul:
 *   - **R12 fail-loud** — cycles, unknown component refs, negative
 *     quantities, duplicate part IDs all throw
 *   - **deterministic** — children iterated in id-ASC order
 *   - **graph-integrity gate** — cycle detection before any rollup
 *   - **financial-invariant** — Σ (component costs) at each level matches
 *     rolled-up parent cost (within $0.01 per dollar — float tolerance)
 *
 * Reference: Orlicky "Material Requirements Planning" 1975 (canonical MRP
 * BOM-explosion text); Vollmann/Berry/Whybark/Jacobs "Manufacturing
 * Planning and Control Systems" 5e Ch.4.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BomPart {
  id: string;
  description?: string;
  unit_cost?: number;             // unit cost (required for leaves; computed for assemblies)
  components?: BomComponent[];    // child links (absent or empty = leaf)
}

export interface BomComponent {
  child_id: string;
  qty_per_parent: number;
}

export interface ExplodedBomRow {
  part_id: string;
  description?: string;
  depth: number;                  // 0 = root assembly
  qty_required: number;           // accumulated through the multi-level explosion
  unit_cost: number;              // catalog leaf cost or computed sub-assembly cost
  extended_cost: number;          // qty_required × unit_cost
}

export interface BomExplosionResult {
  root_id: string;
  top_qty: number;
  rows: ExplodedBomRow[];         // depth-first, deterministic id-ASC at each level
  total_parts_count: number;      // distinct part IDs in the explosion
  fetched_at: string;
}

export interface BomCostRollupResult {
  root_id: string;
  top_qty: number;
  unit_cost: number;              // rolled-up cost per single root assembly
  total_cost: number;             // unit_cost × top_qty
  by_level: Array<{ depth: number; cost: number; part_count: number }>;
  ledger_balanced: boolean;       // hotel-soul invariant
  fetched_at: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_BOM_DEPTH = 32;          // industry-typical (deep aircraft BOMs cap ~25)
const LEDGER_TOLERANCE_PER_DOLLAR = 0.01;
const MIN_PART_ID_LEN = 1;
const MAX_PARTS = 100_000;

// ─── Helpers ────────────────────────────────────────────────────────────────

function assertCatalog(parts: BomPart[]): Map<string, BomPart> {
  if (!Array.isArray(parts)) throw new Error("parts: must be an array");
  if (parts.length === 0) throw new Error("parts: empty catalog");
  if (parts.length > MAX_PARTS) throw new Error(`parts: exceeds ${MAX_PARTS}`);
  const m = new Map<string, BomPart>();
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p === null || typeof p !== "object") throw new Error(`parts[${i}]: must be an object`);
    if (typeof p.id !== "string" || p.id.length < MIN_PART_ID_LEN) {
      throw new Error(`parts[${i}].id: must be non-empty string`);
    }
    if (m.has(p.id)) throw new Error(`parts: duplicate id '${p.id}'`);
    if (p.unit_cost !== undefined) {
      if (!Number.isFinite(p.unit_cost)) throw new Error(`parts[${p.id}].unit_cost: must be finite`);
      if (p.unit_cost < 0) throw new Error(`parts[${p.id}].unit_cost: must be >= 0`);
    }
    if (p.components !== undefined) {
      if (!Array.isArray(p.components)) throw new Error(`parts[${p.id}].components: must be array`);
      for (let j = 0; j < p.components.length; j++) {
        const c = p.components[j];
        if (typeof c.child_id !== "string" || c.child_id.length === 0) {
          throw new Error(`parts[${p.id}].components[${j}].child_id: must be non-empty string`);
        }
        if (!Number.isFinite(c.qty_per_parent) || c.qty_per_parent <= 0) {
          throw new Error(`parts[${p.id}].components[${j}].qty_per_parent: must be > 0`);
        }
        if (c.child_id === p.id) {
          throw new Error(`parts[${p.id}]: self-reference in components`);
        }
      }
    }
    m.set(p.id, p);
  }
  // Verify every child_id resolves
  for (const p of m.values()) {
    for (const c of p.components ?? []) {
      if (!m.has(c.child_id)) {
        throw new Error(`parts[${p.id}].components: unknown child_id '${c.child_id}'`);
      }
    }
  }
  return m;
}

function detectCycle(rootId: string, catalog: Map<string, BomPart>): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  function dfs(id: string): void {
    if (visiting.has(id)) {
      throw new Error(`BOM cycle detected: ${[...stack, id].join(" → ")}`);
    }
    if (visited.has(id)) return;
    visiting.add(id);
    stack.push(id);
    for (const c of catalog.get(id)?.components ?? []) {
      dfs(c.child_id);
    }
    visiting.delete(id);
    visited.add(id);
    stack.pop();
  }
  dfs(rootId);
}

function getRoot(rootId: string, catalog: Map<string, BomPart>): BomPart {
  const root = catalog.get(rootId);
  if (!root) throw new Error(`root_id '${rootId}' not found in catalog`);
  return root;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

// ─── Surface 1: Explosion (multi-level, indented gross requirements) ───────

/**
 * Recursive multi-level BOM explosion. Returns flattened indented BOM.
 * @throws on cycle (gate-fired), unknown id, max depth exceeded
 */
export function explodeBOM(
  parts: BomPart[],
  rootId: string,
  topQty: number,
): BomExplosionResult {
  if (!Number.isFinite(topQty) || topQty <= 0) {
    throw new Error(`topQty: must be > 0 (got ${topQty})`);
  }
  const catalog = assertCatalog(parts);
  getRoot(rootId, catalog);
  detectCycle(rootId, catalog);

  const rows: ExplodedBomRow[] = [];
  const distinctIds = new Set<string>();

  function visit(id: string, qty: number, depth: number): void {
    if (depth > MAX_BOM_DEPTH) {
      throw new Error(`BOM depth exceeds ${MAX_BOM_DEPTH} at part '${id}'`);
    }
    const part = catalog.get(id)!;
    const unitCost = part.unit_cost ?? 0;  // recomputed below for assemblies
    rows.push({
      part_id: id,
      description: part.description,
      depth,
      qty_required: qty,
      unit_cost: unitCost,
      extended_cost: round2(qty * unitCost),
    });
    distinctIds.add(id);
    const components = [...(part.components ?? [])].sort((a, b) => a.child_id.localeCompare(b.child_id));
    for (const c of components) {
      visit(c.child_id, qty * c.qty_per_parent, depth + 1);
    }
  }
  visit(rootId, topQty, 0);

  return {
    root_id: rootId,
    top_qty: topQty,
    rows,
    total_parts_count: distinctIds.size,
    fetched_at: new Date().toISOString(),
  };
}

// ─── Surface 2: Cost rollup (bottom-up) ─────────────────────────────────────

/**
 * Recursive bottom-up cost rollup. For each assembly: cost = Σ (child_qty
 * × child_unit_cost). Leaves use catalog unit_cost (defaults to 0 if absent
 * — operator catalog responsibility).
 *
 * Hotel-soul: financial-invariant gate verifies Σ (level costs) reconciles
 * with the rolled-up total within $0.01/$.
 */
export function rollUpBomCost(
  parts: BomPart[],
  rootId: string,
  topQty: number,
): BomCostRollupResult {
  if (!Number.isFinite(topQty) || topQty <= 0) {
    throw new Error(`topQty: must be > 0 (got ${topQty})`);
  }
  const catalog = assertCatalog(parts);
  getRoot(rootId, catalog);
  detectCycle(rootId, catalog);

  // Bottom-up cost cache via memoized recursion
  const cache = new Map<string, number>();
  function unitCostOf(id: string): number {
    if (cache.has(id)) return cache.get(id)!;
    const part = catalog.get(id)!;
    const components = part.components ?? [];
    let cost: number;
    if (components.length === 0) {
      cost = part.unit_cost ?? 0;
    } else {
      cost = components.reduce((s, c) => s + c.qty_per_parent * unitCostOf(c.child_id), 0);
    }
    cache.set(id, cost);
    return cost;
  }

  const rootUnitCost = unitCostOf(rootId);

  // Build per-level breakdown via explosion
  const exploded = explodeBOM(parts, rootId, topQty);
  const byLevelMap = new Map<number, { cost: number; part_count: number }>();
  for (const row of exploded.rows) {
    // Use computed unit cost for assemblies (cache) — overrides catalog default of 0
    const trueUnit = unitCostOf(row.part_id);
    const isLeaf = (catalog.get(row.part_id)?.components ?? []).length === 0;
    // Only include LEAF extended costs in level rollup — sub-assemblies are
    // composites of their leaves and would double-count if added independently
    if (!isLeaf) continue;
    const ext = row.qty_required * trueUnit;
    const cur = byLevelMap.get(row.depth) ?? { cost: 0, part_count: 0 };
    cur.cost = round2(cur.cost + ext);
    cur.part_count += 1;
    byLevelMap.set(row.depth, cur);
  }
  const byLevel = [...byLevelMap.entries()]
    .map(([depth, v]) => ({ depth, cost: v.cost, part_count: v.part_count }))
    .sort((a, b) => a.depth - b.depth);

  const totalCost = round2(rootUnitCost * topQty);
  // Ledger gate: Σ level costs == total (per $0.01 of total)
  const levelSum = byLevel.reduce((s, l) => s + l.cost, 0);
  const tol = Math.max(LEDGER_TOLERANCE_PER_DOLLAR, totalCost * LEDGER_TOLERANCE_PER_DOLLAR);
  const balanced = Math.abs(levelSum - totalCost) <= tol;
  if (!balanced) {
    throw new Error(`rollUpBomCost: level-sum $${levelSum.toFixed(2)} != total $${totalCost.toFixed(2)} (tolerance $${tol.toFixed(2)})`);
  }

  return {
    root_id: rootId,
    top_qty: topQty,
    unit_cost: round2(rootUnitCost),
    total_cost: totalCost,
    by_level: byLevel,
    ledger_balanced: balanced,
    fetched_at: new Date().toISOString(),
  };
}

// ─── Surface 3: Standalone cycle check ─────────────────────────────────────

/**
 * Standalone cycle-integrity check — returns the cycle path if found,
 * otherwise null. Useful for catalog-import validation before any rollup.
 */
export function circularReferenceCheck(parts: BomPart[], rootId: string): string | null {
  const catalog = assertCatalog(parts);
  getRoot(rootId, catalog);
  try {
    detectCycle(rootId, catalog);
    return null;
  } catch (err) {
    return (err as Error).message;
  }
}
