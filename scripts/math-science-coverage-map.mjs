#!/usr/bin/env node
/**
 * math-science-coverage-map.mjs
 *
 * META artifact for MATH-SCIENCE-COVERAGE-AUDIT-2026-05-22 (/forge-audit-v2).
 * Re-runnable measurement of PRISM's mathematical & scientific coverage across the
 * engine + dispatcher + algorithm source surface. Classifies 16 math domains as
 * covered / thin / absent, and re-measures the audit's 5 gap findings (F2-F6)
 * every run so coverage drift is caught automatically.
 *
 * Usage:  node scripts/math-science-coverage-map.mjs [--json]
 * Output: state/shared/math-science-coverage.json  (+ console summary)
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIR = join(ROOT, 'mcp-server', 'src');
const OUT_DIR = join(ROOT, 'state', 'shared');
const OUT = join(OUT_DIR, 'math-science-coverage.json');
const SCHEMA_VERSION = '1.0.0';

// covered ≥ COVERED_MIN files · thin in [1, COVERED_MIN) · absent = 0
const COVERED_MIN = 3;

// --- domain signature patterns (distinctive terms, case-insensitive) ---
const DOMAINS = {
  numerical_methods:  'rk45|runge.?kutta|finite.?difference|finite.?element|ode.?integrat|operator.?splitting',
  linear_algebra:     'svd|qr.?factor|cholesky|eigen(value|solve|decomp)|sparse.?solve',
  optimization:       'interior.?point|sqp|trust.?region|bfgs|simplex|linear.?program|convex.?qp|knapsack',
  evolutionary:       'genetic.?optim|particle.?swarm|simulated.?anneal|ant.?colony|cmaes|differential.?evolut',
  multiobjective:     'nsga|pareto|non.?dominated',
  probability_stats:  'monte.?carlo|mcmc|metropolis|markov|weibull|kaplan.?meier|bayesian.?infer',
  uncertainty_quant:  'polynomial.?chaos|latin.?hypercube|sobol|morris.?screen',
  signal_processing:  'fft|wavelet|stft|kalman|fir.?filter|spectrogram|empirical.?mode',
  control_theory:     'pid.?controller|state.?space|ziegler.?nichols|lqr|pontryagin|optimal.?control',
  computational_geom: 'voronoi|delaunay|convex.?hull|nurbs|b.?spline|minkowski|geodesic|\\bbvh\\b',
  topology:           'homology|persistent.?homolog|betti|topolog',
  graph_theory:       'kruskal|bellman.?ford|strongly.?connected|critical.?path|pagerank|network.?flow',
  machine_learning:   'neural.?net|graphsage|conformal.?predict|q.?learn|\\bmaml\\b|federated|elastic.?weight',
  manufacturing_phys: 'kienzle|merchant|oxley|johnson.?cook|jaeger|stability.?lobe|usui',
  information_theory: 'shannon|mutual.?information|kullback|transfer.?entropy',
  fuzzy_logic:        'fuzzy.?(logic|control|infer)|anfis',
};

// --- audit gap findings F2-F6 — re-measured every run ---
const GAPS = {
  optimal_transport:      'wasserstein|sinkhorn|optimal.?transport|monge.?kantorovich',
  interval_arithmetic:    'interval.?arithmetic|affine.?arithmetic',
  spectral_geometry:      'laplace.?beltrami|cotangent.?laplacian',
  topology_methods:       'reeb.?graph|morse.?decomp|morse.?theory|homotopy.?class|configuration.?space',
  differentiable_physics: 'autodiff|adjoint.?method|differentiable.?(sim|physics)',
};

function walk(dir, acc) {
  let entries;
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, acc);
    else if (name.endsWith('.ts')) acc.push(full);
  }
  return acc;
}

function measure(files, patterns) {
  const result = {};
  for (const key of Object.keys(patterns)) {
    result[key] = { files: 0, occurrences: 0 };
  }
  for (const file of files) {
    let content;
    try { content = readFileSync(file, 'utf8'); } catch { continue; }
    for (const [key, src] of Object.entries(patterns)) {
      const m = content.match(new RegExp(src, 'gi'));
      if (m && m.length) { result[key].files += 1; result[key].occurrences += m.length; }
    }
  }
  return result;
}

function classify(fileCount) {
  if (fileCount === 0) return 'absent';
  if (fileCount < COVERED_MIN) return 'thin';
  return 'covered';
}

// Gap findings are judged on occurrence density, not raw file count: a keyword can
// appear in comments / imports / wiring without the capability being implemented.
// 'incidental' = keyword present but no assembled capability — treat as a real gap.
function classifyGap(occurrences) {
  if (occurrences === 0) return 'absent';
  if (occurrences < 7) return 'incidental';
  return 'present';
}

function main() {
  if (!existsSync(SCAN_DIR)) {
    console.error(`FATAL: scan dir not found: ${SCAN_DIR}`);
    process.exit(1);
  }
  const files = walk(SCAN_DIR, []);
  const domainRaw = measure(files, DOMAINS);
  const gapRaw = measure(files, GAPS);

  const domains = Object.entries(domainRaw).map(([name, v]) => ({
    name, files: v.files, occurrences: v.occurrences, status: classify(v.files),
  })).sort((a, b) => b.files - a.files);

  const gaps = Object.entries(gapRaw).map(([name, v]) => ({
    name, files: v.files, occurrences: v.occurrences, status: classifyGap(v.occurrences),
  }));

  const covered = domains.filter(d => d.status === 'covered').length;
  const thin = domains.filter(d => d.status === 'thin').length;
  const absent = domains.filter(d => d.status === 'absent').length;

  const report = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    scanned: { dir: 'mcp-server/src', tsFiles: files.length },
    summary: { totalDomains: domains.length, covered, thin, absent },
    domains,
    gaps,
    note: 'Advisory. gaps[] re-measures audit findings F2-F6; rising file counts mean a gap is being closed.',
  };

  try { mkdirSync(OUT_DIR, { recursive: true }); } catch {}
  writeFileSync(OUT, JSON.stringify(report, null, 2));

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`math-science coverage — ${files.length} .ts files scanned`);
    console.log(`domains: ${covered} covered · ${thin} thin · ${absent} absent`);
    for (const d of domains) {
      console.log(`  [${d.status.padEnd(7)}] ${d.name.padEnd(20)} ${d.files} files / ${d.occurrences} occ`);
    }
    console.log('gap findings (F2-F6):');
    for (const g of gaps) {
      console.log(`  [${g.status.padEnd(7)}] ${g.name.padEnd(24)} ${g.files} files / ${g.occurrences} occ`);
    }
    console.log(`written: ${OUT}`);
  }
}

main();
