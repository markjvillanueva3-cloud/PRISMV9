#!/usr/bin/env node
/**
 * knowledge-link-audit.mjs — U-KNOWLEDGE-LINK-AUDIT (echo, /goal synergy iter 3).
 *
 * Scans `knowledge/wiki/**` + `knowledge/memories/**` for Obsidian-style
 * `[[name]]` cross-references and flags every link that does NOT resolve to
 * an actual file in either namespace. Closes a wiki ⇄ memories cross-surface
 * integrity gap: every broken link is a piece of self-learning context that
 * silently fails to surface in tribal/memory-rag/precheck injectors.
 *
 * Pure core / IO shell split:
 *   - extractLinks(text)         pure, all [[name]] tokens (alias-aware)
 *   - normalizeName(name)        pure, the lookup key
 *   - auditLinks(files, names)   pure, returns {broken[], stats}
 *   - main()                     I/O — walks the trees, writes the report
 *
 * Output:  state/shared/.knowledge-link-audit.json (advisory; never auto-fixes)
 * Usage:   node scripts/knowledge-link-audit.mjs        # write report
 *          node scripts/knowledge-link-audit.mjs --json # stdout (no write)
 * Exit:    0 ok (incl. zero broken) · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const SCHEMA_VERSION = "1.0.0";

const WIKI_DIR = path.join(ROOT, "knowledge/wiki");
const MEM_DIR = path.join(ROOT, "knowledge/memories");
const OUT_PATH = path.join(ROOT, "state/shared/.knowledge-link-audit.json");

// ───────────────────────── pure core ─────────────────────────

/**
 * Pure: extract every `[[name]]` or `[[name|alias]]` Obsidian-style link from
 * a markdown blob. The match is greedy-bounded to NOT cross a `]]`, so
 * `[[a]] [[b]]` returns 2 links, not one.
 */
export function extractLinks(text) {
  const s = String(text || "");
  const out = [];
  const re = /\[\[([^\]\n|]+?)(?:\|[^\]\n]*?)?\]\]/g;
  let m;
  while ((m = re.exec(s)) !== null) out.push(m[1].trim());
  return out;
}

/**
 * Pure: collapse a link target to the lookup key used to match against the
 * known-file index. Strips `.md`, lowercases, replaces underscores with
 * hyphens (the wiki/memory dual-convention) and trims whitespace. A path-like
 * target keeps only its final segment (`skills/foxtrot/x` → `x`).
 */
export function normalizeName(name) {
  let s = String(name || "").trim();
  if (!s) return "";
  s = s.split(/[\\/]/).pop();             // last segment
  s = s.replace(/\.md$/i, "");
  s = s.toLowerCase().replace(/_/g, "-");
  return s;
}

/**
 * Pure: true when a `[[...]]` target is a PHANTOM — a glob fragment (`*`/`?`)
 * or a repo path-fragment (`src/...`, `scripts/...`, etc.) that prose/code
 * blocks emit inside `[[ ]]` but which is NOT a real wikilink. These inflated
 * the broken-link count (~12.8% false positives, U-OBS-LINK-AUDIT-PHANTOM-FILTER)
 * and fed phantom stubs into create-broken-wikilink-stubs.mjs. Requires a `/`
 * AND a known repo first-segment, so intentional namespaced links like
 * `galaxy/mill` (rendered by the recall hooks) are PRESERVED as real links.
 */
export const PHANTOM_PATH_PREFIXES = ["skills", "src", "state", "scripts", "knowledge", "mcp-server"];
export function isPhantomLinkTarget(rawName) {
  const s = String(rawName || "").trim();
  if (!s) return false;
  if (/[*?]/.test(s)) return true;               // glob fragment — never a wikilink
  const slash = s.indexOf("/");
  if (slash === -1) return false;                // no path separator → treat as a real link
  return PHANTOM_PATH_PREFIXES.includes(s.slice(0, slash).toLowerCase());
}

/**
 * Pure: given parsed files + a set of known names, return {broken, stats}.
 *   files:     [{path, links: [name, ...]}, ...]
 *   knownSet:  Set<normalizedName>
 *   broken:    [{from, link, normalized}, ...]   stable, sorted
 *   stats:     {filesScanned, linksTotal, linksResolved, linksBroken}
 */
export function auditLinks(files, knownSet) {
  const broken = [];
  let total = 0, resolved = 0, skippedPhantom = 0;
  const known = knownSet instanceof Set ? knownSet : new Set();
  const fileList = Array.isArray(files) ? files : [];
  for (const f of fileList) {
    const links = Array.isArray(f && f.links) ? f.links : [];
    for (const link of links) {
      // Skip phantom targets (glob/repo-path fragments) BEFORE the tally — they
      // are not real wikilinks, so counting them as broken was a false positive
      // that polluted the report + the broken-link stub generator. Counted
      // separately (linksSkippedPhantom) so the drop is transparent, not silent.
      if (isPhantomLinkTarget(link)) { skippedPhantom++; continue; }
      total++;
      const n = normalizeName(link);
      if (n && known.has(n)) resolved++;
      else broken.push({ from: f && f.path, link, normalized: n });
    }
  }
  broken.sort((a, b) => String(a.from).localeCompare(String(b.from)) || String(a.link).localeCompare(String(b.link)));
  return {
    broken,
    stats: { filesScanned: fileList.length, linksTotal: total, linksResolved: resolved, linksBroken: broken.length, linksSkippedPhantom: skippedPhantom },
  };
}

// ───────────────────────── I/O shell ─────────────────────────

function walkMd(dir, acc = []) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of ents) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkMd(full, acc);
    else if (e.isFile() && /\.md$/i.test(e.name)) acc.push(full);
  }
  return acc;
}

export function main(argv = []) {
  const json = argv.includes("--json");
  const wikiFiles = walkMd(WIKI_DIR);
  const memFiles  = walkMd(MEM_DIR);
  const known = new Set();
  for (const p of [...wikiFiles, ...memFiles]) {
    known.add(normalizeName(path.basename(p)));
  }
  const parsed = [];
  for (const p of [...wikiFiles, ...memFiles]) {
    let text = "";
    try { text = fs.readFileSync(p, "utf8"); } catch { continue; }
    parsed.push({ path: path.relative(ROOT, p).replace(/\\/g, "/"), links: extractLinks(text) });
  }
  const audit = auditLinks(parsed, known);
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    wikiDir: path.relative(ROOT, WIKI_DIR).replace(/\\/g, "/"),
    memDir: path.relative(ROOT, MEM_DIR).replace(/\\/g, "/"),
    ...audit,
  };
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
    return 0;
  }
  try {
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));
    console.log(`knowledge-link-audit: ${audit.stats.linksBroken}/${audit.stats.linksTotal} broken across ${audit.stats.filesScanned} files`);
    console.log(`  wrote ${OUT_PATH}`);
    return 0;
  } catch (e) {
    console.error(`FATAL: write failed — ${e.message}`);
    return 2;
  }
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main(process.argv.slice(2)));
