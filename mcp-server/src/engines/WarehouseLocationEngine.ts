/**
 * WarehouseLocationEngine — R28-MS1
 *
 * Warehouse bin/location management: location lookup, slotting optimization,
 * pick path generation, and putaway logic for manufacturing warehouses.
 *
 * Actions:
 *   wh_locate  — Find items by location or part number, show bin contents
 *   wh_slot    — Slotting optimization (ABC velocity, ergonomic zones)
 *   wh_pick    — Generate optimized pick lists with travel minimization
 *   wh_putaway — Suggest putaway locations based on rules and capacity
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WarehouseLocation {
  location_id: string;
  zone: "A" | "B" | "C" | "D" | "STAGING" | "RECEIVING" | "SHIPPING";
  aisle: string;
  rack: string;
  shelf: string;
  bin: string;
  location_type: "bulk" | "pick" | "overstock" | "floor" | "staging" | "hazmat";
  max_weight_kg: number;
  max_volume_m3: number;
  current_weight_kg: number;
  current_volume_m3: number;
  temperature_controlled: boolean;
  occupied: boolean;
  contents: BinContent[];
}

interface BinContent {
  part_number: string;
  description: string;
  lot_number: string;
  quantity: number;
  unit: string;
  received_date: string;
  expiry_date: string | null;
}

interface PickItem {
  order_id: string;
  part_number: string;
  description: string;
  quantity_needed: number;
  location_id: string;
  zone: string;
  aisle: string;
  priority: "urgent" | "standard" | "low";
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const WAREHOUSE_LOCATIONS: WarehouseLocation[] = [
  // Zone A — High-velocity picks (raw materials)
  { location_id: "A-01-01-A", zone: "A", aisle: "01", rack: "01", shelf: "A", bin: "01", location_type: "pick", max_weight_kg: 50, max_volume_m3: 0.2, current_weight_kg: 35, current_volume_m3: 0.12, temperature_controlled: false, occupied: true, contents: [{ part_number: "MAT-AL7075-BAR", description: "7075-T6 Aluminum Bar 2\" dia", lot_number: "LOT-2024-1001", quantity: 24, unit: "ea", received_date: "2024-09-20", expiry_date: null }] },
  { location_id: "A-01-01-B", zone: "A", aisle: "01", rack: "01", shelf: "B", bin: "02", location_type: "pick", max_weight_kg: 50, max_volume_m3: 0.2, current_weight_kg: 42, current_volume_m3: 0.15, temperature_controlled: false, occupied: true, contents: [{ part_number: "MAT-SS316-RND", description: "316 Stainless Round Bar 3\" dia", lot_number: "LOT-2024-1015", quantity: 12, unit: "ea", received_date: "2024-10-05", expiry_date: null }] },
  { location_id: "A-01-02-A", zone: "A", aisle: "01", rack: "02", shelf: "A", bin: "03", location_type: "pick", max_weight_kg: 75, max_volume_m3: 0.3, current_weight_kg: 55, current_volume_m3: 0.18, temperature_controlled: false, occupied: true, contents: [{ part_number: "MAT-4140-RND", description: "4140 Steel Round Bar 1.5\" dia", lot_number: "LOT-2024-0988", quantity: 30, unit: "ea", received_date: "2024-09-15", expiry_date: null }] },
  { location_id: "A-02-01-A", zone: "A", aisle: "02", rack: "01", shelf: "A", bin: "04", location_type: "pick", max_weight_kg: 30, max_volume_m3: 0.15, current_weight_kg: 8, current_volume_m3: 0.04, temperature_controlled: false, occupied: true, contents: [{ part_number: "MAT-CAST-FC250", description: "FC250 Cast Iron Blank", lot_number: "LOT-2024-1022", quantity: 6, unit: "ea", received_date: "2024-10-10", expiry_date: null }] },

  // Zone B — Medium-velocity (purchased components)
  { location_id: "B-01-01-A", zone: "B", aisle: "01", rack: "01", shelf: "A", bin: "05", location_type: "pick", max_weight_kg: 20, max_volume_m3: 0.1, current_weight_kg: 5, current_volume_m3: 0.03, temperature_controlled: false, occupied: true, contents: [{ part_number: "SEAL-KIT-001", description: "Mechanical Seal Kit", lot_number: "LOT-2024-1030", quantity: 15, unit: "kit", received_date: "2024-10-12", expiry_date: "2026-10-12" }] },
  { location_id: "B-01-01-B", zone: "B", aisle: "01", rack: "01", shelf: "B", bin: "06", location_type: "pick", max_weight_kg: 20, max_volume_m3: 0.1, current_weight_kg: 8, current_volume_m3: 0.04, temperature_controlled: false, occupied: true, contents: [{ part_number: "BRG-SET-001", description: "Bearing Set (2x 6205-2RS)", lot_number: "LOT-2024-1035", quantity: 20, unit: "set", received_date: "2024-10-14", expiry_date: null }] },
  { location_id: "B-01-02-A", zone: "B", aisle: "01", rack: "02", shelf: "A", bin: "07", location_type: "pick", max_weight_kg: 15, max_volume_m3: 0.08, current_weight_kg: 3, current_volume_m3: 0.02, temperature_controlled: false, occupied: true, contents: [{ part_number: "GSK-SET-001", description: "Gasket Set", lot_number: "LOT-2024-1040", quantity: 25, unit: "set", received_date: "2024-10-15", expiry_date: "2025-10-15" }] },
  { location_id: "B-02-01-A", zone: "B", aisle: "02", rack: "01", shelf: "A", bin: "08", location_type: "pick", max_weight_kg: 10, max_volume_m3: 0.05, current_weight_kg: 2, current_volume_m3: 0.01, temperature_controlled: false, occupied: true, contents: [{ part_number: "FAS-KIT-001", description: "Fastener Kit", lot_number: "LOT-2024-1045", quantity: 40, unit: "kit", received_date: "2024-10-18", expiry_date: null }] },

  // Zone C — Low-velocity (overstock, specialty)
  { location_id: "C-01-01-A", zone: "C", aisle: "01", rack: "01", shelf: "A", bin: "09", location_type: "overstock", max_weight_kg: 100, max_volume_m3: 0.5, current_weight_kg: 70, current_volume_m3: 0.35, temperature_controlled: false, occupied: true, contents: [{ part_number: "MAT-AL7075-BAR", description: "7075-T6 Aluminum Bar 2\" dia (overstock)", lot_number: "LOT-2024-0990", quantity: 48, unit: "ea", received_date: "2024-09-10", expiry_date: null }] },
  { location_id: "C-01-02-A", zone: "C", aisle: "01", rack: "02", shelf: "A", bin: "10", location_type: "overstock", max_weight_kg: 100, max_volume_m3: 0.5, current_weight_kg: 0, current_volume_m3: 0, temperature_controlled: false, occupied: false, contents: [] },

  // Zone D — Hazmat / Temperature-controlled
  { location_id: "D-01-01-A", zone: "D", aisle: "01", rack: "01", shelf: "A", bin: "11", location_type: "hazmat", max_weight_kg: 25, max_volume_m3: 0.1, current_weight_kg: 12, current_volume_m3: 0.06, temperature_controlled: true, occupied: true, contents: [{ part_number: "COOL-SEMI-001", description: "Semi-synthetic Coolant (5 gal)", lot_number: "LOT-2024-1050", quantity: 4, unit: "ea", received_date: "2024-10-01", expiry_date: "2025-04-01" }] },

  // Staging Areas
  { location_id: "STG-01", zone: "STAGING", aisle: "STG", rack: "01", shelf: "-", bin: "S1", location_type: "staging", max_weight_kg: 500, max_volume_m3: 2.0, current_weight_kg: 125, current_volume_m3: 0.8, temperature_controlled: false, occupied: true, contents: [{ part_number: "KIT-PUMP-001", description: "Pump Assembly Kit (staged)", lot_number: "KIT-2024-001", quantity: 3, unit: "kit", received_date: "2024-10-25", expiry_date: null }] },

  // Receiving dock
  { location_id: "RCV-01", zone: "RECEIVING", aisle: "RCV", rack: "01", shelf: "-", bin: "R1", location_type: "staging", max_weight_kg: 1000, max_volume_m3: 5.0, current_weight_kg: 200, current_volume_m3: 1.2, temperature_controlled: false, occupied: true, contents: [{ part_number: "MAT-BRONZE-TUB", description: "C93200 Bronze Tube 2.5\" OD (pending inspection)", lot_number: "LOT-2024-1060", quantity: 10, unit: "ea", received_date: "2024-10-28", expiry_date: null }] },

  // Shipping dock
  { location_id: "SHP-01", zone: "SHIPPING", aisle: "SHP", rack: "01", shelf: "-", bin: "H1", location_type: "staging", max_weight_kg: 1000, max_volume_m3: 5.0, current_weight_kg: 85, current_volume_m3: 0.5, temperature_controlled: false, occupied: true, contents: [{ part_number: "ASSY-PUMP-001", description: "Centrifugal Pump Assembly (packed)", lot_number: "SO-2024-0155", quantity: 2, unit: "ea", received_date: "2024-10-26", expiry_date: null }] },
];

const PENDING_PICKS: PickItem[] = [
  { order_id: "WO-2024-301", part_number: "MAT-AL7075-BAR", description: "7075-T6 Aluminum Bar", quantity_needed: 6, location_id: "A-01-01-A", zone: "A", aisle: "01", priority: "urgent" },
  { order_id: "WO-2024-301", part_number: "FAS-KIT-001", description: "Fastener Kit", quantity_needed: 2, location_id: "B-02-01-A", zone: "B", aisle: "02", priority: "urgent" },
  { order_id: "WO-2024-302", part_number: "MAT-SS316-RND", description: "316 Stainless Round", quantity_needed: 3, location_id: "A-01-01-B", zone: "A", aisle: "01", priority: "standard" },
  { order_id: "WO-2024-302", part_number: "SEAL-KIT-001", description: "Mechanical Seal Kit", quantity_needed: 3, location_id: "B-01-01-A", zone: "B", aisle: "01", priority: "standard" },
  { order_id: "WO-2024-302", part_number: "BRG-SET-001", description: "Bearing Set", quantity_needed: 3, location_id: "B-01-01-B", zone: "B", aisle: "01", priority: "standard" },
  { order_id: "WO-2024-303", part_number: "MAT-4140-RND", description: "4140 Steel Round Bar", quantity_needed: 4, location_id: "A-01-02-A", zone: "A", aisle: "01", priority: "low" },
  { order_id: "WO-2024-303", part_number: "GSK-SET-001", description: "Gasket Set", quantity_needed: 4, location_id: "B-01-02-A", zone: "B", aisle: "01", priority: "low" },
  { order_id: "WO-2024-304", part_number: "COOL-SEMI-001", description: "Semi-synthetic Coolant", quantity_needed: 2, location_id: "D-01-01-A", zone: "D", aisle: "01", priority: "standard" },
];

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function whLocate(params: Record<string, unknown>): unknown {
  const partNumber = (params.part_number as string) || (params.partNumber as string) || "";
  const zone = (params.zone as string) || "";
  const locationId = (params.location_id as string) || (params.locationId as string) || "";

  let locations = WAREHOUSE_LOCATIONS;
  if (locationId) locations = locations.filter((l) => l.location_id === locationId);
  else if (partNumber) locations = locations.filter((l) => l.contents.some((c) => c.part_number === partNumber));
  else if (zone) locations = locations.filter((l) => l.zone === zone);

  const results = locations.map((l) => ({
    location_id: l.location_id,
    zone: l.zone,
    aisle: l.aisle,
    rack: l.rack,
    shelf: l.shelf,
    location_type: l.location_type,
    utilization_pct: Math.round((l.current_weight_kg / l.max_weight_kg) * 100),
    volume_pct: Math.round((l.current_volume_m3 / l.max_volume_m3) * 100),
    temperature_controlled: l.temperature_controlled,
    contents: l.contents.map((c) => ({
      part_number: c.part_number,
      description: c.description,
      lot_number: c.lot_number,
      quantity: c.quantity,
      unit: c.unit,
      days_in_location: Math.round((new Date("2024-11-01").getTime() - new Date(c.received_date).getTime()) / 86400000),
      expiry_date: c.expiry_date,
      near_expiry: c.expiry_date ? new Date(c.expiry_date) < new Date("2025-02-01") : false,
    })),
  }));

  // Zone utilization summary
  const zoneSummary: Record<string, { total: number; occupied: number; avg_util: number }> = {};
  for (const l of WAREHOUSE_LOCATIONS) {
    if (!zoneSummary[l.zone]) zoneSummary[l.zone] = { total: 0, occupied: 0, avg_util: 0 };
    zoneSummary[l.zone].total++;
    if (l.occupied) zoneSummary[l.zone].occupied++;
    zoneSummary[l.zone].avg_util += l.max_weight_kg > 0 ? (l.current_weight_kg / l.max_weight_kg) * 100 : 0;
  }
  for (const z of Object.values(zoneSummary)) {
    z.avg_util = Math.round(z.avg_util / z.total);
  }

  return {
    action: "wh_locate",
    query: { part_number: partNumber || "all", zone: zone || "all", location_id: locationId || "all" },
    locations_found: results.length,
    locations: results,
    zone_utilization: zoneSummary,
    summary: {
      total_locations: WAREHOUSE_LOCATIONS.length,
      occupied: WAREHOUSE_LOCATIONS.filter((l) => l.occupied).length,
      empty: WAREHOUSE_LOCATIONS.filter((l) => !l.occupied).length,
      near_expiry_items: WAREHOUSE_LOCATIONS.flatMap((l) => l.contents).filter((c) => c.expiry_date && new Date(c.expiry_date) < new Date("2025-02-01")).length,
    },
  };
}

function whSlot(params: Record<string, unknown>): unknown {
  // ABC velocity analysis for slotting optimization
  const velocityData = PENDING_PICKS.reduce<Record<string, number>>((acc, p) => {
    acc[p.part_number] = (acc[p.part_number] || 0) + p.quantity_needed;
    return acc;
  }, {});

  const sortedParts = Object.entries(velocityData)
    .sort((a, b) => b[1] - a[1])
    .map(([part, picks], idx, arr) => {
      const cumPct = ((idx + 1) / arr.length) * 100;
      const category = cumPct <= 20 ? "A" : cumPct <= 50 ? "B" : "C";
      return { part_number: part, pick_frequency: picks, abc_category: category };
    });

  // Current vs recommended zone mapping
  const recommendations = sortedParts.map((p) => {
    const currentLoc = WAREHOUSE_LOCATIONS.find((l) => l.contents.some((c) => c.part_number === p.part_number));
    const currentZone = currentLoc?.zone || "UNKNOWN";
    const recommendedZone = p.abc_category === "A" ? "A" : p.abc_category === "B" ? "B" : "C";
    const needsMove = currentZone !== recommendedZone && currentZone !== "STAGING" && currentZone !== "RECEIVING" && currentZone !== "SHIPPING";

    return {
      part_number: p.part_number,
      abc_category: p.abc_category,
      pick_frequency: p.pick_frequency,
      current_zone: currentZone,
      recommended_zone: recommendedZone,
      needs_relocation: needsMove,
      ergonomic_level: p.abc_category === "A" ? "waist_height" : p.abc_category === "B" ? "mid_shelf" : "any",
    };
  });

  return {
    action: "wh_slot",
    abc_analysis: sortedParts,
    slotting_recommendations: recommendations,
    summary: {
      a_items: sortedParts.filter((p) => p.abc_category === "A").length,
      b_items: sortedParts.filter((p) => p.abc_category === "B").length,
      c_items: sortedParts.filter((p) => p.abc_category === "C").length,
      relocations_needed: recommendations.filter((r) => r.needs_relocation).length,
      estimated_pick_time_reduction_pct: recommendations.filter((r) => r.needs_relocation).length > 0 ? 15 : 0,
    },
  };
}

function whPick(params: Record<string, unknown>): unknown {
  const orderId = (params.order_id as string) || (params.orderId as string) || "";
  const priority = (params.priority as string) || "";

  let picks = PENDING_PICKS;
  if (orderId) picks = picks.filter((p) => p.order_id === orderId);
  if (priority) picks = picks.filter((p) => p.priority === priority);

  // Sort by zone then aisle for travel optimization (serpentine path)
  const optimizedPicks = [...picks].sort((a, b) => {
    if (a.zone !== b.zone) return a.zone.localeCompare(b.zone);
    const aisleA = parseInt(a.aisle);
    const aisleB = parseInt(b.aisle);
    return aisleA - aisleB;
  });

  // Check availability
  const pickList = optimizedPicks.map((p, idx) => {
    const loc = WAREHOUSE_LOCATIONS.find((l) => l.location_id === p.location_id);
    const content = loc?.contents.find((c) => c.part_number === p.part_number);
    const available = content?.quantity || 0;
    const shortfall = Math.max(0, p.quantity_needed - available);

    return {
      sequence: idx + 1,
      order_id: p.order_id,
      part_number: p.part_number,
      description: p.description,
      quantity_needed: p.quantity_needed,
      quantity_available: available,
      shortfall,
      location_id: p.location_id,
      zone: p.zone,
      aisle: p.aisle,
      priority: p.priority,
      lot_number: content?.lot_number || "N/A",
      pick_status: shortfall > 0 ? "SHORTAGE" : "READY",
    };
  });

  const totalItems = pickList.length;
  const readyPicks = pickList.filter((p) => p.pick_status === "READY").length;
  const shortages = pickList.filter((p) => p.pick_status === "SHORTAGE");
  const uniqueZones = [...new Set(pickList.map((p) => p.zone))];
  const estimatedTravelMinutes = uniqueZones.length * 3 + pickList.length * 0.5;

  return {
    action: "wh_pick",
    pick_list: pickList,
    travel_optimization: {
      route_order: uniqueZones,
      total_stops: totalItems,
      estimated_travel_minutes: Math.round(estimatedTravelMinutes),
      strategy: "serpentine_by_zone",
    },
    summary: {
      total_picks: totalItems,
      ready: readyPicks,
      shortages: shortages.length,
      unique_orders: [...new Set(pickList.map((p) => p.order_id))].length,
      zones_visited: uniqueZones.length,
    },
    shortage_details: shortages.map((s) => ({
      part_number: s.part_number,
      needed: s.quantity_needed,
      available: s.quantity_available,
      shortfall: s.shortfall,
    })),
  };
}

function whPutaway(params: Record<string, unknown>): unknown {
  const partNumber = (params.part_number as string) || (params.partNumber as string) || "MAT-AL7075-BAR";
  const quantity = (params.quantity as number) || 10;
  const lotNumber = (params.lot_number as string) || (params.lotNumber as string) || "LOT-NEW";
  const hazmat = (params.hazmat as boolean) || false;
  const tempControlled = (params.temp_controlled as boolean) || false;

  // Find existing locations with same part (consolidation)
  const existingLocations = WAREHOUSE_LOCATIONS.filter(
    (l) => l.contents.some((c) => c.part_number === partNumber) && l.current_weight_kg < l.max_weight_kg * 0.9
  );

  // Find empty locations in appropriate zone
  const emptyLocations = WAREHOUSE_LOCATIONS.filter((l) => {
    if (l.occupied) return false;
    if (hazmat && l.location_type !== "hazmat") return false;
    if (tempControlled && !l.temperature_controlled) return false;
    return true;
  });

  // Find underutilized locations
  const underutilized = WAREHOUSE_LOCATIONS.filter(
    (l) => l.occupied && l.current_weight_kg < l.max_weight_kg * 0.5 && !l.contents.some((c) => c.part_number === partNumber)
  );

  const suggestions = [
    ...existingLocations.map((l) => ({
      location_id: l.location_id,
      strategy: "consolidate" as const,
      zone: l.zone,
      available_weight_kg: Math.round(l.max_weight_kg - l.current_weight_kg),
      available_volume_m3: Math.round((l.max_volume_m3 - l.current_volume_m3) * 100) / 100,
      reason: `Same part already stored — consolidate for easier picking`,
      priority: 1,
    })),
    ...emptyLocations.map((l) => ({
      location_id: l.location_id,
      strategy: "empty_bin" as const,
      zone: l.zone,
      available_weight_kg: l.max_weight_kg,
      available_volume_m3: l.max_volume_m3,
      reason: `Empty location in zone ${l.zone}`,
      priority: 2,
    })),
    ...underutilized.slice(0, 3).map((l) => ({
      location_id: l.location_id,
      strategy: "underutilized" as const,
      zone: l.zone,
      available_weight_kg: Math.round(l.max_weight_kg - l.current_weight_kg),
      available_volume_m3: Math.round((l.max_volume_m3 - l.current_volume_m3) * 100) / 100,
      reason: `Underutilized bin — ${Math.round((l.current_weight_kg / l.max_weight_kg) * 100)}% used`,
      priority: 3,
    })),
  ].sort((a, b) => a.priority - b.priority);

  return {
    action: "wh_putaway",
    item: { part_number: partNumber, quantity, lot_number: lotNumber, hazmat, temp_controlled: tempControlled },
    suggestions: suggestions.slice(0, 5),
    recommended: suggestions[0] || null,
    summary: {
      consolidation_options: existingLocations.length,
      empty_locations: emptyLocations.length,
      underutilized_locations: underutilized.length,
      total_suggestions: suggestions.length,
      strategy: existingLocations.length > 0 ? "CONSOLIDATE" : emptyLocations.length > 0 ? "NEW_BIN" : "SHARE_BIN",
    },
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export function executeWarehouseLocationAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "wh_locate":
      return whLocate(params);
    case "wh_slot":
      return whSlot(params);
    case "wh_pick":
      return whPick(params);
    case "wh_putaway":
      return whPutaway(params);
    default:
      return { error: `Unknown warehouse location action: ${action}` };
  }
}
