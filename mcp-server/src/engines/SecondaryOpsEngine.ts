/**
 * SecondaryOpsEngine — Comprehensive secondary/outside processing operations catalog.
 *
 * Covers: surface treatments, heat treatment, plating, grinding, EDM, NDT,
 * deburring, balancing, assembly, packaging, and vendor quote management.
 *
 * Each operation has: base cost, lead time, material compatibility, lot/batch pricing,
 * masking cost adder, and vendor directory integration.
 */

// ─── Types ───────────────────────────────────────────────────

export interface SecondaryOperation {
  id: string;
  name: string;
  category: SecondaryOpCategory;
  description: string;
  base_cost_per_part: number;
  min_lot_charge: number;           // minimum charge even for qty 1
  batch_pricing: { min_qty: number; per_part: number }[];
  lead_time_days: number;
  rush_lead_time_days: number;
  rush_multiplier: number;
  compatible_materials: string[];   // empty = all
  incompatible_materials: string[];
  requires_masking: boolean;
  masking_cost_per_part: number;
  spec_references: string[];        // MIL-A-8625, ASTM B633, etc.
  notes: string[];
}

export type SecondaryOpCategory =
  | "surface_treatment"
  | "heat_treatment"
  | "plating"
  | "grinding"
  | "edm"
  | "deburring"
  | "ndt"
  | "coating"
  | "finishing"
  | "assembly"
  | "packaging"
  | "marking";

export interface SecondaryOpQuoteInput {
  operation_id: string;
  quantity: number;
  material?: string;
  requires_masking?: boolean;
  masking_areas?: number;           // number of areas to mask
  rush?: boolean;
  vendor_quote_override?: number;   // actual vendor quote
}

export interface SecondaryOpQuoteResult {
  operation: string;
  category: string;
  quantity: number;
  per_part_cost: number;
  masking_cost: number;
  lot_charge_applied: boolean;
  subtotal: number;
  rush_premium: number;
  total: number;
  lead_time_days: number;
  spec_references: string[];
  warnings: string[];
}

export interface VendorEntry {
  id: string;
  name: string;
  capabilities: string[];         // operation IDs they can perform
  location: string;
  lead_time_days: number;
  min_lot_charge: number;
  quality_rating: number;         // 1-5
  notes: string;
}

// ─── Operations Catalog ──────────────────────────────────────

