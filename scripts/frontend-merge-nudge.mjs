#!/usr/bin/env node
// frontend-merge-nudge.mjs — CLEANUP-MS0/U-CLEANUP-F3
//
// BUILD_STATE consumer. Detects codex-built frontend trees that have been
// PENDING_MERGE for too long and nudges the fleet — at most once per 24h —
// via a single bundled chat-bus post.
//
// Why: BUILD_STATE.NEEDS_FRONTEND tracks frontends a codex chat built that
// still need merging into mcp-server/web. Without a nudge these sit forgotten
// (the headline shows "2 frontend merges pending" indefinitely). A daily check
// surfaces them — but naively posting every run would spam the bus, so this
// bundles ALL stale trees into one post and rate-limits to 1/day.
//
// Flow:
//   1. Read state/shared/BUILD_STATE.json → NEEDS_FRONTEND.trees[].
//   2. Filter merge_status === "PENDING_MERGE".
//   3. Load the state sidecar (.frontend-merge-nudge-last.json): per-tree
//      firstSeen timestamps + lastNudgeAt.
//   4. Record firstSeen for newly-pending trees; prune trees no longer pending.
//   5. Stale = pending trees whose (now - firstSeen) exceeds STALE_AFTER_DAYS.
//   6. If any stale AND (now - lastNudgeAt) ≥ NUDGE_COOLDOWN_MS (or --force):
//      post ONE bundled nudge to the chat bus, update lastNudgeAt.
//   7. Always write the sidecar back.
//
// Cadence: intended for a daily scheduled task. Advisory only — exit 0 always
// (a read/parse failure degrades to "nothing to nudge", never blocks a chat).
//
// Flags:
//   --json                emit machine-readable JSON to stdout
//   --dry-run             compute everything, but DO NOT post or write the sidecar
//   --skip-bus-post       compute + write sidecar, but DO NOT post to the bus
//   --force               ignore the 24h cooldown (still respects 7d staleness)
//   --frozen-time <iso>   override "now" for hermetic tests
//   --repo <path>         override the H:/prism repo root
//   --help                print usage and exit 0

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DAY_MS = 24 * 60 * 60 * 1000;
const SCHEMA_VERSION = 1;
const STALE_AFTER_DAYS = 7;
const STALE_AFTER_MS = STALE_AFTER_DAYS * DAY_MS;
const NUDGE_COOLDOWN_MS = DAY_MS; // 1 post per day max
// 10s is ample for `agent-coordination.mjs post` — a lightweight JSONL append.
// (F2's build-envelope-drift uses 60s because it spawns the heavy
// build-milestone-progress.mjs regen; this script only spawns the bus append.)
const SUBPROCESS_TIMEOUT_MS = 10_000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const out = {
    json: false,
    dryRun: false,
    skipBusPost: false,
    force: false,
    frozenTime: null,
    repo: DEFAULT_REPO,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--skip-bus-post") out.skipBusPost = true;
    else if (a === "--force") out.force = true;
    else if (a === "--frozen-time") out.frozenTime = argv[++i] || null;
    else if (a === "--repo") out.repo = argv[++i] || DEFAULT_REPO;
    else if (a === "--help" || a === "-h") out.help = true;
    // Unknown args are ignored — this is an advisory cron script, not a CLI
    // with a strict contract; a stray flag must never abort the daily nudge.
  }
  return out;
}

const USAGE = `frontend-merge-nudge.mjs — nudge the fleet about long-pending frontend merges.

Usage:
  node scripts/frontend-merge-nudge.mjs [--json] [--dry-run] [--skip-bus-post]
                                        [--force] [--frozen-time <iso>] [--repo <path>]

Flags:
  --json              machine-readable JSON to stdout
  --dry-run           compute only — no bus post, no sidecar write
  --skip-bus-post     compute + write sidecar, but no bus post
  --force             ignore the 24h post cooldown (7d staleness still required)
  --frozen-time <iso> override "now" (hermetic tests)
  --repo <path>       override repo root (default: resolved from script location)
  -h, --help          print this and exit 0

Exit code: always 0 (advisory — never blocks).`;

