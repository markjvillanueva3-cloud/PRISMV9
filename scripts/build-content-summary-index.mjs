#!/usr/bin/env node
/**
 * build-content-summary-index.mjs
 *
 * SIERRA-VAULT-OPS / U-CONTENT-SUMMARY-INDEX.
 *
 * Unified CONTENT index over every file in one or more roots (the Obsidian
 * vault, the PRISM repo, and the C: AI-tooling folders). For EACH file it emits
 * a "what does this file contain" note, categorized strategically (role +
 * domain + source), and -- for code files -- an optional detailed 2-3 sentence
 * summary from the local Ollama coder model.
 *
 * This is the CONTENT layer that the existing enumeration/navigation tools
 * (obsidian-vault-navigator.mjs = links/tags metadata, ENGINE_DIGEST.md =
 * 1-line engine blurbs, summarize-all-scripts-via-ollama.mjs = scripts only)
 * never built. It reuses that proven pattern: docstring/frontmatter-first
 * (deterministic, free) -> Ollama only for large code files; sha-1-of-(size+mtime)
 * idempotent state so reruns skip unchanged files (resumable at 625K-file scale).
 *
 * Two phases, independently useful:
 *   Phase 1 (default, fast, $0): deterministic content-note for EVERY file.
 *   Phase 2 (--ollama):          detailed code summaries for code files
 *                                (esp. large ones -- "engines"), layered on top.
 *
 * Usage:
 *   node scripts/build-content-summary-index.mjs --root=H:/prism/mcp-server/src/engines --ollama --limit=15
 *   node scripts/build-content-summary-index.mjs --roots=H:/prism/knowledge,H:/prism/mcp-server/src
 *   node scripts/build-content-summary-index.mjs --preset=vault        # the Obsidian vault
 *   node scripts/build-content-summary-index.mjs --preset=c-ai         # C: ollama/hermes/nvidia/claude/codex
 *   node scripts/build-content-summary-index.mjs --no-ollama --dry-run
 *
 * Flags:
 *   --root=P / --roots=P1,P2   roots to index (or --preset=vault|repo|c-ai|all)
 *   --ollama                    escalate large code files to Ollama detailed summary
 *   --no-ollama                 deterministic notes only
 *   --limit=N                   cap files processed this run (0 = all)
 *   --ollama-limit=N            cap Ollama calls this run (default 200; protects a staged run)
 *   --dry-run                   compute, do not write outputs
 *   --out=DIR                   output dir (default H:/prism/state/shared/content-index)
 *   --vault=DIR                 vault notes dir (default H:/prism/knowledge/content-index)
 *
 * Outputs:
 *   <out>/content-index.jsonl               one JSON row per file (the full index)
 *   <out>/CONTENT_INDEX_STATE.json          sha1 cache (resumable; schemaVersion)
 *   <out>/content-index-summary.json        aggregate counts by role/domain/source
 *   <vault>/INDEX.md                        Obsidian master note (counts + category links)
 *   <vault>/by-role/<role>.md               per-role file->note listing
 *
 * Exit: 0 ok - 1 fatal (no roots / no files) - 2 invalid args
 *
 * @milestone SIERRA-VAULT-OPS/U-CONTENT-SUMMARY-INDEX
 */

import fs from "node:fs";
import path from "node:path";

// Host-aware model resolver (Blackwell -> qwen2.5-coder:32b). Fail-soft to a
// literal default if the lib is absent so this script never hard-crashes on it.
let resolveSynthesisModel = null;
try {
  ({ resolveSynthesisModel } = await import("./lib/host-aware-synthesis-model.mjs"));
} catch { /* fall back to DEFAULT_MODEL below */ }

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434/api/generate";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5-coder:32b";
const OLLAMA_TIMEOUT_MS = 120_000;     // cold GPU load of a ~20GB model can exceed 2 min
const MAX_NOTE_CHARS = 400;
const MAX_CODE_READ = 8_000;           // bytes of code fed to Ollama / scanned for docstring
const CODE_SUMMARY_MIN_BYTES = 1_500;  // only escalate "large" code files to Ollama
const CHECKPOINT_EVERY = 5000;         // flush state this often (resumability). Higher = fewer
                                       // full-state JSON.stringify calls (that cost is ~O(n^2) at
                                       // corpus scale) -- pair with a generous --max-old-space-size.
const BYTES_PER_MB = 1_048_576;
const MAX_READ_BYTES = 4_000_000;      // never slurp a file larger than this into memory

