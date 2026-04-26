/**
 * sfc-provenance-guard.mjs — U-PPG-SFC-03
 * ========================================
 *
 * PostToolCall hook that blocks SFC dispatcher actions lacking provenance.
 * Every Speed/Feed Calculator recommendation must carry:
 *   - recommendation_id
 *   - fps_source (formula|rag|adapter|iql|hybrid)
 *   - citations array (non-empty)
 *   - audit_hash for tamper detection
 *
 * Advisory by default (warns on missing provenance).
 * Set PRISM_SFC_PROVENANCE_HARD_BLOCK=1 to block.
 *
 * @module hooks/sfc-provenance-guard
 * @milestone PSAU-PPG-SFC U-PPG-SFC-03
 */

const SFC_DISPATCHER_ACTIONS = new Set([
  "calculate",
  "recommend",
  "optimize",
  "constrain",
  "analyze_surface",
  "estimate_tool_life",
]);

const SFC_DISPATCHER_NAMES = new Set([
  "prism_calc",
  "prism_sfc",
  "prism_turning",
  "prism_lathe",
  "prism_milling",
]);

/**
 * Validate provenance structure.
 * @param {unknown} provenance
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateProvenance(provenance) {
  const errors = [];

  if (!provenance || typeof provenance !== "object") {
    return { valid: false, errors: ["Provenance missing or not an object"] };
  }

  const p = provenance;

  if (!p.recommendation_id) {
    errors.push("Missing recommendation_id");
  }

  if (!p.fps_source) {
    errors.push("Missing fps_source (formula|rag|adapter|iql|hybrid)");
  } else if (!["formula", "rag", "adapter", "iql", "hybrid"].includes(p.fps_source)) {
    errors.push(`Invalid fps_source: ${p.fps_source}`);
  }

  if (!Array.isArray(p.citations) || p.citations.length === 0) {
    errors.push("Missing or empty citations array - recommendation source unknown");
  }

  if (!p.audit_hash) {
    errors.push("Missing audit_hash - tamper detection disabled");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if this is an SFC-related dispatcher action.
 * @param {string} toolName
 * @param {object} input
 * @returns {boolean}
 */
function isSFCAction(toolName, input) {
  // Check dispatcher name
  if (!SFC_DISPATCHER_NAMES.has(toolName)) {
    return false;
  }

  // Check action
  const action = input?.action;
  if (!action || !SFC_DISPATCHER_ACTIONS.has(action)) {
    return false;
  }

  return true;
}

/**
 * Extract provenance from tool result.
 * Looks in multiple locations for flexibility.
 * @param {unknown} result
 * @returns {object|null}
 */
function extractProvenance(result) {
  if (!result || typeof result !== "object") {
    return null;
  }

  // Direct provenance field
  if (result.provenance) {
    return result.provenance;
  }

  // Nested in data
  if (result.data?.provenance) {
    return result.data.provenance;
  }

  // Nested in result
  if (result.result?.provenance) {
    return result.result.provenance;
  }

  // Nested in recommendation
  if (result.recommendation?.provenance) {
    return result.recommendation.provenance;
  }

  return null;
}

/**
 * PostToolCall hook entry point.
 * @param {object} context - { tool, input, result }
 * @returns {object} - { allow, message?, hookSpecificOutput? }
 */
export default function hook(context) {
  const { tool, input, result } = context;

  // Only check SFC actions
  if (!isSFCAction(tool, input)) {
    return { allow: true };
  }

  // Skip if result indicates error
  if (result?.error || result?.ok === false) {
    return { allow: true };
  }

  // Extract and validate provenance
  const provenance = extractProvenance(result);
  const validation = validateProvenance(provenance);

  if (validation.valid) {
    return {
      allow: true,
      hookSpecificOutput: {
        hook: "sfc-provenance-guard",
        status: "valid",
        recommendation_id: provenance.recommendation_id,
        fps_source: provenance.fps_source,
        citation_count: provenance.citations?.length ?? 0,
      },
    };
  }

  // Provenance invalid or missing
  const hardBlock = process.env.PRISM_SFC_PROVENANCE_HARD_BLOCK === "1";
  const errorList = validation.errors.join("; ");

  if (hardBlock) {
    return {
      allow: false,
      message: `[sfc-provenance-guard] BLOCKED: SFC action '${input?.action}' lacks valid provenance. Errors: ${errorList}. All SFC recommendations must carry provenance for ITAR/AS9100 audit compliance.`,
      hookSpecificOutput: {
        hook: "sfc-provenance-guard",
        status: "blocked",
        action: input?.action,
        errors: validation.errors,
      },
    };
  }

  // Advisory mode - warn but allow
  return {
    allow: true,
    message: `[sfc-provenance-guard] WARNING: SFC action '${input?.action}' missing provenance. Errors: ${errorList}. Set PRISM_SFC_PROVENANCE_HARD_BLOCK=1 to enforce.`,
    hookSpecificOutput: {
      hook: "sfc-provenance-guard",
      status: "warning",
      action: input?.action,
      errors: validation.errors,
    },
  };
}
