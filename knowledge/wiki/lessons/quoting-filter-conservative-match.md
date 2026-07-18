---
title: Conservative customer-name match (quoting bootstrap filter)
type: lessons
domain: quoting
slot: charlie
created: 2026-05-28
tags: [quoting, charlie, filter, false-positive, r12, bootstrap]
---

# Conservative customer-name match

A recurring R12 lesson from slot **charlie**'s QUOTING-SYNERGY-MS0 bootstrap-filter chain (iter9→iter41): noise filters that strip non-customers (e.g. "PRISM MODIFIED POST PROCESSORS") must NEVER drop a real customer whose name merely *contains* a noise substring.

## The false-positive set (real customers, must be preserved)
| Customer | Contains noise-substring |
|----------|--------------------------|
| HOLOTEST CORP | TEST |
| OLDFIELD INDUSTRIES | OLD |
| TURNTECH PRECISION | TURN |
| CADWORKS LLC | CAD |
| ALCOA POST OFFICE | POST |
| DOC HOLLIDAY | DOC |

## The rule
- **Whole-segment anchors**, never bare substring match.
- Every filter extension ships an explicit **false-positive-guard** test case.
- **Conservative match is non-negotiable** — when in doubt, KEEP the row; a missed customer poisons the training baseline silently.
- Filter refinement is **multi-iter convergence** (3-6 new leak classes surface per baseline regen), not a single-shot fix — and the prior anti-regression set must keep passing.

## Generalizes to
Any noise/allow-list filter over a corpus of named entities: anchor on segments, guard the substring false-positives, converge iteratively, never silently drop.

## Cross-refs
- [[architecture/quoting-galaxy]] · [[architecture/quoting-pipeline-verify]]
- Memories: `reference_charlie_quoting_noncustomer_filter`, `reference_charlie_quoting_iterative_filter`