const OPERATIONS: SecondaryOperation[] = [
  // ── Surface Treatment ──
  {
    id: "anodize_type_ii", name: "Anodize Type II (Decorative)", category: "surface_treatment",
    description: "MIL-A-8625 Type II sulfuric acid anodize, 0.0002-0.001\" build-up",
    base_cost_per_part: 8, min_lot_charge: 75, lead_time_days: 5, rush_lead_time_days: 2, rush_multiplier: 1.5,
    batch_pricing: [{ min_qty: 25, per_part: 6 }, { min_qty: 100, per_part: 4.50 }, { min_qty: 500, per_part: 3 }],
    compatible_materials: ["aluminum_6061", "aluminum_7075", "aluminum_2024"],
    incompatible_materials: ["steel_1018", "steel_4140", "stainless_304", "titanium_gr5"],
    requires_masking: false, masking_cost_per_part: 5,
    spec_references: ["MIL-A-8625 Type II", "AMS 2471"],
    notes: ["Dimensional growth: +0.0002\" per side", "Color options: clear, black, red, blue, gold"],
  },
  {
    id: "anodize_type_iii", name: "Anodize Type III (Hard Coat)", category: "surface_treatment",
    description: "MIL-A-8625 Type III hard anodize, 0.001-0.003\" build-up, 60-70 Rc",
    base_cost_per_part: 15, min_lot_charge: 100, lead_time_days: 7, rush_lead_time_days: 3, rush_multiplier: 1.6,
    batch_pricing: [{ min_qty: 25, per_part: 12 }, { min_qty: 100, per_part: 9 }, { min_qty: 500, per_part: 7 }],
    compatible_materials: ["aluminum_6061", "aluminum_7075", "aluminum_2024"],
    incompatible_materials: ["steel_1018", "stainless_304", "titanium_gr5"],
    requires_masking: false, masking_cost_per_part: 8,
    spec_references: ["MIL-A-8625 Type III", "AMS 2469"],
    notes: ["50% penetration / 50% build-up", "Affects dimensions — tolerance critical parts need pre-machining undersize"],
  },
  {
    id: "passivate", name: "Passivation", category: "surface_treatment",
    description: "Citric or nitric acid passivation per ASTM A967 / QQ-P-35",
    base_cost_per_part: 3, min_lot_charge: 50, lead_time_days: 3, rush_lead_time_days: 1, rush_multiplier: 1.4,
    batch_pricing: [{ min_qty: 50, per_part: 2 }, { min_qty: 200, per_part: 1.50 }],
    compatible_materials: ["stainless_304", "stainless_316", "stainless_17-4"],
    incompatible_materials: ["aluminum_6061", "brass_360"],
    requires_masking: false, masking_cost_per_part: 0,
    spec_references: ["ASTM A967", "QQ-P-35", "AMS 2700"],
    notes: ["No dimensional change", "Citric acid preferred for environmental compliance"],
  },
  {
    id: "black_oxide", name: "Black Oxide", category: "surface_treatment",
    description: "Hot black oxide conversion coating, minimal dimensional change",
    base_cost_per_part: 2.50, min_lot_charge: 40, lead_time_days: 3, rush_lead_time_days: 1, rush_multiplier: 1.3,
    batch_pricing: [{ min_qty: 50, per_part: 1.75 }, { min_qty: 200, per_part: 1.25 }],
    compatible_materials: ["steel_1018", "steel_4140", "steel_4340"],
    incompatible_materials: ["aluminum_6061", "stainless_304", "titanium_gr5"],
    requires_masking: false, masking_cost_per_part: 3,
    spec_references: ["MIL-DTL-13924"],
    notes: ["Minimal corrosion resistance — oil or wax topcoat recommended"],
  },

  // ── Heat Treatment ──
  {
    id: "stress_relief", name: "Stress Relief", category: "heat_treatment",
    description: "Thermal stress relief to reduce residual machining stresses",
    base_cost_per_part: 4, min_lot_charge: 60, lead_time_days: 3, rush_lead_time_days: 1, rush_multiplier: 1.3,
    batch_pricing: [{ min_qty: 25, per_part: 3 }, { min_qty: 100, per_part: 2 }],
    compatible_materials: [], incompatible_materials: [],
    requires_masking: false, masking_cost_per_part: 0,
    spec_references: ["AMS 2759"],
    notes: ["Recommended for tight-tolerance parts before final machining"],
  },
  {
    id: "heat_treat_harden", name: "Through Hardening", category: "heat_treatment",
    description: "Austenitize + quench + temper to target hardness",
    base_cost_per_part: 8, min_lot_charge: 80, lead_time_days: 5, rush_lead_time_days: 2, rush_multiplier: 1.5,
    batch_pricing: [{ min_qty: 25, per_part: 6 }, { min_qty: 100, per_part: 4.50 }],
    compatible_materials: ["steel_4140", "steel_4340"],
    incompatible_materials: ["aluminum_6061", "stainless_304", "plastic_delrin"],
    requires_masking: false, masking_cost_per_part: 0,
    spec_references: ["AMS 2759/1"],
    notes: ["Specify target Rockwell C range", "May cause distortion — finish grind after"],
  },
  {
    id: "case_harden", name: "Case Hardening (Carburizing)", category: "heat_treatment",
    description: "Carburize + quench for hard case / tough core",
    base_cost_per_part: 12, min_lot_charge: 100, lead_time_days: 7, rush_lead_time_days: 3, rush_multiplier: 1.5,
    batch_pricing: [{ min_qty: 25, per_part: 9 }, { min_qty: 100, per_part: 7 }],
    compatible_materials: ["steel_1018", "steel_4140"],
    incompatible_materials: ["aluminum_6061", "stainless_304", "titanium_gr5"],
    requires_masking: true, masking_cost_per_part: 6,
    spec_references: ["AMS 2759/7"],
    notes: ["Specify case depth", "Threads/bores often need copper masking"],
  },
  {
    id: "nitriding", name: "Nitriding", category: "heat_treatment",
    description: "Gas or plasma nitriding for surface hardness without quench distortion",
    base_cost_per_part: 15, min_lot_charge: 120, lead_time_days: 7, rush_lead_time_days: 4, rush_multiplier: 1.4,
    batch_pricing: [{ min_qty: 25, per_part: 12 }, { min_qty: 100, per_part: 9 }],
    compatible_materials: ["steel_4140", "steel_4340", "stainless_17-4"],
    incompatible_materials: ["aluminum_6061", "stainless_304"],
    requires_masking: true, masking_cost_per_part: 8,
    spec_references: ["AMS 2759/10"],
    notes: ["Minimal distortion — ideal for precision parts"],
  },

  // ── Plating ──
  {
    id: "zinc_plate", name: "Zinc Plating", category: "plating",
    description: "Electrolytic zinc plating with chromate conversion",
    base_cost_per_part: 5, min_lot_charge: 60, lead_time_days: 5, rush_lead_time_days: 2, rush_multiplier: 1.5,
    batch_pricing: [{ min_qty: 50, per_part: 3.50 }, { min_qty: 200, per_part: 2.50 }],
    compatible_materials: ["steel_1018", "steel_4140", "steel_4340"],
    incompatible_materials: ["aluminum_6061", "titanium_gr5", "plastic_delrin"],
    requires_masking: false, masking_cost_per_part: 4,
    spec_references: ["ASTM B633", "QQ-Z-325"],
    notes: ["Clear, yellow, or black chromate", "RoHS: trivalent chromate only"],
  },
  {
    id: "nickel_plate", name: "Electroless Nickel Plating", category: "plating",
    description: "Electroless nickel (EN) for uniform coverage and corrosion resistance",
    base_cost_per_part: 10, min_lot_charge: 80, lead_time_days: 7, rush_lead_time_days: 3, rush_multiplier: 1.5,
    batch_pricing: [{ min_qty: 25, per_part: 8 }, { min_qty: 100, per_part: 6 }],
    compatible_materials: ["steel_1018", "steel_4140", "aluminum_6061", "copper_110"],
    incompatible_materials: ["plastic_delrin"],
    requires_masking: false, masking_cost_per_part: 5,
    spec_references: ["MIL-C-26074", "AMS 2404", "ASTM B733"],
    notes: ["Uniform thickness even in recesses", "Can be baked for additional hardness"],
  },
  {
    id: "chrome_plate", name: "Hard Chrome Plating", category: "plating",
    description: "Industrial hard chrome for wear resistance, 0.001-0.010\" build-up",
    base_cost_per_part: 18, min_lot_charge: 120, lead_time_days: 10, rush_lead_time_days: 5, rush_multiplier: 1.6,
    batch_pricing: [{ min_qty: 25, per_part: 14 }, { min_qty: 100, per_part: 11 }],
    compatible_materials: ["steel_1018", "steel_4140", "steel_4340"],
    incompatible_materials: ["aluminum_6061", "titanium_gr5"],
    requires_masking: true, masking_cost_per_part: 10,
    spec_references: ["QQ-C-320", "AMS 2460"],
    notes: ["Hydrogen embrittlement bake required for high-strength steel"],
  },

  // ── Coating ──
  {
    id: "powder_coat", name: "Powder Coating", category: "coating",
    description: "Electrostatic powder coat with oven cure",
    base_cost_per_part: 12, min_lot_charge: 75, lead_time_days: 5, rush_lead_time_days: 2, rush_multiplier: 1.4,
    batch_pricing: [{ min_qty: 25, per_part: 9 }, { min_qty: 100, per_part: 6 }, { min_qty: 500, per_part: 4 }],
    compatible_materials: ["steel_1018", "steel_4140", "aluminum_6061"],
    incompatible_materials: ["plastic_delrin", "plastic_peek"],
    requires_masking: true, masking_cost_per_part: 4,
    spec_references: [],
    notes: ["2-4 mil build-up", "Mask threads, mating surfaces, tight-tolerance bores"],
  },

  // ── Deburring ──
  {
    id: "deburr_manual", name: "Manual Deburring", category: "deburring",
    description: "Hand deburring with files, scrapers, and abrasive tools",
    base_cost_per_part: 2, min_lot_charge: 0, lead_time_days: 0, rush_lead_time_days: 0, rush_multiplier: 1.0,
    batch_pricing: [], compatible_materials: [], incompatible_materials: [],
    requires_masking: false, masking_cost_per_part: 0,
    spec_references: [],
    notes: ["Cost scales with complexity — complex parts may be 3-5x base"],
  },
  {
    id: "deburr_tumble", name: "Vibratory Tumble Deburring", category: "deburring",
    description: "Vibratory media finishing for batch deburring and edge break",
    base_cost_per_part: 1.50, min_lot_charge: 30, lead_time_days: 1, rush_lead_time_days: 0, rush_multiplier: 1.0,
    batch_pricing: [{ min_qty: 50, per_part: 1 }, { min_qty: 200, per_part: 0.75 }],
    compatible_materials: [], incompatible_materials: ["plastic_delrin", "plastic_peek"],
    requires_masking: false, masking_cost_per_part: 0,
    spec_references: [],
    notes: ["Not suitable for precision surfaces", "Can impinge marks on soft materials"],
  },
  {
    id: "bead_blast", name: "Bead Blasting", category: "deburring",
    description: "Glass bead blast for uniform matte finish",
    base_cost_per_part: 3, min_lot_charge: 40, lead_time_days: 1, rush_lead_time_days: 0, rush_multiplier: 1.0,
    batch_pricing: [{ min_qty: 50, per_part: 2 }, { min_qty: 200, per_part: 1.50 }],
    compatible_materials: [], incompatible_materials: [],
    requires_masking: true, masking_cost_per_part: 3,
    spec_references: ["MIL-STD-852"],
    notes: ["Mask precision surfaces", "Creates uniform satin finish"],
  },

  // ── NDT ──
  {
    id: "ndt_dye_penetrant", name: "Dye Penetrant Inspection (FPI)", category: "ndt",
    description: "Fluorescent penetrant inspection for surface cracks",
    base_cost_per_part: 8, min_lot_charge: 75, lead_time_days: 2, rush_lead_time_days: 1, rush_multiplier: 1.3,
    batch_pricing: [{ min_qty: 25, per_part: 6 }, { min_qty: 100, per_part: 4 }],
    compatible_materials: [], incompatible_materials: [],
    requires_masking: false, masking_cost_per_part: 0,
    spec_references: ["ASTM E1417", "MIL-STD-1907"],
    notes: ["Parts must be clean and free of coatings before inspection"],
  },
  {
    id: "ndt_mag_particle", name: "Magnetic Particle Inspection (MPI)", category: "ndt",
    description: "Magnetic particle inspection for ferromagnetic materials",
    base_cost_per_part: 10, min_lot_charge: 80, lead_time_days: 2, rush_lead_time_days: 1, rush_multiplier: 1.3,
    batch_pricing: [{ min_qty: 25, per_part: 7 }, { min_qty: 100, per_part: 5 }],
    compatible_materials: ["steel_1018", "steel_4140", "steel_4340"],
    incompatible_materials: ["aluminum_6061", "stainless_304", "titanium_gr5", "brass_360"],
    requires_masking: false, masking_cost_per_part: 0,
    spec_references: ["ASTM E1444", "MIL-STD-1949"],
    notes: ["Only for ferromagnetic materials", "Demagnetization after inspection"],
  },

  // ── Marking ──
  {
    id: "laser_engrave", name: "Laser Engraving/Marking", category: "marking",
    description: "Fiber or CO2 laser marking for part identification",
    base_cost_per_part: 4, min_lot_charge: 50, lead_time_days: 1, rush_lead_time_days: 0, rush_multiplier: 1.0,
    batch_pricing: [{ min_qty: 50, per_part: 2.50 }, { min_qty: 200, per_part: 1.75 }],
    compatible_materials: [], incompatible_materials: [],
    requires_masking: false, masking_cost_per_part: 0,
    spec_references: ["MIL-STD-130"],
    notes: ["UID/2D data matrix for defense", "Depth: 0.001-0.005\""],
  },

  // ── Grinding ──
  {
    id: "grinding_surface", name: "Surface Grinding", category: "grinding",
    description: "Precision surface grinding for flatness and finish",
    base_cost_per_part: 10, min_lot_charge: 75, lead_time_days: 2, rush_lead_time_days: 1, rush_multiplier: 1.4,
    batch_pricing: [{ min_qty: 25, per_part: 8 }, { min_qty: 100, per_part: 6 }],
    compatible_materials: [], incompatible_materials: ["plastic_delrin", "plastic_nylon"],
    requires_masking: false, masking_cost_per_part: 0,
    spec_references: [],
    notes: ["Achieves Ra 0.2-0.8 um", "Flatness to 0.005mm"],
  },
  {
    id: "grinding_cylindrical", name: "Cylindrical Grinding", category: "grinding",
    description: "OD/ID cylindrical grinding for concentricity and finish",
    base_cost_per_part: 12, min_lot_charge: 80, lead_time_days: 3, rush_lead_time_days: 1, rush_multiplier: 1.4,
    batch_pricing: [{ min_qty: 25, per_part: 9 }, { min_qty: 100, per_part: 7 }],
    compatible_materials: [], incompatible_materials: ["plastic_delrin"],
    requires_masking: false, masking_cost_per_part: 0,
    spec_references: [],
    notes: ["Achieves IT5-IT6 tolerance grades"],
  },
  {
    id: "honing", name: "Honing", category: "grinding",
    description: "Bore honing for precise ID finish and size",
    base_cost_per_part: 15, min_lot_charge: 100, lead_time_days: 3, rush_lead_time_days: 2, rush_multiplier: 1.5,
    batch_pricing: [{ min_qty: 25, per_part: 12 }, { min_qty: 100, per_part: 9 }],
    compatible_materials: [], incompatible_materials: [],
    requires_masking: false, masking_cost_per_part: 0,
    spec_references: [],
    notes: ["Cross-hatch finish for oil retention", "Ra 0.1-0.4 um achievable"],
  },
  {
    id: "lapping", name: "Lapping", category: "grinding",
    description: "Precision lapping for extreme flatness and finish",
    base_cost_per_part: 20, min_lot_charge: 120, lead_time_days: 5, rush_lead_time_days: 3, rush_multiplier: 1.6,
    batch_pricing: [{ min_qty: 10, per_part: 18 }, { min_qty: 50, per_part: 15 }],
    compatible_materials: [], incompatible_materials: [],
    requires_masking: false, masking_cost_per_part: 0,
    spec_references: [],
    notes: ["Flatness to 0.001mm", "Ra < 0.05 um achievable", "Very slow — high cost"],
  },
];

