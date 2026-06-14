#!/usr/bin/env node
/**
 * tribal-embed-index.mjs — L1 of TRIBAL × AI stack
 *
 * Unified vector index across the four tribal corpora:
 *   1. knowledge/wiki/**\/*.md
 *   2. knowledge/memories/**\/*.md
 *   3. mcp-server/data/state/extraction-log.json
 *   4. (optional) Obsidian vault — registered via tribal-obsidian-mirror.mjs
 *
 * Embedding:  Ollama nomic-embed-text:latest @ 127.0.0.1:11434  (768-dim)
 * Storage:    H:/prism/state/shared/tribal-embed-index.json (atomic write)
 *
 * Subcommands:
 *   --bootstrap          full walk + embed (overwrites index)
 *   --update             only re-embed entries whose hash changed
 *   --add <path>         embed a single file and append/replace
 *   --query "<text>"     embed query, return top-N (default 5)
 *   --stats              print corpus + domain breakdown
 *
 * Architecture: ranking is delegated to tribal-rerank.mjs (L2).
 * This script ONLY builds the index. Keep cosine similarity here too
 * so --query works end-to-end without depending on L2.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
// Cap-safe read: tribal-embed-index.json crossed V8's 512MiB max string length
// (2026-06-08). A raw JSON.parse(readFileSync(...,"utf8")) throws on it — and
// this script's old fail-OPEN catch (return fresh empty index) then CLOBBERED
// the real 537MB/33,639-entry index on the next write. [[reference_tribal_index_v8_string_cap_2026_06_08]]
import { loadTribalIndex } from "../../scripts/lib/load-tribal-index.mjs";
// Shard-aware, V8-cap-safe writer (the write half of the 2026-06-08 cap fix):
// monolith below ~480 MiB (unchanged for the live index), N shards + manifest
// above it so JSON.stringify never throws on a >512 MiB object.
import { writeTribalIndex } from "../../scripts/lib/write-tribal-index.mjs";
import { withTribalIndexLock, EXIT_TRIBAL_INDEX_LOCK_SKIP } from "../../scripts/lib/tribal-index-lock.mjs";

// Stale-steal window for the index write lock. The default 30s is for the quick
// sibling-embedder critical sections; OURS re-reads + clobber-guard-reads +
// (shard-)writes the whole 534MB+ index per checkpoint (~15-20s at scale), so a
// 30s window risks a peer wrongly stealing the lock mid-write. 120s is well past
// the worst-case hold. (U-TRIBAL-EMBED-LOCK 2026-06-10.)
const LOCK_STALE_MS = Number(process.env.PRISM_TRIBAL_EMBED_LOCK_STALE_MS) || 120_000;

/**
 * Merge freshly-embedded entries (`staged`, id->record) onto a FRESH on-disk read
 * (`freshEntries`), returning the unioned entry array. Peer-added/updated entries
 * present on disk but NOT in `staged` are preserved (no lost-update); our staged
 * embeds WIN for the ids we just (re-)embedded. Pure + exported for the hermetic
 * suite. The caller runs this INSIDE the index write lock, on a re-read taken
 * inside the lock (the index may have changed during the minutes-long embed).
 */
export function mergeStagedEntries(freshEntries, staged) {
  const m = new Map((freshEntries || []).map((e) => [e && e.id, e]));
  for (const [id, rec] of staged) m.set(id, rec); // our fresh embeds overlay
  return [...m.values()];
}

const PRISM = "H:/prism";
// Env-overridable so the clobber-guard tests can run against a tmp index (and
// consistent with the sibling embed-wiki-into-tribal-index.mjs).
const INDEX_PATH = process.env.PRISM_TRIBAL_INDEX_PATH || `${PRISM}/state/shared/tribal-embed-index.json`;
const OLLAMA_URL = "http://127.0.0.1:11434";
const MODEL = "nomic-embed-text:latest";
const DIM = 768;
const TEXT_CAP = 2000; // chars per entry — keeps embed call <30ms

// -- args -------------------------------------------------------------
function parseArgs() {
  const a = process.argv.slice(2);
  const opts = { _: [] };
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const k = a[i].slice(2);
      const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
      opts[k] = v;
    } else opts._.push(a[i]);
  }
  return opts;
}

// -- corpus walk ------------------------------------------------------
function walkMd(root) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { continue; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name.startsWith(".")) continue;
        stack.push(p);
      } else if (e.isFile() && e.name.endsWith(".md")) {
        out.push(p.replace(/\\/g, "/"));
      }
    }
  }
  return out;
}

