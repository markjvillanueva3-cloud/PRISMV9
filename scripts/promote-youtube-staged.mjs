#!/usr/bin/env node
/**
 * promote-youtube-staged.mjs -- ATTENDED promotion of staged YouTube tips into
 * TribalKnowledgeEngine + the wiki (U-YT-PROMOTE, slot:zulu 2026-06-12).
 *
 * The night lane (youtube-night-extract.mjs) extracts STAGING-ONLY: tips land
 * in state/shared/youtube-extraction/<videoId>.json and nothing touches the
 * shared tribal store unattended (the wf_eaeb1510 HARD-REJECT reason; clobber
 * precedent 8bf1873577). THIS script is the other half: an operator/day-chat
 * runs it to promote staged tips through the engine's U-TK01 content-dedup
 * ingest + per-video wiki entries, with a promotion ledger so nothing is
 * double-promoted.
 *
 * DRY-RUN BY DEFAULT. `--apply` executes. Per-artifact fail-soft: one bad
 * artifact never blocks the rest; the ledger marks a video promoted ONLY
 * after its ingest succeeded (a crash mid-run loses nothing -- re-run resumes).
 * LIVE evidence this lane is needed: <id>-tips-fallback.json siblings in the
 * staging dir are runs where the in-process engine ingest already failed.
 *
 * Reuses (clone-don't-fork) the exported ingestTips() + writeWikiEntry() from
 * youtube-free-extract.mjs -- one ingestion contract, two invocation times.
 *
 * Usage:
 *   node scripts/promote-youtube-staged.mjs              # dry-run report
 *   node scripts/promote-youtube-staged.mjs --apply      # promote + ledger
 *   node scripts/promote-youtube-staged.mjs --apply --no-wiki   # tribal only
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { resolve, join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");

export const STAGING_DIR = join(REPO_ROOT, "state", "shared", "youtube-extraction");
export const PROMOTED_LEDGER_PATH = join(STAGING_DIR, "promoted-ledger.json");
export const LEDGER_SCHEMA = "1.0.0";
// Non-artifact files that live in the staging dir (queue/ledgers/fallbacks).
const NON_ARTIFACT = /^(night-queue\.json|promoted-ledger\.json)$/;
const FALLBACK_SUFFIX = "-tips-fallback.json";

/** Pure: is this filename a primary extraction artifact? */
export function isArtifactFile(name) {
  return name.endsWith(".json") && !NON_ARTIFACT.test(name) && !name.endsWith(FALLBACK_SUFFIX);
}

/**
 * Pure: validate + normalize one parsed artifact. Returns {ok, videoId, meta,
 * tips} or {ok:false, reason}. An artifact is promotable when it carries meta
 * with a videoId and a non-empty tips array (transcript-only runs are not).
 */
export function normalizeArtifact(parsed, fileName) {
  if (!parsed || typeof parsed !== "object") return { ok: false, reason: `${fileName}: not an object` };
  const meta = parsed.meta;
  const videoId = meta && (meta.videoId || meta.video_id);
  if (!videoId) return { ok: false, reason: `${fileName}: missing meta.videoId` };
  const tips = Array.isArray(parsed.tips) ? parsed.tips : [];
  if (tips.length === 0) return { ok: false, reason: `${fileName}: no tips (transcript-only or empty extraction)` };
  return { ok: true, videoId, meta, tips };
}

/** Pure: read ledger object -> Map(videoId -> row). Tolerates absent/empty. */
export function ledgerMap(ledgerJson) {
  const m = new Map();
  const promoted = ledgerJson && ledgerJson.promoted;
  if (promoted && typeof promoted === "object") {
    for (const [k, v] of Object.entries(promoted)) m.set(k, v);
  }
  return m;
}

/** Pure: select artifacts to promote (valid + not already in the ledger). */
export function selectPromotable(normalized, ledger) {
  return normalized.filter((a) => a.ok && !ledger.has(a.videoId));
}

/**
 * Promote the selected artifacts. Injectable ingest/wiki/saveLedger for the
 * hermetic suite. Ledger is persisted AFTER EACH successful ingest (durable
 * resume point), never on failure.
 */
