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
 *   Three SessionStart arms, one per trigger this hook handles: `matcher:
 *   "compact"`, `matcher: "clear"`, and `matcher: "startup"`. Belt-and-
 *   suspenders: the hook self-gates on stdin.source, so it is safe even if
 *   wired under an empty (all-events) arm.
 *
 * Three resume paths (SESSION-CONTINUITY-MS0 hardening, 2026-05-22):
 *   - source=compact / clear : read the per-chat handoff by stable session id
 *     (the id survives an in-process /compact or /clear).
 *   - source=startup + PRISM_BOOT_SLOT set : a FULL terminal restart gives a
 *     brand-new session id, so the handoff is unreachable by id. The fleet
 *     launcher (slot-tab-boot.ps1) exports PRISM_BOOT_SLOT — the only durable
 *     slot signal at startup — and this hook resolves the slot-keyed handoff
 *     directly, injecting RESUME before the launcher's /checkin-<slot> submit.
 *   - source=startup without PRISM_BOOT_SLOT : silent no-op (a plain,
 *     non-launcher claude launch is unchanged).
 *
 * Failure mode policy:
 *   ANY failure (no handoff, parse error, stale handoff, missing helper) is
 *   silent — emits {continue:true,suppressOutput:true}. Auto-resume is a
 *   convenience; we must never block SessionStart over it.
 *
 * Knobs:
 *   PRISM_AUTO_RESUME_DISABLE=1   — disable entirely (emit silent continue)
 *   PRISM_AUTO_RESUME_MAX_AGE_MIN — drop handoffs older than this (default 720 = 12h)
 *
 * Designed for the 26-chat fleet (alpha..zulu (25 work + 1 hygiene golf);
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
const DEFAULT_MAX_AGE_MIN = 720;             // 12 hour staleness threshold (F5 2026-06-08: was 240/4h — new-PC GPU/OCR bakes routinely exceed 4h, dropping valid handoffs as "stale" = silent resume loss)
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

// Canonical 26-slot fleet — the full NATO phonetic alphabet (alpha..zulu).
// MUST stay byte-equal to chat-slots.mjs SLOT_NAMES (the canonical source).
// History of the recurring drift this literal causes: 10 (alpha..juliett) →
// 13 (alpha..mike) → 26 (alpha..zulu, realigned 2026-05-19). Kept as a
// literal because this is a latency-critical SessionStart hook; the price is
// that every chat-slots.mjs SLOT_NAMES change must be mirrored here in the
// same commit (the 13→26 gap let november..zulu slots silently fail every
// SLOT_NAMES.has() membership check fleet-wide).
export const SLOT_NAMES = new Set([
  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf",
  "hotel", "india", "juliett", "kilo", "lima", "mike", "november",
  "oscar", "papa", "quebec", "romeo", "sierra", "tango", "uniform",
  "victor", "whiskey", "xray", "yankee", "zulu",
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
    return spawnSync(NODE_BIN, args, { windowsHide: true, encoding: "utf-8", timeout: HELPER_TIMEOUT_MS, ...opts });
  } catch { return { status: 1, stdout: "", stderr: "" }; }
}

function getHandoff(stableId) {
  if (!fs.existsSync(HELPER)) return null;
  const r = safeSpawn([HELPER, "read", "--terminal", stableId]);
  if (!r || r.status !== 0 || !r.stdout) return null;
  try { return JSON.parse(r.stdout); } catch { return null; }
}

/**
 * SESSION-CONTINUITY-MS0 hardening (2026-05-22) — read the handoff bound to a
 * slot via the authoritative `read --slot` tier of per-agent-handoff.mjs. That
 * tier resolves by the durable `slot:` frontmatter field (topic-prefix
 * fallback) and is authoritative: it returns `no_slot_handoff` rather than ever
 * falling through to a peer's file. Used on the full-restart boot path, where
 * the ephemeral session id is useless but the operator-typed slot name (passed
 * by the fleet launcher as PRISM_BOOT_SLOT) is durable. Fail-soft → null.
 */
function getHandoffBySlot(slot) {
  if (!fs.existsSync(HELPER)) return null;
  const r = safeSpawn([HELPER, "read", "--slot", slot]);
  if (!r || r.status !== 0 || !r.stdout) return null;
  try { return JSON.parse(r.stdout); } catch { return null; }
}

// SESSION-CONTINUITY-FIX/U-PSPIN-WINDOW-TIER (2026-06-18, slot:alpha):
// defense-in-depth for getHandoffPreferSlot. Pure: given a resolved terminal
// windowId + parsed chat-slots.json state, return the slot whose
// terminalWindowId matches (and is a canonical slot), else null. This is the
// terminal-SCOPED resolution that runs BEFORE the family-latest fallthrough in
// per-agent-handoff (which returns the newest handoff fleet-wide = a possibly
// RANDOM peer's chat). The terminal-window-id resolver is functional on hosts
// where ps-window-pin's findPsAncestorPid is not, so this closes the
// wrong-chat-resume gap even when the ps-pin tier misses. Exported for unit
// testing (R9).
export function slotForWindowId(windowId, slotsState, slotNames = SLOT_NAMES) {
  if (!windowId || typeof windowId !== "string") return null;
  const slots = slotsState && slotsState.slots ? slotsState.slots : null;
  if (!slots || typeof slots !== "object") return null;
  for (const [name, st] of Object.entries(slots)) {
    if (st && typeof st === "object"
        && st.terminalWindowId === windowId
        && slotNames.has(name)) {
      return name;
    }
  }
  return null;
}

// I/O wrapper around slotForWindowId: resolve THIS terminal's windowId via
// terminal-window-id.mjs, read chat-slots.json, return the matching slot.
// Fully fail-soft (dynamic import / fs / parse errors -> null).
const CHAT_SLOTS_JSON = (process.env.PRISM_ROOT || "H:/prism") + "/state/shared/chat-slots.json";
async function resolveSlotFromWindowId(sessionId) {
  try {
    const twMod = await import("../helpers/terminal-window-id.mjs");
    const windowId = twMod.resolveTerminalWindowId?.({ sessionId });
    if (!windowId || typeof windowId !== "string") return null;
    const data = JSON.parse(fs.readFileSync(CHAT_SLOTS_JSON, "utf-8"));
    return slotForWindowId(windowId, data);
  } catch { return null; }
}

/**
 * HIGHVALUE-DISCOVERY #6 (2026-06-08, slot:alpha): read the handoff SLOT-FIRST
 * on the compact/clear path to eliminate the wrong-chat resume. `read --terminal`
 * falls through to family-latest / global-latest in per-agent-handoff.mjs — on a
 * FRESH post-compact session id that can return a PEER's handoff (silent
 * cross-contamination: you resume another chat's work). When THIS terminal's slot
 * is resolvable (ps-window-pin, durable across /compact; or PRISM_BOOT_SLOT), read
 * the authoritative `--slot` tier first — it returns `no_slot_handoff` rather than
 * ever falling to a peer's file. Falls back to the `--terminal` read ONLY when no
 * slot resolves (preserves prior behavior exactly). Fully fail-soft.
 */
async function getHandoffPreferSlot(stableId, sessionId) {
  let slot = null;
  try {
    const psPinMod = await import("../helpers/ps-window-pin.mjs");
    const pin = psPinMod.readPinForCurrentWindow({ sessionId });
    if (pin && pin.slot && SLOT_NAMES.has(pin.slot)) slot = pin.slot;
  } catch { /* fail-soft — fall through to PRISM_BOOT_SLOT / --terminal */ }
  if (!slot && process.env.PRISM_BOOT_SLOT) {
    const boot = String(process.env.PRISM_BOOT_SLOT).toLowerCase();
    if (SLOT_NAMES.has(boot)) slot = boot;
  }
  // U-PSPIN-WINDOW-TIER (2026-06-18): terminal-SCOPED chat-slots.json lookup by
  // terminalWindowId BEFORE the family-latest fleet-global fallthrough inside
  // getHandoff() (which returns the newest handoff across ALL chats = a possibly
  // RANDOM peer). Functional on hosts where the ps-pin tier above misses.
  if (!slot) {
    const byWindow = await resolveSlotFromWindowId(sessionId);
    if (byWindow && SLOT_NAMES.has(byWindow)) slot = byWindow;
  }
  if (slot) {
    const bySlot = getHandoffBySlot(slot);
    if (bySlot?.ok && bySlot?.content) return bySlot;
  }
  return getHandoff(stableId); // --terminal fallback (prior behavior, no slot resolvable)
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

// HIGHVALUE-DISCOVERY #2 (2026-06-08, slot:alpha): the Stop hook
// handoff-memory-seed-stop.mjs distills recent error-events + memos + tribal
// learnings into a `## MEMORY_SEED` section appended to the handoff — but NO
// consumer ever read it (grep -c MEMORY_SEED here was 0). Every Stop paid to
// distill it; resume discarded 100%. This reader mirrors extractResume so the
// next session also gets the distilled signals. Bounded tighter (seed is
// secondary to RESUME). Fail-soft: absent section → null → nothing appended.
export function extractMemorySeed(content) {
  if (!content || typeof content !== "string") return null;
  const MAX_SEED_BYTES = 2000;
  const sections = ("\n" + content).split(/\n##\s/);
  for (let i = 1; i < sections.length; i++) {
    const sec = sections[i];
    if (!/^MEMORY_SEED\b/i.test(sec)) continue;
    const body = sec.replace(/^[^\n]*\n/, "").trim();
    if (!body || body.length < MIN_RESUME_BODY_LEN) return null;
    if (body.length > MAX_SEED_BYTES) {
      return body.slice(0, MAX_SEED_BYTES) + "\n\n…[truncated — full MEMORY_SEED in handoff]";
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

/**
 * SLOT-RECLAIM (2026-05-19) — NEXT-ACTION directive pointing at the
 * `/checkin-<nato>` slot wrapper.
 *
 * Supersedes buildCheckinDirective on the post-/compact path WHEN a
 * ps-window-pin resolves this terminal's authoritative slot. Why a different
 * directive: the generic `/checkin --topic <slot>-<topic>` that
 * buildCheckinDirective emits does NOT force-take a named slot —
 * slot-bind-enforce.mjs (the UserPromptSubmit hook that deterministically
 * force-claims a slot) only fires on the hyphenated `/checkin-<nato>` /
 * `/startup-<nato>` wrapper form. So if a peer drifted into this terminal's
 * slot during the /compact release window, a generic /checkin would leave it
 * there. `/checkin-<nato>` force-re-claims the exact slot this PowerShell
 * terminal owns.
 *
 * Returns "" when `slot` is not a canonical NATO slot — the caller then
 * falls back to buildCheckinDirective (handoff-derived advisory directive).
 *
 * @param {string} slot — canonical NATO slot resolved from the ps-window-pin
 * @param {string} source — "compact" | "clear" (message wording only)
 * @returns {string} markdown block, or "" when slot is not canonical
 */
export function buildSlotWrapperDirective(slot, source, opts = {}) {
  if (!slot || !SLOT_NAMES.has(slot)) return "";
  const verb = source === "clear" ? "clear" : "compact";
  // Operator directive (2026-06-10): the post-/compact session AUTO-STARTS the
  // full autonomous sequence -- `/startup-<slot> /loop [10m] /goal` -- so the
  // chat re-enters the Hermes loop on the standing goal and drives the build to
  // 100% instead of idling after a bare heartbeat. `/startup-<slot>` still
  // force-claims the exact slot via slot-bind-enforce (same slot-safety as the
  // old `/checkin-<slot>`) AND re-runs the startup audit; `/loop [10m] /goal`
  // re-enters the autonomous loop. `loopGoal:false` (knob
  // PRISM_AUTO_RESUME_LOOP_GOAL=0, read at the call site) reverts to the lighter
  // `/checkin-<slot>` heartbeat for operators who want pure-RESUME resumes.
  const loopGoal = opts.loopGoal !== false;
  const cmd = loopGoal ? `/startup-${slot} /loop [10m] /goal` : `/checkin-${slot}`;
  const tail = loopGoal
    ? [
        `This PowerShell terminal previously owned slot \`${slot}\`. \`/startup-${slot}\``,
        `force-re-claims that exact slot via slot-bind-enforce (survives the /${verb}`,
        `release window where a peer could drift in) and re-runs the startup audit;`,
        "`/loop [10m] /goal` then re-enters the autonomous loop. CONTINUE THE BUILD TO",
        "100% -- eval-gate each iteration (real tests + per-file scrutiny), never",
        "abandon mid-build, checkpoint at YELLOW and let auto-compact reset before a",
        "spiral. The RESUME directive above IS the standing goal to continue; re-read",
        "the handoff + roadmap + Obsidian brain/PSN as you go. Run this FIRST.",
      ]
    : [
        `This PowerShell terminal previously owned slot \`${slot}\`; \`/checkin-${slot}\``,
        `force-re-claims that exact slot via slot-bind-enforce (the generic \`/checkin\``,
        `does NOT force-take a named slot, so a peer that drifted into \`${slot}\` during`,
        `the /${verb} window would otherwise keep it). Run this FIRST, then proceed with`,
        "the resume directive above.",
      ];
  return [
    "",
    "**NEXT ACTION (auto-fire BEFORE following the resume directive):**",
    "",
    "```",
    cmd,
    "```",
    "",
    ...tail,
  ].join("\n");
}

/**
 * SESSION-CONTINUITY-MS0 hardening (2026-05-22) — pure builder for the
 * full-restart boot RESUME block. Given a slot-keyed handoff's content +
 * metadata, returns the SessionStart additionalContext markdown, or null when
 * the handoff is too stale (older than maxAgeMin) or has no usable RESUME
 * section. Pure (no env reads, no I/O) so it is unit-testable like the other
 * build* exports; main()'s `startup` branch wraps it with the env read +
 * getHandoffBySlot subprocess call.
 *
 * Returns null (caller emits SILENCE) on: missing/non-string content, a slot
 * that is not canonical, a handoff staler than maxAgeMin, or an empty RESUME.
 *
 * @param {{content: string, slot: string, file?: string, maxAgeMin?: number}} a
 * @returns {string|null}
 */
export function buildBootResumeContext({ content, slot, file, maxAgeMin = MAX_AGE_MIN } = {}) {
  if (!content || typeof content !== "string") return null;
  if (!slot || !SLOT_NAMES.has(slot)) return null;
  const age = ageMinutesFromFrontmatter(content);
  if (age != null && age > maxAgeMin) return null;
  const resume = extractResume(content);
  if (!resume) return null;
  const memSeed = extractMemorySeed(content);
  return [
    `## 🔁 AUTO-RESUME on fleet boot — slot \`${slot}\``,
    ``,
    `Handoff: ${file || "?"} (age ${age != null ? Math.round(age) + "m" : "unknown"})`,
    `Resolved by the durable slot name (PRISM_BOOT_SLOT) — this survives a`,
    `full terminal restart, where the per-chat handoff is unreachable by the`,
    `fresh process's new session id.`,
    ``,
    `**Resume directive:**`,
    ``,
    resume,
    ...(memSeed ? [``, `## 🌱 Memory seed — distilled signals from last session`, ``, memSeed] : []),
    ``,
    `The fleet launcher submits the slot's boot sequence as the first prompt --`,
    `\`/startup-${slot} /loop [10m] /goal\` by default, or \`/checkin-${slot}\` when`,
    `PRISM_BOOT_LOOP_GOAL=0 -- and this context anchors that turn. When the loop`,
    `sequence runs, \`/startup-${slot}\` force-claims the slot + runs the startup`,
    `audit, then \`/loop [10m] /goal\` re-enters the autonomous loop on the resume`,
    `directive above: CONTINUE THE BUILD TO 100% -- eval-gate each iteration (real`,
    `tests + per-file scrutiny), never abandon mid-build. Proceed with the resume`,
    `directive once startup has completed its §Report.`,
  ].join("\n");
}

// -- CONTEXT-RECOVERY-MS0 (2026-06-10, slot:tango) --------------------------
// scripts/recover-today-context.mjs harvests each slot's full today-context
// (operator directives + commits + every IN-PLACE compaction summary the live
// window rolled up) into state/shared/context-recovery/<slot>-TODAY-<date>.md.
// The fleet launcher reopens active slots via `claude --resume` (source=
// "resume"), which this hook otherwise SILENCEs -- so the resumed-but-amnesiac
// window never sees that recovery. This pointer surfaces it on BOTH the resume
// and startup paths. The file is date-stamped so the pointer self-expires the
// next day (a stale yesterday-file never resurfaces). Fail-soft: any error or a
// missing/absent recovery file returns "" -> the existing path is unchanged.
const RECOVERY_DIR = "H:/prism/state/shared/context-recovery";
function todayStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function getRecoveryPointer(slot) {
  try {
    if (!slot || !SLOT_NAMES.has(slot)) return "";
    const file = `${RECOVERY_DIR}/${slot}-TODAY-${todayStamp()}.md`;
    if (!fs.existsSync(file)) return "";
    return [
      `## 🔁 CONTEXT RECOVERY available - slot \`${slot}\``,
      ``,
      `Your live window compacted earlier today, which rolled up and dropped earlier`,
      `detail from context. A VERBATIM recovery of today's full context (operator`,
      `directives, commits shipped, and every compaction summary) is at:`,
      ``,
      `  ${file}`,
      ``,
      `READ THAT FILE before continuing so no task you were mid-way through earlier today is dropped.`,
    ].join("\n");
  } catch { return ""; }
}

async function main() {
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

  // SESSION-CONTINUITY-MS0 hardening (2026-05-22) — full-restart resume.
  // On a full terminal restart the fresh process gets source="startup" with a
  // brand-new session id, so the per-chat handoff is unreachable by id and the
  // ps-window-pin cannot map a brand-new window to a slot. The fleet launcher
  // (slot-tab-boot.ps1) is the ONLY entity that knows "this tab is <slot>" at
  // startup time; it exports that as PRISM_BOOT_SLOT. When set, resolve the
  // slot-keyed handoff directly and inject the RESUME here — so the chat has
  // prior context from its very first token, independent of whether the
  // launcher's /checkin-<slot> auto-submit lands (that submit is otherwise the
  // sole, silent-on-failure resume path for the full-restart case). A plain
  // (non-launcher) `startup` carries no PRISM_BOOT_SLOT and falls through to
  // SILENCE — no behaviour change for any chat not booted by the fleet launcher.
  if (source === "startup") {
    const bootSlot = (process.env.PRISM_BOOT_SLOT || "").trim().toLowerCase();
    if (!bootSlot || !SLOT_NAMES.has(bootSlot)) { emit(SILENCE); return; }
    const bootHandoff = getHandoffBySlot(bootSlot);
    if (!bootHandoff?.ok || !bootHandoff?.content) { emit(SILENCE); return; }
    // F5 2026-06-08: boot path used to emit(SILENCE) on a stale handoff — a
    // silent resume loss (the boot chat got NO context AND no signal it had
    // prior work). The compact path (below) surfaces a STALE hint; give the
    // boot path parity so a >threshold gap is visible, not invisible.
    const bootAge = ageMinutesFromFrontmatter(bootHandoff.content);
    if (bootAge != null && bootAge > MAX_AGE_MIN) {
      emit({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext: `## 🔁 Boot handoff for slot \`${bootSlot}\` is STALE (${Math.round(bootAge)}m old, threshold ${MAX_AGE_MIN}m)\n\nThe slot's handoff (${bootHandoff.file || "?"}) is older than the auto-resume threshold. Treat this as a fresh session — re-read CLAUDE.md context, run /checkin-${bootSlot}, then decide next action.`,
        },
      });
      return;
    }
    const bootContext = buildBootResumeContext({
      content: bootHandoff.content,
      slot: bootSlot,
      file: bootHandoff.file,
    });
    if (!bootContext) { emit(SILENCE); return; }
    // CONTEXT-RECOVERY-MS0: a fresh /checkin-<slot> boot (source=startup) also
    // surfaces today's recovery file if one exists -- additive, fail-soft "".
    const startupPtr = getRecoveryPointer(bootSlot);
    emit({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: startupPtr ? `${bootContext}\n\n${startupPtr}` : bootContext,
      },
    });
    return;
  }

  // CONTEXT-RECOVERY-MS0 (2026-06-10, slot:tango): the fleet launcher reopens
  // active slots with `claude --resume` -> source="resume", which this hook has
  // always SILENCEd. But that resumed window lost earlier-today detail across
  // in-place compactions. When a fresh per-slot recovery file exists, surface a
  // pointer so the resumed chat reads it on its first turn. Fail-soft: no boot
  // slot / no recovery file -> falls through to the existing SILENCE below.
  if (source === "resume") {
    const resumeSlot = (process.env.PRISM_BOOT_SLOT || "").trim().toLowerCase();
    const ptr = getRecoveryPointer(resumeSlot);
    if (ptr) {
      emit({ continue: true, hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: ptr } });
      return;
    }
    emit(SILENCE);
    return;
  }

  if (source !== "compact" && source !== "clear") { emit(SILENCE); return; }

  const stable = stableIdFromSession(stdin.session_id);
  if (!stable) { emit(SILENCE); return; }

  const handoff = await getHandoffPreferSlot(stable, stdin.session_id);
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
  const memSeed = extractMemorySeed(handoff.content);

  // Gap 3 / SLOT-RECLAIM: append a slot-recovery NEXT-ACTION directive so the
  // post-/compact chat re-claims its slot BEFORE following the resume body.
  //
  // SLOT-RECLAIM (2026-05-19): resolve THIS PowerShell terminal's authoritative
  // slot from the ps-window-pin (keyed on the terminal's PowerShell ancestor
  // PID). When found, emit the `/checkin-<nato>` wrapper — it force-re-claims
  // the slot via slot-bind-enforce; the generic `/checkin --topic` does NOT
  // force-take a named slot, so a peer that drifted into this terminal's slot
  // during the /compact release window would keep it. Dynamic import + full
  // fail-soft: a missing or broken ps-window-pin helper must never break
  // auto-resume — it falls through to the handoff-derived advisory directive.
  let psPinnedSlot = null;
  try {
    const psPinMod = await import("../helpers/ps-window-pin.mjs");
    const pin = psPinMod.readPinForCurrentWindow({ sessionId: stdin.session_id });
    if (pin && pin.slot && SLOT_NAMES.has(pin.slot)) psPinnedSlot = pin.slot;
  } catch { /* fail-soft — handoff-derived fallback below */ }

  // Resolve the slot to direct the chat at: ps-window-pin FIRST (window-keyed,
  // ideal), then the per-chat handoff frontmatter. The ps-window-pin is
  // frequently empty on this host (findPsAncestorPid resolves nothing), so the
  // handoff is the signal that actually carries the slot identity in practice
  // — without this fallback the /checkin-<nato> directive would almost never
  // fire and the chat would get the weaker generic /checkin.
  const parsed = parseSlotAndTopic(handoff.content);
  const slotForDirective = psPinnedSlot
    || (SLOT_NAMES.has(parsed.slot) ? parsed.slot : "");

  const noCheckin = process.env.PRISM_AUTO_RESUME_NO_CHECKIN === "1";
  // Operator directive (2026-06-10): default the slot directive to the full
  // `/startup-<slot> /loop [10m] /goal` autonomous re-entry. PRISM_AUTO_RESUME_LOOP_GOAL=0
  // reverts to the lighter `/checkin-<slot>` heartbeat (env read at the call
  // site so buildSlotWrapperDirective stays pure/testable).
  const loopGoal = process.env.PRISM_AUTO_RESUME_LOOP_GOAL !== "0";
  let checkinBlock = "";
  if (!noCheckin) {
    // /startup-<nato> /loop [10m] /goal (slot-bind-enforce force-claims it +
    // re-enters the autonomous loop) whenever the slot is known; the generic
    // /checkin --topic only as a last resort when no canonical slot resolves.
    checkinBlock = slotForDirective
      ? buildSlotWrapperDirective(slotForDirective, source, { loopGoal })
      : buildCheckinDirective(parsed);
  }

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
  if (memSeed) lines.push(``, `## 🌱 Memory seed — distilled signals from last session (recent errors / memos / tribal)`, ``, memSeed);
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

// main() is async (SLOT-RECLAIM dynamic-imports ps-window-pin.mjs). A rejected
// promise — from any throw, sync or post-await — resolves to a silent
// {continue:true} so a failure here can never block SessionStart.
//
// Run main() ONLY when invoked as a script — not when a test imports this
// module for the exported pure functions. main() calls readStdinSync()
// (fs.readFileSync(0)), which BLOCKS on a test runner's open-but-unclosed
// stdin pipe — running it on import hangs `node --test`. FAIL-OPEN: if the
// argv/import.meta probe throws, default to running (a SessionStart hook must
// never be silently dead). A test file's basename is *.test.mjs, never equal
// to this hook's basename, so __isMain resolves false there.
const __isMain = (() => {
  try {
    const argv1 = (process.argv[1] || "").replace(/\\/g, "/");
    const argv1Base = argv1.split("/").pop() || "";
    return argv1Base.length > 0
      && import.meta.url.replace(/\\/g, "/").endsWith(argv1Base);
  } catch { return true; }
})();
if (__isMain) main().catch(() => emit(SILENCE));
