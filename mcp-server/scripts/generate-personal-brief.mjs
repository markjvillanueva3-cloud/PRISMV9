#!/usr/bin/env node
/**
 * generate-personal-brief.mjs
 *
 * OBSIDIAN-COMPOUND-MS1/S2/U-DAILY-PERSONAL-BRIEF
 *
 * Daily personal brief: composes a 4-section markdown report
 * (Connections / Pattern / Question / Sources) from recent vault activity
 * via a local Ollama summarization. Output lands in
 * `knowledge/memories/inbox/brief-YYYY-MM-DD.md` so Mark reads it before
 * opening any other app.
 *
 * Inputs (read at runtime):
 *   - knowledge/memories/inbox/*.md           (24h)
 *   - knowledge/memories/{feedback,reference,project,user,lessons,decisions,...}/*.md  (7d)
 *   - knowledge/wiki/log.md                   (last 24h slice)
 *
 * Output:
 *   - knowledge/memories/inbox/brief-YYYY-MM-DD.md
 *
 * Flags:
 *   --dry-run         compose + print without writing
 *   --vault <path>    override vault root (default knowledge/)
 *   --out <path>      override output path (default brief-YYYY-MM-DD.md)
 *   --window-7d-ms <ms>  override 7-day window in ms (testing only)
 *   --window-24h-ms <ms> override 24h window in ms (testing only)
 *
 * Empty-vault behavior (cyrilXBT framing): "the vault is never too empty
 * to find something worth thinking about" — produces a brief that names the
 * smallest path forward (drop a note into inbox/) instead of bailing.
 *
 * Cross-ref: [[reference_cyrilxbt_obsidian_article_delta_2026-05-07]]
 *
 * @milestone OBSIDIAN-COMPOUND-MS1/S2/U-DAILY-PERSONAL-BRIEF
 */

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, mkdirSync } from "node:fs";
import { resolve, dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..", "..");

const DEFAULTS = {
  vaultRoot: resolve(PRISM_ROOT, "knowledge"),
  outputDir: resolve(PRISM_ROOT, "knowledge", "memories", "inbox"),
  ollamaUrl: "http://127.0.0.1:11434/api/generate",
  ollamaModel: "qwen2.5-coder:7b",
  ollamaTimeoutMs: 30_000,
  windowInbox: 24 * 60 * 60 * 1000,
  windowMemories: 7 * 24 * 60 * 60 * 1000,
  windowWikiLog: 24 * 60 * 60 * 1000,
  excerptLen: 400,
  maxFiles: 80,
  maxWikiLines: 30,
};

/** Recursively list .md files newer than cutoff (mtime). */
function listMarkdown(root, cutoffMs, max) {
  if (!existsSync(root)) return [];
  const out = [];
  const stack = [root];
  while (stack.length > 0 && out.length < max) {
    const dir = stack.pop();
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const ent of entries) {
      if (ent.name.startsWith(".")) continue;
      const full = join(dir, ent.name);
      if (ent.isDirectory()) { stack.push(full); continue; }
      if (!ent.isFile() || !ent.name.toLowerCase().endsWith(".md")) continue;
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.mtimeMs < cutoffMs) continue;
      out.push({ path: full, mtimeMs: st.mtimeMs });
      if (out.length >= max) break;
    }
  }
  return out.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

/** Slice a body into a clean excerpt (no frontmatter, no code blocks). */
function excerpt(body, maxChars) {
  let text = body;
  if (text.startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end > 0) text = text.slice(end + 4);
  }
  text = text.replace(/```[\s\S]*?```/g, " ").trim();
  return text.length > maxChars ? text.slice(0, maxChars) + "…" : text;
}

