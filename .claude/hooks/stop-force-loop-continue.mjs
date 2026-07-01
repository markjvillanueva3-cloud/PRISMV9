#!/usr/bin/env node
// tier: T3
/**
 * stop-force-loop-continue.mjs — AUTONOMOUS-FLEET-MS0/U-AF-STOP-FORCE-LOOP-CONTINUE
 *
 * Stop hook that detects an ACTIVE /loop falling off the rails mid-target,
 * and injects a RESUME_LOOP directive into the per-agent handoff so the next
 * SessionStart / /startup auto-continuation picks it up.
 *
 * Problem: when a chat is running /loop N (iter < N) and Stop fires for any
 * reason — turn end, timeout, peer Bash crash, model refusal — the loop dies
 * silently. The operator returns to a chat with no active prompt; nothing
 * resumes the loop. Even if /precompact fires (per AUTOCOMPACT-AUTONOMOUS-MS0),
 * the synthesized RESUME describes "continue from last commit" — not "iter K
 * of N on task X is the active /loop, resume it."
 *
 * This hook closes that gap. On Stop:
 *
 *   1. Resolves THIS chat's stable session id (from stdin or chat-slots fallback)
 *   2. Reads loop-state for that sid via `.claude/helpers/loop-state.mjs read`
 *   3. If state exists, status=="active", and iter < target:
 *      a. Reads the per-agent handoff
 *      b. Appends/replaces a `## RESUME_LOOP` section with explicit directive:
 *         "Continue /loop on task <task> — iter <K> of <N> remaining"
 *      c. Bounds re-injection at 3 per session via stamp file (avoid infinite
 *         re-prompt loop on a truly-stuck task)
 *
 * Advisory by default (appends a RESUME_LOOP handoff note, NEVER blocks Stop). With
 * PRISM_FORCE_LOOP_BLOCK=1 it ALSO ENFORCES: blocks Stop to force in-session loop
 * continuation, bounded by a no-progress stuck-detector. Failure → warn + continue.
 *
 * Knobs:
 *   PRISM_FORCE_LOOP_CONTINUE_DISABLE=1   — skip
 *   PRISM_FORCE_LOOP_CONTINUE_MAX=3       — max re-injections per session
 *   PRISM_FORCE_LOOP_CONTINUE_VERBOSE=1   — stderr diagnostics
 *
 * Composes:
 *   .claude/helpers/loop-state.mjs (read)
 *   .claude/helpers/per-agent-handoff.mjs (read; direct write to file for the
 *     append, since per-agent-handoff write-gate doesn't have a "loop-continue
 *     append" source and we don't want to invent one — instead we patch the
 *     existing handoff's text in place via an append at end-of-file)
 *
 * @milestone AUTONOMOUS-FLEET-MS0
 * @unit U-AF-STOP-FORCE-LOOP-CONTINUE
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, statSync, mkdirSync, readdirSync, renameSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { getTranscriptTokens, CONTEXT_CAP } from "../helpers/session-token-state.mjs";

const REPO_ROOT = "H:/prism";
const HANDOFFS_DIR = process.env.PRISM_TEST_HANDOFFS_DIR || resolve(REPO_ROOT, "state/shared/handoffs");
const HELPER_LOOP = resolve(REPO_ROOT, ".claude/helpers/loop-state.mjs");
const SLOTS_JSON = resolve(REPO_ROOT, "state/shared/chat-slots.json");
const STAMP_DIR = resolve(REPO_ROOT, "state/shared/.force-loop-continue-stamps");
const RESUME_LOOP_MARKER = "## RESUME_LOOP";

const DISABLED = process.env.PRISM_FORCE_LOOP_CONTINUE_DISABLE === "1";
const VERBOSE = process.env.PRISM_FORCE_LOOP_CONTINUE_VERBOSE === "1";
const MAX_REINJECT = parseInt(process.env.PRISM_FORCE_LOOP_CONTINUE_MAX ?? "3", 10);

// ENFORCEMENT (operator directive 2026-06-11): AUTO-ENFORCE the loop instead of only
// suggesting it. When PRISM_FORCE_LOOP_BLOCK=1, an active /loop (status=running,
// iter<target) BLOCKS Stop ({decision:"block"}) to force in-session continuation.
// THREE independent bounds keep it safe (it can never spin forever or burn unbounded):
//   1. the loop's own target -- iter>=target early-returns (loop done -> stops);
//   2. the no-progress stuck-detector (PRISM_FORCE_LOOP_STUCK_LIMIT, default 3) -- a
//      wedged loop (iter not advancing) is RELEASED;
//   3. the context-token ceiling (PRISM_FORCE_LOOP_TOKEN_CEILING_PCT, default 90%) --
//      near context exhaustion we RELEASE so precompact-auto-trigger can compact; the
//      loop resumes POST-compact via the advisory RESUME_LOOP note + auto-resume.
//   NOTE: loop-state's maxRolls() cap is now effectively unbounded (DEFAULT_MAX_ROLLS 1e9,
//   operator directive 2026-06-17) AND this hook never imported it -- so termination is
//   delegated to the STUCK no-progress gate (#2) + the token ceiling (#3) + decidePlanningAction's
//   MAX_REPLANS + per-unit `iter > 2x target` on an explicit finite target. Those are the real bound.
// Verifier note (R12 -- accurate to the LIVE Stop chain): `scrutinize-before-stop` IS
// wired and runs ahead of this hook, so blocking-to-continue does not bypass scrutiny.
// `stop_on_failing_tests` / `cost-ceiling-stop` are NOT currently wired in settings.json
// (0 refs) -- do NOT rely on them as gates behind this enforcement; the token ceiling
// above is this hook's own cost backstop. Default OFF for back-compat; =1 enforces.
const BLOCK_ENFORCE = process.env.PRISM_FORCE_LOOP_BLOCK === "1";
const STUCK_LIMIT = Math.max(1, parseInt(process.env.PRISM_FORCE_LOOP_STUCK_LIMIT ?? "3", 10) || 3);
const TOKEN_CEILING_PCT = Math.max(1, Math.min(100, parseInt(process.env.PRISM_FORCE_LOOP_TOKEN_CEILING_PCT ?? "90", 10) || 90));
const STUCK_DIR = resolve(REPO_ROOT, "state/shared/.force-loop-progress-stamps");

function vlog(msg) { if (VERBOSE) process.stderr.write(`[force-loop] ${msg}\n`); }

function readStdinJson() {
  try {
    const raw = readFileSync(0, "utf-8").trim();
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}

function approveAndExit(reason) {
  vlog(`approve: ${reason}`);
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + "\n");
  process.exit(0);
}

function resolveSessionId(input) {
  if (input?.session_id && typeof input.session_id === "string") return input.session_id;
  // Fallback: most-recently-touched slot
  try {
    const slots = JSON.parse(readFileSync(SLOTS_JSON, "utf-8")).slots ?? {};
    let best = { ts: 0, id: null };
    for (const [, s] of Object.entries(slots)) {
      if (!s?.chatId) continue;
      const ts = Date.parse(s.lastHeartbeat ?? s.claimedAt ?? "1970");
      if (ts > best.ts) best = { ts, id: s.chatId };
    }
    return best.id;
  } catch { return null; }
}

function readLoopState(sid) {
  if (!existsSync(HELPER_LOOP)) return null;
  try {
    // process.execPath (absolute node path), NOT bare "node": on Windows execFileSync
    // without shell can't resolve "node" via PATHEXT -> ENOENT -> this hook was a silent
    // no-op in production (readLoopState always returned null). (fix 2026-06-11)
    const out = execFileSync(process.execPath, [HELPER_LOOP, "read", "--session", sid], { windowsHide: true, encoding: "utf-8", timeout: 3000 });
    if (!out || !out.trim()) return null;
    return JSON.parse(out);
  } catch (e) { vlog(`loop-state read err: ${e.message?.slice(0, 200)}`); return null; }
}

function reinjectCount(sid) {
  const path = resolve(STAMP_DIR, `${sid}.count`);
  try { return parseInt(readFileSync(path, "utf-8"), 10) || 0; }
  catch { return 0; }
}

function bumpReinjectCount(sid) {
  const path = resolve(STAMP_DIR, `${sid}.count`);
  mkdirSync(dirname(path), { recursive: true });
  const cur = reinjectCount(sid);
  writeFileSync(path, String(cur + 1));
  return cur + 1;
}

export function handoffNeedle(sid) {
  // Handoff files are keyed by the SHORT chatId: HANDOFF-claude-<8hex>-<topic>.md.
  // sid may arrive as a full UUID (70add462-1791-...) OR as claude-<8hex>; derive the
  // 8-hex short form. The pre-fix code did f.includes(<full-uuid>) which NEVER matched
  // (the file only carries the 8-hex prefix) -> the RESUME_LOOP append was DEAD in prod
  // (CLAUDE.md regression log; mirrors stop-task-boundary-compact-nudge fix 9fcda446a1).
  const hex = String(sid || "").replace(/^claude-/, "").slice(0, 8);
  return hex ? "claude-" + hex : "";
}

export function findHandoff(sid) {
  if (!existsSync(HANDOFFS_DIR)) return null;
  const needle = handoffNeedle(sid);
  if (!needle) return null;
  try {
    const files = readdirSync(HANDOFFS_DIR).filter(f => f.startsWith("HANDOFF-") && f.endsWith(".md") && f.includes(needle));
    if (!files.length) return null;
    // Newest matching file wins
    const sorted = files.map(f => ({ f, mtimeMs: statSync(resolve(HANDOFFS_DIR, f)).mtimeMs })).sort((a, b) => b.mtimeMs - a.mtimeMs);
    return resolve(HANDOFFS_DIR, sorted[0].f);
  } catch { return null; }
}

/**
 * Idempotent upsert of the `## RESUME_LOOP` block: replace an existing one (from the marker to
 * the NEXT `## ` section header or end-of-content), else append. PURE. The match uses
 * `[\s\S]*?` (newline-spanning by CHARACTER CLASS, not the dot) and DELIBERATELY carries NO `m`
 * flag: with `m`, the `$` in the lookahead `(?=\n##\s|$)` matches end-of-LINE, so the lazy
 * quantifier stops at the first newline and ONLY the marker header line gets replaced -- leaving
 * the rest of the prior block as a hybrid old+new corruption (the bug this fixes). Without `m`,
 * `$` is end-of-string only, so the whole prior block is consumed. (`s`/dotAll is irrelevant --
 * there is no `.` in the pattern.)
 */
