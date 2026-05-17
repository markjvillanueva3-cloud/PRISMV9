#!/usr/bin/env node
// tier: T0
/**
 * session-start-auto-resume.mjs — Auto-resume after /compact.
 *
 * Problem this solves:
 *   The user observed inconsistent post-compact auto-continue behaviour —
 *   sometimes a fresh post-compact session resumes work without needing
 *   "continue", sometimes it stalls until the user prompts manually. The
 *   inconsistency is because no hook deterministically injects the per-chat
 *   handoff RESUME directive on the SessionStart:compact event.
 *
 *   This hook fixes that: on every SessionStart with source=compact, it
 *   reads the per-chat handoff for this session's stable id and injects the
 *   RESUME directive as additionalContext so the next turn is anchored to
 *   the prior chat's exit state.
 *
 * Wiring:
 *   Wired under a `matcher: "compact"` arm in SessionStart (which only fires
 *   on the compact trigger). Belt-and-suspenders: the hook also self-gates
 *   on stdin.source === "compact" so it's safe to wire under an empty arm.
 *
 * Failure mode policy:
 *   ANY failure (no handoff, parse error, stale handoff, missing helper) is
 *   silent — emits {continue:true,suppressOutput:true}. Auto-resume is a
 *   convenience; we must never block SessionStart over it.
 *
 * Knobs:
 *   PRISM_AUTO_RESUME_DISABLE=1   — disable entirely (emit silent continue)
 *   PRISM_AUTO_RESUME_MAX_AGE_MIN — drop handoffs older than this (default 240)
 *
 * Designed for the 13-chat fleet (alpha..mike work slots + golf hygiene;
 * SLOT_NAMES is kept byte-equal to chat-slots.mjs). The stable id resolution
 * is fleet-size-agnostic — it uses the first 8 hex of session_id directly.
 */

import fs from "node:fs";
import { spawnSync } from "node:child_process";

const HELPER = "H:/prism/.claude/helpers/per-agent-handoff.mjs";
// Use process.execPath (the real node binary running THIS hook) — never the
// portable-node bash shim, since spawnSync can't exec a #!/bin/bash script on
// Windows. The env override is for tests that want a different node version.
const NODE_BIN = process.env.PRISM_NODE_BIN || process.execPath;

// Constants
const DEFAULT_MAX_AGE_MIN = 240;             // 4 hour staleness threshold
const HELPER_TIMEOUT_MS = 8000;              // per-agent-handoff.mjs read budget
const SESSION_ID_HEX_LEN = 8;                // stable id = first 8 hex of UUID
const MIN_RESUME_BODY_LEN = 8;               // shorter than this = empty placeholder
const MAX_INJECTED_RESUME_BYTES = 6000;      // cap to avoid blowing context
// OBSIDIAN-BRAIN-FIX-MS0/U-OBF02: consolidated cross-topic open-threads.
// Pointer-not-payload — inject only the count + top headers + file path so a
// post-/compact session is AWARE of orphaned prior-topic work without bloating
// context with N full RESUME bodies (the bloat would defeat the purpose).
const CONSOLIDATE_HELPER = "H:/prism/scripts/handoff-consolidate.mjs";
const CONSOLIDATED_DIR = "H:/prism/state/shared/handoffs/consolidated";
const CONSOLIDATE_TIMEOUT_MS = 6000;         // fresh-on-read regen budget
const MAX_THREAD_HEADERS = 5;                // headers shown inline; rest in file
// Reviewer-B P1: regenerate at most once per window per slot. If the slot's
// consolidated file is younger than this, skip the spawn and pure-read it —
// kills the 13-chat thundering-herd (each compact would otherwise spawn a
// git-log) without needing a separate Stop-hook producer.
const CONSOLIDATE_THROTTLE_MS = 180000;      // 3 min

// Canonical 13-slot fleet (NATO phonetic): 12 work slots + golf hygiene.
// Reviewer P1: was 10 (alpha..juliett) — silently dropped kilo/lima/mike,
// violating the "accommodate up to 13, never hard-code a short count"
// fleet directive (CLAUDE.md). Kept as a literal (this is a latency-
// critical SessionStart hook — a dynamic import adds init risk); MUST
// stay byte-equal to chat-slots.mjs SLOT_NAMES (canonical source).
export const SLOT_NAMES = new Set([
  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf",
  "hotel", "india", "juliett", "kilo", "lima", "mike",
]);

const MAX_AGE_MIN = Number(process.env.PRISM_AUTO_RESUME_MAX_AGE_MIN || DEFAULT_MAX_AGE_MIN);
const SILENCE = { continue: true, suppressOutput: true };

function readStdinSync() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}

function emit(o) { process.stdout.write(JSON.stringify(o)); }

