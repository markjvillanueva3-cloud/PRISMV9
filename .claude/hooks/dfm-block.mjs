// tier: T3
/**
 * dfm-block.mjs — PostToolUse hook
 * CADCAM-DAGI-MS0/U-DAGI11
 *
 * Blocks unmanufacturable CAD from proceeding:
 * - Fails on critical DFM violations
 * - Warns on marginal DFM issues
 * - Reports machine capability violations
 */

export default async function dfmBlock({ tool, toolInput, toolResult }) {
  // Only check Write/Bash for DFM work
  if (tool !== 'Write' && tool !== 'Bash') return;

  const content = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult ?? {});

  // Only check if it looks like DFM analysis output
  if (!content.includes('DFMAware') && !content.includes('dfmAnalysis') && !content.includes('isManufacturable')) {
    return;
  }

  const warnings = [];

  // Check for DFM failures
  const failCountMatch = content.match(/"failCount"\s*:\s*(\d+)/i);
  if (failCountMatch) {
    const failCount = parseInt(failCountMatch[1], 10);
    if (failCount > 0) {
      warnings.push({
        severity: 'error',
        msg: `DFM BLOCK: ${failCount} critical violations — part not manufacturable`,
      });
    }
  }

  // Check for DFM warnings
  const warningCountMatch = content.match(/"warningCount"\s*:\s*(\d+)/i);
  if (warningCountMatch) {
    const warningCount = parseInt(warningCountMatch[1], 10);
    if (warningCount > 3) {
      warnings.push({
        severity: 'warning',
        msg: `${warningCount} DFM warnings — review before manufacturing`,
      });
    }
  }

  // Check for low overall score
  const scoreMatch = content.match(/"overallScore"\s*:\s*([\d.]+)/i);
  if (scoreMatch) {
    const score = parseFloat(scoreMatch[1]);
    if (score < 0.6) {
      warnings.push({
        severity: 'warning',
        msg: `Low DFM score (${(score * 100).toFixed(0)}%) — significant rework may be needed`,
      });
    }
  }

  // Check for machine capacity violations
  if (content.includes('exceeds machine capacity')) {
    warnings.push({
      severity: 'error',
      msg: 'Part exceeds machine work envelope — use larger machine or split part',
    });
  }

  if (warnings.length === 0) return;

  const errors = warnings.filter(w => w.severity === 'error');
  const warns = warnings.filter(w => w.severity === 'warning');

  let message = '';
  if (errors.length > 0) {
    message += `\n🚫 DFM HARD BLOCK:\n${errors.map(e => `  - ${e.msg}`).join('\n')}`;
  }
  if (warns.length > 0) {
    message += `\n⚠️ DFM WARNINGS:\n${warns.map(w => `  - ${w.msg}`).join('\n')}`;
  }

  return message.trim();
}
