/**
 * KittingEngine — R28-MS2
 *
 * Kit assembly for production work orders: kit BOM resolution, shortage
 * analysis, staging area management, and kit status tracking.
 *
 * Actions:
 *   kit_assemble — Resolve kit BOM and check material availability
 *   kit_shortage — Analyze shortages across pending kits
 *   kit_stage    — Manage staging area assignments and sequencing
 *   kit_track    — Track kit assembly progress and delivery status
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KitDefinition {
  kit_id: string;
  work_order: string;
  product: string;
  quantity: number;
  priority: "critical" | "high" | "standard" | "low";
  required_date: string;
  status: "pending" | "picking" | "partial" | "complete" | "staged" | "delivered";
  components: KitComponent[];
  staging_location: string | null;
  assigned_picker: string | null;
}

interface KitComponent {
  part_number: string;
  description: string;
  quantity_per: number;
  quantity_total: number;
  quantity_picked: number;
  location_id: string;
  lot_number: string | null;
  status: "available" | "picked" | "short" | "on_order" | "substituted";
}

interface StagingArea {
  staging_id: string;
  name: string;
  capacity_kits: number;
  current_kits: number;
  zone: string;
  assigned_line: string;
  kits_staged: string[];
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const KIT_DATABASE: KitDefinition[] = [
  {
    kit_id: "KIT-2024-001", work_order: "WO-2024-301", product: "ASSY-PUMP-001", quantity: 3, priority: "critical", required_date: "2024-11-05", status: "picking",
    staging_location: null, assigned_picker: "T. Rodriguez",
    components: [
      { part_number: "MAT-AL7075-BAR", description: "7075-T6 Aluminum Bar", quantity_per: 2, quantity_total: 6, quantity_picked: 4, location_id: "A-01-01-A", lot_number: "LOT-2024-1001", status: "available" },
      { part_number: "SEAL-KIT-001", description: "Mechanical Seal Kit", quantity_per: 1, quantity_total: 3, quantity_picked: 3, location_id: "B-01-01-A", lot_number: "LOT-2024-1030", status: "picked" },
      { part_number: "BRG-SET-001", description: "Bearing Set", quantity_per: 1, quantity_total: 3, quantity_picked: 3, location_id: "B-01-01-B", lot_number: "LOT-2024-1035", status: "picked" },
      { part_number: "GSK-SET-001", description: "Gasket Set", quantity_per: 1, quantity_total: 3, quantity_picked: 0, location_id: "B-01-02-A", lot_number: null, status: "available" },
      { part_number: "FAS-KIT-001", description: "Fastener Kit", quantity_per: 1, quantity_total: 3, quantity_picked: 2, location_id: "B-02-01-A", lot_number: "LOT-2024-1045", status: "available" },
      { part_number: "MAT-CAST-FC250", description: "FC250 Cast Iron Blank", quantity_per: 1, quantity_total: 3, quantity_picked: 3, location_id: "A-02-01-A", lot_number: "LOT-2024-1022", status: "picked" },
    ],
  },
  {
    kit_id: "KIT-2024-002", work_order: "WO-2024-302", product: "ASSY-PUMP-001", quantity: 5, priority: "high", required_date: "2024-11-10", status: "pending",
    staging_location: null, assigned_picker: null,
    components: [
      { part_number: "MAT-SS316-RND", description: "316 Stainless Round Bar", quantity_per: 1, quantity_total: 5, quantity_picked: 0, location_id: "A-01-01-B", lot_number: null, status: "available" },
      { part_number: "SEAL-KIT-001", description: "Mechanical Seal Kit", quantity_per: 1, quantity_total: 5, quantity_picked: 0, location_id: "B-01-01-A", lot_number: null, status: "available" },
      { part_number: "BRG-SET-001", description: "Bearing Set", quantity_per: 1, quantity_total: 5, quantity_picked: 0, location_id: "B-01-01-B", lot_number: null, status: "available" },
      { part_number: "GSK-SET-001", description: "Gasket Set", quantity_per: 1, quantity_total: 5, quantity_picked: 0, location_id: "B-01-02-A", lot_number: null, status: "available" },
      { part_number: "FAS-KIT-001", description: "Fastener Kit", quantity_per: 1, quantity_total: 5, quantity_picked: 0, location_id: "B-02-01-A", lot_number: null, status: "available" },
      { part_number: "MAT-CAST-FC250", description: "FC250 Cast Iron Blank", quantity_per: 1, quantity_total: 5, quantity_picked: 0, location_id: "A-02-01-A", lot_number: null, status: "short" },
    ],
  },
  {
    kit_id: "KIT-2024-003", work_order: "WO-2024-303", product: "ASSY-PUMP-002", quantity: 2, priority: "standard", required_date: "2024-11-15", status: "partial",
    staging_location: null, assigned_picker: "M. Santos",
    components: [
      { part_number: "MAT-4140-RND", description: "4140 Steel Round Bar", quantity_per: 1, quantity_total: 2, quantity_picked: 2, location_id: "A-01-02-A", lot_number: "LOT-2024-0988", status: "picked" },
      { part_number: "SEAL-KIT-002", description: "Double Mechanical Seal", quantity_per: 1, quantity_total: 2, quantity_picked: 0, location_id: "B-01-01-A", lot_number: null, status: "on_order" },
      { part_number: "BRG-SET-002", description: "Ceramic Bearing Set", quantity_per: 1, quantity_total: 2, quantity_picked: 0, location_id: "B-01-01-B", lot_number: null, status: "on_order" },
      { part_number: "GSK-SET-002", description: "PTFE Gasket Set", quantity_per: 1, quantity_total: 2, quantity_picked: 2, location_id: "B-01-02-A", lot_number: "LOT-2024-1040", status: "picked" },
      { part_number: "FAS-KIT-001", description: "Fastener Kit", quantity_per: 1, quantity_total: 2, quantity_picked: 2, location_id: "B-02-01-A", lot_number: "LOT-2024-1045", status: "picked" },
    ],
  },
  {
    kit_id: "KIT-2024-004", work_order: "WO-2024-304", product: "ASSY-PUMP-001", quantity: 1, priority: "low", required_date: "2024-11-20", status: "complete",
    staging_location: "STG-01", assigned_picker: "T. Rodriguez",
    components: [
      { part_number: "MAT-AL7075-BAR", description: "7075-T6 Aluminum Bar", quantity_per: 2, quantity_total: 2, quantity_picked: 2, location_id: "A-01-01-A", lot_number: "LOT-2024-1001", status: "picked" },
      { part_number: "SEAL-KIT-001", description: "Mechanical Seal Kit", quantity_per: 1, quantity_total: 1, quantity_picked: 1, location_id: "B-01-01-A", lot_number: "LOT-2024-1030", status: "picked" },
      { part_number: "BRG-SET-001", description: "Bearing Set", quantity_per: 1, quantity_total: 1, quantity_picked: 1, location_id: "B-01-01-B", lot_number: "LOT-2024-1035", status: "picked" },
      { part_number: "GSK-SET-001", description: "Gasket Set", quantity_per: 1, quantity_total: 1, quantity_picked: 1, location_id: "B-01-02-A", lot_number: "LOT-2024-1040", status: "picked" },
      { part_number: "FAS-KIT-001", description: "Fastener Kit", quantity_per: 1, quantity_total: 1, quantity_picked: 1, location_id: "B-02-01-A", lot_number: "LOT-2024-1045", status: "picked" },
      { part_number: "MAT-CAST-FC250", description: "FC250 Cast Iron Blank", quantity_per: 1, quantity_total: 1, quantity_picked: 1, location_id: "A-02-01-A", lot_number: "LOT-2024-1022", status: "picked" },
    ],
  },
];

const STAGING_AREAS: StagingArea[] = [
  { staging_id: "STG-01", name: "Staging Area 1 — CNC Cell", capacity_kits: 6, current_kits: 1, zone: "STAGING", assigned_line: "CNC-CELL-A", kits_staged: ["KIT-2024-004"] },
  { staging_id: "STG-02", name: "Staging Area 2 — Assembly Line", capacity_kits: 4, current_kits: 0, zone: "STAGING", assigned_line: "ASSY-LINE-1", kits_staged: [] },
  { staging_id: "STG-03", name: "Staging Area 3 — Turning Center", capacity_kits: 3, current_kits: 0, zone: "STAGING", assigned_line: "TURN-CELL-B", kits_staged: [] },
];

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function kitAssemble(params: Record<string, unknown>): unknown {
  const kitId = (params.kit_id as string) || (params.kitId as string) || "";
  const workOrder = (params.work_order as string) || (params.workOrder as string) || "";

  let kits = KIT_DATABASE;
  if (kitId) kits = kits.filter((k) => k.kit_id === kitId);
  else if (workOrder) kits = kits.filter((k) => k.work_order === workOrder);

  const kitSummaries = kits.map((k) => {
    const totalComponents = k.components.length;
    const pickedComponents = k.components.filter((c) => c.status === "picked").length;
    const shortComponents = k.components.filter((c) => c.status === "short" || c.status === "on_order");
    const completionPct = Math.round((k.components.reduce((s, c) => s + c.quantity_picked, 0) / k.components.reduce((s, c) => s + c.quantity_total, 0)) * 100);
    const daysToRequired = Math.round((new Date(k.required_date).getTime() - new Date("2024-11-01").getTime()) / 86400000);

    return {
      kit_id: k.kit_id,
      work_order: k.work_order,
      product: k.product,
      quantity: k.quantity,
      priority: k.priority,
      status: k.status,
      required_date: k.required_date,
      days_to_required: daysToRequired,
      picker: k.assigned_picker,
      completion_pct: completionPct,
      components: k.components.map((c) => ({
        part_number: c.part_number,
        description: c.description,
        needed: c.quantity_total,
        picked: c.quantity_picked,
        remaining: c.quantity_total - c.quantity_picked,
        location: c.location_id,
        status: c.status,
      })),
      shortages: shortComponents.map((c) => ({
        part_number: c.part_number,
        quantity_short: c.quantity_total - c.quantity_picked,
        status: c.status,
      })),
      component_summary: { total: totalComponents, picked: pickedComponents, short: shortComponents.length },
    };
  });

  return {
    action: "kit_assemble",
    total_kits: kitSummaries.length,
    kits: kitSummaries,
    summary: {
      complete: kitSummaries.filter((k) => k.completion_pct === 100).length,
      in_progress: kitSummaries.filter((k) => k.completion_pct > 0 && k.completion_pct < 100).length,
      not_started: kitSummaries.filter((k) => k.completion_pct === 0).length,
      with_shortages: kitSummaries.filter((k) => k.shortages.length > 0).length,
      avg_completion: Math.round(kitSummaries.reduce((s, k) => s + k.completion_pct, 0) / Math.max(kitSummaries.length, 1)),
    },
  };
}

function kitShortage(params: Record<string, unknown>): unknown {
  // Aggregate shortages across all pending kits
  const shortageMap: Record<string, { part_number: string; description: string; total_short: number; kits_affected: string[]; on_order: boolean }> = {};

  for (const kit of KIT_DATABASE.filter((k) => k.status !== "complete" && k.status !== "delivered")) {
    for (const comp of kit.components.filter((c) => c.status === "short" || c.status === "on_order")) {
      const short = comp.quantity_total - comp.quantity_picked;
      if (short <= 0) continue;
      if (!shortageMap[comp.part_number]) {
        shortageMap[comp.part_number] = { part_number: comp.part_number, description: comp.description, total_short: 0, kits_affected: [], on_order: false };
      }
      shortageMap[comp.part_number].total_short += short;
      shortageMap[comp.part_number].kits_affected.push(kit.kit_id);
      if (comp.status === "on_order") shortageMap[comp.part_number].on_order = true;
    }
  }

  const shortages = Object.values(shortageMap).sort((a, b) => b.total_short - a.total_short);

  // Impact analysis
  const criticalKitsAffected = KIT_DATABASE.filter((k) =>
    k.priority === "critical" && k.components.some((c) => c.status === "short" || c.status === "on_order")
  );

  return {
    action: "kit_shortage",
    total_shortages: shortages.length,
    shortages: shortages.map((s) => ({
      ...s,
      kits_affected_count: s.kits_affected.length,
      urgency: s.kits_affected.length > 2 ? "HIGH" : s.kits_affected.length > 1 ? "MEDIUM" : "LOW",
    })),
    impact: {
      critical_kits_at_risk: criticalKitsAffected.length,
      total_kits_affected: [...new Set(shortages.flatMap((s) => s.kits_affected))].length,
      parts_on_order: shortages.filter((s) => s.on_order).length,
      parts_not_ordered: shortages.filter((s) => !s.on_order).length,
    },
    recommendation: shortages.filter((s) => !s.on_order).length > 0
      ? "EXPEDITE: Some shortage items have no purchase order — contact procurement immediately"
      : shortages.length > 0
        ? "MONITOR: All shortage items are on order — track delivery dates"
        : "ALL CLEAR: No shortages detected across pending kits",
  };
}

function kitStage(params: Record<string, unknown>): unknown {
  const kitId = (params.kit_id as string) || (params.kitId as string) || "";

  const stagingSummary = STAGING_AREAS.map((s) => ({
    staging_id: s.staging_id,
    name: s.name,
    assigned_line: s.assigned_line,
    capacity: s.capacity_kits,
    current: s.current_kits,
    available: s.capacity_kits - s.current_kits,
    utilization_pct: Math.round((s.current_kits / s.capacity_kits) * 100),
    kits_staged: s.kits_staged,
  }));

  // Find kits ready for staging (complete but not staged)
  const readyForStaging = KIT_DATABASE.filter((k) => k.status === "complete" && !k.staging_location);

  // Staging recommendations
  const recommendations = readyForStaging.map((k) => {
    const bestArea = STAGING_AREAS
      .filter((s) => s.current_kits < s.capacity_kits)
      .sort((a, b) => (a.current_kits / a.capacity_kits) - (b.current_kits / b.capacity_kits))[0];

    return {
      kit_id: k.kit_id,
      work_order: k.work_order,
      priority: k.priority,
      recommended_staging: bestArea?.staging_id || "NONE_AVAILABLE",
      staging_name: bestArea?.name || "No capacity",
    };
  });

  return {
    action: "kit_stage",
    staging_areas: stagingSummary,
    ready_for_staging: readyForStaging.length,
    recommendations,
    summary: {
      total_areas: STAGING_AREAS.length,
      total_capacity: STAGING_AREAS.reduce((s, a) => s + a.capacity_kits, 0),
      total_occupied: STAGING_AREAS.reduce((s, a) => s + a.current_kits, 0),
      available_slots: STAGING_AREAS.reduce((s, a) => s + (a.capacity_kits - a.current_kits), 0),
      overall_utilization: Math.round((STAGING_AREAS.reduce((s, a) => s + a.current_kits, 0) / STAGING_AREAS.reduce((s, a) => s + a.capacity_kits, 0)) * 100),
    },
  };
}

function kitTrack(params: Record<string, unknown>): unknown {
  const status = (params.status as string) || "all";
  const priority = (params.priority as string) || "";

  let kits = KIT_DATABASE;
  if (status !== "all") kits = kits.filter((k) => k.status === status);
  if (priority) kits = kits.filter((k) => k.priority === priority);

  const tracking = kits.map((k) => {
    const completionPct = Math.round((k.components.reduce((s, c) => s + c.quantity_picked, 0) / k.components.reduce((s, c) => s + c.quantity_total, 0)) * 100);
    const daysToRequired = Math.round((new Date(k.required_date).getTime() - new Date("2024-11-01").getTime()) / 86400000);
    const atRisk = daysToRequired < 3 && completionPct < 100;

    return {
      kit_id: k.kit_id,
      work_order: k.work_order,
      product: k.product,
      quantity: k.quantity,
      priority: k.priority,
      status: k.status,
      completion_pct: completionPct,
      required_date: k.required_date,
      days_to_required: daysToRequired,
      staging_location: k.staging_location,
      picker: k.assigned_picker,
      at_risk: atRisk,
      shortages: k.components.filter((c) => c.status === "short" || c.status === "on_order").length,
    };
  });

  // Status distribution
  const statusDist: Record<string, number> = {};
  for (const k of tracking) statusDist[k.status] = (statusDist[k.status] || 0) + 1;

  return {
    action: "kit_track",
    total_kits: tracking.length,
    kits: tracking,
    status_distribution: statusDist,
    summary: {
      at_risk: tracking.filter((k) => k.at_risk).length,
      on_time: tracking.filter((k) => !k.at_risk && k.days_to_required >= 0).length,
      overdue: tracking.filter((k) => k.days_to_required < 0 && k.completion_pct < 100).length,
      avg_completion: Math.round(tracking.reduce((s, k) => s + k.completion_pct, 0) / Math.max(tracking.length, 1)),
      kits_with_shortages: tracking.filter((k) => k.shortages > 0).length,
    },
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export function executeKittingAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "kit_assemble":
      return kitAssemble(params);
    case "kit_shortage":
      return kitShortage(params);
    case "kit_stage":
      return kitStage(params);
    case "kit_track":
      return kitTrack(params);
    default:
      return { error: `Unknown kitting action: ${action}` };
  }
}
