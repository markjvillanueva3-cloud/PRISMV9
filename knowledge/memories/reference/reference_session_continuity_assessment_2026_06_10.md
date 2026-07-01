---
name: reference_session_continuity_assessment_2026_06_10
description: "Ultracode assessment (slot:alpha, 2026-06-10) of PRISM precompaction/compaction/handoffs/auto-continuation + /loop+/goal -- 8-item ranked fleet-wide backlog. Workflow wf_dd75db50-01e: 5 file-cited finders -> 1 synth. Full spec: state/shared/specs/SESSION-CONTINUITY-ULTRACODE-ASSESSMENT-2026-06-10.md. HONEST LIMIT CONFIRMED: a chat cannot self-fire /compact (CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=95 launch-only) -> the semantic task-boundary trigger (#1) must be a Stop-NUDGE, never an actuator. #2 = stable-id vs harness-id handoff-key mismatch (found live, finder-confirmed)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.159Z
aliases: reference_session_continuity_assessment_2026_06_10
---


# Session-Continuity Ultracode Assessment (slot:alpha, 2026-06-10)

Deliverable of the standing /goal's assessment clause. Produced by Workflow
`wf_dd75db50-01e` (task `wcolmfl3v`): 5 read-only finders each citing real
`file:line` -> 1 synthesis lead. 6 agents, 1.63M subagent tokens, 240s, separate
contexts (zero main-loop budget). Full backlog with R15 determinations per item:
`state/shared/specs/SESSION-CONTINUITY-ULTRACODE-ASSESSMENT-2026-06-10.md`.

## Governing constraint (R12)
A chat CANNOT self-fire /compact. The compaction finder confirmed
`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=95` is launch-only; native auto-compact is the only
un-keystroked actuator. So the requested "semantic task-boundary compaction trigger"
can only be a Stop-NUDGE ("you are at N% at a clean boundary -- /precompact then
/compact"), never an actuator. The Zulu SendKeys path stays wall-blocked (WT-tab HWND).

## Ranked backlog (all fleet-wide, all R15-tagged)
1. **Semantic task-boundary compact NUDGE** (M) -- operator's headline, 3/5 finders surfaced
   it independently. Fire on new `[SCOPE]/U-ID` commit since last handoff + non-trivial
   token%. NUDGE not actuator. galaxy=fleet-hygiene.
2. **stable-id <-> harness-id handoff-key mismatch** (S) -- found live this session, finder
   CONFIRMED: fallback branches key a handoff under an id the resume's
   findHandoff(sid).includes() can't match -> silent checkpoint loss.
   `stable-session-id.mjs:322-334` + `stop-force-loop-continue.mjs:118`.
3. **Stale/compact/resume dead-end to bare /checkin** (S) -- emits a heartbeat not
   `/startup /loop /goal` re-entry; slot idles. `session-start-auto-resume.mjs:540-548,618`.
4. **MEMORY_SEED+pad lost on watchdog/preserved-handoff path** (S) -- the under-pressure
   auto-compact case gets an unseeded handoff. `precompact-handoff.mjs:683,712,591`.
5. **Pre-compact completeness gate** (M) -- HARD-block clears on marker-present not
   non-empty RESUME -> stub handoff unblocks -> resume no-ops. `precompact-auto-trigger.mjs:17`.
6. **--resume boot path fully passive** (S) -- `source="resume"` has no hook branch + no
   first prompt -> resumed slot idles. `session-start-auto-resume.mjs:566` + `slot-tab-boot.ps1:435`.
7. **Roll-cap/goal-clear dead-end** (M) -- loop silently ends after DEFAULT_MAX_ROLLS=8,
   no re-arm. `loop-state.mjs:250,275-282`. Sibling of approved plan modular-inventing-backus.md.
8. **Completed-vs-remaining ledger in handoff** (M) -- RESUME has no done/left record ->
   post-compact chat re-attempts a shipped unit. `precompact-handoff.mjs:402-470`.

Excluded (R12): Zulu cross-chat actuation (wall-blocked, folded into #1); peer-commit
false-match (already fixed `be9182dca7`); per-slot adaptive threshold + condense-on-read (deferred).

## Build order (R13, dependency-logical)
S-fixes on proven ground first: [2] -> [3] -> [6] -> [4]; then M-effort: [1] -> [5] -> [7] -> [8].
Build #1 ON TOP of [2]/[3] so the nudge writes a handoff the resume can actually find.

See [[reference_session_continuity_agentic_2026_06_10]] (the 6 units already shipped) ·
[[reference_zulu_selfcompaction_test_2026_06_10]] (WT-tab HWND wall + native-path proof).
