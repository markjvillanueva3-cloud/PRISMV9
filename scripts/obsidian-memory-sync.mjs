#!/usr/bin/env node
/**
 * obsidian-memory-sync.mjs — Sync PRISM memories to Obsidian vault
 *
 * Converts PRISM memory system to Obsidian-compatible markdown:
 * 1. Reads memory files from ~/.claude/projects/H--prism/memory/
 * 2. Converts to Obsidian format with [[wikilinks]]
 * 3. Creates relationship links between related memories
 * 4. Syncs tribal knowledge tips
 *
 * Usage: node scripts/obsidian-memory-sync.mjs [--watch] [--dry-run]
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { galaxyForSlot, KNOWN_GALAXIES } from '../.claude/helpers/mcp-tool-domains.mjs';
import { resolveObsidianMemDir } from './lib/obsidian-mem-dir.mjs';

// Single-sourced with the post-ship retention pipeline (distill-session-learnings.mjs
// + handoff-memory-seed.mjs) via resolveObsidianMemDir() — homedir-derived, honors
// PRISM_OBSIDIAN_MEM_DIR/PRISM_MEMORY_DIR. Default is byte-identical to the prior
// hardcoded 'C:/Users/wompu/.claude/projects/H--prism/memory' on this box. Closes the
// U-OBS-MEMDIR-HOMEDIR reviewer-C P1: this C:->H: feed previously ignored the env vars
// the rest of the recall pipeline honors, so a set PRISM_MEMORY_DIR would re-split-brain.
const MEMORY_SOURCE = resolveObsidianMemDir();
const OBSIDIAN_VAULT = 'H:/prism/knowledge';
const TRIBAL_SOURCE = 'H:/prism/mcp-server/data/tribal-tips';

const quiet = process.argv.includes('--quiet');
const dryRun = process.argv.includes('--dry-run');
const log = quiet ? () => {} : console.log;

// Per-galaxy memory routing (U-GALAXY-MEMORY). Off-switch reverts to the exact
// prior behavior (type-routed only, no galaxies/ namespace).
const GALAXY_ROUTE_DISABLE = process.env.PRISM_GALAXY_MEMORY_ROUTE_DISABLE === '1';

// Per-galaxy MEMORY.md INDEX mirror (U-FLEET-P3-GALAXY-MEMORY-OBSIDIAN-MIRROR).
// The 34 `engines/<galaxy>/MEMORY.md` per-domain brain INDEX files are a DISTINCT
// source from the routed slot memories above — syncMemories() explicitly filters
// `f !== 'MEMORY.md'`, so these INDEX files were never mirrored into the vault and
// are invisible to Obsidian's graph + the bridge-v2 backlink pass. This NEW mirror
// copies them into memories/galaxies/<galaxy>/MEMORY.md (a filename the routed copies
// never use), so it cannot duplicate/clobber the ~141 routed feedback_*/reference_*
// files already there. Default OFF — existing callers see ZERO behavior change unless
// PRISM_GALAXY_MEMORY_OBSIDIAN_MIRROR=1 is set.
const GALAXY_INDEX_MIRROR_ENABLE = process.env.PRISM_GALAXY_MEMORY_OBSIDIAN_MIRROR === '1';

// Source root for the per-galaxy MEMORY.md INDEX files. Default is the live engines
// tree; tests inject a fixture root. The top-level `engines/MEMORY.md` (the parent-dir
// index, NOT a galaxy) is excluded by globbing one level DOWN (`<dir>/MEMORY.md`).
const ENGINES_ROOT = 'H:/prism/mcp-server/src/engines';

// --- Concurrency guard ----------------------------------------------------
// Multiple Stop hooks (stop-obsidian-memory-extract + stop-obsidian-memory-feed)
// and 13 concurrent chats can spawn this script near-simultaneously. Bare
// fs.writeFileSync is not atomic, so two overlapping runs can interleave a
// partial write and corrupt a vault file. A single O_EXCL lockfile serializes
// runs: a second concurrent invocation exits cleanly (the first run already
// rewrites the WHOLE vault from the WHOLE memory dir, so skipping is lossless).
const LOCK_FILE = path.join(OBSIDIAN_VAULT, '.obsidian-memory-sync.lock');
const LOCK_STALE_MS = 120000; // a real sync is seconds; >2min = crashed holder

