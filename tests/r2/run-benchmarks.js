/**
 * R2 Golden Benchmark Test Runner
 * Validates prism_calc actions against golden-benchmarks.json
 * Usage: node tests/r2/run-benchmarks.js [--filter=B001] [--group=P] [--calc=cutting_force]
 */
const benchmarks = require('./golden-benchmarks.json');
const args = process.argv.slice(2).reduce((a, v) => {
  const [k, val] = v.replace('--', '').split('=');
  a[k] = val; return a;
}, {});

let tests = benchmarks.benchmarks;
if (args.filter) tests = tests.filter(b => b.id === args.filter);
if (args.group) tests = tests.filter(b => b.material.iso_group === args.group);
if (args.calc) tests = tests.filter(b => b.calc_type === args.calc);

const results = { pass: 0, fail: 0, skip: 0, details: [] };

function checkTolerance(actual, expected, tolerancePct) {
  if (typeof expected === 'boolean' || typeof expected === 'string') return actual === expected;
  const lo = expected * (1 - tolerancePct / 100);
  const hi = expected * (1 + tolerancePct / 100);
  return actual >= lo && actual <= hi;
}

for (const b of tests) {
  const detail = { id: b.id, name: b.name, calc_type: b.calc_type, status: 'SKIP', checks: [] };
  // Placeholder: actual calc integration happens in R2-MS0-T2
  // For now, validate structure and mark as SKIP
  const hasExpected = b.expected && Object.keys(b.expected).length > 0;
  const hasParams = b.params && Object.keys(b.params).length > 0;
  if (!hasExpected || !hasParams) {
    detail.status = 'FAIL'; detail.error = 'Missing expected or params';
    results.fail++;
  } else {
    detail.status = 'SKIP'; detail.note = 'Awaiting prism_calc integration';
    results.skip++;
  }
  results.details.push(detail);
}

console.log(`\n=== R2 Golden Benchmark Results ===`);
console.log(`Total: ${tests.length} | PASS: ${results.pass} | FAIL: ${results.fail} | SKIP: ${results.skip}`);
console.log(`ISO Groups: ${[...new Set(tests.map(t => t.material.iso_group))].join(', ')}`);
console.log(`Calc Types: ${[...new Set(tests.map(t => t.calc_type))].join(', ')}`);
if (results.fail > 0) {
  console.log(`\nFAILURES:`);
  results.details.filter(d => d.status === 'FAIL').forEach(d => console.log(`  ${d.id}: ${d.error}`));
}
console.log(`\nReady for R2-MS0-T2: Wire prism_calc actions to each benchmark.`);
process.exit(results.fail > 0 ? 1 : 0);
