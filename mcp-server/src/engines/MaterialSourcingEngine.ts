/**
 * MaterialSourcingEngine — R25-MS2
 *
 * Material sourcing optimization, price comparison, availability tracking,
 * and alternative material recommendations.
 *
 * Actions:
 *   src_price       — Material price comparison across suppliers
 *   src_availability — Material stock and availability tracking
 *   src_alternative  — Alternative material recommendations
 *   src_optimize     — Sourcing optimization with cost/lead time trade-offs
 */

// ── Material Pricing Database ──────────────────────────────────────────────

interface MaterialPrice {
  material_id: string;
  material: string;
  form: string;
  spec: string;
  suppliers: SupplierQuote[];
}

interface SupplierQuote {
  supplier_id: string;
  supplier_name: string;
  price_per_kg_usd: number;
  min_order_kg: number;
  lead_time_days: number;
  in_stock: boolean;
  stock_kg: number;
  last_updated: string;
  price_trend: "RISING" | "STABLE" | "FALLING";
  certifications: string[];
}

const MATERIAL_PRICES: MaterialPrice[] = [
  {
    material_id: "MAT-TI64", material: "Ti-6Al-4V", form: "Round Bar", spec: "AMS 4928",
    suppliers: [
      { supplier_id: "SUP-003", supplier_name: "Thyssen Krupp", price_per_kg_usd: 85.50, min_order_kg: 25, lead_time_days: 14, in_stock: true, stock_kg: 450, last_updated: "2025-06-01", price_trend: "RISING", certifications: ["AS9120", "NADCAP"] },
      { supplier_id: "SUP-009", supplier_name: "East Coast Alloys", price_per_kg_usd: 78.00, min_order_kg: 50, lead_time_days: 21, in_stock: true, stock_kg: 180, last_updated: "2025-05-20", price_trend: "STABLE", certifications: ["ISO 9001"] },
    ],
  },
  {
    material_id: "MAT-IN718", material: "Inconel 718", form: "Round Bar", spec: "AMS 5662",
    suppliers: [
      { supplier_id: "SUP-003", supplier_name: "Thyssen Krupp", price_per_kg_usd: 62.00, min_order_kg: 25, lead_time_days: 14, in_stock: true, stock_kg: 320, last_updated: "2025-06-01", price_trend: "STABLE", certifications: ["AS9120", "NADCAP"] },
      { supplier_id: "SUP-009", supplier_name: "East Coast Alloys", price_per_kg_usd: 55.00, min_order_kg: 50, lead_time_days: 28, in_stock: false, stock_kg: 0, last_updated: "2025-05-15", price_trend: "RISING", certifications: ["ISO 9001"] },
    ],
  },
  {
    material_id: "MAT-AL7075", material: "Aluminum 7075-T6", form: "Plate", spec: "AMS 4045",
    suppliers: [
      { supplier_id: "SUP-004", supplier_name: "Alcoa Specialty", price_per_kg_usd: 12.80, min_order_kg: 50, lead_time_days: 10, in_stock: true, stock_kg: 2500, last_updated: "2025-06-10", price_trend: "FALLING", certifications: ["AS9100D", "NADCAP"] },
      { supplier_id: "SUP-003", supplier_name: "Thyssen Krupp", price_per_kg_usd: 14.20, min_order_kg: 25, lead_time_days: 14, in_stock: true, stock_kg: 800, last_updated: "2025-06-01", price_trend: "STABLE", certifications: ["AS9120"] },
    ],
  },
  {
    material_id: "MAT-AL6061", material: "Aluminum 6061-T6", form: "Round Bar", spec: "AMS 4117",
    suppliers: [
      { supplier_id: "SUP-004", supplier_name: "Alcoa Specialty", price_per_kg_usd: 8.50, min_order_kg: 25, lead_time_days: 7, in_stock: true, stock_kg: 5000, last_updated: "2025-06-10", price_trend: "STABLE", certifications: ["AS9100D"] },
    ],
  },
  {
    material_id: "MAT-SS316L", material: "SS 316L", form: "Round Bar", spec: "ASTM A276",
    suppliers: [
      { supplier_id: "SUP-006", supplier_name: "Pacific Precision", price_per_kg_usd: 9.80, min_order_kg: 25, lead_time_days: 7, in_stock: true, stock_kg: 1200, last_updated: "2025-05-28", price_trend: "STABLE", certifications: ["ISO 9001"] },
      { supplier_id: "SUP-003", supplier_name: "Thyssen Krupp", price_per_kg_usd: 11.50, min_order_kg: 50, lead_time_days: 14, in_stock: true, stock_kg: 600, last_updated: "2025-06-01", price_trend: "STABLE", certifications: ["AS9120"] },
    ],
  },
  {
    material_id: "MAT-SS304", material: "SS 304", form: "Round Bar", spec: "ASTM A276",
    suppliers: [
      { supplier_id: "SUP-006", supplier_name: "Pacific Precision", price_per_kg_usd: 8.20, min_order_kg: 25, lead_time_days: 5, in_stock: true, stock_kg: 2000, last_updated: "2025-05-28", price_trend: "FALLING", certifications: ["ISO 9001"] },
    ],
  },
  {
    material_id: "MAT-4340", material: "Steel 4340", form: "Round Bar", spec: "AMS 6415",
    suppliers: [
      { supplier_id: "SUP-003", supplier_name: "Thyssen Krupp", price_per_kg_usd: 6.50, min_order_kg: 50, lead_time_days: 10, in_stock: true, stock_kg: 1500, last_updated: "2025-06-01", price_trend: "STABLE", certifications: ["AS9120"] },
      { supplier_id: "SUP-009", supplier_name: "East Coast Alloys", price_per_kg_usd: 5.80, min_order_kg: 100, lead_time_days: 18, in_stock: true, stock_kg: 800, last_updated: "2025-05-15", price_trend: "STABLE", certifications: ["ISO 9001"] },
    ],
  },
  {
    material_id: "MAT-D2", material: "Tool Steel D2", form: "Flat Bar", spec: "ASTM A681",
    suppliers: [
      { supplier_id: "SUP-009", supplier_name: "East Coast Alloys", price_per_kg_usd: 15.20, min_order_kg: 25, lead_time_days: 21, in_stock: true, stock_kg: 350, last_updated: "2025-05-20", price_trend: "RISING", certifications: ["ISO 9001"] },
    ],
  },
  {
    material_id: "MAT-BRASS", material: "Brass C360", form: "Round Bar", spec: "ASTM B16",
    suppliers: [
      { supplier_id: "SUP-006", supplier_name: "Pacific Precision", price_per_kg_usd: 11.00, min_order_kg: 10, lead_time_days: 5, in_stock: true, stock_kg: 800, last_updated: "2025-05-28", price_trend: "STABLE", certifications: ["ISO 9001"] },
    ],
  },
  {
    material_id: "MAT-H13", material: "Tool Steel H13", form: "Round Bar", spec: "ASTM A681",
    suppliers: [
      { supplier_id: "SUP-009", supplier_name: "East Coast Alloys", price_per_kg_usd: 18.50, min_order_kg: 25, lead_time_days: 21, in_stock: false, stock_kg: 0, last_updated: "2025-05-20", price_trend: "RISING", certifications: ["ISO 9001"] },
      { supplier_id: "SUP-003", supplier_name: "Thyssen Krupp", price_per_kg_usd: 22.00, min_order_kg: 50, lead_time_days: 18, in_stock: true, stock_kg: 120, last_updated: "2025-06-01", price_trend: "STABLE", certifications: ["AS9120"] },
    ],
  },
];

