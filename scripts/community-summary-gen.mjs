#!/usr/bin/env node
/**
 * community-summary-gen.mjs -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC06 (slot:sierra)
 *
 * CLI over CommunitySummaryEngine: cluster the ENGINE_DIGEST.md catalog by domain
 * and emit a token-bounded summary per cluster to state/shared/community-summaries.json.
 * The engine is .ts, so we esbuild-bundle it to a gitignored temp ESM and import
 * (the graphrag-eval / code-graph-projection pattern; spawn via execFileSync -- argv
 * array, NO shell on posix). Extractive by default (free); --use-llm opts into a
 * fail-soft Ollama pass.
 *
 * Usage:
 *   node scripts/community-summary-gen.mjs [--domain=Lathe] [--use-llm] [--json] [--out=<path>]
 * verifies_via: `--domain=Lathe` prints a ClusterSummary. The compression goal is the
 *   `summary` FIELD <=200 tokens (live ~85 -- the spec's [100,300] estimate was loose; actual
 *   is tighter = better compression); the printed JSON object itself lands ~[100,300] tokens.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(HERE); // scripts/ -> repo root
const ENGINE_TS = join(REPO, "mcp-server", "src", "engines", "CommunitySummaryEngine.ts");
const DEFAULT_OUT = join(REPO, "state", "shared", "community-summaries.json");

function parseArgs(argv) {
  const a = {};
  for (const t of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(t);
    if (m) a[m[1]] = m[2] === undefined ? true : m[2];
  }
  return a;
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  // bundle the engine to a gitignored temp under node_modules
  const tmpDir = join(REPO, "mcp-server", "node_modules", ".community-summary-" + process.pid);
  mkdirSync(tmpDir, { recursive: true });
  const bundle = join(tmpDir, "engine.mjs");
  try {
    execFileSync(
      "npx",
      ["esbuild", ENGINE_TS, "--bundle", "--format=esm", "--platform=node", "--external:typescript", `--outfile=${bundle}`],
      { cwd: join(REPO, "mcp-server"), encoding: "utf8", stdio: ["ignore", "ignore", "inherit"], shell: process.platform === "win32" },
    );
    const mod = await import(pathToFileURL(bundle).href);
    const eng = mod.communitySummaryEngine;
    const opts = { useLlm: !!a["use-llm"] };

    let result;
    if (typeof a.domain === "string") {
      result = await eng.summarizeDomain(a.domain, opts);
    } else {
      result = await eng.summarizeAll(opts);
    }

    const out = typeof a.out === "string" ? a.out : DEFAULT_OUT;
    mkdirSync(dirname(out), { recursive: true });
    const all = Array.isArray(result) ? result : [result];
    writeFileSync(out, JSON.stringify({ generatedFor: a.domain || "all", count: all.length, summaries: all }, null, 2) + "\n");

    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    process.stdout.write(`# wrote ${out}\n`);
  } finally {
    try { if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

main().catch((e) => {
  process.stdout.write(JSON.stringify({ ok: false, error: String(e?.message ?? e) }) + "\n");
  process.exit(1);
});
