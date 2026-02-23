/**
 * YardManagementEngine — R28-MS4
 *
 * Yard and dock operations: dock door assignment, trailer tracking,
 * appointment scheduling, and yard movement optimization.
 *
 * Actions:
 *   yard_assign  — Assign dock doors to inbound/outbound trailers
 *   yard_trailer — Track trailer locations, dwell times, and contents
 *   yard_appoint — Manage carrier appointment scheduling and compliance
 *   yard_move    — Optimize yard moves (trailer repositioning, jockeying)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface YardSpot {
  spot_id: string;
  zone: "dock" | "staging" | "overflow" | "empty_trailer" | "hazmat";
  status: "available" | "occupied" | "reserved" | "maintenance";
  trailer_id: string | null;
  assigned_dock: string | null;
}

interface Trailer {
  trailer_id: string;
  type: "dry_van" | "flatbed" | "reefer" | "tanker";
  carrier: string;
  status: "in_transit" | "at_gate" | "yard_spot" | "at_dock" | "loading" | "unloading" | "sealed" | "departed";
  contents_summary: string;
  seal_number: string | null;
  arrival_time: string;
  current_location: string;
  destination_dock: string | null;
  dwell_hours: number;
  weight_kg: number;
  priority: "urgent" | "standard" | "low";
}

interface YardAppointment {
  appointment_id: string;
  type: "delivery" | "pickup" | "empty_return";
  carrier: string;
  scheduled_arrival: string;
  actual_arrival: string | null;
  status: "scheduled" | "checked_in" | "at_dock" | "completed" | "no_show" | "late";
  trailer_id: string;
  dock_door: string | null;
  po_or_so: string;
  notes: string;
}

interface YardMove {
  move_id: string;
  trailer_id: string;
  from_location: string;
  to_location: string;
  reason: "dock_assignment" | "dock_release" | "reposition" | "departure_prep" | "overflow_clear";
  status: "pending" | "in_progress" | "completed";
  assigned_driver: string | null;
  requested_time: string;
  completed_time: string | null;
  priority: "urgent" | "standard";
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const YARD_SPOTS: YardSpot[] = [
  { spot_id: "YS-01", zone: "dock", status: "occupied", trailer_id: "TRL-001", assigned_dock: "DOCK-R1" },
  { spot_id: "YS-02", zone: "dock", status: "available", trailer_id: null, assigned_dock: "DOCK-R2" },
  { spot_id: "YS-03", zone: "dock", status: "occupied", trailer_id: "TRL-003", assigned_dock: "DOCK-S1" },
  { spot_id: "YS-04", zone: "dock", status: "reserved", trailer_id: null, assigned_dock: "DOCK-S2" },
  { spot_id: "YS-05", zone: "dock", status: "maintenance", trailer_id: null, assigned_dock: "DOCK-D1" },
  { spot_id: "YS-06", zone: "staging", status: "occupied", trailer_id: "TRL-004", assigned_dock: null },
  { spot_id: "YS-07", zone: "staging", status: "occupied", trailer_id: "TRL-005", assigned_dock: null },
  { spot_id: "YS-08", zone: "staging", status: "available", trailer_id: null, assigned_dock: null },
  { spot_id: "YS-09", zone: "overflow", status: "available", trailer_id: null, assigned_dock: null },
  { spot_id: "YS-10", zone: "overflow", status: "available", trailer_id: null, assigned_dock: null },
  { spot_id: "YS-11", zone: "empty_trailer", status: "occupied", trailer_id: "TRL-006", assigned_dock: null },
  { spot_id: "YS-12", zone: "empty_trailer", status: "occupied", trailer_id: "TRL-007", assigned_dock: null },
  { spot_id: "YS-13", zone: "hazmat", status: "available", trailer_id: null, assigned_dock: null },
];

const TRAILERS: Trailer[] = [
  { trailer_id: "TRL-001", type: "dry_van", carrier: "FreightPro Logistics", status: "unloading", contents_summary: "Bronze tube, misc raw materials", seal_number: "SEAL-8874", arrival_time: "2024-10-28T07:30", current_location: "DOCK-R1", destination_dock: "DOCK-R1", dwell_hours: 4.5, weight_kg: 2200, priority: "standard" },
  { trailer_id: "TRL-002", type: "dry_van", carrier: "FedEx Freight", status: "in_transit", contents_summary: "Bearing sets, ceramic bearings", seal_number: "SEAL-4456", arrival_time: "", current_location: "EN_ROUTE", destination_dock: null, dwell_hours: 0, weight_kg: 800, priority: "standard" },
  { trailer_id: "TRL-003", type: "flatbed", carrier: "FreightPro Logistics", status: "loading", contents_summary: "2x Pump assemblies (SO-2024-0155)", seal_number: null, arrival_time: "2024-10-29T06:00", current_location: "DOCK-S1", destination_dock: "DOCK-S1", dwell_hours: 6.0, weight_kg: 450, priority: "urgent" },
  { trailer_id: "TRL-004", type: "dry_van", carrier: "UPS Freight", status: "yard_spot", contents_summary: "Awaiting dock assignment — pump assembly", seal_number: null, arrival_time: "2024-10-28T14:00", current_location: "YS-06", destination_dock: "DOCK-S2", dwell_hours: 10.0, weight_kg: 350, priority: "standard" },
  { trailer_id: "TRL-005", type: "reefer", carrier: "ChemTrans Inc", status: "sealed", contents_summary: "Temperature-controlled adhesives/sealants", seal_number: "SEAL-CT-112", arrival_time: "2024-10-27T10:00", current_location: "YS-07", destination_dock: null, dwell_hours: 38.0, weight_kg: 1500, priority: "low" },
  { trailer_id: "TRL-006", type: "dry_van", carrier: "XPO Logistics", status: "yard_spot", contents_summary: "Empty — pending pickup", seal_number: null, arrival_time: "2024-10-26T15:00", current_location: "YS-11", destination_dock: null, dwell_hours: 57.0, weight_kg: 0, priority: "low" },
  { trailer_id: "TRL-007", type: "flatbed", carrier: "Local Delivery", status: "yard_spot", contents_summary: "Empty — available for loading", seal_number: null, arrival_time: "2024-10-27T08:00", current_location: "YS-12", destination_dock: null, dwell_hours: 40.0, weight_kg: 0, priority: "low" },
];

const YARD_APPOINTMENTS: YardAppointment[] = [
  { appointment_id: "YAPT-001", type: "delivery", carrier: "FreightPro Logistics", scheduled_arrival: "2024-10-28T08:00", actual_arrival: "2024-10-28T07:30", status: "at_dock", trailer_id: "TRL-001", dock_door: "DOCK-R1", po_or_so: "PO-2024-5501", notes: "Bronze tube delivery" },
  { appointment_id: "YAPT-002", type: "pickup", carrier: "FreightPro Logistics", scheduled_arrival: "2024-10-29T14:00", actual_arrival: "2024-10-29T06:00", status: "at_dock", trailer_id: "TRL-003", dock_door: "DOCK-S1", po_or_so: "SO-2024-0155", notes: "Pump assembly shipment — 2 units" },
  { appointment_id: "YAPT-003", type: "delivery", carrier: "FedEx Freight", scheduled_arrival: "2024-11-02T09:00", actual_arrival: null, status: "scheduled", trailer_id: "TRL-002", dock_door: null, po_or_so: "PO-2024-5535", notes: "Bearing sets — inspection required" },
  { appointment_id: "YAPT-004", type: "pickup", carrier: "UPS Freight", scheduled_arrival: "2024-11-01T10:00", actual_arrival: null, status: "scheduled", trailer_id: "TRL-004", dock_door: "DOCK-S2", po_or_so: "SO-2024-0160", notes: "Upgraded pump for PetroFlow" },
  { appointment_id: "YAPT-005", type: "empty_return", carrier: "XPO Logistics", scheduled_arrival: "2024-10-29T16:00", actual_arrival: null, status: "late", trailer_id: "TRL-006", dock_door: null, po_or_so: "", notes: "Empty trailer pickup — overdue by 2 days" },
];

const YARD_MOVES: YardMove[] = [
  { move_id: "YM-001", trailer_id: "TRL-004", from_location: "YS-06", to_location: "DOCK-S2", reason: "dock_assignment", status: "pending", assigned_driver: "P. Nguyen", requested_time: "2024-11-01T09:30", completed_time: null, priority: "standard" },
  { move_id: "YM-002", trailer_id: "TRL-001", from_location: "DOCK-R1", to_location: "YS-09", reason: "dock_release", status: "pending", assigned_driver: null, requested_time: "2024-10-28T13:00", completed_time: null, priority: "standard" },
  { move_id: "YM-003", trailer_id: "TRL-005", from_location: "YS-07", to_location: "DOCK-R2", reason: "dock_assignment", status: "pending", assigned_driver: null, requested_time: "2024-10-29T08:00", completed_time: null, priority: "urgent" },
  { move_id: "YM-004", trailer_id: "TRL-006", from_location: "YS-11", to_location: "GATE", reason: "departure_prep", status: "pending", assigned_driver: null, requested_time: "2024-10-29T16:00", completed_time: null, priority: "low" },
];

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function yardAssign(params: Record<string, unknown>): unknown {
  const trailerId = (params.trailer_id as string) || (params.trailerId as string) || "";

  // Current dock assignments
  const dockAssignments = YARD_SPOTS.filter((s) => s.zone === "dock").map((s) => ({
    spot_id: s.spot_id,
    dock: s.assigned_dock,
    status: s.status,
    trailer: s.trailer_id,
    trailer_info: s.trailer_id ? TRAILERS.find((t) => t.trailer_id === s.trailer_id) : null,
  }));

  // Available docks for assignment
  const availableDocks = dockAssignments.filter((d) => d.status === "available" || d.status === "reserved");

  // Trailers waiting for dock
  const waitingTrailers = TRAILERS.filter((t) => t.status === "yard_spot" || t.status === "at_gate")
    .sort((a, b) => {
      const pWeight: Record<string, number> = { urgent: 0, standard: 1, low: 2 };
      return (pWeight[a.priority] || 1) - (pWeight[b.priority] || 1);
    });

  // Auto-assignment recommendations
  const recommendations = waitingTrailers.map((t) => {
    const bestDock = availableDocks[0];
    return {
      trailer_id: t.trailer_id,
      carrier: t.carrier,
      priority: t.priority,
      dwell_hours: t.dwell_hours,
      recommended_dock: bestDock?.dock || "NONE_AVAILABLE",
      reason: t.priority === "urgent" ? "Priority trailer — assign immediately" : `Waiting ${Math.round(t.dwell_hours)} hours`,
    };
  });

  return {
    action: "yard_assign",
    dock_assignments: dockAssignments.map((d) => ({
      dock: d.dock,
      status: d.status,
      trailer: d.trailer,
      carrier: d.trailer_info?.carrier || "N/A",
      contents: d.trailer_info?.contents_summary || "empty",
    })),
    available_docks: availableDocks.length,
    waiting_trailers: waitingTrailers.length,
    recommendations,
    summary: {
      total_docks: dockAssignments.length,
      occupied: dockAssignments.filter((d) => d.status === "occupied").length,
      available: availableDocks.length,
      maintenance: dockAssignments.filter((d) => d.status === "maintenance").length,
      trailers_waiting: waitingTrailers.length,
      avg_wait_hours: Math.round(waitingTrailers.reduce((s, t) => s + t.dwell_hours, 0) / Math.max(waitingTrailers.length, 1)),
    },
  };
}

function yardTrailer(params: Record<string, unknown>): unknown {
  const trailerId = (params.trailer_id as string) || (params.trailerId as string) || "";
  const status = (params.status as string) || "all";

  let trailers = TRAILERS;
  if (trailerId) trailers = trailers.filter((t) => t.trailer_id === trailerId);
  else if (status !== "all") trailers = trailers.filter((t) => t.status === status);

  const trailerSummary = trailers.map((t) => ({
    trailer_id: t.trailer_id,
    type: t.type,
    carrier: t.carrier,
    status: t.status,
    contents: t.contents_summary,
    seal: t.seal_number,
    location: t.current_location,
    destination_dock: t.destination_dock,
    dwell_hours: t.dwell_hours,
    weight_kg: t.weight_kg,
    priority: t.priority,
    excessive_dwell: t.dwell_hours > 24,
  }));

  // Dwell time analysis
  const avgDwell = Math.round(trailers.reduce((s, t) => s + t.dwell_hours, 0) / Math.max(trailers.length, 1));
  const excessiveDwell = trailers.filter((t) => t.dwell_hours > 24);

  // Status distribution
  const statusDist: Record<string, number> = {};
  for (const t of trailers) statusDist[t.status] = (statusDist[t.status] || 0) + 1;

  return {
    action: "yard_trailer",
    total_trailers: trailerSummary.length,
    trailers: trailerSummary,
    dwell_analysis: {
      avg_dwell_hours: avgDwell,
      max_dwell_hours: Math.max(...trailers.map((t) => t.dwell_hours), 0),
      excessive_dwell_count: excessiveDwell.length,
      excessive_trailers: excessiveDwell.map((t) => ({ id: t.trailer_id, carrier: t.carrier, hours: t.dwell_hours })),
    },
    summary: {
      status_distribution: statusDist,
      in_yard: trailers.filter((t) => ["yard_spot", "at_dock", "loading", "unloading", "sealed"].includes(t.status)).length,
      in_transit: trailers.filter((t) => t.status === "in_transit").length,
      empty: trailers.filter((t) => t.weight_kg === 0).length,
      loaded: trailers.filter((t) => t.weight_kg > 0).length,
    },
  };
}

function yardAppoint(params: Record<string, unknown>): unknown {
  const date = (params.date as string) || "2024-11-01";
  const status = (params.status as string) || "all";

  let appointments = YARD_APPOINTMENTS;
  if (status !== "all") appointments = appointments.filter((a) => a.status === status);

  const appointmentSummary = appointments.map((a) => {
    const onTime = a.actual_arrival
      ? Math.abs(new Date(a.actual_arrival).getTime() - new Date(a.scheduled_arrival).getTime()) < 30 * 60 * 1000
      : null;
    const varianceMinutes = a.actual_arrival
      ? Math.round((new Date(a.actual_arrival).getTime() - new Date(a.scheduled_arrival).getTime()) / 60000)
      : null;

    return {
      appointment_id: a.appointment_id,
      type: a.type,
      carrier: a.carrier,
      scheduled: a.scheduled_arrival,
      actual: a.actual_arrival || "pending",
      status: a.status,
      dock_door: a.dock_door,
      reference: a.po_or_so,
      on_time: onTime,
      variance_minutes: varianceMinutes,
      notes: a.notes,
    };
  });

  const completed = appointmentSummary.filter((a) => a.on_time !== null);
  const onTimeCount = completed.filter((a) => a.on_time).length;

  return {
    action: "yard_appoint",
    total_appointments: appointmentSummary.length,
    appointments: appointmentSummary,
    summary: {
      scheduled: appointmentSummary.filter((a) => a.status === "scheduled").length,
      active: appointmentSummary.filter((a) => ["checked_in", "at_dock"].includes(a.status)).length,
      completed: appointmentSummary.filter((a) => a.status === "completed").length,
      no_show: appointmentSummary.filter((a) => a.status === "no_show").length,
      late: appointmentSummary.filter((a) => a.status === "late").length,
      on_time_rate: completed.length > 0 ? Math.round((onTimeCount / completed.length) * 100) : 0,
    },
  };
}

function yardMove(params: Record<string, unknown>): unknown {
  const status = (params.status as string) || "all";
  const priority = (params.priority as string) || "";

  let moves = YARD_MOVES;
  if (status !== "all") moves = moves.filter((m) => m.status === status);
  if (priority) moves = moves.filter((m) => m.priority === priority);

  const moveSummary = moves.map((m) => {
    const trailer = TRAILERS.find((t) => t.trailer_id === m.trailer_id);
    return {
      move_id: m.move_id,
      trailer_id: m.trailer_id,
      carrier: trailer?.carrier || "N/A",
      from: m.from_location,
      to: m.to_location,
      reason: m.reason,
      status: m.status,
      priority: m.priority,
      driver: m.assigned_driver,
      requested: m.requested_time,
      completed: m.completed_time,
      trailer_weight_kg: trailer?.weight_kg || 0,
    };
  });

  // Optimization: group moves by proximity
  const pendingMoves = moveSummary.filter((m) => m.status === "pending");
  const urgentMoves = pendingMoves.filter((m) => m.priority === "urgent");

  return {
    action: "yard_move",
    total_moves: moveSummary.length,
    moves: moveSummary,
    optimization: {
      pending_count: pendingMoves.length,
      urgent_count: urgentMoves.length,
      unassigned: pendingMoves.filter((m) => !m.driver).length,
      estimated_total_time_minutes: pendingMoves.length * 8,
      recommendation: urgentMoves.length > 0
        ? `Process ${urgentMoves.length} urgent move(s) first: ${urgentMoves.map((m) => m.move_id).join(", ")}`
        : "No urgent moves — process in FIFO order",
    },
    summary: {
      pending: pendingMoves.length,
      in_progress: moveSummary.filter((m) => m.status === "in_progress").length,
      completed: moveSummary.filter((m) => m.status === "completed").length,
      by_reason: moves.reduce<Record<string, number>>((acc, m) => { acc[m.reason] = (acc[m.reason] || 0) + 1; return acc; }, {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export function executeYardManagementAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "yard_assign":
      return yardAssign(params);
    case "yard_trailer":
      return yardTrailer(params);
    case "yard_appoint":
      return yardAppoint(params);
    case "yard_move":
      return yardMove(params);
    default:
      return { error: `Unknown yard management action: ${action}` };
  }
}
