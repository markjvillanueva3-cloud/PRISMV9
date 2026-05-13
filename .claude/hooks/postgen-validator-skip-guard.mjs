// tier: T0
/**
 * postgen-validator-skip-guard.mjs
 * ================================
 * Blocks a generated post-processor from being registered if any validator
 * was disabled or skipped during validation. This ensures only fully-validated
 * posts enter the knowledge graph.
 *
 * Trigger: PreToolUse on camDispatcher lathe_postgen_register action
 *
 * @module hooks/postgen-validator-skip-guard
 * @version 1.0.0
 * @milestone LATHE-MASTER U-LTH24
 */

import fs from "fs";
import path from "path";

const VALIDATION_STATE_PATH = path.join(
  process.env.PRISM_ROOT || "H:/PRISM",
  "mcp-server/data/state/postgen-validation-state.json"
);

const REQUIRED_VALIDATORS = [
  "arc_direction",
  "axis_limits",
  "block_number_sequence",
  "canned_cycle_syntax",
  "comment_format",
  "coolant_codes",
  "coordinate_format",
  "decimal_precision",
  "dwell_format",
  "feed_rate_mode",
  "g_code_groups",
  "line_length",
  "m_code_conflicts",
  "modal_state",
  "optional_stop",
  "program_structure",
  "safe_start_line",
  "spindle_commands",
  "subprogram_calls",
  "tool_change",
  "tool_nose_radius",
  "units_consistency",
  "work_offset",
  "css_range",
  "threading_syntax",
  "grooving_syntax",
  "parting_syntax",
];

export default async function postgenValidatorSkipGuard(context) {
  const { tool_input } = context;

  // Only guard lathe_postgen_register action
  if (tool_input?.action !== "lathe_postgen_register") {
    return { decision: "approve" };
  }

  // Check if this is a registration operation (not a query)
  const params = tool_input.params || {};
  if (params.query_type) {
    // This is a query, not a registration - allow
    return { decision: "approve" };
  }

  // Load validation state
  let validationState = {};
  try {
    if (fs.existsSync(VALIDATION_STATE_PATH)) {
      validationState = JSON.parse(fs.readFileSync(VALIDATION_STATE_PATH, "utf-8"));
    }
  } catch (err) {
    return {
      decision: "block",
      message: `❌ POSTGEN GUARD: Cannot read validation state: ${err.message}. Run lathe_postgen_validate first.`,
    };
  }

  const controllerId = params.controller_id;
  if (!controllerId) {
    return {
      decision: "block",
      message: "❌ POSTGEN GUARD: controller_id required for registration.",
    };
  }

  const controllerState = validationState[controllerId];
  if (!controllerState) {
    return {
      decision: "block",
      message: `❌ POSTGEN GUARD: No validation record for ${controllerId}. Run lathe_postgen_validate first.`,
    };
  }

  // Check for skipped validators
  const skippedValidators = controllerState.skipped_validators || [];
  if (skippedValidators.length > 0) {
    return {
      decision: "block",
      message: `❌ POSTGEN GUARD: Cannot register ${controllerId} — ${skippedValidators.length} validators were skipped: ${skippedValidators.slice(0, 5).join(", ")}${skippedValidators.length > 5 ? "..." : ""}. Re-run validation with all validators enabled.`,
    };
  }

  // Check for disabled validators
  const disabledValidators = controllerState.disabled_validators || [];
  if (disabledValidators.length > 0) {
    return {
      decision: "block",
      message: `❌ POSTGEN GUARD: Cannot register ${controllerId} — ${disabledValidators.length} validators were disabled: ${disabledValidators.slice(0, 5).join(", ")}${disabledValidators.length > 5 ? "..." : ""}. Enable all validators and re-run.`,
    };
  }

  // Check that all required validators passed
  const passedValidators = controllerState.passed_validators || [];
  const missingValidators = REQUIRED_VALIDATORS.filter(v => !passedValidators.includes(v));
  if (missingValidators.length > 0) {
    return {
      decision: "block",
      message: `❌ POSTGEN GUARD: Cannot register ${controllerId} — ${missingValidators.length} required validators not run: ${missingValidators.slice(0, 5).join(", ")}${missingValidators.length > 5 ? "..." : ""}`,
    };
  }

  // Check validation timestamp (must be recent - within 1 hour)
  const validatedAt = controllerState.validated_at;
  if (validatedAt) {
    const validatedDate = new Date(validatedAt);
    const ageMs = Date.now() - validatedDate.getTime();
    const oneHourMs = 60 * 60 * 1000;
    if (ageMs > oneHourMs) {
      return {
        decision: "block",
        message: `❌ POSTGEN GUARD: Validation for ${controllerId} is stale (${Math.round(ageMs / 60000)} min old). Re-run lathe_postgen_validate.`,
      };
    }
  }

  // Check for any failed validators
  const failedValidators = controllerState.failed_validators || [];
  if (failedValidators.length > 0) {
    return {
      decision: "block",
      message: `❌ POSTGEN GUARD: Cannot register ${controllerId} — ${failedValidators.length} validators failed: ${failedValidators.slice(0, 5).join(", ")}${failedValidators.length > 5 ? "..." : ""}. Fix issues and re-validate.`,
    };
  }

  // All checks passed
  return {
    decision: "approve",
    message: `✓ POSTGEN GUARD: ${controllerId} passed all ${passedValidators.length} validators. Registration approved.`,
  };
}

// Export metadata for hook registry
export const metadata = {
  name: "postgen-validator-skip-guard",
  description: "Blocks post-processor registration if any validator was skipped or disabled",
  trigger: "PreToolUse",
  tools: ["mcp__prism_cam__*"],
  actions: ["lathe_postgen_register"],
  version: "1.0.0",
  milestone: "U-LTH24",
};
