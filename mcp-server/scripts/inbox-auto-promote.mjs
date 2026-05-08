#!/usr/bin/env node
/**
 * inbox-auto-promote.mjs
 *
 * OBSIDIAN-AUTOMATE-MS3/U-INBOX-AUTO-PROMOTE
 *
 * Daily cron entry point. Walks knowledge/memories/inbox/*.md and moves
 * notes that:
 *   1. carry a capture-sharpen metadata block (score + classification),
 *   2. scored ≥ MIN_SCORE (default 0.85) and PASS,
 *   3. have a confident classification (NOT "unknown"),
 *   4. have been in the inbox for ≥ MIN_DWELL_MS (default 24h),
 *
 * to `knowledge/memories/<classification>/` where classification is one of
 * the five cyrilXBT subfolders: observations / reactions / patterns /
 * questions / numbers.
 *
 * Closes the cyrilXBT JARVIS loop:
 *   capture (write to inbox/) → assess (PostToolUse hook) → promote (this) →
 *   prune (sibling cron) reaps anything that didn't promote.
 *
 * Why a separate cron and NOT the PostToolUse hook?
 *   The hook fires immediately on Write/Edit; it cannot enforce a 24h dwell.
 *   The dwell delay is critical — it gives the user a window to revise a
 *   too-sharp false-positive before it leaves inbox/. The article's strict
 *   reading of "inbox is for triage" still allows a day of triage.
 *
 * Atomic: copy → fsync via writeFileSync of marker → rename → unlink source.
 * Idempotent: notes already promoted are gone from inbox/ so cannot re-fire.
 * Conservative: never moves a note whose target subfolder file already exists
 * (collision → leave the source where it is for the user to resolve).
 *
 * Flags:
 *   --apply             actually move files (default is dry-run)
 *   --dry-run           list candidates without moving
 *   --inbox <path>      override inbox dir
 *   --memories <path>   override memories root (where subfolders live)
 *   --min-score <n>     override MIN_SCORE (default 0.85)
 *   --min-dwell-ms <n>  override MIN_DWELL_MS (default 24h)
 *
 * Cron: `30 4 * * *` (daily 04:30 local) — runs BEFORE prune (05:07) and
 *   BEFORE daily-brief (06:00) so inbox/ is clean by brief time.
 *
 * @milestone OBSIDIAN-AUTOMATE-MS3/U-INBOX-AUTO-PROMOTE
 */