// ─── Vendor Directory ────────────────────────────────────────

const VENDORS: VendorEntry[] = [
  { id: "V-001", name: "Advanced Plating", capabilities: ["zinc_plate", "nickel_plate", "chrome_plate"], location: "Local", lead_time_days: 5, min_lot_charge: 60, quality_rating: 4, notes: "NADCAP accredited" },
  { id: "V-002", name: "Pacific Anodize", capabilities: ["anodize_type_ii", "anodize_type_iii", "passivate", "black_oxide"], location: "Local", lead_time_days: 5, min_lot_charge: 75, quality_rating: 5, notes: "MIL-spec qualified" },
  { id: "V-003", name: "Thermal Tech", capabilities: ["stress_relief", "heat_treat_harden", "case_harden", "nitriding"], location: "Regional", lead_time_days: 5, min_lot_charge: 80, quality_rating: 4, notes: "AMS 2750 pyrometry" },
  { id: "V-004", name: "NDT Solutions", capabilities: ["ndt_dye_penetrant", "ndt_mag_particle"], location: "Local", lead_time_days: 2, min_lot_charge: 75, quality_rating: 5, notes: "ASNT Level III certified" },
  { id: "V-005", name: "Precision Grind", capabilities: ["grinding_surface", "grinding_cylindrical", "honing", "lapping"], location: "Local", lead_time_days: 3, min_lot_charge: 75, quality_rating: 5, notes: "0.0001\" capable" },
];

