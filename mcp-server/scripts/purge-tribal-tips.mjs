#!/usr/bin/env node
/**
 * U-TK01: Purge test artifacts + content-dedup captured tribal tips
 *
 * Removes:
 * - Test sources (test:*, *_test, video:test-*, document:test-*, ingestion:*test*)
 * - Duplicate content (same title + body hash)
 *
 * Keeps:
 * - Real shop floor data
 * - Video learning from real sources (YouTube/*)
 * - Document learning from real docs
 * - Operator tips
 */

import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { resolve } from 'path';

const TIPS_PATH = resolve(process.cwd(), '../state/tribal_captured_tips.json');

// Test source patterns to remove
const TEST_PATTERNS = [
  /^test$/i,
  /^test:/i,
  /:test$/i,
  /_test$/i,
  /^video:test-/i,
  /^document:test-/i,
  /ingestion:.*test/i,
  /ingestion:batch_test/i,
  /ingestion:dispatcher_test/i,
  /ingestion:tag_test/i,
];

function isTestSource(source) {
  if (!source) return false;
  return TEST_PATTERNS.some(pattern => pattern.test(source));
}

function contentHash(tip) {
  const content = `${tip.title || ''}::${tip.body || ''}`.toLowerCase().trim();
  return createHash('md5').update(content).digest('hex');
}

function main() {
  console.log('Loading tribal_captured_tips.json...');
  const raw = readFileSync(TIPS_PATH, 'utf-8');
  const tips = JSON.parse(raw);
  console.log(`Loaded ${tips.length} tips`);

  // Step 1: Filter out test sources
  const realTips = tips.filter(tip => !isTestSource(tip.source));
  console.log(`After test filter: ${realTips.length} tips (removed ${tips.length - realTips.length} test artifacts)`);

  // Step 2: Content deduplication
  const seen = new Map();
  const dedupedTips = [];
  let duplicates = 0;

  for (const tip of realTips) {
    const hash = contentHash(tip);
    if (!seen.has(hash)) {
      seen.set(hash, tip.id);
      dedupedTips.push(tip);
    } else {
      duplicates++;
      console.log(`  Duplicate: "${tip.title?.slice(0, 50)}..." (same as ${seen.get(hash)})`);
    }
  }
  console.log(`After dedup: ${dedupedTips.length} tips (removed ${duplicates} duplicates)`);

  // Step 3: Write cleaned file
  const output = JSON.stringify(dedupedTips, null, 2);
  writeFileSync(TIPS_PATH, output, 'utf-8');
  console.log(`\nSaved ${dedupedTips.length} cleaned tips to ${TIPS_PATH}`);

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Original: ${tips.length}`);
  console.log(`Test artifacts removed: ${tips.length - realTips.length}`);
  console.log(`Duplicates removed: ${duplicates}`);
  console.log(`Final: ${dedupedTips.length}`);

  // Source breakdown
  const bySource = {};
  for (const tip of dedupedTips) {
    const src = tip.source || 'unknown';
    bySource[src] = (bySource[src] || 0) + 1;
  }
  console.log('\nBy source:');
  Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .forEach(([src, count]) => console.log(`  ${src}: ${count}`));
}

main();