// ── Alternative Materials Map ──────────────────────────────────────────────

interface MaterialAlternative {
  original: string;
  alternative: string;
  substitution_type: "DIRECT" | "FUNCTIONAL" | "DOWNGRADE";
  notes: string;
  cost_impact_pct: number; // positive = more expensive
  strength_impact_pct: number;
  machinability_impact_pct: number;
}

const ALTERNATIVES: MaterialAlternative[] = [
  { original: "Ti-6Al-4V", alternative: "Ti-6Al-2Sn-4Zr-2Mo", substitution_type: "FUNCTIONAL", notes: "Better high-temp properties, similar cost", cost_impact_pct: 5, strength_impact_pct: 3, machinability_impact_pct: -5 },
  { original: "Ti-6Al-4V", alternative: "17-4PH Stainless", substitution_type: "DOWNGRADE", notes: "Lower cost, heavier, acceptable for non-aerospace", cost_impact_pct: -60, strength_impact_pct: -15, machinability_impact_pct: 20 },
  { original: "Inconel 718", alternative: "Inconel 625", substitution_type: "FUNCTIONAL", notes: "Better corrosion resistance, lower strength", cost_impact_pct: -10, strength_impact_pct: -20, machinability_impact_pct: 5 },
  { original: "Inconel 718", alternative: "Waspaloy", substitution_type: "FUNCTIONAL", notes: "Better high-temp creep, harder to machine", cost_impact_pct: 15, strength_impact_pct: 5, machinability_impact_pct: -25 },
  { original: "Aluminum 7075-T6", alternative: "Aluminum 2024-T3", substitution_type: "FUNCTIONAL", notes: "Better fatigue resistance, lower static strength", cost_impact_pct: -5, strength_impact_pct: -12, machinability_impact_pct: 5 },
  { original: "Aluminum 7075-T6", alternative: "Aluminum 6061-T6", substitution_type: "DOWNGRADE", notes: "Lower strength, much better availability and weldability", cost_impact_pct: -35, strength_impact_pct: -40, machinability_impact_pct: 15 },
  { original: "SS 316L", alternative: "SS 304", substitution_type: "DOWNGRADE", notes: "Lower corrosion resistance, lower cost", cost_impact_pct: -15, strength_impact_pct: 0, machinability_impact_pct: 5 },
  { original: "SS 316L", alternative: "Duplex 2205", substitution_type: "FUNCTIONAL", notes: "Higher strength, better chloride resistance", cost_impact_pct: 20, strength_impact_pct: 50, machinability_impact_pct: -30 },
  { original: "Tool Steel D2", alternative: "Tool Steel A2", substitution_type: "FUNCTIONAL", notes: "Better toughness, slightly lower wear resistance", cost_impact_pct: -5, strength_impact_pct: -5, machinability_impact_pct: 15 },
  { original: "Tool Steel H13", alternative: "Tool Steel P20", substitution_type: "DOWNGRADE", notes: "Lower hardness, much better machinability, lower cost", cost_impact_pct: -30, strength_impact_pct: -25, machinability_impact_pct: 40 },
  { original: "Steel 4340", alternative: "Steel 4140", substitution_type: "FUNCTIONAL", notes: "Similar properties, slightly lower hardenability", cost_impact_pct: -10, strength_impact_pct: -5, machinability_impact_pct: 10 },
  { original: "Brass C360", alternative: "Brass C353", substitution_type: "DIRECT", notes: "Very similar free-cutting brass", cost_impact_pct: 0, strength_impact_pct: 0, machinability_impact_pct: 0 },
];

