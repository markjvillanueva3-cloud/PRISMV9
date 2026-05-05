#!/usr/bin/env node
/**
 * chunk-claude-md.mjs — one-shot chunker that splits the project CLAUDE.md
 * and the global ~/.claude/CLAUDE.md into per-section .md files under
 * `knowledge/claude-md/`.
 *
 * Each chunk gets frontmatter (source, section, slug, content_hash,
 * mirror_engine, indexed_at) and is named `<source>-<slug>.md` so the
 * global vs project split is self-evident.
 *
 * Designed as a one-shot batch op (P1-U05 deliverable). Idempotent on
 * each section's content hash so reruns are cheap. Run periodically (or
 * after CLAUDE.md edits) to keep the vault in sync.
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P1-U05.
 *
 * Usage:
 *   node mcp-server/scripts/chunk-claude-md.mjs               # default
 *   node mcp-server/scripts/chunk-claude-md.mjs --quiet       # no stdout
 *   node mcp-server/scripts/chunk-claude-md.mjs --dry-run     # plan only
 *   node mcp-server/scripts/chunk-claude-md.mjs --json        # JSON summary
 *   node mcp-server/scripts/chunk-claude-md.mjs --project-only
 *   node mcp-server/scripts/chunk-claude-md.mjs --global-only
 *
 * Env overrides:
 *   PRISM_CLAUDE_MD_VAULT     — vault root (default: H:/prism/knowledge/claude-md)
 *   PRISM_PROJECT_CLAUDE_MD   — project source (default: H:/PRISM/CLAUDE.md)
 *   PRISM_GLOBAL_CLAUDE_MD    — global source (default: ~/.claude/CLAUDE.md)
 */

