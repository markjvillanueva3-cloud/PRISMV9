// tier: T3
/**
 * tolerance-stack-guard.mjs — PostToolUse hook
 * CADCAM-DAGI-MS0/U-DAGI12
 *
 * Monitors tolerance stack analysis and warns on violations:
 * - Fails on stack-up violations that exceed requirements
 * - Warns on tight tolerances that may be difficult to achieve
 * - Reports GD&T accuracy below threshold
 */

export default async function toleranceStackGuard({ tool, toolInput, toolResult }) {
  // Only check Write/Bash for tolerance work
  if (tool !== 'Write' && tool !== 'Bash') return;

  const content = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult ?? {});

  // Only check if it looks like tolerance output
  if (!content.includes('ToleranceAware') && !content.includes('stackAnalys') && !content.includes('gdtAccuracy')) {
    return;
  }

  const warnings = [];

  // Check for stack-up violations
  if (content.includes('passesRequirement') && content.includes('false')) {
    const stackMatch = content.match(/"stackTolerance"\s*:\s*([\d.]+)/i);
    const maxMatch = content.match(/"maxStackTolerance"\s*:\s*([\d.]+)/i);
    if (stackMatch) {
      const stack = parseFloat(stackMatch[1]);
      const max = maxMatch ? parseFloat(maxMatch[1]) : 0.1;
      warnings.push({
        severity: 'error',
        msg: `Stack-up violation: ${stack.toFixed(3)}mm exceeds ${max}mm requirement`,
      });
    }
  }

  // Check for low GD&T accuracy
  const gdtMatch = content.match(/"gdtAccuracy"\s*:\s*([\d.]+)/i);
  if (gdtMatch) {
    const accuracy = parseFloat(gdtMatch[1]);
    if (accuracy < 0.7) {
      warnings.push({
        severity: 'warning',
        msg: `Low GD&T coverage (${(accuracy * 100).toFixed(0)}%) — consider adding more callouts`,
      });
    }
  }

  // Check for capability warnings
  const capWarnings = content.match(/"warnings"\s*:\s*\[([^\]]+)\]/i);
  if (capWarnings) {
    const warnContent = capWarnings[1];
    if (warnContent.includes('difficult to achieve') || warnContent.includes('tight for this machine')) {
      warnings.push({
        severity: 'warning',
        msg: 'Tolerance capability warning — some features may exceed machine capability',
      });
    }
  }

  // Check for critical contributor count
  const critMatch = content.match(/"criticalContributors"\s*:\s*\[([^\]]*)\]/i);
  if (critMatch) {
    const contributors = critMatch[1].split(',').filter(c => c.trim().length > 0);
    if (contributors.length > 3) {
      warnings.push({
        severity: 'warning',
        msg: `${contributors.length} features contributing significantly to stack — review tolerances`,
      });
    }
  }

  if (warnings.length === 0) return;

  const errors = warnings.filter(w => w.severity === 'error');
  const warns = warnings.filter(w => w.severity === 'warning');

  let message = '';
  if (errors.length > 0) {
    message += `\n🚫 TOLERANCE STACK VIOLATION:\n${errors.map(e => `  - ${e.msg}`).join('\n')}`;
  }
  if (warns.length > 0) {
    message += `\n⚠️ TOLERANCE WARNINGS:\n${warns.map(w => `  - ${w.msg}`).join('\n')}`;
  }

  return message.trim();
}