/** Read recent wiki log entries (last 24h slice by header timestamps). */
function readWikiLogTail(vaultRoot, cutoffMs, maxLines) {
  const logPath = join(vaultRoot, "wiki", "log.md");
  if (!existsSync(logPath)) return [];
  let body;
  try { body = readFileSync(logPath, "utf8"); } catch { return []; }
  const lines = body.split(/\r?\n/);
  // Headers look like "## [2026-05-07T...] title"
  const cutoffIso = new Date(cutoffMs).toISOString();
  const recent = [];
  for (const line of lines) {
    const m = line.match(/^##\s+\[(\d{4}-\d{2}-\d{2}T[^\]]+)\]/);
    if (m && m[1] >= cutoffIso) recent.push(line);
    else if (recent.length > 0 && line.startsWith("##")) break; // next older block
  }
  return recent.slice(0, maxLines);
}

/**
 * Compose the prompt sent to Ollama. Caller can inject a custom function via
 * opts.ollamaCall(prompt) → string. Default uses the local Ollama HTTP API.
 */
async function callOllama(prompt, opts = {}) {
  const url = opts.ollamaUrl ?? DEFAULTS.ollamaUrl;
  const model = opts.ollamaModel ?? DEFAULTS.ollamaModel;
  const timeoutMs = opts.ollamaTimeoutMs ?? DEFAULTS.ollamaTimeoutMs;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, options: { num_predict: 600 } }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const body = await res.json();
    return typeof body?.response === "string" ? body.response.trim() : null;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/** Build the Ollama prompt body. Pure function — used by tests too. */
export function buildBriefPrompt(memories, wikiTail, today) {
  const memorySection = memories.length === 0
    ? "(no memories captured in window)"
    : memories.map((m, i) => `${i + 1}. [${basename(m.path)}] ${excerpt(m.body, 280)}`).join("\n\n");
  const wikiSection = wikiTail.length === 0
    ? "(no wiki entries in window)"
    : wikiTail.join("\n");
  return [
    `You are a knowledge synthesis assistant for a manufacturing engineer named Mark.`,
    `Today is ${today}. Read the recent vault notes and wiki log below and produce a personal brief.`,
    ``,
    `OUTPUT FORMAT — must be exactly four markdown sections, in this order, with these headers:`,
    `## Connections`,
    `(3 sentences, each naming a non-obvious connection between two notes from the source list.)`,
    `## Pattern`,
    `(1 sentence naming the single most-recurring pattern across the notes.)`,
    `## Question`,
    `(1 sentence — one open question Mark should sit with today, derived from the gaps you see.)`,
    `## Sources`,
    `(Bulleted list of the source filenames you actually used. Use only filenames from the input.)`,
    ``,
    `--- RECENT NOTES ---`,
    memorySection,
    ``,
    `--- RECENT WIKI LOG ---`,
    wikiSection,
    ``,
    `Brief:`,
  ].join("\n");
}

/**
 * Build the empty-vault brief — names the smallest next-step path.
 * Honors cyrilXBT's "never too empty" rule.
 */
export function buildEmptyVaultBrief(today) {
  return [
    `# Personal Brief — ${today}`,
    ``,
    `_Vault is below the synthesis floor for this 24h window. Naming the smallest path forward instead of bailing._`,
    ``,
    `## Connections`,
    `1. None to draw yet — the vault has fewer than 3 fresh notes in the last 7 days.`,
    `2. The fastest way to bootstrap a brief is to drop one observation into knowledge/memories/inbox/.`,
    `3. Even a single half-formed thought becomes a connection by tomorrow's run.`,
    ``,
    `## Pattern`,
    `Recurring pattern: silence in the vault. Treat that as a signal — what was today actually about?`,
    ``,
    `## Question`,
    `What is the one thing you noticed today that you have not written down anywhere?`,
    ``,
    `## Sources`,
    `- (none — empty-vault baseline)`,
    ``,
  ].join("\n");
}

/**
 * Wrap a synthesized brief body with header + source-citation guarantees.
 * If the model omitted ## Sources or cited <3 files, we splice in real
 * filenames from the gathered corpus so the output always meets exit_criteria.
 */
export function finalizeBrief(synth, sources, today) {
  const header = `# Personal Brief — ${today}\n\n`;
  let body = (synth ?? "").trim();
  // Backfill ## Sources if missing or short
  const sourcesMatch = body.match(/##\s*Sources[\s\S]*$/i);
  if (!sourcesMatch || sources.slice(0, 3).some((s) => !sourcesMatch[0].includes(basename(s)))) {
    const srcList = sources.slice(0, 8).map((s) => `- ${basename(s)}`).join("\n");
    if (sourcesMatch) {
      body = body.replace(/##\s*Sources[\s\S]*$/i, `## Sources\n${srcList}`);
    } else {
      body = `${body}\n\n## Sources\n${srcList}`;
    }
  }
  // Ensure all four section headers are present (insert empty if missing).
  for (const h of ["## Connections", "## Pattern", "## Question", "## Sources"]) {
    if (!body.includes(h)) {
      body += `\n\n${h}\n(no content produced for this section)`;
    }
  }
  return header + body + "\n";
}

/**
 * Main entry — compose and (unless dryRun) write the brief.
 * Test code injects opts.ollamaCall to make this deterministic.
 *
 * @param {object} opts
 * @param {string} [opts.vaultRoot]   override knowledge/ root
 * @param {string} [opts.outputPath]  full output file path
 * @param {number} [opts.now]         override Date.now()
 * @param {boolean} [opts.dryRun]     skip writing
 * @param {function} [opts.ollamaCall] (prompt) → string|null (mock for tests)
 * @param {number} [opts.windowInbox]
 * @param {number} [opts.windowMemories]
 * @param {number} [opts.windowWikiLog]
 * @returns {Promise<{ ok: boolean, outputPath: string|null, content: string, sources: string[] }>}
 */
export async function generateBrief(opts = {}) {
  const vaultRoot = resolve(opts.vaultRoot ?? DEFAULTS.vaultRoot);
  const memoriesRoot = join(vaultRoot, "memories");
  const inboxRoot = join(memoriesRoot, "inbox");
  const now = opts.now ?? Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const outputPath = opts.outputPath ?? join(inboxRoot, `brief-${today}.md`);
  const dryRun = !!opts.dryRun;
  const ollamaCall = typeof opts.ollamaCall === "function" ? opts.ollamaCall : (p) => callOllama(p, opts);

  const winInbox = opts.windowInbox ?? DEFAULTS.windowInbox;
  const winMem = opts.windowMemories ?? DEFAULTS.windowMemories;
  const winWiki = opts.windowWikiLog ?? DEFAULTS.windowWikiLog;

  // Gather: inbox 24h ∪ memories 7d (deduped by path).
  const inboxFiles = listMarkdown(inboxRoot, now - winInbox, DEFAULTS.maxFiles);
  const memoryFiles = listMarkdown(memoriesRoot, now - winMem, DEFAULTS.maxFiles);
  const seen = new Set();
  const all = [];
  for (const f of [...inboxFiles, ...memoryFiles]) {
    if (seen.has(f.path)) continue;
    // Skip prior daily briefs to avoid recursive feedback loops.
    if (basename(f.path).startsWith("brief-")) continue;
    seen.add(f.path);
    let body = "";
    try { body = readFileSync(f.path, "utf8"); } catch { continue; }
    if (!body.trim()) continue;
    all.push({ path: f.path, mtimeMs: f.mtimeMs, body });
  }

  // Empty-vault path: produce useful baseline brief instead of bailing.
  const wikiTail = readWikiLogTail(vaultRoot, now - winWiki, DEFAULTS.maxWikiLines);
  if (all.length === 0 && wikiTail.length === 0) {
    const content = buildEmptyVaultBrief(today);
    if (!dryRun) {
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, content, "utf8");
    }
    return { ok: true, outputPath: dryRun ? null : outputPath, content, sources: [] };
  }

  const prompt = buildBriefPrompt(all.slice(0, DEFAULTS.maxFiles), wikiTail, today);
  const synth = await ollamaCall(prompt);
  // If Ollama unreachable, still produce a brief so the cron run is never empty.
  const safeSynth = synth ?? [
    "## Connections",
    `1. (Ollama unreachable) ${all.length} notes available for synthesis next run.`,
    `2. Source files are listed below for manual review.`,
    `3. Drop ${all.length === 0 ? "more" : "another"} note into inbox/ to push past the synthesis threshold.`,
    `## Pattern`,
    `Pattern not synthesized — local model unavailable.`,
    `## Question`,
    `Which of today's source notes deserves a 5-minute deeper read?`,
  ].join("\n\n");

  const sources = all.map((f) => f.path);
  const content = finalizeBrief(safeSynth, sources, today);

  if (!dryRun) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, content, "utf8");
  }
  return { ok: true, outputPath: dryRun ? null : outputPath, content, sources };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--vault") args.vaultRoot = argv[++i];
    else if (a === "--out") args.outputPath = argv[++i];
    else if (a === "--window-7d-ms") args.windowMemories = Number(argv[++i]);
    else if (a === "--window-24h-ms") { const v = Number(argv[++i]); args.windowInbox = v; args.windowWikiLog = v; }
    else if (a === "--help" || a === "-h") {
      console.log(`Usage: generate-personal-brief.mjs [--dry-run] [--vault PATH] [--out PATH]`);
      process.exit(0);
    }
  }
  return args;
}

const isMain = (() => {
  try { return resolve(process.argv[1] ?? "") === __filename; } catch { return false; }
})();

if (isMain) {
  generateBrief(parseArgs(process.argv))
    .then((r) => {
      if (r.ok) {
        console.log(JSON.stringify({ ok: true, outputPath: r.outputPath, sources: r.sources.length }, null, 2));
      } else {
        console.error(JSON.stringify({ ok: false }, null, 2));
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
      process.exit(1);
    });
}
