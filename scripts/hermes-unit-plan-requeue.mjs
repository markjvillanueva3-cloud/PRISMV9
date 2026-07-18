#!/usr/bin/env node
/**
 * hermes-unit-plan-requeue.mjs  (HERMES-UNIT-PLAN / U-ZULU-UNITPLAN-REQUEUE, slot:zulu)
 *
 * The MISSING loop-closure stage for knowledge/hermes-outputs/MASTER-UNIT-PLAN.md.
 *
 * THE DEAD-END IT FIXES (operator directive 2026-07-03, "no down time"):
 *   draft -> verify -> build-ready -> surface already runs autonomously. But a draft the verify
 *   stage marks NEEDS-REWORK is a DEAD END: hermes-unit-plan-verify-harness REMOVES it from
 *   build-ready-queue.json, yet the drafter left its Status = "Drafted (hermes ...)", so
 *   hermes-unit-plan-harness.orderQueue EXCLUDES it (status != "Not Started") and never re-drafts
 *   it. Dropped from the build queue AND skipped by the drafter -- stuck forever, the silent-done
 *   failure mode (R12). Live at build time: UNIT-0024/0027/0029/0037 were all stuck NEEDS-REWORK.
 *
 * ROOT CAUSE of most NEEDS-REWORK: the drafter's default token budget truncates the model
 *   mid-reasoning ("reasoning-only completion (raise PRISM_UNITPLAN_MAX_TOKENS)"). So the fix is a
 *   RE-DRAFT at a HIGHER token budget, not a new drafter. This stage reuses the drafter's own
 *   proven --unit path (no forked LLM logic).
 *
 * WHAT ONE RUN DOES (preview by default; --apply acts):
 *   1. Scan units/work/UNIT-*-verify.json for verdict == "NEEDS-REWORK".
 *   2. AWAITING-VERIFY gate: skip a unit whose draft is NEWER than its verify.json -- a redraft
 *      already happened and the verify cron just hasn't re-graded it yet (no wasted LLM call).
 *   3. STRUCTURAL gate: gapVerdict "split"/"replace" -> needs-human (a redraft can't fix "split
 *      this unit"). Surfaced durably to units/work/NEEDS-HUMAN.md, never looped.
 *   4. CAP gate: a unit already PRODUCED-redrafted REDRAFT_CAP times (still NEEDS-REWORK) ->
 *      needs-human. Only redrafts that ACTUALLY produced a draft count (a lock-contention / dark-
 *      lane no-op does NOT burn the budget -- fixes the "lifetime-cumulative counter" regression
 *      class where a transient outage permanently stranded a recoverable unit).
 *   5. For each remaining target (up to --cap): back up the thin draft (rename, copy-fallback),
 *      reset the unit spec Status -> "Not Started" via an ATOMIC temp+rename write (shared fleet
 *      file -- same convention as the drafter), spawn hermes-unit-plan-harness.mjs --unit <id>
 *      with PRISM_UNITPLAN_MAX_TOKENS bumped, then ledger a "redraft-reset" row carrying
 *      produced:<bool> (true iff the spawn actually emitted a fresh draft). The next verify-cron
 *      re-verifies the fresh draft; a real one now promotes into build-ready-queue.
 *
 * CONCURRENCY: this stage runs both as its own 19-min cron AND as autonomous-unit-plan-loop step
 *   4, so it takes its OWN lock (clone of the drafter's lock) to serialize the two -- the inner
 *   draft write is already serialized by the spawned harness's lock, but the backup+reset+ledger
 *   must not double-run.
 *
 * BOUNDARY (sibling of the drafter + verifier): writes ONLY under knowledge/hermes-outputs/ and
 *   state/shared/. Never touches repo source, never marks a unit Complete, never builds. The
 *   redraft is still an UNREVIEWED draft a specialist owns.
 *
 * CLI:
 *   node scripts/hermes-unit-plan-requeue.mjs                    # PREVIEW stuck rework units
 *   node scripts/hermes-unit-plan-requeue.mjs --apply [--cap 3]  # redraft up to cap of them
 *   node scripts/hermes-unit-plan-requeue.mjs --apply --id 0027  # redraft one specific unit
 *   node scripts/hermes-unit-plan-requeue.mjs --json
 * Env: PRISM_UNITPLAN_REDRAFT_MAX_TOKENS (default 12000), PRISM_UNITPLAN_REDRAFT_DISABLE=1.
 * Exit: 0 healthy (even if 0 redrafted). 2 = broken (read phase).
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PATHS, writeAtomic, failCappedIds } from "./hermes-unit-plan-harness.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HARNESS = path.join(HERE, "hermes-unit-plan-harness.mjs");

export const REDRAFT_CAP = 2;                 // max PRODUCED redraft attempts per unit before human
export const STRUCTURAL_VERDICTS = new Set(["split", "replace"]); // a redraft cannot fix these
const LEDGER_TAIL_BYTES = 5_000_000;          // bounded tail (matches the harness) -- the append-only
                                              // ledger never rotates; failCap streak + produced-count
                                              // need only the recent rows, not the whole file (P2).
const REDRAFT_MAX_TOKENS = (() => {
  const n = Number(process.env.PRISM_UNITPLAN_REDRAFT_MAX_TOKENS);
  return Number.isInteger(n) && n >= 4096 ? n : 12000;
})();
const REDRAFT_TIMEOUT_MS = 480000;
const RENAME_RETRY_CODES = new Set(["EPERM", "EBUSY", "EACCES"]);
const STALE_LOCK_MS = 25 * 60 * 1000; // > the 20-min task ExecutionTimeLimit; a longer-held lock is dead
// Own lock path, sibling to the drafter's (state/shared/.cron-locks/), so the cron + loop serialize.
const LOCK_DIR = path.join(path.dirname(PATHS.lockDir), "hermes-unit-plan-requeue.lock");

// ---------------------------------------------------------------------------
// Pure core (exported for tests)
// ---------------------------------------------------------------------------

/** Reset a unit spec's **Status** line to "Not Started" so the drafter re-picks it.
 *  Returns null when there is no Status line (caller logs + skips the write). Pure.
 *  Uses [ \t]* (NOT \s*) after the colon so an empty `**Status**:` value cannot let the match
 *  span into the following line and delete it (scrutiny P2); .* (not .+) tolerates an empty value. */
