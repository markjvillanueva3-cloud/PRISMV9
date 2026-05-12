#!/usr/bin/env node --import tsx
/**
 * emit-all-spec-html.ts — batch HTML-companion regenerator for PRISM strategic specs.
 *
 * BACKEND-DEVTOOLS-RGS6 HTML-PRIMARY-MS0 / U-HPS02. Walks the human-facing Markdown surfaces
 * (state/shared/specs/**, state/shared/research/** — NOT CLAUDE.md / skills / hooks / digests /
 * handoffs, which stay MD-only per the HTML-PRIMARY doctrine) and (re)renders an `.html` twin for
 * each one that is missing or stale, via `SpecHTMLCompanionEngine.render()`.
 *
 * "Stale" = the `.html` is missing, OR older than the `.md` (mtime), OR its embedded
 * `<meta name="prism-source-hash">` doesn't match `sha256(current .md)` (the secondary content-drift
 * check that catches mtime-equal-but-content-changed). Each file is rendered independently — a render
 * failure on one logs and continues; the batch never aborts. A lock file prevents a cron firing
 * mid-run from doubling up.
 *
 * Run via the tsx loader (PRISM bundles its engines via esbuild — a plain-node `.mjs` can't import
 * the engine):
 *
 *   node --import tsx scripts/emit-all-spec-html.ts [options]
 *   node H:/prism/node_modules/tsx/dist/cli.mjs H:/prism/scripts/emit-all-spec-html.ts [options]   # what the cron uses
 *
 * Options:
 *   --force          Re-render every twin, even if up to date.
 *   --check-drift    Don't render — list `.md` files whose twin is stale; exit 1 if any, 0 otherwise.
 *   --dirs=a,b,...   Override the directories to walk (relative to the PRISM root). Default: state/shared/specs,state/shared/research
 *   --quiet          Suppress per-file and summary lines (still prints on error / drift found).
 *
 * Exit codes: 0 = ok (or all in-sync) · 1 = drift found (with --check-drift) · 2 = fatal (locked / bad invocation).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { specHtmlCompanionEngine } from "../mcp-server/src/engines/SpecHTMLCompanionEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LOCK_FILE = path.join(ROOT, "state", "shared", ".emit-all-spec-html.lock");
const LOCK_STALE_MS = 10 * 60 * 1000; // a run older than this is considered crashed
const DEFAULT_DIRS = ["state/shared/specs", "state/shared/research"];
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".cache", ".index"]);
const MD_RE = /\.(md|markdown)$/i;
const SOURCE_HASH_RE = /<meta\s+name="prism-source-hash"\s+content="([0-9a-f]{64})"/i;

interface Opts { force: boolean; checkDrift: boolean; quiet: boolean; dirs: string[]; }

function parseArgs(argv: string[]): Opts {
  let force = false, checkDrift = false, quiet = false;
  let dirs = DEFAULT_DIRS;
  for (const a of argv) {
    if (a === "--force") force = true;
    else if (a === "--check-drift") checkDrift = true;
    else if (a === "--quiet") quiet = true;
    else if (a.startsWith("--dirs=")) dirs = a.slice("--dirs=".length).split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "-h" || a === "--help") {
      process.stderr.write("Usage: node --import tsx scripts/emit-all-spec-html.ts [--force] [--check-drift] [--dirs=a,b] [--quiet]\n");
      process.exit(0);
    } else if (a.startsWith("--")) { process.stderr.write(`emit-all-spec-html: unknown option ${a}\n`); process.exit(2); }
  }
  return { force, checkDrift, quiet, dirs };
}

function walkMd(dir: string, acc: string[]): void {
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name) || e.name.startsWith(".")) continue;
      walkMd(path.join(dir, e.name), acc);
    } else if (e.isFile() && MD_RE.test(e.name)) {
      acc.push(path.join(dir, e.name));
    }
  }
}

function htmlPathFor(mdPath: string): string {
  const stem = mdPath.replace(MD_RE, "");
  return stem === mdPath ? mdPath + ".html" : stem + ".html";
}

/** Why a twin needs regenerating — "" means it's up to date. */
function staleReason(mdPath: string, htmlPath: string, md: string): string {
  if (!fs.existsSync(htmlPath)) return "missing";
  let mdStat: fs.Stats, htmlStat: fs.Stats;
  try { mdStat = fs.statSync(mdPath); htmlStat = fs.statSync(htmlPath); } catch { return "stat-error"; }
  if (htmlStat.mtimeMs < mdStat.mtimeMs) return "mtime";
  // Secondary: content hash. Cheap (read the twin's <head>).
  let head = "";
  try { head = fs.readFileSync(htmlPath, "utf8").slice(0, 4096); } catch { return "read-error"; }
  const m = SOURCE_HASH_RE.exec(head);
  if (!m) return "no-hash-meta";
  if (m[1] !== specHtmlCompanionEngine.hashSource(md)) return "content-hash";
  return "";
}

