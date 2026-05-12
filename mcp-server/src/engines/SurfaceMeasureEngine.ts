/**
 * SurfaceMeasureEngine — Surface Measurement Data
 * ================================================
 *
 * Manages surface finish and roughness measurement data
 * from profilometers and surface analyzers.
 *
 * L2-P4-MS1/P0-U02 — Batch 4: Measurement & QC Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const RoughnessParameterSchema = z.enum([
  "Ra", "Rz", "Rq", "Rt", "Rp", "Rv", "Rsk", "Rku", "Rsm", "Rpc",
  "Sa", "Sz", "Sq", "Sp", "Sv", "Ssk", "Sku"
]);

export const SurfaceMeasurementSchema = z.object({
  id: z.string(),
  partNumber: z.string(),
  serialNumber: z.string().optional(),
  featureName: z.string(),
  location: z.string(),
  parameters: z.record(z.number()),
  cutoffLength: z.number(),
  evaluationLength: z.number(),
  traverseSpeed: z.number().optional(),
  filterType: z.enum(["gaussian", "2rc", "pc75", "none"]).default("gaussian"),
  measuredAt: z.string(),
  instrumentId: z.string(),
  operatorId: z.string().optional(),
  specification: z.object({
    parameter: RoughnessParameterSchema,
    nominal: z.number().optional(),
    maxValue: z.number(),
    unit: z.enum(["um", "uin"]),
  }).optional(),
  inSpec: z.boolean().optional(),
  notes: z.string().optional(),
});

export const SurfaceProfileSchema = z.object({
  measurementId: z.string(),
  profileType: z.enum(["roughness", "waviness", "primary"]),
  dataPoints: z.array(z.object({
    x: z.number(),
    z: z.number(),
  })),
  samplingInterval: z.number(),
  unit: z.enum(["um", "uin"]),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type RoughnessParameter = z.infer<typeof RoughnessParameterSchema>;
export type SurfaceMeasurement = z.infer<typeof SurfaceMeasurementSchema>;
export type SurfaceProfile = z.infer<typeof SurfaceProfileSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const measurements: Map<string, SurfaceMeasurement> = new Map();
const profiles: Map<string, SurfaceProfile> = new Map();
let measurementCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class SurfaceMeasureEngine {
  /**
   * Record a surface measurement
   */
  static recordMeasurement(data: Omit<SurfaceMeasurement, "id" | "measuredAt" | "inSpec">): SurfaceMeasurement {
    const measurement: SurfaceMeasurement = {
      ...data,
      id: `SRF-${++measurementCounter}`,
      measuredAt: new Date().toISOString(),
    };

    // Check specification if provided
    if (data.specification) {
      const paramValue = data.parameters[data.specification.parameter];
      if (paramValue !== undefined) {
        measurement.inSpec = paramValue <= data.specification.maxValue;
      }
    }

    measurements.set(measurement.id, measurement);
    return measurement;
  }

  /**
   * Store profile data for a measurement
   */
  static storeProfile(measurementId: string, profile: Omit<SurfaceProfile, "measurementId">): SurfaceProfile | undefined {
    if (!measurements.has(measurementId)) return undefined;

    const fullProfile: SurfaceProfile = {
      ...profile,
      measurementId,
    };

    profiles.set(measurementId, fullProfile);
    return fullProfile;
  }

  /**
   * Get measurement by ID
   */
  static getMeasurement(id: string): SurfaceMeasurement | undefined {
    return measurements.get(id);
  }

  /**
   * Get profile for measurement
   */
  static getProfile(measurementId: string): SurfaceProfile | undefined {
    return profiles.get(measurementId);
  }

  /**
   * List measurements for a part
   */
  static listByPart(partNumber: string, feature?: string): SurfaceMeasurement[] {
    let results = Array.from(measurements.values()).filter(m => m.partNumber === partNumber);
    if (feature) {
      results = results.filter(m => m.featureName === feature);
    }
    return results.sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
  }

  /**
   * Calculate roughness statistics for a part/feature
   */
  static getStatistics(partNumber: string, featureName: string, parameter: RoughnessParameter): {
    count: number;
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    inSpecRate: number;
  } | undefined {
    const records = this.listByPart(partNumber, featureName);
    const values = records
      .map(r => r.parameters[parameter])
      .filter((v): v is number => v !== undefined);

    if (values.length === 0) return undefined;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const inSpec = records.filter(r => r.inSpec === true).length;

    return {
      count: values.length,
      mean: Math.round(mean * 1000) / 1000,
      stdDev: Math.round(Math.sqrt(variance) * 1000) / 1000,
      min: Math.round(Math.min(...values) * 1000) / 1000,
      max: Math.round(Math.max(...values) * 1000) / 1000,
      inSpecRate: Math.round((inSpec / records.length) * 10000) / 100,
    };
  }

  /**
   * Get common roughness specifications by application
   */
  static getStandardSpecifications(): { application: string; Ra_um: number; Ra_uin: number; finish: string }[] {
    return [
      { application: "Ground surface", Ra_um: 0.8, Ra_uin: 32, finish: "N6" },
      { application: "Fine machined", Ra_um: 1.6, Ra_uin: 63, finish: "N7" },
      { application: "Normal machined", Ra_um: 3.2, Ra_uin: 125, finish: "N8" },
      { application: "Rough machined", Ra_um: 6.3, Ra_uin: 250, finish: "N9" },
      { application: "Bearing surface", Ra_um: 0.4, Ra_uin: 16, finish: "N5" },
      { application: "Seal surface", Ra_um: 0.2, Ra_uin: 8, finish: "N4" },
      { application: "Mirror finish", Ra_um: 0.05, Ra_uin: 2, finish: "N2" },
    ];
  }

  /**
   * Convert roughness units
   */
  static convertUnits(value: number, from: "um" | "uin", to: "um" | "uin"): number {
    if (from === to) return value;
    if (from === "um" && to === "uin") return Math.round(value * 39.37 * 10) / 10;
    return Math.round(value / 39.37 * 1000) / 1000;
  }

  /**
   * Get out-of-spec measurements
   */
  static getOutOfSpec(partNumber?: string): SurfaceMeasurement[] {
    let results = Array.from(measurements.values()).filter(m => m.inSpec === false);
    if (partNumber) {
      results = results.filter(m => m.partNumber === partNumber);
    }
    return results;
  }

  static getSelfAwareness() {
    return {
      name: "SurfaceMeasureEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U02",
      capabilities: ["recordMeasurement", "storeProfile", "getMeasurement", "getProfile", "listByPart", "getStatistics", "getStandardSpecifications", "convertUnits", "getOutOfSpec"],
      parameters: ["Ra", "Rz", "Rq", "Rt", "Rp", "Rv", "Rsk", "Rku", "Rsm", "Rpc", "Sa", "Sz", "Sq", "Sp", "Sv", "Ssk", "Sku"],
      dependencies: [],
    };
  }
}

export const surfaceMeasureEngine = new SurfaceMeasureEngine();
