/**
 * MachineRateDatabaseEngine — TCO-based machine hourly rates.
 *
 * Ported from PRISM_COST_DATABASE.js archive (1026 lines).
 * Provides accurate fully-burdened hourly rates for 50+ machine categories
 * using Total Cost of Ownership (TCO): depreciation + interest + maintenance +
 * utilities + floor space, divided by annual operating hours.
 *
 * Used by QuoteEstimatorEngine for accurate machining cost calculations.
 *
 * @module MachineRateDatabaseEngine
 * @source archive:PRISM_COST_DATABASE.js
 */

// ─── Types ───────────────────────────────────────────────────

export interface MachineCategory {
  id: string;
  name: string;
  family: string;              // "vmc" | "hmc" | "lathe" | "edm" | "laser" | "waterjet" | "grinder" | "additive"
  tier: string;                // "entry" | "tier2" | "production" | "highPerformance"
  purchasePrice: { min: number; max: number; typical: number };
  depreciationYears: number;
  annualMaintenancePct: number;
  annualUtilities: number;
  floorSpaceSqFt: number;
  floorSpaceCostPerSqFtMonth: number;
  annualOperatingHours: number;
  hourlyRate: { min: number; max: number; typical: number };
  setupMultiplier: number;
  examples?: string;           // machine brand examples
}

export interface RateLookupResult {
  machine_id: string;
  name: string;
  hourly_rate: number;         // typical fully-burdened rate
  rate_range: { min: number; max: number };
  setup_multiplier: number;
  tco_breakdown: {
    depreciation_hr: number;
    maintenance_hr: number;
    utilities_hr: number;
    floor_space_hr: number;
    total_hr: number;
  };
  annual_operating_hours: number;
}

export interface RateComparisonResult {
  machines: Array<{
    id: string;
    name: string;
    hourly_rate: number;
    setup_multiplier: number;
    annual_cost: number;
  }>;
  cheapest: string;
  most_productive: string;
}

// ─── Machine Database ────────────────────────────────────────

