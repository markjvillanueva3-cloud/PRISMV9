#!/usr/bin/env node --import tsx
/**
 * emit-spec-html.ts — HTML companion generator for any PRISM Markdown spec.
 *
 * BACKEND-DEVTOOLS-RGS6 HTML-COMPANION-MS0 / HC-1. Generalizes the bespoke
 * `scripts/emit-revenue-roadmap-html.mjs` into a one-renderer-many-spec-types CLI by dispatching
 * to `SpecHTMLCompanionEngine.render()` (mcp-server/src/engines/SpecHTMLCompanionEngine.ts).
 *
 * Run it with the tsx loader (PRISM bundles its engines via esbuild, so a plain-node `.mjs` can't
 * `import` the engine — every `mcp-server/scripts/*.ts` uses the same tsx pattern):
 *
 *   node --import tsx scripts/emit-spec-html.ts <markdown-path> [options]
 *   npx tsx scripts/emit-spec-html.ts <markdown-path> [options]
 *
 * Options:
 *   --out=<path>             Output HTML path. Default: the source path with `.md` → `.html`.
 *   --theme=dark|light|auto  Color theme. Default: auto (follows `prefers-color-scheme`).
 *   --no-toc                 Suppress the table-of-contents sidebar.
 *   --title=<string>         Override the document <title>.
 *   --check-drift            Don't render — exit 0 if the HTML twin is in sync with the source,
 *                            exit 1 if it's stale or missing. (HC-5 drift guard.)
 *   --quiet                  Print nothing on success.
 *
 * Exit codes: 0 = ok / in-sync · 1 = source unreadable or drifted (with --check-drift) · 2 = bad invocation / render error.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { specHtmlCompanionEngine, type SpecHtmlTheme } from "../mcp-server/src/engines/SpecHTMLCompanionEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function die(code: number, msg: string): never {
  process.stderr.write(`emit-spec-html: ${msg}\n`);
  process.exit(code);
}

function printUsage(): void {
  process.stderr.write(
    "Usage: node --import tsx scripts/emit-spec-html.ts <markdown-path> [--out=<path>] [--theme=dark|light|auto] [--no-toc] [--title=<str>] [--check-drift] [--quiet]\n",
  );
}

interface CliOpts {
  mdPath: string;
  outPath: string;
  theme: SpecHtmlTheme;
  toc: boolean;
  title: string | null;
  checkDrift: boolean;
  quiet: boolean;
}

function parseArgs(argv: string[]): CliOpts {
  let theme: SpecHtmlTheme = "auto";
  let toc = true;
  let out: string | null = null;
  let title: string | null = null;
  let checkDrift = false;
  let quiet = false;
  const positional: string[] = [];
  for (const a of argv) {
    if (a === "--no-toc") toc = false;
    else if (a === "--check-drift") checkDrift = true;
    else if (a === "--quiet") quiet = true;
    else if (a.startsWith("--theme=")) {
      const v = a.slice("--theme=".length);
      if (v !== "dark" && v !== "light" && v !== "auto") die(2, `--theme must be dark|light|auto (got "${v}")`);
      theme = v;
    } else if (a.startsWith("--out=")) out = a.slice("--out=".length);
    else if (a.startsWith("--title=")) title = a.slice("--title=".length);
    else if (a === "-h" || a === "--help") { printUsage(); process.exit(0); }
    else if (a.startsWith("--")) die(2, `unknown option: ${a}`);
    else positional.push(a);
  }
  if (positional.length !== 1) { printUsage(); process.exit(2); }
  const mdPath = path.resolve(positional[0]);
  let outPath = out ? path.resolve(out) : mdPath.replace(/\.(md|markdown)$/i, "") + ".html";
  if (outPath === mdPath) outPath = mdPath + ".html";
  return { mdPath, outPath, theme, toc, title, checkDrift, quiet };
}

function readMarkdown(p: string): string {
  if (!fs.existsSync(p)) die(1, `source not found: ${p}`);
  let stat: fs.Stats;
  try { stat = fs.statSync(p); } catch (err) { die(1, `cannot stat ${p}: ${(err as Error).message}`); }
  if (!stat.isFile()) die(1, `not a regular file: ${p}`);
  try { return fs.readFileSync(p, "utf8"); } catch (err) { die(1, `cannot read ${p}: ${(err as Error).message}`); }
}

function rel(p: string): string {
  return path.relative(ROOT, p) || p;
}

function main(): void {
  const opts = parseArgs(process.argv.slice(2));
  const md = readMarkdown(opts.mdPath);

  // ── HC-5 drift guard ──────────────────────────────────────────────────
  if (opts.checkDrift) {
    if (!fs.existsSync(opts.outPath)) {
      if (!opts.quiet) process.stdout.write(`DRIFT: no HTML twin at ${rel(opts.outPath)} — run emit-spec-html to create it\n`);
      process.exit(1);
    }
    const existingHtml = fs.readFileSync(opts.outPath, "utf8");
    if (specHtmlCompanionEngine.isDrifted(md, existingHtml)) {
      if (!opts.quiet) process.stdout.write(`DRIFT: ${rel(opts.outPath)} is out of date vs ${rel(opts.mdPath)} — regenerate\n`);
      process.exit(1);
    }
    if (!opts.quiet) process.stdout.write(`in sync: ${rel(opts.outPath)} matches ${rel(opts.mdPath)} (sha256 ${specHtmlCompanionEngine.hashSource(md).slice(0, 12)}…)\n`);
    process.exit(0);
  }

  // ── Render ────────────────────────────────────────────────────────────
  let result;
  try {
    result = specHtmlCompanionEngine.render(md, {
      theme: opts.theme,
      toc: opts.toc,
      title: opts.title || undefined,
      generatedBy: "scripts/emit-spec-html.ts",
      sourcePath: path.basename(opts.mdPath),
    });
  } catch (err) {
    // The engine is written to never throw, but fail loud rather than silently if it does.
    const safeMsg = String((err as Error)?.message ?? err).replace(/[<>&]/g, "");
    const errHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Render error</title></head><body><h1>SpecHTMLCompanionEngine render error</h1><pre>${safeMsg}</pre><p>Source: ${path.basename(opts.mdPath)}</p></body></html>\n`;
    try { fs.mkdirSync(path.dirname(opts.outPath), { recursive: true }); fs.writeFileSync(opts.outPath, errHtml, "utf8"); } catch { /* nothing more we can do */ }
    die(2, `render failed: ${safeMsg} (wrote error page to ${rel(opts.outPath)})`);
  }

  try {
    fs.mkdirSync(path.dirname(opts.outPath), { recursive: true });
    fs.writeFileSync(opts.outPath, result.html, "utf8");
    fs.writeFileSync(opts.outPath + ".hash", `${result.sourceHash}  ${path.basename(opts.mdPath)}\n`, "utf8");
  } catch (err) {
    die(2, `cannot write ${opts.outPath}: ${(err as Error).message}`);
  }

  if (!opts.quiet) {
    const warn = result.warnings.length ? ` · ${result.warnings.length} warning(s): ${result.warnings.join("; ")}` : "";
    process.stdout.write(
      `wrote ${rel(opts.outPath)} — ${result.bytes.toLocaleString()} bytes · ${result.headings.length} heading(s) · mermaid=${result.hasMermaid ? "yes" : "no"} · theme=${opts.theme}${warn}\n`,
    );
  }
}

main();
