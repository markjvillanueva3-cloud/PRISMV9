/**
 * BOMEngine — R27-MS2
 *
 * Bill of Materials management: multi-level BOM structure, BOM comparison,
 * configuration management, and where-used analysis for manufacturing.
 *
 * Actions:
 *   bom_structure  — Display multi-level BOM hierarchy with rollup costs
 *   bom_compare    — Compare two BOM revisions or configurations
 *   bom_whereused  — Where-used analysis (find all parents of a component)
 *   bom_configure  — Configuration management (option/variant selection)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BOMItem {
  item_id: string;
  part_number: string;
  description: string;
  revision: string;
  level: number;
  parent_id: string | null;
  quantity: number;
  unit: string;
  unit_cost: number;
  make_buy: "make" | "buy";
  lead_time_days: number;
  supplier: string | null;
  category: "raw_material" | "component" | "sub_assembly" | "fastener" | "consumable" | "tooling";
  critical: boolean;
  alternates: string[];
}

interface BOMConfiguration {
  config_id: string;
  config_name: string;
  base_product: string;
  options: ConfigOption[];
  total_cost: number;
  total_lead_time: number;
}

interface ConfigOption {
  option_group: string;
  selected: string;
  alternatives: string[];
  cost_delta: number;
}

// ---------------------------------------------------------------------------
// Data — Multi-Level BOM for "ASSY-PUMP-001" (Centrifugal Pump Assembly)
// ---------------------------------------------------------------------------

const BOM_DATABASE: BOMItem[] = [
  // Level 0: Top assembly
  { item_id: "B-001", part_number: "ASSY-PUMP-001", description: "Centrifugal Pump Assembly", revision: "C", level: 0, parent_id: null, quantity: 1, unit: "ea", unit_cost: 0, make_buy: "make", lead_time_days: 45, supplier: null, category: "sub_assembly", critical: true, alternates: [] },

  // Level 1: Major sub-assemblies and components
  { item_id: "B-002", part_number: "HSG-3001", description: "Pump Housing", revision: "D", level: 1, parent_id: "B-001", quantity: 1, unit: "ea", unit_cost: 285.00, make_buy: "make", lead_time_days: 12, supplier: null, category: "sub_assembly", critical: true, alternates: [] },
  { item_id: "B-003", part_number: "IMP-1001", description: "Impeller Assembly", revision: "B", level: 1, parent_id: "B-001", quantity: 1, unit: "ea", unit_cost: 195.00, make_buy: "make", lead_time_days: 10, supplier: null, category: "sub_assembly", critical: true, alternates: [] },
  { item_id: "B-004", part_number: "SFT-2001", description: "Drive Shaft", revision: "E", level: 1, parent_id: "B-001", quantity: 1, unit: "ea", unit_cost: 142.00, make_buy: "make", lead_time_days: 8, supplier: null, category: "component", critical: true, alternates: [] },
  { item_id: "B-005", part_number: "SEAL-KIT-001", description: "Mechanical Seal Kit", revision: "A", level: 1, parent_id: "B-001", quantity: 1, unit: "kit", unit_cost: 89.50, make_buy: "buy", lead_time_days: 14, supplier: "FluidSeal Corp", category: "component", critical: true, alternates: ["SEAL-KIT-002"] },
  { item_id: "B-006", part_number: "BRG-SET-001", description: "Bearing Set (2x 6205-2RS)", revision: "A", level: 1, parent_id: "B-001", quantity: 1, unit: "set", unit_cost: 45.00, make_buy: "buy", lead_time_days: 7, supplier: "SKF Distribution", category: "component", critical: true, alternates: ["BRG-SET-002"] },
  { item_id: "B-007", part_number: "GSK-SET-001", description: "Gasket Set", revision: "B", level: 1, parent_id: "B-001", quantity: 1, unit: "set", unit_cost: 22.50, make_buy: "buy", lead_time_days: 5, supplier: "GasketPro Inc", category: "consumable", critical: false, alternates: [] },
  { item_id: "B-008", part_number: "FAS-KIT-001", description: "Fastener Kit (bolts, nuts, washers)", revision: "A", level: 1, parent_id: "B-001", quantity: 1, unit: "kit", unit_cost: 18.75, make_buy: "buy", lead_time_days: 3, supplier: "BoltMax Supply", category: "fastener", critical: false, alternates: [] },

  // Level 2: Pump Housing sub-components
  { item_id: "B-009", part_number: "MAT-CAST-FC250", description: "FC250 Cast Iron Blank", revision: "A", level: 2, parent_id: "B-002", quantity: 1, unit: "ea", unit_cost: 65.00, make_buy: "buy", lead_time_days: 10, supplier: "Metro Castings", category: "raw_material", critical: true, alternates: ["MAT-CAST-FC300"] },
  { item_id: "B-010", part_number: "PLG-NPT-025", description: "1/4 NPT Drain Plug", revision: "A", level: 2, parent_id: "B-002", quantity: 2, unit: "ea", unit_cost: 3.50, make_buy: "buy", lead_time_days: 2, supplier: "BoltMax Supply", category: "fastener", critical: false, alternates: [] },
  { item_id: "B-011", part_number: "INS-WEAR-001", description: "Wear Ring Insert", revision: "C", level: 2, parent_id: "B-002", quantity: 1, unit: "ea", unit_cost: 38.00, make_buy: "make", lead_time_days: 5, supplier: null, category: "component", critical: true, alternates: [] },

  // Level 2: Impeller sub-components
  { item_id: "B-012", part_number: "MAT-SS316-RND", description: "316 Stainless Round Bar 3\" dia", revision: "A", level: 2, parent_id: "B-003", quantity: 1, unit: "ea", unit_cost: 48.00, make_buy: "buy", lead_time_days: 7, supplier: "AlloyTech Metals", category: "raw_material", critical: true, alternates: ["MAT-SS304-RND"] },
  { item_id: "B-013", part_number: "KEY-IMP-001", description: "Impeller Key 5mm x 5mm x 20mm", revision: "A", level: 2, parent_id: "B-003", quantity: 1, unit: "ea", unit_cost: 2.25, make_buy: "buy", lead_time_days: 2, supplier: "BoltMax Supply", category: "fastener", critical: false, alternates: [] },
  { item_id: "B-014", part_number: "NUT-IMP-001", description: "Impeller Lock Nut M16 LH", revision: "A", level: 2, parent_id: "B-003", quantity: 1, unit: "ea", unit_cost: 4.50, make_buy: "buy", lead_time_days: 3, supplier: "BoltMax Supply", category: "fastener", critical: false, alternates: [] },

  // Level 2: Drive Shaft raw material
  { item_id: "B-015", part_number: "MAT-4140-RND", description: "4140 Steel Round Bar 1.5\" dia", revision: "A", level: 2, parent_id: "B-004", quantity: 1, unit: "ea", unit_cost: 32.00, make_buy: "buy", lead_time_days: 5, supplier: "AlloyTech Metals", category: "raw_material", critical: true, alternates: ["MAT-4340-RND"] },
  { item_id: "B-016", part_number: "KEY-SFT-001", description: "Shaft Key 6mm x 6mm x 25mm", revision: "A", level: 2, parent_id: "B-004", quantity: 1, unit: "ea", unit_cost: 2.75, make_buy: "buy", lead_time_days: 2, supplier: "BoltMax Supply", category: "fastener", critical: false, alternates: [] },

  // Level 3: Wear ring raw material
  { item_id: "B-017", part_number: "MAT-BRONZE-TUB", description: "C93200 Bronze Tube 2.5\" OD", revision: "A", level: 3, parent_id: "B-011", quantity: 1, unit: "ea", unit_cost: 22.00, make_buy: "buy", lead_time_days: 7, supplier: "AlloyTech Metals", category: "raw_material", critical: false, alternates: [] },
];

// Second product for comparison: ASSY-PUMP-002 (upgraded version)
const BOM_DATABASE_V2: BOMItem[] = [
  { item_id: "B2-001", part_number: "ASSY-PUMP-002", description: "Centrifugal Pump Assembly (Upgraded)", revision: "A", level: 0, parent_id: null, quantity: 1, unit: "ea", unit_cost: 0, make_buy: "make", lead_time_days: 50, supplier: null, category: "sub_assembly", critical: true, alternates: [] },
  { item_id: "B2-002", part_number: "HSG-3002", description: "Pump Housing (Duplex SS)", revision: "A", level: 1, parent_id: "B2-001", quantity: 1, unit: "ea", unit_cost: 420.00, make_buy: "make", lead_time_days: 15, supplier: null, category: "sub_assembly", critical: true, alternates: [] },
  { item_id: "B2-003", part_number: "IMP-1002", description: "Impeller Assembly (5-vane)", revision: "A", level: 1, parent_id: "B2-001", quantity: 1, unit: "ea", unit_cost: 265.00, make_buy: "make", lead_time_days: 12, supplier: null, category: "sub_assembly", critical: true, alternates: [] },
  { item_id: "B2-004", part_number: "SFT-2001", description: "Drive Shaft", revision: "E", level: 1, parent_id: "B2-001", quantity: 1, unit: "ea", unit_cost: 142.00, make_buy: "make", lead_time_days: 8, supplier: null, category: "component", critical: true, alternates: [] },
  { item_id: "B2-005", part_number: "SEAL-KIT-002", description: "Mechanical Seal Kit (Double)", revision: "A", level: 1, parent_id: "B2-001", quantity: 1, unit: "ea", unit_cost: 156.00, make_buy: "buy", lead_time_days: 21, supplier: "FluidSeal Corp", category: "component", critical: true, alternates: ["SEAL-KIT-001"] },
  { item_id: "B2-006", part_number: "BRG-SET-002", description: "Bearing Set (2x 6205-ZZ ceramic)", revision: "A", level: 1, parent_id: "B2-001", quantity: 1, unit: "set", unit_cost: 125.00, make_buy: "buy", lead_time_days: 14, supplier: "SKF Distribution", category: "component", critical: true, alternates: ["BRG-SET-001"] },
  { item_id: "B2-007", part_number: "GSK-SET-002", description: "Gasket Set (PTFE)", revision: "A", level: 1, parent_id: "B2-001", quantity: 1, unit: "set", unit_cost: 38.00, make_buy: "buy", lead_time_days: 7, supplier: "GasketPro Inc", category: "consumable", critical: false, alternates: [] },
  { item_id: "B2-008", part_number: "FAS-KIT-001", description: "Fastener Kit (bolts, nuts, washers)", revision: "A", level: 1, parent_id: "B2-001", quantity: 1, unit: "kit", unit_cost: 18.75, make_buy: "buy", lead_time_days: 3, supplier: "BoltMax Supply", category: "fastener", critical: false, alternates: [] },
];

const BOM_CONFIGURATIONS: BOMConfiguration[] = [
  {
    config_id: "CFG-PUMP-STD", config_name: "Standard Pump", base_product: "ASSY-PUMP-001",
    options: [
      { option_group: "Housing Material", selected: "Cast Iron FC250", alternatives: ["Cast Iron FC300", "Duplex SS"], cost_delta: 0 },
      { option_group: "Seal Type", selected: "Single Mechanical", alternatives: ["Double Mechanical", "Packed Gland"], cost_delta: 0 },
      { option_group: "Bearing Type", selected: "Standard 2RS", alternatives: ["Ceramic Hybrid ZZ"], cost_delta: 0 },
      { option_group: "Impeller", selected: "3-vane Standard", alternatives: ["5-vane High-Eff"], cost_delta: 0 },
    ],
    total_cost: 797.75, total_lead_time: 45,
  },
  {
    config_id: "CFG-PUMP-HPC", config_name: "High-Performance Corrosion", base_product: "ASSY-PUMP-002",
    options: [
      { option_group: "Housing Material", selected: "Duplex SS", alternatives: ["Cast Iron FC250", "Cast Iron FC300"], cost_delta: 135 },
      { option_group: "Seal Type", selected: "Double Mechanical", alternatives: ["Single Mechanical", "Packed Gland"], cost_delta: 66.5 },
      { option_group: "Bearing Type", selected: "Ceramic Hybrid ZZ", alternatives: ["Standard 2RS"], cost_delta: 80 },
      { option_group: "Impeller", selected: "5-vane High-Eff", alternatives: ["3-vane Standard"], cost_delta: 70 },
    ],
    total_cost: 1164.75, total_lead_time: 50,
  },
  {
    config_id: "CFG-PUMP-ECO", config_name: "Economy Pump", base_product: "ASSY-PUMP-001",
    options: [
      { option_group: "Housing Material", selected: "Cast Iron FC250", alternatives: ["Cast Iron FC300", "Duplex SS"], cost_delta: 0 },
      { option_group: "Seal Type", selected: "Packed Gland", alternatives: ["Single Mechanical", "Double Mechanical"], cost_delta: -54.5 },
      { option_group: "Bearing Type", selected: "Standard 2RS", alternatives: ["Ceramic Hybrid ZZ"], cost_delta: 0 },
      { option_group: "Impeller", selected: "3-vane Standard", alternatives: ["5-vane High-Eff"], cost_delta: 0 },
    ],
    total_cost: 743.25, total_lead_time: 40,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBOMTree(database: BOMItem[]): BOMItem[] {
  return database;
}

function getChildItems(database: BOMItem[], parentId: string): BOMItem[] {
  return database.filter((i) => i.parent_id === parentId);
}

function rollupCost(database: BOMItem[], itemId: string): number {
  const item = database.find((i) => i.item_id === itemId);
  if (!item) return 0;
  const children = getChildItems(database, itemId);
  if (children.length === 0) return item.unit_cost * item.quantity;
  const childCost = children.reduce((sum, c) => sum + rollupCost(database, c.item_id), 0);
  return (item.unit_cost + childCost) * item.quantity;
}

function findWhereUsed(partNumber: string): Array<{ database_name: string; parents: BOMItem[] }> {
  const results: Array<{ database_name: string; parents: BOMItem[] }> = [];
  for (const [name, db] of [["ASSY-PUMP-001", BOM_DATABASE], ["ASSY-PUMP-002", BOM_DATABASE_V2]] as const) {
    const item = db.find((i) => i.part_number === partNumber);
    if (item && item.parent_id) {
      const parent = db.find((i) => i.item_id === item.parent_id);
      if (parent) results.push({ database_name: name, parents: [parent] });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function bomStructure(params: Record<string, unknown>): unknown {
  const product = (params.product as string) || "ASSY-PUMP-001";
  const db = product.includes("002") ? BOM_DATABASE_V2 : BOM_DATABASE;
  const tree = getBOMTree(db);
  const rootId = tree[0]?.item_id;

  // Build hierarchical view
  const hierarchy = tree.map((item) => {
    const indent = "  ".repeat(item.level);
    const children = getChildItems(db, item.item_id);
    const subtreeCost = rollupCost(db, item.item_id);

    return {
      level: item.level,
      indent_display: `${indent}${item.part_number}`,
      part_number: item.part_number,
      description: item.description,
      revision: item.revision,
      quantity: item.quantity,
      unit: item.unit,
      unit_cost: item.unit_cost,
      rollup_cost: Math.round(subtreeCost * 100) / 100,
      make_buy: item.make_buy,
      lead_time_days: item.lead_time_days,
      supplier: item.supplier,
      category: item.category,
      critical: item.critical,
      children_count: children.length,
      alternates: item.alternates,
    };
  });

  // Summary statistics
  const totalParts = tree.length;
  const makeItems = tree.filter((i) => i.make_buy === "make").length;
  const buyItems = tree.filter((i) => i.make_buy === "buy").length;
  const totalCost = rootId ? rollupCost(db, rootId) : 0;
  const criticalItems = tree.filter((i) => i.critical).length;
  const maxDepth = Math.max(...tree.map((i) => i.level));
  const categories: Record<string, number> = {};
  for (const i of tree) {
    categories[i.category] = (categories[i.category] || 0) + 1;
  }

  return {
    action: "bom_structure",
    product,
    bom: hierarchy,
    summary: {
      total_items: totalParts,
      make_items: makeItems,
      buy_items: buyItems,
      total_rollup_cost: Math.round(totalCost * 100) / 100,
      critical_items: criticalItems,
      max_bom_depth: maxDepth,
      category_breakdown: categories,
      unique_suppliers: [...new Set(tree.filter((i) => i.supplier).map((i) => i.supplier))].length,
    },
  };
}

function bomCompare(params: Record<string, unknown>): unknown {
  const bomA = (params.bom_a as string) || "ASSY-PUMP-001";
  const bomB = (params.bom_b as string) || "ASSY-PUMP-002";

  const dbA = bomA.includes("002") ? BOM_DATABASE_V2 : BOM_DATABASE;
  const dbB = bomB.includes("002") ? BOM_DATABASE_V2 : BOM_DATABASE;

  const partsA = new Map(dbA.map((i) => [i.part_number, i]));
  const partsB = new Map(dbB.map((i) => [i.part_number, i]));

  const added: BOMItem[] = [];
  const removed: BOMItem[] = [];
  const changed: Array<{ part: string; field: string; from: unknown; to: unknown }> = [];
  const unchanged: string[] = [];

  // Find removed (in A, not in B)
  for (const [pn, item] of partsA) {
    if (!partsB.has(pn)) removed.push(item);
  }

  // Find added (in B, not in A)
  for (const [pn, item] of partsB) {
    if (!partsA.has(pn)) added.push(item);
  }

  // Find changed (in both, but different)
  for (const [pn, itemA] of partsA) {
    const itemB = partsB.get(pn);
    if (!itemB) continue;
    const diffs: Array<{ field: string; from: unknown; to: unknown }> = [];
    if (itemA.revision !== itemB.revision) diffs.push({ field: "revision", from: itemA.revision, to: itemB.revision });
    if (itemA.unit_cost !== itemB.unit_cost) diffs.push({ field: "unit_cost", from: itemA.unit_cost, to: itemB.unit_cost });
    if (itemA.quantity !== itemB.quantity) diffs.push({ field: "quantity", from: itemA.quantity, to: itemB.quantity });
    if (itemA.supplier !== itemB.supplier) diffs.push({ field: "supplier", from: itemA.supplier, to: itemB.supplier });
    if (diffs.length > 0) {
      for (const d of diffs) changed.push({ part: pn, ...d });
    } else {
      unchanged.push(pn);
    }
  }

  const costA = rollupCost(dbA, dbA[0]?.item_id);
  const costB = rollupCost(dbB, dbB[0]?.item_id);

  return {
    action: "bom_compare",
    bom_a: bomA,
    bom_b: bomB,
    added: added.map((i) => ({ part_number: i.part_number, description: i.description, cost: i.unit_cost })),
    removed: removed.map((i) => ({ part_number: i.part_number, description: i.description, cost: i.unit_cost })),
    changed,
    unchanged_count: unchanged.length,
    cost_comparison: {
      bom_a_cost: Math.round(costA * 100) / 100,
      bom_b_cost: Math.round(costB * 100) / 100,
      cost_delta: Math.round((costB - costA) * 100) / 100,
      percent_change: Math.round(((costB - costA) / costA) * 10000) / 100,
    },
    summary: {
      total_differences: added.length + removed.length + changed.length,
      added_count: added.length,
      removed_count: removed.length,
      changed_count: changed.length,
      commonality_percent: Math.round((unchanged.length / Math.max(partsA.size, partsB.size)) * 100),
    },
  };
}

function bomWhereUsed(params: Record<string, unknown>): unknown {
  const partNumber = (params.part_number as string) || (params.partNumber as string) || "SFT-2001";

  // Search across all BOMs
  const allBOMs = [
    { name: "ASSY-PUMP-001", db: BOM_DATABASE },
    { name: "ASSY-PUMP-002", db: BOM_DATABASE_V2 },
  ];

  const usages: Array<{
    assembly: string;
    parent_part: string;
    parent_description: string;
    quantity_per: number;
    bom_level: number;
  }> = [];

  for (const { name, db } of allBOMs) {
    const items = db.filter((i) => i.part_number === partNumber);
    for (const item of items) {
      if (item.parent_id) {
        const parent = db.find((i) => i.item_id === item.parent_id);
        if (parent) {
          usages.push({
            assembly: name,
            parent_part: parent.part_number,
            parent_description: parent.description,
            quantity_per: item.quantity,
            bom_level: item.level,
          });
        }
      }
    }
  }

  // Find all top-level assemblies that ultimately contain this part
  const topAssemblies = [...new Set(usages.map((u) => u.assembly))];

  // Cross-reference with inventory/demand
  const totalDemand = usages.reduce((s, u) => s + u.quantity_per, 0);

  return {
    action: "bom_whereused",
    part_number: partNumber,
    usages,
    summary: {
      total_usages: usages.length,
      assemblies_containing: topAssemblies,
      total_quantity_demand: totalDemand,
      is_common_part: usages.length > 1,
      max_bom_level: usages.length > 0 ? Math.max(...usages.map((u) => u.bom_level)) : 0,
    },
    recommendation: usages.length > 2
      ? "High commonality part — consider safety stock and dual-sourcing"
      : usages.length > 0
        ? "Standard usage — maintain normal inventory levels"
        : "No usage found — verify part number or check if obsolete",
  };
}

function bomConfigure(params: Record<string, unknown>): unknown {
  const configId = (params.config_id as string) || (params.configId as string) || "";

  if (configId) {
    const config = BOM_CONFIGURATIONS.find((c) => c.config_id === configId);
    if (!config) {
      return { action: "bom_configure", error: `Configuration ${configId} not found`, available: BOM_CONFIGURATIONS.map((c) => c.config_id) };
    }
    return {
      action: "bom_configure",
      configuration: config,
      option_analysis: config.options.map((o) => ({
        group: o.option_group,
        selected: o.selected,
        alternatives: o.alternatives,
        cost_impact: o.cost_delta,
        could_save: o.alternatives.length > 0 ? Math.min(0, o.cost_delta) : 0,
      })),
    };
  }

  // Compare all configurations
  const configs = BOM_CONFIGURATIONS.map((c) => ({
    config_id: c.config_id,
    config_name: c.config_name,
    base_product: c.base_product,
    total_cost: c.total_cost,
    total_lead_time: c.total_lead_time,
    options: c.options.map((o) => ({ group: o.option_group, selected: o.selected })),
  }));

  const minCost = Math.min(...configs.map((c) => c.total_cost));
  const maxCost = Math.max(...configs.map((c) => c.total_cost));

  return {
    action: "bom_configure",
    configurations: configs,
    comparison: {
      config_count: configs.length,
      cost_range: { min: minCost, max: maxCost, spread: Math.round((maxCost - minCost) * 100) / 100 },
      lead_time_range: {
        min: Math.min(...configs.map((c) => c.total_lead_time)),
        max: Math.max(...configs.map((c) => c.total_lead_time)),
      },
      lowest_cost: configs.find((c) => c.total_cost === minCost)?.config_id,
      fastest_delivery: configs.reduce((a, b) => a.total_lead_time < b.total_lead_time ? a : b).config_id,
    },
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export function executeBOMAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "bom_structure":
      return bomStructure(params);
    case "bom_compare":
      return bomCompare(params);
    case "bom_whereused":
      return bomWhereUsed(params);
    case "bom_configure":
      return bomConfigure(params);
    default:
      return { error: `Unknown BOM action: ${action}` };
  }
}