const CODE_EXTS = new Set([".ts", ".mjs", ".js", ".cjs", ".mts", ".py", ".rs", ".go", ".java", ".c", ".cpp", ".h", ".hpp"]);
const TEXT_EXTS = new Set([".md", ".txt", ".json", ".jsonl", ".yaml", ".yml", ".csv", ".html", ".css", ".xml", ".ini", ".cfg", ".toml", ".base"]);
const BINARY_EXTS = new Set([".gguf", ".bin", ".safetensors", ".onnx", ".pt", ".pth", ".dll", ".exe", ".node", ".wasm", ".zip", ".7z", ".gz", ".tar", ".db", ".sqlite", ".pyc", ".pack", ".idx", ".woff", ".woff2", ".ttf"]);
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".ico"]);
const CAD_EXTS = new Set([".step", ".stp", ".stl", ".iges", ".igs", ".dwg", ".dxf", ".sldprt", ".sldasm", ".3mf", ".obj"]);
const DOC_EXTS = new Set([".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls"]);

const PRUNE_DIRS = new Set([".git", "node_modules", ".venv", "venv", "__pycache__", ".next", ".turbo", ".obsidian", "dist", ".cache", "cache", ".pytest_cache", ".mypy_cache", "Cache", "Code Cache", "GPUCache", "blob_storage"]);

const GALAXIES = ["mill", "lathe", "wedm", "cad", "cam", "quoting", "business", "post-processor", "speed-feed", "ai-training", "academy", "frontend-app", "database-expansion", "system-viz", "blueprint-vision", "fleet-hygiene", "discovery", "hermes-zulu", "token-optimization", "wiring", "bug-hunting", "backend-helper", "dormant-data", "compliance-safety", "quality", "shop-floor", "knowledge-conversion", "corpus-aggregation", "physics", "schemas", "registries"];

function parseArgs(argv) {
  const out = { roots: [], ollama: false, noOllama: false, limit: 0, ollamaLimit: 200, dryRun: false, stateOnly: false, emitOnly: false,
    out: "H:/prism/state/shared/content-index", vault: "H:/prism/knowledge/content-index", preset: null };
  for (const a of argv.slice(2)) {
    if (a === "--ollama") out.ollama = true;
    else if (a === "--no-ollama") out.noOllama = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--state-only") out.stateOnly = true;
    else if (a === "--emit-only") out.emitOnly = true;
    else if (a.startsWith("--root=")) out.roots.push(a.slice(7));
    else if (a.startsWith("--roots=")) out.roots.push(...a.slice(8).split(",").map(s => s.trim()).filter(Boolean));
    else if (a.startsWith("--preset=")) out.preset = a.slice(9);
    else if (a.startsWith("--limit=")) out.limit = Math.max(0, Math.floor(Number(a.slice(8)) || 0));
    else if (a.startsWith("--ollama-limit=")) out.ollamaLimit = Math.max(0, Math.floor(Number(a.slice(15)) || 0));
    else if (a.startsWith("--out=")) out.out = a.slice(6);
    else if (a.startsWith("--vault=")) out.vault = a.slice(8);
    else if (a === "--help" || a === "-h") { process.stdout.write("See header for usage.\n"); process.exit(0); }
    else { process.stderr.write(`Unknown arg: ${a}\n`); process.exit(2); }
  }
  const PRESETS = {
    vault: ["H:/prism/knowledge"],
    repo: ["H:/prism/mcp-server/src", "H:/prism/scripts", "H:/prism/mcp-server/scripts"],
    "c-ai": ["C:/Users/wompu/AppData/Local/hermes", "C:/Users/wompu/.claude", "C:/Users/wompu/AppData/Roaming/Claude", "C:/Users/wompu/.codex", "C:/Users/wompu/AppData/Local/Programs/Ollama", "C:/Users/wompu/AppData/Local/NVIDIA"],
    all: ["H:/prism/knowledge", "H:/prism/mcp-server/src", "H:/prism/scripts", "C:/Users/wompu/AppData/Local/hermes", "C:/Users/wompu/.claude"],
  };
  if (out.preset) { const p = PRESETS[out.preset]; if (!p) { process.stderr.write(`Unknown preset: ${out.preset}\n`); process.exit(2); } out.roots.push(...p); }
  return out;
}

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
function clean(s) { return String(s || "").replace(/\s+/g, " ").trim().slice(0, MAX_NOTE_CHARS); }

