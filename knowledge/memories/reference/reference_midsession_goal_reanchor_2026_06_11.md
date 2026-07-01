---
name: midsession-goal-reanchor-2026-06-11
description: "session-reorient-inject.mjs was DEAD in production (early-returned with no brief whenever state.anchors was empty -- every live session, since the anchor-capture pipeline is dormant: 0/2 live state files had anchors). Revived to re-anchor mid-session to the per-chat HANDOFF resume directive (reliable source). Also closed the last context-tightness nag (token-budget-gate warn knob). Commit 6ca11a2146 (slot:zulu)."
type: reference
galaxy: agent-orchestration
source: prism-memory
synced: 2026-06-27T20:30:46.655Z
aliases: reference_midsession_goal_reanchor_2026_06_11
---


**Mid-session goal re-anchor + context-warning audit (slot:zulu, 2026-06-11, commit `6ca11a2146`).** Operator directive: "improve prism awareness and context injection mid session (1M-context-extension article) + disable all gates that warn when context is tight (precompact + session-handoff already solve self-compaction)."

## Finding (bug — silent dead code)
`.claude/hooks/session-reorient-inject.mjs` (the mid-session reorientation brief, the fleet's 1M-context drift-refresh mechanism) **emitted nothing in production**: `main()` early-returned `{continue:true}` whenever `state.anchors` was empty (`if (!state || !state.anchors || state.anchors.length === 0)`). The anchor-capture pipeline (`session-reorient-capture`) is dormant for live sessions — VERIFIED: 0 of 2 live `state/session-reorientation/*.json` files had any anchors. So the "refresh attention every 15 prompts" feature never fired. The TOP injection consumer (~2KB/brief per a prior audit) was contributing zero awareness value.

## Fix (revival via a reliable source)
Re-anchor to the per-chat **HANDOFF resume directive** instead of the dormant anchors — it is reliably written by `precompact-handoff.mjs` + `/handoff` and is exactly what auto-resume trusts on `/compact`. New pure helpers: `extractResume(txt)` (line-scan of the `## RESUME` section, stops at next `## ` header, multi-line safe, matches bare + decorated `## RESUME DIRECTIVE` via `\b` but not `RESUMED`, 600-char cap) + `readStandingGoal(sid, dir=HANDOFF_DIR)` (newest `HANDOFF-<sid>-*.md` by mtime, fail-soft → null). `buildBrief` prepends a STANDING GOAL section ABOVE the inferred objective (anti-lost-in-the-middle). **Hot-path discipline:** the handoff disk read is LAZY — only when a brief actually fires (every promptInterval=15), never per-prompt. `main()` CLI-guarded + 4 helpers exported. 11/11 intent-tests; VALIDATED on the live handoff (604-char real goal extracted). Per-file scrutiny: 2 reviewers PASS, 0 P0/P1; 2 P2s fixed.

## Context-warning audit (Part 2)
Most context-window nags were ALREADY off: 8 knobs (`PRISM_CRIT_MEM_NUDGE_DISABLE`, `PRISM_TASK_BOUNDARY_COMPACT_DISABLE`, `PRISM_TOKEN_AWARE_STOP_DISABLE`, `PRISM_TOKEN_AWARENESS_INJECT_DISABLE`, `PRISM_MEMORY_AUTOCOMPACT_DISABLE`, ...) + `enforce-auto-compact.py` ("Run /compact NOW") is UNWIRED (0 refs). Closed the last one: `token-budget-gate.mjs`'s lone RED+heavy advisory now gated by `PRISM_TOKEN_BUDGET_WARN_DISABLE=1` (telemetry stays always-on; the gate never blocked). KEPT `commit-pressure-stop-gate` (system-RAM-OOM crash safety, NOT context-window pressure — precompaction does not solve RAM-OOM; R7 surface-the-distinction). `precompact-auto-trigger` (the actuator that actually performs self-compaction) untouched — it is the mechanism the operator relies on.

## Lesson
A mid-session awareness/injection hook is only as good as its INPUT pipeline. When the brief looked sophisticated but its anchor feed was dormant, the whole feature was silently dead. Source mid-session re-anchoring from the RELIABLE substrate (handoff), not the aspirational one (anchors). [[feedback_read_full_content_not_titles]] applies: "the hook exists" != "the hook fires."

Related: [[reference_session_continuity_stack_2026_05_15]], [[reference_injection_surface_token_audit_2026_06_10]], [[feedback_context_growth_not_a_stop_signal]].