function acquireLock() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = fs.openSync(LOCK_FILE, 'wx'); // O_EXCL — fails if exists
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, ts: Date.now() }));
      fs.closeSync(fd);
      return true;
    } catch (e) {
      if (e.code !== 'EEXIST') return false; // unknown FS error — don't run
      let stale = false;
      try {
        const held = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
        stale = !held.ts || (Date.now() - held.ts) > LOCK_STALE_MS;
      } catch {
        stale = true; // unreadable/corrupt lock => treat as stale
      }
      if (!stale) return false; // another sync is genuinely active — skip
      try { fs.unlinkSync(LOCK_FILE); } catch { /* raced; loop retries */ }
    }
  }
  return false;
}

function releaseLock() {
  try { fs.unlinkSync(LOCK_FILE); } catch { /* already gone — fine */ }
}

// --- Legacy-root reconcile (non-destructive) ------------------------------
// Before the nested-`type:` parse fix, every memory mis-routed to memories/
// root instead of memories/<type>/. This MOVES (never deletes — see
// feedback_never_delete_only_disable) any root *.md that now has a correctly
// typed twin into memories/_legacy-root/ so the live folders are clean and
// nothing is lost. Idempotent: _legacy-root/ is not scanned; untwinned root
// files are left untouched (may be legit / not-yet-synced).
function reconcileLegacyRoot() {
  const memDir = path.join(OBSIDIAN_VAULT, 'memories');
  if (!fs.existsSync(memDir)) return 0;
  const typed = ['reference', 'feedback', 'project', 'user'];
  const quarantine = path.join(memDir, '_legacy-root');
  let moved = 0;
  let rootFiles;
  try {
    rootFiles = fs.readdirSync(memDir, { withFileTypes: true })
      .filter(d => d.isFile() && d.name.endsWith('.md'))
      .map(d => d.name);
  } catch { return 0; }
  for (const name of rootFiles) {
    const hasTwin = typed.some(t => fs.existsSync(path.join(memDir, t, name)));
    if (!hasTwin) continue; // no correctly-routed copy yet — leave it
    if (dryRun) { moved++; continue; }
    try {
      ensureDir(quarantine);
      fs.renameSync(path.join(memDir, name), path.join(quarantine, name));
      moved++;
    } catch {
      // cross-device or locked — copy+unlink fallback, still non-destructive
      try {
        fs.copyFileSync(path.join(memDir, name), path.join(quarantine, name));
        fs.unlinkSync(path.join(memDir, name));
        moved++;
      } catch { /* leave in place; next run retries */ }
    }
  }
  return moved;
}

