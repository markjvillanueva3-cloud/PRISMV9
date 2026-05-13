// tier: T3
/**
 * reasoning-completeness.mjs — PostToolUse hook
 * CADCAM-DAGI-MS0/U-DAGI10
 *
 * Monitors CADReasoningChainEngine output quality:
 * - Incomplete reasoning chains (<3 steps)
 * - Low confidence decisions (<0.7)
 * - Missing evidence sources
 * - Unresolved assumptions
 */

export default async function reasoningCompleteness({ tool, toolInput, toolResult }) {
  // Only check Write/Bash for reasoning work
  if (tool !== 'Write' && tool !== 'Bash') return;

  const content = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult ?? {});

  // Only check if it looks like reasoning chain work
  if (!content.includes('CADReasoningChain') && !content.includes('reason_generate') && !content.includes('reasoningChain')) {
    return;
  }

  const warnings = [];

  // Check for low step count
  const stepsMatch = content.match(/"steps"\s*:\s*\[([^\]]*)\]/i);
  if (stepsMatch) {
    const stepCount = (stepsMatch[1].match(/"stepId"/g) || []).length;
    if (stepCount < 3 && stepCount > 0) {
      warnings.push({
        severity: 'warning',
        msg: `Reasoning chain has only ${stepCount} steps — consider more thorough analysis`,
      });
    }
  }

  // Check for low overall confidence
  const confidenceMatch = content.match(/"overallConfidence"\s*:\s*([\d.]+)/i);
  if (confidenceMatch) {
    const confidence = parseFloat(confidenceMatch[1]);
    if (confidence < 0.7) {
      warnings.push({
        severity: 'warning',
        msg: `Low reasoning confidence (${(confidence * 100).toFixed(0)}%) — review evidence quality`,
      });
    }
  }

  // Check for many assumptions
  const assumptionsMatch = content.match(/"assumptions"\s*:\s*\[([^\]]*)\]/i);
  if (assumptionsMatch && assumptionsMatch[1].length > 100) {
    warnings.push({
      severity: 'info',
      msg: 'Reasoning chain has multiple assumptions — verify before production use',
    });
  }

  // Check for many caveats
  const caveatsMatch = content.match(/"caveats"\s*:\s*\[([^\]]*)\]/i);
  if (caveatsMatch && caveatsMatch[1].length > 50) {
    warnings.push({
      severity: 'info',
      msg: 'Reasoning chain has caveats — review before accepting design',
    });
  }

  if (warnings.length === 0) return;

  const warns = warnings.filter(w => w.severity === 'warning');
  const infos = warnings.filter(w => w.severity === 'info');

  let message = '';
  if (warns.length > 0) {
    message += `\n⚠️ REASONING COMPLETENESS WARNINGS:\n${warns.map(w => `  - ${w.msg}`).join('\n')}`;
  }
  if (infos.length > 0) {
    message += `\nℹ️ REASONING INFO:\n${infos.map(i => `  - ${i.msg}`).join('\n')}`;
  }

  return message.trim();
}
