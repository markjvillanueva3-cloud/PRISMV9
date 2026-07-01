#!/usr/bin/env node
/**
 * H-DRIVE-VAULT-SYNERGY / U-3 -- graph <-> vault coverage parity.
 *
 * U-1 categorized every substantive H:/ folder into the Obsidian 2nd brain (vault side:
 * state/shared/H-DRIVE-COVERAGE.json, per-domain `hasNote`). Independently,
 * expand-system-viz-l12-files.mjs walks the SAME filesystem into the system-viz graph as L9 (fs
 * roots) + L11 (file bundles) + L12 (canonical files), each tagged with a `namespace` (the walk
 * root's base name; canonical repo + every prism-* worktree collapse to "prism"). This unit JOINS
 * the two so the coverage map PROVES graph<->vault parity, flagging the two drift directions:
 *   - graphOnly: the graph has fs file-nodes for a namespace the vault has NOT categorized (or has
 *     a domain row but `hasNote:false`). This is the real rot -- the graph "knows" about files the
 *     2nd brain has no note for. GATES (exit 1).
 *   - vaultOnly: the vault has a note but the graph has NO fs file-nodes for that namespace (empty
 *     domain, or not yet walked into the graph). ADVISORY (does not gate).
 *
 * The "H:/ top-level" coverage scope maps 1:1 to a graph namespace (ns = folder name). The
 * "H:/prism subdirs" scope does NOT -- the graph walks H:/prism as ONE root (ns="prism"), so those
 * are reported as a single `prismAggregate` (graph prism file-nodes vs vault prism-subdir notes),
 * never per-subdir.
 *
 * STREAMING: reuses graph-io.streamGraphArray -- reads the ~762MB graph as an off-heap Buffer and
 * JSON.parses ONE node element at a time (never the whole string -> dodges V8's 512MB string cap).
 *
 * DATA DEPENDENCY (fail-loud, R12): the parity join needs the graph to carry the
 * expand-system-viz-l12-files fs-coverage layer -- namespaced L11/L12 nodes. The CURRENT merged
 * system-graph.json does NOT (verified 2026-06-15: no L12 layer; L9 fs nodes use `subgroup` not
 * `namespace`; L11 are ghost/corpus nodes). When 0 namespaced fs file-nodes are found, this tool
 * exits 2 (MEASUREMENT FAILURE) naming the regen fix -- it NEVER reports a false "PARITY OK". Once
 * `expand-system-viz-l12-files.mjs` output is merged back into the graph (sierra/regen-viz owns
 * that), the parity join runs (fixture-proven). Tracked: H-DRIVE-VAULT-SYNERGY U-3 + the documented
 * generate-system-viz vs regen-viz graph-divergence (CLAUDE.md).
 *
 * SCOPE NOTE: the graph fs layer MUST be produced by walking H:/ TOP-LEVEL roots (the normal
 * expand-system-viz-l12-files usage). A sub-path walk (e.g. `--root H:/prism/mcp-server`) yields a
 * namespace like `mcp-server` with file-nodes but no H:/ top-level vault domain -> it would land in
 * graphOnly(no-vault-domain) and GATE. That gate direction is the SAFE one (loud, never silent), but
 * such a hit is operator walk-scope error, not real vault drift. HEAP: no `--max-old-space-size`
 * needed -- streamGraphArray uses an off-heap Buffer + per-element parse, so the 762MB graph runs at
 * default heap.
 *
 * CLI:
 *   node scripts/h-drive-graph-parity.mjs            # text, exit 0 parity / 1 graphOnly drift / 2 fail
 *   node scripts/h-drive-graph-parity.mjs --json
 *   node scripts/h-drive-graph-parity.mjs --graph <path> --coverage <path>
 *
 * Pure/testable exports: namespaceForName, collectGraphDomains (injectable stream), computeParity.
 *
 * @milestone H-DRIVE-VAULT-SYNERGY
 * @unit U-3
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED + H-DRIVE-VAULT autonomous loop.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { streamGraphArray } from "./lib/graph-io.mjs";

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const GRAPH_JSON = path.join(REPO_ROOT, "state", "shared", "system-viz", "system-graph.json");
const MAP_JSON = path.join(REPO_ROOT, "state", "shared", "H-DRIVE-COVERAGE.json");
const TOP_LEVEL_SCOPE = "H:/ top-level";       // matches buildCoverageMap()'s scope label
const PRISM_SUBDIR_SCOPE = "H:/prism subdirs"; // matches buildCoverageMap()'s scope label
const FS_LAYERS = new Set(["L9", "L11", "L12"]); // expand-system-viz-l12-files.mjs fs layers

/**
 * KEEP-IN-SYNC with namespaceForRoot() in scripts/expand-system-viz-l12-files.mjs:133.
 * Base folder name; the canonical repo and every prism-* worktree clone collapse to "prism".
 * (Inlined, not imported, to avoid loading that heavy module just for a 4-line pure fn.)
 */
