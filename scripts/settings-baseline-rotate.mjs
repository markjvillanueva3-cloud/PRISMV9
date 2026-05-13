#!/usr/bin/env node
/**
 * settings-baseline-rotate.mjs — CLEANUP-MS0 / U-CLEANUP-G4
 *
 * Rotation policy for settings.json baseline snapshots written by the
 * settings-baseline-snapshot.mjs SessionStart hook into
 * H:/prism/mcp-server/data/state/settings-baseline-<ISO>.json.
 *
 * Policy:
 *   - Keep every snapshot newer than `--keep-days N` (default 7) in place.
 *   - For older snapshots: bucket by YYYY-MM month.
 *     - Write ONE monthly digest per bucket as
 *       settings-baseline-DIGEST-<YYYY-MM>.json (sits next to the live files;
 *       carries snapshot count, oldest/newest ISO, sha256 + byte size of the
 *       representative newest-of-month snapshot, per-event hook count map,
 *       top-level keys).
 *     - Move the original older snapshots into
 *       <archive-root>/<YYYY-MM>/ for cold storage.
 *
 * Idempotent: re-running on the same directory re-uses existing digests when
 * the representative sha256 already matches, and skips files whose archive
 * destination already exists with byte-identical content.
 *
 * Args:
 *   --source <dir>       source dir (default: H:/prism/mcp-server/data/state)
 *   --archive <dir>      archive root (default: <source>/.archive/settings-baseline)
 *   --keep-days <N>      keep snapshots newer than N days (default: 7)
 *   --dry-run            do not move/write anything; print the plan
 *   --no-json            print one-line text summary instead of JSON
 *
 * Exit: 0 success (errors=0), 1 hard error.
 *
 * @see H:/prism/.claude/hooks/settings-baseline-snapshot.mjs (writer)
 * @see CLEANUP-MS0 / U-CLEANUP-G4
 */

