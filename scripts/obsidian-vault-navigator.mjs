#!/usr/bin/env node
// scripts/obsidian-vault-navigator.mjs
//
// Filesystem-native NAVIGATION surface for the PRISM Obsidian vault
// (H:/prism/knowledge). Gives Claude Code (this CLI) and any PRISM chat the
// equivalent of every Obsidian *navigation* core-plugin -- WITHOUT needing the
// Obsidian GUI app running (the Local REST API at :27123 is usually DOWN in the
// headless fleet; the live control surface is ObsidianRestBridgeEngine.ts).
//
// Verb -> Obsidian core-plugin it replicates:
//   tree / ls    -> file-explorer        (browse the vault structure)
//   read         -> note + properties    (frontmatter + body + outlinks + tags)
//   search       -> global-search        (full-text + tag:/path:/file: operators)
//   links        -> outgoing-link        (the [[wikilinks]] a note emits, resolved)
//   backlinks    -> backlink             (notes that link TO a note, note->note)
//   orphans      -> (graph hygiene)      (notes with 0 in + 0 out links)
//   tags         -> tag-pane             (tag index, or notes carrying one tag)
//   neighborhood -> graph view           (N-hop link neighborhood of a note)
//   canvas       -> canvas               (read a .canvas / JSON Canvas file)
//   status       -> vault stats          (note/tag/link/orphan counts)
//
// DESIGN: fail-soft, never throw on a single bad file (R12 surfaces the count of
// skipped files, never silently swallows). The vault model retains only per-note
// METADATA (outlinks, tags, mtime) -- never note bodies -- so a 64K-file vault
// stays memory-bounded; `read` reads one file, `search` streams + caps. Pure
// helpers + an injected FS make every path unit-testable with no real vault.
//
// Usage:
//   node scripts/obsidian-vault-navigator.mjs <verb> [args] [--json]
//   node scripts/obsidian-vault-navigator.mjs tree --depth 2
//   node scripts/obsidian-vault-navigator.mjs read memories/reference/foo.md
//   node scripts/obsidian-vault-navigator.mjs search "kienzle" --tag physics --limit 10
//   node scripts/obsidian-vault-navigator.mjs backlinks feedback_golf_owns_reaper
//   node scripts/obsidian-vault-navigator.mjs neighborhood reference_system_viz --hops 2
//
// @module obsidian-vault-navigator
import fs from "node:fs";
import path from "node:path";

export const DEFAULT_VAULT = process.env.PRISM_OBSIDIAN_VAULT || "H:/prism/knowledge";

// Directories that are not part of the navigable knowledge surface.
const SKIP_DIR = /^(\.obsidian|\.trash|\.git|_archive|archive|quarantine|node_modules)$/i;

// Oversize-note threshold (observability only). Files larger than this are COUNTED
// in the model's `oversize`, but still fully scanned -- extractWikilinks is bounded
// (O(n)) so even a multi-MB index note is safe. The earlier truncation approach was
// reverted: it silently dropped real [[links]] from legitimate large index files
// (live: 155k -> 142k links, +602 false orphans). The regex bound is the real fix.
const MAX_NOTE_SCAN = 512 * 1024;

// ============================================================================
// PURE HELPERS (no I/O -- unit-tested directly)
// ============================================================================

/**
 * Extract the wikilink targets a note emits: [[target]], [[target|alias]],
 * [[target#heading]], and embeds ![[target]]. Returns the raw target strings
 * (alias + heading stripped). External markdown links and `[[ ]]` empties are
 * excluded. Order-preserving, NOT deduped (caller dedupes).
 * KNOWN DIVERGENCE: [[links]] inside fenced/inline code are NOT stripped, so the
 * link graph can marginally over-count vs the Obsidian GUI (which excludes code
 * spans). Acceptable for a navigation aid; documented rather than silently wrong.
 * @param {string} text
 * @returns {string[]}
 */
