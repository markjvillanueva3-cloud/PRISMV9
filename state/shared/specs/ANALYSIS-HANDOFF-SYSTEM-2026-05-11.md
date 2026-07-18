---
title: ANALYSIS — Precompact / Compact / Handoff / Startup chain audit + Claude CLI compaction-and-token-limit findings
date: 2026-05-11
authoring_session: claude-2570c8f5-→-9e6b9538
exhibit_a: This very analysis was generated INSIDE the failure mode it documents (two consecutive /compact attempts failed to compress conversation tokens; context inflated 1.79M → 1.92M before forced hard restart)
scope: Multi-chat 6-lane coordination at PRISM scale (~480 hooks, 32 SessionStart hooks, 6 PreCompact, 32 Stop, MCP servers, 1M-context model)
priority: T0 (operational continuity)
---

# Analysis — Why the handoff/compact chain breaks at scale, and how to fix it

## §0 — TL;DR

The Claude Code harness in this repo has a token-economy bug: **the autocompact threshold is overridden to 95% of the 1M-context window, AND every SessionStart re-injects ~100KB of hook additionalContext that survives the compaction summary.** Compounding result: a "compacted" session can be larger than the pre-compact session.

Three root causes in order of leverage:

1. **`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: 95`** in `C:\Users\wompu\.claude\settings.json:19`. Default ~85% → forced to 95%. On 1M context that is ~950k tokens before compact triggers.
2. **32 SessionStart hooks each emitting `additionalContext`** — `claude-brief-inject`, `build-state-inject`, `tier1-context-pack`, `output-cache-inject`, `inventory-check-guard`, `ai-deep-intelligence`, `cognitive-budget-allocator`, etc. One alone was logged at 11.8KB this session ("Output too large"). Aggregate per SessionStart: ~100-300KB.
3. **Hook output PRESERVE behavior across /compact**: SessionStart hooks fire on the post-compact resume; the compacted summary cannot absorb the new injection, so the post-compact context = compacted-summary + fresh hook injection stack. This is why `/compact` "succeeds" yet the token tank does not drop.

Secondary contributors:

4. **`CLAUDE_CODE_MAX_OUTPUT_TOKENS: 85000`** allows a single turn to emit up to 8.5% of the 1M window. One pathological turn is enough to push past 95%.
5. **`stable-session-id.mjs` persistently errors "unresolved"** — every chat that hits this falls back to UUID-from-path, polluting downstream coordinators with unstable IDs.
6. **PreToolUse helper `context-economy-v2.mjs` itself OOMs** (`/bin/bash: xmalloc: cannot allocate 8192 bytes`) under load — the helper meant to police context economy crashes from context starvation. Observed live this session.

## §1 — Exhibit A: Reproducible failure trace from this session

| Session | Action | Context-tank | Outcome |
|---------|--------|--------------|---------|
| `45801f9f-...` | session start | ~5k | normal work |
| `45801f9f-...` | /handoff + /compact | unmeasured | spawned `2570c8f5-...` |
| `2570c8f5-...` | resume + work | 1.79M | TaskCreate hard-blocked: "context exceeds" |
| `2570c8f5-...` | /compact (attempt 1) | 1.79M → unchanged | SessionStart hooks fired, no compression |
| `2570c8f5-...` | /precompact handoff write | — | wrote HANDOFF file via per-agent-handoff |
| `2570c8f5-...` | external restart | — | spawned `9e6b9538-...` |
| `9e6b9538-...` | resume | **1.92M** (worse than pre-restart) | Read/Bash/TaskCreate all hard-blocked |
| `9e6b9538-...` | /compact (attempt 2) | 1.92M → unchanged | "Compacted" message; tank stayed inflated |
| `9e6b9538-...` | full terminal kill + Claude relaunch | — | new session, ~5k, work resumes |

**Diagnostic value:** the failure is deterministic. It is not a model glitch — it is the hook injection layer outrunning compaction.

## §2 — Why this is structural, not incidental

The legacy mental model is: "compact reduces token count; restart reduces token count more." In this harness, that is false. The actual behavior:

- **/compact** summarizes the conversation prose, then re-injects SessionStart hooks. If SessionStart hook output ≥ compacted-summary size, net change is ≤ 0.
- **External restart** spawns a new session UUID but the harness loads CLAUDE.md (large), MEMORY.md, and runs SessionStart again. Same injection floor. Plus there is a `SessionStart:resume` matcher path that loads the prior session's transcript reference, partially re-hydrating context.