// ── Action: src_price ──────────────────────────────────────────────────────

function srcPrice(params: Record<string, unknown>): unknown {
  const materialName = String(params.material || "").toLowerCase();
  const materialId = String(params.material_id || "").toUpperCase();
  const quantity_kg = Number(params.quantity_kg || 100);

  let materials = [...MATERIAL_PRICES];
  if (materialId) materials = materials.filter(m => m.material_id === materialId);
  else if (materialName) materials = materials.filter(m => m.material.toLowerCase().includes(materialName));

  if (materials.length === 0) return { action: "src_price", error: "Material not found." };

  const results = materials.map(mat => {
    const quotes = mat.suppliers.map(s => ({
      supplier_id: s.supplier_id,
      supplier_name: s.supplier_name,
      price_per_kg_usd: s.price_per_kg_usd,
      total_cost_usd: Math.round(s.price_per_kg_usd * quantity_kg * 100) / 100,
      min_order_kg: s.min_order_kg,
      meets_quantity: quantity_kg >= s.min_order_kg,
      lead_time_days: s.lead_time_days,
      in_stock: s.in_stock,
      stock_kg: s.stock_kg,
      can_fulfill: s.in_stock && s.stock_kg >= quantity_kg,
      price_trend: s.price_trend,
      certifications: s.certifications,
    })).sort((a, b) => a.price_per_kg_usd - b.price_per_kg_usd);

    const cheapest = quotes[0];
    const most_expensive = quotes[quotes.length - 1];
    const spread = quotes.length > 1 ? Math.round((most_expensive.price_per_kg_usd - cheapest.price_per_kg_usd) / cheapest.price_per_kg_usd * 100) : 0;

    return {
      material_id: mat.material_id,
      material: mat.material,
      form: mat.form,
      spec: mat.spec,
      quantity_kg,
      quotes,
      best_price: { supplier: cheapest.supplier_name, per_kg: cheapest.price_per_kg_usd, total: cheapest.total_cost_usd },
      price_spread_pct: spread,
    };
  });

  return {
    action: "src_price",
    total_materials: results.length,
    results,
  };
}

