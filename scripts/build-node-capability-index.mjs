#!/usr/bin/env node
// tier: T2
/**
 * build-node-capability-index.mjs — NODE-CAPABILITY-INJECT-MS0 / U-NCI-INDEX
 *
 * Scans the 7351 `node_<kind>_<slug>.md` pointer files emitted by
 * `scripts/emit-node-memory-pointers.mjs` (U-NMP-CORE) and produces a
 * fast lookup index for the UserPromptSubmit hook.
 *
 * Output: state/shared/system-viz/node-capability-index.json
 * Atomic write (tmp + rename) survives concurrent Stop-hook fires.
 *
 * Pure exports for testing: parsePointerFile, buildIndex.
 * Sync I/O throughout — keeps the entry-point trivial.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PRISM_ROOT = path.resolve(SCRIPT_DIR, "..");
const POINTER_DIR_REL = "knowledge/memories/reference";
const POINTER_DIR = path.join(PRISM_ROOT, POINTER_DIR_REL);
const OUT_PATH = path.join(PRISM_ROOT, "state/shared/system-viz/node-capability-index.json");
const INDEX_VERSION = 1;

const KEBAB_PREFIX_RE = /^(?:alg|formula|hook|action|dispatcher|milestone|registry|monolith|skill|course|frontend|layer|domain|test|engine|node)[-_]/;

function parseArgs(argv) {
  const out = { dryRun: false, pretty: false, quiet: false };
  for (const a of argv) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--pretty") out.pretty = true;
    else if (a === "--quiet") out.quiet = true;
  }
  return out;
}

/**
 * Minimal frontmatter parser for the shape `renderPointer` emits.
 * Avoids js-yaml dep — handles top-level + metadata block only.
 */
function parseFrontmatter(content) {
  if (!content || content.indexOf("---") !== 0) return null;
  const end = content.indexOf("\n---", 4);
  if (end < 0) return null;
  const block = content.slice(4, end);
  const out = {};
  const lines = block.split(/\r?\n/);
  let inMeta = false;
  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    if (/^metadata:\s*$/.test(line)) { inMeta = true; continue; }
    const m = /^(\s*)([a-z_][a-z_0-9]*):\s*(.*)$/i.exec(line);
    if (!m) continue;
    const indent = m[1];
    const key = m[2];
    const val = m[3];
    if (indent.length > 0 && !inMeta) continue;
    if (!val) continue;
    out[key] = val.replace(/^["']|["']$/g, "");
  }
  return out;
}

/**
 * Parse one pointer file into the entry shape the index stores.
 * Returns { nodeId, kind, slug, wikiPath, displayName } or null.
 */
export function parsePointerFile(_filePath, content) {
  const fm = parseFrontmatter(content);
  if (!fm) return null;
  const nodeId = fm.node_id;
  const wikiPath = fm.wiki_path;
  const kind = fm.node_kind;
  if (!nodeId || !wikiPath || !kind) return null;
  const dotIdx = nodeId.indexOf(".");
  const slug = dotIdx >= 0 ? nodeId.slice(dotIdx + 1) : nodeId;
  let displayName = slug;
  if (fm.description) {
    const dashIdx = fm.description.indexOf("—");
    const arrowIdx = fm.description.indexOf("→");
    if (dashIdx >= 0 && arrowIdx > dashIdx) {
      displayName = fm.description.slice(dashIdx + 1, arrowIdx).trim();
      const parts = displayName.split(/\s+/);
      if (parts.length >= 2 && parts[0].toLowerCase() === kind) {
        displayName = parts.slice(1).join(" ").trim();
      }
    }
  }
  if (!displayName) displayName = slug;
  return { nodeId, kind, slug, wikiPath, displayName };
}

/**
 * Walk the flat pointer dir, parse each, build 2 lookup tables.
 * Pure (modulo fs read) — accepts a directory + now() for deterministic tests.
 */
export function buildIndex(pointerDir, opts) {
  const now = opts && opts.now ? opts.now : Date.now();
  const pointers = {};
  const displayNameToId = {};
  let count = 0;
  let skipped = 0;

  if (!fs.existsSync(pointerDir)) {
    return { version: INDEX_VERSION, builtAt: now, pointersDir: POINTER_DIR_REL, count: 0, skipped: 0, pointers, displayNameToId };
  }
  const entries = fs.readdirSync(pointerDir);
  for (const name of entries) {
    if (name.indexOf("node_") !== 0 || !name.endsWith(".md")) continue;
    const full = path.join(pointerDir, name);
    let content;
    try {
      content = fs.readFileSync(full, "utf8");
    } catch {
      skipped++;
      continue;
    }
    const parsed = parsePointerFile(full, content);
    if (!parsed) { skipped++; continue; }
    pointers[parsed.nodeId] = {
      kind: parsed.kind,
      slug: parsed.slug,
      displayName: parsed.displayName,
      wikiPath: parsed.wikiPath,
      pointerPath: path.relative(PRISM_ROOT, full).replace(/\\/g, "/")
    };
    const norm1 = String(parsed.displayName).toLowerCase();
    const norm2 = String(parsed.slug).toLowerCase();
    if (!displayNameToId[norm1]) displayNameToId[norm1] = parsed.nodeId;
    if (!displayNameToId[norm2]) displayNameToId[norm2] = parsed.nodeId;
    const slugNoPrefix = norm2.replace(KEBAB_PREFIX_RE, "");
    if (slugNoPrefix !== norm2 && !displayNameToId[slugNoPrefix]) {
      displayNameToId[slugNoPrefix] = parsed.nodeId;
    }
    count++;
  }
  return { version: INDEX_VERSION, builtAt: now, pointersDir: POINTER_DIR_REL, count, skipped, pointers, displayNameToId };
}

function writeAtomic(targetPath, body) {
  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = targetPath + ".tmp-" + process.pid + "-" + Date.now();
  fs.writeFileSync(tmp, body, "utf8");
  fs.renameSync(tmp, targetPath);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const idx = buildIndex(POINTER_DIR);
  const body = args.pretty ? JSON.stringify(idx, null, 2) : JSON.stringify(idx);
  const summary = {
    ok: true,
    out: path.relative(PRISM_ROOT, OUT_PATH).replace(/\\/g, "/"),
    count: idx.count,
    skipped: idx.skipped,
    displayKeys: Object.keys(idx.displayNameToId).length,
    bytes: body.length,
    dryRun: args.dryRun
  };
  if (!args.dryRun) writeAtomic(OUT_PATH, body);
  if (!args.quiet) process.stdout.write(JSON.stringify(summary) + "\n");
  return 0;
}

const isDirectInvocation = process.argv[1] && process.argv[1].endsWith("build-node-capability-index.mjs");
if (isDirectInvocation) {
  try { process.exit(main()); }
  catch (err) {
    const msg = err && err.message ? err.message : String(err);
    process.stderr.write(JSON.stringify({ ok: false, error: msg }) + "\n");
    process.exit(1);
  }
}
