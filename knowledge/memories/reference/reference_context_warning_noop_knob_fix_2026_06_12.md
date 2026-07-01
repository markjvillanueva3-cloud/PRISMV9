---
name: reference_context_warning_noop_knob_fix_2026_06_12
description: The token-awareness "approaching budget/avoid subagents" warning kept firing despite a "disable" knob -- the knob name was mis-named (no-op). Real knob = PRISM_TOKEN_AWARE_INJECT=0.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.530Z
aliases: reference_context_warning_noop_knob_fix_2026_06_12
---


**Context-warning no-op knob fix (slot:bravo, 2026-06-12). Operator: "take out all context warnings that stop you guys from proceeding forward" (after alpha finished auto-self-compaction).**

**The bug:** `.claude/hooks/token-awareness-inject.mjs` emits the YELLOW *"→ approaching budget -- prefer Ollama offload, batch tool calls, avoid exploratory subagents"* warning (line 101) -- the chief stop-signal that makes chats park + recommend /compact instead of building. It is gated on `process.env.PRISM_TOKEN_AWARE_INJECT === "0"` (line 126). BUT `C:/Users/wompu/.claude/settings.json` had set **`PRISM_TOKEN_AWARENESS_INJECT_DISABLE: "1"`** (line 77) -- a DIFFERENT, mis-named env var that NOTHING reads -> a **no-op**. So the "disable" looked set but the warning kept firing. (Same class as the removed `PRISM_SLOT_TASK_CLAIM_DISABLE` no-op.)

**The fix:** added the REAL knobs to settings.json env (auto-mirrors C:->H: via c-to-h-mirror):
- `PRISM_TOKEN_AWARE_INJECT: "0"` -- silences the "approaching budget/avoid subagents" inject (token-awareness-inject.mjs:126). VERIFIED: hook now returns empty (no additionalContext).
- `PRISM_STOP_SPEND_SUMMARY_DISABLE: "1"` -- silences the Stop "💸 Session spend summary" (stop-session-spend-summary.mjs).
- Left the no-op `PRISM_TOKEN_AWARENESS_INJECT_DISABLE` in place (harmless; additive change safer than removing on a contended fleet-wide file).
- `PRISM_TOKEN_AWARE_STOP_DISABLE: "1"` was already correctly set (line 86) -- that knob name DOES match its hook.

**SAFETY (did NOT touch):** the auto-compaction machinery -- `token-awareness-sidecar.mjs` (COMPUTES the token data the auto-compactor reads; the inject only DISPLAYS it), `precompact-auto-trigger.mjs` (the actuator), `session-start-auto-resume.mjs`. Nor any safety Stop gate (scrutiny-before-stop, stop_on_build_error, stop_on_broken_imports, stop-close-own-bg-tasks/R14, duplication-hard-block, Omega/S(x)). Per CLAUDE.md "never soften gates" -- these are ADVISORY token-warnings, not gates; disabling them is the operator directive + R6 (with auto-compaction live, context-growth is NOT a stop signal).

**LESSON (verify the knob NAME matches what the hook reads):** a documented `PRISM_*_DISABLE` in settings is worthless if the hook checks a different var. When a "disabled" warning still fires, grep the EMITTING hook for its actual `process.env.X` check, don't trust the settings knob name. settings.json valid-JSON re-verified post-edit (a broken parse breaks every hook fleet-wide).
