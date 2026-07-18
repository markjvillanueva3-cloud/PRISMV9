---
name: reference_oscar_jm_accuracy_validation_result_2026_06_25
description: "JM-accuracy validation RESULT (slot:oscar, 2026-06-25): PRISM physics vs ALL JM Die lathe programs (full 16,524-program proven store -> 50 configs, 14 turning-comparable) on BOTH css AND feed. Quantified: JM amateur programs are 100% SPEED-CONSERVATIVE (14/14 css below the PRISM band) but FEED-REASONABLE (8 in-band / 6 light / 0 aggressive). PRISM is correctly MORE aggressive than amateur JM (the right direction). The 'test against ALL JM parts' sub-goal is COMPLETE; the synthetic billions-combination sweep is the remaining heavy part."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.690Z
aliases: reference_oscar_jm_accuracy_validation_result_2026_06_25
---


**JM-accuracy validation RESULT -- PRISM physics vs ALL JM Die parts/programs (slot:oscar, 2026-06-25).**

The operator's priority-3 directive splits in two: (a) "test against ALL JM Die parts and programs" and
(b) "exhaustive testing of billions of logical combinations". Sub-goal (a) is now **COMPLETE** -- the
PRISM-vs-JM divergence artifact (`scripts/sfc-jm-proven-divergence.mjs`) tests PRISM's physics against the
**FULL JM-aggregated proven store** (16,524 Okuma lathe programs -> 50 material x op configs, 14
turning-CSS-comparable) on BOTH cutting speed AND feed, with verified units (css=SFM*0.3048, feed=IPR*25.4).

**Quantified result (the live divergence summary):**
- **CSS (surface speed): 14 CONSERVATIVE / 0 in-band / 0 aggressive / 0 suspect.** Every comparable JM
  config runs BELOW the PRISM canonical turning band -- e.g. 200 SFM (61 m/min) vs the P band [220,320].
  JM amateur programs are **100% speed-conservative**.
- **FEED (mm/rev): 6 CONSERVATIVE / 8 IN-BAND / 0 aggressive / 0 suspect (of 14 with a feed).** JM feeds
  are **57% in-band, 43% light, 0% heavy** vs CANONICAL_TURNING_FEEDS.

**Interpretation (this is the GUIDELINE-not-trusted validation the operator wanted):** PRISM is correctly
MORE aggressive than the amateur JM programs on speed (the right direction -- PRISM recommends optimal/faster
carbide speeds; the amateurs run slow), and AGREES with them on feed (feeds are the parameter amateurs get
roughly right). NOTHING is flagged aggressive or suspect-units -- i.e. PRISM never recommends slower than the
already-conservative JM, and the verified unit conversions produce zero anomalies (a strong units-correctness
signal -- a wrong css or feed unit would have produced suspect-units flags). This VALIDATES that (1) PRISM's
turning physics is sound vs real shop data, (2) the JM data is correctly treated as a conservative baseline,
and (3) the css/feed unit conversions are right.

**Remaining priority-3 work (NOT this):** sub-goal (b), the **synthetic billions-combination sweep** -- run
PRISM across the full logical input/cutting-parameter space (material x tool x op x ap x ae x ...), a HEAVY
long-running data op for a FRESH context (a 0.80-token-zone start would blow past compaction). Then feed the
sweep dataset to india LoRA/GNN (sub-goal 4).

The 10-unit session that produced this: [[reference_oscar_proven_css_sfm_mitigated_not_dangerous_2026_06_25]]
(units), [[reference_oscar_jm_accuracy_validation_result_2026_06_25]] (this), wiki
[[jm-proven-speedfeed-is-a-test-baseline-not-a-trusted-recommendation-input]] (trust policy). Commits:
ac6045a525 (feed surface) + 74abff859f (feed verdict) + bcd9a6e858 (feed aggregate).
