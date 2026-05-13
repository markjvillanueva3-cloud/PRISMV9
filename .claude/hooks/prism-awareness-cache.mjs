#!/usr/bin/env node
// tier: T2
/**
 * prism-awareness-cache.mjs — SessionStart hook
 *
 * Event: SessionStart
 *
 * Instead of loading full inventory files (5000+ tokens):
 * 1. Read pre-computed cache (~50-100 tokens)
 * 2. Inject compact awareness
 * 3. Include top route patterns for common tasks
 *
 * Token Savings: 5000 tokens → 100 tokens (98% reduction)
 *
 * Cache is rebuilt by: scripts/rebuild-awareness-cache.mjs
 * Triggered by: inventory changes, manually, or staleness (>24h)
 */

import fs from 'node:fs';
import path from 'node:path';

const CACHE_PATH = 'H:/prism/.claude/cache/prism-awareness.json';
const INVENTORY_PATH = 'H:/prism/PRISM-INVENTORY-LATEST.md';
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return '';
    return fs.readFileSync(0, 'utf-8');
  } catch {
    return '';
  }
}

function getCacheAge() {
  try {
    const stats = fs.statSync(CACHE_PATH);
    return Date.now() - stats.mtimeMs;
  } catch {
    return Infinity;
  }
}

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function buildFallbackAwareness() {
  // Quick fallback if cache doesn't exist
  try {
    const inv = fs.readFileSync(INVENTORY_PATH, 'utf8');
    const engines = inv.match(/Engines\*\* \| (\d+)/)?.[1] || '2392';
    const dispatchers = inv.match(/Dispatchers\*\* \| (\d+)/)?.[1] || '91';
    const actions = inv.match(/Actions\*\* \| (\d+)/)?.[1] || '5685';

    return {
      compact_awareness: `${engines} engines, ${dispatchers} dispatchers, ${actions} actions. Key routes: prism_calc (physics), prism_cam (toolpath), prism_ai (reasoning). RTK prefix for bash. /dedup before creating.`,
      top_routes: [
        { pattern: 'force|cutting|kienzle', route: 'prism_calc:cutting_force_*' },
        { pattern: 'toolpath|gcode|program', route: 'prism_cam:toolpath_*' },
        { pattern: 'safety|collision|S(x)', route: 'prism_safety:validate_*' },
        { pattern: 'build|test|quality', route: 'prism_dev:*' },
      ],
      active_constraints: ['omega-1.0-target', 'always-build', 'no-delete-assets'],
      stale: true
    };
  } catch {
    return null;
  }
}

async function main() {
  const input = readStdinSafe();
  // SessionStart doesn't always have payload, but check anyway

  // Check cache freshness
  const cacheAge = getCacheAge();
  const isStale = cacheAge > MAX_CACHE_AGE_MS;

  let awareness = loadCache();

  if (!awareness || isStale) {
    awareness = buildFallbackAwareness();
    if (!awareness) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }
  }

  // Build compact context injection
  const lines = [];
  lines.push('## PRISM baseline awareness');
  lines.push(`**Built:** ${awareness.compact_awareness}`);

  if (awareness.top_routes && awareness.top_routes.length > 0) {
    lines.push('**Quick routes:** ' + awareness.top_routes.slice(0, 4).map(r => `\`${r.pattern}\` → ${r.route}`).join(' | '));
  }

  if (awareness.active_constraints && awareness.active_constraints.length > 0) {
    lines.push(`**Constraints:** ${awareness.active_constraints.join(', ')}`);
  }

  if (awareness.stale) {
    lines.push('*(cache stale — run `node scripts/rebuild-awareness-cache.mjs`)*');
  }

  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: lines.join('\n'),
    }
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
