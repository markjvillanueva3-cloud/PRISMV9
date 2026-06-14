#!/usr/bin/env node
// tier: T3
/**
 * precompact-memo-emit.mjs — compaction→memo emitter (lever #3 of
 * OBSIDIAN-HERMES-CONTEXT-LEARNING-ACCEL-2026-06-06.md).
 *
 * THE GAP. A /compact is the one moment a session's episodic context is about
 * to be summarized-and-shed. `precompact-handoff.mjs` already captures a
 * RESUME directive (what to do NEXT) — operational, terminal-keyed, overwritten
 * each compact. But the session's DURABLE episodic trace (what was done this
 * session, as a queryable memory that compounds across sessions) is never
 * captured: the handoff is a rolling pointer, not an accreting record. So the
 * single richest signal for offline learning — "here is a coherent unit of work
 * that just completed" — evaporates at every compact.
 *
 * THE INSIGHT (zero new dispatcher). PRISM already has a wired ingestion path:
 * stop-obsidian-memory-feed.mjs mirrors every C:/Users/<u>/.claude/projects/
 * H--prism/memory/*.md into the Obsidian vault (knowledge/memories/<type>/) at
 * Stop, where it is semantically searchable and feeds the dream-cycle synth.
 * This hook just WRITES a well-formed reference_session_<slot>_<date>.md into
 * that memory dir on PreCompact; the existing feed does the rest. No engine, no
 * dispatcher — pure connective tissue.
 *
 * WHAT IT WRITES, each /compact (fail-soft, never blocks):
 *   - Derives the slot from the PreCompact stdin session_id (the authoritative
 *     anchor) → lastKnownSlotForChat (reuses slot-identity-cache, no re-derive).
 *   - Captures a compact session episodic trace: this session's commit subjects
 *     (git log since the session's first commit, capped), the active loop task,
 *     and the current branch — the "what just happened" a future session can
 *     query.
 *   - Writes reference_session_<slot>_<YYYY-MM-DD>.md with metadata.type
 *     "reference" frontmatter (what the feed routes on). One file PER slot PER
 *     day — re-compacts the same day APPEND a delta section (never clobber an
 *     earlier compact's trace).
 *
 * IDEMPOTENT / NON-DESTRUCTIVE: same slot+day re-compact appends a timestamped
 * "compact N" section; it never overwrites the file. Empty session (no commits,
 * no loop) → skip (no content-free memo). Disabled / no-slot / git-unavailable
 * → silent no-op.
 *
 * ALWAYS emits {continue:true} — a PreCompact hook must never block /compact.
 *
 * Knob: PRISM_PRECOMPACT_MEMO_DISABLE=1 → silent no-op.
 *
 * Wired: settings.json PreCompact chain (advisory, ~4s timeout).
 * Built 2026-06-08, slot=papa, OBSIDIAN-HERMES-CONTEXT-ACCEL/U-LEARN-MEMO01.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { lastKnownSlotForChat } from "../helpers/slot-identity-cache.mjs";
import { resolveObsidianMemDir } from "../../scripts/lib/obsidian-mem-dir.mjs";

const STDIN_DRAIN_TIMEOUT_MS = 200;
// Per-git-call cap. Kept WELL under the 4000ms harness PreCompact budget: this
// hook makes 2 serial git calls + 1 loop-state spawn (1500ms), so 2×1200 + 1500
// + 200 stdin ≈ 4.1s worst case — but git here (rev-parse + a bounded log) is
// near-instant in practice, and the write runs last, so the memo emits within
// budget under normal latency. (scrutiny reviewer-C: 2×4000 could exceed the
// harness budget and kill before the write.)
const GIT_TIMEOUT_MS = 1200;
const MAX_COMMITS = 12;          // cap the episodic trace — a session is a few units
const MAX_SUBJECT_LEN = 160;

/** The canonical auto-memory dir the Stop feed ingests (C: source of truth).
 *  Single-sourced via resolveObsidianMemDir() — homedir-derived, portable
 *  (was a hardcoded wompu path; same split-brain risk as U-OBS-MEMDIR-HOMEDIR). */
const MEMORY_DIR = resolveObsidianMemDir();