// ── Action: src_availability ───────────────────────────────────────────────

function srcAvailability(params: Record<string, unknown>): unknown {
  const materialName = String(params.material || "").toLowerCase();
  const needByDate = String(params.need_by || "2025-07-15");
  const quantity_kg = Number(params.quantity_kg || 100);

  let materials = materialName
    ? MATERIAL_PRICES.filter(m => m.material.toLowerCase().includes(materialName))
    : [...MATERIAL_PRICES];

  const now = new Date("2025-06-15");
  const needBy = new Date(needByDate);
  const daysAvailable = Math.round((needBy.getTime() - now.getTime()) / 86400000);

  const availability = materials.map(mat => {
    const sources = mat.suppliers.map(s => {
      const canDeliver = s.lead_time_days <= daysAvailable;
      const hasStock = s.in_stock && s.stock_kg >= quantity_kg;
      return {
        supplier_id: s.supplier_id,
        supplier_name: s.supplier_name,
        in_stock: s.in_stock,
        stock_kg: s.stock_kg,
        lead_time_days: s.lead_time_days,
        can_deliver_by_date: canDeliver,
        has_sufficient_stock: hasStock,
        status: hasStock && canDeliver ? "AVAILABLE" : canDeliver ? "PARTIAL" : "UNAVAILABLE",
      };
    });

    const available = sources.filter(s => s.status === "AVAILABLE");
    const partial = sources.filter(s => s.status === "PARTIAL");

    return {
      material_id: mat.material_id,
      material: mat.material,
      form: mat.form,
      quantity_needed_kg: quantity_kg,
      need_by: needByDate,
      days_available: daysAvailable,
      sources,
      overall_status: available.length > 0 ? "AVAILABLE" : partial.length > 0 ? "PARTIAL" : "UNAVAILABLE",
      available_sources: available.length,
      total_sources: sources.length,
    };
  });

  const available = availability.filter(a => a.overall_status === "AVAILABLE");
  const atRisk = availability.filter(a => a.overall_status !== "AVAILABLE");

  return {
    action: "src_availability",
    need_by: needByDate,
    quantity_kg,
    total_materials: availability.length,
    availability,
    summary: {
      available: available.length,
      partial: availability.filter(a => a.overall_status === "PARTIAL").length,
      unavailable: availability.filter(a => a.overall_status === "UNAVAILABLE").length,
      at_risk_materials: atRisk.map(a => a.material),
    },
  };
}

// ── Action: src_alternative ────────────────────────────────────────────────

function srcAlternative(params: Record<string, unknown>): unknown {
  const materialName = String(params.material || "").toLowerCase();
  const prioritize = String(params.prioritize || "cost").toLowerCase(); // cost, availability, machinability

  if (!materialName) return { action: "src_alternative", error: "Provide a material name." };

  const matches = ALTERNATIVES.filter(a => a.original.toLowerCase().includes(materialName));

  if (matches.length === 0) {
    return { action: "src_alternative", material: materialName, total_alternatives: 0, alternatives: [], message: "No alternatives found for this material." };
  }

  const scored = matches.map(alt => {
    // Find pricing for the alternative
    const altPricing = MATERIAL_PRICES.find(m => m.material.toLowerCase().includes(alt.alternative.toLowerCase()));
    const bestPrice = altPricing?.suppliers.sort((a, b) => a.price_per_kg_usd - b.price_per_kg_usd)[0];
    const inStock = altPricing?.suppliers.some(s => s.in_stock) || false;

    let priorityScore = 0;
    if (prioritize === "cost") priorityScore = -alt.cost_impact_pct;
    else if (prioritize === "availability") priorityScore = inStock ? 100 : 0;
    else if (prioritize === "machinability") priorityScore = alt.machinability_impact_pct;

    return {
      ...alt,
      price_per_kg_usd: bestPrice?.price_per_kg_usd || null,
      in_stock: inStock,
      lead_time_days: bestPrice?.lead_time_days || null,
      priority_score: priorityScore,
    };
  }).sort((a, b) => b.priority_score - a.priority_score);

  return {
    action: "src_alternative",
    original_material: materialName,
    prioritize,
    total_alternatives: scored.length,
    alternatives: scored.map(a => ({
      alternative: a.alternative,
      substitution_type: a.substitution_type,
      notes: a.notes,
      cost_impact_pct: a.cost_impact_pct,
      strength_impact_pct: a.strength_impact_pct,
      machinability_impact_pct: a.machinability_impact_pct,
      estimated_price_per_kg: a.price_per_kg_usd,
      available_in_stock: a.in_stock,
      estimated_lead_time_days: a.lead_time_days,
    })),
  };
}

