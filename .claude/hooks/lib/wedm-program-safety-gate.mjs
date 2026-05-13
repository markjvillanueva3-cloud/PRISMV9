// tier: T1
/**
 * wedm-program-safety-gate hook
 * Blocks program emit when S(x) < 0.70
 *
 * Built by: MS-P2.5-SAFETY / U-P2.5-SAFE-01
 * Hook type: PreToolUse (on WEDMPrintToProgramEngine.emit calls)
 *
 * This hook intercepts program emit operations and validates that the
 * composite S(x) safety score meets the 0.70 threshold before allowing
 * the program to be written to disk or sent to a controller.
 */

/**
 * Check if a safety gate result indicates hard block.
 * @param {Object} safetyResult - Result from WEDMProgramSafetyGateEngine.evaluate()
 * @returns {{ status: 'pass' | 'block', message: string }}
 */
export function checkSafetyGate(safetyResult) {
  if (!safetyResult) {
    return {
      status: 'block',
      message: 'BLOCKED: No safety gate evaluation provided. Run WEDMProgramSafetyGateEngine.evaluate() before emit.'
    };
  }

  if (safetyResult.hard_block) {
    const score = (safetyResult.sx_score * 100).toFixed(1);
    const failures = safetyResult.mandatory_failures?.length > 0
      ? ` Mandatory failures: ${safetyResult.mandatory_failures.join(', ')}.`
      : '';

    return {
      status: 'block',
      message: `BLOCKED: S(x)=${score}% < 70% threshold.${failures} Cannot emit program. Review warnings: ${safetyResult.warnings?.slice(0, 2).join('; ') || 'none'}`
    };
  }

  if (safetyResult.verdict === 'warning') {
    const score = (safetyResult.sx_score * 100).toFixed(1);
    return {
      status: 'pass',
      message: `⚠ WARNING: S(x)=${score}% — operator review recommended before running program.`
    };
  }

  return {
    status: 'pass',
    message: `✓ S(x)=${(safetyResult.sx_score * 100).toFixed(1)}% — program cleared for emit.`
  };
}

/**
 * Validate that S(x) components meet minimum requirements.
 * @param {Object} components - Component results from safety gate
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateMinimumComponents(components) {
  const required = ['collision', 'unit_tag'];
  const missing = required.filter(c => !components[c] || components[c].details?.reason === 'not_evaluated');

  return {
    valid: missing.length === 0,
    missing
  };
}

export default checkSafetyGate;
