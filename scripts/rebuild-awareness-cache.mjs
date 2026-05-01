#!/usr/bin/env node
/**
 * rebuild-awareness-cache.mjs — Rebuild PRISM awareness cache
 *
 * Reads live inventory and dispatcher data to build a compact awareness cache.
 * Run manually or on inventory change.
 *
 * Usage: node scripts/rebuild-awareness-cache.mjs [--quiet]
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const CACHE_PATH = 'H:/prism/.claude/cache/prism-awareness.json';
const INVENTORY_PATH = 'H:/prism/PRISM-INVENTORY-LATEST.md';
const DISPATCHER_DIGEST = 'H:/prism/mcp-server/data/docs/DISPATCHER_DIGEST.md';

const quiet = process.argv.includes('--quiet');
const log = quiet ? () => {} : console.log;

function extractInventoryCounts() {
  try {
    const inv = fs.readFileSync(INVENTORY_PATH, 'utf8');
    return {
      engines: inv.match(/Engines\*\* \| (\d+)/)?.[1] || '?',
      dispatchers: inv.match(/Dispatchers\*\* \| (\d+)/)?.[1] || '?',
      actions: inv.match(/Actions\*\* \| (\d+)/)?.[1] || '?',
      hooks: inv.match(/Claude Hooks\*\* \| (\d+)/)?.[1] || '?',
      tests: inv.match(/Tests\*\* \| (\d+)/)?.[1] || '?',
    };
  } catch (e) {
    log('Warning: Could not read inventory:', e.message);
    return { engines: '?', dispatchers: '?', actions: '?', hooks: '?', tests: '?' };
  }
}

function extractTopRoutes() {
  // Common task patterns → dispatcher routes
  return [
    { pattern: 'force|cutting|kienzle|taylor', route: 'prism_calc:cutting_force_*' },
    { pattern: 'thermal|heat|temperature', route: 'prism_calc:thermal_*' },
    { pattern: 'deflection|stiffness|vibration', route: 'prism_calc:deflection_*' },
    { pattern: 'surface|roughness|finish', route: 'prism_calc:surface_*' },
    { pattern: 'toolpath|gcode|program|cam', route: 'prism_cam:toolpath_*' },
    { pattern: 'wedm|wire.*edm|spark', route: 'prism_cam:wedm_*' },
    { pattern: 'turning|lathe', route: 'prism_turning:*' },
    { pattern: '5.*axis|multi.*axis', route: 'prism_5axis:*' },
    { pattern: 'safety|collision|S\\(x\\)', route: 'prism_safety:validate_*' },
    { pattern: 'build|test|quality|audit', route: 'prism_dev:*' },
    { pattern: 'reason|think|plan|ai', route: 'prism_ai:*' },
    { pattern: 'memory|persist|recall', route: 'prism_memory:*' },
  ];
}

function getActiveConstraints() {
  return [
    'omega-1.0-target',
    'always-build',
    'no-delete-assets',
    'rtk-prefix-bash',
    'dedup-before-create',
  ];
}

function getRecentActivity() {
  try {
    const result = execSync('cd H:/prism && git log --oneline -5 --format="%s"', { encoding: 'utf8' });
    return result.trim().split('\n').slice(0, 3);
  } catch {
    return [];
  }
}

function buildCache() {
  const counts = extractInventoryCounts();
  const routes = extractTopRoutes();
  const constraints = getActiveConstraints();
  const recent = getRecentActivity();

  const compactAwareness = `${counts.engines} engines, ${counts.dispatchers} dispatchers, ${counts.actions} actions. Key routes: prism_calc (physics), prism_cam (toolpath), prism_ai (reasoning). RTK prefix for bash. /dedup before creating.`;

  return {
    version: new Date().toISOString(),
    inventory_hash: `${counts.engines}-${counts.dispatchers}-${counts.actions}`,
    compact_awareness: compactAwareness,
    counts,
    top_routes: routes,
    active_constraints: constraints,
    recent_commits: recent,
  };
}

function main() {
  log('Rebuilding PRISM awareness cache...');

  const cache = buildCache();

  // Ensure directory exists
  const dir = path.dirname(CACHE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));

  log(`Cache written to ${CACHE_PATH}`);
  log(`Inventory: ${cache.counts.engines} engines, ${cache.counts.dispatchers} dispatchers`);
  log(`Routes: ${cache.top_routes.length} patterns`);
  log(`Constraints: ${cache.active_constraints.join(', ')}`);
}

main();
