#!/usr/bin/env node
/**
 * mine-romeo-ollama.mjs (slot:romeo, 2026-06-16)
 *
 * All-local Ollama mine of romeo's sessions/handoffs/memories for incomplete work.
 * Replaces the Claude-subagent mine phase of romeo-remaining-work.workflow.js, which
 * got 100% rate-limited (server-side throttle from 17 concurrent Claude agents +
 * the 26-slot fleet). This runs the extraction on a GPU-resident local model
 * (qwen2.5-coder:32b on the Blackwell box) => zero Claude tokens, no rate limit.
 *
 * Reads the batch files already split on disk by the workflow Split phase:
 *   <OUT>/handoffs.txt        (list of 12 handoff .md paths)
 *   <OUT>/mem-batch-a{a..d}   (lists of memory .md paths)
 *   <OUT>/tc-batch-a{a..l}    (prefiltered transcript candidate LINES)
 * Writes per-source extractions to <OUT>/mined/<name>.txt and a combined
 * <OUT>/mined/ALL-ITEMS.txt for the downstream synth/merge.
 */
import fs from "node:fs";
import path from "node:path";

const OUT = process.env.ROMEO_SRC || "H:/prism-slot-romeo/.romeo-sources";
const MINED = path.join(OUT, "mined");
fs.mkdirSync(MINED, { recursive: true });
const MODEL = process.env.MINE_MODEL || "qwen2.5-coder:32b";
const OLLAMA = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const NUM_CTX = Number(process.env.MINE_NUM_CTX || 32768);
const CHUNK = Number(process.env.MINE_CHUNK || 60000);

const prompt = (content) => `From these PRISM ROMEO-slot (the "wiring" specialist) dev excerpts, list EVERY piece of work that is NOT yet finished.
INCLUDE: open threads, "next step", in-progress items, deferred, queued, TODO/FIXME, follow-up units, v2/Phase-2, blocked, "did not finish / wire / build", any U-id described as pending/queued/remaining. Treat an "active thread with a next step" as remaining work.
EXCLUDE only: work explicitly described as DONE/shipped/committed, and pure chatter/tool-output.
Be INCLUSIVE -- a later pass dedups against shipped commits. Output ONE item per line, EXACTLY this shape (no preamble, no markdown, no commentary):
ITEM: <what is left to do> || EVID: <short quote or U-id> || STATUS: <open|deferred|queued|partial|blocked>
Only if there is truly nothing unfinished, output exactly: NONE

EXCERPTS:
${content}`;

// git-bash drive paths (/c/Users/...) don't resolve in Node fs on Windows -> C:/Users/...
const toNative = (p) => p.replace(/^\/([a-zA-Z])\//, (_, d) => d.toUpperCase() + ":/");

function readContent(spec) {
  if (spec.kind === "paths") {
    const paths = fs.readFileSync(spec.file, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    return paths.map((p) => {
      const np = toNative(p);
      try { return `\n===== ${path.basename(np)} =====\n` + fs.readFileSync(np, "utf8"); }
      catch { return ""; }
    }).join("\n");
  }
  return fs.readFileSync(spec.file, "utf8");
}

function chunk(str, max) { const o = []; for (let i = 0; i < str.length; i += max) o.push(str.slice(i, i + max)); return o; }

async function gen(content) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), Number(process.env.MINE_CALL_TIMEOUT_MS || 300000));
  try {
    const r = await fetch(`${OLLAMA}/api/generate`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal,
      body: JSON.stringify({
        model: MODEL, prompt: prompt(content), stream: false, keep_alive: "20m",
        options: { temperature: 0.1, num_ctx: NUM_CTX },
      }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    return j.response || "";
  } finally {
    clearTimeout(to);
  }
}

const sources = [
  { name: "handoffs", kind: "paths", file: path.join(OUT, "handoffs.txt") },
  ...["aa", "ab", "ac", "ad"].map((s) => ({ name: `mem-${s}`, kind: "paths", file: path.join(OUT, `mem-batch-${s}`) })),
  ...["aa", "ab", "ac", "ad", "ae", "af", "ag", "ah", "ai", "aj", "ak", "al"].map((s) => ({ name: `tc-${s}`, kind: "lines", file: path.join(OUT, `tc-batch-${s}`) })),
];

const t0 = Date.now();
let total = 0;
for (const s of sources) {
  if (!fs.existsSync(s.file)) { console.log(`skip ${s.name} (missing)`); continue; }
  const content = readContent(s);
  if (!content.trim()) { console.log(`skip ${s.name} (empty)`); continue; }
  const chunks = chunk(content, CHUNK);
  let out = "";
  for (let i = 0; i < chunks.length; i++) {
    try { out += (await gen(chunks[i])) + "\n"; }
    catch (e) { out += `ERROR ${s.name} chunk${i}: ${e.message}\n`; }
  }
  fs.writeFileSync(path.join(MINED, `${s.name}.txt`), out);
  const items = out.split(/\r?\n/).filter((l) => l.startsWith("ITEM:")).length;
  total += items;
  console.log(`${s.name}: ${items} items (${chunks.length} chunk(s))`);
}

// combine
const combined = sources.map((s) => {
  const f = path.join(MINED, `${s.name}.txt`);
  if (!fs.existsSync(f)) return "";
  return fs.readFileSync(f, "utf8").split(/\r?\n/).filter((l) => l.startsWith("ITEM:")).map((l) => `[${s.name}] ${l}`).join("\n");
}).filter(Boolean).join("\n");
fs.writeFileSync(path.join(MINED, "ALL-ITEMS.txt"), combined);
console.log(`DONE_OLLAMA_MINE: ${total} raw ITEM lines in ${((Date.now() - t0) / 1000 / 60).toFixed(1)}min -> ${path.join(MINED, "ALL-ITEMS.txt")}`);