import {
  readdirSync, readFileSync, writeFileSync, statSync, mkdirSync, renameSync,
  existsSync, unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

// Filename produced by settings-baseline-snapshot.mjs:
//   settings-baseline-<ISO>.json where ISO has colons + dot replaced by hyphens.
//   e.g. settings-baseline-2026-05-13T20-04-52-302Z.json
const FILENAME_RE = /^settings-baseline-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z\.json$/;
const DIGEST_PREFIX = "settings-baseline-DIGEST-";
const DEFAULT_SOURCE = "H:/prism/mcp-server/data/state";
const DEFAULT_KEEP_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseArgs(argv) {
  const out = {
    source: DEFAULT_SOURCE,
    archive: null,
    keepDays: DEFAULT_KEEP_DAYS,
    dryRun: false,
    json: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--source" && argv[i + 1]) out.source = argv[++i];
    else if (a === "--archive" && argv[i + 1]) out.archive = argv[++i];
    else if (a === "--keep-days" && argv[i + 1]) {
      const n = parseInt(argv[++i], 10);
      out.keepDays = Number.isFinite(n) && n >= 0 ? n : DEFAULT_KEEP_DAYS;
    }
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--no-json") out.json = false;
  }
  if (!out.archive) out.archive = join(out.source, ".archive", "settings-baseline");
  return out;
}

export function parseFilename(name) {
  const m = FILENAME_RE.exec(name);
  if (!m) return null;
  const [, Y, Mo, D, H, Mi, S, ms] = m;
  const iso = `${Y}-${Mo}-${D}T${H}:${Mi}:${S}.${ms}Z`;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return { iso, t, bucket: `${Y}-${Mo}` };
}

function sha256(buf) { return createHash("sha256").update(buf).digest("hex"); }

export function countHooks(settings) {
  const out = {};
  const hooks = settings?.hooks;
  if (!hooks || typeof hooks !== "object") return out;
  for (const [event, arr] of Object.entries(hooks)) {
    if (!Array.isArray(arr)) continue;
    let total = 0;
    for (const matcher of arr) {
      const innerHooks = matcher?.hooks;
      if (Array.isArray(innerHooks)) total += innerHooks.length;
    }
    out[event] = total;
  }
  return out;
}

/**
 * Pure rotation function. Caller injects opts. `now` is injectable for tests.
 * Returns a structured summary; never throws on disk I/O — errors accrue into
 * `result.errors` so callers can decide whether to retry / alert.
 */
export function rotate(opts, now = Date.now()) {
  const cutoff = now - opts.keepDays * DAY_MS;
  const result = {
    ok: true,
    source: opts.source,
    archive: opts.archive,
    keepDays: opts.keepDays,
    dryRun: !!opts.dryRun,
    cutoffIso: new Date(cutoff).toISOString(),
    nowIso: new Date(now).toISOString(),
    scanned: 0,
    kept: 0,
    archived: 0,
    digestsWritten: 0,
    digestsReused: 0,
    skipped: [],
    errors: [],
    buckets: {},
  };

  if (!existsSync(opts.source)) {
    result.errors.push(`source not found: ${opts.source}`);
    result.ok = false;
    return result;
  }

  let entries;
  try { entries = readdirSync(opts.source); }
  catch (e) {
    result.errors.push(`readdir failed: ${e.message}`);
    result.ok = false;
    return result;
  }

  const files = [];
  for (const e of entries) {
    if (!e.startsWith("settings-baseline-")) continue;
    if (e.startsWith(DIGEST_PREFIX)) continue;
    if (!e.endsWith(".json")) continue;
    const parsed = parseFilename(e);
    if (!parsed) {
      result.skipped.push({ name: e, reason: "unparseable-filename" });
      continue;
    }
    const full = join(opts.source, e);
    let size = 0;
    try { size = statSync(full).size; } catch { /* ignore — size cosmetic */ }
    files.push({ name: e, full, ...parsed, size });
  }
  result.scanned = files.length;

  // Bucket older-than-cutoff files by YYYY-MM
  const bucketMap = new Map();
  for (const f of files) {
    if (f.t >= cutoff) { result.kept++; continue; }
    if (!bucketMap.has(f.bucket)) bucketMap.set(f.bucket, []);
    bucketMap.get(f.bucket).push(f);
  }

  for (const [bucket, bucketFiles] of bucketMap.entries()) {
    bucketFiles.sort((a, b) => a.t - b.t); // oldest first
    const newest = bucketFiles[bucketFiles.length - 1];
    const archiveDir = join(opts.archive, bucket);
    const digestPath = join(opts.source, `${DIGEST_PREFIX}${bucket}.json`);

    // Compute digest before moving (need representative file accessible).
    let digest = null;
    try {
      const buf = readFileSync(newest.full);
      let parsedSettings = null;
      try { parsedSettings = JSON.parse(buf.toString("utf-8")); }
      catch (parseErr) {
        result.errors.push(`digest parse ${bucket}: ${parseErr.message}`);
        continue;
      }
      digest = {
        bucket,
        snapshotCount: bucketFiles.length,
        oldestIso: bucketFiles[0].iso,
        newestIso: newest.iso,
        representativeSha256: sha256(buf),
        representativeBytes: buf.length,
        hookCounts: countHooks(parsedSettings),
        topLevelKeys: Object.keys(parsedSettings || {}).sort(),
        rotatedAt: new Date(now).toISOString(),
      };
    } catch (e) {
      result.errors.push(`digest-compute-failed for ${bucket}: ${e.message}`);
      continue;
    }

    // Idempotent: skip digest write if existing one already covers >= our count
    // AND has the same representative sha.
    let writeDigest = true;
    if (existsSync(digestPath)) {
      try {
        const existing = JSON.parse(readFileSync(digestPath, "utf-8"));
        if (existing
            && existing.representativeSha256 === digest.representativeSha256
            && Number.isFinite(existing.snapshotCount)
            && existing.snapshotCount >= digest.snapshotCount) {
          writeDigest = false;
          result.digestsReused++;
        }
      } catch { /* fall through and rewrite */ }
    }

    if (!opts.dryRun) {
      if (writeDigest) {
        try {
          writeFileSync(digestPath, JSON.stringify(digest, null, 2) + "\n");
          result.digestsWritten++;
        } catch (e) {
          result.errors.push(`digest-write-failed ${bucket}: ${e.message}`);
        }
      }
      try { mkdirSync(archiveDir, { recursive: true }); }
      catch (e) {
        result.errors.push(`mkdir ${archiveDir}: ${e.message}`);
        continue;
      }
    }

    const archivedFiles = [];
    for (const f of bucketFiles) {
      const dest = join(archiveDir, f.name);
      if (existsSync(dest)) {
        // Defensive: if dest exists and is byte-identical, remove the duplicate
        // source. If they differ, leave both in place and flag — operator decides.
        let sameContent = false;
        try {
          const srcBuf = readFileSync(f.full);
          const dstBuf = readFileSync(dest);
          sameContent = sha256(srcBuf) === sha256(dstBuf);
        } catch (e) {
          result.errors.push(`dedup-check ${f.name}: ${e.message}`);
        }
        if (sameContent && !opts.dryRun) {
          try { unlinkSync(f.full); }
          catch (e) { result.errors.push(`unlink-dup ${f.name}: ${e.message}`); }
          result.skipped.push({ name: f.name, reason: "already-archived-identical-removed" });
        } else if (sameContent) {
          result.skipped.push({ name: f.name, reason: "already-archived-identical" });
        } else {
          result.skipped.push({ name: f.name, reason: "archive-dest-differs" });
        }
        continue;
      }
      if (!opts.dryRun) {
        try { renameSync(f.full, dest); }
        catch (e) {
          result.errors.push(`move ${f.name}: ${e.message}`);
          continue;
        }
      }
      archivedFiles.push(f.name);
      result.archived++;
    }
    result.buckets[bucket] = {
      count: bucketFiles.length,
      archivedFiles,
      digestPath: digestPath.replace(opts.source, "<source>"),
      digestReused: !writeDigest,
    };
  }

  result.ok = result.errors.length === 0;
  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let result;
  try { result = rotate(args); }
  catch (e) {
    if (args.json) process.stdout.write(JSON.stringify({ ok: false, error: e.message }) + "\n");
    else process.stderr.write(`settings-baseline-rotate: ${e.message}\n`);
    process.exit(1);
  }
  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stdout.write(
      `rotated ${result.archived}/${result.scanned} (kept=${result.kept}, ` +
      `digests=${result.digestsWritten}+${result.digestsReused}, errors=${result.errors.length})\n`
    );
  }
  process.exit(result.ok ? 0 : 1);
}

// Run as CLI when invoked directly (not when imported by tests).
const invokedPath = (process.argv[1] || "").replace(/\\/g, "/");
if (invokedPath.endsWith("settings-baseline-rotate.mjs")) main();
