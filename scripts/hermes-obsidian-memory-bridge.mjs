#!/usr/bin/env node
/**
 * hermes-obsidian-memory-bridge.mjs
 * ---------------------------------
 * Surfaces the Hermes desktop agent's SILOED memory store into the PRISM brain
 * vault that Obsidian indexes, closing the Hermes <-> Obsidian synergy gap.
 *
 * Hermes (C:/Users/<u>/AppData/Local/hermes/) keeps its own learning under
 * `memories/*.md` + state.db -- invisible to `H:/prism/knowledge/` (the Obsidian
 * vault / PRISM brain). This bridge copies new/changed Hermes memory markdown
 * into `H:/prism/knowledge/hermes-brain/` with Obsidian-compatible frontmatter,
 * so Hermes's notes become first-class nodes in the vault graph.
 *
 * DISTINCT from `obsidian-memory-sync.mjs` (that syncs Claude/PRISM memories from
 * ~/.claude/projects/...); this one syncs HERMES's own memories. Different source,
 * different target dir (`hermes-brain/`) -- no duplication, no clobber.
 *
 * Idempotent: dedup by SHA-256 of the SOURCE BODY (stored in target frontmatter
 * as `hermes_src_sha256`). A re-run where the source is byte-equal to what we
 * already bridged is a no-op (skip). Source is authoritative -- a changed source
 * overwrites the target body (frontmatter regenerated).
 *
 * Fail-soft by design: missing source dir, empty source dir, malformed/empty
 * individual files never crash the run -- they are skipped with a warning and the
 * process still exits 0 (so a Stop hook / cron can call it unconditionally).
 *
 * Usage:
 *   node scripts/hermes-obsidian-memory-bridge.mjs [--dry-run] [--quiet]
 *        [--source <dir>] [--target <dir>] [--json]
 *
 * Exit codes: 0 = success (incl. nothing-to-do / fail-soft skips).
 *             2 = hard error (target dir unwritable, etc.).
 *
 * Exported for tests: `bridgeHermesMemories(opts)`.
 *
 * Pure fs/crypto. No subprocess spawning of any kind.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

// -- Default paths -------------------------------------------------------------
// %LOCALAPPDATA% on Windows; fall back to the conventional path so the script is
// runnable on a machine where the env var is not set (e.g. a CI fixture run).
function defaultHermesMemoriesDir() {
  const localAppData =
    process.env.LOCALAPPDATA ||
    (process.platform === 'win32'
      ? path.join(os.homedir(), 'AppData', 'Local')
      : path.join(os.homedir(), '.local', 'share'));
  return path.join(localAppData, 'hermes', 'memories');
}

const DEFAULT_SOURCE = defaultHermesMemoriesDir();
const DEFAULT_TARGET = 'H:/prism/knowledge/hermes-brain';

// -- SHA-256 helper ------------------------------------------------------------
function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

// -- Frontmatter parsing/stripping ---------------------------------------------
// A source file MAY already carry its own `---` frontmatter. We strip it from the
// body before hashing + re-wrapping so (a) the dedup hash is stable regardless of
// our injected metadata, and (b) we never nest two frontmatter blocks.
const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function splitFrontmatter(raw) {
  const m = FM_RE.exec(raw);
  if (!m) return { frontmatter: null, body: raw };
  return { frontmatter: m[1], body: raw.slice(m[0].length) };
}

// Pull an existing `hermes_src_sha256:` out of a target file's frontmatter (used
// to detect a byte-equal source we already bridged -- the dedup skip path).
function existingSrcHash(targetRaw) {
  const { frontmatter } = splitFrontmatter(targetRaw);
  if (!frontmatter) return null;
  const line = frontmatter
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith('hermes_src_sha256:'));
  if (!line) return null;
  return line.split(':').slice(1).join(':').trim() || null;
}

// -- YAML-string escaping (description field may contain quotes/newlines) -------
function yamlQuote(s) {
  return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ') + '"';
}

// Derive a one-line description from the body's first non-empty, non-heading line.
function deriveDescription(body) {
  const firstLine = body
    .split(/\r?\n/)
    .map((l) => l.replace(/^#+\s*/, '').trim())
    .find((l) => l.length > 0);
  if (!firstLine) return 'Hermes agent memory';
  return firstLine.length > 200 ? firstLine.slice(0, 197) + '...' : firstLine;
}

function buildFrontmatter({ name, body, srcSha, sourceRel, mtimeIso }) {
  return [
    '---',
    `name: ${name}`,
    `description: ${yamlQuote(deriveDescription(body))}`,
    `aliases: ${name}`,
    'type: hermes-memory',
    'source: hermes-agent',
    `hermes_src_path: ${sourceRel.replace(/\\/g, '/')}`,
    `hermes_src_sha256: ${srcSha}`,
    `hermes_src_mtime: ${mtimeIso}`,
    `synced: ${new Date().toISOString()}`,
    '---',
    '',
  ].join('\n');
}

// -- Recursive .md walk --------------------------------------------------------
function walkMarkdown(dir, base = dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc; // unreadable subdir -- fail-soft skip
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkMarkdown(full, base, acc);
    } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.md')) {
      acc.push({ full, rel: path.relative(base, full) });
    }
  }
  return acc;
}