/** role classification -- strategic taxonomy from ext + path + name */
function classifyRole(rel, ext) {
  const low = rel.toLowerCase();
  if (/\.test\.|\.spec\.|__tests__|[/\\]tests?[/\\]/.test(low)) return "test";
  if (/engine\.ts$/.test(low) || /[/\\]engines[/\\].*\.ts$/.test(low)) return "engine";
  if (/[/\\]dispatchers?[/\\]/.test(low) || /dispatcher\.ts$/.test(low)) return "dispatcher";
  if (/[/\\]hooks[/\\]/.test(low) || /\.hook\./.test(low)) return "hook";
  if (/[/\\]schemas?[/\\]/.test(low)) return "schema";
  if (/[/\\]registr(y|ies)[/\\]/.test(low)) return "registry";
  if (/[/\\]algorithms?[/\\]/.test(low)) return "algorithm";
  if (/[/\\]physics[/\\]|constants\.ts$/.test(low)) return "physics";
  if (CODE_EXTS.has(ext)) return /[/\\]scripts[/\\]/.test(low) ? "script" : "code";
  if (ext === ".md") {
    if (/[/\\]wiki[/\\]/.test(low)) return "wiki";
    if (/[/\\](memories|memory)[/\\]/.test(low)) return "memory";
    if (/[/\\]tribal[/\\]/.test(low)) return "tribal";
    if (/handoff/.test(low)) return "handoff";
    if (/claude\.md$|agents\.md$|gemini\.md$/.test(low)) return "doctrine";
    return "doc";
  }
  if (ext === ".json" || ext === ".jsonl") return "data";
  if (BINARY_EXTS.has(ext)) return "binary";
  if (IMAGE_EXTS.has(ext)) return "image";
  if (CAD_EXTS.has(ext)) return "cad";
  if (DOC_EXTS.has(ext)) return "document";
  if (TEXT_EXTS.has(ext)) return "text";
  return "other";
}

function classifyDomain(rel) {
  const low = rel.toLowerCase().replace(/\\/g, "/");
  for (const g of GALAXIES) if (low.includes(`/${g}/`) || low.includes(`/${g.replace(/-/g, "")}/`)) return g;
  if (low.includes("/jm die/") || low.includes("jm-die")) return "jm-die";
  if (low.includes("docustrata")) return "docustrata";
  return "cross";
}