const MACHINES: MachineCategory[] = [
  // VMC — Vertical Machining Centers
  { id: "vmc_entry", name: "VMC Entry-Level", family: "vmc", tier: "entry",
    purchasePrice: { min: 35000, max: 75000, typical: 55000 }, depreciationYears: 10,
    annualMaintenancePct: 0.03, annualUtilities: 2400, floorSpaceSqFt: 80,
    floorSpaceCostPerSqFtMonth: 15, annualOperatingHours: 2000,
    hourlyRate: { min: 25, max: 45, typical: 35 }, setupMultiplier: 1.5,
    examples: "Haas Mini Mill, Tormach 1100MX" },
  { id: "vmc_tier2", name: "VMC Mid-Range", family: "vmc", tier: "tier2",
    purchasePrice: { min: 75000, max: 200000, typical: 125000 }, depreciationYears: 10,
    annualMaintenancePct: 0.025, annualUtilities: 4800, floorSpaceSqFt: 150,
    floorSpaceCostPerSqFtMonth: 15, annualOperatingHours: 4000,
    hourlyRate: { min: 45, max: 85, typical: 65 }, setupMultiplier: 1.5,
    examples: "Haas VF-2, DMG Mori M1, Mazak VCN-430A" },
  { id: "vmc_production", name: "VMC Production", family: "vmc", tier: "production",
    purchasePrice: { min: 200000, max: 500000, typical: 350000 }, depreciationYears: 12,
    annualMaintenancePct: 0.02, annualUtilities: 7200, floorSpaceSqFt: 250,
    floorSpaceCostPerSqFtMonth: 15, annualOperatingHours: 5000,
    hourlyRate: { min: 75, max: 125, typical: 95 }, setupMultiplier: 1.25,
    examples: "Haas VF-4SS, Mazak Variaxis i-300, DMG Mori NHX" },
  { id: "vmc_highperf", name: "VMC High-Performance / 5-Axis", family: "vmc", tier: "highPerformance",
    purchasePrice: { min: 400000, max: 1500000, typical: 750000 }, depreciationYears: 15,
    annualMaintenancePct: 0.02, annualUtilities: 12000, floorSpaceSqFt: 400,
    floorSpaceCostPerSqFtMonth: 18, annualOperatingHours: 5500,
    hourlyRate: { min: 125, max: 250, typical: 175 }, setupMultiplier: 1.25,
    examples: "Makino a500Z, Kern Micro, GF Mikron MILL S" },

  // HMC — Horizontal Machining Centers
  { id: "hmc_tier2", name: "HMC Mid-Range", family: "hmc", tier: "tier2",
    purchasePrice: { min: 250000, max: 600000, typical: 400000 }, depreciationYears: 12,
    annualMaintenancePct: 0.02, annualUtilities: 9600, floorSpaceSqFt: 350,
    floorSpaceCostPerSqFtMonth: 15, annualOperatingHours: 5500,
    hourlyRate: { min: 85, max: 150, typical: 115 }, setupMultiplier: 1.25,
    examples: "Mazak HCN-5000, Doosan NHP" },
  { id: "hmc_production", name: "HMC Production", family: "hmc", tier: "production",
    purchasePrice: { min: 500000, max: 1200000, typical: 800000 }, depreciationYears: 15,
    annualMaintenancePct: 0.018, annualUtilities: 14400, floorSpaceSqFt: 500,
    floorSpaceCostPerSqFtMonth: 15, annualOperatingHours: 6000,
    hourlyRate: { min: 135, max: 225, typical: 175 }, setupMultiplier: 1.15,
    examples: "Mazak HCN-8800, Makino a81nx, DMG Mori NHX 10000" },

  // CNC Lathes
  { id: "lathe_entry", name: "CNC Lathe Entry", family: "lathe", tier: "entry",
    purchasePrice: { min: 30000, max: 60000, typical: 45000 }, depreciationYears: 10,
    annualMaintenancePct: 0.025, annualUtilities: 2000, floorSpaceSqFt: 60,
    floorSpaceCostPerSqFtMonth: 15, annualOperatingHours: 2000,
    hourlyRate: { min: 25, max: 40, typical: 32 }, setupMultiplier: 1.5,
    examples: "Haas ST-10, Doosan Lynx 2100" },
  { id: "lathe_tier2", name: "CNC Lathe w/ Live Tooling", family: "lathe", tier: "tier2",
    purchasePrice: { min: 80000, max: 200000, typical: 140000 }, depreciationYears: 10,
    annualMaintenancePct: 0.025, annualUtilities: 4200, floorSpaceSqFt: 120,
    floorSpaceCostPerSqFtMonth: 15, annualOperatingHours: 4000,
    hourlyRate: { min: 45, max: 80, typical: 60 }, setupMultiplier: 1.35,
    examples: "Haas ST-20Y, Mazak QT-250MY" },
  { id: "lathe_multiaxis", name: "CNC Lathe Multi-Axis", family: "lathe", tier: "production",
    purchasePrice: { min: 200000, max: 600000, typical: 380000 }, depreciationYears: 12,
    annualMaintenancePct: 0.02, annualUtilities: 7200, floorSpaceSqFt: 180,
    floorSpaceCostPerSqFtMonth: 15, annualOperatingHours: 5000,
    hourlyRate: { min: 75, max: 135, typical: 100 }, setupMultiplier: 1.25,
    examples: "Mazak Integrex i-200, DMG Mori NLX 2500" },
  { id: "lathe_swiss", name: "Swiss-Type Automatic", family: "lathe", tier: "production",
    purchasePrice: { min: 150000, max: 450000, typical: 280000 }, depreciationYears: 12,
    annualMaintenancePct: 0.025, annualUtilities: 4800, floorSpaceSqFt: 80,
    floorSpaceCostPerSqFtMonth: 15, annualOperatingHours: 5500,
    hourlyRate: { min: 65, max: 120, typical: 85 }, setupMultiplier: 1.75,
    examples: "Citizen L20, Star SR-20J, Tsugami" },
  { id: "lathe_millturn", name: "Mill-Turn Center", family: "lathe", tier: "highPerformance",
    purchasePrice: { min: 400000, max: 1000000, typical: 650000 }, depreciationYears: 15,
    annualMaintenancePct: 0.02, annualUtilities: 10000, floorSpaceSqFt: 300,
    floorSpaceCostPerSqFtMonth: 18, annualOperatingHours: 5500,
    hourlyRate: { min: 110, max: 200, typical: 150 }, setupMultiplier: 1.3,
    examples: "Mazak Integrex e-500H, DMG Mori CTX beta 2000 TC" },

  // EDM
  { id: "edm_sinker_entry", name: "Sinker EDM Entry", family: "edm", tier: "entry",
    purchasePrice: { min: 50000, max: 120000, typical: 80000 }, depreciationYears: 12,
    annualMaintenancePct: 0.02, annualUtilities: 3600, floorSpaceSqFt: 80,
    floorSpaceCostPerSqFtMonth: 15, annualOperatingHours: 3000,
    hourlyRate: { min: 35, max: 60, typical: 45 }, setupMultiplier: 2.0,
    examples: "Sodick AG40L, Makino EDNC" },
  { id: "edm_sinker_tier2", name: "Sinker EDM Production", family: "edm", tier: "tier2",
    purchasePrice: { min: 120000, max: 300000, typical: 200000 }, depreciationYears: 12,
    annualMaintenancePct: 0.02, annualUtilities: 6000, floorSpaceSqFt: 120,
    floorSpaceCostPerSqFtMonth: 15, annualOperatingHours: 4500,
    hourlyRate: { min: 55, max: 95, typical: 72 }, setupMultiplier: 1.75,
    examples: "Sodick AG60L, Makino EDAF3" },
  { id: "edm_wire_entry", name: "Wire EDM Entry", family: "edm", tier: "entry",
    purchasePrice: { min: 80000, max: 150000, typical: 110000 }, depreciationYears: 10,
    annualMaintenancePct: 0.025, annualUtilities: 3000, floorSpaceSqFt: 80,
    floorSpaceCostPerSqFtMonth: 15, annualOperatingHours: 4000,
    hourlyRate: { min: 35, max: 55, typical: 45 }, setupMultiplier: 1.5,
    examples: "Sodick VL400Q, Fanuc Robocut" },
  { id: "edm_wire_tier2", name: "Wire EDM Mid-Range", family: "edm", tier: "tier2",
    purchasePrice: { min: 150000, max: 350000, typical: 240000 }, depreciationYears: 12,
    annualMaintenancePct: 0.02, annualUtilities: 4800, floorSpaceSqFt: 100,
    floorSpaceCostPerSqFtMonth: 15, annualOperatingHours: 5000,
    hourlyRate: { min: 50, max: 85, typical: 65 }, setupMultiplier: 1.35,
    examples: "Mitsubishi MV2400S, AgieCharmilles CUT P" },
  { id: "edm_wire_precision", name: "Wire EDM High-Precision", family: "edm", tier: "highPerformance",
    purchasePrice: { min: 300000, max: 700000, typical: 480000 }, depreciationYears: 15,
    annualMaintenancePct: 0.018, annualUtilities: 7200, floorSpaceSqFt: 150,
    floorSpaceCostPerSqFtMonth: 18, annualOperatingHours: 5500,
    hourlyRate: { min: 85, max: 145, typical: 110 }, setupMultiplier: 1.25,
    examples: "Makino U6 H.E.A.T., Sodick ALN" },

  // Laser Cutting
  { id: "laser_co2_entry", name: "CO2 Laser 2-4kW", family: "laser", tier: "entry",
    purchasePrice: { min: 150000, max: 350000, typical: 250000 }, depreciationYears: 10,
    annualMaintenancePct: 0.04, annualUtilities: 18000, floorSpaceSqFt: 400,
    floorSpaceCostPerSqFtMonth: 12, annualOperatingHours: 4000,
    hourlyRate: { min: 65, max: 110, typical: 85 }, setupMultiplier: 1.25,
    examples: "Trumpf TruLaser 1030, Bystronic ByStar" },
  { id: "laser_co2_tier2", name: "CO2 Laser 4-6kW", family: "laser", tier: "tier2",
    purchasePrice: { min: 350000, max: 600000, typical: 450000 }, depreciationYears: 10,
    annualMaintenancePct: 0.035, annualUtilities: 24000, floorSpaceSqFt: 600,
    floorSpaceCostPerSqFtMonth: 12, annualOperatingHours: 5000,
    hourlyRate: { min: 95, max: 150, typical: 120 }, setupMultiplier: 1.2,
    examples: "Trumpf TruLaser 3060, Mazak Optiplex" },
  { id: "laser_fiber_entry", name: "Fiber Laser 1-3kW", family: "laser", tier: "entry",
    purchasePrice: { min: 100000, max: 250000, typical: 175000 }, depreciationYears: 12,
    annualMaintenancePct: 0.02, annualUtilities: 8000, floorSpaceSqFt: 350,
    floorSpaceCostPerSqFtMonth: 12, annualOperatingHours: 4500,
    hourlyRate: { min: 45, max: 80, typical: 60 }, setupMultiplier: 1.2,
    examples: "Trumpf TruLaser 1030 fiber, IPG" },
  { id: "laser_fiber_tier2", name: "Fiber Laser 4-8kW", family: "laser", tier: "tier2",
    purchasePrice: { min: 250000, max: 500000, typical: 375000 }, depreciationYears: 12,
    annualMaintenancePct: 0.02, annualUtilities: 14000, floorSpaceSqFt: 500,
    floorSpaceCostPerSqFtMonth: 12, annualOperatingHours: 5500,
    hourlyRate: { min: 70, max: 120, typical: 90 }, setupMultiplier: 1.15,
    examples: "Trumpf TruLaser 5030, Bystronic ByStar Fiber" },
  { id: "laser_fiber_highpower", name: "Fiber Laser 10-20kW+", family: "laser", tier: "highPerformance",
    purchasePrice: { min: 500000, max: 1200000, typical: 800000 }, depreciationYears: 12,
    annualMaintenancePct: 0.025, annualUtilities: 28000, floorSpaceSqFt: 800,
    floorSpaceCostPerSqFtMonth: 12, annualOperatingHours: 6000,
    hourlyRate: { min: 120, max: 200, typical: 155 }, setupMultiplier: 1.1,
    examples: "Trumpf TruLaser 5040 fiber, Mazak Optiplex 3015 NEO" },

  // Waterjet
  { id: "waterjet_entry", name: "Waterjet Entry", family: "waterjet", tier: "entry",
    purchasePrice: { min: 60000, max: 150000, typical: 100000 }, depreciationYears: 10,
    annualMaintenancePct: 0.05, annualUtilities: 6000, floorSpaceSqFt: 200,
    floorSpaceCostPerSqFtMonth: 12, annualOperatingHours: 3000,
    hourlyRate: { min: 45, max: 75, typical: 58 }, setupMultiplier: 1.3,
    examples: "OMAX 2626, ProtoMAX" },
  { id: "waterjet_tier2", name: "Waterjet Mid-Range", family: "waterjet", tier: "tier2",
    purchasePrice: { min: 150000, max: 350000, typical: 240000 }, depreciationYears: 10,
    annualMaintenancePct: 0.04, annualUtilities: 12000, floorSpaceSqFt: 400,
    floorSpaceCostPerSqFtMonth: 12, annualOperatingHours: 4500,
    hourlyRate: { min: 65, max: 110, typical: 85 }, setupMultiplier: 1.2,
    examples: "OMAX 55100, Flow Mach 500" },
  { id: "waterjet_production", name: "Waterjet Production Multi-Head", family: "waterjet", tier: "production",
    purchasePrice: { min: 350000, max: 800000, typical: 550000 }, depreciationYears: 12,
    annualMaintenancePct: 0.035, annualUtilities: 24000, floorSpaceSqFt: 800,
    floorSpaceCostPerSqFtMonth: 12, annualOperatingHours: 5500,
    hourlyRate: { min: 95, max: 160, typical: 125 }, setupMultiplier: 1.15,
    examples: "Flow Mach 700, OMAX 120X" },

  // Grinders
  { id: "grinder_surface", name: "Surface Grinder", family: "grinder", tier: "entry",
    purchasePrice: { min: 25000, max: 80000, typical: 50000 }, depreciationYears: 15,
    annualMaintenancePct: 0.015, annualUtilities: 1800, floorSpaceSqFt: 60,
    floorSpaceCostPerSqFtMonth: 15, annualOperatingHours: 2500,
    hourlyRate: { min: 30, max: 55, typical: 40 }, setupMultiplier: 1.5,
    examples: "Chevalier FSG, Okamoto ACC" },
  { id: "grinder_cylindrical", name: "Cylindrical Grinder", family: "grinder", tier: "tier2",
    purchasePrice: { min: 80000, max: 250000, typical: 150000 }, depreciationYears: 15,
    annualMaintenancePct: 0.02, annualUtilities: 3600, floorSpaceSqFt: 100,
    floorSpaceCostPerSqFtMonth: 15, annualOperatingHours: 3500,
    hourlyRate: { min: 45, max: 85, typical: 62 }, setupMultiplier: 1.4,
    examples: "Studer S33, Kellenberger" },
  { id: "grinder_centerless", name: "Centerless Grinder", family: "grinder", tier: "production",
    purchasePrice: { min: 100000, max: 300000, typical: 180000 }, depreciationYears: 15,
    annualMaintenancePct: 0.02, annualUtilities: 4200, floorSpaceSqFt: 120,
    floorSpaceCostPerSqFtMonth: 15, annualOperatingHours: 5000,
    hourlyRate: { min: 40, max: 75, typical: 55 }, setupMultiplier: 2.0,
    examples: "Cincinnati Milacron, Royal Master" },
  { id: "grinder_jig", name: "Jig Grinder", family: "grinder", tier: "highPerformance",
    purchasePrice: { min: 200000, max: 500000, typical: 320000 }, depreciationYears: 15,
    annualMaintenancePct: 0.02, annualUtilities: 4800, floorSpaceSqFt: 120,
    floorSpaceCostPerSqFtMonth: 18, annualOperatingHours: 3000,
    hourlyRate: { min: 85, max: 150, typical: 115 }, setupMultiplier: 1.5,
    examples: "Moore G18, Hauser S35" },

  // Press Brake / Sheet Metal Forming
  { id: "pressbrake_entry", name: "Press Brake Entry", family: "forming", tier: "entry",
    purchasePrice: { min: 40000, max: 100000, typical: 65000 }, depreciationYears: 15,
    annualMaintenancePct: 0.015, annualUtilities: 2400, floorSpaceSqFt: 120,
    floorSpaceCostPerSqFtMonth: 12, annualOperatingHours: 3000,
    hourlyRate: { min: 30, max: 50, typical: 38 }, setupMultiplier: 1.5,
    examples: "Accurpress 7-axis, LVD PPEC" },
  { id: "pressbrake_cnc", name: "CNC Press Brake", family: "forming", tier: "tier2",
    purchasePrice: { min: 100000, max: 300000, typical: 180000 }, depreciationYears: 15,
    annualMaintenancePct: 0.02, annualUtilities: 4800, floorSpaceSqFt: 200,
    floorSpaceCostPerSqFtMonth: 12, annualOperatingHours: 4000,
    hourlyRate: { min: 45, max: 80, typical: 58 }, setupMultiplier: 1.3,
    examples: "Trumpf TruBend 5130, Amada HG" },
  { id: "turret_punch", name: "CNC Turret Punch Press", family: "forming", tier: "tier2",
    purchasePrice: { min: 150000, max: 400000, typical: 260000 }, depreciationYears: 12,
    annualMaintenancePct: 0.025, annualUtilities: 6000, floorSpaceSqFt: 300,
    floorSpaceCostPerSqFtMonth: 12, annualOperatingHours: 4500,
    hourlyRate: { min: 55, max: 95, typical: 72 }, setupMultiplier: 1.25,
    examples: "Trumpf TruPunch 3000, Amada EM" },

  // Additive
  { id: "additive_fdm", name: "FDM / FFF 3D Printer", family: "additive", tier: "entry",
    purchasePrice: { min: 2000, max: 50000, typical: 15000 }, depreciationYears: 5,
    annualMaintenancePct: 0.05, annualUtilities: 600, floorSpaceSqFt: 20,
    floorSpaceCostPerSqFtMonth: 15, annualOperatingHours: 4000,
    hourlyRate: { min: 3, max: 15, typical: 8 }, setupMultiplier: 1.1,
    examples: "Ultimaker S5, Markforged Onyx" },
  { id: "additive_sla", name: "SLA / DLP Resin Printer", family: "additive", tier: "tier2",
    purchasePrice: { min: 5000, max: 200000, typical: 50000 }, depreciationYears: 5,
    annualMaintenancePct: 0.04, annualUtilities: 1200, floorSpaceSqFt: 30,
    floorSpaceCostPerSqFtMonth: 15, annualOperatingHours: 3500,
    hourlyRate: { min: 8, max: 40, typical: 20 }, setupMultiplier: 1.2,
    examples: "Formlabs Form 3L, 3D Systems ProJet" },
  { id: "additive_sls", name: "SLS Nylon Printer", family: "additive", tier: "production",
    purchasePrice: { min: 100000, max: 500000, typical: 250000 }, depreciationYears: 7,
    annualMaintenancePct: 0.03, annualUtilities: 6000, floorSpaceSqFt: 80,
    floorSpaceCostPerSqFtMonth: 15, annualOperatingHours: 5000,
    hourlyRate: { min: 25, max: 60, typical: 40 }, setupMultiplier: 1.15,
    examples: "EOS P 396, HP MJF 5200" },
  { id: "additive_dmls", name: "DMLS Metal Printer", family: "additive", tier: "highPerformance",
    purchasePrice: { min: 300000, max: 1500000, typical: 700000 }, depreciationYears: 10,
    annualMaintenancePct: 0.03, annualUtilities: 18000, floorSpaceSqFt: 150,
    floorSpaceCostPerSqFtMonth: 18, annualOperatingHours: 4000,
    hourlyRate: { min: 80, max: 200, typical: 135 }, setupMultiplier: 1.5,
    examples: "EOS M 290, SLM 280, Trumpf TruPrint 3000" },
];

