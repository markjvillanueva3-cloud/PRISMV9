/**
 * SustainCarbonEngine — Carbon Footprint Tracking
 * =================================================
 *
 * Tracks and calculates carbon footprint for machining operations
 * including direct emissions, indirect energy, and embodied carbon.
 *
 * L2-P4-MS1/P0-U05 — Batch 9: Sustainability
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const CarbonInputSchema = z.object({
  energyKwh: z.number().min(0),
  coolantLiters: z.number().min(0).default(0),
  coolantType: z.enum(["mineral", "synthetic", "semi_synthetic", "mql", "dry"]).default("synthetic"),
  materialKg: z.number().min(0),
  materialType: z.enum(["aluminum", "steel", "stainless", "titanium", "cast_iron", "brass", "plastic"]),
  chipKg: z.number().min(0).default(0),
  chipRecycled: z.boolean().default(true),
  toolChanges: z.number().int().min(0).default(0),
  toolMaterial: z.enum(["hss", "carbide", "ceramic", "cbn", "pcd"]).default("carbide"),
  transportKm: z.number().min(0).default(0),
  gridRegion: z.enum(["us_avg", "eu_avg", "china", "renewable", "coal_heavy"]).default("us_avg"),
});

export const CarbonOutputSchema = z.object({
  totalCarbonKgCO2e: z.number(),
  breakdown: z.object({
    electricity: z.number(),
    coolant: z.number(),
    material: z.number(),
    tooling: z.number(),
    transport: z.number(),
    waste: z.number(),
  }),
  breakdownPercent: z.object({
    electricity: z.number(),
    coolant: z.number(),
    material: z.number(),
    tooling: z.number(),
    transport: z.number(),
    waste: z.number(),
  }),
  materialUtilization: z.number(),
  carbonIntensity: z.number(),
  offsetRequired: z.object({
    treesPerYear: z.number(),
    carbonCredits: z.number(),
  }),
  recommendations: z.array(z.string()),
  rating: z.enum(["A", "B", "C", "D", "F"]),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CarbonInput = z.infer<typeof CarbonInputSchema>;
export type CarbonOutput = z.infer<typeof CarbonOutputSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

// Grid carbon intensity (kg CO2e per kWh)
const GRID_INTENSITY: Record<string, number> = {
  us_avg: 0.42,
  eu_avg: 0.30,
  china: 0.58,
  renewable: 0.05,
  coal_heavy: 0.95,
};

// Material embodied carbon (kg CO2e per kg)
const MATERIAL_CARBON: Record<string, number> = {
  aluminum: 8.0,
  steel: 1.8,
  stainless: 6.0,
  titanium: 35.0,
  cast_iron: 1.5,
  brass: 3.5,
  plastic: 3.0,
};

// Coolant carbon (kg CO2e per liter)
const COOLANT_CARBON: Record<string, number> = {
  mineral: 0.8,
  semi_synthetic: 0.5,
  synthetic: 0.3,
  mql: 0.1,
  dry: 0,
};

// Tool carbon (kg CO2e per tool change)
const TOOL_CARBON: Record<string, number> = {
  hss: 0.5,
  carbide: 2.0,
  ceramic: 3.0,
  cbn: 5.0,
  pcd: 8.0,
};

// Transport carbon (kg CO2e per km per kg)
const TRANSPORT_CARBON = 0.0001;

// Carbon offset benchmarks
const TREE_ABSORPTION_PER_YEAR = 22; // kg CO2 per tree per year
const CARBON_CREDIT_PRICE = 25; // USD per tonne CO2e

// ─── Engine ───────────────────────────────────────────────────────────────────

export class SustainCarbonEngine {
  /**
   * Calculate carbon footprint
   */
  static calculate(input: CarbonInput): CarbonOutput {
    const validated = CarbonInputSchema.parse(input);
    const recommendations: string[] = [];

    // Calculate each source
    const gridIntensity = GRID_INTENSITY[validated.gridRegion];
    const electricityCarbon = validated.energyKwh * gridIntensity;

    const coolantCarbon = validated.coolantLiters * COOLANT_CARBON[validated.coolantType];

    // Material carbon (embodied - adjusted for recycling)
    const materialFactor = MATERIAL_CARBON[validated.materialType];
    const netMaterialKg = validated.materialKg - (validated.chipRecycled ? validated.chipKg * 0.7 : 0);
    const materialCarbon = netMaterialKg * materialFactor;

    const toolingCarbon = validated.toolChanges * TOOL_CARBON[validated.toolMaterial];

    const transportCarbon = validated.transportKm * validated.materialKg * TRANSPORT_CARBON;

    // Waste carbon (non-recycled chips + coolant disposal)
    const wasteChipCarbon = validated.chipRecycled ? 0 : validated.chipKg * materialFactor * 0.2;
    const wasteCoolantCarbon = validated.coolantLiters * 0.1; // Disposal impact
    const wasteCarbon = wasteChipCarbon + wasteCoolantCarbon;

    // Total
    const totalCarbon = electricityCarbon + coolantCarbon + materialCarbon +
      toolingCarbon + transportCarbon + wasteCarbon;

    // Percentages
    const percentages = {
      electricity: (electricityCarbon / totalCarbon) * 100,
      coolant: (coolantCarbon / totalCarbon) * 100,
      material: (materialCarbon / totalCarbon) * 100,
      tooling: (toolingCarbon / totalCarbon) * 100,
      transport: (transportCarbon / totalCarbon) * 100,
      waste: (wasteCarbon / totalCarbon) * 100,
    };

    // Material utilization
    const materialUtilization = validated.materialKg > 0
      ? ((validated.materialKg - validated.chipKg) / validated.materialKg) * 100
      : 100;

    // Carbon intensity (kg CO2e per kg of finished part)
    const finishedPartKg = validated.materialKg - validated.chipKg;
    const carbonIntensity = finishedPartKg > 0 ? totalCarbon / finishedPartKg : 0;

    // Offset calculations
    const treesPerYear = Math.ceil(totalCarbon / TREE_ABSORPTION_PER_YEAR);
    const carbonCredits = (totalCarbon / 1000) * CARBON_CREDIT_PRICE;

    // Rating based on carbon intensity
    let rating: CarbonOutput["rating"];
    if (carbonIntensity < 2) rating = "A";
    else if (carbonIntensity < 5) rating = "B";
    else if (carbonIntensity < 10) rating = "C";
    else if (carbonIntensity < 20) rating = "D";
    else rating = "F";

    // Recommendations
    if (percentages.electricity > 40 && validated.gridRegion !== "renewable") {
      recommendations.push("Consider renewable energy sources to reduce electricity carbon");
    }
    if (percentages.material > 30 && materialUtilization < 60) {
      recommendations.push("Low material utilization - consider near-net-shape blanks");
    }
    if (validated.coolantType === "mineral") {
      recommendations.push("Switch to synthetic or MQL coolant for lower carbon impact");
    }
    if (!validated.chipRecycled) {
      recommendations.push("Implement chip recycling program - significant carbon savings");
    }
    if (percentages.tooling > 15) {
      recommendations.push("High tooling carbon - optimize tool life and consider reconditioning");
    }
    if (validated.materialType === "titanium") {
      recommendations.push("Titanium has high embodied carbon - maximize material utilization");
    }

    return CarbonOutputSchema.parse({
      totalCarbonKgCO2e: Math.round(totalCarbon * 1000) / 1000,
      breakdown: {
        electricity: Math.round(electricityCarbon * 1000) / 1000,
        coolant: Math.round(coolantCarbon * 1000) / 1000,
        material: Math.round(materialCarbon * 1000) / 1000,
        tooling: Math.round(toolingCarbon * 1000) / 1000,
        transport: Math.round(transportCarbon * 1000) / 1000,
        waste: Math.round(wasteCarbon * 1000) / 1000,
      },
      breakdownPercent: {
        electricity: Math.round(percentages.electricity * 10) / 10,
        coolant: Math.round(percentages.coolant * 10) / 10,
        material: Math.round(percentages.material * 10) / 10,
        tooling: Math.round(percentages.tooling * 10) / 10,
        transport: Math.round(percentages.transport * 10) / 10,
        waste: Math.round(percentages.waste * 10) / 10,
      },
      materialUtilization: Math.round(materialUtilization * 10) / 10,
      carbonIntensity: Math.round(carbonIntensity * 100) / 100,
      offsetRequired: {
        treesPerYear,
        carbonCredits: Math.round(carbonCredits * 100) / 100,
      },
      recommendations,
      rating,
    });
  }

  /**
   * Get grid carbon intensity
   */
  static getGridIntensity(region: CarbonInput["gridRegion"]): number {
    return GRID_INTENSITY[region];
  }

  /**
   * Get material embodied carbon
   */
  static getMaterialCarbon(material: CarbonInput["materialType"]): number {
    return MATERIAL_CARBON[material];
  }

  static getSelfAwareness() {
    return {
      name: "SustainCarbonEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U05",
      capabilities: ["calculate", "getGridIntensity", "getMaterialCarbon"],
      gridRegions: Object.keys(GRID_INTENSITY),
      materialTypes: Object.keys(MATERIAL_CARBON),
      ratings: ["A", "B", "C", "D", "F"],
      dependencies: [],
    };
  }
}

export const sustainCarbonEngine = new SustainCarbonEngine();
