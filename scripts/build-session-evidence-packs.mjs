#!/usr/bin/env node
/**
 * build-session-evidence-packs.mjs  (U-ALPHA-SONNET-MINE)
 *
 * Streams large Claude transcript JSONLs into COMPACT, bounded "evidence packs" so a Sonnet
 * agent can read+summarize a session WITHOUT loading a 50-107MB file (impossible to full-Read).
 * This is the deterministic-extraction half (R5: code extracts the signal, the model judges):
 * a fast streaming grep pulls the load-bearing turns; Sonnet categorizes them downstream.
 *
 * Operator directive 2026-06-11 (slot:alpha): "utilize sonnet agents to read and summarize the
 * previous sessions instead of ollama." The Sonnet agents read THESE packs (the human prompts,
 * commit subjects, deferred/unwired markers, and articles fed) -- i.e. the meaningful session
 * content with tool-call noise stripped -- not the raw multi-GB transcript churn.
 *
 * Per pack (bounded, ~15-35KB):
 *   USER PROMPTS        -- the operator's actual asks (intent + articles/files fed)
 *   COMMIT SUBJECTS     -- [SCOPE]/U-ID titles = what shipped
 *   DEFERRED/UNFINISHED -- deferred|TODO|not finished|dormant|unwired|pending|next: markers
 *   ARTICLES/REFS FED   -- URLs + "article|paper|per @handle" mentions (operator-fed knowledge)
 *   ASSISTANT TAIL      -- last few assistant text blocks (usually the end-of-session status)
 *
 * Reuses the canonical isNoise() from mine-galaxy-transcripts.mjs (R8: do not fork the noise
 * filter). Streaming line-by-line -> O(1) memory regardless of transcript size.
 *
 * USAGE:
 *   node scripts/build-session-evidence-packs.mjs --list <unmined-list.json> --out <dir> [--limit N] [--concurrency 6]
 *   node scripts/build-session-evidence-packs.mjs --galaxy token-optimization   (auto: discover un-mined)
 */
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { isNoise, discoverPerGalaxy } from "./mine-galaxy-transcripts.mjs";

const arg = (k, d = null) => {
  const i = process.argv.indexOf(k);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d;
};

const GALAXY = arg("--galaxy", "token-optimization");
const LIST_PATH = arg("--list", null);
const OUT_DIR = arg("--out", `state/shared/galaxy-transcript-mining/${GALAXY}/_evidence`);
const LIMIT = parseInt(arg("--limit", "0"), 10) || 0;
const CONCURRENCY = Math.max(1, parseInt(arg("--concurrency", "6"), 10) || 6);

// Per-section caps -- keep each pack bounded so the downstream Sonnet read stays cheap + uniform.
const CAP = { user: 60, userChars: 700, commit: 60, deferred: 70, article: 40, tailBlocks: 4, tailChars: 4000, lineChars: 500 };

const COMMIT_RE = /\[[A-Z0-9][A-Z0-9 _-]*\]\s*(\[[A-Z0-9][A-Z0-9 _-]*\]\s*)*\/?U-[A-Za-z0-9-]+|\/U-[A-Za-z0-9-]+:|\bU-[A-Z][A-Za-z0-9-]{3,}\b/;
const DEFERRED_RE = /\b(deferred|defer\b|TODO|to-do|not finished|unfinished|incomplete|dormant|unwired|not wired|pending|next unit|next:|left to|still need|still todo|follow-?up|punch list|P0\b|P1\b|blocker|did not complete|never wired|never finished|abandon)/i;
const ARTICLE_RE = /\bhttps?:\/\/[^\s)]+|\b(article|paper|blog post|per @[\w_]+|src: @|read this|fed you|attached|youtube\.com|arxiv|@0x_rody|@karpathy|@Mnilax)\b/i;

/** One human prompt block, noise-filtered, trimmed. Returns null if it should be dropped. */
function cleanUserText(text) {
  if (typeof text !== "string") return null;
  const t = text.trim();
  if (!t || isNoise(t)) return null;
  // Drop tool_result echoes + system-reminder bodies that slip past isNoise.
  if (t.startsWith("<system-reminder") || t.startsWith("Result of") || t.startsWith("[{") ) return null;
  return t.slice(0, CAP.userChars);
}

function pushCapped(arr, val, cap) {
  if (val == null) return;
  if (arr.length >= cap) return;
  if (!arr.includes(val)) arr.push(val);
}