**Implication:** the only path that truly clears context is a **TRUE process kill** (close terminal, kill claude.exe in Task Manager if needed, reopen). Anything less reuses session state.

## §3 — Settings.json findings — top 7 patches

| Severity | Symptom | Patch | Risk |
|----------|---------|-------|------|
| P0 | `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: 95` defers compact to 950k tokens | Set to `75` (default behavior). Compact triggers earlier with more headroom. | None — earlier compact is strictly safer. |
| P0 | 32 SessionStart hooks all emit additionalContext | **Move 18+ to cron** — `claude-brief-inject` already regenerates `state/shared/CLAUDE-BRIEF.md` on disk (1.1h ago per this session's own SessionStart output). If file regenerates on cron, no need to fire-inject every SessionStart. Same for `build-state-inject`, `tier1-context-pack`. | Low — content survives on disk; agents can Read on demand. |
| P0 | `CLAUDE_CODE_MAX_OUTPUT_TOKENS: 85000` allows runaway turns | Cap to `32000`. Forces the model to compact its own output. | Low — only affects extremely-long turns which are rare and usually unproductive. |
| P1 | `stable-session-id.mjs` errors "unresolved" | Fix the resolver to prefer `CLAUDE_SESSION_ID` env var → fall back to `WT_SESSION` → fall back to `claude.exe` PID parent walk → emit UUID-from-projects-path as last resort, not as common path. | Low — current fallback works but is noisy. |
| P1 | PreToolUse `context-economy-v2.mjs` OOMs | Either fix memory leak in helper OR drop it from PreToolUse chain (it should never be in the hot path if it itself needs 8KB+ to run). | Medium — losing the helper means losing the "wasted call" deduper unless replaced. |
| P2 | SessionStart hook output "Output too large (11.8KB)" auto-persists to `tool-results/hook-*.txt` AND injects preview | Cap each hook's stdout at 2KB. If hook needs to emit more, it writes to a file + emits a 1-line pointer. | Low. |
| P2 | 32 Stop hooks fire on every session end | Bundle similar Stop checks into one wrapper (`stop-bundle.mjs`) — same pattern already used for `edit-bundle.mjs` and `bash-bundle.mjs`. Halves the spawn-cost. | Low — the bundles pattern is already proven. |

## §4 — The handoff system itself — what works, what doesn't

### What works (preserve)
- **`state/shared/handoffs/HANDOFF-<sessionId>-<topic>.md`** — file-per-chat naming. Multi-chat safe.
- **`per-agent-handoff.mjs write --source live-chat`** — writer-banned for hooks, only live chat can write. Prevented the "auto-writer clobbers RESUME" class of bug.
- **`enforce-handoff-topic.mjs`** Stop hook — renames topicless handoffs.
- **PreCompact hook auto-writer is BANNED** — explicit policy from feedback memory.

### What breaks
- **Handoff RESUME directives go stale**. This session's RESUME claimed Round-2 atomization was pending; on-disk evidence showed it was completed in a prior session. RESUME assumes monotonic forward progress and does not detect parallel-chat completion.
- **`stable-session-id.mjs` "unresolved"** — already covered above. Forces fallback UUID, which means subsequent `read` operations cannot find the handoff written under the resolved UUID.
- **No handoff-staleness detector**. When the RESUME points at work that another chat already shipped, the resumer wastes a full chat-window before noticing.

### Patches
- Add a `state/shared/handoffs/handoff-staleness-check.mjs` that — on SessionStart — diffs the RESUME directive's named milestones against the atomized/wired-engine on-disk state. If RESUME points at "atomize X" but X is already on disk, surface a warning to the resumer.
- Auto-mark handoff as `status: superseded` when the milestone it RESUMEs is detected complete.
- Fix `stable-session-id.mjs` resolver order.

## §5 — Multi-chat scale: what scales, what doesn't

PRISM runs ~6 concurrent chats. Settings.json was authored for single-chat. The compaction problem is amplified because:

- **Each chat fires its own SessionStart hook stack** independently. The hooks read shared state (CLAUDE-BRIEF, BUILD_STATE) but each materializes that ~100KB into ITS own context window.
- **Shared write contention** is solved by file-claim-guard + cross-worktree firewall (HOOK-SYNERGY-MS0 H6). But READ-time amplification is unsolved — every chat re-reads the same big files.

### What to add
- **Per-chat context budget** — `cognitive-budget-allocator.mjs` already exists but is wired to per-tool-call; it should also be wired to per-SessionStart-injection. Track aggregate injection per chat and emit early-warn at 50% of compact threshold.
- **Hook-output sharing** — if 6 chats all need `BUILD_STATE.md`, the hook could check `state/shared/cache/build-state-injected-this-session.<sessionId>.flag` and skip re-injection within a session.
- **Selective injection by lane** — chat in lane-A-hooks-foundation doesn't need cad-fusion vision spec injected; conversely the cad-fusion chat doesn't need backend-devtools roadmap context. Inject based on `state/shared/active-claims.jsonl` lane field.

## §6 — Obsidian + HTML integration sketch (deferred user ask)

User asked to integrate Obsidian + HTML into the multi-chat scaling. Brief sketch (full spec out of scope for this analysis doc):

- **Obsidian role**: bidirectional vault for permanent knowledge. Wiki + memory + skills get promoted to obsidian on a daily cadence. Multi-chat conflicts resolve via obsidian's own conflict-handling (works because edits are append-mostly to markdown files).
- **HTML role**: read-only render layer for stakeholder-facing specs. Generated by `SpecHTMLCompanionEngine` (HTML-PRIMARY-MS0 / HTML-COMPANION-MS0). Helps non-Claude consumers (codex, gemini, kimi, human reviewers) read the same source.
- **Integration with handoff**: each per-chat handoff gets an auto-emitted HTML twin at `state/shared/handoffs/HANDOFF-<id>-<topic>.html`. Operator on a phone can read the HTML without firing up a terminal.

## §7 — Action checklist (in priority order, drop-in)

```
[P0] Edit C:\Users\wompu\.claude\settings.json
     - "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "75"  (was 95)
     - "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "32000"  (was 85000)
     Reason: autocompact-too-late + per-turn-too-large.

[P0] Audit & bundle SessionStart hooks
     - Identify hooks whose entire job is "read a shared file and inject"
     - For each, replace SessionStart binding with cron registration that
       regenerates the source file on disk; agent reads on demand.
     - Estimated reduction: 32 hooks → 12-14 hooks; injection bloat ~70% down.

[P1] Fix stable-session-id.mjs resolver
     - Order: CLAUDE_SESSION_ID env > WT_SESSION env > parent-walk > path-derived UUID
     - Add unit tests for each resolution path

[P1] Fix or drop context-economy-v2.mjs from PreToolUse
     - If kept, fix the xmalloc OOM (likely an unbounded growing Set)
     - If dropped, replace its "wasted call" detection with an inline check
       in each tool wrapper (read/edit/write deduper already exists pattern)

[P2] Add handoff-staleness-check on SessionStart
     - Diff RESUME-named milestones against on-disk state
     - Mark superseded handoffs automatically

[P2] Per-lane SessionStart hook gating
     - Inject only context relevant to current lane (from active-claims.jsonl)
     - Reduces multi-chat amplification

[P3] HTML twin for each handoff (HC-X integration)
     - Auto-emit .html alongside .md on every handoff write
     - Phone-readable spec for stakeholders
```

## §8 — Closing note

The bug in §1 (1.79M → 1.92M across compact) is not a model bug. It is an **infrastructure bug in the hook injection layer compounded by an aggressive autocompact threshold override**. The fix is settings-level + hook-architecture-level, NOT model-level. The model cooperated correctly: it deferred, it wrote handoffs, it self-described the failure. The harness around it accumulated injection state faster than compaction could shed it.

The mitigation is mechanical and ships in one settings.json edit + a hook-bundling pass. Estimated wall-time: 2-4 hours of focused work in a single chat (this one, with a fresh restart, would be sufficient).

The Round-2 + Round-3 atomization work that this very session was "supposed to be doing" was already complete on disk when the session started — but the handoff RESUME pointed at it as pending, so the session burned its entire context window trying to do already-done work. That is **why §4 patches matter more than they look** — without staleness detection, every restart-cycle pays the cost again.

---

**Exhibit-B (positive control):** The 15 atomized files already on disk (`state/shared/specs/atomized/BACKEND-DEVTOOLS-RGS6-*-ATOMIZED-2026-05-10.md`) demonstrate the system works when the chat-window is not exhausted. The handoff/compact chain breaks specifically at the exhaustion boundary, not the work boundary.
