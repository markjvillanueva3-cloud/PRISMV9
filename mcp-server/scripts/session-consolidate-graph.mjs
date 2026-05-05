#!/usr/bin/env node
/**
 * session-consolidate-graph.mjs — N=5 session consolidation runner.
 *
 * Invoked by the Stop hook (`session-consolidate-graph.mjs`) as a detached
 * background process. Increments the session counter at
 * `mcp-server/data/state/consolidation-counter.json`; when the counter
 * crosses N=5, fires `MemoryConsolidationEngine.consolidate()` and writes
 * each new pattern to `knowledge/tribal/` as a markdown file with
 * frontmatter for downstream Qdrant embedding.
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P1-U02.
 *
 * Idempotency: a tribal/ pattern file is written via temp+rename only when
 * the pattern's id is not already on disk. Reruns are cheap.
 *
 * Failure mode: every I/O is wrapped — the script never throws into the
 * hook chain; it always exits 0. Errors land in the run log.
 *
 * Usage:
 *   node scripts/session-consolidate-graph.mjs            # default
 *   node scripts/session-consolidate-graph.mjs --quiet    # no stdout
 *   node scripts/session-consolidate-graph.mjs --force    # bypass N=5 check
 *   node scripts/session-consolidate-graph.mjs --dry-run  # plan only
 *   node scripts/session-consolidate-graph.mjs --json     # JSON summary
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, renameSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");
const COUNTER_FILE = join(REPO_ROOT, "mcp-server", "data", "state", "consolidation-counter.json");
const TRIBAL_DIR = process.env.PRISM_TRIBAL_DIR
  ?? join(REPO_ROOT, "knowledge", "tribal");
const ENGINE_DIST = join(REPO_ROOT, "mcp-server", "dist", "engines", "MemoryConsolidationEngine.js");
const ENGINE_SRC = join(REPO_ROOT, "mcp-server", "src", "engines", "MemoryConsolidationEngine.ts");
const TSX_BIN = join(REPO_ROOT, "mcp-server", "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
const LOG_FILE = process.env.PRISM_CONSOLIDATION_LOG
  ?? join(REPO_ROOT, "state", "shared", "session-consolidation.log");

const N_THRESHOLD = Number.parseInt(process.env.PRISM_CONSOLIDATION_N ?? "5", 10);
const SCHEMA_VERSION = "1.0.0";

const args = new Set(process.argv.slice(2));
const QUIET = args.has("--quiet");
const FORCE = args.has("--force");
const DRY_RUN = args.has("--dry-run");
const JSON_OUT = args.has("--json");

function log(line) {
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${line}\n`, "utf-8");
  } catch { /* best-effort */ }
}

function atomicWrite(target, content) {
  const dir = dirname(target);
  mkdirSync(dir, { recursive: true });
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, content, "utf-8");
  try { renameSync(tmp, target); }
  catch {
    try { unlinkSync(target); } catch { /* ignore */ }
    renameSync(tmp, target);
  }
}

function readCounter() {
  if (!existsSync(COUNTER_FILE)) {
    return { schemaVersion: SCHEMA_VERSION, sessionsSinceLastConsolidation: 0, totalConsolidations: 0, lastUpdated: null, lastConsolidation: null };
  }
  try {
    const raw = JSON.parse(readFileSync(COUNTER_FILE, "utf-8"));
    return {
      schemaVersion: raw.schemaVersion ?? SCHEMA_VERSION,
      sessionsSinceLastConsolidation: Number(raw.sessionsSinceLastConsolidation ?? 0),
      totalConsolidations: Number(raw.totalConsolidations ?? 0),
      lastUpdated: raw.lastUpdated ?? null,
      lastConsolidation: raw.lastConsolidation ?? null,
    };
  } catch (e) {
    log(`counter parse failed: ${e?.message ?? e} — resetting`);
    return { schemaVersion: SCHEMA_VERSION, sessionsSinceLastConsolidation: 0, totalConsolidations: 0, lastUpdated: null, lastConsolidation: null };
  }
}

function writeCounter(state) {
  state.lastUpdated = new Date().toISOString();
  atomicWrite(COUNTER_FILE, JSON.stringify(state, null, 2) + "\n");
}

function slug(s) {
  return String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "untitled";
}

function patternFilename(pattern) {
  return `${slug(pattern.type)}-${slug(pattern.id)}.md`;
}

function writePattern(pattern) {
  const filename = patternFilename(pattern);
  const target = join(TRIBAL_DIR, filename);
  if (existsSync(target)) return { wrote: false, reason: "exists", path: target };

  const fm = [
    "---",
    `schema_version: ${SCHEMA_VERSION}`,
    `kind: consolidated_pattern`,
    `pattern_id: ${JSON.stringify(pattern.id)}`,
    `pattern_type: ${pattern.type}`,
    `occurrences: ${pattern.occurrences}`,
    `confidence: ${pattern.confidence}`,
    `first_seen: ${JSON.stringify(pattern.firstSeen)}`,
    `last_seen: ${JSON.stringify(pattern.lastSeen)}`,
    `source_node_count: ${(pattern.source_nodes ?? []).length}`,
    `tags: [tribal, consolidated, ${pattern.type}]`,
    "---",
    "",
  ].join("\n");

  const body = [
    `# Pattern: ${pattern.id}`,
    "",
    `**Type:** \`${pattern.type}\` · **Occurrences:** \`${pattern.occurrences}\` · **Confidence:** \`${pattern.confidence}\``,
    "",
    "## Description",
    "",
    pattern.description ?? "(no description)",
    "",
    "## Context",
    "",
    "```json",
    JSON.stringify(pattern.context ?? {}, null, 2),
    "```",
    "",
    "## Source nodes",
    "",
    (pattern.source_nodes ?? []).slice(0, 10).map((id) => `- \`${id}\``).join("\n") || "(none)",
    "",
  ].join("\n");

  atomicWrite(target, fm + body);
  return { wrote: true, path: target };
}

