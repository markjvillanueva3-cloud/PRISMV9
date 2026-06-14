---
name: handoff-discipline
category: software-engineering
domain: backend-dev
tags: [handoff, resume, precompact, session-continuity, prism-development, ai-development]
last_updated: 2026-05-18
---

# Handoff Discipline — write a RESUME the next session can execute

Every chat session ends. The next session reads the handoff and resumes. If the handoff is vague, the next session re-derives state and wastes tokens. If the handoff is wrong, the next session ships against stale assumptions and wastes commits. Five rails keep handoffs useful.

## The contract (per-agent-handoff.mjs write)

`state/shared/handoffs/HANDOFF-claude-<id>-<topic>.md` — one file per chat per session. Required fields:
- `source: live-chat` (auto-writer is BANNED; precompact-hook is a strict exception)
- `terminal: stable-session-id` (NOT `$PPID` — hook PIDs rotate between invocations)
- `resume`: SPECIFIC actionable directive (the load-bearing field)
- `state`: 1-line accomplishment summary
- `topic`: scope slug (auto-derived from commits if omitted; pass `--topic` explicitly when you can)

The Stop hook `enforce-handoff-topic.mjs` renames topicless files; pass `--topic` in every write.

## Rail 1 — RESUME directives that work

A working RESUME directive is specific enough that a fresh Claude can execute it WITHOUT asking questions.

- Good: `Continue INGEST-MS6 U-SHOP01: build ShopDataCompletenessEngine at mcp-server/src/engines/, follow spec at state/shared/specs/UNITS/U-SHOP01.md`
- Good: `Fix 3 TS errors in dataDispatcher.ts lines 45, 120, 300 — missing type imports for MaterialEntry`
- Good: `INGEST track complete (8/8 milestones). Pick next track from atomic-roadmap.json priority=0 lane`
- Bad: `Continue working`
- Bad: `Read git log`
- Bad: `compacting — read per-agent handoff on restore` (placeholder; will be overridden by smart fallback)

## Rail 2 — STATE is one line, accomplishment-focused

Not a status report — a single line answering "what did this session ship?"

- Good: `Wired backend-dev tribal domain, retagged 62 entries, 20 wikis, 64 tests PASS`
- Bad: `Worked on tribal stuff; some commits`

## Rail 3 — CONTEXT TO PRESERVE is non-derivable only

Three categories belong here:
- Decisions made + WHY (the rationale isn't in the diff)
- Discoveries that surprised you (the bug class, the hidden coupling)
- Assumptions that future sessions must revisit

Three categories DON'T belong here (derivable from code/git):
- File paths (those go in RESUME directly)
- "I created X" (git log has this)
- Recent commit messages (git log has this verbatim)

## Rail 4 — DEFERRED ITEMS list with file:line precision

When you started something but didn't finish, name the exact resume point:
- `Deferred: scripts/foo.mjs:142 — needs Ollama probe wrapper, see TODO at line 143`
- `Deferred: knowledge/wiki/X.md — frontmatter missing tags field`

NOT: "some scripts need finishing"

## Rail 5 — Topic naming is enforced

Topic is derived in priority order:
1. Most-recent commit's `[SCOPE-MS#]` tag
2. `state/CURRENT_POSITION.md` milestone heading
3. Last segment of git branch (`work/X-ms0` → `X-ms0`)

When writing by hand, pass `--topic <slug>`. The Stop hook renames topicless `HANDOFF-<id>.md` → `HANDOFF-<id>-<topic>.md` so a missing topic is auto-fixed, but explicit beats inferred.

## The auto-writer ban (2026-05-06 doctrine)

The PreCompact hook auto-writer is BANNED. It used to fall back to a generic "Pre-compact snapshot" stub which clobbered real RESUMEs. Now ONLY the live chat can write handoffs via `--source live-chat`. `precompact-hook` is a strict exception (gated to non-placeholder content).

If you skip the precompact handoff, the next session has NO handoff for this chat — non-recoverable from inside the next session.

## The compact-boundary fix (2026-05-15)

`precompact-auto-trigger.mjs`'s byte-estimate fallback was dividing the entire transcript file size by 3.5, which after one `/compact` reported pre-compact bloat as current-context tokens. The fix: `findLastCompactOffset` scans for `"isCompactSummary":true` and only post-boundary bytes feed the estimate. Sanity floor tightened 1.5x to 1.1x cap.

Implication: `/compact` is safe to run repeatedly; the auto-trigger won't false-fire on previously-compacted context.

## Cross-/compact resume (2026-05-15 stack)

Four pieces let a chat survive `/compact`:
- `precompact-handoff.mjs` (PreCompact) — auto-writes a smart RESUME via padFileToBytes
- `session-start-terminal-pin.mjs` (T1 SessionStart) — slot binding via terminalWindowId
- `session-start-auto-resume.mjs` (T0 SessionStart compact) — injects `## RESUME` from handoff
- `terminal-window-id.mjs` — 4-tier resolver with cache-hit auto-upgrade

Same PowerShell window → same slot, even across `/compact`, `/clear`, fresh `claude` invocation.

## When to write a NEW handoff vs append

Each session ends → write a NEW handoff. Don't append to the previous session's file — they're session-bounded.

If multiple chats share a slot across sessions (terminal-pin works), the FILENAME may persist while the body is rewritten. The body is overwritten on each write; the filename's `<topic>` may evolve per scope shift.

## Anti-patterns

- Writing RESUME = "see commit log" — future Claude can't pick a next action from raw git log
- Stuffing all context into STATE — STATE is a tag line; detail belongs in CONTEXT or DEFERRED
- Skipping `--source live-chat` — the writer rejects with `writer_banned`
- Writing the handoff AFTER `/compact` — too late; `/compact` triggers the read-side hook

## Related

- [[multi-chat-coordination]] — per-chat handoffs are private; chat-bus is shared
- [[hook-lifecycle-anatomy]] — PreCompact + Stop + SessionStart roles
- CLAUDE.md "PER-CHAT HANDOFF (7 CONCURRENT CHATS)"
- CLAUDE.md "SESSION CONTINUITY STACK"
- feedback_handoff_writers.md — the ban + exception doctrine
