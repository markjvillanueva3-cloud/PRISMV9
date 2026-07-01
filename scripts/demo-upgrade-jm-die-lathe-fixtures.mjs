/**
 * demo-upgrade-jm-die-lathe-fixtures.mjs
 * ======================================
 *
 * U-LATHE-PROG-OPT-WIRE downstream demo: invokes the now-wired
 * `latheProgramOptimizerEngine.generateOptimizedProgram` + `.estimateImprovements`
 * against every real JM Die Okuma fixture and writes the upgraded program
 * + JSON upgrade report alongside (NEVER overwriting the .min original per
 * the copy-never-move doctrine).
 *
 * Output:
 *   <fixtures>/BRICO-132.upgraded.min       (the upgraded G-code)
 *   <fixtures>/BRICO-132.upgrade-report.json (changes[] + metrics + estimate)
 *   <fixtures>/_UPGRADE-SUMMARY.md          (operator-facing roll-up)
 *
 * Usage:
 *   node H:/prism/scripts/demo-upgrade-jm-die-lathe-fixtures.mjs
 *   node H:/prism/scripts/demo-upgrade-jm-die-lathe-fixtures.mjs --dry-run
 *
 * @module scripts/demo-upgrade-jm-die-lathe-fixtures
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const FIXTURES_DIR = join(REPO_ROOT, "mcp-server", "src", "__tests__", "fixtures", "okuma-programs");
const DRY_RUN = process.argv.includes("--dry-run");

// ----------------------------------------------------------------------------
// Run the engine via tsx (bypasses MCP transport — proves the SAME engine code
// path the dispatcher will route through, since dispatcher just does a lazy
// import + method call). For a transport-level proof, see U-LATHE-PROG-OPT-WIRE.test.ts.
// ----------------------------------------------------------------------------

function runOptimizer(fixtureName) {
  const programPath = join(FIXTURES_DIR, fixtureName);
  const src = readFileSync(programPath, "utf-8");

  // Spawn tsx with a tiny inline driver — keeps this script Node-pure
  // and avoids the cost of compiling the whole mcp-server up-front.
  const tsxCmd = process.platform === "win32" ? "tsx.cmd" : "tsx";
  const driver = `
    import { latheProgramOptimizerEngine } from "${resolve(REPO_ROOT, "mcp-server/src/engines/LatheProgramOptimizerEngine.ts").replace(/\\\\/g, "/")}";
    import { readFileSync } from "fs";
    const src = readFileSync(${JSON.stringify(programPath)}, "utf-8");
    const opt = latheProgramOptimizerEngine.generateOptimizedProgram(src, ${JSON.stringify(programPath)});
    latheProgramOptimizerEngine.clearCache();
    const est = latheProgramOptimizerEngine.estimateImprovements(src, ${JSON.stringify(programPath)});
    process.stdout.write(JSON.stringify({ opt, est }));
  `;
  const r = spawnSync("npx", ["-y", "tsx", "--eval", driver], {
    cwd: join(REPO_ROOT, "mcp-server"),
    encoding: "utf-8",
    shell: process.platform === "win32",
    timeout: 60_000,
  });
  if (r.status !== 0) {
    throw new Error(`tsx driver failed for ${fixtureName}: ${r.stderr || r.stdout}`);
  }
  try {
    return JSON.parse(r.stdout);
  } catch (e) {
    throw new Error(`tsx driver produced unparseable output for ${fixtureName}: ${r.stdout.slice(0, 500)}`);
  }
}

function fmtPct(n) { return `${n.toFixed(1)}%`; }
function fmtScore(n) { return n.toFixed(1); }

// ----------------------------------------------------------------------------
// Run across every .min fixture.
// ----------------------------------------------------------------------------

const fixtures = readdirSync(FIXTURES_DIR).filter(f => f.endsWith(".min"));
console.log(`[demo-upgrade-jm-die-lathe-fixtures] ${fixtures.length} fixture(s) under ${FIXTURES_DIR}`);
console.log(`[demo-upgrade-jm-die-lathe-fixtures] dry-run=${DRY_RUN}`);

const summaryRows = [];
let totalCritFixed = 0;
let totalWarnFixed = 0;
let totalScoreGain = 0;

for (const fname of fixtures) {
  process.stdout.write(`\n${fname}: `);
  let result;
  try {
    result = runOptimizer(fname);
  } catch (e) {
    console.log(`SKIP — ${e.message.split("\n")[0]}`);
    summaryRows.push({ file: fname, status: "skip", reason: e.message.split("\n")[0] });
    continue;
  }
  const { opt, est } = result;
  const critFixed = (opt.metrics.issuesCritical?.original ?? 0) - (opt.metrics.issuesCritical?.optimized ?? 0);
  const warnFixed = (opt.metrics.issuesWarning?.original ?? 0) - (opt.metrics.issuesWarning?.optimized ?? 0);
  const scoreGain = opt.metrics.optimizedScore - opt.metrics.originalScore;
  totalCritFixed += critFixed;
  totalWarnFixed += warnFixed;
  totalScoreGain += scoreGain;
  console.log(
    `score ${fmtScore(opt.metrics.originalScore)} → ${fmtScore(opt.metrics.optimizedScore)} (+${fmtScore(scoreGain)}) ` +
    `· crit-fixed=${critFixed} warn-fixed=${warnFixed} ` +
    `· projected cycle-time ↓${fmtPct(est.estimatedCycleTimeReduction)} tool-life ↑${fmtPct(est.estimatedToolLifeImprovement)}`
  );

  summaryRows.push({
    file: fname,
    status: "upgraded",
    originalScore: opt.metrics.originalScore,
    optimizedScore: opt.metrics.optimizedScore,
    scoreGain,
    critFixed,
    warnFixed,
    changes: opt.changes.length,
    projectedCycleTimeReductionPct: est.estimatedCycleTimeReduction,
    projectedToolLifeImprovementPct: est.estimatedToolLifeImprovement,
    material: opt.material,
  });

  if (!DRY_RUN) {
    const base = fname.replace(/\.min$/i, "");
    writeFileSync(join(FIXTURES_DIR, `${base}.upgraded.min`), opt.optimized, "utf-8");
    writeFileSync(
      join(FIXTURES_DIR, `${base}.upgrade-report.json`),
      JSON.stringify({ changes: opt.changes, metrics: opt.metrics, estimate: est, programNumber: opt.programNumber, material: opt.material }, null, 2),
      "utf-8"
    );
  }
}

// ----------------------------------------------------------------------------
// Operator-facing summary.
// ----------------------------------------------------------------------------

const md = [
  `# JM Die Okuma Lathe-Program Upgrade Summary`,
  ``,
  `**Generated:** ${new Date().toISOString()}`,
  `**Wire path:** \`prism_cam:lathe_program_optimize\` + \`prism_cam:lathe_program_estimate\` (U-LATHE-PROG-OPT-WIRE)`,
  `**Engine:** \`LatheProgramOptimizerEngine\``,
  `**Fixtures:** ${fixtures.length} · **Upgraded:** ${summaryRows.filter(r => r.status === "upgraded").length}`,
  ``,
  `## Aggregate`,
  `- Score gain (sum): **+${fmtScore(totalScoreGain)}**`,
  `- Critical issues fixed: **${totalCritFixed}**`,
  `- Warning issues fixed: **${totalWarnFixed}**`,
  ``,
  `## Per-program`,
  `| Program | Material | Score (before → after) | Δ | Crit fixed | Warn fixed | Changes | Projected cycle-time | Projected tool-life |`,
  `|---------|----------|------------------------|---|-----------|-----------|---------|---------------------|--------------------|`,
];
for (const r of summaryRows) {
  if (r.status !== "upgraded") {
    md.push(`| ${r.file} | — | (skipped: ${r.reason}) | — | — | — | — | — | — |`);
    continue;
  }
  md.push(
    `| ${r.file} | ${r.material} | ${fmtScore(r.originalScore)} → ${fmtScore(r.optimizedScore)} | +${fmtScore(r.scoreGain)} | ${r.critFixed} | ${r.warnFixed} | ${r.changes} | ↓${fmtPct(r.projectedCycleTimeReductionPct)} | ↑${fmtPct(r.projectedToolLifeImprovementPct)} |`
  );
}
md.push(``, `> Original \`.min\` files are NEVER overwritten — upgraded text written to \`<name>.upgraded.min\` + JSON report to \`<name>.upgrade-report.json\` (per copy-never-move).`);

if (!DRY_RUN) {
  writeFileSync(join(FIXTURES_DIR, "_UPGRADE-SUMMARY.md"), md.join("\n"), "utf-8");
}

console.log(`\n[demo-upgrade-jm-die-lathe-fixtures] aggregate: +${fmtScore(totalScoreGain)} score · ${totalCritFixed} crit-fixed · ${totalWarnFixed} warn-fixed`);
console.log(`[demo-upgrade-jm-die-lathe-fixtures] ${DRY_RUN ? "DRY-RUN — no files written" : `wrote ${summaryRows.filter(r => r.status === "upgraded").length} upgraded program(s) + reports + _UPGRADE-SUMMARY.md`}`);
