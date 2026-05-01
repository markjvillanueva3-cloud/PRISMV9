// add-schema-describes.mjs - INTEL-OLLAMA-OBSIDIAN-MS0/P8-U04
// Backfills .describe() on Zod schema fields using Ollama qwen2.5-coder:32b.
//
// Scope (phase 1): single-line, simple-type field declarations. Skips multi-line
// expressions and z.object({...}) sub-schemas (those need an AST and are deferred
// to a phase-2 follow-up). Idempotent: fields with an existing .describe() are
// skipped on every pass.
//
// Cache: mcp-server/data/state/SCHEMA-DESCRIBES-CACHE.json — keyed by file:line:field,
// so re-runs are deterministic and resumable across sessions. Cache hits do NOT
// re-call Ollama.
//
// Flags:
//   --audit             Read-only: report total / with-describe / candidates / coverage.
//   --file <path>       Operate on a single file (relative to repo root).
//   --dry-run           Print the planned rewrite for each candidate; do not write.
//   --limit <n>         Cap candidates processed (cumulative across files).
//   --no-cache          Bypass cache; always call Ollama.
//   --model <name>      Override default model (qwen2.5-coder:32b).
//   --help              Print usage.

import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const SCAN_DIRS = [
  "mcp-server/src/schemas",
  "mcp-server/src/tools/schemas",
];
const CACHE_PATH = "mcp-server/data/state/SCHEMA-DESCRIBES-CACHE.json";
const DEFAULT_MODEL = "qwen2.5-coder:32b";
const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
const OLLAMA_TIMEOUT_MS = 60_000;

// Field declaration: indent, name, colon, z.<type>... up to end-of-line.
// Captures: 1=indent, 2=name (or quoted name), 3=Zod expression up to end-of-line.
const FIELD_LINE_PATTERN = /^(\s*)(?:["']?)([a-zA-Z_$][a-zA-Z0-9_$]*)(?:["']?)\s*:\s*(z\..*?)([,;]?)\s*$/;

// Simple-type leading expressions we accept for phase 1.
// Skip z.object/z.lazy/z.discriminatedUnion etc. for now (multi-line risk).
const ACCEPTED_TYPE_PREFIX = /^z\.(string|number|boolean|enum|literal|array|record|union|date|null|undefined|nan|bigint|tuple|nullable|nativeEnum|coerce)\s*\(/;

// Detect existing .describe() in the field expression.
const HAS_DESCRIBE = /\.describe\s*\(/;

export function listTsFiles(dir) {
  let out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (err) {
    if (err.code === "ENOENT") return out;
    throw err;
  }
  for (const name of entries) {
    const full = join(dir, name);
    let s;
    try { s = statSync(full); } catch { continue; }
    if (s.isDirectory()) out = out.concat(listTsFiles(full));
    else if (s.isFile() && full.endsWith(".ts")) out.push(full);
  }
  return out;
}

// Parse a single line and return either null (not a candidate) or
// { indent, name, expr, terminator, isCandidate, reason }.
export function parseFieldLine(line) {
  const m = FIELD_LINE_PATTERN.exec(line);
  if (!m) return null;
  const [, indent, name, expr, terminator] = m;
  // Reject obvious non-fields: `type: z.<...>` is fine; `// comment: z.<...>` parsed too,
  // but the comment-strip pass should remove that before classification.
  if (!ACCEPTED_TYPE_PREFIX.test(expr)) {
    return { indent, name, expr, terminator, isCandidate: false, reason: "not-accepted-type" };
  }
  if (HAS_DESCRIBE.test(expr)) {
    return { indent, name, expr, terminator, isCandidate: false, reason: "already-has-describe" };
  }
  // Reject obvious multi-line fields (open paren without matching close).
  let depth = 0;
  for (const ch of expr) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
  }
  if (depth !== 0) {
    return { indent, name, expr, terminator, isCandidate: false, reason: "unbalanced-parens" };
  }
  return { indent, name, expr, terminator, isCandidate: true, reason: "candidate" };
}

// Walks a source string and returns an array of {line, lineNumber, parsed}.
// Comments are NOT stripped: the FIELD_LINE_PATTERN requires `: z.` near start of
// line which the typical `//` or `/*` comment shapes don't match. A comment that
// starts with whitespace and looks like a field declaration is rare but possible —
// callers should sanity-check via context.
export function findCandidatesInSource(src) {
  const lines = src.split(/\r?\n/);
  const candidates = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Quick reject: line must contain ": z." somewhere.
    if (!line.includes(": z.")) continue;
    // Quick reject: skip line-comment lines.
    const trimmed = line.replace(/^\s*/, "");
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
    const parsed = parseFieldLine(line);
    if (!parsed) continue;
    candidates.push({ lineNumber: i + 1, line, parsed });
  }
  return candidates;
}

// Insert `.describe("<text>")` at the end of the Zod chain (just before the trailing comma).
// The line shape is: `<indent><name>: <expr><terminator>`.
// Returns the new full line.
export function insertDescribe(originalLine, parsed, description) {
  const safe = description
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, " ")
    .trim()
    .slice(0, 280); // hard cap to keep MCP descriptions sane
  const { indent, name, expr, terminator } = parsed;
  return `${indent}${name}: ${expr}.describe("${safe}")${terminator}`;
}

// ---------- Ollama client ----------

async function ollamaGenerate(prompt, model, signal) {
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: { temperature: 0.1, num_predict: 80, top_p: 0.9 },
    }),
    signal,
  });
  if (!res.ok) throw new Error(`Ollama ${res.status} ${res.statusText}`);
  const json = await res.json();
  return (json.response ?? "").trim();
}