export function namespaceForName(name) {
  const norm = String(name || "").replace(/\\/g, "/").replace(/\/+$/, "");
  const base = path.basename(norm); // byte-faithful to namespaceForRoot's path.basename(norm)
  if (base === "prism" || /^prism-/.test(base)) return "prism";
  return base;
}

/**
 * Stream the graph and tally fs nodes (L9/L11/L12) per namespace. Reuses graph-io.streamGraphArray
 * (off-heap Buffer + per-element parse). Injectable `stream` for hermetic tests.
 * @returns {{byNs: Map<string,{namespace:string,l9:number,l11:number,l12:number,fileNodes:number,total:number}>, nodesScanned:number}}
 */
export function collectGraphDomains(graphPath, { stream = streamGraphArray } = {}) {
  const byNs = new Map();
  const nodesScanned = stream(graphPath, "nodes", (node) => {
    if (!node || typeof node !== "object") return;
    if (!FS_LAYERS.has(node.layer)) return;
    const ns = typeof node.namespace === "string" && node.namespace ? node.namespace : "(none)";
    let t = byNs.get(ns);
    if (!t) { t = { namespace: ns, l9: 0, l11: 0, l12: 0, fileNodes: 0, total: 0 }; byNs.set(ns, t); }
    if (node.layer === "L9") t.l9++;
    else if (node.layer === "L11") { t.l11++; t.fileNodes++; }
    else { t.l12++; t.fileNodes++; } // L12
    t.total++;
  });
  return { byNs, nodesScanned };
}

/**
 * Pure parity join. graphDomains = the Map from collectGraphDomains; coverageDomains =
 * coverage.domains[] ({scope,name,hasNote,fileCount}).
 * @returns {{ok:boolean, graphOnly:Array, vaultOnly:Array, both:Array, prismAggregate:object, graphNamespaces:number, vaultTopLevelDomains:number}}
 */
export function computeParity({ graphDomains, coverageDomains }) {
  const tally = graphDomains instanceof Map ? graphDomains : new Map();
  const domains = Array.isArray(coverageDomains) ? coverageDomains : [];

  const topByNs = new Map(); // namespace -> top-level vault domain
  for (const d of domains) {
    if (!d || d.scope !== TOP_LEVEL_SCOPE || typeof d.name !== "string") continue;
    topByNs.set(namespaceForName(d.name), d);
  }
  const prismSubdirNotes = domains.filter((d) => d && d.scope === PRISM_SUBDIR_SCOPE && d.hasNote).length;

  const graphOnly = [];
  const both = [];
  for (const [ns, t] of tally) {
    if (ns === "prism" || ns === "(none)") continue; // prism -> aggregate; (none) unattributable
    if (t.fileNodes === 0) continue; // an L9-only namespace (root marker, no files) is not a gap
    const d = topByNs.get(ns);
    if (!d) { graphOnly.push({ namespace: ns, fileNodes: t.fileNodes, reason: "no-vault-domain" }); continue; }
    if (!d.hasNote) graphOnly.push({ namespace: ns, fileNodes: t.fileNodes, reason: "domain-without-note" });
    else both.push({ namespace: ns, fileNodes: t.fileNodes });
  }

  const vaultOnly = [];
  for (const [ns, d] of topByNs) {
    const t = tally.get(ns);
    if ((!t || t.fileNodes === 0) && d.hasNote) {
      vaultOnly.push({ namespace: ns, name: d.name, fileCount: typeof d.fileCount === "number" ? d.fileCount : null });
    }
  }

  const prism = tally.get("prism") || { fileNodes: 0, total: 0 };
  const prismAggregate = { graphFileNodes: prism.fileNodes, graphTotalNodes: prism.total, vaultSubdirNotes: prismSubdirNotes };

  // fsCoverageDetected: does the graph actually carry the expand-system-viz-l12-files fs-coverage
  // layer (namespaced L11/L12 nodes)? If every fs node fell into "(none)" (no `namespace` field --
  // e.g. the current merged graph whose L9 use `subgroup` and whose L11 are ghost/corpus nodes, with
  // NO L12 layer at all), there is nothing to parity-check. Reporting "PARITY OK" then is a false
  // clean (R12) -- the caller (main) MUST treat !fsCoverageDetected as a measurement failure.
  let realFileNodes = 0;
  for (const [ns, t] of tally) { if (ns !== "(none)") realFileNodes += t.fileNodes; }

  return {
    ok: graphOnly.length === 0, // graphOnly is the real rot; vaultOnly is advisory
    fsCoverageDetected: realFileNodes > 0,
    realFileNodes,
    graphOnly,
    vaultOnly,
    both,
    prismAggregate,
    graphNamespaces: tally.size,
    vaultTopLevelDomains: topByNs.size,
  };
}

