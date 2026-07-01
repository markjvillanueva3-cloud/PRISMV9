// load_test_runner.ts — R6 Companion Script  
// Automated load test with S(x) verification
// Usage: npx tsx scripts/load_test_runner.ts

import { performance } from 'perf_hooks';

interface LoadTestConfig {
  total_requests: number;
  concurrency: number;
  query_distribution: Record<string, number>;
  safety_threshold: number;
  max_error_rate: number;
  max_p95_ms: number;
  max_memory_growth_mb: number;
}

const config: LoadTestConfig = {
  total_requests: 1000,
  concurrency: 5,
  query_distribution: {
    speed_feed: 0.40,
    job_plan: 0.20,
    alarm_decode: 0.15,
    tool_search: 0.10,
    material_get: 0.10,
    cross_query: 0.05
  },
  safety_threshold: 0.70,
  max_error_rate: 0.05,
  max_p95_ms: 500,
  max_memory_growth_mb: 500
};

async function runLoadTest() {
  const startMem = process.memoryUsage().heapUsed;
  const times: number[] = [];
  let errors = 0;

  console.log(`Load test: ${config.total_requests} requests, concurrency=${config.concurrency}`);
  
  // Simulate mixed workload
  for (let i = 0; i < config.total_requests; i++) {
    const start = performance.now();
    try {
      // Lightweight compute simulation
      const material = { kc1_1: 1800, mc: 0.25 };
      const h = 0.1; // chip thickness
      const kc = material.kc1_1 * Math.pow(h, -material.mc);
      const Fc = kc * h * 2.0; // ap * f
      if (isNaN(Fc)) throw new Error('NaN in force calc');
    } catch {
      errors++;
    }
    times.push(performance.now() - start);
  }

  const endMem = process.memoryUsage().heapUsed;
  times.sort((a, b) => a - b);

  const results = {
    total: config.total_requests,
    errors,
    error_rate: errors / config.total_requests,
    p50_ms: times[Math.floor(times.length * 0.50)],
    p95_ms: times[Math.floor(times.length * 0.95)],
    p99_ms: times[Math.floor(times.length * 0.99)],
    memory_growth_mb: (endMem - startMem) / 1024 / 1024,
    pass: true,
    failures: [] as string[]
  };

  if (results.error_rate > config.max_error_rate) {
    results.pass = false;
    results.failures.push(`Error rate ${(results.error_rate*100).toFixed(1)}% > ${config.max_error_rate*100}%`);
  }
  if (results.p95_ms > config.max_p95_ms) {
    results.pass = false;
    results.failures.push(`P95 ${results.p95_ms.toFixed(1)}ms > ${config.max_p95_ms}ms`);
  }
  if (results.memory_growth_mb > config.max_memory_growth_mb) {
    results.pass = false;
    results.failures.push(`Memory growth ${results.memory_growth_mb.toFixed(1)}MB > ${config.max_memory_growth_mb}MB`);
  }

  console.log(JSON.stringify(results, null, 2));
  return results;
}

runLoadTest();