export function resetStatusToNotStarted(unitText) {
  if (!/^\*\*Status\*\*:/m.test(unitText)) return null;
  return unitText.replace(/^\*\*Status\*\*:[ \t]*.*$/m, "**Status**: Not Started");
}

/** Count PRODUCED redraft attempts for a unit id from ledger text -- only rows that actually
 *  emitted a fresh draft (produced === true). A no-op spawn (lock held / dark lanes) ledgers
 *  produced:false and is NOT counted, so a transient outage never burns the redraft budget
 *  (fixes the lifetime-cumulative-counter regression). Legacy rows without a `produced` field are
 *  NOT counted (they predate this contract; counting them would re-strand recovered units). Pure. */
export function countProducedRedrafts(ledgerText, id) {
  let n = 0;
  for (const line of String(ledgerText || "").split(/\r?\n/)) {
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (r && r.unitId === id && r.action === "redraft-reset" && r.produced === true) n++;
  }
  return n;
}

/** A NEEDS-REWORK unit whose draft is NEWER than its verify verdict is AWAITING re-verification
 *  (a redraft already landed; the verify cron just hasn't re-graded it) -- do not re-draft it.
 *  Pure over the two mtimes (ms). Missing draft (mtime 0/null) -> not awaiting. */
export function isAwaitingVerify(draftMtimeMs, verifyMtimeMs) {
  return Number(draftMtimeMs) > 0 && Number(verifyMtimeMs) > 0 && Number(draftMtimeMs) > Number(verifyMtimeMs);
}

/**
 * Decide the disposition of a NEEDS-REWORK unit. Pure over (verify, producedAttempts, flags).
 * flags: { awaiting, failCapped }.
 * -> "skip"          : not NEEDS-REWORK (should not be a target)
 * -> "awaiting-verify": a fresh draft exists, verify pending -> leave it for the verify cron
 * -> "needs-human"   : structural (split/replace) OR the drafter fail-capped it (un-draftable:
 *                      too large even at the bumped budget, or lanes dark >= FAIL_CAP times --
 *                      the harness's OWN give-up signal, so we never silently no-op-loop on a
 *                      unit the drafter itself refuses; scrutiny arm C P1) OR at/over the
 *                      produced-redraft cap.
 * -> "redraft"       : re-draftable now
 * failCapped is checked BEFORE the produced cap because a fail-capped unit's spawns are pure
 * no-ops (produced:false forever) -- without this it would loop invisibly.
 */