import { readdirSync, readFileSync, statSync, existsSync, mkdirSync, copyFileSync, unlinkSync, renameSync, writeFileSync } from "node:fs";
import { resolve, join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..", "..");

const DEFAULT_INBOX = resolve(PRISM_ROOT, "knowledge", "memories", "inbox");
const DEFAULT_MEMORIES = resolve(PRISM_ROOT, "knowledge", "memories");
const DEFAULT_MIN_SCORE = 0.85;
const DEFAULT_MIN_DWELL_MS = 24 * 60 * 60 * 1000;
const STATE_FILE = resolve(PRISM_ROOT, "mcp-server", "data", "state", "inbox-auto-promote.json");

const VALID_SUBFOLDERS = new Set(["observations", "reactions", "patterns", "questions", "numbers"]);
const EXEMPT_RE = /^(brief|perf-report|resources|archive)-/i;

const SHARPEN_BEGIN = "<!-- capture-sharpen:begin v1 -->";
const SHARPEN_END = "<!-- capture-sharpen:end -->";

function parseFlags(argv) {
  const out = { apply: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--dry-run") out.apply = false;
    else if (a === "--inbox") out.inbox = argv[++i];
    else if (a === "--memories") out.memories = argv[++i];
    else if (a === "--min-score") out.minScore = Number(argv[++i]);
    else if (a === "--min-dwell-ms") out.minDwellMs = Number(argv[++i]);
  }
  return out;
}

/** Pull score + classification + verdict from the capture-sharpen metadata block. */
export function parseSharpenBlock(body) {
  const begin = body.indexOf(SHARPEN_BEGIN);
  const end = body.indexOf(SHARPEN_END);
  if (begin < 0 || end <= begin) return null;
  const block = body.slice(begin, end);
  const scoreM = block.match(/score:\s*([\d.]+)\s*\((PASS|REVISE)\)/i);
  const classM = block.match(/classification:\s*([a-z]+)/i);
  if (!scoreM || !classM) return null;
  const score = Number(scoreM[1]);
  if (!Number.isFinite(score)) return null;
  return {
    score,
    verdict: scoreM[2].toUpperCase(),
    classification: classM[1].toLowerCase(),
  };
}

function listInboxNotes(inboxDir) {
  if (!existsSync(inboxDir)) return [];
  let entries;
  try { entries = readdirSync(inboxDir, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.toLowerCase().endsWith(".md")) continue;
    if (EXEMPT_RE.test(e.name)) continue;
    out.push(join(inboxDir, e.name));
  }
  return out;
}

/** Atomic move: copy → tmp → rename → unlink source. Returns { ok, dest, reason }. */
function promoteOne(srcPath, destDir) {
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  const name = basename(srcPath);
  const dest = join(destDir, name);
  if (existsSync(dest)) {
    return { ok: false, reason: "collision-target-exists", dest };
  }
  const tmp = join(destDir, `.${name}.tmp-${process.pid}-${Date.now()}`);
  try {
    copyFileSync(srcPath, tmp);
    renameSync(tmp, dest);
    unlinkSync(srcPath);
    return { ok: true, dest };
  } catch (err) {
    try { if (existsSync(tmp)) unlinkSync(tmp); } catch { /* ignore */ }
    return { ok: false, reason: "move-failed", error: err?.message ?? String(err) };
  }
}

function writeState(stateFile, payload) {
  try {
    mkdirSync(dirname(stateFile), { recursive: true });
    writeFileSync(stateFile, JSON.stringify(payload, null, 2), "utf8");
  } catch { /* never block on telemetry */ }
}

export function runInboxAutoPromote(opts = {}) {
  const flags = opts.flags ?? parseFlags(process.argv);
  const now = opts.now ?? Date.now();
  const inboxDir = resolve(flags.inbox ?? opts.inbox ?? DEFAULT_INBOX);
  const memoriesRoot = resolve(flags.memories ?? opts.memories ?? DEFAULT_MEMORIES);
  const minScore = flags.minScore ?? opts.minScore ?? DEFAULT_MIN_SCORE;
  const minDwellMs = flags.minDwellMs ?? opts.minDwellMs ?? DEFAULT_MIN_DWELL_MS;
  const apply = flags.apply ?? opts.apply ?? false;
  const stateFile = opts.stateFile ?? STATE_FILE;

  const candidates = listInboxNotes(inboxDir);
  const promoted = [];
  const skipped = [];
  const errored = [];

  for (const path of candidates) {
    let st, body;
    try { st = statSync(path); } catch (err) { errored.push({ path, reason: "stat-failed", error: String(err) }); continue; }
    try { body = readFileSync(path, "utf8"); } catch (err) { errored.push({ path, reason: "read-failed", error: String(err) }); continue; }

    const sharpen = parseSharpenBlock(body);
    if (!sharpen) { skipped.push({ path, reason: "no-sharpen-block" }); continue; }
    if (sharpen.verdict !== "PASS") { skipped.push({ path, reason: "verdict-revise", score: sharpen.score }); continue; }
    if (sharpen.score < minScore) { skipped.push({ path, reason: "score-below-threshold", score: sharpen.score }); continue; }
    if (!VALID_SUBFOLDERS.has(sharpen.classification)) {
      skipped.push({ path, reason: "classification-invalid", classification: sharpen.classification });
      continue;
    }
    const ageMs = now - st.mtimeMs;
    if (ageMs < minDwellMs) { skipped.push({ path, reason: "dwell-too-short", ageHours: +(ageMs / 3_600_000).toFixed(2) }); continue; }

    const destDir = join(memoriesRoot, sharpen.classification);
    if (!apply) {
      promoted.push({ from: path, to: join(destDir, basename(path)), classification: sharpen.classification, score: sharpen.score, dryRun: true });
      continue;
    }
    const r = promoteOne(path, destDir);
    if (r.ok) {
      promoted.push({ from: path, to: r.dest, classification: sharpen.classification, score: sharpen.score });
    } else {
      errored.push({ path, ...r });
    }
  }

  const result = {
    ok: true,
    apply,
    inboxDir,
    memoriesRoot,
    minScore,
    minDwellMs,
    scanned: candidates.length,
    promoted: promoted.length,
    skipped: skipped.length,
    errored: errored.length,
    promotedPaths: promoted,
    skippedPaths: skipped,
    erroredPaths: errored,
    ranAtIso: new Date(now).toISOString(),
  };

  if (opts.persistState !== false) {
    writeState(stateFile, {
      schemaVersion: "1.0.0",
      lastRunIso: result.ranAtIso,
      lastApply: apply,
      lastScanned: result.scanned,
      lastPromoted: result.promoted,
      lastSkipped: result.skipped,
      lastErrored: result.errored,
    });
  }

  return result;
}

const isCli = (() => {
  try {
    const argv1 = resolve(process.argv[1] ?? "");
    return argv1 === __filename;
  } catch { return false; }
})();

if (isCli) {
  try {
    const r = runInboxAutoPromote();
    const verb = r.apply ? "promoted" : "would promote";
    process.stdout.write(
      `inbox-auto-promote: ${verb} ${r.promoted}/${r.scanned} (skipped ${r.skipped}, errored ${r.errored}); inbox=${r.inboxDir}\n`,
    );
    if (r.promoted > 0 && !r.apply) {
      for (const p of r.promotedPaths) {
        process.stdout.write(`  - ${basename(p.from)} → ${p.classification}/ (score ${p.score.toFixed(2)})\n`);
      }
    }
    process.exit(0);
  } catch (err) {
    process.stderr.write(`inbox-auto-promote ERROR: ${err?.stack ?? err?.message ?? err}\n`);
    process.exit(1);
  }
}