/** Read + parse the coverage map. Fail-soft -> null (R12). */
export function loadCoverage(mapPath) {
  try { return JSON.parse(fs.readFileSync(mapPath, "utf8")); } catch { return null; }
}

function main(argv) {
  const jsonOnly = argv.includes("--json");
  const gIdx = argv.indexOf("--graph");
  const graphPath = gIdx >= 0 && argv[gIdx + 1] ? argv[gIdx + 1] : GRAPH_JSON;
  const cIdx = argv.indexOf("--coverage");
  const covPath = cIdx >= 0 && argv[cIdx + 1] ? argv[cIdx + 1] : MAP_JSON;

  const coverage = loadCoverage(covPath);
  if (coverage === null) {
    if (jsonOnly) process.stdout.write(JSON.stringify({ ok: false, measurementFailure: true, reason: `coverage map unreadable: ${covPath}` }, null, 2) + "\n");
    else process.stderr.write(`[hdrive-parity] MEASUREMENT FAILURE -- coverage map unreadable: ${covPath}\n`);
    return 2;
  }
  if (!fs.existsSync(graphPath)) {
    if (jsonOnly) process.stdout.write(JSON.stringify({ ok: false, measurementFailure: true, reason: `graph not found: ${graphPath}` }, null, 2) + "\n");
    else process.stderr.write(`[hdrive-parity] MEASUREMENT FAILURE -- graph not found: ${graphPath}\n`);
    return 2;
  }

  const { byNs, nodesScanned } = collectGraphDomains(graphPath);
  if (nodesScanned === 0) {
    // streamGraphArray returns 0 on a read error / missing 'nodes' array -> cannot measure (R12).
    if (jsonOnly) process.stdout.write(JSON.stringify({ ok: false, measurementFailure: true, reason: `graph had 0 streamable nodes: ${graphPath}` }, null, 2) + "\n");
    else process.stderr.write(`[hdrive-parity] MEASUREMENT FAILURE -- graph had 0 streamable nodes: ${graphPath}\n`);
    return 2;
  }

  const report = computeParity({ graphDomains: byNs, coverageDomains: coverage.domains });
  const pa = report.prismAggregate;
  const head =
    `[hdrive-parity] ${nodesScanned} graph nodes scanned · ${report.graphNamespaces} graph namespaces · ` +
    `${report.vaultTopLevelDomains} vault top-level domains · prism: ${pa.graphFileNodes} graph file-nodes / ${pa.vaultSubdirNotes} vault subdir notes.`;

  // R12: a graph with NO namespaced fs nodes lacks the expand-system-viz-l12-files fs-coverage layer
  // (the current merged graph has no L12 layer; its L9 use `subgroup`, its L11 are ghost nodes). The
  // parity join is meaningless then -- fail loud (exit 2), never report a false "PARITY OK".
  if (!report.fsCoverageDetected) {
    const fix = "graph lacks the fs-coverage layer (0 namespaced fs file-nodes; expand-system-viz-l12-files L11/L12 absent). Regenerate: node scripts/expand-system-viz-l12-files.mjs then regen-viz, and re-run.";
    if (jsonOnly) {
      process.stdout.write(JSON.stringify({ ...report, ok: false, measurementFailure: true, reason: fix, nodesScanned, graph: graphPath, coveragePath: covPath }, null, 2) + "\n");
    } else {
      process.stdout.write(head + "\n");
      process.stderr.write(`[hdrive-parity] MEASUREMENT FAILURE -- ${fix}\n`);
    }
    return 2;
  }

  if (jsonOnly) {
    process.stdout.write(JSON.stringify({ ...report, nodesScanned, graph: graphPath, coveragePath: covPath }, null, 2) + "\n");
    return report.ok ? 0 : 1;
  }

  if (report.ok) {
    process.stdout.write(
      `${head}\n[hdrive-parity] PARITY OK -- 0 graph-only domains (graph fully reflected in the vault).` +
        (report.vaultOnly.length ? ` (${report.vaultOnly.length} vault-only advisory: ${report.vaultOnly.slice(0, 8).map((v) => v.name).join(", ")})` : "") +
        "\n",
    );
    return 0;
  }

  process.stdout.write(
    `${head}\n[hdrive-parity] DRIFT -- ${report.graphOnly.length} graph-only domain(s) (graph has files the 2nd brain has not categorized; run \`node scripts/h-drive-to-vault.mjs --reindex\`):\n` +
      report.graphOnly.map((g) => `  - ${g.namespace} [${g.fileNodes} file-nodes, ${g.reason}]`).join("\n") +
      (report.vaultOnly.length ? `\n  (advisory: ${report.vaultOnly.length} vault-only domains with notes but no graph file-nodes)` : "") +
      "\n",
  );
  return 1;
}

const __isCli =
  !!process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (__isCli) {
  process.exit(main(process.argv.slice(2)));
}
