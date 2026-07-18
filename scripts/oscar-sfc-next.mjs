#!/usr/bin/env node
/**
 * oscar-sfc-next.mjs — deterministic "what SFC unit next" harness for the oscar
 * autonomous loop/cron (speed-feed galaxy).
 *
 * Karpathy R5: a deterministic transform (pick highest-rank OPEN item) is code,
 * not a model call. The cron/loop asks THIS for the next unit instead of
 * re-deriving priority from the assessment every tick.
 *
 * Backlog source of truth: state/shared/specs/SFC-LIVE-BACKLOG.json
 * (schemaVersion 1.x, items[] each {id,rank,title,category,phase,roi,effort,status,why,evidence}).
 * Status lifecycle (forward-only): open -> in_progress -> shipped.
 *
 * CONCURRENCY (why this matters): the firing cron (6,21,36,51 * * * *) can fire
 * tick N+1 while tick N's build is still running (>15 min builds are normal), and
 * the mining workflow appends via `add --json` concurrently. An unlocked
 * read-modify-write would silently lose an update (a just-shipped item reverts to
 * open -> double-build). So every MUTATING command runs its read->mutate->write
 * inside `withExclusiveLock` (re-reading the file INSIDE the lock), and `claim`
 * atomically picks-and-marks so two ticks never grab the same unit.
 *
 * Commands:
 *   next            READ-ONLY preview: print the top OPEN item; exit 0.
 *                   Dry -> print "SFC-BACKLOG-DRY" and exit 3. Does NOT claim.
 *   claim           ATOMIC pick+mark: under the lock, take the top OPEN item,
 *                   mark it in_progress, print the directive; exit 0. Dry -> exit 3.
 *                   The loop/cron uses THIS (not next+start) to avoid double-build.
 *   list            list all items grouped by status
 *   status          JSON counts {open,in_progress,shipped,total}
 *   start <id>      mark an item in_progress (stamps startedAt)
 *   done  <id>      mark an item shipped   (stamps shippedAt; --commit <sha> optional)
 *   add   --json '<[{...}]>'   merge items (id = merge key; forward-only status,
 *                   empty incoming fields never clobber curated title/why/evidence).
 *
 * Writes are atomic (temp + rename, tmp cleaned on failure) and preserve
 * schemaVersion — matches the lockfile-guarded atomic-RMW discipline
 * (database-expansion galaxy). Backlog path overridable via SFC_BACKLOG_PATH (tests).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withExclusiveLock } from "./lib/exclusive-file-lock.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO = path.resolve(__dirname, "..");
export const BACKLOG_PATH =
  process.env.SFC_BACKLOG_PATH || path.join(REPO, "state", "shared", "specs", "SFC-LIVE-BACKLOG.json");

const STATUSES = ["open", "in_progress", "shipped"];
const STATUS_RANK = { open: 0, in_progress: 1, shipped: 2 };

/** Sentinel a mutateBacklog fn returns to signal "no change" — skips the write
 *  so a dry `claim` (nothing to mark) doesn't churn updatedAt every tick. */
export const NOOP = Symbol("sfc-backlog-noop");

/** Read backlog; throw loud (R12) if missing/corrupt rather than silently returning empty. */
export function readBacklog(p = BACKLOG_PATH) {
  if (!fs.existsSync(p)) throw new Error(`SFC backlog not found: ${p}`);
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    throw new Error(`SFC backlog is not valid JSON (${p}): ${e.message}`);
  }
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.items)) {
    throw new Error(`SFC backlog missing items[] (${p})`);
  }
  if (!raw.schemaVersion) throw new Error(`SFC backlog missing schemaVersion (${p})`);
  return raw;
}

/** Atomic write: temp file in the same dir, then rename. Tmp is cleaned if the
 *  rename throws (Windows sharing-violation EPERM/EBUSY) so no stray tmp leaks. */
