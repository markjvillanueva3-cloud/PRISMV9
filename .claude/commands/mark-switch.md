---
name: mark-switch
description: Stamp an account-switch boundary so 5h session-limit tracking resets to the new account (true real-time per-account tracking)
composes_with:
  - "/startup"
---
# /mark-switch — reset 5h session-limit tracking to the current account

Run this **right after you switch Claude accounts** (logging into a different account to get a fresh
5h budget). It stamps an account-switch boundary so the 5h session-limit tracker floors its rolling
window at the switch instant — the new account's budget then tracks from 0 instead of inheriting the
old account's ~100% usage.

**Why it exists (U-5H-ACCOUNT-BOUNDARY):** the tracker sums transcript tokens over the last 5h with no
account boundary, so after a manual switch it kept counting the *old* account's tokens and the
"5h SESSION LIMIT" banner falsely read ~100% / ~0 min. This stamps the boundary; the banner
(`fleet-survival-advisory`) and the auto-switch decision (`account-switch-restart-coordinator`) both
read through it. (Auto-switches via `arm-account-switch` self-stamp via the coordinator ledger — you
only need this for a *manual* switch. There is no safe credentials-based auto-detect: OAuth tokens
rotate on refresh, so a hash-based detector would false-reset — explicit marking is the correct path.)

## Args: $ARGUMENTS
- Empty: stamp the boundary at now (no account label).
- `<label>`: stamp with an account label for the ledger (e.g. `/mark-switch account-2`).

## Steps

1. Stamp the boundary (use `$ARGUMENTS` as `--account` when non-empty):
   ```bash
   node H:/prism/scripts/five-hour-limit-tracker.mjs --mark-switch ${ARGUMENTS:+--account "$ARGUMENTS"}
   ```
2. Confirm the reset — show the live status (expect `windowFlooredToSwitch true` and a LOW `% used`):
   ```bash
   node H:/prism/scripts/five-hour-limit-tracker.mjs --status
   ```
3. Report to the operator: the boundary timestamp + the new `% used` / `zone` (the banner now reflects
   the current account). If `% used` is still high, the boundary did not take — re-check the marker at
   `state/shared/account-switch-boundary.json`.