export function disposition(verify, producedAttempts, flags = {}, cap = REDRAFT_CAP) {
  const { awaiting = false, failCapped = false } = flags;
  if (!verify || verify.verdict !== "NEEDS-REWORK") return "skip";
  if (awaiting) return "awaiting-verify";
  if (STRUCTURAL_VERDICTS.has(verify.gapVerdict)) return "needs-human";
  if (failCapped) return "needs-human";
  if (producedAttempts >= cap) return "needs-human";
  return "redraft";
}

// ---------------------------------------------------------------------------
// IO / orchestration
// ---------------------------------------------------------------------------

function acquireLock(lockDir) {
  fs.mkdirSync(path.dirname(lockDir), { recursive: true });
  try {
    fs.mkdirSync(lockDir, { recursive: false });
    fs.writeFileSync(path.join(lockDir, "pid"), String(process.pid));
    return true;
  } catch {
    try {
      const age = Date.now() - fs.statSync(lockDir).mtimeMs;
      if (age > STALE_LOCK_MS) {
        const grave = `${lockDir}.stale-${process.pid}`;
        fs.renameSync(lockDir, grave);
        fs.rmSync(grave, { recursive: true, force: true });
        return acquireLock(lockDir);
      }
    } catch { /* lost the takeover race; treat as held */ }
    return false;
  }
}
function releaseLock(lockDir) {
  try {
    const owner = fs.readFileSync(path.join(lockDir, "pid"), "utf8").trim();
    if (owner !== String(process.pid)) return; // a peer took over -- leave their lock intact
  } catch { /* pid gone -- best-effort remove */ }
  try { fs.rmSync(lockDir, { recursive: true, force: true }); } catch { /* best-effort */ }
}

function readVerifyFiles(workDir) {
  let files = [];
  try { files = fs.readdirSync(workDir).filter(f => /^UNIT-\d{4}-verify\.json$/.test(f)); } catch { return []; }
  const out = [];
  for (const f of files.sort()) {
    try {
      const p = path.join(workDir, f);
      const obj = JSON.parse(fs.readFileSync(p, "utf8"));
      obj.__mtimeMs = (() => { try { return fs.statSync(p).mtimeMs; } catch { return 0; } })();
      out.push(obj);
    } catch { /* skip bad json */ }
  }
  return out;
}

function draftMtime(workDir, id) {
  try { return fs.statSync(path.join(workDir, `UNIT-${id}-draft.md`)).mtimeMs; } catch { return 0; }
}

function findSpecFile(unitsDir, id) {
  try { return fs.readdirSync(unitsDir).find(f => new RegExp(`^UNIT-${id}\\b`).test(f)) || null; } catch { return null; }
}

/** Back up a draft; rename with retry, copy-fallback so an EPERM/EBUSY hold never silently loses
 *  the seed (scrutiny P2). Returns {backedUp, bak?}. */
function backupDraft(draftPath, nowMs) {
  if (!fs.existsSync(draftPath)) return { backedUp: false };
  const bak = draftPath.replace(/\.md$/, `.thin-${nowMs}.bak`);
  for (let a = 0; ; a++) {
    try { fs.renameSync(draftPath, bak); return { backedUp: true, bak }; }
    catch (e) {
      if (a < 3 && RENAME_RETRY_CODES.has(e.code)) { const until = Date.now() + 120; while (Date.now() < until) { /* spin */ } continue; }
      try { fs.copyFileSync(draftPath, bak); try { fs.rmSync(draftPath, { force: true }); } catch {} return { backedUp: true, bak, viaCopy: true }; }
      catch { return { backedUp: false }; }
    }
  }
}

/** Default spawn: re-run the drafter for one unit at a bumped token budget. Returns produced:true
 *  iff the drafter emitted a fresh draft ("OK UNIT-<id>" in its stdout). */
function defaultSpawn(id, maxTokens) {
  const res = spawnSync(process.execPath, [HARNESS, "--unit", id], {
    env: { ...process.env, PRISM_UNITPLAN_MAX_TOKENS: String(maxTokens) },
    encoding: "utf8", timeout: REDRAFT_TIMEOUT_MS,
  });
  const out = `${res.stdout || ""}${res.stderr || ""}`;
  const produced = new RegExp(`\\bOK UNIT-${id}\\b`).test(out);
  const tail = out.trim().split(/\r?\n/).slice(-1)[0] || "";
  return { exit: res.status ?? null, produced, tail };
}