/** Repo root from this hook's own location (worktree-safe). */
function repoRoot() {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

/** Emit the verdict. ALWAYS {continue:true} — never blocks /compact. */
function emitContinue(additionalContext) {
  const out = additionalContext
    ? { continue: true, hookSpecificOutput: { hookEventName: "PreCompact", additionalContext } }
    : { continue: true };
  try { process.stdout.write(JSON.stringify(out)); } catch { /* stdout gone */ }
}

/** Read PreCompact stdin (JSON with session_id). Returns the session_id or null. */
function readSessionId() {
  return new Promise((res) => {
    let raw = ""; let done = false; let timer = null;
    const fin = () => {
      if (done) return; done = true;
      if (timer) clearTimeout(timer);
      let sid = null;
      try {
        if (raw.trim().startsWith("{")) {
          const j = JSON.parse(raw);
          const s = j?.session_id || j?.sessionId;
          if (typeof s === "string" && s.length >= 8) sid = s;
        }
      } catch { /* ignore */ }
      try { process.stdin.destroy(); } catch { /* gone */ }
      res(sid);
    };
    try {
      if (process.stdin.isTTY) return fin();
      timer = setTimeout(fin, STDIN_DRAIN_TIMEOUT_MS);
      process.stdin.on("data", (d) => { raw += d; });
      process.stdin.on("end", fin);
      process.stdin.on("error", fin);
    } catch { fin(); }
  });
}

/** Run a git command in the repo, time-bounded. Returns stdout (trimmed) or "". */
function git(args, cwd) {
  try {
    const r = spawnSync("git", ["-C", cwd, ...args], {
      encoding: "utf8", timeout: GIT_TIMEOUT_MS, windowsHide: true,
    });
    if (r.status !== 0) return "";
    return (r.stdout || "").trim();
  } catch { return ""; }
}

/**
 * Capture this session's episodic trace. We approximate "this session's work" as
 * the recent commits authored by the current git user on the current branch
 * within a short lookback window (a session is hours, not days). This is a
 * On the SHARED tree the whole fleet shares one git user, so a time-window log
 * catches peer slots' commits too. When `slot` is given we prefer commits whose
 * subject carries the `(slot:<slot>)` marker — the real per-session boundary on a
 * shared tree — but FALL BACK to the unfiltered set if none match (a slot that
 * committed under a different subject format still gets a non-empty trace rather
 * than an empty memo). The memo is a learning signal, not an audit record.
 *
 * Pure: takes injected git output for testability. Returns
 * { branch, commits: [{sha, subject}], loopTask, slotScoped }.
 */
export function buildSessionTrace({ branch, logRaw, loopTask, slot }) {
  const all = [];
  for (const line of String(logRaw || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const sp = trimmed.indexOf(" ");
    if (sp < 0) continue;
    const sha = trimmed.slice(0, sp);
    if (!/^[0-9a-f]{6,40}$/i.test(sha)) continue;
    let subject = trimmed.slice(sp + 1).trim();
    if (subject.length > MAX_SUBJECT_LEN) subject = subject.slice(0, MAX_SUBJECT_LEN - 1) + "…";
    all.push({ sha, subject });
  }
  // Prefer this slot's own commits; fall back to all if the marker never appears.
  let scoped = all;
  let slotScoped = false;
  if (slot) {
    const mine = all.filter((c) => c.subject.includes(`(slot:${slot})`));
    if (mine.length) { scoped = mine; slotScoped = true; }
  }
  return {
    branch: branch || "(unknown)",
    commits: scoped.slice(0, MAX_COMMITS),
    loopTask: loopTask || null,
    slotScoped,
  };
}

/**
 * Render the session memo markdown for a slot+date. `priorBody` is the existing
 * file content when this is a same-day re-compact (we append a delta section,
 * never clobber). `compactN` is the 1-based compact index for the day.
 * Pure — no IO.
 */
export function renderMemo({ slot, dateStr, nowIso, trace, compactN, priorBody }) {
  if (priorBody) {
    // Same-day re-compact: append a DELTA section — only commits NOT already
    // recorded in an earlier compact today. Each compact re-reads a fixed 12h
    // window, so without this filter every append would re-list the same shas
    // (bloat, not accretion). A sha already rendered appears as `` `<sha>` `` in
    // priorBody; exclude those so the section is a true delta.
    const newCommits = trace.commits.filter((c) => !priorBody.includes(`\`${c.sha}\``));
    const delta = [
      ``,
      `## compact ${compactN} — ${nowIso}`,
      ``,
      `branch: \`${trace.branch}\`${trace.loopTask ? ` · loop: ${trace.loopTask}` : ""}`,
      ``,
      ...(newCommits.length
        ? newCommits.map((c) => `- \`${c.sha}\` ${c.subject}`)
        : ["- (no new commits since the prior compact this session)"]),
      ``,
    ].join("\n");
    return priorBody.replace(/\s*$/, "\n") + delta;
  }
  // First compact of the day for this slot — full frontmatter + body.
  // The alias slug is fully underscore-joined (the memory-namespace convention,
  // e.g. reference_session_papa_2026_06_08) — distinct from the dash-dated
  // filename (reference_session_papa_2026-06-08.md). The `[[wikilink]]` resolver
  // keys on this underscore slug.
  const dateSlug = dateStr.replace(/-/g, "_");
  const head = [
    `---`,
    `name: reference-session-${slot}-${dateStr}`,
    `description: Session episodic trace for slot ${slot} on ${dateStr} — commits + loop task captured at /compact (compaction→memo emitter, lever #3)`,
    `aliases: reference_session_${slot}_${dateSlug}`,
    `metadata:`,
    `  type: reference`,
    `---`,
    ``,
    `# Session trace — slot ${slot} · ${dateStr}`,
    ``,
    `Auto-captured at /compact by precompact-memo-emit.mjs. One file per slot per day;`,
    `each /compact appends a "compact N" section so the day's episodic work accretes`,
    `instead of being shed. Ingested into the Obsidian vault by stop-obsidian-memory-feed.`,
    ``,
    `## compact ${compactN} — ${nowIso}`,
    ``,
    `branch: \`${trace.branch}\`${trace.loopTask ? ` · loop: ${trace.loopTask}` : ""}`,
    ``,
    ...(trace.commits.length
      ? trace.commits.map((c) => `- \`${c.sha}\` ${c.subject}`)
      : ["- (no commits captured this session)"]),
    ``,
  ];
  return head.join("\n");
}

/** Count existing "## compact N" sections to pick the next index. Pure. */
export function nextCompactIndex(priorBody) {
  if (!priorBody) return 1;
  const matches = priorBody.match(/^## compact \d+/gm);
  return (matches ? matches.length : 0) + 1;
}

async function main() {
  if (process.env.PRISM_PRECOMPACT_MEMO_DISABLE === "1") { emitContinue(); return; }

  const sessionId = await readSessionId();
  if (!sessionId) { emitContinue(); return; }   // no anchor → can't key a memo
  const chatId = `claude-${sessionId.slice(0, 8)}`;

  // Derive the slot (reuse slot-identity-cache; no re-derivation).
  let slot = null;
  try { slot = lastKnownSlotForChat(chatId); } catch { slot = null; }
  if (!slot || typeof slot !== "string") { emitContinue(); return; }  // unknown slot → skip

  const root = repoRoot();

  // Capture the episodic trace. Lookback ~12h catches this session without
  // dragging in stale history. Fetch a WIDER raw window (MAX_COMMITS × 8) than the
  // final cap, because on the shared tree this slot's commits are interleaved with
  // peers' — buildSessionTrace filters to `(slot:<slot>)` then caps to MAX_COMMITS,
  // so the raw fetch must be wide enough that the slot-filter has candidates.
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], root) || "(unknown)";
  const logRaw = git(["log", "--no-merges", "--since=12.hours", `-n${MAX_COMMITS * 8}`, "--format=%h %s"], root);

  // Loop task (best-effort, fail-soft) from the live loop-state for this session.
  // The subcommand is `read` (NOT `status` — loop-state.mjs dispatches
  // start|tick|read|end|list|reap; an unknown verb exits 1). `read` emits the
  // state object whose `task` field is the active /loop goal, or a
  // {ok:false,error:"no state"} sentinel when no loop is running — guard both.
  let loopTask = null;
  try {
    const lsPath = join(root, ".claude", "helpers", "loop-state.mjs");
    if (existsSync(lsPath)) {
      const r = spawnSync(process.execPath, [lsPath, "read", "--session", sessionId, "--json"],
        { encoding: "utf8", timeout: 2000, windowsHide: true });
      if (r.status === 0 && r.stdout) {
        const j = JSON.parse(r.stdout);
        // Skip the no-state sentinel and the "(unspecified)" placeholder.
        if (j && j.ok !== false && typeof j.task === "string" && j.task !== "(unspecified)") {
          loopTask = j.task.slice(0, 120);
        }
      }
    }
  } catch { /* fail-soft */ }

  const trace = buildSessionTrace({ branch, logRaw, loopTask, slot });

  // Skip a content-free memo: no commits AND no loop task = nothing to record.
  if (trace.commits.length === 0 && !trace.loopTask) { emitContinue(); return; }

  const now = new Date();
  const nowIso = now.toISOString();
  const dateStr = nowIso.slice(0, 10);
  const file = join(MEMORY_DIR, `reference_session_${slot}_${dateStr}.md`);

  let priorBody = null;
  try { if (existsSync(file)) priorBody = readFileSync(file, "utf8"); } catch { priorBody = null; }
  const compactN = nextCompactIndex(priorBody);
  const body = renderMemo({ slot, dateStr, nowIso, trace, compactN, priorBody });

  try {
    mkdirSync(MEMORY_DIR, { recursive: true });
    // renderMemo already returned the full file content (frontmatter+body for a
    // first compact, or prior+delta for a same-day append) — one write either way.
    writeFileSync(file, body, "utf8");
    emitContinue(`precompact-memo-emit: session trace written → reference_session_${slot}_${dateStr}.md (compact ${compactN}, ${trace.commits.length} commit(s)) — feeds Obsidian at Stop`);
  } catch (e) {
    // A write failure must NOT block /compact — emit continue, surface to stderr.
    process.stderr.write(`precompact-memo-emit: memo write failed (non-fatal): ${(e?.message || e).toString().slice(0, 160)}\n`);
    emitContinue();
  }
}

const invokedAsHook = (() => {
  try { return !!process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]); }
  catch { return false; }
})();
if (invokedAsHook) main().catch(() => emitContinue());
