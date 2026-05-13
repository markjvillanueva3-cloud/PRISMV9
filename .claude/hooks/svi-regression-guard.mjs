#!/usr/bin/env node
// tier: T4
/**
 * SVI Regression Guard Hook (Stop hook)
 *
 * Enforces CLAUDE-CODEX-SVI-DIRECTIVE.md:
 * - Before session ends, check if SVI metrics regressed
 * - Warn if Psi (reachability) dropped
 * - Warn if watched surfaces show coverage decrease
 *
 * Warning hook: continueOnError = true
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const SVI_FILE = 'H:/prism/state/shared/SVI.json';
const SVI_WATCH_FILE = 'H:/prism/state/shared/SVI-watch-status.json';
const SVI_BASELINE_FILE = 'H:/prism/state/shared/.svi-session-baseline.json';

function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readJSON(path) {
  try {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf8'));
    }
  } catch {}
  return null;
}

function main() {
  try {
    const currentSVI = readJSON(SVI_FILE);
    const baseline = readJSON(SVI_BASELINE_FILE);

    if (!currentSVI) {
      // No SVI data, can't check regression
      process.exit(0);
    }

    // If no baseline, save current as baseline for next session
    if (!baseline) {
      ensureDir(SVI_BASELINE_FILE);
      writeFileSync(SVI_BASELINE_FILE, JSON.stringify({
        svi: currentSVI.svi || currentSVI.SVI,
        psi: currentSVI.psi || currentSVI.reachability,
        timestamp: new Date().toISOString()
      }));
      process.exit(0);
    }

    // Compare current vs baseline
    const currentPsi = currentSVI.psi || currentSVI.reachability || 0;
    const baselinePsi = baseline.psi || 0;

    const warnings = [];

    // Check Psi regression
    if (currentPsi < baselinePsi - 0.01) {
      warnings.push(`Psi REGRESSED: ${(baselinePsi * 100).toFixed(1)}% → ${(currentPsi * 100).toFixed(1)}%`);
    }

    // Check SVI increase (bad - means more variability/less coverage)
    const currentSVIValue = parseFloat(currentSVI.svi || currentSVI.SVI || 0);
    const baselineSVIValue = parseFloat(baseline.svi || 0);

    if (currentSVIValue > baselineSVIValue * 1.1) {
      warnings.push(`SVI increased significantly: ${baselineSVIValue.toExponential(2)} → ${currentSVIValue.toExponential(2)}`);
    }

    if (warnings.length > 0) {
      console.log(JSON.stringify({
        additionalContext: `SVI DIRECTIVE WARNING:\n${warnings.join('\n')}\n\n` +
          `Check: H:/prism/state/shared/SVI-watch-status.md\n` +
          `Action: Wire any disconnected surfaces or fix coverage gaps before ending session.`
      }));
    }

    // Update baseline for next session
    ensureDir(SVI_BASELINE_FILE);
    writeFileSync(SVI_BASELINE_FILE, JSON.stringify({
      svi: currentSVIValue,
      psi: currentPsi,
      timestamp: new Date().toISOString()
    }));

    process.exit(0);

  } catch (err) {
    // Silent failure
    console.error(`svi-regression-guard error: ${err.message}`);
    process.exit(0);
  }
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
