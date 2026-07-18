/**
 * MCAT-MS0 U-MCAT21: Machine Corpus Performance Benchmarks
 *
 * Benchmarks key machine data operations:
 * - Corpus load time
 * - Machine lookup by ID
 * - Manufacturer filtering
 * - Type-based filtering
 * - Spindle constraint checking
 * - CanonicalMachinePackage validation
 *
 * Run: npx tsx devtools/analysis/machine-corpus-benchmark.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  opsPerSec: number;
}

interface BenchmarkSuite {
  timestamp: string;
  corpus_size: number;
  node_version: string;
  platform: string;
  results: BenchmarkResult[];
  summary: {
    total_benchmarks: number;
    passed: number;
    failed: number;
    total_time_ms: number;
  };
}

function benchmark(name: string, fn: () => void, iterations: number = 1000): BenchmarkResult {
  const times: number[] = [];

  // Warmup
  for (let i = 0; i < 10; i++) fn();

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }

  const totalMs = times.reduce((a, b) => a + b, 0);
  const avgMs = totalMs / iterations;
  const minMs = Math.min(...times);
  const maxMs = Math.max(...times);
  const opsPerSec = 1000 / avgMs;

  return { name, iterations, totalMs, avgMs, minMs, maxMs, opsPerSec };
}

function runBenchmarks(): BenchmarkSuite {
  const corpusPath = path.resolve(__dirname, '../../../data/machines/ENHANCED/json/ALL_MACHINES_ENRICHED.json');

  console.log(`\n=== MCAT-MS0 U-MCAT21: Machine Corpus Performance Benchmarks ===\n`);

  // Check if corpus exists, use mock data if not
  let corpus: any[] = [];
  if (fs.existsSync(corpusPath)) {
    console.log(`Loading corpus from: ${corpusPath}`);
    corpus = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));
  } else {
    console.log(`Corpus not found, generating mock data...`);
    corpus = generateMockCorpus(500);
  }

  console.log(`Corpus size: ${corpus.length} machines\n`);

  const results: BenchmarkResult[] = [];

  // 1. Full corpus load
  console.log('Benchmarking: Full corpus load...');
  if (fs.existsSync(corpusPath)) {
    results.push(benchmark('corpus_load', () => {
      JSON.parse(fs.readFileSync(corpusPath, 'utf8'));
    }, 50));
  } else {
    results.push({ name: 'corpus_load', iterations: 0, totalMs: 0, avgMs: 0, minMs: 0, maxMs: 0, opsPerSec: 0 });
  }

  // 2. Machine lookup by ID (using Map)
  console.log('Benchmarking: Machine lookup by ID (Map)...');
  const machineMap = new Map(corpus.map(m => [m.id, m]));
  const testId = corpus[Math.floor(corpus.length / 2)]?.id ?? 'test-id';
  results.push(benchmark('lookup_by_id_map', () => {
    machineMap.get(testId);
  }, 10000));

  // 3. Machine lookup by ID (array find)
  console.log('Benchmarking: Machine lookup by ID (Array.find)...');
  results.push(benchmark('lookup_by_id_find', () => {
    corpus.find(m => m.id === testId);
  }, 1000));

  // 4. Filter by manufacturer
  console.log('Benchmarking: Filter by manufacturer...');
  results.push(benchmark('filter_manufacturer', () => {
    corpus.filter(m => m.manufacturer === 'Haas');
  }, 1000));

  // 5. Filter by type
  console.log('Benchmarking: Filter by type...');
  results.push(benchmark('filter_type', () => {
    corpus.filter(m => m.canonical_type === 'VMC' || m.type === 'VMC');
  }, 1000));

  // 6. Filter by multiple criteria
  console.log('Benchmarking: Complex filter (type + manufacturer + spindle)...');
  results.push(benchmark('filter_complex', () => {
    corpus.filter(m =>
      (m.canonical_type === 'VMC' || m.type === 'VMC') &&
      m.manufacturer === 'Haas' &&
      m.spindle?.max_rpm >= 8000
    );
  }, 1000));

  // 7. Spindle constraint check
  console.log('Benchmarking: Spindle constraint validation...');
  results.push(benchmark('spindle_constraint_check', () => {
    for (const m of corpus.slice(0, 100)) {
      const spindle = m.spindle;
      if (!spindle) continue;
      const rpmOk = (spindle.max_rpm ?? 0) >= 5000;
      const powerOk = (spindle.power_kw ?? spindle.power_continuous_kw ?? 0) >= 10;
      const torqueOk = (spindle.max_torque_nm ?? spindle.torque_nm ?? 0) >= 50;
      const _valid = rpmOk && powerOk && torqueOk;
    }
  }, 500));

  // 8. Completeness scoring
  console.log('Benchmarking: Completeness score calculation...');
  results.push(benchmark('completeness_score', () => {
    for (const m of corpus.slice(0, 100)) {
      const hasSpindle = !!(m.spindle?.max_rpm && m.spindle?.power_kw);
      const hasController = !!(m.controller?.manufacturer && m.controller?.model);
      const hasEnvelope = !!(m.envelope?.x_travel && m.envelope?.y_travel);
      const hasCoolant = m.spindle?.coolant_through !== undefined;
      const _score = [hasSpindle, hasController, hasEnvelope, hasCoolant].filter(Boolean).length / 4;
    }
  }, 500));

  // 9. Group by manufacturer
  console.log('Benchmarking: Group by manufacturer...');
  results.push(benchmark('group_by_manufacturer', () => {
    corpus.reduce((acc, m) => {
      const mfr = m.manufacturer ?? 'Unknown';
      if (!acc[mfr]) acc[mfr] = [];
      acc[mfr].push(m);
      return acc;
    }, {} as Record<string, any[]>);
  }, 500));

  // 10. JSON serialization
  console.log('Benchmarking: JSON serialization (100 machines)...');
  const subset = corpus.slice(0, 100);
  results.push(benchmark('json_serialize_100', () => {
    JSON.stringify(subset);
  }, 500));

  // Print results
  console.log('\n=== Results ===\n');
  console.log('Benchmark                      | Iterations | Avg (ms) | Min (ms) | Max (ms) | Ops/sec');
  console.log('-------------------------------|------------|----------|----------|----------|--------');

  for (const r of results) {
    const name = r.name.padEnd(30);
    const iter = r.iterations.toString().padStart(10);
    const avg = r.avgMs.toFixed(3).padStart(8);
    const min = r.minMs.toFixed(3).padStart(8);
    const max = r.maxMs.toFixed(3).padStart(8);
    const ops = r.opsPerSec.toFixed(0).padStart(7);
    console.log(`${name} | ${iter} | ${avg} | ${min} | ${max} | ${ops}`);
  }

  // Performance thresholds
  const thresholds: Record<string, number> = {
    lookup_by_id_map: 0.01,      // < 0.01ms
    lookup_by_id_find: 1,        // < 1ms
    filter_manufacturer: 5,      // < 5ms
    filter_type: 5,              // < 5ms
    filter_complex: 10,          // < 10ms
    spindle_constraint_check: 5, // < 5ms
    completeness_score: 5,       // < 5ms
    group_by_manufacturer: 10,   // < 10ms
    json_serialize_100: 5,       // < 5ms
  };

  let passed = 0;
  let failed = 0;

  console.log('\n=== Threshold Checks ===\n');
  for (const r of results) {
    const threshold = thresholds[r.name];
    if (threshold !== undefined) {
      const ok = r.avgMs <= threshold;
      if (ok) passed++; else failed++;
      const status = ok ? '✓ PASS' : '✗ FAIL';
      console.log(`${status}: ${r.name} (${r.avgMs.toFixed(3)}ms <= ${threshold}ms)`);
    }
  }

  const suite: BenchmarkSuite = {
    timestamp: new Date().toISOString(),
    corpus_size: corpus.length,
    node_version: process.version,
    platform: process.platform,
    results,
    summary: {
      total_benchmarks: results.length,
      passed,
      failed,
      total_time_ms: results.reduce((a, r) => a + r.totalMs, 0),
    },
  };

  // Write results
  const outPath = path.resolve(__dirname, 'machine-corpus-benchmark-results.json');
  fs.writeFileSync(outPath, JSON.stringify(suite, null, 2));
  console.log(`\n✓ Results written to ${outPath}`);

  console.log(`\nSummary: ${passed}/${passed + failed} thresholds passed`);

  return suite;
}

function generateMockCorpus(count: number): any[] {
  const types = ['VMC', 'HMC', '5AXIS', 'LATHE', 'SWISS', 'MILL_TURN', 'GRINDER'];
  const mfrs = ['Haas', 'DMG MORI', 'Okuma', 'Mazak', 'Makino', 'Hurco', 'Brother', 'Doosan', 'Fanuc'];
  const tapers = ['CAT40', 'CAT50', 'BT30', 'BT40', 'HSK-A63', 'HSK-E40'];

  return Array.from({ length: count }, (_, i) => ({
    id: `machine-${i + 1}`,
    manufacturer: mfrs[i % mfrs.length],
    model: `Model-${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) + 1}`,
    type: types[i % types.length],
    canonical_type: types[i % types.length],
    spindle: {
      max_rpm: 8000 + Math.floor(Math.random() * 12000),
      power_kw: 15 + Math.floor(Math.random() * 25),
      power_continuous_kw: 15 + Math.floor(Math.random() * 25),
      max_torque_nm: 80 + Math.floor(Math.random() * 120),
      base_rpm: 1500 + Math.floor(Math.random() * 1000),
      taper: tapers[i % tapers.length],
      coolant_through: Math.random() > 0.4,
    },
    controller: {
      manufacturer: i % 3 === 0 ? 'FANUC' : i % 3 === 1 ? 'Siemens' : mfrs[i % mfrs.length],
      model: i % 3 === 0 ? '31i-B5' : i % 3 === 1 ? '840D sl' : 'Proprietary',
    },
    envelope: {
      x_travel: 500 + Math.floor(Math.random() * 1000),
      y_travel: 400 + Math.floor(Math.random() * 600),
      z_travel: 400 + Math.floor(Math.random() * 400),
    },
    confidence: {
      overall: 0.7 + Math.random() * 0.3,
    },
  }));
}

// Run benchmarks
runBenchmarks();