export function extractWikilinks(text) {
  if (typeof text !== "string" || !text) return [];
  const out = [];
  // Bounded inner class ([^\]\r\n], capped length): a wikilink target is a single
  // line with no `]` and is short, so this matches every real link yet CANNOT
  // backtrack across a `[`-dense unclosed run -- keeping extraction O(n) on huge /
  // adversarial / corpus .md (was O(n^2), a multi-minute stall on a 1MB unclosed run).
  const re = /!?\[\[([^\]\r\n]{1,256})\]\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    let target = m[1];
    const pipe = target.indexOf("|");
    if (pipe !== -1) target = target.slice(0, pipe); // drop |alias
    const hash = target.indexOf("#");
    if (hash !== -1) target = target.slice(0, hash); // drop #heading / #^block
    target = target.trim();
    if (target) out.push(target);
  }
  return out;
}

/**
 * Split raw note text into { fm, body }. Frontmatter is the first `---`-fenced
 * block; nested `metadata:` is flattened to top-level keys (matches the PRISM
 * memory convention so `tags`/`type` populate from either shape). Tolerant: no
 * fence -> { fm:{}, body:raw }. A minimal scalar/list YAML reader (no external dep).
 * @param {string} raw
 * @returns {{fm:Record<string,unknown>, body:string}}
 */
export function parseFrontmatter(raw) {
  if (typeof raw !== "string") return { fm: {}, body: "" };
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { fm: {}, body: raw };
  const body = raw.slice(m[0].length);
  const fm = {};
  const lines = m[1].split(/\r?\n/);
  const parseScalarOrList = (v) => {
    const inline = v.match(/^\[(.*)\]$/);
    return inline
      ? inline[1].split(",").map((s) => stripYamlScalar(s.trim())).filter((s) => s !== "")
      : stripYamlScalar(v);
  };
  // Indent-AWARE: a top-level `key:` with an empty value introduces an indented
  // block that is a LIST (`- item`) or a MAP (`k: v`) -- decided by the block's
  // first child, not assumed. Indented child lines never write top-level keys
  // (that was the clobber bug); a nested `metadata:` map is flattened below.
  let i = 0;
  while (i < lines.length) {
    const kv = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/); // top-level only (no leading ws)
    if (!kv) { i++; continue; }
    const key = kv[1];
    const val = kv[2];
    if (val !== "") { fm[key] = parseScalarOrList(val); i++; continue; }
    const block = [];
    const map = {};
    let isList = false, isMap = false;
    let j = i + 1;
    for (; j < lines.length; j++) {
      const child = lines[j];
      if (child.trim() === "" || /^\S/.test(child)) break; // blank or dedent ends the block
      const li = child.match(/^\s+-\s+(.*)$/);
      if (li) { isList = true; block.push(stripYamlScalar(li[1])); continue; }
      const ckv = child.match(/^\s+([A-Za-z0-9_-]+):\s*(.*)$/);
      if (ckv) { isMap = true; map[ckv[1]] = parseScalarOrList(ckv[2]); continue; }
      break;
    }
    fm[key] = isList ? block : isMap ? map : "";
    i = j;
  }
  // flatten a nested `metadata:` map to top level (TOP-LEVEL keys win -- precedence).
  if (fm.metadata && typeof fm.metadata === "object" && !Array.isArray(fm.metadata)) {
    for (const [k, v] of Object.entries(fm.metadata)) if (!(k in fm)) fm[k] = v;
  }
  return { fm, body };
}

