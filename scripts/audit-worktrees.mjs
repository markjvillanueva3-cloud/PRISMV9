#!/usr/bin/env node
/**
 * audit-worktrees.mjs — fresh, READ-ONLY audit of every git worktree.
 *
 * Built for WORKTREE-CONSOLIDATE-MS0 (P0 foundation). The 2026-05-06 audit was a
 * one-shot 10-sub-agent pass; this is the re-runnable, deterministic replacement.
 * It NEVER mutates anything — no checkout, no prune, no branch delete. It only
 * classifies each worktree so a human (or a safe-first /loop) can decide what to
 * land, what to keep, and what to propose for pruning.
 *
 * Classification (vs the BASE branch, default origin/cad-fusion-live-ms0):
 *   PRUNE       — ahead == 0 AND tracked-clean: the branch carries no commits BASE
 *                 doesn't already have, and no uncommitted tracked work. Nothing
 *                 is lost by `git worktree remove`. (Still advisory — the actual
 *                 prune step must re-check untracked files before removal.)
 *   MERGE       — ahead > 0, tracked-clean, idle > IDLE_DAYS, owner NOT alive:
 *                 a settled branch ready to land.
 *   KEEP        — ahead > 0 and (recent activity < ACTIVE_DAYS OR a live chat slot
 *                 owns the branch): active development, do not touch.
 *   INVESTIGATE — contradictions / risk: locked, detached HEAD, ahead > BIG_AHEAD,
 *                 or ahead > 0 + dirty + idle (settled but with uncommitted WIP).
 *
 * "owner alive" is the collision-risk signal — it cross-references
 * state/shared/chat-slots.json: if a slot whose lastHeartbeat is within
 * ALIVE_MINUTES is on the branch, landing/pruning it would race a live peer.
 *
 * Usage:
 *   node scripts/audit-worktrees.mjs                 # text summary + write reports
 *   node scripts/audit-worktrees.mjs --json          # JSON to stdout, still writes files
 *   node scripts/audit-worktrees.mjs --no-dirty      # skip per-worktree git status (faster)
 *   node scripts/audit-worktrees.mjs --base <ref>    # compare against a different base
 *   node scripts/audit-worktrees.mjs --no-write      # do not write report files
 *   node scripts/audit-worktrees.mjs --help
 *
 * Exit codes: 0 ok · 2 misuse · 1 audit ran but git reported a problem.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");

// ─── Tunables ───────────────────────────────────────────────────────────────
const DEFAULT_BASE = "origin/cad-fusion-live-ms0";
const ACTIVE_DAYS = 14; // last commit within this → "active"
const IDLE_DAYS = 7; // last commit older than this → "idle / settled"
const BIG_AHEAD = 500; // ahead beyond this → INVESTIGATE (too big to land blind)
const ALIVE_MINUTES = 10; // chat-slot heartbeat fresher than this → owner alive
const DAY_MS = 86_400_000;

// ─── Arg parsing ────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { json: false, noDirty: false, noWrite: false, help: false, base: DEFAULT_BASE };
  const errors = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--no-dirty") args.noDirty = true;
    else if (a === "--no-write") args.noWrite = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--base") {
      const v = argv[i + 1];
      if (!v || v.startsWith("--")) errors.push("--base requires a ref value");
      else { args.base = v; i += 1; }
    } else if (a.startsWith("--base=")) {
      args.base = a.slice("--base=".length);
    } else {
      errors.push(`unknown argument: ${a}`);
    }
  }
  return { args, errors };
}

// ─── Git helpers (all read-only) ────────────────────────────────────────────
function git(cwd, gitArgs, { timeoutMs = 120_000 } = {}) {
  return execFileSync("git", gitArgs, {
    cwd,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
}

function gitSafe(cwd, gitArgs, opts) {
  try {
    return { ok: true, out: git(cwd, gitArgs, opts).trim() };
  } catch (err) {
    return { ok: false, out: "", error: err?.message || String(err) };
  }
}

/** Parse `git worktree list --porcelain` into structured entries. */
function parseWorktrees(porcelain) {
  const entries = [];
  let cur = null;
  for (const rawLine of porcelain.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (line.startsWith("worktree ")) {
      if (cur) entries.push(cur);
      cur = { path: line.slice("worktree ".length), head: null, branch: null, locked: false, detached: false, bare: false };
    } else if (!cur) {
      continue;
    } else if (line.startsWith("HEAD ")) {
      cur.head = line.slice("HEAD ".length);
    } else if (line.startsWith("branch ")) {
      cur.branch = line.slice("branch ".length).replace(/^refs\/heads\//, "");
    } else if (line === "detached") {
      cur.detached = true;
    } else if (line === "bare") {
      cur.bare = true;
    } else if (line === "locked" || line.startsWith("locked ")) {
      cur.locked = true;
    }
  }
  if (cur) entries.push(cur);
  return entries;
}

/**
 * One for-each-ref call gets ahead/behind + last-commit metadata for EVERY
 * local branch. %(ahead-behind:) needs git >= 2.41 (we run 2.52).
 */
function collectBranchMeta(base) {
  const fmt = [
    "%(refname:short)",
    "%(objectname:short)",
    "%(ahead-behind:" + base + ")",
    "%(committerdate:unix)",
    "%(committerdate:iso8601)",
    "%(authorname)",
  ].join("\x1f");
  const res = gitSafe(REPO, ["for-each-ref", "--format=" + fmt, "refs/heads"]);
  const map = new Map();
  if (!res.ok) return { map, error: res.error };
  for (const line of res.out.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [name, sha, aheadBehind, unix, iso, author] = line.split("\x1f");
    // ahead-behind is "<ahead> <behind>"; can be empty if the base ref is gone.
    let ahead = null;
    let behind = null;
    const ab = (aheadBehind || "").trim().split(/\s+/);
    if (ab.length === 2 && ab[0] !== "") {
      ahead = Number.parseInt(ab[0], 10);
      behind = Number.parseInt(ab[1], 10);
      if (!Number.isFinite(ahead)) ahead = null;
      if (!Number.isFinite(behind)) behind = null;
    }
    const lastCommitUnix = Number.parseInt(unix, 10);
    map.set(name, {
      sha,
      ahead,
      behind,
      lastCommitUnix: Number.isFinite(lastCommitUnix) ? lastCommitUnix : null,
      lastCommitIso: iso || null,
      author: author || null,
    });
  }
  return { map, error: null };
}

/** Map branch -> { slot, chatId, alive, ageMinutes } from chat-slots.json. */
function collectLiveOwners() {
  const path = join(REPO, "state", "shared", "chat-slots.json");
  const owners = new Map();
  if (!existsSync(path)) return owners;
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return owners;
  }
  const slots = parsed?.slots || {};
  const now = Date.now();
  for (const [slotName, slot] of Object.entries(slots)) {
    if (!slot || !slot.branch) continue;
    const hb = slot.lastHeartbeat ? Date.parse(slot.lastHeartbeat) : NaN;
    const ageMinutes = Number.isFinite(hb) ? (now - hb) / 60_000 : Infinity;
    const alive = ageMinutes <= ALIVE_MINUTES;
    // Keep the freshest owner per branch.
    const prev = owners.get(slot.branch);
    if (!prev || ageMinutes < prev.ageMinutes) {
      owners.set(slot.branch, {
        slot: slotName,
        chatId: slot.chatId || null,
        topic: slot.topic || null,
        alive,
        ageMinutes: Math.round(ageMinutes * 10) / 10,
      });
    }
  }
  return owners;
}

