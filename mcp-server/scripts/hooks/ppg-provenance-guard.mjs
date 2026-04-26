/**
 * ppg-provenance-guard.mjs — U-PPG-SFC-04
 * ========================================
 *
 * PostToolCall hook that enforces PPG provenance on G-code emissions.
 * Inspects results from PPG dispatchers (prism_cam, prism_post) and validates
 * that every G-code output carries provenance with:
 *   - emission_id: unique identifier
 *   - ppg_source: template|rag|adapter|hybrid|custom
 *   - dialect_source: controller dialect information
 *   - post_template: post processor template source
 *   - citations: array of provenance citations
 *   - audit_hash: SHA-256 hash for tamper detection
 *
 * Modes:
 *   - Advisory (default): Warns but allows through
 *   - Hard block: Set PRISM_PPG_PROVENANCE_HARD_BLOCK=1 to enforce
 *
 * @module hooks/ppg-provenance-guard
 * @milestone PSAU-PPG-SFC U-PPG-SFC-04
 */

const PPG_DISPATCHERS = [
  "prism_cam",
  "prism_post",
  "prism_gcode",
  "prism_nc",
];

const PPG_ACTIONS = [
  "generate",
  "post_process",
  "emit",
  "emit_gcode",
  "generate_nc",
  "convert",
  "translate",
  "post",
];

const VALID_PPG_SOURCES = ["template", "rag", "adapter", "hybrid", "custom"];

/**
 * Check if this tool call is a PPG emission that needs provenance.
 */
function isPPGEmission(tool, input) {
  if (!tool || !input) return false;

  const toolLower = tool.toLowerCase();
  const action = input.action?.toLowerCase?.() ?? "";

  const isDispatcher = PPG_DISPATCHERS.some(d => toolLower.includes(d));
  const isAction = PPG_ACTIONS.some(a => action.includes(a));

  return isDispatcher && isAction;
}

/**
 * Find provenance in result object (may be nested).
 */
function findProvenance(result) {
  if (!result || typeof result !== "object") return null;

  if (result.provenance) return result.provenance;
  if (result.data?.provenance) return result.data.provenance;
  if (result.result?.provenance) return result.result.provenance;
  if (result.output?.provenance) return result.output.provenance;
  if (result.gcode_result?.provenance) return result.gcode_result.provenance;

  return null;
}

/**
 * Validate PPG provenance record.
 */
function validateProvenance(provenance) {
  const errors = [];

  if (!provenance.emission_id) {
    errors.push("Missing emission_id");
  }

  if (!provenance.ppg_source) {
    errors.push("Missing ppg_source (template|rag|adapter|hybrid|custom)");
  } else if (!VALID_PPG_SOURCES.includes(provenance.ppg_source)) {
    errors.push(`Invalid ppg_source: ${provenance.ppg_source}`);
  }

  if (!provenance.dialect_source) {
    errors.push("Missing dialect_source - controller dialect unknown");
  }

  if (!provenance.post_template) {
    errors.push("Missing post_template - post processor source unknown");
  }

  if (!provenance.citations || provenance.citations.length === 0) {
    errors.push("Missing or empty citations array - G-code source unknown");
  }

  if (!provenance.audit_hash) {
    errors.push("Missing audit_hash - tamper detection disabled");
  }

  return errors;
}

/**
 * Main hook handler.
 */
export default function hook(event) {
  const { tool, input, result } = event;

  if (!isPPGEmission(tool, input)) {
    return { allow: true };
  }

  if (result?.ok === false || result?.error) {
    return { allow: true };
  }

  const provenance = findProvenance(result);
  const hardBlock = process.env.PRISM_PPG_PROVENANCE_HARD_BLOCK === "1";
  const action = input?.action ?? "unknown";

  if (!provenance) {
    const message = hardBlock
      ? `BLOCKED: PPG action '${action}' missing provenance. ITAR/AS9100 audit trail required for G-code emissions.`
      : `WARNING: PPG action '${action}' missing provenance. G-code emissions should carry full provenance for audit trail.`;

    return {
      allow: !hardBlock,
      message,
      hookSpecificOutput: {
        status: hardBlock ? "blocked" : "warning",
        action,
        reason: "missing_provenance",
      },
    };
  }

  const errors = validateProvenance(provenance);

  if (errors.length > 0) {
    const message = hardBlock
      ? `BLOCKED: PPG provenance incomplete. ITAR/AS9100 compliance requires: ${errors.join("; ")}`
      : `WARNING: PPG provenance incomplete: ${errors.join("; ")}`;

    return {
      allow: !hardBlock,
      message,
      hookSpecificOutput: {
        status: hardBlock ? "blocked" : "warning",
        action,
        errors,
        emission_id: provenance.emission_id,
        ppg_source: provenance.ppg_source,
      },
    };
  }

  return {
    allow: true,
    hookSpecificOutput: {
      status: "valid",
      action,
      emission_id: provenance.emission_id,
      ppg_source: provenance.ppg_source,
      dialect: provenance.dialect_source?.controller,
      citation_count: provenance.citations?.length ?? 0,
      audit_hash: provenance.audit_hash,
    },
  };
}