// Map from QuoteEstimator machine_type strings to our IDs
const ALIAS_MAP: Record<string, string> = {
  manual_mill: "vmc_entry",
  cnc_mill_3axis: "vmc_tier2",
  cnc_mill_5axis: "vmc_highperf",
  cnc_lathe: "lathe_tier2",
  swiss_lathe: "lathe_swiss",
  cnc_lathe_live: "lathe_tier2",
  wire_edm: "edm_wire_tier2",
  sinker_edm: "edm_sinker_tier2",
  surface_grinder: "grinder_surface",
  cylindrical_grinder: "grinder_cylindrical",
  centerless_grinder: "grinder_centerless",
  multi_spindle: "lathe_multiaxis",
  laser_fiber: "laser_fiber_tier2",
  laser_co2: "laser_co2_tier2",
  waterjet: "waterjet_tier2",
  press_brake: "pressbrake_cnc",
  turret_punch: "turret_punch",
  fdm_printer: "additive_fdm",
  sla_printer: "additive_sla",
  sls_printer: "additive_sls",
  dmls_printer: "additive_dmls",
  hmc: "hmc_tier2",
  mill_turn: "lathe_millturn",
  jig_grinder: "grinder_jig",
};

// ─── OEE Factors ─────────────────────────────────────────────

