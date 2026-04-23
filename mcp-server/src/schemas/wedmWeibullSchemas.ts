/**
 * Zod schemas for WEDM Weibull Wire Life actions (WEDM-BIZ-MS0 / U-WB06)
 * @description Weibull(β, η) failure distribution analysis for EDM wire
 */
import { z } from 'zod';

const FailureObservationSchema = z.object({
  time_min: z.number().positive().describe('Observed time [min]'),
  failed: z.boolean().describe('true = actual failure, false = right-censored'),
  tag: z.string().optional().describe('Machine/material tag for stratification'),
});

const FitInputSchema = z.object({
  observations: z.array(FailureObservationSchema).min(1).describe('Failure/censored observations'),
  max_iter: z.number().int().positive().optional().describe('Max Newton iterations'),
  tol: z.number().positive().optional().describe('Convergence tolerance on β'),
});

const FailureProbabilityInputSchema = z.object({
  beta: z.number().positive().describe('Shape parameter β'),
  eta_min: z.number().positive().describe('Scale parameter η [min]'),
  t_min: z.number().min(0).describe('Query time [min]'),
});

const PercentileInputSchema = z.object({
  beta: z.number().positive().describe('Shape parameter β'),
  eta_min: z.number().positive().describe('Scale parameter η [min]'),
  p: z.number().gt(0).lt(1).describe('Percentile in (0, 1)'),
});

const CompareGroupsInputSchema = z.object({
  groups: z.array(z.object({
    name: z.string(),
    observations: z.array(FailureObservationSchema).min(1),
  })).min(2).describe('At least 2 groups to compare'),
});

const SurvivalCurveInputSchema = z.object({
  beta: z.number().positive().describe('Shape parameter β'),
  eta_min: z.number().positive().describe('Scale parameter η [min]'),
  points: z.number().int().positive().optional().describe('Number of curve points'),
});

export const WEDM_WEIBULL_SCHEMAS: Record<string, z.ZodTypeAny> = {
  wedm_weibull_fit: FitInputSchema,
  wedm_weibull_failure_probability: FailureProbabilityInputSchema,
  wedm_weibull_percentile: PercentileInputSchema,
  wedm_weibull_compare_groups: CompareGroupsInputSchema,
  wedm_weibull_survival_curve: SurvivalCurveInputSchema,
};