// ── Action: src_optimize ───────────────────────────────────────────────────

function srcOptimize(params: Record<string, unknown>): unknown {
  const materialName = String(params.material || "").toLowerCase();
  const quantity_kg = Number(params.quantity_kg || 100);
  const needByDays = Number(params.need_by_days || 14);
  const requireCert = String(params.require_certification || "").toUpperCase();
  const optimizeFor = String(params.optimize_for || "cost").toLowerCase(); // cost, speed, quality

  let materials = materialName
    ? MATERIAL_PRICES.filter(m => m.material.toLowerCase().includes(materialName))
    : [...MATERIAL_PRICES];

  const optimized = materials.map(mat => {
    let candidates = mat.suppliers.filter(s => s.in_stock && s.stock_kg >= quantity_kg);
    if (requireCert) candidates = candidates.filter(s => s.certifications.some(c => c.includes(requireCert)));
    candidates = candidates.filter(s => s.lead_time_days <= needByDays);

    const scored = candidates.map(s => {
      let score = 0;
      if (optimizeFor === "cost") score = 100 - (s.price_per_kg_usd / 100 * 50);
      else if (optimizeFor === "speed") score = 100 - (s.lead_time_days / needByDays * 50);
      else score = s.certifications.length * 20 + (100 - s.price_per_kg_usd);
      return { ...s, optimization_score: Math.round(score) };
    }).sort((a, b) => b.optimization_score - a.optimization_score);

    return {
      material_id: mat.material_id,
      material: mat.material,
      form: mat.form,
      spec: mat.spec,
      quantity_kg,
      feasible_sources: scored.length,
      recommended: scored[0] ? {
        supplier_id: scored[0].supplier_id,
        supplier_name: scored[0].supplier_name,
        price_per_kg_usd: scored[0].price_per_kg_usd,
        total_cost_usd: Math.round(scored[0].price_per_kg_usd * quantity_kg * 100) / 100,
        lead_time_days: scored[0].lead_time_days,
        certifications: scored[0].certifications,
        optimization_score: scored[0].optimization_score,
      } : null,
      alternatives: scored.slice(1, 4).map(s => ({
        supplier_name: s.supplier_name,
        price_per_kg_usd: s.price_per_kg_usd,
        lead_time_days: s.lead_time_days,
      })),
    };
  });

  const fulfilled = optimized.filter(o => o.recommended);
  const totalCost = fulfilled.reduce((s, o) => s + (o.recommended?.total_cost_usd || 0), 0);

  return {
    action: "src_optimize",
    constraints: { quantity_kg, need_by_days: needByDays, certification: requireCert || "any", optimize_for: optimizeFor },
    total_materials: optimized.length,
    optimized,
    summary: {
      materials_fulfilled: fulfilled.length,
      materials_unfulfilled: optimized.length - fulfilled.length,
      total_estimated_cost_usd: Math.round(totalCost * 100) / 100,
      avg_lead_time_days: fulfilled.length > 0 ? Math.round(fulfilled.reduce((s, o) => s + (o.recommended?.lead_time_days || 0), 0) / fulfilled.length) : 0,
    },
  };
}

// ── Public Entry Point ─────────────────────────────────────────────────────

export function executeMaterialSourcingAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "src_price":
      return srcPrice(params);
    case "src_availability":
      return srcAvailability(params);
    case "src_alternative":
      return srcAlternative(params);
    case "src_optimize":
      return srcOptimize(params);
    default:
      throw new Error(`Unknown MaterialSourcingEngine action: ${action}`);
  }
}
