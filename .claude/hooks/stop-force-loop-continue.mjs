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
 * Strictly advisory: NEVER blocks Stop. Failure → warn + continue.
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
import { existsSync, readFileSync, writeFileSync, statSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const REPO_ROOT = "H:/prism";
const HANDOFFS_DIR = resolve(REPO_ROOT, "state/shared/handoffs");
const HELPER_LOOP = resolve(REPO_ROOT, ".claude/helpers/loop-state.mjs");
const SLOTS_JSON = resolve(REPO_ROOT, "state/shared/chat-slots.json");
const STAMP_DIR = resolve(REPO_ROOT, "state/shared/.force-loop-continue-stamps");
const RESUME_LOOP_MARKER = "## RESUME_LOOP";

const DISABLED = process.env.PRISM_FORCE_LOOP_CONTINUE_DISABLE === "1";
const VERBOSE = process.env.PRISM_FORCE_LOOP_CONTINUE_VERBOSE === "1";
const MAX_REINJECT = parseInt(process.env.PRISM_FORCE_LOOP_CONTINUE_MAX ?? "3", 10);

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
    const out = execFileSync("node", [HELPER_LOOP, "read", "--session", sid], { encoding: "utf-8", timeout: 3000 });
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

function findHandoff(sid) {
  if (!existsSync(HANDOFFS_DIR)) return null;
  try {
    const fs = require("node:fs");
    const files = fs.readdirSync(HANDOFFS_DIR).filter(f => f.startsWith("HANDOFF-") && f.endsWith(".md") && f.includes(sid));
    if (!files.length) return null;
    // Newest matching file wins
    const sorted = files.map(f => ({ f, mtimeMs: statSync(resolve(HANDOFFS_DIR, f)).mtimeMs })).sort((a, b) => b.mtimeMs - a.mtimeMs);
    return resolve(HANDOFFS_DIR, sorted[0].f);
  } catch { return null; }
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

  // Idempotency: if a RESUME_LOOP block already exists, replace it
  const re = new RegExp(`\\n*${RESUME_LOOP_MARKER}[\\s\\S]*?(?=\\n##\\s|$)`, "m");
  let newContent;
  if (re.test(content)) {
    newContent = content.replace(re, block.trimStart());
  } else {
    newContent = content + block;
  }

  try {
    // Atomic write
    const tmp = `${handoffPath}.${process.pid}.tmp`;
    writeFileSync(tmp, newContent);
    require("node:fs").renameSync(tmp, handoffPath);
    return true;
  } catch (e) { vlog(`write err: ${e.message?.slice(0, 200)}`); return false; }
}

function main() {
  if (DISABLED) approveAndExit("disabled");
  const input = readStdinJson();
  const sid = resolveSessionId(input);
  if (!sid) approveAndExit("no session id");

  const loop = readLoopState(sid);
  if (!loop) approveAndExit("no active loop state");
  if (loop.status !== "active") approveAndExit(`loop status=${loop.status} (not active)`);
  if (typeof loop.iter !== "number" || typeof loop.target !== "number") approveAndExit("loop state missing iter/target");
  if (loop.iter >= loop.target) approveAndExit(`loop complete (${loop.iter}/${loop.target})`);

  const count = reinjectCount(sid);
  if (count >= MAX_REINJECT) approveAndExit(`re-injection cap hit (${count}/${MAX_REINJECT})`);

  const handoffPath = findHandoff(sid);
  if (!handoffPath) approveAndExit("no handoff for sid");

  const newCount = bumpReinjectCount(sid);
  const ok = injectResumeLoop(handoffPath, loop, newCount);
  vlog(`inject: ok=${ok}, count=${newCount}/${MAX_REINJECT}, iter=${loop.iter}/${loop.target}`);
  approveAndExit("done");
}

try { main(); }
catch (e) {
  vlog(`unexpected err: ${e.message}`);
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + "\n");
  process.exit(0);
}