// Quarantine stale per-galaxy copies (sibling to reconcileLegacyRoot). The per-galaxy
// full-rewrite does NOT remove a copy whose memory was reclassified to another galaxy or
// deleted from the C: source (syncMemories only visits files still present, and only ever
// WRITES into galaxy dirs). Given the authoritative set of current placements ("galaxy/file")
// from this run, MOVE any galaxies/<g>/<file>.md NOT in that set into galaxies/_stale/<g>/ —
// never delete (feedback_never_delete_only_disable). Idempotent + fail-soft. .gitkeep and
// README.md are skipped; _stale/ is not re-scanned. MEMORY.md is the mirrored
// per-galaxy index (written by syncGalaxyMemories) and is NEVER part of
// currentPlacements — excluding it from the scan keeps reconcile idempotent
// (otherwise every run quarantines + re-creates the mirrored MEMORY.md).
//
// @param {Set<string>} currentPlacements  — authoritative "galaxy/file" set this run.
// @param {string} [galaxiesRoot]          — galaxies dir root (tests inject a tmp dir;
//                                            defaults to the live vault for production).
export function reconcileGalaxies(currentPlacements, galaxiesRoot) {
  const root = galaxiesRoot || path.join(OBSIDIAN_VAULT, 'memories', 'galaxies');
  if (!fs.existsSync(root)) return 0;
  let quarantined = 0;
  let galaxyDirs;
  try {
    galaxyDirs = fs.readdirSync(root, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== '_stale')
      .map(d => d.name);
  } catch { return 0; }
  for (const g of galaxyDirs) {
    const gdir = path.join(root, g);
    let files;
    try {
      files = fs.readdirSync(gdir).filter(f => f.endsWith('.md') && f !== 'README.md' && f !== 'MEMORY.md');
    } catch { continue; }
    for (const f of files) {
      if (currentPlacements.has(`${g}/${f}`)) continue; // still belongs in this galaxy
      const dest = path.join(root, '_stale', g);
      try {
        ensureDir(dest);
        fs.renameSync(path.join(gdir, f), path.join(dest, f));
        quarantined++;
      } catch {
        // cross-device or locked — copy+unlink fallback, still non-destructive
        try {
          fs.copyFileSync(path.join(gdir, f), path.join(dest, f));
          fs.unlinkSync(path.join(gdir, f));
          quarantined++;
        } catch { /* leave in place; next run retries */ }
      }
    }
  }
  return quarantined;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Synchronous sleep (no async in this CLI). Same idiom as
// scripts/lib/exclusive-file-lock.mjs:53 — a 0-length Atomics.wait blocks the
// thread for `ms` without a busy-spin. Kept local (the lock helper is an
// O_EXCL acquirer, the wrong tool to import here).
function syncSleep(ms) {
  if (ms <= 0) return;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Transient Windows file-handle errors (OneDrive sync / AV scanner holds the
// handle for a few ms). UNKNOWN(-4094) is the libuv catch-all that the May-18
// sync log was littered with; EBUSY/EPERM/EACCES are the named siblings.
// ENOSPC / ENAMETOOLONG / non-coded throws are NOT transient — fail immediately.
const TRANSIENT_WRITE_CODES = new Set(['UNKNOWN', 'EBUSY', 'EPERM', 'EACCES']);

// Per-file write with bounded retry — the resilience fix (U-VAULT-SYNC-RESILIENT).
// Before this, a single locked file's throw aborted the ENTIRE C:->H: sync pass,
// silently skipping every alphabetically-later memory (the data-loss bug). Now a
// transient failure is retried (3 × 100ms) and a final/non-transient failure is
// surfaced to the caller as `{ok:false, error}` so the loop can count it and
// CONTINUE — fail-loud per file, never silent-abort the batch (R12).
//
// Exported + fully injectable so the retry/skip behavior is unit-testable without
// a real locked file (mirrors syncGalaxyMemories' injectable-IO convention).
export function writeWithRetry(
  targetPath,
  content,
  {
    fsImpl = fs,
    sleepImpl = syncSleep,
    ensureDirImpl = null,
    attempts = 3,
    backoffMs = 100,
  } = {},
) {
  const dir = path.dirname(targetPath);
  let lastErr = null;
  let made = 0; // attempts actually made — accurate even when a non-transient code breaks early
  for (let attempt = 1; attempt <= attempts; attempt++) {
    made = attempt;
    try {
      if (ensureDirImpl) ensureDirImpl(dir);
      else if (!fsImpl.existsSync(dir)) fsImpl.mkdirSync(dir, { recursive: true });
      fsImpl.writeFileSync(targetPath, content);
      return { ok: true, attempts: attempt };
    } catch (e) {
      lastErr = e;
      const transient = TRANSIENT_WRITE_CODES.has(e && e.code);
      // Non-transient → no point retrying; break to the fail path immediately.
      if (!transient) break;
      // Transient and not the last attempt → back off and retry.
      if (attempt < attempts) sleepImpl(backoffMs * attempt);
    }
  }
  return { ok: false, attempts: made, error: lastErr };
}

function parseMemoryFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      return { body: content, metadata: {} };
    }

    const frontmatter = frontmatterMatch[1];
    const body = frontmatterMatch[2];

    const metadata = {};
    for (const line of frontmatter.split('\n')) {
      const match = line.match(/^(\w+):\s*(.+)/);
      if (match) {
        metadata[match[1]] = match[2];
      }
    }

    // The auto-memory frontmatter format nests type under `metadata:` as
    // indented YAML:
    //   metadata:
    //     type: reference
    // The flat loop above only catches a top-level `type:`. Without this
    // fallback every nested-format memory file mis-routes to memories/ root
    // instead of memories/<type>/ — silently defeating the type-routed feed.
    // Scan for `type:` at ANY indentation as the source of truth.
    if (!metadata.type) {
      const t = frontmatter.match(/^\s*type:\s*([A-Za-z_-]+)/m);
      if (t) metadata.type = t[1].trim();
    }

    // slot/galaxy also nest under `metadata:` in auto-captured memories (like type).
    // Capture them at ANY indentation so per-galaxy memory routing can derive the
    // galaxy from the writing slot — write-time routing, NOT content classification
    // (the slot already KNOWS its galaxy; the content classifier mis-routed 79%).
    if (!metadata.slot) {
      const s = frontmatter.match(/^\s*slot:\s*([A-Za-z]+)/m);
      if (s) metadata.slot = s[1].trim();
    }
    if (!metadata.galaxy) {
      const g = frontmatter.match(/^\s*galaxy:\s*([A-Za-z0-9_-]+)/m);
      if (g) metadata.galaxy = g[1].trim();
    }

    // The flat loop captures the YAML parent line `metadata:` as a junk key
    // with a whitespace-only value (when the source line has trailing spaces).
    // Drop it so the emitted Obsidian frontmatter stays well-formed.
    if (metadata.metadata !== undefined && !String(metadata.metadata).trim()) {
      delete metadata.metadata;
    }

    return { body, metadata };
  } catch {
    return null;
  }
}

