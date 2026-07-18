# Recent shipments — whiskey 2026-05-24

Inbox file for golf to drain into `CLAUDE.md` `## Recent regressions` per CLAUDE.md doctrine (golf-slot is sole CLAUDE.md editor).

## JM-DIE-LATHE-UPGRADE-MS0 — 11 units shipped (slot:whiskey, single session)

**Headline:** V2 physics-driven upgrader + 3-stage audit pipeline + 4 gcSafetyAnalyzer fixes. Audit found **99.9% FAIL** on the V1 corpus and surfaced 4 distinct safety/correctness bugs the upgrader never noticed.

**Date:** 2026-05-24
**Tip commit:** `375c0c9ff7`
**Verify:** `git -C H:/prism log --oneline --grep=JM-DIE-LATHE-UPGRADE-MS0 -- since=2026-05-24`

## Units shipped

| # | Unit | Commit | What |
|---|---|---|---|
| 1 | `U-V2-PHYSICS` | `e66d99f2d0` | V2 upgrader routes per-machine S/F through canonical `ultimateSpeedFeedEngine.calculate()` — closes 5%-PRISM-stack-utilization gap from V1 hardcoded 180 SFM |
| 2 | `U-BATCH-V2-WIRE` | `70291ce926` | `PRISM_LATHE_UPGRADER_VERSION=v2` (default) env-switch in batch CLI |
| 3 | `U-V2-CRITIQUE-CLOSEOUT` | (this session) | Closes critique-dashboard 1 of 8 (PHYSICS-PROPER) |
| 4 | `U-OUTCOME-CAPTURE-DISABLE-KNOB` | (this session) | `PRISM_OUTCOME_CAPTURE_DISABLE=1` short-circuits recordOutcome — 52× regen throughput when peer-chats lock speed_feed.jsonl |
| 5 | `U-AUDIT-PIPELINE` | (this session) | `LatheProgramAuditPipelineEngine` — 3-stage gcSafetyAnalyzer + parseLatheProgram + screenCollisionsLathe + 31 tests + dispatcher wiring (`jm_die_lathe_audit` action) |
| 6 | `U-AUDIT-MACHINE-MAP-FIX` | (this session) | Audit runner LATHE_ENVELOPES keys aligned with canonical JM_DIE_LATHES — 2/7 → 7/7 machine coverage |
| 7 | `U-AUDIT-FINDINGS-BRIEF` | (this session) | Operator briefing + root-cause analysis for the 99.9% FAIL rate |
| 8 | `U-UPGRADE-BODY-RESCALE` | (this session) | Envelope-fit gate in V2: `computeMaxExtent()` + per-lathe skip-with-reason — V2 refuses to write physically-unsafe variants |
| 9 | `U-GCANALYZER-MODAL-F-TRACK` | (this session) | Address-parse regex accepts leading-dot decimals (`F.006`, `X-.040` Okuma OSP convention). Cuts Stage-A critical 2313→1172 (-49%) |
| 10 | `U-GCANALYZER-OKUMA-START-BLOCK` | (this session) | Okuma `SAFE_START_CODES` dropped from 5 Fanuc-mill codes to 1 lathe-correct G90. -5× HIGH-18 false-positives |
| 11 | `U-OKUMA-LATHE-G50-CHECK` | `375c0c9ff7` | New HIGH-19 — Okuma lathe missing G50 S<rpm> max-spindle-clamp. 10% of JM Die corpus missing G50 = previously-invisible catastrophic-spindle-overrun hazard surfaced |

## Operator action

- **Do not pull any current variant onto the shop floor** until V2 regen completes AND that variant passes audit (verdict = pass | pass_with_notes).
- New V2 variants generated after 2026-05-24 `375c0c9ff7` carry the envelope-fit gate — variants that don't physically fit a target machine are skipped at generation time + logged.
- Audit pipeline (`jm_die_lathe_audit` MCP action + `scripts/audit-jm-die-lathe-corpus.mjs`) is now standing safety net between any upgrader and the shop floor.

## Template for other domains

V2 + audit-pipeline is the **canonical pattern for `U-UPGRADE-MILL`, `U-UPGRADE-WEDM`, `U-UPGRADE-WELDER`**. Re-use steps 3-5 of V2 docblock (canonical ultimateSpeedFeedEngine call + result wrap + provenance) verbatim; only steps 1-2 (per-domain machine inventory + ISO-group map) change.
