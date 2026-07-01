---
name: reference_charlie_ref_reliability_2026_06_02
description: U-QP-OUTBOUND-REF-RELIABILITY — conservative reference-reliability guard on compareToPredicted (referenceReliable/reliabilityVerdict: ok|insufficient-reference|degenerate-reference); flags low-n + IQR-collapsed price-spike, never drops rows; wired into train-cycle advisory
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.513Z
aliases: reference_charlie_ref_reliability_2026_06_02
---


QUOTING-SYNERGY-MS0/U-QP-OUTBOUND-REF-RELIABILITY (slot:charlie, 2026-06-02, /loop /goal /yolo iter9, commit `6d6b11d769`). Makes the outbound calibration advisory HONEST about WHEN its verdict is trustworthy — the gap left after iter5-8 (the OCR-noise-dominated ext reference made median_ratio/verdict DIRECTIONAL with no structural flag).

**SHIPPED:** `OutboundPriceIndexEngine.compareToPredicted` additively returns `referenceReliable` (bool) / `reliabilityVerdict` (`ok` | `insufficient-reference` | `degenerate-reference`) / `reliabilityCaveat`. Pure module helper `assessReferenceReliability(reference, minReferenceN=30, maxConcentration=0.02)`: (1) reference null OR n<minReferenceN → insufficient-reference; (2) median<=0 OR `(p75-p25)/median < maxConcentration` → degenerate-reference (an IQR-collapsed price SPIKE — the OCR "$1" signature); else ok. CONSERVATIVE — FLAGS degeneracy, NEVER drops/filters rows (honors soul refusal non-conservative-filter). New schema params minReferenceN/maxConcentration = dimensionless sample-quality bounds (NOT price/shop-rate/margin constants — overridable). Wired into quoting-train-cycle.mjs real_distribution_match (--json) + a structured unreliability warning that COMPLEMENTS, never replaces, the source OCR `reference_caveat`.

**LIVE FINDING (R12 — the verification taught something):** the REAL high-conf ext reference (n=60, median $1.005) assesses `reliability_verdict:ok / referenceReliable:true`. The structural guard correctly does NOT flag it: the real ext distribution has IQR spread well above $1 (a tail of genuine higher-value part-lines), so it is NOT a collapsed spike — even though the MEDIAN is OCR-$1-suspect. Lesson: "OCR-noise-dragged median" (a source-caveat concern, still surfaced) ≠ "structurally degenerate spike" (this guard's concern). The guard fires on a TRUE spike (DEGEN_FIXTURE: 4×$1 → iqr 0 → degenerate) and low-n (n=3 FIXTURE → insufficient), and does not false-positive on real data. So the guard adds a real structural channel; the residual $1-median issue remains a data/xray-denoise concern.

**TESTS:** +4 engine vitest (degenerate / insufficient / ok / null-branch-carries-fields) = 39 total; guard-preflight T9 (reliability fields reach CLI --json; invariant `referenceReliable === (reliabilityVerdict==='ok')`) = 9 total. Scoped tsc clean (engine+schema). 2-reviewer per-file PASS 0 P0/P1 (reviewer-A P2 null-branch test added in-unit; P3s — unreachable median<=0 defensive branch, raw-float caveat string — left as documented). Live tsx end-to-end verified (cycle.ok true → rm.ok true → reference_reliable true / ok / real_n 60).

**NEXT:** true OCR-denoise of the ext reference (xray / robust trimmed-mean vs the $1 mass) so the median itself is calibration-grade. Wiki: [[quoting-outbound-price-prior]]. Sibling: [[reference_charlie_extprice_calib_2026_06_01]] · [[reference_charlie_orch_psi_field_fix_2026_06_02]].
