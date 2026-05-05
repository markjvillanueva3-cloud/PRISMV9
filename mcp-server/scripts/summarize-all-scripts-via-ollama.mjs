#!/usr/bin/env node
/**
 * summarize-all-scripts-via-ollama.mjs — walk PRISM script directories,
 * call Ollama (qwen2.5-coder:7b) on each, and emit knowledge/scripts/INDEX.md
 * with one summary line per script. Idempotent on header content hash.
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P3-U02.
 *
 * Usage:
 *   node mcp-server/scripts/summarize-all-scripts-via-ollama.mjs            # default
 *   node mcp-server/scripts/summarize-all-scripts-via-ollama.mjs --quiet    # no stdout
 *   node mcp-server/scripts/summarize-all-scripts-via-ollama.mjs --json     # JSON summary
 *   node mcp-server/scripts/summarize-all-scripts-via-ollama.mjs --concurrency=8
 *   node mcp-server/scripts/summarize-all-scripts-via-ollama.mjs --max=20   # cap (test runs)
 *   node mcp-server/scripts/summarize-all-scripts-via-ollama.mjs --refresh  # ignore cache
 *
 * Env overrides:
 *   PRISM_SCRIPT_INDEX_OUT     — output path (default: H:/prism/knowledge/scripts/INDEX.md)
 *   PRISM_OLLAMA_HOST          — Ollama base URL (default: http://127.0.0.1:11434)
 *   PRISM_OLLAMA_SUMMARY_MODEL — model (default: qwen2.5-coder:7b)
 *   PRISM_SCRIPT_DIRS          — comma-separated dirs to scan (default: PRISM scripts dirs)
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, renameSync, unlinkSync, appendFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep, posix } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(join(HERE, "..", ".."));
const ENGINE_DIST = join(REPO_ROOT, "mcp-server", "dist", "engines", "ScriptSummaryEngine.js");
const ENGINE_SRC = join(REPO_ROOT, "mcp-server", "src", "engines", "ScriptSummaryEngine.ts");
const TSX_BIN = join(REPO_ROOT, "mcp-server", "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
const LOG_FILE = process.env.PRISM_SCRIPT_INDEX_LOG
  ?? join(REPO_ROOT, "state", "shared", "summarize-scripts.log");
const OUT_PATH = process.env.PRISM_SCRIPT_INDEX_OUT ?? "H:/prism/knowledge/scripts/INDEX.md";
const OLLAMA_HOST = process.env.PRISM_OLLAMA_HOST ?? "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.PRISM_OLLAMA_SUMMARY_MODEL ?? "qwen2.5-coder:7b";

const DEFAULT_SCAN_DIRS = [
  join(REPO_ROOT, "mcp-server", "scripts"),
  join(REPO_ROOT, ".claude", "scripts"),
  join(REPO_ROOT, "scripts"),
];
const SCRIPT_EXTENSIONS = new Set([".mjs", ".js", ".ts", ".cjs"]);
const IGNORE_DIRS = new Set(["node_modules", "dist", ".cache", ".git", "tests", "test", "__tests__"]);

const args = new Set(process.argv.slice(2));
const QUIET = args.has("--quiet");
const JSON_OUT = args.has("--json");
const REFRESH = args.has("--refresh");
const MAX = (() => {
  const a = [...args].find((x) => x.startsWith("--max="));
  return a ? Number.parseInt(a.split("=")[1], 10) : Number.POSITIVE_INFINITY;
})();
const CONCURRENCY = (() => {
  const a = [...args].find((x) => x.startsWith("--concurrency="));
  return a ? Math.max(1, Number.parseInt(a.split("=")[1], 10)) : 4;
})();

function log(line) {
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${line}\n`, "utf-8");
  } catch { /* best-effort */ }
}

function listScripts(roots) {
  const out = [];
  const stack = roots.filter((r) => existsSync(r)).map((r) => ({ root: r, dir: r }));
  while (stack.length > 0) {
    const { root, dir } = stack.pop();
    let entries = [];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (!IGNORE_DIRS.has(e.name)) stack.push({ root, dir: full });
        continue;
      }
      if (!e.isFile()) continue;
      const ext = e.name.slice(e.name.lastIndexOf("."));
      if (!SCRIPT_EXTENSIONS.has(ext)) continue;
      out.push({ root, fullPath: full });
    }
  }
  out.sort((a, b) => a.fullPath.localeCompare(b.fullPath));
  return out;
}

function loadCacheFromIndex() {
  if (REFRESH || !existsSync(OUT_PATH)) return {};
  try {
    const raw = readFileSync(OUT_PATH, "utf-8");
    const cache = {};
    // Index format: under each "## <bucket>" section, lines look like
    //   - **<filename>** — <summary>
    // We don't store hashes in the rendered index, so cache by filename->summary
    // and validate via the engine's hash check (which compares header content).
    const lineRe = /^- \*\*([^*]+)\*\*\s+—\s+(.+)$/;
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(lineRe);
      if (m) {
        const filename = m[1].trim();
        const summary = m[2].trim();
        cache[filename] = summary;
      }
    }
    return cache;
  } catch {
    return {};
  }
}

