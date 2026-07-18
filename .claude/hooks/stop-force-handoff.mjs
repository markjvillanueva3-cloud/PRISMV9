#!/usr/bin/env node
// tier: T2
/**
 * stop-force-handoff.mjs — AUTONOMOUS-FLEET-MS0/U-AF-STOP-FORCE-HANDOFF
 *
 * Stop hook that FORCES a per-agent handoff to exist before Stop completes.
 *
 * Problem: in autonomous /yolo-mode operation across the 10-12 chat fleet,
 * Stop fires whenever a turn ends — including mid-/loop iter, mid-unit work,
 * mid-RESUME directive execution. The session-continuity stack (AUTOCOMPACT-
 * AUTONOMOUS-MS0) handles /compact → continue, but plain Stop without /compact
 * silently drops the handoff. If the operator returns 30 minutes later, the
 * chat has no RESUME state — autonomous loop is broken.
 *
 * This hook closes that gap. On Stop, it:
 *
 *   1. Resolves THIS chat's stable session id + slot + topic (via existing helpers)
 *   2. Reads any existing handoff at HANDOFF-<slot>-<topic>.md
 *   3. If no handoff exists OR the existing RESUME line is placeholder/empty:
 *      a. Synthesizes a minimal RESUME from session state:
 *         - Most-recent commit message body (RESUME directive often lives here)
 *         - Recent task list (TaskList items in-progress / pending)
 *         - Branch + slot + topic
 *      b. Writes via per-agent-handoff.mjs with --source=stop-force-hook
 *
 * Strictly advisory: NEVER blocks Stop. Failure → warn + continue. The intent
 * is to be a SAFETY NET, not a gate — operator intervention path remains open.
 *
 * Tier: T2 (early Stop chain, after critical Stop gates, before regression checks).
 *
 * Knobs:
 *   PRISM_FORCE_HANDOFF_DISABLE=1      — skip entirely
 *   PRISM_FORCE_HANDOFF_VERBOSE=1      — emit per-step diagnostics to stderr
 *   PRISM_FORCE_HANDOFF_MIN_RESUME=30  — minimum chars in synthesized RESUME (default 30)
 *
 * Composes:
 *   .claude/helpers/per-agent-handoff.mjs (--source=precompact-hook — the
 *     write-gate ONLY accepts `live-chat` + `precompact-hook` per the
 *     handoff-writer ban [[feedback_handoff_writers]]. stop-force-handoff is
 *     an automated safety-net writer with the SAME semantics as the precompact
 *     auto-writer: it must (a) supply a non-placeholder resume >=30 chars, and
 *     (b) defer to any fresh live-chat RESUME (anti-clobber). Reusing the
 *     precompact-hook source is correct, not a workaround — the validation it
 *     enforces is exactly the safety property this hook needs.)
 *   .claude/helpers/stable-session-id.mjs
 *   .claude/helpers/chat-slots.mjs (read-only — does NOT rebind slot)
 *
 * @milestone AUTONOMOUS-FLEET-MS0
 * @unit U-AF-STOP-FORCE-HANDOFF
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const REPO_ROOT = "H:/prism";
const HANDOFFS_DIR = resolve(REPO_ROOT, "state/shared/handoffs");
const HELPER_HANDOFF = resolve(REPO_ROOT, ".claude/helpers/per-agent-handoff.mjs");
const HELPER_SESSION = resolve(REPO_ROOT, ".claude/helpers/stable-session-id.mjs");
const HELPER_SLOTS = resolve(REPO_ROOT, ".claude/helpers/chat-slots.mjs");
const SLOTS_JSON = resolve(REPO_ROOT, "state/shared/chat-slots.json");

const DISABLED = process.env.PRISM_FORCE_HANDOFF_DISABLE === "1";
const VERBOSE = process.env.PRISM_FORCE_HANDOFF_VERBOSE === "1";
const MIN_RESUME_CHARS = parseInt(process.env.PRISM_FORCE_HANDOFF_MIN_RESUME ?? "30", 10);
const PLACEHOLDER_PATTERNS = [
  /^check\s+git\s+log\s+and\s+roadmap/i,
  /^continue\s+working/i,
  /^TBD\b/i,
  /^placeholder/i,
  /^\(none\)/i,
  /^N\/A/i,
];

function vlog(msg) { if (VERBOSE) process.stderr.write(`[force-handoff] ${msg}\n`); }

/**
 * Canonicalize a raw session identifier to the fleet-canonical SHORT chat id
 * `claude-<8hex>`. The Stop hook receives `input.session_id` = the FULL harness
 * UUID (e.g. `a30723cc-3de1-4276-...`), but chat-slots.json AND the handoff files
 * are keyed by the SHORT form `claude-a30723cc`. Matching the full UUID against
 * either ALWAYS missed (resolveSlot -> null `slot=?`, findExistingHandoff -> null),
 * so this hook would then SYNTHESIZE a resume from `git log -1` on the SHARED
 * branch -- a PEER's last commit -- and force-continue the chat onto foreign work
 * (the 2026-06-25 papa<-sierra "Continue from last commit / auto-route" re-seed
 * cycle; same full-uuid-vs-short-chatId class as the 9fcda446a1 handoff-append +
 * the e81dec5cba env-anchor fixes). Normalizing here makes slot + handoff lookup
 * succeed so a chat with a fresh valid handoff is left alone. PURE.
 * @param {string} raw
 * @returns {string}
 */