/** Tracked-dirty count for a worktree (untracked excluded — landing safety only). */
function dirtyCount(worktreePath) {
  if (!existsSync(worktreePath)) return { count: null, note: "path missing" };
  const res = gitSafe(worktreePath, ["status", "--porcelain", "--untracked-files=no"], { timeoutMs: 60_000 });
  if (!res.ok) return { count: null, note: "status failed: " + (res.error || "").slice(0, 80) };
  const count = res.out ? res.out.split(/\r?\n/).filter(Boolean).length : 0;
  return { count, note: null };
}

// ─── Classification ─────────────────────────────────────────────────────────
function classify(wt, meta, owner, dirty, base, baseBranch) {
  const reasons = [];
  // Structural risk first.
  if (wt.locked) reasons.push("worktree is locked");
  if (wt.detached) reasons.push("detached HEAD (no branch)");
  if (wt.bare) reasons.push("bare worktree");

  if (wt.detached || wt.bare) {
    return { verdict: "INVESTIGATE", reasons };
  }

  // The worktree that holds the integration branch itself (== base, e.g. the
  // main H:/PRISM tree) is +0/-0 by definition — it must NEVER be classed PRUNE.
  if (wt.branch && baseBranch && wt.branch === baseBranch) {
    reasons.push(`integration branch worktree (== base '${baseBranch}') — never prune`);
    if (dirty?.count != null && dirty.count > 0) reasons.push(`${dirty.count} tracked-dirty file(s)`);
    return { verdict: "KEEP", reasons };
  }

  if (!meta) {
    reasons.push(`branch not found in refs/heads (orphaned worktree or base '${base}' missing)`);
    return { verdict: "INVESTIGATE", reasons };
  }

  const { ahead, behind, lastCommitUnix } = meta;
  if (ahead === null) {
    reasons.push("ahead/behind unavailable (base ref missing?)");
    return { verdict: "INVESTIGATE", reasons };
  }

  const ageDays = lastCommitUnix
    ? (Date.now() - lastCommitUnix * 1000) / DAY_MS
    : Infinity;
  const isActive = ageDays < ACTIVE_DAYS;
  const isIdle = ageDays > IDLE_DAYS;
  const ownerAlive = !!owner?.alive;
  const trackedDirty = dirty?.count != null && dirty.count > 0;

  if (ownerAlive) reasons.push(`live chat slot '${owner.slot}' owns this branch (${owner.ageMinutes}m heartbeat)`);
  if (ahead === 0) reasons.push(`0 commits ahead of ${base} — nothing unique to lose`);
  else reasons.push(`${ahead} ahead / ${behind} behind ${base}`);
  if (Number.isFinite(ageDays)) reasons.push(`last commit ${ageDays.toFixed(1)}d ago`);
  if (trackedDirty) reasons.push(`${dirty.count} tracked-dirty file(s)`);
  if (dirty?.note) reasons.push(`dirty-check: ${dirty.note}`);

  // PRUNE — nothing ahead. But a 0-ahead worktree with uncommitted tracked work
  // would LOSE that work on `git worktree remove`, so it is NOT a safe prune —
  // it is INVESTIGATE. Same if we could not confirm the dirty state at all.
  if (ahead === 0) {
    if (wt.locked) return { verdict: "INVESTIGATE", reasons };
    if (trackedDirty) {
      reasons.push("0 ahead but carries uncommitted tracked work — pruning would lose it");
      return { verdict: "INVESTIGATE", reasons };
    }
    if (dirty?.count == null) {
      reasons.push("0 ahead but dirty state could not be confirmed — verify before pruning");
      return { verdict: "INVESTIGATE", reasons };
    }
    return { verdict: "PRUNE", reasons };
  }

  // Too big to land blind.
  if (ahead > BIG_AHEAD) {
    reasons.push(`ahead > ${BIG_AHEAD} — needs scoped cherry-pick plan, not a blind land`);
    return { verdict: "INVESTIGATE", reasons };
  }

  // Active dev or owned by a live chat → leave alone.
  if (isActive || ownerAlive) {
    return { verdict: "KEEP", reasons };
  }

  // Settled (idle) with uncommitted tracked WIP → contradiction, needs a look.
  if (isIdle && trackedDirty) {
    reasons.push("idle but carries uncommitted tracked WIP — resolve before landing");
    return { verdict: "INVESTIGATE", reasons };
  }

  // MERGE requires CONFIRMED clean — mirror PRUNE's safety logic. If --no-dirty
  // was used, the dirty state is unknown and we cannot honestly mark a worktree
  // as "ready to land"; demote to INVESTIGATE so the operator re-runs with
  // dirty-check on.
  if (isIdle && dirty?.count == null) {
    reasons.push("idle, unowned, ahead>0 — but dirty state unconfirmed; re-run without --no-dirty before landing");
    return { verdict: "INVESTIGATE", reasons };
  }

  // Settled, clean, idle, unowned → ready to land.
  if (isIdle && !trackedDirty) {
    return { verdict: "MERGE", reasons };
  }

  // Anything else (e.g. between IDLE_DAYS and ACTIVE_DAYS, clean, unowned).
  reasons.push("between idle and active thresholds — borderline, defaulting to KEEP");
  return { verdict: "KEEP", reasons };
}

