# Session-Continuity Ultracode Assessment — 2026-06-10 (slot:alpha)

> Deliverable of the standing `/goal` requirement: *"use ultracode to assess if there are
> further improvements we can make to precompaction, compaction, session handoffs and
> automatic session continuation using /startup-natoname + /loop + /goal."*
>
> **How produced:** Workflow `wf_dd75db50-01e` (task `wcolmfl3v`) — 5 read-only finders
> (precompaction · compaction · handoffs · auto-continuation · /loop+/goal commands), each
> citing real `file:line`, → 1 synthesis lead. 6 agents, 1.63M subagent tokens, 56 tool-uses,
> 240s. Ran in separate agent contexts (zero main-loop budget).
>
> **Proof half (separate, already done + verified this session):** `U-AUTOSTART-LOOP-GOAL`
> (`be9182dca7`) live-fires `/startup-<slot> /loop [10m] /goal` on resume; non-stub slot-scoped
> handoffs confirmed; native auto-compact@90% + session-start chain proven. The Zulu SendKeys
> orchestrator is a confirmed dead-end for the tabbed fleet (WT-tab HWND wall).

## Governing constraint (R12 HONEST LIMIT)
A chat **cannot self-fire `/compact`** — the compaction finder confirmed `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=95`
is launch-only, and native auto-compact is the only un-keystroked actuator. Therefore the
"semantic task-boundary compaction trigger" can only be a **NUDGE at a Stop boundary**, never an
actuator. The whole backlog respects this.

## TOP 8 BACKLOG — highest ROI first

**[1] SEMANTIC TASK-BOUNDARY COMPACT NUDGE** (Stop-event; commit-since-last-handoff + token%)
- gap: no semantic "compact after a finished batch, before the next heavy build" trigger exists — only token-count pressure (`precompact-auto-trigger.mjs:4` SOFT/HARD) + blind turn-15 cadence (`auto-precompact-watchdog.mjs:39`), which can land mid-build. Fire a Stop nudge when `git log` shows a NEW `[SCOPE]/U-ID` commit since lastHandoffTurn (reuse `precompact-handoff.mjs:470` slot-grep) AND token% is non-trivial. | effort: M | scope: fleet
- R15: galaxy=fleet-hygiene ; consumers=Stop hook + precompact-auto-trigger token sidecar + precompact-handoff slot-grep ; auto-invoke=yes, at a clean Stop boundary right after a unit-close commit ; apply=all-galaxies
- **This IS the operator's requested trigger. Ranked #1; 3 of 5 finders independently surfaced it. Ships as a NUDGE ("you are at N% at a clean boundary — run /precompact then /compact"), NEVER an actuator.**

**[2] STABLE-ID <-> HARNESS-ID HANDOFF-KEY MISMATCH** (found live this session; finder CONFIRMED)
- gap: happy path reconciles (both derive `claude-<first8>`), but fallback branches mismatch: HS-01 "most-recently-touched cached session" (`stable-session-id.mjs:322-334`) can return a PEER's id, and `stop-force-loop-continue.mjs:118` tests a raw UUID `sid` against a `claude-<first8>` filename -> null -> loop-continue silently never injected. Fix: reader routes a `--terminal` miss to newestHandoffForSlot before family/global-latest; loop-continue reduces sid to `claude-<first8>` before `.includes`. | effort: S | scope: fleet
- R15: galaxy=fleet-hygiene/session-continuity ; consumers=per-agent-handoff cmdRead + stop-force-loop-continue + stable-session-id HS-01 ; auto-invoke=yes, on Stop (loop-continue) + SessionStart (resume read) ; apply=all-galaxies

**[3] STALE/COMPACT/RESUME PATHS DEAD-END TO BARE /checkin** instead of /startup /loop /goal
- gap: three idle-causing dead-ends, one shared fix. (a) stale handoff (`session-start-auto-resume.mjs:540-548,577-586`) emits bare `/checkin` (a heartbeat, not loop re-entry) so any slot past MAX_AGE_MIN idles; (b) compact/clear gates loop-goal on a resolvable slot (`:618-619`) and falls back to `buildCheckinDirective` (`:369`) carrying NO /loop /goal. Add the loop-goal tail to buildCheckinDirective + route stale handoffs to `/startup-<slot> /loop [10m] /goal` (standing goal is freshness-independent). | effort: S | scope: fleet
- R15: galaxy=session-continuity ; consumers=session-start-auto-resume buildCheckinDirective + stale/compact branches ; auto-invoke=yes, on SessionStart compact/clear/stale ; apply=all-galaxies

**[4] PERSIST MEMORY_SEED + PAD ON THE WATCHDOG / PRESERVED-LIVE-HANDOFF PATH**
- gap: MEMORY_SEED distill (`precompact-handoff.mjs:683`) + fixed pad (`:712`) only run in main()'s synthesis path; main() early-returns at `:591` when a live RESUME exists, and the watchdog fires fire-and-forget (`auto-precompact-watchdog.mjs:112-119`). So a watchdog-queued refresh of a live handoff carries NO seed and is unpadded — exactly the auto-compact-under-pressure case the seed matters most. Move seed+pad to also enrich a preserved live handoff. | effort: S | scope: fleet
- R15: galaxy=session-continuity ; consumers=precompact-handoff main() + auto-precompact-watchdog spawn path ; auto-invoke=yes, on every watchdog/precompact fire ; apply=all-galaxies

