#!/usr/bin/env node
// tier: T3
/**
 * stop-task-boundary-compact-nudge.mjs -- SESSION-CONTINUITY-AGENTIC/U-TASK-BOUNDARY-COMPACT
 *
 * Stop hook that recognizes a CLEAN TASK/BATCH BOUNDARY and nudges a compact
 * BEFORE the next heavy build -- the operator's repeatedly-asked behavior
 * ("you often suggest to compact before another major build", "after completing
 * a large batch of tasks ... before continuing heavy building").
 *
 * THE GAP. Two existing triggers cover the ENDS of the spectrum, not the middle:
 *   - precompact-auto-trigger.mjs fires at the 88% TOKEN WALL (SOFT 880K) -- by
 *     then you may already be mid-next-build, so the compact interrupts work.
 *   - checkpoint-auto-trigger.mjs fires on EDIT COUNT -- orthogonal (it snapshots,
 *     it doesn't recognize a shipping seam).
 * Neither recognizes the SEMANTIC seam the operator describes: a batch of units
 * just SHIPPED (commits landed) AND context is moderately full -- the ideal
 * moment to compact is RIGHT HERE, at the clean boundary, so the next heavy build
 * starts in a fresh window instead of spiraling into the 88% wall halfway through.
 *
 * This hook is that middle trigger. On Stop, when BOTH hold:
 *   (a) a substantial batch shipped THIS session window: N commits whose MESSAGE
 *       carries `(slot:<this-slot>` within the lookback window (>= MIN_COMMITS).
 *       (rev-list --grep matches the whole message; the `(slot:<slot>` token lives
 *       in the subject by convention, so message-wide matching is exact in practice.)
 *   (b) context is in the EARLY-SEAM BAND [MIN_PCT, MAX_PCT) -- past a soft
 *       boundary (default 55%) but BELOW the precompact-auto-trigger wall
 *       (default 85% < the 88% SOFT, so the two never double-nudge),
 * it (1) appends a durable `## COMPACT_SEAM` advisory to this chat's per-agent
 * handoff (so whenever the compact happens -- operator or native auto@90% -- the
 * post-compact resume starts from this clean seam, never a mid-build mess), and
 * (2) surfaces a LOUD "compact before next heavy build" directive.
 *
 * HONEST LIMIT (R12). A chat CANNOT self-fire /compact (no programmatic REPL
 * injection; CLAUDE_AUTOCOMPACT_PCT_OVERRIDE is launch-time-only). So this hook
 * builds ONLY the buildable half: it SURFACES the boundary + PRESERVES state at
 * its most-accurate moment. The actual compact is native auto-compact@90% or the
 * operator. The optional ENFORCE knob blocks Stop (keeps the turn alive so the
 * model writes the handoff) -- it still cannot force the compact itself.
 *
 * Strictly advisory by default: NEVER blocks Stop. Bounded MAX_NUDGE/session via
 * stamp file. Any failure -> warn + continue (fail-soft).
 *
 * Knobs:
 *   PRISM_TASK_BOUNDARY_COMPACT_DISABLE=1     -- skip entirely
 *   PRISM_TASK_BOUNDARY_COMPACT_ENFORCE=1     -- block Stop (default OFF = advisory)
 *   PRISM_TASK_BOUNDARY_COMPACT_MAX=3         -- max nudges per session
 *   PRISM_TASK_BOUNDARY_COMPACT_MIN_PCT=0.55  -- lower ctx band edge (inclusive)
 *   PRISM_TASK_BOUNDARY_COMPACT_MAX_PCT=0.85  -- upper ctx band edge (exclusive; precompact-auto owns >= this)
 *   PRISM_TASK_BOUNDARY_COMPACT_MIN_COMMITS=3 -- min shipped commits to count as a "batch"
 *   PRISM_TASK_BOUNDARY_COMPACT_WINDOW="6 hours ago" -- git --since lookback for the batch
 *   PRISM_TASK_BOUNDARY_COMPACT_VERBOSE=1     -- stderr diagnostics
 *
 * Test-injectable overrides (production path unchanged when unset):
 *   PRISM_TEST_REPO_ROOT, PRISM_TEST_SLOTS_FILE, PRISM_TEST_SIDECAR_DIR,
 *   PRISM_TEST_HANDOFFS_DIR, PRISM_TEST_STAMP_DIR,
 *   PRISM_TEST_BATCH_COUNT (bypass git spawn with a literal count)
 *
 * Composes: chat-slots.json (sid -> slot + chatId) + token-budget-<slot>.json
 *   (ctx.pct, same sidecar precompact-auto-trigger reads) + per-agent handoff
 *   (anchored append by the resolved chatId).
 *
 * @milestone SESSION-CONTINUITY-AGENTIC
 * @unit U-TASK-BOUNDARY-COMPACT
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, statSync, mkdirSync, readdirSync, renameSync } from "node:fs";
import { resolve, dirname, join } from "node:path";

const REPO_ROOT = process.env.PRISM_TEST_REPO_ROOT || "H:/prism";
const HANDOFFS_DIR = process.env.PRISM_TEST_HANDOFFS_DIR || resolve(REPO_ROOT, "state/shared/handoffs");
const SLOTS_FILE = process.env.PRISM_TEST_SLOTS_FILE || resolve(REPO_ROOT, "state/shared/chat-slots.json");
const SIDECAR_DIR = process.env.PRISM_TEST_SIDECAR_DIR || resolve(REPO_ROOT, "state/shared");
const STAMP_DIR = process.env.PRISM_TEST_STAMP_DIR || resolve(REPO_ROOT, "state/shared/.task-boundary-compact-stamps");
const SEAM_MARKER = "## COMPACT_SEAM";
const SIDECAR_TTL_MS = 180_000; // matches precompact-auto-trigger SIDECAR_TTL_MS
const GIT_TIMEOUT_MS = 5000;    // bound the rev-list spawn (only runs when ctx already in band)

// finiteOr: a malformed knob (e.g. PRISM_..._MAX=abc) must NOT silently disable
// the cap/floor (NaN comparisons are always false -> unbounded). Fall back to the
// documented default on any non-finite value. (Function decl is hoisted.)
function finiteOr(raw, fallback) { const n = Number(raw); return Number.isFinite(n) ? n : fallback; }

const DISABLED = process.env.PRISM_TASK_BOUNDARY_COMPACT_DISABLE === "1";
const ENFORCE = process.env.PRISM_TASK_BOUNDARY_COMPACT_ENFORCE === "1";
const VERBOSE = process.env.PRISM_TASK_BOUNDARY_COMPACT_VERBOSE === "1";
const MAX_NUDGE = Math.max(1, Math.trunc(finiteOr(process.env.PRISM_TASK_BOUNDARY_COMPACT_MAX, 3)));
const MIN_PCT = finiteOr(process.env.PRISM_TASK_BOUNDARY_COMPACT_MIN_PCT, 0.55);
const MAX_PCT = finiteOr(process.env.PRISM_TASK_BOUNDARY_COMPACT_MAX_PCT, 0.85);
const MIN_COMMITS = Math.max(1, Math.trunc(finiteOr(process.env.PRISM_TASK_BOUNDARY_COMPACT_MIN_COMMITS, 3)));
const WINDOW = process.env.PRISM_TASK_BOUNDARY_COMPACT_WINDOW ?? "6 hours ago";

function vlog(msg) { if (VERBOSE) process.stderr.write(`[task-boundary-compact] ${msg}\n`); }

// Sanitize a session id before it joins a file path (clone of the precompact-auto
// /critical-memory siblings' safeSid). Prevents `../../x` from escaping STAMP_DIR.
function safeSid(sid) {
  if (typeof sid !== "string" || !sid) return "global";
  return sid.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 80) || "global";
}

function readStdinJson() {
  try {
    const raw = readFileSync(0, "utf-8").trim();
    if (!raw || !raw.startsWith("{")) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}

function approveAndExit(reason) {
  vlog(`approve: ${reason}`);
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + "\n");
  process.exit(0);
}

function safeJson(p) {
  try { return JSON.parse(readFileSync(p, "utf-8")); } catch { return null; }
}

// stdin.session_id authoritative; fallback = most-recently-touched slot (clone
// of stop-force-loop-continue.resolveSessionId).
function resolveSessionId(input) {
  if (input?.session_id && typeof input.session_id === "string") return input.session_id;
  const doc = safeJson(SLOTS_FILE);
  const slots = doc?.slots ?? {};
  let best = { ts: 0, id: null };
  for (const [, s] of Object.entries(slots)) {
    if (!s?.chatId) continue;
    const ts = Date.parse(s.lastHeartbeat ?? s.claimedAt ?? "1970");
    if (ts > best.ts) best = { ts, id: s.chatId };
  }
  return best.id;
}

// sid -> { slot, chatId } via chat-slots.json. The stdin session_id is the FULL
// uuid (db273e77-fb5e-...) but handoffs/slots are keyed by the short chatId
// (claude-db273e77), so we MUST return the authoritative chatId for the handoff
// match -- f.includes(fullUuid) never matches a `HANDOFF-claude-<hex>-` file
// (verified: the durable append silently no-ops without this). Exact match wins;
// the substring fallback mirrors precompact-auto-trigger (prefix-collision risk
// is ~1/4B for 8-hex and benign -- mis-attributed nudge, not data loss).
function resolveSlotChat(sessionId) {
  if (!sessionId) return { slot: "unknown", chatId: null };
  const doc = safeJson(SLOTS_FILE);
  if (!doc || !doc.slots) return { slot: "unknown", chatId: null };
  for (const [name, data] of Object.entries(doc.slots)) {
    if (data?.chatId && data.chatId === sessionId) return { slot: name, chatId: data.chatId };
  }
  for (const [name, data] of Object.entries(doc.slots)) {
    if (data?.chatId && sessionId.includes(String(data.chatId).replace(/^claude-/, ""))) {
      return { slot: name, chatId: data.chatId };
    }
  }
  return { slot: "unknown", chatId: null };
}

// Read the SAME sidecar precompact-auto-trigger uses. Returns {pct} when fresh +
// valid, else null. Conservative: null -> caller does NOT nudge (never blind).
function readCtxPct(slot) {
  const s = safeJson(join(SIDECAR_DIR, `token-budget-${slot}.json`));
  if (!s || !s.capturedAt) return null;
  const age = Date.now() - Date.parse(s.capturedAt);
  if (!Number.isFinite(age) || age > SIDECAR_TTL_MS) return null;
  const pct = Number(s?.ctx?.pct);
  if (!Number.isFinite(pct) || pct < 0) return null;
  return { pct };
}

// Count commits whose MESSAGE carries `(slot:<slot>` within the lookback window.
// execFileSync + array args = no shell (injection-safe); --fixed-strings makes
// the literal "(slot:" not a regex; bounded timeout; any failure -> 0 (no-fire).
function countSlotBatch(slot) {
  const inj = process.env.PRISM_TEST_BATCH_COUNT;
  if (inj != null && inj !== "") { const n = parseInt(inj, 10); return Number.isFinite(n) ? n : 0; }
  try {
    const out = execFileSync("git", [
      "-C", REPO_ROOT, "rev-list", "--count", "--fixed-strings",
      `--grep=(slot:${slot}`, `--since=${WINDOW}`, "HEAD",
    ], { encoding: "utf-8", timeout: GIT_TIMEOUT_MS });
    const n = parseInt(String(out).trim(), 10);
    return Number.isFinite(n) ? n : 0;
  } catch (e) { vlog(`git count err: ${e.message?.slice(0, 160)}`); return 0; }
}

function stampPath(sid) { return resolve(STAMP_DIR, `${safeSid(sid)}.count`); }
function nudgeCount(sid) {
  // Fail-CLOSED on a torn/garbage stamp: treat unparseable as the cap (suppress)
  // rather than 0 (which would re-arm the nudge past the cap under a torn write).
  try {
    const raw = readFileSync(stampPath(sid), "utf-8").trim();
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : MAX_NUDGE;
  } catch { return 0; }
}
function bumpNudgeCount(sid) {
  const p = stampPath(sid);
  mkdirSync(dirname(p), { recursive: true });
  const next = nudgeCount(sid) + 1;
  // Atomic tmp+rename (mirrors appendSeamMarker) so a concurrent double-Stop can't
  // leave a torn stamp that resets the cap.
  const tmp = `${p}.${process.pid}.tmp`;
  writeFileSync(tmp, String(next));
  renameSync(tmp, p);
  return next;
}

// Resolve THIS chat's handoff by the authoritative chatId, anchored to the
// documented `HANDOFF-<chatId>-<topic>.md` layout (no under-anchored substring
// peer-leak). Newest-mtime wins among this chat's own topic handoffs.
function findHandoff(chatId) {
  if (!chatId || !existsSync(HANDOFFS_DIR)) return null;
  try {
    const prefix = `HANDOFF-${chatId}-`;
    const files = readdirSync(HANDOFFS_DIR).filter(f => f.startsWith(prefix) && f.endsWith(".md"));
    if (!files.length) return null;
    const sorted = files
      .map(f => ({ f, mtimeMs: statSync(resolve(HANDOFFS_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
    return resolve(HANDOFFS_DIR, sorted[0].f);
  } catch { return null; }
}

// Append (idempotent-replace) a `## COMPACT_SEAM` advisory to the handoff so the
// post-compact resume starts from this clean boundary. Atomic write. Clone of
// stop-force-loop-continue.injectResumeLoop.
function appendSeamMarker(handoffPath, info) {
  let content;
  try { content = readFileSync(handoffPath, "utf-8"); }
  catch { return false; }

  const block = `

${SEAM_MARKER}

**CLEAN TASK/BATCH BOUNDARY** (nudge ${info.count}/${MAX_NUDGE} by stop-task-boundary-compact-nudge.mjs).

Shipped this window (slot ${info.slot}): **${info.commits} commit(s)** matching \`(slot:${info.slot}\`.
Context: **${(info.pct * 100).toFixed(0)}%** (early-seam band [${(MIN_PCT * 100).toFixed(0)}%, ${(MAX_PCT * 100).toFixed(0)}%)).

> A batch just shipped and the window is filling. This is the clean seam to compact
> BEFORE the next heavy build -- a fresh context window for the next batch avoids a
> mid-build spiral into the 88% wall.

NEXT ACTION: run \`/precompact\` to capture a clean handoff, then \`/compact\` (or let
native auto-compact@90% fire). HONEST LIMIT: a chat cannot self-fire /compact; this
block + the directive surface the seam and preserve state -- the compact itself is
operator- or harness-driven.

(Injected by the task-boundary compact-nudge Stop hook; cap = ${MAX_NUDGE}/session.)
`;

  // Match from the marker to the next "## " heading or true end-of-string.
  // NO "m" flag: in multiline mode `$` matches every line-end and would truncate
  // the replaced region to just the marker's header line (R9 idempotency test
  // caught this). NO leading `\n*`: consuming the preceding newlines then writing
  // a trimmed block jams the prior line against the marker ("# H## COMPACT_SEAM").
  // (The sibling stop-force-loop-continue.injectResumeLoop carries the same latent
  // pattern -- masked there because its block is always appended last -- logged
  // for a scoped follow-up, not blended into this unit.)
  const re = new RegExp(`${SEAM_MARKER}[\\s\\S]*?(?=\\n## |$)`);
  const newContent = re.test(content) ? content.replace(re, block.trim()) : content + block;
  try {
    const tmp = `${handoffPath}.${process.pid}.tmp`;
    writeFileSync(tmp, newContent);
    renameSync(tmp, handoffPath);
    return true;
  } catch (e) { vlog(`handoff write err: ${e.message?.slice(0, 160)}`); return false; }
}

function buildDirective(info) {
  const pctStr = (info.pct * 100).toFixed(0);
  return [
    `TASK/BATCH BOUNDARY -- ${info.commits} commit(s) shipped this window (slot ${info.slot}), context at ${pctStr}%.`,
    `This is a clean seam to compact BEFORE the next heavy build.`,
    `Recommended: run /precompact now to capture a clean handoff, then /compact`,
    `(or let native auto-compact@90% fire) so the next batch starts in a fresh window`,
    `instead of spiraling into the 88% token wall mid-build.`,
    `Note: a chat cannot self-fire /compact -- /precompact writes the handoff; the`,
    `compact is operator- or harness-driven.`,
  ].join(" ");
}

function main() {
  if (DISABLED) approveAndExit("disabled");
  if (!(MAX_PCT > MIN_PCT)) approveAndExit(`bad band [${MIN_PCT},${MAX_PCT})`);

  const input = readStdinJson();
  const sid = resolveSessionId(input);
  if (!sid) approveAndExit("no session id");

  const { slot, chatId } = resolveSlotChat(sid);
  if (slot === "unknown") approveAndExit("no slot for sid");

  // Cheap file read FIRST so the git spawn only happens when ctx is in band.
  const ctx = readCtxPct(slot);
  if (!ctx) approveAndExit("no fresh ctx sidecar (conservative no-nudge)");
  if (ctx.pct < MIN_PCT) approveAndExit(`ctx ${ctx.pct.toFixed(3)} < MIN_PCT ${MIN_PCT}`);
  if (ctx.pct >= MAX_PCT) approveAndExit(`ctx ${ctx.pct.toFixed(3)} >= MAX_PCT ${MAX_PCT} (precompact-auto owns it)`);

  const commits = countSlotBatch(slot);
  if (commits < MIN_COMMITS) approveAndExit(`batch ${commits} < MIN_COMMITS ${MIN_COMMITS}`);

  const count = nudgeCount(sid);
  if (count >= MAX_NUDGE) approveAndExit(`nudge cap hit (${count}/${MAX_NUDGE})`);

  const newCount = bumpNudgeCount(sid);
  const info = { slot, commits, pct: ctx.pct, count: newCount };

  const handoffPath = findHandoff(chatId);
  const appended = handoffPath ? appendSeamMarker(handoffPath, info) : false;
  vlog(`FIRE: slot=${slot} chatId=${chatId} commits=${commits} pct=${ctx.pct.toFixed(3)} count=${newCount}/${MAX_NUDGE} handoff=${appended}`);

  const directive = buildDirective(info);
  if (ENFORCE) {
    // Block Stop -> keep the turn alive so the model writes the handoff + compacts.
    // Still cannot force the compact itself (R12).
    process.stdout.write(JSON.stringify({ decision: "block", reason: directive }) + "\n");
    process.exit(0);
  }
  // Advisory: never block. systemMessage surfaces the seam; the appended handoff
  // block is the durable fallback for the post-compact resume.
  process.stdout.write(JSON.stringify({ continue: true, systemMessage: directive }) + "\n");
  process.exit(0);
}

try { main(); }
catch (e) {
  vlog(`unexpected err: ${e.message}`);
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + "\n");
  process.exit(0);
}
