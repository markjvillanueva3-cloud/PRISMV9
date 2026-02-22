/**
 * R10-Rev4 — Anonymous Learning Network (Federated Learning Engine)
 *
 * Privacy-preserving shared learning across shops. Correction factors
 * flow between nodes without exposing proprietary data. Implements
 * federated aggregation, anonymization protocol, and network effects.
 *
 * Dispatcher actions:
 *   learn_contribute, learn_query, learn_aggregate, learn_anonymize,
 *   learn_network_stats, learn_opt_control, learn_correction,
 *   learn_transparency, learn_history, learn_get
 */

// ─── Types ───────────────────────────────────────────────────────────────────

type MaterialClass = "P" | "M" | "K" | "N" | "S" | "H";
type MachineClass = "VMC" | "HMC" | "lathe" | "5-axis" | "mill-turn";
type ToolClass = "solid_carbide" | "insert" | "cermet" | "ceramic" | "PCD" | "CBN";
type OperationClass = "roughing" | "finishing" | "pocket" | "contour" | "hole" | "threading" | "facing";
type StrategyName = "trochoidal" | "conventional" | "HSM" | "adaptive" | "plunge" | "peel";

interface CorrectionFactor {
  id: string;
  material_class: MaterialClass;
  machine_class: MachineClass;
  tool_class: ToolClass;
  operation: OperationClass;
  strategy: StrategyName;
  hardness_range: [number, number];
  diameter_range_mm: [number, number];
  // Performance deltas (predicted vs actual)
  vc_correction: number;       // multiplier, e.g. 0.76 means 24% reduction
  fz_correction: number;       // multiplier
  tool_life_factor: number;    // >1 means longer than predicted
  ra_factor: number;           // >1 means rougher than predicted
  cycle_time_factor: number;   // <1 means faster than predicted
  // Metadata
  confidence: number;          // 0-1
  sample_count: number;
  contributing_nodes: number;
  last_updated: string;
}

interface Contribution {
  id: string;
  shop_id: string;  // anonymized
  timestamp: string;
  material_class: MaterialClass;
  hardness_hrc: number;
  machine_class: MachineClass;
  power_kw: number;
  tool_class: ToolClass;
  diameter_mm: number;
  operation: OperationClass;
  strategy: StrategyName;
  // Performance deltas
  vc_predicted: number;
  vc_actual: number;
  tool_life_predicted_min: number;
  tool_life_actual_min: number;
  ra_predicted_um: number;
  ra_actual_um: number;
  cycle_time_predicted_min: number;
  cycle_time_actual_min: number;
  // Anonymization status
  anonymized: boolean;
  privacy_score: number;  // 0-1, 1=fully anonymous
}

interface AnonymizationReport {
  original_fields: number;
  redacted_fields: string[];
  generalized_fields: string[];
  privacy_score: number;
  safe_to_share: boolean;
  warnings: string[];
}

interface NetworkStats {
  total_contributions: number;
  total_nodes: number;
  active_nodes: number;
  correction_factors: number;
  material_coverage: Record<MaterialClass, number>;
  machine_coverage: Record<MachineClass, number>;
  avg_confidence: number;
  network_age_days: number;
}

interface OptControl {
  shop_id: string;
  opted_in: boolean;
  categories: OperationClass[];
  share_material: boolean;
  share_tool: boolean;
  share_strategy: boolean;
  transparency_log: TransparencyEntry[];
}

interface TransparencyEntry {
  timestamp: string;
  action: "contributed" | "received" | "deleted" | "opted_in" | "opted_out";
  data_summary: string;
}

// ─── State ───────────────────────────────────────────────────────────────────

const contributions: Contribution[] = [];
const correctionFactors: CorrectionFactor[] = [];
const optControls: Map<string, OptControl> = new Map();
const transparencyLogs: TransparencyEntry[] = [];
const queryHistory: Array<Record<string, unknown>> = [];
const resultStore: Map<string, Record<string, unknown>> = new Map();

let seeded = false;

// ─── Seed Data ───────────────────────────────────────────────────────────────