export function upsertResumeBlock(content, block, marker = RESUME_LOOP_MARKER) {
  // LINE-SCANNER (R8: converged with the proven stop-goal-clear-advance.mjs upsert, 3-of-3
  // 2026-06-08). A regex is fragile here: a lazy `[\s\S]*?` with `(?=\n##\s|$)` either fails to
  // match (no `m`) or, with `m`, `$`=end-of-line orphans the block body; and the `\n*`+trimStart
  // variant GLUES the new marker onto the prior section's last line (`...thing## RESUME_LOOP`).
  // The scanner is unambiguous: drop from each RESUME_LOOP marker line until the next
  // non-RESUME_LOOP `## ` heading (or EOF), preserving every other section, then append the
  // fresh block (which carries its own leading blank line -> no glue). Handles {block-at-end,
  // block-followed-by-section, two-blocks, none}.
  const text = String(content ?? "");
  const kept = [];
  let skipping = false;
  for (const ln of text.split("\n")) {
    if (ln.trimStart().startsWith(marker)) { skipping = true; continue; } // drop the marker line
    if (skipping) {
      if (/^\s*## /.test(ln)) { skipping = false; kept.push(ln); } // next heading ends the old block
      // else: still inside the old block body -> drop
    } else {
      kept.push(ln);
    }
  }
  return kept.join("\n").replace(/\s*$/, "") + block;
}

function injectResumeLoop(handoffPath, loopState, count) {
  let content;
  try { content = readFileSync(handoffPath, "utf-8"); }
  catch { return false; }

  const remaining = loopState.target - loopState.iter;
  const block = `

${RESUME_LOOP_MARKER}

**ACTIVE /loop interrupted by Stop** (injected ${count}/${MAX_REINJECT} times by stop-force-loop-continue.mjs).

Task: ${loopState.task ?? "(unspecified)"}
Progress: iter ${loopState.iter} of ${loopState.target} (**${remaining} remaining**)
Last status: ${loopState.lastStatus ?? "unknown"}
Last note: ${loopState.lastNote ?? "(none)"}

▶ NEXT ACTION: re-invoke \`/loop ${remaining} ${loopState.task ?? "<task>"}\` to continue, OR run \`node H:/prism/.claude/helpers/loop-state.mjs end --session <sid> --reason "manual-abort"\` to abandon.

(This block is injected by the force-loop-continue Stop hook; cap = ${MAX_REINJECT} re-injections per session.)
`;

  // Idempotency: replace an existing RESUME_LOOP block, else append (see upsertResumeBlock --
  // pure, NO `m` flag; the m-flag made `$` match end-of-LINE so only the marker header was
  // replaced, leaving the rest of the prior block as a hybrid old+new corruption).
  const newContent = upsertResumeBlock(content, block);

  try {
    // Atomic write
    const tmp = `${handoffPath}.${process.pid}.tmp`;
    writeFileSync(tmp, newContent);
    renameSync(tmp, handoffPath);
    return true;
  } catch (e) { vlog(`write err: ${e.message?.slice(0, 200)}`); return false; }
}

// No-progress stuck-detector. Tracks a HIGH-WATER iter for the CURRENT task; if iter has
// NOT exceeded that high-water (same task), noProgress increments. At STUCK_LIMIT consecutive
// no-progress blocks the loop is declared wedged and released (we stop blocking), so
// enforcement can never become an infinite Stop-block. Fail-soft on any stamp I/O error.
//
// U-FORCE-LOOP-STUCK-PICKER (alpha 2026-06-21): the OLD check read the most-recent iter
// (lastIter) and treated ANY increase as progress. But loop-state `next` RESETS iter to 0 on
// every picker roll (loop-state.mjs cmdNext) WITHOUT the task completing -- so a stuck-picker
// loop (the picker re-rolling the same unstartable unit, e.g. a roadmap top-unit in a peer's
// lane) made iter oscillate 0->1->0->1, which lastIter read as intermittent "progress" ->
// noProgress NEVER reached STUCK_LIMIT -> the Stop hook nagged FOREVER with no productive path
// (escapable only by manual `loop-state end`). Fix: track a per-task high-water (maxIter) so a
// same-task iter that does NOT exceed it (incl. a roll-reset) is a STALL; a task CHANGE (a
// healthy multi-unit loop completing DISTINCT units) resets the high-water = genuine progress,
// so productive multi-unit loops are never false-released. `task` is the 4th param (back-compat:
// existing 3-arg callers pass none -> pure high-water on iter alone, which already fixes the
// reset-stall for the single-task case). Ref: reference_force_loop_continue_stuck_picker_livelock_2026_06_21.
export function progressGate(sid, iter, stampDir = STUCK_DIR, task = null) {
  const path = resolve(stampDir, `${sid}.progress`);
  let rec = { maxIter: -1, noProgress: 0, task: null };
  try { rec = JSON.parse(readFileSync(path, "utf-8")); } catch { /* fresh */ }
  if (typeof rec.noProgress !== "number") rec = { maxIter: -1, noProgress: 0, task: null };
  // Migrate a pre-fix {lastIter,noProgress} stamp: read lastIter as the high-water seed.
  const prevMax = typeof rec.maxIter === "number" ? rec.maxIter
    : (typeof rec.lastIter === "number" ? rec.lastIter : -1);
  const prevTask = typeof rec.task === "string" ? rec.task : null;
  // COUPLING (scrutiny B P2): the multi-unit no-false-release guarantee relies on loop-state always
  // writing a non-empty `task` per unit (cmdStart loop-state.mjs:183 defaults to "(unspecified)";
  // cmdNext:490 writes nextTask; an empty/exhausted pick ENDS rather than rolls). If a future writer
  // emitted an empty task on a roll, a progressing multi-unit loop could be released after STUCK_LIMIT
  // -- the SAFE direction (release, fail-soft), noted here so the coupling is explicit.
  const taskChanged = task != null && prevTask != null && task !== prevTask;
  const nextTask = task != null ? task : prevTask;
  if (taskChanged || iter > prevMax) rec = { maxIter: iter, noProgress: 0, task: nextTask };   // real progress (new task OR iter beyond high-water)
  else rec = { maxIter: prevMax, noProgress: rec.noProgress + 1, task: nextTask };              // stalled (same task, iter <= high-water -- incl. a picker-roll reset)
  try { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(rec)); } catch { /* fail-soft */ }
  return { stuck: rec.noProgress >= STUCK_LIMIT, noProgress: rec.noProgress };
}

