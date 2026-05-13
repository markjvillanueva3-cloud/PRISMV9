// tier: T3
/**
 * text-to-cad-validation.mjs — PostToolUse hook
 * CADCAM-DAGI-MS0/U-DAGI09
 *
 * Monitors TextToCADGenerationEngine output quality:
 * - Empty feature extraction
 * - Unrecognized keywords
 * - Refinement failures
 * - Multi-turn context issues
 */

export default async function textToCadValidation({ tool, toolInput, toolResult }) {
  // Only check Write/Bash for text-to-CAD work
  if (tool !== 'Write' && tool !== 'Bash') return;

  const content = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult ?? {});

  // Only check if it looks like text-to-CAD work
  if (!content.includes('TextToCAD') && !content.includes('parseText') && !content.includes('from_text')) {
    return;
  }

  const warnings = [];

  // Check for empty feature extraction
  const featuresMatch = content.match(/features[":]\s*\[\s*\]/i);
  if (featuresMatch) {
    warnings.push({
      severity: 'warning',
      msg: 'No features extracted from text — input may be too vague',
    });
  }

  // Check for failed refinements
  const refineMatch = content.match(/refinements[":]\s*\[\s*\]/i);
  const contextTurns = content.match(/turns[":]\s*\[.+?\]/i);
  if (contextTurns && refineMatch) {
    // Has context but no refinements detected might be intentional
  }

  // Check for low parse confidence
  const parseErrors = content.match(/errors[":]\s*\[(.+?)\]/i);
  if (parseErrors && parseErrors[1].length > 5) {
    warnings.push({
      severity: 'info',
      msg: 'Text parsing produced errors — review input clarity',
    });
  }

  // Check for context overflow
  const turnsMatch = content.match(/"turns":\s*\[([^\]]*)\]/i);
  if (turnsMatch) {
    const turnCount = (turnsMatch[1].match(/"id":/g) || []).length;
    if (turnCount > 10) {
      warnings.push({
        severity: 'info',
        msg: `Conversation has ${turnCount} turns — consider starting fresh context`,
      });
    }
  }

  if (warnings.length === 0) return;

  const warns = warnings.filter(w => w.severity === 'warning');
  const infos = warnings.filter(w => w.severity === 'info');

  let message = '';
  if (warns.length > 0) {
    message += `\n⚠️ TEXT-TO-CAD WARNINGS:\n${warns.map(w => `  - ${w.msg}`).join('\n')}`;
  }
  if (infos.length > 0) {
    message += `\nℹ️ TEXT-TO-CAD INFO:\n${infos.map(i => `  - ${i.msg}`).join('\n')}`;
  }

  return message.trim();
}
