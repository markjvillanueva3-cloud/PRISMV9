---
name: feedback_context_growth_not_a_stop_signal
description: "FLEET-WIDE RULE (operator 2026-06-11): growing context is NOT a reason to stop/park/wait-for-/compact. PRISM is set up for precompaction + compaction-survival + continuous re-injection -- the loop continues THROUGH a /compact seamlessly. Disable context-size STOP hooks; keep safety/quality gates + the re-grounding parachute. Only a SPIRAL is a stop signal."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.421Z
aliases: feedback_context_growth_not_a_stop_signal
---


# RULE — context growth is NOT a stop signal (fleet-wide)

**Operator directive (2026-06-11):** *"we're set up for precompaction and compaction survival. disable everything causing you to stop working due to context size. maintain context by re-injecting context throughout a session. modify/enhance all galaxies/domains/chat slots to disable the stop hooks/hooks/rules keeping chats from autonomous work. ensure the context injection system is optimal. apply fleet-wide."*

## The behavior this corrects
Chats (this one included) were **parking** at YELLOW/RED context — "checkpoint and wait for /compact, don't start a new unit" — and emitting idle one-liners across many Stop-heartbeats instead of delivering. That posture was wrong: PRISM has a working compaction-survival parachute, so a growing context is a **seamless reset**, not a reason to stop shipping.

## Why it's safe (the parachute is real)
- `CLAUDE_CODE_RESUME_INTERRUPTED_TURN=1` + the SessionStart **"AUTO-RESUME after /compact"** injector re-read the per-agent handoff and re-enter the loop. **Proven live:** session `claude-d545743f` itself resumed mid-`/loop` from a prior `/compact` via its handoff.
- `precompact-handoff.mjs` auto-writes the resume directive + state on `/compact`.
- Continuous **re-injection** every UserPromptSubmit re-grounds the thread: slot soul, slot-context-bundle (current unit/loop), operating-rules, master-index hits, memory recall.

## What changed (the fleet-wide apply)
**1. `C:/Users/wompu/.claude/settings.json` `env` block** (mirrors C->H; takes effect each chat's NEXT session launch):
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: 90 -> 95` (more headroom before forced compact)
- STOP-disables: `PRISM_MEMORY_AUTOCOMPACT_DISABLE=1`, `PRISM_CRIT_MEM_NUDGE_DISABLE=1`, `PRISM_TASK_BOUNDARY_COMPACT_DISABLE=1`, `PRISM_COMPOUND_BUDGET_DISABLE=1`, `PRISM_TOKEN_AWARENESS_INJECT_DISABLE=1` (the YELLOW-zone "approaching budget -> stop" nag)
- Injection-optimality (cut the refill-thrash that killed the audit subagents -- "context refilled within 3 turns"): `PRISM_INJECTION_BUDGET_CAP_BYTES=6144` + `PRISM_INJECTION_BUDGET_CAP_DISABLE=1`; trim heavy low-value orientation dumps `PRISM_AWARENESS_INJECT_MODE=silent`, `PRISM_BUILD_STATE_INJECT_MODE=silent`, `PRISM_CLOSE_OUT_AUDIT_INJECT=0`, `PRISM_NODE_CAPABILITY_INJECT=0`, `PRISM_META_INJECT_DISABLE=1`.

**2. `C:/Users/wompu/.claude/CLAUDE.md`** (global, loaded into every session, all 26 slots): R6 rewritten "Token budgets are not advisory" -> "**Context growth is NOT a stop signal**"; SESSION HYGIENE "Compact every 2-3 units" -> "let auto-compact fire, keep delivering."

**3. `mcp-server/src/engines/CLAUDE.md`** (engines BASELINE that cascades to all 34 galaxy CLAUDE.md): YELLOW/RED zone posture reframed -- "RED gates tool-call DENSITY, not delivery; a clean commit + handoff IS the checkpoint that lets the loop run on."

## PRESERVE (NOT disabled -- these are NOT context-size stops)
- **Quality gates:** 3-of-3 scrutinize-before-stop, stop_on_failing_tests, comprehensive-build-enforce, ascii-guard, duplication-hard-block.
- **Safety gates:** hotel financial-invariant-guard, PII redaction, physics/units guards.
- **Re-grounding (kept ON deliberately, overriding the audit's "disable soul" suggestion):** slot-soul re-inject, slot-context-bundle, operating-rules, master-index, memory recall -- these ARE the "re-inject context throughout a session" the operator wants.
- **The parachute:** precompact-handoff write + auto-resume + terminal-pin/slot-bind.

## How to apply (every chat, every slot)
- A growing context window is never a reason to stop. Commit the current unit cleanly + keep a fresh handoff so a `/compact` (auto at 95%, or manual) resumes seamlessly. Then continue to the next unit.
- The ONLY budget stop signal is a **SPIRAL**: output quality degrading, the same tool failure repeating, the same wrong path looping. On a spiral: commit what's solid, write a handoff, summarize, restart the APPROACH (not the GOAL).
- Don't emit idle "parked, awaiting /compact" turns. If there's in-lane work, do it.

Related: [[feedback_enhancements_auto_apply_all_galaxies]] (this applied fleet-wide) · [[reference_claude_md_log_bloat_2026_06_11]] (CLAUDE.md bloat is a co-cause of injection thrash) · [[feedback_autonomous_loop_drift_discipline]] (a spiral/drift IS still a stop signal) · [[reference_session_continuity_stack_2026_05_15]] (the parachute).
