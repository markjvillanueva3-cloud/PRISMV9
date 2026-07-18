#!/usr/bin/env node
// invention-opportunity-scanner.mjs
//
// META artifact for /forge-audit-v2 (slot:kilo 2026-05-26):
// Ranks every machining-domain engine by math/science vocabulary density
// against PRISM's canonical math/science resource pool. Gaps surface as
// invention candidates — high-leverage = critical-domain engine with low
// math density + many applicable math/science resources we already own.
//
// Compounding-gains: re-runnable, baseline-measured. Future audits diff
// the rank to track invention-debt reduction over time.
//
// schemaVersion 1.0.0

import fs from 'node:fs';
import path from 'node:path';

const SCHEMA_VERSION = '1.0.0';
const ENGINES_DIR = 'H:/prism/mcp-server/src/engines';
const ALGOS_DIR = 'H:/prism/mcp-server/src/algorithms';
const PHYSICS_DIR = 'H:/prism/mcp-server/src/physics';
const OUT_JSON = 'H:/prism-slot-kilo/state/shared/specs/invention-opportunity-rank.json';
const OUT_MD = 'H:/prism-slot-kilo/state/shared/specs/invention-opportunity-rank.md';

// Math/science vocabulary corpus — rigorous techniques PRISM already
// has or could leverage from CrossDisciplinaryDeepLearningEngine.
const MATH_SCIENCE_VOCAB = {
  statistical: ['bayesian', 'monte carlo', 'markov chain', 'gaussian', 'poisson', 'stochastic', 'variance', 'covariance', 'mle', 'mcmc', 'kalman'],
  optimization: ['gradient descent', 'lagrangian', 'newton-raphson', 'simplex', 'simulated annealing', 'evolutionary', 'genetic algorithm', 'lbfgs', 'adam optimizer'],
  linear_algebra: ['eigenvalue', 'singular value', 'svd', 'jacobian', 'hessian', 'rank-1 update', 'cholesky'],
  differential: ['runge-kutta', 'finite element', 'finite difference', 'finite volume', 'galerkin', 'pde solver', 'ode solver', 'rk4'],
  signal: ['fourier transform', 'fft', 'laplace transform', 'wavelet', 'spectral analysis', 'autocorrelation', 'pll'],
  ml_ai: ['neural network', 'embedding', 'transformer', 'graphsage', 'lora', 'attention', 'cnn', 'rnn', 'lstm', 'gnn'],
  numerical: ['nurbs', 'bezier', 'b-spline', 'cubic spline', 'interpolation', 'extrapolation', 'quadrature', 'gauss-legendre'],
  physics_constitutive: ['kienzle', 'taylor', 'johnson-cook', 'archard', 'abbe', 'hertz contact', 'euler-bernoulli', 'navier-stokes', 'arrhenius'],
  control_theory: ['pid', 'lqr', 'mpc', 'state space', 'observer', 'lyapunov', 'pole placement'],
  information: ['entropy', 'mutual information', 'kl divergence', 'cross-entropy'],
};

// Machining-domain classification — engines mapped by filename/path tokens.
const DOMAIN_TOKENS = {
  toolpath: ['toolpath', 'pocketing', 'profile', 'contour', 'adaptive', 'trochoidal', 'helical', 'rough', 'finish'],
  cam: ['cam', 'mastercam', 'hypermill', 'fusion', 'solidcam', 'esprit', 'hsm', 'powermill'],
  cad: ['cad', 'solidworks', 'inventor', 'feature', 'tolerance', 'pmi', 'gdandt', 'gdt'],
  post: ['post', 'postprocessor', 'g-code', 'gcode', 'nci', 'm-code'],
  controller: ['controller', 'fanuc', 'okuma', 'haas', 'siemens', 'heidenhain', 'mitsubishi'],
  physics: ['force', 'deflection', 'chatter', 'wear', 'thermal', 'surface', 'kienzle', 'taylor', 'physics'],
  workholding: ['fixture', 'workholding', 'clamp', 'vise'],
  inspection: ['spc', 'cmm', 'metrology', 'capability', 'gr&r'],
  wedm: ['wedm', 'wire-edm', 'sinker', 'edm'],
  lathe: ['lathe', 'turning', 'thread'],
  multiaxis: ['5axis', '5-axis', 'multiaxis', 'multi-axis', 'kinematics'],
};

