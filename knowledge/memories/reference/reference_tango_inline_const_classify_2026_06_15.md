---
name: reference_tango_inline_const_classify_2026_06_15
description: tango split inline-kc1.1 detection into matches-canonical vs non-group (triage); R12 lesson — divergent-from-canonical is NOT a bug, per-material tables are legit. slot tango 2026-06-15.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.219Z
aliases: reference_tango_inline_const_classify_2026_06_15
---


**TANGO INLINE-CONST CLASSIFIER (slot tango, 2026-06-15, commit `f1f13896f4`)** — autonomous high-ROI build (cron+loop continuation, [[feedback_always_build_high_roi_order]]).

**Blind spot fixed:** `scripts/assess-engine-algo-improvements.mjs` inline-constant regex matched ONLY the 6 canonical ISO-group kc1.1 values (1800/2100/1100/700/2800/3200) — so it flagged the harmless matches-canonical subset and was BLIND to every other value. Extracted detection to a pure unit-tested lib `scripts/lib/inline-const-classify.mjs` (`classifyInlineKc(src) -> {values, matchesCanonical, divergent}`, `CANONICAL_KC` Set, broadened VALUE regex `\bkc1[_.]?1?\b\s*[:=]\s*(\d{2,5})`). 11/11 node:test (field-name variants kc1_1/kc11/kc1.1, decimal, fail-soft null). inlineConstant 70->73 (+3 non-group-only files the old regex missed); new `inlineDivergent`=36.

**R12 LESSON (the important part — verify-on-disk BEFORE framing a finding):** I almost shipped "36 DIVERGENT = HIGH-PRIORITY safety bugs." Verify-on-disk REFUTED it: the 6 canonical values are per-ISO-GROUP REPRESENTATIVES, but real engines legitimately carry per-MATERIAL kc1.1 tables that differ by design. `KienzleForceModelEngine:260` = explicit `{ kc1_1: 1780, mc:0.26, iso_group:"P", description:"AISI 1045" }` (commented "more granular than the per-ISO-group values in constants.ts"); `CryogenicCuttingEngine` aluminium entry (E_GPa 71.7) = `kc1_1: 750`. Both CORRECT, not drift. So `divergent` = a TRIAGE signal ("review whether this should reference `MATERIAL_DB`"), occasionally real drift (historical CryogenicCutting 1500-below-ISO-3685), but **mostly legitimate — NOT an auto-bug list**. Reworded all scanner/lib/test prose to that honest framing before committing. **Generalizable: a heuristic detector's COUNT is not a CONFIRMED-DEFECT count; the population it scans (per-material physics tables) determines whether a "divergence" is a bug or by-design. Always verify a sample on disk before assigning severity.** The cleaner actionable subset is matches-canonical-only (inlines exactly the 6 group values = unambiguous refactor-to-import). Report: `TANGO-ENGINE-ALGO-ASSESSMENT-2026-06-15.md` §Refinement. Sister: [[reference_tango_engine_algo_assessment_2026_06_15]], [[reference_tango_test_quality_audit_2026_06_15]].
