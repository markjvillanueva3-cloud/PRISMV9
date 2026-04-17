/**
 * PostgenValidatorSkipGuardHook — LATHE-MASTER U-LTH24
 *
 * Safety hook that prevents skipping critical validators during post generation.
 * Ensures all safety-critical validators (physics, kinematics, collision) run
 * before any post-processor output is finalized.
 *
 * @module PostgenValidatorSkipGuardHook
 * @version 1.0.0
 * @milestone LATHE-MASTER U-LTH24
 */

import { z } from "zod";

// ── Schemas ─────────────────────────────────────────────────────────────────

export const ValidatorCategorySchema = z.enum([
  "syntax",
  "safety",
  "physics",
  "kinematics",
  "tooling",
  "coolant",
  "program_structure",
  "modal_state",
]);

export const SkipRequestSchema = z.object({
  controller: z.string(),
  skip_categories: z.array(ValidatorCategorySchema).optional(),
  skip_validators: z.array(z.string()).optional(),
  reason: z.string().optional(),
  override_safety: z.boolean().optional(),
});

export const GuardResultSchema = z.object({
  allowed: z.boolean(),
  blocked_categories: z.array(ValidatorCategorySchema),
  blocked_validators: z.array(z.string()),
  warnings: z.array(z.string()),
  safety_score: z.number().min(0).max(1),
  requires_approval: z.boolean(),
  approval_reason: z.string().optional(),
});

export type ValidatorCategory = z.infer<typeof ValidatorCategorySchema>;
export type SkipRequest = z.infer<typeof SkipRequestSchema>;
export type GuardResult = z.infer<typeof GuardResultSchema>;

// ── Critical Validators ─────────────────────────────────────────────────────

const CRITICAL_CATEGORIES: ValidatorCategory[] = [
  "safety",
  "physics",
  "kinematics",
];

const CRITICAL_VALIDATORS: string[] = [
  "pp_safety_rapid_to_cut",
  "pp_safety_spindle_before_cut",
  "pp_safety_coolant_on",
  "pp_physics_feedrate_limits",
  "pp_physics_spindle_limits",
  "pp_kinematics_axis_limits",
  "pp_kinematics_collision_zone",
  "pp_kinematics_tool_clearance",
];

const SOFT_SKIP_ALLOWED: ValidatorCategory[] = [
  "syntax",
  "program_structure",
  "modal_state",
];

// ── Hook Implementation ─────────────────────────────────────────────────────

export class PostgenValidatorSkipGuardHook {
  private static readonly VERSION = "1.0.0";

  /**
   * Validate a skip request against safety rules.
   */
  static validate(request: SkipRequest): GuardResult {
    const blockedCategories: ValidatorCategory[] = [];
    const blockedValidators: string[] = [];
    const warnings: string[] = [];

    // Check category skips
    if (request.skip_categories) {
      for (const category of request.skip_categories) {
        if (CRITICAL_CATEGORIES.includes(category)) {
          if (!request.override_safety) {
            blockedCategories.push(category);
          } else {
            warnings.push(
              `Safety override: Skipping critical category '${category}' — manual verification required`
            );
          }
        }
      }
    }

    // Check specific validator skips
    if (request.skip_validators) {
      for (const validator of request.skip_validators) {
        if (CRITICAL_VALIDATORS.includes(validator)) {
          if (!request.override_safety) {
            blockedValidators.push(validator);
          } else {
            warnings.push(
              `Safety override: Skipping critical validator '${validator}' — manual verification required`
            );
          }
        }
      }
    }

    // Calculate safety score
    const totalCritical = CRITICAL_CATEGORIES.length + CRITICAL_VALIDATORS.length;
    const skippedCritical = blockedCategories.length + blockedValidators.length;
    const overriddenCritical = request.override_safety
      ? (request.skip_categories?.filter(c => CRITICAL_CATEGORIES.includes(c)).length ?? 0) +
        (request.skip_validators?.filter(v => CRITICAL_VALIDATORS.includes(v)).length ?? 0)
      : 0;

    const safetyScore = request.override_safety
      ? Math.max(0.3, 1 - (overriddenCritical / totalCritical) * 0.7)
      : skippedCritical > 0
        ? 0
        : 1;

    const allowed = blockedCategories.length === 0 && blockedValidators.length === 0;
    const requiresApproval = warnings.length > 0;

    return {
      allowed,
      blocked_categories: blockedCategories,
      blocked_validators: blockedValidators,
      warnings,
      safety_score: Math.round(safetyScore * 1000) / 1000,
      requires_approval: requiresApproval,
      approval_reason: requiresApproval
        ? `${warnings.length} critical validator(s) skipped with override — requires supervisor approval`
        : undefined,
    };
  }

  /**
   * Check if a category can be safely skipped.
   */
  static canSkipCategory(category: ValidatorCategory): boolean {
    return SOFT_SKIP_ALLOWED.includes(category);
  }

  /**
   * Check if a validator can be safely skipped.
   */
  static canSkipValidator(validatorId: string): boolean {
    return !CRITICAL_VALIDATORS.includes(validatorId);
  }

  /**
   * Get list of critical categories.
   */
  static getCriticalCategories(): ValidatorCategory[] {
    return [...CRITICAL_CATEGORIES];
  }

  /**
   * Get list of critical validators.
   */
  static getCriticalValidators(): string[] {
    return [...CRITICAL_VALIDATORS];
  }

  /**
   * Get list of soft-skip-allowed categories.
   */
  static getSoftSkipCategories(): ValidatorCategory[] {
    return [...SOFT_SKIP_ALLOWED];
  }

  /**
   * Pre-flight check for postgen pipeline.
   */
  static preflight(request: SkipRequest): {
    proceed: boolean;
    result: GuardResult;
    message: string;
  } {
    const result = this.validate(request);

    if (!result.allowed) {
      return {
        proceed: false,
        result,
        message: `Blocked: Cannot skip critical validators [${[
          ...result.blocked_categories,
          ...result.blocked_validators,
        ].join(", ")}]. Use override_safety=true with supervisor approval.`,
      };
    }

    if (result.requires_approval) {
      return {
        proceed: true,
        result,
        message: `Warning: ${result.warnings.length} critical validator(s) overridden. Safety score: ${result.safety_score}. Requires approval.`,
      };
    }

    return {
      proceed: true,
      result,
      message: "All validators enabled. Proceeding with full validation.",
    };
  }

  /**
   * Get hook version.
   */
  static getVersion(): string {
    return PostgenValidatorSkipGuardHook.VERSION;
  }
}

// Export singleton-style access
export const postgenValidatorSkipGuardHook = PostgenValidatorSkipGuardHook;
