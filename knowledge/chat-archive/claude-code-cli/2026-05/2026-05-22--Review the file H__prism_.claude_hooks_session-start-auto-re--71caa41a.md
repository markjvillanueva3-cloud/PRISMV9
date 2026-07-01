---
type: "chat-session"
source: "claude-code-cli"
session_id: "71caa41a-c98f-481d-b8f8-9085679aaf40"
title: "Review the file H:/prism/.claude/hooks/session-start-auto-resume.mjs end-to-end."
date: "2026-05-22"
first_ts: "2026-05-22T18:06:21.397Z"
last_ts: "2026-05-22T18:07:05.030Z"
cwd: "H:\\prism"
messages: 11
user_msgs: 4
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/71caa41a-c98f-481d-b8f8-9085679aaf40/subagents/agent-a22e50cf8dfb1ed12.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review the file H:/prism/.claude/hooks/session-start-auto-resume.mjs end-to-end.

> **claude-code-cli** | 2026-05-22 | 11 msgs (4 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/71caa41a-c98f-481d-b8f8-9085679aaf40/subagents/agent-a22e50cf8dfb1ed12.jsonl`

## Transcript

### User | 2026-05-22T18:06:21.397Z

Review the file H:/prism/.claude/hooks/session-start-auto-resume.mjs end-to-end. It is a Claude Code SessionStart hook for the PRISM platform.

What changed this session (SESSION-CONTINUITY-MS0 hardening): a new `startup`-event resume path was added. Context: on a FULL terminal restart, a fresh claude process gets SessionStart source="startup" with a brand-new session id — so the per-chat handoff (keyed by session id) is unreachable, and the previous design depended entirely on the fleet launcher's `/checkin-<slot>` auto-submit landing (a silent-failure single point). The fix: the fleet launcher (slot-tab-boot.ps1) now exports an env var PRISM_BOOT_SLOT; this hook gained (1) a `getHandoffBySlot(slot)` helper that spawns `per-agent-handoff.mjs read --slot <slot>` (an authoritative slot-keyed read), (2) a pure exported `buildBootResumeContext({content,slot,file,maxAgeMin})` builder, and (3) a `startup`-branch in main() that reads PRISM_BOOT_SLOT, calls getHandoffBySlot + buildBootResumeContext, and injects the RESUME as SessionStart additionalContext. The hook is now wired under a new `matcher:"startup"` SessionStart arm in settings.json.

Verify specifically — flag P0/P1 issues, grade PASS or FAIL:
1. Failure isolation: the hook MUST never block or break SessionStart. Every path must emit a valid {continue:true} JSON. Confirm the startup branch's guard clauses all emit SILENCE on the reject paths, and that a throw anywhere resolves to SILENCE (the main().catch at file end).
2. Regression: confirm the existing compact/clear paths are byte-unchanged in behavior — the new startup branch is inserted BEFORE the `compact/clear` gate and returns, so it must not alter compact/clear flow.
3. No-op for non-launcher chats: a plain `startup` with no PRISM_BOOT_SLOT env var must fall through to SILENCE — confirm no behavior change for any chat not booted by the fleet launcher.
4. buildBootResumeContext purity: it must do no I/O, no env reads. Confirm. Confirm the age==null case i
... [+437 chars truncated]

### Assistant | 2026-05-22T18:06:37.750Z

I'll review the file end-to-end.

### Assistant | 2026-05-22T18:06:37.932Z

[tool_use: Read]

### User | 2026-05-22T18:06:40.843Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\session-start-auto-resume.mjs' was already read 1s ago in this session and is unchanged (mtime 1779473063249). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-22T18:06:43.928Z

The guard says the content is in context, but I have not actually received the file contents yet. Let me read it with explicit parameters.

### Assistant | 2026-05-22T18:06:44.115Z

[tool_use: Read]

### User | 2026-05-22T18:06:48.843Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * session-start-auto-resume.mjs — Auto-resume after /compact.
5	 *
6	 * Problem this solves:
7	 *   The user observed inconsistent post-compact auto-continue behaviour —
8	 *   sometimes a fresh post-compact session resumes work without needing
9	 *   "continue", sometimes it stalls until the user prompts manually. The
10	 *   inconsistency is because n
... [+27475 chars truncated]

### Assistant | 2026-05-22T18:06:52.685Z

I have lines 1-530 but the file is ~530 lines and line 530 was cut mid-statement. Let me read the tail.

### Assistant | 2026-05-22T18:06:53.158Z

[tool_use: Read]

### User | 2026-05-22T18:06:56.002Z

[tool_result] 528	    // known; the generic /checkin --topic only as a last resort when no
529	    // canonical slot resolves at all.
530	    checkinBlock = slotForDirective
531	      ? buildSlotWrapperDirective(slotForDirective, source)
532	      : buildCheckinDirective(parsed);
533	  }
534	
535	  const lines = [
536	    `## 🔁 AUTO-RESUME after /${source} (per-chat handoff)`,
537	    ``,
538	    `Handoff file:
... [+2291 chars truncated]

### Assistant | 2026-05-22T18:07:05.030Z

PASS

I have the full file (587 lines, all in context). Verdict against the 6 axes:

**1. Failure isolation — PASS.** Startup branch: `PRISM_AUTO_RESUME_DISABLE` (L422), bad/missing `bootSlot` (L451), `!bootHandoff?.ok || !bootHandoff?.content` (L453), `!bootContext` (L459) all `emit(SILENCE); return`. Any throw resolves via `main().catch(() => emit(SILENCE))` (L587). `getHandoffBySlot` is sync, all branches caught.

**2. Compact/clear regression — PASS.** Startup branch (L449-468) ends with `return` before the `source !== "compact" && source !== "clear"` gate (L470). Compact/clear path is byte-unchanged.

**3. No-op for non-launcher chats — PASS.** Plain `startup` with no `PRISM_BOOT_SLOT` → `bootSlot` empty → L451 emits SILENCE. No fall-through into compact/clear (it `return`s). Correct.

**4. buildBootResumeContext purity — PASS.** No I/O, no `process.env` (the `maxAgeMin` default `= MAX_AGE_MIN` is a module-load-time const, not a per-call env read). `age != null && age > maxAgeMin` → null; `age == null` skips that check → treated as not-stale, resumes. Correct.

**5. getHandoffBySlot — PASS.** Fail-softs to null on missing helper (L130), non-zero/empty status (L132), unparseable stdout (L133). The `read --slot` contract returning `{ok,content,file}` is consumed correctly at L453/L455-457.

**6. Scope/floating promises — PASS.** `main()` is the only async; `.catch` attached (L587). No floating promises, no swallowed errors burying real failures (SessionStart-silent-by-design is the documented contract). No scope creep — change is confined to the three additions described.

**Minor (P3, non-blocking):** `SLOT_NAMES` literal duplication vs `chat-slots.mjs` is a known, documented drift hazard (L78-85) — not introduced this session.

Grade: **PASS** — both startup-resume hardening goals met with full failure isolation and zero compact/clear regression.

File: `H:/prism/.claude/hooks/session-start-auto-resume.mjs`
