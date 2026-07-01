---
name: feedback_reuse_whole_token_matcher_not_includes
description: "A new id/asset closure signal must reuse the existing whole-token matcher (tokenIn), never a bare String.includes -- substring-false-close is a recurring bug class."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.441Z
aliases: feedback_reuse_whole_token_matcher_not_includes
---


When you add a NEW signal that decides "this work is done because id/asset X
appears in <text>" (git log, settings.json, a manifest), match X as a WHOLE
TOKEN, never with a bare `text.includes(X)`. A bare substring lets a short id
false-positive against a longer unrelated one (`U-PPL` inside `U-PPL-B2`;
`TSC-CLEANUP-MS0` inside `U-WEB-TSC-CLEANUP-MS0`; stem `cam` inside
`camDispatcher`). For a never-false-close charter this is a charter violation.

**Why:** this exact bug class has now recurred TWICE in the same file
(`scripts/verify-misc-tasks-open.mjs`): first in the `now-wired` signal (fixed
with `tokenIn()` + a regression test), then re-introduced verbatim in the
sibling `shipped-in-git` signal added later (2026-06-21, slot:zulu) -- caught by
the 3-of-3 scrutiny gate PRE-merge (arms A+B FAIL, C P2). Live impact: 3 of 22
"likely-closed" were substring false-closes; the whole-token fix dropped it to
19 genuine closures. The matcher already existed in the file
(`tokenIn(text, name)` = `(?:^|[^\\w-])<esc>(?:[^\\w-]|$)`); the new signal just
failed to reuse it.

**How to apply:**
- Before writing `someText.includes(id)` to infer completion/closure, grep the
  file for an existing whole-token/boundary matcher and reuse it (R8 read-first).
- Add the substring ORACLE test alongside the absence oracle: an OPEN short id
  must NOT close off a LONGER id that merely contains it. The absence-only oracle
  (id entirely missing) passes even with the bug present -- it is not enough (R9).
- R12 caution proven here: the review agents CITED specific false-close ids
  (`U-PTR02`, `U-ARCH3`, `U-PAY`...) that were partly FABRICATED -- several
  survived as real whole-token matches. Trust the COUNT delta (22->19) as the
  proof the bug class was real, not the agents' cited examples.

Related: [[feedback_wire_test_validate_all_galaxies]] (the now-wired sibling fix
lives in the same file's `## Recent regressions` lineage).
