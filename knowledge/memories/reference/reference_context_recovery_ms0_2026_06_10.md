---
name: reference_context_recovery_ms0_2026_06_10
description: CONTEXT-RECOVERY-MS0 — per-slot today-context recovery from compaction summaries + the auto-resume-is-silent-on-source=resume finding (scrutiny caught a dead wiring path)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.530Z
aliases: reference_context_recovery_ms0_2026_06_10
---


# CONTEXT-RECOVERY-MS0 (slot:tango, 2026-06-10)

Operator asked to "inject context from all sessions for each chat slot into each current chat slot ... they've all compacted multiple times but lost context on some tasks ... just sessions from today." Delivery chosen: **handoff + relaunch**.

## What shipped (commits U-CR01 + U-CR02 on cad-fusion-live-ms0)
- **`scripts/recover-today-context.mjs`** — streams each active slot's today-JSONL (158MB in ~0.8s, never loaded to memory) and harvests VERBATIM (no LLM → no hallucination, R12): the `isCompactSummary:true` user-records (the roll-ups the live window dropped, most-recent 6, head+tail elided to keep both Primary-Request and Pending-Tasks/Next-Step) + operator directives + today's commits + last todo state → `state/shared/context-recovery/<slot>-TODAY-<date>.md`. Skips 0-compaction slots (nothing lost) + cleans their stale files. Recovery files gitignored (same class as handoffs).
- **`session-start-auto-resume.mjs`** — `getRecoveryPointer(slot)` + a `source=resume` branch (was a silent no-op) + startup-path append. Date-stamped → self-expires next day. Fail-soft.
- Live: 11 of 13 active slots had real loss (alpha compacted **15×**, sierra 10, india/papa 8, oscar 7); charlie/tango 0 → no file.

## THE KEY FINDING (reusable)
`session-start-auto-resume.mjs` injects the handoff/recovery **only on `source=startup` (and compact/clear)** — it returns `{continue:true,suppressOutput:true}` on **`source=resume`**. The fleet launcher (`slot-tab-boot.ps1`) reopens active slots with `claude --resume` → **`source=resume`**. So SessionStart handoff/recovery injection does NOT reach resumed chats unless a `matcher:"resume"` SessionStart arm carries the hook in settings.json. Each SessionStart matcher = the `source` string (startup|resume|clear|compact); the empty `matcher:""` arm did NOT carry auto-resume.

## THE LESSON (why 3-of-3 scrutiny mattered)
U-CR01 was "tested green" by piping synthetic `{"source":"resume"}` stdin straight to the hook — which proves the BRANCH runs but NOT that Claude Code DISPATCHES the hook on a real resume. The `resume` matcher arm was never wired → the headline fix was **dead in production** (R15-WIRE gap). Scrutiny reviewer B caught it; reviewer C caught an unvalidated `--slot` argv (path-traversal write/unlink + RegExp crash). Both fixed in U-CR02 + a 5/5 test incl. a standing settings-resume-arm wiring assertion (guards the [[feedback_settings_wiring_drift_2026_05_16]] hazard). **Takeaway: a hook test via synthetic stdin does not verify the settings.json matcher wiring — assert the wiring separately.**

## To re-run
`node scripts/recover-today-context.mjs --all` (regenerates today's recovery files), then relaunch the fleet. Sibling generic extractor: `scripts/lib/transcript-digest.mjs` (delta, [[reference_delta_transcript_context_reconstruction_2026_06_09]]).