// U-LOOP-SPIRAL-GATE consumer (slot:bravo, 2026-06-18): loop-state.mjs cmdTick flips status to
// "spiral" (recording spiralReason) when a WITHIN-UNIT consecutive-eval-FAILURE streak hits the
// critical threshold -- the operator-endorsed spiral-stop (R6: a spiral IS a stop signal, unlike a
// healthy count). This hook RELEASES such a loop (never force-continues a spiral) with an EXPLICIT
// reason + R6 recovery directive, so the spiral status is a CONSUMED stop, not an orphan signal.
// PURE + exported for R9 testing. Returns the release reason string, or null if not spiraled.
export function spiralReleaseReason(loop) {
  if (!loop || loop.status !== "spiral") return null;
  const why = (typeof loop.spiralReason === "string" && loop.spiralReason) || "consecutive failing iterations";
  return `loop SPIRAL: ${why} -- released (a spiral IS a stop signal, R6). Do NOT re-run the same failing approach: checkpoint what is solid, write a handoff, then restart the APPROACH (not the goal), or end the loop (node H:/prism/.claude/helpers/loop-state.mjs end --session <sid> --reason spiral).`;
}

export function blockReason(loop) {
  const remaining = loop.target - loop.iter;
  return `[force-loop-continue] ACTIVE /loop NOT complete -- iter ${loop.iter}/${loop.target} (${remaining} remaining). Continue the loop: do the next iteration of "${loop.task ?? "the task"}", then tick it (node H:/prism/.claude/helpers/loop-state.mjs tick --session <sid> --status ok). Do NOT stop until iter >= target or you hit a genuine spiral. To abandon: loop-state.mjs end --session <sid>.`;
}