// EXISTENCE-GATED (OBSIDIAN-VAULT-SYNERGY/U-OBS-WIKILINK-DANGLING-FIX, 2026-06-09).
// This function previously emitted `[[engines/X]]`/`[[dispatchers/prism_X]]`/
// `[[skills/X]]` UNCONDITIONALLY — but `knowledge/{engines,dispatchers,skills}/`
// are not vault note dirs, so 100% of those links dangled (~15,819 broken links,
// 67% of all broken, re-written into `## Related` every sync). The greedy skill
// regex `/([a-z-]+)/g` was the worst offender — it matched every slash-word in
// file paths (`state/shared`→shared), code (`/null`), and slash-commands (`/goal`),
// producing pure noise. Now: emit a link ONLY when its target note actually exists
// in the vault (self-heals if real namespaced notes are ever added), and drop the
// unsalvageable skill regex (no reliable way to tell a /skill-command from a path
// in free text; real skill cross-refs come from authored [[links]] + the backlink
// pass). Allowlisting against the live skill manifest is a possible future re-add.
export function extractWikilinks(text, vaultRoot = OBSIDIAN_VAULT, noteExists = (rel) => fs.existsSync(path.join(vaultRoot, `${rel}.md`))) {
  const links = [];
  const addIfReal = (rel, display) => { if (noteExists(rel)) links.push(`[[${rel}|${display}]]`); };

  for (const e of text.match(/\b([A-Z][a-zA-Z]+Engine)\b/g) || []) addIfReal(`engines/${e}`, e);
  for (const d of text.match(/\bprism_(\w+)\b/g) || []) addIfReal(`dispatchers/${d}`, d);

  return [...new Set(links)];
}

function convertToObsidian(parsed, sourceFile) {
  const { body, metadata } = parsed;
  const fileName = path.basename(sourceFile, '.md');

  // Build Obsidian frontmatter
  const obsidianMeta = {
    ...metadata,
    source: 'prism-memory',
    synced: new Date().toISOString(),
    aliases: [fileName],
  };

  // Extract and add wikilinks
  const links = extractWikilinks(body);

  // Build content
  let content = '---\n';
  for (const [key, value] of Object.entries(obsidianMeta)) {
    content += `${key}: ${value}\n`;
  }
  content += '---\n\n';
  content += body;

  if (links.length > 0) {
    content += '\n\n## Related\n';
    content += links.slice(0, 10).join(' • ');
  }

  return content;
}

function getTargetDir(type) {
  const typeMap = {
    user: 'memories/user',
    feedback: 'memories/feedback',
    project: 'memories/project',
    reference: 'memories/reference',
  };
  return typeMap[type] || 'memories';
}

// Per-galaxy routing (U-GALAXY-MEMORY, slot:alpha 2026-05-28; realizes the
// U-GALAXY-MS1-C1 per-galaxy namespace). Derives a memory's galaxy WITHOUT content
// classification: an explicit `galaxy:` field (validated against KNOWN_GALAXIES, so a
// typo can't spawn a junk dir) wins, else the writing slot's known galaxy. Returns null
// when neither resolves -> the memory stays flat-type only (legacy + un-slotted memories
// are untouched). Centralizes on mcp-tool-domains.mjs SLOT_GALAXY (no 3rd copy).
function resolveMemoryGalaxy(metadata) {
  if (!metadata) return null;
  const explicit = metadata.galaxy && String(metadata.galaxy).trim().toLowerCase();
  if (explicit && KNOWN_GALAXIES.has(explicit)) return explicit;
  return galaxyForSlot(metadata.slot);
}

