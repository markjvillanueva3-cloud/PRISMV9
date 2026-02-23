/**
 * TraceabilityEngine — R22-MS1
 *
 * Provides full part lifecycle traceability: recording process events,
 * building part genealogy trees, tracing process chains, and generating
 * audit trails for quality/compliance.
 *
 * Actions:
 *   tr_record      — Record a process event in the digital thread
 *   tr_genealogy   — Build/query part genealogy tree
 *   tr_chain       — Trace the full process chain for a part
 *   tr_audit_trail — Generate audit trail report
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProcessEvent {
  event_id?: string;
  part_id: string;
  operation: string;
  machine_id?: string;
  operator_id?: string;
  timestamp?: string;
  parameters?: Record<string, unknown>;
  measurements?: Record<string, number>;
  material_lot?: string;
  tool_id?: string;
  status?: string;
  notes?: string;
}

interface GenealogyInput {
  part_id: string;
  include_materials?: boolean;
  include_tools?: boolean;
  depth?: number;
}

interface ChainInput {
  part_id: string;
  from_operation?: string;
  to_operation?: string;
  include_parameters?: boolean;
  include_measurements?: boolean;
}

interface AuditTrailInput {
  part_id?: string;
  machine_id?: string;
  date_from?: string;
  date_to?: string;
  operation_filter?: string[];
  include_deviations?: boolean;
  format?: string;
}

// ---------------------------------------------------------------------------
// Seeded data — simulated digital thread store
// ---------------------------------------------------------------------------

interface StoredEvent {
  event_id: string;
  part_id: string;
  operation: string;
  machine_id: string;
  operator_id: string;
  timestamp: string;
  parameters: Record<string, unknown>;
  measurements: Record<string, number>;
  material_lot: string;
  tool_id: string;
  status: string;
  notes: string;
  duration_minutes: number;
}

function generateSeedEvents(partId: string): StoredEvent[] {
  const hash = partId.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const seed = Math.abs(hash) % 1000;

  const operations = [
    { op: "raw_material_receipt", machine: "receiving_dock", duration: 5 },
    { op: "material_inspection", machine: "cmm_01", duration: 15 },
    { op: "rough_turning", machine: "cnc_lathe_01", duration: 25 },
    { op: "finish_turning", machine: "cnc_lathe_01", duration: 35 },
    { op: "milling_features", machine: "cnc_5axis_01", duration: 45 },
    { op: "deburring", machine: "manual_bench_01", duration: 10 },
    { op: "heat_treatment", machine: "furnace_01", duration: 120 },
    { op: "grinding", machine: "cnc_grinder_01", duration: 30 },
    { op: "final_inspection", machine: "cmm_02", duration: 20 },
    { op: "surface_treatment", machine: "plating_line_01", duration: 60 },
    { op: "final_qa", machine: "qa_station_01", duration: 15 },
    { op: "packaging", machine: "pack_station_01", duration: 5 },
  ];

  const baseDate = new Date("2026-02-20T06:00:00Z");
  let cumMinutes = 0;

  return operations.map((opDef, idx) => {
    cumMinutes += opDef.duration + (seed + idx * 7) % 15;
    const ts = new Date(baseDate.getTime() + cumMinutes * 60000);

    const deviation = ((seed + idx * 13) % 100) / 10000;
    const nominal = 25.0 + (idx * 0.1);

    return {
      event_id: `EVT-${partId}-${String(idx + 1).padStart(3, "0")}`,
      part_id: partId,
      operation: opDef.op,
      machine_id: opDef.machine,
      operator_id: `OP-${100 + ((seed + idx) % 20)}`,
      timestamp: ts.toISOString(),
      parameters: {
        cutting_speed_m_min: opDef.op.includes("turn") || opDef.op.includes("mill") || opDef.op.includes("grind")
          ? 80 + (seed + idx * 3) % 120
          : undefined,
        feed_mm_rev: opDef.op.includes("turn") || opDef.op.includes("grind")
          ? 0.05 + ((seed + idx) % 30) / 100
          : undefined,
        depth_of_cut_mm: opDef.op.includes("turn") || opDef.op.includes("mill")
          ? 0.5 + ((seed + idx * 5) % 30) / 10
          : undefined,
        temperature_c: opDef.op === "heat_treatment" ? 820 + (seed % 60) : undefined,
        duration_minutes: opDef.duration,
      },
      measurements: opDef.op.includes("inspection") || opDef.op === "final_qa"
        ? {
            diameter_mm: nominal + deviation,
            roundness_mm: 0.002 + ((seed + idx) % 5) / 10000,
            surface_roughness_um: 0.4 + ((seed + idx * 2) % 20) / 10,
            length_mm: 50.0 + deviation * 2,
          }
        : {},
      material_lot: `LOT-${2026}-${String((seed % 50) + 1).padStart(3, "0")}`,
      tool_id: opDef.op.includes("turn") || opDef.op.includes("mill") || opDef.op.includes("grind")
        ? `TOOL-${String((seed + idx * 11) % 200 + 1).padStart(4, "0")}`
        : "N/A",
      status: ((seed + idx) % 50) === 0 ? "deviation" : "pass",
      notes: ((seed + idx) % 50) === 0 ? "Minor deviation noted — within tolerance after review" : "",
      duration_minutes: opDef.duration,
    };
  });
}

// In-memory event store (capped at 10K events)
const eventStore: StoredEvent[] = [];
const MAX_EVENTS = 10000;

// ---------------------------------------------------------------------------
// tr_record — Record a process event
// ---------------------------------------------------------------------------

function recordEvent(input: ProcessEvent) {
  const eventId = input.event_id ?? `EVT-${input.part_id}-${Date.now().toString(36)}`;
  const stored: StoredEvent = {
    event_id: eventId,
    part_id: input.part_id,
    operation: input.operation,
    machine_id: input.machine_id ?? "unknown",
    operator_id: input.operator_id ?? "unknown",
    timestamp: input.timestamp ?? new Date().toISOString(),
    parameters: (input.parameters ?? {}) as Record<string, unknown>,
    measurements: (input.measurements ?? {}) as Record<string, number>,
    material_lot: input.material_lot ?? "unknown",
    tool_id: input.tool_id ?? "N/A",
    status: input.status ?? "pass",
    notes: input.notes ?? "",
    duration_minutes: 0,
  };

  eventStore.push(stored);
  if (eventStore.length > MAX_EVENTS) eventStore.splice(0, eventStore.length - MAX_EVENTS);

  return {
    event_id: eventId,
    part_id: input.part_id,
    operation: input.operation,
    recorded_at: stored.timestamp,
    status: "recorded",
    total_events_stored: eventStore.length,
  };
}

// ---------------------------------------------------------------------------
// tr_genealogy — Part genealogy tree
// ---------------------------------------------------------------------------

function buildGenealogy(input: GenealogyInput) {
  const { part_id, include_materials = true, include_tools = true, depth = 3 } = input;

  const events = generateSeedEvents(part_id);

  // Build genealogy: materials → operations → outputs
  const materialLots = [...new Set(events.map((e) => e.material_lot))];
  const toolsUsed = include_tools
    ? [...new Set(events.filter((e) => e.tool_id !== "N/A").map((e) => e.tool_id))]
    : [];
  const machinesUsed = [...new Set(events.map((e) => e.machine_id))];
  const operatorsInvolved = [...new Set(events.map((e) => e.operator_id))];

  // Operation sequence
  const operationSequence = events.map((e) => ({
    step: events.indexOf(e) + 1,
    operation: e.operation,
    machine_id: e.machine_id,
    tool_id: e.tool_id,
    timestamp: e.timestamp,
    status: e.status,
  }));

  // Bill of process
  const billOfProcess = {
    total_operations: events.length,
    total_duration_minutes: events.reduce((s, e) => s + e.duration_minutes, 0),
    value_adding_operations: events.filter(
      (e) => !["material_inspection", "final_inspection", "final_qa", "packaging"].includes(e.operation)
    ).length,
    inspection_operations: events.filter(
      (e) => e.operation.includes("inspection") || e.operation === "final_qa"
    ).length,
  };

  // Quality summary from inspection events
  const inspections = events.filter((e) => Object.keys(e.measurements).length > 0);
  const deviations = events.filter((e) => e.status === "deviation");

  return {
    part_id,
    genealogy_depth: depth,
    created_at: new Date().toISOString(),
    inputs: {
      material_lots: include_materials ? materialLots : undefined,
      tools_used: include_tools ? toolsUsed : undefined,
      machines_used: machinesUsed,
      operators_involved: operatorsInvolved,
    },
    bill_of_process: billOfProcess,
    operation_sequence: operationSequence,
    quality_summary: {
      total_inspections: inspections.length,
      deviations: deviations.length,
      deviation_operations: deviations.map((d) => d.operation),
      pass_rate: events.length > 0
        ? Math.round(((events.length - deviations.length) / events.length) * 10000) / 10000
        : 1,
    },
  };
}

// ---------------------------------------------------------------------------
// tr_chain — Process chain trace
// ---------------------------------------------------------------------------

function traceChain(input: ChainInput) {
  const {
    part_id,
    from_operation,
    to_operation,
    include_parameters = true,
    include_measurements = true,
  } = input;

  let events = generateSeedEvents(part_id);

  // Filter by operation range
  if (from_operation) {
    const fromIdx = events.findIndex((e) => e.operation === from_operation);
    if (fromIdx >= 0) events = events.slice(fromIdx);
  }
  if (to_operation) {
    const toIdx = events.findIndex((e) => e.operation === to_operation);
    if (toIdx >= 0) events = events.slice(0, toIdx + 1);
  }

  // Build chain links
  const chain = events.map((e, idx) => {
    const link: Record<string, unknown> = {
      step: idx + 1,
      event_id: e.event_id,
      operation: e.operation,
      machine_id: e.machine_id,
      operator_id: e.operator_id,
      timestamp: e.timestamp,
      duration_minutes: e.duration_minutes,
      status: e.status,
    };

    if (include_parameters && Object.keys(e.parameters).length > 0) {
      // Filter out undefined values
      const params: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(e.parameters)) {
        if (v !== undefined) params[k] = v;
      }
      if (Object.keys(params).length > 0) link.parameters = params;
    }

    if (include_measurements && Object.keys(e.measurements).length > 0) {
      link.measurements = e.measurements;
    }

    if (e.tool_id !== "N/A") link.tool_id = e.tool_id;
    if (e.notes) link.notes = e.notes;

    return link;
  });

  // Calculate chain metrics
  const totalDuration = events.reduce((s, e) => s + e.duration_minutes, 0);
  const firstTs = events[0]?.timestamp;
  const lastTs = events[events.length - 1]?.timestamp;
  const leadTime = firstTs && lastTs
    ? Math.round((new Date(lastTs).getTime() - new Date(firstTs).getTime()) / 60000)
    : 0;
  const waitTime = leadTime - totalDuration;

  return {
    part_id,
    from_operation: from_operation ?? events[0]?.operation ?? null,
    to_operation: to_operation ?? events[events.length - 1]?.operation ?? null,
    total_steps: chain.length,
    chain,
    metrics: {
      total_processing_minutes: totalDuration,
      lead_time_minutes: leadTime,
      wait_time_minutes: Math.max(0, waitTime),
      process_efficiency: leadTime > 0 ? Math.round((totalDuration / leadTime) * 10000) / 10000 : 1,
    },
  };
}

// ---------------------------------------------------------------------------
// tr_audit_trail — Audit trail report
// ---------------------------------------------------------------------------

function generateAuditTrail(input: AuditTrailInput) {
  const {
    part_id,
    machine_id,
    date_from,
    date_to,
    operation_filter,
    include_deviations = true,
    format = "structured",
  } = input;

  // Gather events — use seed data for specified parts or recent events
  let events: StoredEvent[];
  if (part_id) {
    events = generateSeedEvents(part_id);
  } else {
    // Generate events for a default fleet of 5 parts
    events = [];
    for (const pid of ["PART-001", "PART-002", "PART-003", "PART-004", "PART-005"]) {
      events.push(...generateSeedEvents(pid));
    }
  }

  // Apply filters
  if (machine_id) events = events.filter((e) => e.machine_id === machine_id);
  if (date_from) events = events.filter((e) => e.timestamp >= date_from);
  if (date_to) events = events.filter((e) => e.timestamp <= date_to);
  if (operation_filter && operation_filter.length > 0)
    events = events.filter((e) => operation_filter.includes(e.operation));

  // Compute audit summary
  const partIds = [...new Set(events.map((e) => e.part_id))];
  const machineIds = [...new Set(events.map((e) => e.machine_id))];
  const operatorIds = [...new Set(events.map((e) => e.operator_id))];
  const deviations = events.filter((e) => e.status === "deviation");
  const inspections = events.filter((e) => Object.keys(e.measurements).length > 0);

  // Deviation details
  const deviationDetails = include_deviations
    ? deviations.map((d) => ({
        event_id: d.event_id,
        part_id: d.part_id,
        operation: d.operation,
        machine_id: d.machine_id,
        timestamp: d.timestamp,
        notes: d.notes,
      }))
    : undefined;

  // Compliance summary
  const complianceScore = events.length > 0
    ? Math.round(((events.length - deviations.length) / events.length) * 10000) / 10000
    : 1;

  let complianceRating: string;
  if (complianceScore >= 0.995) complianceRating = "excellent";
  else if (complianceScore >= 0.98) complianceRating = "good";
  else if (complianceScore >= 0.95) complianceRating = "acceptable";
  else complianceRating = "needs_improvement";

  return {
    audit_type: part_id ? "part_audit" : "fleet_audit",
    generated_at: new Date().toISOString(),
    filters: {
      part_id: part_id ?? "all",
      machine_id: machine_id ?? "all",
      date_from: date_from ?? "unset",
      date_to: date_to ?? "unset",
      operation_filter: operation_filter ?? "all",
    },
    summary: {
      total_events: events.length,
      parts_covered: partIds.length,
      machines_involved: machineIds.length,
      operators_involved: operatorIds.length,
      inspections_performed: inspections.length,
      deviations_found: deviations.length,
      compliance_score: complianceScore,
      compliance_rating: complianceRating,
    },
    deviations: deviationDetails,
    timeline: format === "structured"
      ? events.slice(0, 50).map((e) => ({
          event_id: e.event_id,
          part_id: e.part_id,
          operation: e.operation,
          machine_id: e.machine_id,
          timestamp: e.timestamp,
          status: e.status,
        }))
      : undefined,
    recommendations: [
      ...(deviations.length > 0
        ? [`Investigate ${deviations.length} deviation(s) — root cause analysis recommended`]
        : []),
      ...(complianceScore < 0.98
        ? ["Compliance score below 98% — review process controls"]
        : []),
      ...(inspections.length < events.length * 0.15
        ? ["Inspection rate below 15% — consider additional quality gates"]
        : []),
    ],
  };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function executeTraceabilityAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case "tr_record":
      return recordEvent(params as unknown as ProcessEvent);
    case "tr_genealogy":
      return buildGenealogy(params as unknown as GenealogyInput);
    case "tr_chain":
      return traceChain(params as unknown as ChainInput);
    case "tr_audit_trail":
      return generateAuditTrail(params as unknown as AuditTrailInput);
    default:
      throw new Error(`TraceabilityEngine: unknown action "${action}"`);
  }
}