function seedNetwork(): void {
  if (seeded) return;
  seeded = true;

  // Simulated network correction factors from 500+ shops
  const seedFactors: Array<Omit<CorrectionFactor, "id" | "last_updated">> = [
    // Nickel superalloys — shops consistently find lower Vc optimal
    {
      material_class: "S", machine_class: "5-axis", tool_class: "solid_carbide",
      operation: "pocket", strategy: "trochoidal",
      hardness_range: [36, 44], diameter_range_mm: [8, 16],
      vc_correction: 0.76, fz_correction: 0.95, tool_life_factor: 1.35,
      ra_factor: 0.92, cycle_time_factor: 1.08,
      confidence: 0.89, sample_count: 1247, contributing_nodes: 87,
    },
    {
      material_class: "S", machine_class: "VMC", tool_class: "solid_carbide",
      operation: "contour", strategy: "conventional",
      hardness_range: [30, 40], diameter_range_mm: [6, 12],
      vc_correction: 0.82, fz_correction: 0.90, tool_life_factor: 1.18,
      ra_factor: 1.05, cycle_time_factor: 1.12,
      confidence: 0.78, sample_count: 623, contributing_nodes: 42,
    },
    // Titanium — moderate corrections
    {
      material_class: "S", machine_class: "5-axis", tool_class: "solid_carbide",
      operation: "roughing", strategy: "adaptive",
      hardness_range: [30, 36], diameter_range_mm: [10, 20],
      vc_correction: 0.88, fz_correction: 1.05, tool_life_factor: 1.22,
      ra_factor: 0.98, cycle_time_factor: 0.95,
      confidence: 0.84, sample_count: 956, contributing_nodes: 65,
    },
    // Aluminum — handbooks are close, small corrections
    {
      material_class: "N", machine_class: "VMC", tool_class: "solid_carbide",
      operation: "pocket", strategy: "HSM",
      hardness_range: [0, 30], diameter_range_mm: [6, 25],
      vc_correction: 1.08, fz_correction: 1.12, tool_life_factor: 1.05,
      ra_factor: 0.88, cycle_time_factor: 0.82,
      confidence: 0.92, sample_count: 3412, contributing_nodes: 245,
    },
    {
      material_class: "N", machine_class: "HMC", tool_class: "solid_carbide",
      operation: "roughing", strategy: "adaptive",
      hardness_range: [0, 30], diameter_range_mm: [12, 32],
      vc_correction: 1.15, fz_correction: 1.08, tool_life_factor: 1.02,
      ra_factor: 0.95, cycle_time_factor: 0.78,
      confidence: 0.91, sample_count: 2801, contributing_nodes: 198,
    },
    // Alloy steels — good coverage
    {
      material_class: "P", machine_class: "VMC", tool_class: "insert",
      operation: "facing", strategy: "conventional",
      hardness_range: [28, 35], diameter_range_mm: [50, 100],
      vc_correction: 0.93, fz_correction: 1.02, tool_life_factor: 1.15,
      ra_factor: 0.97, cycle_time_factor: 1.03,
      confidence: 0.87, sample_count: 1890, contributing_nodes: 134,
    },
    {
      material_class: "P", machine_class: "lathe", tool_class: "insert",
      operation: "finishing", strategy: "conventional",
      hardness_range: [25, 40], diameter_range_mm: [20, 80],
      vc_correction: 1.05, fz_correction: 0.92, tool_life_factor: 1.08,
      ra_factor: 0.85, cycle_time_factor: 0.96,
      confidence: 0.90, sample_count: 2156, contributing_nodes: 157,
    },
    // Stainless steels
    {
      material_class: "M", machine_class: "VMC", tool_class: "solid_carbide",
      operation: "pocket", strategy: "trochoidal",
      hardness_range: [20, 32], diameter_range_mm: [6, 16],
      vc_correction: 0.85, fz_correction: 0.98, tool_life_factor: 1.28,
      ra_factor: 0.94, cycle_time_factor: 1.05,
      confidence: 0.86, sample_count: 1534, contributing_nodes: 108,
    },
    // Cast iron
    {
      material_class: "K", machine_class: "HMC", tool_class: "insert",
      operation: "roughing", strategy: "conventional",
      hardness_range: [15, 30], diameter_range_mm: [40, 80],
      vc_correction: 1.02, fz_correction: 1.06, tool_life_factor: 1.10,
      ra_factor: 0.98, cycle_time_factor: 0.92,
      confidence: 0.88, sample_count: 1678, contributing_nodes: 112,
    },
    // Hard materials
    {
      material_class: "H", machine_class: "5-axis", tool_class: "CBN",
      operation: "finishing", strategy: "conventional",
      hardness_range: [55, 65], diameter_range_mm: [3, 10],
      vc_correction: 0.90, fz_correction: 0.88, tool_life_factor: 1.42,
      ra_factor: 0.82, cycle_time_factor: 1.10,
      confidence: 0.75, sample_count: 389, contributing_nodes: 28,
    },
  ];

  for (let i = 0; i < seedFactors.length; i++) {
    correctionFactors.push({
      ...seedFactors[i],
      id: `CF-${String(i + 1).padStart(3, "0")}`,
      last_updated: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
    });
  }

  // Seed opt-in controls for simulated shops
  for (let i = 1; i <= 5; i++) {
    const shopId = `SHOP-${String(i).padStart(4, "0")}`;
    optControls.set(shopId, {
      shop_id: shopId,
      opted_in: true,
      categories: ["roughing", "finishing", "pocket"] as OperationClass[],
      share_material: true,
      share_tool: true,
      share_strategy: true,
      transparency_log: [],
    });
  }
}