import { existsSync, mkdirSync, appendFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { homedir, tmpdir } from "node:os";
import { spawn } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");
const ENGINE_DIST = join(REPO_ROOT, "mcp-server", "dist", "engines", "ClaudeMdChunkerEngine.js");
const ENGINE_SRC = join(REPO_ROOT, "mcp-server", "src", "engines", "ClaudeMdChunkerEngine.ts");
const TSX_BIN = join(REPO_ROOT, "mcp-server", "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
const LOG_FILE = process.env.PRISM_CLAUDE_MD_LOG
  ?? join(REPO_ROOT, "state", "shared", "claude-md-chunk.log");

const args = new Set(process.argv.slice(2));
const QUIET = args.has("--quiet");
const DRY_RUN = args.has("--dry-run");
const JSON_OUT = args.has("--json");
const PROJECT_ONLY = args.has("--project-only");
const GLOBAL_ONLY = args.has("--global-only");

const PROJECT_PATH = process.env.PRISM_PROJECT_CLAUDE_MD ?? "H:/PRISM/CLAUDE.md";
const GLOBAL_PATH = process.env.PRISM_GLOBAL_CLAUDE_MD ?? join(homedir(), ".claude", "CLAUDE.md");
const VAULT_ROOT = process.env.PRISM_CLAUDE_MD_VAULT ?? join(REPO_ROOT, "knowledge", "claude-md");

function log(line) {
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${line}\n`, "utf-8");
  } catch { /* best-effort */ }
}

async function loadEngine() {
  if (existsSync(ENGINE_DIST)) {
    const mod = await import(pathToFileURL(ENGINE_DIST).href);
    return { mode: "dist", engine: mod.claudeMdChunkerEngine };
  }
  if (existsSync(ENGINE_SRC) && existsSync(TSX_BIN)) {
    return { mode: "tsx-subprocess", engine: null };
  }
  throw new Error(`engine unavailable: dist=${existsSync(ENGINE_DIST)} src=${existsSync(ENGINE_SRC)} tsx=${existsSync(TSX_BIN)}`);
}

async function runChunkViaTsx(opts) {
  const bootstrapPath = join(tmpdir(), `claude-md-chunk-${process.pid}-${Date.now()}.mts`);
  const code = [
    `import { claudeMdChunkerEngine } from ${JSON.stringify(pathToFileURL(ENGINE_SRC).href)};`,
    `try {`,
    `  const r = await claudeMdChunkerEngine.chunk(${JSON.stringify(opts)});`,
    `  process.stdout.write(JSON.stringify(r));`,
    `} catch (e) {`,
    `  process.stdout.write(JSON.stringify({ ok: false, error: String((e && e.message) || e), filesWritten: 0, filesSkipped: 0, filesFailed: 0, sectionsFound: 0 }));`,
    `}`,
  ].join("\n");
  writeFileSync(bootstrapPath, code, "utf-8");
  return await new Promise((resolve) => {
    const child = spawn(TSX_BIN, [bootstrapPath], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: process.platform === "win32",
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d.toString("utf-8"); });
    child.stderr.on("data", (d) => { stderr += d.toString("utf-8"); });
    child.on("close", () => {
      try { unlinkSync(bootstrapPath); } catch { /* ignore */ }
      try { resolve(JSON.parse(stdout)); }
      catch {
        log(`chunk stdout=${stdout.slice(0, 200)} stderr=${stderr.slice(0, 200)}`);
        resolve({ ok: false, error: "tsx subprocess returned non-json", filesWritten: 0, filesSkipped: 0, filesFailed: 0, sectionsFound: 0 });
      }
    });
  });
}

async function runChunk(loaded, opts) {
  if (loaded.mode === "tsx-subprocess") {
    return await runChunkViaTsx(opts);
  }
  return await loaded.engine.chunk(opts);
}

async function main() {
  const start = Date.now();
  const summary = {
    ok: true,
    project: null,
    global: null,
    totalSections: 0,
    totalWritten: 0,
    totalSkipped: 0,
    totalFailed: 0,
    durationMs: 0,
    error: null,
  };

  let loaded;
  try {
    loaded = await loadEngine();
  } catch (e) {
    summary.ok = false;
    summary.error = e?.message ?? String(e);
    log(summary.error);
    finish(summary, start);
    return;
  }

  if (!GLOBAL_ONLY) {
    if (!existsSync(PROJECT_PATH)) {
      log(`project source missing: ${PROJECT_PATH}`);
      summary.project = { ok: false, error: "source missing", path: PROJECT_PATH };
    } else {
      summary.project = await runChunk(loaded, {
        sourcePath: PROJECT_PATH,
        sourceTag: "project",
        vaultRoot: VAULT_ROOT,
        dryRun: DRY_RUN,
      });
    }
  }

  if (!PROJECT_ONLY) {
    if (!existsSync(GLOBAL_PATH)) {
      log(`global source missing: ${GLOBAL_PATH}`);
      summary.global = { ok: false, error: "source missing", path: GLOBAL_PATH };
    } else {
      summary.global = await runChunk(loaded, {
        sourcePath: GLOBAL_PATH,
        sourceTag: "global",
        vaultRoot: VAULT_ROOT,
        dryRun: DRY_RUN,
      });
    }
  }

  for (const r of [summary.project, summary.global]) {
    if (!r) continue;
    summary.totalSections += r.sectionsFound ?? 0;
    summary.totalWritten += r.filesWritten ?? 0;
    summary.totalSkipped += r.filesSkipped ?? 0;
    summary.totalFailed += r.filesFailed ?? 0;
    if (!r.ok) summary.ok = false;
  }

  log(`chunk: sections=${summary.totalSections} written=${summary.totalWritten} skipped=${summary.totalSkipped} failed=${summary.totalFailed}`);
  finish(summary, start);
}

function finish(summary, start) {
  summary.durationMs = Date.now() - start;
  if (!QUIET) {
    if (JSON_OUT) {
      process.stdout.write(JSON.stringify(summary) + "\n");
    } else {
      process.stdout.write(
        `chunk-claude-md: sections=${summary.totalSections} written=${summary.totalWritten} skipped=${summary.totalSkipped} failed=${summary.totalFailed} ${summary.durationMs}ms\n`,
      );
    }
  }
  process.exit(0);
}

const WATCHDOG_MS = 60_000;
setTimeout(() => { log(`watchdog fired after ${WATCHDOG_MS}ms`); process.exit(0); }, WATCHDOG_MS).unref();

main().catch((e) => { log(`unhandled: ${e?.message ?? e}`); process.exit(0); });