async function callOllama(prompt) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { num_predict: 80, temperature: 0.1 },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, answer: "", error: `HTTP ${res.status}` };
    const j = await res.json();
    return { ok: true, answer: j.response ?? "" };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, answer: "", error: (e && e.message) || String(e) };
  }
}

async function loadEngine() {
  if (existsSync(ENGINE_DIST)) {
    const mod = await import(pathToFileURL(ENGINE_DIST).href);
    return { mode: "dist", engine: mod.scriptSummaryEngine };
  }
  if (existsSync(ENGINE_SRC) && existsSync(TSX_BIN)) {
    return { mode: "tsx-subprocess", engine: null };
  }
  throw new Error(`engine unavailable: dist=${existsSync(ENGINE_DIST)} src=${existsSync(ENGINE_SRC)} tsx=${existsSync(TSX_BIN)}`);
}

function bucketFor(scriptPath) {
  // Group by dirname relative to repo root. The full relative dirname is
  // the bucket — so files in mcp-server/scripts/_completed_utilities/ go
  // into a different bucket than mcp-server/scripts/ files (correct).
  const rel = relative(REPO_ROOT, scriptPath).split(sep).join(posix.sep);
  const idx = rel.lastIndexOf("/");
  return idx === -1 ? "(root)" : rel.slice(0, idx);
}

function bucketOrderKey(bucket) {
  // Stable sort: mcp-server/scripts first, then .claude, then anything else
  if (bucket.startsWith("mcp-server/")) return `0_${bucket}`;
  if (bucket.startsWith(".claude/")) return `1_${bucket}`;
  return `2_${bucket}`;
}

function renderIndex(entriesByBucket, total) {
  const lines = [
    "# Scripts Index",
    "",
    "_Auto-generated by `scripts/summarize-all-scripts-via-ollama.mjs` (P3-U02). Do not edit manually._",
    "",
    `**Total scripts:** ${total}  ·  **Generated:** ${new Date().toISOString()}  ·  **Model:** ${OLLAMA_MODEL}`,
    "",
  ];
  const buckets = Object.keys(entriesByBucket).sort((a, b) => bucketOrderKey(a).localeCompare(bucketOrderKey(b)));
  for (const bucket of buckets) {
    lines.push(`## ${bucket}`);
    lines.push("");
    const entries = entriesByBucket[bucket];
    entries.sort((a, b) => a.basename.localeCompare(b.basename));
    for (const e of entries) {
      lines.push(`- **${e.basename}** — ${e.summary}`);
    }
    lines.push("");
  }
  return lines.join("\n");
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

async function summarizeOne(loaded, scriptPath, cache) {
  if (loaded.mode === "tsx-subprocess") {
    return await summarizeViaTsx(scriptPath, cache);
  }
  return await loaded.engine.summarize({
    scriptPath,
    cache,
    ollamaCall: callOllama,
  });
}

async function summarizeViaTsx(scriptPath, cache) {
  const bootstrapPath = join(tmpdir(), `script-sum-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mts`);
  const code = [
    `import { scriptSummaryEngine } from ${JSON.stringify(pathToFileURL(ENGINE_SRC).href)};`,
    `const callOllama = async (prompt) => {`,
    `  const ctrl = new AbortController();`,
    `  const timer = setTimeout(() => ctrl.abort(), 30000);`,
    `  try {`,
    `    const res = await fetch(${JSON.stringify(`${OLLAMA_HOST}/api/generate`)}, {`,
    `      method: "POST", headers: { "Content-Type": "application/json" },`,
    `      body: JSON.stringify({ model: ${JSON.stringify(OLLAMA_MODEL)}, prompt, stream: false, options: { num_predict: 80, temperature: 0.1 } }),`,
    `      signal: ctrl.signal,`,
    `    });`,
    `    clearTimeout(timer);`,
    `    if (!res.ok) return { ok: false, answer: "", error: "HTTP " + res.status };`,
    `    const j = await res.json();`,
    `    return { ok: true, answer: j.response || "" };`,
    `  } catch (e) {`,
    `    clearTimeout(timer);`,
    `    return { ok: false, answer: "", error: String((e && e.message) || e) };`,
    `  }`,
    `};`,
    `const r = await scriptSummaryEngine.summarize({ scriptPath: ${JSON.stringify(scriptPath)}, cache: ${JSON.stringify(cache)}, ollamaCall: callOllama });`,
    `process.stdout.write(JSON.stringify(r));`,
  ].join("\n");
  writeFileSync(bootstrapPath, code, "utf-8");
  return await new Promise((resolve) => {
    const isWin = process.platform === "win32";
    const cmdExe = `${process.env.SystemRoot ?? "C:\\Windows"}\\System32\\cmd.exe`;
    const exe = isWin ? cmdExe : TSX_BIN;
    const args = isWin ? ["/c", TSX_BIN, bootstrapPath] : [bootstrapPath];
    const child = spawn(exe, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true, shell: false });
    let stdout = "";
    child.stdout.on("data", (c) => { stdout += c.toString("utf-8"); });
    child.stderr.on("data", () => {});
    child.on("close", () => {
      try { unlinkSync(bootstrapPath); } catch { /* ignore */ }
      try { resolve(JSON.parse(stdout)); }
      catch {
        resolve({ scriptPath, summary: "(tsx subprocess returned non-json)", hash: "", source: "fallback", durationMs: 0 });
      }
    });
  });
}

