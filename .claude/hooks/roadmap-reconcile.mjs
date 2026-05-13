#!/usr/bin/env node
// tier: T4
/**
 * roadmap-reconcile.mjs — One-time reconciliation
 *
 * Scans for existing engines and marks matching units complete in milestone envelopes.
 * Run manually: node H:/prism/.claude/hooks/roadmap-reconcile.mjs [milestone-id]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const PRISM_ROOT = 'H:/prism';
const ENGINES_DIR = join(PRISM_ROOT, 'mcp-server/src/engines');
const MILESTONES_DIR = join(PRISM_ROOT, 'mcp-server/data/milestones');

function getExistingEngines() {
  if (!existsSync(ENGINES_DIR)) return new Set();
  const files = readdirSync(ENGINES_DIR).filter(f => f.endsWith('.ts') && !f.includes('.test.'));
  return new Set(files.map(f => basename(f, '.ts')));
}

function extractEngineNames(text) {
  // Extract engine names from unit titles/descriptions
  const patterns = [
    /([A-Z][a-zA-Z0-9]*Engine)/g,
    /([A-Z][a-zA-Z0-9]*Adapter)/g,
    /([A-Z][a-zA-Z0-9]*Bridge)/g,
  ];
  const names = new Set();
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      names.add(match[1]);
    }
    pattern.lastIndex = 0;
  }
  return names;
}

function reconcileMilestone(milestoneId) {
  const envelopePath = join(MILESTONES_DIR, `${milestoneId}.json`);
  if (!existsSync(envelopePath)) {
    console.log(`❌ Milestone not found: ${milestoneId}`);
    return { found: 0, marked: 0 };
  }

  const engines = getExistingEngines();
  let data;
  try {
    data = JSON.parse(readFileSync(envelopePath, 'utf8'));
  } catch (e) {
    console.log(`❌ Cannot parse ${milestoneId}: ${e.message}`);
    return { found: 0, marked: 0 };
  }

  let found = 0;
  let marked = 0;

  if (data.phases && Array.isArray(data.phases)) {
    for (const phase of data.phases) {
      if (!phase.units || !Array.isArray(phase.units)) continue;

      for (const unit of phase.units) {
        if (typeof unit !== 'object') continue;

        // Check if unit references an engine that exists
        const unitText = `${unit.title || ''} ${unit.description || ''} ${unit.acceptance || ''}`;
        const referencedEngines = extractEngineNames(unitText);

        for (const engineName of referencedEngines) {
          if (engines.has(engineName)) {
            found++;
            if (unit.status !== 'complete') {
              unit.status = 'complete';
              unit.completedAt = new Date().toISOString();
              unit.reconciled = true;
              marked++;
              console.log(`  ✓ ${unit.id}: ${engineName} exists`);
            }
            break; // One match is enough
          }
        }
      }
    }
  }

  if (marked > 0) {
    data.updated_at = new Date().toISOString();
    data.reconciled_at = new Date().toISOString();
    writeFileSync(envelopePath, JSON.stringify(data, null, 2), 'utf8');
  }

  return { found, marked };
}

function main() {
  const milestoneId = process.argv[2];

  if (milestoneId) {
    // Reconcile specific milestone
    console.log(`Reconciling ${milestoneId}...`);
    const result = reconcileMilestone(milestoneId);
    console.log(`\n✓ Found ${result.found} matching engines, marked ${result.marked} units complete`);
  } else {
    // List in-progress milestones
    console.log('Available milestones to reconcile:');
    const files = readdirSync(MILESTONES_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(join(MILESTONES_DIR, file), 'utf8'));
        if (data.status === 'in_progress') {
          console.log(`  - ${data.id}: ${data.title?.slice(0, 50)}...`);
        }
      } catch {}
    }
    console.log('\nUsage: node roadmap-reconcile.mjs <milestone-id>');
  }
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