// ─── Report rendering ───────────────────────────────────────────────────────
function renderMarkdown(report) {
  const { generatedAt, base, counts, worktrees, gitProblems } = report;
  const L = [];
  L.push(`# WORKTREE AUDIT — ${generatedAt.slice(0, 10)}`);
  L.push("");
  L.push(`**Generated:** ${generatedAt} by \`scripts/audit-worktrees.mjs\` (READ-ONLY).`);
  L.push(`**Base:** \`${base}\` · **Worktrees:** ${worktrees.length}`);
  L.push("");
  L.push("**Classification rules:** PRUNE = 0 ahead & tracked-clean · MERGE = ahead>0, clean, idle>" +
    `${IDLE_DAYS}d, unowned · KEEP = ahead>0 & (active<${ACTIVE_DAYS}d OR live owner), or the base worktree · ` +
    "INVESTIGATE = locked/detached/ahead>" + BIG_AHEAD + "/idle+dirty/0-ahead-but-dirty.");
  L.push("");
  L.push("> Advisory only — no worktree/branch is mutated. Human-verify before any prune or land.");
  L.push("");
  L.push("## Summary");
  L.push("");
  L.push("| Verdict | Count | Meaning |");
  L.push("|---|---:|---|");
  L.push(`| KEEP | ${counts.KEEP} | Active dev / live owner — do not touch |`);
  L.push(`| MERGE | ${counts.MERGE} | Settled, clean, unowned — ready to land |`);
  L.push(`| PRUNE | ${counts.PRUNE} | 0 commits ahead — safe to \`git worktree remove\` |`);
  L.push(`| INVESTIGATE | ${counts.INVESTIGATE} | Contradiction / risk — needs a decision |`);
  L.push("");
  if (gitProblems.length) {
    L.push("⚠️ **Git problems during audit:**");
    for (const p of gitProblems) L.push(`- ${p}`);
    L.push("");
  }

  for (const verdict of ["MERGE", "PRUNE", "INVESTIGATE", "KEEP"]) {
    const rows = worktrees.filter((w) => w.verdict === verdict);
    if (!rows.length) continue;
    L.push(`## ${verdict} (${rows.length})`);
    L.push("");
    L.push("| Worktree | Branch | Ahead | Behind | Last commit | Dirty | Live owner | Notes |");
    L.push("|---|---|---:|---:|---|---:|---|---|");
    for (const w of rows.sort((a, b) => (b.ahead ?? -1) - (a.ahead ?? -1))) {
      const wtShort = w.path.replace(/^H:[\\/]/i, "").replace(/\\/g, "/");
      const lastCommit = w.lastCommitIso ? w.lastCommitIso.slice(0, 10) : "—";
      const dirty = w.dirtyCount == null ? "?" : String(w.dirtyCount);
      const owner = w.owner ? `${w.owner.slot}${w.owner.alive ? " ⚠ALIVE" : ""}` : "—";
      const notes = w.reasons.join("; ");
      L.push(`| \`${wtShort}\` | \`${w.branch ?? "(detached)"}\` | ${w.ahead ?? "—"} | ${w.behind ?? "—"} | ${lastCommit} | ${dirty} | ${owner} | ${notes} |`);
    }
    L.push("");
  }
  L.push("---");
  L.push(`_Re-run: \`node scripts/audit-worktrees.mjs\`. JSON sibling: \`WORKTREE-AUDIT-${generatedAt.slice(0, 10)}.json\`._`);
  L.push("");
  return L.join("\n");
}