async function loadEngine() {
  if (existsSync(ENGINE_DIST)) {
    const mod = await import(pathToFileURL(ENGINE_DIST).href);
    return { mode: "dist", engine: mod.memoryConsolidationEngine };
  }
  if (existsSync(ENGINE_SRC) && existsSync(TSX_BIN)) {
    return { mode: "tsx-subprocess", engine: null };
  }
  throw new Error(`engine unavailable: dist=${existsSync(ENGINE_DIST)} src=${existsSync(ENGINE_SRC)} tsx=${existsSync(TSX_BIN)}`);
}

async function runConsolidateViaTsx() {
  const { tmpdir } = await import("node:os");
  const bootstrapPath = join(tmpdir(), `consolidate-bootstrap-${process.pid}-${Date.now()}.mts`);
  const code = [
    `import { memoryConsolidationEngine } from ${JSON.stringify(pathToFileURL(ENGINE_SRC).href)};`,
    `try {`,
    `  memoryConsolidationEngine.recordSessionEnd();`,
    `  const r = await memoryConsolidationEngine.consolidate();`,
    `  const patterns = memoryConsolidationEngine.getPatterns();`,
    `  process.stdout.write(JSON.stringify({ ok: true, report: r, patterns }));`,
    `} catch (e) {`,
    `  process.stdout.write(JSON.stringify({ ok: false, error: String((e && e.message) || e) }));`,
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
        log(`tsx stdout: ${stdout.slice(0, 200)} | stderr: ${stderr.slice(0, 200)}`);
        resolve({ ok: false, error: "tsx subprocess returned non-json" });
      }
    });
  });
}

async function main() {
  const start = Date.now();
  const result = {
    ok: true,
    counterBefore: 0,
    counterAfter: 0,
    triggered: false,
    patternsWritten: 0,
    patternsSkipped: 0,
    consolidationReport: null,
    durationMs: 0,
    error: null,
  };

  // Step 1: increment counter
  const state = readCounter();
  result.counterBefore = state.sessionsSinceLastConsolidation;
  state.sessionsSinceLastConsolidation += 1;
  result.counterAfter = state.sessionsSinceLastConsolidation;

  const shouldFire = FORCE || state.sessionsSinceLastConsolidation >= N_THRESHOLD;
  result.triggered = shouldFire;

  if (!shouldFire) {
    if (!DRY_RUN) writeCounter(state);
    log(`counter: ${result.counterBefore}->${result.counterAfter} (no trigger; threshold=${N_THRESHOLD})`);
    finish(result, start);
    return;
  }

  // Step 2: trigger consolidation
  if (DRY_RUN) {
    log(`would trigger consolidation @ ${result.counterAfter} (dry-run)`);
    finish(result, start);
    return;
  }

  let consolidate;
  try {
    const loaded = await loadEngine();
    if (loaded.mode === "tsx-subprocess") {
      consolidate = await runConsolidateViaTsx();
    } else {
      loaded.engine.recordSessionEnd();
      const r = await loaded.engine.consolidate();
      consolidate = { ok: true, report: r, patterns: loaded.engine.getPatterns() };
    }
  } catch (e) {
    consolidate = { ok: false, error: e?.message ?? String(e) };
  }

  if (!consolidate.ok) {
    result.ok = false;
    result.error = consolidate.error;
    log(`consolidation failed: ${consolidate.error}`);
    // Counter NOT reset — retry next session
    finish(result, start);
    return;
  }

  result.consolidationReport = consolidate.report ?? null;

  // Step 3: write patterns to tribal/
  const patterns = Array.isArray(consolidate.patterns) ? consolidate.patterns : [];
  for (const p of patterns) {
    try {
      const r = writePattern(p);
      if (r.wrote) result.patternsWritten++; else result.patternsSkipped++;
    } catch (e) {
      log(`pattern write failed: ${p?.id} — ${e?.message ?? e}`);
    }
  }

  // Step 4: reset counter (engine has already reset its own on consolidate())
  state.sessionsSinceLastConsolidation = 0;
  state.totalConsolidations += 1;
  state.lastConsolidation = new Date().toISOString();
  writeCounter(state);

  log(`triggered=${result.triggered} patterns_written=${result.patternsWritten} skipped=${result.patternsSkipped} report=${JSON.stringify(result.consolidationReport)}`);
  finish(result, start);
}

function finish(result, start) {
  result.durationMs = Date.now() - start;
  if (!QUIET) {
    if (JSON_OUT) {
      process.stdout.write(JSON.stringify(result) + "\n");
    } else {
      process.stdout.write(
        `session-consolidate: counter=${result.counterBefore}->${result.counterAfter} triggered=${result.triggered} patterns=${result.patternsWritten}+${result.patternsSkipped}skip ${result.durationMs}ms\n`,
      );
    }
  }
  process.exit(0);
}

const WATCHDOG_MS = 60_000;
setTimeout(() => { log(`watchdog fired after ${WATCHDOG_MS}ms`); process.exit(0); }, WATCHDOG_MS).unref();

main().catch((e) => { log(`unhandled: ${e?.message ?? e}`); process.exit(0); });
