---
title: "ALL means ALL — totality directive doctrine"
type: lesson
status: active
created: 2026-06-12
slot: charlie
tags: [doctrine, data-operations, completeness, enforcement, fleet-wide]
related:
  - feedback_all_means_all
  - feedback_enumerate_before_read
  - feedback_never_assume_data_file_contents
  - feedback_never_claim_absence_without_deep_search
---

# ALL means ALL — totality directive doctrine

**Operator directive (2026-06-12, slot charlie):**
> "make it a rule and enforced that when I say all of something, i really mean every numerical, statistical, nominal value of something. if i say all cutting tools in our database, i mean all 100k+ tools."

## The rule

When the operator uses a **totality quantifier** — `all`, `every`, `each`, `the entire`, `the whole`, `complete`, `exhaustive`, or a large count like `100k+` / `104,118` — bound to a data set, they mean the **complete population: every single numerical, statistical, and nominal value**.

NOT a representative sample. NOT top-N. NOT "a few spanning examples".

> "all cutting tools in our database" = **all 100k+ tools**, not 3 ISO-spanning examples.

## Why this is its own rule

This is the **data-operation** sibling of the **test-variability floor** (`comprehensive-build-enforce`: "exercise >=3 spanning configs"). Those are different axes:

| Axis | Rule | Scope |
|------|------|-------|
| Test coverage | >=3 spanning configs | proving a code path handles variety |
| Data operation | ALL means ALL | enrich / train / reconcile / audit / migrate / count over a real population |

The test-variability floor **never** licenses sampling a real data operation. If the op is "enrich all tools", it touches all 100k+, even though a *test* of the enrichment engine only needs 3 spanning materials.

The recurring failure it prevents is **silent narrowing**: reading/processing a subset that "looks sufficient" and reporting back as if the whole set was covered (the same failure class as [[feedback_enumerate_before_read]] and [[feedback_never_assume_data_file_contents]]).

## How to apply

1. **Enumerate the full count FIRST** and state it back — `Glob **/*.ext` + count, `SELECT COUNT(*)`, registry `.size`, dispatcher `count` action. "found 104,118 tools".
2. **Process EVERY record.** No silent narrowing to a sample / top-N / canonical default.
3. If only a subset is feasible this turn (token/time/compute bound), **say so explicitly (R12)** and name covered-vs-total + queue the remainder: "processed 3,200 of 104,118 — remaining 100,918 queued".
4. The completeness claim is proven by **the COUNT**, not by "looks done". Cite the number.

## Enforcement

- **Hook:** `.claude/hooks/all-means-all-inject.mjs` — UserPromptSubmit (T2). Detects a totality quantifier bound to a data-set noun and injects this rule per-prompt. Pure / fail-soft / non-blocking. Benign idioms ("all good", "that's all", "after all", "at all") are excluded so it does not fire on conversational uses of "all".
- **Tests:** `.claude/hooks/all-means-all-inject.test.mjs` — 17 `node:test` cases (happy + benign-negatives + adversarial: oversize slice guard, non-string types, unicode, mixed benign+genuine).
- **Disable:** `PRISM_ALL_MEANS_ALL_INJECT=0`.
- **Doctrine surfaces:** global `CLAUDE.md` §HONESTY RULES (loaded every session, fleet-wide) + [[feedback_all_means_all]] (semantic recall + Obsidian auto-feed) + this wiki entry.

## Related

- [[feedback_all_means_all]] — the memory doctrine.
- [[feedback_enumerate_before_read]] — Glob the full tree + report count before Read (the folder-scope sibling).
- [[feedback_never_assume_data_file_contents]] — read + count actual contents (the file-contents sibling).
- [[feedback_never_claim_absence_without_deep_search]] — deep search before claiming "no X exists".
