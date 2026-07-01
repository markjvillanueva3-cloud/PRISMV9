#!/usr/bin/env node
/**
 * consolidate-evidence-digest.mjs (U-ALPHA-SONNET-MINE)
 *
 * Reduces the per-session evidence packs (build-session-evidence-packs.mjs output) into ONE
 * deduped, slim digest carrying only the categorization-load-bearing signal -- DEFERRED/UNFINISHED/
 * UNWIRED markers, ARTICLES fed, and COMMIT subjects -- with global cross-session dedup. The bulky
 * USER PROMPTS + ASSISTANT TAIL sections are dropped (they bloat the read without adding
 * categorization signal). Result: ~1.2MB of packs -> a ~tens-of-KB digest a single strong model
 * (Opus main chat OR a Sonnet agent) can read in one pass to produce the cross-session synthesis.
 *
 * WHY (slot:alpha 2026-06-11): the Sonnet-subagent fan-out over full packs overflowed each
 * subagent's prompt (PRISM injects a ~110K-token context bundle into every subagent -> "Prompt is
 * too long") and tripped API rate-limits. A deduped slim digest is small enough to read directly,
 * sidestepping both walls. Deterministic extraction (R5) -- the model does only the judgement.
 *
 * USAGE: node scripts/consolidate-evidence-digest.mjs --evdir <dir> [--out <file>]
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const EVDIR = arg("--evdir", "state/shared/galaxy-transcript-mining/token-optimization/_evidence");
const OUT = arg("--out", EVDIR + "/../_DEFERRED-DIGEST.md");

// Pull a "## <heading> (...)" section's "- item" bullets (drops the "_(none ...)_" placeholder).
export function sectionItems(txt, headingStartsWith) {
  const lines = txt.split(/\r?\n/);
  const items = [];
  let inSec = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) { inSec = line.slice(3).startsWith(headingStartsWith); continue; }
    if (line.startsWith("# ")) { inSec = false; continue; }
    if (!inSec) continue;
    const t = line.trim();
    if (t.startsWith("- ")) {
      const v = t.slice(2).trim();
      if (v && !/^_?\(none/i.test(v)) items.push(v);
    }
  }
  return items;
}

const normKey = (s, n) => s.toLowerCase().replace(/\W+/g, " ").trim().slice(0, n);

// Drop session-progress / scrutiny-verdict / loop chatter that the broad DEFERRED regex over-captures
// -- these are NOT real backlog tasks. Genuine "next: U-X" / "not wired" / "follow-up unit" lines survive.
const CHATTER_RE = /\b(both (reviewers?|arms|pass)|reviewer [ab]\b|0 p0\/p1|verdict: ?pass|committing u-|committed \(iter|updating (the )?(milestone )?envelope|closing out u-|milestone complete|scrutiny|re-?dispatch|2-of-2|3-of-3|iter \d+\/\d+|units? shipped|all (p1|tests).*(pass|verified|applied)|\d+\/\d+ pass)\b/i;
const isChatter = (s) => CHATTER_RE.test(s) || s.length < 12;

export function consolidate(evdir) {
  const files = readdirSync(evdir).filter((f) => /^[0-9a-f]{8}\.md$/.test(f)).sort();
  const seenDef = new Set(), seenArt = new Set(), seenCom = new Set();
  const sessions = [];
  let nDef = 0, nArt = 0, nCom = 0;
  for (const f of files) {
    const id = f.replace(".md", "");
    const txt = readFileSync(evdir + "/" + f, "utf8");
    const hdr = (txt.match(/- date: ([^\n]+)/) || [])[1] || "";
    const def = sectionItems(txt, "DEFERRED").filter((x) => { if (isChatter(x)) return false; const k = normKey(x, 90); if (!k || seenDef.has(k)) return false; seenDef.add(k); return true; });
    const art = sectionItems(txt, "ARTICLES").filter((x) => { const k = normKey(x, 70); if (!k || seenArt.has(k)) return false; seenArt.add(k); return true; });
    const com = sectionItems(txt, "COMMIT").filter((x) => { const k = normKey(x, 80); if (!k || seenCom.has(k)) return false; seenCom.add(k); return true; });
    nDef += def.length; nArt += art.length; nCom += com.length;
    if (def.length || art.length) sessions.push({ id, hdr, def, art });
  }
  return { sessions, nDef, nArt, nCom, files: files.length };
}

function render(r) {
  const out = [
    "# Deduped deferred/unfinished/unwired + articles across alpha sessions (2026-05-12..27)",
    "# D| = deferred/unfinished/unwired marker   A| = article/ref fed   (globally deduped across all sessions)",
    `# sessions-with-signal: ${r.sessions.length}/${r.files}   uniq-deferred: ${r.nDef}   uniq-articles: ${r.nArt}`,
    "",
  ];
  for (const s of r.sessions) {
    out.push(`### ${s.id} ${s.hdr}`);
    for (const d of s.def) out.push("D| " + d);
    for (const a of s.art) out.push("A| " + a);
    out.push("");
  }
  return out.join("\n");
}

const isMain = process.argv[1] && process.argv[1].endsWith("consolidate-evidence-digest.mjs");
if (isMain) {
  if (!existsSync(EVDIR)) { console.error("evdir not found:", EVDIR); process.exit(1); }
  const r = consolidate(EVDIR);
  const body = render(r);
  writeFileSync(OUT, body);
  console.log(JSON.stringify({ out: OUT, sessionsWithSignal: r.sessions.length, files: r.files, uniqDeferred: r.nDef, uniqArticles: r.nArt, uniqCommits: r.nCom, kb: +(body.length / 1024).toFixed(1) }, null, 0));
}
