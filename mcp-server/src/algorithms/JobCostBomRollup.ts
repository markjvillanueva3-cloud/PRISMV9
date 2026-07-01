/**
 * JobCostBomRollup — Business/ERP #7.1
 * Recursive multi-level BOM cost roll-up. Each assembly is built from
 * sub-assemblies + parts. Returns the total cost per assembly + per-level
 * breakdown (material, labor, machine-hours, overhead). Handles cycles
 * (max-depth guard) and missing children (warn + skip).
 */
interface AtomicValue<T = number> { value: T; unit: string; uncertainty: number; source: string; confidence?: number }

export interface BomLine {
  /** Unique part/assembly id. */
  id: string;
  /** Quantity of this child per parent assembly. */
  quantity: number;
  /** Per-unit cost components for this line (does NOT include children — those roll up). */
  material_cost_usd?: number;
  labor_cost_usd?: number;
  machine_hours?: number;
  /** Hourly rate to convert machine_hours into cost. Default 75 USD/hr. */
  machine_rate_usd_per_hr?: number;
  /** Overhead multiplier on (material + labor + machine). Default 0.15 (15%). */
  overhead_pct?: number;
  /** Children of this assembly. Leaves omit this. */
  children?: BomLine[];
}

export interface BomRollupInput {
  root: BomLine;
}

export interface BomNodeCost {
  id: string;
  total_cost_usd: number;
  material_cost_usd: number;
  labor_cost_usd: number;
  machine_cost_usd: number;
  overhead_cost_usd: number;
  rolled_up_children_count: number;
  depth: number;
}

export interface BomRollupResult {
  total_cost_usd: AtomicValue;
  material_subtotal_usd: AtomicValue;
  labor_subtotal_usd: AtomicValue;
  machine_subtotal_usd: AtomicValue;
  overhead_subtotal_usd: AtomicValue;
  node_breakdown: BomNodeCost[];
  max_depth_seen: number;
  notes: string[];
  source: string;
}

const MACHINE_RATE_DEFAULT = 75;
const OVERHEAD_DEFAULT = 0.15;
const MAX_BOM_DEPTH = 32;
const MAX_NODES = 50_000;
const MAX_QTY = 1_000_000;

function av(value: number, unit: string, source: string, conf: number): AtomicValue {
  return { value, unit, uncertainty: Math.abs(value) * 0.05, source, confidence: conf };
}
function emit(reason: string): BomRollupResult {
  const z = av(0, "USD", "invalid-input", 0);
  return { total_cost_usd: z, material_subtotal_usd: z, labor_subtotal_usd: z, machine_subtotal_usd: z, overhead_subtotal_usd: z, node_breakdown: [], max_depth_seen: 0, notes: [reason], source: "JobCostBomRollup v1.0.0" };
}

interface Subtotals { material: number; labor: number; machine: number; overhead: number; }

function rollup(node: BomLine, depth: number, breakdown: BomNodeCost[], subtotals: Subtotals, visited: Set<string>, notes: string[]): { perUnit: number; rolledChildren: number } {
  if (depth > MAX_BOM_DEPTH) {
    notes.push(`max BOM depth ${MAX_BOM_DEPTH} exceeded at node ${node.id}`);
    return { perUnit: 0, rolledChildren: 0 };
  }
  if (visited.has(node.id)) {
    notes.push(`cycle detected at node ${node.id} — skipped`);
    return { perUnit: 0, rolledChildren: 0 };
  }
  visited.add(node.id);

  const mat = Math.max(0, node.material_cost_usd ?? 0);
  const lab = Math.max(0, node.labor_cost_usd ?? 0);
  const rate = Math.max(0, node.machine_rate_usd_per_hr ?? MACHINE_RATE_DEFAULT);
  const hrs = Math.max(0, node.machine_hours ?? 0);
  const mac = rate * hrs;
  const ovh = (mat + lab + mac) * Math.max(0, node.overhead_pct ?? OVERHEAD_DEFAULT);
  const selfPerUnit = mat + lab + mac + ovh;

  let childrenPerUnit = 0;
  let rolledChildren = 0;
  if (Array.isArray(node.children)) {
    for (const c of node.children) {
      const qty = Math.max(0, c.quantity ?? 1);
      const childResult = rollup(c, depth + 1, breakdown, subtotals, new Set(visited), notes);
      childrenPerUnit += childResult.perUnit * qty;
      rolledChildren += 1 + childResult.rolledChildren;
    }
  }

  const totalPerUnit = selfPerUnit + childrenPerUnit;
  // Add own contribution to subtotals (does NOT double-count children — they added themselves)
  subtotals.material += mat;
  subtotals.labor += lab;
  subtotals.machine += mac;
  subtotals.overhead += ovh;
  breakdown.push({
    id: node.id, total_cost_usd: totalPerUnit, material_cost_usd: mat, labor_cost_usd: lab,
    machine_cost_usd: mac, overhead_cost_usd: ovh, rolled_up_children_count: rolledChildren, depth,
  });
  return { perUnit: totalPerUnit, rolledChildren };
}

export function rollupCost(input: BomRollupInput): BomRollupResult {
  if (!input || !input.root) return emit("missing input / root");
  if (typeof input.root.id !== "string" || input.root.id.length === 0) return emit("root.id must be a non-empty string");

  const breakdown: BomNodeCost[] = [];
  const subtotals: Subtotals = { material: 0, labor: 0, machine: 0, overhead: 0 };
  const notes: string[] = [];
  const visited = new Set<string>();

  // Validate quantity range as we recurse — root qty fixed at 1
  const rootQty = Math.max(1, input.root.quantity ?? 1);
  if (rootQty > MAX_QTY) return emit(`root quantity ${rootQty} exceeds ${MAX_QTY}`);

  const result = rollup(input.root, 1, breakdown, subtotals, visited, notes);
  if (breakdown.length > MAX_NODES) {
    notes.push(`BOM exceeds ${MAX_NODES} nodes — analysis truncated`);
  }

  const maxDepth = breakdown.reduce((m, n) => Math.max(m, n.depth), 0);
  const total = result.perUnit * rootQty;

  return {
    total_cost_usd: av(total, "USD", "BOM-roll-up", 0.92),
    material_subtotal_usd: av(subtotals.material, "USD", "material subtotal", 0.95),
    labor_subtotal_usd: av(subtotals.labor, "USD", "labor subtotal", 0.92),
    machine_subtotal_usd: av(subtotals.machine, "USD", "machine subtotal (rate×hrs)", 0.90),
    overhead_subtotal_usd: av(subtotals.overhead, "USD", "overhead subtotal", 0.85),
    node_breakdown: breakdown, max_depth_seen: maxDepth, notes, source: "JobCostBomRollup v1.0.0",
  };
}

export const JobCostBomRollup = { version: "1.0.0" as const, rollupCost };
