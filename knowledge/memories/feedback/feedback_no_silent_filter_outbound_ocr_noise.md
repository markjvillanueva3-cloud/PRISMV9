---
name: feedback_no_silent_filter_outbound_ocr_noise
description: "Do NOT \"fix\" the outbound OCR-$1 reference noise with a silent low-price filter -- OutboundPriceIndexEngine DELIBERATELY surfaces degeneracy instead of dropping rows (soul-refuse"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.437Z
aliases: feedback_no_silent_filter_outbound_ocr_noise
---


# Don't silently filter the outbound OCR-$1 noise (charlie anti-pattern, 2026-06-09)

**The tempting wrong fix:** the `against:"line"` outbound reference median collapses to ~$1 (OCR noise), so the outbound promote gate ([[reference_charlie_outbound_promote_gate_2026_06_09]]) can't go live. The obvious-looking fix is to drop ext_price rows below a floor (e.g. <$5) before computing the reference stats. **DO NOT.**

**Why:** `OutboundPriceIndexEngine.assessReferenceReliability` (lines ~285-293) explicitly states it "NEVER drops observations (conservative -- degeneracy is surfaced, not silently filtered, per the non-conservative-filter refusal)." That is charlie soul-refuse #6 (non-conservative filter) encoded in the engine. A floor that drops 65% of reference rows is exactly that silent filter. R7: this is a real design conflict -- surface it, don't paper over it.

**The system is already correct.** Real `jm-sold-orders.json` distribution (412 line ext_prices, verified 2026-06-09): 268 (65%) cluster at a ~$1.005 spike (p10=p25=p50, a degenerate constant = OCR artifact); 147 genuine prices >=$5 have median $345 (p25 $224, p75 $740). The engine detects the IQR collapse -> `degenerate-reference` -> `gateOutboundAlignment` returns `unverified` (block:false, fail-safe) and SAYS why. That is the conservative, honest behavior, not a bug.

**The real fix is source-side (operator/ERP):** clean the ext_price OCR `$1` noise in the extraction that builds `jm-sold-orders.json`, OR feed live E2/QuickBooks actuals. THEN the reference becomes reliable and the outbound gate + the deferred `U-QP-OUTBOUND-OODA-DEPS-WIRE` can go live with no engine filter.

**If a cleanup is ever built in-engine:** it must be (1) NON-silent (surface dropped count + the rule), (2) NON-default / opt-in, (3) framed as an explicit OCR-spike-repair step (statistical spike detection), NOT a flat low-price stats filter, and (4) reviewed against soul-refuse #6. Default behavior stays surface-don't-filter.

**Why:** a silent low-price filter trains the gate on a hand-picked subset, which is the non-conservative-filter failure mode the soul exists to prevent.
**How to apply:** when the outbound reference reads degenerate, report it + point at source-data cleanup; never add a default row-dropping filter to make the gate go live.