/** Strip matching wrapping quotes from a YAML scalar; pass through otherwise. */
function stripYamlScalar(s) {
  const t = String(s).trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

/**
 * Collect a note's tags from frontmatter (`tags:` scalar or list) + inline
 * `#tag` occurrences in the body. Normalized: leading `#` removed, lowercased,
 * deduped. Inline matches require a non-word char (or start) before `#` so an
 * `https://x#frag` or a `code#literal` mid-token does not register.
 * @param {Record<string,unknown>} fm
 * @param {string} body
 * @returns {string[]}
 */
export function extractTags(fm, body) {
  const set = new Set();
  const fmTags = fm && fm.tags;
  if (Array.isArray(fmTags)) for (const t of fmTags) addTag(set, t);
  else if (typeof fmTags === "string") for (const t of fmTags.split(/[,\s]+/)) addTag(set, t);
  if (typeof body === "string") {
    const re = /(^|[^\w/#])#([A-Za-z][\w/-]*)/g;
    let m;
    while ((m = re.exec(body)) !== null) addTag(set, m[2]);
  }
  return [...set];
}

function addTag(set, t) {
  const v = String(t).replace(/^#/, "").trim().toLowerCase();
  if (v && !/^\d+$/.test(v)) set.add(v); // a bare "#123" is a block-ref-ish token, not a tag
}

/**
 * Normalize a wikilink target OR a note path to a lookup key: forward slashes,
 * drop a trailing `.md`, lowercase. Used to resolve `[[Name]]` against note
 * basenames (Obsidian's default link resolution).
 * @param {string} s
 * @returns {string}
 */
export function normalizeKey(s) {
  return String(s).replace(/\\/g, "/").replace(/\.md$/i, "").toLowerCase().trim();
}

/**
 * Parse a search query string into { terms, filters }. Operators:
 *   tag:foo   path:bar   file:baz   (repeatable). Bare words -> terms (AND).
 * Quoted "two words" -> a single phrase term.
 * @param {string} query
 * @returns {{terms:string[], filters:{tag:string[], path:string[], file:string[]}}}
 */
export function parseSearchQuery(query) {
  const filters = { tag: [], path: [], file: [] };
  const terms = [];
  if (typeof query !== "string") return { terms, filters };
  const re = /(\w+):(\S+)|"([^"]+)"|(\S+)/g;
  let m;
  while ((m = re.exec(query)) !== null) {
    if (m[1] && (m[1] === "tag" || m[1] === "path" || m[1] === "file")) {
      filters[m[1]].push(m[2].toLowerCase());
    } else if (m[1]) {
      // an unrecognized `word:value` token (e.g. "12:30", "std:vector") is NOT a
      // filter -- keep the WHOLE token as a literal search term (R12: never drop it).
      terms.push(m[0].toLowerCase());
    } else if (m[3] != null) {
      terms.push(m[3].toLowerCase());
    } else if (m[4] != null) {
      terms.push(m[4].toLowerCase());
    }
  }
  // dedupe each filter dimension (idempotent semantics; matches outlink dedupe).
  for (const k of ["tag", "path", "file"]) filters[k] = [...new Set(filters[k])];
  return { terms, filters };
}

// ============================================================================
// VAULT MODEL (one I/O walk -> metadata-only graph; no bodies retained)
// ============================================================================

/**
 * Recursively enumerate *.md (and *.canvas) under a root, skipping config /
 * archive / dot dirs. Returns vault-relative POSIX paths. Fail-soft per-dir.
 * @param {string} root
 * @param {object} io  { readdirImpl }
 * @returns {string[]}
 */
export function walkVault(root, { readdirImpl = fs.readdirSync } = {}) {
  const out = [];
  const recur = (dir) => {
    let entries;
    try { entries = readdirImpl(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIR.test(e.name)) continue;
        recur(full);
      } else if (e.isFile() && /\.(md|canvas)$/i.test(e.name)) {
        out.push(path.relative(root, full).replace(/\\/g, "/"));
      }
    }
  };
  recur(root);
  return out;
}

/**
 * Build the navigable vault model: parse every note's frontmatter + outlinks +
 * tags (NOT bodies), resolve wikilinks to relpaths, and invert into backlinks.
 * Returns { vaultRoot, notes, basenameIndex, backlinks, canvases, skipped, fileCount }.
 *   notes        Map<relpath, {outlinks:string[], unresolvedOut:number, tags:string[], mtimeMs, title}>
 *   basenameIndex Map<normKey, relpath[]>  (basename + full normalized path keys)
 *   backlinks    Map<relpath, string[]>    (sources that link to relpath)
 *   canvases     string[] of .canvas relpaths
 * Never throws; unreadable files increment `skipped`.
 * @param {string} vaultRoot
 * @param {object} io  { readdirImpl, readFileImpl, statImpl }
 */
export function buildVaultModel(vaultRoot = DEFAULT_VAULT, io = {}) {
  const { readdirImpl = fs.readdirSync, readFileImpl = fs.readFileSync, statImpl = fs.statSync } = io;
  const files = walkVault(vaultRoot, { readdirImpl });
  const notes = new Map();
  const canvases = [];
  const basenameIndex = new Map();
  const rawOut = new Map(); // relpath -> raw (unresolved) targets
  let skipped = 0;
  let oversize = 0;

  // index keys: full normalized path + bare basename (Obsidian resolves by name)
  const addKey = (key, rel) => {
    const arr = basenameIndex.get(key);
    if (arr) { if (!arr.includes(rel)) arr.push(rel); }
    else basenameIndex.set(key, [rel]);
  };
  for (const rel of files) {
    if (/\.canvas$/i.test(rel)) { canvases.push(rel); continue; }
    addKey(normalizeKey(rel), rel);
    const base = rel.includes("/") ? rel.slice(rel.lastIndexOf("/") + 1) : rel;
    addKey(normalizeKey(base), rel);
  }

  for (const rel of files) {
    if (/\.canvas$/i.test(rel)) continue;
    let raw, st;
    try {
      raw = readFileImpl(path.join(vaultRoot, rel), "utf8");
      st = statImpl(path.join(vaultRoot, rel));
    } catch { skipped++; continue; }
    if (raw.length > MAX_NOTE_SCAN) oversize++; // observability only -- extraction is O(n), no truncation
    const { fm, body } = parseFrontmatter(raw);
    const targets = extractWikilinks(raw);
    const tags = extractTags(fm, body);
    const title = (fm && typeof fm.title === "string" && fm.title.trim())
      ? fm.title.trim()
      : (rel.includes("/") ? rel.slice(rel.lastIndexOf("/") + 1) : rel).replace(/\.md$/i, "");
    notes.set(rel, { outlinks: [], unresolvedOut: 0, tags, mtimeMs: st.mtimeMs, title });
    rawOut.set(rel, targets);
  }

  // resolve outlinks -> relpaths + invert to backlinks
  const backlinks = new Map();
  for (const [rel, targets] of rawOut) {
    const note = notes.get(rel);
    const seen = new Set();
    for (const t of targets) {
      const matches = basenameIndex.get(normalizeKey(t));
      if (!matches || matches.length === 0) { note.unresolvedOut++; continue; }
      const dest = matches.find((d) => d !== rel) || null; // first match; exclude self
      if (!dest || seen.has(dest)) continue;
      seen.add(dest);
      note.outlinks.push(dest);
      const bl = backlinks.get(dest);
      if (bl) { if (!bl.includes(rel)) bl.push(rel); }
      else backlinks.set(dest, [rel]);
    }
  }

  return { vaultRoot, notes, basenameIndex, backlinks, canvases, skipped, oversize, fileCount: files.length };
}

/**
 * Resolve a user-supplied note reference (relpath, basename, with/without .md,
 * any case) to an exact model relpath. Returns { rel } on a unique hit,
 * { ambiguous } on multiple, or { suggestions } on a miss.
 * @param {object} model
 * @param {string} ref
 * @returns {{rel?:string, ambiguous?:string[], suggestions?:string[]}}
 */
export function resolveNote(model, ref) {
  if (typeof ref !== "string" || ref === "") return { suggestions: [] };
  if (model.notes.has(ref)) return { rel: ref };
  const key = normalizeKey(ref);
  const direct = model.basenameIndex.get(key);
  if (direct && direct.length === 1) return { rel: direct[0] };
  if (direct && direct.length > 1) return { ambiguous: direct.slice(0, 12) };
  const sugg = [];
  for (const rel of model.notes.keys()) {
    const base = rel.includes("/") ? rel.slice(rel.lastIndexOf("/") + 1) : rel;
    if (normalizeKey(base).includes(key)) { sugg.push(rel); if (sugg.length >= 8) break; }
  }
  return { suggestions: sugg };
}

// ============================================================================
// NAVIGATION VERBS (operate on the model -- pure, testable)
// ============================================================================

/** file-explorer: vault structure to a given depth (dir -> note count). */
export function navTree(model, { depth = 2 } = {}) {
  const dirCounts = new Map();
  for (const rel of model.notes.keys()) {
    const parts = rel.split("/");
    if (parts.length === 1) { dirCounts.set("(root)", (dirCounts.get("(root)") || 0) + 1); continue; }
    for (let d = 1; d <= Math.min(depth, parts.length - 1); d++) {
      const prefix = parts.slice(0, d).join("/");
      dirCounts.set(prefix, (dirCounts.get(prefix) || 0) + 1);
    }
  }
  const dirs = [...dirCounts.entries()]
    .map(([dir, notes]) => ({ dir, notes }))
    .sort((a, b) => a.dir.localeCompare(b.dir));
  return { vaultRoot: model.vaultRoot, totalNotes: model.notes.size, depth, dirs };
}

/** read a note: properties + outlinks + backlinks + tags + the body. */
export function navRead(model, ref, { readFileImpl = fs.readFileSync } = {}) {
  const r = resolveNote(model, ref);
  if (!r.rel) return { found: false, ...r };
  const note = model.notes.get(r.rel);
  let body = "";
  let fm = {};
  try {
    const raw = readFileImpl(path.join(model.vaultRoot, r.rel), "utf8");
    const p = parseFrontmatter(raw);
    body = p.body;
    fm = p.fm;
  } catch (e) { return { found: true, rel: r.rel, error: `read failed: ${e.message}` }; }
  return {
    found: true,
    rel: r.rel,
    title: note.title,
    properties: fm,
    tags: note.tags,
    outlinks: note.outlinks,
    unresolvedOut: note.unresolvedOut,
    backlinks: model.backlinks.get(r.rel) || [],
    bodyChars: body.length,
    body,
  };
}

/** outgoing-link: the resolved [[wikilinks]] a note emits. */
export function navLinks(model, ref) {
  const r = resolveNote(model, ref);
  if (!r.rel) return { found: false, ...r };
  const note = model.notes.get(r.rel);
  return { found: true, rel: r.rel, outlinks: note.outlinks, unresolvedOut: note.unresolvedOut };
}

/** backlink: notes that link TO this note. */
export function navBacklinks(model, ref) {
  const r = resolveNote(model, ref);
  if (!r.rel) return { found: false, ...r };
  return { found: true, rel: r.rel, backlinks: model.backlinks.get(r.rel) || [] };
}

/** notes with 0 inbound AND 0 outbound links (graph-isolated). */
export function navOrphans(model, { limit = 100 } = {}) {
  const orphans = [];
  for (const [rel, note] of model.notes) {
    const inbound = (model.backlinks.get(rel) || []).length;
    if (note.outlinks.length === 0 && inbound === 0) orphans.push(rel);
  }
  return { total: orphans.length, shown: Math.min(orphans.length, limit), orphans: orphans.slice(0, limit) };
}

/** tag-pane: full tag index (tag -> count), or the notes carrying one tag. */
export function navTags(model, tag) {
  if (tag) {
    const want = String(tag).replace(/^#/, "").toLowerCase();
    const notes = [];
    for (const [rel, note] of model.notes) if (note.tags.includes(want)) notes.push(rel);
    return { tag: want, count: notes.length, notes };
  }
  const counts = new Map();
  for (const note of model.notes.values()) for (const t of note.tags) counts.set(t, (counts.get(t) || 0) + 1);
  const tags = [...counts.entries()]
    .map(([t, c]) => ({ tag: t, count: c }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  return { totalTags: tags.length, tags };
}

/** graph view: the N-hop link neighborhood (out + back edges) of a note. */
export function navNeighborhood(model, ref, { hops = 1 } = {}) {
  const r = resolveNote(model, ref);
  if (!r.rel) return { found: false, ...r };
  const levels = [[r.rel]];
  const seen = new Set([r.rel]);
  for (let h = 0; h < hops; h++) {
    const next = [];
    for (const cur of levels[h]) {
      const note = model.notes.get(cur);
      const neighbors = [...(note ? note.outlinks : []), ...(model.backlinks.get(cur) || [])];
      for (const nb of neighbors) if (!seen.has(nb)) { seen.add(nb); next.push(nb); }
    }
    if (next.length === 0) break;
    levels.push(next);
  }
  return { found: true, rel: r.rel, hops, totalReached: seen.size - 1, levels: levels.slice(1) };
}

/**
 * global-search: stream the vault, match notes whose body contains ALL terms and
 * satisfies every tag:/path:/file: filter. Reads bodies on demand (not retained
 * in the model); capped at `limit`. Returns one context snippet per hit.
 */
export function navSearch(model, query, { limit = 25, readFileImpl = fs.readFileSync } = {}) {
  const { terms, filters } = parseSearchQuery(query);
  const hits = [];
  for (const [rel, note] of model.notes) {
    if (hits.length >= limit) break;
    if (filters.path.length && !filters.path.some((p) => rel.toLowerCase().includes(p))) continue;
    if (filters.file.length) {
      const base = rel.includes("/") ? rel.slice(rel.lastIndexOf("/") + 1) : rel;
      if (!filters.file.some((f) => base.toLowerCase().includes(f))) continue;
    }
    if (filters.tag.length && !filters.tag.every((t) => note.tags.includes(t))) continue;
    if (terms.length === 0) { hits.push({ rel, snippet: note.title }); continue; }
    let body;
    try { body = readFileImpl(path.join(model.vaultRoot, rel), "utf8"); }
    catch { continue; }
    const lower = body.toLowerCase();
    if (!terms.every((t) => lower.includes(t))) continue;
    const at = lower.indexOf(terms[0]);
    const start = Math.max(0, at - 40);
    const snippet = body.slice(start, start + 120).replace(/\r?\n/g, " ").trim();
    hits.push({ rel, snippet });
  }
  return { query, terms, filters, total: hits.length, hits };
}

/** canvas: read a JSON Canvas file -> node/edge summary. Fail-soft on bad JSON. */
export function navCanvas(model, ref, { readFileImpl = fs.readFileSync } = {}) {
  let rel = model.canvases.includes(ref) ? ref : null;
  if (!rel) {
    const key = normalizeKey(ref);
    rel = model.canvases.find((c) => normalizeKey(c) === key || normalizeKey(c).endsWith("/" + key) || normalizeKey(c.split("/").pop()) === key) || null;
  }
  if (!rel) return { found: false, suggestions: model.canvases.slice(0, 8) };
  let data;
  try { data = JSON.parse(readFileImpl(path.join(model.vaultRoot, rel), "utf8")); }
  catch (e) { return { found: true, rel, error: `canvas parse failed: ${e.message}` }; }
  const nodes = Array.isArray(data.nodes) ? data.nodes : [];
  const edges = Array.isArray(data.edges) ? data.edges : [];
  return {
    found: true, rel,
    nodeCount: nodes.length, edgeCount: edges.length,
    nodes: nodes.slice(0, 50).map((n) => ({ id: n.id, type: n.type, label: n.text ? String(n.text).slice(0, 60) : (n.file || n.label || "") })),
  };
}

/** vault stats: counts across the model (the at-a-glance "graph health"). */
export function navStatus(model) {
  let totalOut = 0, totalTags = 0, orphanCount = 0;
  const tagSet = new Set();
  for (const [rel, note] of model.notes) {
    totalOut += note.outlinks.length;
    for (const t of note.tags) tagSet.add(t);
    totalTags += note.tags.length;
    const inbound = (model.backlinks.get(rel) || []).length;
    if (note.outlinks.length === 0 && inbound === 0) orphanCount++;
  }
  return {
    vaultRoot: model.vaultRoot,
    notes: model.notes.size,
    canvases: model.canvases.length,
    resolvedLinks: totalOut,
    uniqueTags: tagSet.size,
    tagApplications: totalTags,
    orphans: orphanCount,
    skippedUnreadable: model.skipped,
    oversizeScanned: model.oversize,
    scannedFiles: model.fileCount,
  };
}

// ============================================================================
// CLI
// ============================================================================

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next != null && !next.startsWith("--")) { flags[key] = next; i++; }
      else flags[key] = true;
    } else positional.push(a);
  }
  return { positional, flags };
}

