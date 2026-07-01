---
name: engineering-failure-classes
description: "PRISM's 9 recurring engineering failure classes (EFC-1..9) distilled into preventive tribal tips"
aliases: feedback_engineering_failure_classes
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.424Z
---


PRISM keeps re-logging the same engineering bug classes in `## Recent regressions`. The 9 recurring ones are distilled into named, detection-signal-equipped tribal tips at `knowledge/wiki/code-tribal/engineering-failure-classes.md` (EFC-1..EFC-9).

**Why:** the regression ledger logs *incidents* ("X broke in commit Y") — chats don't connect a past incident to their own different task, so the class recurs (hermetic-fakes and schema-read-blindness each recurred within ~1 day). A *generalized* named class with a detection signal is pattern-matchable against any task.

**How to apply:** before shipping code, pattern-match the task against the 9 classes — EFC-1 hermetic-fakes-don't-prove-wiring (ship a real-producer E2E), EFC-2 schema-read-blindness (open a real instance first), EFC-3 multi-writer race, EFC-4 silent-degradation (fail loud, verify upstream freshness), EFC-5 named-is-not-wired (a doc reference is not a wire), EFC-6 Windows bundled-hook exit-code pipe-truncation (exit 0, signal via stdout JSON), EFC-7 stale-snapshot triage in a shared tree, EFC-8 constant-inlining (import from `constants.ts`), EFC-9 completion overclaim. Companion to Karpathy R1-R12. Also the seed corpus for the proposed `prism-dev` LoRA adapter ([[reference-prism-custom-llm-feasibility]]).