/** Stream one transcript -> structured evidence object (bounded). O(1) memory. */
export async function buildEvidence(file) {
  const ev = { userPrompts: [], commitSubjects: [], deferred: [], articles: [], tail: [], turns: 0 };
  if (!existsSync(file)) return ev;
  const rl = createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    if (o.type !== "user" && o.type !== "assistant") continue;
    ev.turns++;
    const role = o.type;
    const content = o.message?.content;
    const blocks = typeof content === "string" ? [{ type: "text", text: content }] : Array.isArray(content) ? content : [];
    for (const b of blocks) {
      if (b?.type !== "text" || typeof b.text !== "string") continue;
      const text = b.text;
      if (role === "user") {
        const u = cleanUserText(text);
        if (u) pushCapped(ev.userPrompts, u, CAP.user);
        // articles can be fed in user turns
        for (const ln of text.split("\n")) { if (ARTICLE_RE.test(ln)) pushCapped(ev.articles, ln.trim().slice(0, CAP.lineChars), CAP.article); }
        continue;
      }
      // assistant text: scan lines for commit subjects + deferred markers + articles
      if (isNoise(text)) { continue; }
      const lines = text.split("\n");
      for (const ln of lines) {
        const s = ln.trim();
        if (!s) continue;
        if (COMMIT_RE.test(s)) pushCapped(ev.commitSubjects, s.slice(0, CAP.lineChars), CAP.commit);
        if (DEFERRED_RE.test(s)) pushCapped(ev.deferred, s.slice(0, CAP.lineChars), CAP.deferred);
        if (ARTICLE_RE.test(s)) pushCapped(ev.articles, s.slice(0, CAP.lineChars), CAP.article);
      }
      // rolling tail: keep last N assistant text blocks
      ev.tail.push(text.slice(0, CAP.tailChars));
      if (ev.tail.length > CAP.tailBlocks) ev.tail.shift();
    }
  }
  rl.close();
  return ev;
}

function renderPack(meta, ev) {
  const sec = (title, arr) => arr.length ? `\n## ${title} (${arr.length})\n` + arr.map((x) => `- ${x}`).join("\n") + "\n" : `\n## ${title} (0)\n_(none found)_\n`;
  return [
    `# Session evidence pack: ${meta.id}`,
    `- date: ${meta.mtime || "?"}  topic: ${meta.topic || "?"}  size: ${meta.mb || "?"}MB  turns: ${ev.turns}`,
    `- raw transcript: ${meta.file}`,
    `\n> Sonnet: categorize this session from the evidence below. Sections are noise-filtered extracts`,
    `> (tool-call churn stripped). If a section is thin you MAY grep the raw transcript above for more.`,
    sec("USER PROMPTS (operator intent + asks)", ev.userPrompts),
    sec("COMMIT SUBJECTS (what shipped)", ev.commitSubjects),
    sec("DEFERRED / UNFINISHED / UNWIRED markers", ev.deferred),
    sec("ARTICLES / REFS FED", ev.articles),
    `\n## ASSISTANT TAIL (end-of-session status)\n` + (ev.tail.join("\n\n---\n\n") || "_(none)_"),
    "",
  ].join("\n");
}

function makeLimiter(max) {
  let active = 0; const q = [];
  const pump = () => { if (active >= max || !q.length) return; active++; const { fn, res, rej } = q.shift(); Promise.resolve().then(fn).then(res, rej).finally(() => { active--; pump(); }); };
  return (fn) => new Promise((res, rej) => { q.push({ fn, res, rej }); pump(); });
}

async function main() {
  let rows;
  if (LIST_PATH) {
    rows = JSON.parse(readFileSync(LIST_PATH, "utf8"));
  } else {
    const OUT = `state/shared/galaxy-transcript-mining/${GALAXY}`;
    const mined = new Set(existsSync(OUT) ? readdirSync(OUT).filter((f) => /^[0-9a-f]{8}\.md$/.test(f)).map((f) => f.replace(".md", "")) : []);
    rows = discoverPerGalaxy().perGalaxy.get(GALAXY).filter((r) => !mined.has(r.id) && r.mb > 0).sort((a, b) => (b.mtime > a.mtime ? 1 : -1));
  }
  if (LIMIT) rows = rows.slice(0, LIMIT);
  mkdirSync(OUT_DIR, { recursive: true });
  const limit = makeLimiter(CONCURRENCY);
  let done = 0, skipped = 0;
  const results = await Promise.all(rows.map((r) => limit(async () => {
    const outPath = `${OUT_DIR}/${r.id}.md`;
    if (existsSync(outPath)) { skipped++; return { id: r.id, skipped: true }; } // resumable
    const ev = await buildEvidence(r.file);
    const pack = renderPack(r, ev);
    writeFileSync(outPath, pack);
    done++;
    const kb = (statSync(outPath).size / 1024).toFixed(1);
    process.stderr.write(`[evidence] ${r.id} ${r.mb}MB -> ${kb}KB (turns ${ev.turns}, commits ${ev.commitSubjects.length}, deferred ${ev.deferred.length}, articles ${ev.articles.length})\n`);
    return { id: r.id, kb: +kb, turns: ev.turns, commits: ev.commitSubjects.length, deferred: ev.deferred.length, articles: ev.articles.length };
  })));
  const built = results.filter((r) => !r.skipped);
  console.log(JSON.stringify({ galaxy: GALAXY, outDir: OUT_DIR, total: rows.length, built: done, skipped, totalKB: +built.reduce((s, r) => s + (r.kb || 0), 0).toFixed(1), ids: built.map((r) => r.id) }, null, 0));
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`;
if (isMain || (process.argv[1] && process.argv[1].endsWith("build-session-evidence-packs.mjs"))) {
  main().catch((e) => { console.error("FATAL", e?.stack || e); process.exit(1); });
}
