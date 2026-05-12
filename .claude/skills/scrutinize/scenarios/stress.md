---
scenario: stress
skill: scrutinize
skill_type: methodology
description: an enormous diff — 200 files, ~50k lines; the skill must batch/summarise, not dump the whole diff
rubric_max_input_chars: 800
rubric_must_match: ["(summar|in batches|too (large|big|long)|by (file|directory|module|area)|sample|prioriti[sz]e|chunk|split (the|it) (review|diff)|delegate|risk-rank|highest-risk|focus (on|the))"]
rubric_must_not_contain: ["Traceback", "ReferenceError"]
rubric_min_sections: 0
---
Scrutinize this — it's a 50,000-line refactor across roughly 200 files: every engine got reorganised, three dispatchers rewritten, the schema layer moved, ~400 tests touched. (This fixture caps the input at 800 chars so the skill sees only a truncation marker — the test is whether it copes.)

Files touched (partial): engines/A.ts engines/B.ts engines/C.ts ... engines/Z9.ts dispatchers/devDispatcher.ts dispatchers/calcDispatcher.ts dispatchers/camDispatcher.ts schemas/*.ts (moved) __tests__/*.test.ts (~400) ...

## Expected output shape
You can't meaningfully run a single 3-CLI pass over a 50k-line / 200-file diff and
get useful output. A production-grade methodology skill recognises the scale and
adapts: batch the review by directory/module, risk-rank the files and review the
highest-risk first, sample, or delegate sub-reviews — and it does NOT try to dump
or inline the whole diff. Graceful degradation on the "biggest/messiest version".