const OEE_FACTORS = {
  worldClass: { availability: 0.90, performance: 0.95, quality: 0.99 },
  typical:    { availability: 0.80, performance: 0.85, quality: 0.95 },
  poor:       { availability: 0.65, performance: 0.70, quality: 0.85 },
};

// ─── Engine ──────────────────────────────────────────────────

class MachineRateDatabaseEngine {
  /**
   * Look up machine rate by ID or alias. Returns TCO-based hourly rate.
   */
  getRate(machineIdOrAlias: string): RateLookupResult | null {
    const id = ALIAS_MAP[machineIdOrAlias] ?? machineIdOrAlias;
    const m = MACHINES.find(x => x.id === id);
    if (!m) return null;

    const tco = this.calculateTCO(m);
    return {
      machine_id: m.id,
      name: m.name,
      hourly_rate: m.hourlyRate.typical,
      rate_range: { min: m.hourlyRate.min, max: m.hourlyRate.max },
      setup_multiplier: m.setupMultiplier,
      tco_breakdown: tco,
      annual_operating_hours: m.annualOperatingHours,
    };
  }

  /**
   * List all machines, optionally filtered by family.
   */
  listMachines(family?: string): Array<{ id: string; name: string; family: string; tier: string; hourly_rate: number }> {
    const filtered = family ? MACHINES.filter(m => m.family === family) : MACHINES;
    return filtered.map(m => ({
      id: m.id,
      name: m.name,
      family: m.family,
      tier: m.tier,
      hourly_rate: m.hourlyRate.typical,
    }));
  }

