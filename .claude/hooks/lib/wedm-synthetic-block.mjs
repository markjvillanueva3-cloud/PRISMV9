// tier: T1
/**
 * wedm-synthetic-block hook
 * Blocks commits that add synthetic_placeholder to WEDM engines
 *
 * Built by: MS-P1-100PCT / U-P1-01
 * Hook type: PreToolUse (on git commit for WEDM files)
 */

import { execSync } from 'child_process';

export function checkForSyntheticPlaceholder(stagedFiles = []) {
  const wedmFiles = stagedFiles.filter(f =>
    f.includes('WEDM') || f.includes('EDM') || f.includes('WireEDM')
  );

  if (wedmFiles.length === 0) {
    return { status: 'pass', message: 'No WEDM files staged' };
  }

  const violations = [];

  for (const file of wedmFiles) {
    try {
      const diff = execSync(`git diff --cached "${file}"`, { windowsHide: true, encoding: 'utf-8' });
      if (diff.includes('synthetic_placeholder')) {
        violations.push(file);
      }
    } catch {
      // File might be new or deleted
    }
  }

  if (violations.length > 0) {
    return {
      status: 'block',
      message: `BLOCKED: synthetic_placeholder found in ${violations.length} file(s): ${violations.join(', ')}. Replace with cited values from manufacturer catalogs.`
    };
  }

  return {
    status: 'pass',
    message: `${wedmFiles.length} WEDM file(s) clean of synthetic_placeholder`
  };
}

export default checkForSyntheticPlaceholder;