function readJSON(p) {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

/** Pending frontend trees from BUILD_STATE.json — [] on any read/shape failure. */
function readPendingTrees(repo) {
  const buildStatePath = path.join(repo, "state", "shared", "BUILD_STATE.json");
  const bs = readJSON(buildStatePath);
  if (!bs || !bs.NEEDS_FRONTEND || !Array.isArray(bs.NEEDS_FRONTEND.trees)) {
    return { trees: [], buildStatePath, ok: false };
  }
  const pending = bs.NEEDS_FRONTEND.trees.filter(
    (t) => t && t.merge_status === "PENDING_MERGE" && typeof t.id === "string",
  );
  return { trees: pending, buildStatePath, ok: true };
}

function sidecarPath(repo) {
  return path.join(repo, "state", "shared", ".frontend-merge-nudge-last.json");
}

function loadSidecar(repo) {
  const s = readJSON(sidecarPath(repo));
  if (!s || typeof s !== "object") {
    return { schemaVersion: SCHEMA_VERSION, firstSeen: {}, lastNudgeAt: null };
  }
  // Schema drift: if the sidecar predates the current schema, reset rather than
  // trust possibly-incompatible fields. firstSeen would only lose at most one
  // STALE_AFTER_DAYS window — acceptable for an advisory nudge.
  if (s.schemaVersion !== SCHEMA_VERSION) {
    return { schemaVersion: SCHEMA_VERSION, firstSeen: {}, lastNudgeAt: null };
  }
  // Keep only firstSeen entries whose value is a parseable ISO timestamp. A
  // corrupt value would otherwise make a tree PERMANENTLY non-stale: Date.parse
  // → NaN → skipped from the stale check, yet the key still exists so it's
  // never re-recorded. Dropping it lets the next run re-record at `now`
  // (self-healing — worst case one missed STALE_AFTER_DAYS window).
  const cleanFirstSeen = {};
  if (s.firstSeen && typeof s.firstSeen === "object") {
    for (const [id, ts] of Object.entries(s.firstSeen)) {
      if (typeof ts === "string" && Number.isFinite(Date.parse(ts))) {
        cleanFirstSeen[id] = ts;
      }
    }
  }
  const lastNudgeValid =
    typeof s.lastNudgeAt === "string" && Number.isFinite(Date.parse(s.lastNudgeAt));
  return {
    schemaVersion: SCHEMA_VERSION,
    firstSeen: cleanFirstSeen,
    lastNudgeAt: lastNudgeValid ? s.lastNudgeAt : null,
  };
}

function writeSidecar(repo, state) {
  const p = sidecarPath(repo);
  try {
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(state, null, 2) + "\n", "utf8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Post a human-readable nudge to the fleet chat bus via agent-coordination.mjs.
 * `message` is plain text (NOT JSON) -- agent-coordination's `post` command
 * preserves --message verbatim as the chat entry's raw_message and the fleet
 * reads AGENT_CHAT.md directly, so a readable one-liner is the right payload.
 * `--status advisory` tags the structured entry so it's filterable.
 */
function postToBus(repo, message) {
  const helper = path.join(repo, ".claude", "helpers", "agent-coordination.mjs");
  if (!existsSync(helper)) return { ok: false, reason: `helper missing: ${helper}` };
  const r = spawnSync(
    process.execPath,
    [helper, "post", "--status", "advisory", "--message", message],
    { encoding: "utf8", timeout: SUBPROCESS_TIMEOUT_MS },
  );
  if (r.error) return { ok: false, reason: `spawn error: ${r.error.message}` };
  if (r.signal) return { ok: false, reason: `timed out (signal=${r.signal})` };
  if (r.status !== 0) {
    return { ok: false, reason: `exit=${r.status}`, stderr: (r.stderr || "").slice(0, 200) };
  }
  return { ok: true };
}

/** Build the readable one-line chat-bus nudge for a set of stale trees.
 *  Avoids ':' / ';' / '|' so agent-coordination's structured parser doesn't
 *  fragment it -- raw_message is preserved verbatim regardless, but the
 *  structured view stays clean too. */
function buildNudgeMessage(stale) {
  const detail = stale
    .map((s) => `${s.id} (${s.stack}, ${s.ageDays}d, ${s.path})`)
    .join(", ");
  return `frontend-merge-nudge -- ${stale.length} frontend merge(s) pending over ${STALE_AFTER_DAYS}d, need merge into mcp-server/web -- ${detail}`;
}

// ------- main -------

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(USAGE + "\n");
    return 0;
  }

  const nowMs = args.frozenTime ? Date.parse(args.frozenTime) : Date.now();
  if (!Number.isFinite(nowMs)) {
    // Bad --frozen-time → fall back to real now rather than abort.
    process.stderr.write(`frontend-merge-nudge: invalid --frozen-time '${args.frozenTime}', using real now\n`);
  }
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const nowIso = new Date(now).toISOString();

  const { trees: pending, ok: buildStateOk } = readPendingTrees(args.repo);
  const sidecar = loadSidecar(args.repo);

  // 1. Record firstSeen for newly-pending trees.
  const pendingIds = new Set(pending.map((t) => t.id));
  for (const t of pending) {
    if (!sidecar.firstSeen[t.id]) sidecar.firstSeen[t.id] = nowIso;
  }
  // 2. Prune firstSeen entries for trees no longer pending (merged or removed).
  // NOTE: a tree that flickers out of PENDING_MERGE (e.g. a transient
  // BUILD_STATE regen) and back loses its firstSeen age -- it's re-recorded as
  // "now" on reappearance. Acceptable for an advisory nudge (it re-stales after
  // STALE_AFTER_DAYS); do NOT "fix" this into a never-prune leak.
  for (const id of Object.keys(sidecar.firstSeen)) {
    if (!pendingIds.has(id)) delete sidecar.firstSeen[id];
  }

  // 3. Stale = pending trees whose firstSeen age exceeds STALE_AFTER_MS.
  const stale = [];
  for (const t of pending) {
    const seenMs = Date.parse(sidecar.firstSeen[t.id]);
    if (!Number.isFinite(seenMs)) continue;
    const ageMs = now - seenMs;
    if (ageMs >= STALE_AFTER_MS) {
      stale.push({
        id: t.id,
        path: t.path || "(unknown)",
        stack: t.stack || "(unknown)",
        ageDays: Math.floor(ageMs / (24 * 60 * 60 * 1000)),
      });
    }
  }

  // 4. Decide whether to post: stale exists AND cooldown elapsed (or --force).
  const lastNudgeMs = sidecar.lastNudgeAt ? Date.parse(sidecar.lastNudgeAt) : NaN;
  const cooldownElapsed =
    !Number.isFinite(lastNudgeMs) || now - lastNudgeMs >= NUDGE_COOLDOWN_MS;
  const wantPost = stale.length > 0 && (args.force || cooldownElapsed);

  let posted = false;
  let postError = null;
  const nudgeMessage = stale.length > 0 ? buildNudgeMessage(stale) : null;
  if (wantPost && !args.dryRun && !args.skipBusPost) {
    const res = postToBus(args.repo, nudgeMessage);
    posted = res.ok;
    postError = res.ok ? null : res.reason + (res.stderr ? ` :: ${res.stderr}` : "");
    if (posted) sidecar.lastNudgeAt = nowIso;
  }

  // 5. Persist the sidecar (unless dry-run).
  let sidecarWritten = false;
  if (!args.dryRun) {
    sidecarWritten = writeSidecar(args.repo, sidecar);
  }

  const result = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: nowIso,
    buildStateReadOk: buildStateOk,
    pendingCount: pending.length,
    staleCount: stale.length,
    stale,
    posted,
    postError,
    // Reason ordering matters: `!wantPost` (no stale OR cooldown active) means
    // the post would not happen REGARDLESS of the suppression flags, so it must
    // be reported before --dry-run / --skip-bus-post. Those flags only explain
    // a skip when a post was actually wanted.
    postSkippedReason:
      stale.length === 0
        ? "no stale trees"
        : !wantPost
          ? "within 24h cooldown"
          : args.dryRun
            ? "dry-run"
            : args.skipBusPost
              ? "skip-bus-post"
              : null,
    sidecarWritten,
    cooldownElapsed,
    nudgeMessage,
  };

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else if (stale.length === 0) {
    process.stdout.write(
      `frontend-merge-nudge: ${pending.length} pending, 0 stale (>${STALE_AFTER_DAYS}d) — nothing to nudge\n`,
    );
  } else if (posted) {
    process.stdout.write(
      `frontend-merge-nudge: posted nudge for ${stale.length} stale tree(s): ${stale.map((s) => s.id).join(", ")}\n`,
    );
  } else {
    process.stdout.write(
      `frontend-merge-nudge: ${stale.length} stale tree(s) but no post (${result.postSkippedReason}${postError ? `; ${postError}` : ""})\n`,
    );
  }

  return 0;
}

// invokedAsCli guard: importing this module for tests must NOT run main().
const invokedAsCli = (() => {
  try {
    if (!process.argv[1]) return false;
    return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (invokedAsCli) {
  // Contract: this advisory cron exits 0 ALWAYS (header + USAGE both promise
  // it). An unexpected throw (EPIPE on a closed stdout, a future unguarded
  // parse) must degrade to a stderr note + exit 0 -- never a stack trace into
  // the scheduler log. Enforced structurally here, not just by inspection.
  try {
    process.exit(main());
  } catch (e) {
    try {
      process.stderr.write(
        `frontend-merge-nudge: unexpected error, exiting 0: ${e?.message ?? e}\n`,
      );
    } catch {
      /* stderr also gone — nothing left to do but exit clean */
    }
    process.exit(0);
  }
}

export {
  parseArgs,
  readJSON,
  readPendingTrees,
  loadSidecar,
  writeSidecar,
  postToBus,
  buildNudgeMessage,
  main,
  DAY_MS,
  SCHEMA_VERSION,
  STALE_AFTER_DAYS,
  STALE_AFTER_MS,
  NUDGE_COOLDOWN_MS,
};
