---
name: reference_classify_stem_bug_2026_06_11
description: Classifier regex bug - a trailing \b after a truncated stem (classif\b) never matches the full word (classify); blocked classification offload fleet-wide (2026-06-11 slot:india)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.518Z
aliases: reference_classify_stem_bug_2026_06_11
---


# Trailing-`\b`-after-truncated-stem regex bug (2026-06-11, slot:india)

**Where:** `scripts/lib/local-llm-task-router.mjs` CLASS_PATTERNS, the `classify` row.

**The bug.** The pattern was `/\b(classif|categoriz|label|...)\b/i`. The `\b` at the END of the
alternation applies to whichever branch matched -- so `classif\b` requires a word boundary
**immediately after** the truncated stem "classif". But "classif**y**" has a word char ("y") right
after the stem -> NO boundary -> `classif\b` never matches "classify". Same for `categoriz\b` vs
"categorize". Result: the **two most common classification verbs** ("classify", "categorize") fell
through to `taskClass: "unknown"` -> they were NEVER offloaded to Ollama. Whole-word branches
(`label`, `triage`) worked because the space after them IS a boundary -- which is why the bug hid.

**Impact.** Directly undermined the model-routing offload goal: classification is a matrix-proven
$0 Ollama task, but the classifier couldn't even recognize "classify this X".

**Fix (commit in the U-MODEL-ROUTE-POLICY commit).** Use `\w*` after the truncated stems so the
whole word matches: `/\b(classif\w*|categoriz\w*|label\b|tag\s*this|...|triage\b)/i`. Now
"classify"/"categorize"/"classification" all -> classify. +1 regression test; 18->19 task-router
tests green.

**Reusable lesson** (wiki [[regex-trailing-boundary-after-truncated-stem]]): in a regex alternation
`(stemA|stemB|wholeC)\b`, a trailing `\b` after a TRUNCATED stem silently fails on the full word.
Either anchor each branch's boundary explicitly, or use `\w*` after truncated stems. A classifier
that returns "unknown" for its own headline verb is the tell. Pairs with the MODEL-ROUTING-MS0 work
([[reference_model_routing_ms0_2026_06_11]]).