function buildPrompt(fileName, name, expr) {
  return `You are documenting a Zod schema field for an MCP tool description.

File: ${fileName}
Field: ${name}
Zod type: ${expr}

Write ONE concise English sentence (max 25 words) describing what this field represents. No quotes, no markdown, no bullet points, no introductory phrases like "This field". Just the description sentence.`;
}

function postProcessDescription(raw) {
  // Strip surrounding quotes the LLM might add.
  let s = raw.trim().replace(/^["'`]+|["'`]+$/g, "");
  // First sentence only.
  const firstStop = s.indexOf("\n");
  if (firstStop > 0) s = s.slice(0, firstStop);
  // Strip trailing period — looks better without on short field labels.
  s = s.replace(/\.+\s*$/, "");
  // Hard cap.
  return s.slice(0, 280);
}

// ---------- Cache ----------

function loadCache(repoRoot) {
  const path = join(repoRoot, CACHE_PATH);
  if (!existsSync(path)) {
    return { schemaVersion: "1.0.0", generated: null, cache: {} };
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { schemaVersion: "1.0.0", generated: null, cache: {} };
  }
}

function saveCache(repoRoot, c) {
  c.generated = new Date().toISOString();
  const path = join(repoRoot, CACHE_PATH);
  writeFileSync(path, JSON.stringify(c, null, 2) + "\n");
}

function cacheKey(fileRel, lineNumber, fieldName) {
  return `${fileRel}:${lineNumber}:${fieldName}`;
}

// ---------- File-level operations ----------

export function auditFile(absPath, repoRoot = REPO_ROOT) {
  const src = readFileSync(absPath, "utf8");
  const fileRel = relative(repoRoot, absPath).replace(/\\/g, "/");
  const candidates = findCandidatesInSource(src);
  const total = candidates.length;
  const withDescribe = candidates.filter(c => c.parsed.reason === "already-has-describe").length;
  const fixable = candidates.filter(c => c.parsed.isCandidate).length;
  const skipped = total - withDescribe - fixable;
  return { file: fileRel, total, withDescribe, fixable, skipped };
}

async function processOne({ src, candidate, fileRel, model, cache, useCache, dryRun }) {
  const { lineNumber, parsed } = candidate;
  const key = cacheKey(fileRel, lineNumber, parsed.name);
  let description;
  let from;
  if (useCache && cache.cache[key]?.description) {
    description = cache.cache[key].description;
    from = "cache";
  } else {
    const prompt = buildPrompt(fileRel, parsed.name, parsed.expr);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), OLLAMA_TIMEOUT_MS);
    try {
      const raw = await ollamaGenerate(prompt, model, ctrl.signal);
      description = postProcessDescription(raw);
    } finally {
      clearTimeout(timer);
    }
    if (!description) throw new Error(`empty description for ${key}`);
    cache.cache[key] = {
      description,
      model,
      generated_at: new Date().toISOString(),
    };
    from = "ollama";
  }
  const newLine = insertDescribe(candidate.line, parsed, description);
  return { newLine, description, from };
}