// ─── Anonymization ───────────────────────────────────────────────────────────

function anonymizeContribution(raw: Record<string, unknown>): { anonymized: Record<string, unknown>; report: AnonymizationReport } {
  const redacted: string[] = [];
  const generalized: string[] = [];
  const warnings: string[] = [];
  const result: Record<string, unknown> = {};

  // Fields that are NEVER shared
  const neverShare = ["shop_name", "shop_location", "customer", "part_number", "price",
    "batch_size", "serial_number", "operator", "order_number", "revenue"];
  let originalFields = 0;

  for (const [key, val] of Object.entries(raw)) {
    originalFields++;
    if (neverShare.includes(key)) {
      redacted.push(key);
      continue;
    }
    // Generalize specific values to classes
    if (key === "machine_model" || key === "machine_serial") {
      redacted.push(key);
      continue;
    }
    if (key === "exact_vc" || key === "exact_fz") {
      // Convert exact params to relative corrections only
      generalized.push(key);
      continue;
    }
    result[key] = val;
  }

  // Ensure required class fields are present
  const requiredClasses = ["material_class", "machine_class", "tool_class", "operation"];
  for (const rc of requiredClasses) {
    if (!result[rc]) {
      warnings.push(`Missing required field: ${rc}`);
    }
  }

  const privacyScore = redacted.length > 0 ? Math.min((redacted.length + generalized.length) / originalFields + 0.5, 1.0) : 0.5;
  const safeToShare = redacted.length >= neverShare.filter(f => raw[f] !== undefined).length && warnings.length === 0;

  return {
    anonymized: result,
    report: {
      original_fields: originalFields,
      redacted_fields: redacted,
      generalized_fields: generalized,
      privacy_score: Math.round(privacyScore * 100) / 100,
      safe_to_share: safeToShare,
      warnings,
    },
  };
}

// ─── Contribution ────────────────────────────────────────────────────────────

