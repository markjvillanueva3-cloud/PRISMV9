#!/usr/bin/env node
/**
 * obsidian-memory-sync.mjs — CLI wrapper for ObsidianMemorySyncEngine.
 *
 * Invoked by the Stop hook (`stop-obsidian-memory-extract.mjs`) as a
 * detached background process. Walks Claude's auto-memory directory and
 * mirrors every .md file into the H-drive PRISM vault.
 *
 * Designed to be safe to run from anywhere: never throws, always prints
 * a one-line summary to stdout, exits 0 even on failure (so a hook that
 * polls exit codes does not cascade).
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P1-U01.
 *
 * Usage:
 *   node mcp-server/scripts/obsidian-memory-sync.mjs            # default paths
 *   node mcp-server/scripts/obsidian-memory-sync.mjs --quiet    # suppress stdout
 *   node mcp-server/scripts/obsidian-memory-sync.mjs --dry-run  # plan, don't write
 *   node mcp-server/scripts/obsidian-memory-sync.mjs --json     # JSON summary instead of one-line
 *
 * Env overrides:
 *   PRISM_MEMORY_SOURCE_DIR    — source dir (default: ~/.claude/projects/H--PRISM/memory)
 *   PRISM_MEMORY_VAULT_ROOT    — vault dir  (default: H:/prism/knowledge/memories)
 *   OBSIDIAN_VAULT_PATH        — optional second mirror root
 *   PRISM_WIKI_ROOT            — wiki log location (default: H:/prism/knowledge/wiki)
 */

import { existsSync, mkdirSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");
const ENGINE_DIST = join(REPO_ROOT, "mcp-server", "dist", "engines", "ObsidianMemorySyncEngine.js");
const ENGINE_SRC = join(REPO_ROOT, "mcp-server", "src", "engines", "ObsidianMemorySyncEngine.ts");
const TSX_BIN = join(REPO_ROOT, "mcp-server", "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
const LOG_FILE = process.env.PRISM_MEMORY_SYNC_LOG
  ?? join(REPO_ROOT, "state", "shared", "obsidian-memory-sync.log");

const args = new Set(process.argv.slice(2));
const QUIET = args.has("--quiet");
const DRY_RUN = args.has("--dry-run");
const JSON_OUT = args.has("--json");

function log(line) {
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${line}\n`, "utf-8");
  } catch { /* best-effort */ }
}

async function loadEngine() {
  if (existsSync(ENGINE_DIST)) {
    const mod = await import(pathToFileURL(ENGINE_DIST).href);
    return { mode: "dist", engine: mod.obsidianMemorySyncEngine ?? new mod.ObsidianMemorySyncEngine() };
  }
  if (existsSync(ENGINE_SRC) && existsSync(TSX_BIN)) {
    return { mode: "tsx-subprocess", engine: null };
  }
  throw new Error(`engine unavailable: dist=${existsSync(ENGINE_DIST)} src=${existsSync(ENGINE_SRC)} tsx=${existsSync(TSX_BIN)}`);
}

async function runViaTsx(opts) {
  // Write the bootstrap to a tempfile rather than --eval so Windows shell
  // quoting does not mangle the embedded JSON. tsx loads the .ts engine
  // directly via its loader, so we don't need a built dist.
  const { tmpdir } = await import("node:os");
  const { writeFileSync, unlinkSync } = await import("node:fs");
  const bootstrapPath = join(tmpdir(), `obsidian-memory-sync-bootstrap-${process.pid}-${Date.now()}.mts`);
  const optsJson = JSON.stringify(opts);
  const engineUrl = pathToFileURL(ENGINE_SRC).href;
  const code = [
    `import { obsidianMemorySyncEngine, ObsidianMemorySyncEngine } from ${JSON.stringify(engineUrl)};`,
    `const engine = obsidianMemorySyncEngine || new ObsidianMemorySyncEngine();`,
    `const opts = ${optsJson};`,
    `try {`,
    `  const r = engine.sync(opts);`,
    `  process.stdout.write(JSON.stringify(r));`,
    `} catch (e) {`,
    `  process.stdout.write(JSON.stringify({ok:false,error:String((e&&e.message)||e),filesScanned:0,filesMirrored:0,filesSkipped:0,filesFailed:0,errors:[],obsidianMirrored:0,durationMs:0}));`,
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
      try {
        resolve(JSON.parse(stdout));
      } catch {
        log(`tsx stdout: ${stdout.slice(0, 200)} | stderr: ${stderr.slice(0, 200)}`);
        resolve({ ok: false, error: "tsx subprocess returned non-json", filesScanned: 0, filesMirrored: 0, filesSkipped: 0, filesFailed: 0, errors: [], obsidianMirrored: 0, durationMs: 0 });
      }
    });
  });
}

async function main() {
  const start = Date.now();
  let loaded;
  try {
    loaded = await loadEngine();
  } catch (e) {
    log(`load failed: ${e?.message ?? e}`);
    if (!QUIET) {
      const summary = `obsidian-memory-sync: load failed — ${e?.message ?? e}`;
      process.stdout.write(JSON_OUT ? JSON.stringify({ ok: false, error: e?.message ?? String(e) }) + "\n" : summary + "\n");
    }
    process.exit(0);
  }

  const opts = {
    sourceDir: process.env.PRISM_MEMORY_SOURCE_DIR,
    vaultRoot: process.env.PRISM_MEMORY_VAULT_ROOT,
    obsidianVaultRoot: process.env.OBSIDIAN_VAULT_PATH || null,
    dryRun: DRY_RUN,
  };
  for (const k of Object.keys(opts)) if (opts[k] === undefined) delete opts[k];

  let result;
  try {
    if (loaded.mode === "tsx-subprocess") {
      result = await runViaTsx(opts);
    } else {
      result = loaded.engine.sync(opts);
    }
  } catch (e) {
    log(`sync threw: ${e?.message ?? e}`);
    if (!QUIET) {
      process.stdout.write(
        JSON_OUT
          ? JSON.stringify({ ok: false, error: e?.message ?? String(e) }) + "\n"
          : `obsidian-memory-sync: error — ${e?.message ?? e}\n`,
      );
    }
    process.exit(0);
  }

  const elapsed = Date.now() - start;
  log(`mode=${loaded.mode} scanned:${result.filesScanned} mirrored:${result.filesMirrored} skipped:${result.filesSkipped} failed:${result.filesFailed} obsidian:${result.obsidianMirrored} elapsed:${elapsed}ms`);

  if (!QUIET) {
    if (JSON_OUT) {
      process.stdout.write(JSON.stringify(result) + "\n");
    } else {
      process.stdout.write(
        `obsidian-memory-sync: scanned=${result.filesScanned} mirrored=${result.filesMirrored} skipped=${result.filesSkipped} failed=${result.filesFailed} ${elapsed}ms\n`,
      );
    }
  }
  process.exit(0);
}

// 60s self-watchdog — never let a sync wedge the orphan-cleanup chain.
const WATCHDOG_MS = 60_000;
setTimeout(() => {
  log(`watchdog fired after ${WATCHDOG_MS}ms — exiting`);
  process.exit(0);
}, WATCHDOG_MS).unref();

main().catch((e) => {
  log(`unhandled: ${e?.message ?? e}`);
  process.exit(0);
});