function safeSpawn(args, opts = {}) {
  try {
    return spawnSync(NODE_BIN, args, { encoding: "utf-8", timeout: HELPER_TIMEOUT_MS, ...opts });
  } catch { return { status: 1, stdout: "", stderr: "" }; }
}

function getHandoff(stableId) {
  if (!fs.existsSync(HELPER)) return null;
  const r = safeSpawn([HELPER, "read", "--terminal", stableId]);
  if (!r || r.status !== 0 || !r.stdout) return null;
  try { return JSON.parse(r.stdout); } catch { return null; }
}

/**
 * OBSIDIAN-BRAIN-FIX-MS0/U-OBF02 — consolidated cross-topic open threads.
 *
 * The primary resume-read path only sees THIS chat's latest topic handoff;
 * unfinished work from prior topics is orphaned (the proven bug U-OBF01
 * fixes at the data layer). Here we make the post-/compact session AWARE of
 * it: ensure the slot's consolidated file is reasonably fresh (regenerate
 * ONLY if older than the throttle — otherwise pure-read), then inject a
 * BOUNDED summary (count + newest headers + file path) — never the full
 * bodies (that would re-bloat context, defeating the brain's purpose).
 *
 * Cost note (Reviewer-B P1): the regen spawn passes `--slot`, which now
 * filters by filename before any readFileSync and skips git-log when the
 * slot is empty — so a regen is bounded to one slot's handoffs, and the
 * throttle means the common (frequent-compact) case is a pure file read
 * with NO subprocess at all. `excludeFile` drops the just-read handoff
 * from the headers so the primary RESUME isn't echoed as "open thread 1".
 *
 * Fail-soft on every path: a missing helper / spawn failure / unparseable
 * slot must NEVER break auto-resume. Returns "" → nothing appended.
 */