// ─── Main ───────────────────────────────────────────────────────────────────
function main() {
  const { args, errors } = parseArgs(process.argv.slice(2));
  if (errors.length) {
    for (const e of errors) process.stderr.write(`audit-worktrees: ${e}\n`);
    process.exit(2);
  }
  if (args.help) {
    process.stdout.write(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 33).join("\n") + "\n");
    process.exit(0);
  }

  const gitProblems = [];

  const wtRes = gitSafe(REPO, ["worktree", "list", "--porcelain"]);
  if (!wtRes.ok) {
    process.stderr.write(`audit-worktrees: cannot list worktrees: ${wtRes.error}\n`);
    process.exit(1);
  }
  const worktrees = parseWorktrees(wtRes.out);

  const { map: branchMeta, error: metaError } = collectBranchMeta(args.base);
  if (metaError) gitProblems.push(`for-each-ref failed: ${metaError}`);
  if (branchMeta.size === 0) gitProblems.push(`no branch metadata collected — is base '${args.base}' fetched?`);

  const liveOwners = collectLiveOwners();
  const baseBranch = args.base.replace(/^origin\//, "");

  const audited = [];
  const counts = { KEEP: 0, MERGE: 0, PRUNE: 0, INVESTIGATE: 0 };
  for (const wt of worktrees) {
    const meta = wt.branch ? branchMeta.get(wt.branch) || null : null;
    const owner = wt.branch ? liveOwners.get(wt.branch) || null : null;
    const dirty = args.noDirty ? { count: null, note: "skipped (--no-dirty)" } : dirtyCount(wt.path);
    const { verdict, reasons } = classify(wt, meta, owner, dirty, args.base, baseBranch);
    counts[verdict] += 1;
    audited.push({
      path: wt.path,
      branch: wt.branch,
      head: wt.head ? wt.head.slice(0, 12) : null,
      locked: wt.locked,
      detached: wt.detached,
      bare: wt.bare,
      ahead: meta?.ahead ?? null,
      behind: meta?.behind ?? null,
      lastCommitIso: meta?.lastCommitIso ?? null,
      lastCommitAuthor: meta?.author ?? null,
      dirtyCount: dirty.count,
      dirtyNote: dirty.note,
      owner,
      verdict,
      reasons,
    });
  }

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    base: args.base,
    tunables: { ACTIVE_DAYS, IDLE_DAYS, BIG_AHEAD, ALIVE_MINUTES },
    counts,
    gitProblems,
    worktrees: audited,
  };

  if (!args.noWrite) {
    const date = report.generatedAt.slice(0, 10);
    const outDir = join(REPO, "state", "shared");
    mkdirSync(outDir, { recursive: true });
    const jsonPath = join(outDir, `WORKTREE-AUDIT-${date}.json`);
    const mdPath = join(outDir, `WORKTREE-AUDIT-${date}.md`);
    writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n");
    writeFileSync(mdPath, renderMarkdown(report));
    if (!args.json) {
      process.stdout.write(`Wrote ${mdPath}\n`);
      process.stdout.write(`Wrote ${jsonPath}\n`);
    }
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    process.stdout.write(`\nWORKTREE AUDIT — base ${args.base} — ${worktrees.length} worktrees\n`);
    process.stdout.write(
      `  KEEP ${counts.KEEP} · MERGE ${counts.MERGE} · PRUNE ${counts.PRUNE} · INVESTIGATE ${counts.INVESTIGATE}\n`,
    );
    for (const verdict of ["MERGE", "PRUNE", "INVESTIGATE"]) {
      const rows = audited.filter((w) => w.verdict === verdict);
      if (!rows.length) continue;
      process.stdout.write(`\n  ${verdict}:\n`);
      for (const w of rows.sort((a, b) => (b.ahead ?? -1) - (a.ahead ?? -1))) {
        const wtShort = w.path.replace(/^H:[\\/]/i, "");
        process.stdout.write(
          `   · ${wtShort}  [${w.branch ?? "detached"}]  +${w.ahead ?? "?"}/-${w.behind ?? "?"}` +
          `${w.dirtyCount ? ` dirty:${w.dirtyCount}` : ""}${w.owner?.alive ? " ⚠ALIVE-OWNER" : ""}\n`,
        );
      }
    }
    process.stdout.write("\n");
  }

  process.exit(gitProblems.length ? 1 : 0);
}

main();