/** Durably surface the current needs-human set (structural + over-cap) so a hard unit never
 *  silently parks (scrutiny P2). Atomic write; idempotent (always reflects the current set). */
function writeNeedsHuman(workDir, entries, nowIso) {
  const p = path.join(workDir, "NEEDS-HUMAN.md");
  const lines = [
    "# MASTER-UNIT-PLAN -- NEEDS-HUMAN units (auto-surfaced by hermes-unit-plan-requeue)",
    "",
    "> Units the autonomous redraft stage cannot advance: a structural (split/replace) verdict a",
    "> redraft cannot fix, or a unit past the produced-redraft cap. A human must split/redesign or",
    "> hand-build them. Regenerated each requeue run.",
    `> Updated ${nowIso}`,
    "",
    entries.length ? "| id | reason | attempts |\n|----|--------|----------|" : "_(none -- every NEEDS-REWORK unit is auto-redraftable)_",
    ...entries.map(e => `| ${e.id} | ${e.reason} | ${e.attempts} |`),
    "",
  ];
  try { writeAtomic(p, lines.join("\n")); } catch { /* never brick the cron */ }
}

/**
 * Preview or apply the redraft of stuck NEEDS-REWORK units. Dependency-injectable for tests:
 *   opts.paths  {workDir,unitsDir,ledger,lockDir}  (defaults to the live PATHS + LOCK_DIR)
 *   opts.spawnFn (id, maxTokens) => {exit, produced, tail}  (defaults to the real drafter spawn)
 *   opts.nowMs   clock for .bak names (defaults Date.now())
 */
