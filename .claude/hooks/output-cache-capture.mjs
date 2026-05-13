#!/usr/bin/env node
// tier: T4
/**
 * output-cache-capture.mjs — Stop hook
 *
 * Captures reusable output patterns at session end for future token savings.
 * Detects common patterns: summaries, explanations, code templates.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'node:crypto';

const CACHE_FILE = 'H:/prism/state/output-cache.json';
const MIN_LENGTH = 50;
const MAX_LENGTH = 5000;

function hash(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function estimateTokens(content) {
  return Math.ceil(content.length / 4);
}

function detectCategory(content) {
  const lower = content.toLowerCase();
  if (lower.includes('summary') || lower.includes('completed')) return 'summary';
  if (lower.includes('error') || lower.includes('failed')) return 'error_response';
  if (lower.includes('```')) return 'code_pattern';
  if (lower.includes('commit') || lower.includes('co-authored')) return 'commit_message';
  return 'other';
}

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
  } catch {}
  return { blocks: {}, stats: { totalSaved: 0, totalHits: 0, totalMisses: 0 } };
}

function saveCache(cache) {
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function main() {
  let input;
  try {
    const _raw = readStdinSafe();
    if (!_raw) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }
    input = JSON.parse(_raw);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Stop hook receives session transcript
  const transcript = input?.transcript || input?.session_output || '';
  if (!transcript || transcript.length < MIN_LENGTH) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Extract potential cacheable blocks (summaries, code patterns)
  const patterns = [
    /\*\*Summary[^*]*\*\*[\s\S]{50,500}/gi,
    /```[\s\S]{50,1000}```/g,
    /## [A-Z][^\n]+\n[\s\S]{50,500}/g,
  ];

  const cache = loadCache();
  let newBlocks = 0;

  for (const pattern of patterns) {
    const matches = transcript.match(pattern) || [];
    for (const match of matches.slice(0, 5)) {
      if (match.length < MIN_LENGTH || match.length > MAX_LENGTH) continue;

      const contentHash = hash(match);
      if (!cache.blocks[contentHash]) {
        cache.blocks[contentHash] = {
          id: `blk_${contentHash.slice(0, 8)}`,
          hash: contentHash,
          content: match,
          category: detectCategory(match),
          usageCount: 1,
          lastUsed: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          tokens: estimateTokens(match),
        };
        newBlocks++;
      }
    }
  }

  if (newBlocks > 0) {
    saveCache(cache);
    console.log(JSON.stringify({
      continue: true,
      systemMessage: `Output cache: captured ${newBlocks} new reusable blocks`
    }));
  } else {
    console.log(JSON.stringify({ continue: true }));
  }
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