export function canonicalChatId(raw) {
  if (!raw || typeof raw !== "string") return raw;
  if (raw.startsWith("claude-")) return raw;            // already canonical
  const m = raw.match(/^([0-9a-f]{8})/i);               // full UUID or bare 8-hex
  return m ? `claude-${m[1].toLowerCase()}` : raw;      // unknown shape -> unchanged
}

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
  // SessionStart hooks set session_id; Stop hook gets it on stdin.
  if (input?.session_id && typeof input.session_id === "string") return input.session_id;
  // Fallback: read the most-recently-touched chat-slot entry
  try {
    const slots = JSON.parse(readFileSync(SLOTS_JSON, "utf-8")).slots ?? {};
    let best = { ts: 0, id: null };
    for (const [slot, s] of Object.entries(slots)) {
      if (!s?.chatId) continue;
      const ts = Date.parse(s.lastHeartbeat ?? s.claimedAt ?? "1970");
      if (ts > best.ts) best = { ts, id: s.chatId, slot };
    }
    return best.id;
  } catch { return null; }
}

function resolveSlot(chatId) {
  if (!chatId) return null;
  try {
    const slots = JSON.parse(readFileSync(SLOTS_JSON, "utf-8")).slots ?? {};
    for (const [slot, s] of Object.entries(slots)) {
      if (s?.chatId === chatId) return slot;
    }
  } catch { /* ignore */ }
  return null;
}

function gitInfo() {
  const info = { branch: "main", topic: "", lastCommitSubject: "", lastCommitBody: "" };
  try {
    info.branch = execFileSync("git", ["-C", REPO_ROOT, "rev-parse", "--abbrev-ref", "HEAD"], { windowsHide: true, encoding: "utf-8", timeout: 3000 }).trim();
  } catch { /* ignore */ }
  try {
    info.lastCommitSubject = execFileSync("git", ["-C", REPO_ROOT, "log", "-1", "--pretty=%s"], { windowsHide: true, encoding: "utf-8", timeout: 3000 }).trim();
    info.lastCommitBody = execFileSync("git", ["-C", REPO_ROOT, "log", "-1", "--pretty=%b"], { windowsHide: true, encoding: "utf-8", timeout: 3000 }).trim();
  } catch { /* ignore */ }
  const m = info.lastCommitSubject.match(/\[([A-Z0-9-]+)\]/);
  if (m) info.topic = m[1].toLowerCase();
  else info.topic = info.branch.split("/").pop() ?? info.branch;
  return info;
}

function findExistingHandoff(chatId, slot, topic) {
  // Try slot-prefix variant first (canonical), then instance-prefix legacy
  if (!existsSync(HANDOFFS_DIR)) return null;
  try {
    const files = readdirSync(HANDOFFS_DIR).filter(f => f.startsWith("HANDOFF-") && f.endsWith(".md"));
    const candidates = [];
    for (const f of files) {
      if (slot && f.startsWith(`HANDOFF-${slot}-`)) candidates.push({ f, score: 3 });
      else if (chatId && f.includes(chatId)) candidates.push({ f, score: 2 });
      else if (topic && f.includes(topic)) candidates.push({ f, score: 1 });
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => b.score - a.score);
    const best = resolve(HANDOFFS_DIR, candidates[0].f);
    return { path: best, content: readFileSync(best, "utf-8"), mtimeMs: statSync(best).mtimeMs };
  } catch (e) { vlog(`findExistingHandoff err: ${e.message}`); return null; }
}