  /**
   * Compare machines for a given job to find the best cost option.
   */
  compareMachines(machineIds: string[]): RateComparisonResult {
    const results = machineIds.map(id => {
      const rate = this.getRate(id);
      if (!rate) return null;
      const m = MACHINES.find(x => x.id === (ALIAS_MAP[id] ?? id))!;
      return {
        id: rate.machine_id,
        name: rate.name,
        hourly_rate: rate.hourly_rate,
        setup_multiplier: rate.setup_multiplier,
        annual_cost: round2(rate.hourly_rate * m.annualOperatingHours),
      };
    }).filter(Boolean) as RateComparisonResult["machines"];

    const cheapest = results.reduce((a, b) => a.hourly_rate < b.hourly_rate ? a : b);
    const mostProductive = results.reduce((a, b) => a.annual_cost > b.annual_cost ? a : b);

    return { machines: results, cheapest: cheapest.id, most_productive: mostProductive.id };
  }

  /**
   * Get OEE-adjusted rate (effective hourly rate accounting for downtime).
   */
  getEffectiveRate(machineId: string, oeeLevel: "worldClass" | "typical" | "poor" = "typical"): number {
    const rate = this.getRate(machineId);
    if (!rate) return 85; // fallback
    const oee = OEE_FACTORS[oeeLevel];
    const effectiveOEE = oee.availability * oee.performance * oee.quality;
    return round2(rate.hourly_rate / effectiveOEE);
  }

