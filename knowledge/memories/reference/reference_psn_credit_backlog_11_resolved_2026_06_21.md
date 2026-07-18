---
name: reference_psn_credit_backlog_11_resolved_2026_06_21
description: RESOLVES HIGH-ROI backlog
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.125Z
aliases: reference_psn_credit_backlog_11_resolved_2026_06_21
---


# PSN savings credit backlog #11 -- RESOLVED with verified per-substrate verdict (2026-06-21, slot:alpha)

Closes [[reference_psn_aggregate_schema_mismatch_2026_06_12]] (HIGH-ROI-INEFFICIENCY-HUNT finding #11: "the PSN savings headline under-reports because several substrates show savedTokens:0 despite real activity, masking ~10k+ savings"). Verify-first per-substrate settled it:

**The REAL under-reporting (both FIXED this session):**
- **Windowing** -- `tailRead`'s 500K cap truncated large ledgers -> ~42K of GENUINE rtk savings masked. Fixed `54f0b2d7a8`->`e013cef6b9` (64MB ceiling + clean boundary). [[reference_psn_aggregate_tailread_fix_2026_06_21]]
- **prompt-rewrites shape** -- object rewrites miscounted as misses -> 349 real rewrites looked dead. Fixed `6b78070b28` (count hit, 0 savings -- augmentation). [[reference_psn_rewrite_shape_fix_2026_06_21]]

**The 3 "credit-gap" substrates are NOT gaps -- 0 is CORRECT (no code change):**
- **rtk-adoption-measure** (1.9MB, 11,193 entries) -- a CALIBRATION ledger, NOT a savings source. Producer `posttool-rtk-adoption-measure.mjs:10` ("Calibration data feeds back into RTK_SAVINGS_FRACTION recalibration"): `est_tokens = NOMINAL_VERBOSE_TOKENS * fraction` (projected saving), `observed_tokens = observed_bytes/4` (the rtk-filtered command's OUTPUT size). The actual rtk savings are ALREADY credited in rtk-savings-ledger (467K). The 06-12 note's tentative `max(0, est-observed)` credit = **5,458,742 tokens (10x the real 467K)** -- a massive over-credit + double-count of output-size-as-saving. Current code (counts kind:"measured" as a miss, 0 saved) is CORRECT. (The note flagged this exact formula "verify producer intent first" -- verified: do NOT credit.)
- **read-auto-limit** (1,733 entries) -- `nudge-emitted` (64) is ADVISORY (suggests bounding a large Read; adoption NOT measured); 40 carry `est_tokens` but those are POTENTIAL savings, not realized. `already-bounded` (1,175) = the Read was already bounded -> 0 saving (correct). Crediting the nudge est_tokens would claim unverified adoption (R12). Conservative 0 is the honest choice (the note's own "under-credit beats over-credit").
- **pre-tool-savings-multi** (144K entries, 4,471 nudges) -- nudge-only (parallel-tool round-trip reduction, hard to express in tokens); the 06-12 note's own conclusion was "may legitimately stay nudge-only." Correct as-is.

**Verdict:** backlog #11's "~10K+ masked savings" premise was largely wrong -- the masking was windowing+shape (both real, both fixed, ~42K + 349 hits surfaced), NOT a credit-semantics bug in the calibration/advisory substrates. **No further credit-logic change is warranted; doing so would fabricate over-credit.** Backlog #11 = CLOSED.

**Lesson (reinforces the tail-read FAIL):** a tempting "credit the field that's there" fix can be a fabrication -- ALWAYS read the producer to learn what a field MEANS before crediting it (rtk-adoption's `observed_tokens` is output-size, not a saving). Verify-first beats the obvious formula. [[feedback_verify_actual_contract_not_proxy]]

**Open (genuinely deferred, NOT a credit bug):** incremental/offset-based aggregation to bound read cost without windowing (4 of 6 ledgers grow unbounded; 64MB ceiling is a temporary crash-guard). This is a DESIGN unit (offset-cursors conflict with the pruner's lifetime accounting -- pruner must feed a cumulative carry before dropping lines). Fresh-context unit. Plus: align the stale `read-offset-nudges.jsonl` header comment in psn-savings-aggregate.mjs (arm-C P2, cosmetic).