function contribute(shopId: string, data: Record<string, unknown>): Record<string, unknown> {
  seedNetwork();

  // Check opt-in
  const control = optControls.get(shopId);
  if (!control || !control.opted_in) {
    return { error: `Shop ${shopId} is not opted in`, suggestion: "Use learn_opt_control to opt in" };
  }

  // Anonymize
  const { anonymized, report } = anonymizeContribution(data);
  if (!report.safe_to_share) {
    return { error: "Data failed anonymization check", report, suggestion: "Remove proprietary fields" };
  }

  const materialClass = (data.material_class ?? anonymized.material_class ?? "P") as MaterialClass;
  const machineClass = (data.machine_class ?? "VMC") as MachineClass;
  const toolClass = (data.tool_class ?? "solid_carbide") as ToolClass;
  const operation = (data.operation ?? "roughing") as OperationClass;
  const strategy = (data.strategy ?? "conventional") as StrategyName;

  const contribution: Contribution = {
    id: `CTR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    shop_id: shopId,
    timestamp: new Date().toISOString(),
    material_class: materialClass,
    hardness_hrc: (data.hardness_hrc as number) ?? 30,
    machine_class: machineClass,
    power_kw: (data.power_kw as number) ?? 15,
    tool_class: toolClass,
    diameter_mm: (data.diameter_mm as number) ?? 12,
    operation,
    strategy,
    vc_predicted: (data.vc_predicted as number) ?? 100,
    vc_actual: (data.vc_actual as number) ?? 85,
    tool_life_predicted_min: (data.tool_life_predicted_min as number) ?? 45,
    tool_life_actual_min: (data.tool_life_actual_min as number) ?? 52,
    ra_predicted_um: (data.ra_predicted_um as number) ?? 1.6,
    ra_actual_um: (data.ra_actual_um as number) ?? 1.4,
    cycle_time_predicted_min: (data.cycle_time_predicted_min as number) ?? 12,
    cycle_time_actual_min: (data.cycle_time_actual_min as number) ?? 11.5,
    anonymized: true,
    privacy_score: report.privacy_score,
  };

  contributions.push(contribution);

  // Log transparency
  const entry: TransparencyEntry = {
    timestamp: contribution.timestamp,
    action: "contributed",
    data_summary: `${materialClass}/${machineClass}/${toolClass}/${operation}/${strategy}`,
  };
  control.transparency_log.push(entry);
  transparencyLogs.push(entry);

  return {
    contribution_id: contribution.id,
    anonymization: report,
    status: "accepted",
    network_benefit: "Correction factors will be updated during next aggregation",
  };
}

// ─── Query Corrections ───────────────────────────────────────────────────────

function queryCorrections(params: Record<string, unknown>): Record<string, unknown> {
  seedNetwork();

  const materialClass = params.material_class as MaterialClass | undefined;
  const machineClass = params.machine_class as MachineClass | undefined;
  const toolClass = params.tool_class as ToolClass | undefined;
  const operation = params.operation as OperationClass | undefined;
  const strategy = params.strategy as StrategyName | undefined;
  const hardness = params.hardness_hrc as number | undefined;

  let matches = [...correctionFactors];

  if (materialClass) matches = matches.filter(f => f.material_class === materialClass);
  if (machineClass) matches = matches.filter(f => f.machine_class === machineClass);
  if (toolClass) matches = matches.filter(f => f.tool_class === toolClass);
  if (operation) matches = matches.filter(f => f.operation === operation);
  if (strategy) matches = matches.filter(f => f.strategy === strategy);
  if (hardness !== undefined) {
    matches = matches.filter(f => hardness >= f.hardness_range[0] && hardness <= f.hardness_range[1]);
  }

  // Sort by confidence desc
  matches.sort((a, b) => b.confidence - a.confidence);

  const queryId = `QRY-${Date.now()}`;
  const result: Record<string, unknown> = {
    query_id: queryId,
    filters: { material_class: materialClass, machine_class: machineClass, tool_class: toolClass, operation, strategy, hardness_hrc: hardness },
    corrections: matches.map(f => ({
      id: f.id,
      vc_correction: f.vc_correction,
      fz_correction: f.fz_correction,
      tool_life_factor: f.tool_life_factor,
      ra_factor: f.ra_factor,
      cycle_time_factor: f.cycle_time_factor,
      confidence: f.confidence,
      sample_count: f.sample_count,
      contributing_nodes: f.contributing_nodes,
      material_class: f.material_class,
      machine_class: f.machine_class,
      tool_class: f.tool_class,
      operation: f.operation,
      strategy: f.strategy,
    })),
    total: matches.length,
    recommendation: matches.length > 0
      ? `Apply Vc correction of ${matches[0].vc_correction}x (confidence ${(matches[0].confidence * 100).toFixed(0)}%, ${matches[0].sample_count} samples)`
      : "No matching correction factors. Consider contributing data to the network.",
  };

  queryHistory.push(result);
  resultStore.set(queryId, result);

  // Log transparency
  transparencyLogs.push({
    timestamp: new Date().toISOString(),
    action: "received",
    data_summary: `Queried ${matches.length} corrections for ${materialClass ?? "any"}/${operation ?? "any"}`,
  });

  return result;
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

function aggregateContributions(): Record<string, unknown> {
  seedNetwork();

  if (contributions.length === 0) {
    return {
      status: "no_new_contributions",
      correction_factors_updated: 0,
      new_factors_created: 0,
    };
  }

  // Group contributions by key
  const groups = new Map<string, Contribution[]>();
  for (const c of contributions) {
    const key = `${c.material_class}|${c.machine_class}|${c.tool_class}|${c.operation}|${c.strategy}`;
    const group = groups.get(key) ?? [];
    group.push(c);
    groups.set(key, group);
  }

  let updated = 0;
  let created = 0;

  for (const [key, group] of groups) {
    const [mat, mach, tool, op, strat] = key.split("|");
    const existing = correctionFactors.find(f =>
      f.material_class === mat && f.machine_class === mach &&
      f.tool_class === tool && f.operation === op && f.strategy === strat
    );

    // Calculate average corrections from contributions
    const avgVc = group.reduce((s, c) => s + c.vc_actual / c.vc_predicted, 0) / group.length;
    const avgToolLife = group.reduce((s, c) => s + c.tool_life_actual_min / c.tool_life_predicted_min, 0) / group.length;
    const avgRa = group.reduce((s, c) => s + c.ra_actual_um / c.ra_predicted_um, 0) / group.length;
    const avgCycle = group.reduce((s, c) => s + c.cycle_time_actual_min / c.cycle_time_predicted_min, 0) / group.length;
    const avgFz = group.reduce((s, c) => s + 1, 0) / group.length; // default to 1
    const uniqueShops = new Set(group.map(c => c.shop_id)).size;

    if (existing) {
      // Weighted average: 70% existing, 30% new data
      const w = 0.7;
      existing.vc_correction = Math.round((existing.vc_correction * w + avgVc * (1 - w)) * 100) / 100;
      existing.tool_life_factor = Math.round((existing.tool_life_factor * w + avgToolLife * (1 - w)) * 100) / 100;
      existing.ra_factor = Math.round((existing.ra_factor * w + avgRa * (1 - w)) * 100) / 100;
      existing.cycle_time_factor = Math.round((existing.cycle_time_factor * w + avgCycle * (1 - w)) * 100) / 100;
      existing.sample_count += group.length;
      existing.contributing_nodes += uniqueShops;
      existing.confidence = Math.min(existing.confidence + 0.01 * group.length, 0.99);
      existing.last_updated = new Date().toISOString();
      updated++;
    } else {
      // Create new correction factor
      const hardnessValues = group.map(c => c.hardness_hrc);
      const diamValues = group.map(c => c.diameter_mm);
      correctionFactors.push({
        id: `CF-${String(correctionFactors.length + 1).padStart(3, "0")}`,
        material_class: mat as MaterialClass,
        machine_class: mach as MachineClass,
        tool_class: tool as ToolClass,
        operation: op as OperationClass,
        strategy: strat as StrategyName,
        hardness_range: [Math.min(...hardnessValues), Math.max(...hardnessValues)],
        diameter_range_mm: [Math.min(...diamValues), Math.max(...diamValues)],
        vc_correction: Math.round(avgVc * 100) / 100,
        fz_correction: Math.round(avgFz * 100) / 100,
        tool_life_factor: Math.round(avgToolLife * 100) / 100,
        ra_factor: Math.round(avgRa * 100) / 100,
        cycle_time_factor: Math.round(avgCycle * 100) / 100,
        confidence: Math.min(0.5 + 0.05 * group.length, 0.90),
        sample_count: group.length,
        contributing_nodes: uniqueShops,
        last_updated: new Date().toISOString(),
      });
      created++;
    }
  }

  return {
    status: "aggregation_complete",
    contributions_processed: contributions.length,
    correction_factors_updated: updated,
    new_factors_created: created,
    total_correction_factors: correctionFactors.length,
  };
}

// ─── Opt Control ─────────────────────────────────────────────────────────────

function manageOptControl(shopId: string, action: string, categories?: OperationClass[]): Record<string, unknown> {
  seedNetwork();

  if (action === "opt_in") {
    const existing = optControls.get(shopId);
    if (existing) {
      existing.opted_in = true;
      if (categories) existing.categories = categories;
      existing.transparency_log.push({ timestamp: new Date().toISOString(), action: "opted_in", data_summary: `Categories: ${(categories ?? existing.categories).join(", ")}` });
      return { shop_id: shopId, status: "opted_in", categories: existing.categories };
    }
    const newControl: OptControl = {
      shop_id: shopId,
      opted_in: true,
      categories: categories ?? ["roughing", "finishing", "pocket"],
      share_material: true,
      share_tool: true,
      share_strategy: true,
      transparency_log: [{ timestamp: new Date().toISOString(), action: "opted_in", data_summary: `New enrollment. Categories: ${(categories ?? ["roughing", "finishing", "pocket"]).join(", ")}` }],
    };
    optControls.set(shopId, newControl);
    return { shop_id: shopId, status: "opted_in", categories: newControl.categories };
  }

  if (action === "opt_out") {
    const existing = optControls.get(shopId);
    if (existing) {
      existing.opted_in = false;
      existing.transparency_log.push({ timestamp: new Date().toISOString(), action: "opted_out", data_summary: "Opted out of network" });
      return { shop_id: shopId, status: "opted_out" };
    }
    return { shop_id: shopId, status: "not_found", message: "Shop was not enrolled" };
  }

  if (action === "status") {
    const existing = optControls.get(shopId);
    if (!existing) return { shop_id: shopId, status: "not_enrolled" };
    return {
      shop_id: shopId,
      opted_in: existing.opted_in,
      categories: existing.categories,
      share_material: existing.share_material,
      share_tool: existing.share_tool,
      share_strategy: existing.share_strategy,
      total_contributions: contributions.filter(c => c.shop_id === shopId).length,
      transparency_entries: existing.transparency_log.length,
    };
  }

  if (action === "delete") {
    // Remove all contributions from this shop
    const shopContribs = contributions.filter(c => c.shop_id === shopId);
    for (let i = contributions.length - 1; i >= 0; i--) {
      if (contributions[i].shop_id === shopId) contributions.splice(i, 1);
    }
    optControls.delete(shopId);
    transparencyLogs.push({ timestamp: new Date().toISOString(), action: "deleted" as any, data_summary: `Shop ${shopId} deleted ${shopContribs.length} contributions` });
    return { shop_id: shopId, status: "deleted", contributions_removed: shopContribs.length };
  }

  return { error: `Unknown action: ${action}`, valid_actions: ["opt_in", "opt_out", "status", "delete"] };
}

// ─── Network Stats ───────────────────────────────────────────────────────────

function getNetworkStats(): NetworkStats {
  seedNetwork();

  const materialCoverage: Record<MaterialClass, number> = { P: 0, M: 0, K: 0, N: 0, S: 0, H: 0 };
  const machineCoverage: Record<MachineClass, number> = { VMC: 0, HMC: 0, lathe: 0, "5-axis": 0, "mill-turn": 0 };

  for (const f of correctionFactors) {
    materialCoverage[f.material_class]++;
    machineCoverage[f.machine_class]++;
  }

  const activeNodes = new Set<string>();
  for (const c of contributions) activeNodes.add(c.shop_id);
  for (const [id, ctrl] of optControls) { if (ctrl.opted_in) activeNodes.add(id); }

  return {
    total_contributions: contributions.length,
    total_nodes: optControls.size,
    active_nodes: activeNodes.size,
    correction_factors: correctionFactors.length,
    material_coverage: materialCoverage,
    machine_coverage: machineCoverage,
    avg_confidence: correctionFactors.length > 0
      ? Math.round(correctionFactors.reduce((s, f) => s + f.confidence, 0) / correctionFactors.length * 100) / 100
      : 0,
    network_age_days: 365,
  };
}

// ─── Transparency Log ────────────────────────────────────────────────────────

function getTransparencyLog(shopId?: string): Record<string, unknown> {
  seedNetwork();

  if (shopId) {
    const control = optControls.get(shopId);
    if (!control) return { shop_id: shopId, entries: [], total: 0 };
    return {
      shop_id: shopId,
      entries: control.transparency_log,
      total: control.transparency_log.length,
    };
  }

  return {
    entries: transparencyLogs.slice(-50),
    total: transparencyLogs.length,
  };
}

// ─── Single Correction Lookup ────────────────────────────────────────────────

function getCorrectionFactor(id: string): Record<string, unknown> {
  seedNetwork();
  const factor = correctionFactors.find(f => f.id === id);
  if (!factor) return { error: `Correction factor ${id} not found` };
  return factor as unknown as Record<string, unknown>;
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export function federatedLearning(action: string, params: Record<string, unknown> = {}): Record<string, unknown> {
  switch (action) {
    case "learn_contribute": {
      const shopId = (params.shop_id as string) ?? "";
      if (!shopId) return { error: "shop_id parameter required" };
      return contribute(shopId, params);
    }

    case "learn_query": {
      return queryCorrections(params);
    }

    case "learn_aggregate": {
      return aggregateContributions();
    }

    case "learn_anonymize": {
      const data = (params.data as Record<string, unknown>) ?? params;
      const { anonymized, report } = anonymizeContribution(data);
      return { anonymized, report };
    }

    case "learn_network_stats": {
      const stats = getNetworkStats();
      return stats as unknown as Record<string, unknown>;
    }

    case "learn_opt_control": {
      const shopId = (params.shop_id as string) ?? "";
      if (!shopId) return { error: "shop_id parameter required" };
      const controlAction = (params.action as string) ?? "status";
      const categories = params.categories as OperationClass[] | undefined;
      return manageOptControl(shopId, controlAction, categories);
    }

    case "learn_correction": {
      const id = (params.id as string) ?? "";
      if (!id) return { error: "id parameter required" };
      return getCorrectionFactor(id);
    }

    case "learn_transparency": {
      const shopId = params.shop_id as string | undefined;
      return getTransparencyLog(shopId);
    }

    case "learn_history": {
      return {
        queries: queryHistory.slice(-20),
        total_queries: queryHistory.length,
        total_contributions: contributions.length,
      };
    }

    case "learn_get": {
      const id = (params.id as string) ?? (params.query_id as string) ?? "";
      if (!id) return { error: "id or query_id parameter required" };
      const stored = resultStore.get(id);
      if (!stored) return { error: `Result ${id} not found` };
      return stored;
    }

    default:
      return { error: `Unknown action: ${action}`, valid_actions: [
        "learn_contribute", "learn_query", "learn_aggregate", "learn_anonymize",
        "learn_network_stats", "learn_opt_control", "learn_correction",
        "learn_transparency", "learn_history", "learn_get",
      ]};
  }
}

// ─── Type exports ────────────────────────────────────────────────────────────

export type {
  MaterialClass as FedMaterialClass,
  MachineClass as FedMachineClass,
  ToolClass as FedToolClass,
  OperationClass as FedOperationClass,
  StrategyName as FedStrategyName,
  CorrectionFactor,
  Contribution,
  AnonymizationReport,
  NetworkStats,
  OptControl,
  TransparencyEntry,
};
