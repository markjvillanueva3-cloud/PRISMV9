---
name: reference_account_switch_armable_2026_06_18
description: "Auto account-switch (ZULU-ACCOUNT-CYCLE) is built + auto-running in DRY-RUN, one command from full autonomy. ROTATION_ORDER built (was the missing auto-swap blocker), 6 accounts ready, arm-account-switch.mjs added. Operator chose dry-run-first 2026-06-18; arm once the 5h ceiling is observed from the ledger."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.460Z
aliases: reference_account_switch_armable_2026_06_18
---


**Auto account-switch at 90-95% session limit -- STATE as of 2026-06-18 (slot:zulu).** Operator: "finish... so I don't have to worry about it... autonomous no matter what." Found the chain ~85% built; closed the real gaps; operator chose DRY-RUN-FIRST.

**Built + running (the machinery is complete):**
- `account-switch-restart-coordinator.mjs` -- detect (5h weighted) -> decide (`decideSwitch`) -> swap (`activateAccount`) -> staggered restart (`fleet-wake-sequencer.runSequencer`). Fail-loud on a missing 5h source.
- `account-switch-monitor.mjs` -- cron wrapper; `runCoordinator({autoSwap:true, apply})`, `apply=PRISM_ACCT_SWITCH_AUTO_APPLY==="1"`.
- Scheduled task **"PRISM Account Switch Monitor"** -- already installed (`.claude/helpers/install-account-switch-monitor-cron.ps1`), runs every 10 min, reaper-immune, logging to `state/shared/account-switch-monitor.jsonl`.
- **6 accounts captured** in `H:/.claude-accounts/` (account-1..6 = gmail-1-main, gmail-2, gmail-3, outlook-1..3), all with credentials.

**What this session closed:**
1. **`ROTATION_ORDER.json` was MISSING** -- `resolveSwapTarget` needs `order.length>=2`, so auto-swap returned `canAutoSwap:false` ("no-rotation-order"). Built it (`H:/.claude-accounts/ROTATION_ORDER.json` = account-1..6). Auto-swap now unblocked.
2. **`scripts/arm-account-switch.mjs`** (commit `9ba3989b08` on slot/zulu) -- one-command arm/disarm. Sets USER-scope env the next monitor tick reads. **Hard safety: NEVER arm blind** -- requires exactly one positive `--budget` XOR `--trigger` (13/13 tests). `--status` / `--disarm`.

**Operator chose DRY-RUN-FIRST (not yet armed).** UPDATE 2026-06-18: the "5h ceiling is **not locally derivable**" caveat is now DISPROVEN -- see [[reference_5h_limit_tracker_2026_06_18]]. Claude Code logs each session-limit cutoff as a `429` event in its own transcript JSONL; `five-hour-limit-tracker.mjs --calibrate` mines them into the OBSERVED ceiling (36 crossings: p25(arm)~72M, median~91M, p90~145M). The `rate_limits.five_hour` statusline field is still absent (that part of the keystone holds) -- the 429 transcript event is a different, present signal.

**TO ARM (one command, the ceiling is now self-calibrated):**
`node H:/prism/scripts/five-hour-limit-tracker.mjs --calibrate` then `node H:/prism/scripts/arm-account-switch.mjs --auto` (reads the observed-ceiling sidecar, arms at 92% of the p25 observed ceiling; refuses low-confidence/stale/schema-mismatch; `--disarm` to revert). Then the next 10-min tick actuates autonomously. (Manual override still works: `--budget <N>` / `--trigger <N>`.)

**ACCOUNT-SET PREFLIGHT GATE (U-ACCT-PREFLIGHT-GATE, commit `70b6e89140`, slot:zulu 2026-06-18).** The "ACTIVE marker unset / live matches no snapshot" caveat below is now an ENFORCED hard refusal, not just a note. New `scripts/account-switch-preflight.mjs` (read-only GO/NO-GO; 24/24 tests) grades the account set RED/YELLOW/GREEN: RED when the current live account is UNIDENTIFIABLE (live `claudeAiOauth.refreshToken` matches NO snapshot fingerprint -- empirically the live host state), <2 distinct rotation accounts, a rotation member missing a refresh token, no snapshot, or no next target. `arm-account-switch.mjs` now runs this gate on BOTH arming paths (--auto AND manual --budget/--trigger) before setting any env: refuses on RED, FAIL-CLOSED if the preflight can't run, `--accept-unsafe-accounts` overrides (32/32 tests). SECURITY: fingerprints are sha256, INTERNAL only -- no token value or fp ever in any output. LIVE-VALIDATED: `--auto` REFUSED (exit 1, surfaced UNIDENTIFIABLE), set NO env, --status stayed DRY-RUN. So a blind first swap that could overwrite the working login with a stale snapshot is now structurally impossible. To actually arm: first re-capture the CURRENT account (`node scripts/capture-claude-credentials.mjs <account-N>` overwrite) so the preflight goes GREEN, THEN `arm --auto`. Open follow-up: U-ACCT-PREFLIGHT-CLI-TEST (regression-lock the CLI wiring seam -- arm B 3-of-3 P2).

**Open caveats (R12):**
- **ACTIVE marker unset** -- the live `~/.claude/.credentials.json` matches NO captured snapshot (OAuth refresh-token drift; the account may still be one of the 6, just re-tokened). Rotation would start at account-1 -- but the preflight gate above now BLOCKS arming until the operator re-captures the current account (GREEN). Captured snapshots rely on their refresh tokens still being valid when swapped in (the gate's YELLOW warns on >7d-stale captures).
- Arming autonomously swaps credentials + staggered-restarts all 26 chats -- high blast radius; that's why the operator gated it behind explicit calibration AND why the preflight RED-gate now stands in front of every arm.

Sibling: [[reference_5h_keystone_2026_06_11]] (the denominator-free 5h trigger keystone). Hermes app control bridge (same session): commit `5c669993ac` slot/zulu, `/hermes-control`.