export async function promote(selected, opts = {}) {
  const {
    ingestImpl, wikiImpl, saveLedgerImpl, ledger = new Map(),
    wiki = true, nowIso = () => new Date().toISOString(),
  } = opts;
  const out = { promoted: 0, failed: 0, tipsIngested: 0, rows: [] };
  for (const a of selected) {
    try {
      const ing = await ingestImpl(a.tips, a.meta);
      if (!ing || ing.ok !== true) throw new Error(`ingest failed: ${(ing && ing.error) || "no result"}`);
      let wikiPath = null;
      if (wiki && wikiImpl) {
        try { wikiPath = wikiImpl(a.tips, a.meta); }
        catch (e) { out.rows.push({ videoId: a.videoId, warn: `wiki write failed (tribal ingest OK): ${e.message}` }); }
      }
      ledger.set(a.videoId, { at: nowIso(), tipCount: a.tips.length, ingested: ing.ingested ?? a.tips.length, ...(wikiPath ? { wikiPath } : {}) });
      saveLedgerImpl(ledger);
      out.promoted++;
      out.tipsIngested += a.tips.length;
      out.rows.push({ videoId: a.videoId, ok: true, tips: a.tips.length });
    } catch (e) {
      out.failed++;
      out.rows.push({ videoId: a.videoId, ok: false, error: String(e?.message || e).slice(0, 300) });
    }
  }
  return out;
}

function loadLedger() {
  try { return JSON.parse(readFileSync(PROMOTED_LEDGER_PATH, "utf8")); } catch { return { schemaVersion: LEDGER_SCHEMA, promoted: {} }; }
}

function saveLedgerDefault(map) {
  const obj = { schemaVersion: LEDGER_SCHEMA, promoted: Object.fromEntries(map) };
  mkdirSync(dirname(PROMOTED_LEDGER_PATH), { recursive: true });
  const tmp = PROMOTED_LEDGER_PATH + ".tmp." + process.pid;
  writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
  renameSync(tmp, PROMOTED_LEDGER_PATH);
}

export async function main(argv = process.argv.slice(2)) {
  const apply = argv.includes("--apply");
  const wiki = !argv.includes("--no-wiki");

  if (!existsSync(STAGING_DIR)) { console.error(`[yt-promote] staging dir missing: ${STAGING_DIR}`); return 1; }
  const files = readdirSync(STAGING_DIR).filter(isArtifactFile);
  const normalized = [];
  for (const f of files) {
    try { normalized.push(normalizeArtifact(JSON.parse(readFileSync(join(STAGING_DIR, f), "utf8")), f)); }
    catch (e) { normalized.push({ ok: false, reason: `${f}: parse failed: ${e.message}` }); }
  }
  const ledger = ledgerMap(loadLedger());
  const selected = selectPromotable(normalized, ledger);
  const skippedInvalid = normalized.filter((a) => !a.ok).length;
  const alreadyPromoted = normalized.filter((a) => a.ok).length - selected.length;

  console.log(`[yt-promote] artifacts=${files.length} promotable=${selected.length} alreadyPromoted=${alreadyPromoted} invalid/empty=${skippedInvalid}`);
  if (!apply) {
    for (const a of selected.slice(0, 25)) console.log(`  would promote ${a.videoId}: ${a.tips.length} tip(s) -- "${(a.meta.title || "").slice(0, 70)}"`);
    if (selected.length > 25) console.log(`  ...and ${selected.length - 25} more`);
    console.log(`[yt-promote] DRY-RUN (default). Re-run with --apply to promote through U-TK01 dedup ingest${wiki ? " + wiki entries" : ""}.`);
    return 0;
  }

  // ATTENDED apply: reuse the canonical ingest + wiki writers.
  const { ingestTips, writeWikiEntry } = await import("./youtube-free-extract.mjs");
  const r = await promote(selected, {
    ingestImpl: (tips) => ingestTips(tips, {}),
    wikiImpl: wiki ? (tips, meta) => writeWikiEntry(tips, meta) : null,
    saveLedgerImpl: saveLedgerDefault,
    ledger, wiki,
  });
  for (const row of r.rows) if (!row.ok && row.error) console.error(`  FAIL ${row.videoId}: ${row.error}`);
  console.log(`[yt-promote] promoted=${r.promoted} tipsIngested=${r.tipsIngested} failed=${r.failed}`);
  return r.failed > 0 && r.promoted === 0 ? 1 : 0; // total failure is loud; partial success resumes next run
}

const __isMain = (() => {
  try { return !!process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]); }
  catch { return false; }
})();
if (__isMain) main().then((c) => process.exit(c)).catch((e) => { console.error(`[yt-promote] fatal: ${e?.message || e}`); process.exit(1); });