// ─── Engine ──────────────────────────────────────────────────

class SecondaryOpsEngine {
  /** Get all available operations. */
  listOperations(category?: SecondaryOpCategory): SecondaryOperation[] {
    if (category) return OPERATIONS.filter(o => o.category === category);
    return [...OPERATIONS];
  }

  /** Get a specific operation by ID. */
  getOperation(id: string): SecondaryOperation | undefined {
    return OPERATIONS.find(o => o.id === id);
  }

  /** List all categories with counts. */
  listCategories(): Array<{ category: string; count: number }> {
    const map = new Map<string, number>();
    for (const op of OPERATIONS) {
      map.set(op.category, (map.get(op.category) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([category, count]) => ({ category, count }));
  }

  /** Quote a secondary operation for given quantity and material. */
  quote(input: SecondaryOpQuoteInput): SecondaryOpQuoteResult {
    const op = OPERATIONS.find(o => o.id === input.operation_id);
    if (!op) throw new Error(`Unknown secondary operation: ${input.operation_id}`);

    const warnings: string[] = [];
    const mat = input.material?.toLowerCase() ?? "";

    // Material compatibility check
    if (op.incompatible_materials.length > 0 && op.incompatible_materials.includes(mat)) {
      warnings.push(`${op.name} is NOT compatible with ${mat} — confirm with vendor`);
    }
    if (op.compatible_materials.length > 0 && !op.compatible_materials.includes(mat)) {
      warnings.push(`${op.name} may not be compatible with ${mat} — verify before ordering`);
    }

    // Per-part cost (batch pricing)
    let perPart = op.base_cost_per_part;
    if (input.vendor_quote_override != null) {
      perPart = round2(input.vendor_quote_override / Math.max(input.quantity, 1));
    } else {
      for (const tier of op.batch_pricing) {
        if (input.quantity >= tier.min_qty) perPart = tier.per_part;
      }
    }

    // Masking cost
    let maskingCost = 0;
    if (input.requires_masking || op.requires_masking) {
      const areas = input.masking_areas ?? 1;
      maskingCost = round2(op.masking_cost_per_part * areas * input.quantity);
    }

    // Subtotal with min lot charge
    let subtotal = round2(perPart * input.quantity + maskingCost);
    const lotChargeApplied = subtotal < op.min_lot_charge;
    if (lotChargeApplied) subtotal = op.min_lot_charge + maskingCost;

    // Rush premium
    let rushPremium = 0;
    const leadDays = input.rush ? op.rush_lead_time_days : op.lead_time_days;
    if (input.rush) {
      rushPremium = round2(subtotal * (op.rush_multiplier - 1));
    }

    return {
      operation: op.name,
      category: op.category,
      quantity: input.quantity,
      per_part_cost: perPart,
      masking_cost: maskingCost,
      lot_charge_applied: lotChargeApplied,
      subtotal,
      rush_premium: rushPremium,
      total: round2(subtotal + rushPremium),
      lead_time_days: leadDays,
      spec_references: op.spec_references,
      warnings,
    };
  }

  /** Quote multiple operations for a job. */
  quoteBatch(
    operations: SecondaryOpQuoteInput[],
  ): { quotes: SecondaryOpQuoteResult[]; total: number; max_lead_days: number } {
    const quotes = operations.map(o => this.quote(o));
    return {
      quotes,
      total: round2(quotes.reduce((s, q) => s + q.total, 0)),
      max_lead_days: Math.max(0, ...quotes.map(q => q.lead_time_days)),
    };
  }

  /** Find vendors capable of performing an operation. */
  findVendors(operationId: string): VendorEntry[] {
    return VENDORS.filter(v => v.capabilities.includes(operationId));
  }

  /** Get compatible operations for a material. */
  compatibleOps(material: string): SecondaryOperation[] {
    const mat = material.toLowerCase();
    return OPERATIONS.filter(op => {
      if (op.incompatible_materials.includes(mat)) return false;
      if (op.compatible_materials.length === 0) return true;
      return op.compatible_materials.includes(mat);
    });
  }

  /** Recommend operations for a material + application. */
  recommend(material: string, application: string): SecondaryOperation[] {
    const mat = material.toLowerCase();
    const app = application.toLowerCase();
    const compatible = this.compatibleOps(mat);

    // Filter by application keywords
    const keywords: Record<string, string[]> = {
      corrosion: ["passivate", "anodize_type_ii", "anodize_type_iii", "zinc_plate", "nickel_plate", "black_oxide"],
      wear: ["anodize_type_iii", "chrome_plate", "nitriding", "heat_treat_harden", "case_harden"],
      cosmetic: ["anodize_type_ii", "powder_coat", "bead_blast", "nickel_plate"],
      precision: ["stress_relief", "grinding_surface", "grinding_cylindrical", "honing", "lapping"],
      identification: ["laser_engrave"],
      inspection: ["ndt_dye_penetrant", "ndt_mag_particle"],
      strength: ["heat_treat_harden", "case_harden", "nitriding"],
    };

    const matchIds = keywords[app] ?? [];
    if (matchIds.length === 0) return compatible;
    return compatible.filter(op => matchIds.includes(op.id));
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export const secondaryOpsEngine = new SecondaryOpsEngine();
export { SecondaryOpsEngine };