const CRITICALITY_BY_DOMAIN = {
  toolpath: 5, post: 5, controller: 5, physics: 5,
  cam: 4, cad: 4, workholding: 4, multiaxis: 4,
  wedm: 3, lathe: 3, inspection: 3,
};

function detectDomain(filename) {
  const lo = filename.toLowerCase();
  const hits = [];
  for (const [dom, tokens] of Object.entries(DOMAIN_TOKENS)) {
    for (const t of tokens) {
      if (lo.includes(t)) { hits.push(dom); break; }
    }
  }
  return hits.length ? hits : ['other'];
}

function mathDensity(text) {
  const lo = text.toLowerCase();
  const found = { byCategory: {}, total: 0, distinct: [] };
  for (const [cat, terms] of Object.entries(MATH_SCIENCE_VOCAB)) {
    let n = 0;
    for (const term of terms) {
      if (lo.includes(term)) {
        n++;
        if (!found.distinct.includes(term)) found.distinct.push(term);
      }
    }
    if (n > 0) found.byCategory[cat] = n;
    found.total += n;
  }
  return found;
}

function heuristicDensity(text) {
  // Heuristic-style patterns that suggest rigorous math could substitute.
  const lo = text.toLowerCase();
  const patterns = [
    /if\s*\([^)]*\)\s*\{[^}]*return\s+[0-9.]+/g, // if (...) return <number>
    /\?\s*[0-9.]+\s*:\s*[0-9.]+/g, // ternary numeric
    /switch\s*\(/g, // switch statement
    /lookup|magic.?number|constant.*factor/g,
    /average\(|mean\(|median\(/g, // simple averaging
    /math\.random/g,
  ];
  let n = 0;
  for (const re of patterns) {
    const m = lo.match(re);
    if (m) n += m.length;
  }
  return n;
}

function scanEngine(absPath) {
  let c;
  try { c = fs.readFileSync(absPath, 'utf8'); } catch { return null; }
  const sizeLines = c.split('\n').length;
  // Header sample = first 3000 chars (class docstring + imports + first method).
  const head = c.slice(0, 3000);
  const filename = path.basename(absPath);
  const domains = detectDomain(filename);
  const mathHead = mathDensity(head);
  const mathFull = mathDensity(c);
  const heur = heuristicDensity(c);
  const criticality = Math.max(...domains.map((d) => CRITICALITY_BY_DOMAIN[d] || 1));
  // Leverage score: (criticality × heuristic-density) / (math-density + 1)
  // High = critical engine, lots of heuristics, low math — invention candidate.
  const leverage = (criticality * heur) / (mathFull.total + 1);
  return {
    filename,
    domains,
    sizeLines,
    criticality,
    mathTermsTotal: mathFull.total,
    mathTermsDistinct: mathFull.distinct,
    mathByCategory: mathFull.byCategory,
    heuristicHits: heur,
    leverage: Number(leverage.toFixed(3)),
  };
}

function* walk(dir) {
  let xs;
  try { xs = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const x of xs) {
    if (x.name.startsWith('.') || x.name === '__tests__' || x.name === 'node_modules') continue;
    const ff = path.join(dir, x.name);
    if (x.isDirectory()) { yield* walk(ff); }
    else if (/\.ts$/.test(x.name)) yield ff;
  }
}

/**
 * Pure scoring fn — separate from filesystem for testability.
 * @param {{criticality: number, heuristicHits: number, mathTermsTotal: number}} stats
 */
export function computeLeverage(stats) {
  const c = Number(stats.criticality) || 1;
  const h = Number(stats.heuristicHits) || 0;
  const m = Number(stats.mathTermsTotal) || 0;
  return Number(((c * h) / (m + 1)).toFixed(3));
}

export { mathDensity, heuristicDensity, detectDomain };

function buildReport() {
  const engineScans = [];
  for (const abs of walk(ENGINES_DIR)) {
    const r = scanEngine(abs);
    if (r) engineScans.push(r);
  }
  // Resource pool: count algorithms + physics files.
  const algoFiles = [];
  for (const abs of walk(ALGOS_DIR)) algoFiles.push(path.basename(abs));
  const physicsFiles = [];
  for (const abs of walk(PHYSICS_DIR)) physicsFiles.push(path.basename(abs));
  // Sort by leverage descending.
  engineScans.sort((a, b) => b.leverage - a.leverage);
  // Aggregate by domain.
  const byDomain = {};
  for (const e of engineScans) {
    for (const d of e.domains) {
      if (!byDomain[d]) byDomain[d] = { count: 0, totalMath: 0, totalHeur: 0, totalLeverage: 0 };
      byDomain[d].count++;
      byDomain[d].totalMath += e.mathTermsTotal;
      byDomain[d].totalHeur += e.heuristicHits;
      byDomain[d].totalLeverage += e.leverage;
    }
  }
  for (const d of Object.keys(byDomain)) {
    const b = byDomain[d];
    b.avgMath = Number((b.totalMath / b.count).toFixed(2));
    b.avgHeur = Number((b.totalHeur / b.count).toFixed(2));
    b.avgLeverage = Number((b.totalLeverage / b.count).toFixed(2));
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    summary: {
      enginesScanned: engineScans.length,
      algorithmsAvailable: algoFiles.length,
      physicsModulesAvailable: physicsFiles.length,
      mathScienceCategoriesTracked: Object.keys(MATH_SCIENCE_VOCAB).length,
      domainsTracked: Object.keys(DOMAIN_TOKENS).length,
    },
    inventionCandidates: engineScans.slice(0, 30),
    byDomain,
    resourcePool: { algorithms: algoFiles.length, physicsModules: physicsFiles.length },
    mathScienceVocab: MATH_SCIENCE_VOCAB,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Invention Opportunity Rank');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt} · schema ${report.schemaVersion}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  for (const [k, v] of Object.entries(report.summary)) {
    lines.push(`| ${k} | ${v} |`);
  }
  lines.push('');
  lines.push('## Top 30 invention candidates (highest leverage)');
  lines.push('');
  lines.push('Leverage = (criticality × heuristic-density) / (math-density + 1). High score = critical-domain engine carrying many heuristics with low math vocabulary — prime substitution target.');
  lines.push('');
  lines.push('| Rank | Engine | Domains | Lines | Crit | Math | Heur | Leverage |');
  lines.push('|---|---|---|---|---|---|---|---|');
  report.inventionCandidates.forEach((e, i) => {
    lines.push(`| ${i + 1} | \`${e.filename}\` | ${e.domains.join(', ')} | ${e.sizeLines} | ${e.criticality} | ${e.mathTermsTotal} | ${e.heuristicHits} | ${e.leverage} |`);
  });
  lines.push('');
  lines.push('## Domain rollup (avg per engine)');
  lines.push('');
  lines.push('| Domain | Engines | Avg Math | Avg Heur | Avg Leverage |');
  lines.push('|---|---|---|---|---|');
  const domainEntries = Object.entries(report.byDomain).sort((a, b) => b[1].avgLeverage - a[1].avgLeverage);
  for (const [d, b] of domainEntries) {
    lines.push(`| ${d} | ${b.count} | ${b.avgMath} | ${b.avgHeur} | ${b.avgLeverage} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function parseArgs(argv) {
  const out = { domain: null, top: 30, json: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--domain') out.domain = argv[++i];
    else if (argv[i] === '--top') out.top = parseInt(argv[++i], 10) || 30;
    else if (argv[i] === '--json') out.json = true;
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  const report = buildReport();
  // --domain X: filter candidates and re-summarize by leverage in that domain.
  if (args.domain) {
    const filtered = report.inventionCandidates.filter((e) => e.domains.includes(args.domain));
    const all = []; // also recompute across ALL engines for this domain (not just top-30)
    // Use byDomain to retrieve baseline avg-leverage.
    const baseline = report.byDomain[args.domain] || null;
    const out = {
      ok: true,
      domain: args.domain,
      baseline,
      topCandidatesInDomain: filtered.slice(0, args.top),
      generatedAt: report.generatedAt,
    };
    process.stdout.write(JSON.stringify(out, null, args.json ? 2 : 0) + '\n');
    return;
  }
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  fs.writeFileSync(OUT_MD, renderMarkdown(report));
  process.stdout.write(JSON.stringify({
    ok: true,
    jsonOut: OUT_JSON,
    mdOut: OUT_MD,
    enginesScanned: report.summary.enginesScanned,
    topLeverage: report.inventionCandidates[0]?.leverage,
    topEngine: report.inventionCandidates[0]?.filename,
  }) + '\n');
}

const invokedDirectly = process.argv[1]
  && path.basename(process.argv[1]) === 'invention-opportunity-scanner.mjs';
if (invokedDirectly) main();