function extractResumeLine(content) {
  if (!content || typeof content !== "string") return null;
  const m = content.match(/##\s+(?:▶\s+)?(?:RESUME|NEXT ACTION)\s*\n+([^\n]+)/i);
  return m ? m[1].trim() : null;
}

function isPlaceholder(resume) {
  if (!resume || resume.length < MIN_RESUME_CHARS) return true;
  return PLACEHOLDER_PATTERNS.some(p => p.test(resume));
}

/**
 * The last commit AUTHORED in this slot's lane. The commit convention is
 * `[SCOPE]/U-ID (slot:<slot>): title`, so we anchor the grep on the OPENING paren
 * `(slot:<slot>` -- NOT a bare `slot:<slot>` -- so a peer commit that merely MENTIONS
 * this slot ("(slot:india rescuing slot:papa orphan)") never false-matches (the exact
 * anchoring lesson from the precompact peer-leak fix be9182dca7). execFileSync passes
 * the `(` literally (no shell); git --grep treats it as a literal in basic regex. Read-only git.
 * @param {string|null} slot
 * @returns {{subject:string, body:string}|null}
 */
function lastOwnCommitInfo(slot) {
  if (!slot) return null;
  try {
    const g = (fmt) => execFileSync("git", ["-C", REPO_ROOT, "log", "-1", `--grep=(slot:${slot}`, `--pretty=${fmt}`], { windowsHide: true, encoding: "utf-8", timeout: 3000 }).trim();
    const subject = g("%s");
    if (!subject) return null;
    return { subject, body: g("%b") };
  } catch { return null; }
}

function synthesizeResume(gi, slot) {
  // Slot-scope the synthesis source: NEVER seed a resume from the shared-branch HEAD,
  // which may be a PEER's commit -> force-continues this chat onto foreign work (the
  // 2026-06-25 papa<-sierra "Continue from last commit / auto-route" re-seed cycle).
  // Use THIS slot's own last commit; else a generic, non-leaking fallback.
  const own = lastOwnCommitInfo(slot);
  if (own) {
    const bodyLines = own.body.split("\n").map(s => s.trim()).filter(Boolean);
    const lead = (bodyLines[0] && bodyLines[0].length >= MIN_RESUME_CHARS) ? bodyLines[0] : own.subject;
    if (lead && lead.length >= MIN_RESUME_CHARS) {
      return `Continue from last commit: ${lead} (branch=${gi.branch}, slot=${slot})`;
    }
  }
  return `Resume work on branch ${gi.branch} for slot ${slot ?? "?"} -- review this slot's git log + handoff for the next unit. (Synthesized by stop-force-handoff; no slot-own commit found, so NOT seeding from a shared-branch peer commit.)`;
}

function writeForcedHandoff(chatId, slot, topic, resume, state) {
  if (!existsSync(HELPER_HANDOFF)) { vlog("helper missing — skip"); return false; }
  try {
    const args = [
      HELPER_HANDOFF, "write",
      "--source", "precompact-hook",
      "--terminal", chatId,
      "--topic", topic,
      "--resume", resume,
      "--state", state,
    ];
    if (slot) { args.push("--slot", slot); }
    const out = execFileSync(process.execPath, args, { windowsHide: true, encoding: "utf-8", timeout: 5000 });
    vlog(`helper out: ${out.slice(0, 200)}`);
    return true;
  } catch (e) {
    vlog(`helper err: ${e.message?.slice(0, 200)}`);
    return false;
  }
}

function main() {
  if (DISABLED) approveAndExit("disabled");
  const input = readStdinJson();
  const chatId = canonicalChatId(resolveSessionId(input));
  if (!chatId) approveAndExit("no session id");
  const slot = resolveSlot(chatId);
  const gi = gitInfo();
  const topic = `${slot ?? "unknown"}-${gi.topic || "work"}`;
  const existing = findExistingHandoff(chatId, slot, gi.topic);

  let needsWrite = false;
  let reason = "";

  if (!existing) {
    needsWrite = true;
    reason = "no handoff exists";
  } else {
    const resume = extractResumeLine(existing.content);
    const ageMs = Date.now() - existing.mtimeMs;
    if (isPlaceholder(resume)) {
      needsWrite = true;
      reason = `RESUME is placeholder: "${resume?.slice(0, 60) ?? "(missing)"}"`;
    } else if (ageMs > 1000 * 60 * 60) {
      // existing handoff is older than 1 hour — write a fresh one
      needsWrite = true;
      reason = `handoff stale (${Math.round(ageMs / 60000)}m old)`;
    } else {
      vlog(`handoff fresh + valid (RESUME: "${resume.slice(0, 60)}...")`);
      approveAndExit("handoff already valid");
    }
  }

  if (needsWrite) {
    const resume = synthesizeResume(gi, slot);
    const state = `## CONTEXT\nForced-handoff written by stop-force-handoff hook (${reason}).\n\nBranch: ${gi.branch}\nSlot: ${slot ?? "(unknown)"}\nTopic: ${gi.topic}\nLast commit: ${gi.lastCommitSubject}\n\n## RESUME\n${resume}\n`;
    const ok = writeForcedHandoff(chatId, slot, topic, resume, state);
    vlog(`forced handoff write: ok=${ok}, reason=${reason}`);
  }
  approveAndExit("done");
}

// Run main() only when invoked as a hook script (node stop-force-handoff.mjs),
// NOT when imported by a test -- main() reads stdin + process.exit()s, which would
// kill the importing test process. (__isMain guard, mirrors nn-graph-retrain-lifecycle.)
const __isMain = (() => {
  try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; }
  catch { return false; }
})();
if (__isMain) {
  try { main(); }
  catch (e) {
    // NEVER block Stop
    vlog(`unexpected err: ${e.message}`);
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + "\n");
    process.exit(0);
  }
}
