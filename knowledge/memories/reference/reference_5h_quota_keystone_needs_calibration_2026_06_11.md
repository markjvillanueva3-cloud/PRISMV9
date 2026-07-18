---
name: 5h-quota-keystone-needs-calibration-2026-06-11
description: "The 5h-quota populator keystone is BUILT but UNCOMMITTED + NOT-ACTIVATABLE -- it over-counts cacheRead + has an uncalibrated ceiling, so pct clamps to 1.0 (would false-trigger account-switch). DO NOT activate without calibration."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.458Z
aliases: reference_5h_quota_keystone_needs_calibration_2026_06_11
---


**5h-quota populator keystone (slot:zulu overnight 2026-06-11, bg agent ad11577dedb0bc94e). BUILT but DO NOT COMMIT/ACTIVATE as-is -- it would destabilize the fleet.**

## What was built (UNCOMMITTED on the shared tree)
- `scripts/populate-5h-quota.mjs` (14 exports, pure-core + injectable I/O, atomic sidecar write).
- `scripts/lib/__tests__/populate-5h-quota.test.mjs` (55/55 pass).
- Purpose: populate `quota.fiveHour.pct` in the token-awareness sidecars (Claude Code does not emit `rate_limits.five_hour` on this host) so `account-switch-restart-coordinator` stops throwing `FIVE_HOUR_SOURCE_UNAVAILABLE`.

## THE BUG (R12 -- why it must NOT be activated yet)
1. **Over-counts cacheRead.** The rolling-5h sum = 2.2B tokens, of which **2.08B is cacheRead** (cache reads are NOT metered like real 5h usage). The real 5h figure is ~input(5M)+output(12.8M)+cacheCreate(99.9M) ~ 118M, or input+output ~ 18M. Including cacheRead inflates ~25x. FIX: exclude (or heavily discount) cacheRead from the 5h sum.
2. **Uncalibrated ceiling.** `DEFAULT_FIVE_HOUR_CEILING = 88_000_000` is below even the corrected figure; against the 2.2B raw sum `pct` clamps to **1.0**. FIX: set the ceiling to the account's REAL Claude 5h token limit (verify the actual limit; make it env-overridable).
3. **Net effect:** `pct:1.0` >= the coordinator's 0.90 threshold -> would trigger an immediate account-switch + Hermes restart loop if the coordinator were active.

## Why it is SAFE tonight (inert)
The `account-switch-restart-coordinator` is NOT a registered scheduled task and is NOT wired in any settings.json (verified 2026-06-11) -- so the live `pct:1` written to 27 sidecars is INERT (display-only, "5h=100%"); nothing acts on it. cron_mode is still `deny`; activation needs an operator Hermes-restart anyway. The mis-value will be overwritten by the normal token-awareness writer (which writes null, since it cannot compute 5h).

## NEXT (before commit/activate)
(a) exclude cacheRead; (b) find + set the real 5h ceiling; (c) re-validate the live pct is sane (not 1.0); (d) THEN commit + (operator) register the cron + flip cron_mode + restart Hermes. Until (a)-(c), leave UNCOMMITTED. Keystone in the bravo ledger; [[reference_zulu_domain_status_2026_06_11]].

## SUPERSEDED 2026-06-11 by bravo's proper keystone
Bravo shipped the CORRECT keystone (commit a5b65b8711, per hermes-zulu/CLAUDE.md): `scripts/lib/five-hour-token-sum.mjs` + `scripts/populate-five-hour-sidecar.mjs` (+ switch-gate) -- a REAL rolling-5h token sum -> sidecar -> **DENOMINATOR-FREE** account-switch gate (no uncalibrated ceiling), 105 tests + live E2E, INERT by default. This fixes exactly the cacheRead-overcount + uncalibrated-ceiling defects flagged above. My `scripts/populate-5h-quota.mjs` (the broken version) is OBSOLETE -- it is no longer in the working tree (lost to shared-tree thrash; it was broken + uncommitted anyway). DO NOT revive it; use bravo's `five-hour-token-sum.mjs`. The do-not-activate warning above was CORRECT (the broken version would have false-triggered an account-switch). Activation remains operator-gated (Hermes restart + cron flip). Verified 2 of 3 files exist 2026-06-11; wiki `five-hour-token-keystone.md`, memory [[reference_5h_keystone_2026_06_11]].