function syncMemories() {
  log('Syncing PRISM memories to Obsidian vault...');

  if (!fs.existsSync(MEMORY_SOURCE)) {
    log('Memory source not found:', MEMORY_SOURCE);
    return { synced: 0, errors: 0 };
  }

  let synced = 0;
  let errors = 0;
  let galaxyRouted = 0;
  const galaxyPlacements = new Set(); // "galaxy/file" of current routes — for reconcileGalaxies

  const files = fs.readdirSync(MEMORY_SOURCE).filter(f => f.endsWith('.md') && f !== 'MEMORY.md');

  for (const file of files) {
    const sourcePath = path.join(MEMORY_SOURCE, file);
    const parsed = parseMemoryFile(sourcePath);

    if (!parsed) {
      errors++;
      continue;
    }

    const targetDir = path.join(OBSIDIAN_VAULT, getTargetDir(parsed.metadata.type));
    const targetPath = path.join(targetDir, file);
    const obsidianContent = convertToObsidian(parsed, sourcePath);

    if (!dryRun) {
      // Resilient write: a transient OneDrive/AV file lock on THIS file must not
      // abort the whole pass (the pre-2026-06-08 data-loss bug). ensureDir is now
      // folded into the guarded write so dry-run is truly side-effect-free.
      const res = writeWithRetry(targetPath, obsidianContent, { ensureDirImpl: ensureDir });
      if (!res.ok) {
        errors++;
        log(`  Error writing ${file}: ${res.error && res.error.message}`);
        continue; // skip THIS file's galaxy copy too; never abort the batch
      }
    }

    // Per-galaxy namespace (additive, fail-soft, knob-gated). An extra copy into
    // memories/galaxies/<galaxy>/ for memories whose galaxy resolves from the writing
    // slot / explicit galaxy field. Current placements are recorded so reconcileGalaxies()
    // can quarantine stale copies after a slot/galaxy reclassification or a source deletion
    // — the full-rewrite alone does NOT clean those up (the same gap reconcileLegacyRoot
    // closes on the type-routed side). Isolated in its own try/catch: a galaxy-routing
    // failure NEVER affects the proven type-routed write above.
    if (!GALAXY_ROUTE_DISABLE) {
      try {
        const galaxy = resolveMemoryGalaxy(parsed.metadata);
        if (galaxy) {
          galaxyRouted++; // count in both modes so --dry-run reports the routing
          galaxyPlacements.add(`${galaxy}/${file}`); // authoritative current placement
          if (!dryRun) {
            const galaxyDir = path.join(OBSIDIAN_VAULT, 'memories', 'galaxies', galaxy);
            ensureDir(galaxyDir); // create on real run only — dry-run stays side-effect-free
            fs.writeFileSync(path.join(galaxyDir, file), obsidianContent);
          }
        }
      } catch { /* fail-soft — never block the type-routed feed */ }
    }

    log(`  ${dryRun ? '[DRY] ' : ''}${file} → ${getTargetDir(parsed.metadata.type)}/`);
    synced++;
  }

  return { synced, errors, galaxyRouted, galaxyPlacements };
}

// Parse a galaxy MEMORY.md INDEX file. Unlike the routed slot memories, these have
// NO YAML frontmatter — they open with a `# Title` H1 and carry [[wikilinks]] +
// `## Master-brain link` backlinks inline. We pull the first H1 as a title alias and
// return the body verbatim so every [[link]] survives for Obsidian's graph + bridge-v2.
// Fail-soft: unreadable/empty → null (caller skips). Pure given the file content.
export function parseGalaxyIndex(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null; // unreadable — skip
  }
  if (!content || !content.trim()) return null; // empty file — skip (adversarial)

  // First-line H1 (`# ...`) → title. Scan early lines only so a `#heading` deep in the
  // body can't be mistaken for the document title. Malformed (no H1) → fall back to the
  // basename so the mirror still lands with a usable alias rather than aborting.
  let title = null;
  const head = content.split('\n', 8);
  for (const line of head) {
    const m = line.match(/^#\s+(.+?)\s*$/);
    if (m) { title = m[1].trim(); break; }
  }
  return { body: content, title };
}