function firstDocstring(text) {
  // JSDoc block or python triple-quote at/near top, else first line comment.
  const js = text.match(/\/\*\*([\s\S]{0,1200}?)\*\//);
  if (js) {
    const body = js[1].replace(/^\s*\*\s?/gm, "").split(/\n/).map(s => s.trim())
      .filter(l => l && !l.startsWith("@") && !/^-+$/.test(l));
    if (body.length) return body.slice(0, 3).join(" ");
  }
  const py = text.match(/^\s*(?:"""|''')([\s\S]{0,800}?)(?:"""|''')/);
  if (py) return py[1].split(/\n/).map(s => s.trim()).filter(Boolean).slice(0, 3).join(" ");
  const line = text.match(/^\s*(?:\/\/|#)\s?(.{4,200})/m);
  return line ? line[1].trim() : "";
}

/** deterministic content-note (free) -- type-dispatched */
function deterministicNote(ext, role, sizeMB, text) {
  if (role === "binary") return `Binary ${ext.slice(1) || "blob"} (${sizeMB} MB) -- not text-read.`;
  if (role === "image") return `Image ${ext.slice(1)} (${sizeMB} MB).`;
  if (role === "cad") return `CAD model ${ext.slice(1).toUpperCase()} (${sizeMB} MB) -- vision/geometry candidate.`;
  if (role === "document") return `Document ${ext.slice(1).toUpperCase()} (${sizeMB} MB) -- PDF/office; OCR/vision candidate.`;
  if (text == null) return `${role} ${ext} (${sizeMB} MB).`;
  if (ext === ".md") {
    const fm = text.match(/^---\r?\n([\s\S]{0,1500}?)\r?\n---/);
    if (fm) {
      const d = fm[1].match(/^(?:description|summary|title):\s*["']?(.+?)["']?\s*$/mi);
      if (d) return clean(d[1]);
    }
    const h = text.match(/^#{1,3}\s+(.+)$/m);
    const p = text.replace(/^---[\s\S]*?---/, "").match(/^(?!#|\s*$|<!--)(.{10,}?)$/m);
    return clean([h && h[1], p && p[1]].filter(Boolean).join(" - ")) || `Markdown (${sizeMB} MB).`;
  }
  if (ext === ".json" || ext === ".jsonl") {
    try {
      const j = JSON.parse(ext === ".jsonl" ? "[" + text.split(/\n/).filter(Boolean).slice(0, 1).join(",") + "]" : text);
      const obj = Array.isArray(j) ? (j[0] || {}) : j;
      const keys = obj && typeof obj === "object" ? Object.keys(obj).slice(0, 12).join(", ") : typeof j;
      return clean(`${Array.isArray(j) ? "JSON array" : "JSON"} -- keys: ${keys}`);
    } catch { return clean(`JSON/JSONL (${sizeMB} MB) -- unparsed head: ${text.slice(0, 120)}`); }
  }
  if (CODE_EXTS.has(ext)) { const d = firstDocstring(text); return d ? clean(d) : clean(`Code ${ext} -- first line: ${text.split(/\n/).find(l => l.trim()) || ""}`); }
  return clean(text.split(/\n/).find(l => l.trim()) || `${role} ${ext}`);
}

async function ollamaSummarize(model, code, rel) {
  const prompt = `You are a senior engineer. In 2-3 precise sentences, summarize what this source file does -- its responsibility, key exports/behavior, and where it fits. No preamble.\n\nFile: ${rel}\n\n\`\`\`\n${code.slice(0, MAX_CODE_READ)}\n\`\`\``;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), OLLAMA_TIMEOUT_MS);
  try {
    const r = await fetch(OLLAMA_URL, { method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0.1, num_predict: 220 } }) });
    if (!r.ok) return null;
    const j = await r.json();
    const s = (j.response || "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    return s ? s.replace(/\s+/g, " ").slice(0, 900) : null;
  } catch { return null; } finally { clearTimeout(t); }
}

function walk(root, onFile, budget) {
  const stack = [root];
  while (stack.length) {
    if (budget.done()) return;
    const d = stack.pop();
    let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      if (budget.done()) return;
      const full = path.join(d, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) { if (!PRUNE_DIRS.has(e.name)) stack.push(full); continue; }
      onFile(full);
    }
  }
}

/**
 * Rebuild all outputs from the accumulated sha1 cache alone (no directory walk).
 * Streams content-index.jsonl line-by-line and accumulates only the (small)
 * per-role markdown line buffers, so even a 700K+ entry corpus stays well under
 * a generous heap. Used after a batched/resumed population run.
 */
function emitFromState(state, args) {
  ensureDir(args.out);
  ensureDir(args.vault);
  ensureDir(path.join(args.vault, "by-role"));
  const jsonlStream = fs.createWriteStream(path.join(args.out, "content-index.jsonl"));
  const roleBuf = {};
  const byRole = {}, byDomain = {}, bySource = {};
  let processed = 0, dupes = 0;
  // Dedupe by ABSOLUTE path: the same file can be cached under several source-root
  // keys (e.g. root "H:/prism" and sub-root "H:/prism/JM DIE/CNC LATHE" resolve to
  // the same file). Absolute path is the identity; keep the first, count the rest.
  const seen = new Set();
  for (const [key, v] of Object.entries(state.entries || {})) {
    const i = key.indexOf("::");
    const source = i >= 0 ? key.slice(0, i) : "";
    const rel = i >= 0 ? key.slice(i + 2) : key;
    const abs = `${source}/${rel}`;
    if (seen.has(abs)) { dupes++; continue; }
    seen.add(abs);
    jsonlStream.write(JSON.stringify({ source, path: rel, role: v.role, domain: v.domain, sizeMB: v.sizeMB ?? 0, note: v.note, summary: v.summary, summarySource: v.summarySource }) + "\n");
    (roleBuf[v.role] ||= []).push(`- **\`${rel}\`** _(${v.domain}, ${source})_ -- ${v.summary || v.note}`);
    processed++;
    byRole[v.role] = (byRole[v.role] || 0) + 1;
    byDomain[v.domain] = (byDomain[v.domain] || 0) + 1;
    bySource[source] = (bySource[source] || 0) + 1;
  }
  jsonlStream.end();
  const rank = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
  const summaryObj = { schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), emitOnly: true, processed, dupesSkipped: dupes, byRole, byDomain, bySource };
  fs.writeFileSync(path.join(args.out, "content-index-summary.json"), JSON.stringify(summaryObj, null, 2));
  const master = [
    "---", "name: Content Summary Index", `description: Per-file content notes across the full corpus. ${processed} files.`, "type: reference", "---", "",
    "# Content Summary Index", "", `> Emitted ${summaryObj.generatedAt} from ${processed} cached entries by scripts/build-content-summary-index.mjs --emit-only.`, "",
    "## By role", "", "| role | files |", "|---|---|", ...rank(byRole).map(([k, v]) => `| [[by-role/${k}\\|${k}]] | ${v} |`), "",
    "## By domain", "", "| domain | files |", "|---|---|", ...rank(byDomain).map(([k, v]) => `| ${k} | ${v} |`), "",
    "## By source root", "", "| root | files |", "|---|---|", ...rank(bySource).map(([k, v]) => `| \`${k}\` | ${v} |`), "",
  ].join("\n");
  fs.writeFileSync(path.join(args.vault, "INDEX.md"), master);
  for (const [role, lines] of Object.entries(roleBuf)) {
    const head = ["---", `name: content-index ${role}`, `description: ${lines.length} ${role} files.`, "type: reference", "---", "", `# ${role} (${lines.length})`, ""];
    fs.writeFileSync(path.join(args.vault, "by-role", `${role}.md`), head.concat(lines.sort()).join("\n"));
  }
  process.stdout.write(JSON.stringify(summaryObj) + "\n");
}

async function main() {
  const args = parseArgs(process.argv);

  // --emit-only: rebuild jsonl + vault notes from the accumulated cache alone
  // (no re-walk). STREAMS the jsonl so a 700K-entry corpus never materializes a
  // single giant array/string -- that emit-phase memory blowup is what killed the
  // in-line emit after the walk had already cached everything.
  if (args.emitOnly) {
    const stateFile = path.join(args.out, "CONTENT_INDEX_STATE.json");
    let state;
    try { state = JSON.parse(fs.readFileSync(stateFile, "utf8")); }
    catch (e) { process.stderr.write(`emit-only: cannot read state (${e.message})\n`); process.exit(1); }
    emitFromState(state, args);
    return;
  }

  const roots = [...new Set(args.roots)].filter(r => { const ok = fs.existsSync(r); if (!ok) process.stderr.write(`[skip] root not present: ${r}\n`); return ok; });
  if (!roots.length) { process.stderr.write("No valid roots (use --root/--roots/--preset).\n"); process.exit(1); }

  let model = DEFAULT_MODEL;
  if (resolveSynthesisModel) {
    try {
      const r = await resolveSynthesisModel({ fallback: DEFAULT_MODEL, override: process.env.OLLAMA_MODEL || null });
      if (r && typeof r.model === "string" && r.model.trim()) model = r.model;
    } catch { /* keep DEFAULT_MODEL */ }
  }
  const useOllama = args.ollama && !args.noOllama;
  ensureDir(args.out);
  const stateFile = path.join(args.out, "CONTENT_INDEX_STATE.json");
  let state = { schemaVersion: "1.0.0", entries: {} };
  try { if (fs.existsSync(stateFile)) state = JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch { /* fresh */ }

  const rows = [];
  const counts = { total: 0, processed: 0, cached: 0, ollamaCalls: 0, ollamaFail: 0, byRole: {}, byDomain: {}, bySource: {} };
  let ollamaUsed = 0;
  const budget = { done: () => args.limit > 0 && counts.processed >= args.limit };
  const t0 = Date.now();

  for (const root of roots) {
    const source = root.replace(/\\/g, "/");
    const files = [];
    walk(root, f => files.push(f), budget);
    for (const full of files) {
      if (budget.done()) break;
      counts.total++;
      let st; try { st = fs.statSync(full); } catch { continue; }
      const rel = path.relative(root, full).replace(/\\/g, "/");
      const ext = path.extname(full).toLowerCase();
      const role = classifyRole(full.replace(/\\/g, "/"), ext);
      const domain = classifyDomain(full.replace(/\\/g, "/"));
      const sizeMB = (st.size / BYTES_PER_MB).toFixed(st.size < BYTES_PER_MB ? 3 : 1);
      const key = `${source}::${rel}`;
      const sig = `${st.size}:${Math.round(st.mtimeMs)}`;
      const prior = state.entries[key];

      let note, summary = null, summarySource;
      const readable = !BINARY_EXTS.has(ext) && !IMAGE_EXTS.has(ext) && !CAD_EXTS.has(ext) && !DOC_EXTS.has(ext) && st.size <= MAX_READ_BYTES;

      if (prior && prior.sig === sig && (prior.summary || !useOllama || !CODE_EXTS.has(ext))) {
        note = prior.note; summary = prior.summary || null; summarySource = prior.summarySource || "cache"; counts.cached++;
      } else {
        let text = null;
        if (readable) { try { text = fs.readFileSync(full, "utf8"); } catch { text = null; } }
        note = deterministicNote(ext, role, sizeMB, text);
        summarySource = "deterministic";
        if (useOllama && CODE_EXTS.has(ext) && text && st.size >= CODE_SUMMARY_MIN_BYTES && (args.ollamaLimit === 0 || ollamaUsed < args.ollamaLimit)) {
          const s = await ollamaSummarize(model, text, `${source}/${rel}`);
          ollamaUsed++; counts.ollamaCalls++;
          if (s) { summary = s; summarySource = `ollama:${model}`; } else counts.ollamaFail++;
        }
      }

      counts.processed++;
      counts.byRole[role] = (counts.byRole[role] || 0) + 1;
      counts.byDomain[domain] = (counts.byDomain[domain] || 0) + 1;
      counts.bySource[source] = (counts.bySource[source] || 0) + 1;
      state.entries[key] = { sig, note, summary, summarySource, role, domain };
      rows.push({ source, path: rel, role, domain, sizeMB: Number(sizeMB), note, summary, summarySource });

      if (!args.dryRun && counts.processed % CHECKPOINT_EVERY === 0) {
        try { fs.writeFileSync(stateFile, JSON.stringify(state)); } catch { /* keep going */ }
        process.stderr.write(`  ...${counts.processed} processed (${counts.ollamaCalls} ollama) ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
      }
    }
  }

  const summaryObj = { schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), roots, model, useOllama,
    elapsedSec: Number(((Date.now() - t0) / 1000).toFixed(1)), ...counts };

  if (args.dryRun) { process.stdout.write(JSON.stringify(summaryObj, null, 2) + "\n"); return; }

  // --state-only: persist the resumable cache but skip the (expensive) full emit.
  // Batch-loop drivers use this so a final pass emits the merged index once.
  if (args.stateOnly) { fs.writeFileSync(stateFile, JSON.stringify(state)); process.stdout.write(JSON.stringify(summaryObj) + "\n"); return; }

  // Write outputs
  fs.writeFileSync(stateFile, JSON.stringify(state));
  fs.writeFileSync(path.join(args.out, "content-index.jsonl"), rows.map(r => JSON.stringify(r)).join("\n") + "\n");
  fs.writeFileSync(path.join(args.out, "content-index-summary.json"), JSON.stringify(summaryObj, null, 2));

  ensureDir(args.vault);
  ensureDir(path.join(args.vault, "by-role"));
  const rank = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
  const master = [
    "---", "name: Content Summary Index", `description: Per-file content notes + code summaries across ${roots.length} root(s). ${counts.processed} files this run.`, "type: reference", "---", "",
    "# Content Summary Index", "", `> Auto-generated ${summaryObj.generatedAt} by scripts/build-content-summary-index.mjs. Model: ${model}. Ollama summaries: ${counts.ollamaCalls}.`, "",
    `**Files this run:** ${counts.processed} (cached ${counts.cached}) - **roots:** ${roots.length}`, "",
    "## By role", "", "| role | files |", "|---|---|", ...rank(counts.byRole).map(([k, v]) => `| [[by-role/${k}\\|${k}]] | ${v} |`), "",
    "## By domain", "", "| domain | files |", "|---|---|", ...rank(counts.byDomain).map(([k, v]) => `| ${k} | ${v} |`), "",
    "## By source root", "", "| root | files |", "|---|---|", ...rank(counts.bySource).map(([k, v]) => `| \`${k}\` | ${v} |`), "",
  ].join("\n");
  fs.writeFileSync(path.join(args.vault, "INDEX.md"), master);

  const byRole = {};
  for (const r of rows) (byRole[r.role] ||= []).push(r);
  for (const [role, list] of Object.entries(byRole)) {
    const lines = ["---", `name: content-index ${role}`, `description: ${list.length} ${role} files with content notes.`, "type: reference", "---", "", `# ${role} (${list.length})`, ""];
    for (const r of list.sort((a, b) => a.path.localeCompare(b.path))) {
      lines.push(`- **\`${r.path}\`** _(${r.domain}, ${r.sizeMB}MB)_ -- ${r.summary || r.note}`);
    }
    fs.writeFileSync(path.join(args.vault, "by-role", `${role}.md`), lines.join("\n"));
  }

  process.stdout.write(JSON.stringify(summaryObj, null, 2) + "\n");
}

main().catch(e => { process.stderr.write(`FATAL: ${e.stack || e}\n`); process.exit(1); });