export function writeBacklog(data, p = BACKLOG_PATH) {
  data.updatedAt = new Date().toISOString();
  const tmp = `${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  try {
    fs.renameSync(tmp, p);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch { /* best effort */ }
    throw e;
  }
  return data;
}

/**
 * Lock-guarded read->mutate->write. Re-reads the backlog INSIDE the lock so the
 * mutation is applied to the freshest state (no lost update). Throws loud if a
 * peer holds the lock through the whole retry window (R12 — never silent no-op).
 */
export function mutateBacklog(fn, p = BACKLOG_PATH) {
  const lockPath = `${p}.lock`;
  const res = withExclusiveLock(lockPath, () => {
    const backlog = readBacklog(p);
    const out = fn(backlog);
    if (out === NOOP) return NOOP; // fn signalled no change → skip the write
    writeBacklog(backlog, p);
    return out;
  });
  if (!res.ran) {
    throw new Error(`SFC backlog lock busy (${lockPath}) — a peer tick holds it; retry next tick`);
  }
  return res.value;
}

/** Highest-priority OPEN item: lowest rank wins; ties broken by higher roi. */
export function pickNext(backlog) {
  const open = backlog.items.filter((it) => it.status === "open");
  if (open.length === 0) return null;
  open.sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || (b.roi ?? 0) - (a.roi ?? 0));
  return open[0];
}

/** Pick the top OPEN item and mark it in_progress in one step (mutates backlog).
 *  Returns the claimed item, or null if the backlog is dry. */
export function claimNext(backlog, stamp = new Date().toISOString()) {
  const it = pickNext(backlog);
  if (!it) return null;
  it.status = "in_progress";
  it.startedAt = stamp;
  return it;
}

export function counts(backlog) {
  const c = { open: 0, in_progress: 0, shipped: 0, total: backlog.items.length };
  for (const it of backlog.items) if (STATUSES.includes(it.status)) c[it.status]++;
  return c;
}

/** Forward-only status transition; refuses to move backward (shipped -> open). */
export function setStatus(backlog, id, status, extra = {}) {
  if (!STATUSES.includes(status)) throw new Error(`unknown status: ${status}`);
  const it = backlog.items.find((x) => x.id === id);
  if (!it) throw new Error(`no backlog item with id: ${id}`);
  if (STATUS_RANK[status] < STATUS_RANK[it.status]) {
    throw new Error(`refusing backward transition ${it.status} -> ${status} for ${id}`);
  }
  it.status = status;
  Object.assign(it, extra);
  return it;
}

/** Merge incoming items by id. New ids appended; existing updated only forward
 *  (status never moves backward, curated title/why/evidence kept unless incoming
 *  non-empty). Rejects an unknown incoming status (R12 — no silently-orphaned item). */
export function mergeItems(backlog, incoming) {
  if (!Array.isArray(incoming)) throw new Error("mergeItems: incoming must be an array");
  let added = 0, updated = 0;
  const byId = new Map(backlog.items.map((it) => [it.id, it]));
  for (const inc of incoming) {
    if (!inc || !inc.id) continue;
    if (inc.status != null && !STATUSES.includes(inc.status)) {
      throw new Error(`mergeItems: unknown status "${inc.status}" for ${inc.id}`);
    }
    const cur = byId.get(inc.id);
    if (!cur) {
      const created = { status: "open", ...inc };
      backlog.items.push(created);
      byId.set(inc.id, created); // store the SAME object we pushed (dup-id-in-batch safe)
      added++;
      continue;
    }
    // forward-only status
    if (inc.status && STATUS_RANK[inc.status] > (STATUS_RANK[cur.status] ?? 0)) cur.status = inc.status;
    for (const k of ["rank", "roi", "effort", "phase", "category"]) {
      if (inc[k] != null) cur[k] = inc[k];
    }
    for (const k of ["title", "why", "evidence"]) {
      if (inc[k]) cur[k] = inc[k];
    }
    updated++;
  }
  return { added, updated };
}

function fmtDirective(it, c) {
  return [
    `SFC-NEXT [${it.id}]  (rank ${it.rank}, phase ${it.phase}, ${it.category}, roi ${it.roi}, effort ${it.effort})`,
    `  ${it.title}`,
    `  WHY: ${it.why}`,
    `  EVIDENCE: ${it.evidence}`,
    `  backlog: ${c.open} open / ${c.in_progress} in-progress / ${c.shipped} shipped`,
  ].join("\n");
}

function main(argv) {
  const cmd = argv[2] || "next";
  switch (cmd) {
    case "next": {
      const backlog = readBacklog();
      const it = pickNext(backlog);
      if (!it) {
        process.stdout.write("SFC-BACKLOG-DRY — no OPEN items; descend the never-idle hunt ladder.\n");
        process.exitCode = 3;
        return;
      }
      process.stdout.write(fmtDirective(it, counts(backlog)) + "\n");
      return;
    }
    case "claim": {
      // Compute counts INSIDE the lock (post-claim, pre-release) so the printed
      // tally can't go stale and there's no outside-lock re-read that could throw
      // after the claim already persisted (arm-C P2).
      const out = mutateBacklog((b) => {
        const it = claimNext(b);
        return it ? { it, c: counts(b) } : NOOP;
      });
      if (out === NOOP) {
        process.stdout.write("SFC-BACKLOG-DRY — no OPEN items; descend the never-idle hunt ladder.\n");
        process.exitCode = 3;
        return;
      }
      process.stdout.write(fmtDirective(out.it, out.c) + "\n");
      return;
    }
    case "list": {
      const backlog = readBacklog();
      for (const s of STATUSES) {
        const items = backlog.items
          .filter((it) => it.status === s)
          .sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9));
        process.stdout.write(`\n== ${s} (${items.length}) ==\n`);
        for (const it of items) process.stdout.write(`  #${it.rank} ${it.id} — ${it.title}\n`);
      }
      return;
    }
    case "status":
      process.stdout.write(JSON.stringify(counts(readBacklog())) + "\n");
      return;
    case "start":
    case "done": {
      const id = argv[3];
      if (!id) throw new Error(`${cmd} requires an item id`);
      const status = cmd === "start" ? "in_progress" : "shipped";
      const stampKey = cmd === "start" ? "startedAt" : "shippedAt";
      const extra = { [stampKey]: new Date().toISOString() };
      const ci = argv.indexOf("--commit");
      if (cmd === "done" && ci !== -1 && argv[ci + 1]) extra.commit = argv[ci + 1];
      mutateBacklog((b) => setStatus(b, id, status, extra));
      process.stdout.write(`${id} -> ${status}\n`);
      return;
    }
    case "add": {
      const ji = argv.indexOf("--json");
      if (ji === -1 || !argv[ji + 1]) throw new Error("add requires --json '<array>'");
      const incoming = JSON.parse(argv[ji + 1]);
      const res = mutateBacklog((b) => mergeItems(b, incoming));
      process.stdout.write(`merged: +${res.added} added, ${res.updated} updated\n`);
      return;
    }
    default:
      process.stdout.write(
        "oscar-sfc-next.mjs — usage: next|claim|list|status|start <id>|done <id> [--commit <sha>]|add --json '<array>'\n"
      );
      process.exitCode = 2;
      return;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    main(process.argv);
  } catch (e) {
    process.stderr.write(`oscar-sfc-next: ${e.message}\n`);
    process.exitCode = 1;
  }
}
