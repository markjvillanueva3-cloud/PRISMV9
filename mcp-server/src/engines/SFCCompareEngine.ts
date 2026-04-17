/**
 * SFCCompareEngine — Surface Finish Comparison
 * ==============================================
 *
 * Compares measured surface finish against targets, specifications,
 * and historical data for process capability analysis.
 *
 * L2-P4-MS1/P0-U05 — Batch 8: Surface Finish
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const MeasurementSchema = z.object({
  ra: z.number().min(0),
  rz: z.number().min(0).optional(),
  rt: z.number().min(0).optional(),
  location: z.string().optional(),
  timestamp: z.string().optional(),
});

export const SpecificationSchema = z.object({
  targetRa: z.number().min(0),
  toleranceRa: z.number().min(0),
  maxRa: z.number().min(0).optional(),
  minRa: z.number().min(0).optional(),
  targetRz: z.number().min(0).optional(),
  toleranceRz: z.number().min(0).optional(),
});

export const CompareInputSchema = z.object({
  measurements: z.array(MeasurementSchema).min(1),
  specification: SpecificationSchema,
  predictedRa: z.number().min(0).optional(),
  historicalAvgRa: z.number().min(0).optional(),
  historicalStdDev: z.number().min(0).optional(),
});

export const CompareOutputSchema = z.object({
  avgRa: z.number(),
  stdDevRa: z.number(),
  minRa: z.number(),
  maxRa: z.number(),
  rangeRa: z.number(),
  cpk: z.number().optional(),
  inSpec: z.boolean(),
  outOfSpecCount: z.number(),
  deviationFromTarget: z.number(),
  deviationFromPredicted: z.number().optional(),
  deviationFromHistorical: z.number().optional(),
  trend: z.enum(["improving", "stable", "degrading", "unknown"]),
  assessment: z.enum(["excellent", "good", "acceptable", "marginal", "unacceptable"]),
  issues: z.array(z.string()),
  recommendations: z.array(z.string()),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type Measurement = z.infer<typeof MeasurementSchema>;
export type Specification = z.infer<typeof SpecificationSchema>;
export type CompareInput = z.infer<typeof CompareInputSchema>;
export type CompareOutput = z.infer<typeof CompareOutputSchema>;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class SFCCompareEngine {
  /**
   * Compare measurements against specification
   */
  static compare(input: CompareInput): CompareOutput {
    const validated = CompareInputSchema.parse(input);
    const issues: string[] = [];
    const recommendations: string[] = [];

    const raValues = validated.measurements.map(m => m.ra);
    const n = raValues.length;

    // Statistical analysis
    const avgRa = raValues.reduce((a, b) => a + b, 0) / n;
    const variance = raValues.reduce((sum, val) => sum + (val - avgRa) ** 2, 0) / n;
    const stdDevRa = Math.sqrt(variance);
    const minRa = Math.min(...raValues);
    const maxRa = Math.max(...raValues);
    const rangeRa = maxRa - minRa;

    // Specification compliance
    const spec = validated.specification;
    const upperLimit = spec.maxRa ?? (spec.targetRa + spec.toleranceRa);
    const lowerLimit = spec.minRa ?? Math.max(0, spec.targetRa - spec.toleranceRa);

    const outOfSpec = raValues.filter(ra => ra < lowerLimit || ra > upperLimit);
    const outOfSpecCount = outOfSpec.length;
    const inSpec = outOfSpecCount === 0;

    // Process capability (Cpk)
    let cpk: number | undefined;
    if (stdDevRa > 0) {
      const cpkUpper = (upperLimit - avgRa) / (3 * stdDevRa);
      const cpkLower = (avgRa - lowerLimit) / (3 * stdDevRa);
      cpk = Math.min(cpkUpper, cpkLower);
    }

    // Deviation calculations
    const deviationFromTarget = avgRa - spec.targetRa;
    const deviationFromPredicted = validated.predictedRa !== undefined
      ? avgRa - validated.predictedRa : undefined;
    const deviationFromHistorical = validated.historicalAvgRa !== undefined
      ? avgRa - validated.historicalAvgRa : undefined;

    // Trend analysis (requires timestamps or order)
    let trend: CompareOutput["trend"] = "unknown";
    if (n >= 5) {
      const firstHalf = raValues.slice(0, Math.floor(n / 2));
      const secondHalf = raValues.slice(Math.floor(n / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      if (secondAvg < firstAvg * 0.9) trend = "improving";
      else if (secondAvg > firstAvg * 1.1) trend = "degrading";
      else trend = "stable";
    }

    // Assessment
    let assessment: CompareOutput["assessment"];
    if (cpk !== undefined && cpk >= 1.67 && inSpec) {
      assessment = "excellent";
    } else if (cpk !== undefined && cpk >= 1.33 && inSpec) {
      assessment = "good";
    } else if (inSpec) {
      assessment = "acceptable";
    } else if (outOfSpecCount / n < 0.1) {
      assessment = "marginal";
    } else {
      assessment = "unacceptable";
    }

    // Generate issues and recommendations
    if (!inSpec) {
      issues.push(`${outOfSpecCount} of ${n} measurements out of specification`);
    }
    if (deviationFromTarget > 0) {
      issues.push(`Average Ra ${avgRa.toFixed(3)}µm exceeds target ${spec.targetRa}µm`);
    }
    if (cpk !== undefined && cpk < 1.0) {
      issues.push(`Low process capability (Cpk=${cpk.toFixed(2)})`);
    }
    if (trend === "degrading") {
      issues.push("Surface finish quality is degrading over time");
    }
    if (rangeRa > spec.toleranceRa * 2) {
      issues.push("High variation in surface finish measurements");
    }

    if (avgRa > spec.targetRa) {
      recommendations.push("Reduce feed rate to improve surface finish");
    }
    if (stdDevRa > spec.toleranceRa * 0.5) {
      recommendations.push("Investigate sources of variation (tool wear, vibration, material)");
    }
    if (trend === "degrading") {
      recommendations.push("Check tool condition - may require tool change");
    }
    if (cpk !== undefined && cpk < 1.33) {
      recommendations.push("Tighten process control to improve capability");
    }

    return CompareOutputSchema.parse({
      avgRa: Math.round(avgRa * 1000) / 1000,
      stdDevRa: Math.round(stdDevRa * 1000) / 1000,
      minRa: Math.round(minRa * 1000) / 1000,
      maxRa: Math.round(maxRa * 1000) / 1000,
      rangeRa: Math.round(rangeRa * 1000) / 1000,
      cpk: cpk !== undefined ? Math.round(cpk * 100) / 100 : undefined,
      inSpec,
      outOfSpecCount,
      deviationFromTarget: Math.round(deviationFromTarget * 1000) / 1000,
      deviationFromPredicted: deviationFromPredicted !== undefined
        ? Math.round(deviationFromPredicted * 1000) / 1000 : undefined,
      deviationFromHistorical: deviationFromHistorical !== undefined
        ? Math.round(deviationFromHistorical * 1000) / 1000 : undefined,
      trend,
      assessment,
      issues,
      recommendations,
    });
  }

  /**
   * Check if measurement meets specification
   */
  static meetsSpec(ra: number, specification: Specification): boolean {
    const upperLimit = specification.maxRa ?? (specification.targetRa + specification.toleranceRa);
    const lowerLimit = specification.minRa ?? Math.max(0, specification.targetRa - specification.toleranceRa);
    return ra >= lowerLimit && ra <= upperLimit;
  }

  static getSelfAwareness() {
    return {
      name: "SFCCompareEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U05",
      capabilities: ["compare", "meetsSpec"],
      assessments: ["excellent", "good", "acceptable", "marginal", "unacceptable"],
      trends: ["improving", "stable", "degrading", "unknown"],
      dependencies: [],
    };
  }
}

export const sfcCompareEngine = new SFCCompareEngine();
