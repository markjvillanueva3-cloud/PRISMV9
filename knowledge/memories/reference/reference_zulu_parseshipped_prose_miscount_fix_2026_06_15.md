---
name: reference_zulu_parseshipped_prose_miscount_fix_2026_06_15
description: "zulu-build-loop parseShipped over-counted an inline-prose unit id as shipped (the \"C8 signal\" miscount) -> loop DRAINED before the final unit was built; fixed by anchoring id extraction to a bullet-header position."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.284Z
aliases: reference_zulu_parseshipped_prose_miscount_fix_2026_06_15
---


**Finding 2026-06-15 (slot:zulu, building the bravo C8 unit):** the autonomous build-loop's
`parseShipped` (`scripts/lib/zulu-build-queue.mjs`) marked a NOT-yet-built unit as shipped
because it matched `/\bC(\d+)\b/g` **anywhere** in the brief's `## SHIPPED` slice — including
free prose. After C7 committed, the C7 shipped-bullet described `over_claim` as "the **C8**
signal", and a summary line read "C5+C6+C7+C8 build-complete". Those prose `C8` tokens made
the loop report `DRAINED done=8` while C8 was still unbuilt — a **silent over-count that would
have skipped the final queue unit**.

**Why the docstring lied:** it claimed "a candidate merely mentioned is never miscounted" —
true only for the section-slice guard (a `C#` in the `## REMAINING` section is excluded), NOT
for prose *inside* a SHIPPED bullet's description.

**Fix (commit `775a0f8287`):** count `C<n>` only at a **bullet-header position** —
`/(?:^|\n)\s*[-*]\s+\*{0,2}C(\d+)\b/g` (a `-`/`*` bullet + optional `**` bold + `C<n>` at line
start). Inline prose ("the C8 signal", "refs C5+C6+C7") is excluded; the established brief
convention `- **C8 EngineName**` still matches. Live brief re-parses to the same honest
`done=8`. +1 regression test (the exact "C8 signal" fixture); 12/12 `zulu-build-queue` tests.

**General lesson:** a token-anywhere regex over **human prose** silently over-counts. Anchor
structured-id extraction (unit ids, status markers, counts) to a **structural position**
(bullet header, table cell, fenced field) — never free text. Sibling of the "ALL means ALL /
prove by COUNT" discipline: a parser that derives a completion count from prose is as
untrustworthy as an eyeballed "looks done". See [[feedback_all_means_all]].

Shipped alongside the full hermes-zulu capability queue C1-C8 (C5 backpressure, C6 capability
registry, C7 outcome-attestation, C8 soul-evolution advisor) — operator "build for bravo".