export function requeue({ apply = false, id = null, cap = 3, maxTokens = REDRAFT_MAX_TOKENS,
                          paths = null, spawnFn = defaultSpawn, nowMs = null } = {}) {
  const P = paths || { workDir: PATHS.workDir, unitsDir: PATHS.unitsDir, ledger: PATHS.ledger, lockDir: LOCK_DIR };
  const clock = () => (nowMs != null ? nowMs : Date.now());
  const nowIso = new Date(clock()).toISOString();

  // Serialize cron vs loop (skip the lock in preview -- read-only).
  let locked = false;
  if (apply) {
    if (!acquireLock(P.lockDir)) return { apply, redrafted: 0, targets: 0, maxTokens, locked: false, actions: [{ action: "skip", reason: "another requeue run holds the lock" }] };
    locked = true;
  }
  try {
    // Bounded tail read (P2): the append-only ledger never rotates. failCappedIds' consecutive
    // streak resets on any ok:true draft, so the tail's final streak value is what matters; a 5 MB
    // tail holds thousands of rows -- ample for both the fail-cap streak and the produced-count.
    const led = (() => { try { return fs.readFileSync(P.ledger, "utf8").slice(-LEDGER_TAIL_BYTES); } catch { return ""; } })();
    const failCapped = failCappedIds(led); // the harness's OWN give-up set: >= FAIL_CAP consecutive failed drafts
    const reworks = readVerifyFiles(P.workDir).filter(v => v && v.verdict === "NEEDS-REWORK");
    const targets = id ? reworks.filter(v => v.id === String(id).padStart(4, "0")) : reworks;
    const actions = [];
    const humans = [];
    let redrafted = 0;

    for (const v of targets) {
      const attempts = countProducedRedrafts(led, v.id);
      const awaiting = isAwaitingVerify(draftMtime(P.workDir, v.id), v.__mtimeMs);
      const capped = failCapped.has(v.id);
      const disp = disposition(v, attempts, { awaiting, failCapped: capped }, REDRAFT_CAP);

      if (disp === "awaiting-verify") { actions.push({ id: v.id, action: "awaiting-verify" }); continue; }
      if (disp === "needs-human") {
        const reason = STRUCTURAL_VERDICTS.has(v.gapVerdict) ? `structural:${v.gapVerdict}`
          : capped ? "drafter-fail-capped(un-draftable: too-large or lanes-dark)"
          : `redraft-cap(${REDRAFT_CAP})`;
        humans.push({ id: v.id, reason, attempts });
        actions.push({ id: v.id, action: "needs-human", reason, attempts });
        continue;
      }
      if (disp !== "redraft") { actions.push({ id: v.id, action: "skip", reason: `verdict:${v.verdict}` }); continue; }
      if (redrafted >= cap) { actions.push({ id: v.id, action: "deferred", reason: `cap(${cap}) this run` }); continue; }
      if (!apply) { actions.push({ id: v.id, action: "would-redraft", attempts, critical: (v.critical || []).length, bodyChars: v.metrics?.bodyChars ?? null }); redrafted++; continue; }

      const specFile = findSpecFile(P.unitsDir, v.id);
      if (!specFile) { actions.push({ id: v.id, action: "skip", reason: "no-spec-file" }); continue; }
      const specPath = path.join(P.unitsDir, specFile);
      // 1. back up the failing draft (never lose the seed)
      const draftPath = path.join(P.workDir, `UNIT-${v.id}-draft.md`);
      const bk = backupDraft(draftPath, clock());
      // 2. reset Status -> Not Started via an ATOMIC write (shared fleet file; scrutiny P1b)
      let resetOk = false;
      try {
        const t = fs.readFileSync(specPath, "utf8");
        const reset = resetStatusToNotStarted(t);
        if (reset && reset !== t) { writeAtomic(specPath, reset); resetOk = true; }
        else if (reset === t) resetOk = true; // already Not Started -- fine
      } catch { /* resetOk stays false -> logged below */ }
      // 3. re-run the drafter for just this unit at a bumped token budget
      const sp = spawnFn(v.id, maxTokens);
      // 4. ledger AFTER the spawn, carrying produced -- only a real draft counts toward the cap
      //    (scrutiny P1a). fail-CLOSED: if the ledger append throws we still surface it, but the
      //    attempt simply won't count next run (favours retry over false give-up).
      try {
        fs.mkdirSync(path.dirname(P.ledger), { recursive: true });
        fs.appendFileSync(P.ledger, JSON.stringify({
          schemaVersion: "1.0.0", ts: nowIso, unitId: v.id, action: "redraft-reset",
          ok: resetOk, produced: !!sp.produced, reason: "needs-rework",
          prevChars: v.metrics?.bodyChars ?? null, prevCritical: (v.critical || []).length, maxTokens,
          backedUp: !!bk.backedUp, exit: sp.exit ?? null,
        }) + "\n");
      } catch { /* non-fatal; uncounted attempt retries next run */ }
      actions.push({ id: v.id, action: "redrafted", resetOk, produced: !!sp.produced, exit: sp.exit ?? null, tail: sp.tail || "" });
      redrafted++;
    }

    // Durably surface every needs-human unit found this run (idempotent full-set snapshot).
    // Only on a FULL scan -- a targeted --id run's `humans` holds at most that one unit, so
    // regenerating from it would transiently drop every OTHER needs-human unit (arm A P2). The
    // 19-min cron/loop always run without --id, so the durable file stays complete.
    if (apply && !id) writeNeedsHuman(P.workDir, humans, nowIso);
    return { apply, redrafted, targets: targets.length, maxTokens, locked, actions };
  } finally {
    if (locked) releaseLock(P.lockDir);
  }
}

export async function main(argv = process.argv.slice(2)) {
  if (process.env.PRISM_UNITPLAN_REDRAFT_DISABLE === "1") { console.log("PRISM_UNITPLAN_REDRAFT_DISABLE=1 -- no-op"); return 0; }
  const has = (n) => argv.includes(n);
  const arg = (n, d) => { const i = argv.indexOf(n); return i === -1 ? d : argv[i + 1]; };
  let out;
  try {
    out = requeue({ apply: has("--apply"), id: arg("--id", null), cap: Number(arg("--cap", 3)) || 3 });
  } catch (e) { console.error(`REQUEUE BROKEN (read phase): ${e.message}`); return 2; }
  if (has("--json")) { console.log(JSON.stringify(out, null, 2)); return 0; }
  console.log(`requeue ${out.apply ? "APPLIED" : "PREVIEW"} -- ${out.targets} NEEDS-REWORK, ${out.redrafted} ${out.apply ? "redrafted" : "would-redraft"} (tokens=${out.maxTokens})`);
  for (const a of out.actions) {
    console.log(`  ${a.id || "-"} ${a.action}` + (a.reason ? ` (${a.reason})` : "") + (a.produced != null ? ` produced=${a.produced}` : "") + (a.exit != null ? ` exit=${a.exit}` : "") + (a.tail ? ` | ${a.tail}` : ""));
  }
  return 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().then(c => process.exit(c), e => { console.error(`REQUEUE BROKEN: ${e?.stack || e}`); process.exit(2); });
