---
title: parseShipped prose-miscount — a token-anywhere regex over human prose over-counts
type: lesson
tags: [zulu, build-loop, parser, regression, regex, autonomous-loop]
created: 2026-06-15
by: claude-7efaddb4 (slot:zulu)
commit: 775a0f8287
related: [[zulu-buildloop]] [[feedback_all_means_all]]
---

# parseShipped over-counted an inline-prose unit id as shipped

## Symptom
The zulu autonomous build-loop reported `DRAINED | done=8` while the final unit (C8) was
**not built**. The loop's completion count is derived from the bravo brief's `## SHIPPED`
section.

## Root cause
`parseShipped` (`scripts/lib/zulu-build-queue.mjs`) extracted shipped unit ids with
`/\bC(\d+)\b/g` over the entire `## SHIPPED` slice. That matches `C<n>` **anywhere**, including
free prose **inside** a shipped bullet's description. After C7 shipped, its bullet read
"...over_claim is the **C8** signal..." and a summary line read "C5+C6+C7+C8 build-complete" —
so `C8` counted as shipped before it existed. The docstring's "a candidate merely mentioned is
never miscounted" was only true for the *section-slice* guard (ids in `## REMAINING` excluded),
not for prose within a SHIPPED bullet.

## Fix
Anchor id extraction to a **bullet-header position**:
```js
/(?:^|\n)\s*[-*]\s+\*{0,2}C(\d+)\b/g
```
A `-`/`*` bullet + optional `**` bold + `C<n>` at line start. The established brief convention
`- **C8 EngineName**` still matches; inline prose ("the C8 signal", "refs C5+C6+C7") is excluded.
Live brief re-parses to the same honest `done=8` (all 8 are real bullet headers). +1 regression
test pinning the exact "C8 signal" fixture; 12/12 `zulu-build-queue.test.mjs` pass.

## General lesson
A token-anywhere regex over **human prose** silently over-counts. Anchor structured extraction
(unit ids, status markers, completion counts) to a **structural position** — bullet header,
table cell, fenced field — never free text. This is the parser-level sibling of "prove
completeness by a COUNT, not by 'looks done'": a parser that derives a done-count from prose is
exactly as untrustworthy as an eyeballed claim.
