#!/usr/bin/env node
// tier: T4
/**
 * output-cache-inject.mjs — SessionStart hook
 *
 * Injects available cached templates at session start.
 * Provides reference IDs Claude can use instead of regenerating content.
 */

import * as fs from 'fs';

const CACHE_FILE = 'H:/prism/state/output-cache.json';

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
  } catch {}
  return null;
}

async function main() {
  const cache = loadCache();

  if (!cache || Object.keys(cache.blocks || {}).length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const blocks = Object.values(cache.blocks);
  const stats = cache.stats || {};

  // Group by category and get top 3 most-used per category
  const byCategory = {};
  for (const block of blocks) {
    if (!byCategory[block.category]) byCategory[block.category] = [];
    byCategory[block.category].push(block);
  }

  const topBlocks = [];
  for (const [category, categoryBlocks] of Object.entries(byCategory)) {
    const sorted = categoryBlocks.sort((a, b) => b.usageCount - a.usageCount);
    topBlocks.push(...sorted.slice(0, 2));
  }

  if (topBlocks.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const summary = `OUTPUT CACHE: ${blocks.length} blocks | ${stats.totalSaved || 0} tokens saved
Top templates: ${topBlocks.slice(0, 5).map(b => `[CACHED:${b.id}] (${b.category})`).join(', ')}
Use prism_dev:output_cache_get to retrieve full content.`;

  console.log(JSON.stringify({ continue: true, systemMessage: summary }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
