---
name: reference_midturn_reanchor_capture_2026_06_12
description: "Mid-TURN goal re-anchor shipped (session-reorient-capture revived: HS-01 sid fix + PostToolUse wiring + every-75-tool-calls standing-goal injection) + cold-anchor re-fires post-compact/clear + last context-warner doctrine fork fixed. Completes the 2026-06-11 zulu mid-session directive (slot:delta, 2026-06-12)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.655Z
aliases: reference_midturn_reanchor_capture_2026_06_12
---


# Mid-turn re-anchor + capture revival (slot:delta, 2026-06-12)

Operator re-issued: "improve prism awareness and context injection mid session (1M-context-extension ideas) + ensure all context-tight warners are disabled." Zulu's 2026-06-11 pass (commit `6ca11a2146`, [[reference_midsession_goal_reanchor_2026_06_11]]) revived the PROMPT-boundary re-anchor; this unit closes the three gaps it left:

## 1. session-reorient-capture.mjs revived + WIRED (was dormant on disk)
- **Root causes**: read `CLAUDE_SESSION_ID` (always unset -> wrote `reorientation-default.json` while inject reads per-chat files — HS-01 class) AND had 0 settings.json refs (never fired).
- **Fixed**: sid chain stdin -> `CLAUDE_CODE_SESSION_ID` -> legacy, each candidate sanitized to `[A-Za-z0-9-]` (path-traversal proof) with fall-through parity cloned into inject's `resolveSessionId` (now also env-before-subprocess — kills a 1.5s-timeout spawn per prompt). Atomic tmp+rename writes BOTH hooks (anti torn-JSON clobber); exists-but-unreadable state -> pass-through, never overwritten (a3e6d3ca97 lesson). Harness field is `tool_response` (not `tool_result`) — build-green anchors were permanently dead.
- **WIRED**: `C:/Users/wompu/.claude/settings.json` PostToolUse matcher "" (mirrored to H:). Anchors (decisions/milestones/build-green) + tool-call counting now live for ALL 26 slots / 34 galaxies.

## 2. NEW: mid-TURN re-anchor (the 1M-context gap)
Long agentic turns (one prompt, hundreds of tool calls — /loop + Hermes pattern) never cross a UserPromptSubmit boundary, so NO injector could re-anchor them. Capture now emits the STANDING GOAL (handoff `## RESUME`, same source as inject) as PostToolUse `additionalContext` every `PRISM_REORIENT_MIDTURN_TOOLCALLS` (default 75, 0 disables) tool calls, via a capture-LOCAL counter (`toolCallsSinceMidTurnAnchor`) — it increments but NEVER resets inject's shared `toolCallsSinceLastBrief` (scrutiny P1: resetting starved inject's anchor-only briefs). Framed explicitly "NOT a context warning". Lazy handoff read only at threshold crossings.

## 3. CAG cold-anchor re-fires post-compact + post-clear
`cag-cold-cache-anchor.mjs` was startup-matcher-only; added to SessionStart `compact` + `clear` matchers — the prompt-cache anchor sources are re-stated exactly when the cache is rebuilt.

## 4. Context-warner sweep CLOSED (re-verified 2026-06-12)
All knob wirings verified against actual hook knob names: `PRISM_TOKEN_BUDGET_WARN_DISABLE`, `PRISM_TOKEN_AWARE_STOP_DISABLE`, `PRISM_TOKEN_AWARENESS_INJECT_DISABLE`, `PRISM_TASK_BOUNDARY_COMPACT_DISABLE` (also disables `compact-interval-warning.mjs`), `PRISM_CRIT_MEM_NUDGE_DISABLE`, `PRISM_MEMORY_AUTOCOMPACT_DISABLE`, `PRISM_COMPOUND_BUDGET_DISABLE` — all =1 in env. `stop-force-loop-continue`'s ceiling check RELEASES for compaction (parachute, kept). `commit-pressure-stop-gate` is RAM-OOM safety, kept. **The last warner was DOCTRINE**: `H:/prism/.claude/CLAUDE.md` still carried old R6 ("budgets -> summarize and start fresh") + "Compact every 2-3 units" — fixed to match the C: global (context growth is NOT a stop signal).

Tests: 19 capture (parity, anti-clobber wiring E2E byte-identical-torn-file, counter coordination incl. inject-reset survival, adversarial traversal/garbage-stdin) + 11 inject = 30/30 `node --test`. Per-file 2-arm scrutiny on hook + tests (P1s fixed: tool_response field, shared-counter starvation, split-brain HOOK path, one-sided sanitization).

Fleet-wide (all galaxies); knobs: `PRISM_REORIENT_MIDTURN_TOOLCALLS`, `PRISM_REORIENT_CAPTURE_DISABLE`, `PRISM_SESSION_REORIENT_DISABLE` (shared). Related: [[feedback_context_growth_not_a_stop_signal]] · [[reference_session_continuity_stack_2026_05_15]] · [[reference_hs01_env_anchor_fleetwide_2026_06_10]].
