// tier: T4
/**
 * blueprint-accuracy-guard.mjs — PostToolUse hook
 * CADCAM-DAGI-MS0/U-DAGI08
 *
 * Monitors BlueprintToCADGenerationEngine output quality:
 * - Dimensional accuracy < 99% (exit gate requirement)
 * - GD&T preservation < 95%
 * - OCR confidence < 0.8
 * - Missing views (no front/top/side)
 */

const MIN_DIM_ACCURACY = 99;
const MIN_GDT_PRESERVATION = 95;
const MIN_OCR_CONFIDENCE = 0.8;

export default async function blueprintAccuracyGuard({ tool, toolInput, toolResult }) {
  // Only check Write/Bash for blueprint work
  if (tool !== 'Write' && tool !== 'Bash') return;

  const content = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult ?? {});

  // Only check if it looks like blueprint-to-CAD work
  if (!content.includes('blueprint') && !content.includes('Blueprint') && !content.includes('dimensionValidation')) {
    return;
  }

  const warnings = [];

  // Check dimensional accuracy
  const dimAccuracyMatch = content.match(/accuracyPercent[":]\s*([\d.]+)/i);
  if (dimAccuracyMatch) {
    const accuracy = parseFloat(dimAccuracyMatch[1]);
    if (accuracy < MIN_DIM_ACCURACY) {
      warnings.push({
        severity: accuracy < 90 ? 'error' : 'warning',
        msg: `Dimensional accuracy ${accuracy.toFixed(1)}% is below ${MIN_DIM_ACCURACY}% threshold`,
      });
    }
  }

  // Check GD&T preservation
  const gdtMatch = content.match(/preservationPercent[":]\s*([\d.]+)/i);
  if (gdtMatch) {
    const preservation = parseFloat(gdtMatch[1]);
    if (preservation < MIN_GDT_PRESERVATION) {
      warnings.push({
        severity: 'warning',
        msg: `GD&T preservation ${preservation.toFixed(1)}% is below ${MIN_GDT_PRESERVATION}% threshold`,
      });
    }
  }

  // Check OCR confidence
  const ocrConfMatch = content.match(/"confidence":\s*(0\.\d+)/i);
  if (ocrConfMatch) {
    const confidence = parseFloat(ocrConfMatch[1]);
    if (confidence < MIN_OCR_CONFIDENCE) {
      warnings.push({
        severity: 'info',
        msg: `OCR confidence ${(confidence * 100).toFixed(0)}% is low — verify extracted dimensions`,
      });
    }
  }

  // Check for missing critical views
  const viewsMatch = content.match(/viewsProcessed[":]\s*\[(.*?)\]/i);
  if (viewsMatch) {
    const views = viewsMatch[1].toLowerCase();
    if (!views.includes('front') && !views.includes('top') && !views.includes('side')) {
      warnings.push({
        severity: 'warning',
        msg: 'No standard orthographic views (front/top/side) processed',
      });
    }
  }

  // Check for dimension validation failures
  const dimFailMatch = content.match(/withinTolerance[":]\s*false/gi);
  if (dimFailMatch && dimFailMatch.length > 0) {
    warnings.push({
      severity: 'info',
      msg: `${dimFailMatch.length} dimension(s) outside tolerance — review validation details`,
    });
  }

  if (warnings.length === 0) return;

  const errors = warnings.filter(w => w.severity === 'error');
  const warns = warnings.filter(w => w.severity === 'warning');
  const infos = warnings.filter(w => w.severity === 'info');

  let message = '';
  if (errors.length > 0) {
    message += `\n⛔ BLUEPRINT ACCURACY ERRORS:\n${errors.map(e => `  - ${e.msg}`).join('\n')}`;
  }
  if (warns.length > 0) {
    message += `\n⚠️ BLUEPRINT ACCURACY WARNINGS:\n${warns.map(w => `  - ${w.msg}`).join('\n')}`;
  }
  if (infos.length > 0) {
    message += `\nℹ️ BLUEPRINT INFO:\n${infos.map(i => `  - ${i.msg}`).join('\n')}`;
  }

  return message.trim();
}