async function runWithConcurrency(items, n, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  const start = Date.now();
  const summary = {
    ok: true,
    totalScripts: 0,
    cacheHits: 0,
    ollamaCalls: 0,
    fallbacks: 0,
    failures: 0,
    durationMs: 0,
    indexPath: OUT_PATH,
    error: null,
  };

  let loaded;
  try { loaded = await loadEngine(); }
  catch (e) {
    summary.ok = false;
    summary.error = (e && e.message) || String(e);
    log(summary.error);
    finish(summary, start);
    return;
  }

  const scanDirs = (process.env.PRISM_SCRIPT_DIRS ?? "").length > 0
    ? process.env.PRISM_SCRIPT_DIRS.split(",").map((s) => resolve(s.trim()))
    : DEFAULT_SCAN_DIRS;

  const allScripts = listScripts(scanDirs);
  const limit = Math.min(allScripts.length, MAX);
  const scripts = allScripts.slice(0, limit);
  summary.totalScripts = scripts.length;

  if (!QUIET) {
    process.stdout.write(`Found ${allScripts.length} scripts; processing ${scripts.length} with concurrency=${CONCURRENCY}\n`);
  }
  log(`scan: found=${allScripts.length} processing=${scripts.length} concurrency=${CONCURRENCY}`);

  // Pre-load filename-keyed cache from existing INDEX.md (best-effort hash check
  // would require the engine to have stored hash — we only carry summary forward
  // and let the engine's hash check decide. Convert to absolute-path keys with
  // null hash so engine forces a fresh call; the cache primarily speeds up
  // refresh-runs after partial completion when run with explicit --resume).
  const filenameCache = REFRESH ? {} : loadCacheFromIndex();

  const results = await runWithConcurrency(scripts, CONCURRENCY, async (s, idx) => {
    const r = await summarizeOne(loaded, s.fullPath, {});
    if (r.source === "ollama") summary.ollamaCalls++;
    else if (r.source === "cache") summary.cacheHits++;
    else if (r.source === "fallback") summary.fallbacks++;
    if (!QUIET && idx % 25 === 0 && idx > 0) {
      process.stdout.write(`  [${idx}/${scripts.length}] ${r.source.padEnd(8)} ${r.scriptPath}\n`);
    }
    return { ...r, root: s.root };
  });

  const entriesByBucket = {};
  for (const r of results) {
    const bucket = bucketFor(r.scriptPath);
    if (!entriesByBucket[bucket]) entriesByBucket[bucket] = [];
    const basename = r.scriptPath.split(/[\\/]/).pop() ?? r.scriptPath;
    entriesByBucket[bucket].push({ basename, summary: r.summary });
  }

  const indexBody = renderIndex(entriesByBucket, summary.totalScripts);
  try { atomicWrite(OUT_PATH, indexBody); }
  catch (e) {
    summary.ok = false;
    summary.error = `write index: ${(e && e.message) || e}`;
    log(summary.error);
  }

  log(`done: total=${summary.totalScripts} cache=${summary.cacheHits} ollama=${summary.ollamaCalls} fallback=${summary.fallbacks}`);
  finish(summary, start);
}

function finish(summary, start) {
  summary.durationMs = Date.now() - start;
  if (!QUIET) {
    if (JSON_OUT) {
      process.stdout.write(JSON.stringify(summary) + "\n");
    } else {
      process.stdout.write(
        `summarize-scripts: total=${summary.totalScripts} ollama=${summary.ollamaCalls} cache=${summary.cacheHits} fallback=${summary.fallbacks} ${summary.durationMs}ms\n` +
        `  index: ${summary.indexPath}\n`,
      );
    }
  }
  process.exit(summary.ok ? 0 : 1);
}

const WATCHDOG_MS = 1_800_000; // 30 min hard ceiling
setTimeout(() => { log(`watchdog fired after ${WATCHDOG_MS}ms`); process.exit(0); }, WATCHDOG_MS).unref();

main().catch((e) => { log(`unhandled: ${(e && e.message) || e}`); process.exit(1); });
