---
name: feedback-all-means-all
description: "When the operator says 'all/every X' they mean the COMPLETE set -- every numerical/statistical/nominal value -- not a sample. 'all cutting tools' = all 100k+."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.397Z
aliases: feedback_all_means_all
---


When the operator uses a **totality quantifier** -- "all", "every", "each", "the entire", "the whole", "complete", "exhaustive", or a large count like "100k+" -- bound to a data set, they mean **the complete population: every single numerical, statistical, and nominal value**. NOT a representative sample, NOT top-N, NOT "a few spanning examples".

> Operator, 2026-06-12 (slot charlie): *"make it a rule and enforced that when I say all of something, i really mean every numerical, statistical, nominal value of something. if i say all cutting tools in our database, i mean all 100k+ tools."*

**Why:** The recurring silent-narrowing failure -- I read/process a subset that "looks sufficient" and report back as if I covered the whole set. The operator's example is unambiguous: "all cutting tools in our database" = all 100k+ tools, not 3 ISO-spanning examples. This is the data-operation sibling of the test-variability floor ("exercise >=3 spanning configs") -- that floor is about TEST coverage and **never** licenses sampling a real data op (enrichment, training, reconciliation, audit, migration, count).

**How to apply:**
1. Totality quantifier + data noun -> first action is **enumerate the full count** (`Glob **/*.ext` + report total, `SELECT COUNT(*)`, registry `.size`, dispatcher `count` action) and **state the number back** before processing -- e.g. "found 104,118 tools".
2. **Process every record.** No silent narrowing. If the set is the 100k+ tool DB, the operation touches all 100k+, not a sample.
3. If only a subset is feasible this turn (token/time/compute bound), **say so explicitly (R12)** and name covered-vs-total + queue the remainder -- "processed 3,200 of 104,118 -- remaining 100,918 queued for next pass". Never imply completeness.
4. The completeness claim is verified by the COUNT, not by "looks done" -- cite the number that proves you covered the whole population.

**Enforcement:** `.claude/hooks/all-means-all-inject.mjs` (UserPromptSubmit T2) detects a totality quantifier bound to a data-set noun and injects this rule per-prompt. Pure/fail-soft/non-blocking; benign idioms ("all good", "that's all", "after all") are excluded. Disable: `PRISM_ALL_MEANS_ALL_INJECT=0`. Tests: `.claude/hooks/all-means-all-inject.test.mjs` (17 cases).

Related: [[feedback_enumerate_before_read]] (Glob the full tree + report count before Read) - [[feedback_never_claim_absence_without_deep_search]] (deep search before "no X exists") - [[feedback_never_assume_data_file_contents]] (read+count actual contents).
