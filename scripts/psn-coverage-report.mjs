#!/usr/bin/env node
// PSN Coverage Report — U-HAGI12 + U-HAGI08 live demo
//
// Scans PRISM inventory (engines/dispatchers/wiki/memory/hooks), maps
// evidence onto PSN-leg × Voxyz-layer cells, runs PSNCoverageAuditEngine,
// decorates the matrix with SourceChainEngine provenance, writes a
// markdown + JSON dashboard.
//
// Use: node H:/prism/scripts/psn-coverage-report.mjs
//      [--out state/shared/dashboards/]
//      [--covered-threshold 0.7] [--partial-threshold 0.25]
//
// Output:
//   state/shared/dashboards/PSN-COVERAGE-{YYYY-MM-DD}.{md,json}
//
// Pure JS shim (no TS) so it can run with portable-node without build step.
// The TS engines exist on disk but this script re-implements minimal audit
// logic with the same algorithm so the live tool runs even before
// mcp-server is rebuilt.

import { existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { createHash } from "node:crypto";

const PRISM_ROOT = "H:/prism";
const OUT_DIR_DEFAULT = "H:/prism/state/shared/dashboards";

const PSN_LEGS = [
  "obsidian-brain", "prism-os", "wiki", "memory", "tribal",
  "system-viz", "engines", "algorithms", "formulas", "nn-gnn", "prism-ai",
];
const VOXYZ_LAYERS = [
  "work-surface", "agent-contract", "model", "runtime", "interop",
  "execution-surface", "memory", "knowledge", "durable-workflow",
  "evals", "observability", "control-plane",
];

// ---------------------------------------------------------------------------
// Inventory scanners — cheap fs walks. Bounded depth. fail-soft.
// ---------------------------------------------------------------------------

function safeListDir(p, depth = 1) {
  if (depth < 0 || !existsSync(p)) return [];
  let out = [];
  let entries;
  try { entries = readdirSync(p, { withFileTypes: true }); } catch { return []; }
  for (const e of entries) {
    const full = join(p, e.name);
    if (e.isFile()) out.push(full);
    else if (e.isDirectory() && depth > 0) out = out.concat(safeListDir(full, depth - 1));
  }
  return out;
}

function gather() {
  return {
    engines:      safeListDir(join(PRISM_ROOT, "mcp-server/src/engines"), 0).filter((p) => p.endsWith(".ts")),
    dispatchers:  safeListDir(join(PRISM_ROOT, "mcp-server/src/tools/dispatchers"), 0).filter((p) => p.endsWith(".ts")),
    wikiArch:     safeListDir(join(PRISM_ROOT, "knowledge/wiki/architecture"), 0).filter((p) => p.endsWith(".md")),
    memoryRef:    safeListDir(join(PRISM_ROOT, "knowledge/memories/reference"), 0).filter((p) => p.endsWith(".md")),
    memoryFB:     safeListDir(join(PRISM_ROOT, "knowledge/memories/feedback"), 0).filter((p) => p.endsWith(".md")),
    hooks:        safeListDir(join(PRISM_ROOT, ".claude/hooks"), 0).filter((p) => p.endsWith(".mjs")),
    milestones:   safeListDir(join(PRISM_ROOT, "mcp-server/data/milestones"), 0).filter((p) => p.endsWith(".json")),
  };
}

// ---------------------------------------------------------------------------
// Evidence rules — name-pattern → (leg, layer, weight) per item.
// Conservative weights so a single asset never alone marks a cell "covered"
// unless it really is the canonical artifact.
// ---------------------------------------------------------------------------

function evidenceForEngine(name) {
  const ev = [];
  const n = name.toLowerCase();
  // engines leg always
  ev.push({ leg: "engines", layer: "execution-surface", weight: 0.05, path: name });
  if (/source.?chain|provenance|citation/.test(n))
    ev.push({ leg: "memory", layer: "knowledge", weight: 0.4, path: name });
  if (/psncoverage|self.?audit|coverage.?audit/.test(n))
    ev.push({ leg: "system-viz", layer: "observability", weight: 0.4, path: name });
  if (/safety|kienzle|taylor|cuttingforce|physic/.test(n))
    ev.push({ leg: "formulas", layer: "control-plane", weight: 0.15, path: name });
  if (/algorithm|optimi|sweep|bayes|monte/.test(n))
    ev.push({ leg: "algorithms", layer: "model", weight: 0.12, path: name });
  if (/memory|recall|tribal|wiki|knowledge/.test(n))
    ev.push({ leg: "memory", layer: "memory", weight: 0.12, path: name });
  if (/duplicat|guard|enforce|gate/.test(n))
    ev.push({ leg: "engines", layer: "control-plane", weight: 0.12, path: name });
  if (/ai|router|reason|creative|prism.?ai|llm/.test(n))
    ev.push({ leg: "prism-ai", layer: "model", weight: 0.12, path: name });
  return ev;
}

function evidenceForDispatcher(name) {
  const ev = [];
  ev.push({ leg: "prism-os", layer: "interop", weight: 0.15, path: name });
  ev.push({ leg: "prism-os", layer: "execution-surface", weight: 0.1, path: name });
  const n = name.toLowerCase();
  if (/session/.test(n)) ev.push({ leg: "memory", layer: "runtime", weight: 0.15, path: name });
  if (/calc|safety|physic/.test(n)) ev.push({ leg: "formulas", layer: "execution-surface", weight: 0.15, path: name });
  if (/ai|intelligenc|creative/.test(n)) ev.push({ leg: "prism-ai", layer: "execution-surface", weight: 0.15, path: name });
  return ev;
}

function evidenceForWiki(name) {
  return [{ leg: "wiki", layer: "knowledge", weight: 0.04, path: name }];
}

function evidenceForMemory(name) {
  return [
    { leg: "obsidian-brain", layer: "memory", weight: 0.02, path: name },
    { leg: "memory",         layer: "memory", weight: 0.02, path: name },
  ];
}

function evidenceForHook(name) {
  const n = name.toLowerCase();
  const ev = [{ leg: "prism-os", layer: "runtime", weight: 0.04, path: name }];
  if (/scrutin|gate|enforce|block/.test(n))
    ev.push({ leg: "engines", layer: "evals", weight: 0.05, path: name });
  if (/trace|log|telemetry|cost/.test(n))
    ev.push({ leg: "system-viz", layer: "observability", weight: 0.06, path: name });
  if (/inject|context|awareness/.test(n))
    ev.push({ leg: "prism-ai", layer: "work-surface", weight: 0.04, path: name });
  if (/handoff|resume|compact|session/.test(n))
    ev.push({ leg: "prism-os", layer: "durable-workflow", weight: 0.06, path: name });
  return ev;
}

function evidenceForMilestone(name) {
  return [{ leg: "prism-os", layer: "agent-contract", weight: 0.03, path: name }];
}

// ---------------------------------------------------------------------------
// Audit (re-implementation of PSNCoverageAuditEngine.audit + render)
// ---------------------------------------------------------------------------

function audit(evidence, opts = {}) {
  const covT = opts.coveredThreshold ?? 0.7;
  const partT = opts.partialThreshold ?? 0.25;
  if (!(covT > partT && covT <= 1 && partT >= 0))
    throw new Error(`Invalid thresholds: covered=${covT} must be > partial=${partT}`);

  const cellMap = new Map();
  for (const e of evidence) {
    const k = `${e.leg}::${e.layer}`;
    const arr = cellMap.get(k) || [];
    arr.push(e);
    cellMap.set(k, arr);
  }

  const cells = [];
  let covered = 0, partial = 0, missing = 0;
  for (const leg of PSN_LEGS) {
    for (const layer of VOXYZ_LAYERS) {
      const ev = cellMap.get(`${leg}::${layer}`) || [];
      const raw = ev.reduce((s, e) => s + e.weight, 0);
      const score = Math.min(1, Math.max(0, raw));
      let verdict;
      if (score >= covT) { verdict = "covered"; covered++; }
      else if (score >= partT) { verdict = "partial"; partial++; }
      else { verdict = "missing"; missing++; }
      cells.push({ leg, layer, verdict, score, evidence_count: ev.length });
    }
  }
  return {
    cells, legs: PSN_LEGS, layers: VOXYZ_LAYERS,
    generated_at: new Date().toISOString(),
    totals: { covered, partial, missing, cells_total: cells.length },
  };
}

function digest(evidence) {
  const sorted = [...evidence].sort((a, b) => a.path.localeCompare(b.path));
  const canon = JSON.stringify(sorted.map((e) => ({ p: e.path, l: e.leg, y: e.layer, w: e.weight })));
  return createHash("sha256").update(canon).digest("hex");
}

function renderMarkdown(matrix, evidenceCount) {
  const t = matrix.totals;
  const lines = [
    `# PSN × Voxyz Coverage Report`,
    ``,
    `**Generated:** ${matrix.generated_at}`,
    `**Evidence rows:** ${evidenceCount}`,
    `**Cells:** ${t.cells_total} (covered=${t.covered}, partial=${t.partial}, missing=${t.missing})`,
    `**Coverage pct:** ${((t.covered + t.partial / 2) / t.cells_total * 100).toFixed(1)}%`,
    ``,
    `Legend: \`OK\` covered, \`~\` partial, \`-\` missing`,
    ``,
    `| Leg \\\\ Layer | ${matrix.layers.map((l) => l.slice(0, 4)).join(" | ")} |`,
    `| ${["---", ...matrix.layers.map(() => "---")].join(" | ")} |`,
  ];
  for (const leg of matrix.legs) {
    const row = [leg.padEnd(15, " ")];
    for (const layer of matrix.layers) {
      const c = matrix.cells.find((x) => x.leg === leg && x.layer === layer);
      row.push(c.verdict === "covered" ? "OK" : c.verdict === "partial" ? "~" : "-");
    }
    lines.push(`| ${row.join(" | ")} |`);
  }
  lines.push(``, `## Missing cells (top gaps)`, ``);
  for (const c of matrix.cells.filter((x) => x.verdict === "missing").slice(0, 25)) {
    lines.push(`- ${c.leg} / ${c.layer} — score ${c.score.toFixed(3)}, ${c.evidence_count} evidence rows`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { outDir: OUT_DIR_DEFAULT, coveredThreshold: 0.7, partialThreshold: 0.25 };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--out") opts.outDir = argv[++i];
    else if (argv[i] === "--covered-threshold") opts.coveredThreshold = parseFloat(argv[++i]);
    else if (argv[i] === "--partial-threshold") opts.partialThreshold = parseFloat(argv[++i]);
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv);
  const inv = gather();
  const evidence = [
    ...inv.engines.flatMap((f) => evidenceForEngine(basename(f))),
    ...inv.dispatchers.flatMap((f) => evidenceForDispatcher(basename(f))),
    ...inv.wikiArch.flatMap((f) => evidenceForWiki(basename(f))),
    ...inv.memoryRef.flatMap((f) => evidenceForMemory(basename(f))),
    ...inv.memoryFB.flatMap((f) => evidenceForMemory(basename(f))),
    ...inv.hooks.flatMap((f) => evidenceForHook(basename(f))),
    ...inv.milestones.flatMap((f) => evidenceForMilestone(basename(f))),
  ];

  const matrix = audit(evidence, opts);
  matrix.evidence_digest = digest(evidence);
  matrix.inventory_counts = {
    engines: inv.engines.length,
    dispatchers: inv.dispatchers.length,
    wikiArchitecture: inv.wikiArch.length,
    memoryReference: inv.memoryRef.length,
    memoryFeedback: inv.memoryFB.length,
    hooks: inv.hooks.length,
    milestones: inv.milestones.length,
  };

  const date = matrix.generated_at.slice(0, 10);
  if (!existsSync(opts.outDir)) mkdirSync(opts.outDir, { recursive: true });
  const mdPath = join(opts.outDir, `PSN-COVERAGE-${date}.md`);
  const jsonPath = join(opts.outDir, `PSN-COVERAGE-${date}.json`);
  writeFileSync(mdPath, renderMarkdown(matrix, evidence.length), "utf8");
  writeFileSync(jsonPath, JSON.stringify(matrix, null, 2), "utf8");

  process.stdout.write(
    `PSN coverage: ${matrix.totals.covered}/${matrix.totals.cells_total} covered, ` +
    `${matrix.totals.partial} partial, ${matrix.totals.missing} missing\n` +
    `  md:   ${mdPath}\n  json: ${jsonPath}\n`,
  );
}

// Always run when invoked as a script (Windows path-form parity is unreliable).
main();

export { audit, digest, gather, renderMarkdown, PSN_LEGS, VOXYZ_LAYERS };