function getConsolidatedSummary(slot, excludeFile) {
  if (!slot || !SLOT_NAMES.has(slot)) return "";
  if (!fs.existsSync(CONSOLIDATE_HELPER)) return "";
  const file = `${CONSOLIDATED_DIR}/${slot}.md`;
  // Throttled fresh-on-read: only regenerate if the file is missing or
  // older than the throttle window. Otherwise skip the spawn entirely.
  let fresh = false;
  try {
    const st = fs.statSync(file);
    fresh = (Date.now() - st.mtimeMs) < CONSOLIDATE_THROTTLE_MS;
  } catch { fresh = false; }
  if (!fresh) {
    safeSpawn([CONSOLIDATE_HELPER, "--slot", slot], { timeout: CONSOLIDATE_TIMEOUT_MS });
  }
  let body;
  try { body = fs.readFileSync(file, "utf-8"); } catch { return ""; }
  const countM = body.match(/^openThreads:\s*(\d+)/m);
  const count = countM ? parseInt(countM[1], 10) : 0;
  if (!count || count < 1) return "";
  const exclude = excludeFile ? String(excludeFile).replace(/\\/g, "/").split("/").pop() : null;
  const headers = [];
  let excludedSelf = 0;
  for (const m of body.matchAll(/^## OPEN THREAD \d+ — (.+)$/gm)) {
    const h = m[1].trim();
    // Reviewer-B P2: skip the just-read handoff — its RESUME is already
    // injected above as the primary directive; echoing it here as "thread
    // 1" makes the model think it's seen everything and skip the rest.
    if (exclude && h.includes(exclude)) { excludedSelf++; continue; }
    headers.push(h);
    if (headers.length >= MAX_THREAD_HEADERS) break;
  }
  if (headers.length === 0) return "";
  // Reviewer-A round-2 P2: the headline count must reflect ACTIONABLE
  // cross-topic threads, not the file's raw total — the self-ref the
  // operator already saw above is not "another" thread to chase.
  const actionable = Math.max(headers.length, count - excludedSelf);
  const more = actionable > headers.length ? ` (+${actionable - headers.length} more in file)` : "";
  return [
    ``,
    `## 🧵 ${actionable} open cross-topic thread(s) for slot \`${slot}\``,
    ``,
    `Prior-topic work NOT git-confirmed-shipped — would otherwise be orphaned by topic-drift.`,
    `Newest${more}:`,
    ...headers.map((h) => `  • ${h}`),
    ``,
    `Full RESUME bodies: \`state/shared/handoffs/consolidated/${slot}.md\` — read it before picking new work so nothing already-in-flight is dropped.`,
  ].join("\n");
}

export function extractResume(content) {
  if (!content || typeof content !== "string") return null;
  // Split on level-2 headings so we get one section per ## block. The split
  // strips the `\n## ` prefix from each non-first chunk — easier and more
  // predictable than balancing lazy/greedy alternation in a single regex
  // (the prior regex let `## NEXT` slip into the captured RESUME body when
  // the body was empty, breaking the empty-body sentinel contract).
  //
  // Prepend "\n" so a `## RESUME` at the very start of the document is also
  // a split boundary — otherwise it stays inside section[0] (which the loop
  // below skips) and the function returns null even for a valid first-line
  // RESUME heading.
  const sections = ("\n" + content).split(/\n##\s/);
  for (let i = 1; i < sections.length; i++) {
    const sec = sections[i];
    if (!/^RESUME\b/i.test(sec)) continue;
    // Strip the heading-line (everything up to the first newline) — that's
    // `RESUME` itself, possibly with a trailing comment. What remains is the
    // section body until the next `\n## ` (which the split already removed).
    const body = sec.replace(/^[^\n]*\n/, "").trim();
    if (!body || body.length < MIN_RESUME_BODY_LEN) return null;
    if (body.length > MAX_INJECTED_RESUME_BYTES) {
      return body.slice(0, MAX_INJECTED_RESUME_BYTES) + "\n\n…[truncated — full RESUME in handoff file]";
    }
    return body;
  }
  return null;
}

export function ageMinutesFromFrontmatter(content) {
  if (!content) return null;
  const m = content.match(/written_at:\s*['"]?([0-9T:.\-Z]+)['"]?/);
  if (!m) return null;
  const t = Date.parse(m[1]);
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / 60000;
}

export function stableIdFromSession(sid) {
  if (!sid || typeof sid !== "string") return null;
  // Stable id = "claude-" + leading 8 hex chars of UUID
  const hex = sid.replace(/[^0-9a-f]/gi, "").toLowerCase().slice(0, SESSION_ID_HEX_LEN);
  if (hex.length !== SESSION_ID_HEX_LEN) return null;
  return `claude-${hex}`;
}

/**
 * Gap 3 (AUTOCOMPACT-AUTONOMOUS-MS0): parse `slot:` and `topic:` from handoff
 * frontmatter so the post-/compact chat can be told to re-fire /checkin with
 * its slot-bound topic. When the frontmatter `slot:` field is blank (Gap 4's
 * auto-resolve from chat-slots.json isn't always reliable), fall back to
 * lifting the slot from the topic field's `<slot>-<rest>` prefix — that's
 * how /checkin writes its handoff topic argument, so it round-trips.
 *
 * Returns {slot: "", topic: ""} on any parse failure; callers gate the
 * /checkin directive on both being non-empty.
 *
 * @param {string} content — full handoff markdown including frontmatter
 * @returns {{slot: string, topic: string}}
 */
export function parseSlotAndTopic(content) {
  if (!content || typeof content !== "string") return { slot: "", topic: "" };
  let slot = "";
  let topic = "";
  // Frontmatter lines are `key: value` on their own line. Slot may be blank
  // (one trailing space + newline is valid YAML for empty string); topic is
  // a free-form slug. Both are anchored to start-of-line via /m flag.
  //
  // CRITICAL: use [ \t]* not \s* between the colon and the value — \s
  // includes \n, so a greedy \s* would consume the line terminator and
  // pull the next line's content into the slot capture. Tabs + spaces only.
  const slotMatch = content.match(/^slot:[ \t]*([^\r\n]*?)[ \t]*$/m);
  if (slotMatch) slot = slotMatch[1].trim().toLowerCase();
  const topicMatch = content.match(/^topic:[ \t]*([^\r\n]+?)[ \t]*$/m);
  if (topicMatch) topic = topicMatch[1].trim();
  // Fallback: if slot is empty but topic starts with a canonical slot prefix,
  // split it. Example: topic="charlie-obsidian-pipeline-loop" → slot=charlie,
  // topic=obsidian-pipeline-loop. Only accepts known NATO slot names so a
  // freeform topic like "fixture-design-loop" doesn't accidentally lift
  // "fixture" as a slot.
  if (!slot && topic) {
    const dashIdx = topic.indexOf("-");
    if (dashIdx > 0) {
      const candidate = topic.slice(0, dashIdx).toLowerCase();
      if (SLOT_NAMES.has(candidate)) {
        slot = candidate;
        topic = topic.slice(dashIdx + 1);
      }
    }
  }
  return { slot, topic };
}

/**
 * Gap 3: build the markdown directive that tells the post-/compact chat to
 * auto-fire /checkin BEFORE following the resume body. Without this, the
 * chat sees the resume but its slot heartbeat may have lapsed during the
 * compact window (peer chats can claim during the compact-release window
 * opened by precompact-release-slot.mjs).
 *
 * Returns "" when slot or topic is missing — the caller suppresses the
 * directive block in that case so a malformed handoff doesn't inject a
 * broken /checkin invocation.
 *
 * Knob: PRISM_AUTO_RESUME_NO_CHECKIN=1 disables the directive entirely
 * (operator wants pure RESUME without auto-fire). Checked at call site.
 *
 * @param {{slot: string, topic: string}} parsed — output of parseSlotAndTopic
 * @returns {string} — markdown block or "" on missing fields
 */
export function buildCheckinDirective({ slot, topic } = {}) {
  if (!slot || !topic) return "";
  // Topic slug is safe: came from frontmatter (operator-typed kebab-case) or
  // from the lifted SLOT_NAMES prefix (alphanumeric only). No shell metachars.
  const arg = `${slot}-${topic}`;
  return [
    "",
    "**NEXT ACTION (auto-fire BEFORE following the resume directive):**",
    "",
    "```",
    `/checkin --topic ${arg}`,
    "```",
    "",
    "This re-claims the slot heartbeat (the compact window may have lapsed it),",
    "refreshes drift / dirty-tree / peer-claim state, and re-injects the slot-bound",
    "handoff. Only AFTER /checkin completes its §Report should you proceed with the",
    "resume directive above.",
  ].join("\n");
}

function main() {
  if (process.env.PRISM_AUTO_RESUME_DISABLE === "1") { emit(SILENCE); return; }

  const stdin = readStdinSync() || {};
  // Source detection — Claude Code passes `source` in SessionStart stdin
  // (startup | resume | compact | clear). Self-gate so the hook is harmless
  // if wired under an empty matcher.
  // SLOT-DRIFT-FIX-MS0/U-SDF07 (2026-05-17): extended to `clear` per user
  // directive "fix /clear to continue like /compact does". The handoff used
  // on the clear path is written by stop-force-handoff.mjs (Stop hook, T2)
  // on every turn-end — so a fresh handoff is always available when the
  // operator /clear's. /compact uses precompact-handoff.mjs (PreCompact
  // hook); /clear has no PreClear event so the Stop-hook write is the
  // mirror-image fix. Same RESUME extraction, same auto-fire of /checkin.
  const source = stdin.source || stdin.trigger || "";
  if (source !== "compact" && source !== "clear") { emit(SILENCE); return; }

  const stable = stableIdFromSession(stdin.session_id);
  if (!stable) { emit(SILENCE); return; }

  const handoff = getHandoff(stable);
  if (!handoff?.ok || !handoff?.content) { emit(SILENCE); return; }

  // U-SDF07: source-aware messaging — say "post-clear" on /clear, not "post-compact".
  const sourceLabel = source === "clear" ? "post-clear" : "post-compact";
  const age = ageMinutesFromFrontmatter(handoff.content);
  if (age != null && age > MAX_AGE_MIN) {
    // Handoff exists but is stale — surface a soft hint, don't auto-resume
    emit({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: `## 🔁 ${sourceLabel === "post-clear" ? "Post-clear" : "Post-compact"} handoff is STALE (${Math.round(age)}m old, threshold ${MAX_AGE_MIN}m)\n\nThe per-chat handoff file (${handoff.file || "?"}) is older than the auto-resume threshold. Treat this as a fresh session — re-read CLAUDE.md context, run /checkin, then decide next action.`,
      },
    });
    return;
  }

  const resume = extractResume(handoff.content);
  if (!resume) { emit(SILENCE); return; }

  // Gap 3: append `/checkin --topic <slot>-<topic>` auto-fire directive so
  // the post-/compact chat re-claims its slot heartbeat (lapsed during the
  // compact-release window) BEFORE following the resume body. Suppressed
  // when slot/topic parse fails OR when operator disables via knob.
  const noCheckin = process.env.PRISM_AUTO_RESUME_NO_CHECKIN === "1";
  const checkinBlock = noCheckin
    ? ""
    : buildCheckinDirective(parseSlotAndTopic(handoff.content));

  const lines = [
    `## 🔁 AUTO-RESUME after /${source} (per-chat handoff)`,
    ``,
    `Handoff file: ${handoff.file || "?"}`,
    `Age: ${age != null ? Math.round(age) + "m" : "unknown"}`,
    ``,
    `**Resume directive:**`,
    ``,
    resume,
  ];
  if (checkinBlock) lines.push(checkinBlock);

  // U-OBF02: append the bounded consolidated cross-topic open-threads summary
  // so this session sees prior-topic work the single-handoff RESUME misses.
  // Reuses the slot already parsed for the checkin directive; fail-soft "".
  const slotForConsolidated = parseSlotAndTopic(handoff.content)?.slot;
  const consolidatedBlock = getConsolidatedSummary(slotForConsolidated, handoff.file);
  if (consolidatedBlock) lines.push(consolidatedBlock);

  lines.push(
    ``,
    `*Proceed without asking unless the directive conflicts with the user's most recent message. If the user already gave a fresh instruction in their first post-compact message, that takes priority.*`,
  );

  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: lines.join("\n"),
    },
  });
}

try { main(); } catch { emit(SILENCE); }
