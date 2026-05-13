// tier: T4
/**
 * training-convergence-guard.mjs — PostToolUse hook
 * CADCAM-DAGI-MS0/U-DAGI04
 *
 * Monitors training actions and warns on divergence indicators:
 * - NaN/Inf loss
 * - Perplexity > 100 (severe) or > 50 (warning)
 * - featureValidityPct < 80%
 * - Early stopping triggered
 */

const DIVERGENCE_PATTERNS = [
  { pattern: /non-finite loss/i, severity: 'error', msg: 'Training diverged — NaN/Inf loss detected' },
  { pattern: /diverged at epoch/i, severity: 'error', msg: 'Training diverged — loss exceeded threshold' },
  { pattern: /early stop/i, severity: 'warning', msg: 'Training stopped early — valLoss not improving' },
];

export default async function trainingConvergenceGuard({ tool, toolInput, toolResult }) {
  // Only check cad training actions
  if (tool !== 'Write' && tool !== 'Bash') return;

  const content = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult ?? {});

  // Check for divergence patterns in any training-related output
  if (!content.includes('train') && !content.includes('perplexity') && !content.includes('valLoss')) {
    return;
  }

  const warnings = [];

  // Pattern-based divergence detection
  for (const { pattern, severity, msg } of DIVERGENCE_PATTERNS) {
    if (pattern.test(content)) {
      warnings.push({ severity, msg });
    }
  }

  // Parse metrics if present
  const perplexityMatch = content.match(/perplexity[":]\s*([0-9.]+)/i);
  if (perplexityMatch) {
    const perp = parseFloat(perplexityMatch[1]);
    if (perp > 100) {
      warnings.push({ severity: 'error', msg: `Perplexity ${perp.toFixed(1)} is extremely high — model may be untrained` });
    } else if (perp > 50) {
      warnings.push({ severity: 'warning', msg: `Perplexity ${perp.toFixed(1)} is elevated — check training data quality` });
    }
  }

  const validityMatch = content.match(/featureValidityPct[":]\s*([0-9.]+)/i);
  if (validityMatch) {
    const validity = parseFloat(validityMatch[1]);
    if (validity < 0.5) {
      warnings.push({ severity: 'error', msg: `Feature validity ${(validity * 100).toFixed(0)}% is critically low` });
    } else if (validity < 0.8) {
      warnings.push({ severity: 'warning', msg: `Feature validity ${(validity * 100).toFixed(0)}% is below target (80%)` });
    }
  }

  if (warnings.length === 0) return;

  const errors = warnings.filter(w => w.severity === 'error');
  const warns = warnings.filter(w => w.severity === 'warning');

  let message = '';
  if (errors.length > 0) {
    message += `\n⛔ TRAINING ERRORS:\n${errors.map(e => `  - ${e.msg}`).join('\n')}`;
  }
  if (warns.length > 0) {
    message += `\n⚠️ TRAINING WARNINGS:\n${warns.map(w => `  - ${w.msg}`).join('\n')}`;
  }

  return message.trim();
}