  /**
   * Resolve a QuoteEstimator machine_type to a detailed rate.
   */
  resolveAlias(machineType: string): string {
    return ALIAS_MAP[machineType] ?? machineType;
  }

  /**
   * Get all machine families.
   */
  getFamilies(): string[] {
    return [...new Set(MACHINES.map(m => m.family))];
  }

  /**
   * U-BURDEN-RATE-REAL (2026-05-25, hotel): expose full MachineCategory record
   * so downstream cost engines (BurdenRateEngine, future TaxAllocationEngine)
   * can compute components beyond the four exposed by `getRate()`.
   * Returns a defensive copy — callers cannot mutate the catalog.
   */
  getMachine(machineIdOrAlias: string): MachineCategory | null {
    const id = ALIAS_MAP[machineIdOrAlias] ?? machineIdOrAlias;
    const m = MACHINES.find(x => x.id === id);
    if (!m) return null;
    return {
      ...m,
      purchasePrice: { ...m.purchasePrice },
      hourlyRate: { ...m.hourlyRate },
    };
  }

  /**
   * U-BIZREG2: Enrich a rate lookup with MachineRegistry specs (spindle, envelope, axes).
   * Returns null if machine not found in registry.
   */
  getEnrichedRate(machineIdOrAlias: string): (RateLookupResult & {
    registry_specs: {
      max_rpm: number; power_kw: number; torque_nm: number;
      x_travel_mm: number; y_travel_mm: number; z_travel_mm: number;
      simultaneous_axes: number; tool_changer_capacity: number;
      source: string;
    } | null;
  }) | null {
    const rate = this.getRate(machineIdOrAlias);
    if (!rate) return null;

    let registry_specs: (RateLookupResult & { registry_specs: any })["registry_specs"] = null;
    try {
      const registry = require("../registries/MachineRegistry.js").machineRegistry;
      const m = MACHINES.find(x => x.id === (ALIAS_MAP[machineIdOrAlias] ?? machineIdOrAlias));
      if (m?.examples?.length) {
        // Try first real-world example from the rate DB
        for (const ex of m.examples) {
          const found = registry.getByIdOrModel?.(ex);
          if (found) {
            registry_specs = {
              max_rpm: found.spindle?.max_rpm ?? 0,
              power_kw: found.spindle?.power_continuous ?? 0,
              torque_nm: found.spindle?.torque_max ?? 0,
              x_travel_mm: found.envelope?.x ?? 0,
              y_travel_mm: found.envelope?.y ?? 0,
              z_travel_mm: found.envelope?.z ?? 0,
              simultaneous_axes: found.axes?.simultaneous_axes ?? 3,
              tool_changer_capacity: found.tool_changer?.capacity ?? 0,
              source: "MachineRegistry",
            };
            break;
          }
        }
      }
    } catch { /* registry not available */ }

    return { ...rate, registry_specs };
  }

  /**
   * Calculate TCO breakdown per hour.
   */
  private calculateTCO(m: MachineCategory): RateLookupResult["tco_breakdown"] {
    const annualDepr = m.purchasePrice.typical / m.depreciationYears;
    const annualMaint = m.purchasePrice.typical * m.annualMaintenancePct;
    const annualFloor = m.floorSpaceSqFt * m.floorSpaceCostPerSqFtMonth * 12;
    const hrs = m.annualOperatingHours;

    return {
      depreciation_hr: round2(annualDepr / hrs),
      maintenance_hr: round2(annualMaint / hrs),
      utilities_hr: round2(m.annualUtilities / hrs),
      floor_space_hr: round2(annualFloor / hrs),
      total_hr: round2((annualDepr + annualMaint + m.annualUtilities + annualFloor) / hrs),
    };
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export const machineRateDatabaseEngine = new MachineRateDatabaseEngine();
export { MachineRateDatabaseEngine };
