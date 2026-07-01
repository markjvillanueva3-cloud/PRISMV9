---
name: reference_5h_limit_tracker_2026_06_18
description: "The 5h ceiling IS locally derivable -- Claude Code logs each session-limit cutoff as a 429 event in its own transcript JSONL. five-hour-limit-tracker.mjs mines them into the OBSERVED ceiling (replaces the guessed 88M). This disproves the keystone's 'not locally derivable' premise. arm --auto consumes it. slot:zulu."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.458Z
aliases: reference_5h_limit_tracker_2026_06_18
---


**5h-limit tracker (U-5H-LIMIT-TRACKER + -HARDEN, slot:zulu 2026-06-18).** Answers the operator's "is there something we can build to track the 5h limit?" YES -- and it disproves the standing premise (`five-hour-token-sum.mjs` / `populate-5h-quota.mjs` / [[reference_5h_keystone_2026_06_11]] all said "the 5h ceiling is not locally derivable" + fell back to a GUESSED 88M).

**THE DISCOVERY (verified across 2 live transcripts):** Claude Code records each 5h-limit cutoff in its own transcript JSONL as:
`{type:"assistant", timestamp, error:"rate_limit", isApiErrorMessage:true, apiErrorStatus:429, message:{content:[{type:"text", text:"You've hit your session limit  resets 3:10pm (America/Chicago)"}]}}`. Note the field is **`error:"rate_limit"`** (NOT `type:"rate_limit"` -- `type` is `"assistant"`). The reset clock is even in the text.

**TWO KINDS OF 429 -- must NOT conflate (both shapes verified):**
- SESSION-LIMIT ("hit your session limit  resets X") = the real 5h ceiling. The only kind calibrated from.
- SERVER-THROTTLE ("Server is temporarily limiting requests (not your usage limit)") = Anthropic backpressure, EXCLUDED.

**Tool: `node scripts/five-hour-limit-tracker.mjs`** (commit 2ebc822cfc + hardening):
- `--calibrate [--since-days N] [--pct P] [--no-write]` -- mines all transcripts (streaming readline, memory-safe), computes the rolling-5h WEIGHTED sum (input+output+1.25*cacheCreation+0.1*cacheRead, identical to five-hour-token-sum) over a BOTH-ENDS `[T-5h,T]` window at each crossing = observed ceiling. Writes `state/shared/five-hour-ceiling-observed.json` (schemaVersion 1.0.0).
- `--status` -- live: current weighted vs the REALISTIC hard ceiling (p90), arm trigger reported separately (R7 split -- proximity != arm-trigger; do NOT use the conservative p25 as the status denominator or it falsely reads >100%).

**LIVE NUMBERS (36 crossings, 2026-05-15..06-17, all full-coverage):** distribution min=12M, **p25(arm)~72M, median~91M, p90(hard)~145M**, max=176M. Median ~91M cross-validates the documented ~88-102M -> the discovery is real. The low outliers (12M/28M/38M) are the SEPARATE weekly/sub limit, NOT the 5h ceiling -- so:
- **arm basis = p25** (robust lower estimate; rejects the weekly-limit artifacts; conservative = never blocked). NOT min (min would thrash accounts at ~11M).
- **status basis = p90** (realistic near-blocking level).
- `<4` crossings -> falls back to raw min + `lowConfidence:true`.

**Wiring -- `arm-account-switch.mjs --auto`** (the one-command arm): reads the observed-ceiling sidecar, refuses (R12 fail-loud) on no-ceiling / low-confidence (<4 crossings, unless `--accept-low-confidence`) / stale (>14d, unless `--accept-stale`) / incompatible schemaVersion, else arms `PRISM_5H_WEIGHTED_BUDGET=observedCeiling` at pct. Chain: tracker sidecar -> arm --auto -> PRISM_5H_WEIGHTED_BUDGET -> populate-five-hour-sidecar pct -> five-hour-switch-gate -> coordinator (AUTO_APPLY-gated).

**STILL DRY-RUN (operator gated).** To arm autonomously: `node scripts/five-hour-limit-tracker.mjs --calibrate` then `node scripts/arm-account-switch.mjs --auto`. 38 tracker + 24 arm tests; per-file 2-arm + 3-of-3 PASS. Hardening (arm-C P2s): 0-events marker-drift warn (catches a Claude-Code marker change like isCompactSummary->compact_boundary) + sidecar schemaVersion gate.

Supersedes the "not locally derivable" caveat in [[reference_account_switch_armable_2026_06_18]] + [[reference_5h_keystone_2026_06_11]] (their `rate_limits.five_hour` statusline-field absence is still true; the 429 transcript event is a DIFFERENT, present signal).
