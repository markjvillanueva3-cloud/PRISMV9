---
name: reference_zulu_fleet_survival_session_2026_06_18
description: "Zulu orchestrator session (10-chat fleet) lived through a real 5h session-limit collapse + rolling-window recovery. KEY INSIGHT: the rolling 5h window recovers ACCOUNT runway but NOT fleet POPULATION -- parked chats do NOT self-revive on headroom; only operator re-launch or the armed account-switch staggered-restart repopulates. Shipped the survival-cockpit tooling chain."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.282Z
aliases: reference_zulu_fleet_survival_session_2026_06_18
---


**ZULU FLEET ORCHESTRATION -- live 5h-limit collapse + recovery (slot:zulu, 2026-06-18).** Operator launched a 10-chat fleet (alpha bravo golf india oscar papa romeo sierra xray + zulu) and put zulu in orchestrator mode with a 30-min heartbeat cron (`235d2c0f`).

**What happened (observed live across ~6 heartbeat ticks):**
- The shared account's rolling 5h weighted climbed 80% -> 88% -> 93% of the observed ceiling (~140M p90). As it peaked, chats went stale/crashed one by one (pre-limit throttle degrades turns) until the fleet collapsed **10 -> 1** (only zulu, the actively-responding session, survived).
- Then the rolling 5h window cleared the peak: proximity fell 93% -> 82% -> 67% -> 57% -> 47% over the next ~2h as old consumption aged out. **Runway fully recovered.**

**THE KEY INSIGHT (R12, corrects an in-session over-pessimistic "fleet is dead" framing):**
**Rolling-window recovery restores ACCOUNT runway, NOT fleet POPULATION.** Even at 47% OK with ~7h runway, the fleet stayed at **live=1** -- the 9 blocked chats did NOT auto-resume. They PARKED (their /loop ended / sessions went idle), and parked chats do not self-revive just because headroom returned. Repopulation requires one of: (a) operator re-launches the chats (slot-tab-boot fleet launcher), or (b) the **armed account-switch staggered-restart** (the only AUTOMATED repopulation path). Zulu CANNOT SendKeys-revive them: no slot had `zuluOptIn=true` AND this host's WT tabs are not named `PRISM <slot>`, so `zulu-orchestrator-sweep.mjs` is a noop here.

**Survival tooling shipped this session (cad-fusion-live-ms0, [ZULU-ACCOUNT-CYCLE]):**
- `U-ACCT-PREFLIGHT-GATE` (70b6e89140) + `U-ACCT-PREFLIGHT-CLI-TEST` (4d81edc95a) -- read-only account-switch preflight (GO/NO-GO) + RED-gate on `arm --auto` (fail-closed; never blind-swap into a stale credential). See [[reference_account_switch_armable_2026_06_18]].
- `U-FLEET-SURVIVAL` (d6ac46fb66) + `U-FLEET-SURVIVAL-ETA` (f0ef93c490) -- `scripts/fleet-survival-status.mjs`: composes liveStatus + runPreflight + arm-state into one verdict "will the fleet survive the next 5h limit?" + a **time-to-limit** projection (etaMinutes/burnPerMin from computeStatus). During the collapse this read ~20min-to-limit; the static % alone never gave that.

**Operator action to make the fleet survive limits autonomously (still DRY-RUN/gated this session):** re-capture the CURRENT login (`node scripts/capture-claude-credentials.mjs account-N` overwrite -> preflight GREEN) then `node scripts/arm-account-switch.mjs --auto`. The 6 captured snapshots are stale (~4.8d, refresh tokens may have rotated) and the live account is UNIDENTIFIABLE (matches no snapshot), so the preflight RED-blocks until re-capture -- correct, do not bypass.

**Orchestrator doctrine reinforced:** on this host zulu's value is survival-infra + monitoring + its OWN build output, NOT SendKeys puppeteering (topology-blocked). Sibling: [[reference_5h_limit_tracker_2026_06_18]].
