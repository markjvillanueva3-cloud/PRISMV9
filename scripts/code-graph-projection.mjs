#!/usr/bin/env node
/**
 * code-graph-projection.mjs -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC03 verifies_via channel.
 *
 * Projects a TypeScript target to a code graph via the REAL CodeGraphProjectionEngine
 * (esbuild-bundled on the fly with `typescript` external, into a temp dir under
 * mcp-server/node_modules/ so the bundle resolves typescript AND the temp is gitignored).
 * Optional --center runs the ego-graph retrieval.
 *
 * Usage: node scripts/code-graph-projection.mjs --target=<path> [--center=<nodeId>] [--hops=N] [--json]
 * Prints `nodes=N,edges=M,deps_resolved=BOOL`. Exit 0 iff nodes>0.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { join, resolve, isAbsolute } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = resolve(process.cwd().endsWith("mcp-server") ? join(process.cwd(), "..") : process.cwd());
const MCP = join(ROOT, "mcp-server");

const args = process.argv.slice(2);
const getArg = (k) => {
  const a = args.find((x) => x.startsWith(`--${k}=`));
  return a ? a.split("=").slice(1).join("=") : undefined;
};
const target = getArg("target");
const center = getArg("center");
const hops = parseInt(getArg("hops") ?? "1", 10);
const wantJson = args.includes("--json");

// Self-re-exec with a generous heap ONLY for directory targets (a full-tree walk builds
// a large in-memory graph). A single-file target runs inline on the default heap.
if (!process.env.__CODEGRAPH_REEXEC && target) {
  let isDir = false;
  try {
    isDir = statSync(isAbsolute(target) ? target : join(ROOT, target)).isDirectory();
  } catch {
    isDir = false;
  }
  if (isDir) {
    const r = spawnSync(
      process.execPath,
      ["--max-old-space-size=8192", fileURLToPath(import.meta.url), ...args],
      { stdio: "inherit", env: { ...process.env, __CODEGRAPH_REEXEC: "1" } },
    );
    if (r.status === null) console.error(`[code-graph] child terminated by signal ${r.signal ?? "?"}`);
    process.exit(r.status ?? 1);
  }
}

if (!target) {
  console.error("[code-graph] --target=<path> required");
  process.exit(1);
}

// Temp under mcp-server/node_modules/ -> gitignored (no leak) + "typescript" resolves.
const tmp = mkdtempSync(join(MCP, "node_modules", ".codegraph-"));
const bundle = join(tmp, "engine.mjs");
let out = 1;
try {
  try {
    execFileSync(
      "npx",
      [
        "esbuild",
        "src/engines/CodeGraphProjectionEngine.ts",
        "--bundle",
        "--format=esm",
        "--platform=node",
        "--external:typescript",
        "--external:node:*",
        "--log-level=error",
        `--outfile=${bundle}`,
      ],
      { cwd: MCP, stdio: ["ignore", "ignore", "inherit"], shell: process.platform === "win32" },
    );
  } catch (e) {
    throw new Error(`esbuild bundle step failed: ${e.message}`);
  }
  const mod = await import(pathToFileURL(bundle).href);
  const engine = mod.codeGraphProjectionEngine;
  if (!engine || typeof engine.project !== "function") throw new Error("bundled engine missing codeGraphProjectionEngine.project");

  const graph = engine.project({ target, repoRoot: ROOT });
  const result = center ? engine.egoGraph(graph, center, Number.isFinite(hops) ? hops : 1) : graph;

  if (wantJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(
      `nodes=${result.nodes.length},edges=${result.edges.length},deps_resolved=${graph.depsResolved}` +
        (center ? `,center=${center}` : `,filesParsed=${graph.filesParsed},relImports=${graph.relativeImportsFound}`),
    );
    // graph.warnings are PROJECTION warnings (apply regardless of any ego filtering).
    if (graph.warnings.length) console.error(`[code-graph] ${graph.warnings.length} projection warning(s); first: ${graph.warnings[0]}`);
  }
  out = result.nodes.length > 0 ? 0 : 1;
} catch (e) {
  console.error(`[code-graph] failed: ${e.message}`);
  out = 1;
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
process.exit(out);
