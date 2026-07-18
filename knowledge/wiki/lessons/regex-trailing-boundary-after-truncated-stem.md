---
title: Trailing `\b` after a truncated stem silently fails on the full word
type: lesson
domain: dev-infra
tags: [regex, classifier, routing, bug, model-routing]
created: 2026-06-11
slot: india
---

# Trailing `\b` after a truncated stem silently fails on the full word

## The bug

A keyword classifier used `/\b(classif|categoriz|label|tag\s*this|triage)\b/i`. The trailing `\b`
applies to whichever alternation branch matched. For a **truncated stem** like `classif`, that
requires a word boundary **immediately after** the stem — but the real word "classif**y**" has a
word char (`y`) right there, so there is no boundary and the branch never matches. Same for
`categoriz` vs "categorize".

Whole-word branches (`label`, `triage`) kept working because a space follows them (a real boundary),
which is exactly why the bug **hid in plain sight** — the pattern looked fine and "triage" tests passed.

## Why it mattered (PRISM, MODEL-ROUTING-MS0)

`scripts/lib/local-llm-task-router.mjs` classified "classify this part" / "categorize this op" as
`unknown` instead of `classify`. Classification is a matrix-proven **$0 Ollama** task, so the two
most common classification verbs were **silently never offloaded** — directly undercutting the
auto-model-routing goal. The tell: **a classifier returning "unknown" for its own headline verb.**

## The fix

Use `\w*` after truncated stems so the whole word matches; keep `\b` only on whole-word branches:

```js
// before:  /\b(classif|categoriz|label|tag\s*this|triage)\b/i
// after:   /\b(classif\w*|categoriz\w*|label\b|tag\s*this|triage\b)/i
```

## General rule

In an alternation `(stemA|stemB|wholeC)\b`, a single trailing `\b` is **wrong for truncated stems**.
Anchor each branch's boundary explicitly, or append `\w*` to any truncated stem. When you intend a
stem to match a whole family ("classif" → classify/classifier/classification), `\w*` is the intent;
`\b` is the silent saboteur.

Related: `[[reference_classify_stem_bug_2026_06_11]]`, `[[reference_model_routing_ms0_2026_06_11]]`.
