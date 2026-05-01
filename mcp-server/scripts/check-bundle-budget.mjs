#!/usr/bin/env node
/**
 * Bundle Budget Enforcement Script
 * LATHE-PROD-READY-MS0/U-LPR-BUNDLE-GATE
 *
 * Enforces per-route and per-chunk bundle size budgets.
 * Run after `npm run build` in web/ directory.
 *
 * Budgets (gzip):
 *   - main/index: ≤250KB
 *   - LatheStudioPage lazy chunk: ≤40KB
 *   - Monaco vendor: ≤600KB (excluded from main gate)
 *   - Shared chunks: ≤5KB delta per PR (baseline comparison)
 */

import { readdir, stat, readFile, writeFile } from 'fs/promises';
import { join, basename } from 'path';
import { gzipSync } from 'zlib';
import { existsSync } from 'fs';

const DIST_DIR = join(process.cwd(), 'web', '..', 'dist', 'web', 'assets');
const BASELINE_FILE = join(process.cwd(), 'data', 'state', 'BUNDLE_BASELINE.json');

// Budget in bytes (gzip)
const BUDGETS = {
  'index': 250 * 1024,         // 250KB main bundle
  'lathe': 40 * 1024,          // 40KB LatheStudioPage
  'monaco-vendor': 600 * 1024, // 600KB Monaco (excluded from gate)
  'default': 150 * 1024,       // 150KB for other chunks
};

// Chunks excluded from hard gate (still tracked)
const EXCLUDED_FROM_GATE = ['monaco-vendor', 'pdf-vendor', 'viewer-three'];

async function getGzipSize(filePath) {
  const content = await readFile(filePath);
  return gzipSync(content).length;
}

async function analyzeBundle() {
  const results = {
    timestamp: new Date().toISOString(),
    chunks: [],
    violations: [],
    totalGzip: 0,
    mainBundleGzip: 0,
  };

  if (!existsSync(DIST_DIR)) {
    console.error(`Error: dist directory not found at ${DIST_DIR}`);
    console.error('Run `npm run build` in web/ first.');
    process.exit(1);
  }

  const files = await readdir(DIST_DIR);
  const jsFiles = files.filter(f => f.endsWith('.js'));

  for (const file of jsFiles) {
    const filePath = join(DIST_DIR, file);
    const rawSize = (await stat(filePath)).size;
    const gzipSize = await getGzipSize(filePath);

    const chunkName = file.replace(/-[a-f0-9]+\.js$/, '');
    const isExcluded = EXCLUDED_FROM_GATE.some(ex => chunkName.includes(ex));

    const budget = BUDGETS[chunkName] || BUDGETS.default;
    const overBudget = gzipSize > budget;
    const overPercent = ((gzipSize / budget) * 100 - 100).toFixed(1);

    results.chunks.push({
      name: chunkName,
      file,
      rawKB: (rawSize / 1024).toFixed(1),
      gzipKB: (gzipSize / 1024).toFixed(1),
      budgetKB: (budget / 1024).toFixed(0),
      overBudget: overBudget && !isExcluded,
      excluded: isExcluded,
    });

    results.totalGzip += gzipSize;

    if (chunkName === 'index' || chunkName.startsWith('main')) {
      results.mainBundleGzip += gzipSize;
    }

    if (overBudget && !isExcluded) {
      results.violations.push({
        chunk: chunkName,
        gzipKB: (gzipSize / 1024).toFixed(1),
        budgetKB: (budget / 1024).toFixed(0),
        overPercent,
      });
    }
  }

  return results;
}

async function loadBaseline() {
  if (!existsSync(BASELINE_FILE)) {
    return null;
  }
  const content = await readFile(BASELINE_FILE, 'utf8');
  return JSON.parse(content);
}

async function saveBaseline(results) {
  const baseline = {
    schemaVersion: 1,
    timestamp: results.timestamp,
    chunks: Object.fromEntries(
      results.chunks.map(c => [c.name, parseFloat(c.gzipKB)])
    ),
  };
  await writeFile(BASELINE_FILE, JSON.stringify(baseline, null, 2));
  console.log(`Baseline saved to ${BASELINE_FILE}`);
}

function printReport(results, baseline) {
  console.log('\n=== PRISM Bundle Budget Report ===\n');
  console.log(`Total gzip: ${(results.totalGzip / 1024).toFixed(1)} KB`);
  console.log(`Main bundle gzip: ${(results.mainBundleGzip / 1024).toFixed(1)} KB`);
  console.log(`Main budget: ${BUDGETS.index / 1024} KB`);
  console.log('');

  console.log('Chunks:');
  console.log('─'.repeat(70));
  console.log(
    'Chunk'.padEnd(30) +
    'Gzip KB'.padStart(10) +
    'Budget'.padStart(10) +
    'Status'.padStart(12) +
    'Delta'.padStart(8)
  );
  console.log('─'.repeat(70));

  for (const chunk of results.chunks.sort((a, b) => parseFloat(b.gzipKB) - parseFloat(a.gzipKB))) {
    const delta = baseline?.chunks?.[chunk.name]
      ? (parseFloat(chunk.gzipKB) - baseline.chunks[chunk.name]).toFixed(1)
      : 'new';

    const status = chunk.excluded
      ? 'EXCLUDED'
      : chunk.overBudget
        ? 'OVER'
        : 'OK';

    const statusColor = status === 'OK' ? '' : status === 'EXCLUDED' ? '' : '';

    console.log(
      chunk.name.substring(0, 29).padEnd(30) +
      chunk.gzipKB.padStart(10) +
      chunk.budgetKB.padStart(10) +
      status.padStart(12) +
      (delta === 'new' ? delta : (delta >= 0 ? `+${delta}` : delta)).padStart(8)
    );
  }

  console.log('─'.repeat(70));
  console.log('');

  if (results.violations.length > 0) {
    console.log('VIOLATIONS:');
    for (const v of results.violations) {
      console.log(`  ${v.chunk}: ${v.gzipKB}KB exceeds ${v.budgetKB}KB budget (+${v.overPercent}%)`);
    }
    console.log('');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const saveBaselineFlag = args.includes('--save-baseline');
  const strictMode = args.includes('--strict');

  try {
    const results = await analyzeBundle();
    const baseline = await loadBaseline();

    printReport(results, baseline);

    if (saveBaselineFlag) {
      await saveBaseline(results);
    }

    // Check for delta violations (5KB max per PR)
    if (baseline && strictMode) {
      const deltaViolations = [];
      for (const chunk of results.chunks) {
        if (baseline.chunks?.[chunk.name]) {
          const delta = parseFloat(chunk.gzipKB) - baseline.chunks[chunk.name];
          if (delta > 5) {
            deltaViolations.push({ chunk: chunk.name, delta: delta.toFixed(1) });
          }
        }
      }

      if (deltaViolations.length > 0) {
        console.log('DELTA VIOLATIONS (>5KB increase from baseline):');
        for (const v of deltaViolations) {
          console.log(`  ${v.chunk}: +${v.delta}KB`);
        }
        console.log('');
      }
    }

    if (strictMode && results.violations.length > 0) {
      console.log('STRICT MODE: Failing due to budget violations');
      process.exit(1);
    }

    if (results.violations.length === 0) {
      console.log('All chunks within budget.');
    }

  } catch (err) {
    console.error('Error analyzing bundle:', err.message);
    process.exit(1);
  }
}

main();
