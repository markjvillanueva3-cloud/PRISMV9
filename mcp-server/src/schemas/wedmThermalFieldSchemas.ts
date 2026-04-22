/**
 * Zod schemas for WEDM Thermal Field Engine actions
 * @milestone WEDM-NEXT-MS0
 * @unit U-WN05
 */
import { z } from "zod";

const ThermalParametersSchema = z.object({
  gapVoltage: z.number().min(10).max(150).describe("Gap voltage in V"),
  pulseOnTime: z.number().min(0.5).max(100).describe("Pulse on time in µs"),
  pulseOffTime: z.number().min(5).max(200).describe("Pulse off time in µs"),
  peakCurrent: z.number().min(1).max(500).optional().describe("Peak current in A (derived if not provided)"),
  flushingPressure: z.number().min(0.1).max(3).optional().describe("Flushing pressure in MPa"),
  wireSpeed: z.number().min(1).max(30).optional().describe("Wire speed in m/min"),
});

const MaterialThermalPropsSchema = z.object({
  name: z.string().describe("Material name"),
  thermalConductivity: z.number().positive().describe("Thermal conductivity in W/(m·K)"),
  specificHeat: z.number().positive().describe("Specific heat in J/(kg·K)"),
  density: z.number().positive().describe("Density in kg/m³"),
  meltingPoint: z.number().positive().describe("Melting point in °C"),
  thermalDiffusivity: z.number().positive().optional().describe("Thermal diffusivity in m²/s"),
});

const ThermalFieldResultSchema = z.object({
  peakTemperature: z.number().describe("Peak temperature at spark center in °C"),
  meltPoolRadius: z.number().describe("Melt pool radius in µm"),
  hazDepth: z.number().describe("Heat affected zone depth in µm"),
  recastEstimate: z.number().describe("Estimated recast layer thickness in µm"),
  energyBalance: z.object({
    totalEnergy: z.number().describe("Total pulse energy in mJ"),
    workpieceFraction: z.number().describe("Fraction absorbed by workpiece"),
    wireFraction: z.number().describe("Fraction absorbed by wire"),
    dielectricFraction: z.number().describe("Fraction lost to dielectric"),
  }),
  warnings: z.array(z.string()).optional().describe("Any warnings about parameters"),
});

const TransientResultSchema = z.object({
  timeSteps: z.array(z.number()).describe("Time points in µs"),
  temperatures: z.array(z.number()).describe("Temperature at each time step in °C"),
  coolingRate: z.number().describe("Average cooling rate in °C/µs"),
  thermalCycleCount: z.number().describe("Number of thermal cycles analyzed"),
  peakTemperatureHistory: z.array(z.number()).describe("Peak temp per pulse"),
  steadyStateReached: z.boolean().describe("Whether steady state was reached"),
});

export const WEDM_THERMAL_FIELD_SCHEMAS: Record<string, z.ZodTypeAny> = {
  wedm_thermal_field: z.object({
    material: z.string().describe("Material name (e.g., 'steel', 'd2', 'inconel')"),
    parameters: ThermalParametersSchema.describe("WEDM cutting parameters"),
    thickness: z.number().positive().optional().default(25).describe("Workpiece thickness in mm"),
    includeTransient: z.boolean().optional().default(false).describe("Include transient analysis"),
  }),

  wedm_thermal_transient: z.object({
    material: z.string().describe("Material name"),
    parameters: ThermalParametersSchema.describe("WEDM cutting parameters"),
    pulseCount: z.number().int().min(1).max(1000).optional().default(10).describe("Number of pulses to simulate"),
    timeResolution: z.number().positive().optional().default(0.1).describe("Time step resolution in µs"),
  }),

  wedm_thermal_recast: z.object({
    material: z.string().describe("Material name"),
    parameters: ThermalParametersSchema.describe("WEDM cutting parameters"),
    passType: z.enum(["roughing", "semi-finish", "finish", "skim"]).optional().default("roughing").describe("Cut pass type"),
    flushingEfficiency: z.number().min(0).max(1).optional().default(0.7).describe("Flushing efficiency factor"),
  }),

  wedm_thermal_validate: z.object({
    material: z.string().describe("Material name"),
    parameters: ThermalParametersSchema.describe("WEDM cutting parameters"),
    targetRecast: z.number().positive().optional().describe("Target max recast layer thickness in µm"),
    targetHAZ: z.number().positive().optional().describe("Target max HAZ depth in µm"),
  }),

  wedm_thermal_materials: z.object({
    category: z.enum(["all", "steel", "aluminum", "copper", "titanium", "superalloy", "carbide"]).optional().default("all").describe("Material category filter"),
  }),

  wedm_thermal_optimize: z.object({
    material: z.string().describe("Material name"),
    targetRecast: z.number().positive().describe("Target recast layer thickness in µm"),
    targetMRR: z.number().positive().optional().describe("Target MRR in mm³/min"),
    constraints: z.object({
      maxGapVoltage: z.number().optional().describe("Max gap voltage in V"),
      maxPulseOnTime: z.number().optional().describe("Max pulse on time in µs"),
      minPulseOffTime: z.number().optional().describe("Min pulse off time in µs"),
    }).optional().describe("Parameter constraints"),
  }),
};
