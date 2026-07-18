#!/usr/bin/env node
/**
 * graphrag-eval.mjs -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC02 verifies_via channel.
 *
 * Measures recall@3 of GraphRAGRetrievalEngine.retrieve over the LIVE system-viz
 * find-cache + adjacency. A query "hits" when >=1 of its expected relevant terms
 * appears in a top-3 retrieved entity (id/label/info). Deterministic (noLlm).
 *
 * Runs the REAL TS engine by esbuild-bundling it to a temp ESM module on the fly
 * (esbuild resolves the .js->.ts specifiers; no full project build required).
 *
 * Usage:  node scripts/graphrag-eval.mjs [--threshold=0.7] [--json]
 * Exit 0 iff recall@3 >= threshold; 1 otherwise (R12: a failed gate is loud).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

// Self-re-exec with a generous heap (find-cache 65MB + adjacency 96MB parsed into
// objects exceeds the default heap; Blackwell doctrine = never fight a low default).
if (!process.env.__GRAPHRAG_EVAL_REEXEC) {
  const r = spawnSync(
    process.execPath,
    ["--max-old-space-size=8192", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: "inherit", env: { ...process.env, __GRAPHRAG_EVAL_REEXEC: "1" } },
  );
  if (r.status === null) console.error(`[graphrag-eval] child terminated by signal ${r.signal ?? "?"} (likely OOM under the 8GB heap)`);
  process.exit(r.status ?? 1);
}

const ROOT = resolve(process.cwd().endsWith("mcp-server") ? join(process.cwd(), "..") : process.cwd());
const MCP = join(ROOT, "mcp-server");
const FINDCACHE = join(ROOT, "state/shared/system-viz/find-cache.json");
const ADJ = join(ROOT, "state/shared/system-viz/node-adjacency.json");

const args = process.argv.slice(2);
const getArg = (k, d) => {
  const a = args.find((x) => x.startsWith(`--${k}=`));
  return a ? a.split("=")[1] : d;
};
const threshold = parseFloat(getArg("threshold", "0.7"));
const wantJson = args.includes("--json");

// 10 fixed domain queries with expected-relevant term sets (ground truth = a
// galaxy/domain node should surface in top-3). Spans 10 distinct PRISM domains.
const QUERIES = [
  { q: "mill face cutter", rel: ["mill"] },
  { q: "lathe turning insert", rel: ["lathe", "turn"] },
  { q: "wire edm discharge", rel: ["wedm", "wire", "edm"] },
  { q: "cad model feature", rel: ["cad"] },
  { q: "cam toolpath strategy", rel: ["cam"] },
  { q: "quoting price estimate", rel: ["quot", "price", "cost"] },
  { q: "speed feed calculator", rel: ["speedfeed", "feed", "sfc", "speed"] },
  { q: "hermes orchestrator fleet", rel: ["hermes", "zulu", "orchestr"] },
  { q: "system viz graph", rel: ["viz", "graph", "system-viz"] },
  { q: "blueprint ocr vision", rel: ["blueprint", "ocr", "vision"] },
];

function fail(msg) {
  console.error(`[graphrag-eval] ${msg}`);
  process.exit(1);
}

if (!existsSync(FINDCACHE)) fail(`find-cache missing at ${FINDCACHE} -- run: node scripts/regen-find-cache.mjs`);
if (!existsSync(ADJ)) fail(`adjacency missing at ${ADJ} -- run: node scripts/build-viz-adjacency.mjs`);

const tmp = mkdtempSync(join(tmpdir(), "graphrag-eval-"));
const bundle = join(tmp, "engine.mjs");
try {
  // Bundle the real engine (+ its GraphContextLensEngine dep) to one ESM file.
  execFileSync(
    "npx",
    [
      "esbuild",
      "src/engines/GraphRAGRetrievalEngine.ts",
      "--bundle",
      "--format=esm",
      "--platform=node",
      "--log-level=error",
      `--outfile=${bundle}`,
    ],
    { cwd: MCP, stdio: ["ignore", "ignore", "inherit"], shell: process.platform === "win32" },
  );
} catch (e) {
  rmSync(tmp, { recursive: true, force: true });
  fail(`esbuild bundle failed: ${e.message}`);
}

process.env.PRISM_VIZ_FINDCACHE_PATH = FINDCACHE;
process.env.PRISM_VIZ_ADJ_PATH = ADJ;

let hits = 0;
const rows = [];
try {
  const mod = await import(pathToFileURL(bundle).href);
  const engine = mod.graphRAGRetrievalEngine;
  if (!engine || typeof engine.retrieve !== "function") fail("bundled engine missing graphRAGRetrievalEngine.retrieve");
  for (const { q, rel } of QUERIES) {
    let hit = false;
    let top3 = [];
    try {
      const r = await engine.retrieve(q, { noLlm: true, topK: 3 });
      top3 = r.entities.slice(0, 3);
      // Falsifiable: require the domain term in the node ID. A cross-domain mis-rank
      // (e.g. a lathe node surfaced for a mill query) would NOT carry the term in its id.
      hit = top3.some((e) => {
        const id = String(e.id).toLowerCase();
        return rel.some((t) => id.includes(t));
      });
    } catch (e) {
      rows.push({ q, hit: false, error: e.message });
      continue;
    }
    if (hit) hits++;
    rows.push({ q, hit, top3: top3.map((e) => e.id) });
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const recall = hits / QUERIES.length;
const pass = recall >= threshold;

if (wantJson) {
  console.log(JSON.stringify({ recall_at_3: recall, threshold, pass, hits, total: QUERIES.length, rows }, null, 2));
} else {
  console.log(`[graphrag-eval] recall@3 = ${recall.toFixed(2)} (${hits}/${QUERIES.length}), threshold ${threshold} -> ${pass ? "PASS" : "FAIL"}`);
  for (const row of rows) {
    console.log(`  ${row.hit ? "OK " : "MISS"} "${row.q}" -> [${(row.top3 || []).join(", ")}]${row.error ? " ERR:" + row.error : ""}`);
  }
}
process.exit(pass ? 0 : 1);