function readExtractionLog() {
  const p = `${PRISM}/mcp-server/data/state/extraction-log.json`;
  if (!fs.existsSync(p)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    const records = Array.isArray(raw) ? raw : raw.records || raw.entries || [];
    return records.map((r, i) => ({
      synthetic: true,
      id: `extraction-log:${r.id || r.sha || i}`,
      source: "extraction-log",
      title: r.title || r.summary || r.kind || `extraction-${i}`,
      domain: r.domain || r.category || "general",
      text: [r.title, r.summary, r.body, r.text, r.message]
        .filter(Boolean).join("\n\n").slice(0, TEXT_CAP),
      path: p,
    })).filter((r) => r.text && r.text.length > 20);
  } catch (e) {
    console.error(`[warn] extraction-log parse failed: ${e.message}`);
    return [];
  }
}

// -- domain inference -------------------------------------------------
function inferDomain(filePath, text) {
  const p = filePath.toLowerCase();
  const t = (text || "").toLowerCase().slice(0, 500);
  // Path-based first (highest signal)
  if (p.includes("wedm") || p.includes("edm")) return "wedm";
  if (p.includes("lathe") || p.includes("turning")) return "lathe";
  if (p.includes("mill")) return "mill";
  if (p.includes("cad")) return "cad";
  if (p.includes("cam")) return "cam";
  // Text-based fallback
  if (/\bwire edm\b|\bwedm\b|\bsodick\b|\bmitsubishi\b/.test(t)) return "wedm";
  if (/\bturning\b|\blathe\b|\bokuma\b|\bmazak\b/.test(t)) return "lathe";
  if (/\bmilling\b|\bmill\b|\bkienzle\b|\btaylor\b/.test(t)) return "mill";
  if (/\bcad\b|\bsketch\b|\bextrude\b/.test(t)) return "cad";
  if (/\bcam\b|\bpost\b|\bmastercam\b|\bhypermill\b|\bfusion\b/.test(t)) return "cam";
  return "general";
}

function readMdEntry(filePath) {
  let raw;
  try { raw = fs.readFileSync(filePath, "utf8"); }
  catch { return null; }
  // Strip frontmatter for embedding
  let body = raw;
  let title = "";
  if (raw.startsWith("---")) {
    const end = raw.indexOf("\n---", 3);
    if (end > 0) {
      const fm = raw.slice(3, end);
      body = raw.slice(end + 4);
      const tm = fm.match(/^name:\s*(.+)$/m) || fm.match(/^title:\s*(.+)$/m);
      if (tm) title = tm[1].trim();
    }
  }
  if (!title) {
    const h = body.match(/^#\s+(.+)$/m);
    title = h ? h[1].trim() : path.basename(filePath, ".md");
  }
  const text = body.replace(/\s+/g, " ").trim().slice(0, TEXT_CAP);
  if (!text || text.length < 20) return null;
  const rel = filePath.startsWith(PRISM + "/") ? filePath.slice(PRISM.length + 1) : filePath;
  const source = rel.includes("/wiki/") ? "wiki"
              : rel.includes("/memories/") ? "memory"
              : "external";
  return {
    id: `${source}:${rel}`,
    source,
    title,
    domain: inferDomain(filePath, text),
    text,
    path: rel,
  };
}

// -- embedding --------------------------------------------------------
async function embed(text) {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt: text }),
  });
  if (!res.ok) throw new Error(`ollama embed ${res.status}: ${await res.text()}`);
  const j = await res.json();
  if (!Array.isArray(j.embedding) || j.embedding.length !== DIM) {
    throw new Error(`ollama returned bad embedding (len=${j.embedding?.length})`);
  }
  return j.embedding;
}