export const VERBS = ["tree", "ls", "read", "search", "links", "backlinks", "orphans", "tags", "neighborhood", "canvas", "status"];

/** Parse a numeric flag, honoring an explicit 0; falls back to `def` for absent/NaN/negative. */
function numFlag(v, def) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

export function runCli(argv, { vaultRoot = DEFAULT_VAULT, io = {} } = {}) {
  const { positional, flags } = parseArgs(argv);
  const verb = positional[0];
  const arg = positional[1];
  if (!verb || !VERBS.includes(verb)) {
    return { ok: false, error: `usage: obsidian-vault-navigator <${VERBS.join("|")}> [arg] [--json]`, verbs: VERBS };
  }
  const model = buildVaultModel(vaultRoot, io);
  switch (verb) {
    case "tree": return { ok: true, verb, result: navTree(model, { depth: numFlag(flags.depth, 2) }) };
    case "ls": {
      const dir = arg ? arg.replace(/\\/g, "/").replace(/\/$/, "") : "";
      const notes = [...model.notes.keys()].filter((r) => dir
        ? (r.startsWith(dir + "/") && r.slice(dir.length + 1).indexOf("/") === -1)
        : r.indexOf("/") === -1);
      return { ok: true, verb, result: { dir: dir || "(root)", count: notes.length, notes: notes.slice(0, numFlag(flags.limit, 200)) } };
    }
    case "read": return { ok: true, verb, result: navRead(model, arg, io) };
    case "links": return { ok: true, verb, result: navLinks(model, arg) };
    case "backlinks": return { ok: true, verb, result: navBacklinks(model, arg) };
    case "orphans": return { ok: true, verb, result: navOrphans(model, { limit: numFlag(flags.limit, 100) }) };
    case "tags": return { ok: true, verb, result: navTags(model, arg) };
    case "neighborhood": return { ok: true, verb, result: navNeighborhood(model, arg, { hops: numFlag(flags.hops, 1) }) };
    case "canvas": return { ok: true, verb, result: navCanvas(model, arg, io) };
    case "search": return { ok: true, verb, result: navSearch(model, arg, { limit: numFlag(flags.limit, 25), ...io }) };
    case "status": return { ok: true, verb, result: navStatus(model) };
    default: return { ok: false, error: `unknown verb ${verb}` };
  }
}

function render(out) {
  if (!out.ok) { process.stdout.write((out.error || "error") + "\n"); return; }
  process.stdout.write(JSON.stringify(out.result, null, 2) + "\n");
}

const __direct = (() => { try { return (process.argv[1] || "").replace(/\\/g, "/").endsWith("obsidian-vault-navigator.mjs"); } catch { return false; } })();
if (__direct) {
  const out = runCli(process.argv.slice(2));
  render(out);
}