// Mirror the 34 per-galaxy `engines/<galaxy>/MEMORY.md` INDEX files into the Obsidian
// vault under memories/galaxies/<galaxy>/MEMORY.md. Each gets minimal Obsidian
// frontmatter (so the vault graph + bridge-v2 backlink pass index it) PREPENDED to the
// verbatim body (so every [[link]] + backlink survives). Idempotent full-rewrite.
//
// SAFETY (no-clobber): the routed slot copies already in memories/galaxies/<g>/ are all
// `feedback_*.md` / `reference_*.md` — NONE is named MEMORY.md — so writing MEMORY.md
// can never duplicate or overwrite them. We also never touch any other file in the dir.
//
// Karpathy discipline:
//   CLASSIFY: filesystem mirror / index-rewrite
//   TECHNIQUE: glob one level down (<dir>/MEMORY.md) so top-level engines/MEMORY.md is
//     excluded; per-galaxy try/catch so one bad file never aborts the rest
//   EDGE CASES: missing engines root, galaxy with no MEMORY.md, empty file, malformed
//     frontmatter, unreadable file, dry-run (no writes)
//   FAILURE MODES: every read/write is wrapped; a failure increments errors + continues
//
// @param {object} [opts]
// @param {string} [opts.enginesRoot=ENGINES_ROOT] — source root (tests inject a fixture)
// @param {string} [opts.vaultRoot=OBSIDIAN_VAULT]  — vault root (tests inject a tmp dir)
// @param {boolean} [opts.dry=dryRun]               — when true, no files are written
// @returns {{mirrored:number, skipped:number, errors:number, galaxies:string[]}}
export function syncGalaxyMemories(opts = {}) {
  const enginesRoot = opts.enginesRoot || ENGINES_ROOT;
  const vaultRoot = opts.vaultRoot || OBSIDIAN_VAULT;
  const dry = opts.dry !== undefined ? opts.dry : dryRun;

  log('Mirroring per-galaxy MEMORY.md INDEX files to Obsidian vault...');

  const result = { mirrored: 0, skipped: 0, errors: 0, galaxies: [] };

  // Missing engines root → skip cleanly (fail-soft, e.g. a stripped-down checkout).
  let galaxyDirs;
  try {
    if (!fs.existsSync(enginesRoot)) {
      log(`  Engines root not found: ${enginesRoot} — skipping galaxy mirror`);
      return result;
    }
    galaxyDirs = fs.readdirSync(enginesRoot, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  } catch (e) {
    log(`  Could not read engines root: ${e.message} — skipping galaxy mirror`);
    return result;
  }

  const galaxiesVault = path.join(vaultRoot, 'memories', 'galaxies');

  for (const galaxy of galaxyDirs.sort()) {
    const sourcePath = path.join(enginesRoot, galaxy, 'MEMORY.md');
    // Missing galaxy MEMORY.md → skip (most engine subdirs have none; not an error).
    if (!fs.existsSync(sourcePath)) { result.skipped++; continue; }

    const parsed = parseGalaxyIndex(sourcePath);
    if (!parsed) { result.errors++; continue; } // empty/unreadable — counted, not fatal

    // Minimal Obsidian frontmatter. `galaxy:` + the alias make this discoverable in the
    // vault graph; `source: prism-galaxy-index` distinguishes it from routed slot copies.
    const fm = [
      '---',
      'type: galaxy-index',
      `galaxy: ${galaxy}`,
      'source: prism-galaxy-index',
      `synced: ${new Date().toISOString()}`,
      `aliases: [${galaxy}-galaxy-index]`,
      '---',
      '',
    ].join('\n');
    const out = fm + parsed.body;

    try {
      if (!dry) {
        const destDir = path.join(galaxiesVault, galaxy);
        ensureDir(destDir); // create on real run only — dry-run stays side-effect-free
        fs.writeFileSync(path.join(destDir, 'MEMORY.md'), out);
      }
      result.mirrored++;
      result.galaxies.push(galaxy);
      log(`  ${dry ? '[DRY] ' : ''}${galaxy}/MEMORY.md → memories/galaxies/${galaxy}/MEMORY.md`);
    } catch (e) {
      // Locked file / permission / cross-device — count + continue (fail-soft).
      result.errors++;
      log(`  Error mirroring ${galaxy}/MEMORY.md: ${e.message}`);
    }
  }

  return result;
}

function syncTribalKnowledge() {
  log('Syncing tribal knowledge to Obsidian...');

  const tribalDir = path.join(OBSIDIAN_VAULT, 'tribal');
  ensureDir(tribalDir);

  // Sync from JSON tips if available
  const tipsFiles = [
    'H:/prism/mcp-server/data/state/TRIBAL_TIPS_FULL.json',
    'H:/prism/mcp-server/data/tribal-tips/machining-tips.json',
  ];

  let synced = 0;

  for (const tipsFile of tipsFiles) {
    if (!fs.existsSync(tipsFile)) continue;

    try {
      const tips = JSON.parse(fs.readFileSync(tipsFile, 'utf8'));
      const tipsArray = Array.isArray(tips) ? tips : tips.tips || [];

      for (const tip of tipsArray.slice(0, 100)) {
        const id = tip.id || tip.tip_id || `tip-${synced}`;
        const fileName = `${id}.md`;
        const targetPath = path.join(tribalDir, fileName);

        const content = `---
type: tribal-tip
category: ${tip.category || 'general'}
source: ${tip.source || 'shop-floor'}
synced: ${new Date().toISOString()}
---

# ${tip.title || id}

${tip.content || tip.tip || tip.description || ''}

${tip.context ? `## Context\n${tip.context}` : ''}

${tip.tags ? `## Tags\n${tip.tags.map(t => `#${t}`).join(' ')}` : ''}
`;

        if (!dryRun) {
          fs.writeFileSync(targetPath, content);
        }
        synced++;
      }
    } catch (e) {
      log(`  Error reading ${tipsFile}: ${e.message}`);
    }
  }

  return synced;
}

function createVaultConfig() {
  // Create .obsidian folder with basic config
  const obsidianDir = path.join(OBSIDIAN_VAULT, '.obsidian');
  ensureDir(obsidianDir);

  // App config
  const appConfig = {
    alwaysUpdateLinks: true,
    newLinkFormat: 'relative',
    useMarkdownLinks: false,
    showFrontmatter: true,
  };

  if (!dryRun) {
    fs.writeFileSync(
      path.join(obsidianDir, 'app.json'),
      JSON.stringify(appConfig, null, 2)
    );
  }

  // Create MOC (Map of Content) file.
  // Links must point at notes/dirs that actually exist in the vault -- the old
  // Quick Links ([[engines/]], [[dispatchers/]], [[skills/]]) dangled 100% of
  // the time (same class of bug U-OBS-WIKILINK-DANGLING-FIX killed in
  // extractWikilinks). [[SYSTEM-MAP]] is the hand-authored top-level index this
  // template intentionally defers deep content to, so the auto-rewrite here
  // never clobbers it.
  const mocContent = `# PRISM Knowledge Vault

This vault syncs from PRISM's memory system.

**Start here: [[SYSTEM-MAP]]** -- every PRISM system (galaxy brains, memories, wiki, tribal,
system-viz, PSN, AI/LoRA/CAG/RAG, loops & harnesses, pipelines, skills, JM Die, awareness,
app features), where it lives, and how to query it.

## Memory Types
- [[memories/user/|User Memories]] -- User preferences, role, expertise
- [[memories/feedback/|Feedback]] -- Corrections and confirmations
- [[memories/project/|Project]] -- Ongoing work, goals, deadlines
- [[memories/reference/|Reference]] -- External system pointers
- [[memories/galaxies/|Per-Galaxy Memories]] -- 34 domain-routed namespaces

## Knowledge
- [[CODE-VAULT-MOC|Code Vault Map]] -- browse every code file (engines/dispatchers/schemas/hooks/scripts/...) by kind + galaxy
- [[tribal/|Tribal Knowledge]] -- Shop floor wisdom, machining tips
- [[wiki/index|Wiki Index]] -- 39K+ entries; query before re-deriving
- [[decisions/|Decisions]] -- Architecture and design decisions
- [[sessions/|Sessions]] -- Session handoffs and continuity
- [[hermes-outputs/|Hermes Outputs]] -- Hermes agent vault write-lane
- [[gsd/|GSD Protocol]] -- Get Shit Done operating doctrine
- [[h-drive-atlas/|H-Drive Atlas]] -- what lives where on the drive

## Views & corpora
- [[chat-archive/|Chat Archive]] -- 10.9K archived Claude session transcripts
- [[bases/|Bases]] -- live Obsidian Bases pivot views (memory-by-type, wiki-by-domain/slot)
- [[dataview/PRISM-DATAVIEW-QUERIES|Dataview Queries]] -- saved Dataview query catalog
- [[hermes-brain/|Hermes Brain]] -- Hermes agent persistent-memory notes
- [[jm-corpus/|JM Die Corpus]] -- JM Die shop document corpus
- [[claude-md/|CLAUDE.md Notes]] -- CLAUDE.md doctrine notes
- [[Skills/|Skills]] -- skill documentation notes

---
*Last sync: ${new Date().toISOString()}*
*Source: PRISM Memory System + Obsidian Sync*
`;

  if (!dryRun) {
    fs.writeFileSync(path.join(OBSIDIAN_VAULT, 'PRISM Knowledge Vault.md'), mocContent);
  }

  log('Created vault configuration and MOC');
}

function main() {
  log('=== PRISM → Obsidian Memory Sync ===');
  log(`Source: ${MEMORY_SOURCE}`);
  log(`Vault: ${OBSIDIAN_VAULT}`);
  if (dryRun) log('(DRY RUN - no files written)');
  log('');

  // Serialize concurrent runs (multiple Stop hooks × 13 chats). dry-run does
  // no writes so it needs no lock and must stay side-effect-free.
  if (!dryRun && !acquireLock()) {
    log('Another sync is in progress — skipping (lossless: it rewrites the whole vault).');
    return;
  }

  try {
    createVaultConfig();

    const memoryResult = syncMemories();
    log(`Memories: ${memoryResult.synced} synced, ${memoryResult.errors} errors`);
    log(`Per-galaxy routed: ${memoryResult.galaxyRouted} into memories/galaxies/<galaxy>/`);

    const reconciled = reconcileLegacyRoot();
    log(`Legacy-root reconciled: ${reconciled} moved to memories/_legacy-root/`);

    // Guarded by !GALAXY_ROUTE_DISABLE: when routing is OFF, galaxyPlacements is empty,
    // so running reconcile would quarantine EVERY existing galaxy copy. Skip it entirely
    // so the off-switch is a true no-op on the galaxies/ namespace.
    if (!dryRun && !GALAXY_ROUTE_DISABLE) {
      const galaxyStale = reconcileGalaxies(memoryResult.galaxyPlacements);
      log(`Galaxy stale-copies quarantined: ${galaxyStale} moved to memories/galaxies/_stale/`);
    }

    // Per-galaxy MEMORY.md INDEX mirror — default OFF (knob-gated). When disabled this
    // is a true no-op: no reads of the engines tree, no writes to memories/galaxies/.
    if (GALAXY_INDEX_MIRROR_ENABLE) {
      const galaxyIndex = syncGalaxyMemories();
      log(`Galaxy INDEX files: ${galaxyIndex.mirrored} mirrored, ${galaxyIndex.skipped} skipped (no MEMORY.md), ${galaxyIndex.errors} errors`);
    }

    const tribalCount = syncTribalKnowledge();
    log(`Tribal tips: ${tribalCount} synced`);

    log('');
    log('Done! Open Obsidian and select vault at:', OBSIDIAN_VAULT);
  } finally {
    if (!dryRun) releaseLock();
  }
}

// Run main() only when executed directly as a CLI (the Stop hooks spawn this script
// as a process). Importing the module — e.g. tests pulling in syncGalaxyMemories /
// parseGalaxyIndex — must NOT trigger a full vault rewrite. process.argv[1] is the
// invoked script path; compare against this module's own URL.
const isMain = (() => {
  try {
    if (!process.argv[1]) return false; // no script entry (e.g. `node -e`) — don't auto-run
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false; // can't resolve the entry — safer NOT to auto-rewrite the vault
  }
})();

if (isMain) {
  main();
}