export async function processFile({
  absPath,
  repoRoot = REPO_ROOT,
  model = DEFAULT_MODEL,
  dryRun = false,
  useCache = true,
  limit = Infinity,
  cache = null,
  onProgress = null,
}) {
  if (!cache) cache = loadCache(repoRoot);
  const fileRel = relative(repoRoot, absPath).replace(/\\/g, "/");
  const src = readFileSync(absPath, "utf8");
  const lines = src.split(/\r?\n/);
  const candidates = findCandidatesInSource(src).filter(c => c.parsed.isCandidate);
  const stats = { file: fileRel, candidates: candidates.length, processed: 0, fromCache: 0, fromOllama: 0, written: false, dryRun };
  for (const c of candidates) {
    if (stats.processed >= limit) break;
    const r = await processOne({ src, candidate: c, fileRel, model, cache, useCache, dryRun });
    lines[c.lineNumber - 1] = r.newLine;
    stats.processed++;
    if (r.from === "cache") stats.fromCache++; else stats.fromOllama++;
    if (onProgress) onProgress({ file: fileRel, lineNumber: c.lineNumber, name: c.parsed.name, description: r.description, from: r.from });
  }
  if (!dryRun && stats.processed > 0) {
    writeFileSync(absPath, lines.join("\n"));
    stats.written = true;
  }
  return stats;
}

// ---------- CLI ----------

function parseArgs(argv) {
  const args = { audit: false, file: null, dryRun: false, limit: Infinity, useCache: true, model: DEFAULT_MODEL, all: false, help: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--audit") args.audit = true;
    else if (a === "--file") args.file = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--no-cache") args.useCache = false;
    else if (a === "--model") args.model = argv[++i];
    else if (a === "--all") args.all = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else throw new Error(`Unknown flag: ${a}`);
  }
  return args;
}

const HELP = `add-schema-describes.mjs - backfill .describe() on Zod schema fields via Ollama.

Usage:
  node scripts/add-schema-describes.mjs --audit
  node scripts/add-schema-describes.mjs --file <path> --dry-run
  node scripts/add-schema-describes.mjs --file <path>
  node scripts/add-schema-describes.mjs --all --limit 200
  node scripts/add-schema-describes.mjs --all

Flags:
  --audit             Read-only coverage report.
  --file <path>       Operate on one file (relative to repo root).
  --dry-run           Preview rewrites; do not write.
  --limit <n>         Cap candidates processed.
  --no-cache          Bypass cache; force Ollama call for every candidate.
  --model <name>      Override default model (default: ${DEFAULT_MODEL}).
  --help              Print this message.
`;

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) { process.stdout.write(HELP); return; }

  if (args.audit) {
    const files = SCAN_DIRS.flatMap(d => listTsFiles(join(REPO_ROOT, d)));
    let total = 0, withD = 0, fixable = 0, skipped = 0;
    for (const f of files) {
      const r = auditFile(f);
      total += r.total; withD += r.withDescribe; fixable += r.fixable; skipped += r.skipped;
    }
    process.stdout.write(
      `audit (${files.length} files):\n` +
      `  total field declarations: ${total}\n` +
      `  with .describe():        ${withD} (${(100*withD/total).toFixed(1)}%)\n` +
      `  fixable candidates:      ${fixable}\n` +
      `  skipped (multi-line / non-simple type): ${skipped}\n`
    );
    return;
  }

  const cache = loadCache(REPO_ROOT);
  const onProgress = ({ lineNumber, name, description, from }) => {
    process.stdout.write(`  L${lineNumber} ${name} [${from}] ${description}\n`);
  };

  const candidates = args.all
    ? SCAN_DIRS.flatMap(d => listTsFiles(join(REPO_ROOT, d)))
    : args.file ? [resolve(REPO_ROOT, args.file)] : [];

  if (candidates.length === 0) {
    process.stderr.write("Specify --audit, --file <path>, or --all.\n");
    process.exit(2);
  }

  let totalProcessed = 0;
  let remaining = args.limit;
  for (const f of candidates) {
    if (remaining <= 0) break;
    const stats = await processFile({
      absPath: f,
      model: args.model,
      dryRun: args.dryRun,
      useCache: args.useCache,
      limit: remaining,
      cache,
      onProgress,
    });
    process.stdout.write(
      `${stats.file}: ${stats.processed}/${stats.candidates} processed ` +
      `(${stats.fromCache} cache, ${stats.fromOllama} ollama, written=${stats.written})\n`
    );
    totalProcessed += stats.processed;
    remaining -= stats.processed;
  }
  saveCache(REPO_ROOT, cache);
  process.stdout.write(`done: ${totalProcessed} fields described.\n`);
}

const entry = process.argv[1];
if (entry && (
    import.meta.url === `file://${entry.replace(/\\/g, "/")}` ||
    entry.endsWith("add-schema-describes.mjs")
  )) {
  main().catch(err => {
    process.stderr.write(`error: ${err.message}\n`);
    process.exit(1);
  });
}
