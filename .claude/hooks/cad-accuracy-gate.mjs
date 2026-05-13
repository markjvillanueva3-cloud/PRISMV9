// tier: T3
/**
 * cad-accuracy-gate.mjs — PostToolUse hook
 * CADCAM-DAGI-MS0/U-DAGI13
 *
 * HARD BLOCKS if CAD accuracy validation fails:
 * - Blocks on critical validation issues
 * - Blocks on overall score below threshold
 * - Reports layer-by-layer status
 */

export default async function cadAccuracyGate({ tool, toolInput, toolResult }) {
  // Only check Write/Bash for validation output
  if (tool !== 'Write' && tool !== 'Bash') return;

  const content = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult ?? {});

  // Only check if it looks like accuracy validation output
  if (!content.includes('CADAccuracyValidator') && !content.includes('overallPassed') && !content.includes('ValidationReport')) {
    return;
  }

  const warnings = [];

  // Check for overall pass/fail
  const passedMatch = content.match(/"overallPassed"\s*:\s*(true|false)/i);
  if (passedMatch && passedMatch[1] === 'false') {
    warnings.push({
      severity: 'error',
      msg: 'CAD ACCURACY VALIDATION FAILED — cannot proceed to CAM',
    });
  }

  // Check overall score
  const scoreMatch = content.match(/"overallScore"\s*:\s*([\d.]+)/i);
  if (scoreMatch) {
    const score = parseFloat(scoreMatch[1]);
    if (score < 0.85) {
      warnings.push({
        severity: 'error',
        msg: `Accuracy score ${(score * 100).toFixed(0)}% below 85% threshold`,
      });
    } else if (score < 0.95) {
      warnings.push({
        severity: 'warning',
        msg: `Accuracy score ${(score * 100).toFixed(0)}% — consider improving before production`,
      });
    }
  }

  // Check for critical issues
  const criticalMatch = content.match(/"criticalIssues"\s*:\s*\[([^\]]*)\]/i);
  if (criticalMatch && criticalMatch[1].trim().length > 2) {
    const count = (criticalMatch[1].match(/"/g) || []).length / 2;
    warnings.push({
      severity: 'error',
      msg: `${count} critical issue(s) must be resolved before CAM handoff`,
    });
  }

  // Check individual layer failures
  const layerMatches = content.matchAll(/"name"\s*:\s*"(\w+)"[^}]*"passed"\s*:\s*false/gi);
  const failedLayers = [];
  for (const m of layerMatches) {
    failedLayers.push(m[1]);
  }
  if (failedLayers.length > 0) {
    warnings.push({
      severity: 'warning',
      msg: `Failed validation layers: ${failedLayers.join(', ')}`,
    });
  }

  if (warnings.length === 0) return;

  const errors = warnings.filter(w => w.severity === 'error');
  const warns = warnings.filter(w => w.severity === 'warning');

  let message = '';
  if (errors.length > 0) {
    message += `\n🚫 CAD ACCURACY HARD BLOCK:\n${errors.map(e => `  - ${e.msg}`).join('\n')}`;
  }
  if (warns.length > 0) {
    message += `\n⚠️ ACCURACY WARNINGS:\n${warns.map(w => `  - ${w.msg}`).join('\n')}`;
  }

  return message.trim();
}