function hashText(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

// -- index io (atomic) ------------------------------------------------
export function readIndex() {
  // MANIFEST-AWARE existence (U-TRIBAL-EMBED-SHARD-READ-FIX 2026-06-10): a SHARDED
  // index has NO monolith .json (the shard writer's retireSupersededArtifacts
  // removes it) but IS present as a sibling .manifest.json + shard files. Checking
  // only INDEX_PATH wrongly returned an EMPTY base the instant the index first
  // crossed ~480 MiB and sharded -> the caller merged staged-only + writeIndex's
  // removeShardLayout then DELETED the shards = BRAIN CLOBBER (observed live: a
  // 29,723-entry index dropped to staged-only mid-batch). loadTribalIndex is
  // manifest-aware, so only return the empty bootstrap base when NEITHER the
  // monolith NOR the manifest exists.
  const manifestPath = INDEX_PATH.replace(/\.json$/i, "") + ".manifest.json";
  if (!fs.existsSync(INDEX_PATH) && !fs.existsSync(manifestPath)) {
    return { schemaVersion: "1.0.0", model: MODEL, dim: DIM, generatedAt: null, entries: [] };
  }
  // Cap-safe + shard-aware. CRITICAL: if an index EXISTS (monolith or sharded) but
  // cannot be loaded, FAIL LOUD -- do NOT return a fresh empty index. The caller
  // splices candidates onto this base and writeIndex()s it, so returning empty
  // CLOBBERS the real index (exactly how the 537MB/33,639-entry brain was destroyed
  // 2026-06-08). A genuine rebuild is opt-in via --bootstrap, never an accident.
  try { return loadTribalIndex(INDEX_PATH, fs); }
  catch (e) {
    throw new Error(
      `[FATAL] tribal index exists at ${INDEX_PATH} (or its manifest) but failed to load ` +
      `(${e.message}). Refusing to start fresh -- that would CLOBBER the index on the next ` +
      `write. Repair the index or run --bootstrap explicitly to intentionally rebuild.`,
    );
  }
}

export function writeIndex(idx) {
  // Clobber guard (defense-in-depth, 2026-06-08): never silently replace a
  // populated index with a far smaller one. This index was destroyed 3x
  // (key-scheme 2026-05-22 + V8-cap fail-open 2026-06-08 + shard-read-blind
  // 2026-06-10). A >50% shrink (or to 0) over a populated index aborts unless
  // explicitly allowed -- an intentional prune sets PRISM_TRIBAL_ALLOW_SHRINK=1.
  // MANIFEST-AWARE (U-TRIBAL-EMBED-SHARD-READ-FIX 2026-06-10): when the index is
  // SHARDED the monolith .json is gone, so a monolith-only existsSync made this
  // guard SILENTLY NOT RUN -> it could not catch the shard-transition clobber
  // (that destroyed the 29,723-entry brain). Check the manifest too; loadTribalIndex
  // reads either layout for the prevCount.
  const manifestPath = INDEX_PATH.replace(/\.json$/i, "") + ".manifest.json";
  if (fs.existsSync(INDEX_PATH) || fs.existsSync(manifestPath)) {
    let prevCount = 0;
    try { prevCount = (loadTribalIndex(INDEX_PATH, fs).entries || []).length; } catch { prevCount = -1; }
    const newCount = (idx.entries || []).length;
    const allowShrink = process.env.PRISM_TRIBAL_ALLOW_SHRINK === "1";
    if (!allowShrink && prevCount > 100 && newCount < prevCount * 0.5) {
      throw new Error(
        `[FATAL] refusing to write tribal index: would shrink ${prevCount} -> ${newCount} ` +
        `entries (>50% loss) -- this is the clobber that destroyed the brain. Set ` +
        `PRISM_TRIBAL_ALLOW_SHRINK=1 to override (intentional prune/rebuild only).`,
      );
    }
  }
  // Shard-aware + atomic. Below ~480 MiB this is the same single-file monolith
  // write as before (JSON.stringify cap-safe); above it, N shards + a manifest
  // so the write never throws on a >512 MiB object. The clobber-guard above is
  // now manifest-aware (it runs against the merged entry count via loadTribalIndex
  // whether the prior layout was monolith OR sharded).
  writeTribalIndex(idx, INDEX_PATH);
}

// -- entry processing -------------------------------------------------
async function buildOrUpdate(mode) {
  const idx = mode === "bootstrap"
    ? { schemaVersion: "1.0.0", model: MODEL, dim: DIM, generatedAt: null, entries: [] }
    : readIndex();
  const existing = new Map(idx.entries.map((e) => [e.id, e]));

  const wiki = walkMd(`${PRISM}/knowledge/wiki`);
  const mems = walkMd(`${PRISM}/knowledge/memories`);
  const candidates = [];
  for (const fp of [...wiki, ...mems]) {
    const e = readMdEntry(fp);
    if (e) candidates.push(e);
  }
  candidates.push(...readExtractionLog());

  // Resumable batch (U-TRIBAL-EMBED-RESUMABLE 2026-06-10): a full re-embed of the
  // ~13K unembedded wiki files is a 20-40 min Ollama run, and the fleet-reaper
  // reaps long node procs under load. The prior single writeIndex-at-end made a
  // kill lose the WHOLE batch (the xray-OCR non-resumable-corpus-burn antipattern,
  // see CLAUDE.md Recent-regressions). Checkpoint every CHECKPOINT_EVERY successful
  // embeds: resume is FREE via the hash-skip above -- already-embedded entries
  // persist in the checkpointed index and are skipped on the next run. writeIndex
  // auto-shards past ~480 MiB and is clobber-guarded; the index only GROWS here so
  // the >50%-shrink guard never trips. Knob PRISM_TRIBAL_CHECKPOINT_EVERY (0 = the
  // old single end-write).
  const CHECKPOINT_EVERY = process.env.PRISM_TRIBAL_CHECKPOINT_EVERY !== undefined
    ? Number(process.env.PRISM_TRIBAL_CHECKPOINT_EVERY)
    : 500;
  // `staged` = ONLY the entries we (re-)embedded this batch (update mode). persist()
  // re-reads the index INSIDE the write lock and overlays `staged` so a concurrent
  // writer (tribal-autowire --add / a cron embedder) is never lost-updated
  // (U-TRIBAL-EMBED-LOCK 2026-06-10; the lock lib's SHORT-critical-section +
  // RE-READ-inside contract). A peer holding the lock defers this checkpoint --
  // staged is KEPT (idempotent), the next persist retries.
  const staged = new Map();
  const persist = () => {
    if (mode === "bootstrap") {
      // Authoritative full rebuild: direct write (a rebuild INTENDS to drop entries
      // not re-embedded, so it must NOT merge a stale on-disk read). Run --add /
      // cron embedders paused during a bootstrap. writeIndex's clobber-guard +
      // PRISM_TRIBAL_ALLOW_SHRINK still apply.
      idx.entries = [...existing.values()];
      idx.generatedAt = new Date().toISOString();
      writeIndex(idx);
      return { ran: true, value: idx.entries.length };
    }
    // update mode: concurrent-safe locked merge. readIndex() FAILS LOUD on an
    // exists-but-corrupt index (NEVER fail-open -> never clobber the brain to
    // staged-only; that was the 2026-06-08 destruction vector).
    const r = withTribalIndexLock(INDEX_PATH, () => {
      const fresh = readIndex(); // re-read INSIDE the lock (peer may have written)
      fresh.entries = mergeStagedEntries(fresh.entries, staged);
      fresh.generatedAt = new Date().toISOString();
      writeIndex(fresh);
      return fresh.entries.length;
    }, { staleMs: LOCK_STALE_MS });
    if (!r.ran) {
      process.stdout.write(`  [checkpoint] DEFERRED -- index lock held by a peer; ${staged.size} staged kept, retry next persist\n`);
    }
    return r;
  };
  let added = 0, updated = 0, skipped = 0, failed = 0;
  for (const c of candidates) {
    const hash = hashText(c.text);
    const prior = existing.get(c.id);
    if (prior && prior.hash === hash) { skipped++; continue; }
    try {
      const embedding = await embed(c.text);
      const rec = {
        id: c.id, source: c.source, domain: c.domain, title: c.title,
        path: c.path, text: c.text.slice(0, 400), // keep short snippet only
        hash, embedding,
      };
      existing.set(c.id, rec); // in-memory view for the hash skip-check
      staged.set(c.id, rec);   // batch embeds -> overlaid on a locked re-read in persist()
      if (prior) updated++; else added++;
      if ((added + updated) % 50 === 0) {
        process.stdout.write(`  embedded ${added + updated}/${candidates.length}\n`);
      }
      if (CHECKPOINT_EVERY > 0 && (added + updated) % CHECKPOINT_EVERY === 0) {
        const cp = persist(); // durable checkpoint -- a reaper-kill resumes via hash-skip
        if (cp.ran) {
          process.stdout.write(`  [checkpoint] persisted ${cp.value} entries at ${added + updated}/${candidates.length}\n`);
        }
      }
    } catch (e) {
      failed++;
      if (failed <= 3) console.error(`[fail] ${c.id}: ${e.message}`);
    }
  }
  const finalR = persist();
  if (!finalR.ran) {
    console.error(`[x] final persist DEFERRED -- index lock held by a peer; batch tail NOT written. Re-run to resume (resumable via hash-skip).`);
  }
  const total = finalR.ran && typeof finalR.value === "number" ? finalR.value : existing.size;
  return { added, updated, skipped, failed, total };
}

async function addOne(filePath) {
  const e = readMdEntry(path.resolve(filePath));
  if (!e) { console.error(`[skip] ${filePath} (unreadable or too small)`); return; }
  const hash = hashText(e.text);
  // Unlocked pre-check: skip the slow embed when this file is already current. A
  // read error here only skips the optimization (the locked write below re-reads
  // fail-loud), so it can never fail-open into a clobber.
  try {
    const pre = readIndex();
    if (pre.entries.find((x) => x && x.id === e.id)?.hash === hash) {
      console.log(`unchanged: ${e.id}`); return;
    }
  } catch { /* index missing/corrupt -> fall through; locked re-read decides loudly */ }
  const embedding = await embed(e.text); // SLOW -- OUTSIDE the lock
  const rec = { ...e, text: e.text.slice(0, 400), hash, embedding };
  // SHORT critical section: re-read INSIDE the lock (a peer / the batch may have
  // written during the embed), overlay this one entry, write. Serializes against
  // buildOrUpdate's persist() + sibling embedders on the same lock (U-TRIBAL-EMBED-LOCK).
  const r = withTribalIndexLock(INDEX_PATH, () => {
    const fresh = readIndex(); // fail-loud on corrupt -> never clobber
    fresh.entries = mergeStagedEntries(fresh.entries, new Map([[e.id, rec]]));
    fresh.generatedAt = new Date().toISOString();
    writeIndex(fresh);
    return fresh.entries.length;
  }, { staleMs: LOCK_STALE_MS });
  if (!r.ran) {
    console.error(`[x] tribal index held by a peer -- skip ${e.id}; re-run`);
    process.exit(EXIT_TRIBAL_INDEX_LOCK_SKIP);
  }
  console.log(`added/updated: ${e.id} (${r.value} total)`);
}

async function query(q, k = 5) {
  const idx = readIndex();
  if (idx.entries.length === 0) {
    console.error("index is empty — run --bootstrap first"); process.exit(2);
  }
  const qe = await embed(q);
  const scored = idx.entries.map((e) => ({ score: cosine(qe, e.embedding), e }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

function stats() {
  const idx = readIndex();
  const bySource = {}, byDomain = {};
  for (const e of idx.entries) {
    bySource[e.source] = (bySource[e.source] || 0) + 1;
    byDomain[e.domain] = (byDomain[e.domain] || 0) + 1;
  }
  console.log(`TRIBAL EMBED INDEX`);
  console.log(`==================`);
  console.log(`Total entries: ${idx.entries.length}`);
  console.log(`Generated:     ${idx.generatedAt || "(never)"}`);
  console.log(`Model:         ${idx.model} (${idx.dim}-dim)`);
  console.log(`\nBy source:`);
  for (const [k, v] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(16)} ${v}`);
  }
  console.log(`\nBy domain:`);
  for (const [k, v] of Object.entries(byDomain).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(16)} ${v}`);
  }
}

// -- main -------------------------------------------------------------
// Only run the CLI when invoked directly — guarded so a test can `import` the
// exported readIndex/writeIndex without triggering the CLI (or an embed run).
const isMain = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
if (isMain) {
  void (async () => {
    const opts = parseArgs();
    const cmd = opts.bootstrap ? "bootstrap"
              : opts.update    ? "update"
              : opts.add       ? "add"
              : opts.query     ? "query"
              : opts.stats     ? "stats"
              : null;
    if (!cmd) {
      console.error("usage: tribal-embed-index.mjs --bootstrap|--update|--add <path>|--query <text>|--stats");
      process.exit(1);
    }
    try {
      if (cmd === "bootstrap" || cmd === "update") {
        const r = await buildOrUpdate(cmd);
        console.log(`${cmd}: added=${r.added} updated=${r.updated} skipped=${r.skipped} failed=${r.failed} total=${r.total}`);
      } else if (cmd === "add") {
        await addOne(opts.add);
      } else if (cmd === "query") {
        const k = Number(opts.k) || 5;
        const hits = await query(opts.query, k);
        for (const h of hits) {
          console.log(`${h.score.toFixed(4)}  [${h.e.domain}] ${h.e.id}`);
          console.log(`         ${h.e.title}`);
        }
      } else if (cmd === "stats") {
        stats();
      }
    } catch (e) {
      console.error(`error: ${e.message}`);
      process.exit(2);
    }
  })();
}