// ── Lock handling ─────────────────────────────────────────────────────────

function isPidAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch (e) { return (e as NodeJS.ErrnoException).code === "EPERM"; }
}

function acquireLock(): boolean {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const raw = fs.readFileSync(LOCK_FILE, "utf8");
      let held: { pid?: number; startedAt?: string } = {};
      try { held = JSON.parse(raw); } catch { /* corrupt → treat as stale */ }
      const ageMs = held.startedAt ? Date.now() - new Date(held.startedAt).getTime() : Infinity;
      const holderAlive = typeof held.pid === "number" && isPidAlive(held.pid);
      if (holderAlive && ageMs < LOCK_STALE_MS) {
        process.stderr.write(`emit-all-spec-html: another run is in progress (pid ${held.pid}, started ${held.startedAt}) — exiting\n`);
        return false;
      }
      // stale / crashed holder → take over
    }
    fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
    fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), "utf8");
    return true;
  } catch (err) {
    process.stderr.write(`emit-all-spec-html: could not acquire lock: ${(err as Error).message} — exiting\n`);
    return false;
  }
}

function releaseLock(): void {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const held = JSON.parse(fs.readFileSync(LOCK_FILE, "utf8")) as { pid?: number };
      if (held.pid === process.pid) fs.unlinkSync(LOCK_FILE);
    }
  } catch { /* best effort */ }
}

// ── Main ──────────────────────────────────────────────────────────────────

function rel(p: string): string { return path.relative(ROOT, p) || p; }

function main(): void {
  const opts = parseArgs(process.argv.slice(2));

  // Collect candidate .md files.
  const mds: string[] = [];
  for (const d of opts.dirs) walkMd(path.resolve(ROOT, d), mds);
  mds.sort();

  // ── --check-drift: report only, no rendering, no lock ───────────────────
  if (opts.checkDrift) {
    const drifted: Array<{ md: string; reason: string }> = [];
    for (const mdPath of mds) {
      let md: string;
      try { md = fs.readFileSync(mdPath, "utf8"); } catch { drifted.push({ md: mdPath, reason: "unreadable" }); continue; }
      const reason = staleReason(mdPath, htmlPathFor(mdPath), md);
      if (reason) drifted.push({ md: mdPath, reason });
    }
    if (drifted.length === 0) {
      if (!opts.quiet) process.stdout.write(`emit-all-spec-html: all ${mds.length} spec/research twin(s) are in sync\n`);
      process.exit(0);
    }
    process.stdout.write(`emit-all-spec-html: ${drifted.length}/${mds.length} twin(s) STALE — run emit-all-spec-html.ts to regenerate:\n`);
    for (const d of drifted) process.stdout.write(`  ${rel(d.md)}  [${d.reason}]\n`);
    process.exit(1);
  }

  // ── Render pass: lock, then process each file independently ─────────────
  if (!acquireLock()) process.exit(2);
  let scanned = 0, rendered = 0, skipped = 0, errors = 0;
  const errorList: string[] = [];
  try {
    for (const mdPath of mds) {
      scanned++;
      const htmlPath = htmlPathFor(mdPath);
      let md: string;
      try { md = fs.readFileSync(mdPath, "utf8"); } catch (err) {
        errors++; errorList.push(`${rel(mdPath)}: read failed — ${(err as Error).message}`); continue;
      }
      const reason = opts.force ? "force" : staleReason(mdPath, htmlPath, md);
      if (!reason) { skipped++; continue; }
      try {
        const result = specHtmlCompanionEngine.render(md, {
          theme: "auto",
          toc: true,
          generatedBy: "scripts/emit-all-spec-html.ts",
          sourcePath: path.basename(mdPath),
        });
        fs.writeFileSync(htmlPath, result.html, "utf8");
        fs.writeFileSync(htmlPath + ".hash", `${result.sourceHash}  ${path.basename(mdPath)}\n`, "utf8");
        rendered++;
        if (!opts.quiet) process.stdout.write(`  ${rel(htmlPath)} — ${result.bytes.toLocaleString()}B, ${result.headings.length}h, mermaid=${result.hasMermaid ? "yes" : "no"} [${reason}]\n`);
      } catch (err) {
        errors++; errorList.push(`${rel(mdPath)}: render failed — ${(err as Error).message}`);
      }
    }
  } finally {
    releaseLock();
  }

  if (errorList.length) for (const e of errorList) process.stderr.write(`  ERROR ${e}\n`);
  if (!opts.quiet || errors > 0) {
    process.stdout.write(`emit-all-spec-html: scanned ${scanned} · rendered ${rendered} · skipped ${skipped} · errors ${errors} (dirs: ${opts.dirs.join(", ")})\n`);
  }
  // Per-file errors are non-fatal: the batch still completed and the rest of the twins were
  // updated, so exit 0 (errors are on stderr) — a cron shouldn't alarm on one malformed spec.
  process.exit(0);
}

main();