function blockAndExit(loop) {
  process.stdout.write(JSON.stringify({ decision: "block", reason: blockReason(loop) }) + "\n");
  process.exit(0);
}

function main() {
  if (DISABLED) approveAndExit("disabled");
  const input = readStdinJson();
  const sid = resolveSessionId(input);
  if (!sid) approveAndExit("no session id");

  const loop = readLoopState(sid);
  if (!loop) approveAndExit("no active loop state");
  // U-LOOP-SPIRAL-GATE consumer: a within-unit failing-streak spiral (loop-state.mjs flips status to
  // "spiral" on a critical consecutive-eval-FAILURE streak) is RELEASED with an EXPLICIT spiral reason
  // + R6 recovery directive -- never force-continued. Consumed BEFORE the generic non-running check
  // (below) so the model gets spiral-specific guidance, not a bare "status=spiral (not running)" line.
  const spiralMsg = spiralReleaseReason(loop);
  if (spiralMsg) approveAndExit(spiralMsg);
  // FIX 2026-05-17: status is "running" in loop-state.mjs:71 (cmdStart writes it).
  // Other terminal values: "ended", "abandoned", "stale". The pre-fix gate
  // required "active" — which loop-state never writes — so this Stop hook
  // early-exited on EVERY real loop and the `## RESUME_LOOP` handoff
  // re-injection was dead code fleet-wide (regression documented in
  // CLAUDE.md, observed by claude-339c8ff7 during /checkin loop roll-in).
  if (loop.status !== "running") approveAndExit(`loop status=${loop.status} (not running)`);
  if (typeof loop.iter !== "number" || typeof loop.target !== "number") approveAndExit("loop state missing iter/target");
  if (loop.iter >= loop.target) approveAndExit(`loop complete (${loop.iter}/${loop.target})`);

  // Advisory handoff append (cross-session safety) -- bounded by MAX_REINJECT so we don't
  // spam the handoff. This does NOT gate enforcement below (the cap is for the note only).
  const count = reinjectCount(sid);
  if (count < MAX_REINJECT) {
    const handoffPath = findHandoff(sid);
    if (handoffPath) {
      const newCount = bumpReinjectCount(sid);
      const ok = injectResumeLoop(handoffPath, loop, newCount);
      vlog(`advisory inject: ok=${ok}, count=${newCount}/${MAX_REINJECT}, iter=${loop.iter}/${loop.target}`);
    } else {
      vlog("advisory inject skipped: no handoff for sid");
    }
  }

  // ENFORCEMENT: block Stop to force in-session continuation, bounded by the stuck-detector.
  if (BLOCK_ENFORCE) {
    // Cost/context backstop: near context exhaustion, RELEASE so precompact-auto-trigger
    // can compact -- the loop resumes post-compact via the advisory RESUME_LOOP note +
    // auto-resume. Bounds unattended per-session spend at the context window without
    // fighting the loop target. Fail-soft: unknown token count -> proceed to block.
    let usedPct = 0;
    try { usedPct = (getTranscriptTokens(input) / CONTEXT_CAP) * 100; } catch { usedPct = 0; }
    if (usedPct >= TOKEN_CEILING_PCT) {
      approveAndExit(`near context limit (${usedPct.toFixed(0)}% >= ${TOKEN_CEILING_PCT}%) -- releasing for compaction; loop resumes post-compact via RESUME_LOOP`);
    }
    const gate = progressGate(sid, loop.iter, undefined, loop.task);
    if (gate.stuck) {
      approveAndExit(`loop wedged: ${gate.noProgress} blocks without progress on task "${loop.task ?? "?"}" (iter=${loop.iter}/${loop.target}, rolls=${loop.rollsTotal ?? 0}) -- released. If the picker is stuck on an unstartable unit (e.g. a peer's lane), end the loop or steer: loop-state.mjs end --session <sid>.`);
    }
    vlog(`ENFORCE block: iter=${loop.iter}/${loop.target}, noProgress=${gate.noProgress}, used=${usedPct.toFixed(0)}%`);
    blockAndExit(loop);
  }

  approveAndExit("advisory-only (enforcement off)");
}

const _invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("stop-force-loop-continue.mjs");
if (_invokedDirectly) {
  try { main(); }
  catch (e) {
    vlog(`unexpected err: ${e.message}`);
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + "\n");
    process.exit(0);
  }
}