**[5] PRE-COMPACT HANDOFF COMPLETENESS GATE** — block on stub RESUME, not just marker-present
- gap: HARD block clears once the precompact-pending marker exists (`precompact-auto-trigger.mjs:17`) — proving /precompact RAN, not that it wrote a non-empty RESUME; the resume reader rejects bodies < MIN_RESUME_BODY_LEN=8 (`session-start-auto-resume.mjs:62,255`), so a stub handoff unblocks -> native compact -> post-compact resume silently no-ops. Also generateSmartResume can write boilerplate that passes the length<30 guard (`precompact-handoff.mjs:514-517,604`). Gate: verify the just-written RESUME has substantive parts (claim|loop|lastWork|position) before honoring the marker; else re-block. | effort: M | scope: fleet
- R15: galaxy=session-continuity ; consumers=precompact-auto-trigger marker check + generateSmartResume substantive-parts count ; auto-invoke=yes, before HARD-block clears + at resume synthesis ; apply=all-galaxies

**[6] --resume BOOT PATH IS FULLY PASSIVE** — no RESUME inject, no first-prompt loop re-entry
- gap: the common operator boot (`claude --resume <SessionId>`, `slot-tab-boot.ps1:435`) fires SessionStart source="resume", which `session-start-auto-resume.mjs` has no branch for (`:566` -> SILENCE), AND submits no first prompt (vs fresh path `:393/479`). So a resumed slot reopens its transcript and idles. Fix: add a `resume` branch + append the same `$plainPrompt` (gated on PRISM_BOOT_LOOP_GOAL). RIDER: appended prompt MUST be natural language, not a bare positional slash command (`slot-tab-boot.ps1:384-387` quirk). | effort: S | scope: fleet
- R15: galaxy=session-continuity ; consumers=session-start-auto-resume (new resume branch) + slot-tab-boot.ps1 Tier-1/1.5/2 invocation ; auto-invoke=yes, on every --resume boot ; apply=all-galaxies

**[7] ROLL-CAP / GOAL-CLEAR DEAD-END** — emit a re-entry directive instead of silent idle
- gap: `loop-state.cmdNext` caps auto-rolls at DEFAULT_MAX_ROLLS=8 (`loop-state.mjs:250`), marks the loop ended (`:275-282`), and the injector tells the chat to END (`loop-iteration-inject.mjs:90`) — so a long autonomous slot silently stops after 8 units (the header-promised paused-loop surfacer `loop-state.mjs:7` is unimplemented). Apply the `be9182dca7` pattern: cmdNext emits a `reentry` field carrying `/startup-<slot> /loop [10m] /goal` on roll-cap + a /checkin paused warning. | effort: M | scope: fleet
- R15: galaxy=session-continuity/agent-orchestration ; consumers=loop-state cmdNext + loop-iteration-inject + /checkin surfacer ; auto-invoke=yes, on roll-cap stop + next /checkin ; apply=all-galaxies
- **This is the sibling of the approved plan `C:/Users/wompu/.claude/plans/modular-inventing-backus.md` (goal-clear -> next-unit fallback).**

**[8] COMPLETED-vs-REMAINING LEDGER IN THE HANDOFF** (R10 done/verified/left)
- gap: the synthesized RESUME captures only in-progress signals (claim/loop-iter/last-commit, `precompact-handoff.mjs:402-470`) and says "CONTINUE YOUR CLAIMED MILESTONE" (`:403`) with no per-unit done/left record, so a post-compact chat can re-attempt an already-shipped unit. Add a `## COMPLETED_THIS_SESSION` block from this slot's `[SCOPE]/U-ID` commits since last handoff (data already fetched at `:470`). | effort: M | scope: fleet
- R15: galaxy=session-continuity ; consumers=precompact-handoff generateSmartResume + post-compact resume reader ; auto-invoke=yes, on every handoff write ; apply=all-galaxies

## Dedup / exclusions (R12 — stated, not ranked)
- **Zulu cross-chat /compact actuation** — real code but wall-blocked (WT-tab HWND occlusion); adjacent to the HONEST LIMIT. Folded into #1's nudge framing, NOT proposed as an actuator. The capability-probe surface is an S-effort follow-up below the 8 above.
- **Peer-commit false-match in "Last work"** — ALREADY FIXED (`be9182dca7`, slot-scoped grep `precompact-handoff.mjs:470`). No re-fix.
- **Per-slot adaptive SOFT threshold** + **multi-handoff condense-on-read** — valid M-effort but lower ROI than the 8 boundary/continuity fixes; defer.

## Build order (dependency-logical, R13)
S-effort continuity fixes first (each on proven ground): **[2] -> [3] -> [6] -> [4]**, then the
M-effort gated builds **[1] -> [5] -> [7] -> [8]**. [1] (the task-boundary nudge) is the operator's
headline; build it on top of the [2]/[3] handoff-reliability fixes so the nudge writes a handoff that
the resume can actually find.
