/**
 * ShippingReceivingEngine — R28-MS3
 *
 * Inbound receiving, outbound shipping, dock scheduling, and carrier
 * management for manufacturing warehouse operations.
 *
 * Actions:
 *   ship_receive  — Inbound receiving: PO matching, inspection, putaway
 *   ship_dispatch — Outbound shipping: packing, labeling, carrier assignment
 *   ship_dock     — Dock door scheduling and utilization
 *   ship_carrier  — Carrier performance tracking and rate comparison
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReceivingRecord {
  receipt_id: string;
  po_number: string;
  supplier: string;
  carrier: string;
  tracking_number: string;
  status: "scheduled" | "arrived" | "unloading" | "inspecting" | "putaway" | "completed" | "rejected";
  dock_door: string;
  arrival_date: string;
  scheduled_date: string;
  items: ReceivingItem[];
}

interface ReceivingItem {
  part_number: string;
  description: string;
  quantity_ordered: number;
  quantity_received: number;
  quantity_accepted: number;
  quantity_rejected: number;
  lot_number: string;
  inspection_required: boolean;
  inspection_status: "pending" | "passed" | "failed" | "waived";
}

interface ShipmentRecord {
  shipment_id: string;
  sales_order: string;
  customer: string;
  carrier: string;
  service_level: "ground" | "2day" | "overnight" | "freight" | "ltl";
  status: "picking" | "packing" | "labeled" | "staged" | "loaded" | "shipped" | "delivered";
  ship_date: string;
  required_date: string;
  dock_door: string | null;
  items: ShipmentItem[];
  weight_kg: number;
  dimensions: string;
  tracking_number: string | null;
}

interface ShipmentItem {
  part_number: string;
  description: string;
  quantity: number;
  lot_number: string;
  serial_numbers: string[];
}

interface DockDoor {
  door_id: string;
  type: "receiving" | "shipping" | "dual";
  status: "available" | "occupied" | "maintenance" | "reserved";
  current_assignment: string | null;
  scheduled_appointments: DockAppointment[];
}

interface DockAppointment {
  appointment_id: string;
  type: "inbound" | "outbound";
  carrier: string;
  scheduled_time: string;
  duration_minutes: number;
  reference: string;
}

interface CarrierRecord {
  carrier_id: string;
  name: string;
  type: "ltl" | "ftl" | "parcel" | "freight";
  on_time_pct: number;
  damage_rate_pct: number;
  avg_transit_days: number;
  rate_per_kg: number;
  rating: number;
  active_shipments: number;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const RECEIVING_RECORDS: ReceivingRecord[] = [
  {
    receipt_id: "RCV-2024-101", po_number: "PO-2024-5501", supplier: "AlloyTech Metals", carrier: "FreightPro Logistics", tracking_number: "FPL-887744",
    status: "inspecting", dock_door: "DOCK-R1", arrival_date: "2024-10-28", scheduled_date: "2024-10-28",
    items: [
      { part_number: "MAT-BRONZE-TUB", description: "C93200 Bronze Tube 2.5\" OD", quantity_ordered: 10, quantity_received: 10, quantity_accepted: 0, quantity_rejected: 0, lot_number: "LOT-2024-1060", inspection_required: true, inspection_status: "pending" },
    ],
  },
  {
    receipt_id: "RCV-2024-102", po_number: "PO-2024-5520", supplier: "FluidSeal Corp", carrier: "UPS Freight", tracking_number: "1Z-999-888-77",
    status: "completed", dock_door: "DOCK-R2", arrival_date: "2024-10-25", scheduled_date: "2024-10-25",
    items: [
      { part_number: "SEAL-KIT-001", description: "Mechanical Seal Kit", quantity_ordered: 20, quantity_received: 20, quantity_accepted: 20, quantity_rejected: 0, lot_number: "LOT-2024-1070", inspection_required: true, inspection_status: "passed" },
      { part_number: "SEAL-KIT-002", description: "Double Mechanical Seal", quantity_ordered: 5, quantity_received: 5, quantity_accepted: 4, quantity_rejected: 1, lot_number: "LOT-2024-1071", inspection_required: true, inspection_status: "passed" },
    ],
  },
  {
    receipt_id: "RCV-2024-103", po_number: "PO-2024-5535", supplier: "SKF Distribution", carrier: "FedEx Freight", tracking_number: "FDX-445566",
    status: "scheduled", dock_door: "DOCK-R1", arrival_date: "", scheduled_date: "2024-11-02",
    items: [
      { part_number: "BRG-SET-001", description: "Bearing Set (2x 6205-2RS)", quantity_ordered: 30, quantity_received: 0, quantity_accepted: 0, quantity_rejected: 0, lot_number: "", inspection_required: true, inspection_status: "pending" },
      { part_number: "BRG-SET-002", description: "Ceramic Bearing Set", quantity_ordered: 10, quantity_received: 0, quantity_accepted: 0, quantity_rejected: 0, lot_number: "", inspection_required: true, inspection_status: "pending" },
    ],
  },
  {
    receipt_id: "RCV-2024-104", po_number: "PO-2024-5540", supplier: "BoltMax Supply", carrier: "Local Delivery", tracking_number: "LOCAL-1234",
    status: "completed", dock_door: "DOCK-R2", arrival_date: "2024-10-27", scheduled_date: "2024-10-27",
    items: [
      { part_number: "FAS-KIT-001", description: "Fastener Kit", quantity_ordered: 50, quantity_received: 50, quantity_accepted: 50, quantity_rejected: 0, lot_number: "LOT-2024-1080", inspection_required: false, inspection_status: "waived" },
    ],
  },
];

const SHIPMENT_RECORDS: ShipmentRecord[] = [
  {
    shipment_id: "SHP-2024-201", sales_order: "SO-2024-0155", customer: "Aqua Systems Inc", carrier: "FreightPro Logistics", service_level: "freight",
    status: "staged", ship_date: "2024-10-29", required_date: "2024-11-01", dock_door: "DOCK-S1",
    items: [
      { part_number: "ASSY-PUMP-001", description: "Centrifugal Pump Assembly", quantity: 2, lot_number: "SO-2024-0155", serial_numbers: ["SN-PUMP-0451", "SN-PUMP-0452"] },
    ],
    weight_kg: 85, dimensions: "60x40x35cm (x2)", tracking_number: null,
  },
  {
    shipment_id: "SHP-2024-202", sales_order: "SO-2024-0160", customer: "PetroFlow Ltd", carrier: "UPS Freight", service_level: "2day",
    status: "packing", ship_date: "2024-11-01", required_date: "2024-11-05", dock_door: null,
    items: [
      { part_number: "ASSY-PUMP-002", description: "Centrifugal Pump Assembly (Upgraded)", quantity: 1, lot_number: "SO-2024-0160", serial_numbers: ["SN-PUMP-0453"] },
    ],
    weight_kg: 42, dimensions: "60x40x35cm", tracking_number: null,
  },
  {
    shipment_id: "SHP-2024-203", sales_order: "SO-2024-0148", customer: "MedDevice Corp", carrier: "FedEx Freight", service_level: "overnight",
    status: "shipped", ship_date: "2024-10-26", required_date: "2024-10-28", dock_door: "DOCK-S2",
    items: [
      { part_number: "IMP-8001", description: "Implant Pin A (Medical)", quantity: 50, lot_number: "LOT-MED-2024-001", serial_numbers: [] },
    ],
    weight_kg: 5, dimensions: "30x20x15cm", tracking_number: "FDX-112233-MED",
  },
];

const DOCK_DOORS: DockDoor[] = [
  { door_id: "DOCK-R1", type: "receiving", status: "occupied", current_assignment: "RCV-2024-101",
    scheduled_appointments: [
      { appointment_id: "APT-001", type: "inbound", carrier: "FreightPro Logistics", scheduled_time: "2024-10-28T08:00", duration_minutes: 60, reference: "RCV-2024-101" },
      { appointment_id: "APT-003", type: "inbound", carrier: "FedEx Freight", scheduled_time: "2024-11-02T09:00", duration_minutes: 45, reference: "RCV-2024-103" },
    ] },
  { door_id: "DOCK-R2", type: "receiving", status: "available", current_assignment: null,
    scheduled_appointments: [] },
  { door_id: "DOCK-S1", type: "shipping", status: "occupied", current_assignment: "SHP-2024-201",
    scheduled_appointments: [
      { appointment_id: "APT-002", type: "outbound", carrier: "FreightPro Logistics", scheduled_time: "2024-10-29T14:00", duration_minutes: 45, reference: "SHP-2024-201" },
    ] },
  { door_id: "DOCK-S2", type: "shipping", status: "available", current_assignment: null,
    scheduled_appointments: [
      { appointment_id: "APT-004", type: "outbound", carrier: "UPS Freight", scheduled_time: "2024-11-01T10:00", duration_minutes: 30, reference: "SHP-2024-202" },
    ] },
  { door_id: "DOCK-D1", type: "dual", status: "maintenance", current_assignment: null, scheduled_appointments: [] },
];

const CARRIER_DATABASE: CarrierRecord[] = [
  { carrier_id: "CAR-001", name: "FreightPro Logistics", type: "ftl", on_time_pct: 94.5, damage_rate_pct: 0.8, avg_transit_days: 3.2, rate_per_kg: 0.45, rating: 4.5, active_shipments: 2 },
  { carrier_id: "CAR-002", name: "UPS Freight", type: "parcel", on_time_pct: 97.2, damage_rate_pct: 0.3, avg_transit_days: 2.1, rate_per_kg: 0.85, rating: 4.7, active_shipments: 1 },
  { carrier_id: "CAR-003", name: "FedEx Freight", type: "parcel", on_time_pct: 96.8, damage_rate_pct: 0.5, avg_transit_days: 1.8, rate_per_kg: 0.92, rating: 4.6, active_shipments: 1 },
  { carrier_id: "CAR-004", name: "Local Delivery", type: "ltl", on_time_pct: 99.0, damage_rate_pct: 0.1, avg_transit_days: 0.5, rate_per_kg: 0.25, rating: 4.8, active_shipments: 0 },
  { carrier_id: "CAR-005", name: "XPO Logistics", type: "ftl", on_time_pct: 91.3, damage_rate_pct: 1.2, avg_transit_days: 4.0, rate_per_kg: 0.38, rating: 3.9, active_shipments: 0 },
];

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function shipReceive(params: Record<string, unknown>): unknown {
  const receiptId = (params.receipt_id as string) || (params.receiptId as string) || "";
  const status = (params.status as string) || "all";

  let records = RECEIVING_RECORDS;
  if (receiptId) records = records.filter((r) => r.receipt_id === receiptId);
  else if (status !== "all") records = records.filter((r) => r.status === status);

  const receivingSummary = records.map((r) => {
    const totalOrdered = r.items.reduce((s, i) => s + i.quantity_ordered, 0);
    const totalReceived = r.items.reduce((s, i) => s + i.quantity_received, 0);
    const totalAccepted = r.items.reduce((s, i) => s + i.quantity_accepted, 0);
    const totalRejected = r.items.reduce((s, i) => s + i.quantity_rejected, 0);
    const onTime = r.arrival_date ? new Date(r.arrival_date) <= new Date(r.scheduled_date) : true;

    return {
      receipt_id: r.receipt_id,
      po_number: r.po_number,
      supplier: r.supplier,
      carrier: r.carrier,
      status: r.status,
      dock_door: r.dock_door,
      scheduled_date: r.scheduled_date,
      arrival_date: r.arrival_date || "pending",
      on_time: onTime,
      items: r.items.map((i) => ({
        part_number: i.part_number,
        description: i.description,
        ordered: i.quantity_ordered,
        received: i.quantity_received,
        accepted: i.quantity_accepted,
        rejected: i.quantity_rejected,
        inspection: i.inspection_status,
      })),
      totals: { ordered: totalOrdered, received: totalReceived, accepted: totalAccepted, rejected: totalRejected },
      acceptance_rate: totalReceived > 0 ? Math.round((totalAccepted / totalReceived) * 100) : 0,
    };
  });

  return {
    action: "ship_receive",
    total_receipts: receivingSummary.length,
    receipts: receivingSummary,
    summary: {
      scheduled: receivingSummary.filter((r) => r.status === "scheduled").length,
      in_process: receivingSummary.filter((r) => ["arrived", "unloading", "inspecting", "putaway"].includes(r.status)).length,
      completed: receivingSummary.filter((r) => r.status === "completed").length,
      pending_inspection: RECEIVING_RECORDS.flatMap((r) => r.items).filter((i) => i.inspection_status === "pending").length,
      on_time_rate: Math.round((receivingSummary.filter((r) => r.on_time).length / Math.max(receivingSummary.length, 1)) * 100),
    },
  };
}

function shipDispatch(params: Record<string, unknown>): unknown {
  const shipmentId = (params.shipment_id as string) || (params.shipmentId as string) || "";
  const status = (params.status as string) || "all";

  let shipments = SHIPMENT_RECORDS;
  if (shipmentId) shipments = shipments.filter((s) => s.shipment_id === shipmentId);
  else if (status !== "all") shipments = shipments.filter((s) => s.status === status);

  const dispatchSummary = shipments.map((s) => {
    const daysToRequired = Math.round((new Date(s.required_date).getTime() - new Date("2024-11-01").getTime()) / 86400000);
    const isLate = s.status !== "shipped" && s.status !== "delivered" && daysToRequired < 0;

    return {
      shipment_id: s.shipment_id,
      sales_order: s.sales_order,
      customer: s.customer,
      carrier: s.carrier,
      service_level: s.service_level,
      status: s.status,
      ship_date: s.ship_date,
      required_date: s.required_date,
      days_to_required: daysToRequired,
      is_late: isLate,
      dock_door: s.dock_door,
      items: s.items,
      weight_kg: s.weight_kg,
      tracking_number: s.tracking_number,
    };
  });

  return {
    action: "ship_dispatch",
    total_shipments: dispatchSummary.length,
    shipments: dispatchSummary,
    summary: {
      in_process: dispatchSummary.filter((s) => ["picking", "packing", "labeled", "staged"].includes(s.status)).length,
      ready_to_ship: dispatchSummary.filter((s) => s.status === "staged" || s.status === "loaded").length,
      shipped: dispatchSummary.filter((s) => s.status === "shipped" || s.status === "delivered").length,
      late: dispatchSummary.filter((s) => s.is_late).length,
      total_weight_kg: dispatchSummary.reduce((s, d) => s + d.weight_kg, 0),
    },
  };
}

function shipDock(params: Record<string, unknown>): unknown {
  const doorId = (params.door_id as string) || (params.doorId as string) || "";

  let doors = DOCK_DOORS;
  if (doorId) doors = doors.filter((d) => d.door_id === doorId);

  const dockSummary = doors.map((d) => ({
    door_id: d.door_id,
    type: d.type,
    status: d.status,
    current_assignment: d.current_assignment,
    upcoming_appointments: d.scheduled_appointments.length,
    appointments: d.scheduled_appointments.map((a) => ({
      appointment_id: a.appointment_id,
      type: a.type,
      carrier: a.carrier,
      scheduled_time: a.scheduled_time,
      duration_minutes: a.duration_minutes,
      reference: a.reference,
    })),
  }));

  const statusDist: Record<string, number> = {};
  for (const d of DOCK_DOORS) statusDist[d.status] = (statusDist[d.status] || 0) + 1;

  return {
    action: "ship_dock",
    total_doors: dockSummary.length,
    doors: dockSummary,
    summary: {
      status_distribution: statusDist,
      available: DOCK_DOORS.filter((d) => d.status === "available").length,
      occupied: DOCK_DOORS.filter((d) => d.status === "occupied").length,
      maintenance: DOCK_DOORS.filter((d) => d.status === "maintenance").length,
      total_appointments_today: DOCK_DOORS.flatMap((d) => d.scheduled_appointments).length,
      utilization_pct: Math.round((DOCK_DOORS.filter((d) => d.status === "occupied").length / DOCK_DOORS.filter((d) => d.status !== "maintenance").length) * 100),
    },
  };
}

function shipCarrier(params: Record<string, unknown>): unknown {
  const carrierId = (params.carrier_id as string) || (params.carrierId as string) || "";

  let carriers = CARRIER_DATABASE;
  if (carrierId) carriers = carriers.filter((c) => c.carrier_id === carrierId);

  const carrierAnalysis = carriers.map((c) => ({
    carrier_id: c.carrier_id,
    name: c.name,
    type: c.type,
    performance: {
      on_time_pct: c.on_time_pct,
      damage_rate_pct: c.damage_rate_pct,
      avg_transit_days: c.avg_transit_days,
      rating: c.rating,
    },
    cost: { rate_per_kg: c.rate_per_kg },
    active_shipments: c.active_shipments,
    value_score: Math.round((c.on_time_pct * 0.4 + (100 - c.damage_rate_pct * 10) * 0.3 + (1 / c.rate_per_kg) * 10 * 0.3) * 10) / 10,
  })).sort((a, b) => b.value_score - a.value_score);

  const bestValue = carrierAnalysis[0];
  const bestOnTime = [...carrierAnalysis].sort((a, b) => b.performance.on_time_pct - a.performance.on_time_pct)[0];
  const lowestCost = [...carrierAnalysis].sort((a, b) => a.cost.rate_per_kg - b.cost.rate_per_kg)[0];

  return {
    action: "ship_carrier",
    total_carriers: carrierAnalysis.length,
    carriers: carrierAnalysis,
    recommendations: {
      best_value: { name: bestValue?.name, score: bestValue?.value_score },
      best_on_time: { name: bestOnTime?.name, on_time_pct: bestOnTime?.performance.on_time_pct },
      lowest_cost: { name: lowestCost?.name, rate_per_kg: lowestCost?.cost.rate_per_kg },
    },
    summary: {
      avg_on_time: Math.round(carriers.reduce((s, c) => s + c.on_time_pct, 0) / Math.max(carriers.length, 1) * 10) / 10,
      avg_damage_rate: Math.round(carriers.reduce((s, c) => s + c.damage_rate_pct, 0) / Math.max(carriers.length, 1) * 10) / 10,
      total_active_shipments: carriers.reduce((s, c) => s + c.active_shipments, 0),
    },
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export function executeShippingReceivingAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "ship_receive":
      return shipReceive(params);
    case "ship_dispatch":
      return shipDispatch(params);
    case "ship_dock":
      return shipDock(params);
    case "ship_carrier":
      return shipCarrier(params);
    default:
      return { error: `Unknown shipping/receiving action: ${action}` };
  }
}