// -- Atomic write (tmp + rename) -----------------------------------------------
function atomicWrite(targetPath, content) {
  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(targetPath)}.tmp-${process.pid}-${Date.now()}`);
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, targetPath);
}

/**
 * Core bridge routine.
 * @returns {{copied:number, skipped:number, malformed:number, total:number,
 *            sourceMissing:boolean, results:Array}}
 */
export function bridgeHermesMemories(opts = {}) {
  const source = opts.source || DEFAULT_SOURCE;
  const target = opts.target || DEFAULT_TARGET;
  const dryRun = !!opts.dryRun;
  const log = opts.quiet ? () => {} : (opts.log || console.log);

  const summary = {
    source,
    target,
    copied: 0,
    skipped: 0,
    malformed: 0,
    total: 0,
    sourceMissing: false,
    results: [],
  };

  // Missing source dir -> fail-soft (Hermes not installed / no memories yet).
  if (!fs.existsSync(source)) {
    summary.sourceMissing = true;
    log(`[hermes-bridge] source dir not found (fail-soft): ${source}`);
    return summary;
  }

  const files = walkMarkdown(source);
  summary.total = files.length;
  if (files.length === 0) {
    log(`[hermes-bridge] no .md memories in ${source} (nothing to bridge)`);
    return summary;
  }

  for (const { full, rel } of files) {
    let raw;
    try {
      raw = fs.readFileSync(full, 'utf8');
    } catch (e) {
      summary.malformed++;
      summary.results.push({ rel, action: 'unreadable', error: String(e) });
      log(`[hermes-bridge] WARN unreadable, skipping: ${rel}`);
      continue;
    }

    // Malformed / empty input -> fail-soft skip (R12: surface it, don't crash).
    if (!raw || !raw.trim()) {
      summary.malformed++;
      summary.results.push({ rel, action: 'empty-skip' });
      log(`[hermes-bridge] WARN empty/blank, skipping: ${rel}`);
      continue;
    }

    const { body } = splitFrontmatter(raw);
    if (!body.trim()) {
      // File was nothing but a frontmatter block -- no real content to bridge.
      summary.malformed++;
      summary.results.push({ rel, action: 'no-body-skip' });
      log(`[hermes-bridge] WARN frontmatter-only (no body), skipping: ${rel}`);
      continue;
    }

    const srcSha = sha256(body);
    const name = path
      .basename(rel, '.md')
      .replace(/[^A-Za-z0-9._-]+/g, '_');
    const targetPath = path.join(target, path.dirname(rel), `${name}.md`);

    // Dedup: target already carries this exact source hash -> byte-equal skip.
    if (fs.existsSync(targetPath)) {
      let prevRaw = '';
      try {
        prevRaw = fs.readFileSync(targetPath, 'utf8');
      } catch {
        prevRaw = '';
      }
      if (existingSrcHash(prevRaw) === srcSha) {
        summary.skipped++;
        summary.results.push({ rel, action: 'skip-byte-equal', sha: srcSha });
        continue;
      }
    }

    let mtimeIso = new Date().toISOString();
    try {
      mtimeIso = fs.statSync(full).mtime.toISOString();
    } catch { /* keep default */ }

    const fm = buildFrontmatter({ name, body, srcSha, sourceRel: rel, mtimeIso });
    const out = fm + body.replace(/\s*$/, '') + '\n';

    if (dryRun) {
      summary.copied++; // count what WOULD be written
      summary.results.push({ rel, action: 'would-copy', sha: srcSha });
      log(`[hermes-bridge] DRY would copy: ${rel} -> ${targetPath}`);
      continue;
    }

    try {
      atomicWrite(targetPath, out);
      summary.copied++;
      summary.results.push({ rel, action: 'copied', sha: srcSha, targetPath });
      log(`[hermes-bridge] copied: ${rel} -> ${targetPath}`);
    } catch (e) {
      // Target unwritable for THIS file -- record, keep going (don't abort run).
      summary.malformed++;
      summary.results.push({ rel, action: 'write-failed', error: String(e) });
      log(`[hermes-bridge] WARN write failed, skipping: ${rel} (${e})`);
    }
  }

  log(
    `[hermes-bridge] done: ${summary.copied} copied, ${summary.skipped} byte-equal-skipped, ` +
      `${summary.malformed} malformed/skipped of ${summary.total} source files`
  );
  return summary;
}

// -- CLI -----------------------------------------------------------------------
function parseArgs(argv) {
  const a = { dryRun: false, quiet: false, json: false };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--dry-run') a.dryRun = true;
    else if (t === '--quiet') a.quiet = true;
    else if (t === '--json') a.json = true;
    else if (t === '--source') a.source = argv[++i];
    else if (t === '--target') a.target = argv[++i];
  }
  return a;
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  const args = parseArgs(process.argv);
  try {
    const res = bridgeHermesMemories(args);
    if (args.json) {
      process.stdout.write(JSON.stringify(res, null, 2) + '\n');
    }
    process.exit(0);
  } catch (e) {
    console.error(`[hermes-bridge] FATAL: ${e && e.stack ? e.stack : e}`);
    process.exit(2);
  }
}
