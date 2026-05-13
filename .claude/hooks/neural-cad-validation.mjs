// tier: T3
/**
 * neural-cad-validation.mjs — PostToolUse hook
 * CADCAM-DAGI-MS0/U-DAGI07
 *
 * Monitors NeuralCADGenerationEngine output quality and warns on issues:
 * - Low confidence scores (< 0.6)
 * - Failed validation (syntax errors)
 * - High retry count (3+ attempts)
 * - Missing output code
 */

const MIN_CONFIDENCE_WARN = 0.6;
const HIGH_RETRY_WARN = 3;

export default async function neuralCadValidation({ tool, toolInput, toolResult }) {
  // Only check Write/Bash for neural CAD work
  if (tool !== 'Write' && tool !== 'Bash') return;

  const content = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult ?? {});

  // Only check if it looks like neural CAD generation
  if (!content.includes('neural') && !content.includes('cadquery') && !content.includes('GenerationResult')) {
    return;
  }

  const warnings = [];

  // Check for low confidence
  const confidenceMatch = content.match(/confidence[":]\s*(0\.\d+)/i);
  if (confidenceMatch) {
    const confidence = parseFloat(confidenceMatch[1]);
    if (confidence < MIN_CONFIDENCE_WARN) {
      warnings.push({
        severity: 'warning',
        msg: `CAD generation confidence ${(confidence * 100).toFixed(0)}% is below threshold — consider manual review`,
      });
    }
  }

  // Check for validation failures
  const validMatch = content.match(/valid[":]\s*(false)/i);
  if (validMatch) {
    warnings.push({
      severity: 'warning',
      msg: 'CAD generation produced invalid syntax — output may not compile',
    });
  }

  // Check for high retry count
  const attemptsMatch = content.match(/attempts[":]\s*(\d+)/i);
  if (attemptsMatch) {
    const attempts = parseInt(attemptsMatch[1], 10);
    if (attempts >= HIGH_RETRY_WARN) {
      warnings.push({
        severity: 'info',
        msg: `CAD generation required ${attempts} attempts — input may be ambiguous`,
      });
    }
  }

  // Check for missing code
  const successMatch = content.match(/success[":]\s*(true|false)/i);
  const codeMatch = content.match(/code[":]\s*"(.{0,20})/i);
  if (successMatch && successMatch[1] === 'false' && (!codeMatch || codeMatch[1].trim() === '')) {
    warnings.push({
      severity: 'error',
      msg: 'CAD generation failed with no output code — check input and backend availability',
    });
  }

  // Check for missing import in generated code
  if (content.includes('cq.Workplane') && !content.includes('import cadquery')) {
    warnings.push({
      severity: 'warning',
      msg: 'Generated CadQuery code missing import statement',
    });
  }

  if (warnings.length === 0) return;

  const errors = warnings.filter(w => w.severity === 'error');
  const warns = warnings.filter(w => w.severity === 'warning');
  const infos = warnings.filter(w => w.severity === 'info');

  let message = '';
  if (errors.length > 0) {
    message += `\n⛔ NEURAL CAD ERRORS:\n${errors.map(e => `  - ${e.msg}`).join('\n')}`;
  }
  if (warns.length > 0) {
    message += `\n⚠️ NEURAL CAD WARNINGS:\n${warns.map(w => `  - ${w.msg}`).join('\n')}`;
  }
  if (infos.length > 0) {
    message += `\nℹ️ NEURAL CAD INFO:\n${infos.map(i => `  - ${i.msg}`).join('\n')}`;
  }

  return message.trim();
}
